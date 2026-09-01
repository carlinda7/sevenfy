import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  BellOff,
  BellRing,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  Gift,
  KeyRound,
  LogOut,
  Link2,
  Plug,
  RefreshCw,
  Repeat,
  Rocket,
  ShieldBan,
  ShieldCheck,
  ShoppingCart,
  Sigma,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api, money, type Dashboard, type PanelConfig } from "@/lib/panel-client";
import { deleteConnection, fetchConnection, saveConnection } from "@/lib/panel-store";
import { getPanelDefaults } from "@/lib/panel.functions";
import { useStartNotifications } from "@/lib/use-start-notifications";
import { Section, StartsChart, StatCard, Table } from "@/components/panel/parts";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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

const KIND_META: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  sales: { label: "Venda", icon: ShoppingCart },
  recharge: { label: "Recarga", icon: Wallet },
  gift: { label: "Gift", icon: Gift },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind, icon: Activity };
}

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

  if (checking || !signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  // Acesso ao dashboard é liberado logo após criar a conta. A conexão com o bot
  // (token e, opcionalmente, URL) é configurada dentro do próprio painel.
  return (
    <DashboardPage
      config={config}
      serverReady={Boolean(defaults.data?.hasBase && defaults.data?.hasToken)}
      onSignOut={signOut}
      onSaveConfig={async (next) => {
        await saveConnection(next);
        setConfig(next);
      }}
      onDisconnect={async () => {
        await deleteConnection();
        setConfig(null);
      }}
    />
  );
}

function DashboardPage({
  config,
  serverReady,
  onDisconnect,
  onSaveConfig,
  onSignOut,
}: {
  config: PanelConfig | null;
  serverReady: boolean;
  onDisconnect: () => void | Promise<void>;
  onSaveConfig: (config: PanelConfig) => Promise<void>;
  onSignOut: () => void;
}) {
  const [notifyOn, setNotifyOn] = useState(true);
  const [kindFilter, setKindFilter] = useState<"" | "sales" | "recharge" | "gift">("");
  const [confirm, setConfirm] = useState<null | "token" | "signout">(null);
  const [detail, setDetail] = useState<NotificationRow | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const connected = Boolean(config?.token || serverReady);
  const activeConfig: PanelConfig = config ?? {};
  const { permission, requestPermission, recent } = useStartNotifications(
    connected ? activeConfig : null,
    notifyOn,
  );
  const key = config?.base ?? "server";

  const enabled = connected;

  const dashboard = useQuery({
    queryKey: ["dashboard", key, connected],
    enabled,
    queryFn: () => api<{ data: Dashboard }>(activeConfig, "/api/dashboard").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const users = useQuery({
    queryKey: ["users", key, connected],
    enabled,
    queryFn: () => api<{ data: UserRow[] }>(activeConfig, "/api/users?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const orders = useQuery({
    queryKey: ["orders", key, connected],
    enabled,
    queryFn: () =>
      api<{ data: OrderRow[] }>(activeConfig, "/api/orders?limit=15").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const notifications = useQuery({
    queryKey: ["notifications", key, kindFilter, connected],
    enabled,
    queryFn: () =>
      api<{ data: NotificationRow[] }>(
        activeConfig,
        `/api/notifications?limit=60${kindFilter ? `&kind=${kindFilter}` : ""}`,
      ).then((r) => r.data),
    refetchInterval: 20_000,
  });

  const data = dashboard.data;
  const starts = data?.starts;

  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? "Hoje";
  const unavailableHint = "Sem dados para período personalizado";

  const startsValue = (() => {
    if (!starts) return null;
    if (period === "hoje") return starts.hoje;
    if (period === "7d") return starts.d7;
    if (period === "30d") return starts.d30;
    if (period === "total") return starts.total;
    if (!customFrom || !customTo) return null;
    return starts.serie
      .filter((item) => item.dia >= customFrom && item.dia <= customTo)
      .reduce((sum, item) => sum + item.total, 0);
  })();

  const startsHint = (() => {
    if (!starts) return undefined;
    if (period === "hoje")
      return `${starts.hoje_unicos} únicos · ${starts.hoje_novos} novos`;
    if (period === "7d") return `${starts.d7_unicos} únicos`;
    if (period === "30d") return `${starts.d30_unicos} únicos`;
    if (period === "total") return `${starts.total_unicos} pessoas`;
    return customFrom && customTo ? `${customFrom} a ${customTo}` : "Escolha as datas";
  })();

  const bucket = <T extends { total: number; hoje: number; d7?: number; d30?: number }>(
    source: T | undefined,
  ): number | null => {
    if (!source) return null;
    if (period === "hoje") return source.hoje;
    if (period === "7d") return source.d7 ?? null;
    if (period === "30d") return source.d30 ?? null;
    if (period === "total") return source.total;
    return null;
  };

  const faturamento = bucket(data?.faturamento);
  const pedidos = bucket(data?.pedidos);
  const usuarios = bucket(data?.usuarios);
  const recargas = data
    ? period === "hoje"
      ? data.recargas.pagas_hoje
      : period === "total"
        ? data.recargas.pagas_total
        : null
    : null;


  const statusLabel = !connected
    ? "Bot não conectado"
    : dashboard.isError
      ? "Sem conexão com o bot"
      : data?.manutencao
        ? "Em manutenção"
        : "Bot online · tempo real";

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
                    !connected || dashboard.isError
                      ? "bg-destructive"
                      : data?.manutencao
                        ? "bg-warning"
                        : "bg-accent"
                  }`}
                />
                {statusLabel}
              </p>
            </div>
          </div>
          {permission !== "granted" ? (
            <button
              onClick={requestPermission}
              className="panel-gradient-btn inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm"
            >
              <BellRing className="size-4" aria-hidden />
              <span className="hidden sm:inline">Ativar notificações</span>
              <span className="sm:hidden">Ativar</span>
            </button>
          ) : (
            <button
              onClick={() => setNotifyOn((value) => !value)}
              className={`panel-chip shrink-0 ${notifyOn ? "panel-chip-active" : ""}`}
            >
              {notifyOn ? (
                <BellRing className="size-4" aria-hidden />
              ) : (
                <BellOff className="size-4" aria-hidden />
              )}
              <span className="hidden sm:inline">{notifyOn ? "Ativas" : "Pausadas"}</span>
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:mt-4 sm:px-0">
          <button
            onClick={() => {
              void Promise.all([
                dashboard.refetch(),
                users.refetch(),
                orders.refetch(),
                notifications.refetch(),
              ]);
              toast.success("Atualizando dados do bot");
            }}
            className="panel-chip"
          >
            <RefreshCw className="size-4" aria-hidden /> Atualizar
          </button>
          <button onClick={() => setConnectOpen(true)} className="panel-chip">
            <Plug className="size-4" aria-hidden /> {connected ? "Conexão" : "Conectar bot"}
          </button>
          {config?.token ? (
            <button onClick={() => setConfirm("token")} className="panel-chip">
              <KeyRound className="size-4" aria-hidden /> Trocar token
            </button>
          ) : null}
          <button onClick={() => setConfirm("signout")} className="panel-chip">
            <LogOut className="size-4" aria-hidden /> Sair
          </button>
        </div>
      </header>

      {!connected ? (
        <div className="panel-card mb-5 flex flex-col gap-3 border-primary/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-sm font-bold sm:text-base">
                Bem-vindo ao seu painel
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Cole o token do bot (Telegram → Painel Admin → Painel Web) para preencher as
                métricas. Você já pode explorar o painel sem isso.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConnectOpen(true)}
            className="panel-gradient-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Link2 className="size-4" aria-hidden /> Conectar bot
          </button>
        </div>
      ) : null}

      {connected && dashboard.isError ? (
        <div className="panel-card mb-6 border-destructive/50 p-4 text-sm text-destructive">
          {(dashboard.error as Error).message}
        </div>
      ) : null}

      <PeriodBar
        period={period}
        onChange={setPeriod}
        from={customFrom}
        to={customTo}
        onFrom={setCustomFrom}
        onTo={setCustomTo}
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <StatCard
          label={`Starts · ${periodLabel}`}
          icon={<Rocket className="size-4" aria-hidden />}
          value={fmt(startsValue)}
          hint={startsHint}
          accent
        />
        <StatCard
          label={`Faturamento · ${periodLabel}`}
          icon={<CircleDollarSign className="size-4" aria-hidden />}
          tone="accent"
          value={faturamento === null ? "—" : money(faturamento)}
          hint={faturamento === null ? unavailableHint : `Total ${money(data?.faturamento.total ?? 0)}`}
          accent
        />
        <StatCard
          label={`Pedidos · ${periodLabel}`}
          icon={<ShoppingCart className="size-4" aria-hidden />}
          tone="neutral"
          value={fmt(pedidos)}
          hint={pedidos === null ? unavailableHint : `Total ${data?.pedidos.total ?? 0}`}
        />
        <StatCard
          label={`Recargas pagas · ${periodLabel}`}
          icon={<Wallet className="size-4" aria-hidden />}
          tone="warning"
          value={recargas === null ? "—" : money(recargas)}
          hint={
            recargas === null ? unavailableHint : `${data?.recargas.pendentes ?? 0} pendentes`
          }
        />
        <StatCard
          label={`Usuários · ${periodLabel}`}
          icon={<Users className="size-4" aria-hidden />}
          value={fmt(usuarios)}
          hint={
            usuarios === null
              ? unavailableHint
              : `Total ${data?.usuarios.total ?? 0} · ${data?.usuarios.banidos ?? 0} banidos`
          }
        />
        <StatCard
          label="Saldo em carteira"
          icon={<Sigma className="size-4" aria-hidden />}
          tone="neutral"
          value={money(data?.usuarios.saldo_total ?? 0)}
          hint={`${data?.produtos.ativos ?? 0} produtos ativos`}
        />
      </div>


      <div className="mb-4 grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Starts por dia (14 dias)">
            <StartsChart serie={starts?.serie ?? []} />
          </Section>
        </div>
        <Section title="Últimos /start">
          <ul className="space-y-1.5 text-sm">
            {recent.slice(0, 8).map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/35 px-3 py-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {event.username ? `@${event.username}` : event.first_name || event.telegram_id}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  {event.is_new ? (
                    <Sparkles className="size-3.5 text-accent" aria-hidden />
                  ) : (
                    <Repeat className="size-3.5" aria-hidden />
                  )}
                  {event.created_at.slice(11, 16)}
                </span>
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="text-muted-foreground">
                {connected ? "Aguardando novos /start..." : "Conecte o bot para ver os /start."}
              </li>
            ) : null}
          </ul>
        </Section>
      </div>

      <div className="mb-4">
        <Section
          title="Mensagens enviadas aos canais"
          action={
            <div className="no-scrollbar flex max-w-[55vw] gap-1.5 overflow-x-auto sm:max-w-none">
              {(
                [
                  ["", "Tudo", Activity],
                  ["sales", "Vendas", ShoppingCart],
                  ["recharge", "Recargas", Wallet],
                  ["gift", "Gifts", Gift],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => setKindFilter(value)}
                  className={`panel-chip text-xs ${kindFilter === value ? "panel-chip-active" : "text-muted-foreground"}`}
                >
                  <Icon className="size-3.5" aria-hidden /> {label}
                </button>
              ))}
            </div>
          }
        >
          <ul className="space-y-2.5">
            {(notifications.data ?? []).map((item) => {
              const meta = kindMeta(item.kind);
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setDetail(item)}
                    className="w-full rounded-2xl border border-border/60 bg-secondary/35 p-3 text-left transition-all hover:border-primary/50 hover:bg-secondary/55"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="panel-chip py-1 text-xs font-semibold text-foreground">
                        <Icon className="size-3.5" aria-hidden /> {meta.label}
                      </span>
                      <span className="tabular-nums">
                        {item.created_at.slice(0, 10)} às {item.created_at.slice(11, 16)}
                      </span>
                    </div>
                    <pre className="mt-2.5 line-clamp-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                      {item.public_text || item.admin_text}
                    </pre>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.channels ? `Canais: ${item.channels}` : "Somente PV dos admins"} · ver
                      detalhes
                    </p>
                  </button>
                </li>
              );
            })}

            {(notifications.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Nenhuma mensagem registrada ainda. Vendas, recargas e gifts aparecem aqui com data,
                hora e texto completo.
              </li>
            ) : null}
          </ul>
        </Section>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
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
              user.is_banned ? (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <ShieldBan className="size-3.5" aria-hidden /> Banido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <ShieldCheck className="size-3.5" aria-hidden /> Ativo
                </span>
              ),
            ])}
          />
        </Section>
      </div>

      <ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        current={config}
        onSave={onSaveConfig}
      />

      <ConfirmDialog
        open={confirm === "token"}
        onOpenChange={(open) => setConfirm(open ? "token" : null)}
        icon={<KeyRound className="size-5" aria-hidden />}
        title="Trocar o token do bot?"
        description="O painel vai desconectar do bot e pedir um novo token. Suas métricas não são apagadas."
        confirmLabel="Trocar token"
        onConfirm={async () => {
          setConfirm(null);
          await onDisconnect();
          toast.success("Token removido", { description: "Cole o novo token para reconectar." });
        }}
      />

      <ConfirmDialog
        open={confirm === "signout"}
        onOpenChange={(open) => setConfirm(open ? "signout" : null)}
        icon={<LogOut className="size-5" aria-hidden />}
        title="Sair da sua conta?"
        description="Você vai precisar entrar novamente com e-mail e senha para acessar o painel."
        confirmLabel="Sair agora"
        tone="destructive"
        onConfirm={() => {
          setConfirm(null);
          onSignOut();
        }}
      />

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="panel-card max-w-[calc(100vw-1.5rem)] gap-0 border-border/70 bg-card/95 p-0 sm:max-w-lg">
          <div className="h-1 w-full rounded-t-[inherit] bg-linear-to-r from-primary to-accent" />
          <div className="p-5 sm:p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
                {detail ? (
                  <>
                    {(() => {
                      const Icon = kindMeta(detail.kind).icon;
                      return <Icon className="size-5 text-primary" aria-hidden />;
                    })()}
                    {kindMeta(detail.kind).label}
                  </>
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {detail
                  ? `${detail.created_at.slice(0, 10)} às ${detail.created_at.slice(11, 19)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Mensagem enviada aos canais
                </p>
                <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                  {detail?.public_text || "—"}
                </pre>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/25 p-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Versão completa (PV dos admins)
                </p>
                <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                  {detail?.admin_text || "—"}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                {detail?.channels ? `Canais: ${detail.channels}` : "Somente PV dos admins"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-3 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/15 sm:text-sm";

function ConnectDialog({
  open,
  onOpenChange,
  current,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: PanelConfig | null;
  onSave: (config: PanelConfig) => Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [base, setBase] = useState(current?.base ?? "");
  const [advanced, setAdvanced] = useState(Boolean(current?.base));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const candidate: PanelConfig = {};
    if (token.trim()) candidate.token = token.trim();
    else if (current?.token) candidate.token = current.token;
    if (base.trim()) candidate.base = base.trim();
    try {
      await api<{ data: unknown }>(candidate, "/api/dashboard");
      await onSave(candidate);
      toast.success("Bot conectado", { description: "Carregando métricas em tempo real." });
      setToken("");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao conectar";
      setError(message);
      toast.error("Não conseguimos falar com o bot", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel-card max-w-[calc(100vw-1.5rem)] gap-0 border-border/70 bg-card/95 p-0 sm:max-w-md">
        <div className="h-1 w-full rounded-t-[inherit] bg-linear-to-r from-primary to-accent" />
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-left">
            <span
              className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary"
              aria-hidden
            >
              <Plug className="size-5" />
            </span>
            <DialogTitle className="font-display text-lg font-bold tracking-tight">
              Conectar ao bot
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              No Telegram, abra <strong className="text-foreground">Painel Admin → Painel Web</strong>{" "}
              e cole o token. A URL da API é opcional — o servidor já sabe onde falar com o bot.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Token do painel</span>
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                type="password"
                placeholder={current?.token ? "token salvo — cole para trocar" : "cole o token"}
                className={inputClass}
              />
            </label>

            {advanced ? (
              <label className="block text-sm">
                <span className="text-muted-foreground">URL da API (opcional)</span>
                <input
                  value={base}
                  onChange={(event) => setBase(event.target.value)}
                  placeholder="deixe vazio para usar o servidor"
                  className={inputClass}
                />
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setAdvanced(true)}
                className="text-xs text-muted-foreground underline"
              >
                Usar uma URL de API própria
              </button>
            )}

            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="panel-gradient-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Link2 className="size-4" aria-hidden />
              {loading ? "Conectando..." : "Conectar"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
