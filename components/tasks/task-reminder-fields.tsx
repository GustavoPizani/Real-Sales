"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const REMINDER_BEFORE_OPTIONS = [
  { value: "0", label: "No horário exato" },
  { value: "5", label: "5 minutos antes" },
  { value: "10", label: "10 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

export const OVERDUE_REPEAT_OPTIONS = [
  { value: "0", label: "Não repetir" },
  { value: "15", label: "A cada 15 minutos" },
  { value: "30", label: "A cada 30 minutos" },
  { value: "60", label: "A cada 1 hora" },
  { value: "180", label: "A cada 3 horas" },
  { value: "1440", label: "A cada 1 dia" },
];

// null = usa o padrão de Configurações (avisos) do usuário.
export function TaskReminderFields({
  reminderMinutesBefore,
  onReminderMinutesBeforeChange,
  overdueRepeatMinutes,
  onOverdueRepeatMinutesChange,
  defaultReminderMinutes = 30,
}: {
  reminderMinutesBefore: number | null;
  onReminderMinutesBeforeChange: (value: number) => void;
  overdueRepeatMinutes: number | null;
  onOverdueRepeatMinutesChange: (value: number) => void;
  defaultReminderMinutes?: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Avisar antes</Label>
        <Select
          value={String(reminderMinutesBefore ?? defaultReminderMinutes)}
          onValueChange={(v) => onReminderMinutesBeforeChange(Number(v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {REMINDER_BEFORE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Se atrasar, repetir aviso</Label>
        <Select
          value={String(overdueRepeatMinutes ?? 0)}
          onValueChange={(v) => onOverdueRepeatMinutesChange(Number(v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OVERDUE_REPEAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
