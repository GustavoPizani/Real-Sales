"use client";

import { useEffect, useState } from "react";
import { Building2, FileImage, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cachedFetch } from "@/lib/api-cache";

export type Venda = {
  id: string;
  propertyId: string | null;
  propertyTypeId: string | null;
  propertyName: string | null;
  unit: string | null;
  typology: string | null;
  area: number | null;
  bedrooms: number | null;
  floorPlanUrl: string | null;
  saleValue: number;
  saleDate: string | null;
  notes: string | null;
  property?: { id: string; title: string } | null;
};
type Tipologia = { id: string; name: string; value: number; area: number | null; dormitorios: number | null; floorPlanUrl: string | null };
type Imovel = { id: string; title: string; propertyTypes?: Tipologia[] };

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// data da venda é só dia: lida em UTC para não "voltar" um dia no fuso de Brasília
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Planta, área, dormitórios e unidade sem repetir o que a planta já diz. */
function descricao(v: Venda) {
  const planta = v.typology ?? "";
  const partes = [
    planta,
    v.area && !/m²|m2/i.test(planta) ? `${v.area} m²` : null,
    v.bedrooms && !/dorm|su[ií]te|quarto/i.test(planta) ? `${v.bedrooms} dorm.` : null,
    v.unit ? `unid. ${v.unit}` : null,
  ];
  return partes.filter(Boolean).join(" · ");
}

const VAZIO = {
  origem: "crm" as "crm" | "fora",
  propertyId: "",
  propertyTypeId: "",
  propertyName: "",
  unit: "",
  typology: "",
  area: "",
  bedrooms: "",
  floorPlanUrl: "",
  saleValue: "",
  saleDate: "",
  notes: "",
};

function formDaVenda(v: Venda): typeof VAZIO {
  return {
    origem: v.propertyId ? "crm" : "fora",
    propertyId: v.propertyId ?? "",
    propertyTypeId: v.propertyTypeId ?? "",
    propertyName: v.propertyName ?? "",
    unit: v.unit ?? "",
    typology: v.typology ?? "",
    area: v.area != null ? String(v.area) : "",
    bedrooms: v.bedrooms != null ? String(v.bedrooms) : "",
    floorPlanUrl: v.floorPlanUrl ?? "",
    saleValue: String(v.saleValue),
    saleDate: v.saleDate ? v.saleDate.slice(0, 10) : "",
    notes: v.notes ?? "",
  };
}

/** Formulário de uma venda: imóvel do CRM (com tipologia) ou de fora (com planta). */
export function VendaDialog({
  clientId, aberto, onFechar, venda, titulo, onSalvo,
}: {
  clientId: string;
  aberto: boolean;
  onFechar: () => void;
  venda?: Venda | null;
  titulo?: string;
  onSalvo: (total: number, venda: Venda) => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(VAZIO);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setForm(venda ? formDaVenda(venda) : VAZIO);
    cachedFetch("/api/properties")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => setImoveis(Array.isArray(lista) ? lista : []))
      .catch(() => null);
  }, [aberto, venda]);

  const campo = (k: keyof typeof VAZIO) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const imovel = imoveis.find((i) => i.id === form.propertyId);
  const tipologias = imovel?.propertyTypes ?? [];

  const escolherTipologia = (id: string) => {
    const t = tipologias.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      propertyTypeId: id,
      typology: t?.name ?? "",
      // sugere o valor de tabela da tipologia, se ainda não tem valor
      saleValue: f.saleValue || (t?.value ? String(t.value) : ""),
    }));
  };

  const enviarPlanta = async (arquivo: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", arquivo);
      const r = await fetch(`/api/clients/${clientId}/sales/planta`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setForm((f) => ({ ...f, floorPlanUrl: j.url }));
    } catch (e: any) {
      toast({ title: "Não foi possível enviar a planta", description: e.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const corpo =
        form.origem === "crm"
          ? { ...form, propertyName: "" }
          : { ...form, propertyId: "", propertyTypeId: "" };
      const r = await fetch(venda ? `/api/clients/${clientId}/sales/${venda.id}` : `/api/clients/${clientId}/sales`, {
        method: venda ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await onSalvo(j.total, j.venda);
      onFechar();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar a venda", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const ehImagem = /\.(jpe?g|png|webp)(\?|$)/i.test(form.floorPlanUrl);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo ?? (venda ? "Editar venda" : "Nova venda")}</DialogTitle>
          <DialogDescription>O imóvel vendido, a planta e o valor. Um cliente pode ter várias vendas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={form.origem} onValueChange={(v) => setForm((f) => ({ ...f, origem: v as "crm" | "fora" }))}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crm">Imóvel do CRM</TabsTrigger>
              <TabsTrigger value="fora">Imóvel fora do CRM</TabsTrigger>
            </TabsList>
          </Tabs>

          {form.origem === "crm" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Imóvel</Label>
                <Select value={form.propertyId} onValueChange={(v) => setForm((f) => ({ ...f, propertyId: v, propertyTypeId: "", typology: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Escolha o empreendimento" /></SelectTrigger>
                  <SelectContent>
                    {imoveis.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {tipologias.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Planta / tipologia</Label>
                  <Select value={form.propertyTypeId} onValueChange={escolherTipologia}>
                    <SelectTrigger><SelectValue placeholder="Escolha a planta" /></SelectTrigger>
                    <SelectContent>
                      {tipologias.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {[t.name, t.area && `${t.area} m²`, t.dormitorios && `${t.dormitorios} dorm.`, t.value > 0 && reais(t.value)].filter(Boolean).join(" · ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="v-nome">Empreendimento</Label>
                <Input id="v-nome" value={form.propertyName} onChange={(e) => campo("propertyName")(e.target.value)} placeholder="Ex.: On the Sky Bela Cintra" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="v-planta">Planta</Label>
                <Input id="v-planta" value={form.typology} onChange={(e) => campo("typology")(e.target.value)} placeholder="Ex.: 83 m², 2 suítes, 1 vaga" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-area">Área (m²)</Label>
                <Input id="v-area" inputMode="decimal" value={form.area} onChange={(e) => campo("area")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-dorm">Dormitórios</Label>
                <Input id="v-dorm" inputMode="numeric" value={form.bedrooms} onChange={(e) => campo("bedrooms")(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Imagem ou PDF da planta</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild variant="outline" size="sm" disabled={enviando}>
                    <label className="cursor-pointer">
                      {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {form.floorPlanUrl ? "Trocar a planta" : "Enviar a planta"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const arq = e.target.files?.[0];
                          e.target.value = "";
                          if (arq) enviarPlanta(arq);
                        }}
                      />
                    </label>
                  </Button>
                  {form.floorPlanUrl && (
                    <a href={form.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">
                      Ver a planta enviada
                    </a>
                  )}
                </div>
                {ehImagem && <img src={form.floorPlanUrl} alt="Planta enviada" className="mt-2 max-h-40 rounded-md border object-contain" />}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="v-unidade">Unidade</Label>
              <Input id="v-unidade" value={form.unit} onChange={(e) => campo("unit")(e.target.value)} placeholder="Ex.: 1304, 13º andar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-data">Data da venda</Label>
              <Input id="v-data" type="date" value={form.saleDate} onChange={(e) => campo("saleDate")(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="v-valor">Valor vendido (R$)</Label>
              <Input id="v-valor" inputMode="decimal" value={form.saleValue} onChange={(e) => campo("saleValue")(e.target.value)} placeholder="Ex.: 1636008" />
              {Number(form.saleValue.replace(",", ".")) > 0 && (
                <p className="text-xs text-muted-foreground">{reais(Number(form.saleValue.replace(",", ".")))}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="v-obs">Observação</Label>
              <Textarea id="v-obs" rows={2} value={form.notes} onChange={(e) => campo("notes")(e.target.value)} placeholder="Ex.: fluxo com 2 parcelas de 20 mil" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || enviando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Vendas do cliente: cada imóvel vendido, com planta e valor, e o total. */
export function SalesCard({ clientId, vendas, onAlterado }: { clientId: string; vendas: Venda[]; onAlterado: () => void }) {
  const { toast } = useToast();
  const [editando, setEditando] = useState<Venda | null>(null);
  const [aberto, setAberto] = useState(false);
  const total = vendas.reduce((s, v) => s + v.saleValue, 0);

  const apagar = async (v: Venda) => {
    if (!confirm("Apagar esta venda?")) return;
    const r = await fetch(`/api/clients/${clientId}/sales/${v.id}`, { method: "DELETE" });
    if (!r.ok) return toast({ title: "Não foi possível apagar", variant: "destructive" });
    onAlterado();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Vendas</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendas.length} {vendas.length === 1 ? "imóvel" : "imóveis"} · total <b className="text-foreground">{reais(total)}</b>
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditando(null); setAberto(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Venda
        </Button>
      </CardHeader>
      <CardContent>
        {vendas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
        ) : (
          <ul className="space-y-3">
            {vendas.map((v) => (
              <li key={v.id} className="flex gap-3 rounded-lg border p-3">
                {v.floorPlanUrl && /\.(jpe?g|png|webp)(\?|$)/i.test(v.floorPlanUrl) ? (
                  <a href={v.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label="Ver a planta">
                    <img src={v.floorPlanUrl} alt="" className="h-16 w-16 rounded-md border object-cover" />
                  </a>
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground" aria-hidden>
                    <Building2 className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{v.property?.title ?? v.propertyName ?? "Imóvel"}</p>
                  <p className="text-sm text-muted-foreground">
                    {descricao(v) || "Sem planta informada"}
                  </p>
                  <p className="mt-1 text-sm">
                    <b>{reais(v.saleValue)}</b>
                    {v.saleDate && <span className="text-muted-foreground"> · {dataBR(v.saleDate)}</span>}
                  </p>
                  {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                  {v.floorPlanUrl && !/\.(jpe?g|png|webp)(\?|$)/i.test(v.floorPlanUrl) && (
                    <a href={v.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline underline-offset-4">
                      <FileImage className="h-3.5 w-3.5" /> Planta (PDF)
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Editar venda" onClick={() => { setEditando(v); setAberto(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Apagar venda" onClick={() => apagar(v)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <VendaDialog clientId={clientId} aberto={aberto} venda={editando} onFechar={() => setAberto(false)} onSalvo={() => onAlterado()} />
    </Card>
  );
}
