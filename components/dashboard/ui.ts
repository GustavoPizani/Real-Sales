// Estilo do dashboard: painel arredondado com cartões "flutuando" dentro dele,
// nas cores do sistema (navy + dourado), nos dois temas.
//
// Claro:  painel cinza-claro, cartões brancos.
// Escuro: painel navy, cartões um tom acima.

export const DASH_PANEL =
  "rounded-[22px] bg-[var(--bg-secondary)] p-3 sm:rounded-[26px] sm:p-5 lg:p-6 dark:bg-[var(--bg-card)]";

export const DASH_CARD =
  "rounded-[20px] border border-border/50 bg-[var(--bg-card)] shadow-[var(--shadow-card)] dark:bg-[var(--bg-card-hover)]";

/** Superfície de campos e abas dentro do painel. */
export const DASH_SURFACE = "bg-[var(--bg-card)] dark:bg-[var(--bg-card-hover)]";

/** Cartão de destaque: dourado da marca com texto escuro (9:1 de contraste). */
export const DASH_HERO =
  "border-transparent bg-gradient-to-br from-[#E6CB98] to-[#B8935A] text-[#07090D] shadow-[0_14px_30px_-16px_rgba(184,147,90,0.7)]";

/** Cor das marcas dos gráficos: dourado escuro no tema claro (5:1 no branco), dourado da marca no escuro. */
export const DASH_MARK = "bg-[var(--secondary-custom-text)]";

export const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
