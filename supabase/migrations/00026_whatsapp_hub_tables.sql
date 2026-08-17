
-- WhatsApp capture sessions (groups/chats user pastes from)
CREATE TABLE IF NOT EXISTS rpm_wa_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  type        text DEFAULT 'sourcing' CHECK (type IN ('sourcing','buyers','general','auction','wholesale')),
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE rpm_wa_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_groups_all" ON rpm_wa_groups FOR ALL USING (true) WITH CHECK (true);

-- Raw paste captures
CREATE TABLE IF NOT EXISTS rpm_wa_captures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES rpm_wa_groups(id) ON DELETE SET NULL,
  raw_text        text NOT NULL,
  capture_type    text DEFAULT 'stock' CHECK (capture_type IN ('stock','requirement','general')),
  ai_extracted    boolean DEFAULT false,
  extracted_count integer DEFAULT 0,
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE rpm_wa_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_captures_all" ON rpm_wa_captures FOR ALL USING (true) WITH CHECK (true);

-- AI-extracted vehicle stock listings from WA messages
CREATE TABLE IF NOT EXISTS rpm_wa_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id      uuid REFERENCES rpm_wa_captures(id) ON DELETE SET NULL,
  group_id        uuid REFERENCES rpm_wa_groups(id) ON DELETE SET NULL,
  raw_message     text,
  -- vehicle fields
  make            text,
  model           text,
  variant         text,
  year            integer,
  mileage         integer,
  color           text,
  transmission    text,
  fuel_type       text,
  body_type       text,
  condition       text DEFAULT 'used',
  -- pricing
  asking_price    numeric,
  negotiable      boolean DEFAULT true,
  currency        text DEFAULT 'PKR',
  -- location / contact
  city            text,
  contact_name    text,
  contact_phone   text,
  -- status
  status          text DEFAULT 'available' CHECK (status IN ('available','negotiating','sold','expired','unverified')),
  -- meta
  confidence      integer DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  notes           text,
  is_verified     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE rpm_wa_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_listings_all" ON rpm_wa_listings FOR ALL USING (true) WITH CHECK (true);

-- AI-extracted buyer requirements from WA messages
CREATE TABLE IF NOT EXISTS rpm_wa_requirements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id      uuid REFERENCES rpm_wa_captures(id) ON DELETE SET NULL,
  group_id        uuid REFERENCES rpm_wa_groups(id) ON DELETE SET NULL,
  raw_message     text,
  -- buyer info
  buyer_name      text,
  contact_phone   text,
  city            text,
  -- requirement
  make            text,
  model           text,
  variant         text,
  year_min        integer,
  year_max        integer,
  mileage_max     integer,
  color_pref      text,
  transmission    text,
  budget_min      numeric,
  budget_max      numeric,
  currency        text DEFAULT 'PKR',
  -- flags
  financing       boolean DEFAULT false,
  exchange        boolean DEFAULT false,
  urgency         text DEFAULT 'normal' CHECK (urgency IN ('urgent','normal','flexible')),
  -- status
  status          text DEFAULT 'active' CHECK (status IN ('active','matched','fulfilled','expired','cancelled')),
  confidence      integer DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE rpm_wa_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_requirements_all" ON rpm_wa_requirements FOR ALL USING (true) WITH CHECK (true);

-- Seed default groups
INSERT INTO rpm_wa_groups (name, description, type) VALUES
  ('Car Dealers Karachi', 'Main Karachi dealer sourcing group', 'sourcing'),
  ('JDM Imports PK', 'Japanese domestic market vehicle importers', 'auction'),
  ('Used Cars Lahore', 'Lahore wholesale dealer network', 'wholesale'),
  ('Buyers Wanted - KHI', 'Buyer requirements and want-to-buy posts', 'buyers'),
  ('Toyota Corolla Group', 'Corolla specific sourcing & trading', 'sourcing')
ON CONFLICT DO NOTHING;
