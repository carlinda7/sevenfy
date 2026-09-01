import { useCallback, useEffect, useRef, useState } from "react";
import { api, type PanelConfig, type StartEvent } from "./panel-client";

const SEEN_KEY = "botaura.panel.lastStartId";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

export function useStartNotifications(config: PanelConfig | null, enabled: boolean) {
  const [permission, setPermission] = useState<NotifyPermission>("unsupported");
  const [recent, setRecent] = useState<StartEvent[]>([]);
  const lastIdRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission as NotifyPermission);
    lastIdRef.current = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as NotifyPermission);
  }, []);

  const show = useCallback(async (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "aura-start",
        });
        return;
      }
    } catch {
      /* fallback abaixo */
    }
    new Notification(title, { body, icon: "/icon-192.png" });
  }, []);

  useEffect(() => {
    if (!config || !enabled) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const response = await api<{ data: StartEvent[] }>(config, `/api/starts?limit=25`);
        if (cancelled) return;
        const events = response.data ?? [];
        setRecent(events);
        const novos = events.filter((event) => event.id > lastIdRef.current);
        if (lastIdRef.current > 0 && novos.length > 0) {
          const first = novos[0]!;
          const nome = first.username ? `@${first.username}` : (first.first_name || first.telegram_id);
          await show(
            novos.length === 1 ? "🚀 Novo /start no bot" : `🚀 ${novos.length} novos /start`,
            novos.length === 1
              ? `${nome} ${first.is_new ? "criou conta" : "voltou"} agora`
              : `Último: ${nome}`,
          );
        }
        if (events.length > 0) {
          lastIdRef.current = Math.max(lastIdRef.current, events[0]!.id);
          window.localStorage.setItem(SEEN_KEY, String(lastIdRef.current));
        }
      } catch {
        /* silencioso: o dashboard já mostra erro de conexão */
      }
    };

    void tick();
    const interval = window.setInterval(tick, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [config, enabled, show]);

  return { permission, requestPermission, recent };
}
