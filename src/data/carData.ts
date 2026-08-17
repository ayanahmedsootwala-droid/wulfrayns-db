// Comprehensive Pakistan market car data: Make → Model → Variant → Features
export interface VariantInfo {
  name: string;
  features: string[];
}

export interface ModelInfo {
  name: string;
  variants: VariantInfo[];
}

export interface MakeInfo {
  name: string;
  models: ModelInfo[];
}

export const CAR_DATA: MakeInfo[] = [
  {
    name: 'Toyota',
    models: [
      {
        name: 'Corolla',
        variants: [
          { name: 'Altis X 1.6 MT', features: ['1.6L Engine', 'Manual Transmission', 'Power Steering', 'ABS', 'Dual Airbags', 'Alloy Wheels', 'Keyless Entry'] },
          { name: 'Altis X 1.6 CVT', features: ['1.6L Engine', 'CVT Auto', 'Push Start', 'Leather Seats', 'Rear Camera', 'Cruise Control', 'Dual Airbags'] },
          { name: 'Altis Grande 1.8 CVT', features: ['1.8L Engine', 'CVT Auto', 'Push Start', 'Leather Seats', 'HID Headlights', 'Sunroof', '6 Airbags', 'Rear Camera', 'Paddle Shifters'] },
          { name: 'X 1.6 SR', features: ['1.6L Engine', 'SR Package', 'Sport Grille', 'Alloy Wheels', 'Rear Spoiler', 'ABS', 'Dual Airbags'] },
          { name: 'X COROLLA SE', features: ['1.6L Engine', 'SE Trim', 'LED DRLs', 'Fog Lamps', 'Touch Screen', 'Rear Camera', 'Push Start', 'Lane Assist'] },
        ],
      },
      {
        name: 'Yaris',
        variants: [
          { name: 'GLI MT', features: ['1.3L Engine', 'Manual', 'Power Steering', 'ABS', 'Dual Airbags', 'Alloy Wheels'] },
          { name: 'GLI CVT', features: ['1.3L Engine', 'CVT Auto', 'Push Start', 'Rear Camera', 'ABS', 'Alloy Wheels'] },
          { name: 'ATIV MT', features: ['1.3L Engine', 'Manual', 'Trunk Spoiler', 'Rear Wiper', 'Power Windows', 'ABS'] },
          { name: 'ATIV CVT', features: ['1.3L Engine', 'CVT Auto', 'Leather Seats', 'Push Start', 'Rear Camera', '4 Airbags', 'ESC'] },
          { name: 'ATIV X CVT', features: ['1.5L Engine', 'CVT Auto', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'Blind Spot Monitor', 'Lane Departure Warning'] },
        ],
      },
      {
        name: 'Fortuner',
        variants: [
          { name: '2.7 VVTi MT', features: ['2.7L Petrol', 'Manual', 'Hill Start Assist', '7 Seats', 'Rear AC', '4WD', 'ABS', 'Dual Airbags'] },
          { name: '2.7 VVTi AT', features: ['2.7L Petrol', 'Auto', '7 Seats', 'Rear AC', '4WD', 'Push Start', 'Rear Camera', 'Leather Seats'] },
          { name: '2.8 Sigma 4 AT', features: ['2.8L Diesel', 'Auto', '7 Seats', 'Sunroof', 'Leather Seats', '4WD', 'Terrain Select', '7 Airbags', 'JBL Audio', 'Ventilated Seats'] },
          { name: 'GR Sport', features: ['2.8L Diesel', 'Auto', 'GR Bodykit', 'Red Accents', '7 Seats', '4WD', 'Sunroof', 'JBL Premium Audio', '10 Airbags', 'BSM'] },
        ],
      },
      {
        name: 'Hilux Revo',
        variants: [
          { name: 'Single Cab', features: ['2.8L Diesel', 'Manual', '4WD', 'Payload 1000kg', 'ABS', 'Dual Airbags'] },
          { name: 'Double Cab G MT', features: ['2.8L Diesel', 'Manual', '4WD', 'Rear Camera', 'Leather Seats', 'Alloy Wheels'] },
          { name: 'Double Cab V AT', features: ['2.8L Diesel', 'Auto', '4WD', 'Sunroof', 'Leather Seats', 'JBL Audio', 'Terrain Select', 'Crawl Control'] },
        ],
      },
      {
        name: 'Prado',
        variants: [
          { name: 'TX 2.7L', features: ['2.7L Petrol', 'Auto', '7 Seats', 'Roof Rails', 'Rear AC', 'ABS', 'Dual Airbags', 'Rear Camera'] },
          { name: 'VX 3.0D', features: ['3.0L Diesel', 'Auto', 'Leather Seats', 'Sunroof', '8 Airbags', 'Multi-Terrain Select', 'Crawl Control', 'Rear Entertainment'] },
          { name: 'GX 2.7L', features: ['2.7L Petrol', 'Manual', '7 Seats', '4WD', 'Basic Trim', 'ABS', 'Dual Airbags'] },
        ],
      },
      {
        name: 'Land Cruiser',
        variants: [
          { name: 'ZX 4.5D V8', features: ['4.5L V8 Diesel', 'Auto', 'Full Leather', 'Sunroof', '8 Airbags', 'KDSS', 'Mark Levinson Audio', 'Night Vision Camera', 'Ventilated Seats', 'Heads-Up Display'] },
          { name: 'GXR 4.5D V8', features: ['4.5L V8 Diesel', 'Auto', 'Leather Seats', 'Multi-Terrain Select', '8 Airbags', 'Rear Entertainment', 'Parking Assist'] },
          { name: 'VXR V8', features: ['4.5L V8 Diesel', 'Auto', 'Full Leather', '10 Airbags', 'KDSS', 'Sunroof', 'Advanced Safety Pack'] },
        ],
      },
      {
        name: 'Camry',
        variants: [
          { name: '2.5 Grande', features: ['2.5L Petrol', 'Auto', 'Leather Seats', 'Sunroof', '6 Airbags', 'JBL Audio', 'Heads-Up Display', 'Radar Cruise Control'] },
          { name: '2.5 Hybrid', features: ['2.5L Hybrid', 'E-CVT', 'Leather Seats', 'Sunroof', '9 Airbags', 'HUD', 'TSS Safety Pack', 'Ventilated Seats'] },
        ],
      },
      {
        name: 'Raize',
        variants: [
          { name: '1.0T CVT', features: ['1.0L Turbo', 'CVT Auto', 'Push Start', 'Rear Camera', 'Touchscreen', '2 Airbags', 'ABS', 'Toyota Safety Sense'] },
          { name: 'Z 1.0T CVT', features: ['1.0L Turbo', 'CVT Auto', 'Panoramic Roof', 'Leather Seats', '4 Airbags', 'BSM', 'RCTA', 'Wireless Charging'] },
        ],
      },
    ],
  },
  {
    name: 'Honda',
    models: [
      {
        name: 'Civic',
        variants: [
          { name: 'Oriel 1.5T CVT', features: ['1.5L Turbo', 'CVT Auto', 'Leather Seats', 'Push Start', 'Rear Camera', 'Honda Sensing', '6 Airbags', 'Sunroof'] },
          { name: 'RS 1.5T CVT', features: ['1.5L Turbo', 'CVT Auto', 'RS Bodykit', 'Red Brakes', 'Sport Seats', 'Sunroof', 'Honda Sensing', '8 Airbags'] },
          { name: 'VTi Oriel 1.8 CVT', features: ['1.8L Engine', 'CVT Auto', 'Leather Seats', 'Sunroof', '6 Airbags', 'Rear Camera', 'Honda Sensing'] },
          { name: 'VTi 1.8 MT', features: ['1.8L Engine', 'Manual', 'Alloy Wheels', 'Rear Spoiler', 'Dual Airbags', 'ABS'] },
          { name: 'e:HEV RS', features: ['2.0L Hybrid', 'Auto', 'Full Leather', 'Sunroof', '10 Airbags', 'Honda Sensing 360', 'HUD', 'Premium Audio'] },
        ],
      },
      {
        name: 'City',
        variants: [
          { name: 'Aspire MT', features: ['1.2L Engine', 'Manual', 'Power Windows', 'ABS', 'Dual Airbags', 'Alloy Wheels'] },
          { name: 'Aspire CVT', features: ['1.2L Engine', 'CVT Auto', 'Push Start', 'Rear Camera', 'Touchscreen', '4 Airbags'] },
          { name: '1.5S CVT', features: ['1.5L Engine', 'CVT Auto', 'Leather Seats', 'Push Start', 'Rear Camera', '6 Airbags', 'LaneWatch'] },
          { name: '1.5 RS CVT', features: ['1.5L Engine', 'CVT Auto', 'RS Sportkit', 'Sunroof', 'Leather Seats', 'Honda Sensing', '6 Airbags'] },
          { name: 'e:HEV', features: ['1.5L Hybrid', 'Auto', 'Leather Seats', 'Sunroof', '6 Airbags', 'Honda Sensing', 'Wireless Charging'] },
        ],
      },
      {
        name: 'HR-V',
        variants: [
          { name: '1.8 S MT', features: ['1.8L Engine', 'Manual', 'ABS', 'Dual Airbags', 'Touchscreen', 'Rear Camera'] },
          { name: '1.8 S CVT', features: ['1.8L Engine', 'CVT Auto', 'Push Start', 'Leather Seats', 'Rear Camera', '4 Airbags'] },
          { name: '1.8 EL CVT', features: ['1.8L Engine', 'CVT Auto', 'Sunroof', 'Leather Seats', 'Honda Sensing', '6 Airbags', 'Wireless Charging'] },
          { name: 'RS e:HEV', features: ['1.5L Hybrid', 'Auto', 'RS Bodykit', 'Sunroof', 'Honda Sensing', '6 Airbags', 'Premium Audio'] },
        ],
      },
      {
        name: 'BR-V',
        variants: [
          { name: 'S MT', features: ['1.5L Engine', 'Manual', '7 Seats', 'ABS', 'Dual Airbags', 'Rear AC Vents'] },
          { name: 'S CVT', features: ['1.5L Engine', 'CVT Auto', '7 Seats', 'Push Start', 'Rear Camera', '4 Airbags'] },
          { name: 'V CVT Sensing', features: ['1.5L Engine', 'CVT Auto', '7 Seats', 'Honda Sensing', 'Leather Seats', 'Sunroof', '6 Airbags'] },
        ],
      },
      {
        name: 'Accord',
        variants: [
          { name: '2.4 i-VTEC', features: ['2.4L Engine', 'Auto', 'Leather Seats', 'Sunroof', '6 Airbags', 'Rear Camera', 'Cruise Control'] },
          { name: 'Sport Hybrid', features: ['2.0L Hybrid', 'Auto', 'Leather Seats', 'Sunroof', '8 Airbags', 'Honda Sensing', 'Ventilated Seats'] },
        ],
      },
    ],
  },
  {
    name: 'Suzuki',
    models: [
      {
        name: 'Alto',
        variants: [
          { name: 'VX MT', features: ['660cc Engine', 'Manual', 'Power Steering', 'Radio', 'ABS (Optional)'] },
          { name: 'VX AGS', features: ['660cc Engine', 'AGS Auto', 'Power Windows', 'ABS', 'Airbag'] },
          { name: 'VXR MT', features: ['660cc Engine', 'Manual', 'Alloy Wheels', 'Rear Spoiler', 'ABS', 'Driver Airbag'] },
          { name: 'VXR AGS', features: ['660cc Engine', 'AGS Auto', 'Alloy Wheels', 'Rear Spoiler', 'ABS', 'Dual Airbags'] },
          { name: 'VXL AGS', features: ['660cc Engine', 'AGS Auto', 'Full Alloys', 'Touchscreen', 'ABS', 'Dual Airbags', 'Rear Camera', 'Keyless Entry'] },
        ],
      },
      {
        name: 'Swift',
        variants: [
          { name: 'GL MT', features: ['1.2L Engine', 'Manual', 'Power Steering', 'ABS', 'Dual Airbags', 'Alloy Wheels'] },
          { name: 'GL CVT', features: ['1.2L Engine', 'CVT Auto', 'Push Start', 'Rear Camera', 'ABS', '4 Airbags'] },
          { name: 'GLX CVT', features: ['1.2L Engine', 'CVT Auto', 'Sunroof', 'Leather Seats', '4 Airbags', 'Rear Camera', 'Cruise Control'] },
          { name: 'Sport MT', features: ['1.4L Turbo', 'Manual', 'Sport Bodykit', 'Brembo Brakes', 'Recaro Seats', '6 Airbags', 'ESC'] },
        ],
      },
      {
        name: 'Cultus',
        variants: [
          { name: 'VXR MT', features: ['1.0L Engine', 'Manual', 'Power Steering', 'ABS', 'Dual Airbags'] },
          { name: 'VXR AGS', features: ['1.0L Engine', 'AGS Auto', 'ABS', 'Dual Airbags', 'Rear Camera'] },
          { name: 'VXL AGS', features: ['1.0L Engine', 'AGS Auto', 'Alloy Wheels', 'Touchscreen', 'Rear Camera', 'ABS', 'Dual Airbags', 'Push Start'] },
        ],
      },
      {
        name: 'Jimny',
        variants: [
          { name: 'JLX MT', features: ['1.5L Engine', 'Manual', '4WD', 'AllGrip Pro', 'Hill Descent', 'ABS', 'Dual Airbags'] },
          { name: 'JLX AT', features: ['1.5L Engine', 'Auto', '4WD', 'AllGrip Pro', 'Leather Seats', 'Push Start', '4 Airbags', 'Rear Camera'] },
          { name: 'GLX Long Body', features: ['1.5L Engine', 'Auto', '4WD', 'Long Body', '4 Seats', 'Rear AC', '6 Airbags', 'Sunroof'] },
        ],
      },
      {
        name: 'Wagon R',
        variants: [
          { name: 'VX MT', features: ['1.0L Engine', 'Manual', 'Power Steering', 'Power Windows', 'ABS'] },
          { name: 'VX AGS', features: ['1.0L Engine', 'AGS Auto', 'Power Windows', 'Rear Camera', 'ABS'] },
          { name: 'VXR MT', features: ['1.0L Engine', 'Manual', 'Alloy Wheels', 'Rear Camera', 'Fog Lamps', 'ABS', 'Dual Airbags'] },
          { name: 'VXL AGS', features: ['1.0L Engine', 'AGS Auto', 'Touchscreen', 'Rear Camera', 'Push Start', 'ABS', 'Dual Airbags'] },
        ],
      },
      {
        name: 'Ciaz',
        variants: [
          { name: 'GL MT', features: ['1.4L Engine', 'Manual', 'ABS', 'Dual Airbags', 'Alloy Wheels', 'Rear Spoiler'] },
          { name: 'GL AT', features: ['1.4L Engine', 'Auto', 'Push Start', 'Rear Camera', 'Leather Seats', '4 Airbags'] },
          { name: 'GLX AT', features: ['1.4L Engine', 'Auto', 'Sunroof', 'Leather Seats', 'Push Start', 'Cruise Control', '4 Airbags', 'Touchscreen'] },
        ],
      },
      {
        name: 'Ertiga',
        variants: [
          { name: 'GL MT', features: ['1.5L Engine', 'Manual', '7 Seats', 'Rear AC Vents', 'ABS', 'Dual Airbags'] },
          { name: 'GL AT', features: ['1.5L Engine', 'Auto', '7 Seats', 'Push Start', 'Rear Camera', '4 Airbags'] },
          { name: 'GLX AT', features: ['1.5L Engine', 'Auto', '7 Seats', 'Leather Seats', 'Touchscreen', 'Rear Camera', '6 Airbags', 'ESP'] },
        ],
      },
    ],
  },
  {
    name: 'KIA',
    models: [
      {
        name: 'Sportage',
        variants: [
          { name: 'Alpha MT', features: ['2.0L Engine', 'Manual', 'ABS', 'Dual Airbags', 'Alloy Wheels', 'Rear Camera'] },
          { name: 'Alpha AT', features: ['2.0L Engine', 'Auto', 'Push Start', 'Rear Camera', '4 Airbags', 'Leather Seats'] },
          { name: 'FWD AT', features: ['2.0L Engine', 'Auto', 'Sunroof', 'Leather Seats', 'Push Start', '4 Airbags', 'Rear Camera', 'Cruise Control'] },
          { name: 'AWD AT', features: ['2.0L Engine', 'Auto', 'AWD', 'Sunroof', 'Leather Seats', '6 Airbags', 'ADAS', 'Wireless Charging', 'Ventilated Seats'] },
          { name: 'FWD HEV', features: ['1.6T Hybrid', 'DCT Auto', 'Sunroof', 'Leather Seats', '6 Airbags', 'ADAS', 'Wireless Charging'] },
        ],
      },
      {
        name: 'Stonic',
        variants: [
          { name: 'EX MT', features: ['1.4L Engine', 'Manual', 'Rear Camera', 'Alloy Wheels', 'ABS', 'Dual Airbags'] },
          { name: 'EX AT', features: ['1.4L Engine', 'Auto', 'Push Start', 'Rear Camera', 'Touchscreen', '4 Airbags'] },
          { name: 'EX+ AT', features: ['1.4L Engine', 'Auto', 'Sunroof', 'Leather Seats', 'Push Start', '4 Airbags', 'Wireless Charging'] },
        ],
      },
      {
        name: 'Sorento',
        variants: [
          { name: '2.4 FWD', features: ['2.4L Engine', 'Auto', '7 Seats', 'Sunroof', 'Leather Seats', '6 Airbags', 'Rear Camera', 'Rear AC'] },
          { name: '2.4 AWD', features: ['2.4L Engine', 'Auto', '7 Seats', 'AWD', 'Sunroof', 'Leather Seats', '8 Airbags', 'Ventilated Seats', 'HUD', 'ADAS'] },
          { name: '2.2D AWD', features: ['2.2L Diesel', 'Auto', '7 Seats', 'AWD', 'Sunroof', 'Ventilated Seats', '8 Airbags', 'HUD', 'Advanced ADAS'] },
        ],
      },
      {
        name: 'Carnival',
        variants: [
          { name: '2.2D FWD', features: ['2.2L Diesel', 'Auto', '8 Seats', 'Leather Seats', 'Dual Sunroof', 'Rear Entertainment', '8 Airbags', 'ADAS', 'Power Sliding Doors'] },
          { name: '3.5 V6', features: ['3.5L V6 Petrol', 'Auto', '8 Seats', 'Full Leather', 'Panoramic Roof', 'Rear Entertainment', '8 Airbags', 'ADAS', 'HUD'] },
        ],
      },
      {
        name: 'EV6',
        variants: [
          { name: 'Standard Range RWD', features: ['77.4 kWh Battery', '229hp Electric', '528km Range', 'Leather Seats', 'Sunroof', 'ADAS', 'V2L', '800V Architecture'] },
          { name: 'Long Range AWD', features: ['77.4 kWh Battery', '325hp Electric', 'AWD', '506km Range', 'Ventilated Seats', 'HUD', 'ADAS', 'V2L', '800V Architecture'] },
          { name: 'GT', features: ['77.4 kWh Battery', '585hp Electric', 'AWD', 'Sport Tuning', 'Brembo Brakes', 'Recaro Seats', 'GT Mode', '800V Architecture'] },
        ],
      },
    ],
  },
  {
    name: 'Hyundai',
    models: [
      {
        name: 'Tucson',
        variants: [
          { name: '2.0 FWD AT', features: ['2.0L Engine', 'Auto', 'Sunroof', 'Leather Seats', '6 Airbags', 'Rear Camera', 'Push Start', 'Cruise Control'] },
          { name: '2.0 AWD AT', features: ['2.0L Engine', 'Auto', 'AWD', 'Sunroof', 'Leather Seats', '6 Airbags', 'ADAS', 'Wireless Charging', 'HUD'] },
          { name: '1.6T DCT', features: ['1.6L Turbo', 'DCT Auto', 'Sunroof', 'Leather Seats', '6 Airbags', 'Smart Parking', 'Remote Start', 'BSM'] },
        ],
      },
      {
        name: 'Elantra',
        variants: [
          { name: 'GLS MT', features: ['1.6L Engine', 'Manual', 'ABS', 'Dual Airbags', 'Alloy Wheels', 'Rear Camera'] },
          { name: 'GLS AT', features: ['1.6L Engine', 'Auto', 'Sunroof', 'Leather Seats', '6 Airbags', 'Push Start', 'Rear Camera'] },
          { name: 'Sport 1.6T', features: ['1.6L Turbo', 'DCT Auto', 'Sport Bodykit', 'Brembo Brakes', 'Bucket Seats', '8 Airbags', 'ADAS'] },
          { name: 'N Line', features: ['1.6L Turbo', 'DCT Auto', 'N Performance Tuning', 'Red Brakes', 'Sport Interior', '8 Airbags', 'Track Mode'] },
        ],
      },
      {
        name: 'Santa Fe',
        variants: [
          { name: '2.4 FWD', features: ['2.4L Engine', 'Auto', '7 Seats', 'Sunroof', 'Leather Seats', '6 Airbags', 'Rear Camera'] },
          { name: '2.4 AWD', features: ['2.4L Engine', 'Auto', '7 Seats', 'AWD', 'Sunroof', 'Ventilated Seats', '8 Airbags', 'ADAS', 'HUD'] },
        ],
      },
      {
        name: 'Staria',
        variants: [
          { name: '2.2D Exclusive', features: ['2.2L Diesel', 'Auto', '9 Seats', 'Panoramic Roof', 'Relaxation Seats', 'ADAS', '8 Airbags', 'Rear Entertainment'] },
          { name: '2.2D Premium', features: ['2.2L Diesel', 'Auto', '9 Seats', 'Panoramic Roof', 'VIP Rear Seats', 'ADAS', '10 Airbags', 'HUD', 'Ambient Lighting'] },
        ],
      },
    ],
  },
  {
    name: 'BMW',
    models: [
      {
        name: '3 Series',
        variants: [
          { name: '318i', features: ['1.5L Turbo', 'Auto', 'Leather Seats', 'iDrive 8', 'Wireless Charging', '6 Airbags', 'Park Assist'] },
          { name: '320i', features: ['2.0L Turbo', 'Auto', 'Leather Seats', 'Sunroof', 'iDrive 8', '6 Airbags', 'Driving Assistant'] },
          { name: '330i M Sport', features: ['2.0L Turbo 258hp', 'Auto', 'M Sport Body', 'Leather Seats', 'Sunroof', 'HUD', '6 Airbags', 'Driving Assistant Plus'] },
          { name: 'M340i', features: ['3.0L Turbo 374hp', 'Auto', 'Full M Sport', 'Adaptive M Suspension', 'HUD', 'Harman Kardon', '6 Airbags', 'Active Guard'] },
        ],
      },
      {
        name: '5 Series',
        variants: [
          { name: '520i', features: ['2.0L Turbo', 'Auto', 'Full Leather', 'Sunroof', 'iDrive 8.5', '8 Airbags', 'Driving Assistant'] },
          { name: '530i M Sport', features: ['2.0L Turbo 252hp', 'Auto', 'M Sport Kit', 'Leather Seats', 'Sunroof', 'HUD', '8 Airbags', 'Parking Assistant Plus'] },
          { name: '540i', features: ['3.0L Turbo 340hp', 'Auto', 'Full Leather', 'Sunroof', 'Bowers & Wilkins Audio', 'HUD', '8 Airbags', 'Full ADAS'] },
        ],
      },
      {
        name: 'X5',
        variants: [
          { name: 'xDrive30i', features: ['2.0L Turbo', 'Auto', 'AWD', 'Panoramic Roof', 'Leather Seats', 'iDrive 8', '6 Airbags', 'Driving Assistant'] },
          { name: 'xDrive40i M Sport', features: ['3.0L Turbo 340hp', 'Auto', 'AWD', 'M Sport', 'Panoramic Roof', 'B&W Audio', 'HUD', '8 Airbags', 'Off-Road Package'] },
          { name: 'M50i', features: ['4.4L V8 Turbo 530hp', 'Auto', 'AWD', 'M Performance', 'Panoramic Roof', 'Full Leather', 'HUD', '10 Airbags'] },
        ],
      },
      {
        name: '7 Series',
        variants: [
          { name: '740i', features: ['3.0L Turbo', 'Auto', 'Executive Lounge', 'Panoramic Roof', 'B&W Surround Audio', 'HUD', 'Nappa Leather', '8 Airbags'] },
          { name: '760i M760e', features: ['3.0L Plug-in Hybrid', 'Auto', 'Theatre Screen Rear', 'Executive Lounge', 'B&W Diamond Audio', 'HUD', '10 Airbags', 'Active Steering', 'Night Vision'] },
        ],
      },
    ],
  },
  {
    name: 'Mercedes-Benz',
    models: [
      {
        name: 'C-Class',
        variants: [
          { name: 'C200', features: ['1.5L Mild Hybrid', 'Auto', 'Leather Seats', 'Sunroof', 'MBUX 11.9"', '7 Airbags', 'Digital Lighting'] },
          { name: 'C300', features: ['2.0L Turbo 258hp', 'Auto', 'AMG Line', 'Nappa Leather', 'Sunroof', 'MBUX', 'HUD', '9 Airbags', 'Active Brake Assist'] },
          { name: 'AMG C43', features: ['3.0L V6 Turbo 390hp', 'Auto', 'AMG Body', 'Nappa Leather', 'AMG Ride Control', 'HUD', '9 Airbags', 'Performance Exhaust'] },
        ],
      },
      {
        name: 'E-Class',
        variants: [
          { name: 'E200', features: ['2.0L Mild Hybrid', 'Auto', 'Leather Seats', 'Panoramic Roof', 'MBUX 14.4"', '8 Airbags', 'Driving Assistance Package'] },
          { name: 'E300', features: ['2.0L Turbo 258hp', 'Auto', 'AMG Line', 'Nappa Leather', 'Panoramic Roof', 'HUD', 'Burmester Audio', '8 Airbags'] },
          { name: 'AMG E53', features: ['3.0L Inline-6 435hp', 'Auto', 'AMG Body', 'AMG Interior', 'Panoramic Roof', 'HUD', 'Burmester 3D Audio', '9 Airbags'] },
        ],
      },
      {
        name: 'GLE',
        variants: [
          { name: 'GLE300d', features: ['2.0L Diesel', 'Auto', 'Air Suspension', 'Panoramic Roof', 'Nappa Leather', 'MBUX', '8 Airbags', 'ADAS'] },
          { name: 'GLE450', features: ['3.0L Mild Hybrid', 'Auto', 'AMG Line', 'Air Suspension', 'Panoramic Roof', 'Burmester Audio', 'HUD', '9 Airbags'] },
          { name: 'AMG GLE53', features: ['3.0L V6 435hp', 'Auto', 'AMG Kit', 'Air Suspension', 'AMG Seats', 'HUD', 'Burmester 3D Audio', '9 Airbags'] },
        ],
      },
      {
        name: 'S-Class',
        variants: [
          { name: 'S450', features: ['3.0L Mild Hybrid', 'Auto', 'Executive Rear', 'Panoramic Roof', 'Burmester 4D Audio', 'HUD', 'Nappa Leather', '10 Airbags', 'E-Active Body Control'] },
          { name: 'S580', features: ['4.0L V8 503hp', 'Auto', 'Executive Rear', 'Rear-Axle Steering', 'Burmester High-End Audio', 'HUD', 'Night Vision', '10 Airbags', 'Digital Lights'] },
        ],
      },
    ],
  },
  {
    name: 'Audi',
    models: [
      {
        name: 'A3',
        variants: [
          { name: '1.0T Sportback', features: ['1.0L TFSI', 'S-Tronic', 'Virtual Cockpit', 'MMI Touch', 'LED Headlights', '6 Airbags', 'Audi Pre-Sense'] },
          { name: '1.5T Sportback', features: ['1.5L TFSI 150hp', 'S-Tronic', 'S-Line Body', 'Virtual Cockpit Plus', 'Matrix LED', '6 Airbags', 'Audi Connect'] },
          { name: 'S3 Sportback', features: ['2.0L TFSI 310hp', 'S-Tronic', 'Quattro AWD', 'S Sport Seats', 'Matrix LED', '8 Airbags', 'Drive Select', 'Akrapovic Exhaust'] },
        ],
      },
      {
        name: 'A6',
        variants: [
          { name: '2.0T', features: ['2.0L TFSI 245hp', 'S-Tronic', 'Leather Seats', 'Panoramic Roof', 'Virtual Cockpit', 'Bang & Olufsen Audio', '8 Airbags'] },
          { name: '3.0T Quattro', features: ['3.0L TFSI 340hp', 'Tiptronic', 'Quattro', 'S-Line', 'Panoramic Roof', 'B&O Audio', 'HUD', '8 Airbags', 'Full ADAS'] },
          { name: 'RS6 Avant', features: ['4.0L V8 TFSI 630hp', 'Tiptronic', 'Quattro', 'RS Sport Exhaust', 'Carbon Pack', 'Sport Air Suspension', '8 Airbags'] },
        ],
      },
      {
        name: 'Q7',
        variants: [
          { name: '45 TFSI', features: ['2.0L TFSI', 'Tiptronic', 'Quattro', '7 Seats', 'Panoramic Roof', 'Virtual Cockpit', '8 Airbags', 'Tour Package'] },
          { name: '55 TFSI', features: ['3.0L TFSI 340hp', 'Tiptronic', 'Quattro', '7 Seats', 'Panoramic Roof', 'B&O 3D Audio', 'HUD', '8 Airbags', 'Full ADAS'] },
          { name: 'SQ7', features: ['4.0L V8 TFSI 507hp', 'Tiptronic', 'Quattro', 'Air Suspension', '7 Seats', 'RS Body', 'B&O Audio', 'HUD', '8 Airbags'] },
        ],
      },
      {
        name: 'Q3',
        variants: [
          { name: '35 TFSI S-Tronic', features: ['1.5L TFSI', 'S-Tronic', 'Virtual Cockpit', 'LED Headlights', '6 Airbags', 'Audi Pre-Sense'] },
          { name: '40 TFSI Quattro', features: ['2.0L TFSI', 'S-Tronic', 'Quattro', 'S-Line', 'Panoramic Roof', 'Virtual Cockpit Plus', '6 Airbags'] },
          { name: 'RS Q3', features: ['2.5L TFSI 400hp', 'S-Tronic', 'Quattro', 'RS Body', 'Nappa Leather', 'Matrix LED', '6 Airbags', 'Akrapovic Exhaust'] },
        ],
      },
    ],
  },
  {
    name: 'MG',
    models: [
      {
        name: 'HS',
        variants: [
          { name: 'Excite MT', features: ['1.5T Petrol', 'Manual', 'Panoramic Roof', 'Rear Camera', 'ABS', '2 Airbags', 'Touchscreen'] },
          { name: 'Excite AT', features: ['1.5T Petrol', 'Auto', 'Panoramic Roof', 'Push Start', 'Rear Camera', '4 Airbags', 'Cruise Control'] },
          { name: 'Essence AT', features: ['2.0T Petrol', 'Auto', 'Panoramic Roof', 'Leather Seats', 'HUD', '6 Airbags', 'BSM', 'Wireless Charging'] },
          { name: 'Trophy AT', features: ['2.0T Petrol', 'Auto', 'Full Leather', 'Panoramic Roof', 'HUD', 'ADAS Pack', '6 Airbags', 'Ventilated Seats', 'Wireless Charging'] },
        ],
      },
      {
        name: 'ZS',
        variants: [
          { name: 'Excite MT', features: ['1.5L Engine', 'Manual', 'Rear Camera', 'Touchscreen', 'ABS', 'Dual Airbags'] },
          { name: 'Excite AT', features: ['1.5L Engine', 'Auto', 'Panoramic Roof', 'Push Start', 'Rear Camera', '4 Airbags'] },
          { name: 'Exclusive AT', features: ['1.5L Engine', 'Auto', 'Full Leather', 'Panoramic Roof', 'Wireless Charging', '4 Airbags', 'ADAS'] },
        ],
      },
      {
        name: 'ZS EV',
        variants: [
          { name: 'Excite', features: ['51 kWh Battery', '143hp Electric', '320km Range', 'Rear Camera', 'Touchscreen', 'ABS', '6 Airbags'] },
          { name: 'Exclusive', features: ['72.6 kWh Battery', '177hp Electric', '440km Range', 'Leather Seats', 'Panoramic Roof', '6 Airbags', 'ADAS'] },
        ],
      },
      {
        name: 'Gloster',
        variants: [
          { name: 'Luxury AT', features: ['2.0T Petrol', 'Auto', '7 Seats', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'ADAS', 'Rear Entertainment'] },
          { name: 'Savvy AT', features: ['2.0T Petrol', 'Auto', '6 Seats', 'Panoramic Roof', 'Nappa Leather', '6 Airbags', 'Full ADAS', 'HUD', 'Ventilated Seats'] },
        ],
      },
    ],
  },
  {
    name: 'Changan',
    models: [
      {
        name: 'Alsvin',
        variants: [
          { name: 'ACE MT', features: ['1.4L Engine', 'Manual', 'Power Windows', 'ABS', 'Dual Airbags', 'Rear Camera'] },
          { name: 'ACE AT', features: ['1.4L Engine', 'Auto', 'Push Start', 'Rear Camera', 'Touchscreen', '4 Airbags'] },
          { name: 'Lumiere MT', features: ['1.5T Engine', 'Manual', 'Leather Seats', 'Sunroof', 'Push Start', '4 Airbags', 'Cruise Control'] },
          { name: 'Lumiere AT', features: ['1.5T Engine', 'Auto', 'Leather Seats', 'Sunroof', 'Push Start', '6 Airbags', 'Wireless Charging', 'ADAS'] },
        ],
      },
      {
        name: 'Oshan X7',
        variants: [
          { name: '1.5T FWD AT', features: ['1.5L Turbo', 'Auto', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'Push Start', 'Rear Camera', 'BSM'] },
          { name: '2.0T AWD AT', features: ['2.0L Turbo', 'Auto', 'AWD', 'Panoramic Roof', 'Leather Seats', 'HUD', '6 Airbags', 'Full ADAS', 'Ventilated Seats'] },
        ],
      },
      {
        name: 'Uni-T',
        variants: [
          { name: '1.5T MT', features: ['1.5L Turbo', 'Manual', 'Panoramic Roof', 'Leather Seats', '4 Airbags', 'Push Start', 'ADAS'] },
          { name: '1.5T AT', features: ['1.5L Turbo', 'Auto', 'Panoramic Roof', 'Leather Seats', 'HUD', '6 Airbags', 'Full ADAS', 'Wireless Charging'] },
        ],
      },
    ],
  },
  {
    name: 'Proton',
    models: [
      {
        name: 'Saga',
        variants: [
          { name: 'Standard MT', features: ['1.3L Engine', 'Manual', 'Power Steering', 'ABS', 'Dual Airbags', 'Alloy Wheels'] },
          { name: 'Premium AT', features: ['1.3L Engine', 'Auto', 'Push Start', 'Rear Camera', 'Touchscreen', '4 Airbags'] },
          { name: 'X MT', features: ['1.3L Turbo', 'Manual', 'Sport Bodykit', 'Leather Seats', '4 Airbags', 'Push Start', 'Cruise Control'] },
        ],
      },
      {
        name: 'X70',
        variants: [
          { name: 'Executive', features: ['1.8T Engine', 'Auto', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'Rear Camera', 'ADAS'] },
          { name: 'Premium', features: ['1.8T Engine', 'Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', 'Ventilated Seats'] },
          { name: 'X AWD', features: ['1.8T Engine', 'Auto', 'AWD', 'Panoramic Roof', 'Nappa Leather', 'HUD', '8 Airbags', 'Full ADAS'] },
        ],
      },
      {
        name: 'X50',
        variants: [
          { name: 'Standard MT', features: ['1.5T Engine', 'Manual', 'Rear Camera', 'Touchscreen', '4 Airbags', 'ABS'] },
          { name: 'Executive AT', features: ['1.5T Engine', 'Auto', 'Sunroof', 'Leather Seats', 'Push Start', '4 Airbags', 'BSM'] },
          { name: 'Premium AT', features: ['1.5T Engine', 'Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', 'Wireless Charging'] },
        ],
      },
    ],
  },
  {
    name: 'HAVAL',
    models: [
      {
        name: 'H6',
        variants: [
          { name: 'HEV', features: ['1.5T Hybrid', 'Auto', 'Panoramic Roof', 'Leather Seats', 'HUD', '6 Airbags', 'ADAS', 'Wireless Charging', '360 Camera'] },
          { name: 'PHEV', features: ['1.5T Plug-in Hybrid', 'Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', 'Ventilated Seats', 'Premium Audio'] },
        ],
      },
      {
        name: 'Jolion',
        variants: [
          { name: 'Comfort AT', features: ['1.5T Engine', 'Auto', 'Sunroof', 'Leather Seats', '4 Airbags', 'Push Start', 'Rear Camera', 'ADAS'] },
          { name: 'Premium AT', features: ['1.5T Engine', 'Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', 'Wireless Charging'] },
          { name: 'HEV', features: ['1.5T Hybrid', 'Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', '360 Camera'] },
        ],
      },
    ],
  },
  {
    name: 'Chery',
    models: [
      {
        name: 'Tiggo 4 Pro',
        variants: [
          { name: 'DCT Comfort', features: ['1.5T Engine', 'DCT Auto', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'Push Start', 'ADAS'] },
          { name: 'DCT Luxury', features: ['1.5T Engine', 'DCT Auto', 'Panoramic Roof', 'Nappa Leather', 'HUD', '6 Airbags', 'Full ADAS', 'Wireless Charging'] },
        ],
      },
      {
        name: 'Tiggo 8 Pro',
        variants: [
          { name: 'DCT FWD', features: ['2.0T Engine', 'DCT Auto', '7 Seats', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'ADAS'] },
          { name: 'DCT AWD', features: ['2.0T Engine', 'DCT Auto', '7 Seats', 'AWD', 'Panoramic Roof', 'Nappa Leather', 'HUD', '8 Airbags', 'Full ADAS', 'Ventilated Seats'] },
        ],
      },
    ],
  },
  {
    name: 'Porsche',
    models: [
      {
        name: 'Cayenne',
        variants: [
          { name: 'Base 3.0T', features: ['3.0L V6 Turbo', 'Auto', 'PDCC', 'Air Suspension', 'Bose Audio', 'PCM', '8 Airbags', 'Sport Chrono'] },
          { name: 'S', features: ['2.9L V6 Twin Turbo 440hp', 'Auto', 'Sport Chrono', 'Air Suspension', 'BOSE Surround', '8 Airbags', 'PDCC'] },
          { name: 'Turbo', features: ['4.0L V8 650hp', 'Auto', 'Sport Chrono', 'Active Air Suspension', 'Burmester Audio', '8 Airbags', 'Night Vision', 'PDCC Sport'] },
        ],
      },
      {
        name: '911',
        variants: [
          { name: 'Carrera', features: ['3.0L Boxer 385hp', 'PDK', 'Sport Chrono', 'BOSE Audio', 'PCM', '8 Airbags', 'Lane Change Assist'] },
          { name: 'Carrera S', features: ['3.0L Boxer 450hp', 'PDK', 'Sport Chrono Plus', 'BOSE Audio', 'PCM', '8 Airbags', 'PDAS'] },
          { name: 'GT3', features: ['4.0L Boxer 510hp', 'PDK/Manual', 'Track Suspension', 'Bucket Seats', 'Sport Exhaust', 'Roll Cage Option', 'Carbon Brakes Option'] },
        ],
      },
    ],
  },
  {
    name: 'Land Rover',
    models: [
      {
        name: 'Defender',
        variants: [
          { name: '90 P300', features: ['2.0L Petrol', 'Auto', '5 Seats', 'Terrain Response 2', 'Air Suspension', 'Meridian Audio', '8 Airbags', 'Off-Road Pack'] },
          { name: '110 D300', features: ['3.0L Diesel', 'Auto', '7 Seats', 'Terrain Response 2', 'Air Suspension', 'Meridian Surround', '8 Airbags', 'ClearSight Camera'] },
          { name: '110 P400 X', features: ['3.0L Petrol', 'Auto', '7 Seats', 'Full X Pack', 'Air Suspension', 'Meridian Signature', '8 Airbags', 'Night Vision'] },
        ],
      },
      {
        name: 'Range Rover',
        variants: [
          { name: 'Vogue P400', features: ['3.0L Mild Hybrid', 'Auto', 'Executive Class Rear', 'Panoramic Roof', 'Meridian Signature', 'HUD', '8 Airbags', 'Air Suspension'] },
          { name: 'Sport P400', features: ['3.0L Mild Hybrid', 'Auto', 'Sport Seats', 'Panoramic Roof', 'Meridian Surround', 'HUD', '8 Airbags', 'Dynamic Air Suspension'] },
          { name: 'Autobiography', features: ['4.4L V8', 'Auto', 'Rear Suite', 'Panoramic Roof', 'Meridian Signature 35 Speaker', 'Night Vision', 'HUD', '10 Airbags', 'Massage Seats'] },
        ],
      },
    ],
  },
  {
    name: 'Lexus',
    models: [
      {
        name: 'RX',
        variants: [
          { name: '350h F Sport', features: ['2.5L Hybrid', 'Auto', 'F Sport Body', 'Sunroof', 'Mark Levinson Audio', 'HUD', '8 Airbags', 'Lexus Safety System+'] },
          { name: '500h F Sport Performance', features: ['2.4T Hybrid 371hp', 'Auto', 'F Sport Body', 'Sunroof', 'Mark Levinson Audio', 'HUD', '10 Airbags', 'E-FOUR AWD'] },
        ],
      },
      {
        name: 'LX',
        variants: [
          { name: '600 Luxury', features: ['3.4L V6 Twin Turbo', 'Auto', '7 Seats', 'Air Suspension', 'Mark Levinson Audio', 'HUD', '8 Airbags', 'Kinetic Dynamic Suspension'] },
          { name: '600 Ultra Luxury', features: ['3.4L V6 Twin Turbo', 'Auto', '4 Executive Seats', 'Executive Lounge Rear', 'Mark Levinson Audio', 'HUD', '10 Airbags', 'Night Vision'] },
        ],
      },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      {
        name: 'Tiguan',
        variants: [
          { name: '1.4 TSI Comfortline', features: ['1.4L TSI', 'DSG Auto', 'Panoramic Roof', 'Leather Seats', '6 Airbags', 'App Connect', 'Park Assist'] },
          { name: '2.0 TSI Highline', features: ['2.0L TSI 220hp', 'DSG Auto', 'Panoramic Roof', 'Nappa Leather', 'Virtual Cockpit', 'HUD', '8 Airbags', 'IQ Drive'] },
          { name: 'R-Line', features: ['2.0L TSI 245hp', 'DSG Auto', 'R-Line Body', 'Panoramic Roof', 'Nappa Leather', 'IQ.Light LED', 'HUD', '8 Airbags', 'IQ Drive'] },
        ],
      },
      {
        name: 'Polo',
        variants: [
          { name: 'Comfortline', features: ['1.0L TSI', 'Manual', 'Touchscreen', 'ABS', 'Dual Airbags', 'App Connect'] },
          { name: 'Highline', features: ['1.0L TSI', 'DSG Auto', 'Sunroof', 'Leather Seats', 'Digital Cockpit', '4 Airbags', 'Front Assist'] },
          { name: 'GTI', features: ['2.0L TSI 207hp', 'DSG Auto', 'GTI Body', 'Nappa Leather', 'Digital Cockpit Pro', '6 Airbags', 'DCC', 'Performance Exhaust'] },
        ],
      },
    ],
  },
];

// Helper functions for cascading lookup
export function getMakes(): string[] {
  return CAR_DATA.map(m => m.name);
}

export function getModels(make: string): string[] {
  return CAR_DATA.find(m => m.name === make)?.models.map(m => m.name) ?? [];
}

export function getVariants(make: string, model: string): string[] {
  return CAR_DATA.find(m => m.name === make)
    ?.models.find(m => m.name === model)
    ?.variants.map(v => v.name) ?? [];
}

export function getFeatures(make: string, model: string, variant: string): string[] {
  return CAR_DATA.find(m => m.name === make)
    ?.models.find(m => m.name === model)
    ?.variants.find(v => v.name === variant)
    ?.features ?? [];
}
