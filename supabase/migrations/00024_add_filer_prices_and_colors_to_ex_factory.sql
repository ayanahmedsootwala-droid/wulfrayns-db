
-- Add filer / non-filer on-road prices and official color options
ALTER TABLE rpm_ex_factory_prices
  ADD COLUMN IF NOT EXISTS on_road_filer     bigint,
  ADD COLUMN IF NOT EXISTS on_road_non_filer bigint,
  ADD COLUMN IF NOT EXISTS color_options     text;   -- already exists but add IF NOT EXISTS to be safe
