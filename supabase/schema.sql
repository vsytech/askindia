-- ════════════════════════════════════════════════════════════════════════════
--  AskIndia — Supabase Database Schema
--  Run this ONCE in Supabase Dashboard → SQL Editor → New Query
--  Project: https://supabase.com/dashboard
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Sequences ───────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq         START 1;
CREATE SEQUENCE IF NOT EXISTS service_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS agent_code_seq    START 1;

-- ════════════════════════════════════════════════════════════════════════════
--  TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users. Automatically created via trigger on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'customer'
                          CHECK (role IN ('admin','store_owner','service_provider','customer','agent')),
  phone       TEXT,
  city        TEXT,
  state       TEXT,
  avatar_url  TEXT,
  store_id    UUID,       -- FK to stores (added after stores table below)
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── stores ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_name        TEXT        NOT NULL DEFAULT '',
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  tagline           TEXT        NOT NULL DEFAULT '',
  description       TEXT        NOT NULL DEFAULT '',
  logo              TEXT        NOT NULL DEFAULT '🏪',
  theme_color       TEXT        NOT NULL DEFAULT '#0D1F6E',
  banner_url        TEXT,
  city              TEXT        NOT NULL DEFAULT '',
  state             TEXT        NOT NULL DEFAULT '',
  store_type        TEXT        NOT NULL DEFAULT 'product'
                                CHECK (store_type IN ('product','service')),
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('active','pending','suspended')),
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 10,
  wallet_balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sales       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders      INTEGER      NOT NULL DEFAULT 0,
  subdomain         TEXT        NOT NULL DEFAULT '',
  contact_email     TEXT,
  contact_phone     TEXT,
  gst_number        TEXT,
  bank_account      TEXT,
  bank_ifsc         TEXT,
  customization     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  invoice_settings  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  activated_at      TIMESTAMPTZ,
  activated_by      TEXT,
  rejected_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Add FK from profiles → stores (after stores table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_store'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_store
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  price            NUMERIC(10,2) NOT NULL,
  mrp              NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission       NUMERIC(5,2)  NOT NULL DEFAULT 10,
  category_id      TEXT        NOT NULL DEFAULT '',
  category         TEXT        NOT NULL DEFAULT '',
  brand            TEXT,
  stock            INTEGER      NOT NULL DEFAULT 0,
  sold             INTEGER      NOT NULL DEFAULT 0,
  image_color      TEXT        NOT NULL DEFAULT 'from-slate-100 to-slate-200',
  image_icon       TEXT        NOT NULL DEFAULT '📦',
  thumbnail        TEXT,
  images           TEXT[]       NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','draft','out_of_stock')),
  featured         BOOLEAN     NOT NULL DEFAULT false,
  available_cities TEXT[]       NOT NULL DEFAULT '{}',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  highlights       TEXT[]       NOT NULL DEFAULT '{}',
  specifications   JSONB        NOT NULL DEFAULT '[]'::jsonb,
  warranty         TEXT        NOT NULL DEFAULT '',
  return_policy    TEXT        NOT NULL DEFAULT '',
  gst_rate         NUMERIC(5,2) NOT NULL DEFAULT 18,
  hsn_code         TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── services ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id         UUID        REFERENCES public.stores(id) ON DELETE SET NULL,
  provider_name    TEXT        NOT NULL DEFAULT '',
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  category         TEXT        NOT NULL DEFAULT '',
  subcategory      TEXT,
  price            NUMERIC(10,2) NOT NULL,
  price_type       TEXT        NOT NULL DEFAULT 'fixed'
                               CHECK (price_type IN ('fixed','hourly','starting_from')),
  commission       NUMERIC(5,2) NOT NULL DEFAULT 10,
  delivery_time    TEXT        NOT NULL DEFAULT '',
  image_color      TEXT        NOT NULL DEFAULT 'from-slate-100 to-slate-200',
  image_icon       TEXT        NOT NULL DEFAULT '🛠️',
  thumbnail        TEXT,
  images           TEXT[]       NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','pending_review')),
  featured         BOOLEAN     NOT NULL DEFAULT false,
  available_cities TEXT[]       NOT NULL DEFAULT '{}',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  includes         TEXT[]       NOT NULL DEFAULT '{}',
  process          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  rating           NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count     INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                   TEXT         PRIMARY KEY,
  customer_id          UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name        TEXT         NOT NULL DEFAULT '',
  customer_email       TEXT         NOT NULL DEFAULT '',
  store_id             UUID         REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name           TEXT         NOT NULL DEFAULT '',
  items                JSONB        NOT NULL DEFAULT '[]'::jsonb,
  subtotal             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  admin_revenue        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT         NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_method       TEXT         CHECK (payment_method IN ('card','upi','wallet','cod')),
  payment_status       TEXT         NOT NULL DEFAULT 'pending'
                                    CHECK (payment_status IN ('paid','pending','refunded')),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  address              TEXT         NOT NULL DEFAULT '',
  city                 TEXT         NOT NULL DEFAULT '',
  agent_id             UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_name           TEXT,
  agent_code           TEXT,
  agent_commission     NUMERIC(10,2),
  tracking_number      TEXT,
  courier_name         TEXT,
  cancel_reason        TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── service_orders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_orders (
  id               TEXT         PRIMARY KEY,
  service_id       UUID         REFERENCES public.services(id) ON DELETE SET NULL,
  service_title    TEXT         NOT NULL DEFAULT '',
  service_icon     TEXT         NOT NULL DEFAULT '🛠️',
  service_color    TEXT         NOT NULL DEFAULT '',
  provider_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_name    TEXT         NOT NULL DEFAULT '',
  customer_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name    TEXT         NOT NULL DEFAULT '',
  customer_email   TEXT         NOT NULL DEFAULT '',
  customer_phone   TEXT,
  amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT         NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  payment_status   TEXT         NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending','paid','failed','refunded')),
  scheduled_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  address          TEXT         NOT NULL DEFAULT '',
  city             TEXT         NOT NULL DEFAULT '',
  notes            TEXT,
  agent_id         UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_name       TEXT,
  agent_code       TEXT,
  agent_commission NUMERIC(10,2),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── agents ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id              UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_code      TEXT        UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('active','pending','suspended')),
  wallet_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders    INTEGER      NOT NULL DEFAULT 0,
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
  activated_at    TIMESTAMPTZ,
  activated_by    TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── wallets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── wallet_transactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID        NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('credit','debit','pending','refund')),
  amount          NUMERIC(12,2) NOT NULL,
  description     TEXT,
  reference_id    TEXT,
  reference_type  TEXT,
  status          TEXT        NOT NULL DEFAULT 'completed'
                              CHECK (status IN ('completed','pending','failed')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── withdrawal_requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT        NOT NULL CHECK (entity_type IN ('store','service_provider','agent')),
  entity_id    UUID        NOT NULL,
  entity_name  TEXT        NOT NULL DEFAULT '',
  owner_name   TEXT        NOT NULL DEFAULT '',
  amount       NUMERIC(12,2) NOT NULL,
  bank_account TEXT        NOT NULL DEFAULT '',
  ifsc         TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','processed')),
  note         TEXT,
  requested_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'info'
                         CHECK (type IN ('order','commission','payout','store','system','service')),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  read       BOOLEAN     NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── homepage_config ───────────────────────────────────────────────────────────
-- Single-row table managed by admin
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id                      INTEGER     PRIMARY KEY DEFAULT 1,
  announcement_bar        TEXT        NOT NULL DEFAULT '',
  announcement_bar_active BOOLEAN     NOT NULL DEFAULT false,
  hero_slides             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  mini_banners            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  show_products           BOOLEAN     NOT NULL DEFAULT true,
  show_services           BOOLEAN     NOT NULL DEFAULT true,
  show_stores             BOOLEAN     NOT NULL DEFAULT true,
  show_trust_badges       BOOLEAN     NOT NULL DEFAULT true,
  show_seller_cta         BOOLEAN     NOT NULL DEFAULT true,
  show_brand_logos        BOOLEAN     NOT NULL DEFAULT true,
  brand_logos             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  show_newsletter         BOOLEAN     NOT NULL DEFAULT true,
  newsletter_title        TEXT        NOT NULL DEFAULT 'Get exclusive deals in your inbox',
  newsletter_subtitle     TEXT        NOT NULL DEFAULT 'Subscribe for exclusive deals and offers',
  show_trending_section   BOOLEAN     NOT NULL DEFAULT true,
  show_best_deals         BOOLEAN     NOT NULL DEFAULT true,
  show_collection_list    BOOLEAN     NOT NULL DEFAULT true,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_activities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activities (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name   TEXT        NOT NULL DEFAULT '',
  user_email  TEXT        NOT NULL DEFAULT '',
  user_role   TEXT        NOT NULL DEFAULT '',
  event       TEXT        NOT NULL,
  page        TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── custom_roles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  permissions TEXT[]  NOT NULL DEFAULT '{}',
  color       TEXT    NOT NULL DEFAULT '#6366f1',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  DATE    NOT NULL DEFAULT CURRENT_DATE
);

-- ── abandoned_carts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name     TEXT        NOT NULL DEFAULT '',
  user_email    TEXT        NOT NULL DEFAULT '',
  cart_items    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  item_count    INTEGER      NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  recovered     BOOLEAN      NOT NULL DEFAULT false,
  recovered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
--  INDEXES
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_store_id    ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status      ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_status      ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_category    ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id      ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id  ON public.service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_provider_id  ON public.service_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read          ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id     ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_event       ON public.user_activities(event);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet  ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug                 ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_status               ON public.stores(status);

-- ════════════════════════════════════════════════════════════════════════════
--  FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Order ID generator: ORD2506000001
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD' || TO_CHAR(NOW(), 'YYMM') || LPAD(NEXTVAL('order_seq')::TEXT, 6, '0');
END;
$$;

-- Service order ID generator: SVC2506000001
CREATE OR REPLACE FUNCTION public.generate_service_order_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'SVC' || TO_CHAR(NOW(), 'YYMM') || LPAD(NEXTVAL('service_order_seq')::TEXT, 6, '0');
END;
$$;

-- Agent code generator: AGT001
CREATE OR REPLACE FUNCTION public.generate_agent_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'AGT' || LPAD(NEXTVAL('agent_code_seq')::TEXT, 3, '0');
END;
$$;

-- Auto-create profile + wallet on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop and recreate to avoid duplicate trigger error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
--  HELPER FUNCTIONS FOR RLS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts    ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);   -- public read (names needed for store listings)

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- ── stores policies ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stores_select" ON public.stores;
CREATE POLICY "stores_select" ON public.stores
  FOR SELECT USING (status = 'active' OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "stores_insert" ON public.stores;
CREATE POLICY "stores_insert" ON public.stores
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "stores_update" ON public.stores;
CREATE POLICY "stores_update" ON public.stores
  FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "stores_delete" ON public.stores;
CREATE POLICY "stores_delete" ON public.stores
  FOR DELETE USING (public.is_admin());

-- ── products policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    status = 'active'
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = products.store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ── services policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "services_select" ON public.services;
CREATE POLICY "services_select" ON public.services
  FOR SELECT USING (status = 'active' OR provider_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "services_insert" ON public.services;
CREATE POLICY "services_insert" ON public.services
  FOR INSERT WITH CHECK (provider_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "services_update" ON public.services;
CREATE POLICY "services_update" ON public.services
  FOR UPDATE USING (provider_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "services_delete" ON public.services;
CREATE POLICY "services_delete" ON public.services
  FOR DELETE USING (provider_id = auth.uid() OR public.is_admin());

-- ── orders policies ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = orders.store_id AND owner_id = auth.uid())
    OR agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
    OR customer_id = auth.uid()
  );

-- ── service_orders policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_orders_select" ON public.service_orders;
CREATE POLICY "service_orders_select" ON public.service_orders
  FOR SELECT USING (
    customer_id = auth.uid() OR provider_id = auth.uid() OR public.is_admin() OR agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "service_orders_insert" ON public.service_orders;
CREATE POLICY "service_orders_insert" ON public.service_orders
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "service_orders_update" ON public.service_orders;
CREATE POLICY "service_orders_update" ON public.service_orders
  FOR UPDATE USING (
    provider_id = auth.uid() OR customer_id = auth.uid() OR public.is_admin()
  );

-- ── agents policies ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agents_select" ON public.agents;
CREATE POLICY "agents_select" ON public.agents
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "agents_insert" ON public.agents;
CREATE POLICY "agents_insert" ON public.agents
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "agents_update" ON public.agents;
CREATE POLICY "agents_update" ON public.agents
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- ── wallets policies ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wallets_select" ON public.wallets;
CREATE POLICY "wallets_select" ON public.wallets
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "wallets_update" ON public.wallets;
CREATE POLICY "wallets_update" ON public.wallets
  FOR UPDATE USING (public.is_admin());

-- ── wallet_transactions policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "wallet_tx_select" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_select" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_transactions.wallet_id AND user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "wallet_tx_insert" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_insert" ON public.wallet_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- ── withdrawal_requests policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "withdrawal_select" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_select" ON public.withdrawal_requests
  FOR SELECT USING (entity_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "withdrawal_insert" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_insert" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (entity_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "withdrawal_update" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_update" ON public.withdrawal_requests
  FOR UPDATE USING (public.is_admin());

-- ── notifications policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- ── homepage_config policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "homepage_select" ON public.homepage_config;
CREATE POLICY "homepage_select" ON public.homepage_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "homepage_write" ON public.homepage_config;
CREATE POLICY "homepage_write" ON public.homepage_config
  FOR ALL USING (public.is_admin());

-- ── user_activities policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "activities_select" ON public.user_activities;
CREATE POLICY "activities_select" ON public.user_activities
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "activities_insert" ON public.user_activities;
CREATE POLICY "activities_insert" ON public.user_activities
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ── custom_roles policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "custom_roles_select" ON public.custom_roles;
CREATE POLICY "custom_roles_select" ON public.custom_roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "custom_roles_write" ON public.custom_roles;
CREATE POLICY "custom_roles_write" ON public.custom_roles
  FOR ALL USING (public.is_admin());

-- ── abandoned_carts policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "abandoned_carts_select" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_select" ON public.abandoned_carts
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "abandoned_carts_insert" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_insert" ON public.abandoned_carts
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "abandoned_carts_update" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_update" ON public.abandoned_carts
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
--  REALTIME (enable for live order updates)
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;
  -- Enable realtime on key tables
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
COMMIT;
