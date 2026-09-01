import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no Aura Panel — Painel do bot Telegram" },
      {
        name: "description",
        content:
          "Crie sua conta ou entre no Aura Panel para acompanhar starts, vendas, recargas e gifts do seu bot Telegram.",
      },
      { property: "og:title", content: "Entrar no Aura Panel" },
      {
        property: "og:description",
        content: "Acesso ao painel de métricas e notificações do seu bot Telegram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "mt-1.5 w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-3 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/15 sm:text-sm";

function translateError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "Esse e-mail já tem conta. Faça login.";
  if (lower.includes("password")) return "Senha inválida — use pelo menos 6 caracteres.";
  if (lower.includes("email")) return "E-mail inválido.";
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        toast.success("Conta criada", { description: "Bem-vindo ao Aura Panel." });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        toast.success("Login efetuado", { description: "Carregando seu painel..." });
      }
      await navigate({ to: "/" });
    } catch (err) {
      const message = translateError(err instanceof Error ? err.message : "Falha na autenticação");
      setError(message);
      toast.error("Não foi possível continuar", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="panel-card overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-primary via-primary/60 to-accent" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="Aura Panel"
                width={52}
                height={52}
                className="size-13 rounded-2xl ring-1 ring-border"
              />
              <div>
                <p className="font-display text-sm font-bold tracking-tight">Aura Panel</p>
                <p className="text-xs text-muted-foreground">Métricas do seu bot em tempo real</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-secondary/40 p-1">
              {(
                [
                  ["login", "Entrar"],
                  ["signup", "Criar conta"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    mode === value
                      ? "panel-gradient-btn"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">
              {mode === "login" ? "Entrar no painel" : "Criar sua conta"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {mode === "login"
                ? "Use o e-mail e a senha da sua conta do painel."
                : "Acesso imediato — sem confirmação por e-mail."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="text-muted-foreground">E-mail</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  required
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Senha</span>
                <span className="relative block">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={show ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    placeholder="mínimo 6 caracteres"
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {show ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>

                </span>
              </label>

              {error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="panel-gradient-btn w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta e entrar"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Depois de entrar, cole o token do bot (Painel Admin → 🌐 Painel Web). Ele fica salvo na sua
          conta.
        </p>
      </div>
    </main>
  );
}
