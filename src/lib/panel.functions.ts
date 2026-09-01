import { createServerFn } from "@tanstack/react-start";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type ProxyInput = {
  base?: string | undefined;
  token?: string | undefined;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

function normalize(base: string) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/** Informa ao painel se o servidor já tem URL/token do bot configurados. */
export const getPanelDefaults = createServerFn({ method: "GET" }).handler(async () => ({
  hasBase: Boolean(process.env["BOT_API_BASE"]),
  hasToken: Boolean(process.env["BOT_API_TOKEN"]),
}));

/**
 * Proxy para a API do bot (aiohttp). Roda no servidor para evitar CORS e
 * bloqueio de conteúdo misto (painel em https -> bot em http).
 */
export const callBotApi = createServerFn({ method: "POST" })
  .inputValidator((input: ProxyInput) => {
    if (!input || typeof input.path !== "string") throw new Error("Parâmetros inválidos");
    if (!input.path.startsWith("/api/")) throw new Error("Rota inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const base = (data.base?.trim() || process.env["BOT_API_BASE"] || "").trim();
    const token = (data.token?.trim() || process.env["BOT_API_TOKEN"] || "").trim();
    if (!base) {
      return {
        status: 0,
        ok: false,
        payload: {
          ok: false,
          error:
            "URL da API do bot não configurada no servidor. Informe a URL manualmente ou salve o segredo BOT_API_BASE.",
        },
      };
    }
    const url = `${normalize(base)}${data.path}`;
    const isPost = data.method === "POST";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        method: data.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(isPost ? { body: JSON.stringify(data.body ?? {}) } : {}),
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: Json = {};
      try {
        parsed = JSON.parse(text) as Json;
      } catch {
        parsed = { ok: false, error: text.slice(0, 200) };
      }
      return { status: response.status, ok: response.ok, payload: parsed };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Falha de conexão com o bot",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  });
