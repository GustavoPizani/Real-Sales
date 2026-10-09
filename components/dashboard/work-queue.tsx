"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarClock, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { DashboardData, DashboardTask } from "./types";
import { DASH_CARD, DASH_SURFACE } from "./ui";

const ALL = "all";
const UPCOMING_PREVIEW = 8;

function SummaryStat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`flex min-h-[7.5rem] flex-col p-4 sm:p-5 ${DASH_CARD}`}>
      <p className="text-[15px] font-medium leading-tight text-foreground">{label}</p>
      <p className={`mt-auto flex items-center gap-2 pt-3 text-4xl font-semibold leading-none tracking-tight tabular-nums ${alert && value > 0 ? "text-destructive" : "text-foreground"}`}>
        {alert && value > 0 && <AlertCircle className="h-6 w-6" aria-hidden="true" />}
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

function TaskRow({
  task,
  overdue,
  showBroker,
  canComplete,
  onComplete,
}: {
  task: DashboardTask;
  overdue: boolean;
  showBroker: boolean;
  canComplete: boolean;
  onComplete: (task: DashboardTask) => void;
}) {
  const when = new Date(task.dateTime);
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-destructive" : ""}`}>
            {overdue ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
            {overdue
              ? `Atrasada ${formatDistanceToNow(when, { addSuffix: true, locale: ptBR })}`
              : format(when, "dd/MM 'às' HH:mm")}
          </span>
          {task.client && (
            <Link href={`/client/${task.client.id}`} className="underline-offset-2 hover:text-foreground hover:underline">
              {task.client.fullName}
            </Link>
          )}
          {showBroker && <span>· {task.user.name}</span>}
        </p>
      </div>
      {canComplete && (
        <Button variant="outline" className="shrink-0 rounded-full" onClick={() => onComplete(task)}>
          <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />Concluir
        </Button>
      )}
    </li>
  );
}

/**
 * Fila de trabalho: tarefas atrasadas, de hoje e próximas, e clientes parados.
 * Na visão de gerente (`team`) mostra de quem é cada item e filtra por corretor.
 */
export function WorkQueue({
  data,
  currentUserId,
  team = false,
  onChanged,
}: {
  data: DashboardData;
  currentUserId: string;
  team?: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [brokerId, setBrokerId] = useState(ALL);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<DashboardTask | null>(null);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { overdue, today, upcoming, stale } = useMemo(() => {
    const now = new Date();
    const tasks = brokerId === ALL ? data.tasks : data.tasks.filter(t => t.user.id === brokerId);
    return {
      overdue: tasks.filter(t => new Date(t.dateTime) < now),
      today: tasks.filter(t => new Date(t.dateTime) >= now && isSameDay(new Date(t.dateTime), now)),
      upcoming: tasks.filter(t => new Date(t.dateTime) >= now && !isSameDay(new Date(t.dateTime), now)),
      stale: brokerId === ALL ? data.staleClients : data.staleClients.filter(c => c.broker.id === brokerId),
    };
  }, [data, brokerId]);

  const filtered = brokerId !== ALL;
  const tasksCut = data.totals.openTasks > data.tasks.length;
  const staleCut = data.totals.staleClients > data.staleClients.length;
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW);

  const handleComplete = async () => {
    if (!taskToComplete) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskToComplete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (!res.ok) throw new Error("Falha ao concluir tarefa.");

      if (taskToComplete.clientId) {
        const content = `Tarefa Concluída: "${taskToComplete.title}".\n\nComentário: ${comment || "Nenhum comentário adicionado."}`;
        await fetch(`/api/clients/${taskToComplete.clientId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      }

      toast({ title: "Tarefa concluída", description: "A anotação foi registrada no cliente." });
      setTaskToComplete(null);
      setComment("");
      onChanged();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openComplete = (task: DashboardTask) => {
    setComment("");
    setTaskToComplete(task);
  };

  const sections = [
    { key: "overdue", title: "Atrasadas", tasks: overdue, isOverdue: true, empty: "Nenhuma tarefa atrasada." },
    { key: "today", title: "Hoje", tasks: today, isOverdue: false, empty: "Nada mais para hoje." },
    { key: "upcoming", title: "Próximas", tasks: visibleUpcoming, isOverdue: false, empty: "Nenhuma tarefa agendada." },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryStat label="Tarefas atrasadas" value={filtered ? overdue.length : data.totals.overdueTasks} alert />
        <SummaryStat label="Para hoje" value={today.length} />
        <SummaryStat label={`Parados há ${data.staleDays}+ dias`} value={filtered ? stale.length : data.totals.staleClients} alert />
        <SummaryStat label="Clientes em andamento" value={data.totals.activeClients} />
      </div>

      {team && data.brokers.length > 1 && (
        <div className="w-full space-y-1 sm:w-64">
          <Label htmlFor="queue-broker" className="text-xs font-medium text-muted-foreground">Corretor</Label>
          <Select value={brokerId} onValueChange={setBrokerId}>
            <SelectTrigger id="queue-broker" className={`rounded-full ${DASH_SURFACE}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toda a equipe</SelectItem>
              {data.brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        <Card className={`lg:col-span-3 ${DASH_CARD}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-medium tracking-tight">{team ? "Tarefas da equipe" : "Minhas tarefas"}</CardTitle>
            <Button variant="ghost" asChild><Link href="/tasks">Ver todas</Link></Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {sections.map(section => (
              <section key={section.key} aria-labelledby={`queue-${section.key}`}>
                <h3
                  id={`queue-${section.key}`}
                  className={`flex items-center gap-2 text-sm font-semibold ${section.isOverdue && section.tasks.length > 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {section.title}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {section.key === "upcoming" ? upcoming.length : section.tasks.length}
                  </span>
                </h3>
                {section.tasks.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">{section.empty}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {section.tasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        overdue={section.isOverdue}
                        showBroker={team}
                        canComplete={task.user.id === currentUserId}
                        onComplete={openComplete}
                      />
                    ))}
                  </ul>
                )}
                {section.key === "upcoming" && upcoming.length > UPCOMING_PREVIEW && (
                  <Button variant="ghost" className="mt-1" onClick={() => setShowAllUpcoming(v => !v)}>
                    {showAllUpcoming ? "Mostrar menos" : `Mostrar mais ${upcoming.length - UPCOMING_PREVIEW}`}
                  </Button>
                )}
              </section>
            ))}
            {tasksCut && (
              <p className="text-xs text-muted-foreground">
                Mostrando as {data.tasks.length} tarefas mais antigas de {data.totals.openTasks} em aberto.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`lg:col-span-2 ${DASH_CARD}`}>
          <CardHeader>
            <CardTitle className="text-lg font-medium tracking-tight">Clientes parados há {data.staleDays}+ dias</CardTitle>
          </CardHeader>
          <CardContent>
            {stale.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Nenhum cliente parado. Todos tiveram atualização recente.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stale.map(client => (
                  <li key={client.id}>
                    <Link href={`/client/${client.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-accent">
                      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{client.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.funnelStage.name}
                          {team && ` · ${client.broker.name}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {staleCut && (
              <p className="mt-3 text-xs text-muted-foreground">
                Mostrando os {data.staleClients.length} há mais tempo sem atualização, de {data.totals.staleClients}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!taskToComplete} onOpenChange={open => { if (!open) setTaskToComplete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir tarefa: {taskToComplete?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {taskToComplete?.client && (
              <p className="text-sm text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{taskToComplete.client.fullName}</span>
              </p>
            )}
            <Label htmlFor="queue-comment">Comentário de conclusão</Label>
            <Textarea
              id="queue-comment"
              placeholder="Descreva o resultado ou adicione informações relevantes..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskToComplete(null)}>Cancelar</Button>
            <Button type="button" onClick={handleComplete} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Confirmar conclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
