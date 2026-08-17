
-- rpm_settings: key/value store for app-wide settings (logo, company info, etc.)
create table if not exists rpm_settings (
  key   text primary key,
  value text,
  updated_at timestamptz default now()
);

-- RLS
alter table rpm_settings enable row level security;

create policy "Anyone can read settings"
  on rpm_settings for select
  using (true);

create policy "Authenticated users can upsert settings"
  on rpm_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update settings"
  on rpm_settings for update
  using (auth.role() = 'authenticated');

-- Storage bucket for brand logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-logos',
  'brand-logos',
  true,
  2097152,
  array['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Public read brand logos"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

create policy "Authenticated upload brand logos"
  on storage.objects for insert
  with check (bucket_id = 'brand-logos' and auth.role() = 'authenticated');

create policy "Authenticated update brand logos"
  on storage.objects for update
  using (bucket_id = 'brand-logos' and auth.role() = 'authenticated');

create policy "Authenticated delete brand logos"
  on storage.objects for delete
  using (bucket_id = 'brand-logos' and auth.role() = 'authenticated');

-- Seed default settings
insert into rpm_settings (key, value) values
  ('company_name', 'RPM Motors'),
  ('company_phone', '+92-300-0000000'),
  ('company_email', 'accounts@rpmmotors.pk'),
  ('company_address', 'Main Boulevard, Lahore'),
  ('company_ntn', '1234567-8'),
  ('company_strn', 'PKR-00-12345'),
  ('brand_logo_url', null)
on conflict (key) do nothing;
