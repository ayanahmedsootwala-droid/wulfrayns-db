
-- Marketing campaigns
create table if not exists public.rpm_marketing_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  status        text not null default 'draft',
  channel       text not null default 'whatsapp',
  audience      text not null default 'all_leads',
  audience_count integer not null default 0,
  message_template text not null default '',
  scheduled_at  timestamptz,
  sent_count    integer not null default 0,
  opened_count  integer not null default 0,
  clicked_count integer not null default 0,
  converted_count integer not null default 0,
  tags          text[] not null default '{}',
  budget        numeric,
  spent         numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.rpm_marketing_campaigns enable row level security;
create policy "auth_all_campaigns" on public.rpm_marketing_campaigns
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Marketing templates
create table if not exists public.rpm_marketing_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null default 'promotion',
  channel       text not null default 'whatsapp',
  content       text not null,
  variables     text[] not null default '{}',
  usage_count   integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.rpm_marketing_templates enable row level security;
create policy "auth_all_templates" on public.rpm_marketing_templates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
