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

// Untyped alias for write operations (INSERT / UPDATE / RPC).
// The strict `Insert` type in database.types.ts requires every DB column,
// even those that have DEFAULT values.  We handle correctness via DB constraints;
// letting TypeScript check every column on every insert is overly strict here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = supabase as any;
import type {
  User, Product, Service, Store, Order, ServiceOrder, Agent,
  WithdrawalRequest, Notification, HomepageConfig, UserActivity,
  Role, AbandonedCart, InvoiceSettings, StoreCustomization,
} from '../types';

// ════════════════════════════════════════════════════════════════════════════
//  AUTH SERVICE
// ════════════════════════════════════════════════════════════════════════════

export const authService = {

  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { success: false, error: error?.message ?? 'Login failed.' };

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) return { success: false, error: 'Profile not found.' };
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
    await w.from('profiles').update({
      name:  opts.name,
      role:  opts.role,
      phone: opts.phone  ?? null,
      city:  opts.city   ?? null,
      state: opts.state  ?? null,
    }).eq('id', data.user.id);

    return { success: true, userId: data.user.id };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return profile ? mapProfile(profile) : null;
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  DATA LOADERS  — called after login to populate Zustand
// ════════════════════════════════════════════════════════════════════════════

export const dataLoaders = {

  async loadHomepageConfig(): Promise<HomepageConfig | null> {
    const { data } = await w.from('homepage_config').select('*').eq('id', 1).single();
    return data ? mapHomepageConfig(data) : null;
  },

  async loadProducts(role: User['role'], storeId?: string): Promise<Product[]> {
    let q = w.from('products').select('*').order('created_at', { ascending: false });
    if (role === 'store_owner' && storeId) {
      q = q.eq('store_id', storeId);
    } else if (role === 'customer' || role === 'agent') {
      q = q.eq('status', 'active');
    }
    const { data } = await q;
    return (data ?? []).map(mapProduct);
  },

  async loadServices(role: User['role'], providerId?: string): Promise<Service[]> {
    let q = w.from('services').select('*').order('created_at', { ascending: false });
    if (role === 'service_provider' && providerId) {
      q = q.eq('provider_id', providerId);
    } else {
      q = q.eq('status', 'active');
    }
    const { data } = await q;
    return (data ?? []).map(mapService);
  },

  async loadStores(): Promise<Store[]> {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapStore);
  },

  async loadOrders(role: User['role'], userId?: string, storeId?: string): Promise<Order[]> {
    let q = w.from('orders').select('*').order('created_at', { ascending: false });
    if (role === 'customer' && userId)    q = q.eq('customer_id', userId);
    if (role === 'store_owner' && storeId) q = q.eq('store_id', storeId);
    if (role === 'agent' && userId)       q = q.eq('agent_id', userId);
    const { data } = await q;
    return (data ?? []).map(mapOrder);
  },

  async loadServiceOrders(role: User['role'], userId?: string): Promise<ServiceOrder[]> {
    let q = w.from('service_orders').select('*').order('created_at', { ascending: false });
    if (role === 'customer' && userId)         q = q.eq('customer_id', userId);
    if (role === 'service_provider' && userId) q = q.eq('provider_id', userId);
    if (role === 'agent' && userId)            q = q.eq('agent_id',    userId);
    const { data } = await q;
    return (data ?? []).map(mapServiceOrder);
  },

  async loadNotifications(userId: string): Promise<Notification[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []).map(mapNotification);
  },

  async loadAgents(): Promise<Agent[]> {
    const { data } = await supabase
      .from('agents')
      .select('*, profiles!agents_id_fkey(name, email, phone, city, state)')
      .order('created_at', { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) =>
      mapAgent(row as AgentRow, row.profiles ?? undefined)
    );
  },

  async loadWithdrawalRequests(entityId?: string): Promise<WithdrawalRequest[]> {
    let q = w.from('withdrawal_requests').select('*').order('requested_at', { ascending: false });
    if (entityId) q = q.eq('entity_id', entityId);
    const { data } = await q;
    return (data ?? []).map(mapWithdrawal);
  },

  async loadUserActivities(): Promise<UserActivity[]> {
    const { data } = await supabase
      .from('user_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    return (data ?? []).map(mapUserActivity);
  },

  async loadAbandonedCarts(): Promise<AbandonedCart[]> {
    const { data } = await supabase
      .from('abandoned_carts')
      .select('*')
      .order('last_activity', { ascending: false });
    return (data ?? []).map(mapAbandonedCart);
  },

  async loadCustomRoles(): Promise<Role[]> {
    const { data } = await w.from('custom_roles').select('*');
    return (data ?? []).map(mapCustomRole);
  },

  async loadProviderInvoiceSettings(providerId: string): Promise<InvoiceSettings | null> {
    const { data } = await supabase
      .from('profiles')
      .select('store_id, stores!profiles_store_id_fkey(invoice_settings)')
      .eq('id', providerId)
      .single();

    if (!data) return null;
    // For service providers, invoice settings stored on their profile or linked store
    const storeData = data as unknown as { stores?: { invoice_settings: unknown } | null };
    return (storeData.stores?.invoice_settings ?? {}) as InvoiceSettings;
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  MUTATIONS  — write operations, called from Zustand after local state update
// ════════════════════════════════════════════════════════════════════════════

export const mutations = {

  // ── Products ───────────────────────────────────────────────────────────────

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'sold'> & { storeId: string }): Promise<string> {
    const { storeId, ...rest } = data;
    const { data: row, error } = await w
      .from('products')
      .insert({
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
        specifications:   (rest.specifications ?? []) as unknown as import('./database.types').Json,
        warranty:         rest.warranty ?? '',
        return_policy:    rest.returnPolicy ?? '',
      })
      .select('id')
      .single();
    if (error) throw error;
    return row!.id;
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
    if (patch.specifications !== undefined) update.specifications   = patch.specifications as unknown as import('./database.types').Json;
    if (patch.brand          !== undefined) update.brand            = patch.brand;
    if (patch.warranty       !== undefined) update.warranty         = patch.warranty;
    if (patch.returnPolicy   !== undefined) update.return_policy    = patch.returnPolicy;
    const { error } = await w.from('products').update(update).eq('id', id);
    if (error) throw error;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await w.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Stores ─────────────────────────────────────────────────────────────────

  async createStore(data: Omit<Store, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance'>): Promise<string> {
    const { data: row, error } = await w
      .from('stores')
      .insert({
        owner_id:        data.ownerId,
        owner_name:      data.ownerName,
        name:            data.name,
        slug:            data.slug,
        tagline:         data.tagline,
        description:     data.description ?? '',
        logo:            data.logo,
        theme_color:     data.themeColor,
        city:            data.city,
        state:           data.state,
        store_type:      data.storeType,
        status:          data.status,
        commission_rate: data.commissionRate,
        subdomain:       data.subdomain,
        contact_email:   data.contactEmail ?? null,
        contact_phone:   data.contactPhone ?? null,
        gst_number:      data.gstNumber ?? null,
        invoice_settings: (data.invoiceSettings ?? {}) as unknown as import('./database.types').Json,
      })
      .select('id')
      .single();
    if (error) throw error;
    const storeId = row!.id;
    // Link the store back to the owner's profile so storeId is available after login
    await w.from('profiles').update({ store_id: storeId }).eq('id', data.ownerId);
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
    if (patch.invoiceSettings !== undefined) update.invoice_settings  = patch.invoiceSettings as unknown as import('./database.types').Json;
    if (patch.customization   !== undefined) update.customization     = patch.customization as unknown as import('./database.types').Json;
    const { error } = await w.from('stores').update(update).eq('id', id);
    if (error) throw error;
  },

  // ── Services ───────────────────────────────────────────────────────────────

  async createService(data: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewCount'>): Promise<string> {
    const { data: row, error } = await w
      .from('services')
      .insert({
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
        process:          (data.process ?? []) as unknown as import('./database.types').Json,
        rating:           0,
        review_count:     0,
      })
      .select('id')
      .single();
    if (error) throw error;
    return row!.id;
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
    if (patch.process        !== undefined) update.process         = patch.process as unknown as import('./database.types').Json;
    if (patch.deliveryTime   !== undefined) update.delivery_time   = patch.deliveryTime;
    if (patch.rating         !== undefined) update.rating          = patch.rating;
    if (patch.reviewCount    !== undefined) update.review_count    = patch.reviewCount;
    const { error } = await w.from('services').update(update).eq('id', id);
    if (error) throw error;
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await w.from('services').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(data: Omit<Order, 'id'>): Promise<string> {
    // Generate order ID
    const { data: idData } = await supabase.rpc('generate_order_id');
    const orderId = (idData as unknown as string) ?? `ORD${Date.now()}`;

    const { error } = await w.from('orders').insert({
      id:               orderId,
      customer_id:      data.customerId,
      customer_name:    data.customerName,
      customer_email:   data.customerEmail,
      store_id:         data.storeId,
      store_name:       data.storeName,
      items:            data.items as unknown as import('./database.types').Json,
      subtotal:         data.subtotal,
      total:            data.total,
      commission_total: data.commissionTotal,
      admin_revenue:    data.adminRevenue,
      status:           data.status,
      payment_method:   data.paymentMethod,
      payment_status:   data.paymentStatus,
      address:          data.address,
      city:             data.city,
      agent_id:         data.agentId ?? null,
      agent_name:       data.agentName ?? null,
      agent_code:       data.agentCode ?? null,
      agent_commission: data.agentCommission ?? null,
    });
    if (error) throw error;
    return orderId;
  },

  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status          !== undefined) update.status           = patch.status;
    if (patch.paymentStatus   !== undefined) update.payment_status   = patch.paymentStatus;
    if (patch.paymentMethod   !== undefined) update.payment_method   = patch.paymentMethod;
    if (patch.trackingNumber  !== undefined) update.tracking_number  = patch.trackingNumber;
    if (patch.courierName     !== undefined) update.courier_name     = patch.courierName;
    const { error } = await w.from('orders').update(update).eq('id', id);
    if (error) throw error;
  },

  // ── Service Orders ──────────────────────────────────────────────────────────

  async createServiceOrder(data: Omit<ServiceOrder, 'id'>): Promise<string> {
    const { data: idData } = await supabase.rpc('generate_service_order_id');
    const orderId = (idData as unknown as string) ?? `SVC${Date.now()}`;

    const { error } = await w.from('service_orders').insert({
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
      scheduled_date:   data.scheduledDate,
      address:          data.address,
      city:             data.city,
      notes:            data.notes ?? null,
      agent_id:         data.agentId ?? null,
      agent_name:       data.agentName ?? null,
      agent_code:       data.agentCode ?? null,
      agent_commission: data.agentCommission ?? null,
    });
    if (error) throw error;
    return orderId;
  },

  async updateServiceOrder(id: string, patch: Partial<ServiceOrder>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status       !== undefined) update.status        = patch.status;
    if (patch.notes        !== undefined) update.notes         = patch.notes;
    const { error } = await w.from('service_orders').update(update).eq('id', id);
    if (error) throw error;
  },

  // ── Notifications ───────────────────────────────────────────────────────────

  async createNotification(userId: string, notif: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
    const { error } = await w.from('notifications').insert({
      user_id: userId,
      type:    notif.type,
      title:   notif.title,
      message: notif.message,
    });
    if (error) throw error;
  },

  async markNotificationRead(id: string): Promise<void> {
    await w.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await w.from('notifications').update({ read: true }).eq('user_id', userId);
  },

  async deleteNotification(id: string): Promise<void> {
    await w.from('notifications').delete().eq('id', id);
  },

  // ── Homepage Config ─────────────────────────────────────────────────────────

  async updateHomepageConfig(patch: Partial<HomepageConfig>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.announcementBar       !== undefined) update.announcement_bar        = patch.announcementBar;
    if (patch.announcementBarActive !== undefined) update.announcement_bar_active = patch.announcementBarActive;
    if (patch.heroSlides            !== undefined) update.hero_slides             = patch.heroSlides as unknown as import('./database.types').Json;
    if (patch.miniBanners           !== undefined) update.mini_banners            = patch.miniBanners as unknown as import('./database.types').Json;
    if (patch.showProducts          !== undefined) update.show_products           = patch.showProducts;
    if (patch.showServices          !== undefined) update.show_services           = patch.showServices;
    if (patch.showStores            !== undefined) update.show_stores             = patch.showStores;
    if (patch.showTrustBadges       !== undefined) update.show_trust_badges       = patch.showTrustBadges;
    if (patch.showSellerCta         !== undefined) update.show_seller_cta         = patch.showSellerCta;
    if (patch.showBrandLogos        !== undefined) update.show_brand_logos        = patch.showBrandLogos;
    if (patch.brandLogos            !== undefined) update.brand_logos             = patch.brandLogos as unknown as import('./database.types').Json;
    if (patch.showNewsletter        !== undefined) update.show_newsletter         = patch.showNewsletter;
    if (patch.newsletterTitle       !== undefined) update.newsletter_title        = patch.newsletterTitle;
    if (patch.newsletterSubtitle    !== undefined) update.newsletter_subtitle     = patch.newsletterSubtitle;
    if (patch.showTrendingSection   !== undefined) update.show_trending_section   = patch.showTrendingSection;
    if (patch.showBestDeals         !== undefined) update.show_best_deals         = patch.showBestDeals;
    if (patch.showCollectionList    !== undefined) update.show_collection_list    = patch.showCollectionList;
    update.updated_at = new Date().toISOString();
    await w.from('homepage_config').update(update).eq('id', 1);
  },

  // ── Withdrawal Requests ─────────────────────────────────────────────────────

  async createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
    const { data: row, error } = await w
      .from('withdrawal_requests')
      .insert({
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
      })
      .select('id')
      .single();
    if (error) throw error;
    return row!.id;
  },

  async updateWithdrawalRequest(id: string, patch: Partial<WithdrawalRequest>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status      !== undefined) update.status       = patch.status;
    if (patch.note        !== undefined) update.note         = patch.note;
    if (patch.processedAt !== undefined) update.processed_at = patch.processedAt;
    await w.from('withdrawal_requests').update(update).eq('id', id);
  },

  // ── Agents ──────────────────────────────────────────────────────────────────

  async createAgent(agentId: string, data: Omit<Agent, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance' | 'totalEarned'>): Promise<void> {
    const { error } = await w.from('agents').insert({
      id:              agentId,
      agent_code:      data.agentCode,
      commission_rate: data.commissionRate,
      status:          data.status,
    });
    if (error) throw error;
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
    await w.from('agents').update(update).eq('id', id);
  },

  // ── Wallets ──────────────────────────────────────────────────────────────────

  async creditWallet(userId: string, amount: number, description: string, referenceId?: string): Promise<void> {
    // Get wallet id
    const { data: wallet } = await w.from('wallets').select('id, balance, total_earned').eq('user_id', userId).single();
    if (!wallet) return;

    await w.from('wallets').update({
      balance:      wallet.balance + amount,
      total_earned: wallet.total_earned + amount,
    }).eq('id', wallet.id);

    await w.from('wallet_transactions').insert({
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
    await w.from('user_activities').insert({
      user_id:    data.userId,
      user_name:  data.userName,
      user_email: data.userEmail,
      user_role:  data.userRole,
      event:      data.event,
      page:       data.page ?? null,
      metadata:   (data.metadata ?? {}) as unknown as import('./database.types').Json,
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
    await w.from('profiles').update(update).eq('id', userId);
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
