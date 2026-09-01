CREATE TABLE public.panel_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  base TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_connections TO authenticated;
GRANT ALL ON public.panel_connections TO service_role;

ALTER TABLE public.panel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own panel connection"
ON public.panel_connections FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER panel_connections_updated_at
BEFORE UPDATE ON public.panel_connections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();