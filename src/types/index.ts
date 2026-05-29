export type UserRole = 'admin' | 'store_owner' | 'service_provider' | 'customer' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  storeId?: string;
  phone?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  commission: number;
  categoryId: string;
  category: string;
  brand?: string;
  stock: number;
  sold: number;
  imageColor: string;
  imageIcon: string;
  thumbnail?: string;
  images?: string[];
  status: 'active' | 'draft' | 'out_of_stock';
  featured: boolean;
  availableCities: string[];
  tags?: string[];
  highlights?: string[];
  specifications?: ProductSpec[];
  warranty?: string;
  returnPolicy?: string;
  createdAt: string;
}

export interface ServiceProcess {
  step: string;
  desc: string;
}

export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  priceType: 'hourly' | 'fixed' | 'starting_from';
  commission: number;        // % commission agents earn on bookings (set by provider)
  availableCities: string[];
  imageColor: string;
  imageIcon: string;
  thumbnail?: string;
  images?: string[];
  status: 'active' | 'inactive' | 'pending_review';
  featured: boolean;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  tags: string[];
  includes?: string[];
  process?: ServiceProcess[];
  createdAt: string;
}

export interface Agent {
  id: string;            // same as user id
  name: string;
  email: string;
  phone?: string;
  city: string;
  state: string;
  agentCode: string;     // e.g. AGT001
  commissionRate: number; // fixed % set by admin (0–30)
  status: 'active' | 'pending' | 'suspended';
  totalSales: number;
  totalOrders: number;
  walletBalance: number;
  totalEarned: number;
  activatedAt?: string;
  activatedBy?: string;
  createdAt: string;
}

export interface StoreCustomization {
  bannerHeadline?: string;
  bannerSubtext?: string;
  announcement?: string;          // marquee/banner bar above products
  layoutStyle?: 'grid' | 'list' | 'magazine';
  featuredProductIds?: string[];
  showQr?: boolean;
  socialWhatsapp?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialWebsite?: string;
  accentColor?: string;           // secondary accent for cards
  showReviews?: boolean;
  customBadge?: string;           // e.g. "🏆 Top Rated Store"
}

export interface Store {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  slug: string;
  tagline: string;
  description?: string;
  logo: string;
  themeColor: string;
  city: string;
  state: string;
  totalSales: number;
  totalOrders: number;
  commissionRate: number;
  walletBalance: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  // Extended fields
  storeType: 'product' | 'service';
  subdomain: string;
  activatedAt?: string;
  activatedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstNumber?: string;
  bankAccount?: string;
  bankIfsc?: string;
  // Customization
  customization?: StoreCustomization;
  // Invoice / Tax settings
  invoiceSettings?: InvoiceSettings;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productIcon: string;
  productColor: string;
  quantity: number;
  price: number;
  commission: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  commissionTotal: number;
  adminRevenue: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'card' | 'upi' | 'wallet' | 'cod';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  address: string;
  city: string;
  agentId?: string;
  agentName?: string;
  agentCode?: string;
  agentCommission?: number;  // amount earned by agent
  trackingNumber?: string;
  courierName?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIcon: string;
  serviceColor: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  address: string;
  city: string;
  notes?: string;
  // Agent attribution
  agentId?: string;
  agentName?: string;
  agentCode?: string;
  agentCommission?: number;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  entityType: 'store' | 'service_provider' | 'agent';
  entityId: string;
  entityName: string;
  ownerName: string;
  amount: number;
  bankAccount: string;
  ifsc: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt?: string;
  note?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  commission: number;
}

export interface Notification {
  id: string;
  type: 'order' | 'commission' | 'payout' | 'store' | 'system' | 'service';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ── User Tracking & Behaviour ────────────────────────────────────────────────

export type ActivityEvent =
  | 'page_view' | 'product_view' | 'service_view' | 'store_view'
  | 'add_to_cart' | 'remove_from_cart' | 'update_cart_qty'
  | 'checkout_start' | 'checkout_complete'
  | 'search' | 'login' | 'logout' | 'register'
  | 'service_book' | 'order_placed' | 'profile_update'
  | 'invoice_download' | 'filter_apply' | 'wishlist_add';

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  event: ActivityEvent;
  page?: string;
  metadata?: Record<string, string | number | boolean>;
  sessionId: string;
  createdAt: string;
}

export interface AbandonedCart {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  cartItems: Array<{
    productId: string;
    productName: string;
    productIcon: string;
    productColor: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  itemCount: number;
  lastActivity: string;
  recovered: boolean;
  recoveredAt?: string;
}

// ── Roles & Permissions ───────────────────────────────────────────────────────

export interface Permission {
  key: string;
  label: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  isSystem: boolean;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  gradientFrom: string;
  gradientTo: string;
  badge?: string;
  imageEmoji?: string;
  isActive: boolean;
}

export interface MiniBanner {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  ctaText: string;
  link: string;
  isActive: boolean;
}

export interface BrandLogo {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
}

export interface HomepageConfig {
  announcementBar: string;
  announcementBarActive: boolean;
  heroSlides: HeroSlide[];
  miniBanners: MiniBanner[];
  showProducts: boolean;
  showServices: boolean;
  showStores: boolean;
  showTrustBadges: boolean;
  showSellerCta: boolean;
  showBrandLogos: boolean;
  brandLogos: BrandLogo[];
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterSubtitle: string;
  showTrendingSection: boolean;
  showBestDeals: boolean;
  showCollectionList: boolean;
}

export interface InvoiceSettings {
  businessName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;       // e.g. "27" for Maharashtra
  pincode?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  hsnCode?: string;         // HSN code for products
  sacCode?: string;         // SAC code for services
  gstRate?: number;         // default 18 (%)
  termsAndConditions?: string;
  signatory?: string;       // Authorized signatory name
}
