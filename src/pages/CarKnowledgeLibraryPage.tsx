import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen, AlertTriangle, Zap, Radio, Shield, Settings, Battery,
  Gauge, Wrench, FileText, Search, ChevronRight, ChevronDown, Info, Car,
  TrendingUp, DollarSign, Globe, Package, BarChart3, Eye, Star,
  Cpu, Activity, Map, Layers, Hammer, CheckCircle2, XCircle, Users,
  Calendar, Paintbrush,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const WARNING_LIGHTS = [
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Engine Warning (MIL)', meaning:'Engine management fault — possible misfire, sensors, emissions', action:'Stop safely, read OBD codes immediately. Do not drive long distance.' },
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Oil Pressure Warning', meaning:'Low engine oil pressure — oil starvation risk', action:'STOP IMMEDIATELY. Turn off engine. Check oil level. Do not restart until resolved.' },
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Battery / Charging System', meaning:'Alternator not charging or battery failing', action:'Turn off all non-essential electrics. Drive to nearest workshop immediately.' },
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Brake System Warning', meaning:'Low brake fluid, brake failure, or ABS fault', action:'Pump brakes gently. Pull over safely. DO NOT drive until inspected.' },
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Coolant Temperature', meaning:'Engine overheating', action:'Pull over, turn off AC, turn on heater. If gauge red — stop immediately, wait 30 min.' },
  { severity:'critical', color:'bg-red-500', text:'text-red-400', symbol:'🔴', name:'Airbag / SRS Fault', meaning:'Airbag system malfunction — airbags may not deploy', action:'Have SRS system scanned at authorized dealer urgently.' },
  { severity:'warning', color:'bg-amber-500', text:'text-amber-400', symbol:'🟡', name:'TPMS (Tyre Pressure)', meaning:'One or more tyres below recommended pressure', action:'Check all 4 tyres with gauge. Inflate to vehicle placard spec.' },
  { severity:'warning', color:'bg-amber-500', text:'text-amber-400', symbol:'🟡', name:'ABS Warning', meaning:'Anti-lock Brake System fault', action:'Normal braking still works. Avoid hard stops. Get scanned soon.' },
  { severity:'warning', color:'bg-amber-500', text:'text-amber-400', symbol:'🟡', name:'VSC / ESC / Stability Control', meaning:'Vehicle stability system fault', action:'Drive carefully, avoid sharp maneuvers. Get scanned within a week.' },
  { severity:'warning', color:'bg-amber-500', text:'text-amber-400', symbol:'🟡', name:'Power Steering Warning', meaning:'EPS (Electric Power Steering) fault', action:'Steering will be heavier. Drive slowly to workshop.' },
  { severity:'warning', color:'bg-amber-500', text:'text-amber-400', symbol:'🟡', name:'Fuel Level Low', meaning:'Less than ~10L remaining', action:'Refuel immediately. Running dry can damage fuel pump.' },
  { severity:'info', color:'bg-blue-500', text:'text-blue-400', symbol:'🔵', name:'Service Due / Maintenance Reminder', meaning:'Scheduled service interval reached', action:'Book service appointment within 500km.' },
  { severity:'info', color:'bg-blue-500', text:'text-blue-400', symbol:'🔵', name:'Door / Boot Ajar', meaning:'A door, bonnet, or boot is not fully closed', action:'Pull over safely and check all doors.' },
  { severity:'info', color:'bg-blue-500', text:'text-blue-400', symbol:'🔵', name:'4WD Engaged', meaning:'Four-wheel drive mode active', action:'Normal in off-road. On tarmac at high speed — switch to 2WD.' },
];

const POWERTRAIN_TYPES = [
  { type:'HEV', full:'Hybrid Electric Vehicle', color:'text-green-400 bg-green-500/10 border-green-500/20', pros:['Excellent fuel economy','No range anxiety','Self-charging — no plug needed','Lower running costs'], cons:['Small EV-only range','Battery adds weight','Higher initial cost'], examples:'Toyota Prius, Aqua, Corolla HEV, Honda Insight', battery:'1.3–2.0 kWh NiMH or Li-ion' },
  { type:'PHEV', full:'Plug-in Hybrid Electric Vehicle', color:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', pros:['20–60 km EV-only range','Best of both worlds','Lower fuel bills if charged daily'], cons:['Heavier than HEV','Must be plugged in for benefit','Complex drivetrain'], examples:'Toyota Prius Prime, Mitsubishi Outlander PHEV, BMW 3 series PHEV', battery:'10–25 kWh Li-ion' },
  { type:'BEV', full:'Battery Electric Vehicle', color:'text-blue-400 bg-blue-500/10 border-blue-500/20', pros:['Zero tailpipe emissions','Lowest running cost','Instant torque'], cons:['Range anxiety','Long charging times','Limited Pakistani infrastructure'], examples:'Tesla Model 3/Y, Hyundai Ioniq 6, BYD Seal', battery:'40–100+ kWh Li-ion / LFP' },
  { type:'REEV / EREV', full:'Range-Extended EV', color:'text-purple-400 bg-purple-500/10 border-purple-500/20', pros:['Large EV range (100-200km)','Petrol generator removes range anxiety','Best city EV'], cons:['Petrol engine still needed','Complex system'], examples:'Li Auto L7/L9 (China), BMW i3 Rex (discontinued)', battery:'40–60 kWh + small ICE generator' },
  { type:'FCEV', full:'Fuel Cell Electric Vehicle', color:'text-rose-400 bg-rose-500/10 border-rose-500/20', pros:['Quick refueling (3 min)','Long range','Zero emissions'], cons:['Hydrogen infrastructure near zero','Very expensive','Not viable in Pakistan'], examples:'Toyota Mirai, Hyundai Nexo', battery:'Hydrogen fuel cells + small buffer battery' },
  { type:'Mild Hybrid (MHEV)', full:'Mild Hybrid', color:'text-amber-400 bg-amber-500/10 border-amber-500/20', pros:['Better fuel economy than ICE','Lower cost than full HEV','No plug needed'], cons:['Cannot drive on electricity alone','Marginal savings'], examples:'Suzuki Ertiga Hybrid, many Euro cars', battery:'48V lithium battery pack' },
];

const TRANSMISSIONS = [
  { type:'AT', full:'Automatic Transmission (Torque Converter)', pros:['Smooth shifts','Reliable','Good for traffic'], cons:['Slight efficiency loss','Higher repair cost'], notes:'Common in JDM cars. Toyota, Honda, Nissan use excellent ATs. Check fluid color and shift smoothness.' },
  { type:'MT', full:'Manual Transmission', pros:['Best driver engagement','Lowest maintenance','Fuel efficient'], cons:['Requires skill','Tiring in city traffic'], notes:'Check clutch bite point. High/low bite = worn clutch. Listen for grinding on shifts.' },
  { type:'CVT', full:'Continuously Variable Transmission', pros:['Excellent fuel economy','Smooth power delivery','Simple design'], cons:['Rubber-band feel','Known to fail in Aqua/Vitz if not maintained','Expensive repair'], notes:'Change CVT fluid every 40,000 km. Slipping/shuddering = warning sign. Toyota/Nissan CVTs generally good.' },
  { type:'DCT', full:'Dual Clutch Transmission', pros:['Fast shifts','Efficient','Sporty feel'], cons:['Jerky at low speed','Complex','Expensive to repair'], notes:'Volkswagen DSG notorious in city traffic. Hyundai/Kia DCTs improved significantly from 2018+.' },
  { type:'AMT', full:'Automated Manual Transmission', pros:['MT efficiency','Affordable','Simple'], cons:['Jerky shifts','Slow response','Not refined'], notes:'Found in budget cars (Suzuki Alto AGS). Fine for occasional use, poor in heavy traffic.' },
  { type:'e-CVT', full:'Electronic CVT (Toyota Hybrid Only)', pros:['No mechanical belts','Seamless power blend','Very efficient'], cons:['Unique to Toyota THS','Not a traditional CVT'], notes:'Toyota THS-II uses planetary gearset. Very reliable if coolant maintained. Not same as conventional CVT.' },
];

const ADAS_FEATURES = [
  { abbr:'PCS', full:'Pre-Collision System', brand:'Toyota Safety Sense', desc:'Detects vehicles/pedestrians ahead, warns then auto-brakes' },
  { abbr:'AEB', full:'Autonomous Emergency Braking', brand:'Universal (multiple brands)', desc:'Automatically applies brakes to avoid or mitigate collision' },
  { abbr:'BSM', full:'Blind Spot Monitor', brand:'Toyota/Lexus/Most OEMs', desc:'Warns when vehicle is in your blind spot during lane change' },
  { abbr:'LKA', full:'Lane Keeping Assist', brand:'Toyota/Honda/Nissan', desc:'Detects lane markings, steers back if drifting unintentionally' },
  { abbr:'LCA', full:'Lane Change Alert', brand:'Volvo/Toyota/Ford', desc:'Monitors side traffic when changing lanes, alerts to fast-approaching vehicles' },
  { abbr:'DRCC', full:'Dynamic Radar Cruise Control', brand:'Toyota', desc:'Adaptive cruise control — maintains safe gap to vehicle ahead' },
  { abbr:'RCTA', full:'Rear Cross Traffic Alert', brand:'Toyota/Lexus/Many OEMs', desc:'Warns of cross traffic when reversing out of a parking space' },
  { abbr:'RSA', full:'Road Sign Assist', brand:'Toyota Safety Sense', desc:'Camera reads speed limit signs and displays on dashboard' },
  { abbr:'ICS', full:'Intelligent Clearance Sonar', brand:'Toyota/Lexus', desc:'Detects obstacles in car parks, reduces throttle, applies brakes' },
  { abbr:'ACC', full:'Adaptive Cruise Control', brand:'Universal', desc:'Maintains set speed + safe following distance automatically' },
  { abbr:'360°', full:'360° Surround View Camera', brand:'Nissan Around View / Toyota', desc:'Birds-eye view of car surroundings for parking assistance' },
  { abbr:'HUD', full:'Head-Up Display', brand:'Various premium', desc:'Projects speed/nav info onto windscreen for eyes-on-road driving' },
];

const HYBRID_SYSTEMS = [
  { brand:'Toyota THS-II', full:'Toyota Hybrid System II', cars:'Prius, Aqua, Corolla, Harrier, RAV4, Alphard, Vellfire, Crown, C-HR', how:'Power-split planetary gearset + motor/generator. ICE + MG1 + MG2 blend seamlessly. No conventional transmission.', reliability:'★★★★★ — Highly reliable. Known to last 300,000+ km with basic maintenance.', weakpoints:'HV battery (replace ~15-20 yrs), inverter coolant flush every 100k km' },
  { brand:'Honda i-MMD', full:'Intelligent Multi-Mode Drive', cars:'Accord Hybrid, CR-V Hybrid, Freed Hybrid, Insight, Odyssey Hybrid', how:'Primarily EV drive with engine acting mainly as generator. 3 modes: EV, Hybrid, Engine Direct.', reliability:'★★★★☆ — Very good. Some early 2019-21 CR-V had EV battery heating issues.', weakpoints:'Not as proven as THS. IMA (older system) had battery failures.' },
  { brand:'Nissan e-Power', full:'e-Power Series Hybrid', cars:'Nissan Note e-Power, Kicks e-Power, Serena e-Power', how:'Engine ONLY drives generator. All drive is electric via motor. Unique EV feel without plug.', reliability:'★★★★☆ — Very good. Engine wear less critical as it runs at optimal RPM.', weakpoints:'Engine revs can be noisy (generating power). Fuel economy less than Toyota THS.' },
  { brand:'Mitsubishi PHEV', full:'Outlander PHEV / Eclipse Cross PHEV', cars:'Outlander PHEV, Eclipse Cross PHEV', how:'Twin motors (front+rear), large battery, twin charger. Can charge from AC or rapid DC. S-AWC system.', reliability:'★★★★☆ — Solid but battery capacity may degrade over time.', weakpoints:'Battery replacement very expensive (PKR 800k-1.5M range). EV range degrades ~20% over 8 years.' },
];

const JDM_TERMS = [
  { jp:'車検', romaji:'Shaken', en:'Vehicle Inspection', ur:'گاڑی کا سرکاری معائنہ' },
  { jp:'走行距離', romaji:'Soko Kyori', en:'Mileage / Odometer reading', ur:'میلیج / کلومیٹر ریڈنگ' },
  { jp:'一般車', romaji:'Ippan-sha', en:'Regular / Standard spec car', ur:'عام درجے کی گاڑی' },
  { jp:'修復歴', romaji:'Shufuku-reki', en:'Repair history / Accident record', ur:'مرمت کی تاریخ' },
  { jp:'走行距離不明', romaji:'Soko Kyori Fumei', en:'Mileage unknown', ur:'میلیج نامعلوم' },
  { jp:'年式', romaji:'Nenshiki', en:'Model Year', ur:'گاڑی کا سال' },
  { jp:'初度登録', romaji:'Shodo Toroku', en:'First Registration Date', ur:'پہلی رجسٹریشن تاریخ' },
  { jp:'自由色', romaji:'Jiyu-shoku', en:'Optional/special color', ur:'خاص رنگ' },
  { jp:'グレード', romaji:'Gure-do', en:'Grade / Trim Level', ur:'گاڑی کا گریڈ' },
  { jp:'無事故', romaji:'Mujiko', en:'No accident / Accident-free', ur:'حادثہ نہیں ہوا' },
  { jp:'禁煙車', romaji:'Kin-en-sha', en:'Non-smoking vehicle', ur:'سگریٹ سے پاک گاڑی' },
  { jp:'デモカー', romaji:'Demo Ka', en:'Demonstrator / Ex-demo car', ur:'ڈیمو گاڑی' },
  { jp:'ワンオーナー', romaji:'Wan Ona', en:'One owner', ur:'ایک مالک' },
  { jp:'整備記録簿', romaji:'Seibi Kiroku-bo', en:'Service history booklet', ur:'سروس ریکارڈ بک' },
  { jp:'抹消証明', romaji:'Massho Shomei', en:'De-registration certificate', ur:'رجسٹریشن منسوخی سرٹیفکیٹ' },
];

const AUCTION_GRADES = [
  { grade:'S', desc:'Brand new or showroom condition. Virtually no scratches.', color:'text-emerald-400' },
  { grade:'5', desc:'Excellent. Light surface marks, no panel damage.', color:'text-emerald-400' },
  { grade:'4.5', desc:'Very good. Few minor scratches/dents.', color:'text-green-400' },
  { grade:'4', desc:'Good. Normal wear, minor scratches accepted.', color:'text-green-400' },
  { grade:'3.5', desc:'Average. Some repairs done or needed.', color:'text-yellow-400' },
  { grade:'3', desc:'Fair condition. Multiple minor damages or one moderate damage.', color:'text-yellow-400' },
  { grade:'2', desc:'Rough condition. Multiple visible damages.', color:'text-orange-400' },
  { grade:'1', desc:'Poor. Significant damage, major repairs needed.', color:'text-red-400' },
  { grade:'R', desc:'Repaired: major accident damage repaired but declared.', color:'text-red-500' },
  { grade:'RA', desc:'Repaired + Airbag deployment.', color:'text-red-500' },
  { grade:'***', desc:'Engine, chassis, or mileage tamper suspected.', color:'text-red-600' },
];

const TYRE_GUIDE = [
  { size:'175/70 R13', models:'Suzuki Alto, Mehran',          pressure:'30-32 PSI front / 30-32 rear' },
  { size:'185/65 R15', models:'Toyota Aqua, Vitz (3rd gen)',  pressure:'33-35 PSI front / 33-35 rear' },
  { size:'195/65 R15', models:'Honda Fit, Toyota Axio',       pressure:'33-35 PSI front / 35 rear' },
  { size:'205/65 R16', models:'Toyota Corolla (E210), Honda Civic', pressure:'34-36 PSI front / 34-36 rear' },
  { size:'215/65 R16', models:'Honda HRV, Toyota C-HR',       pressure:'35-36 PSI front / 33-34 rear' },
  { size:'225/65 R17', models:'Toyota RAV4, Harrier, CR-V',   pressure:'36-38 PSI front / 36-38 rear' },
  { size:'235/60 R18', models:'Toyota Land Cruiser Prado',    pressure:'38-40 PSI front / 40-42 rear (loaded)' },
  { size:'265/70 R17', models:'Toyota Land Cruiser 200/300',  pressure:'38-40 PSI front / 40-42 rear' },
];

const EMISSION_STANDARDS = [
  { std:'Euro 1', yr:'1992+', nox:'–', co:'2.72', hc:'0.97', pm:'0.14', notes:'Very basic. Most pre-2000 cars.' },
  { std:'Euro 2', yr:'1996+', nox:'–', co:'2.20', hc:'0.50', pm:'0.08', notes:'Required for most 2000s JDM.' },
  { std:'Euro 3', yr:'2001+', nox:'0.15', co:'2.30', hc:'0.20', pm:'0.065', notes:'Most 2002-2009 JDM imports.' },
  { std:'Euro 4', yr:'2006+', nox:'0.08', co:'1.00', hc:'0.10', pm:'0.025', notes:'Common in 2010-2014 cars.' },
  { std:'Euro 5', yr:'2011+', nox:'0.06', co:'1.00', hc:'0.10', pm:'0.005', notes:'Most 2015+ JDM. Required in PK for 2019+ new cars.' },
  { std:'Euro 6', yr:'2015+', nox:'0.06', co:'1.00', hc:'0.10', pm:'0.0045', notes:'Latest. 2019+ European cars. Japan follows JC08/WLTC.' },
  { std:'JC08',   yr:'2011+', nox:'–', co:'–', hc:'–', pm:'–', notes:'Japanese city driving test cycle. Used for fuel economy ratings.' },
  { std:'WLTC',   yr:'2018+', nox:'–', co:'–', hc:'–', pm:'–', notes:'More realistic worldwide test. Replaced JC08 from 2018.' },
];

const BODY_TYPES = [
  { type:'Sedan', desc:'3-box design: engine + cabin + boot. Most common JDM import. Best for PKR 40-80 lac range.' },
  { type:'Hatchback', desc:'Boot integrates with cabin. Compact and practical. Toyota Aqua, Vitz, Honda Fit.' },
  { type:'SUV / Crossover', desc:'High ride height, often AWD. Most popular segment globally. RAV4, CRV, Harrier, X-Trail.' },
  { type:'MPV / Minivan', desc:'Multi-purpose. 6-8 seats. Noah, Voxy, Serena, Freed, Odyssey.' },
  { type:'Station Wagon', desc:'Extended hatchback with large boot. Toyota Fielder, Corolla Touring.' },
  { type:'Pickup / Ute', desc:'Cab + open bed. Hilux Revo, Navara, Ranger. High demand in rural/commercial.' },
  { type:'Kei Car', desc:'Japanese mini car. <660cc engine. Alto, Hustler, N-Box. Affordable but underpowered for highways.' },
  { type:'Coupe', desc:'2-door sporty. Limited JDM imports. 86/BRZ, Civic Type R.' },
];

const ENGINE_ARCH = [
  { type:'Inline-4 (I4/L4)', desc:'4 cylinders in a row. Most common in 1.2-2.5L cars. Compact, balanced, efficient. Used in 90% of JDM imports.' },
  { type:'V6', desc:'6 cylinders in V shape. 2.5-3.5L. Smooth power. Camry V6, Odysey, Elysion, Fairlady.' },
  { type:'V8', desc:'8 cylinders. 4.0-5.0L. Land Cruiser 200/300 series, Lexus LS. Powerful but expensive to run.' },
  { type:'Boxer (Flat-4/6)', desc:'Horizontally-opposed. Subaru and Porsche only. Low center of gravity. Unique sound.' },
  { type:'Rotary (Wankel)', desc:'Spinning rotor. Mazda RX-7/RX-8. Revvy, light, unreliable oil use. Not recommended for general use.' },
  { type:'Inline-6 (I6)', desc:'6 cylinders in a row. Silky smooth. BMW, older Supra, Toyota Crown. Great refinement.' },
  { type:'Inline-3 (I3)', desc:'3 cylinder, often turbocharged. 1.0L economy cars and some hybrids. Vibrates at idle.' },
];

const IMPORT_GUIDE_CHINA = [
  { step:1, title:'Select Vehicle in China', desc:'Research on platforms like Car Home (汽车之家), Autohome. Choose make, model, spec. Verify VIN and documentation. Most popular: BYD, Chery, Haval, Changan, MG.' },
  { step:2, title:'Appoint China-side Agent', desc:'Appoint a licensed Chinese export agent (出口商). They handle export certificate, de-registration equivalent, and loading docs.' },
  { step:3, title:'FOB / CIF Price Agreement', desc:'Agree on FOB (you arrange shipping) or CIF (they include Cost+Insurance+Freight). Get pro forma invoice for customs valuation.' },
  { step:4, title:'Shipping', desc:'Cars loaded in containers (1-2 cars/40ft) or RORO vessels. Main ports: Tianjin, Shanghai, Guangzhou to Karachi/Port Qasim.' },
  { step:5, title:'Pakistani Import Documents', desc:'Required: Original invoice, BL (Bill of Lading), Packing List, Origin Certificate, Test Report / Type Approval.' },
  { step:6, title:'Customs Clearance Pakistan', desc:'Pay customs duty (100%+ for non-gifted). Additional Sales Tax, CESS, FED. Hire licensed clearing agent in Karachi.' },
  { step:7, title:'Registration', desc:'Present vehicle + documents to Motor Registration Authority. Pay token tax. Obtain registration book.' },
];

const IMPORT_GUIDE_GERMANY = [
  { step:1, title:'Source in Germany', desc:'Platforms: Mobile.de, AutoScout24, dealer exports. Prefer pre-2016 Euro-5 cars for lower duty. Ensure COC (Certificate of Conformity).' },
  { step:2, title:'Export Agent / Importer', desc:'German agent handles Ausfuhranmeldung (export declaration), deregistration (Abmeldung), and shipping documentation.' },
  { step:3, title:'Shipping to Pakistan', desc:'RORO from Hamburg/Bremerhaven or container. Transit ~30-45 days to Karachi. BL issued from Hamburg.' },
  { step:4, title:'Customs Pakistan', desc:'PCBA/SRO 577 — personal gift scheme allows lower duty. Otherwise commercial rates apply. COC + German registration history required.' },
  { step:5, title:'Registration', desc:'German cars often need headlight conversion (LHD to RHD or waiver). Check with local MRA. German tech popular in upper market.' },
];

const DEALER_WORDS = [
  { word:'Ex-Factory Price', def:'Price of a vehicle direct from manufacturer before dealer markup, transport, and taxes.' },
  { word:'OTR (On The Road)', def:'Total price including registration, taxes, insurance — what customer actually pays to drive away.' },
  { word:'Floor Plan', def:'Dealer financing where bank funds the inventory and dealer pays interest until car is sold.' },
  { word:'Trade-In', def:'Customer exchanges their current vehicle as part payment toward new purchase.' },
  { word:'Gross Profit', def:'Difference between vehicle cost to dealer and sale price to customer.' },
  { word:'Net Profit', def:'Gross profit minus all overheads and expenses for that specific deal.' },
  { word:'Back-End Profit', def:'Profit from add-ons: finance, insurance, accessories — separate from vehicle margin.' },
  { word:'Holdback', def:'Percentage of MSRP that manufacturer pays back to dealer after sale (not disclosed to customer).' },
  { word:'Sticker Price', def:'MSRP posted on window. Starting point for negotiation, not final price.' },
  { word:'Invoice Price', def:'What dealer paid manufacturer. Often close to "dealer cost" but holdbacks reduce true cost.' },
  { word:'Upside Down', def:'Owing more on a finance deal than the car is worth. Negative equity.' },
  { word:'Balloon Payment', def:'Large lump sum payment at end of hire purchase agreement.' },
  { word:'Churning', def:'Selling a customer a new car when old one still has finance owing — rolling debt forward.' },
  { word:'Demo Model', def:'Car used for test drives. Lower price but has dealer-accumulated mileage.' },
  { word:'Book Value', def:'Standardised valuation from guides like CAP/Glass\'s or local PKR-based references.' },
  { word:'Days to Sale', def:'Average number of days a unit sits in stock before being sold — key efficiency metric.' },
  { word:'Turnover Rate', def:'Speed at which inventory is sold and replaced. High = healthy cashflow.' },
  { word:'CSI Score', def:'Customer Satisfaction Index — score given by OEM based on customer survey feedback.' },
];

const VEHICLE_INSPECTION_GUIDE = [
  { cat:'Paint & Exterior', points:['Check paint thickness with gauge (factory: 80-120 microns, repaint: 180-300+)','Panel gaps should be equal — uneven gaps = accident/repair','Look down body from low angle for ripples/waves','Check door edges and boot jambs for overspray','Bolt/fastener marks indicate panel removal'] },
  { cat:'Under Bonnet', points:['Check VIN on chassis matches docs','Look for accident repair to radiator support, front aprons','Check firewall for creases (front-end collision sign)','Engine leaks (oil, coolant) — look below on fresh ground','Check coolant colour — brown = old/contaminated'] },
  { cat:'Under-chassis / Underbody', points:['Check chassis rails for bends, welds, or straightening marks','Floor pan rust or repair patches','Check axle and suspension mounts','Welded seams should be uniform factory welds','Smell and look for flood damage (mud, waterline, rust inside'] },
  { cat:'Interior Condition', points:['Airbag module under steering wheel — ensure not replaced (accident)','Check all electrical functions: windows, mirrors, AC','Smell for flood/fire — musty/burnt smell','Seat rail bolts — undone = airbag deployment seat replacement','Headliner stains or water marks = flood or leak'] },
  { cat:'Tyres & Wheels', points:['Check tread depth with gauge or coin test','Uneven wear = alignment or suspension problem','Check sidewall for bubbles or cracks','All 4 tyres same brand = better maintained vehicle','Check spare tyre condition and jack'] },
  { cat:'Test Drive', points:['Cold start — smooth idle, no smoke','Check brakes: even stopping, no pull','Listen for knocks, rattles, transmission slipping','Check steering — no vibration, centred','AC performance, all gauges normal'] },
];

const COMPETITIVE_COMPARISON = [
  { aspect:'Engine', questions:['Displacement, cylinder count, DOHC/SOHC?','Turbo or NA? Which type?','Variable valve timing?','Known failure points?'] },
  { aspect:'Transmission', questions:['AT, CVT, DCT, or MT?','Known issues in this specific model?','Fluid change interval?'] },
  { aspect:'Fuel Economy', questions:['Real-world PKR per km?','City vs highway difference?','JC08 vs WLTC rating?'] },
  { aspect:'Safety', questions:['NCAP rating? Year tested?','Standard or optional ADAS?','Airbag count?','ESC standard?'] },
  { aspect:'Reliability', questions:['Long-term ownership reports?','Parts availability in Pakistan?','Workshop availability?','Known Toyota-level reliability or problematic?'] },
  { aspect:'Total Cost of Ownership', questions:['Purchase price?','Annual insurance?','Service cost per km?','Parts/consumables PKR?','Expected depreciation curve?'] },
];

// ─── Components ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Search this section…" className="pl-9 h-9 text-sm" />
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn('border-border', className)}><CardContent className="p-4">{children}</CardContent></Card>;
}

// ─── Tab content components ───────────────────────────────────────────────────

function WarningLightsTab() {
  const [q, setQ] = useState('');
  const items = q ? WARNING_LIGHTS.filter(w => w.name.toLowerCase().includes(q.toLowerCase()) || w.meaning.toLowerCase().includes(q.toLowerCase())) : WARNING_LIGHTS;
  const crit = items.filter(w => w.severity === 'critical');
  const warn = items.filter(w => w.severity === 'warning');
  const info = items.filter(w => w.severity === 'info');
  const groups = [{ label:'🔴 CRITICAL — Stop Immediately', items:crit, hdr:'bg-red-500/10 border-red-500/20' }, { label:'🟡 WARNING — Attend Soon', items:warn, hdr:'bg-amber-500/10 border-amber-500/20' }, { label:'🔵 INFORMATION — Attention Required', items:info, hdr:'bg-blue-500/10 border-blue-500/20' }];
  return (
    <div className="space-y-4">
      <SearchBar value={q} onChange={setQ} />
      {groups.map(g => g.items.length > 0 && (
        <div key={g.label}>
          <div className={cn('px-3 py-2 rounded-t-lg border text-xs font-bold mb-0', g.hdr)}>{g.label}</div>
          <div className="border border-t-0 border-border rounded-b-lg overflow-hidden divide-y divide-border">
            {g.items.map((w, i) => (
              <div key={i} className="px-3 py-3 bg-card hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{w.symbol}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.meaning}</p>
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-primary">{w.action}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PowertrainTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POWERTRAIN_TYPES.map((pt, i) => (
          <SectionCard key={i} className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={pt.color}>{pt.type}</Badge>
              <span className="text-xs text-muted-foreground">{pt.full}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2"><span className="font-semibold text-foreground">Battery:</span> {pt.battery}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 mb-1">✓ Pros</p>
                {pt.pros.map((p, j) => <p key={j} className="text-xs text-muted-foreground">• {p}</p>)}
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-400 mb-1">✗ Cons</p>
                {pt.cons.map((c, j) => <p key={j} className="text-xs text-muted-foreground">• {c}</p>)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold text-foreground">Examples:</span> {pt.examples}</p>
          </SectionCard>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <p className="text-sm font-bold text-foreground">Hybrid System Deep-Dive</p>
        {HYBRID_SYSTEMS.map((h, i) => (
          <SectionCard key={i}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-foreground">{h.brand}</p>
                <p className="text-xs text-muted-foreground">{h.cars}</p>
              </div>
              <span className="text-sm">{h.reliability}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{h.how}</p>
            <p className="text-xs text-amber-400 mt-1.5 flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0"/>Weak points: {h.weakpoints}</p>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function TransmissionsTab() {
  return (
    <div className="space-y-3">
      {TRANSMISSIONS.map((t, i) => (
        <SectionCard key={i}>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 font-mono font-black">{t.type}</Badge>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{t.full}</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">✓ Pros</p>
                  {t.pros.map((p, j) => <p key={j} className="text-xs text-muted-foreground">• {p}</p>)}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-400 mb-1">✗ Cons</p>
                  {t.cons.map((c, j) => <p key={j} className="text-xs text-muted-foreground">• {c}</p>)}
                </div>
              </div>
              <p className="text-xs text-primary/80 mt-2 flex items-start gap-1"><Info className="w-3 h-3 mt-0.5 shrink-0"/>{t.notes}</p>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function AdasTab() {
  const [q, setQ] = useState('');
  const items = q ? ADAS_FEATURES.filter(a => a.abbr.toLowerCase().includes(q.toLowerCase()) || a.full.toLowerCase().includes(q.toLowerCase()) || a.brand.toLowerCase().includes(q.toLowerCase())) : ADAS_FEATURES;
  return (
    <div>
      <SearchBar value={q} onChange={setQ} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((a, i) => (
          <div key={i} className="border border-border rounded-xl bg-card p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono font-black text-primary border-primary/30">{a.abbr}</Badge>
              <span className="text-xs text-muted-foreground">{a.brand}</span>
            </div>
            <p className="font-semibold text-sm text-foreground">{a.full}</p>
            <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function JdmTermsTab() {
  const [q, setQ] = useState('');
  const items = q ? JDM_TERMS.filter(t => t.jp.includes(q) || t.romaji.toLowerCase().includes(q.toLowerCase()) || t.en.toLowerCase().includes(q.toLowerCase())) : JDM_TERMS;
  return (
    <div>
      <SearchBar value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left text-xs font-bold text-muted-foreground pb-2 pr-4 whitespace-nowrap">Japanese</th>
            <th className="text-left text-xs font-bold text-muted-foreground pb-2 pr-4 whitespace-nowrap">Romaji</th>
            <th className="text-left text-xs font-bold text-muted-foreground pb-2 pr-4 whitespace-nowrap">English</th>
            <th className="text-left text-xs font-bold text-muted-foreground pb-2 whitespace-nowrap">اردو</th>
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {items.map((t, i) => (
              <tr key={i} className={i%2===0?'bg-transparent':'bg-muted/20'}>
                <td className="py-2 pr-4 font-bold text-primary">{t.jp}</td>
                <td className="py-2 pr-4 text-xs font-mono text-muted-foreground">{t.romaji}</td>
                <td className="py-2 pr-4 text-xs text-foreground">{t.en}</td>
                <td className="py-2 text-xs text-amber-300/80 font-medium" style={{direction:'rtl'}}>{t.ur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuctionGradesTab() {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            {['Grade','Description','Indication'].map(h=><th key={h} className="text-left text-xs font-bold text-muted-foreground pb-2 pr-6 whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {AUCTION_GRADES.map((g, i) => (
              <tr key={i} className={i%2===0?'bg-transparent':'bg-muted/20'}>
                <td className={cn('py-2.5 pr-6 font-black text-lg tabular-nums', g.color)}>{g.grade}</td>
                <td className="py-2.5 pr-6 text-xs text-foreground">{g.desc}</td>
                <td className="py-2.5 text-xs text-muted-foreground">{g.grade==='S'||g.grade==='5'?'✅ Buy with confidence':g.grade==='4.5'||g.grade==='4'?'✅ Good choice, inspect':g.grade==='3.5'||g.grade==='3'?'⚠️ Inspect carefully, price accordingly':g.grade==='2'||g.grade==='1'?'❌ Parts only or project car':'🚨 Declare to customer — affects resale value'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionCard>
        <p className="text-sm font-bold mb-2">Interior Grade</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {['A — Excellent (like new)','B — Good (minor wear)','C — Average (visible wear)','D — Below average','E — Rough'].map((g,i)=>(
            <div key={i} className="text-xs p-2 bg-muted/30 rounded-lg border border-border">{g}</div>
          ))}
        </div>
      </SectionCard>
      <SectionCard>
        <p className="text-sm font-bold mb-2">Auction Repair Codes (on sheet)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[['A','Scratch'],['B','Dent'],['C','Scratch + Dent'],['E','Corrosion / Rust'],['U','Wave / Undulation'],['W','Require Repair'],['X','Replace Panel'],['XX','Already Replaced'],['S','Repaint'],['R','Rust']].map(([code,def])=>(
            <div key={code} className="flex items-center gap-2 text-xs p-2 bg-muted/20 rounded-lg border border-border">
              <span className="font-black text-primary w-6">{code}</span>
              <span className="text-muted-foreground">{def}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function TyreGuideTab() {
  return (
    <div className="space-y-4">
      <SectionCard>
        <p className="font-bold text-sm mb-2">How to Read a Tyre Size</p>
        <div className="font-mono text-xl font-black text-center text-primary tracking-wider p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">205 / 65 R 16</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[['205','Section width in mm'],['65','Aspect ratio (sidewall height as % of width)'],['R','Radial construction'],['16','Rim diameter in inches']].map(([v,d])=>(
            <div key={v} className="text-center p-2 bg-muted/30 rounded-lg border border-border">
              <p className="font-black text-primary text-lg">{v}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{d}</p>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard>
        <p className="font-bold text-sm mb-2">Load & Speed Rating Guide</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">Common Load Indices</p>
            {[['82','475 kg per tyre'],['87','545 kg'],['91','615 kg'],['95','690 kg'],['99','775 kg'],['103','875 kg']].map(([i,l])=><div key={i} className="flex justify-between text-xs py-0.5"><span className="font-mono font-bold text-primary">{i}</span><span className="text-muted-foreground">{l}</span></div>)}
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">Speed Ratings</p>
            {[['H','210 km/h'],['V','240 km/h'],['W','270 km/h'],['Y','300 km/h'],['T','190 km/h'],['S','180 km/h']].map(([r,s])=><div key={r} className="flex justify-between text-xs py-0.5"><span className="font-mono font-bold text-primary">{r}</span><span className="text-muted-foreground">{s}</span></div>)}
          </div>
        </div>
      </SectionCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">{['Tyre Size','Common Models','Recommended Pressure'].map(h=><th key={h} className="text-left text-xs font-bold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/50">
            {TYRE_GUIDE.map((t,i)=>(
              <tr key={i} className={i%2===0?'bg-transparent':'bg-muted/20'}>
                <td className="py-2 pr-4 font-mono font-bold text-primary whitespace-nowrap">{t.size}</td>
                <td className="py-2 pr-4 text-xs text-foreground">{t.models}</td>
                <td className="py-2 text-xs text-amber-400 font-medium whitespace-nowrap">{t.pressure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmissionsTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border">{['Standard','Since','NOx g/km','CO g/km','HC g/km','PM g/km','Notes'].map(h=><th key={h} className="text-left text-xs font-bold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border/50">
          {EMISSION_STANDARDS.map((e,i)=>(
            <tr key={i} className={i%2===0?'bg-transparent':'bg-muted/20'}>
              <td className="py-2 pr-4 font-bold text-primary">{e.std}</td>
              <td className="py-2 pr-4 text-xs text-muted-foreground">{e.yr}</td>
              <td className="py-2 pr-4 text-xs">{e.nox}</td>
              <td className="py-2 pr-4 text-xs">{e.co}</td>
              <td className="py-2 pr-4 text-xs">{e.hc}</td>
              <td className="py-2 pr-4 text-xs">{e.pm}</td>
              <td className="py-2 text-xs text-muted-foreground">{e.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenericListTab({ items, fields }: { items: Record<string,string>[]; fields: { key:string; label:string; primary?:boolean }[] }) {
  const [q, setQ] = useState('');
  const filtered = q ? items.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(q.toLowerCase()))) : items;
  return (
    <div>
      <SearchBar value={q} onChange={setQ} />
      <div className="space-y-2">
        {filtered.map((item,i)=>(
          <div key={i} className={cn('border border-border rounded-xl p-3 transition-colors', i%2===0?'bg-card':'bg-muted/20')}>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {fields.map(f=>(
                <div key={f.key}>
                  {f.primary ? <p className={cn('font-bold text-sm', 'text-primary')}>{item[f.key]}</p>
                    : <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{f.label}:</span> {item[f.key]}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionTab() {
  const [open, setOpen] = useState<string|null>(null);
  return (
    <div className="space-y-3">
      {VEHICLE_INSPECTION_GUIDE.map((cat,i)=>(
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button onClick={()=>setOpen(open===cat.cat?null:cat.cat)} className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left">
            <span className="font-bold text-sm text-foreground">{cat.cat}</span>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', open===cat.cat&&'rotate-90')}/>
          </button>
          {open===cat.cat&&(
            <div className="px-4 pb-3 border-t border-border bg-muted/10 space-y-1.5 pt-3">
              {cat.points.map((p,j)=>(
                <div key={j} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"/>
                  <span className="text-foreground">{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ImportGuideTab() {
  const [country, setCountry] = useState<'japan'|'china'|'germany'>('japan');
  const guides: Record<string, typeof IMPORT_GUIDE_CHINA> = {
    japan: [
      { step:1, title:'Source the Vehicle (Japan)', desc:'Use auction platforms: USS, TAA, JU, CAA, AUCNET. Or buy from dealer. Get auction sheet. Verify grade, mileage, repair marks.' },
      { step:2, title:'Bid / Purchase', desc:'Place bid via Pakistan import agent or direct registered member. Confirm purchase, pay auction price + auction fees.' },
      { step:3, title:'Export Documentation', desc:'Seller/agent arranges: Export Certificate (輸出証明書), de-registration, and loading. Get copy of all docs.' },
      { step:4, title:'Shipping to Pakistan', desc:'RORO (Roll-On Roll-Off) from Nagoya/Osaka/Yokohama to Karachi Port or Port Qasim. Transit: 18-25 days typically.' },
      { step:5, title:'Arrival & Port Clearance', desc:'Appoint licensed clearing agent. Submit: BL, Export Certificate, Invoice, Packing List. Pay customs duty per SRO.' },
      { step:6, title:'Customs Duty Calculation', desc:'Engine capacity-based duty. 660cc kei: ~50-70%. 1000-1300cc: ~70-85%. 1500-1800cc: ~85-100%. Additional GST, FED, CESS.' },
      { step:7, title:'Registration', desc:'Visit MRA/Excise with all cleared docs. Pay token tax. Obtain registration number. Keep original import docs safely.' },
    ],
    china: IMPORT_GUIDE_CHINA,
    germany: IMPORT_GUIDE_GERMANY,
  };
  const steps = guides[country];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['japan','china','germany'] as const).map(c=>(
          <button key={c} onClick={()=>setCountry(c)} className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors', country===c?'bg-primary/15 border-primary/30 text-primary':'border-border text-muted-foreground')}>{c==='japan'?'🇯🇵 Japan':c==='china'?'🇨🇳 China':'🇩🇪 Germany'}</button>
        ))}
      </div>
      <div className="space-y-3">
        {steps.map((s,i)=>(
          <div key={i} className="flex gap-4 border border-border rounded-xl p-3 bg-card">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 font-black text-primary text-sm">{s.step}</div>
            <div><p className="font-bold text-sm text-foreground">{s.title}</p><p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitiveTab() {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
        <p className="font-bold text-foreground mb-1">Expert Comparison Framework</p>
        <p className="text-xs text-muted-foreground">Use this framework to systematically compare any two vehicles across all dimensions that matter to Pakistani buyers.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COMPETITIVE_COMPARISON.map((cat,i)=>(
          <SectionCard key={i}>
            <p className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary"/>{cat.aspect}</p>
            {cat.questions.map((q,j)=>(
              <div key={j} className="flex items-start gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0"/><span className="text-muted-foreground">{q}</span>
              </div>
            ))}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

// ─── 8 New Tab Components ─────────────────────────────────────────────────────

const FLUID_DATA = [
  { fluid:'Engine Oil', dipstick:'Usually yellow ring, near front of engine', min_max:'Between MIN and MAX marks', color_ok:'Amber/golden', color_bad:'Black sludge / milky (HG failure)', interval:'Every 5,000–10,000 km', notes:'Check cold, on flat surface. Top up with correct spec (5W-30, 0W-20 etc.)' },
  { fluid:'Coolant / Antifreeze', dipstick:'Translucent reservoir near radiator', min_max:'Between LOW and FULL', color_ok:'Green / blue / orange', color_bad:'Brown / rusty / oily film', interval:'Flush every 2 years or 40,000 km', notes:'Never open cap when hot. Use distilled water + correct coolant ratio.' },
  { fluid:'Brake Fluid', dipstick:'Small reservoir on brake master cylinder', min_max:'Between MIN and MAX', color_ok:'Clear to pale yellow', color_bad:'Dark brown / black', interval:'Replace every 2 years regardless', notes:'Hygroscopic — absorbs moisture. Low level = worn pads OR leak.' },
  { fluid:'Power Steering Fluid', dipstick:'Reservoir near pump (if hydraulic)', min_max:'MIN/MAX lines', color_ok:'Clear / light red', color_bad:'Dark, foamy, milky', interval:'Check every 30,000 km', notes:'Many modern cars have electric steering — no fluid needed.' },
  { fluid:'Transmission Fluid (AT)', dipstick:'Long dipstick at rear of engine (some sealed)', min_max:'COLD and HOT range markings', color_ok:'Red / pink', color_bad:'Dark brown / burnt smell', interval:'30,000–60,000 km (check OEM)', notes:'Some transmissions are "sealed for life" but still benefit from changes.' },
  { fluid:'Windscreen Washer Fluid', dipstick:'Large blue reservoir', min_max:'Keep near full', color_ok:'Blue / any', color_bad:'N/A', interval:'Top up as needed', notes:'Use proper washer fluid — plain water freezes and grows bacteria.' },
];

const NCAP_DATA = [
  { org:'Euro NCAP', region:'Europe', website:'euroncap.com', stars:'5-star max', categories:['Adult Occupant', 'Child Occupant', 'Vulnerable Road Users', 'Safety Assist'], notes:'Most rigorous globally. Tests from 2022 include night-time pedestrian AEB.' },
  { org:'ANCAP', region:'Australia / NZ', website:'ancap.com.au', stars:'5-star max', categories:['Adult Occupant', 'Child Occupant', 'Pedestrian', 'Safety Assist'], notes:'Aligned with Euro NCAP protocols since 2011.' },
  { org:'NHTSA', region:'USA', website:'nhtsa.gov', stars:'5-star max', categories:['Frontal Crash', 'Side Crash', 'Rollover'], notes:'Separate from IIHS. Uses different test speeds and methods.' },
  { org:'IIHS', region:'USA', website:'iihs.org', stars:'Good / Acceptable / Marginal / Poor', categories:['Small Overlap Front', 'Moderate Overlap', 'Side', 'Roof Strength', 'Head Restraints', 'Headlights'], notes:'Adds Top Safety Pick / TSP+ awards. Often stricter than NHTSA on small overlap.' },
  { org:'JNCAP', region:'Japan', website:'nasva.go.jp', stars:'5-star max', categories:['Occupant Protection', 'Pedestrian Protection', 'Preventive Safety'], notes:'Japanese domestic market focus. Many JDM imports have JNCAP ratings.' },
  { org:'C-NCAP', region:'China', website:'c-ncap.org.cn', stars:'5-star max', categories:['Occupant', 'Pedestrian', 'Active Safety'], notes:'Less demanding than Euro NCAP historically but improving since 2021.' },
];

const COMMON_FAULTS = [
  { model:'Toyota Prius (2004–2009)', fault:'Inverter coolant pump failure', symptom:'Triangle warning light, overheating hybrid system', fix:'Replace inverter water pump (~$200–400)', severity:'High' },
  { model:'Toyota Prius (2004–2009)', fault:'Failing high-voltage battery', symptom:'Reduced fuel economy, bars missing on battery gauge', fix:'Recondition or replace HV battery ($500–2000)', severity:'High' },
  { model:'Honda Accord (2008–2012)', fault:'Oil dilution in 1.5T engine', symptom:'Milky oil cap, fuel smell in oil', fix:'More frequent oil changes; Honda issued TSB', severity:'Medium' },
  { model:'Volkswagen Golf/Jetta 2.0 TSI', fault:'Timing chain tensioner wear', symptom:'Rattling on cold start', fix:'Replace tensioner + chain early (~$800–1500)', severity:'High' },
  { model:'BMW E90 (2005–2011)', fault:'High-pressure fuel pump (N54 engine)', symptom:'Rough idle, hesitation, stalling', fix:'Replace HPFP and fuel injectors', severity:'High' },
  { model:'Nissan Navara D40 (VQ40)', fault:'Timing chain stretch', symptom:'Rattle on startup, P0016 code', fix:'Full timing chain kit replacement', severity:'High' },
  { model:'Ford Focus (2012–2016)', fault:'Powershift dual-clutch shudder', symptom:'Shudder/jerk at low speed, slipping', fix:'Updated TCM software + clutch pack replacement', severity:'Medium' },
  { model:'Mitsubishi Outlander PHEV', fault:'Battery management module calibration', symptom:'Range anxiety, inaccurate SoC display', fix:'Dealer calibration update / BMS reset', severity:'Low' },
  { model:'Land Rover Discovery 3/4', fault:'Air suspension compressor failure', symptom:'Sinking overnight, fault lights', symptom2:'Compressor burns out from slow leaks', fix:'Replace compressor + check airbag for leaks ($400–900)', severity:'Medium' },
  { model:'Subaru EJ20/EJ25', fault:'Head gasket failure', symptom:'Milky oil, white smoke, overheating', fix:'Head gasket replacement (expensive — $1500+)', severity:'High' },
];

const SERVICE_INTERVALS = [
  { item:'Engine Oil & Filter', petrol:'Every 5,000–10,000 km', diesel:'Every 5,000–7,500 km', hybrid:'Every 10,000–15,000 km (less engine use)', ev:'Not applicable', notes:'Follow OEM spec. Synthetic oil allows longer intervals.' },
  { item:'Air Filter (Engine)', petrol:'Every 20,000–30,000 km', diesel:'Every 15,000–20,000 km', hybrid:'Every 30,000 km', ev:'Every 30,000 km', notes:'Replace sooner in dusty climates (Pakistan roads — every 15,000 km).' },
  { item:'Cabin Air Filter', petrol:'Every 15,000–20,000 km', diesel:'Every 15,000 km', hybrid:'Every 20,000 km', ev:'Every 15,000 km', notes:'Affects AC efficiency. Replace annually in polluted cities.' },
  { item:'Spark Plugs', petrol:'Copper: 30,000 km / Iridium: 100,000 km', diesel:'Not applicable', hybrid:'Same as petrol', ev:'Not applicable', notes:'NGK / Denso iridium plugs offer longer life and better performance.' },
  { item:'Brake Fluid', petrol:'Every 2 years or 40,000 km', diesel:'Every 2 years', hybrid:'Every 2–3 years', ev:'Every 2–3 years', notes:'Moisture-absorbing fluid. Replace regardless of mileage every 2 years.' },
  { item:'Coolant Flush', petrol:'Every 40,000–60,000 km', diesel:'Every 40,000 km', hybrid:'Every 60,000 km', ev:'Every 60,000 km', notes:'Use OEM-spec coolant. Mixing types can cause corrosion.' },
  { item:'Transmission Service (AT)', petrol:'Every 40,000–60,000 km', diesel:'Every 40,000 km', hybrid:'Every 40,000 km', ev:'Not applicable (no transmission fluid)', notes:'Drain & fill preferred over flush on older units.' },
  { item:'Timing Belt', petrol:'Every 80,000–100,000 km', diesel:'Every 80,000 km', hybrid:'Varies', ev:'Not applicable', notes:'Failure destroys engine. Always replace water pump at same time.' },
  { item:'Tyre Rotation', petrol:'Every 10,000 km', diesel:'Every 10,000 km', hybrid:'Every 10,000–15,000 km', ev:'Every 8,000 km (heavier vehicle, more wear)', notes:'EV torque causes faster front wear on FWD; rotate more often.' },
  { item:'Brake Pads', petrol:'Check at 20,000 km / Replace ~50,000 km', diesel:'Check at 20,000 km', hybrid:'Less wear due to regen braking — inspect at 50,000 km', ev:'Inspect at 60,000 km', notes:'Thickness below 3mm = replace immediately.' },
];

const TYRE_PRESSURE_DATA = [
  { vehicle:'Toyota Corolla (2019–2024)', front:'33 PSI (2.3 bar)', rear:'33 PSI (2.3 bar)', spare:'60 PSI (4.1 bar)', tyre_size:'195/65 R15', notes:'Increase to 36 PSI front/rear when fully loaded' },
  { vehicle:'Toyota Camry (2018–2024)', front:'35 PSI (2.4 bar)', rear:'33 PSI (2.3 bar)', spare:'60 PSI (4.1 bar)', tyre_size:'215/55 R17', notes:'Different pressures front/rear — check placard' },
  { vehicle:'Honda Civic (2022–2024)', front:'35 PSI (2.4 bar)', rear:'35 PSI (2.4 bar)', spare:'60 PSI (4.1 bar)', tyre_size:'215/50 R17', notes:'Turbo model same pressure. Run-flat tyres — no spare' },
  { vehicle:'Toyota Prius (2016–2022)', front:'36 PSI (2.5 bar)', rear:'36 PSI (2.5 bar)', spare:'60 PSI', tyre_size:'195/65 R15', notes:'Higher pressure for fuel efficiency benefit' },
  { vehicle:'Suzuki Swift (2017–2024)', front:'30 PSI (2.1 bar)', rear:'30 PSI (2.1 bar)', spare:'60 PSI', tyre_size:'185/65 R15', notes:'Light car — lower pressure is correct. Do not over-inflate' },
  { vehicle:'Toyota Fortuner (2016–2024)', front:'33 PSI (2.3 bar)', rear:'35 PSI (2.4 bar)', spare:'60 PSI', tyre_size:'265/65 R17', notes:'Rear higher when towing or loaded. Off-road: reduce to 25 PSI' },
  { vehicle:'Mitsubishi Pajero (2007–2021)', front:'33 PSI (2.3 bar)', rear:'36 PSI (2.5 bar)', spare:'60 PSI', tyre_size:'265/65 R17', notes:'Off-road reduce to 20–25 PSI. Reinflate before highway.' },
  { vehicle:'BMW 3-Series (G20 2019+)', front:'33 PSI (2.3 bar)', rear:'36 PSI (2.5 bar)', spare:'N/A (run-flat)', tyre_size:'225/45 R18', notes:'Run-flat tyres come with tyre mobility kit only — no spare' },
  { vehicle:'Mercedes C-Class (W205)', front:'33 PSI (2.3 bar)', rear:'36 PSI (2.5 bar)', spare:'N/A (run-flat)', tyre_size:'225/45 R17', notes:'Check placard inside driver door for trim-specific pressures' },
  { vehicle:'Nissan Navara (D23)', front:'33 PSI (2.3 bar)', rear:'36 PSI (2.5 bar — unladen)', spare:'60 PSI', tyre_size:'265/65 R17', notes:'Increase rear to 42 PSI (2.9 bar) when loaded / towing' },
];

const SUSPENSION_TYPES = [
  { type:'MacPherson Strut', used_on:'Front axle of most sedans, hatchbacks, SUVs', pros:'Compact, cheap, easy to manufacture', cons:'Less camber control, bulkier spring-strut unit', ride:'Comfortable for daily driving', examples:'Toyota Corolla front, Honda Civic front, VW Golf front' },
  { type:'Double Wishbone (A-arm)', used_on:'Front/rear of sports cars and luxury vehicles', pros:'Excellent handling, independent geometry, better camber control', cons:'Complex, expensive, more space required', ride:'Sporty and precise', examples:'Honda CR-V front, BMW 3-Series rear, Honda S2000 all corners' },
  { type:'Multi-Link', used_on:'Rear axle of most premium vehicles', pros:'Independent articulation, best handling and comfort balance', cons:'Very complex, expensive to repair', ride:'Best of all worlds — comfort + sportiness', examples:'Toyota Camry rear, BMW 3-Series rear, Audi A4 rear' },
  { type:'Torsion Beam / Twist Beam', used_on:'Rear axle of budget and compact FWD cars', pros:'Simple, cheap, light, reliable', cons:'Semi-independent — compromised ride quality', ride:'Acceptable for commuting; harsh on rough roads', examples:'Toyota Yaris rear, Suzuki Swift rear, VW Polo rear' },
  { type:'Solid Axle (Live Axle)', used_on:'Rear of trucks, 4x4 off-roaders', pros:'Extremely durable, great articulation off-road, cheap to repair', cons:'Poor on-road handling, heavy', ride:'Bouncy on road, excellent off-road', examples:'Toyota Hilux rear, Mitsubishi Pajero rear, Jeep Wrangler all' },
  { type:'Air Suspension', used_on:'Premium and luxury SUVs/sedans', pros:'Adjustable ride height, excellent comfort, self-levelling', cons:'Expensive, complex, costly to repair when failed', ride:'Exceptionally smooth', examples:'Land Rover Discovery, Mercedes S-Class, Audi A8, BMW 7-Series' },
  { type:'Coilover (Modified)', used_on:'Performance / modified vehicles', pros:'Adjustable height and damping, sporty', cons:'Stiffer ride, requires periodic adjustment', ride:'Firm and sporty — not ideal for daily comfort', examples:'After-market upgrades on most sports cars and tuned JDM imports' },
];

const PAINT_CODES = [
  {
    brand:'Toyota', hex:'#EB0A1E', location:'Driver door jamb or under bonnet on firewall', format:'3-digit alphanumeric e.g. 040, 3R3, 8X8',
    common:[
      { code:'040',  name:'Super White',              hex:'#FFFFFF' },
      { code:'1F7',  name:'Silver Metallic',          hex:'#9CA3AF' },
      { code:'209',  name:'Black',                    hex:'#1C1C1C' },
      { code:'3R3',  name:'Emotional Red',            hex:'#C0392B' },
      { code:'8X8',  name:'Midnight Black Metallic',  hex:'#101010' },
      { code:'218',  name:'Attitude Black Mica',      hex:'#1A1A1A' },
      { code:'085',  name:'Polar White',              hex:'#F0F0F0' },
      { code:'8V5',  name:'Precious Metal',           hex:'#808080' },
      { code:'4U5',  name:'Smoky Topaz Brown Met',    hex:'#6B4C33' },
      { code:'2KM',  name:'Celestite Grey Met',       hex:'#7B7F87' },
      { code:'6X3',  name:'Magnetic Grey Met',        hex:'#5C6066' },
      { code:'3T5',  name:'Scarlet Flare',            hex:'#CC1A14' },
    ],
    notes:'Always check door jamb sticker first. Code also on compliance plate.'
  },
  {
    brand:'Honda', hex:'#CC0000', location:'Driver door jamb label', format:'Letter-number code e.g. NH788P, R81',
    common:[
      { code:'NH788P', name:'White Orchid Pearl',     hex:'#F5F5F0' },
      { code:'B593M',  name:'Obsidian Blue Pearl',    hex:'#1A2744' },
      { code:'R81',    name:'Milano Red',             hex:'#CC1111' },
      { code:'NH700M', name:'Lunar Silver Metallic',  hex:'#B0B0B0' },
      { code:'NH731P', name:'Crystal Black Pearl',    hex:'#0A0A0A' },
      { code:'GX',     name:'Sonic Grey Pearl',       hex:'#6E6E6E' },
      { code:'G537M',  name:'Aegean Blue Met',        hex:'#1E3A5F' },
      { code:'YR573M', name:'Champagne Gold Met',     hex:'#C8A96E' },
      { code:'R565P',  name:'Rallye Red Pearl',       hex:'#B81C1C' },
    ],
    notes:'Pearl and Metallic codes end in P or M respectively.'
  },
  {
    brand:'Nissan', hex:'#C01414', location:'Under bonnet on firewall or door jamb', format:'3-digit alphanumeric e.g. KH3, QAB, QM1',
    common:[
      { code:'QM1',  name:'Super Black',              hex:'#111111' },
      { code:'KH3',  name:'Diamond Black',            hex:'#0A0A0A' },
      { code:'QAB',  name:'Pearl White',              hex:'#F2F2F2' },
      { code:'CAH',  name:'Gun Metallic',             hex:'#6B6B6B' },
      { code:'RAY',  name:'Brilliant Silver Met',     hex:'#C0C0C0' },
      { code:'NBM',  name:'Pearl Blue Met',           hex:'#2845A8' },
      { code:'EAN',  name:'Ceramic Grey',             hex:'#A8A8A8' },
      { code:'G41',  name:'Magnetic Red',             hex:'#B50000' },
    ],
    notes:'Two-tone vehicles have two codes separated by slash.'
  },
  {
    brand:'BMW', hex:'#0066B1', location:'Engine bay, side of strut tower (white sticker)', format:'Code like A90, 300, 416, C1M',
    common:[
      { code:'300',  name:'Alpine White',             hex:'#FFFFFF' },
      { code:'A90',  name:'Black Sapphire Met',       hex:'#0B0B14' },
      { code:'354',  name:'Melbourne Red',            hex:'#BB0000' },
      { code:'B39',  name:'Mineral Grey',             hex:'#9A9E9F' },
      { code:'A96',  name:'Brooklyn Grey Met',        hex:'#6D707A' },
      { code:'C1M',  name:'Frozen Black Met',         hex:'#1A1A1A' },
      { code:'C2P',  name:'Portimao Blue Met',        hex:'#102650' },
      { code:'C3F',  name:'Dravit Grey Met',          hex:'#3E3E3E' },
      { code:'475',  name:'San Marino Blue',          hex:'#183C7C' },
      { code:'488',  name:'Space Grey Met',           hex:'#4C5054' },
    ],
    notes:'Full paint description: e.g. "300/2 Non-Metallic" or "A90/3 Metallic".'
  },
  {
    brand:'Mercedes-Benz', hex:'#252525', location:'Data card in service booklet OR driver door jamb', format:'3-digit code: 040, 197, 775, 992',
    common:[
      { code:'040',  name:'Black',                    hex:'#111111' },
      { code:'197',  name:'Obsidian Black Met',       hex:'#0A0A0C' },
      { code:'775',  name:'Palladium Silver',         hex:'#AAAAAA' },
      { code:'992',  name:'Polar White',              hex:'#F5F5F5' },
      { code:'149',  name:'Brilliant Silver Met',     hex:'#CCCCCC' },
      { code:'896',  name:'Selenite Grey Met',        hex:'#68696B' },
      { code:'890',  name:'Graphite Grey Met',        hex:'#3E3E3E' },
      { code:'880',  name:'Tenorite Grey Met',        hex:'#5A5A5A' },
      { code:'890',  name:'Cavansite Blue Met',       hex:'#1C3866' },
      { code:'285',  name:'Emerald Green Met',        hex:'#165C29' },
    ],
    notes:'Matching base + clear coat codes important for two-stage finishes.'
  },
  {
    brand:'Volkswagen', hex:'#001E50', location:'Spare wheel well or front passenger door sill', format:'Code + colour name e.g. LB9A Candy White',
    common:[
      { code:'LB9A',  name:'Candy White',             hex:'#F5F5F5' },
      { code:'LC9A',  name:'Deep Black Pearl',        hex:'#050507' },
      { code:'LX7Z',  name:'Platinum Grey Met',       hex:'#8E9099' },
      { code:'L0H0',  name:'Tungsten Silver',         hex:'#969696' },
      { code:'LP5R',  name:'Kings Red Met',           hex:'#A31E22' },
      { code:'LP6B',  name:'Tornado Red',             hex:'#CC1111' },
      { code:'LD5Q',  name:'Rising Blue Met',         hex:'#1A4CA0' },
      { code:'LH7X',  name:'Mojave Beige',            hex:'#C9AE89' },
    ],
    notes:'VIN-based paint lookups possible via ETKA / ETOS dealer software.'
  },
  {
    brand:'Audi', hex:'#BB0A14', location:'Service label in spare wheel well or door sill', format:'LZ code: LY9B, LZ9Y, etc.',
    common:[
      { code:'LY9B',  name:'Glacier White Met',       hex:'#F0F0F0' },
      { code:'LZ9Y',  name:'Mythos Black Met',        hex:'#0C0C0C' },
      { code:'LX7Z',  name:'Chronos Grey Met',        hex:'#7A7C80' },
      { code:'LZ7M',  name:'Navarra Blue Met',        hex:'#153258' },
      { code:'LY3D',  name:'Tango Red Met',           hex:'#CC2200' },
      { code:'LZ8J',  name:'Daytona Grey Pearl',      hex:'#3C3E44' },
      { code:'LY1N',  name:'Python Yellow',           hex:'#E8C100' },
    ],
    notes:'Audi uses "LZ" prefix for special finish codes; "LY" for standard.'
  },
  {
    brand:'Suzuki', hex:'#2244AA', location:'Left side of engine bay, on firewall sticker', format:'Short alphanumeric: ZUC, ZUD, Z7T',
    common:[
      { code:'ZUC',  name:'Silky Silver Metallic',    hex:'#CCCCCC' },
      { code:'Z7T',  name:'Speedy Blue',              hex:'#1155CC' },
      { code:'ZNC',  name:'Superior White',           hex:'#F4F4F4' },
      { code:'Z2S',  name:'Mineral Grey',             hex:'#8C8C8C' },
      { code:'ZMD',  name:'Magma Grey Met',           hex:'#5C5858' },
      { code:'Z6U',  name:'Burning Red Pearl',        hex:'#C42020' },
      { code:'ZHB',  name:'Pearl Silk Yellow',        hex:'#F0D060' },
    ],
    notes:'Small sticker — often covered in grime on older vehicles.'
  },
  {
    brand:'Hyundai', hex:'#002C5F', location:'Driver door jamb B-pillar sticker', format:'3-letter code: W8, ABS, WA3',
    common:[
      { code:'WAW',  name:'Polar White',              hex:'#F5F5F5' },
      { code:'MZH',  name:'Phantom Black Pearl',      hex:'#090909' },
      { code:'R2T',  name:'Fiery Red',                hex:'#CC1010' },
      { code:'T2U',  name:'Fluidic Metal',            hex:'#A8A8A8' },
      { code:'UE3',  name:'Typhoon Silver',           hex:'#BBBBBB' },
      { code:'S3B',  name:'Abyss Black Pearl',        hex:'#0D0D0D' },
      { code:'AAB',  name:'Stargazing Blue',          hex:'#1C2D6F' },
    ],
    notes:'Two-coat pearlescent finishes require primer + basecoat + clear in matching sequence.'
  },
  {
    brand:'Kia', hex:'#BB162B', location:'Driver door jamb sticker', format:'3-char code: ABP, SWP, SBP',
    common:[
      { code:'SWP',  name:'Snow White Pearl',         hex:'#F8F8F8' },
      { code:'ABP',  name:'Aurora Black Pearl',       hex:'#080808' },
      { code:'DK',   name:'Neptune Blue',             hex:'#1A3A70' },
      { code:'EB',   name:'Steel Gray',               hex:'#7A7A7A' },
      { code:'CR',   name:'Chili Red',                hex:'#CC2020' },
      { code:'C5',   name:'Gravity Grey Met',         hex:'#656565' },
    ],
    notes:'Kia pearlescent codes use "P" suffix; metallic use "M" suffix.'
  },
  {
    brand:'Mitsubishi', hex:'#E30613', location:'Firewall sticker or door jamb', format:'Color number: W57, U17, X43',
    common:[
      { code:'W57',  name:'Diamond White Pearl',      hex:'#F5F5F5' },
      { code:'A30',  name:'Carbon Black Met',         hex:'#151515' },
      { code:'U17',  name:'Deep Blue Met',            hex:'#1B2F5F' },
      { code:'X43',  name:'Red Diamond',              hex:'#BB1122' },
      { code:'H47',  name:'Graphite Grey Met',        hex:'#505050' },
      { code:'D40',  name:'Amethyst Black Pearl',     hex:'#1A0A2E' },
    ],
    notes:'Mitsubishi two-tone codes use two separate lines on the sticker.'
  },
  {
    brand:'Subaru', hex:'#0030A0', location:'Driver door sill area, white adhesive sticker', format:'C7P, 61K, D4S format',
    common:[
      { code:'K1X',  name:'Crystal White Pearl',      hex:'#F0F0F0' },
      { code:'D4S',  name:'Magnetite Grey Met',       hex:'#535660' },
      { code:'M7Y',  name:'Ice Silver Met',           hex:'#CCCCCC' },
      { code:'61K',  name:'Dark Blue Pearl',          hex:'#102040' },
      { code:'C7P',  name:'Pure Red',                 hex:'#CC1111' },
      { code:'MH6',  name:'Forest Green Pearl',       hex:'#1C4020' },
    ],
    notes:'Subaru Crystal White Pearl is one of the most popular/replicated colours.'
  },
  {
    brand:'Land Rover / Range Rover', hex:'#005A1F', location:'VIN plate under bonnet or door B-pillar', format:'3-digit alphanumeric: 1AJ, 2AZ, AAB',
    common:[
      { code:'1AC',  name:'Fuji White',               hex:'#F5F5F5' },
      { code:'2402', name:'Santorini Black Met',      hex:'#090909' },
      { code:'2368', name:'Indus Silver Met',         hex:'#C0C0C0' },
      { code:'1AU',  name:'Firenze Red Met',          hex:'#8B0000' },
      { code:'1BA',  name:'Byron Blue Met',           hex:'#193058' },
      { code:'2232', name:'Corris Grey Met',          hex:'#626262' },
      { code:'1AK',  name:'Carpathian Grey',          hex:'#4A4D52' },
    ],
    notes:'Range Rover codes often appear on a plate riveted to the firewall.'
  },
  {
    brand:'Porsche', hex:'#D5001C', location:'Sticker inside door sill or data plate on firewall', format:'LM / M codes: LM5W, M2Y1',
    common:[
      { code:'2T',   name:'White (Pure White)',       hex:'#FAFAFA' },
      { code:'700',  name:'Black (Jet Black)',        hex:'#0A0A0A' },
      { code:'M2Y1', name:'Guards Red',               hex:'#CC0000' },
      { code:'E2',   name:'Carrara White Met',        hex:'#F0EEE8' },
      { code:'7Z',   name:'Chalk (Matte)',            hex:'#D8D4C8' },
      { code:'Q1',   name:'Python Green',             hex:'#3D6B1A' },
      { code:'WW',   name:'Dolomite Silver Met',      hex:'#AAAAAA' },
    ],
    notes:'Porsche Paint-to-Sample (PTS) options have special codes not in standard lists.'
  },
  {
    brand:'Lexus', hex:'#1A1A1A', location:'Door jamb B-pillar or compliance plate under bonnet', format:'Same as Toyota-style: 183, 1G3, 202',
    common:[
      { code:'183',  name:'Sonic Titanium',           hex:'#7A7A7A' },
      { code:'1H5',  name:'Obsidian',                 hex:'#0A0A0A' },
      { code:'083',  name:'Eminent White Pearl',      hex:'#F8F8F8' },
      { code:'3T5',  name:'Cadence Red',              hex:'#B81414' },
      { code:'8V5',  name:'Nebula Grey Pearl',        hex:'#8B8B8B' },
      { code:'11H',  name:'Incognito',                hex:'#1C1C1C' },
    ],
    notes:'Lexus uses same OEM code structure as Toyota — check door jamb first.'
  },
];

const BATTERY_EV_DATA = [
  { topic:'How Lithium-Ion Batteries Degrade', detail:'Battery capacity reduces with each charge cycle. Typical degradation: 2–3% per year. Capacity below 70–80% of original = end of useful life. Factors: heat, frequent DC fast charging, deep discharges, leaving at 100% SoC.' },
  { topic:'State of Charge (SoC) Best Practices', detail:'Optimal daily range: 20–80% SoC. Preserves battery chemistry. Only charge to 100% for long trips. Never regularly discharge below 10%. Most EVs and PHEVs have a "Daily Charge Limit" setting — use it.' },
  { topic:'EV Range Estimation Formula', detail:'EPA/WLTP rated range × real-world factor = practical range. City driving: ~1.1× (regenerative braking helps). Highway at 120 km/h: ~0.75× (aerodynamic drag). Cold weather (-10°C): ~0.6× (battery chemistry slows). AC/Heat: subtract 10–20%.' },
  { topic:'Charging Levels Explained', detail:'Level 1 (120V AC, 1.4 kW): ~8 km/hr charge — home trickle overnight. Level 2 (240V AC, 7–22 kW): ~25–80 km/hr — home wallbox or public AC. DC Fast Charge (CCS/CHAdeMO, 50–350 kW): 80% in 20–40 min. Note: frequent DC fast charging accelerates degradation.' },
  { topic:'Hybrid vs PHEV vs BEV', detail:'Mild Hybrid (MHEV): 48V system assists engine, no EV-only mode, no external charging. Full Hybrid (HEV): self-charges, EV-only at low speed (<50 km/h), no plug. PHEV: larger battery (8–30 kWh), 30–80 km EV range, plug-in, then runs as hybrid. BEV: fully electric, 200–700+ km range.' },
  { topic:'Battery Warranty (Typical)', detail:'Most manufacturers: 8 years / 160,000 km at 70% capacity. Toyota/Lexus hybrid: lifetime battery coverage in some markets. Tesla: 8 years with 70% retention guarantee. Nissan Leaf: 8 years / 160,000 km. Kia/Hyundai: 10 years / 200,000 km.' },
  { topic:'Battery Replacement Cost (2024)', detail:'Toyota Prius (gen 3): $1,500–2,500 (refurbished) / $4,500 new. Nissan Leaf (24 kWh): $3,500–5,500. Tesla Model 3 LR: $10,000–15,000. Note: refurbished/reconditioned packs from Japan (grade A) available cheaper via importers.' },
  { topic:'How to Test HV Battery Health', detail:'Toyota/Lexus: use Techstream or Hybrid Assistant app. Nissan Leaf: leafspy app + OBD2 Bluetooth. Tesla: "Battery Report" via service mode. Generic: count full charge bars on dashboard. Below 8/12 bars on Leaf = significant degradation.' },
];

// ─── Component functions for 8 new tabs ──────────────────────────────────────

function FluidsTab() {
  const [q, setQ] = React.useState('');
  const filtered = FLUID_DATA.filter(f =>
    !q || f.fluid.toLowerCase().includes(q.toLowerCase()) || f.notes.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-3">
      <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-blue-400 mb-1">🛢 Complete Fluid Inspection Guide</p>
        <p className="text-xs text-muted-foreground">Check all fluids when cold, on flat ground. Low fluid often indicates a leak — not just consumption.</p>
      </div>
      <SearchBar value={q} onChange={setQ} />
      <div className="space-y-3">
        {filtered.map((f, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
              <p className="font-bold text-sm text-primary">{f.fluid}</p>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{f.interval}</Badge>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground font-medium">📍 Location: </span><span className="text-foreground">{f.dipstick}</span></div>
              <div><span className="text-muted-foreground font-medium">📊 Level: </span><span className="text-foreground">{f.min_max}</span></div>
              <div><span className="text-green-400 font-medium">✅ Healthy colour: </span><span className="text-foreground">{f.color_ok}</span></div>
              <div><span className="text-red-400 font-medium">🚨 Danger sign: </span><span className="text-foreground">{f.color_bad}</span></div>
              <div className="md:col-span-2"><span className="text-muted-foreground font-medium">💡 Notes: </span><span className="text-foreground">{f.notes}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatteryEvTab() {
  return (
    <div className="space-y-3">
      <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-green-400 mb-1">🔋 Battery & EV/Hybrid Range Guide</p>
        <p className="text-xs text-muted-foreground">Essential knowledge for hybrid, PHEV, and full EV vehicles. Covers charging, degradation, costs, and diagnostics.</p>
      </div>
      <div className="space-y-3">
        {BATTERY_EV_DATA.map((item, i) => (
          <SectionCard key={i}>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-400/15 flex items-center justify-center shrink-0 mt-0.5">
                <Battery className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground mb-1">{item.topic}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function NcapTab() {
  return (
    <div className="space-y-3">
      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-yellow-400 mb-1">⭐ NCAP Safety Rating Organisations Explained</p>
        <p className="text-xs text-muted-foreground">Different regions use different crash test organisations. A 5-star NHTSA ≠ a 5-star Euro NCAP — Euro NCAP is generally stricter.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NCAP_DATA.map((org, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-yellow-400/10 px-4 py-2.5 flex items-center justify-between">
              <p className="font-bold text-sm text-yellow-400">{org.org}</p>
              <Badge variant="outline" className="text-[10px] border-yellow-400/30 text-yellow-400">{org.region}</Badge>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div><span className="text-muted-foreground font-medium">🌐 Website: </span>
                <a href={`https://${org.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{org.website}</a>
              </div>
              <div><span className="text-muted-foreground font-medium">⭐ Scale: </span><span className="text-foreground">{org.stars}</span></div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">🔬 Test Categories:</p>
                <div className="flex flex-wrap gap-1">
                  {org.categories.map((c, j) => <Badge key={j} variant="outline" className="text-[10px] border-border text-muted-foreground">{c}</Badge>)}
                </div>
              </div>
              <div><span className="text-muted-foreground font-medium">💡 Note: </span><span className="text-foreground">{org.notes}</span></div>
            </div>
          </div>
        ))}
      </div>
      {/* Star rating visual */}
      <SectionCard>
        <p className="font-bold text-sm text-foreground mb-3">Euro NCAP Star Rating Meaning</p>
        {[
          { stars: 5, color: 'text-green-400', bg: 'bg-green-400/10', label: '5 Stars', desc: 'Overall good to very good performance in crash protection; well equipped with robust, reliable crash avoidance technology.' },
          { stars: 4, color: 'text-lime-400', bg: 'bg-lime-400/10', label: '4 Stars', desc: 'Good crash protection; some crash avoidance technology but not across all test categories.' },
          { stars: 3, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: '3 Stars', desc: 'Adequate crash protection but lacking or not fully effective safety technology.' },
          { stars: 2, color: 'text-orange-400', bg: 'bg-orange-400/10', label: '2 Stars', desc: 'Nominal crash protection — has weaknesses, limited or no crash avoidance technology.' },
          { stars: 1, color: 'text-red-400', bg: 'bg-red-400/10', label: '1 Star', desc: 'Marginal crash protection. Does not meet minimum requirements for higher rating.' },
        ].map((r, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${r.bg} border border-border/50 mb-2`}>
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: r.stars }).map((_, j) => <Star key={j} className={`w-3.5 h-3.5 fill-current ${r.color}`} />)}
              {Array.from({ length: 5 - r.stars }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-border" />)}
            </div>
            <p className="text-xs text-muted-foreground flex-1">{r.desc}</p>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function CommonFaultsTab() {
  const [q, setQ] = React.useState('');
  const filtered = COMMON_FAULTS.filter(f =>
    !q || f.model.toLowerCase().includes(q.toLowerCase()) || f.fault.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-3">
      <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-red-400 mb-1">⚠ Common Faults by Model</p>
        <p className="text-xs text-muted-foreground">Known recurring issues on popular imported vehicles. Use for pre-purchase inspection checklists.</p>
      </div>
      <SearchBar value={q} onChange={setQ} />
      <div className="space-y-2">
        {filtered.map((f, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className={cn('px-4 py-2 flex items-center justify-between',
              f.severity === 'High' ? 'bg-red-400/10' : f.severity === 'Medium' ? 'bg-amber-400/10' : 'bg-blue-400/10')}>
              <p className="font-bold text-sm text-foreground">{f.model}</p>
              <Badge className={cn('text-[10px]',
                f.severity === 'High' ? 'bg-red-400/20 text-red-400 border-red-400/30' :
                f.severity === 'Medium' ? 'bg-amber-400/20 text-amber-400 border-amber-400/30' :
                'bg-blue-400/20 text-blue-400 border-blue-400/30')} variant="outline">{f.severity} Priority</Badge>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div><span className="text-muted-foreground font-medium">🔧 Fault: </span><span className="text-foreground">{f.fault}</span></div>
              <div><span className="text-muted-foreground font-medium">🔍 Symptom: </span><span className="text-foreground">{f.symptom}</span></div>
              <div><span className="text-green-400 font-medium">✅ Fix: </span><span className="text-foreground">{f.fix}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceTab() {
  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">🔧 Service Interval Guide</p>
        <p className="text-xs text-muted-foreground">Intervals vary by fuel type. Always refer to vehicle owner's manual as final authority. Severe conditions (dust, heat, stop-go traffic) = shorter intervals.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">Service Item</th>
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">Petrol</th>
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">Diesel</th>
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">Hybrid</th>
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">EV</th>
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_INTERVALS.map((s, i) => (
              <tr key={i} className={cn('border-b border-border/50', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}>
                <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{s.item}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.petrol}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.diesel}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.hybrid}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.ev}</td>
                <td className="px-3 py-2.5 text-muted-foreground italic">{s.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TyrePressureTab() {
  const [q, setQ] = React.useState('');
  const filtered = TYRE_PRESSURE_DATA.filter(t =>
    !q || t.vehicle.toLowerCase().includes(q.toLowerCase()) || t.tyre_size.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">🚗 Tyre Pressure Reference Chart</p>
        <p className="text-xs text-muted-foreground">Always check pressure when tyres are cold (not driven for 3+ hours). The vehicle door-jamb placard is always authoritative over these figures.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-blue-400/10 border border-blue-400/20 text-center">
          <p className="font-bold text-blue-400 text-base">Cold</p>
          <p className="text-muted-foreground mt-1">Always check when tyres are cold</p>
        </div>
        <div className="p-3 rounded-lg bg-green-400/10 border border-green-400/20 text-center">
          <p className="font-bold text-green-400 text-base">+5 PSI</p>
          <p className="text-muted-foreground mt-1">Normal hot-driving pressure rise</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 text-center">
          <p className="font-bold text-amber-400 text-base">-25%</p>
          <p className="text-muted-foreground mt-1">Off-road traction reduction</p>
        </div>
        <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-center">
          <p className="font-bold text-red-400 text-base">60 PSI</p>
          <p className="text-muted-foreground mt-1">Typical full-size spare pressure</p>
        </div>
      </div>
      <SearchBar value={q} onChange={setQ} />
      <div className="space-y-2">
        {filtered.map((t, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between">
              <p className="font-bold text-sm text-foreground">{t.vehicle}</p>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{t.tyre_size}</Badge>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-blue-400/5 border border-blue-400/20">
                <p className="text-muted-foreground font-medium mb-0.5">Front</p>
                <p className="font-bold text-blue-400">{t.front}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-400/5 border border-green-400/20">
                <p className="text-muted-foreground font-medium mb-0.5">Rear</p>
                <p className="font-bold text-green-400">{t.rear}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <p className="text-muted-foreground font-medium mb-0.5">Spare</p>
                <p className="font-bold text-amber-400">{t.spare}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30 border border-border md:col-span-1 col-span-2">
                <p className="text-muted-foreground font-medium mb-0.5">Notes</p>
                <p className="text-foreground">{t.notes}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuspensionTab() {
  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">🛞 Suspension Types Explained</p>
        <p className="text-xs text-muted-foreground">Understanding suspension helps evaluate ride quality, handling, and repair costs during vehicle inspection.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SUSPENSION_TYPES.map((s, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 px-4 py-2.5">
              <p className="font-bold text-sm text-primary">{s.type}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Used on: {s.used_on}</p>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground"><span className="text-green-400 font-medium">Pros: </span>{s.pros}</span>
              </div>
              <div className="flex gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground"><span className="text-red-400 font-medium">Cons: </span>{s.cons}</span>
              </div>
              <div><span className="text-muted-foreground font-medium">🚗 Ride: </span>{s.ride}</div>
              <div className="pt-1 border-t border-border/30">
                <span className="text-muted-foreground font-medium">📋 Examples: </span>
                <span className="text-foreground">{s.examples}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaintCodesTab() {
  const [q, setQ] = React.useState('');
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const filtered = PAINT_CODES.filter(p =>
    !q || p.brand.toLowerCase().includes(q.toLowerCase()) ||
    p.common.some(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="space-y-3">
      <div className="bg-purple-400/5 border border-purple-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-purple-400 mb-1">🎨 Paint Codes — 15 Brands · Visual Color Swatches</p>
        <p className="text-xs text-muted-foreground">OEM paint codes with real color previews. Click a brand to expand all codes. Accurate matching requires the exact factory code — location varies by manufacturer.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
        {['Driver door jamb', 'Under bonnet / firewall', 'Spare wheel well', 'Service booklet data card'].map((loc, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-purple-400/5 border border-purple-400/20 text-center">
            <p className="text-purple-400 font-medium">{loc}</p>
          </div>
        ))}
      </div>
      <SearchBar value={q} onChange={setQ} />
      <div className="space-y-2">
        {filtered.map((p, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            {/* Brand header — clickable */}
            <button
              onClick={() => setExpanded(expanded === p.brand ? null : p.brand)}
              className="w-full bg-purple-400/10 px-4 py-3 flex items-center gap-3 hover:bg-purple-400/15 transition-colors"
            >
              {/* Brand color dot */}
              <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: p.hex }} />
              <p className="font-bold text-sm text-purple-400 flex-1 text-left">{p.brand}</p>
              <Badge variant="outline" className="text-[10px] border-purple-400/30 text-purple-400 hidden md:flex">{p.format}</Badge>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === p.brand ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {expanded === p.brand && (
              <div className="p-4 space-y-3 text-xs">
                <div className="flex gap-4 flex-wrap">
                  <div><span className="text-muted-foreground font-medium">📍 Code location: </span><span className="text-foreground">{p.location}</span></div>
                  <div><span className="text-muted-foreground font-medium">📋 Format: </span><span className="text-foreground font-mono">{p.format}</span></div>
                </div>
                {/* Color swatches grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {p.common.map((c, j) => (
                    <div key={j} className="border border-border rounded-lg overflow-hidden hover:border-purple-400/40 transition-colors">
                      {/* Color swatch */}
                      <div className="h-10 w-full" style={{ backgroundColor: c.hex }} />
                      <div className="p-2 bg-muted/20">
                        <p className="text-foreground font-semibold text-[11px] leading-tight">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[9px] font-mono border-border text-primary px-1 py-0">{c.code}</Badge>
                          <span className="text-[9px] text-muted-foreground font-mono">{c.hex}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-border/30"><span className="text-muted-foreground font-medium">💡 </span><span className="text-foreground">{p.notes}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Quick-copy color finder tip */}
      <div className="p-3 bg-muted/20 rounded-xl border border-border text-xs text-muted-foreground">
        <span className="text-foreground font-medium">Pro Tip: </span>
        To exactly match a respray, always use the OEM code (not just the name). "White" can be 6 different codes on the same model across years. Check the sticker, not the brochure.
      </div>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const LIBRARY_TABS = [
  { id:'warnings',      label:'⚠ Warning Lights',  icon:AlertTriangle,  component: WarningLightsTab  },
  { id:'powertrain',    label:'⚡ EV/Hybrid Tech',  icon:Zap,            component: PowertrainTab     },
  { id:'adas',          label:'🛡 ADAS',             icon:Shield,         component: AdasTab           },
  { id:'transmissions', label:'⚙ Transmissions',    icon:Settings,       component: TransmissionsTab  },
  { id:'jdm',           label:'🇯🇵 JDM Terms',       icon:FileText,       component: JdmTermsTab       },
  { id:'auction',       label:'🏷 Auction Grades',   icon:Star,           component: AuctionGradesTab  },
  { id:'tyres',         label:'🔧 Tyre Guide',       icon:Gauge,          component: TyreGuideTab      },
  { id:'emissions',     label:'🌿 Emissions',        icon:Activity,       component: EmissionsTab      },
  {
    id:'body-types', label:'🚗 Body Types', icon:Car,
    component: () => <GenericListTab items={BODY_TYPES.map(b=>({type:b.type,description:b.desc}))} fields={[{key:'type',label:'Type',primary:true},{key:'description',label:'Description'}]}/>
  },
  {
    id:'engines', label:'🔩 Engine Types', icon:Wrench,
    component: () => <GenericListTab items={ENGINE_ARCH.map(e=>({type:e.type,description:e.desc}))} fields={[{key:'type',label:'Type',primary:true},{key:'description',label:'Description'}]}/>
  },
  { id:'inspection',    label:'🔍 Inspection Guide',icon:Eye,            component: InspectionTab     },
  { id:'import',        label:'📦 Import Guide',     icon:Package,        component: ImportGuideTab    },
  { id:'dealer-words',  label:'💼 Dealer Vocab',     icon:FileText,       component: () => (
    <div><SearchBar value="" onChange={()=>{}}/><div className="space-y-2">{DEALER_WORDS.map((d,i)=>(
      <div key={i} className={cn('flex gap-3 border border-border rounded-xl p-3', i%2===0?'bg-card':'bg-muted/20')}>
        <p className="font-bold text-sm text-primary w-48 shrink-0">{d.word}</p>
        <p className="text-xs text-muted-foreground flex-1">{d.def}</p>
      </div>
    ))}</div></div>)
  },
  { id:'competitive',   label:'📊 Competitive Compare', icon:BarChart3, component: CompetitiveTab },
  { id:'battery-ev',   label:'🔋 Battery & EV Range',  icon:Battery,   component: BatteryEvTab   },
  { id:'ncap',          label:'⭐ NCAP Safety Ratings', icon:Shield,    component: NcapTab        },
  { id:'common-faults', label:'⚠ Common Faults',       icon:AlertTriangle, component: CommonFaultsTab },
  { id:'service',       label:'🔧 Service Intervals',  icon:Wrench,    component: ServiceTab     },
  { id:'tyre-pressure', label:'🚗 Tyre Pressure Chart',icon:Gauge,     component: TyrePressureTab},
  { id:'suspension',    label:'🛞 Suspension Types',   icon:Layers,    component: SuspensionTab  },
  { id:'paint-codes',    label:'🎨 Paint Codes Guide',     icon:Eye,          component: PaintCodesTab      },
  { id:'chassis-codes',  label:'🔑 Chassis Codes',          icon:FileText,     component: ChassisCodesTab    },
  { id:'maintenance',    label:'📅 Maintenance Schedule',    icon:Calendar,     component: MaintenanceTab     },
  { id:'brands',         label:'🏭 Brand Intel',             icon:Globe,        component: BrandsTab          },
  { id:'resale',         label:'💰 Resale Values',           icon:TrendingUp,   component: ResaleValuesTab    },
  { id:'service-costs',  label:'🔧 Service Costs',           icon:DollarSign,   component: ServiceCostsTab    },
  { id:'chinese-cars',   label:'🇨🇳 Chinese Cars Tech',       icon:Cpu,          component: ChineseCarsTab     },
  { id:'car-parts',      label:'🔩 Car Parts Guide',          icon:Wrench,       component: CarPartsTab        },
];

// ─── NEW TAB DATA ─────────────────────────────────────────────────────────────

const CHASSIS_CODES: { make:string; models:{code:string;name:string;years:string;engine:string;notes:string}[] }[] = [
  { make:'Toyota', models:[
    { code:'ZZE122', name:'Corolla (E12)', years:'2000–2006', engine:'1ZZ-FE 1.8L', notes:'Common in Pak market. 1ZZ prone to oil consumption — check blue smoke.' },
    { code:'NZE121', name:'Corolla (E12)', years:'2000–2006', engine:'1NZ-FE 1.5L', notes:'Economical variant, very reliable, good fuel economy.' },
    { code:'NCP10/13', name:'Vitz/Echo/Yaris P10', years:'1999–2005', engine:'1NZ-FE/2NZ-FE', notes:'Original Vitz gen. Durable, but check CVT fluid carefully.' },
    { code:'NCP91', name:'Vitz P90', years:'2005–2010', engine:'1NZ-FE 1.3L', notes:'Most common Vitz in Pak. Reliable, cheap parts.' },
    { code:'NHP10', name:'Aqua/Prius c', years:'2012–2020', engine:'1NZ-FXE hybrid', notes:'Check HV battery health. Hybrid battery replacement PKR 1.5–3L.' },
    { code:'ZVW30', name:'Prius Gen 3', years:'2009–2015', engine:'2ZR-FXE hybrid', notes:'Excellent reliability. Check 12V aux battery separately.' },
    { code:'DAA-ZVW55', name:'Prius Gen 4', years:'2016–2022', engine:'2ZR-FXE hybrid', notes:'Quieter, better range. TSS optional on base.' },
    { code:'NCP160', name:'Vitz/Yaris P150', years:'2011–2020', engine:'1KR/1NZ', notes:'Last JDM Vitz before GR Yaris. Good all-rounder.' },
    { code:'ZRE152', name:'Corolla E15', years:'2006–2012', engine:'2ZR-FE 1.8L', notes:'Pakistani-market Corolla. Watch for VVT-i gear rattle at cold start.' },
  ]},
  { make:'Honda', models:[
    { code:'GE6/8', name:'Fit/Jazz Gen 3', years:'2008–2013', engine:'L13A/L15A', notes:'Huge interior. CVT in GE7/GE9. Check power window regulators.' },
    { code:'GK3/5', name:'Fit/Jazz Gen 4', years:'2013–2020', engine:'L13B/L15B i-VTEC', notes:'DOHC i-VTEC, excellent city MPG. 7-speed DCT optional.' },
    { code:'FC1', name:'Grace/City hybrid', years:'2014–2020', engine:'LEB hybrid', notes:'City-based PHEV predecessor. JDM only. i-DCD DCT — check judder.' },
    { code:'GP5', name:'Fit Hybrid', years:'2013–2020', engine:'LEB i-DCD', notes:'Dual-clutch hybrid — infamous judder at low speeds. Updated ECU helps.' },
    { code:'ZF1/2', name:'HR-V Gen 2', years:'2021–2022', engine:'1.5L DOHC VTEC', notes:'Good reliability. Manual gearbox version rare.' },
  ]},
  { make:'Nissan', models:[
    { code:'C26', name:'Serena', years:'2010–2016', engine:'MR20DD/QR20DE', notes:'7-seater MPV. Check sliding door tracks. CVT shudder on high mileage units.' },
    { code:'C27', name:'Serena Gen 5', years:'2016–2022', engine:'MR20DD + e-POWER', notes:'e-POWER variant eliminates range anxiety. Watch DBA variants — old ICE only.' },
    { code:'HE12', name:'Note e-POWER', years:'2016–2022', engine:'HR12DE generator + EV', notes:'No plug needed. 37km/L claimed. Very reliable motors.' },
    { code:'E12', name:'Note', years:'2012–2020', engine:'HR12DDR/IG-T', notes:'Budget city car. DIG-S supercharger can be noisy — inspect carefully.' },
    { code:'FE0', name:'Dayz', years:'2019+', engine:'BR06D MIVEC', notes:'Kei class. Alliance chassis with Mitsubishi eK. ADAS optional.' },
  ]},
  { make:'Suzuki', models:[
    { code:'ZC72S', name:'Swift Gen 3 (ZC)', years:'2010–2016', engine:'K12B 1.2L', notes:'Popular in Pak reconditioning. Excellent MPG, CVT or 5MT.' },
    { code:'ZC83S', name:'Swift Gen 4', years:'2017–2023', engine:'K12C 1.2L DualJet', notes:'SHVS mild hybrid optional. Milghtly improved ride.' },
    { code:'MK53S', name:'Spacia', years:'2017+', engine:'R06D', notes:'Tall kei wagon. Great for families. Check roof panel for leaks.' },
    { code:'MH55S', name:'Wagon R Stingray', years:'2017–2021', engine:'R06A turbo', notes:'Turbo kei. Quick but needs premium petrol for boost. Common in reconditioning.' },
  ]},
];

const MAINTENANCE_SCHEDULE: {interval:string; color:string; tasks:{component:string;action:string;notes:string}[]}[] = [
  { interval:'Every 5,000 km', color:'bg-green-500/10 border-green-500/20 text-green-400',
    tasks:[
      { component:'Engine Oil', action:'Check level, top up if needed', notes:'Especially important for high mileage Japanese imports' },
      { component:'Tyre Pressure', action:'Check all 4 + spare (cold)', notes:'Inflate to door placard spec. Under-inflation kills tyres fast' },
      { component:'Lights', action:'Check all exterior lights', notes:'Blown bulbs = traffic challan in PK' },
      { component:'Brakes', action:'Visual check pad thickness', notes:'Listen for squeal — wear indicator contact = replace now' },
    ]},
  { interval:'Every 10,000 km', color:'bg-blue-500/10 border-blue-500/20 text-blue-400',
    tasks:[
      { component:'Engine Oil & Filter', action:'Full change (synthetic 0W-20/5W-30)', notes:'Petrol engines: 5,000–10,000 km. Diesel: 5,000 km max in PK' },
      { component:'Air Filter (Engine)', action:'Inspect, clean or replace', notes:'Dusty cities = every 10,000 km. Clean air = better MPG' },
      { component:'Cabin Air Filter', action:'Inspect and clean/replace', notes:'Affects AC cooling efficiency significantly in PK heat' },
      { component:'Wiper Blades', action:'Test smear and streak', notes:'Replace annually minimum — PK heat degrades rubber' },
      { component:'Battery Terminals', action:'Check corrosion, tighten', notes:'Clean with baking soda + water if white powder visible' },
    ]},
  { interval:'Every 20,000 km', color:'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    tasks:[
      { component:'Spark Plugs', action:'Inspect (iridium: 60k km)', notes:'Misfires, rough idle, poor MPG = check plugs first' },
      { component:'Brake Fluid', action:'Test moisture content', notes:'Brake fluid absorbs moisture. Replace every 2 years or when >3% water' },
      { component:'Fuel Filter', action:'Replace if accessible', notes:'Many modern cars have in-tank filter (no DIY). External inline = replace' },
      { component:'Drive Belts', action:'Inspect for cracks/glazing', notes:'Serpentine belt failure = total breakdown. Cheap insurance to replace' },
      { component:'Tyre Rotation', action:'Front ↔ Rear swap', notes:'Even wear extends tyre life by 20–30%' },
    ]},
  { interval:'Every 40,000 km', color:'bg-orange-500/10 border-orange-500/20 text-orange-400',
    tasks:[
      { component:'Coolant', action:'Flush and refill with correct type', notes:'Pink = Toyota Super Long Life. Green = older spec. Never mix.' },
      { component:'CVT Fluid', action:'CRITICAL — change CVT fluid', notes:'Most common cause of CVT failure in Aqua/Vitz is skipped fluid changes' },
      { component:'Transmission Fluid (AT)', action:'Drain and fill (not flush)', notes:'Use OEM spec fluid only. Wrong fluid = shudder, slip' },
      { component:'Power Steering Fluid', action:'Check and top up', notes:'Electric PS (EPAS) needs no fluid. Hydraulic only' },
      { component:'Brake Pads', action:'Measure remaining thickness', notes:'Replace at 3mm. Most JDM cars ship with 6–8mm' },
    ]},
  { interval:'Every 80,000 km', color:'bg-red-500/10 border-red-500/20 text-red-400',
    tasks:[
      { component:'Timing Belt / Chain', action:'Replace belt; inspect chain', notes:'CRITICAL — interference engines: belt snap = bent valves. Chains last longer but check noise' },
      { component:'Water Pump', action:'Replace alongside timing belt', notes:'Labour overlap — replace together to save cost. Water pump failure = overheating' },
      { component:'Fuel Injectors', action:'Clean with ultrasonic or replace', notes:'Hard starting, poor idle, rich smell = dirty injectors' },
      { component:'Wheel Bearings', action:'Check for rumble/play', notes:'Lift each wheel, check for play. Rumble at speed = bearing failing' },
      { component:'HV Battery Health Check', action:'Hybrids: scan SoH', notes:'Aqua/Prius: check IMA bars or use Techstream. Below 75% SoH = plan for replacement' },
    ]},
];

const BRAND_INTEL: { brand:string; origin:string; strengths:string[]; weaknesses:string[]; pkMarket:string; bestModels:string; avoidModels:string; resale:string }[] = [
  { brand:'Toyota',   origin:'Japan',  strengths:['Legendary reliability','Excellent parts availability in PK','Strong resale value','Hybrid technology leader'], weaknesses:['Higher initial cost','Conservative styling','CVT can fail if not maintained'], pkMarket:'Dominant — most popular brand', bestModels:'Aqua, Corolla, Vitz, Fortuner', avoidModels:'Old 1ZZ Corolla (oil consumption)', resale:'★★★★★ Best in market' },
  { brand:'Honda',    origin:'Japan',  strengths:['Sporty VTEC engines','Excellent build quality','Good fuel economy'], weaknesses:['i-DCD DCT judder issues','Expensive dealer service','Parts slightly pricier than Toyota'], pkMarket:'Strong #2 position', bestModels:'Civic, BRV, HR-V, Jazz', avoidModels:'GP5 Fit Hybrid (DCT issues)', resale:'★★★★ Very good' },
  { brand:'Suzuki',   origin:'Japan/Pak', strengths:['Very affordable','Cheap running costs','Widely serviced'], weaknesses:['Smaller, less powerful','Limited features','Marginal safety ratings'], pkMarket:'Budget segment leader', bestModels:'Alto, Wagon R, Swift', avoidModels:'Old Mehran (discontinued)','resale':'★★★ Good for budget segment' },
  { brand:'Nissan',   origin:'Japan',  strengths:['e-POWER hybrid tech','Good safety tech','CVT improvements post-2015'], weaknesses:['Parts availability patchy in PK','CVT issues on pre-2015','Resale below Toyota'], pkMarket:'Mid-tier, growing', bestModels:'Dayz, Note e-Power, Serena C27', avoidModels:'Old Tiida (gearbox)','resale':'★★★ Fair' },
  { brand:'Mitsubishi', origin:'Japan', strengths:['AWD/4WD expertise','Outlander PHEV range','Tough SUVs'], weaknesses:['Limited PK dealer network','Parts can be hard to source'], pkMarket:'Niche, SUV-focused', bestModels:'Outlander, Pajero', avoidModels:'Old Lancer (parts issue)','resale':'★★★ Fair' },
  { brand:'BMW',      origin:'Germany', strengths:['Ultimate driving dynamics','Premium build','Advanced tech'], weaknesses:['Very expensive maintenance','Complex electronics','Import duty is steep'], pkMarket:'Ultra-premium niche', bestModels:'3 series, 5 series, X5', avoidModels:'Pre-2015 (higher fault rates)','resale':'★★★ Falls fast' },
  { brand:'Mercedes', origin:'Germany', strengths:['Luxury benchmark','Excellent safety','Strong brand prestige'], weaknesses:['Highest maintenance costs','Complex AIRMATIC suspension','Expensive parts'], pkMarket:'Elite segment', bestModels:'C-Class, GLC, E-Class', avoidModels:'W220 S-Class (costly repairs)','resale':'★★★ Drops significantly after warranty' },
  { brand:'Changan',  origin:'China',  strengths:['Very competitive pricing','Modern features','Growing PK warranty network'], weaknesses:['Unproven long-term reliability','Lower resale value currently','Limited used market data'], pkMarket:'Rapidly growing', bestModels:'Alsvin, Oshan X7, Uni-T', avoidModels:'First-gen models','resale':'★★ Improving but still low' },
];

// ─── NEW TAB COMPONENTS ───────────────────────────────────────────────────────

function ChassisCodesTab() {
  const [q, setQ] = React.useState('');
  const [make, setMake] = React.useState('All');
  const makes = ['All', ...CHASSIS_CODES.map(c => c.make)];
  const filtered = CHASSIS_CODES
    .filter(c => make === 'All' || c.make === make)
    .map(c => ({
      ...c,
      models: c.models.filter(m =>
        !q || m.code.toLowerCase().includes(q.toLowerCase()) ||
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.engine.toLowerCase().includes(q.toLowerCase()) ||
        m.notes.toLowerCase().includes(q.toLowerCase())
      ),
    }))
    .filter(c => c.models.length > 0);

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">🔑 Chassis Code Reference Guide</p>
        <p className="text-xs text-muted-foreground">Identify exact vehicle specifications from chassis/model codes found on Japanese auction sheets and vehicle documents.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search code, model, engine..." className="pl-8 h-8 text-xs bg-muted/40" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {makes.map(m => (
            <button key={m} onClick={() => setMake(m)}
              className={cn('px-3 py-1 rounded-lg text-xs border font-medium transition-all', make === m ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
              {m}
            </button>
          ))}
        </div>
      </div>
      {filtered.map(brand => (
        <div key={brand.make}>
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />{brand.make}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="bg-muted/50">
                <tr>{['Chassis Code','Model Name','Years','Engine','Notes'].map(h => <th key={h} className="text-left text-[10px] text-muted-foreground px-3 py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {brand.models.map((m, i) => (
                  <tr key={m.code} className={cn('border-t border-border/50', i % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
                    <td className="px-3 py-2 font-bold text-primary font-mono">{m.code}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{m.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.years}</td>
                    <td className="px-3 py-2 text-blue-400 font-mono text-[10px]">{m.engine}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs whitespace-normal leading-snug">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function MaintenanceTab() {
  const [selected, setSelected] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="font-bold text-sm text-amber-400 mb-1">📅 Comprehensive Maintenance Schedule</p>
        <p className="text-xs text-muted-foreground">Based on Pakistani driving conditions — dusty roads, heat, stop-and-go city traffic. More frequent than manufacturer spec in some cases.</p>
      </div>
      <div className="space-y-3">
        {MAINTENANCE_SCHEDULE.map(block => (
          <div key={block.interval} className={cn('border rounded-xl overflow-hidden', block.color.split(' ').slice(1).join(' ') || 'border-border')}>
            <button className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setSelected(selected === block.interval ? null : block.interval)}>
              <span className={cn('text-sm font-bold', block.color.split(' ')[2])}>{block.interval}</span>
              <span className="text-muted-foreground text-xs">{selected === block.interval ? '▲ hide' : `▼ ${block.tasks.length} tasks`}</span>
            </button>
            {selected === block.interval && (
              <div className="border-t border-border/40 divide-y divide-border/30">
                {block.tasks.map(t => (
                  <div key={t.component} className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-1">
                    <p className="font-semibold text-sm text-foreground">{t.component}</p>
                    <p className="text-xs text-foreground">{t.action}</p>
                    <p className="text-xs text-muted-foreground">{t.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandsTab() {
  const [selected, setSelected] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">🏭 Brand Intelligence Guide</p>
        <p className="text-xs text-muted-foreground">Strengths, weaknesses, and Pakistani market performance for each major brand.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BRAND_INTEL.map(b => (
          <div key={b.brand} className="border border-border rounded-xl overflow-hidden bg-card cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => setSelected(selected === b.brand ? null : b.brand)}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-bold text-sm text-foreground">{b.brand}</p>
                <p className="text-[10px] text-muted-foreground">{b.origin} · {b.pkMarket}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-400 font-bold">{b.resale}</span>
                <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', selected === b.brand && 'rotate-90')} />
              </div>
            </div>
            {selected === b.brand && (
              <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-muted/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-green-400 font-semibold mb-1">✅ Strengths</p>
                    <ul className="space-y-0.5">{b.strengths.map(s => <li key={s} className="text-xs text-foreground">• {s}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-[10px] text-red-400 font-semibold mb-1">⚠ Weaknesses</p>
                    <ul className="space-y-0.5">{b.weaknesses.map(s => <li key={s} className="text-xs text-foreground">• {s}</li>)}</ul>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-green-400 font-semibold mb-0.5">Best Models</p>
                    <p className="text-foreground">{b.bestModels}</p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-red-400 font-semibold mb-0.5">Avoid</p>
                    <p className="text-foreground">{b.avoidModels}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resale Values Tab ───────────────────────────────────────────────────────
const RESALE_DATA = [
  { make:'Toyota', model:'Aqua (GP10)', year:'2013–2017', bought:'PKR 1.8M', resale1yr:'PKR 1.7M', resale3yr:'PKR 1.5M', resale5yr:'PKR 1.3M', rating:'★★★★★', trend:'Stable' },
  { make:'Toyota', model:'Corolla (E170)', year:'2015–2019', bought:'PKR 2.8M', resale1yr:'PKR 2.7M', resale3yr:'PKR 2.4M', resale5yr:'PKR 2.0M', rating:'★★★★★', trend:'Stable' },
  { make:'Toyota', model:'Prado (J150)', year:'2015–2020', bought:'PKR 12M', resale1yr:'PKR 13M', resale3yr:'PKR 11M', resale5yr:'PKR 9M', rating:'★★★★★', trend:'Rising' },
  { make:'Honda', model:'Civic (FC)', year:'2017–2021', bought:'PKR 3.2M', resale1yr:'PKR 3.0M', resale3yr:'PKR 2.6M', resale5yr:'PKR 2.2M', rating:'★★★★', trend:'Stable' },
  { make:'Honda', model:'BRV', year:'2017–2022', bought:'PKR 2.4M', resale1yr:'PKR 2.2M', resale3yr:'PKR 1.9M', resale5yr:'PKR 1.6M', rating:'★★★★', trend:'Stable' },
  { make:'Suzuki', model:'Alto (660cc)', year:'2019–2023', bought:'PKR 1.2M', resale1yr:'PKR 1.15M', resale3yr:'PKR 1.0M', resale5yr:'PKR 0.85M', rating:'★★★', trend:'Declining' },
  { make:'Suzuki', model:'Swift (ZC13)', year:'2018–2022', bought:'PKR 2.0M', resale1yr:'PKR 1.9M', resale3yr:'PKR 1.65M', resale5yr:'PKR 1.4M', rating:'★★★', trend:'Stable' },
  { make:'BMW', model:'3 Series (F30)', year:'2015–2019', bought:'PKR 6.5M', resale1yr:'PKR 5.8M', resale3yr:'PKR 4.5M', resale5yr:'PKR 3.2M', rating:'★★★', trend:'Declining' },
  { make:'Mercedes', model:'C-Class (W205)', year:'2016–2020', bought:'PKR 7.5M', resale1yr:'PKR 6.8M', resale3yr:'PKR 5.5M', resale5yr:'PKR 3.8M', rating:'★★★', trend:'Declining' },
  { make:'Changan', model:'Alsvin', year:'2021–2023', bought:'PKR 2.6M', resale1yr:'PKR 2.3M', resale3yr:'PKR 1.9M', resale5yr:'PKR 1.5M', rating:'★★', trend:'Declining' },
  { make:'Nissan', model:'Dayz (B21W)', year:'2016–2020', bought:'PKR 1.5M', resale1yr:'PKR 1.4M', resale3yr:'PKR 1.2M', resale5yr:'PKR 0.95M', rating:'★★★', trend:'Stable' },
  { make:'Toyota', model:'Vitz (XP130)', year:'2014–2019', bought:'PKR 1.9M', resale1yr:'PKR 1.85M', resale3yr:'PKR 1.65M', resale5yr:'PKR 1.4M', rating:'★★★★', trend:'Stable' },
];

function ResaleValuesTab() {
  const [filterMake, setFilterMake] = React.useState('All');
  const makes = ['All', ...Array.from(new Set(RESALE_DATA.map(r => r.make)))];
  const filtered = filterMake === 'All' ? RESALE_DATA : RESALE_DATA.filter(r => r.make === filterMake);
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">💰 Pakistan Market Resale Value Guide</p>
        <p className="text-xs text-muted-foreground">Estimated resale values based on Pakistani market trends. Actual values vary by condition, mileage, and demand.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {makes.map(m => (
          <button key={m} onClick={() => setFilterMake(m)}
            className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-colors',
              filterMake === m ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {m}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {['Make / Model','Year','Purchase Price','After 1 Year','After 3 Years','After 5 Years','Resale Rating','Trend'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{r.make} {r.model}</td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.year}</td>
                <td className="px-3 py-2.5 text-foreground font-medium whitespace-nowrap">{r.bought}</td>
                <td className="px-3 py-2.5 text-green-400 whitespace-nowrap">{r.resale1yr}</td>
                <td className="px-3 py-2.5 text-yellow-400 whitespace-nowrap">{r.resale3yr}</td>
                <td className="px-3 py-2.5 text-orange-400 whitespace-nowrap">{r.resale5yr}</td>
                <td className="px-3 py-2.5 text-amber-400 whitespace-nowrap">{r.rating}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    r.trend === 'Rising' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                    r.trend === 'Declining' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
                    'bg-blue-400/10 text-blue-400 border-blue-400/20')}>
                    {r.trend}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
        <p className="text-xs text-amber-300 font-semibold mb-1">⚠ Disclaimer</p>
        <p className="text-xs text-muted-foreground">Values are approximate market estimates for good-condition vehicles with reasonable mileage (&lt;15,000 km/year). Import, reconditioned, and locally assembled variants may differ significantly.</p>
      </div>
    </div>
  );
}

// ─── Service Costs Tab ───────────────────────────────────────────────────────
const SERVICE_COSTS = [
  { service:'Oil Change (Mineral)',    toyota:'PKR 3,500–5,000',  honda:'PKR 4,000–6,000',  suzuki:'PKR 2,500–4,000', bmw:'PKR 12,000–18,000', notes:'Every 5,000 km' },
  { service:'Oil Change (Synthetic)',  toyota:'PKR 8,000–12,000', honda:'PKR 9,000–14,000', suzuki:'PKR 6,000–9,000',  bmw:'PKR 20,000–35,000', notes:'Every 10,000 km' },
  { service:'Air Filter',              toyota:'PKR 800–1,500',    honda:'PKR 1,000–1,800',  suzuki:'PKR 600–1,200',   bmw:'PKR 4,000–7,000',   notes:'Every 20,000 km' },
  { service:'Cabin Filter',            toyota:'PKR 700–1,200',    honda:'PKR 800–1,500',    suzuki:'PKR 500–900',     bmw:'PKR 3,500–6,000',   notes:'Every 15,000 km' },
  { service:'Spark Plugs (set)',        toyota:'PKR 2,000–4,000',  honda:'PKR 2,500–5,000',  suzuki:'PKR 1,500–3,000', bmw:'PKR 8,000–16,000',  notes:'Every 40,000 km' },
  { service:'Brake Pads (front)',      toyota:'PKR 4,000–8,000',  honda:'PKR 5,000–9,000',  suzuki:'PKR 3,000–6,000', bmw:'PKR 15,000–30,000', notes:'Every 40,000 km' },
  { service:'Brake Discs (front)',     toyota:'PKR 8,000–15,000', honda:'PKR 9,000–18,000', suzuki:'PKR 6,000–12,000',bmw:'PKR 30,000–60,000', notes:'Every 80,000 km' },
  { service:'Timing Belt / Chain',     toyota:'PKR 15,000–25,000',honda:'PKR 18,000–30,000',suzuki:'PKR 12,000–20,000',bmw:'PKR 50,000–100,000',notes:'Per manufacturer spec' },
  { service:'CVT/Auto Trans. Service', toyota:'PKR 8,000–15,000', honda:'PKR 10,000–20,000',suzuki:'PKR 6,000–12,000', bmw:'PKR 25,000–50,000', notes:'Every 40,000 km' },
  { service:'Battery Replacement',     toyota:'PKR 8,000–15,000', honda:'PKR 8,000–15,000', suzuki:'PKR 6,000–12,000', bmw:'PKR 20,000–40,000', notes:'Every 3–4 years' },
  { service:'Tyre Set (4)',            toyota:'PKR 25,000–50,000',honda:'PKR 25,000–55,000',suzuki:'PKR 20,000–40,000',bmw:'PKR 60,000–120,000',notes:'Every 40–60,000 km' },
  { service:'AC Service (full)',       toyota:'PKR 5,000–10,000', honda:'PKR 6,000–12,000', suzuki:'PKR 4,000–8,000',  bmw:'PKR 15,000–30,000', notes:'Annual' },
];

function ServiceCostsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">🔧 Typical Service & Maintenance Costs — Pakistan Market 2026</p>
        <p className="text-xs text-muted-foreground">Cost estimates for common service items at reputable service centres. Dealer prices may be 20–40% higher than independent garages.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {['Service Item','Toyota','Honda','Suzuki','BMW / Euro','Frequency / Notes'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERVICE_COSTS.map((s, i) => (
              <tr key={i} className={cn('border-t border-border hover:bg-muted/20 transition-colors', i % 2 === 0 ? '' : 'bg-muted/5')}>
                <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{s.service}</td>
                <td className="px-3 py-2.5 text-green-400 whitespace-nowrap">{s.toyota}</td>
                <td className="px-3 py-2.5 text-blue-400 whitespace-nowrap">{s.honda}</td>
                <td className="px-3 py-2.5 text-yellow-400 whitespace-nowrap">{s.suzuki}</td>
                <td className="px-3 py-2.5 text-red-400 whitespace-nowrap">{s.bmw}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { brand:'Toyota / Suzuki', annual:'PKR 30,000–60,000', color:'text-green-400', desc:'Most affordable to maintain — wide parts availability, competitive service market.' },
          { brand:'Honda / Nissan', annual:'PKR 40,000–80,000', color:'text-blue-400', desc:'Moderate costs — VTEC engines reliable, iDCD/e-CVT may need specialist care.' },
          { brand:'BMW / Mercedes', annual:'PKR 150,000–500,000+', color:'text-red-400', desc:'Very high ownership costs — specialist tools, genuine parts expensive, complex electronics.' },
        ].map(({ brand, annual, color, desc }) => (
          <div key={brand} className="bg-muted/20 border border-border rounded-xl p-3">
            <p className={cn('text-sm font-bold mb-0.5', color)}>{brand}</p>
            <p className="text-xs font-semibold text-foreground mb-1">Annual Est: {annual}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chinese Cars Tech Tab ────────────────────────────────────────────────────
const CHINESE_CARS = [
  {
    brand: 'Deepal',
    model: 'S05',
    type: 'Electric SUV',
    color: 'from-blue-600 to-cyan-500',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    emoji: '⚡',
    pkrPrice: 'PKR 8.5M–10.5M',
    topFeatures: [
      { icon: '🅿️', title: 'Smart Remote Parking', desc: 'Stand outside the car, hold the remote key and the car reverses itself into tight parking spots — no driver needed. Works for parallel and perpendicular parking.' },
      { icon: '🤖', title: 'Deepal AI Assistant', desc: 'Built-in natural language AI assistant powered by CHANGAN AI. Understands conversational commands: "Turn on AC to 22°C", "Find nearest EV charger", "Play calm music".' },
      { icon: '📡', title: 'Vehicle-to-Everything (V2X)', desc: 'Communicates with traffic signals, other vehicles, and road infrastructure. Warns of upcoming hazards before they are visible to the driver.' },
      { icon: '🛡️', title: 'ADAS Level 2+ (NOA)', desc: 'Navigate On Autopilot — handles highway lane changes, entry/exit ramps, and speed adjustment automatically. Cameras + radar + ultrasonic sensor fusion.' },
      { icon: '🔋', title: 'Blade-style LFP Battery', desc: '66 kWh LFP battery with 530km CLTC range. 80% charge in 30 minutes on 150kW DC fast charger. Battery thermal management optimised for hot climates.' },
    ],
    specs: [{ k: 'Motor', v: '215 hp single motor' }, { k: 'Range', v: '530 km (CLTC)' }, { k: 'Charge', v: '0–80% in 30 min' }, { k: 'Screen', v: '15.6" rotating + 10.25" HUD' }],
    pkNotes: 'Assembly planned at Changan Pakistan facility. Parts availability improving. Excellent tech-to-price ratio vs Japanese hybrids.',
  },
  {
    brand: 'BYD',
    model: 'Atto 3',
    type: 'Electric SUV',
    color: 'from-green-600 to-emerald-400',
    badge: 'bg-green-500/15 text-green-400 border-green-500/30',
    emoji: '🌿',
    pkrPrice: 'PKR 9.5M–11.5M',
    topFeatures: [
      { icon: '🔋', title: 'Blade Battery (LFP)', desc: 'BYD\'s revolutionary Blade Battery uses cell-to-pack technology — no modules. Passes nail penetration test without fire or explosion. Industry benchmark for safety.' },
      { icon: '🌀', title: 'DiSus-C Intelligent Suspension', desc: 'Intelligent body control system continuously adjusts damping based on road surface, speed, and driving style. Reduces roll and pitch by 40% vs conventional suspension.' },
      { icon: '🎮', title: 'Rotating 15.6" Touchscreen', desc: 'Massive rotating display switches between landscape (entertainment/nav) and portrait (music/social) modes with a single touch. Android Auto + Apple CarPlay wired/wireless.' },
      { icon: '🛡️', title: 'BYD DiPilot ADAS Suite', desc: 'Full ADAS: adaptive cruise, auto emergency braking, blind spot monitoring, rear cross-traffic alert, lane keep assist, driver fatigue monitoring via cabin camera.' },
      { icon: '💪', title: 'e-Platform 3.0', desc: 'BYD\'s dedicated EV architecture with 8-in-1 powertrain integration. Heat pump standard for efficient cabin heating in winter. 800V-ready architecture for future ultra-fast charging.' },
    ],
    specs: [{ k: 'Motor', v: '204 hp front motor' }, { k: 'Range', v: '420 km (WLTP)' }, { k: 'Battery', v: '60.5 kWh LFP Blade' }, { k: 'Screen', v: '15.6" rotating OLED' }],
    pkNotes: 'BYD officially entered Pakistan 2024. Authorised dealerships in Karachi/Lahore. Blade Battery certified fire-safe — key selling point for safety-conscious buyers.',
  },
  {
    brand: 'BYD',
    model: 'Shark',
    type: 'Plug-in Hybrid Pickup',
    color: 'from-red-600 to-orange-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    emoji: '🦈',
    pkrPrice: 'PKR 14M–17M',
    topFeatures: [
      { icon: '⚡', title: 'PHEV Pickup — 432hp Powertrain', desc: '1.5T turbo + dual electric motors = 432hp combined. 0–100 km/h in 5.7s. 100km electric-only range for city use, unlimited range on petrol via on-board generator.' },
      { icon: '🔌', title: 'Vehicle-to-Load (V2L)', desc: 'Export up to 10 kW of power from the pickup bed. Power tools, camping equipment, or even a home during outages. 220V output from dedicated sockets.' },
      { icon: '🏔️', title: 'Intelligent 4WD with Torque Vector', desc: 'Front ICE + rear dual-motor setup with torque vectoring. Wading depth 800mm. Six terrain modes including mud, sand, rock crawl, and snow.' },
      { icon: '📱', title: 'DiLink 100 Smart Cockpit', desc: '12.8" rotating central screen with DiLink OS. 5G connectivity, over-the-air updates, built-in DJI drone control integration, and 50W wireless charging.' },
      { icon: '🛡️', title: 'Integrated Body-on-Frame EV Platform', desc: 'World\'s first mass-production PHEV pickup on a purpose-built EV-compatible ladder frame. Tow capacity 4,500kg. Payload 1,000kg. Rear air suspension standard.' },
    ],
    specs: [{ k: 'Powertrain', v: '1.5T + dual EM (PHEV)' }, { k: 'Combined HP', v: '432 hp' }, { k: 'EV Range', v: '100 km pure electric' }, { k: 'Tow', v: '4,500 kg' }],
    pkNotes: 'Growing interest in Pakistan for construction and outdoor segment. Higher duty due to pickup classification. First PHEV pickup available in market.',
  },
  {
    brand: 'Jetour',
    model: 'Dashing',
    type: 'Compact SUV',
    color: 'from-violet-600 to-purple-400',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    emoji: '🚀',
    pkrPrice: 'PKR 5.5M–7.5M',
    topFeatures: [
      { icon: '✨', title: 'Crystal Interior Illumination', desc: 'Ambient light system with 64-colour LED strip running the full dash width. Syncs with music, speed, and ADAS alerts. Creates a premium feel at an affordable price point.' },
      { icon: '🎵', title: 'HIFI Sound System', desc: '12-speaker Bose-tuned surround system standard on top trim. Customised for SUV cabin acoustics. Separate subwoofer under driver seat.' },
      { icon: '🛡️', title: 'Level 2 ADAS — Chery Platform', desc: 'Full suite: AEB, LKA, LCC, ACC, BSM, RCTA, rear AEB. Front single camera + 4 ultrasonic radars. Highway assist handles speed and lane changes.' },
      { icon: '🔧', title: '1.6T TGDI Engine', desc: '197hp turbocharged direct-injection petrol engine. 7-speed DCT (wet clutch) for smooth shifts. WLTC fuel economy: 7.2L/100km. Engine mapped for 91–95 RON fuel.' },
      { icon: '📲', title: 'Flyme Auto OS', desc: 'Meizu-developed Flyme Auto infotainment on a 12.3" + 10.25" dual screen. Supports WeChat for Cars, DuerOS voice, wireless CarPlay/AA, and OTA updates.' },
    ],
    specs: [{ k: 'Engine', v: '1.6T TGDI 197hp' }, { k: 'Trans', v: '7-speed wet DCT' }, { k: 'Screen', v: '12.3" + 10.25" dual' }, { k: 'Body', v: '4,548mm compact SUV' }],
    pkNotes: 'Jetour (Chery sub-brand) officially in Pakistan via Excel Cars. Popular with first-time new-car buyers. Affordable Chinese tech stack vs Japanese equivalent.',
  },
  {
    brand: 'Xpeng',
    model: 'G6',
    type: 'Electric Coupe SUV',
    color: 'from-sky-600 to-blue-400',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    emoji: '🧠',
    pkrPrice: 'PKR 11M–14M',
    topFeatures: [
      { icon: '🧠', title: 'XNGP Autonomous Driving', desc: 'Xpeng\'s NGP (Navigation Guided Pilot) handles full highway driving including lane changes, exits, and speed limits. City NGP (beta) navigates urban intersections without HD maps.' },
      { icon: '🔭', title: 'LIDAR + Vision Fusion', desc: 'Forward-facing LiDAR + 12 cameras + 5 radar units. 360° perception with 200m forward visibility. Detects pedestrians, cyclists, debris, and vehicles in all conditions.' },
      { icon: '⚡', title: '800V Superfast Charging', desc: '5C ultra-fast charge: 10–80% in 14 minutes on Xpeng S5 supercharger. 300km range added in 15 minutes. Compatible with 120kW public DC chargers.' },
      { icon: '🌐', title: 'Smart OTA Updates', desc: 'Over-the-air full-stack updates including ADAS algorithms, motor calibration, suspension tuning, and UI. Car improves every month post-purchase without service visits.' },
      { icon: '🏎️', title: 'Rear-Biased Dual Motor AWD', desc: '444hp dual motor with electronic torque vectoring. 0–100 in 3.9s. Xpeng AI-managed traction control adjusts 100 times per second per wheel for optimal grip.' },
    ],
    specs: [{ k: 'Motor', v: '444hp AWD dual' }, { k: 'Range', v: '570 km CLTC' }, { k: 'Charge', v: '10–80% in 14 min (800V)' }, { k: 'ADAS', v: 'XNGP Level 2+' }],
    pkNotes: 'Not yet officially in Pakistan but grey imports arriving. High-tech buyers attracted by ADAS and 800V charging. Parts support currently limited — buyer beware.',
  },
  {
    brand: 'GAC Aion',
    model: 'Y Plus',
    type: 'Electric Crossover',
    color: 'from-amber-500 to-yellow-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    emoji: '⚡',
    pkrPrice: 'PKR 7M–9M',
    topFeatures: [
      { icon: '🔋', title: 'Sponge Silicon Anode Battery', desc: 'GAC\'s proprietary battery tech uses silicon sponge anode material — 50% higher energy density vs standard lithium cells. 1,000 charge cycle life with <20% degradation.' },
      { icon: '❄️', title: 'High-Efficiency Heat Pump HVAC', desc: 'Works down to -30°C without significant range penalty. Recovers heat from motor waste, battery, and outdoor air. Extends range by 25% in cold weather vs resistive heating.' },
      { icon: '🚗', title: 'IN CONTROL Smart Cockpit', desc: 'IN CONTROL 3.0 OS with 14.6" central display + 10.25" digital instrument cluster. 5G + WiFi 6. Voice control with natural language. Supports 30+ OTA updates annually.' },
      { icon: '🛡️', title: 'ADiGO Smart Driving (Level 2)', desc: 'Full ADAS suite: AEB, ACC, LKA, LDW, BSM, HWA (highway assist). Cabin camera monitors driver attention. Auto-emergercy call feature if crash detected.' },
      { icon: '💨', title: 'Ultra-Low Drag Coefficient (Cd 0.247)', desc: 'Flush door handles, aero-optimised underbody, active air curtains. Cd of 0.247 — better than Tesla Model 3 (0.23 is comparable). Contributes 40km extra range vs comparable EV.' },
    ],
    specs: [{ k: 'Motor', v: '180 hp / 350 Nm' }, { k: 'Range', v: '600 km CLTC' }, { k: 'Battery', v: '70.99 kWh Silicon Anode' }, { k: 'Drag', v: 'Cd 0.247' }],
    pkNotes: 'GAC Aion officially launched in Pakistan 2024 via Regal Automobiles. Service network expanding. Silicon battery tech is genuinely class-leading.',
  },
  {
    brand: 'Chery',
    model: 'Tiggo 8 Pro',
    type: 'Full-size SUV',
    color: 'from-slate-600 to-gray-400',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    emoji: '🏔️',
    pkrPrice: 'PKR 9M–12M',
    topFeatures: [
      { icon: '🎪', title: '7-Seat Panoramic SUV', desc: 'Three-row seating for 7 with genuine 3rd row legroom. Power-fold 3rd row. Panoramic sunroof spanning all three rows — massive visual impact and cabin light.' },
      { icon: '🔧', title: '2.0T SQRE4T20 Engine', desc: '254hp 2.0L turbocharged engine with DI. 390Nm torque from 1,750rpm. 8-speed automatic. AWD with locking centre diff. Excellent for mixed urban/highway use.' },
      { icon: '🛡️', title: 'Chery ADAS (L2)', desc: 'AEB, FCW, LKA, LDW, BSM, DOW, RCTA, ACC, ICA. 2 cameras + 4 radars. Active safety system includes cross-traffic braking at low speed for parking lots.' },
      { icon: '📻', title: 'CHERY CLOUD Car Connectivity', desc: '12.3" Qualcomm-powered infotainment with Chery Cloud. Remote start/lock/AC via phone app. Live traffic data. Real-time vehicle diagnostics and service alerts.' },
      { icon: '🏁', title: 'Sport / Mud / Snow Modes', desc: '4WD system with 5 driving modes: Normal, Eco, Sport, Snow, and Off-Road. Electronic locking diff on AWD variants. Ground clearance 212mm for light off-road.' },
    ],
    specs: [{ k: 'Engine', v: '2.0T 254hp 390Nm' }, { k: 'Trans', v: '8-speed auto AWD' }, { k: 'Seats', v: '7-seater' }, { k: 'Boot', v: '745L (3rd row folded)' }],
    pkNotes: 'Chery well-established in Pakistan through Al-Haj Automotive. Parts availability is among the best for Chinese brands. Good competitor to Fortuner at significantly lower price.',
  },
];

function ChineseCarsTab() {
  const [selected, setSelected] = useState(CHINESE_CARS[0].model + CHINESE_CARS[0].brand);
  const car = CHINESE_CARS.find(c => c.model + c.brand === selected) ?? CHINESE_CARS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <Cpu className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-foreground">Top 5 Tech Features — New Chinese Cars in Pakistan</p>
          <p className="text-xs text-muted-foreground mt-0.5">Deepal, BYD, Jetour, Xpeng, Aion and more — the features that set them apart from Japanese and Korean competition.</p>
        </div>
      </div>

      {/* Car selector */}
      <div className="flex flex-wrap gap-2">
        {CHINESE_CARS.map(c => (
          <button key={c.brand + c.model} onClick={() => setSelected(c.model + c.brand)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              selected === c.model + c.brand
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50')}>
            {c.emoji} {c.brand} {c.model}
          </button>
        ))}
      </div>

      {/* Car header */}
      <div className={cn('rounded-2xl p-5 bg-gradient-to-br text-white relative overflow-hidden', car.color)}>
        <div className="absolute inset-0 bg-black/20 rounded-2xl" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{car.emoji}</span>
              <div>
                <p className="text-xs font-medium text-white/70">{car.brand}</p>
                <h2 className="text-xl font-bold text-white">{car.model}</h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-white/30 text-[10px]">{car.type}</Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-[10px]">{car.pkrPrice}</Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-white/60">Pakistan Notes</p>
            <p className="text-xs text-white/90 max-w-[200px] mt-1 leading-relaxed">{car.pkNotes}</p>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {car.specs.map(s => (
            <div key={s.k} className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] text-white/60">{s.k}</p>
              <p className="text-xs font-bold text-white">{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 features */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-primary" /> Top 5 Standout Features
        </p>
        <div className="space-y-3">
          {car.topFeatures.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-lg">
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-1.5 py-0">{i + 1}</Badge>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Car Parts Visual Guide Tab ────────────────────────────────────────────────
const CAR_PARTS = [
  {
    system: 'Engine & Powertrain',
    icon: '🔩',
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    parts: [
      { name: 'Engine Block', desc: 'Main structural component housing pistons, crankshaft, and combustion chambers. Cast iron or aluminium alloy. Inspect for cracks, oil leaks around gaskets, and excessive blow-by.', warning: 'Blue smoke = oil burning. White smoke = coolant leak. Black smoke = rich fuel mixture.', cost: 'PKR 150K–800K (rebuilt)', lifespan: '200,000–400,000 km' },
      { name: 'Cylinder Head & Gasket', desc: 'Top of the engine. Contains intake/exhaust valves, camshafts, and injectors. Head gasket seals between head and block — failure causes coolant mixing with oil.', warning: 'Mayonnaise-like oil = head gasket failure. Overheating = suspect head gasket or warped head.', cost: 'PKR 15K–80K (gasket)', lifespan: '150,000+ km if no overheating' },
      { name: 'Timing Belt / Chain', desc: 'Synchronises crankshaft and camshaft rotation. Belt degrades over time; chain lasts longer. Failure causes catastrophic valve-piston collision on interference engines.', warning: 'Ticking sound from top of engine = tensioner or chain wear. Replace belt at 60,000–100,000 km regardless.', cost: 'PKR 8K–35K (belt kit)', lifespan: '60K–100K km (belt), 200K+ (chain)' },
      { name: 'Turbocharger', desc: 'Forces extra air into intake manifold increasing power. Driven by exhaust gases. Common on modern 1.0T–2.0T engines. Requires good oil quality and cool-down time.', warning: 'Whistling under boost = boost leak. Lag + smoke = turbo bearing wear. Always idle 1–2 min before shutdown.', cost: 'PKR 50K–250K', lifespan: '150,000–250,000 km with good oil' },
      { name: 'Transmission / Gearbox', desc: 'Transfers engine power to wheels via selected gear ratios. Types: Manual (MT), Automatic (AT), CVT (belt/pulley), DCT (dual-clutch). Each has different service requirements.', warning: 'Slipping gears, delayed engagement, shudder = fluid degraded or mechanical wear. CVT failure is very expensive.', cost: 'PKR 80K–500K (rebuild)', lifespan: '200K km (MT/AT), 150K (CVT if maintained)' },
      { name: 'Hybrid Battery Pack', desc: 'High-voltage NiMH or Li-ion pack powering the electric motor in hybrid vehicles. Located under rear seats or boot floor. Capacity degrades ~20% over 10 years.', warning: 'Orange triangle warning = battery fault. Fuel economy drop = cell degradation. Test SOH before buying used hybrid.', cost: 'PKR 150K–600K (replace)', lifespan: '150,000–250,000 km typically' },
    ],
  },
  {
    system: 'Suspension & Steering',
    icon: '🛞',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    parts: [
      { name: 'Shock Absorbers / Struts', desc: 'Damps oscillation from springs after road bumps. MacPherson strut (front), separate damper (rear) are common. Worn shocks cause bouncy ride and extended braking distance.', warning: 'Bouncing after bump, nose-dive under braking, fluid leaks on damper body = replace immediately.', cost: 'PKR 8K–40K per corner', lifespan: '80,000–120,000 km' },
      { name: 'Coil Springs', desc: 'Supports vehicle weight and absorbs road impacts. Works with shocks. Broken spring is a safety hazard — vehicle sits unevenly, tyre wear increases dramatically.', warning: 'Clunking over bumps, uneven ride height = broken or sagged spring. Inspect visually for cracks or separation.', cost: 'PKR 6K–20K per spring', lifespan: '150,000–200,000 km' },
      { name: 'Control Arms & Bushings', desc: 'Connect wheel assembly to chassis. Rubber bushings isolate vibration. Worn bushings cause vague steering and wandering. Ball joint wear is a safety concern.', warning: 'Clunking from front on bumps, steering wander, uneven tyre wear = worn bushings or ball joint.', cost: 'PKR 5K–30K (bushings/arm)', lifespan: '100,000–150,000 km' },
      { name: 'Steering Rack / EPS', desc: 'Translates steering wheel input to wheel direction. Hydraulic (HPS) uses pump + fluid; Electric (EPS) uses motor. EPS common on modern cars — no fluid to leak.', warning: 'Stiff steering = EPS motor fault or low power steering fluid (HPS). Loose steering = worn rack ends.', cost: 'PKR 20K–120K', lifespan: '200,000+ km' },
      { name: 'Wheel Bearings', desc: 'Allows wheel to spin freely. Sealed units on modern cars. Worn bearings cause humming/grinding noise that changes with speed. Safety-critical — wheel separation possible if severely neglected.', warning: 'Humming that changes with speed and direction = wheel bearing. Confirm by changing lanes — noise changes side.', cost: 'PKR 4K–15K per corner', lifespan: '150,000–200,000 km' },
    ],
  },
  {
    system: 'Braking System',
    icon: '🛑',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    parts: [
      { name: 'Brake Pads', desc: 'Friction material pressed against rotors to slow the vehicle. Front pads wear 2–3× faster than rear. Minimum thickness 2mm — below 1.5mm = replace immediately. Noise indicator built in.', warning: 'Squealing = wear indicator contact. Grinding = metal-on-metal, replace now. Pulsating pedal = warped rotor.', cost: 'PKR 3K–15K per axle', lifespan: '30,000–60,000 km' },
      { name: 'Brake Rotors (Discs)', desc: 'Cast iron or composite disc that pads clamp against. Can warp from heat cycles or corrosion. Minimum thickness stamped on rotor — never machine below it. Slotted/drilled improve heat dissipation.', warning: 'Vibration under braking = warped rotor. Deep grooves = worn beyond limit. Blue tint = overheating damage.', cost: 'PKR 8K–35K per axle', lifespan: '60,000–100,000 km' },
      { name: 'Brake Callipers', desc: 'Hydraulic clamp that presses pads against rotor. Pistons can seize (especially single-slide type) causing dragging brakes, uneven wear, and excessive heat. Rear electric parking callipers can fail electronically.', warning: 'Pulling to one side = seized calliper. Excessive heat on one wheel = dragging calliper piston.', cost: 'PKR 10K–60K per corner', lifespan: '150,000+ km (can be rebuilt)' },
      { name: 'Brake Master Cylinder & Lines', desc: 'Converts pedal pressure to hydraulic force. Brake fluid is hygroscopic — absorbs moisture, lowering boiling point. Lines can corrode in humid/salty conditions. Flush fluid every 2 years.', warning: 'Spongy pedal = air in lines or master cylinder failure. Brake fluid leak = critical safety issue.', cost: 'PKR 5K–25K (master cyl)', lifespan: '200,000+ km (fluid every 2 years)' },
      { name: 'ABS / ESC / EBD Modules', desc: 'ABS prevents wheel lockup under braking. ESC prevents skidding. EBD distributes braking force front/rear. Sensors can fail, triggering warning lights — usually wheel speed sensors first.', warning: 'ABS light on = wheel speed sensor or ABS module fault. ESC light = yaw sensor or wheel sensor issue.', cost: 'PKR 8K–80K (sensor to module)', lifespan: '200,000+ km (sensors more fragile)' },
    ],
  },
  {
    system: 'Electrical & Electronics',
    icon: '⚡',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    parts: [
      { name: 'Battery (12V / 48V)', desc: 'Starts the vehicle and powers accessories when engine is off. Lead-acid (12V traditional), AGM (start-stop systems), or 48V LFP/Li-ion (mild hybrids). Capacity fades with heat and age.', warning: 'Slow crank = weak battery. Lights dimming = failing alternator or dying battery. Test voltage: 12.6V = good, <12.2V = replace.', cost: 'PKR 8K–35K', lifespan: '3–5 years (lead-acid), 6–10 (AGM)' },
      { name: 'Alternator', desc: 'Charges battery and powers electrical systems while engine runs. Output typically 13.5–14.5V. Failure leads to battery drain and eventual engine stall. Brushes wear in older units.', warning: 'Battery light on + voltmeter below 13V with engine running = alternator failing. Squealing belt may indicate worn alternator bearing.', cost: 'PKR 15K–80K', lifespan: '150,000–200,000 km' },
      { name: 'Fuse Box & Relays', desc: 'Fuses protect circuits from overcurrent. Relays switch high-current circuits (fuel pump, AC compressor). Blown fuse = check for short circuit cause before replacing. Relay click test: remove and shake for internal rattle.', warning: 'Single component failure (one window, one light) = fuse or relay. Multiple failures = possible ECU or wiring issue.', cost: 'PKR 200–2,000 (fuses/relays)', lifespan: 'Vehicle life (replace as failed)' },
      { name: 'ECU / PCM / TCM', desc: 'Engine Control Unit manages fuel injection, timing, and emissions. PCM (combined engine+trans). TCM (transmission). Software issues resolved by reflash; hardware failure less common.', warning: 'Check Engine light + multiple codes = possible ECU fault. Always read codes before assuming ECU — sensors fail more often.', cost: 'PKR 25K–200K (rebuild/replace)', lifespan: 'Vehicle life if not water-damaged' },
      { name: 'Sensors (O2, MAF, MAP, TPS)', desc: 'O2 sensor monitors exhaust for fuel trim. MAF measures intake air. MAP measures manifold pressure. TPS tracks throttle position. Sensor failures are the most common Check Engine causes.', warning: 'Poor fuel economy + Check Engine = often O2 or MAF sensor. Hesitation under throttle = TPS or MAF. Black smoke = faulty O2.', cost: 'PKR 2K–15K per sensor', lifespan: '80,000–150,000 km' },
    ],
  },
  {
    system: 'Cooling & Fluids',
    icon: '🌊',
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    parts: [
      { name: 'Radiator', desc: 'Dissipates engine heat via coolant flow and airflow. Aluminium core with plastic tanks on modern cars. Fins clog with debris in Pakistan roads — clean annually. Overheating causes massive engine damage.', warning: 'Overheating gauge rising = low coolant, blocked radiator, or failing thermostat. Never open radiator cap on hot engine.', cost: 'PKR 12K–60K', lifespan: '150,000–200,000 km' },
      { name: 'Water Pump', desc: 'Circulates coolant through engine and radiator. Driven by timing belt (replace together!) or serpentine belt. Seal failure causes coolant leak; impeller failure causes overheating.', warning: 'Coolant leak near timing cover = water pump seal. Overheating with coolant level OK = impeller worn. Replace with timing belt as preventive measure.', cost: 'PKR 5K–25K', lifespan: '60,000–100,000 km (belt-driven)' },
      { name: 'Thermostat', desc: 'Controls engine warm-up by blocking coolant flow until operating temperature (85–95°C). Stuck open = slow warm-up, poor heater output, slightly worse fuel economy. Stuck closed = overheating.', warning: 'Heater not warming up = stuck-open thermostat. Engine overheating suddenly = stuck-closed thermostat (urgent!).', cost: 'PKR 1K–8K', lifespan: '100,000–150,000 km' },
      { name: 'Engine Oil & Filter', desc: 'Oil lubricates, cools, and cleans engine internals. Oil filter traps contaminants. Pakistan heat + dusty conditions means more frequent changes needed: every 5,000km (mineral), 7,500km (semi-syn), 10,000km (full-syn).', warning: 'Oil pressure light = critical — stop engine immediately. Milky oil = coolant contamination (head gasket). Dark black + metal particles = overdue change.', cost: 'PKR 2K–6K (DIY change)', lifespan: '5,000–10,000 km per change' },
      { name: 'AC Compressor & Refrigerant', desc: 'Compressor pressurises refrigerant (R134a or R1234yf) for cooling cycle. Condenser (front), evaporator (cabin), expansion valve, and dryer complete the system. Pakistan heat stresses AC heavily.', warning: 'Warm air with AC on = low refrigerant (leak) or failed compressor. Clicking compressor clutch = low refrigerant pressure cutout. AC gas recharge: PKR 3,000–6,000.', cost: 'PKR 25K–120K (compressor)', lifespan: '150,000 km compressor / gas top-up every 2–3 years' },
    ],
  },
];

function CarPartsTab() {
  const [activeSystem, setActiveSystem] = useState(0);
  const [expandedPart, setExpandedPart] = useState<number | null>(null);
  const sys = CAR_PARTS[activeSystem];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <Wrench className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-foreground">Car Parts Visual Guide</p>
          <p className="text-xs text-muted-foreground mt-0.5">What every car part does, what can go wrong, cost to fix, and lifespan — essential knowledge for buyers and dealers.</p>
        </div>
      </div>

      {/* System selector */}
      <div className="flex flex-wrap gap-2">
        {CAR_PARTS.map((s, i) => (
          <button key={s.system} onClick={() => { setActiveSystem(i); setExpandedPart(null); }}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              activeSystem === i
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40')}>
            <span>{s.icon}</span> {s.system}
          </button>
        ))}
      </div>

      {/* System header */}
      <div className={cn('flex items-center gap-3 p-3 rounded-xl border', sys.color)}>
        <span className="text-2xl">{sys.icon}</span>
        <div>
          <p className="font-bold text-sm text-foreground">{sys.system}</p>
          <p className="text-xs text-muted-foreground">{sys.parts.length} components · Click any part for full details</p>
        </div>
      </div>

      {/* Parts list */}
      <div className="space-y-2">
        {sys.parts.map((part, i) => (
          <motion.div key={part.name} layout className="border border-border rounded-xl overflow-hidden bg-card">
            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedPart(expandedPart === i ? null : i)}>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-base', sys.color)}>
                {['🔩','⚙️','⛓️','💨','🔄','🔋','🛞','🌀','🦾','↔️','⭕','🛑','🔵','🔴','🎯','⚡','🔌','💡','🖥️','📡','❄️','💧','🌡️','🛢️','🌬️'][i % 25]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{part.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{part.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-muted/50 text-muted-foreground border-border text-[9px] hidden md:flex">{part.lifespan}</Badge>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', expandedPart === i && 'rotate-180')} />
              </div>
            </button>
            {expandedPart === i && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground leading-relaxed pt-3">{part.desc}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">⚠ Warning Signs</p>
                    <p className="text-xs text-foreground/90 leading-relaxed">{part.warning}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">💰 Repair Cost (PK)</p>
                    <p className="text-sm font-bold text-green-400">{part.cost}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">📅 Expected Lifespan</p>
                    <p className="text-sm font-bold text-blue-400">{part.lifespan}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CarKnowledgeLibraryPage() {
  const [activeTab, setActiveTab] = useState('warnings');
  const active = LIBRARY_TABS.find(t => t.id === activeTab)!;
  const Component = active.component;

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
          <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary"/>Car Knowledge Library</h1>
          <p className="text-sm text-muted-foreground">Comprehensive automotive reference for professionals — {LIBRARY_TABS.length} sections</p>
        </motion.div>

        {/* Tab navigation — horizontal scroll */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-max">
            {LIBRARY_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all',
                  activeTab===tab.id ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80')}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.2}}>
          <Component />
        </motion.div>
      </div>
    </AppLayout>
  );
}
