alter table public.quotations add column pricing_inputs jsonb not null default '{}'::jsonb;
