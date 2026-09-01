import { createServerFn } from "@tanstack/react-start";

type ProxyInput = {
  base: string;
  token: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

function normalize(base: string) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/**
 * Proxy para a API do bot (aiohttp). Roda no servidor para evitar CORS e
 * bloqueio de conteúdo misto (painel em https -> bot em http).
 */
export const callBotApi = createServerFn({ method: "POST" })
  .inputValidator((input: ProxyInput) => {
    if (!input || typeof input.base !== "string" || typeof input.path !== "string") {
      throw new Error("Parâmetros inválidos");
    }
    if (!input.path.startsWith("/api/")) throw new Error("Rota inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const url = `${normalize(data.base)}${data.path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        method: data.method ?? "GET",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application/json",
        },
        body: data.method === "POST" ? JSON.stringify(data.body ?? {}) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
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
