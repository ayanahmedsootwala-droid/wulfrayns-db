ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_condition VARCHAR(10) CHECK (vehicle_condition IN ('new', 'used')),
  ADD COLUMN IF NOT EXISTS sold_price NUMERIC(15,2);