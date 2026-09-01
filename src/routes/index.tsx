import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  api,
  clearConfig,
  loadConfig,
  money,
  saveConfig,
  type Dashboard,
  type PanelConfig,
} from "@/lib/panel-client";
import { useStartNotifications } from "@/lib/use-start-notifications";
import { Section, StartsChart, StatCard, Table } from "@/components/panel/parts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura Panel — Painel e métricas do bot Telegram" },
      {
        name: "description",
        content:
          "Painel web PWA do bot Telegram: métricas de /start (hoje, 7d, 30d), vendas, recargas, usuários e notificações em tempo real.",
      },
      { property: "og:title", content: "Aura Panel — Painel do bot Telegram" },
      {
        property: "og:description",
        content:
          "Acompanhe starts, vendas, recargas e usuários do seu bot Telegram, com notificações PWA.",
      },
    ],
  }),
  component: PanelPage,
});

type UserRow = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  balance: number;
  is_banned: number;
  created_at: string;
};

type OrderRow = {
  id: number;
  telegram_id: number | null;
  username: string | null;
  product_name?: string;
  total_price: number;
  created_at: string;
};

function PanelPage() {
  const [config, setConfig] = useState<PanelConfig | null>(null);
  const [ready, setReady] = useState(false);

  const defaults = useQuery({
    queryKey: ["panel-defaults"],
    queryFn: () => getPanelDefaults(),
    staleTime: Infinity,
  });

  useEffect(() => {
    setConfig(loadConfig());
    setReady(true);
  }, []);

  if (!ready || defaults.isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  const serverReady = Boolean(defaults.data?.hasBase && defaults.data?.hasToken);
  const active = config ?? (serverReady ? {} : null);

  return active ? (
    <Dashboard
      config={active}
      onDisconnect={
        serverReady && !config
          ? undefined
          : () => {
              clearConfig();
              setConfig(null);
            }
      }
    />
  ) : (
    <ConnectScreen
      needsBase={!defaults.data?.hasBase}
      onConnected={(next) => {
        saveConfig(next);
        setConfig(next);
      }}
    />
  );
}

function ConnectScreen({
  needsBase,
  onConnected,
}: {
  needsBase: boolean;
  onConnected: (config: PanelConfig) => void;
}) {
  const [base, setBase] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const candidate: PanelConfig = { token: token.trim() };
    if (needsBase && base.trim()) candidate.base = base.trim();
    try {
      await api<{ data: unknown }>(candidate, "/api/dashboard");
      onConnected(candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel-card w-full max-w-md p-7">
        <img src="/icon-192.png" alt="Aura Panel" width={56} height={56} className="rounded-2xl" />
        <h1 className="mt-5 font-display text-2xl font-bold">Conectar ao bot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No Telegram, abra <strong className="text-foreground">Painel Admin → 🌐 Painel Web</strong>{" "}
          e copie o token de acesso.
        </p>
        <form onSubmit={connect} className="mt-6 space-y-4">
          {needsBase ? (
            <label className="block text-sm">
              <span className="text-muted-foreground">URL da API</span>
              <input
                value={base}
                onChange={(event) => setBase(event.target.value)}
                placeholder="http://123.45.67.89:8090"
                required
                className="mt-1 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-foreground outline-none focus:border-primary"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-muted-foreground">Token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </form>
      </div>
    </main>
  );
}


function Dashboard({
  config,
  onDisconnect,
}: {
  config: PanelConfig;
  onDisconnect: () => void;
}) {
  const [notifyOn, setNotifyOn] = useState(true);
  const { permission, requestPermission, recent } = useStartNotifications(config, notifyOn);

  const dashboard = useQuery({
    queryKey: ["dashboard", config.base],
    queryFn: () => api<{ data: Dashboard }>(config, "/api/dashboard").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const users = useQuery({
    queryKey: ["users", config.base],
    queryFn: () => api<{ data: UserRow[] }>(config, "/api/users?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const orders = useQuery({
    queryKey: ["orders", config.base],
    queryFn: () => api<{ data: OrderRow[] }>(config, "/api/orders?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const data = dashboard.data;
  const starts = data?.starts;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-16">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
          <div>
            <h1 className="font-display text-xl font-bold">{data?.loja ?? "Aura Panel"}</h1>
            <p className="text-xs text-muted-foreground">
              {dashboard.isError
                ? "Sem conexão com o bot"
                : data?.manutencao
                  ? "🔧 Em manutenção"
                  : "🟢 Bot online"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {permission !== "granted" ? (
            <button
              onClick={requestPermission}
              className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground"
            >
              🔔 Ativar notificações
            </button>
          ) : (
            <button
              onClick={() => setNotifyOn((value) => !value)}
              className="rounded-lg border border-border px-3 py-2"
            >
              {notifyOn ? "🔔 Notificações ativas" : "🔕 Notificações pausadas"}
            </button>
          )}
          <button
            onClick={() => dashboard.refetch()}
            className="rounded-lg border border-border px-3 py-2"
          >
            🔄 Atualizar
          </button>
          <button onClick={onDisconnect} className="rounded-lg border border-border px-3 py-2">
            Sair
          </button>
        </div>
      </header>

      {dashboard.isError ? (
        <div className="panel-card mb-6 border-destructive/50 p-4 text-sm text-destructive">
          {(dashboard.error as Error).message}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Starts hoje"
          value={starts?.hoje ?? "—"}
          hint={starts ? `${starts.hoje_unicos} únicos · ${starts.hoje_novos} novos` : undefined}
          accent
        />
        <StatCard
          label="Starts 7 dias"
          value={starts?.d7 ?? "—"}
          hint={starts ? `${starts.d7_unicos} únicos` : undefined}
        />
        <StatCard
          label="Starts 30 dias"
          value={starts?.d30 ?? "—"}
          hint={starts ? `${starts.d30_unicos} únicos` : undefined}
        />
        <StatCard
          label="Starts total"
          value={starts?.total ?? "—"}
          hint={starts ? `${starts.total_unicos} pessoas` : undefined}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Faturamento hoje" value={money(data?.faturamento.hoje ?? 0)} accent />
        <StatCard
          label="Faturamento 30d"
          value={money(data?.faturamento.d30 ?? 0)}
          hint={`Total ${money(data?.faturamento.total ?? 0)}`}
        />
        <StatCard
          label="Recargas pagas hoje"
          value={money(data?.recargas.pagas_hoje ?? 0)}
          hint={`${data?.recargas.pendentes ?? 0} pendentes`}
        />
        <StatCard
          label="Usuários"
          value={data?.usuarios.total ?? "—"}
          hint={`${data?.usuarios.hoje ?? 0} hoje · ${data?.usuarios.banidos ?? 0} banidos`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Starts por dia (14 dias)">
            <StartsChart serie={starts?.serie ?? []} />
          </Section>
        </div>
        <Section title="Últimos /start">
          <ul className="space-y-2 text-sm">
            {recent.slice(0, 8).map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {event.username ? `@${event.username}` : event.first_name || event.telegram_id}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {event.is_new ? "🆕" : "🔁"} {event.created_at.slice(11, 16)}
                </span>
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="text-muted-foreground">Aguardando novos /start...</li>
            ) : null}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Pedidos recentes">
          <Table
            columns={["#", "Cliente", "Valor", "Data"]}
            empty="Nenhum pedido ainda."
            rows={(orders.data ?? []).map((order) => [
              order.id,
              order.username ? `@${order.username}` : (order.telegram_id ?? "—"),
              money(order.total_price),
              order.created_at?.slice(0, 16) ?? "—",
            ])}
          />
        </Section>
        <Section title="Usuários recentes">
          <Table
            columns={["ID Telegram", "Usuário", "Saldo", "Status"]}
            empty="Nenhum usuário ainda."
            rows={(users.data ?? []).map((user) => [
              user.telegram_id,
              user.username ? `@${user.username}` : user.first_name || "—",
              money(user.balance),
              user.is_banned ? "🚫 Banido" : "✅ Ativo",
            ])}
          />
        </Section>
      </div>
    </main>
  );
}
