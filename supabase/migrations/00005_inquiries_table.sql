
CREATE TYPE inquiry_status AS ENUM ('new', 'in_progress', 'resolved', 'closed');
CREATE TYPE inquiry_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE inquiries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    text NOT NULL,
  customer_phone   text,
  customer_email   text,
  description      text,
  vehicle_id       uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  status           inquiry_status NOT NULL DEFAULT 'new',
  priority         inquiry_priority NOT NULL DEFAULT 'medium',
  assigned_to      text,
  follow_up_date   date,
  inquiry_date     timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inquiry_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id   uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author       text NOT NULL DEFAULT 'Team',
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_status   ON inquiries(status);
CREATE INDEX idx_inquiries_priority ON inquiries(priority);
CREATE INDEX idx_inquiries_date     ON inquiries(inquiry_date DESC);
CREATE INDEX idx_inquiry_notes_inq  ON inquiry_notes(inquiry_id);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE inquiries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_notes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_select_all"   ON inquiries FOR SELECT USING (true);
CREATE POLICY "inquiries_insert_auth"  ON inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inquiries_update_auth"  ON inquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "inquiries_delete_auth"  ON inquiries FOR DELETE TO authenticated USING (true);

CREATE POLICY "inq_notes_select_all"   ON inquiry_notes FOR SELECT USING (true);
CREATE POLICY "inq_notes_insert_auth"  ON inquiry_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inq_notes_update_auth"  ON inquiry_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "inq_notes_delete_auth"  ON inquiry_notes FOR DELETE TO authenticated USING (true);
