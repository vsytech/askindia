-- ════════════════════════════════════════════════════════════════════════════
--  AskIndia — Seed Data
--  Run AFTER schema.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── Step 1: Create the Admin user ────────────────────────────────────────────
-- Go to Supabase Dashboard → Authentication → Users → Add user
--   Email:    admin@askindia.shop
--   Password: Admin@AskIndia2025  (change this!)
--   Auto Confirm: ✅ checked
-- Then run the UPDATE below to set role = 'admin':
--
-- UPDATE public.profiles SET role = 'admin', name = 'AskIndia Admin'
-- WHERE email = 'admin@askindia.shop';

-- ── Step 2: Create Demo users (optional, for testing) ────────────────────────
-- Create each via Supabase Dashboard → Authentication → Users → Add user:
--   store@demo.com     / Demo@1234  → role = 'store_owner'
--   provider@demo.com  / Demo@1234  → role = 'service_provider'
--   customer@demo.com  / Demo@1234  → role = 'customer'
--   agent@demo.com     / Demo@1234  → role = 'agent'
-- Then run these UPDATE statements:
--
-- UPDATE public.profiles SET role = 'store_owner',      name = 'Rahul Sharma',  phone = '9876543210', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'store@demo.com';
-- UPDATE public.profiles SET role = 'service_provider', name = 'Priya Singh',   phone = '9876543211', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'provider@demo.com';
-- UPDATE public.profiles SET role = 'customer',         name = 'Amit Kumar',    phone = '9876543212', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'customer@demo.com';
-- UPDATE public.profiles SET role = 'agent',            name = 'Vikram Patel',  phone = '9876543213', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'agent@demo.com';

-- ── Step 3: Seed the default homepage config ─────────────────────────────────
INSERT INTO public.homepage_config (
  id,
  announcement_bar,
  announcement_bar_active,
  hero_slides,
  mini_banners,
  brand_logos,
  show_products,
  show_services,
  show_stores,
  show_trust_badges,
  show_seller_cta,
  show_brand_logos,
  show_newsletter,
  newsletter_title,
  newsletter_subtitle,
  show_trending_section,
  show_best_deals,
  show_collection_list
) VALUES (
  1,
  '🔥 Welcome to AskIndia — India''s trusted marketplace for products & services!',
  true,
  '[
    {
      "id": "slide_1",
      "title": "Products & Services,\nAll in One Place",
      "subtitle": "Discover verified stores, book local services — tailored to your city.",
      "ctaText": "Shop Now",
      "ctaLink": "/register/customer",
      "secondaryCtaText": "Open a Store",
      "secondaryCtaLink": "/register/store-owner",
      "gradientFrom": "#1e1b4b",
      "gradientTo": "#4338ca",
      "badge": "✨ India''s Unified Marketplace",
      "imageEmoji": "🛍️",
      "isActive": true
    },
    {
      "id": "slide_2",
      "title": "Book Trusted\nLocal Services",
      "subtitle": "AC repair, home cleaning, tutoring & more — all with verified providers.",
      "ctaText": "Book a Service",
      "ctaLink": "/register/customer",
      "secondaryCtaText": "List Your Service",
      "secondaryCtaLink": "/register/service-provider",
      "gradientFrom": "#134e4a",
      "gradientTo": "#0891b2",
      "badge": "🔧 500+ Services Available",
      "imageEmoji": "🏠",
      "isActive": true
    },
    {
      "id": "slide_3",
      "title": "Launch Your\nOnline Store Today",
      "subtitle": "Set up a branded storefront in minutes and reach customers across India.",
      "ctaText": "Open Free Store",
      "ctaLink": "/register/store-owner",
      "secondaryCtaText": "Learn More",
      "secondaryCtaLink": "/register/store-owner",
      "gradientFrom": "#7c2d12",
      "gradientTo": "#ea580c",
      "badge": "🚀 Free to Start",
      "imageEmoji": "🏪",
      "isActive": true
    }
  ]'::jsonb,
  '[
    {"id":"mb_1","title":"Top Smartphones","subtitle":"Latest models, best prices","emoji":"📱","gradientFrom":"#ea580c","gradientTo":"#f97316","ctaText":"Shop Now","link":"/shop","isActive":true},
    {"id":"mb_2","title":"Premium Audio","subtitle":"Earbuds, headphones & speakers","emoji":"🎧","gradientFrom":"#7c3aed","gradientTo":"#a855f7","ctaText":"Explore","link":"/shop","isActive":true},
    {"id":"mb_3","title":"Smart Cameras","subtitle":"Capture every moment","emoji":"📷","gradientFrom":"#0369a1","gradientTo":"#0ea5e9","ctaText":"View Deals","link":"/shop","isActive":true}
  ]'::jsonb,
  '[
    {"id":"bl_1","name":"Samsung","emoji":"🌀","isActive":true},
    {"id":"bl_2","name":"Apple","emoji":"🍎","isActive":true},
    {"id":"bl_3","name":"Sony","emoji":"🎵","isActive":true},
    {"id":"bl_4","name":"OnePlus","emoji":"⚡","isActive":true},
    {"id":"bl_5","name":"boAt","emoji":"🎶","isActive":true},
    {"id":"bl_6","name":"LG","emoji":"📺","isActive":true},
    {"id":"bl_7","name":"Canon","emoji":"📷","isActive":true},
    {"id":"bl_8","name":"Realme","emoji":"🔋","isActive":true}
  ]'::jsonb,
  true, true, true, true, true,
  true, true,
  'Get 20% Off Your First Order',
  'Subscribe for exclusive deals, new arrivals & festive offers',
  true, true, true
)
ON CONFLICT (id) DO UPDATE SET
  announcement_bar        = EXCLUDED.announcement_bar,
  announcement_bar_active = EXCLUDED.announcement_bar_active,
  hero_slides             = EXCLUDED.hero_slides,
  mini_banners            = EXCLUDED.mini_banners,
  brand_logos             = EXCLUDED.brand_logos,
  newsletter_title        = EXCLUDED.newsletter_title,
  newsletter_subtitle     = EXCLUDED.newsletter_subtitle;
