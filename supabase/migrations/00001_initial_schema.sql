
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- DEALERSHIPS TABLE
-- ============================================================
CREATE TABLE dealerships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  logo_url text,
  address text,
  city text,
  area text,
  google_maps_url text,
  owner_name text,
  employee_count integer DEFAULT 0,
  brands text[] DEFAULT '{}',
  business_hours text,
  phone text,
  email text,
  website text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- DEALERS TABLE
-- ============================================================
CREATE TABLE dealers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  photo_url text,
  phone text,
  whatsapp text,
  email text,
  cnic text,
  dealership_id uuid REFERENCES dealerships(id) ON DELETE SET NULL,
  address text,
  city text,
  area text,
  google_maps_url text,
  business_since integer,
  preferred_brands text[] DEFAULT '{}',
  average_budget numeric(15,2),
  rating numeric(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  trust_score integer DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  is_favorite boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  last_contact_at timestamptz,
  notes text,
  deals_done integer DEFAULT 0,
  receivables numeric(15,2) DEFAULT 0,
  payables numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- VEHICLES TABLE (Master Record)
-- ============================================================
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_number text UNIQUE,
  vin text,
  engine_number text,
  registration_number text,
  
  -- Basic
  make text NOT NULL,
  model text NOT NULL,
  variant text,
  generation text,
  series text,
  trim text,
  body_type text,
  model_year integer,
  registration_year integer,
  registration_month integer,
  registration_city text,
  origin text DEFAULT 'local' CHECK (origin IN ('local','imported')),
  auction_grade text,
  
  -- Engine
  engine_capacity text,
  horsepower integer,
  torque integer,
  is_turbo boolean DEFAULT false,
  fuel_type text,
  transmission text,
  drive_type text,
  battery_health integer,
  range_km integer,
  
  -- Exterior
  color text,
  interior_color text,
  paint_type text,
  original_paint_pct integer,
  touchups text,
  panels_painted integer DEFAULT 0,
  panels_replaced integer DEFAULT 0,
  has_rust boolean DEFAULT false,
  has_flood_damage boolean DEFAULT false,
  has_accident_history boolean DEFAULT false,
  dent_count integer DEFAULT 0,
  scratch_count integer DEFAULT 0,
  glass_original boolean DEFAULT true,
  windshield_original boolean DEFAULT true,
  
  -- Interior
  seat_material text,
  seat_color text,
  dashboard_condition text,
  steering_condition text,
  carpet_condition text,
  roof_condition text,
  is_smoker_car boolean DEFAULT false,
  has_pet boolean DEFAULT false,
  odor_notes text,
  
  -- Condition
  mileage integer,
  engine_health integer,
  transmission_health integer,
  suspension_condition integer,
  brakes_condition integer,
  battery_condition integer,
  tyres_condition integer,
  ac_condition integer,
  cooling_condition integer,
  overall_condition integer,
  inspection_score integer,
  
  -- Documentation
  has_original_book boolean DEFAULT false,
  has_smart_card boolean DEFAULT false,
  has_duplicate_book boolean DEFAULT false,
  has_transfer_letter boolean DEFAULT false,
  tax_paid boolean DEFAULT false,
  token_paid boolean DEFAULT false,
  lifetime_token boolean DEFAULT false,
  has_insurance boolean DEFAULT false,
  insurance_expiry date,
  biometric_available boolean DEFAULT false,
  excise_verified boolean DEFAULT false,
  file_complete boolean DEFAULT false,
  
  -- Factory Features (boolean flags)
  has_abs boolean DEFAULT false,
  airbag_count integer DEFAULT 0,
  has_esp boolean DEFAULT false,
  has_traction_control boolean DEFAULT false,
  has_cruise_control boolean DEFAULT false,
  has_adaptive_cruise boolean DEFAULT false,
  has_lane_assist boolean DEFAULT false,
  has_blind_spot boolean DEFAULT false,
  has_360_camera boolean DEFAULT false,
  has_parking_sensors boolean DEFAULT false,
  has_reverse_camera boolean DEFAULT false,
  has_tpms boolean DEFAULT false,
  has_hill_assist boolean DEFAULT false,
  has_auto_hold boolean DEFAULT false,
  
  -- Comfort
  has_climate_control boolean DEFAULT false,
  has_dual_zone_ac boolean DEFAULT false,
  has_rear_ac boolean DEFAULT false,
  has_push_start boolean DEFAULT false,
  has_keyless_entry boolean DEFAULT false,
  has_memory_seats boolean DEFAULT false,
  has_electric_seats boolean DEFAULT false,
  has_ventilated_seats boolean DEFAULT false,
  has_heated_seats boolean DEFAULT false,
  has_massage_seats boolean DEFAULT false,
  has_ambient_lighting boolean DEFAULT false,
  
  -- Entertainment
  has_android_panel boolean DEFAULT false,
  has_apple_carplay boolean DEFAULT false,
  has_android_auto boolean DEFAULT false,
  has_navigation boolean DEFAULT false,
  has_bluetooth boolean DEFAULT false,
  has_usb boolean DEFAULT false,
  has_wireless_charging boolean DEFAULT false,
  has_premium_audio boolean DEFAULT false,
  has_steering_controls boolean DEFAULT false,
  has_rear_entertainment boolean DEFAULT false,
  has_dash_cam boolean DEFAULT false,
  
  -- Exterior Features
  has_sunroof boolean DEFAULT false,
  has_panoramic_roof boolean DEFAULT false,
  has_alloy_wheels boolean DEFAULT false,
  has_led_lights boolean DEFAULT false,
  has_fog_lamps boolean DEFAULT false,
  has_roof_rails boolean DEFAULT false,
  has_spoiler boolean DEFAULT false,
  has_side_steps boolean DEFAULT false,
  has_power_tailgate boolean DEFAULT false,
  
  -- Pricing
  purchase_price numeric(15,2),
  repair_cost numeric(15,2) DEFAULT 0,
  investment numeric(15,2),
  current_demand numeric(15,2),
  min_selling_price numeric(15,2),
  market_price numeric(15,2),
  expected_selling_price numeric(15,2),
  profit_estimate numeric(15,2),
  is_negotiable boolean DEFAULT true,
  last_offer numeric(15,2),
  highest_offer numeric(15,2),
  lowest_offer numeric(15,2),
  commission numeric(15,2),
  
  -- Dealer
  dealer_id uuid REFERENCES dealers(id) ON DELETE SET NULL,
  dealership_id uuid REFERENCES dealerships(id) ON DELETE SET NULL,
  dealer_location text,
  dealer_area text,
  dealer_city text,
  last_contact_at timestamptz,
  dealer_rating numeric(3,1),
  
  -- Internal
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text DEFAULT 'available' CHECK (status IN ('available','reserved','booked','sold','incoming','archived','inspection')),
  is_hot_deal boolean DEFAULT false,
  is_urgent boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Notes
  mechanical_notes text,
  inspection_notes text,
  private_notes text,
  negotiation_notes text,
  customer_notes text,
  
  -- Media
  cover_image_url text,
  image_urls text[] DEFAULT '{}',
  video_urls text[] DEFAULT '{}',
  document_urls text[] DEFAULT '{}',
  voice_note_urls text[] DEFAULT '{}',
  
  -- Tags & search
  tags text[] DEFAULT '{}',
  search_vector tsvector,
  
  -- Source
  source text DEFAULT 'manual',
  owner_type text DEFAULT 'own' CHECK (owner_type IN ('own','dealer')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PRICE HISTORY TABLE
-- ============================================================
CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  old_price numeric(15,2),
  new_price numeric(15,2),
  difference numeric(15,2),
  percentage numeric(8,2),
  price_type text DEFAULT 'expected_selling_price',
  reason text,
  updated_by text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- DEALER INTERACTIONS TABLE
-- ============================================================
CREATE TABLE dealer_interactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('call','whatsapp','meeting','deal','payment','note','visit')),
  title text,
  notes text,
  amount numeric(15,2),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('call_dealer','visit_showroom','inspection','price_update','payment_reminder','document_collection','vehicle_pickup','vehicle_delivery','other')),
  description text,
  dealer_id uuid REFERENCES dealers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  due_date timestamptz,
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  assigned_to text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('vehicle','dealer','dealership','task','system','user')),
  entity_id uuid,
  entity_name text,
  old_value jsonb,
  new_value jsonb,
  description text,
  performed_by text DEFAULT 'system',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SAVED SEARCHES TABLE
-- ============================================================
CREATE TABLE saved_searches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  query text NOT NULL,
  filters jsonb DEFAULT '{}',
  search_type text DEFAULT 'global',
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_dealer_id ON vehicles(dealer_id);
CREATE INDEX idx_vehicles_owner_type ON vehicles(owner_type);
CREATE INDEX idx_vehicles_color ON vehicles(color);
CREATE INDEX idx_vehicles_fuel_type ON vehicles(fuel_type);
CREATE INDEX idx_vehicles_body_type ON vehicles(body_type);
CREATE INDEX idx_vehicles_city ON vehicles(dealer_city);
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX idx_vehicles_updated_at ON vehicles(updated_at DESC);
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_tags ON vehicles USING GIN(tags);
CREATE INDEX idx_vehicles_search ON vehicles USING GIN(search_vector);
CREATE INDEX idx_vehicles_make_trgm ON vehicles USING GIN(make gin_trgm_ops);
CREATE INDEX idx_vehicles_model_trgm ON vehicles USING GIN(model gin_trgm_ops);
CREATE INDEX idx_vehicles_color_trgm ON vehicles USING GIN(color gin_trgm_ops);
CREATE INDEX idx_dealers_name ON dealers(name);
CREATE INDEX idx_dealers_dealership ON dealers(dealership_id);
CREATE INDEX idx_dealers_city ON dealers(city);
CREATE INDEX idx_dealers_favorite ON dealers(is_favorite);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_price_history_vehicle ON price_history(vehicle_id, created_at DESC);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_dealer_interactions_dealer ON dealer_interactions(dealer_id, created_at DESC);

-- ============================================================
-- SEARCH VECTOR TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_vehicle_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.make,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.model,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.variant,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.color,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.fuel_type,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.body_type,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.registration_number,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.vin,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.dealer_city,'')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.mechanical_notes,'')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.inspection_notes,'')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_search_vector_update
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_vehicle_search_vector();

-- ============================================================
-- AUTO-UPDATED TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dealerships_updated_at BEFORE UPDATE ON dealerships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO STOCK NUMBER GENERATION
-- ============================================================
CREATE SEQUENCE vehicle_stock_seq START 1000;

CREATE OR REPLACE FUNCTION generate_stock_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_number IS NULL THEN
    NEW.stock_number := 'STC-' || LPAD(nextval('vehicle_stock_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_stock_number
  BEFORE INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION generate_stock_number();

-- ============================================================
-- PRICE HISTORY TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.expected_selling_price IS DISTINCT FROM NEW.expected_selling_price THEN
    INSERT INTO price_history (vehicle_id, old_price, new_price, difference, percentage, price_type, updated_by)
    VALUES (
      NEW.id,
      OLD.expected_selling_price,
      NEW.expected_selling_price,
      NEW.expected_selling_price - COALESCE(OLD.expected_selling_price, 0),
      CASE WHEN COALESCE(OLD.expected_selling_price, 0) > 0 THEN 
        ROUND(((NEW.expected_selling_price - OLD.expected_selling_price) / OLD.expected_selling_price * 100)::numeric, 2)
      ELSE 0 END,
      'expected_selling_price',
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_price_history
  AFTER UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (internal app)
CREATE POLICY "authenticated_all_vehicles" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_dealers" ON dealers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_dealerships" ON dealerships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_price_history" ON price_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_interactions" ON dealer_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_activity_log" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_saved_searches" ON saved_searches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon blocked
CREATE POLICY "anon_read_vehicles" ON vehicles FOR SELECT TO anon USING (false);
CREATE POLICY "anon_read_dealers" ON dealers FOR SELECT TO anon USING (false);
CREATE POLICY "anon_read_dealerships" ON dealerships FOR SELECT TO anon USING (false);
CREATE POLICY "anon_no_price_history" ON price_history FOR SELECT TO anon USING (false);
CREATE POLICY "anon_no_interactions" ON dealer_interactions FOR SELECT TO anon USING (false);
CREATE POLICY "anon_no_tasks" ON tasks FOR SELECT TO anon USING (false);
CREATE POLICY "anon_no_activity_log" ON activity_log FOR SELECT TO anon USING (false);
CREATE POLICY "anon_no_saved_searches" ON saved_searches FOR SELECT TO anon USING (false);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('vehicle-images', 'vehicle-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('vehicle-documents', 'vehicle-documents', false, 52428800, ARRAY['application/pdf','image/jpeg','image/png']),
  ('dealer-photos', 'dealer-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('dealership-logos', 'dealership-logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "auth_read_vehicle_images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-images');
CREATE POLICY "auth_insert_vehicle_images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images');
CREATE POLICY "auth_update_vehicle_images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-images');
CREATE POLICY "auth_delete_vehicle_images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images');
CREATE POLICY "auth_all_vehicle_docs" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'vehicle-documents') WITH CHECK (bucket_id = 'vehicle-documents');
CREATE POLICY "auth_all_dealer_photos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'dealer-photos') WITH CHECK (bucket_id = 'dealer-photos');
CREATE POLICY "auth_all_dealership_logos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'dealership-logos') WITH CHECK (bucket_id = 'dealership-logos');
CREATE POLICY "public_read_vehicle_images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'vehicle-images');
CREATE POLICY "public_read_dealer_photos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'dealer-photos');
CREATE POLICY "public_read_dealership_logos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'dealership-logos');

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO dealerships (id, name, city, area, address, owner_name, employee_count, brands, business_hours, phone, email) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Prestige Motors', 'Lahore', 'DHA Phase 5', '12-C Commercial Area, DHA Phase 5', 'Usman Malik', 12, ARRAY['Toyota','Honda','Suzuki'], 'Mon-Sat 9AM-7PM', '0300-1234567', 'prestige@motors.pk'),
  ('11111111-0000-0000-0000-000000000002', 'Premium Auto Gallery', 'Karachi', 'Clifton', 'Block 8, Clifton', 'Tariq Ahmed', 8, ARRAY['BMW','Mercedes','Audi'], 'Mon-Sat 10AM-8PM', '0321-9876543', 'info@premiumauto.pk'),
  ('11111111-0000-0000-0000-000000000003', 'City Motors', 'Islamabad', 'F-10', 'F-10 Markaz', 'Asif Khan', 6, ARRAY['Toyota','Suzuki','Kia'], 'Mon-Sun 9AM-9PM', '0333-5554444', 'city@motors.pk'),
  ('11111111-0000-0000-0000-000000000004', 'National Cars', 'Lahore', 'Gulberg', '45 Main Boulevard Gulberg III', 'Imran Butt', 15, ARRAY['Toyota','Honda','Hyundai','Kia'], 'Mon-Sat 9AM-8PM', '0311-2223333', 'info@nationalcars.pk');

INSERT INTO dealers (id, name, phone, whatsapp, dealership_id, city, area, rating, trust_score, is_favorite, preferred_brands, last_contact_at, deals_done, tags) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Ahmed Shah', '0300-1111111', '0300-1111111', '11111111-0000-0000-0000-000000000001', 'Lahore', 'DHA', 4.5, 88, true, ARRAY['Toyota','Honda'], now() - interval '2 days', 23, ARRAY['trusted','frequent']),
  ('22222222-0000-0000-0000-000000000002', 'Bilal Chaudhry', '0321-2222222', '0321-2222222', '11111111-0000-0000-0000-000000000002', 'Karachi', 'Clifton', 4.0, 75, false, ARRAY['BMW','Mercedes'], now() - interval '5 days', 15, ARRAY['premium']),
  ('22222222-0000-0000-0000-000000000003', 'Kamran Zafar', '0333-3333333', '0333-3333333', '11111111-0000-0000-0000-000000000003', 'Islamabad', 'F-10', 3.5, 60, false, ARRAY['Toyota','Suzuki'], now() - interval '10 days', 8, ARRAY['new']),
  ('22222222-0000-0000-0000-000000000004', 'Tariq Mehmood', '0311-4444444', '0311-4444444', '11111111-0000-0000-0000-000000000004', 'Lahore', 'Gulberg', 5.0, 95, true, ARRAY['Toyota','Land Cruiser','Prado'], now() - interval '1 day', 45, ARRAY['top-dealer','vip','trusted']),
  ('22222222-0000-0000-0000-000000000005', 'Zubair Hassan', '0345-5555555', '0345-5555555', '11111111-0000-0000-0000-000000000001', 'Lahore', 'Model Town', 4.2, 80, false, ARRAY['Honda','Suzuki'], now() - interval '3 days', 19, ARRAY['reliable']);

INSERT INTO vehicles (make, model, variant, color, interior_color, fuel_type, transmission, body_type, model_year, mileage, status, owner_type, expected_selling_price, market_price, purchase_price, dealer_id, dealership_id, dealer_city, dealer_area, has_android_panel, has_sunroof, has_apple_carplay, has_alloy_wheels, has_push_start, has_reverse_camera, has_abs, airbag_count, has_climate_control, has_panoramic_roof, is_featured, is_hot_deal, tags, overall_condition, inspection_score, cover_image_url) VALUES
  ('Toyota', 'Corolla', 'Altis X', 'White', 'Black', 'Petrol', 'Automatic', 'Sedan', 2022, 35000, 'available', 'own', 4800000, 4900000, 4200000, '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Lahore', 'DHA', true, false, true, true, true, true, true, 2, true, false, true, true, ARRAY['low-mileage','clean'], 8, 82, null),
  ('Honda', 'Civic', 'RS Turbo', 'White', 'Red', 'Petrol', 'CVT', 'Sedan', 2023, 18000, 'available', 'dealer', 6500000, 6600000, null, '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Karachi', 'Clifton', true, true, true, true, true, true, true, 6, true, false, true, false, ARRAY['rs','turbo','premium'], 9, 90, null),
  ('Toyota', 'Land Cruiser', 'ZX', 'Black', 'Beige', 'Petrol', 'Automatic', 'SUV', 2021, 62000, 'available', 'dealer', 18500000, 19000000, null, '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Lahore', 'Gulberg', true, true, true, true, true, true, true, 8, true, true, false, false, ARRAY['zx','luxury'], 8, 78, null),
  ('Toyota', 'Prado', 'TXL', 'Silver', 'Black', 'Diesel', 'Automatic', 'SUV', 2020, 88000, 'available', 'dealer', 14000000, 14500000, null, '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Lahore', 'Gulberg', true, true, false, true, true, true, true, 7, false, false, false, true, ARRAY['diesel','4x4'], 7, 72, null),
  ('Suzuki', 'Swift', 'GL', 'Red', 'Black', 'Petrol', 'Automatic', 'Hatchback', 2023, 12000, 'available', 'own', 2800000, 2900000, 2400000, '22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Lahore', 'Model Town', false, false, false, true, false, true, true, 2, false, false, false, false, ARRAY['budget','low-mileage'], 9, 88, null),
  ('Honda', 'BRV', 'S', 'Grey', 'Grey', 'Petrol', 'Automatic', 'Crossover', 2022, 45000, 'available', 'dealer', 5200000, 5400000, null, '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Lahore', 'DHA', true, false, false, true, false, true, true, 4, true, false, false, false, ARRAY['family','crossover'], 8, 80, null),
  ('Hyundai', 'Tucson', 'Ultimate', 'Blue', 'Black', 'Petrol', 'Automatic', 'SUV', 2023, 22000, 'available', 'dealer', 8500000, 8800000, null, '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Islamabad', 'F-10', true, true, true, true, true, true, true, 7, true, false, true, false, ARRAY['suv','premium'], 9, 87, null),
  ('Toyota', 'Hilux', 'Revo V', 'White', 'Black', 'Diesel', 'Automatic', 'Pickup', 2022, 55000, 'available', 'dealer', 11000000, 11500000, null, '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Lahore', 'Gulberg', true, false, false, true, true, true, true, 2, true, false, false, true, ARRAY['diesel','4x4','commercial'], 8, 82, null),
  ('Kia', 'Sportage', 'Alpha', 'Pearl White', 'Black', 'Petrol', 'Automatic', 'SUV', 2023, 15000, 'available', 'own', 7200000, 7400000, 6500000, '22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Lahore', 'DHA', true, true, true, true, true, true, true, 6, true, false, true, false, ARRAY['suv','kia','alpha'], 9, 91, null),
  ('Toyota', 'Corolla', 'X Cvti-R', 'Silver', 'Grey', 'Petrol', 'Automatic', 'Sedan', 2021, 67000, 'sold', 'own', 4200000, 4300000, 3700000, '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Lahore', 'DHA', true, false, false, true, false, false, true, 2, false, false, false, false, ARRAY['sold'], 7, 70, null),
  ('Honda', 'City', 'Aspire CVT', 'Champagne', 'Beige', 'Petrol', 'CVT', 'Sedan', 2022, 28000, 'reserved', 'dealer', 3800000, 3900000, null, '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Karachi', 'Clifton', true, false, true, true, false, true, true, 4, false, false, false, false, ARRAY['reserved'], 8, 79, null),
  ('BMW', '3 Series', '320i', 'Black', 'Black', 'Petrol', 'Automatic', 'Sedan', 2020, 75000, 'available', 'dealer', 12500000, 13000000, null, '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Karachi', 'Clifton', true, true, true, true, true, true, true, 8, true, true, false, false, ARRAY['luxury','imported','bmw'], 7, 74, null);

INSERT INTO activity_log (action_type, entity_type, entity_name, description, performed_by) VALUES
  ('vehicle_added', 'vehicle', 'Toyota Corolla Altis X', 'New vehicle added to own inventory', 'Admin'),
  ('vehicle_added', 'vehicle', 'Honda Civic RS Turbo', 'New vehicle added from dealer Ahmed Shah', 'Admin'),
  ('dealer_added', 'dealer', 'Ahmed Shah', 'New dealer profile created', 'Admin'),
  ('price_changed', 'vehicle', 'Toyota Land Cruiser ZX', 'Price updated from 18,000,000 to 18,500,000', 'Admin'),
  ('vehicle_sold', 'vehicle', 'Toyota Corolla X Cvti-R', 'Vehicle marked as sold', 'Admin'),
  ('dealer_added', 'dealer', 'Tariq Mehmood', 'New dealer profile created - VIP dealer', 'Admin');

INSERT INTO tasks (title, task_type, description, dealer_id, due_date, priority, status) VALUES
  ('Follow up with Ahmed Shah', 'call_dealer', 'Check on Toyota Corolla availability', '22222222-0000-0000-0000-000000000001', now() + interval '1 day', 'high', 'pending'),
  ('Visit Prestige Motors', 'visit_showroom', 'Inspect new stock at Prestige Motors DHA', '22222222-0000-0000-0000-000000000001', now() + interval '3 days', 'normal', 'pending'),
  ('Update Prado price', 'price_update', 'Market survey suggests reducing price by 200k', '22222222-0000-0000-0000-000000000004', now(), 'urgent', 'pending'),
  ('Collect documents - Civic RS', 'document_collection', 'Get original book and transfer letter', '22222222-0000-0000-0000-000000000002', now() + interval '2 days', 'high', 'pending'),
  ('Payment reminder - Tariq', 'payment_reminder', 'Outstanding payment of PKR 500,000', '22222222-0000-0000-0000-000000000004', now(), 'urgent', 'pending');
