
-- Ex-Factory price catalog for Chinese / new brands
CREATE TABLE IF NOT EXISTS rpm_ex_factory_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand       text NOT NULL,
  model       text NOT NULL,
  variant     text NOT NULL,
  year        integer NOT NULL DEFAULT EXTRACT(year FROM now()),
  ex_factory  bigint NOT NULL,   -- PKR ex-factory price
  on_road     bigint,            -- estimated on-road
  currency    text NOT NULL DEFAULT 'PKR',
  source      text,              -- e.g. 'Pakwheels', 'Official Site'
  notes       text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add saved column to rpm_import_costs if it doesn't exist
ALTER TABLE rpm_import_costs ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false;

-- Seed ex-factory prices (2025 data from official/Pakwheels sources)
INSERT INTO rpm_ex_factory_prices (brand, model, variant, year, ex_factory, on_road, source, notes, sort_order) VALUES
-- Deepal
('Deepal', 'S05', 'Standard Range (SR)', 2025, 9499000, 10200000, 'Official/Pakwheels', '150kW motor, 66kWh CATL, 450km range', 10),
('Deepal', 'S05', 'Long Range (LR)', 2025, 10499000, 11300000, 'Official/Pakwheels', '150kW motor, 90kWh CATL, 600km range', 11),
('Deepal', 'S07', 'Standard', 2025, 13499000, 14500000, 'Official/Pakwheels', 'Larger SUV, 500km NEDC', 12),

-- BYD
('BYD', 'Atto 3', 'Standard Range', 2025, 8499000, 9200000, 'Pakwheels', '150kW, 512km NEDC', 20),
('BYD', 'Atto 3', 'Long Range', 2025, 9499000, 10200000, 'Pakwheels', '150kW, 650km NEDC', 21),
('BYD', 'Seal', 'Standard', 2025, 12999000, 13900000, 'Pakwheels', '204kW RWD', 22),
('BYD', 'Seal', 'Performance', 2025, 15999000, 17000000, 'Pakwheels', '390kW AWD', 23),
('BYD', 'Shark 6', 'PHEV Pickup', 2025, 19999000, 21500000, 'Official/Pakwheels', 'PHEV pickup, 100km EV range, AWD', 24),
('BYD', 'Sealion 6', 'Base', 2025, 10999000, 11800000, 'Pakwheels', 'PHEV SUV', 25),
('BYD', 'Han', 'EV', 2025, 18999000, 20500000, 'Pakwheels', 'Large flagship sedan', 26),

-- GWM / Tank
('GWM', 'Tank 300 HEV', 'Base', 2025, 13500000, 14500000, 'Pakwheels', '2.0T HEV, BodyOnFrame', 30),
('GWM', 'Tank 500 HEV', 'Standard', 2025, 19999000, 21500000, 'Pakwheels', '3.0T HEV, PHEV optional', 31),
('GWM', 'Haval H6 HEV', 'Base', 2025, 7699000, 8300000, 'Pakwheels', '1.5T HEV hybrid SUV', 32),
('GWM', 'Haval Jolion HEV', 'Base', 2025, 5999000, 6600000, 'Pakwheels', '1.5T hybrid, popular in PK', 33),

-- Jaecoo
('Jaecoo', 'J7', 'Base', 2025, 5999000, 6500000, 'Pakwheels', '1.6T, 7-seater SUV', 40),
('Jaecoo', 'J7', 'Premium', 2025, 7299000, 7900000, 'Pakwheels', '1.6T premium', 41),
('Jaecoo', 'J8 PHEV', 'Standard', 2025, 9499000, 10200000, 'Official', 'PHEV, 80km EV range', 42),

-- Jetour
('Jetour', 'X70 Plus', 'Base', 2025, 5499000, 6000000, 'Pakwheels', '1.5T, 7-seat SUV', 50),
('Jetour', 'X90 Plus', 'Base', 2025, 7999000, 8600000, 'Pakwheels', '2.0T, 7-seat flagship SUV', 51),
('Jetour', 'Dashing', 'Base', 2025, 4299000, 4800000, 'Pakwheels', '1.5T, stylish crossover', 52),

-- GAC Aion
('GAC Aion', 'UT', 'Standard', 2025, 5999000, 6500000, 'Official', '65kWh, 420km CLTC', 60),
('GAC Aion', 'S Plus', 'Standard', 2025, 6499000, 7000000, 'Official', '70kWh sedan', 61),
('GAC Aion', 'Y Plus', 'Standard', 2025, 5299000, 5800000, 'Official', 'Compact EV SUV', 62),

-- MG
('MG', 'ZS EV', 'Base', 2025, 4999000, 5500000, 'Pakwheels', '51kWh, 350km range', 70),
('MG', 'ZS EV', 'Long Range', 2025, 5999000, 6500000, 'Pakwheels', '70kWh, 440km range', 71),
('MG', 'HS PHEV', 'Base', 2025, 7299000, 7900000, 'Pakwheels', '1.5T PHEV SUV', 72),
('MG', '4 EV', 'Standard', 2025, 4499000, 4900000, 'Official', 'Compact hatchback EV', 73),

-- Changan
('Changan', 'Uni-T', 'Base', 2025, 4299000, 4700000, 'Pakwheels', '1.5T SUV', 80),
('Changan', 'Oshan X7 Plus', 'Base', 2025, 6499000, 7000000, 'Pakwheels', '2.0T 7-seat flagship', 81),
('Changan', 'Lumin EV', 'Standard', 2025, 2999000, 3300000, 'Official', 'Mini EV city car', 82)
ON CONFLICT DO NOTHING;
