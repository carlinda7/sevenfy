import { callBotApi } from "./panel.functions";

export type PanelConfig = { base: string; token: string };

const STORAGE_KEY = "botaura.panel.config";

export function loadConfig(): PanelConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelConfig;
    if (!parsed?.base || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(config: PanelConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function api<T>(
  config: PanelConfig,
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const result = await callBotApi({
    data: {
      base: config.base,
      token: config.token,
      path,
      method: init?.method ?? "GET",
      body: init?.body,
    },
  });
  const payload = result.payload as { ok?: boolean; error?: string } & T;
  if (!result.ok || payload?.ok === false) {
    throw new Error(
      payload?.error === "unauthorized"
        ? "Token inválido — gere um novo em Painel Admin > Painel Web."
        : (payload?.error ?? `Erro ${result.status}`),
    );
  }
  return payload;
}

export type StartMetrics = {
  total: number;
  total_unicos: number;
  hoje: number;
  hoje_unicos: number;
  hoje_novos: number;
  d7: number;
  d7_unicos: number;
  d30: number;
  d30_unicos: number;
  novos_total: number;
  serie: { dia: string; total: number; novos: number }[];
};

export type Dashboard = {
  loja: string;
  manutencao: boolean;
  starts: StartMetrics;
  usuarios: { total: number; hoje: number; d7: number; banidos: number; saldo_total: number };
  pedidos: { total: number; hoje: number; d7: number; d30: number };
  faturamento: { total: number; hoje: number; d7: number; d30: number };
  recargas: { pagas_total: number; pagas_hoje: number; pendentes: number };
  produtos: { total: number; ativos: number };
};

export type StartEvent = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  is_new: number;
  referrer_id: number;
  created_at: string;
};

export const money = (value: number) =>
  `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
