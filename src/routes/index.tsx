import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api, money, type Dashboard, type PanelConfig } from "@/lib/panel-client";
import { deleteConnection, fetchConnection, saveConnection } from "@/lib/panel-store";
import { getPanelDefaults } from "@/lib/panel.functions";
import { useStartNotifications } from "@/lib/use-start-notifications";
import { Section, StartsChart, StatCard, Table } from "@/components/panel/parts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura Panel — Painel e métricas do bot Telegram" },
      {
        name: "description",
        content:
          "Painel web PWA do bot Telegram: métricas de /start (hoje, 7d, 30d), vendas, recargas, gifts, usuários e notificações em tempo real.",
      },
      { property: "og:title", content: "Aura Panel — Painel do bot Telegram" },
      {
        property: "og:description",
        content:
          "Acompanhe starts, vendas, recargas, gifts e usuários do seu bot Telegram, com notificações PWA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

type NotificationRow = {
  id: number;
  kind: "sales" | "recharge" | "gift" | string;
  admin_text: string;
  public_text: string;
  channels: string;
  created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  sales: "🛒 Venda",
  recharge: "💰 Recarga",
  gift: "🎁 Gift",
};

function PanelPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [config, setConfig] = useState<PanelConfig | null>(null);

  const defaults = useQuery({
    queryKey: ["panel-defaults"],
    queryFn: () => getPanelDefaults(),
    staleTime: Infinity,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        setSignedIn(false);
        setChecking(false);
        void navigate({ to: "/auth" });
        return;
      }
      setSignedIn(true);
      setConfig(await fetchConnection());
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checking || defaults.isLoading || !signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  const serverHasBase = Boolean(defaults.data?.hasBase);
  const hasConfig = Boolean(config?.token || (serverHasBase && defaults.data?.hasToken));

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return hasConfig ? (
    <Dashboard
      config={config ?? {}}
      onSignOut={signOut}
      onDisconnect={async () => {
        await deleteConnection();
        setConfig(null);
      }}
    />
  ) : (
    <TokenScreen
      needsBase={!serverHasBase}
      onSignOut={signOut}
      onConnected={(next) => setConfig(next)}
    />
  );
}

function TokenScreen({
  needsBase,
  onConnected,
  onSignOut,
}: {
  needsBase: boolean;
  onConnected: (config: PanelConfig) => void;
  onSignOut: () => void;
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
      await saveConnection(candidate);
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
          e cole o token abaixo. Ele fica salvo na sua conta.
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
        <button onClick={onSignOut} className="mt-4 w-full text-sm text-muted-foreground underline">
          Sair da conta
        </button>
      </div>
    </main>
  );
}

function Dashboard({
  config,
  onDisconnect,
  onSignOut,
}: {
  config: PanelConfig;
  onDisconnect: () => void | Promise<void>;
  onSignOut: () => void;
}) {
  const [notifyOn, setNotifyOn] = useState(true);
  const [kindFilter, setKindFilter] = useState<"" | "sales" | "recharge" | "gift">("");
  const { permission, requestPermission, recent } = useStartNotifications(config, notifyOn);
  const key = config.base ?? "server";

  const dashboard = useQuery({
    queryKey: ["dashboard", key],
    queryFn: () => api<{ data: Dashboard }>(config, "/api/dashboard").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const users = useQuery({
    queryKey: ["users", key],
    queryFn: () => api<{ data: UserRow[] }>(config, "/api/users?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const orders = useQuery({
    queryKey: ["orders", key],
    queryFn: () => api<{ data: OrderRow[] }>(config, "/api/orders?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const notifications = useQuery({
    queryKey: ["notifications", key, kindFilter],
    queryFn: () =>
      api<{ data: NotificationRow[] }>(
        config,
        `/api/notifications?limit=60${kindFilter ? `&kind=${kindFilter}` : ""}`,
      ).then((r) => r.data),
    refetchInterval: 20_000,
  });

  const data = dashboard.data;
  const starts = data?.starts;

  return (
    <main className="safe-bottom mx-auto w-full max-w-6xl px-3 pb-10 pt-4 sm:px-5 sm:pt-6">
      <header className="sticky top-0 z-20 -mx-3 mb-5 border-b border-border/50 bg-background/80 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:mb-7 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/icon-192.png"
              alt=""
              width={44}
              height={44}
              className="size-10 shrink-0 rounded-2xl ring-1 ring-border sm:size-11"
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold sm:text-2xl">
                {data?.loja ?? "Aura Panel"}
              </h1>
              <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground sm:text-xs">
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    dashboard.isError
                      ? "bg-destructive"
                      : data?.manutencao
                        ? "bg-warning"
                        : "bg-accent"
                  }`}
                />
                {dashboard.isError
                  ? "Sem conexão com o bot"
                  : data?.manutencao
                    ? "Em manutenção"
                    : "Bot online · tempo real"}
              </p>
            </div>
          </div>
          {permission !== "granted" ? (
            <button
              onClick={requestPermission}
              className="panel-gradient-btn shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm"
            >
              🔔 <span className="hidden sm:inline">Ativar notificações</span>
              <span className="sm:hidden">Ativar</span>
            </button>
          ) : (
            <button
              onClick={() => setNotifyOn((value) => !value)}
              className={`panel-chip shrink-0 ${notifyOn ? "panel-chip-active" : ""}`}
            >
              {notifyOn ? "🔔" : "🔕"}
              <span className="hidden sm:inline">{notifyOn ? "Ativas" : "Pausadas"}</span>
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:mt-4 sm:px-0">
          <button onClick={() => dashboard.refetch()} className="panel-chip">
            🔄 Atualizar
          </button>
          <button onClick={() => void onDisconnect()} className="panel-chip">
            🔑 Trocar token
          </button>
          <button onClick={onSignOut} className="panel-chip">
            ↩︎ Sair
          </button>
        </div>

      </header>

      {dashboard.isError ? (
        <div className="panel-card mb-6 border-destructive/50 p-4 text-sm text-destructive">
          {(dashboard.error as Error).message}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <StatCard
          label="Starts hoje"
          icon="🚀"
          value={starts?.hoje ?? "—"}
          hint={starts ? `${starts.hoje_unicos} únicos · ${starts.hoje_novos} novos` : undefined}
          accent
        />
        <StatCard
          label="Starts 7 dias"
          icon="📅"
          tone="neutral"
          value={starts?.d7 ?? "—"}
          hint={starts ? `${starts.d7_unicos} únicos` : undefined}
        />
        <StatCard
          label="Starts 30 dias"
          icon="🗓️"
          tone="neutral"
          value={starts?.d30 ?? "—"}
          hint={starts ? `${starts.d30_unicos} únicos` : undefined}
        />
        <StatCard
          label="Starts total"
          icon="∑"
          tone="neutral"
          value={starts?.total ?? "—"}
          hint={starts ? `${starts.total_unicos} pessoas` : undefined}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <StatCard
          label="Faturamento hoje"
          icon="💸"
          tone="accent"
          value={money(data?.faturamento.hoje ?? 0)}
          accent
        />
        <StatCard
          label="Faturamento 30d"
          icon="📈"
          tone="accent"
          value={money(data?.faturamento.d30 ?? 0)}
          hint={`Total ${money(data?.faturamento.total ?? 0)}`}
        />
        <StatCard
          label="Recargas pagas hoje"
          icon="💰"
          tone="warning"
          value={money(data?.recargas.pagas_hoje ?? 0)}
          hint={`${data?.recargas.pendentes ?? 0} pendentes`}
        />
        <StatCard
          label="Usuários"
          icon="👥"
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

      <div className="mb-6">
        <Section
          title="Mensagens enviadas aos canais"
          action={
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(
                [
                  ["", "Tudo"],
                  ["sales", "🛒 Vendas"],
                  ["recharge", "💰 Recargas"],
                  ["gift", "🎁 Gifts"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setKindFilter(value)}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    kindFilter === value
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <ul className="space-y-3">
            {(notifications.data ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
                  <span>
                    {item.created_at.slice(0, 10)} às {item.created_at.slice(11, 16)}
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                  {item.public_text || item.admin_text}
                </pre>
                {item.channels ? (
                  <p className="mt-2 text-xs text-muted-foreground">Canais: {item.channels}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Somente PV dos admins</p>
                )}
              </li>
            ))}
            {(notifications.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Nenhuma mensagem registrada ainda. Vendas, recargas e gifts aparecem aqui com data,
                hora e texto completo.
              </li>
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
