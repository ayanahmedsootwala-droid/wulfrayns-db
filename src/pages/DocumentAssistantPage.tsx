import React, { useState, useRef } from 'react';
import {
  ScanLine, Upload, Bot, Sparkles, FileText, X,
  Copy, Check, ClipboardList, PlusCircle, Trash2,
  ChevronDown, ChevronUp, Save, RefreshCw, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/components/layouts/AppLayout';
import { streamLLMQueued } from '@/lib/ai-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';


const DOC_TYPES = [
  { val: 'auction_sheet',       label: 'Japanese Auction Sheet',  prompt: 'Extract ALL information from this Japanese auction sheet. Include: Grade, chassis number, mileage, color codes, lot number, auction date, equipment list, condition ratings for each panel (A=no damage, B=scratch, C=dent, D=large dent, E=rust, S=replaced), interior rating, equipment codes (AC, PS, PW, etc.), notable defects, repair recommendations. Format clearly with sections.' },
  { val: 'invoice',             label: 'Purchase Invoice',        prompt: 'Extract all details from this invoice: seller/buyer info, vehicle details, price breakdown, payment terms, reference numbers, dates. Highlight any important clauses.' },
  { val: 'registration',        label: 'Registration Document',   prompt: 'Extract: owner name, CNIC, vehicle make/model/year, registration number, chassis number, engine number, registration city, registration date, tax status, any encumbrances or mortgages.' },
  { val: 'bill_of_lading',      label: 'Bill of Lading',          prompt: 'Extract: shipper, consignee, vessel name, voyage number, port of loading, port of discharge, container numbers, vehicle details, BL number, date of issue, freight terms, special notes.' },
  { val: 'import_declaration',  label: 'Import Declaration',      prompt: 'Extract all import-related details: customs value, duties assessed, declaration number, date, tariff headings, vehicle description, importer details, clearing agent.' },
  { val: 'customs_duty',        label: 'Customs Duty Assessment', prompt: 'Extract: assessment number, date, vehicle details, FOB value, freight, insurance, CIF, all duty heads (CD, RD, ST, FED, IT, WHT), total duty, clearing agent, any penalties or notes.' },
  { val: 'pdi',                 label: 'PDI / Inspection Report', prompt: 'Extract: inspection date, inspector, vehicle details, all checked items and pass/fail status, mileage at inspection, fuel level, tyre condition, fluid levels, battery, lights, AC, all noted defects and recommendations.' },
  { val: 'token_tax',           label: 'Token Tax / Challan',     prompt: 'Extract: vehicle registration, owner, tax period, amount due, amount paid, due date, payment reference, and any arrears or surcharges.' },
  { val: 'insurance',           label: 'Insurance Policy',        prompt: 'Extract: policy number, insured name, CNIC, vehicle details, sum insured, premium breakdown, coverage type (comprehensive/third-party), start/end dates, add-ons, exclusions, claim procedure.' },
  { val: 'general',             label: 'General Document',        prompt: 'Read this document carefully and extract all important information, key data points, dates, names, amounts, and any actionable items. Organize by section.' },
];

const QUICK_TEMPLATES = [
  {
    label: 'Stock Availability Reply',
    icon: '🚗',
    text: `Thank you for your inquiry!\n\nWe currently have the following matching your requirements:\n\n• [Make Model Year] — PKR [Price] — [Mileage] km — [Color]\n• [Make Model Year] — PKR [Price] — [Mileage] km — [Color]\n\nAll vehicles are in excellent condition. Viewing available by appointment.\n\nShall I arrange a test drive or send detailed auction sheets?\n\n[Business Name]\n📞 [Phone]`,
  },
  {
    label: 'Import Order Confirmation',
    icon: '📦',
    text: `Dear [Customer Name],\n\nWe confirm your import order for:\n\n🚘 Vehicle: [Make Model Variant Year]\n🏷️ Auction Grade: [Grade]\n🔢 Chassis: [Chassis No]\n💰 Total Cost: PKR [Amount]\n\n📅 Expected Shipping: [Month/Year]\n🚢 Estimated Arrival: [Port Arrival Date]\n\nPayment Summary:\n• Advance Paid: PKR [Amount]\n• Balance Due: PKR [Amount] (on arrival)\n\nWe will keep you updated on every milestone. Thank you for choosing us!\n\n[Business Name]\n📞 [Phone]`,
  },
  {
    label: 'Auction Sheet Explanation',
    icon: '📋',
    text: `Hi [Customer Name],\n\nHere is the breakdown of the auction sheet for [Make Model Year]:\n\n⭐ Overall Grade: [Grade] — [Meaning]\n📍 Key Condition Points:\n• Exterior: [Details]\n• Interior: [Rating]\n• Mileage: [KM] (Verified)\n• Equipment: [AC/PW/PS etc.]\n\n🔍 Notable Remarks: [Any damage codes]\n\n✅ Our Assessment: This is a [Good/Excellent/Caution] buy at this price point.\n\nHappy to answer any questions!\n\n[Business Name]`,
  },
  {
    label: 'Delivery Ready Notice',
    icon: '✅',
    text: `Dear [Customer Name],\n\nGreat news! Your vehicle is ready for delivery:\n\n🚗 [Make Model Year] — [Color]\n🔢 Registration: [Reg Number]\n📄 Documents Included:\n✓ Original Registration Book\n✓ Delivery Challan\n✓ Insurance Policy\n✓ Auction Sheet (if imported)\n\n📅 Delivery Date: [Date]\n📍 Location: [Address]\n\nPlease bring your original CNIC.\nBalance amount due: PKR [Amount]\n\nThank you for your trust!\n\n[Business Name]\n📞 [Phone]`,
  },
  {
    label: 'Price Negotiation Response',
    icon: '💬',
    text: `Dear [Customer Name],\n\nThank you for your interest in [Make Model Year].\n\nOur best price for this vehicle is PKR [Price], which includes:\n✓ Full documentation\n✓ [Warranty/PDI/Service]\n✓ Transfer assistance\n\nThis is a firm price based on current market rates and the vehicle's condition (Grade [X]).\n\nIf budget is a concern, we also have [Alternative Make Model] available at PKR [Lower Price].\n\nWould you like to proceed or schedule a viewing?\n\n[Business Name]`,
  },
];

function TemplateCard({ tpl }: { tpl: { icon: string; label: string; text: string } }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(tpl.text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>{tpl.icon}</span>{tpl.label}
          </p>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={copy}>
            {copied ? <><Check className="w-3 h-3 text-accent"/>Copied</> : <><Copy className="w-3 h-3"/>Copy</>}
          </Button>
        </div>
        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">{tpl.text}</pre>
      </CardContent>
    </Card>
  );
}

// ── Manual Entry Field ────────────────────────────────────────────────────────
interface ManualField { id: string; key: string; value: string; }

const MANUAL_PRESETS: Record<string, { label: string; fields: { key: string; placeholder: string }[] }> = {
  vehicle: {
    label: 'Vehicle Record',
    fields: [
      { key: 'Make', placeholder: 'e.g. Toyota' },
      { key: 'Model', placeholder: 'e.g. Corolla' },
      { key: 'Year', placeholder: 'e.g. 2021' },
      { key: 'Chassis No', placeholder: 'e.g. ZRE172-1234567' },
      { key: 'Engine CC', placeholder: 'e.g. 1800' },
      { key: 'Fuel Type', placeholder: 'e.g. Petrol / Hybrid' },
      { key: 'Colour', placeholder: 'e.g. Pearl White' },
      { key: 'Mileage (km)', placeholder: 'e.g. 45000' },
      { key: 'Auction Grade', placeholder: 'e.g. 4.5' },
      { key: 'Purchase Price (JPY)', placeholder: 'e.g. 1800000' },
      { key: 'Asking Price (PKR)', placeholder: 'e.g. 8500000' },
    ],
  },
  auction_sheet: {
    label: 'Auction Sheet (Manual)',
    fields: [
      { key: 'Lot Number', placeholder: '' },
      { key: 'Chassis', placeholder: '' },
      { key: 'Grade', placeholder: 'e.g. 3.5' },
      { key: 'Mileage', placeholder: 'km' },
      { key: 'Colour Code', placeholder: '' },
      { key: 'Interior', placeholder: 'e.g. A / B' },
      { key: 'Equipment', placeholder: 'e.g. AC, PS, PW, AW' },
      { key: 'Defects', placeholder: 'e.g. B2 on bonnet, C on door' },
      { key: 'Auction House', placeholder: 'e.g. USS Osaka' },
      { key: 'Auction Date', placeholder: '' },
    ],
  },
  invoice: {
    label: 'Purchase Invoice (Manual)',
    fields: [
      { key: 'Invoice No', placeholder: '' },
      { key: 'Date', placeholder: '' },
      { key: 'Seller Name', placeholder: '' },
      { key: 'Buyer Name', placeholder: '' },
      { key: 'Vehicle', placeholder: 'Make Model Year' },
      { key: 'Chassis No', placeholder: '' },
      { key: 'Price (PKR)', placeholder: '' },
      { key: 'Advance Paid', placeholder: '' },
      { key: 'Balance Due', placeholder: '' },
      { key: 'Payment Terms', placeholder: '' },
    ],
  },
  customer: {
    label: 'Customer Record',
    fields: [
      { key: 'Full Name', placeholder: '' },
      { key: 'Phone', placeholder: '' },
      { key: 'CNIC', placeholder: '' },
      { key: 'City', placeholder: '' },
      { key: 'Address', placeholder: '' },
      { key: 'Vehicle Interest', placeholder: 'e.g. Toyota Aqua 2020' },
      { key: 'Budget (PKR)', placeholder: '' },
      { key: 'Financing Needed', placeholder: 'Yes / No' },
      { key: 'Notes', placeholder: '' },
    ],
  },
  expense: {
    label: 'Expense / Cost Entry',
    fields: [
      { key: 'Date', placeholder: '' },
      { key: 'Category', placeholder: 'e.g. Clearing, Freight, Repair' },
      { key: 'Description', placeholder: '' },
      { key: 'Amount (PKR)', placeholder: '' },
      { key: 'Paid To', placeholder: '' },
      { key: 'Reference', placeholder: 'Receipt / Bill No' },
      { key: 'Notes', placeholder: '' },
    ],
  },
};

function makeId() { return Math.random().toString(36).slice(2, 9); }

function ManualEntryTab() {
  const [preset, setPreset] = useState('vehicle');
  const [fields, setFields] = useState<ManualField[]>(() =>
    MANUAL_PRESETS.vehicle.fields.map(f => ({ id: makeId(), key: f.key, value: '' }))
  );
  const [saved, setSaved] = useState<{ label: string; fields: ManualField[]; ts: number }[]>([]);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSaved, setExpandedSaved] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadPreset = (p: string) => {
    setPreset(p);
    setFields(MANUAL_PRESETS[p].fields.map(f => ({ id: makeId(), key: f.key, value: '' })));
    setAiResult('');
  };

  const updateField = (id: string, k: 'key' | 'value', v: string) =>
    setFields(fs => fs.map(f => f.id === id ? { ...f, [k]: v } : f));

  const addField = () => setFields(fs => [...fs, { id: makeId(), key: '', value: '' }]);
  const removeField = (id: string) => setFields(fs => fs.filter(f => f.id !== id));

  const saveEntry = () => {
    const label = MANUAL_PRESETS[preset]?.label ?? 'Entry';
    setSaved(s => [{ label, fields: [...fields], ts: Date.now() }, ...s.slice(0, 19)]);
    toast.success('Entry saved locally');
  };

  const exportText = () => {
    const text = fields.filter(f => f.key).map(f => `${f.key}: ${f.value || '—'}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const analyseWithAI = () => {
    const filled = fields.filter(f => f.key && f.value);
    if (!filled.length) { toast.error('Fill in at least one field first'); return; }
    setAiResult(''); setAiLoading(true);
    abortRef.current = new AbortController();
    const docText = filled.map(f => `${f.key}: ${f.value}`).join('\n');
    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: "You are Wulfrayn's DB AI assistant for a Pakistani used-car dealership.",
        contents: [{ role: 'user', parts: [{ text: `Analyse this ${MANUAL_PRESETS[preset]?.label ?? 'record'} and provide:\n1. A summary of the key details\n2. Any red flags or points to note\n3. Suggested action items\n\n---\n${docText}` }] }],
      },
      onChunk: c => setAiResult(p => p + c),
      onComplete: () => setAiLoading(false),
      onError: e => { setAiLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry shortly' : 'AI analysis failed'); },
      signal: abortRef.current.signal,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: form */}
      <div className="space-y-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" /> Add Record Without Scanning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Preset selector */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Record Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(MANUAL_PRESETS).map(([k, v]) => (
                  <button key={k} onClick={() => loadPreset(k)}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      preset === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {fields.map(f => (
                  <motion.div key={f.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 items-start">
                    <Input value={f.key} onChange={e => updateField(f.id, 'key', e.target.value)}
                      placeholder="Field name" className="w-32 shrink-0 h-8 text-xs bg-muted/40" />
                    <Input value={f.value} onChange={e => updateField(f.id, 'value', e.target.value)}
                      placeholder="Value" className="flex-1 h-8 text-xs bg-muted/40" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(f.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <Button size="sm" variant="outline" className="w-full h-8 text-xs border-dashed border-border gap-1.5" onClick={addField}>
              <PlusCircle className="w-3.5 h-3.5" /> Add Field
            </Button>

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs" onClick={analyseWithAI} disabled={aiLoading}>
                <Bot className="w-3.5 h-3.5" /> {aiLoading ? 'Analysing…' : 'AI Analyse'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border" onClick={saveEntry}>
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border" onClick={exportText}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved entries */}
        {saved.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Saved Entries ({saved.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
              {saved.map((s, i) => (
                <div key={s.ts} className="border border-border rounded-lg overflow-hidden">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedSaved(expandedSaved === i ? null : i)}>
                    <span className="font-medium text-foreground">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{new Date(s.ts).toLocaleTimeString()}</span>
                      {expandedSaved === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </button>
                  {expandedSaved === i && (
                    <div className="px-3 pb-2 space-y-0.5">
                      {s.fields.filter(f => f.key).map(f => (
                        <p key={f.id} className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{f.key}:</span> {f.value || '—'}</p>
                      ))}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 mt-1"
                        onClick={() => { setFields(s.fields.map(f => ({ ...f, id: makeId() }))); setPreset(Object.keys(MANUAL_PRESETS).find(k => MANUAL_PRESETS[k].label === s.label) ?? preset); }}>
                        <RefreshCw className="w-2.5 h-2.5" /> Load into form
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: AI result */}
      <div>
        <Card className="bg-card border-border h-full flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Analysis
            </CardTitle>
            {aiResult && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={() => { navigator.clipboard.writeText(aiResult); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Copied!'); }}>
                {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {!aiResult && !aiLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground min-h-[200px]">
                <Eye className="w-8 h-8 opacity-20" />
                <p className="text-sm">Fill in the form fields</p>
                <p className="text-xs opacity-60 text-center">Click "AI Analyse" to get a summary, red flags, and action items</p>
              </div>
            ) : (
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed min-h-[200px]">
                {aiResult}
                {aiLoading && <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-1 rounded-sm" />}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DocumentAssistantPage() {
  const [docType, setDocType] = useState('auction_sheet');
  const [textInput, setTextInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4MB'); return; }
    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = (ev.target?.result as string).split(',')[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const extract = () => {
    const selectedDoc = DOC_TYPES.find(d => d.val === docType)!;
    if (mode === 'text' && !textInput.trim()) { toast.error('Paste document text first'); return; }
    if (mode === 'image' && !imageBase64) { toast.error('Upload an image first'); return; }
    setLoading(true); setResult('');
    abortRef.current = new AbortController();

    const contents = mode === 'image'
      ? [{ role: 'user', parts: [
          { text: selectedDoc.prompt },
          { inlineData: { mimeType: imageMime, data: imageBase64! } },
        ]}]
      : [{ role: 'user', parts: [{ text: `${selectedDoc.prompt}\n\n--- DOCUMENT TEXT ---\n${textInput}` }] }];

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: "You are Wulfrayn\'s DB AI Document Assistant. Extract information accurately and completely. Never guess — mark unclear fields as [UNCLEAR]. Format output professionally.",
        contents,
      },
      onChunk: c => setResult(p => p + c),
      onComplete: () => setLoading(false),
      onError: (e) => { setLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry in a moment' : 'Extraction failed'); },
      signal: abortRef.current.signal,
    });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const clear = () => {
    abortRef.current?.abort(); setResult(''); setTextInput(''); setImageBase64(null); setLoading(false);
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" /> Document Assistant
          </h1>
          <p className="text-xs text-muted-foreground">AI extracts data from auction sheets, invoices, BOL &amp; more · Templates for quick WhatsApp replies</p>
        </div>

        <Tabs defaultValue="extract" className="w-full">
          <TabsList className="bg-muted/50 border border-border h-8 grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="extract" className="text-xs gap-1.5"><Bot className="w-3 h-3"/>AI Extract</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs gap-1.5"><PlusCircle className="w-3 h-3"/>Add Manual</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1.5"><FileText className="w-3 h-3"/>Templates</TabsTrigger>
          </TabsList>

          {/* ── EXTRACT TAB ── */}
          <TabsContent value="extract">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Input panel */}
              <div className="space-y-3">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Document Input</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map(d => <SelectItem key={d.val} value={d.val} className="text-xs">{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      {(['text', 'image'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                          className={cn('flex-1 py-1.5 rounded text-xs font-medium border transition-colors',
                            mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                          {m === 'text' ? '📝 Paste Text' : '🖼️ Upload Image'}
                        </button>
                      ))}
                    </div>

                    {mode === 'text' ? (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Paste document text or OCR output</Label>
                        <Textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                          placeholder="Paste document text here... Japanese text, mixed languages, OCR output — all accepted"
                          className="min-h-[160px] text-xs bg-muted/40 resize-none" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                          <p className="text-[10px] text-muted-foreground">Upload any document image — auction sheet, invoice, BOL, registration. AI reads and extracts all data automatically.</p>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*,image/webp,image/png,image/jpeg,image/jpg,image/gif" className="hidden" onChange={handleFile} />
                        {imageBase64 ? (
                          <div className="relative">
                            <img src={`data:${imageMime};base64,${imageBase64}`} alt="Document" className="w-full max-h-56 object-contain rounded-lg border border-border bg-muted/20" />
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 w-7 h-7 bg-background/90 border border-border" onClick={() => { setImageBase64(null); setImageMime('image/jpeg'); if (fileRef.current) fileRef.current.value = ''; }}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                            <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground border-border text-[10px]">
                              {imageMime.split('/')[1].toUpperCase()} · ready
                            </Badge>
                          </div>
                        ) : (
                          <button onClick={() => fileRef.current?.click()}
                            className="w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-all">
                            <Upload className="w-7 h-7" />
                            <span className="text-xs font-medium">Click to upload document image</span>
                            <span className="text-[10px] text-muted-foreground/70">JPG · PNG · WEBP · GIF · Max 4MB</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" onClick={extract} disabled={loading || (mode === 'image' && !imageBase64) || (mode === 'text' && !textInput.trim())}>
                        <Bot className="w-4 h-4" /> {loading ? 'Extracting…' : 'Extract Data'}
                      </Button>
                      {(result || textInput || imageBase64) && (
                        <Button variant="outline" className="border-border" onClick={clear}>Clear</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick examples */}
                <Card className="bg-card border-border">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Examples</p>
                    <div className="space-y-1">
                      {[
                        { label: 'Grade R auction sheet', text: 'GRADE R CHASSIS ZVW51-1234567 LOT 1234 MILEAGE 45000 COLOR 070 INT BK EQUIP 7HF AC PS PW AW TV NAV BC BSM' },
                        { label: 'Sample invoice', text: 'VEHICLE PURCHASE INVOICE\nBuyer: Ahmed Motors\nVehicle: Toyota Corolla 2022\nChassis: NZE141-0012345\nPrice: 3,500,000 PKR\nDate: 15-Jan-2025' },
                        { label: 'Bill of Lading', text: 'B/L No: HLCUTYP230900001\nShipper: Osaka Export Co\nConsignee: Karachi Imports Ltd\nVessel: Eurasian Dream V.EX23\nPort of Loading: Nagoya\nPort of Discharge: Karachi\nContainer: HLXU3456789\nDescription: 1 x Used Motor Vehicle Toyota Prado 2021' },
                      ].map(ex => (
                        <button key={ex.label} onClick={() => { setMode('text'); setTextInput(ex.text); }}
                          className="w-full text-left text-xs p-2 rounded bg-muted/30 border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors">
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Result panel */}
              <div>
                <Card className="bg-card border-border h-full flex flex-col">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" /> Extracted Information
                    </CardTitle>
                    {result && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={copy}>
                        {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    {!result && !loading ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground min-h-[200px]">
                        <Sparkles className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Extracted data will appear here</p>
                        <p className="text-xs opacity-60">Select a document type and paste text or upload image</p>
                      </div>
                    ) : (
                      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed min-h-[200px]">
                        {result}
                        {loading && <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-1 rounded-sm" />}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── MANUAL ENTRY TAB ── */}
          <TabsContent value="manual">
            <ManualEntryTab />
          </TabsContent>

          {/* ── TEMPLATES TAB ── */}
          <TabsContent value="templates">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Ready-made WhatsApp / email templates for common car dealer scenarios. Click any to copy and personalise.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUICK_TEMPLATES.map((tpl, idx) => (
                  <TemplateCard key={idx} tpl={tpl} />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
