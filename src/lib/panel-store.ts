import { supabase } from "@/integrations/supabase/client";
import type { PanelConfig } from "./panel-client";

export async function fetchConnection(): Promise<PanelConfig | null> {
  const { data, error } = await supabase
    .from("panel_connections")
    .select("base, token")
    .maybeSingle();
  if (error || !data) return null;
  if (!data.token && !data.base) return null;
  return { base: data.base || undefined, token: data.token || undefined };
}

export async function saveConnection(config: PanelConfig) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sessão expirada — entre novamente.");
  const { error } = await supabase.from("panel_connections").upsert(
    {
      user_id: userId,
      base: config.base ?? "",
      token: config.token ?? "",
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function deleteConnection() {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) return;
  await supabase.from("panel_connections").delete().eq("user_id", userId);
}
