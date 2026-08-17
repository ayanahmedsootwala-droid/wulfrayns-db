import React, { useState, useRef, useCallback } from 'react';
import { Search, Sparkles, X, Car, ChevronRight, AlertTriangle, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { streamLLM } from '@/lib/sse';
import { fetchVehicles } from '@/lib/api';
import { formatCurrency, formatMileage, getStatusColor, cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Inquiry, Vehicle } from '@/types/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Props { inquiry: Inquiry }

interface MatchResult {
  vehicleId: string;
  rank: number;
  matchScore: number;
  reason: string;
  pros: string[];
  cons: string[];
}

const SYSTEM_PROMPT = `You are a car matching expert for a Pakistani auto dealership.
Given a buyer inquiry and available inventory, rank the TOP 3 best matches.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no extra text, just valid JSON):
[
  {
    "vehicleId": "...",
    "rank": 1,
    "matchScore": 87,
    "reason": "Best match because...",
    "pros": ["matches budget", "preferred color"],
    "cons": ["slightly over mileage limit"]
  }
]

Score 0-100 based on how well the vehicle fits the buyer requirements.
Only include vehicles that are actually relevant. If none match well, return empty array [].`;

function buildInquiryContext(inq: Inquiry): string {
  return [
    `Buyer: ${inq.customer_name}`,
    inq.req_make ? `Preferred make: ${inq.req_make}` : '',
    inq.req_model ? `Preferred model: ${inq.req_model}` : '',
    inq.req_variant ? `Preferred variant: ${inq.req_variant}` : '',
    inq.req_color ? `Preferred color: ${inq.req_color}` : '',
    inq.req_model_year ? `Preferred year: ${inq.req_model_year}+` : '',
    inq.req_mileage_max ? `Max mileage: ${inq.req_mileage_max.toLocaleString()} km` : '',
    inq.req_budget_max ? `Budget: up to ${formatCurrency(inq.req_budget_max)}` : '',
    inq.req_fuel_type ? `Fuel type: ${inq.req_fuel_type}` : '',
    inq.req_body_type ? `Body type: ${inq.req_body_type}` : '',
    inq.req_additional ? `Additional requirements: ${inq.req_additional}` : '',
    inq.description ? `Description: ${inq.description}` : '',
  ].filter(Boolean).join('\n');
}

function buildInventoryContext(vehicles: Vehicle[]): string {
  return vehicles.map(v =>
    `ID:${v.id} | ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''} ${v.model_year ?? ''} | ${v.color ?? 'N/A'} | ${v.mileage != null ? formatMileage(v.mileage) : 'N/A'} | ${formatCurrency(v.expected_selling_price)} | ${v.fuel_type ?? 'N/A'} | ${v.status}`
  ).join('\n');
}

export default function AIInquiryMatcher({ inquiry }: Props) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchedVehicles, setMatchedVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMatches([]);
    setMatchedVehicles([]);
    setError('');
    setDone(false);
    setLoading(true);
    setRawText('');

    // Fetch candidate vehicles based on inquiry criteria
    let vehicles: Vehicle[] = [];
    try {
      const params: Parameters<typeof fetchVehicles>[0] = {
        pageSize: 40,
        status: 'available',
        make: inquiry.req_make || undefined,
        fuel_type: inquiry.req_fuel_type || undefined,
        body_type: inquiry.req_body_type || undefined,
        max_price: inquiry.req_budget_max ? inquiry.req_budget_max * 1.15 : undefined, // 15% buffer
      };
      if (inquiry.req_model) params.search = inquiry.req_model;
      const { data } = await fetchVehicles(params);
      vehicles = data;

      // If no specific criteria hits, just fetch available stock
      if (vehicles.length === 0) {
        const { data: fallback } = await fetchVehicles({ pageSize: 40, status: 'available' });
        vehicles = fallback;
      }
    } catch {
      setError('Failed to fetch inventory');
      setLoading(false);
      return;
    }

    if (vehicles.length === 0) {
      setError('No available vehicles found in inventory');
      setLoading(false);
      return;
    }

    setMatchedVehicles(vehicles);

    let fullText = '';
    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: SYSTEM_PROMPT,
        contents: [{
          role: 'user',
          parts: [{
            text: `BUYER REQUIREMENTS:\n${buildInquiryContext(inquiry)}\n\nAVAILABLE INVENTORY (${vehicles.length} cars):\n${buildInventoryContext(vehicles)}\n\nRank the top 3 best matches.`,
          }],
        }],
      },
      onChunk: (chunk) => { fullText += chunk; setRawText(fullText); },
      onComplete: () => {
        setLoading(false);
        setDone(true);
        try {
          // Strip any markdown fences
          const clean = fullText.replace(/```json|```/g, '').trim();
          const parsed: MatchResult[] = JSON.parse(clean);
          setMatches(Array.isArray(parsed) ? parsed.slice(0, 3) : []);
        } catch {
          setError('Could not parse AI response. Try again.');
        }
      },
      onError: (err) => { setError(err.message); setLoading(false); },
      signal: ctrl.signal,
    });
  }, [inquiry]);

  const getVehicle = (id: string) => matchedVehicles.find(v => v.id === id);

  const matchColor = (score: number) => {
    if (score >= 80) return 'bg-green-400/10 text-green-400 border-green-400/20';
    if (score >= 60) return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
    return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
  };

  const rankLabel = (rank: number) => rank === 1 ? '🥇 Best Match' : rank === 2 ? '🥈 2nd Choice' : '🥉 3rd Choice';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-green-400/10 border border-green-400/20 flex items-center justify-center">
              <Search className="w-3 h-3 text-green-400" />
            </div>
            AI Vehicle Matcher
          </CardTitle>
          <div className="flex gap-1.5">
            {!loading && (
              <Button size="sm" onClick={run}
                className={cn('h-7 text-xs px-2.5 border-0 text-white', done ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600')}>
                {done ? <><RefreshCw className="w-3 h-3 mr-1" />Re-match</> : <><Sparkles className="w-3 h-3 mr-1" />Find Matches</>}
              </Button>
            )}
            {loading && (
              <Button size="sm" variant="outline" onClick={() => { abortRef.current?.abort(); setLoading(false); }} className="h-7 text-xs px-2.5 border-border">
                <X className="w-3 h-3 mr-1" />Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {!loading && !done && !error && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-green-400/60 shrink-0" />
            <span>AI will scan your inventory and rank the top 3 vehicles that best match this buyer's requirements.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        {loading && matches.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              <span className="ml-1">Scanning {matchedVehicles.length > 0 ? matchedVehicles.length + ' vehicles' : 'inventory'}…</span>
            </p>
            {[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg bg-muted" />)}
          </div>
        )}

        {matches.length > 0 && matches.map((match) => {
          const vehicle = getVehicle(match.vehicleId);
          if (!vehicle) return null;
          return (
            <div key={match.vehicleId} className="rounded-lg border border-border bg-muted/20 overflow-hidden">
              {/* Match header */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                <span className="text-xs font-medium text-foreground">{rankLabel(match.rank)}</span>
                <Badge className={cn('text-[10px] border', matchColor(match.matchScore))}>
                  {match.matchScore}% match
                </Badge>
              </div>

              {/* Vehicle info */}
              <Link to={`/inventory/${vehicle.id}`} className="block">
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="w-12 h-9 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {vehicle.cover_image_url
                      ? <img src={vehicle.cover_image_url} alt="" className="w-full h-full object-cover" />
                      : <Car className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {vehicle.make} {vehicle.model} {vehicle.variant} {vehicle.model_year}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {vehicle.color} · {vehicle.mileage != null ? formatMileage(vehicle.mileage) : '—'} · {formatCurrency(vehicle.expected_selling_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', getStatusColor(vehicle.status))}>
                      {vehicle.status}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </Link>

              {/* Reason */}
              <div className="px-3 pb-2">
                <p className="text-[11px] text-muted-foreground italic mb-1.5">{match.reason}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {match.pros.map((p, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-green-400">
                      <span className="shrink-0 mt-0.5">✓</span><span>{p}</span>
                    </div>
                  ))}
                  {match.cons.map((c, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-orange-400">
                      <span className="shrink-0 mt-0.5">!</span><span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {done && matches.length === 0 && !error && (
          <p className="text-xs text-muted-foreground py-2 text-center">No strong matches found in current inventory for this inquiry.</p>
        )}

        {done && (
          <p className="text-[10px] text-muted-foreground">Powered by Gemini 2.5 Flash · Based on available inventory</p>
        )}
      </CardContent>
    </Card>
  );
}
