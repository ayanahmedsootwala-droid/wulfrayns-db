import { supabase } from '@/db/supabase';
import type { Vehicle, Dealer, Dealership, Task, ActivityLog, DashboardStats, DealerInteraction, PriceHistory, VehicleImage } from '@/types/types';

// ============================================================
// VEHICLE IMAGES
// ============================================================

/** Convert any image File to WebP Blob via canvas (client-side, ~85% quality) */
export async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('WebP conversion failed')),
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

export async function fetchVehicleImages(vehicleId: string): Promise<VehicleImage[]> {
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? (data as VehicleImage[]) : [];
}

export async function uploadVehicleImage(
  vehicleId: string,
  file: File,
  sortOrder: number,
  isPrimary: boolean,
): Promise<VehicleImage> {
  // Convert to WebP first
  const webpBlob = await convertToWebP(file);
  const fileName = `${vehicleId}/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from('vehicle-images')
    .upload(fileName, webpBlob, { contentType: 'image/webp', upsert: false });

  if (storageError) throw storageError;

  const { data: urlData } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(storageData.path);

  const record: Partial<VehicleImage> = {
    vehicle_id: vehicleId,
    storage_path: storageData.path,
    url: urlData.publicUrl,
    sort_order: sortOrder,
    is_primary: isPrimary,
  };

  const { data, error } = await supabase.from('vehicle_images').insert(record).select().maybeSingle();
  if (error) throw error;
  return data as VehicleImage;
}

export async function deleteVehicleImage(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from('vehicle-images').remove([storagePath]);
  const { error } = await supabase.from('vehicle_images').delete().eq('id', id);
  if (error) throw error;
}

export async function setPrimaryVehicleImage(imageId: string, vehicleId: string): Promise<void> {
  // Clear existing primary then set new one
  await supabase.from('vehicle_images').update({ is_primary: false }).eq('vehicle_id', vehicleId);
  const { error } = await supabase.from('vehicle_images').update({ is_primary: true }).eq('id', imageId);
  if (error) throw error;
}

export async function reorderVehicleImages(images: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(
    images.map(({ id, sort_order }) =>
      supabase.from('vehicle_images').update({ sort_order }).eq('id', id),
    ),
  );
}

// ============================================================
// DASHBOARD
// ============================================================
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) {
    // Fallback: compute from direct queries
    const [vehicles, dealers, dealerships] = await Promise.all([
      supabase.from('vehicles').select('status, owner_type, created_at, updated_at, is_featured, is_hot_deal, inspection_score'),
      supabase.from('dealers').select('id', { count: 'exact', head: true }),
      supabase.from('dealerships').select('id', { count: 'exact', head: true }),
    ]);

    const vData = Array.isArray(vehicles.data) ? vehicles.data : [];
    const today = new Date().toISOString().split('T')[0];

    return {
      total_vehicles: vData.length,
      own_inventory: vData.filter(v => v.owner_type === 'own').length,
      dealer_inventory: vData.filter(v => v.owner_type === 'dealer').length,
      total_dealers: dealers.count ?? 0,
      total_dealerships: dealerships.count ?? 0,
      available_cars: vData.filter(v => v.status === 'available').length,
      reserved_cars: vData.filter(v => v.status === 'reserved').length,
      sold_cars: vData.filter(v => v.status === 'sold').length,
      incoming_cars: vData.filter(v => v.status === 'incoming').length,
      added_today: vData.filter(v => v.created_at?.startsWith(today)).length,
      updated_today: vData.filter(v => v.updated_at?.startsWith(today)).length,
      pending_inspection: vData.filter(v => v.status === 'inspection').length,
      featured_cars: vData.filter(v => v.is_featured).length,
      hot_deals: vData.filter(v => v.is_hot_deal).length,
    };
  }
  return data;
}

// ============================================================
// VEHICLES
// ============================================================
export async function fetchVehicles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  owner_type?: string;
  make?: string;
  body_type?: string;
  fuel_type?: string;
  dealer_city?: string;
  dealer_id?: string;
  dealership_id?: string;
  min_price?: number;
  max_price?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  has_sunroof?: boolean;
  has_android_panel?: boolean;
  vehicle_condition?: string;
} = {}) {
  const { page = 1, pageSize = 30, search, status, owner_type, make, body_type, fuel_type, dealer_city, dealer_id, dealership_id, min_price, max_price, orderBy = 'created_at', orderDir = 'desc', has_sunroof, has_android_panel, vehicle_condition } = params;

  let query = supabase
    .from('vehicles')
    .select('*, dealer:dealers!dealer_id(id,name,phone,city,rating), dealership:dealerships!dealership_id(id,name,city), party:rpm_parties!party_id(id,name,phone,city)', { count: 'exact' });

  if (search) {
    query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,variant.ilike.%${search}%,color.ilike.%${search}%,registration_number.ilike.%${search}%,vin.ilike.%${search}%,dealer_city.ilike.%${search}%`);
  }
  if (status && status !== 'all') query = query.eq('status', status);
  if (owner_type && owner_type !== 'all') query = query.eq('owner_type', owner_type);
  if (make) query = query.ilike('make', `%${make}%`);
  if (body_type) query = query.ilike('body_type', `%${body_type}%`);
  if (fuel_type) query = query.ilike('fuel_type', `%${fuel_type}%`);
  if (dealer_city) query = query.ilike('dealer_city', `%${dealer_city}%`);
  if (dealer_id) query = query.eq('dealer_id', dealer_id);
  if (dealership_id) query = query.eq('dealership_id', dealership_id);
  if (min_price) query = query.gte('expected_selling_price', min_price);
  if (max_price) query = query.lte('expected_selling_price', max_price);
  if (has_sunroof) query = query.eq('has_sunroof', true);
  if (has_android_panel) query = query.eq('has_android_panel', true);
  if (vehicle_condition && vehicle_condition !== 'all') query = query.eq('vehicle_condition', vehicle_condition);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(from, to);

  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Vehicle[]) : [], count: count ?? 0 };
}

export async function fetchVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, dealer:dealers!dealer_id(*), dealership:dealerships!dealership_id(*), party:rpm_parties!party_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}

// Strip ALL non-column fields before writing to 'vehicles'
// Includes join aliases, computed/virtual fields, and any temp UI fields
const VEHICLE_JOIN_ALIASES = new Set([
  'dealer', 'dealership', 'party',
  // virtual / computed
  'cover_image_url', 'image_count', 'dealer_city',
]);

function stripVehicleJoins(vehicle: Partial<Vehicle>): Partial<Vehicle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = { ...vehicle } as any;
  for (const key of VEHICLE_JOIN_ALIASES) delete v[key];
  // Remove any remaining object values that would cause [object Object] errors
  for (const key of Object.keys(v)) {
    if (v[key] !== null && typeof v[key] === 'object' && !Array.isArray(v[key])) {
      delete v[key];
    }
  }
  return v as Partial<Vehicle>;
}

export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const cleaned = stripVehicleJoins(vehicle);
  const { data, error } = await supabase
    .from('vehicles')
    .insert(cleaned)
    .select('*')
    .single();
  if (error) {
    // Surface a human-readable error message instead of [object Object]
    const msg = typeof error === 'object' && error !== null
      ? ((error as { message?: string }).message ?? JSON.stringify(error))
      : String(error);
    throw new Error(msg);
  }
  return data as Vehicle;
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const cleaned = stripVehicleJoins(vehicle);
  const { data, error } = await supabase
    .from('vehicles')
    .update(cleaned)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    const msg = typeof error === 'object' && error !== null
      ? ((error as { message?: string }).message ?? JSON.stringify(error))
      : String(error);
    throw new Error(msg);
  }
  return data as Vehicle;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPriceHistory(vehicleId: string): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// DEALERS
// ============================================================
export async function fetchDealers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  city?: string;
  is_favorite?: boolean;
} = {}) {
  const { page = 1, pageSize = 30, search, city, is_favorite } = params;

  let query = supabase
    .from('dealers')
    .select('*, dealership:dealerships!dealership_id(id,name,city)', { count: 'exact' });

  if (search) query = query.ilike('name', `%${search}%`);
  if (city) query = query.ilike('city', `%${city}%`);
  if (is_favorite !== undefined) query = query.eq('is_favorite', is_favorite);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('is_favorite', { ascending: false })
    .order('rating', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Dealer[]) : [], count: count ?? 0 };
}

export async function fetchDealer(id: string): Promise<Dealer | null> {
  const { data, error } = await supabase
    .from('dealers')
    .select('*, dealership:dealerships!dealership_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Dealer | null;
}

export async function createDealer(dealer: Partial<Dealer>): Promise<Dealer> {
  const { data, error } = await supabase.from('dealers').insert(dealer).select('*').single();
  if (error) throw error;
  return data as Dealer;
}

export async function updateDealer(id: string, dealer: Partial<Dealer>): Promise<Dealer> {
  const { data, error } = await supabase.from('dealers').update(dealer).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Dealer;
}

export async function deleteDealer(id: string): Promise<void> {
  const { error } = await supabase.from('dealers').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDealerInteractions(dealerId: string): Promise<DealerInteraction[]> {
  const { data, error } = await supabase
    .from('dealer_interactions')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createDealerInteraction(interaction: Partial<DealerInteraction>) {
  const { data, error } = await supabase.from('dealer_interactions').insert(interaction);
  if (error) throw error;
  return data;
}

// ============================================================
// DEALERSHIPS
// ============================================================
export async function fetchDealerships(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const { page = 1, pageSize = 30, search } = params;
  let query = supabase.from('dealerships').select('*', { count: 'exact' });
  if (search) query = query.ilike('name', `%${search}%`);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Dealership[]) : [], count: count ?? 0 };
}

export async function fetchDealership(id: string): Promise<Dealership | null> {
  const { data, error } = await supabase.from('dealerships').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Dealership | null;
}

export async function createDealership(ds: Partial<Dealership>): Promise<Dealership> {
  const { data, error } = await supabase.from('dealerships').insert(ds).select().single();
  if (error) throw error;
  return data as Dealership;
}

export async function updateDealership(id: string, ds: Partial<Dealership>) {
  const { data, error } = await supabase.from('dealerships').update(ds).eq('id', id);
  if (error) throw error;
  return data;
}

export async function deleteDealership(id: string) {
  const { error } = await supabase.from('dealerships').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// TASKS
// ============================================================
export async function fetchTasks(params: { status?: string; page?: number; pageSize?: number; due_date?: string } = {}) {
  const { status, page = 1, pageSize = 50, due_date } = params;
  let query = supabase
    .from('tasks')
    .select('*, dealer:dealers!dealer_id(id,name,phone), vehicle:vehicles!vehicle_id(id,make,model,variant)', { count: 'exact' });

  if (status && status !== 'all') query = query.eq('status', status);
  if (due_date) query = query.gte('due_date', due_date).lte('due_date', due_date + 'T23:59:59');

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('due_date', { ascending: true, nullsFirst: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  return { data: Array.isArray(data) ? (data as Task[]) : [], count: count ?? 0 };
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================
export async function checkDuplicateVehicle(params: {
  vin?: string; registration_number?: string; engine_number?: string;
  make?: string; model?: string; color?: string; mileage?: number;
  excludeId?: string;
}): Promise<{ isDuplicate: boolean; matches: { id: string; make: string; model: string; variant?: string; dealer?: { name: string } | null }[] }> {
  const { vin, registration_number, engine_number, make, model, color, mileage, excludeId } = params;
  if (!vin && !registration_number && !engine_number && !(make && model)) {
    return { isDuplicate: false, matches: [] };
  }

  const orClauses: string[] = [];
  if (vin) orClauses.push(`vin.eq.${vin}`);
  if (registration_number) orClauses.push(`registration_number.eq.${registration_number}`);
  if (engine_number) orClauses.push(`engine_number.eq.${engine_number}`);

  let matches: { id: string; make: string; model: string; variant?: string; dealer?: { name: string } | null }[] = [];

  if (orClauses.length > 0) {
    let q = supabase.from('vehicles')
      .select('id,make,model,variant,dealer:dealers!dealer_id(name)')
      .or(orClauses.join(','));
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(5);
    if (data) matches = (data as unknown) as typeof matches;
  }

  // Also check make+model+color+mileage similarity
  if (matches.length === 0 && make && model && color && mileage) {
    let q = supabase.from('vehicles')
      .select('id,make,model,variant,dealer:dealers!dealer_id(name)')
      .ilike('make', make)
      .ilike('model', model)
      .ilike('color', color)
      .gte('mileage', mileage * 0.92)
      .lte('mileage', mileage * 1.08);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(5);
    if (data) matches = (data as unknown) as typeof matches;
  }

  return { isDuplicate: matches.length > 0, matches };
}

export async function createTask(task: Partial<Task>) {
  const { data, error } = await supabase.from('tasks').insert(task);
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, task: Partial<Task>) {
  const { data, error } = await supabase.from('tasks').update(task).eq('id', id);
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// ACTIVITY LOG
// ============================================================
export async function fetchActivityLog(params: { page?: number; pageSize?: number; entity_type?: string; search?: string } = {}) {
  const { page = 1, pageSize = 50, entity_type, search } = params;
  let query = supabase.from('activity_log').select('*', { count: 'exact' });
  if (entity_type && entity_type !== 'all') query = query.eq('entity_type', entity_type);
  if (search) query = query.or(`entity_name.ilike.%${search}%,description.ilike.%${search}%,action_type.ilike.%${search}%`);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { data: Array.isArray(data) ? (data as ActivityLog[]) : [], count: count ?? 0 };
}

export async function logActivity(entry: {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  performed_by?: string;
}) {
  await supabase.from('activity_log').insert(entry);
}

// ============================================================
// GLOBAL SEARCH
// ============================================================
export async function globalSearch(query: string) {
  if (!query.trim()) return { vehicles: [], dealers: [], dealerships: [] };

  const q = query.trim();
  const [vehicles, dealers, dealerships] = await Promise.all([
    supabase.from('vehicles')
      .select('id,make,model,variant,color,status,expected_selling_price,dealer_city,cover_image_url,owner_type')
      .or(`make.ilike.%${q}%,model.ilike.%${q}%,variant.ilike.%${q}%,color.ilike.%${q}%,registration_number.ilike.%${q}%,vin.ilike.%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase.from('dealers')
      .select('id,name,phone,city,rating,is_favorite')
      .ilike('name', `%${q}%`)
      .order('rating', { ascending: false })
      .limit(5),
    supabase.from('dealerships')
      .select('id,name,city,owner_name')
      .ilike('name', `%${q}%`)
      .limit(5),
  ]);

  return {
    vehicles: Array.isArray(vehicles.data) ? vehicles.data : [],
    dealers: Array.isArray(dealers.data) ? dealers.data : [],
    dealerships: Array.isArray(dealerships.data) ? dealerships.data : [],
  };
}

// ============================================================
// ANALYTICS
// ============================================================
export async function fetchAnalyticsData() {
  const [vehicles, dealers] = await Promise.all([
    supabase.from('vehicles').select('make,body_type,fuel_type,status,owner_type,expected_selling_price,mileage,dealer_city,created_at,purchase_price,profit_estimate'),
    supabase.from('dealers').select('id,name,deals_done,rating,city').order('deals_done', { ascending: false }).limit(10),
  ]);

  const vData = Array.isArray(vehicles.data) ? vehicles.data : [];
  const dData = Array.isArray(dealers.data) ? dealers.data : [];

  // Cars by make
  const byMake: Record<string, number> = {};
  const byBodyType: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const byFuel: Record<string, number> = {};

  for (const v of vData) {
    if (v.make) byMake[v.make] = (byMake[v.make] || 0) + 1;
    if (v.body_type) byBodyType[v.body_type] = (byBodyType[v.body_type] || 0) + 1;
    if (v.dealer_city) byCity[v.dealer_city] = (byCity[v.dealer_city] || 0) + 1;
    if (v.fuel_type) byFuel[v.fuel_type] = (byFuel[v.fuel_type] || 0) + 1;
  }

  const totalValue = vData.filter(v => v.status === 'available').reduce((s, v) => s + (v.expected_selling_price || 0), 0);
  const avgMileage = vData.length ? Math.round(vData.reduce((s, v) => s + (v.mileage || 0), 0) / vData.length) : 0;

  return {
    carsByMake: Object.entries(byMake).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    carsByBodyType: Object.entries(byBodyType).map(([name, value]) => ({ name, value })),
    carsByCity: Object.entries(byCity).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    carsByFuel: Object.entries(byFuel).map(([name, value]) => ({ name, value })),
    topDealers: dData.map(d => ({ name: d.name, deals: d.deals_done || 0, rating: d.rating || 0 })),
    totalInventoryValue: totalValue,
    avgMileage,
    totalVehicles: vData.length,
  };
}

// ============================================================
// INQUIRIES
// ============================================================
import type { Inquiry, InquiryNote, InquiryStatus, InquiryPriority } from '@/types/types';

export async function fetchInquiries(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InquiryStatus | 'all';
  priority?: InquiryPriority | 'all';
  assigned_to?: string;
} = {}) {
  const { page = 1, pageSize = 30, search, status, priority, assigned_to } = params;
  let q = supabase
    .from('inquiries')
    .select('*, vehicle:vehicles(id,make,model,variant,stock_number)', { count: 'exact' });

  if (search) q = q.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,description.ilike.%${search}%`);
  if (status && status !== 'all') q = q.eq('status', status);
  if (priority && priority !== 'all') q = q.eq('priority', priority);
  if (assigned_to) q = q.ilike('assigned_to', `%${assigned_to}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await q
    .order('inquiry_date', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Inquiry[], count: count ?? 0 };
}

export async function fetchInquiry(id: string): Promise<Inquiry | null> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, vehicle:vehicles(id,make,model,variant,stock_number)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Inquiry | null;
}

export async function createInquiry(inquiry: Partial<Inquiry>): Promise<Inquiry> {
  const { data, error } = await supabase.from('inquiries').insert(inquiry).select().maybeSingle();
  if (error) throw error;
  return data as Inquiry;
}

export async function updateInquiry(id: string, inquiry: Partial<Inquiry>): Promise<void> {
  const { error } = await supabase.from('inquiries').update(inquiry).eq('id', id);
  if (error) throw error;
}

export async function deleteInquiry(id: string): Promise<void> {
  const { error } = await supabase.from('inquiries').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchInquiryNotes(inquiryId: string): Promise<InquiryNote[]> {
  const { data, error } = await supabase
    .from('inquiry_notes')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InquiryNote[];
}

export async function createInquiryNote(note: Partial<InquiryNote>): Promise<InquiryNote> {
  const { data, error } = await supabase.from('inquiry_notes').insert(note).select().maybeSingle();
  if (error) throw error;
  return data as InquiryNote;
}

export async function deleteInquiryNote(id: string): Promise<void> {
  const { error } = await supabase.from('inquiry_notes').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchInquiryStats() {
  const { data, error } = await supabase
    .from('inquiries')
    .select('status,priority,inquiry_date');
  if (error) throw error;
  const rows = (data ?? []) as { status: string; priority: string; inquiry_date: string }[];
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
  }
  return { total: rows.length, byStatus, byPriority };
}

// ============================================================
// BULK VEHICLE DELETE
// ============================================================
export async function bulkDeleteVehicles(ids: string[]): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().in('id', ids);
  if (error) throw error;
}

// ============================================================
// PARTIES
// ============================================================
import type { Party } from '@/types/types';

export async function fetchParties(params: { page?: number; pageSize?: number; search?: string; city?: string } = {}) {
  const { page = 1, pageSize = 50, search, city } = params;
  let q = supabase.from('rpm_parties').select('*', { count: 'exact' }).eq('is_active', true);
  if (search) q = q.ilike('name', `%${search}%`);
  if (city) q = q.ilike('city', `%${city}%`);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await q.order('name').range(from, from + pageSize - 1);
  if (error) throw error;
  return { data: (data ?? []) as Party[], count: count ?? 0 };
}

export async function fetchParty(id: string): Promise<Party | null> {
  const { data, error } = await supabase.from('rpm_parties').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Party | null;
}

export async function createParty(p: Partial<Party>): Promise<Party> {
  const { data, error } = await supabase.from('rpm_parties').insert(p).select().single();
  if (error) throw error;
  return data as Party;
}

export async function updateParty(id: string, p: Partial<Party>): Promise<Party> {
  const { data, error } = await supabase.from('rpm_parties').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as Party;
}

export async function deleteParty(id: string): Promise<void> {
  const { error } = await supabase.from('rpm_parties').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// IMPORT PRESETS
// ============================================================
export interface ImportPreset {
  id: string; name: string; make?: string; model?: string; engine_cc?: number;
  fuel_type?: string; is_hybrid?: boolean; is_ev?: boolean;
  cd_pct: number; rd_pct: number; st_pct: number; acd_pct: number; it_pct: number; ed_pct: number;
  notes?: string; created_at: string;
}

export async function fetchImportPresets(): Promise<ImportPreset[]> {
  const { data, error } = await supabase.from('rpm_import_presets').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as ImportPreset[];
}

export async function createImportPreset(p: Partial<ImportPreset>): Promise<ImportPreset> {
  const { data, error } = await supabase.from('rpm_import_presets').insert(p).select().single();
  if (error) throw error;
  return data as ImportPreset;
}

export async function deleteImportPreset(id: string): Promise<void> {
  const { error } = await supabase.from('rpm_import_presets').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// CUSTOMS DUTY CHART
// ============================================================
export interface DutyChartRow {
  id: string; cc_from: number; cc_to: number; fuel_type: string; is_hybrid: boolean;
  depreciation_1yr: number; depreciation_2yr: number; depreciation_3yr: number;
  depreciation_4yr: number; depreciation_5yr: number;
  cd_pct: number; rd_pct: number; st_pct: number; acd_pct: number; it_pct: number; fed_pct: number;
  notes?: string; updated_at: string;
}

export async function fetchDutyChart(): Promise<DutyChartRow[]> {
  const { data, error } = await supabase.from('rpm_customs_duty_chart').select('*').order('cc_from');
  if (error) throw error;
  return (data ?? []) as DutyChartRow[];
}

export async function updateDutyChartRow(id: string, row: Partial<DutyChartRow>): Promise<void> {
  const { error } = await supabase.from('rpm_customs_duty_chart').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// VEHICLE STATUS HISTORY
// ============================================================
export interface VehicleStatusEvent { id: string; vehicle_id: string; old_status?: string; new_status: string; changed_by?: string; notes?: string; created_at: string; }

export async function fetchVehicleStatusHistory(vehicleId: string): Promise<VehicleStatusEvent[]> {
  const { data, error } = await supabase.from('rpm_vehicle_status_history').select('*').eq('vehicle_id', vehicleId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleStatusEvent[];
}

// ============================================================
// API KEYS
// ============================================================
export interface ApiKey { id: string; name: string; key_hash: string; key_preview: string; permissions: string[]; is_active: boolean; last_used_at?: string; created_at: string; }

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabase.from('rpm_api_keys').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKey[];
}

export async function createApiKey(name: string, permissions: string[]): Promise<{ key: ApiKey; rawKey: string }> {
  const raw = 'rpm_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
  const preview = raw.slice(0, 12) + '…' + raw.slice(-4);
  // Simple hash for demo (production should use bcrypt via edge function)
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(raw));
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const { data, error } = await supabase.from('rpm_api_keys').insert({ name, key_hash: hash, key_preview: preview, permissions }).select().single();
  if (error) throw error;
  return { key: data as ApiKey, rawKey: raw };
}

export async function deleteApiKey(id: string): Promise<void> {
  const { error } = await supabase.from('rpm_api_keys').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// VEHICLE IMAGES — all images for gallery
// ============================================================
export async function fetchAllVehicleImages(params: {
  search?: string;
  vehicleId?: string;
} = {}): Promise<(VehicleImage & { vehicle?: { id: string; make: string; model: string; variant?: string; stock_number?: string } })[]> {
  let q = supabase
    .from('vehicle_images')
    .select('*, vehicle:vehicles(id,make,model,variant,stock_number)');
  if (params.vehicleId) q = q.eq('vehicle_id', params.vehicleId);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as (VehicleImage & { vehicle?: { id: string; make: string; model: string; variant?: string; stock_number?: string } })[];
  if (params.search) {
    const s = params.search.toLowerCase();
    return rows.filter(r =>
      `${r.vehicle?.make} ${r.vehicle?.model} ${r.vehicle?.variant} ${r.vehicle?.stock_number}`.toLowerCase().includes(s)
    );
  }
  return rows;
}
