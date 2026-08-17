
-- Storage RLS for existing bucket
CREATE POLICY "vehicle_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-images');

-- vehicle_images table
CREATE TABLE vehicle_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  url           text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_primary    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_sort       ON vehicle_images(vehicle_id, sort_order);

ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_images_select_all"
  ON vehicle_images FOR SELECT USING (true);

CREATE POLICY "vehicle_images_insert_auth"
  ON vehicle_images FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "vehicle_images_update_auth"
  ON vehicle_images FOR UPDATE TO authenticated USING (true);

CREATE POLICY "vehicle_images_delete_auth"
  ON vehicle_images FOR DELETE TO authenticated USING (true);

-- Trigger: keep vehicles.cover_image_url in sync with primary image
CREATE OR REPLACE FUNCTION sync_vehicle_cover_image()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_primary_url text;
BEGIN
  SELECT url INTO v_primary_url
  FROM vehicle_images
  WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
  ORDER BY is_primary DESC, sort_order ASC
  LIMIT 1;

  UPDATE vehicles
  SET cover_image_url = v_primary_url
  WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_vehicle_cover
  AFTER INSERT OR UPDATE OR DELETE ON vehicle_images
  FOR EACH ROW EXECUTE FUNCTION sync_vehicle_cover_image();
