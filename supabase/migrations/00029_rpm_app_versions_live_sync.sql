-- Live Sync: app version tracking table
CREATE TABLE IF NOT EXISTS rpm_app_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version     text NOT NULL,
  label       text NOT NULL,
  release_notes text,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  is_current  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_versions" ON rpm_app_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_write_versions" ON rpm_app_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed with current v71 release
INSERT INTO rpm_app_versions (version, label, release_notes, is_current)
VALUES (
  '71.0.0',
  'Wulfrayn''s DB v71',
  '• Fixed "Failed to save vehicle" bug when editing inventory
• Added AI Sync: chat with any OpenAI-compatible model to manage vehicles & inquiries
• Added Bulk Create Listings: paste raw text → AI extracts multiple cars at once
• Added Live Sync: automatic update detection & one-click reload
• Added ex-factory cover images for all price card variants
• Expanded bulk create with dealer auto-matching
• Improved error handling throughout',
  true
)
ON CONFLICT DO NOTHING;