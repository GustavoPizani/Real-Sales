"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE = {
  label: "color:#aa8d44;font-weight:bold;font-family:monospace",
  ok: "color:#22c55e;font-weight:bold;font-family:monospace",
  warn: "color:#f59e0b;font-weight:bold;font-family:monospace",
  slow: "color:#ef4444;font-weight:bold;font-family:monospace",
  dim: "color:#6b7280;font-family:monospace",
  header: "color:#023863;font-weight:bold;font-size:13px;font-family:monospace",
};

function speed(ms: number) {
  if (ms < 300) return ["⚡ Rápido", STYLE.ok];
  if (ms < 800) return ["⚠ Moderado", STYLE.warn];
  return ["🐌 Lento", STYLE.slow];
}

function patchFetch() {
  if ((window as any).__perfMonitorPatched) return;
  (window as any).__perfMonitorPatched = true;

  const original = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    const isApi = url.includes("/api/");
    const t0 = performance.now();

    const res = await original.apply(this, args);

    if (isApi) {
      const ms = Math.round(performance.now() - t0);
      const path = url.replace(window.location.origin, "");
      const [label, style] = speed(ms);
      console.log(
        `%c[API] %c${path} %c${ms}ms %c${label}`,
        STYLE.label, STYLE.dim, ms < 300 ? STYLE.ok : ms < 800 ? STYLE.warn : STYLE.slow, style
      );
    }
    return res;
  };
}

export function PerfMonitor() {
  const pathname = usePathname();

  // Patch fetch uma vez
  useEffect(() => { patchFetch(); }, []);

  // Mede tempo de cada navegação de página
  useEffect(() => {
    const t0 = performance.now();

    const id = requestAnimationFrame(() => {
      // Espera o próximo frame pintado para medir
      requestAnimationFrame(() => {
        const ms = Math.round(performance.now() - t0);
        const [label, style] = speed(ms);
        console.log(
          `%c[PAGE] %c${pathname} %c${ms}ms %c${label}`,
          STYLE.header, STYLE.dim, ms < 300 ? STYLE.ok : ms < 800 ? STYLE.warn : STYLE.slow, style
        );
      });
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Relatório de página inicial via Navigation Timing API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const report = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return;

      const ttfb = Math.round(nav.responseStart - nav.requestStart);
      const domLoad = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
      const total = Math.round(nav.loadEventEnd - nav.startTime);

      console.group("%c🚀 Real Sales — Performance da página", STYLE.header);
      console.log(`%cTTFB (tempo até 1º byte):  %c${ttfb}ms`, STYLE.dim, ttfb < 200 ? STYLE.ok : STYLE.warn);
      console.log(`%cDOMContentLoaded:           %c${domLoad}ms`, STYLE.dim, domLoad < 800 ? STYLE.ok : STYLE.warn);
      console.log(`%cLoad total:                 %c${total}ms`, STYLE.dim, total < 1500 ? STYLE.ok : STYLE.slow);
      console.groupEnd();
    };

    if (document.readyState === "complete") {
      report();
    } else {
      window.addEventListener("load", report, { once: true });
    }
  }, []);

  return null;
}
