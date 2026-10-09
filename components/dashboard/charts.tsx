"use client";

import { DASH_MARK } from "./ui";
import { formatPercent, type FunnelStepDatum, type TrendDatum } from "./types";

// Trilho por trás das marcas: visível nos dois temas, sem competir com o dado.
const TRACK = "bg-foreground/[0.07]";

// Listras para "nada registrado": não depende de cor para ser lido.
const HATCH =
  "bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.5)_0_2px,transparent_2px_7px)]";

const BUBBLE =
  "pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";

/**
 * Funil em barras horizontais: cada etapa mostra quantos chegaram, o percentual
 * sobre a primeira etapa e a conversão em relação à etapa anterior.
 */
export function FunnelBars({ steps, emptyText }: { steps: FunnelStepDatum[]; emptyText: string }) {
  const first = steps[0]?.count ?? 0;
  // Contando por data do evento, uma etapa pode ter mais gente que a primeira
  // (clientes que entraram antes do período): a barra mais longa é a referência.
  const longest = Math.max(0, ...steps.map(s => s.count));
  if (longest === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <ol>
      {steps.map((step, i) => {
        const share = (step.count / longest) * 100;
        const previous = i > 0 ? steps[i - 1].count : null;
        return (
          <li key={`${step.name}-${i}`}>
            {/* Conversão entre uma etapa e a seguinte, no espaço entre as duas barras. */}
            {previous !== null && (
              <p className="flex items-center gap-2 py-2 pl-1 text-xs text-muted-foreground">
                <span className="h-4 w-px bg-border" aria-hidden="true" />
                {previous > 0 ? `${formatPercent((step.count / previous) * 100)} avançaram` : "sem base para comparar"}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">{step.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {i > 0 && first > 0 && <>{formatPercent((step.count / first) * 100)} · </>}
                <span className="text-base font-semibold text-foreground">{step.count.toLocaleString("pt-BR")}</span>
              </span>
            </div>
            <div className={`mt-1.5 h-3.5 overflow-hidden rounded-full ${TRACK}`}>
              <div
                className={`h-full rounded-full ${DASH_MARK}`}
                style={{ width: `${step.count > 0 ? Math.min(Math.max(share, 2.5), 100) : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export interface SeriesDatum {
  label: string;
  value: number;
}

/**
 * Colunas em formato de pílula ao longo do período, uma série só. Cada coluna
 * é um trilho de altura cheia preenchido de baixo para cima, então um valor
 * pequeno continua legível como proporção. Sem nada registrado, o trilho fica listrado.
 */
export function SeriesBars({
  data,
  noun,
  emptyText,
  formatValue = (value: number) => value.toLocaleString("pt-BR"),
  formatShort = formatValue,
}: {
  data: SeriesDatum[];
  /** Nome do que está sendo contado, para o balão e o leitor de tela (ex.: "leads"). */
  noun: string;
  emptyText: string;
  formatValue?: (value: number) => string;
  /** Versão curta, escrita em cada coluna (ex.: "1,2 mil" em vez de "R$ 1.234,56"). */
  formatShort?: (value: number) => string;
}) {
  const max = Math.max(0, ...data.map(d => d.value));
  if (max === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
  const labelEvery = Math.ceil(data.length / 8);
  const gap = data.length > 16 ? "gap-1" : "gap-2 sm:gap-3";
  // O valor fica escrito em cada coluna. Com muitas colunas elas ficam estreitas
  // e o número vai na vertical; acima de 45 não cabe mais e fica só o resumo.
  const showValues = data.length <= 45;
  const vertical = data.length > 16;

  return (
    <div role="group" aria-label={`${formatValue(total)} ${noun} no período, de ${data[0].label} a ${data[data.length - 1].label}`}>
      {/* Resumo sempre visível: os números principais não dependem de passar o mouse. */}
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatValue(total)}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Média</dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatValue(total / data.length)}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Maior</dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatValue(peak.value)} <span className="font-normal text-muted-foreground">em {peak.label}</span></dd>
        </div>
      </dl>

      <div className={`mt-4 flex h-48 ${gap}`}>
        {data.map((d, i) => {
          const height = d.value > 0 ? Math.max((d.value / max) * 100, 5) : 0;
          // Coluna quase cheia: o número vai dentro do preenchimento; senão, logo acima dele.
          const inside = height > (vertical ? 62 : 82);
          return (
            <div
              key={`${d.label}-${i}`}
              tabIndex={0}
              aria-label={`${d.label}: ${formatValue(d.value)} ${noun}`}
              className="group relative flex min-w-0 flex-1 justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className={`relative h-full w-full max-w-16 overflow-hidden rounded-full ${d.value > 0 ? TRACK : HATCH}`}>
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-300 ease-out ${DASH_MARK}`}
                  style={{ height: `${height}%` }}
                />
                {showValues && d.value > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 whitespace-nowrap text-xs font-semibold tabular-nums ${
                      // Sobre o preenchimento: branco no tema claro (dourado escuro), escuro no tema escuro (dourado claro).
                      inside ? "text-white dark:text-[#07090D]" : "text-foreground"
                    } ${vertical ? "[writing-mode:vertical-rl]" : ""}`}
                    style={
                      inside
                        ? { top: `calc(${100 - height}% + 8px)`, transform: vertical ? "translateX(-50%) rotate(180deg)" : "translateX(-50%)" }
                        : { bottom: `calc(${height}% + 4px)`, transform: vertical ? "translateX(-50%) rotate(180deg)" : "translateX(-50%)" }
                    }
                  >
                    {formatShort(d.value)}
                  </span>
                )}
              </div>
              <span className={BUBBLE}>
                {d.label}: {formatValue(d.value)} {noun}
              </span>
            </div>
          );
        })}
      </div>
      <div className={`mt-2 flex ${gap}`} aria-hidden="true">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-xs text-muted-foreground">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Evolução do dashboard do CRM: entradas ou vendas por dia ou mês. */
export function TrendBars({
  data,
  dataKey,
  noun,
  emptyText,
}: {
  data: TrendDatum[];
  dataKey: "leads" | "won";
  noun: string;
  emptyText: string;
}) {
  return <SeriesBars data={data.map(d => ({ label: d.label, value: d[dataKey] }))} noun={noun} emptyText={emptyText} />;
}

const ARC = "M 20 100 A 80 80 0 0 1 180 100";
const ARC_LENGTH = Math.PI * 80;

/**
 * Meia-rosca com a situação dos clientes que entraram no período:
 * ganhos, em andamento e perdidos. O número do centro é a fatia de ganhos.
 */
export function StatusGauge({ won, active, lost }: { won: number; active: number; lost: number }) {
  const total = won + active + lost;
  if (total === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente entrou no período.</p>;

  // Cada situação tem cor própria e a legenda traz número e percentual: a cor não é o único sinal.
  const segments = [
    { label: "Ganhos", value: won, stroke: "var(--secondary-custom-text)", swatch: DASH_MARK },
    { label: "Em andamento", value: active, stroke: "hsl(var(--chart-2))", swatch: "bg-chart-2" },
    { label: "Perdidos", value: lost, stroke: "hsl(var(--destructive))", swatch: "bg-destructive" },
  ];

  // Cada fatia é desenhada do início do arco até o fim acumulado dela, da última
  // para a primeira: as pontas ficam arredondadas e uma fatia encaixa na outra.
  let cumulative = 0;
  const layers = segments
    .map(segment => {
      cumulative += segment.value;
      return { ...segment, end: (cumulative / total) * ARC_LENGTH };
    })
    .filter(layer => layer.value > 0)
    .reverse();

  return (
    <div>
      <div className="relative mx-auto max-w-[18rem]">
        <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`${won} ganhos, ${active} em andamento e ${lost} perdidos, de ${total} clientes`}>
          <path d={ARC} fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="18" strokeLinecap="round" className="text-foreground" />
          {layers.map(layer => (
            <path
              key={layer.label}
              d={ARC}
              fill="none"
              stroke={layer.stroke}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(layer.end, 0.01)} ${ARC_LENGTH * 2}`}
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {formatPercent((won / total) * 100)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">viraram venda</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {segments.map(segment => (
          <li key={segment.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.swatch}`} aria-hidden="true" />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{formatPercent((segment.value / total) * 100)}</span>
            <span className="w-12 text-right font-semibold tabular-nums text-foreground">{segment.value.toLocaleString("pt-BR")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
