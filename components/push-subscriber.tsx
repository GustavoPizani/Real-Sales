"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function trySubscribe(userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  // Não pergunta se já foi negado
  if (Notification.permission === "denied") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    // Já inscrito — só garante que o servidor tem a inscrição atualizada
    if (existing) {
      await saveSubscription(existing);
      return;
    }

    // Solicita permissão (mostra o diálogo nativo do browser)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await saveSubscription(subscription);
  } catch {
    // Silent — não interrompe a navegação
  }
}

async function saveSubscription(sub: PushSubscription) {
  try {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
  } catch {
    // Silent
  }
}

export function PushSubscriber() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Pequeno delay para não competir com o carregamento inicial da página
    const id = setTimeout(() => trySubscribe(user.id), 3000);
    return () => clearTimeout(id);
  }, [user?.id]);

  return null;
}
