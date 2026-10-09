"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "sidebar:collapsed";
const CHANGE_EVENT = "sidebar:collapsed-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// O menu começa recolhido; só fica aberto se o usuário tiver aberto antes.
function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * Estado recolhido/aberto do menu lateral no desktop. Compartilhado entre o
 * menu e o layout (que ajusta a margem do conteúdo) e lembrado entre visitas.
 *
 * As classes de margem ficam nos próprios layouts, em components/: o Tailwind
 * não lê a pasta hooks/, então uma classe escrita aqui nunca seria gerada.
 */
export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => true);

  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Sem armazenamento (aba privada): o estado vale só até recarregar.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [collapsed, setCollapsed];
}
