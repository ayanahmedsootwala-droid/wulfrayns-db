create table if not exists public.app_updates (
  id           uuid primary key default gen_random_uuid(),
  version      text not null default 'v76',
  title        text not null,
  body         text not null,
  update_type  text not null default 'announcement',
  published_at timestamptz not null default now(),
  is_active    boolean not null default true,
  author       text,
  tags         text[]
);
alter table public.app_updates enable row level security;
drop policy if exists "Public read app_updates" on public.app_updates;
drop policy if exists "Authenticated insert app_updates" on public.app_updates;
drop policy if exists "Authenticated update app_updates" on public.app_updates;
create policy "Public read app_updates" on public.app_updates for select using (true);
create policy "Authenticated insert app_updates" on public.app_updates for insert with check (true);
create policy "Authenticated update app_updates" on public.app_updates for update using (true);
insert into public.app_updates (version, title, body, update_type, author, tags)
values (
  'v76',
  'v76 Major Upgrade — AI Fix, Expanded Pages, Color Codes & More',
  E'Welcome to Wulfrayn''s DB v76!\n\n• AI Chatbot 401 fix — bring-your-own Gemini key now works perfectly\n• Live Display now shows live inquiries synced in realtime\n• Code Update Notifier (this page!) — no need to resend code to users\n• Car Knowledge Library — 15 brands with visual color swatches\n• Inquiries page — bulk status change, export CSV, kanban view toggle\n• WhatsApp Notes — smart templates, bulk paste AI parser\n• Shipments — cargo tracking, status timeline\n• Transaction Book — month pivot table, profit analytics\n• Image Gallery — bulk upload, tagging, shareable links\n• Doc Assistant — enhanced templates library\n• Partner Referrals — multi-tier commissions, payout tracking\n• Auction Guide — Japan auction houses map, bidding simulator\n• Import Cars Guide — step-by-step multi-country guide expansion',
  'feature',
  'Wulfrayn',
  ARRAY['AI','live-display','car-library','inquiries','v76']
)
on conflict do nothing;