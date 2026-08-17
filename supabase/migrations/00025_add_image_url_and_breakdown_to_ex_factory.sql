
ALTER TABLE rpm_ex_factory_prices
  ADD COLUMN IF NOT EXISTS image_url         text,
  ADD COLUMN IF NOT EXISTS on_road_breakdown text;
