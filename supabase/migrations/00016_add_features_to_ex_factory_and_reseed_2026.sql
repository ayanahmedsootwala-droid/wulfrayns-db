
-- Add features column if not exists
ALTER TABLE rpm_ex_factory_prices
  ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS engine_cc integer,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS color_options text;

-- Soft-delete all old entries
UPDATE rpm_ex_factory_prices SET is_active = false;

-- Re-seed 2026 ex-factory prices with features
INSERT INTO rpm_ex_factory_prices (brand, model, variant, year, ex_factory, on_road, currency, source, notes, features, fuel_type, engine_cc, transmission, body_type, is_active, sort_order) VALUES
-- Toyota
('Toyota','Corolla','1.6 GLi',2026,5099000,5500000,'PKR','Toyota Pakistan','Entry level automatic',ARRAY['1.6L Petrol','Dual Airbags','Keyless Entry'],'Petrol',1600,'Automatic','Sedan',true,10),
('Toyota','Corolla','1.6 XLi',2026,4849000,5250000,'PKR','Toyota Pakistan','Manual variant',ARRAY['1.6L Petrol','Airbags','Fabric Seats'],'Petrol',1600,'Manual','Sedan',true,11),
('Toyota','Corolla','2.0 Altis X',2026,6799000,7350000,'PKR','Toyota Pakistan','Top spec, leather seats',ARRAY['2.0L Petrol','Leather Seats','Sunroof','Android Auto','Apple CarPlay','LED Headlights','7 Airbags'],'Petrol',1998,'CVT','Sedan',true,12),
('Toyota','Corolla','2.0 Altis Grande CVT',2026,7399000,8000000,'PKR','Toyota Pakistan','Flagship Grande',ARRAY['2.0L Petrol','Sunroof','Leather','Blind Spot Monitor','Lane Assist','HUD'],'Petrol',1998,'CVT','Sedan',true,13),
('Toyota','Yaris','1.3 GLi CVT',2026,4299000,4650000,'PKR','Toyota Pakistan','',ARRAY['1.3L Petrol','7" Display','Rear Camera'],'Petrol',1299,'CVT','Sedan',true,14),
('Toyota','Yaris','1.5 ATIV X CVT',2026,4899000,5300000,'PKR','Toyota Pakistan','Top Yaris',ARRAY['1.5L Petrol','Alloy Wheels','Push Start','8 Airbags','Lane Departure Warning'],'Petrol',1496,'CVT','Sedan',true,15),
('Toyota','Fortuner','2.7 VVTi',2026,12999000,14000000,'PKR','Toyota Pakistan','',ARRAY['2.7L Petrol','7-Seater','4WD','Leather'],'Petrol',2694,'Automatic','SUV',true,16),
('Toyota','Fortuner','2.8 Sigma 4',2026,16999000,18500000,'PKR','Toyota Pakistan','Top diesel SUV',ARRAY['2.8L Diesel','4WD','Sunroof','360-Camera','JBL Audio','Premium Leather'],'Diesel',2755,'Automatic','SUV',true,17),
('Toyota','Hilux','Revo G',2026,10999000,12000000,'PKR','Toyota Pakistan','',ARRAY['2.8L Diesel','4WD','Double Cabin','Leather'],'Diesel',2755,'Automatic','Pickup',true,18),
-- Honda
('Honda','Civic','1.5 Turbo Oriel',2026,7299000,7900000,'PKR','Honda Atlas','',ARRAY['1.5L Turbo','Lane Watch','Honda Sensing','Apple CarPlay','LED Headlights'],'Petrol',1498,'CVT','Sedan',true,20),
('Honda','Civic','1.5 Turbo RS',2026,8199000,8900000,'PKR','Honda Atlas','Top spec RS',ARRAY['1.5L Turbo','Sport Seats','Honda Sensing','Sunroof','Wireless Charging','9" Display'],'Petrol',1498,'CVT','Sedan',true,21),
('Honda','City','1.2 CVT Aspire',2026,4299000,4650000,'PKR','Honda Atlas','',ARRAY['1.2L Petrol','CVT','Rear Camera','Touchscreen'],'Petrol',1199,'CVT','Sedan',true,22),
('Honda','City','1.5 RS',2026,5199000,5600000,'PKR','Honda Atlas','Top City',ARRAY['1.5L Petrol','Sport Bumper','LED DRL','LaneWatch','Lane Keeping Assist'],'Petrol',1496,'CVT','Sedan',true,23),
('Honda','BR-V','1.5 S CVT',2026,5999000,6500000,'PKR','Honda Atlas','7-seat crossover',ARRAY['1.5L Petrol','7-Seater','CVT','Rear Camera','Cruise Control'],'Petrol',1496,'CVT','Crossover',true,24),
('Honda','HR-V','1.8 i-VTEC',2026,8799000,9500000,'PKR','Honda Atlas','Sporty crossover',ARRAY['1.8L Petrol','Magic Seats','Sunroof','Lane Watch','LED'],'Petrol',1799,'CVT','Crossover',true,25),
-- Suzuki
('Suzuki','Alto','660cc VXL AGS',2026,2549000,2750000,'PKR','Pak Suzuki','',ARRAY['660cc Petrol','Auto Gear Shift','Idle Stop','Rear Camera'],'Petrol',660,'AGS','Hatchback',true,30),
('Suzuki','Alto','660cc VXR',2026,2299000,2500000,'PKR','Pak Suzuki','Manual entry',ARRAY['660cc Petrol','Manual','Digital Cluster'],'Petrol',660,'Manual','Hatchback',true,31),
('Suzuki','Swift','1.3 GLX CVT',2026,3799000,4100000,'PKR','Pak Suzuki','',ARRAY['1.3L Petrol','CVT','Alloy Wheels','LED DRL','Push Start'],'Petrol',1328,'CVT','Hatchback',true,32),
('Suzuki','Cultus','1.0 VXL AGS',2026,3099000,3350000,'PKR','Pak Suzuki','',ARRAY['1.0L Petrol','AGS','Rear Camera','Alloy Wheels'],'Petrol',998,'AGS','Hatchback',true,33),
('Suzuki','Fronx','1.5 Sigma',2026,5499000,5950000,'PKR','Pak Suzuki','New crossover 2025',ARRAY['1.5L Hybrid','Alloy Wheels','Sunroof','6 Airbags','Wireless Charging'],'Mild Hybrid',1462,'Automatic','Crossover',true,34),
('Suzuki','Jimny','1.5 4WD',2026,7999000,8600000,'PKR','Pak Suzuki','Iconic off-roader',ARRAY['1.5L Petrol','4WD','Alloy Wheels','Apple CarPlay','Lane Departure'],'Petrol',1462,'Automatic','SUV',true,35),
-- Kia
('Kia','Sportage','2.0 FWD Alpha',2026,8599000,9300000,'PKR','Kia Lucky','',ARRAY['2.0L Petrol','FWD','Panoramic Sunroof','10.25" Display','ADAS'],'Petrol',1999,'Automatic','SUV',true,40),
('Kia','Sportage','2.0 AWD Alpha',2026,9999000,10800000,'PKR','Kia Lucky','AWD top spec',ARRAY['2.0L Petrol','AWD','Panoramic Sunroof','Bose Audio','360-Camera','ADAS'],'Petrol',1999,'Automatic','SUV',true,41),
('Kia','Stonic','1.4 EX',2026,5999000,6500000,'PKR','Kia Lucky','Urban crossover',ARRAY['1.4L Petrol','Wireless Charging','Alloy Wheels','Rear Camera','6 Airbags'],'Petrol',1368,'Automatic','Crossover',true,42),
('Kia','K8','3.5 V6',2026,24999000,27000000,'PKR','Kia Lucky','Full-size luxury sedan',ARRAY['3.5L V6','Massage Seats','Bose Surround','HUD','Highway Driving Assist 2'],'Petrol',3470,'Automatic','Sedan',true,43),
-- Hyundai
('Hyundai','Elantra','2.0 GLS',2026,7299000,7900000,'PKR','Hyundai Nishat','',ARRAY['2.0L Petrol','10.25" Display','Sunroof','Wireless Charging','6 Airbags'],'Petrol',1999,'Automatic','Sedan',true,50),
('Hyundai','Tucson','2.0 AWD Ultimate',2026,11999000,12900000,'PKR','Hyundai Nishat','Top AWD spec',ARRAY['2.0L Petrol','AWD','Panoramic Sunroof','Ventilated Seats','BLIS','360-Camera'],'Petrol',1999,'Automatic','SUV',true,51),
('Hyundai','Sonata','2.5 GLS',2026,13999000,15000000,'PKR','Hyundai Nishat','',ARRAY['2.5L Petrol','Leather','Sunroof','HUD','10.25" Cluster & Display','Wireless Charging'],'Petrol',2497,'Automatic','Sedan',true,52),
-- MG
('MG','HS','1.5T Luxury',2026,8799000,9500000,'PKR','JW Auto Parts','',ARRAY['1.5L Turbo','360-Camera','10" Display','Panoramic Sunroof','6 Airbags'],'Petrol',1499,'Automatic','SUV',true,60),
('MG','HS','1.5T Luxury+ PHEV',2026,12999000,14000000,'PKR','JW Auto Parts','Plug-in Hybrid',ARRAY['1.5L PHEV','60km EV Range','Panoramic Sunroof','Ventilated Seats','Wireless Charging'],'PHEV',1499,'Automatic','SUV',true,61),
('MG','ZS EV','Standard Range',2026,9999000,10800000,'PKR','JW Auto Parts','',ARRAY['320km Range','50kWh Battery','Fast Charge','10.1" Display','6 Airbags'],'Electric',0,'Automatic','SUV',true,62),
('MG','ZS EV','Long Range',2026,12499000,13500000,'PKR','JW Auto Parts','Extended EV',ARRAY['440km Range','70kWh Battery','DC Fast Charge','Panoramic Sunroof','Blind Spot Monitor'],'Electric',0,'Automatic','SUV',true,63),
('MG','5 EV','Luxury',2026,8499000,9200000,'PKR','JW Auto Parts','Electric sedan',ARRAY['400km Range','61kWh Battery','Level 2 Charging','10.1" Display'],'Electric',0,'Automatic','Sedan',true,64),
-- Changan
('Changan','Alsvin','1.5 Comfort CVT',2026,3999000,4300000,'PKR','Master Changan','',ARRAY['1.5L Petrol','CVT','6 Airbags','Rear Camera','Alloy Wheels'],'Petrol',1497,'CVT','Sedan',true,70),
('Changan','Alsvin','1.5 Lumiere CVT',2026,4499000,4850000,'PKR','Master Changan','Top sedan',ARRAY['1.5L Petrol','CVT','Sunroof','LED Headlights','Wireless Charging'],'Petrol',1497,'CVT','Sedan',true,71),
('Changan','Oshan X7','2.0T Comfort',2026,8299000,9000000,'PKR','Master Changan','7-seat SUV',ARRAY['2.0L Turbo','7-Seater','Panoramic Sunroof','360-Camera','8 Airbags'],'Petrol',1997,'Automatic','SUV',true,72),
-- BYD
('BYD','Seal','DM-i Hybrid',2026,13499000,14500000,'PKR','BYD Pakistan','Blade Battery sedan',ARRAY['DM-i Hybrid','100km EV Range','Blade Battery','Rotating Screen','8 Airbags','540°Surround Cam'],'Hybrid',0,'Automatic','Sedan',true,80),
('BYD','Atto 3','Standard',2026,12499000,13500000,'PKR','BYD Pakistan','',ARRAY['420km Range','60kWh Blade Battery','Sunroof','12.8" Rotating Screen','6 Airbags'],'Electric',0,'Automatic','SUV',true,81),
('BYD','Atto 3','Extended',2026,14999000,16200000,'PKR','BYD Pakistan','Long range EV',ARRAY['480km Range','Blade Battery','Ventilated Seats','Wireless Charging','ADAS'],'Electric',0,'Automatic','SUV',true,82),
-- Deepal
('Deepal','S05','Long Range EV',2026,12499000,13500000,'PKR','Changan Pakistan','Best-value EV',ARRAY['530km Range','66kWh Battery','Sunroof','12.3" Display','L2 ADAS','OTA Updates'],'Electric',0,'Automatic','Crossover',true,90),
('Deepal','S07','Extended EV',2026,16999000,18200000,'PKR','Changan Pakistan','Premium SUV',ARRAY['610km Range','80kWh Battery','Panoramic Roof','Massaging Seats','AR HUD','Surround Camera'],'Electric',0,'Automatic','SUV',true,91),
-- Jaecoo
('Jaecoo','J7','1.5T Luxury',2026,8499000,9200000,'PKR','United Motors','',ARRAY['1.5L Turbo','Panoramic Sunroof','10.1" Display','6 Airbags','Wireless Charging'],'Petrol',1499,'DCT','SUV',true,100),
('Jaecoo','J8','2.0T Premium',2026,12999000,14000000,'PKR','United Motors','Flagship Jaecoo',ARRAY['2.0L Turbo','4WD','Panoramic Sunroof','Ventilated Seats','12.3" Display','ADAS Suite'],'Petrol',1997,'Automatic','SUV',true,101),
-- Jetour
('Jetour','X70','1.5T Comfort',2026,7499000,8100000,'PKR','Al-Haj Jetour','7-seat family SUV',ARRAY['1.5L Turbo','7-Seater','Sunroof','10.25" Display','6 Airbags'],'Petrol',1499,'Automatic','SUV',true,110),
('Jetour','X90 Plus','2.0T Premium',2026,11999000,13000000,'PKR','Al-Haj Jetour','Large family SUV',ARRAY['2.0L Turbo','7-Seater','Ventilated Seats','Panoramic Sunroof','360-Camera'],'Petrol',1997,'Automatic','SUV',true,111),
-- GWM / Haval
('GWM','Haval H6','1.5T HEV',2026,10499000,11300000,'PKR','GWM Pakistan','Hybrid SUV',ARRAY['1.5L Hybrid','Panoramic Sunroof','12.3" Display','6 Airbags','ADAS','Wireless Charging'],'Hybrid',1499,'Automatic','SUV',true,120),
('GWM','Haval Jolion','1.5T Lux',2026,7499000,8100000,'PKR','GWM Pakistan','',ARRAY['1.5L Turbo','DCT','Sunroof','10.25" Display','6 Airbags'],'Petrol',1497,'DCT','SUV',true,121),
('GWM','Tank 300','2.0T Off-Road',2026,17999000,19500000,'PKR','GWM Pakistan','Luxury off-roader',ARRAY['2.0L Turbo','4WD','Air Suspension','12.3" Display','Premium Sound','Off-Road Modes'],'Petrol',1997,'Automatic','SUV',true,122);
