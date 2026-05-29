/**
 * AskIndia — Supabase Data Service Layer
 *
 * Wraps all Supabase calls and maps snake_case DB rows ↔ camelCase app types.
 * All functions throw on error — callers should catch.
 */

import { supabase } from './supabase';
import type {
  ProductRow, ServiceRow, StoreRow, OrderRow, ServiceOrderRow,
  AgentRow, WithdrawalRequestRow, NotificationRow, HomepageConfigRow,
  UserActivityRow, CustomRoleRow, AbandonedCartRow,
} from './database.types';

// Untyped alias for Supabase JS client (public reads that don't need auth).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = supabase as any;

// ── Direct REST layer ────────────────────────────────────────────────────────
// The Supabase JS client routes ALL operations (reads + writes) through
// supabase.auth.getSession() which acquires a per-project Web Lock.
// When a stale refresh token triggers a continuous retry loop that holds
// that lock, every subsequent getSession() hangs indefinitely.
//
// We avoid this entirely by making authenticated calls directly via fetch,
// using an access_token stored here after login. This bypasses the lock
// completely for all write operations and auth-gated reads.
// ────────────────────────────────────────────────────────────────────────────

const _base = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
const _key  = (supabase as unknown as { supabaseKey: string }).supabaseKey;
let _token: string | null = null;

// Restore access token from localStorage on page refresh (module init).
(function _tryRestoreToken() {
  try {
    const ref = _base.split('//')[1]?.split('.')[0] ?? '';
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    if (raw) {
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed?.access_token) _token = parsed.access_token;
    }
  } catch { /* SSR / worker — no localStorage */ }
})();

function _authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'apikey':        _key,
    'Authorization': `Bearer ${_token ?? ''}`,
    'Content-Type':  'application/json',
    ...extra,
  };
}

async function _post(table: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${_base}/rest/v1/${table}`, {
    method:  'POST',
    headers: _authHeaders({ 'Prefer': 'return=minimal' }),
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
}

async function _patch(table: string, where: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${_base}/rest/v1/${table}?${where}`, {
    method:  'PATCH',
    headers: _authHeaders({ 'Prefer': 'return=minimal' }),
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
}

async function _get<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${_base}/rest/v1/${table}?${query}`, {
    headers: _authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T[]>;
}

// INSERT and return the created row (uses PostgREST "return=representation").
async function _postReturn<T>(table: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${_base}/rest/v1/${table}`, {
    method: 'POST',
    headers: _authHeaders({
      'Prefer': 'return=representation',
      'Accept': 'application/vnd.pgrst.object+json',
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function _delete(table: string, where: string): Promise<void> {
  const res = await fetch(`${_base}/rest/v1/${table}?${where}`, {
    method: 'DELETE',
    headers: _authHeaders({ 'Prefer': 'return=minimal' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
}

import type {
  User, Product, Service, Store, Order, ServiceOrder, Agent,
  WithdrawalRequest, Notification, HomepageConfig, UserActivity,
  Role, AbandonedCart, InvoiceSettings, StoreCustomization,
} from '../types';

// ════════════════════════════════════════════════════════════════════════════
//  AUTH SERVICE
// ════════════════════════════════════════════════════════════════════════════

// Rejects after ms milliseconds so hung Supabase calls don't spin forever.
// Accepts PromiseLike<T> so PostgrestBuilder (which has .then but not .catch/.finally) works too.
function withTimeout<T>(promise: PromiseLike<T>, ms: number, msg = 'Request timed out'): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export const authService = {

  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const UNAVAILABLE = 'Unable to reach the server. Please try again in a moment.';
    const baseUrl: string = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    const apiKey:  string = (supabase as unknown as { supabaseKey: string }).supabaseKey;

    // ── Step 0: clear stale auth tokens from localStorage ────────────────────
    // A stale/expired refresh token causes the supabase-js client to run a
    // continuous auto-refresh retry loop that holds the internal Web Lock.
    // Every subsequent auth call (signInWithPassword, setSession) waits for that
    // lock and hangs forever. Clearing the token synchronously breaks the loop
    // before we make any network call.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* no localStorage in SSR / worker context */ }

    // ── Step 1: authenticate via direct HTTP (no JS-client lock) ─────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authJson: any;
    try {
      const res = await withTimeout(
        fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({ email, password }),
        }).then(r => r.json()),
        10000
      );
      authJson = res;
    } catch {
      return { success: false, error: UNAVAILABLE };
    }

    if (!authJson?.access_token) {
      return {
        success: false,
        error: authJson?.error_description ?? authJson?.message ?? 'Login failed. Check your credentials.',
      };
    }

    // ── Step 2: store token for direct REST calls + write to localStorage ───────
    // Store the access token in the module-level _token variable so that all
    // subsequent mutations (_post / _patch / _get) can use it without going
    // through the Supabase JS client (which would hang on the Web Lock).
    _token = authJson.access_token;

    try {
      const projectRef = baseUrl.split('//')[1]?.split('.')[0] ?? '';
      localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify({
        access_token:  authJson.access_token,
        refresh_token: authJson.refresh_token,
        token_type:    'bearer',
        expires_in:    authJson.expires_in  ?? 3600,
        expires_at:    authJson.expires_at  ?? Math.floor(Date.now() / 1000) + 3600,
        user:          authJson.user,
      }));
    } catch { /* no localStorage — session usable for this tab only */ }

    // ── Step 3: fetch profile via direct HTTP (same lock-free approach) ───────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any;
    try {
      const rows = await withTimeout(
        fetch(
          `${baseUrl}/rest/v1/profiles?id=eq.${authJson.user.id}&select=*&limit=1`,
          { headers: { apikey: apiKey, Authorization: `Bearer ${authJson.access_token}` } }
        ).then(r => r.json()),
        8000
      );
      profile = Array.isArray(rows) ? rows[0] : null;
    } catch {
      return { success: false, error: UNAVAILABLE };
    }

    if (!profile) return { success: false, error: 'Profile not found.' };
    return { success: true, user: mapProfile(profile) };
  },

  async signUp(opts: {
    email: string;
    password: string;
    name: string;
    role: User['role'];
    phone?: string;
    city?: string;
    state?: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        data: {
          name:  opts.name,
          role:  opts.role,
          phone: opts.phone  ?? '',
          city:  opts.city   ?? '',
          state: opts.state  ?? '',
        },
      },
    });

    if (error || !data.user) return { success: false, error: error?.message ?? 'Registration failed.' };

    // Patch the profile (trigger creates it, but may need a moment)
    // Store the token so _patch works immediately after signup
    _token = data.session?.access_token ?? null;
    await _patch('profiles', `id=eq.${data.user.id}`, {
      name:  opts.name,
      role:  opts.role,
      phone: opts.phone  ?? null,
      city:  opts.city   ?? null,
      state: opts.state  ?? null,
    });

    return { success: true, userId: data.user.id };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<User | null> {
    // Read session directly from localStorage — avoids supabase.auth.getSession()
    // which acquires a Web Lock that may be held by a stale-token retry loop.
    if (!_token) return null;

    try {
      const ref = _base.split('//')[1]?.split('.')[0] ?? '';
      const raw = localStorage.getItem(`sb-${ref}-auth-token`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { access_token?: string; user?: { id: string } };
      const userId = parsed?.user?.id;
      if (!userId) return null;

      const rows = await _get<Record<string, unknown>>('profiles', `id=eq.${userId}&select=*&limit=1`);
      const profile = rows[0];
      return profile ? mapProfile(profile as Parameters<typeof mapProfile>[0]) : null;
    } catch {
      return null;
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  DATA LOADERS  — called after login to populate Zustand
// ════════════════════════════════════════════════════════════════════════════

export const dataLoaders = {

  async loadHomepageConfig(): Promise<HomepageConfig | null> {
    const rows = await _get<HomepageConfigRow>('homepage_config', 'id=eq.1&limit=1');
    return rows[0] ? mapHomepageConfig(rows[0]) : null;
  },

  async loadProducts(role: User['role'], storeId?: string): Promise<Product[]> {
    let q = 'select=*&order=created_at.desc';
    if (role === 'store_owner' && storeId) q += `&store_id=eq.${storeId}`;
    else if (role === 'customer' || role === 'agent') q += '&status=eq.active';
    const rows = await _get<ProductRow>('products', q);
    return rows.map(mapProduct);
  },

  async loadServices(role: User['role'], providerId?: string): Promise<Service[]> {
    let q = 'select=*&order=created_at.desc';
    if (role === 'service_provider' && providerId) q += `&provider_id=eq.${providerId}`;
    else q += '&status=eq.active';
    const rows = await _get<ServiceRow>('services', q);
    return rows.map(mapService);
  },

  async loadStores(): Promise<Store[]> {
    const rows = await _get<StoreRow>('stores', 'select=*&order=created_at.desc');
    return rows.map(mapStore);
  },

  async loadOrders(role: User['role'], userId?: string, storeId?: string): Promise<Order[]> {
    let q = 'select=*&order=created_at.desc';
    if (role === 'customer'   && userId)   q += `&customer_id=eq.${userId}`;
    if (role === 'store_owner' && storeId) q += `&store_id=eq.${storeId}`;
    if (role === 'agent'      && userId)   q += `&agent_id=eq.${userId}`;
    const rows = await _get<OrderRow>('orders', q);
    return rows.map(mapOrder);
  },

  async loadServiceOrders(role: User['role'], userId?: string): Promise<ServiceOrder[]> {
    let q = 'select=*&order=created_at.desc';
    if (role === 'customer'          && userId) q += `&customer_id=eq.${userId}`;
    if (role === 'service_provider'  && userId) q += `&provider_id=eq.${userId}`;
    if (role === 'agent'             && userId) q += `&agent_id=eq.${userId}`;
    const rows = await _get<ServiceOrderRow>('service_orders', q);
    return rows.map(mapServiceOrder);
  },

  async loadNotifications(userId: string): Promise<Notification[]> {
    const rows = await _get<NotificationRow>(
      'notifications',
      `user_id=eq.${userId}&order=created_at.desc&limit=100`,
    );
    return rows.map(mapNotification);
  },

  async loadAgents(): Promise<Agent[]> {
    type AgentWithProfile = AgentRow & { profiles?: { name: string; email: string; phone: string | null; city: string | null; state: string | null } | null };
    const rows = await _get<AgentWithProfile>(
      'agents',
      'select=*,profiles!agents_id_fkey(name,email,phone,city,state)&order=created_at.desc',
    );
    return rows.map(row => mapAgent(row as AgentRow, row.profiles ?? undefined));
  },

  async loadWithdrawalRequests(entityId?: string): Promise<WithdrawalRequest[]> {
    let q = 'select=*&order=requested_at.desc';
    if (entityId) q += `&entity_id=eq.${entityId}`;
    const rows = await _get<WithdrawalRequestRow>('withdrawal_requests', q);
    return rows.map(mapWithdrawal);
  },

  async loadUserActivities(): Promise<UserActivity[]> {
    const rows = await _get<UserActivityRow>('user_activities', 'select=*&order=created_at.desc&limit=500');
    return rows.map(mapUserActivity);
  },

  async loadAbandonedCarts(): Promise<AbandonedCart[]> {
    const rows = await _get<AbandonedCartRow>('abandoned_carts', 'select=*&order=last_activity.desc');
    return rows.map(mapAbandonedCart);
  },

  async loadCustomRoles(): Promise<Role[]> {
    const rows = await _get<CustomRoleRow>('custom_roles', 'select=*');
    return rows.map(mapCustomRole);
  },

  async loadProviderInvoiceSettings(providerId: string): Promise<InvoiceSettings | null> {
    type ProfileWithStore = { store_id: string | null; stores?: { invoice_settings: unknown } | null };
    const rows = await _get<ProfileWithStore>(
      'profiles',
      `id=eq.${providerId}&select=store_id,stores!profiles_store_id_fkey(invoice_settings)&limit=1`,
    );
    const data = rows[0];
    if (!data) return null;
    return (data.stores?.invoice_settings ?? {}) as InvoiceSettings;
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  MUTATIONS  — write operations, called from Zustand after local state update
// ════════════════════════════════════════════════════════════════════════════

export const mutations = {

  // ── Products ───────────────────────────────────────────────────────────────

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'sold'> & { storeId: string }): Promise<string> {
    const { storeId, ...rest } = data;
    const row = await _postReturn<{ id: string }>('products', {
      store_id:         storeId,
      name:             rest.name,
      description:      rest.description,
      price:            rest.price,
      mrp:              rest.mrp,
      commission:       rest.commission,
      category_id:      rest.categoryId,
      category:         rest.category,
      brand:            rest.brand ?? null,
      stock:            rest.stock,
      image_color:      rest.imageColor,
      image_icon:       rest.imageIcon,
      images:           rest.images ?? [],
      status:           rest.status,
      featured:         rest.featured,
      available_cities: rest.availableCities,
      tags:             rest.tags ?? [],
      highlights:       rest.highlights ?? [],
      specifications:   rest.specifications ?? [],
      warranty:         rest.warranty ?? '',
      return_policy:    rest.returnPolicy ?? '',
    });
    return row.id;
  },

  async updateProduct(id: string, patch: Partial<Product>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.name           !== undefined) update.name             = patch.name;
    if (patch.description    !== undefined) update.description      = patch.description;
    if (patch.price          !== undefined) update.price            = patch.price;
    if (patch.mrp            !== undefined) update.mrp              = patch.mrp;
    if (patch.commission     !== undefined) update.commission       = patch.commission;
    if (patch.stock          !== undefined) update.stock            = patch.stock;
    if (patch.status         !== undefined) update.status           = patch.status;
    if (patch.featured       !== undefined) update.featured         = patch.featured;
    if (patch.imageColor     !== undefined) update.image_color      = patch.imageColor;
    if (patch.imageIcon      !== undefined) update.image_icon       = patch.imageIcon;
    if (patch.availableCities !== undefined) update.available_cities = patch.availableCities;
    if (patch.tags           !== undefined) update.tags             = patch.tags;
    if (patch.highlights     !== undefined) update.highlights       = patch.highlights;
    if (patch.specifications !== undefined) update.specifications   = patch.specifications;
    if (patch.brand          !== undefined) update.brand            = patch.brand;
    if (patch.warranty       !== undefined) update.warranty         = patch.warranty;
    if (patch.returnPolicy   !== undefined) update.return_policy    = patch.returnPolicy;
    await _patch('products', `id=eq.${id}`, update);
  },

  async deleteProduct(id: string): Promise<void> {
    await _delete('products', `id=eq.${id}`);
  },

  // ── Stores ─────────────────────────────────────────────────────────────────

  async createStore(data: Omit<Store, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance'>): Promise<string> {
    const row = await _postReturn<{ id: string }>('stores', {
      owner_id:         data.ownerId,
      owner_name:       data.ownerName,
      name:             data.name,
      slug:             data.slug,
      tagline:          data.tagline,
      description:      data.description ?? '',
      logo:             data.logo,
      theme_color:      data.themeColor,
      city:             data.city,
      state:            data.state,
      store_type:       data.storeType,
      status:           data.status,
      commission_rate:  data.commissionRate,
      subdomain:        data.subdomain,
      contact_email:    data.contactEmail ?? null,
      contact_phone:    data.contactPhone ?? null,
      gst_number:       data.gstNumber ?? null,
      invoice_settings: data.invoiceSettings ?? {},
    });
    const storeId = row.id;
    // Link the store back to the owner's profile so storeId is available after login
    await _patch('profiles', `id=eq.${data.ownerId}`, { store_id: storeId });
    return storeId;
  },

  async updateStore(id: string, patch: Partial<Store>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.name            !== undefined) update.name              = patch.name;
    if (patch.tagline         !== undefined) update.tagline           = patch.tagline;
    if (patch.description     !== undefined) update.description       = patch.description;
    if (patch.logo            !== undefined) update.logo              = patch.logo;
    if (patch.themeColor      !== undefined) update.theme_color       = patch.themeColor;
    if (patch.city            !== undefined) update.city              = patch.city;
    if (patch.state           !== undefined) update.state             = patch.state;
    if (patch.status          !== undefined) update.status            = patch.status;
    if (patch.commissionRate  !== undefined) update.commission_rate   = patch.commissionRate;
    if (patch.walletBalance   !== undefined) update.wallet_balance    = patch.walletBalance;
    if (patch.totalSales      !== undefined) update.total_sales       = patch.totalSales;
    if (patch.totalOrders     !== undefined) update.total_orders      = patch.totalOrders;
    if (patch.contactEmail    !== undefined) update.contact_email     = patch.contactEmail;
    if (patch.contactPhone    !== undefined) update.contact_phone     = patch.contactPhone;
    if (patch.gstNumber       !== undefined) update.gst_number        = patch.gstNumber;
    if (patch.bankAccount     !== undefined) update.bank_account      = patch.bankAccount;
    if (patch.bankIfsc        !== undefined) update.bank_ifsc         = patch.bankIfsc;
    if (patch.activatedAt     !== undefined) update.activated_at      = patch.activatedAt;
    if (patch.activatedBy     !== undefined) update.activated_by      = patch.activatedBy;
    if (patch.rejectedAt      !== undefined) update.rejected_at       = patch.rejectedAt;
    if (patch.rejectionReason !== undefined) update.rejection_reason  = patch.rejectionReason;
    if (patch.invoiceSettings !== undefined) update.invoice_settings  = patch.invoiceSettings;
    if (patch.customization   !== undefined) update.customization     = patch.customization;
    await _patch('stores', `id=eq.${id}`, update);
  },

  // ── Services ───────────────────────────────────────────────────────────────

  async createService(data: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewCount'>): Promise<string> {
    const row = await _postReturn<{ id: string }>('services', {
      provider_id:      data.providerId,
      provider_name:    data.providerName,
      store_id:         null,
      title:            data.title,
      description:      data.description,
      category:         data.category,
      subcategory:      data.subcategory ?? null,
      price:            data.price,
      price_type:       data.priceType,
      commission:       data.commission,
      delivery_time:    data.deliveryTime,
      image_color:      data.imageColor,
      image_icon:       data.imageIcon,
      thumbnail:        null,
      images:           data.images ?? [],
      status:           data.status,
      featured:         data.featured,
      available_cities: data.availableCities,
      tags:             data.tags,
      includes:         data.includes ?? [],
      process:          data.process ?? [],
      rating:           0,
      review_count:     0,
    });
    return row.id;
  },

  async updateService(id: string, patch: Partial<Service>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.title          !== undefined) update.title           = patch.title;
    if (patch.description    !== undefined) update.description     = patch.description;
    if (patch.category       !== undefined) update.category        = patch.category;
    if (patch.price          !== undefined) update.price           = patch.price;
    if (patch.priceType      !== undefined) update.price_type      = patch.priceType;
    if (patch.commission     !== undefined) update.commission      = patch.commission;
    if (patch.status         !== undefined) update.status          = patch.status;
    if (patch.featured       !== undefined) update.featured        = patch.featured;
    if (patch.availableCities !== undefined) update.available_cities = patch.availableCities;
    if (patch.tags           !== undefined) update.tags            = patch.tags;
    if (patch.includes       !== undefined) update.includes        = patch.includes;
    if (patch.process        !== undefined) update.process         = patch.process;
    if (patch.deliveryTime   !== undefined) update.delivery_time   = patch.deliveryTime;
    if (patch.rating         !== undefined) update.rating          = patch.rating;
    if (patch.reviewCount    !== undefined) update.review_count    = patch.reviewCount;
    await _patch('services', `id=eq.${id}`, update);
  },

  async deleteService(id: string): Promise<void> {
    await _delete('services', `id=eq.${id}`);
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(data: Omit<Order, 'id'>): Promise<string> {
    const orderId = 'ORD' + Date.now().toString(36).toUpperCase();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const storeId = UUID_RE.test(data.storeId ?? '') ? data.storeId : null;

    await _post('orders', {
      id:                  orderId,
      customer_id:         data.customerId,
      customer_name:       data.customerName,
      customer_email:      data.customerEmail,
      store_id:            storeId,
      store_name:          data.storeName,
      items:               data.items,
      subtotal:            data.subtotal,
      total:               data.total,
      commission_total:    data.commissionTotal,
      admin_revenue:       data.adminRevenue,
      discount:            data.discount       ?? 0,
      shipping_charge:     data.shippingCharge ?? 0,
      gst_amount:          data.gstAmount      ?? 0,
      status:              data.status,
      payment_method:      data.paymentMethod,
      payment_status:      data.paymentStatus,
      address:             data.address,
      city:                data.city,
      agent_id:            data.agentId         ?? null,
      agent_name:          data.agentName       ?? null,
      agent_code:          data.agentCode       ?? null,
      agent_commission:    data.agentCommission ?? null,
      razorpay_order_id:   null,
      razorpay_payment_id: null,
    });
    return orderId;
  },

  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status          !== undefined) update.status           = patch.status;
    if (patch.paymentStatus   !== undefined) update.payment_status   = patch.paymentStatus;
    if (patch.paymentMethod   !== undefined) update.payment_method   = patch.paymentMethod;
    if (patch.trackingNumber  !== undefined) update.tracking_number  = patch.trackingNumber;
    if (patch.courierName     !== undefined) update.courier_name     = patch.courierName;
    await _patch('orders', `id=eq.${id}`, update);
  },

  // ── Service Orders ──────────────────────────────────────────────────────────

  async createServiceOrder(data: Omit<ServiceOrder, 'id'>): Promise<string> {
    const orderId = 'SVC' + Date.now().toString(36).toUpperCase();

    await _post('service_orders', {
      id:               orderId,
      service_id:       data.serviceId,
      service_title:    data.serviceTitle,
      service_icon:     data.serviceIcon,
      service_color:    data.serviceColor,
      provider_id:      data.providerId,
      provider_name:    data.providerName,
      customer_id:      data.customerId,
      customer_name:    data.customerName,
      customer_email:   data.customerEmail,
      customer_phone:   data.customerPhone ?? null,
      amount:           data.amount,
      status:           data.status,
      payment_status:   'pending',
      scheduled_date:   data.scheduledDate,
      address:          data.address,
      city:             data.city,
      notes:            data.notes ?? null,
      agent_id:         data.agentId         ?? null,
      agent_name:       data.agentName       ?? null,
      agent_code:       data.agentCode       ?? null,
      agent_commission: data.agentCommission ?? null,
    });
    return orderId;
  },

  async updateServiceOrder(id: string, patch: Partial<ServiceOrder>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.notes  !== undefined) update.notes  = patch.notes;
    await _patch('service_orders', `id=eq.${id}`, update);
  },

  // ── Notifications ───────────────────────────────────────────────────────────

  async createNotification(userId: string, notif: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
    await _post('notifications', {
      user_id: userId,
      type:    notif.type,
      title:   notif.title,
      message: notif.message,
      link:    notif.link ?? null,
    });
  },

  async markNotificationRead(id: string): Promise<void> {
    await _patch('notifications', `id=eq.${id}`, { read: true });
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await _patch('notifications', `user_id=eq.${userId}`, { read: true });
  },

  async deleteNotification(id: string): Promise<void> {
    await _delete('notifications', `id=eq.${id}`);
  },

  // ── Homepage Config ─────────────────────────────────────────────────────────

  async updateHomepageConfig(patch: Partial<HomepageConfig>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.announcementBar       !== undefined) update.announcement_bar        = patch.announcementBar;
    if (patch.announcementBarActive !== undefined) update.announcement_bar_active = patch.announcementBarActive;
    if (patch.heroSlides            !== undefined) update.hero_slides             = patch.heroSlides;
    if (patch.miniBanners           !== undefined) update.mini_banners            = patch.miniBanners;
    if (patch.showProducts          !== undefined) update.show_products           = patch.showProducts;
    if (patch.showServices          !== undefined) update.show_services           = patch.showServices;
    if (patch.showStores            !== undefined) update.show_stores             = patch.showStores;
    if (patch.showTrustBadges       !== undefined) update.show_trust_badges       = patch.showTrustBadges;
    if (patch.showSellerCta         !== undefined) update.show_seller_cta         = patch.showSellerCta;
    if (patch.showBrandLogos        !== undefined) update.show_brand_logos        = patch.showBrandLogos;
    if (patch.brandLogos            !== undefined) update.brand_logos             = patch.brandLogos;
    if (patch.showNewsletter        !== undefined) update.show_newsletter         = patch.showNewsletter;
    if (patch.newsletterTitle       !== undefined) update.newsletter_title        = patch.newsletterTitle;
    if (patch.newsletterSubtitle    !== undefined) update.newsletter_subtitle     = patch.newsletterSubtitle;
    if (patch.showTrendingSection   !== undefined) update.show_trending_section   = patch.showTrendingSection;
    if (patch.showBestDeals         !== undefined) update.show_best_deals         = patch.showBestDeals;
    if (patch.showCollectionList    !== undefined) update.show_collection_list    = patch.showCollectionList;
    update.updated_at = new Date().toISOString();
    await _patch('homepage_config', 'id=eq.1', update);
  },

  // ── Withdrawal Requests ─────────────────────────────────────────────────────

  async createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
    const row = await _postReturn<{ id: string }>('withdrawal_requests', {
      entity_type:  data.entityType,
      entity_id:    data.entityId,
      entity_name:  data.entityName,
      owner_name:   data.ownerName,
      amount:       data.amount,
      bank_account: data.bankAccount,
      ifsc:         data.ifsc,
      status:       data.status,
      note:         data.note ?? null,
      requested_at: data.requestedAt ?? new Date().toISOString(),
      processed_at: data.processedAt ?? null,
    });
    return row.id;
  },

  async updateWithdrawalRequest(id: string, patch: Partial<WithdrawalRequest>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status      !== undefined) update.status       = patch.status;
    if (patch.note        !== undefined) update.note         = patch.note;
    if (patch.processedAt !== undefined) update.processed_at = patch.processedAt;
    await _patch('withdrawal_requests', `id=eq.${id}`, update);
  },

  // ── Agents ──────────────────────────────────────────────────────────────────

  async createAgent(agentId: string, data: Omit<Agent, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance' | 'totalEarned'>): Promise<void> {
    await _post('agents', {
      id:              agentId,
      agent_code:      data.agentCode,
      commission_rate: data.commissionRate,
      status:          data.status,
    });
  },

  async updateAgent(id: string, patch: Partial<Agent>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status         !== undefined) update.status          = patch.status;
    if (patch.commissionRate !== undefined) update.commission_rate = patch.commissionRate;
    if (patch.walletBalance  !== undefined) update.wallet_balance  = patch.walletBalance;
    if (patch.totalEarned    !== undefined) update.total_earned    = patch.totalEarned;
    if (patch.totalOrders    !== undefined) update.total_orders    = patch.totalOrders;
    if (patch.totalSales     !== undefined) update.total_sales     = patch.totalSales;
    if (patch.activatedAt    !== undefined) update.activated_at    = patch.activatedAt;
    if (patch.activatedBy    !== undefined) update.activated_by    = patch.activatedBy;
    await _patch('agents', `id=eq.${id}`, update);
  },

  // ── Wallets ──────────────────────────────────────────────────────────────────

  async creditWallet(userId: string, amount: number, description: string, referenceId?: string): Promise<void> {
    const wallets = await _get<{ id: string; balance: number; total_earned: number }>('wallets', `user_id=eq.${userId}&select=id,balance,total_earned&limit=1`);
    const wallet = wallets[0];
    if (!wallet) return;

    await _patch('wallets', `id=eq.${wallet.id}`, {
      balance:      wallet.balance + amount,
      total_earned: wallet.total_earned + amount,
    });

    await _post('wallet_transactions', {
      wallet_id:      wallet.id,
      type:           'credit',
      amount,
      description,
      reference_id:   referenceId ?? null,
      reference_type: 'order',
    });
  },

  // ── User Activities ──────────────────────────────────────────────────────────

  async trackActivity(data: Omit<UserActivity, 'id' | 'createdAt'>): Promise<void> {
    await _post('user_activities', {
      user_id:    data.userId,
      user_name:  data.userName,
      user_email: data.userEmail,
      user_role:  data.userRole,
      event:      data.event,
      page:       data.page ?? null,
      metadata:   data.metadata ?? {},
      session_id: data.sessionId ?? null,
    });
  },

  // ── Profile ──────────────────────────────────────────────────────────────────

  async updateProfile(userId: string, patch: Partial<User>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.name  !== undefined) update.name  = patch.name;
    if (patch.phone !== undefined) update.phone = patch.phone;
    if (patch.city  !== undefined) update.city  = patch.city;
    if (patch.state !== undefined) update.state = patch.state;
    await _patch('profiles', `id=eq.${userId}`, update);
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  MAPPERS  — DB row → App TypeScript type
// ════════════════════════════════════════════════════════════════════════════

function mapProfile(row: { id: string; name: string; email: string; role: User['role']; phone: string | null; city: string | null; state: string | null; avatar_url: string | null; store_id: string | null; created_at: string }): User {
  return {
    id:        row.id,
    name:      row.name,
    email:     row.email,
    role:      row.role,
    phone:     row.phone ?? undefined,
    city:      row.city  ?? undefined,
    state:     row.state ?? undefined,
    avatar:    row.avatar_url ?? undefined,
    storeId:   row.store_id ?? undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

function mapStore(row: StoreRow): Store {
  return {
    id:               row.id,
    ownerId:          row.owner_id,
    ownerName:        row.owner_name,
    name:             row.name,
    slug:             row.slug,
    tagline:          row.tagline,
    description:      row.description,
    logo:             row.logo,
    themeColor:       row.theme_color,
    city:             row.city,
    state:            row.state,
    storeType:        row.store_type,
    status:           row.status,
    commissionRate:   Number(row.commission_rate),
    walletBalance:    Number(row.wallet_balance),
    totalSales:       Number(row.total_sales),
    totalOrders:      row.total_orders,
    subdomain:        row.subdomain,
    contactEmail:     row.contact_email ?? undefined,
    contactPhone:     row.contact_phone ?? undefined,
    gstNumber:        row.gst_number    ?? undefined,
    bankAccount:      row.bank_account  ?? undefined,
    bankIfsc:         row.bank_ifsc     ?? undefined,
    customization:    (row.customization ?? {}) as StoreCustomization,
    invoiceSettings:  (row.invoice_settings ?? {}) as InvoiceSettings,
    activatedAt:      row.activated_at  ?? undefined,
    activatedBy:      row.activated_by  ?? undefined,
    rejectedAt:       row.rejected_at   ?? undefined,
    rejectionReason:  row.rejection_reason ?? undefined,
    createdAt:        row.created_at.slice(0, 10),
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id:               row.id,
    name:             row.name,
    description:      row.description,
    price:            Number(row.price),
    mrp:              Number(row.mrp),
    commission:       Number(row.commission),
    categoryId:       row.category_id,
    category:         row.category,
    brand:            row.brand   ?? undefined,
    stock:            row.stock,
    sold:             row.sold,
    imageColor:       row.image_color,
    imageIcon:        row.image_icon,
    thumbnail:        row.thumbnail ?? undefined,
    images:           row.images,
    status:           row.status,
    featured:         row.featured,
    availableCities:  row.available_cities,
    tags:             row.tags,
    highlights:       row.highlights,
    specifications:   (row.specifications as unknown) as import('../types').ProductSpec[],
    warranty:         row.warranty,
    returnPolicy:     row.return_policy,
    createdAt:        row.created_at.slice(0, 10),
  };
}

function mapService(row: ServiceRow): Service {
  return {
    id:               row.id,
    providerId:       row.provider_id,
    providerName:     row.provider_name,
    title:            row.title,
    description:      row.description,
    category:         row.category,
    subcategory:      row.subcategory ?? undefined,
    price:            Number(row.price),
    priceType:        row.price_type,
    commission:       Number(row.commission),
    deliveryTime:     row.delivery_time,
    imageColor:       row.image_color,
    imageIcon:        row.image_icon,
    thumbnail:        row.thumbnail ?? undefined,
    images:           row.images,
    status:           row.status,
    featured:         row.featured,
    availableCities:  row.available_cities,
    tags:             row.tags,
    includes:         row.includes,
    process:          (row.process as unknown) as import('../types').ServiceProcess[],
    rating:           Number(row.rating),
    reviewCount:      row.review_count,
    createdAt:        row.created_at.slice(0, 10),
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id:              row.id,
    customerId:      row.customer_id   ?? '',
    customerName:    row.customer_name,
    customerEmail:   row.customer_email,
    storeId:         row.store_id      ?? '',
    storeName:       row.store_name,
    items:           (row.items as unknown) as import('../types').OrderItem[],
    subtotal:        Number(row.subtotal),
    shippingCharge:  Number(row.shipping_charge),
    discount:        Number(row.discount),
    gstAmount:       Number(row.gst_amount),
    total:           Number(row.total),
    commissionTotal: Number(row.commission_total),
    adminRevenue:    Number(row.admin_revenue),
    status:          row.status,
    paymentMethod:   (row.payment_method ?? 'cod') as Order['paymentMethod'],
    paymentStatus:   row.payment_status,
    address:         row.address,
    city:            row.city,
    agentId:         row.agent_id         ?? undefined,
    agentName:       row.agent_name       ?? undefined,
    agentCode:       row.agent_code       ?? undefined,
    agentCommission: row.agent_commission !== null ? Number(row.agent_commission) : undefined,
    trackingNumber:  row.tracking_number  ?? undefined,
    courierName:     row.courier_name     ?? undefined,
    cancelReason:    row.cancel_reason    ?? undefined,
    createdAt:       row.created_at.slice(0, 10),
  };
}

function mapServiceOrder(row: ServiceOrderRow): ServiceOrder {
  return {
    id:              row.id,
    serviceId:       row.service_id     ?? '',
    serviceTitle:    row.service_title,
    serviceIcon:     row.service_icon,
    serviceColor:    row.service_color,
    providerId:      row.provider_id    ?? '',
    providerName:    row.provider_name,
    customerId:      row.customer_id    ?? '',
    customerName:    row.customer_name,
    customerEmail:   row.customer_email,
    customerPhone:   row.customer_phone ?? undefined,
    amount:          Number(row.amount),
    status:          row.status,
    scheduledDate:   row.scheduled_date,
    address:         row.address,
    city:            row.city,
    notes:           row.notes ?? undefined,
    agentId:         row.agent_id       ?? undefined,
    agentName:       row.agent_name     ?? undefined,
    agentCode:       row.agent_code     ?? undefined,
    agentCommission: row.agent_commission !== null ? Number(row.agent_commission) : undefined,
    createdAt:       row.created_at.slice(0, 10),
  };
}

type AgentRowWithProfile = AgentRow & {
  profiles?: {
    name: string; email: string; phone: string | null; city: string | null; state: string | null;
  } | null;
};
function mapAgent(row: AgentRowWithProfile, profile?: { name: string; email: string; phone: string | null; city: string | null; state: string | null }): Agent {
  const p = profile ?? row.profiles ?? { name: '', email: '', phone: null, city: null, state: null };
  return {
    id:             row.id,
    name:           p.name,
    email:          p.email,
    phone:          p.phone   ?? undefined,
    city:           p.city    ?? '',
    state:          p.state   ?? '',
    agentCode:      row.agent_code,
    commissionRate: Number(row.commission_rate),
    status:         row.status,
    walletBalance:  Number(row.wallet_balance),
    totalEarned:    Number(row.total_earned),
    totalOrders:    row.total_orders,
    totalSales:     Number(row.total_sales),
    activatedAt:    row.activated_at ?? undefined,
    activatedBy:    row.activated_by ?? undefined,
    createdAt:      row.created_at.slice(0, 10),
  };
}

function mapWithdrawal(row: WithdrawalRequestRow): WithdrawalRequest {
  return {
    id:           row.id,
    entityType:   row.entity_type,
    entityId:     row.entity_id,
    entityName:   row.entity_name,
    ownerName:    row.owner_name,
    amount:       Number(row.amount),
    bankAccount:  row.bank_account,
    ifsc:         row.ifsc,
    status:       row.status,
    requestedAt:  row.requested_at,
    processedAt:  row.processed_at ?? undefined,
    note:         row.note ?? undefined,
  };
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id:        row.id,
    type:      row.type,
    title:     row.title,
    message:   row.message,
    read:      row.read,
    link:      row.link ?? undefined,
    createdAt: row.created_at,
  };
}

function mapHomepageConfig(row: HomepageConfigRow): HomepageConfig {
  return {
    announcementBar:      row.announcement_bar,
    announcementBarActive: row.announcement_bar_active,
    heroSlides:           (row.hero_slides as unknown as import('../types').HeroSlide[])       ?? [],
    miniBanners:          (row.mini_banners as unknown as import('../types').MiniBanner[])     ?? [],
    showProducts:         row.show_products,
    showServices:         row.show_services,
    showStores:           row.show_stores,
    showTrustBadges:      row.show_trust_badges,
    showSellerCta:        row.show_seller_cta,
    showBrandLogos:       row.show_brand_logos,
    brandLogos:           (row.brand_logos as unknown as import('../types').BrandLogo[])       ?? [],
    showNewsletter:       row.show_newsletter,
    newsletterTitle:      row.newsletter_title,
    newsletterSubtitle:   row.newsletter_subtitle,
    showTrendingSection:  row.show_trending_section,
    showBestDeals:        row.show_best_deals,
    showCollectionList:   row.show_collection_list,
  };
}

function mapUserActivity(row: UserActivityRow): UserActivity {
  return {
    id:         row.id,
    userId:     row.user_id  ?? '',
    userName:   row.user_name,
    userEmail:  row.user_email,
    userRole:   row.user_role,
    event:      row.event as import('../types').ActivityEvent,
    page:       row.page ?? undefined,
    metadata:   (row.metadata ?? {}) as Record<string, string | number | boolean>,
    sessionId:  row.session_id ?? '',
    createdAt:  row.created_at,
  };
}

function mapCustomRole(row: CustomRoleRow): Role {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    permissions: row.permissions,
    color:       row.color,
    isSystem:    row.is_system,
    createdAt:   row.created_at,
  };
}

function mapAbandonedCart(row: AbandonedCartRow): AbandonedCart {
  return {
    id:           row.id,
    userId:       row.user_id  ?? '',
    userName:     row.user_name,
    userEmail:    row.user_email,
    cartItems:    (row.cart_items ?? []) as AbandonedCart['cartItems'],
    total:        Number(row.total),
    itemCount:    row.item_count,
    lastActivity: row.last_activity,
    recovered:    row.recovered,
    recoveredAt:  row.recovered_at ?? undefined,
  };
}
