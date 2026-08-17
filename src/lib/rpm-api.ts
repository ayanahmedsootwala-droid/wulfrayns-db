import { supabase } from '@/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LeadScore = 'hot' | 'warm' | 'cold';
export type LeadStatus = 'active' | 'converted' | 'lost' | 'on_hold';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type ShipmentStatus = 'ordered' | 'in_transit' | 'customs_clearance' | 'port_hold' | 'delivered' | 'cancelled';
export type ExpenseCategory = 'rent' | 'salaries' | 'utilities' | 'marketing' | 'maintenance' | 'vehicle_purchase' | 'fuel' | 'office' | 'other';
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'whatsapp' | 'website' | 'olx' | 'pakwheels';

export interface Lead {
  id: string;
  customer_name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  budget_min?: number;
  budget_max?: number;
  req_make?: string;
  req_model?: string;
  req_body_type?: string;
  req_fuel_type?: string;
  req_transmission?: string;
  req_seats?: number;
  req_color?: string;
  req_year_min?: number;
  req_year_max?: number;
  req_purpose?: string;
  req_notes?: string;
  lead_score: LeadScore;
  source?: string;
  call_count: number;
  visit_count: number;
  whatsapp_messages: number;
  last_contact_at?: string;
  follow_up_at?: string;
  status: LeadStatus;
  assigned_to?: string;
  notes?: string;
  interested_vehicle_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: 'call' | 'whatsapp' | 'visit' | 'email' | 'sms' | 'note';
  notes?: string;
  duration_min?: number;
  outcome?: string;
  next_action?: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  lead_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_id?: string;
  vehicle_snapshot?: Record<string, unknown>;
  vehicle_price: number;
  registration_charges: number;
  gst_amount: number;
  fed_excise: number;
  withholding_tax: number;
  insurance_amount: number;
  accessories?: { name: string; price: number }[];
  accessories_total: number;
  delivery_days?: number;
  subtotal: number;
  discount: number;
  total: number;
  status: QuoteStatus;
  terms?: string;
  notes?: string;
  valid_until?: string;
  sent_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportCost {
  id: string;
  make?: string;
  model?: string;
  model_year?: number;
  auction_grade?: string;
  fob_jpy: number;
  exchange_rate: number;
  fob_pkr: number;
  freight_pkr: number;
  insurance_pkr: number;
  customs_duty_pkr: number;
  sales_tax_pkr: number;
  withholding_tax_pkr: number;
  clearing_charges_pkr: number;
  total_landing_pkr: number;
  expected_selling_pkr?: number;
  estimated_profit_pkr?: number;
  notes?: string;
  saved: boolean;
  created_at: string;
}

export interface Shipment {
  id: string;
  shipment_ref: string;
  vehicle_ids?: string[];
  vehicle_names?: string[];
  origin_country: string;
  origin_port?: string;
  destination_port: string;
  container_number?: string;
  bl_number?: string;
  vessel_name?: string;
  status: ShipmentStatus;
  departure_date?: string;
  eta?: string;
  delivered_at?: string;
  total_cost_pkr?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount_pkr: number;
  description?: string;
  receipt_url?: string;
  vehicle_id?: string;
  created_at: string;
}

export interface FinancePlan {
  id: string;
  bank_name: string;
  plan_name?: string;
  interest_rate_pct: number;
  tenure_months: number;
  min_down_pct: number;
  max_vehicle_price?: number;
  min_vehicle_price?: number;
  processing_fee_pkr?: number;
  is_islamic: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  vehicle_id?: string;
  vehicle_name?: string;
  platform: SocialPlatform;
  content: string;
  hashtags?: string;
  cta?: string;
  seo_description?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  engagement_views: number;
  engagement_enquiries: number;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  created_at: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function fetchLeads(opts: {
  page?: number; pageSize?: number; score?: LeadScore | 'all'; status?: LeadStatus | 'all'; search?: string;
} = {}) {
  const { page = 1, pageSize = 20, score, status, search } = opts;
  let q = supabase.from('rpm_leads').select('*', { count: 'exact' });
  if (score && score !== 'all') q = q.eq('lead_score', score);
  if (status && status !== 'all') q = q.eq('status', status);
  if (search) q = q.ilike('customer_name', `%${search}%`);
  q = q.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Lead[]) : [], count: count ?? 0 };
}

export async function createLead(payload: Partial<Lead>) {
  // Strip every server-managed / auto-generated field before insert
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id, created_at, updated_at,
    ...rest
  } = payload as Lead;

  const insert: Record<string, unknown> = {
    customer_name:     rest.customer_name?.trim() || 'Unknown',
    lead_score:        rest.lead_score        ?? 'warm',
    status:            rest.status            ?? 'active',
    call_count:        rest.call_count        ?? 0,
    visit_count:       rest.visit_count       ?? 0,
    whatsapp_messages: rest.whatsapp_messages ?? 0,
  };

  // Only include optional fields when they have a real value
  const optionals: (keyof typeof rest)[] = [
    'phone','whatsapp','email','city','source','notes',
    'req_make','req_model','req_fuel_type','req_body_type','req_notes',
    'budget_max','assigned_to','follow_up_at','last_contact_at',
    'interested_vehicle_id',
  ];
  for (const k of optionals) {
    const v = rest[k];
    if (v !== undefined && v !== null && v !== '') insert[k] = v;
  }

  const { error } = await supabase.from('rpm_leads').insert(insert);
  if (error) throw error;
}

export async function updateLead(id: string, payload: Partial<Lead>) {
  // Strip server-managed fields from update too
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, ...rest } = payload as Lead;
  const { error } = await supabase
    .from('rpm_leads')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from('rpm_leads').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchLeadInteractions(leadId: string) {
  const { data, error } = await supabase.from('rpm_lead_interactions').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return Array.isArray(data) ? (data as LeadInteraction[]) : [];
}

export async function createLeadInteraction(payload: Partial<LeadInteraction>) {
  const { error } = await supabase.from('rpm_lead_interactions').insert(payload);
  if (error) throw error;
}

// ─── Quotations ───────────────────────────────────────────────────────────────
export async function fetchQuotations(opts: { page?: number; pageSize?: number; status?: QuoteStatus | 'all'; search?: string } = {}) {
  const { page = 1, pageSize = 20, status, search } = opts;
  let q = supabase.from('rpm_quotations').select('*', { count: 'exact' });
  if (status && status !== 'all') q = q.eq('status', status);
  if (search) q = q.ilike('customer_name', `%${search}%`);
  q = q.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Quotation[]) : [], count: count ?? 0 };
}

export async function createQuotation(payload: Partial<Quotation>) {
  const clean = { ...payload };
  if (!clean.quote_number) clean.quote_number = '';
  const { error } = await supabase.from('rpm_quotations').insert(clean);
  if (error) throw error;
}

export async function updateQuotation(id: string, payload: Partial<Quotation>) {
  const { error } = await supabase.from('rpm_quotations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuotation(id: string) {
  const { error } = await supabase.from('rpm_quotations').delete().eq('id', id);
  if (error) throw error;
}

// ─── Import Costs ─────────────────────────────────────────────────────────────
export async function saveImportCost(payload: Partial<ImportCost>) {
  // Strip any undefined values — Supabase rejects keys with undefined
  const clean: Record<string, unknown> = { saved: true };
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) clean[k] = v;
  }
  const { error } = await supabase.from('rpm_import_costs').insert(clean);
  if (error) {
    const msg = typeof error === 'object' && error !== null
      ? ((error as { message?: string }).message ?? JSON.stringify(error))
      : String(error);
    throw new Error(msg);
  }
}

export async function fetchSavedImportCosts() {
  const { data, error } = await supabase.from('rpm_import_costs').select('*').eq('saved', true).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return Array.isArray(data) ? (data as ImportCost[]) : [];
}

export async function fetchExchangeRate(): Promise<number> {
  const { data } = await supabase.from('rpm_exchange_rates').select('rate').eq('from_currency', 'JPY').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data as { rate: number } | null)?.rate ?? 1.88;
}

export async function updateExchangeRate(rate: number) {
  const { error } = await supabase.from('rpm_exchange_rates').insert({ from_currency: 'JPY', to_currency: 'PKR', rate, source: 'manual' });
  if (error) throw error;
}

// ─── Shipments ────────────────────────────────────────────────────────────────
export async function fetchShipments() {
  const { data, error } = await supabase.from('rpm_shipments').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return Array.isArray(data) ? (data as Shipment[]) : [];
}

export async function createShipment(payload: Partial<Shipment>) {
  const ref = payload.shipment_ref || `RPM-SHP-${Date.now().toString().slice(-6)}`;
  const { error } = await supabase.from('rpm_shipments').insert({ ...payload, shipment_ref: ref });
  if (error) throw error;
}

export async function updateShipment(id: string, payload: Partial<Shipment>) {
  const { error } = await supabase.from('rpm_shipments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteShipment(id: string) {
  const { error } = await supabase.from('rpm_shipments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function fetchExpenses(opts: { page?: number; pageSize?: number; category?: ExpenseCategory | 'all'; month?: string } = {}) {
  const { page = 1, pageSize = 30, category, month } = opts;
  let q = supabase.from('rpm_expenses').select('*', { count: 'exact' });
  if (category && category !== 'all') q = q.eq('category', category);
  if (month) q = q.gte('date', `${month}-01`).lte('date', `${month}-31`);
  q = q.order('date', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Expense[]) : [], count: count ?? 0 };
}

export async function createExpense(payload: Partial<Expense>) {
  const { error } = await supabase.from('rpm_expenses').insert(payload);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('rpm_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ─── Finance Plans ────────────────────────────────────────────────────────────
export async function fetchFinancePlans() {
  const { data, error } = await supabase.from('rpm_finance_plans').select('*').eq('is_active', true).order('bank_name');
  if (error) throw error;
  return Array.isArray(data) ? (data as FinancePlan[]) : [];
}

export async function createFinancePlan(payload: Partial<FinancePlan>) {
  const { error } = await supabase.from('rpm_finance_plans').insert(payload);
  if (error) throw error;
}

// ─── Social Posts ─────────────────────────────────────────────────────────────
export async function fetchSocialPosts(opts: { platform?: SocialPlatform | 'all'; status?: string } = {}) {
  let q = supabase.from('rpm_social_posts').select('*');
  if (opts.platform && opts.platform !== 'all') q = q.eq('platform', opts.platform);
  if (opts.status) q = q.eq('status', opts.status);
  q = q.order('created_at', { ascending: false }).limit(100);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? (data as SocialPost[]) : [];
}

export async function saveSocialPost(payload: Partial<SocialPost>) {
  const { error } = await supabase.from('rpm_social_posts').insert(payload);
  if (error) throw error;
}

export async function deleteSocialPost(id: string) {
  const { error } = await supabase.from('rpm_social_posts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function calcMonthlyInstalment(
  vehiclePrice: number, downPct: number, ratePct: number, months: number
): number {
  const principal = vehiclePrice * (1 - downPct / 100);
  const monthlyRate = ratePct / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
}
