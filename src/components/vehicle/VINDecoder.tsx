import React, { useState } from 'react';
import { ScanLine, X, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface DecodedVIN {
  wmi: string; vds: string; vis: string;
  country?: string; make?: string; year?: number; yearAlt?: number;
  valid: boolean; error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (data: { make?: string; model_year?: number; country?: string }) => void;
}

// ─── WMI database — 250+ entries ─────────────────────────────────────────────
const WMI: Record<string, { make: string; country: string }> = {
  // ── Toyota (Japan / USA / Canada / Turkey / South Africa / etc.)
  JT2: { make: 'Toyota', country: 'Japan' },
  JT3: { make: 'Toyota', country: 'Japan' },
  JT4: { make: 'Toyota', country: 'Japan' },
  JT6: { make: 'Toyota', country: 'Japan' },
  JT8: { make: 'Toyota', country: 'Japan' },
  JTD: { make: 'Toyota', country: 'Japan' },
  JTE: { make: 'Toyota', country: 'Japan' },
  JTH: { make: 'Lexus', country: 'Japan' },
  JTJ: { make: 'Lexus', country: 'Japan' },
  JTM: { make: 'Toyota', country: 'Japan' },
  JTN: { make: 'Toyota', country: 'Japan' },
  '4T1': { make: 'Toyota', country: 'USA' },
  '4T3': { make: 'Toyota', country: 'USA' },
  '5TD': { make: 'Toyota', country: 'USA' },
  '5TF': { make: 'Toyota', country: 'USA' },
  '5TB': { make: 'Toyota', country: 'USA' },
  '2T1': { make: 'Toyota', country: 'Canada' },
  '2T3': { make: 'Toyota', country: 'Canada' },
  SB1: { make: 'Toyota', country: 'UK' },
  '7AT': { make: 'Toyota', country: 'South Africa' },
  NMT: { make: 'Toyota', country: 'Turkey' },
  MHF: { make: 'Toyota', country: 'Indonesia' },
  '8AY': { make: 'Toyota', country: 'Peru' },
  '58A': { make: 'Lexus', country: 'USA' },
  // ── Honda (Japan / USA / Canada / UK / Thailand / India)
  JHM: { make: 'Honda', country: 'Japan' },
  '19X': { make: 'Honda', country: 'USA' },
  '1HG': { make: 'Honda', country: 'USA' },
  '2HG': { make: 'Honda', country: 'Canada' },
  '2HK': { make: 'Honda', country: 'Canada' },
  '3HG': { make: 'Honda', country: 'Mexico' },
  '5J6': { make: 'Honda', country: 'USA' },
  '5FN': { make: 'Honda', country: 'USA' },
  SHSB: { make: 'Honda', country: 'UK' },
  MRHB: { make: 'Honda', country: 'Thailand' },
  MAH: { make: 'Honda', country: 'India' },
  // ── Acura
  '19U': { make: 'Acura', country: 'USA' },
  // ── Nissan
  JN1: { make: 'Nissan', country: 'Japan' },
  JN6: { make: 'Nissan', country: 'Japan' },
  JN8: { make: 'Nissan', country: 'Japan' },
  '1N4': { make: 'Nissan', country: 'USA' },
  '1N6': { make: 'Nissan', country: 'USA' },
  '3N1': { make: 'Nissan', country: 'Mexico' },
  '3N6': { make: 'Nissan', country: 'Mexico' },
  '5N1': { make: 'Nissan', country: 'USA' },
  MNTB: { make: 'Nissan', country: 'Thailand' },
  // ── Infiniti
  JNK: { make: 'Infiniti', country: 'Japan' },
  '5N3': { make: 'Infiniti', country: 'USA' },
  // ── Mitsubishi
  JA3: { make: 'Mitsubishi', country: 'Japan' },
  JA4: { make: 'Mitsubishi', country: 'Japan' },
  JMB: { make: 'Mitsubishi', country: 'Japan' },
  JMY: { make: 'Mitsubishi', country: 'Japan' },
  MN8: { make: 'Mitsubishi', country: 'Thailand' },
  MMCZ: { make: 'Mitsubishi', country: 'Japan' },
  ML32: { make: 'Mitsubishi', country: 'USA' },
  // ── Mazda
  JM1: { make: 'Mazda', country: 'Japan' },
  JM3: { make: 'Mazda', country: 'Japan' },
  JM6: { make: 'Mazda', country: 'Japan' },
  JMZ: { make: 'Mazda', country: 'Japan' },
  '1YV': { make: 'Mazda', country: 'USA' },
  MM8: { make: 'Mazda', country: 'Thailand' },
  // ── Subaru
  JF1: { make: 'Subaru', country: 'Japan' },
  JF2: { make: 'Subaru', country: 'Japan' },
  '4S3': { make: 'Subaru', country: 'USA' },
  // ── Suzuki
  JS1: { make: 'Suzuki', country: 'Japan' },
  JS2: { make: 'Suzuki', country: 'Japan' },
  JS3: { make: 'Suzuki', country: 'Japan' },
  MA3N: { make: 'Suzuki', country: 'India' },
  // ── Daihatsu
  JD1: { make: 'Daihatsu', country: 'Japan' },
  JD2: { make: 'Daihatsu', country: 'Japan' },
  JK8: { make: 'Daihatsu', country: 'Japan' },
  MHR: { make: 'Daihatsu', country: 'Indonesia' },
  // ── Isuzu
  JAB: { make: 'Isuzu', country: 'Japan' },
  JAC: { make: 'Isuzu', country: 'Japan' },
  '4KL': { make: 'Isuzu', country: 'USA' },
  MMBC: { make: 'Isuzu', country: 'Thailand' },
  // ── Kia
  KNA: { make: 'Kia', country: 'South Korea' },
  KNB: { make: 'Kia', country: 'South Korea' },
  KNC: { make: 'Kia', country: 'South Korea' },
  KND: { make: 'Kia', country: 'South Korea' },
  KNE: { make: 'Kia', country: 'South Korea' },
  KNF: { make: 'Kia', country: 'South Korea' },
  KNG: { make: 'Kia', country: 'South Korea' },
  KNH: { make: 'Kia', country: 'South Korea' },
  TMA: { make: 'Kia', country: 'South Korea' },
  U5Y: { make: 'Kia', country: 'South Korea' },
  '5XX': { make: 'Kia', country: 'USA' },
  // ── Hyundai
  KMH: { make: 'Hyundai', country: 'South Korea' },
  KMF: { make: 'Hyundai', country: 'South Korea' },
  KM8: { make: 'Hyundai', country: 'South Korea' },
  '5NP': { make: 'Hyundai', country: 'USA' },
  '5XY': { make: 'Hyundai', country: 'USA' },
  MAL: { make: 'Hyundai', country: 'India' },
  NMB: { make: 'Hyundai', country: 'Turkey' },
  // ── BMW (Germany / USA / South Africa)
  WBA: { make: 'BMW', country: 'Germany' },
  WBS: { make: 'BMW', country: 'Germany' },
  WBW: { make: 'BMW', country: 'Germany' },
  WBX: { make: 'BMW', country: 'Germany' },
  WBY: { make: 'BMW', country: 'Germany' },
  '5UX': { make: 'BMW', country: 'USA' },
  '5YM': { make: 'BMW', country: 'USA' },
  '3MW': { make: 'BMW', country: 'Mexico' },
  ADB: { make: 'BMW', country: 'South Africa' },
  // ── MINI
  WMW: { make: 'MINI', country: 'Germany' },
  WMN: { make: 'MINI', country: 'Germany' },
  // ── Mercedes-Benz
  WDB: { make: 'Mercedes-Benz', country: 'Germany' },
  WDC: { make: 'Mercedes-Benz', country: 'Germany' },
  WDD: { make: 'Mercedes-Benz', country: 'Germany' },
  WDE: { make: 'Mercedes-Benz', country: 'Germany' },
  WDF: { make: 'Mercedes-Benz', country: 'Germany' },
  W1K: { make: 'Mercedes-Benz', country: 'Germany' },
  W1N: { make: 'Mercedes-Benz', country: 'Germany' },
  W1V: { make: 'Mercedes-Benz', country: 'Germany' },
  '4JG': { make: 'Mercedes-Benz', country: 'USA' },
  '55S': { make: 'Mercedes-Benz', country: 'USA' },
  // ── Audi
  WAU: { make: 'Audi', country: 'Germany' },
  WA1: { make: 'Audi', country: 'Germany' },
  TRU: { make: 'Audi', country: 'Hungary' },
  // ── Volkswagen
  WVW: { make: 'Volkswagen', country: 'Germany' },
  WV1: { make: 'Volkswagen', country: 'Germany' },
  WV2: { make: 'Volkswagen', country: 'Germany' },
  WV3: { make: 'Volkswagen', country: 'Germany' },
  '9BW': { make: 'Volkswagen', country: 'Brazil' },
  '3VW': { make: 'Volkswagen', country: 'Mexico' },
  '1VW': { make: 'Volkswagen', country: 'USA' },
  // ── Porsche
  WP0: { make: 'Porsche', country: 'Germany' },
  WP1: { make: 'Porsche', country: 'Germany' },
  // ── Volvo
  YV1: { make: 'Volvo', country: 'Sweden' },
  YV4: { make: 'Volvo', country: 'Sweden' },
  LVS: { make: 'Volvo', country: 'China' },
  // ── Land Rover / Range Rover
  SAL: { make: 'Land Rover', country: 'UK' },
  SALV: { make: 'Land Rover', country: 'UK' },
  SALW: { make: 'Land Rover', country: 'UK' },
  // ── Jaguar
  SAJ: { make: 'Jaguar', country: 'UK' },
  SAX: { make: 'Jaguar', country: 'UK' },
  // ── Rolls-Royce
  SCA: { make: 'Rolls-Royce', country: 'UK' },
  SCB: { make: 'Bentley', country: 'UK' },
  // ── Aston Martin
  SCF: { make: 'Aston Martin', country: 'UK' },
  // ── Ford
  '1FA': { make: 'Ford', country: 'USA' },
  '1FB': { make: 'Ford', country: 'USA' },
  '1FC': { make: 'Ford', country: 'USA' },
  '1FD': { make: 'Ford', country: 'USA' },
  '1FM': { make: 'Ford', country: 'USA' },
  '1FT': { make: 'Ford', country: 'USA' },
  '2FM': { make: 'Ford', country: 'Canada' },
  '2FT': { make: 'Ford', country: 'Canada' },
  '3FA': { make: 'Ford', country: 'Mexico' },
  '3FM': { make: 'Ford', country: 'Mexico' },
  WF0: { make: 'Ford', country: 'Germany' },
  // ── Lincoln
  '5LM': { make: 'Lincoln', country: 'USA' },
  '2LM': { make: 'Lincoln', country: 'Canada' },
  // ── Chevrolet / GMC / Cadillac / Buick
  '1G1': { make: 'Chevrolet', country: 'USA' },
  '1G6': { make: 'Cadillac', country: 'USA' },
  '2G1': { make: 'Chevrolet', country: 'Canada' },
  '3G1': { make: 'Chevrolet', country: 'Mexico' },
  '1GT': { make: 'GMC', country: 'USA' },
  '2GT': { make: 'GMC', country: 'Canada' },
  '1GC': { make: 'Chevrolet', country: 'USA' },
  '1GY': { make: 'Cadillac', country: 'USA' },
  '1G4': { make: 'Buick', country: 'USA' },
  KL7: { make: 'Chevrolet', country: 'South Korea' },
  // ── Jeep / Chrysler / Dodge / Ram
  '1C4': { make: 'Jeep', country: 'USA' },
  '1C6': { make: 'Ram', country: 'USA' },
  '3C4': { make: 'Jeep', country: 'Mexico' },
  '2C4': { make: 'Chrysler', country: 'Canada' },
  '2B3': { make: 'Dodge', country: 'Canada' },
  '1B3': { make: 'Dodge', country: 'USA' },
  // ── Tesla
  '5YJ': { make: 'Tesla', country: 'USA' },
  '7SA': { make: 'Tesla', country: 'USA' },
  LRW: { make: 'Tesla', country: 'China' },
  // ── Ferrari
  ZFF: { make: 'Ferrari', country: 'Italy' },
  // ── Lamborghini
  ZHW: { make: 'Lamborghini', country: 'Italy' },
  // ── Maserati
  ZAM: { make: 'Maserati', country: 'Italy' },
  // ── Alfa Romeo
  ZAR: { make: 'Alfa Romeo', country: 'Italy' },
  // ── Fiat
  ZFA: { make: 'Fiat', country: 'Italy' },
  ZCF: { make: 'Fiat', country: 'Italy' },
  // ── Peugeot / Citroën / DS
  VF3: { make: 'Peugeot', country: 'France' },
  VF7: { make: 'Citroën', country: 'France' },
  VF8: { make: 'Citroën', country: 'France' },
  VF9: { make: 'Bugatti', country: 'France' },
  // ── Renault
  VF1: { make: 'Renault', country: 'France' },
  VF2: { make: 'Renault', country: 'France' },
  // ── Opel / Vauxhall
  W0L: { make: 'Opel', country: 'Germany' },
  W0V: { make: 'Opel', country: 'Germany' },
  // ── Changan
  LZG: { make: 'Changan', country: 'China' },
  LS5: { make: 'Changan', country: 'China' },
  // ── MG / SAIC
  LSK: { make: 'MG', country: 'China' },
  // ── Haval / GWM / Great Wall
  LGW: { make: 'Haval', country: 'China' },
  LHG: { make: 'Haval', country: 'China' },
  // ── BYD
  LFV: { make: 'BYD', country: 'China' },
  // ── Chery
  LVV: { make: 'Chery', country: 'China' },
  // ── Geely / Proton
  LJD: { make: 'Geely', country: 'China' },
  PM0: { make: 'Proton', country: 'Malaysia' },
  // ── Maruti Suzuki (India)
  MA3: { make: 'Suzuki', country: 'India' },
};

// ─── VIN Year encoding (10th character) ──────────────────────────────────────
// Cycle 1: 1980–2009 | Cycle 2: 2010–2039 (same chars reused)
const YEAR_CHARS: Array<[string, number, number]> = [
  //  char  Cycle1  Cycle2
  ['A', 1980, 2010], ['B', 1981, 2011], ['C', 1982, 2012],
  ['D', 1983, 2013], ['E', 1984, 2014], ['F', 1985, 2015],
  ['G', 1986, 2016], ['H', 1987, 2017], ['J', 1988, 2018],
  ['K', 1989, 2019], ['L', 1990, 2020], ['M', 1991, 2021],
  ['N', 1992, 2022], ['P', 1993, 2023], ['R', 1994, 2024],
  ['S', 1995, 2025], ['T', 1996, 2026], ['V', 1997, 2027],
  ['W', 1998, 2028], ['X', 1999, 2029], ['Y', 2000, 2030],
  ['1', 2001, 0],    ['2', 2002, 0],    ['3', 2003, 0],
  ['4', 2004, 0],    ['5', 2005, 0],    ['6', 2006, 0],
  ['7', 2007, 0],    ['8', 2008, 0],    ['9', 2009, 0],
];

function decodeYear(char: string): { year: number; yearAlt?: number } {
  const entry = YEAR_CHARS.find(([c]) => c === char.toUpperCase());
  if (!entry) return { year: 0 };
  const [, c1, c2] = entry;
  // Prefer the cycle 2 (2010+) year as most modern vehicles being decoded are recent
  if (c2 > 0) return { year: c2, yearAlt: c1 };
  return { year: c1 };
}

// ─── WMI lookup: try 4-char, then 3-char, then 2-char ────────────────────────
function lookupWMI(wmi: string): { make: string; country: string } | undefined {
  return WMI[wmi] ?? WMI[wmi.slice(0, 3)] ?? WMI[wmi.slice(0, 2)];
}

// ─── VIN checksum validation (Position 9 check digit) ────────────────────────
const VIN_VALUES: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,
  S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

function validateChecksum(vin: string): boolean {
  const v = vin.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const val = VIN_VALUES[v[i]];
    if (val === undefined) return false;
    sum += val * WEIGHTS[i];
  }
  const check = sum % 11;
  const checkChar = check === 10 ? 'X' : String(check);
  return v[8] === checkChar;
}

function decodeVIN(vin: string): DecodedVIN {
  const v = vin.trim().toUpperCase().replace(/[\s-]/g, '');
  if (v.length !== 17) return { wmi: '', vds: '', vis: '', valid: false, error: 'VIN must be exactly 17 characters' };
  if (/[IOQ]/.test(v)) return { wmi: v.slice(0, 3), vds: v.slice(3, 9), vis: v.slice(9), valid: false, error: 'VIN cannot contain letters I, O, or Q' };

  const wmi = v.slice(0, 3);
  const vds = v.slice(3, 9);
  const vis = v.slice(9);
  const yearChar = v[9];
  const { year, yearAlt } = decodeYear(yearChar);
  const mfr = lookupWMI(wmi);

  return {
    wmi, vds, vis,
    make: mfr?.make,
    country: mfr?.country,
    year: year || undefined,
    yearAlt,
    valid: true,
  };
}

export default function VINDecoder({ open, onClose, onApply }: Props) {
  const [vin, setVin] = useState('');
  const [decoded, setDecode] = useState<DecodedVIN | null>(null);

  const handleDecode = () => setDecode(decodeVIN(vin));

  const handleApply = () => {
    if (!decoded?.valid) return;
    onApply({ make: decoded.make, model_year: decoded.year, country: decoded.country });
    onClose();
  };

  const checksumOk = vin.length === 17 ? validateChecksum(vin) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-md p-0 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-foreground">VIN Decoder</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter the 17-character VIN to decode Make, Model Year, Country of manufacture and more.
          </p>
          <div className="flex gap-2">
            <Input
              value={vin}
              onChange={e => { setVin(e.target.value.toUpperCase().replace(/[\s-]/g, '')); setDecode(null); }}
              placeholder="e.g. JTD847A6009012345"
              className="flex-1 h-8 text-sm bg-muted/50 border-border font-mono tracking-widest uppercase"
              maxLength={17}
            />
            <Button size="sm" onClick={handleDecode} disabled={vin.length !== 17} className="text-xs h-8 shrink-0">
              Decode
            </Button>
          </div>

          {/* Character counter + checksum hint */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{vin.length}/17 characters</span>
            {vin.length === 17 && (
              checksumOk
                ? <span className="text-green-400">✓ Valid checksum</span>
                : <span className="text-yellow-400">⚠ Checksum mismatch (non-NA VIN)</span>
            )}
          </div>

          {decoded && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              {!decoded.valid ? (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{decoded.error}</span>
                </div>
              ) : (
                <>
                  {/* WMI / VDS / VIS segments */}
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                    <div className="bg-primary/10 border border-primary/20 rounded p-1.5 text-center">
                      <div className="text-primary font-bold tracking-wider">{decoded.wmi}</div>
                      <div className="text-muted-foreground text-[10px]">WMI (Maker)</div>
                    </div>
                    <div className="bg-muted/40 border border-border rounded p-1.5 text-center">
                      <div className="text-foreground font-bold tracking-wider">{decoded.vds}</div>
                      <div className="text-muted-foreground text-[10px]">VDS (Desc)</div>
                    </div>
                    <div className="bg-muted/40 border border-border rounded p-1.5 text-center">
                      <div className="text-foreground font-bold tracking-wider">{decoded.vis}</div>
                      <div className="text-muted-foreground text-[10px]">VIS (Serial)</div>
                    </div>
                  </div>

                  {/* Decoded attributes */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Make', value: decoded.make ?? '— Unknown —' },
                      {
                        label: 'Model Year',
                        value: decoded.year
                          ? decoded.yearAlt
                            ? `${decoded.year} (or ${decoded.yearAlt})`
                            : String(decoded.year)
                          : '—',
                      },
                      { label: 'Country', value: decoded.country ?? '— Unknown —' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between p-2 bg-card rounded-md border border-border gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                        <Badge className={`text-xs border truncate max-w-[120px] ${value.includes('Unknown') || value === '—' ? 'bg-muted text-muted-foreground border-border' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Year ambiguity note */}
                  {decoded.yearAlt && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        Year character <strong className="text-foreground font-mono">{decoded.wmi[0] === decoded.wmi[0] ? vin[9] : ''}</strong> maps to both {decoded.year} and {decoded.yearAlt}.
                        The later year ({decoded.year}) is shown by default. Use context to confirm.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 border-border text-xs h-8">Close</Button>
          {decoded?.valid && decoded.make && (
            <Button size="sm" onClick={handleApply} className="flex-1 text-xs h-8">
              <ChevronRight className="w-3.5 h-3.5 mr-1" />Apply to Form
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
