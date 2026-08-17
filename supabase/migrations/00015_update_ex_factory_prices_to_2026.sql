
-- Update all 2025 seeded entries to 2026 with updated prices
UPDATE rpm_ex_factory_prices SET year = 2026 WHERE year = 2025 AND source IN ('BYD Pakistan Official','Deepal Pakistan Official','MG Pakistan Official','Jaecoo Pakistan Official','Jetour Pakistan Official','GWM Pakistan Official','GAC Aion Pakistan Official','Changan Pakistan Official','Kia Pakistan Official','Hyundai Nishat Official','Toyota IMC Official');

-- Update BYD 2026 pricing
UPDATE rpm_ex_factory_prices SET ex_factory=8999000,  on_road=9699000  WHERE brand='BYD' AND model='Atto 3'   AND variant='Standard Range';
UPDATE rpm_ex_factory_prices SET ex_factory=9999000,  on_road=10750000 WHERE brand='BYD' AND model='Atto 3'   AND variant='Long Range';
UPDATE rpm_ex_factory_prices SET ex_factory=12499000, on_road=13450000 WHERE brand='BYD' AND model='Seal'     AND variant='Dynamic';
UPDATE rpm_ex_factory_prices SET ex_factory=15999000, on_road=17200000 WHERE brand='BYD' AND model='Seal'     AND variant='Performance';
UPDATE rpm_ex_factory_prices SET ex_factory=10999000, on_road=11850000 WHERE brand='BYD' AND model='Sealion 6' AND variant='DM-i PHEV';
UPDATE rpm_ex_factory_prices SET ex_factory=19499000, on_road=21000000 WHERE brand='BYD' AND model='Han'      AND variant='EV Premium';
UPDATE rpm_ex_factory_prices SET ex_factory=6299000,  on_road=6850000  WHERE brand='BYD' AND model='Dolphin'  AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=20999000, on_road=22600000 WHERE brand='BYD' AND model='Shark 6'  AND variant='PHEV Pickup';

-- Update Deepal 2026
UPDATE rpm_ex_factory_prices SET ex_factory=9999000,  on_road=10750000 WHERE brand='Deepal' AND model='S05' AND variant='Standard Range 340';
UPDATE rpm_ex_factory_prices SET ex_factory=10999000, on_road=11850000 WHERE brand='Deepal' AND model='S05' AND variant='Long Range 430';
UPDATE rpm_ex_factory_prices SET ex_factory=13999000, on_road=15100000 WHERE brand='Deepal' AND model='S07' AND variant='Standard AWD';
UPDATE rpm_ex_factory_prices SET ex_factory=12499000, on_road=13450000 WHERE brand='Deepal' AND model='L07' AND variant='Long Range';

-- Update MG 2026
UPDATE rpm_ex_factory_prices SET ex_factory=4699000, on_road=5050000  WHERE brand='MG' AND model='4 EV'  AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=5199000, on_road=5600000  WHERE brand='MG' AND model='ZS EV' AND variant='Excite';
UPDATE rpm_ex_factory_prices SET ex_factory=6299000, on_road=6800000  WHERE brand='MG' AND model='ZS EV' AND variant='Exclusive Long Range';
UPDATE rpm_ex_factory_prices SET ex_factory=7699000, on_road=8300000  WHERE brand='MG' AND model='HS PHEV' AND variant='Excite';
UPDATE rpm_ex_factory_prices SET ex_factory=4499000, on_road=4850000  WHERE brand='MG' AND model='5 EV'  AND variant='Standard';

-- Update Jaecoo 2026
UPDATE rpm_ex_factory_prices SET ex_factory=5499000, on_road=5950000  WHERE brand='Jaecoo' AND model='J7' AND variant='Comfort';
UPDATE rpm_ex_factory_prices SET ex_factory=6299000, on_road=6800000  WHERE brand='Jaecoo' AND model='J7' AND variant='Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=7699000, on_road=8300000  WHERE brand='Jaecoo' AND model='J7' AND variant='Ultra';
UPDATE rpm_ex_factory_prices SET ex_factory=8999000, on_road=9700000  WHERE brand='Jaecoo' AND model='J8' AND variant='2WD Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=9999000, on_road=10750000 WHERE brand='Jaecoo' AND model='J8' AND variant='PHEV';

-- Update Jetour 2026
UPDATE rpm_ex_factory_prices SET ex_factory=4499000, on_road=4900000  WHERE brand='Jetour' AND model='Dashing' AND variant='Comfort';
UPDATE rpm_ex_factory_prices SET ex_factory=4999000, on_road=5400000  WHERE brand='Jetour' AND model='Dashing' AND variant='Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=5799000, on_road=6300000  WHERE brand='Jetour' AND model='X70 Plus' AND variant='Comfort';
UPDATE rpm_ex_factory_prices SET ex_factory=6299000, on_road=6850000  WHERE brand='Jetour' AND model='X70 Plus' AND variant='Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=7999000, on_road=8650000  WHERE brand='Jetour' AND model='X90 Plus' AND variant='Standard';

-- Update GWM 2026
UPDATE rpm_ex_factory_prices SET ex_factory=5599000, on_road=6050000  WHERE brand='GWM' AND model='Haval Jolion HEV' AND variant='Comfort';
UPDATE rpm_ex_factory_prices SET ex_factory=6299000, on_road=6800000  WHERE brand='GWM' AND model='Haval Jolion HEV' AND variant='Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=8099000, on_road=8750000  WHERE brand='GWM' AND model='Haval H6 HEV' AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=13999000,on_road=15100000 WHERE brand='GWM' AND model='Tank 300 HEV' AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=20999000,on_road=22600000 WHERE brand='GWM' AND model='Tank 500 HEV' AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=4999000, on_road=5400000  WHERE brand='GWM' AND model='ORA 03' AND variant='Standard';

-- Update Kia 2026
UPDATE rpm_ex_factory_prices SET ex_factory=6499000, on_road=7000000  WHERE brand='Kia' AND model='Sportage' AND variant='FWD Alpha';
UPDATE rpm_ex_factory_prices SET ex_factory=8699000, on_road=9400000  WHERE brand='Kia' AND model='Sportage' AND variant='AWD FX';
UPDATE rpm_ex_factory_prices SET ex_factory=3899000, on_road=4250000  WHERE brand='Kia' AND model='Stonic'   AND variant='AT';

-- Update Hyundai 2026
UPDATE rpm_ex_factory_prices SET ex_factory=6599000, on_road=7100000  WHERE brand='Hyundai' AND model='Tucson'  AND variant='FWD GLS';
UPDATE rpm_ex_factory_prices SET ex_factory=8499000, on_road=9150000  WHERE brand='Hyundai' AND model='Tucson'  AND variant='AWD GLSX';
UPDATE rpm_ex_factory_prices SET ex_factory=4999000, on_road=5400000  WHERE brand='Hyundai' AND model='Elantra' AND variant='GLS';

-- Update Toyota 2026
UPDATE rpm_ex_factory_prices SET ex_factory=3149000, on_road=3400000  WHERE brand='Toyota' AND model='Yaris'    AND variant='MT 1.3';
UPDATE rpm_ex_factory_prices SET ex_factory=3799000, on_road=4100000  WHERE brand='Toyota' AND model='Yaris'    AND variant='AT 1.5';
UPDATE rpm_ex_factory_prices SET ex_factory=5999000, on_road=6450000  WHERE brand='Toyota' AND model='Corolla'  AND variant='Altis 1.8';
UPDATE rpm_ex_factory_prices SET ex_factory=14200000,on_road=15350000 WHERE brand='Toyota' AND model='Fortuner' AND variant='2.7 2WD';
UPDATE rpm_ex_factory_prices SET ex_factory=12599000,on_road=13600000 WHERE brand='Toyota' AND model='Hilux'    AND variant='Revo G MT';

-- Update Changan 2026
UPDATE rpm_ex_factory_prices SET ex_factory=2249000, on_road=2450000  WHERE brand='Changan' AND model='Alsvin'      AND variant='Comfort MT';
UPDATE rpm_ex_factory_prices SET ex_factory=2849000, on_road=3100000  WHERE brand='Changan' AND model='Alsvin'      AND variant='Lumiere CVT';
UPDATE rpm_ex_factory_prices SET ex_factory=5799000, on_road=6300000  WHERE brand='Changan' AND model='Oshan X7'    AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=6799000, on_road=7350000  WHERE brand='Changan' AND model='Oshan X7 Plus' AND variant='Luxury';
UPDATE rpm_ex_factory_prices SET ex_factory=4499000, on_road=4900000  WHERE brand='Changan' AND model='Uni-T'       AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=3649000, on_road=3999000  WHERE brand='Changan' AND model='Uni-V'       AND variant='Standard';
UPDATE rpm_ex_factory_prices SET ex_factory=3149000, on_road=3450000  WHERE brand='Changan' AND model='Lumin EV'    AND variant='Standard';

-- Update source labels to indicate 2026
UPDATE rpm_ex_factory_prices SET source = REPLACE(source, 'Official', '2026 Official')
WHERE year = 2026 AND source NOT LIKE '%2026%';
