import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  User, Product, Service, Store, StoreCustomization, Order, ServiceOrder,
  WithdrawalRequest, CartItem, Notification, Agent, InvoiceSettings,
  HomepageConfig, HeroSlide, UserActivity, ActivityEvent, AbandonedCart, Role,
} from '../types';
import { SYSTEM_ROLES } from '../data/permissions';
import { ADMIN_USER } from '../data/mockData';
import { dataLoaders } from '../lib/dataService';

export interface RegisteredUser extends User {
  passwordHash: string;
}

interface AppState {
  currentUser: User | null;
  registeredUsers: RegisteredUser[];

  products: Product[];
  stores: Store[];
  services: Service[];
  orders: Order[];
  serviceOrders: ServiceOrder[];
  withdrawalRequests: WithdrawalRequest[];
  notifications: Notification[];
  cart: CartItem[];
  agents: Agent[];
  providerInvoiceSettings: Record<string, InvoiceSettings>;
  homepageConfig: HomepageConfig;
  userActivities: UserActivity[];
  abandonedCarts: AbandonedCart[];
  customRoles: Role[];
  suspendedUsers: string[];   // user IDs that are suspended

  sidebarOpen: boolean;

  // Supabase integration
  supabaseReady: boolean;
  loadingData: boolean;
  setCurrentUser: (user: User | null) => void;
  loadFromSupabase: (userId: string, role: User['role'], storeId?: string | null) => Promise<void>;

  // Auth
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (user: Omit<RegisteredUser, 'id' | 'createdAt'>) => { success: boolean; error?: string; userId?: string };
  isEmailTaken: (email: string) => boolean;
  logout: () => void;

  // Agents
  addAgent: (data: Omit<Agent, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance' | 'totalEarned'> & { password: string }) => { success: boolean; error?: string };
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  activateAgent: (id: string, adminEmail: string) => void;
  suspendAgent: (id: string) => void;
  creditAgentCommission: (agentId: string, amount: number) => void;

  // Products (admin)
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'sold'>) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Stores
  createStore: (data: Omit<Store, 'id' | 'createdAt' | 'totalSales' | 'totalOrders' | 'walletBalance'>) => string;
  updateStore: (id: string, patch: Partial<Store>) => void;
  updateStoreCustomization: (storeId: string, customization: StoreCustomization) => void;
  updateUserStoreId: (userId: string, storeId: string) => void;
  activateStore: (id: string, adminEmail: string) => void;
  rejectStore: (id: string, reason: string) => void;

  // Services (provider manages, admin approves)
  addService: (service: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // Product orders
  addOrder: (order: Omit<Order, 'id'>, id?: string) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;

  // Service orders
  addServiceOrder: (order: Omit<ServiceOrder, 'id'>, id?: string) => void;
  updateServiceOrder: (id: string, patch: Partial<ServiceOrder>) => void;

  // Refresh orders from Supabase (for admin/store-owner after new order arrives)
  refreshOrders: () => Promise<void>;

  // Withdrawals
  addWithdrawalRequest: (req: Omit<WithdrawalRequest, 'id'>) => void;
  updateWithdrawalRequest: (id: string, patch: Partial<WithdrawalRequest>) => void;

  // Notifications
  addNotification: (notif: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Invoice settings
  updateProviderInvoiceSettings: (providerId: string, settings: InvoiceSettings) => void;

  // Homepage config
  updateHomepageConfig: (patch: Partial<HomepageConfig>) => void;
  addHeroSlide: (slide: Omit<HeroSlide, 'id'>) => void;
  updateHeroSlide: (id: string, patch: Partial<HeroSlide>) => void;
  deleteHeroSlide: (id: string) => void;
  reorderHeroSlides: (slides: HeroSlide[]) => void;

  // User behaviour tracking
  trackActivity: (event: ActivityEvent, metadata?: Record<string, string | number | boolean>, page?: string) => void;
  snapshotAbandonedCart: () => void;
  markCartRecovered: (id: string) => void;
  clearActivities: () => void;

  // Roles (custom)
  addCustomRole: (role: Omit<Role, 'id' | 'createdAt' | 'isSystem'>) => void;
  updateCustomRole: (id: string, patch: Partial<Role>) => void;
  deleteCustomRole: (id: string) => void;

  // Admin user management
  adminCreateUser: (data: Omit<RegisteredUser, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  adminUpdateUser: (id: string, patch: Partial<RegisteredUser>) => void;
  adminDeleteUser: (id: string) => void;
  adminToggleSuspend: (id: string) => void;

  // Cart
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  // UI
  toggleSidebar: () => void;
}

const adminSeed: RegisteredUser = {
  ...ADMIN_USER,
  passwordHash: 'admin@askindia',
};

// ── Demo seed data ───────────────────────────────────────────────────────────

const DEMO_STORE_ID = 'demo_store_001';
const DEMO_PROVIDER_ID = 'demo_u_prov_001';

const demoStoreOwner: RegisteredUser = {
  id: 'demo_u_store_001',
  name: 'Rahul Sharma',
  email: 'store@demo.com',
  role: 'store_owner',
  phone: '9876543210',
  city: 'Mumbai',
  state: 'Maharashtra',
  storeId: DEMO_STORE_ID,
  createdAt: '2024-01-10',
  passwordHash: 'Demo@1234',
};

const demoProvider: RegisteredUser = {
  id: DEMO_PROVIDER_ID,
  name: 'Priya Singh',
  email: 'provider@demo.com',
  role: 'service_provider',
  phone: '9876543211',
  city: 'Mumbai',
  state: 'Maharashtra',
  createdAt: '2024-01-12',
  passwordHash: 'Demo@1234',
};

const demoCustomer: RegisteredUser = {
  id: 'demo_u_cust_001',
  name: 'Amit Kumar',
  email: 'customer@demo.com',
  role: 'customer',
  phone: '9876543212',
  city: 'Mumbai',
  state: 'Maharashtra',
  createdAt: '2024-01-15',
  passwordHash: 'Demo@1234',
};

const demoAgent: RegisteredUser = {
  id: 'demo_u_agent_001',
  name: 'Vikram Patel',
  email: 'agent@demo.com',
  role: 'agent',
  phone: '9876543213',
  city: 'Mumbai',
  state: 'Maharashtra',
  createdAt: '2024-01-20',
  passwordHash: 'Demo@1234',
};

const demoAgentData: Agent = {
  id: 'demo_u_agent_001',
  name: 'Vikram Patel',
  email: 'agent@demo.com',
  phone: '9876543213',
  city: 'Mumbai',
  state: 'Maharashtra',
  agentCode: 'AGT001',
  commissionRate: 5,
  status: 'active',
  totalSales: 45000,
  totalOrders: 12,
  walletBalance: 2250,
  totalEarned: 2250,
  createdAt: '2024-01-20',
  activatedAt: '2024-01-21',
  activatedBy: 'admin@askindia.shop',
};

const demoStore: Store = {
  id: DEMO_STORE_ID,
  ownerId: 'demo_u_store_001',
  ownerName: 'Rahul Sharma',
  name: "Rahul's Electronics Hub",
  slug: 'rahul-electronics',
  tagline: 'Premium gadgets & tech at unbeatable prices',
  description: 'Your one-stop destination for the latest electronics, from earbuds to smart home devices.',
  logo: '🏪',
  themeColor: '#4f46e5',
  city: 'Mumbai',
  state: 'Maharashtra',
  totalSales: 184500,
  totalOrders: 47,
  commissionRate: 20,
  walletBalance: 36900,
  status: 'active',
  createdAt: '2024-01-10',
  storeType: 'product',
  subdomain: 'rahul-electronics',
  activatedAt: '2024-01-11T10:00:00.000Z',
  activatedBy: 'admin@askindia.shop',
  contactEmail: 'store@demo.com',
  contactPhone: '9876543210',
};

const demoProducts: Product[] = [
  {
    id: 'demo_p1', name: 'Wireless Bluetooth Earbuds',
    description: 'Experience premium audio quality with our flagship wireless earbuds. Featuring active noise cancellation, 30-hour total battery life with the charging case, and IPX5 water resistance. The custom-tuned drivers deliver rich bass and crystal-clear highs for an immersive listening experience.',
    price: 1299, mrp: 2499, commission: 20, categoryId: 'c1', category: 'Electronics', brand: 'SoundWave',
    stock: 50, sold: 234, imageColor: 'from-blue-400 to-indigo-600', imageIcon: '🎧',
    status: 'active', featured: true, availableCities: [], createdAt: '2024-02-01',
    tags: ['earbuds', 'bluetooth', 'wireless', 'noise cancellation', 'audio'],
    highlights: ['30-hour total battery life with case', 'Active Noise Cancellation (ANC)', 'IPX5 water & sweat resistant', 'Touch controls & voice assistant support', 'Bluetooth 5.3 with 10m range'],
    specifications: [
      { key: 'Driver Size', value: '10mm Dynamic' }, { key: 'Frequency Response', value: '20Hz – 20kHz' },
      { key: 'Battery (Buds)', value: '6 hours ANC on' }, { key: 'Battery (Case)', value: '24 hours additional' },
      { key: 'Bluetooth Version', value: '5.3' }, { key: 'Charging', value: 'USB-C + Wireless' },
      { key: 'Water Resistance', value: 'IPX5' }, { key: 'Weight', value: '5.4g per bud' },
    ],
    warranty: '1 Year Manufacturer Warranty', returnPolicy: '7-Day Easy Returns',
  },
  {
    id: 'demo_p2', name: "Men's Running Shoes",
    description: 'Built for serious runners, these shoes combine a breathable engineered mesh upper with our patented CloudCushion midsole technology. The responsive foam adapts to your stride while the rubber outsole provides excellent grip on wet and dry surfaces.',
    price: 1899, mrp: 3499, commission: 18, categoryId: 'c3', category: 'Sports & Fitness', brand: 'StridePro',
    stock: 30, sold: 89, imageColor: 'from-green-400 to-emerald-600', imageIcon: '👟',
    status: 'active', featured: false, availableCities: ['Mumbai', 'Delhi', 'Bangalore'], createdAt: '2024-02-05',
    tags: ['running shoes', 'sports', 'men', 'fitness', 'footwear'],
    highlights: ['CloudCushion responsive midsole', 'Breathable engineered mesh upper', 'Anti-slip rubber outsole', 'Reflective details for night running', 'Available in sizes 6–12 UK'],
    specifications: [
      { key: 'Upper Material', value: 'Engineered Mesh' }, { key: 'Sole', value: 'Rubber Outsole' },
      { key: 'Cushioning', value: 'CloudCushion Foam' }, { key: 'Closure', value: 'Lace-up' },
      { key: 'Drop', value: '8mm Heel-to-Toe' }, { key: 'Weight', value: '280g (Size 9 UK)' },
    ],
    warranty: '6 Months Manufacturing Defect Warranty', returnPolicy: '10-Day Returns (Unworn)',
  },
  {
    id: 'demo_p3', name: 'Organic Face Cream SPF 30',
    description: 'Formulated with 97% natural origin ingredients, this lightweight day cream provides broad-spectrum SPF 30 protection while deeply hydrating your skin. Enriched with hyaluronic acid, niacinamide, and vitamin C — it brightens, firms, and protects against daily environmental aggressors.',
    price: 549, mrp: 799, commission: 22, categoryId: 'c5', category: 'Beauty & Care', brand: 'PureSkin',
    stock: 100, sold: 412, imageColor: 'from-pink-400 to-rose-500', imageIcon: '🌸',
    status: 'active', featured: true, availableCities: [], createdAt: '2024-01-20',
    tags: ['face cream', 'spf', 'organic', 'skincare', 'moisturizer'],
    highlights: ['97% natural origin ingredients', 'SPF 30 broad-spectrum sun protection', 'Hyaluronic acid for 72hr hydration', 'Dermatologist & allergy tested', 'Suitable for all skin types including sensitive'],
    specifications: [
      { key: 'Net Weight', value: '50ml' }, { key: 'SPF', value: 'PA+++ / SPF 30' },
      { key: 'Key Ingredients', value: 'Hyaluronic Acid, Niacinamide, Vit C' }, { key: 'Skin Type', value: 'All Skin Types' },
      { key: 'Fragrance', value: 'Fragrance-Free' }, { key: 'Expiry', value: '24 months from manufacture' },
    ],
    warranty: 'N/A', returnPolicy: '15-Day Returns if Unopened',
  },
  {
    id: 'demo_p4', name: 'Yoga Mat Premium 6mm',
    description: 'Crafted from eco-friendly TPE material, this premium yoga mat offers superior grip, cushioning, and durability. The double-layer construction provides stability on all surfaces while the closed-cell texture prevents sweat absorption and bacterial growth.',
    price: 899, mrp: 1299, commission: 15, categoryId: 'c3', category: 'Sports & Fitness', brand: 'ZenFlex',
    stock: 75, sold: 156, imageColor: 'from-purple-400 to-violet-600', imageIcon: '🧘',
    status: 'active', featured: false, availableCities: [], createdAt: '2024-02-10',
    tags: ['yoga mat', 'yoga', 'fitness', 'exercise', 'pilates'],
    highlights: ['6mm TPE foam for joint protection', 'Non-slip texture on both sides', 'Closed-cell surface — easy to clean', 'Eco-friendly & non-toxic materials', 'Comes with carry strap'],
    specifications: [
      { key: 'Dimensions', value: '183cm × 61cm × 6mm' }, { key: 'Material', value: 'Eco-friendly TPE' },
      { key: 'Weight', value: '1.2kg' }, { key: 'Texture', value: 'Double-sided Non-Slip' },
      { key: 'Colour Options', value: 'Purple, Blue, Green, Black' },
    ],
    warranty: '1 Year Warranty', returnPolicy: '7-Day Returns',
  },
  {
    id: 'demo_p5', name: 'Smart LED Desk Lamp',
    description: 'Illuminate your workspace intelligently with this smart LED desk lamp. Features three colour temperature modes (warm/neutral/cool), stepless dimming via touch slider, and a built-in 10W USB-C charging pad. The flexible gooseneck arm allows 360° positioning.',
    price: 1599, mrp: 2499, commission: 18, categoryId: 'c1', category: 'Electronics', brand: 'LumiTech',
    stock: 40, sold: 78, imageColor: 'from-yellow-400 to-amber-500', imageIcon: '💡',
    status: 'active', featured: true, availableCities: [], createdAt: '2024-03-01',
    tags: ['desk lamp', 'led', 'smart lamp', 'usb charging', 'home office'],
    highlights: ['3 colour modes: Warm, Neutral, Cool', 'Stepless touch dimming (1%–100%)', '10W USB-C fast charging pad built-in', '360° flexible gooseneck arm', 'Eye-care flicker-free LED technology'],
    specifications: [
      { key: 'LED Power', value: '12W' }, { key: 'Colour Temperature', value: '2700K / 4000K / 6500K' },
      { key: 'Brightness', value: '500 Lux at 50cm' }, { key: 'USB-C Output', value: '10W Fast Charge' },
      { key: 'Arm Length', value: '40cm Gooseneck' }, { key: 'Input', value: '100–240V AC' },
    ],
    warranty: '2 Year Warranty', returnPolicy: '7-Day Returns',
  },
  {
    id: 'demo_p6', name: 'Non-stick Cookware Set (5 pcs)',
    description: 'Complete your kitchen with this professional-grade 5-piece cookware set. The hard-anodised aluminium body ensures even heat distribution while the PFOA-free non-stick coating allows healthy cooking with minimal oil. All pieces are induction, gas, and electric compatible.',
    price: 2499, mrp: 3999, commission: 15, categoryId: 'c4', category: 'Home & Living', brand: 'CookMaster',
    stock: 25, sold: 63, imageColor: 'from-orange-400 to-red-500', imageIcon: '🍳',
    status: 'active', featured: false, availableCities: [], createdAt: '2024-03-05',
    tags: ['cookware', 'non-stick', 'kitchen', 'induction', 'pots and pans'],
    highlights: ['PFOA-free non-stick coating', 'Hard-anodised aluminium body', 'Compatible with all stovetops incl. induction', 'Tempered glass lids included', 'Oven safe up to 200°C'],
    specifications: [
      { key: 'Set Includes', value: '20cm Frypan, 24cm Frypan, 20cm Saucepan, 24cm Kadhai, 28cm Grill Pan' },
      { key: 'Material', value: 'Hard-anodised Aluminium' }, { key: 'Coating', value: 'PFOA-free Non-stick' },
      { key: 'Stovetop Compatibility', value: 'Gas, Induction, Electric, Ceramic' },
      { key: 'Oven Safe', value: 'Up to 200°C' }, { key: 'Dishwasher Safe', value: 'No (Hand wash recommended)' },
    ],
    warranty: '3 Year Warranty', returnPolicy: '7-Day Returns',
  },
];

const demoServices: Service[] = [
  {
    id: 'demo_s1', providerId: DEMO_PROVIDER_ID, providerName: 'Priya Singh',
    title: 'AC Repair & Deep Service',
    description: 'Expert AC diagnosis, gas refill, coil cleaning and filter replacement for all brands.',
    category: 'home-repairs', price: 499, priceType: 'fixed', commission: 10, availableCities: [],
    imageColor: 'from-blue-400 to-cyan-600', imageIcon: '❄️',
    status: 'active', featured: true, rating: 4.7, reviewCount: 89,
    deliveryTime: 'Same day', tags: ['AC', 'Repair', 'Cooling', 'Maintenance'], createdAt: '2024-02-01',
    includes: [
      'Full diagnostic of AC unit',
      'Gas pressure check & refill if needed',
      'Filter cleaning & replacement',
      'Coil & condenser cleaning',
      'Post-service cooling performance test',
    ],
    process: [
      { step: 'Booking Confirmed', desc: 'You receive a booking confirmation with technician details' },
      { step: 'Technician Arrives', desc: 'Certified technician arrives at your location on scheduled time' },
      { step: 'Diagnosis', desc: 'Full diagnostic of the AC unit to identify issues' },
      { step: 'Service & Repair', desc: 'Complete service including cleaning and gas refill if needed' },
      { step: 'Quality Check', desc: 'Post-service cooling test and your sign-off' },
    ],
  },
  {
    id: 'demo_s2', providerId: DEMO_PROVIDER_ID, providerName: 'Priya Singh',
    title: 'Home Deep Cleaning',
    description: 'Complete home sanitisation including kitchen, bathrooms, windows and upholstery.',
    category: 'cleaning', price: 999, priceType: 'starting_from', commission: 8, availableCities: ['Mumbai', 'Pune', 'Thane'],
    imageColor: 'from-emerald-400 to-teal-600', imageIcon: '🧹',
    status: 'active', featured: false, rating: 4.5, reviewCount: 134,
    deliveryTime: '3-4 hrs', tags: ['Cleaning', 'Sanitise', 'Home', 'Hygiene'], createdAt: '2024-02-10',
    includes: [
      'Kitchen deep clean (counters, stovetop, cabinets exterior)',
      'Bathroom scrub & sanitisation',
      'Window glass cleaning (interior)',
      'Floor mopping & vacuuming',
      'Sofa and upholstery vacuuming',
    ],
    process: [
      { step: 'Pre-Clean Survey', desc: 'Team assesses the property size and notes special requirements' },
      { step: 'Kitchen & Bathrooms', desc: 'Deep clean and sanitise the highest-use areas first' },
      { step: 'Living & Bedrooms', desc: 'Vacuum, mop, and wipe down all surfaces' },
      { step: 'Final Walkthrough', desc: 'Quality check with you to ensure complete satisfaction' },
    ],
  },
  {
    id: 'demo_s3', providerId: DEMO_PROVIDER_ID, providerName: 'Priya Singh',
    title: 'Maths & Science Tutoring (Class 8-12)',
    description: 'Experienced IIT graduate offering personalised coaching for CBSE/ICSE students.',
    category: 'tutoring', price: 600, priceType: 'hourly', commission: 12, availableCities: [],
    imageColor: 'from-violet-400 to-purple-600', imageIcon: '📚',
    status: 'active', featured: false, rating: 4.8, reviewCount: 56,
    deliveryTime: 'Flexible', tags: ['Tutor', 'Maths', 'Science', 'CBSE'], createdAt: '2024-02-15',
    includes: [
      'Personalised learning plan',
      'Concept explanation with real examples',
      'Practice problems & worksheets',
      'Weekly progress reports',
      'Exam strategy coaching',
    ],
    process: [
      { step: 'Assessment Session', desc: 'First session to evaluate current level and set goals' },
      { step: 'Customised Plan', desc: 'Tutor creates a chapter-wise study plan' },
      { step: 'Weekly Sessions', desc: 'Regular sessions covering syllabus and problem solving' },
      { step: 'Mock Tests', desc: 'Regular mock tests to track improvement' },
    ],
  },
  {
    id: 'demo_s4', providerId: DEMO_PROVIDER_ID, providerName: 'Priya Singh',
    title: 'Bridal Makeup & Hairstyling',
    description: 'Premium bridal packages with HD makeup, draping, and hair styling for the big day.',
    category: 'beauty-salon', price: 4500, priceType: 'starting_from', commission: 7, availableCities: ['Mumbai', 'Navi Mumbai'],
    imageColor: 'from-pink-400 to-rose-600', imageIcon: '💄',
    status: 'active', featured: true, rating: 4.9, reviewCount: 203,
    deliveryTime: '3-5 hrs', tags: ['Bridal', 'Makeup', 'Wedding', 'Hair'], createdAt: '2024-01-25',
    includes: [
      'Consultation & skin prep',
      'HD airbrush foundation',
      'Eye makeup & contouring',
      'Hairstyling (updo or open)',
      'Saree / lehenga draping',
      'Touch-up kit provided',
    ],
    process: [
      { step: 'Pre-Wedding Consultation', desc: 'Discuss look, references, and skin type 1 week before' },
      { step: 'Trial Session', desc: 'Optional trial run of the full bridal look' },
      { step: 'Wedding Day Prep', desc: 'Arrive 3 hours before ceremony for full glam' },
      { step: 'Final Touches', desc: 'Setting spray, accessories check, and photo-ready finish' },
    ],
  },
];

// ── Session ID helper ────────────────────────────────────────────────────────
const getOrCreateSessionId = (): string => {
  let id = sessionStorage.getItem('ai_session');
  if (!id) { id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`; sessionStorage.setItem('ai_session', id); }
  return id;
};

// ── Demo tracking seed data ──────────────────────────────────────────────────
const now = Date.now();
const DAY = 86400000;

const mkAct = (
  id: string, userId: string, userName: string, userEmail: string, userRole: string,
  event: ActivityEvent, page: string, metadata: Record<string, string | number | boolean>, hoursAgo: number
): UserActivity => ({
  id, userId, userName, userEmail, userRole, event, page, metadata,
  sessionId: `sess_demo_${Math.floor(hoursAgo / 8)}`,
  createdAt: new Date(now - hoursAgo * 3600000).toISOString(),
});

const demoActivities: UserActivity[] = [
  mkAct('act1', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'login', '/login', { method: 'email' }, 2),
  mkAct('act2', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'page_view', '/shop', {}, 2),
  mkAct('act3', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'search', '/shop', { query: 'bluetooth earbuds' }, 2),
  mkAct('act4', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'product_view', '/shop/product/demo_p1', { productId: 'demo_p1', productName: 'Wireless Bluetooth Earbuds' }, 1.8),
  mkAct('act5', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'add_to_cart', '/shop/product/demo_p1', { productId: 'demo_p1', productName: 'Wireless Bluetooth Earbuds', price: 1299 }, 1.7),
  mkAct('act6', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'product_view', '/shop/product/demo_p3', { productId: 'demo_p3', productName: 'Organic Face Cream SPF 30' }, 1.5),
  mkAct('act7', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'checkout_start', '/shop/checkout', {}, 1.2),
  mkAct('act8', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'checkout_complete', '/shop/checkout', { orderId: 'ord_demo', total: 1299 }, 1),
  mkAct('act9', 'demo_u_store_001', 'Rahul Sharma', 'store@demo.com', 'store_owner', 'login', '/login', { method: 'email' }, 5),
  mkAct('act10', 'demo_u_store_001', 'Rahul Sharma', 'store@demo.com', 'store_owner', 'page_view', '/store', {}, 5),
  mkAct('act11', 'demo_u_store_001', 'Rahul Sharma', 'store@demo.com', 'store_owner', 'profile_update', '/store/profile', { section: 'invoice' }, 4.5),
  mkAct('act12', 'demo_u_prov_001', 'Priya Singh', 'provider@demo.com', 'service_provider', 'login', '/login', { method: 'email' }, 8),
  mkAct('act13', 'demo_u_prov_001', 'Priya Singh', 'provider@demo.com', 'service_provider', 'page_view', '/service-provider', {}, 8),
  mkAct('act14', 'demo_u_prov_001', 'Priya Singh', 'provider@demo.com', 'service_provider', 'service_book', '/service-provider/orders', { serviceId: 'demo_s1', amount: 499 }, 7),
  mkAct('act15', 'u_visitor_1', 'Guest User', 'guest1@example.com', 'customer', 'page_view', '/', {}, 12),
  mkAct('act16', 'u_visitor_1', 'Guest User', 'guest1@example.com', 'customer', 'search', '/', { query: 'yoga mat' }, 11.8),
  mkAct('act17', 'u_visitor_1', 'Guest User', 'guest1@example.com', 'customer', 'product_view', '/shop/product/demo_p4', { productId: 'demo_p4', productName: 'Yoga Mat Premium 6mm' }, 11.5),
  mkAct('act18', 'u_visitor_2', 'Neha Patel', 'neha@example.com', 'customer', 'login', '/login', { method: 'email' }, 24),
  mkAct('act19', 'u_visitor_2', 'Neha Patel', 'neha@example.com', 'customer', 'page_view', '/shop', {}, 24),
  mkAct('act20', 'u_visitor_2', 'Neha Patel', 'neha@example.com', 'customer', 'service_view', '/shop/service/demo_s4', { serviceId: 'demo_s4', serviceName: 'Bridal Makeup & Hairstyling' }, 23.5),
  mkAct('act21', 'u_visitor_2', 'Neha Patel', 'neha@example.com', 'customer', 'add_to_cart', '/shop/product/demo_p3', { productId: 'demo_p3', productName: 'Organic Face Cream', price: 549 }, 23),
  mkAct('act22', 'u_visitor_2', 'Neha Patel', 'neha@example.com', 'customer', 'add_to_cart', '/shop/product/demo_p2', { productId: 'demo_p2', productName: "Men's Running Shoes", price: 1899 }, 22.8),
  mkAct('act23', 'u_visitor_3', 'Ravi Gupta', 'ravi@example.com', 'customer', 'search', '/shop', { query: 'desk lamp' }, 36),
  mkAct('act24', 'u_visitor_3', 'Ravi Gupta', 'ravi@example.com', 'customer', 'product_view', '/shop/product/demo_p5', { productId: 'demo_p5', productName: 'Smart LED Desk Lamp' }, 35.5),
  mkAct('act25', 'u_visitor_3', 'Ravi Gupta', 'ravi@example.com', 'customer', 'add_to_cart', '/shop/product/demo_p5', { productId: 'demo_p5', productName: 'Smart LED Desk Lamp', price: 1599 }, 35),
  mkAct('act26', 'u_visitor_3', 'Ravi Gupta', 'ravi@example.com', 'customer', 'checkout_start', '/shop/checkout', {}, 34.8),
  mkAct('act27', 'demo_u_agent_001', 'Vikram Patel', 'agent@demo.com', 'agent', 'login', '/login', { method: 'email' }, 48),
  mkAct('act28', 'demo_u_agent_001', 'Vikram Patel', 'agent@demo.com', 'agent', 'page_view', '/agent', {}, 48),
  mkAct('act29', 'demo_u_agent_001', 'Vikram Patel', 'agent@demo.com', 'agent', 'product_view', '/agent/products', { productId: 'demo_p1', productName: 'Wireless Bluetooth Earbuds' }, 47),
  mkAct('act30', 'u_visitor_4', 'Sunita Verma', 'sunita@example.com', 'customer', 'register', '/register/customer', { role: 'customer' }, 72),
  mkAct('act31', 'u_visitor_4', 'Sunita Verma', 'sunita@example.com', 'customer', 'search', '/shop', { query: 'cookware set' }, 71.5),
  mkAct('act32', 'u_visitor_4', 'Sunita Verma', 'sunita@example.com', 'customer', 'product_view', '/shop/product/demo_p6', { productId: 'demo_p6', productName: 'Non-stick Cookware Set' }, 71),
  mkAct('act33', 'u_visitor_4', 'Sunita Verma', 'sunita@example.com', 'customer', 'add_to_cart', '/shop/product/demo_p6', { productId: 'demo_p6', productName: 'Non-stick Cookware Set', price: 2499 }, 70.5),
  mkAct('act34', 'u_visitor_4', 'Sunita Verma', 'sunita@example.com', 'customer', 'checkout_complete', '/shop/checkout', { total: 2499 }, 70),
  mkAct('act35', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'page_view', '/shop', {}, 96),
  mkAct('act36', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'filter_apply', '/shop', { filter: 'city', value: 'Mumbai' }, 95.8),
  mkAct('act37', 'demo_u_cust_001', 'Amit Kumar', 'customer@demo.com', 'customer', 'store_view', '/shop/store/rahul-electronics', { storeId: 'demo_store_001', storeName: "Rahul's Electronics Hub" }, 95),
  mkAct('act38', 'u_visitor_5', 'Mohan Rao', 'mohan@example.com', 'customer', 'page_view', '/', {}, 120),
  mkAct('act39', 'u_visitor_5', 'Mohan Rao', 'mohan@example.com', 'customer', 'service_view', '/shop/service/demo_s1', { serviceId: 'demo_s1', serviceName: 'AC Repair & Deep Service' }, 119),
  mkAct('act40', 'u_visitor_5', 'Mohan Rao', 'mohan@example.com', 'customer', 'service_view', '/shop/service/demo_s2', { serviceId: 'demo_s2', serviceName: 'Home Deep Cleaning' }, 118),
];

const demoAbandonedCarts: AbandonedCart[] = [
  {
    id: 'ac_1',
    userId: 'u_visitor_2',
    userName: 'Neha Patel',
    userEmail: 'neha@example.com',
    cartItems: [
      { productId: 'demo_p3', productName: 'Organic Face Cream SPF 30', productIcon: '🌸', productColor: 'from-pink-400 to-rose-500', quantity: 1, price: 549 },
      { productId: 'demo_p2', productName: "Men's Running Shoes", productIcon: '👟', productColor: 'from-green-400 to-emerald-600', quantity: 1, price: 1899 },
    ],
    total: 2448,
    itemCount: 2,
    lastActivity: new Date(now - 22.8 * 3600000).toISOString(),
    recovered: false,
  },
  {
    id: 'ac_2',
    userId: 'u_visitor_3',
    userName: 'Ravi Gupta',
    userEmail: 'ravi@example.com',
    cartItems: [
      { productId: 'demo_p5', productName: 'Smart LED Desk Lamp', productIcon: '💡', productColor: 'from-yellow-400 to-amber-500', quantity: 1, price: 1599 },
    ],
    total: 1599,
    itemCount: 1,
    lastActivity: new Date(now - 34.8 * 3600000).toISOString(),
    recovered: false,
  },
  {
    id: 'ac_3',
    userId: 'u_visitor_6',
    userName: 'Deepa Nair',
    userEmail: 'deepa@example.com',
    cartItems: [
      { productId: 'demo_p1', productName: 'Wireless Bluetooth Earbuds', productIcon: '🎧', productColor: 'from-blue-400 to-indigo-600', quantity: 2, price: 1299 },
    ],
    total: 2598,
    itemCount: 2,
    lastActivity: new Date(now - 3 * DAY / 3600000 * 3600000).toISOString(),
    recovered: true,
    recoveredAt: new Date(now - 2 * DAY).toISOString(),
  },
  {
    id: 'ac_4',
    userId: 'u_visitor_7',
    userName: 'Karan Mehta',
    userEmail: 'karan@example.com',
    cartItems: [
      { productId: 'demo_p6', productName: 'Non-stick Cookware Set', productIcon: '🍳', productColor: 'from-orange-400 to-red-500', quantity: 1, price: 2499 },
      { productId: 'demo_p4', productName: 'Yoga Mat Premium 6mm', productIcon: '🧘', productColor: 'from-purple-400 to-violet-600', quantity: 1, price: 899 },
    ],
    total: 3398,
    itemCount: 2,
    lastActivity: new Date(now - 5 * DAY).toISOString(),
    recovered: false,
  },
  {
    id: 'ac_5',
    userId: 'demo_u_cust_001',
    userName: 'Amit Kumar',
    userEmail: 'customer@demo.com',
    cartItems: [
      { productId: 'demo_p1', productName: 'Wireless Bluetooth Earbuds', productIcon: '🎧', productColor: 'from-blue-400 to-indigo-600', quantity: 1, price: 1299 },
    ],
    total: 1299,
    itemCount: 1,
    lastActivity: new Date(now - 96 * 3600000).toISOString(),
    recovered: true,
    recoveredAt: new Date(now - 94 * 3600000).toISOString(),
  },
];

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide_1',
    title: 'Products & Services,\nAll in One Place',
    subtitle: 'Discover verified stores, book local services — tailored to your city.',
    ctaText: 'Shop Now',
    ctaLink: '/register/customer',
    secondaryCtaText: 'Open a Store',
    secondaryCtaLink: '/register/store-owner',
    gradientFrom: '#1e1b4b',
    gradientTo: '#4338ca',
    badge: '✨ India\'s Unified Marketplace',
    imageEmoji: '🛍️',
    isActive: true,
  },
  {
    id: 'slide_2',
    title: 'Book Trusted\nLocal Services',
    subtitle: 'AC repair, home cleaning, tutoring & more — all with verified providers.',
    ctaText: 'Book a Service',
    ctaLink: '/register/customer',
    secondaryCtaText: 'List Your Service',
    secondaryCtaLink: '/register/service-provider',
    gradientFrom: '#134e4a',
    gradientTo: '#0891b2',
    badge: '🔧 500+ Services Available',
    imageEmoji: '🏠',
    isActive: true,
  },
  {
    id: 'slide_3',
    title: 'Launch Your\nOnline Store Today',
    subtitle: 'Set up a branded storefront in minutes and reach customers across India.',
    ctaText: 'Open Free Store',
    ctaLink: '/register/store-owner',
    secondaryCtaText: 'Learn More',
    secondaryCtaLink: '/register/store-owner',
    gradientFrom: '#7c2d12',
    gradientTo: '#ea580c',
    badge: '🚀 Free to Start',
    imageEmoji: '🏪',
    isActive: true,
  },
];

const DEFAULT_MINI_BANNERS = [
  { id: 'mb_1', title: 'Top Smartphones', subtitle: 'Latest models, best prices', emoji: '📱', gradientFrom: '#ea580c', gradientTo: '#f97316', ctaText: 'Shop Now', link: '/shop', isActive: true },
  { id: 'mb_2', title: 'Premium Audio', subtitle: 'Earbuds, headphones & speakers', emoji: '🎧', gradientFrom: '#7c3aed', gradientTo: '#a855f7', ctaText: 'Explore', link: '/shop', isActive: true },
  { id: 'mb_3', title: 'Smart Cameras', subtitle: 'Capture every moment', emoji: '📷', gradientFrom: '#0369a1', gradientTo: '#0ea5e9', ctaText: 'View Deals', link: '/shop', isActive: true },
];

const DEFAULT_BRAND_LOGOS = [
  { id: 'bl_1', name: 'Samsung', emoji: '🌀', isActive: true },
  { id: 'bl_2', name: 'Apple', emoji: '🍎', isActive: true },
  { id: 'bl_3', name: 'Sony', emoji: '🎵', isActive: true },
  { id: 'bl_4', name: 'OnePlus', emoji: '⚡', isActive: true },
  { id: 'bl_5', name: 'boAt', emoji: '🎶', isActive: true },
  { id: 'bl_6', name: 'LG', emoji: '📺', isActive: true },
  { id: 'bl_7', name: 'Canon', emoji: '📷', isActive: true },
  { id: 'bl_8', name: 'Realme', emoji: '🔋', isActive: true },
];

const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  announcementBar: '🔥 Welcome to AskIndia — India\'s trusted marketplace for products & services!',
  announcementBarActive: true,
  heroSlides: DEFAULT_HERO_SLIDES,
  miniBanners: DEFAULT_MINI_BANNERS,
  showProducts: true,
  showServices: true,
  showStores: true,
  showTrustBadges: true,
  showSellerCta: true,
  showBrandLogos: true,
  brandLogos: DEFAULT_BRAND_LOGOS,
  showNewsletter: true,
  newsletterTitle: 'Get 20% Off Your First Order',
  newsletterSubtitle: 'Subscribe for exclusive deals, new arrivals & festive offers',
  showTrendingSection: true,
  showBestDeals: true,
  showCollectionList: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      registeredUsers: [adminSeed, demoStoreOwner, demoProvider, demoCustomer, demoAgent],
      products: demoProducts,
      stores: [demoStore],
      services: demoServices,
      orders: [],
      serviceOrders: [],
      withdrawalRequests: [],
      notifications: [],
      cart: [],
      agents: [demoAgentData],
      providerInvoiceSettings: {},
      homepageConfig: DEFAULT_HOMEPAGE_CONFIG,
      userActivities: demoActivities,
      abandonedCarts: demoAbandonedCarts,
      customRoles: [],
      suspendedUsers: [],
      sidebarOpen: true,

      // Supabase state — set to true immediately if running in mock mode
      supabaseReady: false,
      loadingData: false,

      // ── Auth ────────────────────────────────────────────────────────────────

      isEmailTaken: (email) => {
        const { registeredUsers } = get();
        return registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
      },

      login: (email, password) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { success: false, error: 'No account found with this email address.' };
        if (user.passwordHash !== password) return { success: false, error: 'Incorrect password. Please try again.' };
        set({ currentUser: user });
        return { success: true };
      },

      register: (userData) => {
        const { registeredUsers, isEmailTaken } = get();
        if (isEmailTaken(userData.email)) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        const newUser: RegisteredUser = {
          ...userData,
          id: `u_${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set({ registeredUsers: [...registeredUsers, newUser], currentUser: newUser });
        return { success: true, userId: newUser.id };
      },

      logout: () => set({ currentUser: null, cart: [] }),

      // ── Supabase integration ─────────────────────────────────────────────────

      setCurrentUser: (user) => set({ currentUser: user }),

      loadFromSupabase: async (userId, role, storeId) => {
        set({ loadingData: true });
        try {
          const [
            homepageRes, productsRes, servicesRes, storesRes,
            ordersRes, serviceOrdersRes, notificationsRes, agentsRes,
            withdrawalsRes, activitiesRes, abandonedCartsRes, customRolesRes,
          ] = await Promise.allSettled([
            dataLoaders.loadHomepageConfig(),
            dataLoaders.loadProducts(role, storeId ?? undefined),
            dataLoaders.loadServices(role, role === 'service_provider' ? userId : undefined),
            dataLoaders.loadStores(),
            dataLoaders.loadOrders(role, userId, storeId ?? undefined),
            dataLoaders.loadServiceOrders(role, userId),
            dataLoaders.loadNotifications(userId),
            dataLoaders.loadAgents(),
            dataLoaders.loadWithdrawalRequests(role !== 'admin' ? userId : undefined),
            dataLoaders.loadUserActivities(),
            dataLoaders.loadAbandonedCarts(),
            dataLoaders.loadCustomRoles(),
          ]);

          // Only overwrite state slices that loaded successfully.
          // Failed slices keep their existing (demo seed) values.
          const patch: Partial<AppState> = { loadingData: false, supabaseReady: true };
          if (homepageRes.status === 'fulfilled' && homepageRes.value) patch.homepageConfig = homepageRes.value;
          if (productsRes.status === 'fulfilled')     patch.products           = productsRes.value;
          if (servicesRes.status === 'fulfilled')     patch.services           = servicesRes.value;
          if (storesRes.status === 'fulfilled')       patch.stores             = storesRes.value;
          if (ordersRes.status === 'fulfilled')       patch.orders             = ordersRes.value;
          if (serviceOrdersRes.status === 'fulfilled') patch.serviceOrders     = serviceOrdersRes.value;
          if (notificationsRes.status === 'fulfilled') patch.notifications     = notificationsRes.value;
          if (agentsRes.status === 'fulfilled')        patch.agents            = agentsRes.value;
          if (withdrawalsRes.status === 'fulfilled')   patch.withdrawalRequests = withdrawalsRes.value;
          if (activitiesRes.status === 'fulfilled')    patch.userActivities    = activitiesRes.value;
          if (abandonedCartsRes.status === 'fulfilled') patch.abandonedCarts   = abandonedCartsRes.value;
          if (customRolesRes.status === 'fulfilled')   patch.customRoles       = customRolesRes.value;

          set(patch);
        } catch {
          set({ loadingData: false, supabaseReady: true });
        }
      },

      // Re-fetch orders + service orders for the current user (called by realtime hook)
      refreshOrders: async () => {
        const { currentUser } = get();
        if (!currentUser) return;
        const [ordersRes, svcOrdersRes] = await Promise.allSettled([
          dataLoaders.loadOrders(currentUser.role, currentUser.id, currentUser.storeId),
          dataLoaders.loadServiceOrders(currentUser.role, currentUser.id),
        ]);
        const patch: Partial<AppState> = {};
        if (ordersRes.status === 'fulfilled')    patch.orders       = ordersRes.value;
        if (svcOrdersRes.status === 'fulfilled') patch.serviceOrders = svcOrdersRes.value;
        if (Object.keys(patch).length) set(patch);
      },

      // ── Agents ──────────────────────────────────────────────────────────────

      addAgent: ({ password, ...agentData }) => {
        const { registeredUsers, agents, isEmailTaken } = get();
        if (isEmailTaken(agentData.email)) {
          return { success: false, error: 'Email already exists' };
        }
        const id = `u_agent_${Date.now()}`;
        const agentCode = `AGT${String(agents.length + 1).padStart(3, '0')}`;
        const newAgent: Agent = {
          ...agentData,
          id,
          agentCode,
          status: 'pending',
          totalSales: 0,
          totalOrders: 0,
          walletBalance: 0,
          totalEarned: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        const newUser: RegisteredUser = {
          id,
          name: agentData.name,
          email: agentData.email,
          role: 'agent',
          phone: agentData.phone,
          city: agentData.city,
          state: agentData.state,
          createdAt: new Date().toISOString().slice(0, 10),
          passwordHash: password,
        };
        set(s => ({
          agents: [...s.agents, newAgent],
          registeredUsers: [...registeredUsers, newUser],
        }));
        return { success: true };
      },

      updateAgent: (id, patch) =>
        set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...patch } : a) })),

      activateAgent: (id, adminEmail) =>
        set(s => ({
          agents: s.agents.map(a =>
            a.id === id
              ? { ...a, status: 'active' as const, activatedAt: new Date().toISOString(), activatedBy: adminEmail }
              : a
          ),
        })),

      suspendAgent: (id) =>
        set(s => ({
          agents: s.agents.map(a =>
            a.id === id ? { ...a, status: 'suspended' as const } : a
          ),
        })),

      creditAgentCommission: (agentId, amount) =>
        set(s => ({
          agents: s.agents.map(a =>
            a.id === agentId
              ? { ...a, walletBalance: a.walletBalance + amount, totalEarned: a.totalEarned + amount }
              : a
          ),
        })),

      // ── Products ────────────────────────────────────────────────────────────

      addProduct: (product) => {
        const newProduct: Product = {
          ...product,
          id: `p_${Date.now()}`,
          sold: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ products: [newProduct, ...s.products] }));
      },

      updateProduct: (id, patch) =>
        set(s => ({ products: s.products.map(p => p.id === id ? { ...p, ...patch } : p) })),

      deleteProduct: (id) =>
        set(s => ({ products: s.products.filter(p => p.id !== id) })),

      // ── Stores ──────────────────────────────────────────────────────────────

      createStore: (data) => {
        const id = `s_${Date.now()}`;
        const newStore: Store = {
          ...data,
          id,
          totalSales: 0,
          totalOrders: 0,
          walletBalance: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ stores: [...s.stores, newStore] }));
        return id;
      },

      updateStore: (id, patch) =>
        set(s => ({ stores: s.stores.map(st => st.id === id ? { ...st, ...patch } : st) })),

      updateStoreCustomization: (storeId, customization) =>
        set(s => ({
          stores: s.stores.map(st =>
            st.id === storeId
              ? { ...st, customization: { ...st.customization, ...customization } }
              : st
          ),
        })),

      updateUserStoreId: (userId, storeId) => {
        set(s => ({
          registeredUsers: s.registeredUsers.map(u =>
            u.id === userId ? { ...u, storeId } : u
          ),
          currentUser: s.currentUser?.id === userId
            ? { ...s.currentUser, storeId }
            : s.currentUser,
        }));
      },

      activateStore: (id, adminEmail) =>
        set(s => ({
          stores: s.stores.map(st =>
            st.id === id
              ? { ...st, status: 'active' as const, activatedAt: new Date().toISOString(), activatedBy: adminEmail }
              : st
          ),
        })),

      rejectStore: (id, reason) =>
        set(s => ({
          stores: s.stores.map(st =>
            st.id === id
              ? { ...st, status: 'suspended' as const, rejectedAt: new Date().toISOString(), rejectionReason: reason }
              : st
          ),
        })),

      // ── Services ────────────────────────────────────────────────────────────

      addService: (service) => {
        const newService: Service = {
          ...service,
          id: `svc_${Date.now()}`,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ services: [newService, ...s.services] }));
      },

      updateService: (id, patch) =>
        set(s => ({ services: s.services.map(svc => svc.id === id ? { ...svc, ...patch } : svc) })),

      deleteService: (id) =>
        set(s => ({ services: s.services.filter(svc => svc.id !== id) })),

      // ── Product Orders ───────────────────────────────────────────────────────

      addOrder: (order, id) => {
        const newOrder: Order = { ...order, id: id ?? `ord_${Date.now()}` };
        set(s => {
          // Deduplicate: don't add if already present (realtime may deliver it too)
          if (s.orders.some(o => o.id === newOrder.id)) return s;
          const agents = order.agentId
            ? s.agents.map(a =>
                a.id === order.agentId
                  ? {
                      ...a,
                      walletBalance: a.walletBalance + (order.agentCommission ?? 0),
                      totalEarned: a.totalEarned + (order.agentCommission ?? 0),
                      totalOrders: a.totalOrders + 1,
                      totalSales: a.totalSales + order.total,
                    }
                  : a
              )
            : s.agents;
          return { orders: [newOrder, ...s.orders], agents };
        });
      },

      updateOrder: (id, patch) => {
        set(s => {
          const orders = s.orders.map(o => o.id === id ? { ...o, ...patch } : o);
          const updatedOrder = orders.find(o => o.id === id);
          // Credit store wallet on delivery
          if (patch.status === 'delivered' && updatedOrder) {
            const stores = s.stores.map(st =>
              st.id === updatedOrder.storeId
                ? {
                    ...st,
                    walletBalance: st.walletBalance + updatedOrder.commissionTotal,
                    totalSales: st.totalSales + updatedOrder.total,
                    totalOrders: st.totalOrders + 1,
                  }
                : st
            );
            return { orders, stores };
          }
          return { orders };
        });
      },

      // ── Service Orders ───────────────────────────────────────────────────────

      addServiceOrder: (order, id) => {
        const newOrder: ServiceOrder = { ...order, id: id ?? `so_${Date.now()}` };
        set(s => {
          // Deduplicate: don't add if already present (realtime may deliver it too)
          if (s.serviceOrders.some(o => o.id === newOrder.id)) return s;
          // Credit agent commission if booking placed by an agent
          const agents = order.agentId
            ? s.agents.map(a =>
                a.id === order.agentId
                  ? {
                      ...a,
                      walletBalance: a.walletBalance + (order.agentCommission ?? 0),
                      totalEarned: a.totalEarned + (order.agentCommission ?? 0),
                      totalOrders: a.totalOrders + 1,
                      totalSales: a.totalSales + order.amount,
                    }
                  : a
              )
            : s.agents;
          return { serviceOrders: [newOrder, ...s.serviceOrders], agents };
        });
      },

      updateServiceOrder: (id, patch) =>
        set(s => ({ serviceOrders: s.serviceOrders.map(o => o.id === id ? { ...o, ...patch } : o) })),

      // ── Withdrawals ──────────────────────────────────────────────────────────

      addWithdrawalRequest: (req) => {
        const newReq: WithdrawalRequest = { ...req, id: `wr_${Date.now()}` };
        set(s => ({ withdrawalRequests: [newReq, ...s.withdrawalRequests] }));
      },

      updateWithdrawalRequest: (id, patch) =>
        set(s => ({
          withdrawalRequests: s.withdrawalRequests.map(r => r.id === id ? { ...r, ...patch } : r),
        })),

      // ── Notifications ────────────────────────────────────────────────────────

      addNotification: (notif) => {
        const newNotif: Notification = {
          ...notif,
          id: `n_${Date.now()}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ notifications: [newNotif, ...s.notifications] }));
      },

      markNotificationRead: (id) =>
        set(s => ({
          notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        })),

      markAllNotificationsRead: () =>
        set(s => ({
          notifications: s.notifications.map(n => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      updateProviderInvoiceSettings: (providerId, settings) =>
        set(s => ({
          providerInvoiceSettings: {
            ...s.providerInvoiceSettings,
            [providerId]: { ...(s.providerInvoiceSettings[providerId] ?? {}), ...settings },
          },
        })),

      updateHomepageConfig: (patch) =>
        set(s => ({ homepageConfig: { ...s.homepageConfig, ...patch } })),

      addHeroSlide: (slide) =>
        set(s => ({
          homepageConfig: {
            ...s.homepageConfig,
            heroSlides: [
              ...s.homepageConfig.heroSlides,
              { ...slide, id: `slide_${Date.now()}` },
            ],
          },
        })),

      updateHeroSlide: (id, patch) =>
        set(s => ({
          homepageConfig: {
            ...s.homepageConfig,
            heroSlides: s.homepageConfig.heroSlides.map(sl =>
              sl.id === id ? { ...sl, ...patch } : sl
            ),
          },
        })),

      deleteHeroSlide: (id) =>
        set(s => ({
          homepageConfig: {
            ...s.homepageConfig,
            heroSlides: s.homepageConfig.heroSlides.filter(sl => sl.id !== id),
          },
        })),

      reorderHeroSlides: (slides) =>
        set(s => ({ homepageConfig: { ...s.homepageConfig, heroSlides: slides } })),

      // ── User Behaviour Tracking ──────────────────────────────────────────────

      trackActivity: (event, metadata, page) => {
        const { currentUser } = get();
        if (!currentUser) return;
        const activity: UserActivity = {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          userRole: currentUser.role,
          event,
          page: page ?? window.location.pathname,
          metadata: metadata ?? {},
          sessionId: getOrCreateSessionId(),
          createdAt: new Date().toISOString(),
        };
        set(s => ({ userActivities: [activity, ...s.userActivities].slice(0, 500) }));
      },

      snapshotAbandonedCart: () => {
        const { currentUser, cart } = get();
        if (!currentUser || cart.length === 0) return;
        const id = `ac_${currentUser.id}_${Date.now()}`;
        const snapshot: AbandonedCart = {
          id,
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          cartItems: cart.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            productIcon: i.product.imageIcon,
            productColor: i.product.imageColor,
            quantity: i.quantity,
            price: i.product.price,
          })),
          total: cart.reduce((s, i) => s + i.product.price * i.quantity, 0),
          itemCount: cart.reduce((s, i) => s + i.quantity, 0),
          lastActivity: new Date().toISOString(),
          recovered: false,
        };
        set(s => ({
          abandonedCarts: [
            snapshot,
            ...s.abandonedCarts.filter(ac => ac.userId !== currentUser.id || ac.recovered),
          ].slice(0, 200),
        }));
      },

      markCartRecovered: (id) =>
        set(s => ({
          abandonedCarts: s.abandonedCarts.map(ac =>
            ac.id === id ? { ...ac, recovered: true, recoveredAt: new Date().toISOString() } : ac
          ),
        })),

      clearActivities: () => set({ userActivities: [] }),

      // ── Custom Roles ──────────────────────────────────────────────────────────

      addCustomRole: (role) =>
        set(s => ({
          customRoles: [
            ...s.customRoles,
            { ...role, id: `role_custom_${Date.now()}`, isSystem: false, createdAt: new Date().toISOString().slice(0, 10) },
          ],
        })),

      updateCustomRole: (id, patch) =>
        set(s => ({ customRoles: s.customRoles.map(r => r.id === id ? { ...r, ...patch } : r) })),

      deleteCustomRole: (id) =>
        set(s => ({ customRoles: s.customRoles.filter(r => r.id !== id) })),

      // ── Admin User Management ────────────────────────────────────────────────

      adminCreateUser: (userData) => {
        const { registeredUsers, isEmailTaken } = get();
        if (isEmailTaken(userData.email)) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        const newUser: RegisteredUser = {
          ...userData,
          id: `u_admin_${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set({ registeredUsers: [...registeredUsers, newUser] });
        return { success: true };
      },

      adminUpdateUser: (id, patch) =>
        set(s => ({
          registeredUsers: s.registeredUsers.map(u => u.id === id ? { ...u, ...patch } : u),
          currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...patch } : s.currentUser,
        })),

      adminDeleteUser: (id) =>
        set(s => ({
          registeredUsers: s.registeredUsers.filter(u => u.id !== id),
          currentUser: s.currentUser?.id === id ? null : s.currentUser,
        })),

      adminToggleSuspend: (id) =>
        set(s => ({
          suspendedUsers: s.suspendedUsers.includes(id)
            ? s.suspendedUsers.filter(uid => uid !== id)
            : [...s.suspendedUsers, id],
        })),

      // ── Cart ─────────────────────────────────────────────────────────────────

      addToCart: (product, qty = 1) => {
        const { cart } = get();
        const existing = cart.find(i => i.product.id === product.id);
        if (existing) {
          set({ cart: cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i) });
        } else {
          set({ cart: [...cart, { product, quantity: qty }] });
        }
      },

      removeFromCart: (productId) =>
        set(s => ({ cart: s.cart.filter(i => i.product.id !== productId) })),

      updateCartQty: (productId, qty) => {
        if (qty <= 0) { get().removeFromCart(productId); return; }
        set(s => ({ cart: s.cart.map(i => i.product.id === productId ? { ...i, quantity: qty } : i) }));
      },

      clearCart: () => set({ cart: [] }),

      // ── UI ───────────────────────────────────────────────────────────────────

      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'askindia-store',
      version: 3,
      migrate: (persistedState: unknown, fromVersion: number) => {
        // Deep-merge the persisted state with the latest defaults so that
        // any new fields (added across versions) are always present.
        const s = (persistedState ?? {}) as Record<string, unknown>;
        const hc = (s.homepageConfig ?? {}) as Record<string, unknown>;

        // Ensure homepageConfig always has all required fields
        const patched: Record<string, unknown> = {
          ...DEFAULT_HOMEPAGE_CONFIG,
          ...hc,
          // Always keep heroSlides if they exist and are non-empty
          heroSlides: Array.isArray(hc.heroSlides) && (hc.heroSlides as unknown[]).length > 0
            ? hc.heroSlides
            : DEFAULT_HOMEPAGE_CONFIG.heroSlides,
          // Fill in any missing banner / logo arrays
          miniBanners: Array.isArray(hc.miniBanners) ? hc.miniBanners : DEFAULT_HOMEPAGE_CONFIG.miniBanners,
          brandLogos:  Array.isArray(hc.brandLogos)  ? hc.brandLogos  : DEFAULT_HOMEPAGE_CONFIG.brandLogos,
          // New boolean fields — default true when not yet persisted
          showBrandLogos:       hc.showBrandLogos       ?? true,
          showNewsletter:       hc.showNewsletter        ?? true,
          showTrendingSection:  hc.showTrendingSection   ?? true,
          showBestDeals:        hc.showBestDeals         ?? true,
          showCollectionList:   hc.showCollectionList    ?? true,
          newsletterTitle:      hc.newsletterTitle       ?? DEFAULT_HOMEPAGE_CONFIG.newsletterTitle,
          newsletterSubtitle:   hc.newsletterSubtitle    ?? DEFAULT_HOMEPAGE_CONFIG.newsletterSubtitle,
        };

        return { ...s, homepageConfig: patched };
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        registeredUsers: state.registeredUsers,
        products: state.products,
        stores: state.stores,
        services: state.services,
        orders: state.orders,
        serviceOrders: state.serviceOrders,
        withdrawalRequests: state.withdrawalRequests,
        notifications: state.notifications,
        cart: state.cart,
        agents: state.agents,
        providerInvoiceSettings: state.providerInvoiceSettings,
        homepageConfig: state.homepageConfig,
        userActivities: state.userActivities,
        abandonedCarts: state.abandonedCarts,
        customRoles: state.customRoles,
        suspendedUsers: state.suspendedUsers,
        sidebarOpen: state.sidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Ensure admin always exists
        if (!state.registeredUsers.some(u => u.email === 'admin@askindia.shop')) {
          state.registeredUsers = [adminSeed, ...state.registeredUsers];
        }
        // Ensure demo users always exist
        for (const demo of [demoStoreOwner, demoProvider, demoCustomer, demoAgent]) {
          if (!state.registeredUsers.some(u => u.email === demo.email)) {
            state.registeredUsers = [...state.registeredUsers, demo];
          }
        }
        // Ensure demo store exists
        if (!state.stores.some(s => s.id === DEMO_STORE_ID)) {
          state.stores = [demoStore, ...state.stores];
        }
        // Ensure agents array exists
        if (!state.agents) state.agents = [demoAgentData];
        else if (!state.agents.some(a => a.id === demoAgentData.id)) {
          state.agents = [demoAgentData, ...state.agents];
        }
        // Seed demo products & services only when none exist yet
        if (state.products.length === 0) state.products = demoProducts;
        if (state.services.length === 0) state.services = demoServices;
        // Patch old services that don't have the commission field
        state.services = state.services.map(svc => ({
          ...svc,
          commission: svc.commission ?? 10,
        }));
        // Ensure providerInvoiceSettings exists (migration for old localStorage)
        if (!state.providerInvoiceSettings) state.providerInvoiceSettings = {};
        // Ensure homepageConfig exists (migration for old localStorage)
        if (!state.homepageConfig) state.homepageConfig = DEFAULT_HOMEPAGE_CONFIG;
        else {
          if (!state.homepageConfig.heroSlides?.length) state.homepageConfig.heroSlides = DEFAULT_HERO_SLIDES;
          if (!state.homepageConfig.miniBanners) state.homepageConfig.miniBanners = DEFAULT_MINI_BANNERS;
          if (!state.homepageConfig.brandLogos) state.homepageConfig.brandLogos = DEFAULT_BRAND_LOGOS;
          if (state.homepageConfig.showBrandLogos === undefined) state.homepageConfig.showBrandLogos = true;
          if (state.homepageConfig.showNewsletter === undefined) state.homepageConfig.showNewsletter = true;
          if (!state.homepageConfig.newsletterTitle) state.homepageConfig.newsletterTitle = DEFAULT_HOMEPAGE_CONFIG.newsletterTitle;
          if (!state.homepageConfig.newsletterSubtitle) state.homepageConfig.newsletterSubtitle = DEFAULT_HOMEPAGE_CONFIG.newsletterSubtitle;
          if (state.homepageConfig.showTrendingSection === undefined) state.homepageConfig.showTrendingSection = true;
          if (state.homepageConfig.showBestDeals === undefined) state.homepageConfig.showBestDeals = true;
          if (state.homepageConfig.showCollectionList === undefined) state.homepageConfig.showCollectionList = true;
        }
        // Ensure tracking arrays exist
        if (!state.userActivities) state.userActivities = demoActivities;
        if (!state.abandonedCarts) state.abandonedCarts = demoAbandonedCarts;
        if (!state.customRoles) state.customRoles = [];
        if (!state.suspendedUsers) state.suspendedUsers = [];
      },
    }
  )
);
