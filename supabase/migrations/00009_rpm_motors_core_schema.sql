
-- ============================================================
-- RPM MOTORS — Core Schema (leads, quotations, auction/import,
-- shipments, expenses, finance_plans, social_posts)
-- ============================================================

-- 1. LEADS (CRM)
CREATE TABLE IF NOT EXISTS rpm_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone         text,
  whatsapp      text,
  email         text,
  city          text,
  budget_min    numeric,
  budget_max    numeric,
  req_make      text,
  req_model     text,
  req_body_type text,
  req_fuel_type text,
  req_transmission text,
  req_seats     int,
  req_color     text,
  req_year_min  int,
  req_year_max  int,
  req_purpose   text,
  req_notes     text,
  lead_score    text NOT NULL DEFAULT 'warm' CHECK (lead_score IN ('hot','warm','cold')),
  source        text,
  call_count    int NOT NULL DEFAULT 0,
  visit_count   int NOT NULL DEFAULT 0,
  whatsapp_messages int NOT NULL DEFAULT 0,
  last_contact_at timestamptz,
  follow_up_at  timestamptz,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','lost','on_hold')),
  assigned_to   text,
  notes         text,
  interested_vehicle_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_leads" ON rpm_leads FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. QUOTATIONS
CREATE TABLE IF NOT EXISTS rpm_quotations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number      text UNIQUE NOT NULL,
  lead_id           uuid REFERENCES rpm_leads(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,
  customer_email    text,
  vehicle_id        uuid,
  vehicle_snapshot  jsonb,
  vehicle_price     numeric NOT NULL DEFAULT 0,
  registration_charges numeric NOT NULL DEFAULT 0,
  gst_amount        numeric NOT NULL DEFAULT 0,
  fed_excise        numeric NOT NULL DEFAULT 0,
  withholding_tax   numeric NOT NULL DEFAULT 0,
  insurance_amount  numeric NOT NULL DEFAULT 0,
  accessories       jsonb,
  accessories_total numeric NOT NULL DEFAULT 0,
  delivery_days     int,
  subtotal          numeric GENERATED ALWAYS AS (vehicle_price + registration_charges + gst_amount + fed_excise + withholding_tax + insurance_amount + accessories_total) STORED,
  discount          numeric NOT NULL DEFAULT 0,
  total             numeric GENERATED ALWAYS AS (vehicle_price + registration_charges + gst_amount + fed_excise + withholding_tax + insurance_amount + accessories_total - discount) STORED,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  terms             text,
  notes             text,
  valid_until       date,
  sent_at           timestamptz,
  accepted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_quotations" ON rpm_quotations FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-generate quote number
CREATE OR REPLACE FUNCTION rpm_gen_quote_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.quote_number := 'RPM-Q-' || to_char(now(), 'YYMM') || '-' || LPAD(nextval('rpm_quote_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;
CREATE SEQUENCE IF NOT EXISTS rpm_quote_seq START 1001;
CREATE TRIGGER trg_rpm_quote_number BEFORE INSERT ON rpm_quotations
  FOR EACH ROW WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION rpm_gen_quote_number();

-- 3. IMPORT COST CALCULATIONS
CREATE TABLE IF NOT EXISTS rpm_import_costs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make              text,
  model             text,
  model_year        int,
  auction_grade     text,
  fob_jpy           numeric NOT NULL,
  exchange_rate     numeric NOT NULL,
  fob_pkr           numeric GENERATED ALWAYS AS (fob_jpy * exchange_rate) STORED,
  freight_pkr       numeric NOT NULL DEFAULT 0,
  insurance_pkr     numeric NOT NULL DEFAULT 0,
  customs_duty_pkr  numeric NOT NULL DEFAULT 0,
  sales_tax_pkr     numeric NOT NULL DEFAULT 0,
  withholding_tax_pkr numeric NOT NULL DEFAULT 0,
  clearing_charges_pkr numeric NOT NULL DEFAULT 0,
  total_landing_pkr numeric GENERATED ALWAYS AS (
    fob_jpy * exchange_rate + freight_pkr + insurance_pkr + customs_duty_pkr + sales_tax_pkr + withholding_tax_pkr + clearing_charges_pkr
  ) STORED,
  expected_selling_pkr numeric,
  estimated_profit_pkr numeric GENERATED ALWAYS AS (
    CASE WHEN expected_selling_pkr IS NOT NULL THEN
      expected_selling_pkr - (fob_jpy * exchange_rate + freight_pkr + insurance_pkr + customs_duty_pkr + sales_tax_pkr + withholding_tax_pkr + clearing_charges_pkr)
    ELSE NULL END
  ) STORED,
  notes             text,
  saved             boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_import_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_import_costs" ON rpm_import_costs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. SHIPMENTS
CREATE TABLE IF NOT EXISTS rpm_shipments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_ref    text UNIQUE NOT NULL,
  vehicle_ids     uuid[],
  vehicle_names   text[],
  origin_country  text NOT NULL DEFAULT 'Japan',
  origin_port     text,
  destination_port text NOT NULL DEFAULT 'Karachi',
  container_number text,
  bl_number       text,
  vessel_name     text,
  status          text NOT NULL DEFAULT 'in_transit' CHECK (status IN ('ordered','in_transit','customs_clearance','port_hold','delivered','cancelled')),
  departure_date  date,
  eta             date,
  delivered_at    date,
  total_cost_pkr  numeric,
  notes           text,
  documents       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_shipments" ON rpm_shipments FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS rpm_expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  category    text NOT NULL CHECK (category IN ('rent','salaries','utilities','marketing','maintenance','vehicle_purchase','fuel','office','other')),
  amount_pkr  numeric NOT NULL,
  description text,
  receipt_url text,
  vehicle_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_expenses" ON rpm_expenses FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. FINANCE PLANS
CREATE TABLE IF NOT EXISTS rpm_finance_plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name           text NOT NULL,
  plan_name           text,
  interest_rate_pct   numeric NOT NULL,
  tenure_months       int NOT NULL,
  min_down_pct        numeric NOT NULL DEFAULT 20,
  max_vehicle_price   numeric,
  min_vehicle_price   numeric,
  processing_fee_pkr  numeric DEFAULT 0,
  is_islamic          boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_finance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_finance_plans" ON rpm_finance_plans FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO rpm_finance_plans (bank_name, plan_name, interest_rate_pct, tenure_months, min_down_pct, is_islamic) VALUES
  ('Meezan Bank', 'Car Ijarah', 18.5, 60, 20, true),
  ('Bank Alfalah', 'Auto Finance', 21.0, 60, 15, false),
  ('HBL', 'Car Loan', 22.5, 60, 20, false),
  ('MCB', 'Auto Finance', 20.0, 60, 20, false),
  ('UBL', 'Drive', 21.5, 60, 20, false),
  ('Faysal Bank', 'Sayyarah', 19.0, 60, 20, true),
  ('Dubai Islamic Bank', 'Auto Finance', 18.0, 60, 20, true),
  ('National Bank', 'Advance Salary', 17.0, 48, 25, false)
ON CONFLICT DO NOTHING;

-- 7. SOCIAL POSTS (generated content)
CREATE TABLE IF NOT EXISTS rpm_social_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid,
  vehicle_name    text,
  platform        text NOT NULL CHECK (platform IN ('instagram','facebook','linkedin','whatsapp','website','olx','pakwheels')),
  content         text NOT NULL,
  hashtags        text,
  cta             text,
  seo_description text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at    timestamptz,
  engagement_views int DEFAULT 0,
  engagement_enquiries int DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_social_posts" ON rpm_social_posts FOR ALL TO anon USING (true) WITH CHECK (true);

-- 8. EXCHANGE RATES (JPY/PKR)
CREATE TABLE IF NOT EXISTS rpm_exchange_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL DEFAULT 'JPY',
  to_currency text NOT NULL DEFAULT 'PKR',
  rate        numeric NOT NULL,
  source      text DEFAULT 'manual',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_exchange_rates" ON rpm_exchange_rates FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed current exchange rate
INSERT INTO rpm_exchange_rates (from_currency, to_currency, rate, source) VALUES ('JPY', 'PKR', 1.88, 'seed');

-- 9. LEAD INTERACTIONS LOG
CREATE TABLE IF NOT EXISTS rpm_lead_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES rpm_leads(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('call','whatsapp','visit','email','sms','note')),
  notes       text,
  duration_min int,
  outcome     text,
  next_action text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpm_lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_rpm_lead_interactions" ON rpm_lead_interactions FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed sample leads
INSERT INTO rpm_leads (customer_name, phone, whatsapp, city, budget_max, req_make, req_model, req_fuel_type, lead_score, source, call_count, visit_count, whatsapp_messages, notes)
VALUES
  ('Ahmed Raza', '0300-1234567', '0300-1234567', 'Karachi', 8000000, 'Toyota', 'Fortuner', 'Petrol', 'hot', 'WhatsApp', 4, 1, 12, 'Very interested, visited showroom once'),
  ('Sana Mirza', '0321-9876543', '0321-9876543', 'Lahore', 5000000, 'Honda', 'Civic', 'Hybrid', 'warm', 'Facebook', 2, 0, 5, 'Asked about financing options'),
  ('Bilal Shaikh', '0333-5556677', null, 'Islamabad', 12000000, 'Land Cruiser', null, null, 'hot', 'Referral', 3, 2, 8, 'Has budget, wants premium SUV'),
  ('Fatima Khan', '0345-1122334', '0345-1122334', 'Rawalpindi', 3500000, 'Suzuki', 'Alto', 'Petrol', 'cold', 'OLX', 1, 0, 2, 'Price sensitive'),
  ('Usman Ali', '0312-7788990', '0312-7788990', 'Karachi', 15000000, 'BMW', null, null, 'warm', 'Instagram', 2, 1, 6, 'Interested in imported luxury')
ON CONFLICT DO NOTHING;
