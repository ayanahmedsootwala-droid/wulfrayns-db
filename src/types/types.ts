export type VehicleStatus = 'available' | 'reserved' | 'booked' | 'sold' | 'incoming' | 'archived' | 'inspection';
export type InquiryStatus = 'new' | 'active' | 'in_progress' | 'matched' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  storage_path: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  name: string;
  category: string;
  file_url: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  notes?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}
export type OwnerType = 'own' | 'dealer' | 'party';

export interface Party {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cnic?: string;
  address?: string;
  city?: string;
  notes?: string;
  tags?: string[];
  is_active?: boolean;
  deals_done?: number;
  receivables?: number;
  payables?: number;
  created_at: string;
  updated_at: string;
}
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType = 'call_dealer' | 'visit_showroom' | 'inspection' | 'price_update' | 'payment_reminder' | 'document_collection' | 'vehicle_pickup' | 'vehicle_delivery' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type InteractionType = 'call' | 'whatsapp' | 'meeting' | 'deal' | 'payment' | 'note' | 'visit';
export type EntityType = 'vehicle' | 'dealer' | 'dealership' | 'task' | 'system' | 'user';

export interface Inquiry {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  description?: string;
  vehicle_id?: string;
  vehicle?: { id: string; make: string; model: string; variant?: string; stock_number?: string };
  status: InquiryStatus;
  priority: InquiryPriority;
  assigned_to?: string;
  follow_up_date?: string;
  inquiry_date: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Car requirements
  req_make?: string;
  req_model?: string;
  req_variant?: string;
  req_color?: string;
  req_model_year?: number;
  req_reg_year?: number;
  req_mileage_max?: number;
  req_budget_max?: number;
  req_fuel_type?: string;
  req_transmission?: string;
  req_origin?: string;
  req_body_type?: string;
  req_additional?: string;
}

export interface InquiryNote {
  id: string;
  inquiry_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface Dealership {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  city?: string;
  area?: string;
  google_maps_url?: string;
  owner_name?: string;
  employee_count?: number;
  brands?: string[];
  business_hours?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dealer {
  id: string;
  name: string;
  photo_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cnic?: string;
  dealership_id?: string;
  dealership?: Dealership;
  address?: string;
  city?: string;
  area?: string;
  google_maps_url?: string;
  business_since?: number;
  preferred_brands?: string[];
  average_budget?: number;
  rating?: number;
  trust_score?: number;
  is_favorite?: boolean;
  tags?: string[];
  last_contact_at?: string;
  notes?: string;
  deals_done?: number;
  receivables?: number;
  payables?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  stock_number?: string;
  vin?: string;
  engine_number?: string;
  registration_number?: string;
  make: string;
  model: string;
  variant?: string;
  generation?: string;
  series?: string;
  trim?: string;
  body_type?: string;
  model_year?: number;
  registration_year?: number;
  registration_month?: number;
  registration_city?: string;
  origin?: 'local' | 'imported';
  auction_grade?: string;
  engine_capacity?: string;
  horsepower?: number;
  torque?: number;
  is_turbo?: boolean;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  battery_health?: number;
  range_km?: number;
  color?: string;
  interior_color?: string;
  paint_type?: string;
  original_paint_pct?: number;
  touchups?: string;
  panels_painted?: number;
  panels_replaced?: number;
  has_rust?: boolean;
  has_flood_damage?: boolean;
  has_accident_history?: boolean;
  dent_count?: number;
  scratch_count?: number;
  glass_original?: boolean;
  windshield_original?: boolean;
  seat_material?: string;
  seat_color?: string;
  dashboard_condition?: string;
  steering_condition?: string;
  carpet_condition?: string;
  roof_condition?: string;
  is_smoker_car?: boolean;
  has_pet?: boolean;
  odor_notes?: string;
  mileage?: number;
  engine_health?: number;
  transmission_health?: number;
  suspension_condition?: number;
  brakes_condition?: number;
  battery_condition?: number;
  tyres_condition?: number;
  ac_condition?: number;
  cooling_condition?: number;
  overall_condition?: number;
  inspection_score?: number;
  has_original_book?: boolean;
  has_smart_card?: boolean;
  has_duplicate_book?: boolean;
  has_transfer_letter?: boolean;
  tax_paid?: boolean;
  token_paid?: boolean;
  lifetime_token?: boolean;
  has_insurance?: boolean;
  insurance_expiry?: string;
  biometric_available?: boolean;
  excise_verified?: boolean;
  file_complete?: boolean;
  has_abs?: boolean;
  airbag_count?: number;
  has_esp?: boolean;
  has_traction_control?: boolean;
  has_cruise_control?: boolean;
  has_adaptive_cruise?: boolean;
  has_lane_assist?: boolean;
  has_blind_spot?: boolean;
  has_360_camera?: boolean;
  has_parking_sensors?: boolean;
  has_reverse_camera?: boolean;
  has_tpms?: boolean;
  has_hill_assist?: boolean;
  has_auto_hold?: boolean;
  has_climate_control?: boolean;
  has_dual_zone_ac?: boolean;
  has_rear_ac?: boolean;
  has_push_start?: boolean;
  has_keyless_entry?: boolean;
  has_memory_seats?: boolean;
  has_electric_seats?: boolean;
  has_ventilated_seats?: boolean;
  has_heated_seats?: boolean;
  has_massage_seats?: boolean;
  has_ambient_lighting?: boolean;
  has_android_panel?: boolean;
  has_apple_carplay?: boolean;
  has_android_auto?: boolean;
  has_navigation?: boolean;
  has_bluetooth?: boolean;
  has_usb?: boolean;
  has_wireless_charging?: boolean;
  has_premium_audio?: boolean;
  has_steering_controls?: boolean;
  has_rear_entertainment?: boolean;
  has_dash_cam?: boolean;
  has_sunroof?: boolean;
  has_panoramic_roof?: boolean;
  has_alloy_wheels?: boolean;
  has_led_lights?: boolean;
  has_fog_lamps?: boolean;
  has_roof_rails?: boolean;
  has_spoiler?: boolean;
  has_side_steps?: boolean;
  has_power_tailgate?: boolean;
  custom_features?: string;
  vehicle_condition?: 'new' | 'used';
  purchase_price?: number;
  repair_cost?: number;
  investment?: number;
  current_demand?: number;
  min_selling_price?: number;
  market_price?: number;
  expected_selling_price?: number;
  sold_price?: number;
  profit_estimate?: number;
  is_negotiable?: boolean;
  last_offer?: number;
  highest_offer?: number;
  lowest_offer?: number;
  commission?: number;
  dealer_id?: string;
  dealer?: Dealer;
  dealership_id?: string;
  dealership?: Dealership;
  party_id?: string;
  party?: Party;
  dealer_location?: string;
  dealer_area?: string;
  dealer_city?: string;
  last_contact_at?: string;
  dealer_rating?: number;
  priority?: Priority;
  status?: VehicleStatus;
  is_hot_deal?: boolean;
  is_urgent?: boolean;
  is_featured?: boolean;
  mechanical_notes?: string;
  inspection_notes?: string;
  private_notes?: string;
  negotiation_notes?: string;
  customer_notes?: string;
  cover_image_url?: string;
  image_urls?: string[];
  video_urls?: string[];
  document_urls?: string[];
  voice_note_urls?: string[];
  tags?: string[];
  source?: string;
  owner_type?: OwnerType;
  // Extended fields
  chassis_number?: string;
  seats?: number;
  doors?: number;
  engine_type?: string;
  cylinders?: number;
  fuel_economy?: number;
  battery_capacity?: number;
  import_cost?: number;
  last_service_date?: string;
  next_service_km?: number;
  tyre_brand?: string;
  listing_date?: string;
  target_sale_date?: string;
  purchase_date?: string;
  sold_date?: string;
  inspection_date?: string;
  inspection_done?: boolean;
  documents_clear?: boolean;
  ready_for_sale?: boolean;
  photos_taken?: boolean;
  repair_done?: boolean;
  advertised_online?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  vehicle_id: string;
  old_price?: number;
  new_price?: number;
  difference?: number;
  percentage?: number;
  price_type?: string;
  reason?: string;
  updated_by?: string;
  created_at: string;
}

export interface DealerInteraction {
  id: string;
  dealer_id: string;
  interaction_type: InteractionType;
  title?: string;
  notes?: string;
  amount?: number;
  vehicle_id?: string;
  vehicle?: Vehicle;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  task_type: TaskType;
  description?: string;
  dealer_id?: string;
  dealer?: Dealer;
  vehicle_id?: string;
  vehicle?: Vehicle;
  due_date?: string;
  priority?: Priority;
  status?: TaskStatus;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  assigned_to?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: EntityType;
  entity_id?: string;
  entity_name?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  description?: string;
  performed_by?: string;
  user_name?: string;
  ip_address?: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  search_type?: string;
  use_count?: number;
  created_at: string;
}

export interface DashboardStats {
  total_vehicles: number;
  own_inventory: number;
  dealer_inventory: number;
  total_dealers: number;
  total_dealerships: number;
  available_cars: number;
  reserved_cars: number;
  sold_cars: number;
  incoming_cars: number;
  added_today: number;
  updated_today: number;
  pending_inspection: number;
  featured_cars: number;
  hot_deals: number;
}
