import React, { useState } from 'react';
import { Sparkles, X, Check, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ParsedSpec {
  make?: string; model?: string; variant?: string; generation?: string;
  model_year?: number; registration_year?: number;
  color?: string; mileage?: number;
  expected_selling_price?: number; transmission?: string;
  fuel_type?: string; engine_capacity?: string;
  registration_number?: string; dealer_city?: string;
  body_type?: string; drive_type?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (spec: ParsedSpec) => void;
}

// ─── Master make→models table ────────────────────────────────────────────────
const MAKES: Record<string, string[]> = {
  Toyota: [
    'Land Cruiser 300','Land Cruiser 200','Land Cruiser','Prado','Fortuner','Hilux Revo','Hilux',
    'Corolla Cross','Corolla Altis','Corolla','Camry','Yaris','Vitz','Aqua','CHR','C-HR','RAV4',
    'Rush','Raize','Vellfire','Alphard','Innova','Hiace','Coaster','Granvia','Avanza','Veloz',
    'Crown','Supra','GR86','86','bZ4X',
  ],
  Honda: [
    'Civic e:HEV','Civic Type R','Civic','City Hatchback','City','BR-V','HR-V','CR-V','Pilot',
    'Passport','Ridgeline','Accord','Odyssey','Vezel','Fit','Jazz','WR-V','ZR-V','e:NS1',
  ],
  Suzuki: [
    'Swift','Alto','Alto VX','Alto VXR','WagonR','Cultus','Jimny','Vitara','Grand Vitara',
    'Baleno','Ciaz','Ertiga','XL6','S-Presso','Bolan','Carry','Ravi',
  ],
  Kia: [
    'Sportage','Stonic','Picanto','Sonet','Seltos','Sorento','Telluride','Carnival','EV6',
    'EV9','Niro','Stinger','K5','K8',
  ],
  Hyundai: [
    'Tucson','Santa Fe','Palisade','Creta','Venue','Sonata','Elantra','Grand i10',
    'i10','i20','IONIQ 5','IONIQ 6','Staria','Starex','H-1','Porter',
  ],
  Nissan: [
    'X-Trail','Patrol','Pathfinder','Murano','Kicks','Juke','Qashqai','Terra',
    'Navara','NP300','Sunny','Altima','Maxima','GT-R','370Z','Leaf','Ariya',
  ],
  Mitsubishi: [
    'Pajero','Pajero Sport','Eclipse Cross','Outlander','ASX','Galant','L200','Triton',
    'Xpander','Attrage','Mirage',
  ],
  BMW: [
    '1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series',
    'X1','X2','X3','X4','X5','X6','X7','Z4','i3','i4','i7','iX','M3','M5','M8',
  ],
  'Mercedes-Benz': [
    'A-Class','B-Class','C-Class','E-Class','S-Class','CLA','CLS','GLA','GLB','GLC','GLE','GLS',
    'AMG GT','EQA','EQB','EQC','EQE','EQS','Maybach S-Class','G-Class',
  ],
  Mercedes: [
    'A-Class','B-Class','C-Class','E-Class','S-Class','CLA','CLS','GLA','GLB','GLC','GLE','GLS',
    'AMG GT','EQA','EQB','EQC','EQS','G-Class',
  ],
  Audi: [
    'A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q5','Q7','Q8',
    'e-tron','e-tron GT','RS3','RS5','RS6','RS7','S3','S4','S5','TT','R8',
  ],
  Volkswagen: [
    'Polo','Golf','Jetta','Passat','Tiguan','Touareg','Atlas','T-Roc','T-Cross',
    'ID.3','ID.4','ID.5','Arteon','Caravelle','Transporter',
  ],
  Porsche: [
    'Cayenne','Macan','Panamera','911','Taycan','718 Cayman','718 Boxster',
  ],
  Lexus: [
    'LX 600','LX 570','LX','GX','RX','NX','UX','ES','IS','LS','LC','RC','LFA',
  ],
  'Range Rover': [
    'Range Rover Sport','Range Rover Evoque','Range Rover Velar','Range Rover',
    'Discovery','Discovery Sport','Defender',
  ],
  'Land Rover': [
    'Range Rover Sport','Range Rover Evoque','Range Rover Velar','Range Rover',
    'Discovery','Discovery Sport','Defender',
  ],
  Jeep: ['Grand Cherokee','Cherokee','Compass','Wrangler','Gladiator','Renegade'],
  Mazda: ['CX-90','CX-60','CX-50','CX-5','CX-3','CX-30','Mazda3','Mazda6','MX-5','MX-30'],
  Subaru: ['Forester','Outback','XV','Impreza','WRX','BRZ','Crosstrek','Solterra'],
  Volvo: ['XC90','XC60','XC40','S60','S90','V60','V90','EX40','EX90','C40'],
  Changan: [
    'Alsvin','Oshan X7','Oshan X5','CS35 Plus','CS55 Plus','CS75 Plus','CS85',
    'Uni-T','Uni-K','Uni-V','Deepal S7','Hunter',
  ],
  MG: ['HS','ZS','ZS EV','RX5','RX8','MG5','MG6','MG7','VS HEV','Cyberster','4'],
  Haval: ['H6','H9','Jolion','Dargo','F7','F7x','H2','H4','H8','Big Dog'],
  Chery: ['Tiggo 4 Pro','Tiggo 7 Pro','Tiggo 8 Pro','Omoda 5','Arrizo 6 Pro'],
  DFSK: ['Glory 500','Glory 580','Glory 600','Glory 900','C37','EC35'],
  FAW: ['V2','Sirius S80','Carrier','Besturn B50'],
  Prince: ['Pearl','Dfm Mini Truck'],
  Daihatsu: ['Mira','Move','Tanto','Hijet','Rocky','Boon','Terios'],
  Isuzu: ['D-Max','MU-X','Trooper'],
  Proton: ['Saga','X50','X70','Persona','Iriz','Exora'],
  BYD: ['Atto 3','Han','Tang','Seal','Dolphin','Song Plus'],
  Peugeot: ['208','2008','308','3008','508','5008'],
  Renault: ['Clio','Megane','Captur','Kadjar','Koleos'],
  Ford: ['Ranger','Everest','Explorer','F-150','Mustang','Edge','Escape','Puma','Bronco'],
  Chevrolet: ['Captiva','Trax','Traverse','Silverado','Malibu','Spark','Equinox'],
  Dodge: ['Charger','Challenger','Durango','Ram 1500'],
  Jeep2: [],
  Rolls: ['Ghost','Phantom','Cullinan','Wraith','Dawn','Spectre'],
  Bentley: ['Bentayga','Continental GT','Flying Spur','Mulsanne'],
  Ferrari: ['Roma','SF90','296 GTB','812','F8','Purosangue'],
  Lamborghini: ['Urus','Huracán','Aventador','Revuelto'],
  Maserati: ['Ghibli','Quattroporte','Levante','Grecale','MC20'],
};

// ─── Extended color map with aliases ─────────────────────────────────────────
const COLOR_ALIASES: Array<[RegExp, string]> = [
  [/\bpearl\s*white\b/i, 'Pearl White'],
  [/\bpearl\b/i, 'Pearl White'],
  [/\bnavy\s*blue\b/i, 'Navy Blue'],
  [/\bmidnight\s*blue\b/i, 'Navy Blue'],
  [/\bdark\s*blue\b/i, 'Navy Blue'],
  [/\bsky\s*blue\b/i, 'Blue'],
  [/\blight\s*blue\b/i, 'Blue'],
  [/\bchampagne\b/i, 'Champagne'],
  [/\bgolden?\b/i, 'Gold'],
  [/\bgun\s*metal\b/i, 'Gunmetal'],
  [/\bgunmetal\b/i, 'Gunmetal'],
  [/\bburgund(?:y|ie)\b/i, 'Maroon'],
  [/\bwine\s*(red)?\b/i, 'Maroon'],
  [/\bmaroon\b/i, 'Maroon'],
  [/\bruby\b/i, 'Red'],
  [/\bdark\s*red\b/i, 'Maroon'],
  [/\bbrown\b/i, 'Brown'],
  [/\bbeige\b/i, 'Beige'],
  [/\bcream\b/i, 'Beige'],
  [/\boff[\s-]?white\b/i, 'Beige'],
  [/\bsilver\b/i, 'Silver'],
  [/\bgrey\b/i, 'Grey'],
  [/\bgray\b/i, 'Grey'],
  [/\bcharcoal\b/i, 'Grey'],
  [/\bblack\b/i, 'Black'],
  [/\bwhite\b/i, 'White'],
  [/\bred\b/i, 'Red'],
  [/\bblue\b/i, 'Blue'],
  [/\bgreen\b/i, 'Green'],
  [/\bdark\s*green\b/i, 'Green'],
  [/\bolive\b/i, 'Green'],
  [/\borange\b/i, 'Orange'],
  [/\byellow\b/i, 'Yellow'],
  [/\bpurple\b/i, 'Purple'],
  [/\bturquoise\b/i, 'Blue'],
  [/\bteal\b/i, 'Blue'],
  [/\btan\b/i, 'Beige'],
];

// ─── Pakistani cities ─────────────────────────────────────────────────────────
const PK_CITIES = [
  'Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta',
  'Sialkot','Gujranwala','Hyderabad','Bahawalpur','Sargodha','Sukkur','Larkana',
  'Abbottabad','Mardan','Kasur','Dera Ghazi Khan','Sahiwal','Jhang','Gujrat',
  'Sheikhupura','Mirpur','Muzaffarabad','Taxila','Wah Cantt','Chakwal',
];

// ─── Variant patterns ─────────────────────────────────────────────────────────
const VARIANT_RE = /\b(TXL|TXR|VXL|VXR|VXS|GLI|XLI|GLX|GLS|GL\b|GR\b|GR-S|TRD|TRD\s*Sportivo|RS\b|S-Line|M\s*Sport|AMG\b|Prestige|Limited|Platinum|Premium|Sport|Touring|Signature|Active|Executive|Luxury|Standard|Base|Pro\b|Max\b|Elite|EX\b|LX\b|EX-L|SX\b|EX-T|DX\b|ZX\b|LS\b|SR\b|SR\+|SL\b|SV\b|SE\b|XE\b|XF\b|XS\b|XR\b|Hybrid\s+LE|Hybrid|e:HEV|PHEV|4WD|AWD|2WD|FWD|RWD|S\b)\b/i;

// ─── Body type ────────────────────────────────────────────────────────────────
const BODY_TYPE_MAP: Array<[RegExp, string]> = [
  [/\bsuv\b/i, 'SUV'], [/\bcrossover\b/i, 'Crossover'],
  [/\bsedan\b/i, 'Sedan'], [/\bhatchback\b/i, 'Hatchback'],
  [/\bcoupe\b/i, 'Coupe'], [/\bconvertible\b/i, 'Convertible'],
  [/\bwagon\b/i, 'Wagon'], [/\bpickup\b/i, 'Pickup'],
  [/\bpick[\s-]up\b/i, 'Pickup'], [/\bvan\b/i, 'Van'],
  [/\bminivan\b/i, 'Minivan'], [/\bmpv\b/i, 'MPV'],
  [/\bjeep\b/i, 'SUV'], [/\btruck\b/i, 'Pickup'],
];

// ─── Pakistani number plate pattern ──────────────────────────────────────────
// e.g. LHR-2023, LEA-123, RIF-1234, ABC-12D
const REG_RE = /\b([A-Z]{2,4}[-\s]?\d{2,5}(?:[-\s]?[A-Z]{1,3})?)\b/;

// ─── Lakh/crore/million price normaliser ─────────────────────────────────────
function parsePrice(text: string): number | undefined {
  // e.g. 18.5M, 18.5 million
  const mM = text.match(/(?:demand|price|asking|pkr|rs\.?|cost)?\s*([0-9][0-9,.]*)[\s]*(?:million|m)\b/i);
  if (mM) return parseFloat(mM[1].replace(/,/g, '')) * 1_000_000;

  // e.g. 85 lakh, 8.5 lac, 85L (but not 85L meaning litre — context check)
  const mL = text.match(/([0-9][0-9,.]*)[\s]*(?:lakh|lac|lacs|lakhs)\b/i);
  if (mL) return parseFloat(mL[1].replace(/,/g, '')) * 100_000;

  // e.g. 1.2 crore, 1cr
  const mC = text.match(/([0-9][0-9,.]*)[\s]*(?:crore?|cr)\b/i);
  if (mC) return parseFloat(mC[1].replace(/,/g, '')) * 10_000_000;

  // e.g. PKR 4,500,000 or price: 4500000
  const mP = text.match(/(?:demand|price|asking|pkr|rs\.?)[\s:]*([0-9][0-9,.]{4,})/i);
  if (mP) return parseFloat(mP[1].replace(/,/g, ''));

  // bare large number 7-digit+
  const mBare = text.match(/\b([0-9]{1,3}(?:,[0-9]{3}){2,})\b/);
  if (mBare) return parseFloat(mBare[1].replace(/,/g, ''));

  return undefined;
}

// ─── Main parse function ──────────────────────────────────────────────────────
function parseSpec(raw: string): ParsedSpec {
  const t = raw.trim();
  const result: ParsedSpec = {};

  // ── Year(s): detect all 4-digit years, first is model year, second is reg year
  const allYears = [...t.matchAll(/\b((?:19|20)\d{2})\b/g)].map(m => parseInt(m[1]));
  const validYears = allYears.filter(y => y >= 1950 && y <= new Date().getFullYear() + 2);
  if (validYears.length > 0) result.model_year = validYears[0];
  if (validYears.length > 1 && validYears[1] !== validYears[0]) result.registration_year = validYears[1];

  // Explicit reg year label overrides
  const regYearMatch = t.match(/\breg(?:istration)?[\s:]*year[\s:]*((19|20)\d{2})\b/i)
    || t.match(/\b((19|20)\d{2})\s*(?:reg(?:istered)?|model)\b/i);
  if (regYearMatch) result.registration_year = parseInt(regYearMatch[1]);

  // ── Mileage: "42000 km", "42,000 km", "42k km", "42 thousand km"
  const mileMatch = t.match(/(\d[\d,.]*)\s*k\s*(?:km|kms|kilometers?)\b/i)
    || t.match(/(\d[\d,.]*)\s*(?:thousand)\s*(?:km|kms)?\b/i);
  if (mileMatch) {
    result.mileage = parseFloat(mileMatch[1].replace(/,/g, '')) * 1000;
  } else {
    const m2 = t.match(/(\d[\d,]+)\s*(?:km|kms|kilometers?)\b/i);
    if (m2) result.mileage = parseInt(m2[1].replace(/,/g, ''));
  }

  // ── Price
  const price = parsePrice(t);
  if (price !== undefined) result.expected_selling_price = price;

  // ── Color (ordered: long phrases first)
  for (const [re, name] of COLOR_ALIASES) {
    if (re.test(t)) { result.color = name; break; }
  }

  // ── Transmission
  if (/\bauto(?:matic)?\b/i.test(t)) result.transmission = 'Automatic';
  else if (/\bcvt\b/i.test(t)) result.transmission = 'CVT';
  else if (/\bmanual\b/i.test(t)) result.transmission = 'Manual';

  // ── Fuel type (check hybrid before electric/petrol)
  if (/\bplug[\s-]?in\s+hybrid\b|\bphev\b/i.test(t)) result.fuel_type = 'PHEV';
  else if (/\bfull\s+hybrid\b|\bself[\s-]?charging\s+hybrid\b|\bhybrid\b/i.test(t)) result.fuel_type = 'Hybrid';
  else if (/\bfully?\s+electric\b|\bev\b|\belectric\b/i.test(t)) result.fuel_type = 'Electric';
  else if (/\bdiesel\b/i.test(t)) result.fuel_type = 'Diesel';
  else if (/\bcng\b/i.test(t)) result.fuel_type = 'CNG';
  else if (/\bpetrol\b|\bgasoline\b|\bgas\b/i.test(t)) result.fuel_type = 'Petrol';

  // ── Engine capacity: "1800cc", "1.8L", "2.0 litre", "1496cc", "660 cc"
  const engMatch = t.match(/\b(\d{3,4})\s*cc\b/i)
    || t.match(/\b([0-9]\.[0-9]{1,2})\s*(?:litr(?:e|es)|l)\b/i)
    || t.match(/\b([0-9]\.[0-9]{1,2})\s*(?:litr(?:e|es)|l)?\s+(?:vtec|vvt|dohc|sohc|turbo|diesel)/i);
  if (engMatch) {
    const val = engMatch[1];
    const raw0 = engMatch[0].toLowerCase();
    if (raw0.includes('cc')) result.engine_capacity = val + 'cc';
    else result.engine_capacity = val + 'L';
  }

  // ── Drive type
  if (/\b4wd\b|\b4x4\b|\ball[\s-]?wheel[\s-]?drive\b|\bawd\b/i.test(t)) result.drive_type = '4WD';
  else if (/\b2wd\b|\b4x2\b|\brwd\b|\bfwd\b|\bfront[\s-]?wheel\b|\brear[\s-]?wheel\b/i.test(t)) {
    result.drive_type = /\bfwd\b|\bfront/i.test(t) ? 'FWD' : 'RWD';
  }

  // ── Body type
  for (const [re, type] of BODY_TYPE_MAP) {
    if (re.test(t)) { result.body_type = type; break; }
  }

  // ── Registration number (Pakistan plate)
  const regMatch = t.match(REG_RE);
  if (regMatch && regMatch[0].length > 4 && !/^\d/.test(regMatch[0])) {
    result.registration_number = regMatch[0].replace(/\s+/g, '-').toUpperCase();
  }

  // ── City
  for (const city of PK_CITIES) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(t)) { result.dealer_city = city; break; }
  }

  // ── Make + Model (longest model name wins to avoid partial matches)
  let bestMake = '';
  let bestModel = '';
  let bestModelLen = 0;

  for (const [make, models] of Object.entries(MAKES)) {
    // Try both exact make and common alias
    const makeVariants = [make];
    if (make === 'Mercedes-Benz') makeVariants.push('Mercedes', 'Benz');
    if (make === 'Land Rover') makeVariants.push('Landrover');
    if (make === 'Range Rover') makeVariants.push('RangeRover');

    const makeFound = makeVariants.some(mv => new RegExp(`\\b${mv.replace(/[-\s]/g, '[\\s-]?')}\\b`, 'i').test(t));
    if (!makeFound) continue;

    if (!bestMake) bestMake = make;

    for (const model of models) {
      const escaped = model.replace(/[-\s.]/g, '[\\s\\-.]?');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(t) && model.length > bestModelLen) {
        bestMake = make;
        bestModel = model;
        bestModelLen = model.length;
      }
    }
  }

  if (bestMake) result.make = bestMake === 'Mercedes' ? 'Mercedes-Benz' : bestMake;
  if (bestModel) result.model = bestModel;

  // ── Variant
  const variantMatch = t.match(VARIANT_RE);
  if (variantMatch) result.variant = variantMatch[0].replace(/\s+/g, ' ').toUpperCase();

  // ── Generation hints: "8th gen", "11th generation", "E210" etc.
  const genMatch = t.match(/\b(\d+(?:st|nd|rd|th)\s*gen(?:eration)?)\b/i)
    || t.match(/\b([A-Z][0-9]{2,3})\b/);
  if (genMatch) result.generation = genMatch[1];

  return result;
}

// ─── Field label formatting ───────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  make: 'Make', model: 'Model', variant: 'Variant', generation: 'Generation',
  model_year: 'Model Year', registration_year: 'Reg Year',
  color: 'Color', mileage: 'Mileage (km)', expected_selling_price: 'Demand Price',
  transmission: 'Transmission', fuel_type: 'Fuel Type', engine_capacity: 'Engine',
  registration_number: 'Reg No.', dealer_city: 'City',
  body_type: 'Body Type', drive_type: 'Drive Type',
};

export default function AISpecParser({ open, onClose, onApply }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);

  const handleParse = () => setParsed(parseSpec(text));

  const handleApply = () => {
    if (parsed) { onApply(parsed); onClose(); }
  };

  const fieldCount = parsed ? Object.values(parsed).filter(v => v !== undefined).length : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-lg p-0 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">AI Spec Generator</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste any vehicle description — ad text, WhatsApp message, or spec sheet — and fields will be auto-detected.
          </p>
          <Textarea
            value={text}
            onChange={e => { setText(e.target.value); setParsed(null); }}
            placeholder={`Examples:\nToyota Prado TXL 2022 Black 42000 KM Demand 18.5M\nHonda Civic VTi Oriel 1.8 Auto 2021 Silver 28k km PKR 4,850,000 Lahore\nKia Sportage AWD 2023 White 15,000 km 9.8M\nBMW X5 M Sport 3.0L Diesel 2020 Gunmetal`}
            className="min-h-[110px] text-sm bg-muted/50 border-border resize-none"
          />
          <Button size="sm" onClick={handleParse} disabled={!text.trim()} className="w-full text-xs h-8">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Parse Spec
          </Button>

          {parsed && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">Detected Fields</span>
                <Badge className={`text-[10px] border ${fieldCount > 0 ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-muted text-muted-foreground border-border'}`}>
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''} found
                </Badge>
              </div>

              {fieldCount === 0 ? (
                <div className="flex items-start gap-2 py-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>No fields detected. Try including make/model, year, price, or mileage.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(parsed).map(([k, v]) =>
                    v != null ? (
                      <div key={k} className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground shrink-0">{FIELD_LABELS[k] ?? k.replace(/_/g, ' ')}:</span>
                        <span className="text-foreground font-medium truncate">
                          {k === 'expected_selling_price'
                            ? Number(v).toLocaleString()
                            : k === 'mileage'
                              ? Number(v).toLocaleString() + ' km'
                              : String(v)}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 border-border text-xs h-8">Cancel</Button>
          <Button size="sm" onClick={handleApply} disabled={!parsed || fieldCount === 0} className="flex-1 text-xs h-8">
            <ChevronRight className="w-3.5 h-3.5 mr-1" />Apply to Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
