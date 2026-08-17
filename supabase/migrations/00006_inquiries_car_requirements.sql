
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS req_make        text,
  ADD COLUMN IF NOT EXISTS req_model       text,
  ADD COLUMN IF NOT EXISTS req_variant     text,
  ADD COLUMN IF NOT EXISTS req_color       text,
  ADD COLUMN IF NOT EXISTS req_model_year  integer,
  ADD COLUMN IF NOT EXISTS req_reg_year    integer,
  ADD COLUMN IF NOT EXISTS req_mileage_max integer,
  ADD COLUMN IF NOT EXISTS req_budget_max  numeric(12,2),
  ADD COLUMN IF NOT EXISTS req_fuel_type   text,
  ADD COLUMN IF NOT EXISTS req_body_type   text,
  ADD COLUMN IF NOT EXISTS req_additional  text;
