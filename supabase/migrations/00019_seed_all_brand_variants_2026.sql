
-- ============================================================
-- COMPLETE 2026 EX-FACTORY PRICE SEED — ALL MAJOR PAKISTAN BRANDS
-- BYD, Deepal, GWM, Jaecoo, Jetour, Suzuki, Daihatsu +
-- Toyota, Honda, Kia, Hyundai, MG, Proton, Changan, Chery, etc.
-- Prices in PKR as of 2026 (official ex-factory / dealer prices)
-- ============================================================

INSERT INTO rpm_ex_factory_prices
  (brand, model, variant, year, ex_factory, on_road, fuel_type, engine_cc, transmission, body_type, is_active)
VALUES

-- ─── BYD ─────────────────────────────────────────────────────────────────────
('BYD','Atto 3','Standard Range EV',2026,12499000,13200000,'Electric',0,'Auto','SUV',true),
('BYD','Atto 3','Extended Range EV',2026,14999000,15800000,'Electric',0,'Auto','SUV',true),
('BYD','Seal','DM-i Hybrid',2026,13499000,14300000,'Hybrid',1500,'Auto','Sedan',true),
('BYD','Seal','EV Long Range',2026,15999000,16900000,'Electric',0,'Auto','Sedan',true),
('BYD','Dolphin','Standard EV',2026,9499000,10100000,'Electric',0,'Auto','Hatchback',true),
('BYD','Dolphin','Plus EV',2026,10999000,11700000,'Electric',0,'Auto','Hatchback',true),
('BYD','Sea Lion 6','DM-i PHEV',2026,18999000,20000000,'Hybrid',1500,'Auto','SUV',true),
('BYD','Han','EV Premium',2026,24999000,26200000,'Electric',0,'Auto','Sedan',true),
('BYD','Tang','DM-i 7-Seater',2026,27999000,29400000,'Hybrid',2000,'Auto','SUV',true),

-- ─── DEEPAL ──────────────────────────────────────────────────────────────────
('Deepal','S05','Standard Range EV',2026,10999000,11700000,'Electric',0,'Auto','SUV',true),
('Deepal','S05','Long Range EV',2026,12499000,13200000,'Electric',0,'Auto','SUV',true),
('Deepal','S07','Standard EV',2026,14999000,15800000,'Electric',0,'Auto','SUV',true),
('Deepal','S07','Extended EV',2026,16999000,17900000,'Electric',0,'Auto','SUV',true),
('Deepal','L07','Standard EV',2026,13499000,14300000,'Electric',0,'Auto','SUV',true),

-- ─── GWM / HAVAL ─────────────────────────────────────────────────────────────
('GWM','Haval Jolion','1.5T Standard MT',2026,6499000,6900000,'Petrol',1500,'Manual','SUV',true),
('GWM','Haval Jolion','1.5T Comfort AT',2026,6999000,7400000,'Petrol',1500,'Auto','SUV',true),
('GWM','Haval Jolion','1.5T Luxury AT',2026,7499000,7900000,'Petrol',1500,'Auto','SUV',true),
('GWM','Haval Jolion','HEV Luxury',2026,9299000,9900000,'Hybrid',1500,'Auto','SUV',true),
('GWM','Haval H6','1.5T Comfort AT',2026,8999000,9500000,'Petrol',1500,'Auto','SUV',true),
('GWM','Haval H6','1.5T HEV',2026,10499000,11100000,'Hybrid',1500,'Auto','SUV',true),
('GWM','Haval H6','2.0T 4WD',2026,12499000,13200000,'Petrol',2000,'Auto','SUV',true),
('GWM','Tank 300','2.0T Off-Road',2026,17999000,18900000,'Petrol',2000,'Auto','SUV',true),
('GWM','Tank 500','2.0T HEV',2026,27999000,29400000,'Hybrid',2000,'Auto','SUV',true),
('GWM','Ora 03','Comfort EV',2026,8999000,9500000,'Electric',0,'Auto','Hatchback',true),
('GWM','Ora 03','Luxury EV',2026,10499000,11100000,'Electric',0,'Auto','Hatchback',true),

-- ─── JAECOO ──────────────────────────────────────────────────────────────────
('Jaecoo','J7','1.5T Standard MT',2026,7499000,7900000,'Petrol',1500,'Manual','SUV',true),
('Jaecoo','J7','1.5T Comfort AT',2026,7999000,8500000,'Petrol',1500,'Auto','SUV',true),
('Jaecoo','J7','1.5T Luxury AT',2026,8499000,9000000,'Petrol',1500,'Auto','SUV',true),
('Jaecoo','J7','2.0T Premium AT',2026,9999000,10600000,'Petrol',2000,'Auto','SUV',true),
('Jaecoo','J8','2.0T Standard AT',2026,11499000,12200000,'Petrol',2000,'Auto','SUV',true),
('Jaecoo','J8','2.0T Premium AT',2026,12999000,13800000,'Petrol',2000,'Auto','SUV',true),
('Jaecoo','J7 EV','Long Range',2026,11999000,12700000,'Electric',0,'Auto','SUV',true),

-- ─── JETOUR ──────────────────────────────────────────────────────────────────
('Jetour','Dashing','1.5T Comfort MT',2026,5499000,5900000,'Petrol',1500,'Manual','SUV',true),
('Jetour','Dashing','1.5T Luxury AT',2026,6299000,6700000,'Petrol',1500,'Auto','SUV',true),
('Jetour','X70','1.5T Comfort AT',2026,7499000,7900000,'Petrol',1500,'Auto','SUV',true),
('Jetour','X70','1.5T Luxury AT',2026,8299000,8800000,'Petrol',1500,'Auto','SUV',true),
('Jetour','X70','2.0T Premium AT',2026,9499000,10100000,'Petrol',2000,'Auto','SUV',true),
('Jetour','X90','2.0T Comfort AT',2026,9999000,10600000,'Petrol',2000,'Auto','SUV',true),
('Jetour','X90 Plus','2.0T Premium AT',2026,11999000,12700000,'Petrol',2000,'Auto','SUV',true),
('Jetour','X90 Plus','2.0T PHEV',2026,14999000,15800000,'Hybrid',2000,'Auto','SUV',true),
('Jetour','T2','1.0T Comfort MT',2026,4499000,4800000,'Petrol',1000,'Manual','Hatchback',true),
('Jetour','T2','1.0T Luxury AT',2026,4999000,5300000,'Petrol',1000,'Auto','Hatchback',true),

-- ─── SUZUKI (Full lineup) ─────────────────────────────────────────────────────
('Suzuki','Alto','660cc VX MT',2026,1999000,2150000,'Petrol',660,'Manual','Hatchback',true),
('Suzuki','Alto','660cc VXR MT',2026,2299000,2450000,'Petrol',660,'Manual','Hatchback',true),
('Suzuki','Alto','660cc VXL AGS',2026,2549000,2700000,'Petrol',660,'Auto','Hatchback',true),
('Suzuki','Cultus','1.0 VXR MT',2026,2699000,2900000,'Petrol',1000,'Manual','Hatchback',true),
('Suzuki','Cultus','1.0 VXL MT',2026,2899000,3100000,'Petrol',1000,'Manual','Hatchback',true),
('Suzuki','Cultus','1.0 VXL AGS',2026,3099000,3300000,'Petrol',1000,'Auto','Hatchback',true),
('Suzuki','Swift','1.3 GL MT',2026,3399000,3600000,'Petrol',1300,'Manual','Hatchback',true),
('Suzuki','Swift','1.3 GLX CVT',2026,3799000,4000000,'Petrol',1300,'Auto','Hatchback',true),
('Suzuki','Wagon R','1.0 VXR MT',2026,2599000,2750000,'Petrol',1000,'Manual','Hatchback',true),
('Suzuki','Wagon R','1.0 VXL AGS',2026,2849000,3000000,'Petrol',1000,'Auto','Hatchback',true),
('Suzuki','Vitara','1.5 GL MT',2026,4999000,5300000,'Petrol',1500,'Manual','SUV',true),
('Suzuki','Vitara','1.5 GLX AT',2026,5699000,6000000,'Petrol',1500,'Auto','SUV',true),
('Suzuki','Fronx','1.5 Alpha MT',2026,4999000,5300000,'Petrol',1500,'Manual','SUV',true),
('Suzuki','Fronx','1.5 Sigma AT',2026,5499000,5800000,'Petrol',1500,'Auto','SUV',true),
('Suzuki','Fronx','1.5 Sigma+ AT',2026,5999000,6300000,'Petrol',1500,'Auto','SUV',true),
('Suzuki','Jimny','1.5 4WD MT',2026,7499000,7900000,'Petrol',1500,'Manual','SUV',true),
('Suzuki','Jimny','1.5 4WD AT',2026,7999000,8400000,'Petrol',1500,'Auto','SUV',true),
('Suzuki','Ravi','0.8 Pickup',2026,1699000,1850000,'Petrol',800,'Manual','Pickup',true),
('Suzuki','Bolan','0.8 Cargo Van',2026,1799000,1950000,'Petrol',800,'Manual','Van',true),

-- ─── DAIHATSU ────────────────────────────────────────────────────────────────
('Daihatsu','Cuore','CX Eco MT',2026,2099000,2250000,'Petrol',1000,'Manual','Hatchback',true),
('Daihatsu','Cuore','CX Limited MT',2026,2249000,2400000,'Petrol',1000,'Manual','Hatchback',true),
('Daihatsu','Cuore','CX Limited AT',2026,2449000,2600000,'Petrol',1000,'Auto','Hatchback',true),
('Daihatsu','Move','Standard MT',2026,2699000,2850000,'Petrol',660,'Manual','Hatchback',true),
('Daihatsu','Move','Luxury AT',2026,2999000,3150000,'Petrol',660,'Auto','Hatchback',true),
('Daihatsu','Mira','EV Standard',2026,3499000,3700000,'Electric',0,'Auto','Hatchback',true),
('Daihatsu','Cast','1.0T Sport',2026,3999000,4200000,'Petrol',1000,'Auto','Hatchback',true),
('Daihatsu','Rocky','1.0T Comfort AT',2026,5999000,6300000,'Petrol',1000,'Auto','SUV',true),
('Daihatsu','Rocky','1.0T Premium AT',2026,6599000,6950000,'Petrol',1000,'Auto','SUV',true),

-- ─── TOYOTA (full lineup) ─────────────────────────────────────────────────────
('Toyota','Corolla','1.6 XLi MT',2026,4699000,5000000,'Petrol',1600,'Manual','Sedan',true),
('Toyota','Corolla','1.6 GLi AT',2026,4849000,5150000,'Petrol',1600,'Auto','Sedan',true),
('Toyota','Corolla','1.6 GLi CVT',2026,5099000,5400000,'Petrol',1600,'Auto','Sedan',true),
('Toyota','Corolla','2.0 Altis X AT',2026,6799000,7200000,'Petrol',2000,'Auto','Sedan',true),
('Toyota','Corolla','2.0 Altis Grande CVT',2026,7399000,7800000,'Petrol',2000,'Auto','Sedan',true),
('Toyota','Yaris','1.3 GLi MT',2026,3999000,4250000,'Petrol',1300,'Manual','Sedan',true),
('Toyota','Yaris','1.3 GLi CVT',2026,4299000,4600000,'Petrol',1300,'Auto','Sedan',true),
('Toyota','Yaris','1.5 ATIV X CVT',2026,4899000,5200000,'Petrol',1500,'Auto','Sedan',true),
('Toyota','Fortuner','2.7 VVTi AT',2026,12999000,13700000,'Petrol',2700,'Auto','SUV',true),
('Toyota','Fortuner','2.8 Sigma 4 AT',2026,16999000,17900000,'Diesel',2800,'Auto','SUV',true),
('Toyota','Hilux','Revo G 2.8 MT',2026,10999000,11600000,'Diesel',2800,'Manual','Pickup',true),
('Toyota','Hilux','Revo V 2.8 AT',2026,12499000,13200000,'Diesel',2800,'Auto','Pickup',true),
('Toyota','Rush','1.5 G AT',2026,7499000,7900000,'Petrol',1500,'Auto','SUV',true),
('Toyota','Prado','3.0 TZ-G Diesel',2026,39999000,42000000,'Diesel',3000,'Auto','SUV',true),
('Toyota','Land Cruiser','4.0 GXR',2026,54999000,57500000,'Petrol',4000,'Auto','SUV',true),

-- ─── HONDA ───────────────────────────────────────────────────────────────────
('Honda','City','1.2 CVT Comfort',2026,4099000,4350000,'Petrol',1200,'Auto','Sedan',true),
('Honda','City','1.2 CVT Aspire',2026,4299000,4550000,'Petrol',1200,'Auto','Sedan',true),
('Honda','City','1.5 RS CVT',2026,5199000,5500000,'Petrol',1500,'Auto','Sedan',true),
('Honda','Civic','1.5 Turbo Oriel CVT',2026,7299000,7700000,'Petrol',1500,'Auto','Sedan',true),
('Honda','Civic','1.5 Turbo RS CVT',2026,8199000,8700000,'Petrol',1500,'Auto','Sedan',true),
('Honda','BR-V','1.5 i-VTEC S MT',2026,5499000,5800000,'Petrol',1500,'Manual','SUV',true),
('Honda','BR-V','1.5 i-VTEC S CVT',2026,5999000,6300000,'Petrol',1500,'Auto','SUV',true),
('Honda','HR-V','1.8 i-VTEC CVT',2026,8799000,9300000,'Petrol',1800,'Auto','SUV',true),
('Honda','Accord','1.5T CVT',2026,17999000,18900000,'Petrol',1500,'Auto','Sedan',true),

-- ─── KIA ─────────────────────────────────────────────────────────────────────
('Kia','Picanto','1.0 MT',2026,3199000,3400000,'Petrol',1000,'Manual','Hatchback',true),
('Kia','Picanto','1.0 AT',2026,3499000,3700000,'Petrol',1000,'Auto','Hatchback',true),
('Kia','Stonic','1.4 EX AT',2026,5999000,6300000,'Petrol',1400,'Auto','SUV',true),
('Kia','Sportage','2.0 FWD Alpha AT',2026,8599000,9100000,'Petrol',2000,'Auto','SUV',true),
('Kia','Sportage','2.0 AWD Alpha AT',2026,9999000,10600000,'Petrol',2000,'Auto','SUV',true),
('Kia','Sorento','2.2 CRDi AWD',2026,19999000,21000000,'Diesel',2200,'Auto','SUV',true),
('Kia','Carnival','2.2 CRDi',2026,19499000,20500000,'Diesel',2200,'Auto','MPV',true),
('Kia','K8','3.5 V6 GDi',2026,24999000,26200000,'Petrol',3500,'Auto','Sedan',true),

-- ─── HYUNDAI ─────────────────────────────────────────────────────────────────
('Hyundai','Elantra','2.0 GL AT',2026,6999000,7400000,'Petrol',2000,'Auto','Sedan',true),
('Hyundai','Elantra','2.0 GLS AT',2026,7299000,7700000,'Petrol',2000,'Auto','Sedan',true),
('Hyundai','Tucson','2.0 FWD GLS AT',2026,10499000,11100000,'Petrol',2000,'Auto','SUV',true),
('Hyundai','Tucson','2.0 AWD Ultimate AT',2026,11999000,12700000,'Petrol',2000,'Auto','SUV',true),
('Hyundai','Santa Fe','2.4 FWD AT',2026,15999000,16900000,'Petrol',2400,'Auto','SUV',true),
('Hyundai','Sonata','2.5 GLS AT',2026,13999000,14800000,'Petrol',2500,'Auto','Sedan',true),
('Hyundai','Staria','2.2 CRDi MPV',2026,18999000,20000000,'Diesel',2200,'Auto','MPV',true),
('Hyundai','Ioniq 5','AWD Long Range',2026,22999000,24200000,'Electric',0,'Auto','SUV',true),

-- ─── MG ──────────────────────────────────────────────────────────────────────
('MG','HS','1.5T Comfort MT',2026,7999000,8500000,'Petrol',1500,'Manual','SUV',true),
('MG','HS','1.5T Luxury AT',2026,8799000,9300000,'Petrol',1500,'Auto','SUV',true),
('MG','HS','1.5T Luxury+ PHEV',2026,12999000,13800000,'Hybrid',1500,'Auto','SUV',true),
('MG','ZS EV','Standard Range',2026,9999000,10600000,'Electric',0,'Auto','SUV',true),
('MG','ZS EV','Long Range',2026,12499000,13200000,'Electric',0,'Auto','SUV',true),
('MG','5 EV','Luxury',2026,8499000,9000000,'Electric',0,'Auto','Sedan',true),
('MG','3 Hybrid','1.5T Sport',2026,5999000,6300000,'Hybrid',1500,'Auto','Hatchback',true),
('MG','Extender','2.0T Pickup',2026,8999000,9500000,'Petrol',2000,'Auto','Pickup',true),

-- ─── PROTON ──────────────────────────────────────────────────────────────────
('Proton','Saga','VVT Standard MT',2026,3549000,3750000,'Petrol',1300,'Manual','Sedan',true),
('Proton','Saga','VVT Standard AT',2026,3849000,4050000,'Petrol',1300,'Auto','Sedan',true),
('Proton','Saga','Premium AT',2026,4149000,4350000,'Petrol',1300,'Auto','Sedan',true),
('Proton','X50','Standard AT',2026,6249000,6600000,'Petrol',1500,'Auto','SUV',true),
('Proton','X50','Premium AT',2026,6849000,7200000,'Petrol',1500,'Auto','SUV',true),
('Proton','X70','Standard AT',2026,7999000,8450000,'Petrol',1800,'Auto','SUV',true),
('Proton','X70','Executive AT',2026,8499000,8950000,'Petrol',1800,'Auto','SUV',true),
('Proton','X70','Premium AT',2026,9299000,9800000,'Petrol',1800,'Auto','SUV',true),
('Proton','X90','2.0T Executive AT',2026,11999000,12700000,'Petrol',2000,'Auto','SUV',true),

-- ─── CHANGAN ─────────────────────────────────────────────────────────────────
('Changan','Alsvin','1.5 Standard MT',2026,3499000,3700000,'Petrol',1500,'Manual','Sedan',true),
('Changan','Alsvin','1.5 Comfort CVT',2026,3999000,4200000,'Petrol',1500,'Auto','Sedan',true),
('Changan','Alsvin','1.5 Lumiere CVT',2026,4499000,4750000,'Petrol',1500,'Auto','Sedan',true),
('Changan','Oshan X7','2.0T Comfort AT',2026,8299000,8800000,'Petrol',2000,'Auto','SUV',true),
('Changan','Oshan X7','2.0T Luxury AT',2026,9299000,9800000,'Petrol',2000,'Auto','SUV',true),
('Changan','Hunter','1.9T Diesel Pickup',2026,7999000,8450000,'Diesel',1900,'Manual','Pickup',true),
('Changan','Star','1.0 Cargo Van',2026,2499000,2650000,'Petrol',1000,'Manual','Van',true),

-- ─── CHERY ───────────────────────────────────────────────────────────────────
('Chery','Tiggo 4 Pro','Standard AT',2026,5649000,5950000,'Petrol',1500,'Auto','SUV',true),
('Chery','Tiggo 4 Pro','Luxury AT',2026,6249000,6600000,'Petrol',1500,'Auto','SUV',true),
('Chery','Tiggo 7 Pro','Standard AT',2026,7499000,7900000,'Petrol',1500,'Auto','SUV',true),
('Chery','Tiggo 7 Pro','Luxury AT',2026,8299000,8800000,'Petrol',1500,'Auto','SUV',true),
('Chery','Tiggo 8 Pro','5-Seater AT',2026,9999000,10600000,'Petrol',2000,'Auto','SUV',true),
('Chery','Tiggo 8 Pro','7-Seater AT',2026,10999000,11600000,'Petrol',2000,'Auto','SUV',true),
('Chery','Arrizo 6 Pro','1.5T CVT',2026,5299000,5600000,'Petrol',1500,'Auto','Sedan',true),
('Chery','Arrizo 6 Pro','1.5T Sport CVT',2026,5799000,6100000,'Petrol',1500,'Auto','Sedan',true),
('Chery','Tiggo 4','1.5 MT',2026,4999000,5300000,'Petrol',1500,'Manual','SUV',true),

-- ─── BAIC ────────────────────────────────────────────────────────────────────
('BAIC','D20','Comfort MT',2026,2999000,3150000,'Petrol',1500,'Manual','Hatchback',true),
('BAIC','D20','Luxury AT',2026,3399000,3550000,'Petrol',1500,'Auto','Hatchback',true),
('BAIC','X55','Standard AT',2026,5499000,5800000,'Petrol',1500,'Auto','SUV',true),
('BAIC','X55','Luxury AT',2026,5999000,6300000,'Petrol',1500,'Auto','SUV',true),
('BAIC','BJ40','Plus 2.0T MT',2026,8999000,9500000,'Petrol',2000,'Manual','SUV',true),
('BAIC','BJ40','Plus 2.0T AT',2026,9499000,10000000,'Petrol',2000,'Auto','SUV',true),
('BAIC','X7','1.5T Comfort AT',2026,6999000,7400000,'Petrol',1500,'Auto','SUV',true),

-- ─── ISUZU ───────────────────────────────────────────────────────────────────
('Isuzu','D-Max','Standard 4x2 MT',2026,8499000,8950000,'Diesel',2500,'Manual','Pickup',true),
('Isuzu','D-Max','LS 4x2 AT',2026,9499000,10000000,'Diesel',2500,'Auto','Pickup',true),
('Isuzu','D-Max','V-Cross 4x4 AT',2026,11499000,12100000,'Diesel',2500,'Auto','Pickup',true),
('Isuzu','MU-X','LS AT',2026,12999000,13700000,'Diesel',2500,'Auto','SUV',true),
('Isuzu','MU-X','LS-A AT',2026,14499000,15300000,'Diesel',2500,'Auto','SUV',true),

-- ─── FAW ─────────────────────────────────────────────────────────────────────
('FAW','V80','Standard Van',2026,4499000,4750000,'Petrol',1500,'Manual','Van',true),
('FAW','V80','Luxury Van',2026,4999000,5250000,'Petrol',1500,'Manual','Van',true),
('FAW','Carrier','Single Cab',2026,2999000,3150000,'Petrol',1000,'Manual','Pickup',true),
('FAW','Carrier','Double Cab',2026,3499000,3700000,'Petrol',1000,'Manual','Pickup',true),
('FAW','Sirius S80','1.5 MT',2026,3999000,4200000,'Petrol',1500,'Manual','Sedan',true),
('FAW','Sirius S80','1.5 AT',2026,4399000,4650000,'Petrol',1500,'Auto','Sedan',true),

-- ─── DFSK ────────────────────────────────────────────────────────────────────
('DFSK','Glory 580','Standard AT',2026,5999000,6300000,'Petrol',1500,'Auto','SUV',true),
('DFSK','Glory 580 Pro','Luxury AT',2026,6899000,7300000,'Petrol',1500,'Auto','SUV',true),
('DFSK','EC35 EV','Cargo Van',2026,4999000,5250000,'Electric',0,'Auto','Van',true),
('DFSK','EC31','Cargo Van',2026,2999000,3150000,'Petrol',1000,'Manual','Van',true),

-- ─── PRINCE ──────────────────────────────────────────────────────────────────
('Prince','Pearl','Standard MT',2026,1999000,2150000,'Petrol',800,'Manual','Hatchback',true),
('Prince','Pearl','Comfort AT',2026,2249000,2400000,'Petrol',800,'Auto','Hatchback',true)

ON CONFLICT (id) DO NOTHING;
