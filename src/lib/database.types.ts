// ════════════════════════════════════════════════════════════════
//  AskIndia — Supabase Database TypeScript Types
//  Auto-generated mirror of supabase/schema.sql
// ════════════════════════════════════════════════════════════════

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ── Row types (what you get back from SELECT) ─────────────────────────────

export interface ProfileRow {
  id:          string;
  name:        string;
  email:       string;
  role:        'admin' | 'store_owner' | 'service_provider' | 'customer' | 'agent';
  phone:       string | null;
  city:        string | null;
  state:       string | null;
  avatar_url:  string | null;
  store_id:    string | null;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

export interface StoreRow {
  id:               string;
  owner_id:         string;
  owner_name:       string;
  name:             string;
  slug:             string;
  tagline:          string;
  description:      string;
  logo:             string;
  theme_color:      string;
  banner_url:       string | null;
  city:             string;
  state:            string;
  store_type:       'product' | 'service';
  status:           'active' | 'pending' | 'suspended';
  commission_rate:  number;
  wallet_balance:   number;
  total_sales:      number;
  total_orders:     number;
  subdomain:        string;
  contact_email:    string | null;
  contact_phone:    string | null;
  gst_number:       string | null;
  bank_account:     string | null;
  bank_ifsc:        string | null;
  customization:    Json;
  invoice_settings: Json;
  activated_at:     string | null;
  activated_by:     string | null;
  rejected_at:      string | null;
  rejection_reason: string | null;
  created_at:       string;
  updated_at:       string;
}

export interface ProductRow {
  id:               string;
  store_id:         string;
  name:             string;
  description:      string;
  price:            number;
  mrp:              number;
  commission:       number;
  category_id:      string;
  category:         string;
  brand:            string | null;
  stock:            number;
  sold:             number;
  image_color:      string;
  image_icon:       string;
  thumbnail:        string | null;
  images:           string[];
  status:           'active' | 'draft' | 'out_of_stock';
  featured:         boolean;
  available_cities: string[];
  tags:             string[];
  highlights:       string[];
  specifications:   Json;
  warranty:         string;
  return_policy:    string;
  gst_rate:         number;
  hsn_code:         string | null;
  created_at:       string;
  updated_at:       string;
}

export interface ServiceRow {
  id:               string;
  provider_id:      string;
  store_id:         string | null;
  provider_name:    string;
  title:            string;
  description:      string;
  category:         string;
  subcategory:      string | null;
  price:            number;
  price_type:       'fixed' | 'hourly' | 'starting_from';
  commission:       number;
  delivery_time:    string;
  image_color:      string;
  image_icon:       string;
  thumbnail:        string | null;
  images:           string[];
  status:           'active' | 'inactive' | 'pending_review';
  featured:         boolean;
  available_cities: string[];
  tags:             string[];
  includes:         string[];
  process:          Json;
  rating:           number;
  review_count:     number;
  created_at:       string;
  updated_at:       string;
}

export interface OrderRow {
  id:                  string;
  customer_id:         string | null;
  customer_name:       string;
  customer_email:      string;
  store_id:            string | null;
  store_name:          string;
  items:               Json;
  subtotal:            number;
  total:               number;
  commission_total:    number;
  admin_revenue:       number;
  discount:            number;
  shipping_charge:     number;
  gst_amount:          number;
  status:              'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method:      'card' | 'upi' | 'wallet' | 'cod' | null;
  payment_status:      'paid' | 'pending' | 'refunded';
  razorpay_order_id:   string | null;
  razorpay_payment_id: string | null;
  address:             string;
  city:                string;
  agent_id:            string | null;
  agent_name:          string | null;
  agent_code:          string | null;
  agent_commission:    number | null;
  tracking_number:     string | null;
  courier_name:        string | null;
  cancel_reason:       string | null;
  created_at:          string;
  updated_at:          string;
}

export interface ServiceOrderRow {
  id:               string;
  service_id:       string | null;
  service_title:    string;
  service_icon:     string;
  service_color:    string;
  provider_id:      string | null;
  provider_name:    string;
  customer_id:      string | null;
  customer_name:    string;
  customer_email:   string;
  customer_phone:   string | null;
  amount:           number;
  status:           'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status:   'pending' | 'paid' | 'failed' | 'refunded';
  scheduled_date:   string;
  address:          string;
  city:             string;
  notes:            string | null;
  agent_id:         string | null;
  agent_name:       string | null;
  agent_code:       string | null;
  agent_commission: number | null;
  created_at:       string;
  updated_at:       string;
}

export interface AgentRow {
  id:              string;
  agent_code:      string;
  commission_rate: number;
  status:          'active' | 'pending' | 'suspended';
  wallet_balance:  number;
  total_earned:    number;
  total_orders:    number;
  total_sales:     number;
  activated_at:    string | null;
  activated_by:    string | null;
  created_at:      string;
  updated_at:      string;
}

export interface WalletRow {
  id:              string;
  user_id:         string;
  balance:         number;
  pending_balance: number;
  total_earned:    number;
  total_withdrawn: number;
  created_at:      string;
  updated_at:      string;
}

export interface WalletTransactionRow {
  id:             string;
  wallet_id:      string;
  type:           'credit' | 'debit' | 'pending' | 'refund';
  amount:         number;
  description:    string | null;
  reference_id:   string | null;
  reference_type: string | null;
  status:         'completed' | 'pending' | 'failed';
  created_at:     string;
}

export interface WithdrawalRequestRow {
  id:           string;
  entity_type:  'store' | 'service_provider' | 'agent';
  entity_id:    string;
  entity_name:  string;
  owner_name:   string;
  amount:       number;
  bank_account: string;
  ifsc:         string;
  status:       'pending' | 'approved' | 'rejected' | 'processed';
  note:         string | null;
  requested_at: string;
  processed_at: string | null;
}

export interface NotificationRow {
  id:         string;
  user_id:    string;
  type:       'order' | 'commission' | 'payout' | 'store' | 'system' | 'service';
  title:      string;
  message:    string;
  read:       boolean;
  link:       string | null;
  created_at: string;
}

export interface HomepageConfigRow {
  id:                      number;
  announcement_bar:        string;
  announcement_bar_active: boolean;
  hero_slides:             Json;
  mini_banners:            Json;
  show_products:           boolean;
  show_services:           boolean;
  show_stores:             boolean;
  show_trust_badges:       boolean;
  show_seller_cta:         boolean;
  show_brand_logos:        boolean;
  brand_logos:             Json;
  show_newsletter:         boolean;
  newsletter_title:        string;
  newsletter_subtitle:     string;
  show_trending_section:   boolean;
  show_best_deals:         boolean;
  show_collection_list:    boolean;
  updated_at:              string;
}

export interface UserActivityRow {
  id:         string;
  user_id:    string | null;
  user_name:  string;
  user_email: string;
  user_role:  string;
  event:      string;
  page:       string | null;
  metadata:   Json;
  session_id: string | null;
  created_at: string;
}

export interface CustomRoleRow {
  id:          string;
  name:        string;
  description: string;
  permissions: string[];
  color:       string;
  is_system:   boolean;
  created_at:  string;
}

export interface AbandonedCartRow {
  id:            string;
  user_id:       string | null;
  user_name:     string;
  user_email:    string;
  cart_items:    Json;
  total:         number;
  item_count:    number;
  last_activity: string;
  recovered:     boolean;
  recovered_at:  string | null;
  created_at:    string;
}

// ── Database interface (used by createClient<Database>) ──────────────────
//  supabase-js v2 GenericTable requires Rows/Insert/Update + Relationships[].
//  We have no foreign-key joins to model, so Relationships is always [].

// Intersect each Row/Insert/Update with Record<string,unknown> so the concrete
// interface types satisfy GenericTable's Record<string,unknown> constraint
// (TypeScript requires an explicit index signature for that check).
type DBTable<Row extends object, Insert extends object, Update extends object> = {
  Row:           Row    & Record<string, unknown>;
  Insert:        Insert & Record<string, unknown>;
  Update:        Update & Record<string, unknown>;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      profiles:            DBTable<ProfileRow,            Partial<ProfileRow> & { id: string; email: string },   Partial<ProfileRow>>;
      stores:              DBTable<StoreRow,               Omit<StoreRow,              'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<StoreRow>>;
      products:            DBTable<ProductRow,             Omit<ProductRow,            'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<ProductRow>>;
      services:            DBTable<ServiceRow,             Omit<ServiceRow,            'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<ServiceRow>>;
      orders:              DBTable<OrderRow,               Omit<OrderRow,              'created_at' | 'updated_at'>,                           Partial<OrderRow>>;
      service_orders:      DBTable<ServiceOrderRow,        Omit<ServiceOrderRow,       'created_at' | 'updated_at'>,                           Partial<ServiceOrderRow>>;
      agents:              DBTable<AgentRow,               Omit<AgentRow,              'created_at' | 'updated_at'>,                           Partial<AgentRow>>;
      wallets:             DBTable<WalletRow,              Omit<WalletRow,             'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<WalletRow>>;
      wallet_transactions: DBTable<WalletTransactionRow,   Omit<WalletTransactionRow,  'id' | 'created_at'> & { id?: string },                 Partial<WalletTransactionRow>>;
      withdrawal_requests: DBTable<WithdrawalRequestRow,   Omit<WithdrawalRequestRow,  'id'> & { id?: string },                                Partial<WithdrawalRequestRow>>;
      notifications:       DBTable<NotificationRow,        Omit<NotificationRow,       'id' | 'created_at'> & { id?: string },                 Partial<NotificationRow>>;
      homepage_config:     DBTable<HomepageConfigRow,      Partial<HomepageConfigRow> & { id?: number },                                       Partial<HomepageConfigRow>>;
      user_activities:     DBTable<UserActivityRow,        Omit<UserActivityRow,       'id' | 'created_at'> & { id?: string },                 Partial<UserActivityRow>>;
      custom_roles:        DBTable<CustomRoleRow,          Omit<CustomRoleRow,         'id' | 'created_at'> & { id?: string },                 Partial<CustomRoleRow>>;
      abandoned_carts:     DBTable<AbandonedCartRow,       Omit<AbandonedCartRow,      'id' | 'created_at'> & { id?: string },                 Partial<AbandonedCartRow>>;
    };
    Views: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: never[] }>;
    Functions: {
      is_admin:                  { Args: Record<string, never>; Returns: boolean };
      get_user_role:             { Args: Record<string, never>; Returns: string  };
      get_user_store_id:         { Args: Record<string, never>; Returns: string  };
      generate_order_id:         { Args: Record<string, never>; Returns: string  };
      generate_service_order_id: { Args: Record<string, never>; Returns: string  };
      generate_agent_code:       { Args: Record<string, never>; Returns: string  };
    };
  };
}
