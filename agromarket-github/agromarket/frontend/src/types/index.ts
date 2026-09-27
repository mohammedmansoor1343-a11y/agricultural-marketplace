export type Role = "farmer" | "buyer" | "driver" | "coordinator" | "admin";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LotItem {
  id: number;
  listing_id: number;
  farmer_id: number;
  allocated_kg: number;
  price_per_kg: number;
  farmer_name?: string | null;
  village?: string | null;
}

export interface BulkLot {
  id: number;
  lot_code: string;
  crop_name: string;
  total_quantity_kg: number;
  remaining_kg: number;
  farmer_count: number;
  pickup_location: string;
  available_from: string;
  price_per_kg: number;
  transport_cost_per_kg: number;
  platform_fee_per_kg: number;
  buyer_price_per_kg: number;
  status: string;
  created_at: string;
  items: LotItem[];
}

export interface ProduceListing {
  id: number;
  farmer_id: number;
  crop_name: string;
  quantity_kg: number;
  remaining_kg: number;
  expected_price_per_kg: number;
  village: string;
  pickup_location: string;
  available_from: string;
  image_url?: string | null;
  status: string;
  verified_weight_kg?: number | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface OrderEvent {
  id: number;
  status: string;
  note?: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  order_code: string;
  lot_id: number;
  quantity_kg: number;
  price_per_kg: number;
  farmer_price_per_kg: number;
  transport_cost_per_kg: number;
  platform_fee_per_kg: number;
  total_amount: number;
  status: string;
  created_at: string;
  lot_crop_name?: string | null;
  lot_pickup_location?: string | null;
  buyer_name?: string | null;
  buyer_business?: string | null;
  delivery_code?: string | null;
  delivery_status?: string | null;
  status_history?: OrderEvent[];
  items?: LotItem[];
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  farmer_amount: number;
  transport_amount: number;
  platform_fee_amount: number;
  status: string;
  transaction_ref?: string | null;
  is_simulated: boolean;
  created_at: string;
  order_code?: string | null;
  buyer_name?: string | null;
  crop_name?: string | null;
  quantity_kg?: number | null;
}

export interface Delivery {
  id: number;
  delivery_code: string;
  order_id: number;
  order_code?: string | null;
  driver_id?: number | null;
  driver_name?: string | null;
  vehicle_type?: string | null;
  vehicle_registration_number?: string | null;
  pickup_location: string;
  drop_location: string;
  crop_name: string;
  load_kg: number;
  actual_weight_kg?: number | null;
  distance_km: number;
  estimated_earnings: number;
  actual_earnings?: number | null;
  required_capacity_kg: number;
  status: string;
  buyer_name?: string | null;
  created_at: string;
}

export interface DriverMatchCandidate {
  driver_id: number;
  driver_name: string;
  vehicle_id: number;
  vehicle_type: string;
  registration_number: string;
  capacity_kg: number;
  service_area: string;
  distance_score: number;
  route_compatibility: number;
  match_score: number;
  is_available: boolean;
}

export interface DriverMatch {
  order_id: number;
  candidates: DriverMatchCandidate[];
  recommended_driver_id?: number | null;
  message?: string | null;
}

export interface PricePoint {
  id?: number | null;
  crop_name: string;
  week_start: string;
  modal_price_per_kg: number;
  is_forecast: boolean;
  source: string;
}

export interface PriceSeries {
  crop_name: string;
  history: PricePoint[];
  forecast: PricePoint[];
  current_price?: number | null;
  trend_percent?: number | null;
  trend_direction?: "up" | "down" | "flat" | null;
  source_note: string;
}

export interface TrustScoreRow {
  user_id: number;
  user_name?: string | null;
  role?: string | null;
  score: number;
  completed_transactions: number;
  cancelled_transactions: number;
  on_time_deliveries: number;
  rating_avg?: number | null;
  last_updated_reason?: string | null;
}

export interface DashboardData {
  cards: { label: string; value: string | number; tone: string }[];
  extra: Record<string, unknown>;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  is_active: boolean;
  village?: string | null;
  district?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  vehicle_summary?: string | null;
  trust_score?: number | null;
  created_at?: string | null;
}

export interface CoordinatorFarmer {
  farmer_id: number;
  user_id: number;
  full_name: string;
  phone: string;
  village: string;
  district: string;
  status: string;
  listing_count: number;
}

export interface SettingsData {
  aggregation_threshold_kg: number;
  platform_fee_per_kg: number;
  demo_mode: boolean;
}

export interface ReportData {
  produce_volume: { total_kg: number; by_crop: { name: string; value: number }[] };
  orders_by_status: { name: string; value: number }[];
  payments_by_status: { name: string; value: number }[];
  deliveries_by_status: { name: string; value: number }[];
  transaction_activity: { total_transactions: number; total_value: number; note: string };
}
