"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Info, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  DASHBOARD_WIDGETS,
  MAX_CONVERSION_STEPS,
  PERIOD_PRESETS,
  type DashboardConfig,
  type PeriodPreset,
} from "@/lib/dashboard-config";
import type { DashboardConfigResponse } from "./types";
import { DASH_CARD } from "./ui";

const NONE = "__none__";

/** Busca a configuração só quando a aba Configurar é aberta. */
export function DashboardSettingsTab({ onSaved }: { onSaved: () => void }) {
  const [initial, setInitial] = useState<DashboardConfigResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setHasError(false);
    try {
      const res = await dashboardFetch("/api/dashboard/config");
      if (!res.ok) throw new Error();
      setInitial(await res.json());
    } catch {
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Não foi possível carregar a configuração.</p>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo</Button>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-[20px]" />
        <Skeleton className="h-48 w-full rounded-[20px]" />
      </div>
    );
  }

  return <DashboardSettings initial={initial} onSaved={onSaved} />;
}

/**
 * Configuração do dashboard (só MARKETING_ADMIN): quais etapas de conversão
 * existem, a qual coluna do pipeline cada uma está ligada em cada funil, e
 * quais blocos aparecem. Vale para a conta inteira.
 */
function DashboardSettings({
  initial,
  onSaved,
}: {
  initial: DashboardConfigResponse;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<DashboardConfig>(initial.config);
  const [savedConfig, setSavedConfig] = useState<DashboardConfig>(initial.config);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const funnels = initial.funnels;
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedConfig), [draft, savedConfig]);
  const hasEmptyLabel = draft.steps.some(s => !s.label.trim());

  const updateStep = (index: number, patch: Partial<DashboardConfig["steps"][number]>) =>
    setDraft(d => ({ ...d, steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));

  const moveStep = (index: number, direction: -1 | 1) =>
    setDraft(d => {
      const target = index + direction;
      if (target < 0 || target >= d.steps.length) return d;
      const steps = [...d.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...d, steps };
    });

  const addStep = () =>
    setDraft(d => ({
      ...d,
      steps: [...d.steps, { id: `step-${Date.now().toString(36)}`, label: "", stageByFunnel: {} }],
    }));

  const setStage = (index: number, funnelId: string, stageId: string) => {
    const stageByFunnel = { ...draft.steps[index].stageByFunnel };
    if (stageId === NONE) delete stageByFunnel[funnelId];
    else stageByFunnel[funnelId] = stageId;
    updateStep(index, { stageByFunnel });
  };

  const handleSave = async () => {
    if (hasEmptyLabel) {
      setShowErrors(true);
      return;
    }
    setIsSaving(true);
    try {
      const res = await dashboardFetch("/api/dashboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Não foi possível salvar.");
      const saved: DashboardConfigResponse = await res.json();
      setDraft(saved.config);
      setSavedConfig(saved.config);
      setIsDefault(false);
      setShowErrors(false);
      onSaved();
      toast({ title: "Configuração salva", description: "O dashboard já está usando as novas definições." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {isDefault && (
        <p className="flex items-start gap-2 rounded-2xl border border-border bg-muted p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Esta é a configuração automática: as etapas foram ligadas às colunas pelo nome. Confira as ligações abaixo e salve para fixar.
        </p>
      )}

      <Card className={DASH_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-medium tracking-tight">Etapas de conversão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada etapa é ligada a uma coluna do pipeline. O cliente conta na etapa quando está nessa coluna, em qualquer coluna depois dela, ou foi ganho.
            &quot;Entraram&quot; e &quot;Vendas&quot; existem sempre: entrada é o cadastro do cliente, venda é o cliente marcado como ganho.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.steps.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma etapa. O dashboard mostra só entradas e vendas.</p>
          )}

          {draft.steps.map((step, index) => {
            const labelError = showErrors && !step.label.trim();
            return (
              <div key={step.id} className="space-y-4 rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 basis-56 space-y-1">
                    <Label htmlFor={`step-label-${step.id}`}>Nome da etapa {index + 1}</Label>
                    <Input
                      id={`step-label-${step.id}`}
                      value={step.label}
                      maxLength={40}
                      placeholder="Ex.: Agendaram"
                      aria-invalid={labelError}
                      aria-describedby={labelError ? `step-error-${step.id}` : undefined}
                      onChange={e => updateStep(index, { label: e.target.value })}
                    />
                    {labelError && (
                      <p id={`step-error-${step.id}`} role="alert" className="text-sm text-destructive">Dê um nome à etapa.</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${index + 1} para cima`} disabled={index === 0} onClick={() => moveStep(index, -1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${index + 1} para baixo`} disabled={index === draft.steps.length - 1} onClick={() => moveStep(index, 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Remover etapa ${index + 1}`}
                    onClick={() => setDraft(d => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {funnels.map(funnel => (
                    <div key={funnel.id} className="space-y-1">
                      <Label htmlFor={`step-${step.id}-${funnel.id}`} className="text-xs font-medium text-muted-foreground">
                        Funil {funnel.name}: conta a partir da coluna
                      </Label>
                      <Select value={step.stageByFunnel[funnel.id] ?? NONE} onValueChange={v => setStage(index, funnel.id, v)}>
                        <SelectTrigger id={`step-${step.id}-${funnel.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Não medir neste funil</SelectItem>
                          {funnel.stages.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.order}. {stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={addStep} disabled={draft.steps.length >= MAX_CONVERSION_STEPS}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />Adicionar etapa
          </Button>
          {draft.steps.length >= MAX_CONVERSION_STEPS && (
            <p className="text-xs text-muted-foreground">Limite de {MAX_CONVERSION_STEPS} etapas.</p>
          )}
        </CardContent>
      </Card>

      <Card className={DASH_CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-medium tracking-tight">O que aparece no dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">Vale para a conta inteira. Campanhas só aparece para o administrador; desempenho por corretor, para administrador e gerentes.</p>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {DASHBOARD_WIDGETS.map(widget => (
            <div key={widget.id} className="flex items-center justify-between gap-4 py-3">
              <Label htmlFor={`widget-${widget.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="block font-medium text-foreground">{widget.label}</span>
                <span className="block text-sm font-normal text-muted-foreground">{widget.description}</span>
              </Label>
              <Switch
                id={`widget-${widget.id}`}
                checked={draft.widgets[widget.id]}
                onCheckedChange={checked => setDraft(d => ({ ...d, widgets: { ...d.widgets, [widget.id]: checked } }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={DASH_CARD}>
        <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Período padrão</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full space-y-1 sm:w-64">
            <Label htmlFor="config-period">Período ao abrir o dashboard</Label>
            <Select value={draft.defaultPeriod} onValueChange={v => setDraft(d => ({ ...d, defaultPeriod: v as PeriodPreset }))}>
              <SelectTrigger id="config-period"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-custom">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {isDirty ? "Alterações não salvas" : isDefault ? "Configuração automática, ainda não salva" : "Tudo salvo"}
        </p>
        <Button type="button" variant="outline" disabled={!isDirty || isSaving} onClick={() => { setDraft(savedConfig); setShowErrors(false); }}>
          Descartar
        </Button>
        <Button type="button" disabled={(!isDirty && !isDefault) || isSaving} onClick={handleSave}>
          {isSaving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
    </div>
  );
}
