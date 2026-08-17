import React, { useState, useRef, useCallback } from 'react';
import { FileText, Copy, Check, X, RefreshCw, AlertTriangle, Instagram, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, formatMileage, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Vehicle } from '@/types/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Props { vehicle: Vehicle }

type PostStyle = 'whatsapp' | 'instagram' | 'facebook';

const STYLE_CONFIG: Record<PostStyle, { label: string; icon: React.ReactNode; prompt: string }> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    prompt: `Write a WhatsApp car sales post. Use emojis naturally. Start with the car name and year prominently. 
Include: price, mileage, key features, city, and a call-to-action. 
Format with line breaks for readability. End with "Contact for details 📞".
Max 180 words. Keep it punchy and Pakistani market style.`,
  },
  instagram: {
    label: 'Instagram',
    icon: <Instagram className="w-3.5 h-3.5" />,
    prompt: `Write an Instagram car listing caption. Start with an attention-grabbing first line.
Use emojis throughout. Include key specs. End with 10-12 relevant Pakistani car hashtags on the last line.
Max 150 words + hashtags. Make it aspirational and engaging.`,
  },
  facebook: {
    label: 'Facebook',
    icon: <Share2 className="w-3.5 h-3.5" />,
    prompt: `Write a Facebook Marketplace car listing. Professional tone with key details.
Include: full car name, year, mileage, features, condition, price, location.
Use a numbered or bulleted features list. Clear call-to-action at end.
Max 200 words. Suitable for Pakistani Facebook car groups.`,
  },
};

function buildVehicleContext(v: Vehicle): string {
  const features: string[] = [];
  if (v.has_sunroof) features.push('Sunroof');
  if (v.has_android_panel) features.push('Android Panel');
  if (v.has_apple_carplay) features.push('Apple CarPlay');
  if (v.has_push_start) features.push('Push Start');
  if (v.has_alloy_wheels) features.push('Alloy Wheels');
  if (v.has_led_lights) features.push('LED Lights');
  if (v.has_reverse_camera) features.push('Reverse Camera');
  if (v.has_360_camera) features.push('360° Camera');
  if (v.has_climate_control) features.push('Climate Control');
  if (v.has_cruise_control) features.push('Cruise Control');
  if (v.has_keyless_entry) features.push('Keyless Entry');
  if (v.has_memory_seats) features.push('Memory Seats');
  if (v.has_electric_seats) features.push('Electric Seats');
  if (v.has_premium_audio) features.push('Premium Audio');
  if (v.has_panoramic_roof) features.push('Panoramic Roof');

  return [
    `Car: ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''} ${v.model_year ?? ''}`,
    `Color: ${v.color ?? 'N/A'}`,
    `Mileage: ${v.mileage != null ? formatMileage(v.mileage) : 'N/A'}`,
    `Engine: ${v.engine_capacity ?? 'N/A'}, Fuel: ${v.fuel_type ?? 'N/A'}, Transmission: ${v.transmission ?? 'N/A'}`,
    `Price: ${formatCurrency(v.expected_selling_price)}${v.is_negotiable ? ' (Negotiable)' : ''}`,
    `City: ${v.dealer_city ?? 'N/A'}${v.dealer_area ? ', ' + v.dealer_area : ''}`,
    `Condition: ${v.vehicle_condition ?? 'used'}`,
    features.length > 0 ? `Features: ${features.join(', ')}` : '',
    v.has_accident_history ? 'Note: Has accident history' : 'Accident free',
    v.original_paint_pct === 100 ? 'Original paint 100%' : v.original_paint_pct ? `Original paint: ${v.original_paint_pct}%` : '',
    v.is_hot_deal ? 'Hot deal!' : '',
    v.is_urgent ? 'Urgent sale!' : '',
  ].filter(Boolean).join('\n');
}

export default function AIListingWriter({ vehicle }: Props) {
  const [style, setStyle] = useState<PostStyle>('whatsapp');
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback((s: PostStyle = style) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText('');
    setEdited('');
    setError('');
    setDone(false);
    setStreaming(true);

    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: STYLE_CONFIG[s].prompt,
        contents: [{ role: 'user', parts: [{ text: `Generate a listing post for:\n\n${buildVehicleContext(vehicle)}` }] }],
      },
      onChunk: (chunk) => setText(prev => prev + chunk),
      onComplete: () => {
        setStreaming(false);
        setDone(true);
      },
      onError: (err) => { setError(err.message); setStreaming(false); },
      signal: ctrl.signal,
    });
  }, [style, vehicle]);

  const handleStyleChange = (s: PostStyle) => {
    setStyle(s);
    if (done || text) run(s);
  };

  const handleCopy = () => {
    const content = edited || text;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast.success('Post copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayText = done ? (edited || text) : text;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <FileText className="w-3 h-3 text-blue-400" />
            </div>
            AI Listing Writer
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {done && (
              <Button size="sm" variant="outline" onClick={() => run()} className="h-7 text-xs px-2 border-border">
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            {done && (
              <Button
                size="sm"
                onClick={handleCopy}
                className={cn('h-7 text-xs px-2.5 border-0', copied ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')}
              >
                {copied ? <><Check className="w-3 h-3 mr-1" />Copied!</> : <><Copy className="w-3 h-3 mr-1" />Copy</>}
              </Button>
            )}
            {!streaming && !done && (
              <Button size="sm" onClick={() => run()} className="h-7 text-xs px-2.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
                <FileText className="w-3 h-3 mr-1" />Write Post
              </Button>
            )}
            {streaming && (
              <Button size="sm" variant="outline" onClick={() => { abortRef.current?.abort(); setStreaming(false); }} className="h-7 text-xs px-2.5 border-border">
                <X className="w-3 h-3 mr-1" />Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Style selector */}
        <div className="flex gap-1.5">
          {(Object.keys(STYLE_CONFIG) as PostStyle[]).map(s => (
            <button
              key={s}
              onClick={() => handleStyleChange(s)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-all',
                style === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              )}
            >
              {STYLE_CONFIG[s].icon}
              {STYLE_CONFIG[s].label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        {!text && !streaming && !error && (
          <p className="text-xs text-muted-foreground">
            Generate a ready-to-send {STYLE_CONFIG[style].label} post for this vehicle with one click.
          </p>
        )}

        {(text || streaming) && (
          <div className="relative">
            <Textarea
              value={displayText}
              onChange={e => setEdited(e.target.value)}
              className="min-h-[140px] text-xs bg-muted/40 border-border resize-none leading-relaxed"
              placeholder={streaming ? 'Writing…' : ''}
              readOnly={streaming}
            />
            {streaming && (
              <div className="absolute bottom-2 right-2 flex gap-0.5">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
          </div>
        )}

        {done && (
          <p className="text-[10px] text-muted-foreground">Edit the post above before copying · Powered by Gemini 2.5 Flash</p>
        )}
      </CardContent>
    </Card>
  );
}
