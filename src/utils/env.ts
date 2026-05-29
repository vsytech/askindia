/**
 * Type-safe, centralised access to all VITE_ environment variables.
 * Import `env` anywhere instead of scattering `import.meta.env` calls.
 *
 * Values fall back to sensible defaults so the app runs without a .env file
 * (e.g. on a fresh Vercel deployment with no env vars configured yet).
 */

const b = (v: string | undefined, fallback = false): boolean =>
  v === undefined ? fallback : v === 'true';

const n = (v: string | undefined, fallback: number): number => {
  const parsed = Number(v);
  return isNaN(parsed) ? fallback : parsed;
};

export const env = {
  // ── App Identity ───────────────────────────────────────────────
  appName:          import.meta.env.VITE_APP_NAME          ?? 'AskIndia',
  appTagline:       import.meta.env.VITE_APP_TAGLINE        ?? "India's Unified Marketplace",
  appVersion:       import.meta.env.VITE_APP_VERSION        ?? '1.0.0',
  appEnv:           import.meta.env.VITE_APP_ENV            ?? 'development',
  appUrl:           import.meta.env.VITE_APP_URL            ?? 'http://localhost:5173',
  appDomain:        import.meta.env.VITE_APP_DOMAIN         ?? 'askindia.shop',
  supportEmail:     import.meta.env.VITE_SUPPORT_EMAIL      ?? 'support@askindia.shop',
  supportPhone:     import.meta.env.VITE_SUPPORT_PHONE      ?? '+91-9999999999',
  grievanceEmail:   import.meta.env.VITE_GRIEVANCE_EMAIL    ?? 'grievance@askindia.shop',

  // ── Environment checks ─────────────────────────────────────────
  isProd:           import.meta.env.PROD,
  isDev:            import.meta.env.DEV,
  isStaging:        import.meta.env.VITE_APP_ENV === 'staging',

  // ── Localisation ───────────────────────────────────────────────
  currency:         import.meta.env.VITE_DEFAULT_CURRENCY        ?? 'INR',
  currencySymbol:   import.meta.env.VITE_DEFAULT_CURRENCY_SYMBOL ?? '₹',
  locale:           import.meta.env.VITE_DEFAULT_LOCALE          ?? 'en-IN',
  timezone:         import.meta.env.VITE_DEFAULT_TIMEZONE        ?? 'Asia/Kolkata',
  country:          import.meta.env.VITE_DEFAULT_COUNTRY         ?? 'IN',

  // ── Company / Legal ────────────────────────────────────────────
  companyName:      'AskIndia Technologies Pvt. Ltd.',
  companyGstin:     import.meta.env.VITE_GSTIN_COMPANY           ?? '',
  companyPan:       import.meta.env.VITE_COMPANY_PAN             ?? '',
  companyAddress:   import.meta.env.VITE_COMPANY_ADDRESS         ?? '',
  companyState:     import.meta.env.VITE_COMPANY_STATE           ?? 'Karnataka',
  companyStateCode: import.meta.env.VITE_COMPANY_STATE_CODE      ?? '29',
  defaultGstRate:   n(import.meta.env.VITE_DEFAULT_GST_RATE, 18),

  // ── Platform Commission ────────────────────────────────────────
  commissionProduct:    n(import.meta.env.VITE_DEFAULT_COMMISSION_PRODUCT,    10),
  commissionService:    n(import.meta.env.VITE_DEFAULT_COMMISSION_SERVICE,    12),
  commissionAgent:      n(import.meta.env.VITE_DEFAULT_COMMISSION_AGENT,       8),
  minWithdrawal:        n(import.meta.env.VITE_MIN_WITHDRAWAL_AMOUNT,        500),
  freeShippingAbove:    n(import.meta.env.VITE_FREE_SHIPPING_ABOVE,          999),

  // ── Payments ───────────────────────────────────────────────────
  razorpayKeyId:        import.meta.env.VITE_RAZORPAY_KEY_ID     ?? '',
  razorpayThemeColor:   import.meta.env.VITE_RAZORPAY_THEME_COLOR ?? '#F97316',

  // ── Analytics ──────────────────────────────────────────────────
  ga4MeasurementId:  import.meta.env.VITE_GA4_MEASUREMENT_ID   ?? '',
  metaPixelId:       import.meta.env.VITE_META_PIXEL_ID         ?? '',
  hotjarSiteId:      import.meta.env.VITE_HOTJAR_SITE_ID        ?? '',
  clarityProjectId:  import.meta.env.VITE_CLARITY_PROJECT_ID    ?? '',
  mixpanelToken:     import.meta.env.VITE_MIXPANEL_TOKEN        ?? '',

  // ── Sentry ─────────────────────────────────────────────────────
  sentryDsn:         import.meta.env.VITE_SENTRY_DSN            ?? '',
  sentryEnv:         import.meta.env.VITE_SENTRY_ENVIRONMENT    ?? 'development',

  // ── Social Links ───────────────────────────────────────────────
  social: {
    facebook:  import.meta.env.VITE_SOCIAL_FACEBOOK  ?? 'https://facebook.com/askindia',
    instagram: import.meta.env.VITE_SOCIAL_INSTAGRAM ?? 'https://instagram.com/askindia',
    twitter:   import.meta.env.VITE_SOCIAL_TWITTER   ?? 'https://twitter.com/askindia',
    youtube:   import.meta.env.VITE_SOCIAL_YOUTUBE   ?? 'https://youtube.com/@askindia',
    linkedin:  import.meta.env.VITE_SOCIAL_LINKEDIN  ?? 'https://linkedin.com/company/askindia',
  },

  // ── Legal URLs ─────────────────────────────────────────────────
  legal: {
    privacy: import.meta.env.VITE_PRIVACY_POLICY_URL ?? '/privacy',
    terms:   import.meta.env.VITE_TERMS_URL           ?? '/terms',
    refund:  import.meta.env.VITE_REFUND_POLICY_URL   ?? '/refund',
  },

  // ── SEO ────────────────────────────────────────────────────────
  meta: {
    title:       import.meta.env.VITE_META_TITLE       ?? "AskIndia — India's Unified Marketplace",
    description: import.meta.env.VITE_META_DESCRIPTION ?? 'Products from verified stores, services from trusted providers — all in your city.',
    ogImage:     import.meta.env.VITE_META_OG_IMAGE    ?? '/og-image.jpg',
    themeColor:  import.meta.env.VITE_META_THEME_COLOR ?? '#0D1F6E',
    keywords:    import.meta.env.VITE_META_KEYWORDS    ?? 'online shopping india, local stores, home services, ecommerce',
  },

  // ── Feature Flags ──────────────────────────────────────────────
  features: {
    realAuth:          b(import.meta.env.VITE_FEATURE_REAL_AUTH),
    realPayments:      b(import.meta.env.VITE_FEATURE_REAL_PAYMENTS),
    realUploads:       b(import.meta.env.VITE_FEATURE_REAL_UPLOADS),
    pushNotifications: b(import.meta.env.VITE_FEATURE_PUSH_NOTIFICATIONS),
    liveChat:          b(import.meta.env.VITE_FEATURE_LIVE_CHAT),
    agentPortal:       b(import.meta.env.VITE_FEATURE_AGENT_PORTAL,       true),
    serviceBooking:    b(import.meta.env.VITE_FEATURE_SERVICE_BOOKING,    true),
    gstInvoices:       b(import.meta.env.VITE_FEATURE_GST_INVOICES,       true),
    analytics:         b(import.meta.env.VITE_FEATURE_ANALYTICS),
    maps:              b(import.meta.env.VITE_FEATURE_MAPS),
    cod:               b(import.meta.env.VITE_FEATURE_COD,                true),
  },

  // ── Supabase ───────────────────────────────────────────────────
  supabaseUrl:     import.meta.env.VITE_SUPABASE_URL      ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',

  // ── Google Maps ────────────────────────────────────────────────
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
} as const;

export type Env = typeof env;
