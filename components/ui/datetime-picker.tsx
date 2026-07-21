"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Mesmo formato do <input type="datetime-local">: "YYYY-MM-DDTHH:mm" em horário local.
function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [datePart, timePart] = value.split("T");
  if (!datePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  return isNaN(date.getTime()) ? undefined : date;
}

function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

export function DateTimePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const selected = parseValue(value);
  const [open, setOpen] = React.useState(false);

  const applyDate = (date: Date | undefined) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(selected ? selected.getHours() : 9, selected ? selected.getMinutes() : 0, 0, 0);
    onChange(toValue(next));
    setOpen(false);
  };

  const applyHour = (h: string) => {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setHours(Number(h));
    onChange(toValue(next));
  };

  const applyMinute = (m: string) => {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setMinutes(Number(m));
    onChange(toValue(next));
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("flex-1 justify-start text-left font-normal", !selected && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            {selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={applyDate}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-1">
        <Select value={selected ? pad(selected.getHours()) : undefined} onValueChange={applyHour}>
          <SelectTrigger className="w-[92px]">
            <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="hh" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map(h => <SelectItem key={h} value={h}>{h}h</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select value={selected ? pad(selected.getMinutes()) : undefined} onValueChange={applyMinute}>
          <SelectTrigger className="w-[72px]">
            <SelectValue placeholder="mm" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
