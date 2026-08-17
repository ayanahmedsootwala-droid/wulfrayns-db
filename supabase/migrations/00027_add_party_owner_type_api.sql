
-- ── 1. Party table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rpm_parties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  phone         text,
  whatsapp      text,
  email         text,
  cnic          text,
  address       text,
  city          text,
  notes         text,
  tags          text[],
  is_active     boolean DEFAULT true,
  deals_done    integer DEFAULT 0,
  receivables   numeric DEFAULT 0,
  payables      numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE rpm_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties_all" ON rpm_parties FOR ALL USING (true) WITH CHECK (true);

-- ── 2. Add party_id FK to vehicles ───────────────────────────────────────────
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES rpm_parties(id) ON DELETE SET NULL;

-- ── 3. Extend owner_type to allow 'party' value (text column, no enum) ───────
-- owner_type is already text, just document that 'party' is now valid

-- ── 4. Import Calculator presets table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rpm_import_presets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  make        text,
  model       text,
  engine_cc   integer,
  fuel_type   text DEFAULT 'Petrol',
  is_hybrid   boolean DEFAULT false,
  is_ev       boolean DEFAULT false,
  cd_pct      numeric DEFAULT 0,
  rd_pct      numeric DEFAULT 0,
  st_pct      numeric DEFAULT 17,
  acd_pct     numeric DEFAULT 1,
  it_pct      numeric DEFAULT 2,
  ed_pct      numeric DEFAULT 0,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE rpm_import_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_all" ON rpm_import_presets FOR ALL USING (true) WITH CHECK (true);

INSERT INTO rpm_import_presets (name, make, model, engine_cc, fuel_type, is_hybrid, cd_pct, rd_pct, st_pct, acd_pct, it_pct, ed_pct) VALUES
  ('Toyota Aqua (1.5L HEV)',      'Toyota',  'Aqua',   1500, 'Hybrid',  true,  5,  5, 17, 1, 1, 0),
  ('Toyota Prius (1.8L HEV)',     'Toyota',  'Prius',  1800, 'Hybrid',  true,  5,  5, 17, 1, 1, 0),
  ('Toyota Corolla (1800cc)',     'Toyota',  'Corolla',1800, 'Petrol',  false, 50,25, 17, 1, 2, 0),
  ('Honda Vezel (1.5L HEV)',      'Honda',   'Vezel',  1500, 'Hybrid',  true,  5,  5, 17, 1, 1, 0),
  ('Honda Fit (1.3L)',            'Honda',   'Fit',    1300, 'Petrol',  false, 32,10, 17, 1, 2, 0),
  ('Nissan Note e-Power (HEV)',   'Nissan',  'Note',   1200, 'Hybrid',  true,  5,  5, 17, 1, 1, 0),
  ('Suzuki Alto (660cc)',         'Suzuki',  'Alto',    660, 'Petrol',  false, 15, 0, 17, 1, 2, 0),
  ('Mitsubishi Outlander PHEV',   'Mitsubishi','Outlander',2400,'Hybrid',true,  5,  5, 17, 1, 1, 0),
  ('Land Cruiser 200 (4500cc)',   'Toyota',  'Land Cruiser',4500,'Petrol',false,100,90,17, 7, 2, 20),
  ('Hiace (2800cc Diesel)',       'Toyota',  'Hiace',  2800, 'Diesel',  false, 65,45, 17, 1, 2, 0)
ON CONFLICT DO NOTHING;

-- ── 5. Customs duty chart table (editable) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rpm_customs_duty_chart (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cc_from         integer NOT NULL,
  cc_to           integer NOT NULL,
  fuel_type       text DEFAULT 'Petrol',
  is_hybrid       boolean DEFAULT false,
  depreciation_1yr  numeric DEFAULT 0,
  depreciation_2yr  numeric DEFAULT 0,
  depreciation_3yr  numeric DEFAULT 0,
  depreciation_4yr  numeric DEFAULT 0,
  depreciation_5yr  numeric DEFAULT 0,
  cd_pct          numeric NOT NULL,
  rd_pct          numeric DEFAULT 0,
  st_pct          numeric DEFAULT 17,
  acd_pct         numeric DEFAULT 1,
  it_pct          numeric DEFAULT 2,
  fed_pct         numeric DEFAULT 0,
  notes           text,
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE rpm_customs_duty_chart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duty_chart_all" ON rpm_customs_duty_chart FOR ALL USING (true) WITH CHECK (true);

INSERT INTO rpm_customs_duty_chart (cc_from, cc_to, fuel_type, is_hybrid, depreciation_1yr, depreciation_2yr, depreciation_3yr, depreciation_4yr, depreciation_5yr, cd_pct, rd_pct, st_pct, acd_pct, it_pct, fed_pct) VALUES
  (0,    800,  'Petrol', false, 15, 20, 25, 30, 35,  15,  0, 17, 1, 2,  0),
  (801,  1000, 'Petrol', false, 15, 20, 25, 30, 35,  25,  5, 17, 1, 2,  0),
  (1001, 1300, 'Petrol', false, 15, 20, 25, 30, 35,  32, 10, 17, 1, 2,  0),
  (1301, 1500, 'Petrol', false, 15, 20, 25, 30, 35,  45, 20, 17, 1, 2,  0),
  (1501, 1600, 'Petrol', false, 15, 20, 25, 30, 35,  50, 25, 17, 1, 2,  0),
  (1601, 1800, 'Petrol', false, 15, 20, 25, 30, 35,  50, 25, 17, 1, 2,  0),
  (1801, 2000, 'Petrol', false, 15, 20, 25, 30, 35,  65, 35, 17, 1, 2,  0),
  (2001, 2500, 'Petrol', false, 15, 20, 25, 30, 35,  75, 45, 17, 1, 2,  5),
  (2501, 3000, 'Petrol', false, 15, 20, 25, 30, 35,  90, 60, 17, 3, 2, 10),
  (3001, 4000, 'Petrol', false, 15, 20, 25, 30, 35, 100, 75, 17, 5, 2, 15),
  (4001, 9999, 'Petrol', false, 15, 20, 25, 30, 35, 100, 90, 17, 7, 2, 20),
  (0,    1800, 'Hybrid', true,  15, 20, 25, 30, 35,   5,  5, 17, 1, 1,  0),
  (1801, 9999, 'Hybrid', true,  15, 20, 25, 30, 35,  10, 10, 17, 1, 1,  0),
  (0,    9999, 'Electric', false,15,20, 25, 30, 35,   0,  0, 17, 1, 1,  0)
ON CONFLICT DO NOTHING;

-- ── 6. Vehicle status history (audit trail) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rpm_vehicle_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  old_status  text,
  new_status  text NOT NULL,
  changed_by  text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE rpm_vehicle_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_history_all" ON rpm_vehicle_status_history FOR ALL USING (true) WITH CHECK (true);

-- trigger: auto-log status change
CREATE OR REPLACE FUNCTION log_vehicle_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO rpm_vehicle_status_history (vehicle_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_vehicle_status_history ON vehicles;
CREATE TRIGGER trg_vehicle_status_history
  AFTER UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION log_vehicle_status_change();

-- ── 7. API keys table for third-party integrations ────────────────────────────
CREATE TABLE IF NOT EXISTS rpm_api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  key_hash    text NOT NULL UNIQUE,
  key_preview text NOT NULL,
  permissions text[] DEFAULT ARRAY['read'],
  is_active   boolean DEFAULT true,
  last_used_at timestamptz,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE rpm_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_all" ON rpm_api_keys FOR ALL USING (true) WITH CHECK (true);
