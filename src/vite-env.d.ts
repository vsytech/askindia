/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── App Identity ─────────────────────────────────────────────────
  readonly VITE_APP_NAME:            string;
  readonly VITE_APP_TAGLINE:         string;
  readonly VITE_APP_VERSION:         string;
  readonly VITE_APP_ENV:             string;
  readonly VITE_APP_URL:             string;
  readonly VITE_APP_DOMAIN:          string;
  readonly VITE_SUPPORT_EMAIL:       string;
  readonly VITE_SUPPORT_PHONE:       string;
  readonly VITE_GRIEVANCE_EMAIL:     string;

  // ── Server config ─────────────────────────────────────────────────
  readonly VITE_PORT:                string;
  readonly VITE_NETWORK_EXPOSE:      string;

  // ── Localisation ──────────────────────────────────────────────────
  readonly VITE_DEFAULT_CURRENCY:        string;
  readonly VITE_DEFAULT_CURRENCY_SYMBOL: string;
  readonly VITE_DEFAULT_LOCALE:          string;
  readonly VITE_DEFAULT_TIMEZONE:        string;
  readonly VITE_DEFAULT_COUNTRY:         string;

  // ── Company / Legal ───────────────────────────────────────────────
  readonly VITE_GSTIN_COMPANY:       string;
  readonly VITE_COMPANY_PAN:         string;
  readonly VITE_COMPANY_ADDRESS:     string;
  readonly VITE_COMPANY_STATE:       string;
  readonly VITE_COMPANY_STATE_CODE:  string;
  readonly VITE_DEFAULT_GST_RATE:    string;

  // ── Platform Commission ───────────────────────────────────────────
  readonly VITE_DEFAULT_COMMISSION_PRODUCT:  string;
  readonly VITE_DEFAULT_COMMISSION_SERVICE:  string;
  readonly VITE_DEFAULT_COMMISSION_AGENT:    string;
  readonly VITE_MIN_WITHDRAWAL_AMOUNT:       string;
  readonly VITE_FREE_SHIPPING_ABOVE:         string;

  // ── Payments ──────────────────────────────────────────────────────
  readonly VITE_RAZORPAY_KEY_ID:     string;
  readonly VITE_RAZORPAY_THEME_COLOR: string;

  // ── Analytics ─────────────────────────────────────────────────────
  readonly VITE_GA4_MEASUREMENT_ID:  string;
  readonly VITE_META_PIXEL_ID:       string;
  readonly VITE_HOTJAR_SITE_ID:      string;
  readonly VITE_CLARITY_PROJECT_ID:  string;
  readonly VITE_MIXPANEL_TOKEN:      string;

  // ── Sentry ────────────────────────────────────────────────────────
  readonly VITE_SENTRY_DSN:          string;
  readonly VITE_SENTRY_ENVIRONMENT:  string;

  // ── Social Links ──────────────────────────────────────────────────
  readonly VITE_SOCIAL_FACEBOOK:     string;
  readonly VITE_SOCIAL_INSTAGRAM:    string;
  readonly VITE_SOCIAL_TWITTER:      string;
  readonly VITE_SOCIAL_YOUTUBE:      string;
  readonly VITE_SOCIAL_LINKEDIN:     string;

  // ── Legal URLs ────────────────────────────────────────────────────
  readonly VITE_PRIVACY_POLICY_URL:  string;
  readonly VITE_TERMS_URL:           string;
  readonly VITE_REFUND_POLICY_URL:   string;

  // ── SEO ───────────────────────────────────────────────────────────
  readonly VITE_META_TITLE:          string;
  readonly VITE_META_DESCRIPTION:    string;
  readonly VITE_META_OG_IMAGE:       string;
  readonly VITE_META_THEME_COLOR:    string;
  readonly VITE_META_KEYWORDS:       string;

  // ── Feature Flags ─────────────────────────────────────────────────
  readonly VITE_FEATURE_REAL_AUTH:           string;
  readonly VITE_FEATURE_REAL_PAYMENTS:       string;
  readonly VITE_FEATURE_REAL_UPLOADS:        string;
  readonly VITE_FEATURE_PUSH_NOTIFICATIONS:  string;
  readonly VITE_FEATURE_LIVE_CHAT:           string;
  readonly VITE_FEATURE_AGENT_PORTAL:        string;
  readonly VITE_FEATURE_SERVICE_BOOKING:     string;
  readonly VITE_FEATURE_GST_INVOICES:        string;
  readonly VITE_FEATURE_ANALYTICS:           string;
  readonly VITE_FEATURE_MAPS:                string;
  readonly VITE_FEATURE_COD:                 string;

  // ── Supabase ──────────────────────────────────────────────────────
  readonly VITE_SUPABASE_URL:        string;
  readonly VITE_SUPABASE_ANON_KEY:   string;

  // ── Google Maps ───────────────────────────────────────────────────
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
