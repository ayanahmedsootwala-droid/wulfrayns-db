
CREATE TABLE IF NOT EXISTS rpm_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL DEFAULT 'Untitled Note',
  content     text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT 'default',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION rpm_notes_set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER rpm_notes_updated_at
  BEFORE UPDATE ON rpm_notes
  FOR EACH ROW EXECUTE FUNCTION rpm_notes_set_updated_at();

ALTER TABLE rpm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do all on rpm_notes"
  ON rpm_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
