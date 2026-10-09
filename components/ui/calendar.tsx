import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Botões de mês anterior / próximo: círculos no canto superior direito.
const NAV_BUTTON =
  "grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

// Faixa que liga o início ao fim de um intervalo selecionado.
const RANGE_BAND = "bg-[var(--accent-glow-strong)]";

/**
 * Calendário do sistema (react-day-picker v9).
 *
 * Na v9 a navegação é irmã do mês, dentro de `months` — por isso `months` é
 * `relative` e `nav` fica ancorada no topo dele. Sem isso as setas se
 * posicionam em relação ao popover e aparecem soltas no meio dos dias.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-9 items-center pl-1 pr-20",
        caption_label: "text-base font-semibold capitalize tracking-tight text-foreground",
        nav: "absolute right-0 top-0 z-10 flex items-center gap-1",
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-10 pb-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-10 w-10 p-0 text-center text-sm focus-within:z-20",
        day_button:
          "grid h-10 w-10 place-items-center rounded-full font-normal text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Dia selecionado: dourado da marca com texto escuro (9:1).
        selected:
          "[&>button]:bg-[var(--accent-primary)] [&>button]:font-semibold [&>button]:text-[#07090D] [&>button]:hover:bg-[var(--accent-primary)]",
        range_start: cn(RANGE_BAND, "rounded-l-full"),
        range_end: cn(RANGE_BAND, "rounded-r-full"),
        range_middle: cn(RANGE_BAND, "[&>button]:!bg-transparent [&>button]:!font-normal [&>button]:!text-foreground"),
        // Hoje: anel, para não se confundir com o dia selecionado (preenchido).
        today: "[&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-[var(--secondary-custom-text)]",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled: "[&>button]:pointer-events-none [&>button]:text-muted-foreground [&>button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
