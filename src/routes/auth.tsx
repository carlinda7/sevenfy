import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setInfo("Conta criada! Confirme seu e-mail e depois faça login.");
          setMode("login");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel-card w-full max-w-md p-6 sm:p-8">
        <img
          src="/icon-192.png"
          alt="Aura Panel"
          width={56}
          height={56}
          className="size-14 rounded-2xl ring-1 ring-border"
        />
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
          {mode === "login" ? "Entrar no painel" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Depois de entrar você cola o token do bot (Painel Admin → 🌐 Painel Web) e ele fica salvo na
          sua conta.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-input bg-secondary/60 px-3.5 py-3 text-base text-foreground outline-none transition-colors focus:border-primary sm:text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              required
              className="mt-1.5 w-full rounded-xl border border-input bg-secondary/60 px-3.5 py-3 text-base text-foreground outline-none transition-colors focus:border-primary sm:text-sm"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {info ? <p className="text-sm text-primary">{info}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="panel-gradient-btn w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-sm text-muted-foreground underline"
        >
          {mode === "login" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
        </button>
      </div>
    </main>
  );
}
