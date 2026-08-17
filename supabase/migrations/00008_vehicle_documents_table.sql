
-- vehicle_documents table
CREATE TABLE vehicle_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'other',
  file_url    text NOT NULL,
  file_path   text NOT NULL,
  file_size   bigint,
  mime_type   text,
  notes       text,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_category   ON vehicle_documents(category);
CREATE INDEX idx_vehicle_documents_expires_at ON vehicle_documents(expires_at);

ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vdocs_select_all" ON vehicle_documents FOR SELECT USING (true);
CREATE POLICY "vdocs_insert_all" ON vehicle_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "vdocs_update_all" ON vehicle_documents FOR UPDATE USING (true);
CREATE POLICY "vdocs_delete_all" ON vehicle_documents FOR DELETE USING (true);
