# AskIndia — Complete Deployment Guide
## GitHub → Vercel → Supabase

---

## Overview

This guide takes the project from your local machine to a live production URL in ~30 minutes. The stack is:

- **Frontend**: React 18 + Vite → deployed on **Vercel**
- **Database + Auth**: **Supabase** (PostgreSQL + Row Level Security)
- **Domain**: `askindia.shop` → pointed at Vercel

---

## STEP 1 — Supabase Project Setup

### 1.1  Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Fill in:
   - **Organization**: your org (or create one)
   - **Name**: `askindia-prod`
   - **Database password**: generate a strong password (save it!)
   - **Region**: `South Asia (Mumbai)` — ap-south-1
3. Click **Create new project** and wait ~2 minutes for provisioning

### 1.2  Run the Database Schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the SQL editor
4. Click **Run** (green button)
5. You should see: `Success. No rows returned`

### 1.3  Run the Seed Data

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Open the file `supabase/seed.sql` from this project
3. Paste the entire contents and click **Run**
4. This creates the default homepage config

### 1.4  Create Demo / Production Users

Go to **Authentication** → **Users** → **Add user** → **Create new user** for each:

| Email | Password | Role (set below) |
|---|---|---|
| `admin@askindia.shop` | `Admin@AskIndia2025` | admin |
| `store@demo.com` | `Demo@1234` | store_owner |
| `provider@demo.com` | `Demo@1234` | service_provider |
| `customer@demo.com` | `Demo@1234` | customer |
| `agent@demo.com` | `Demo@1234` | agent |

> ✅ Check **Auto Confirm** for each user so they don't need email verification.

After creating all users, go to **SQL Editor** → **New Query** and run:

```sql
-- Set admin role
UPDATE public.profiles
SET role = 'admin', name = 'AskIndia Admin'
WHERE email = 'admin@askindia.shop';

-- Set demo user roles
UPDATE public.profiles SET role = 'store_owner',      name = 'Rahul Sharma',  phone = '9876543210', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'store@demo.com';
UPDATE public.profiles SET role = 'service_provider', name = 'Priya Singh',   phone = '9876543211', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'provider@demo.com';
UPDATE public.profiles SET role = 'customer',         name = 'Amit Kumar',    phone = '9876543212', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'customer@demo.com';
UPDATE public.profiles SET role = 'agent',            name = 'Vikram Patel',  phone = '9876543213', city = 'Mumbai', state = 'Maharashtra' WHERE email = 'agent@demo.com';
```

### 1.5  Get Your API Credentials

1. In Supabase Dashboard → **Project Settings** → **API**
2. Copy and save these two values:
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key — the long JWT string under "Project API keys"

---

## STEP 2 — Configure Local Environment

Update your local `.env` file with the real Supabase credentials:

```bash
# Replace these two lines in .env:
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Test locally to confirm Supabase auth works:

```bash
npm run dev
# Visit http://localhost:5173
# Log in with admin@askindia.shop / Admin@AskIndia2025
# You should land on the admin dashboard
```

---

## STEP 3 — GitHub Repository Setup

### 3.1  Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name**: `askindia-marketplace`
   - **Visibility**: Private (recommended) or Public
   - **Do NOT** initialize with README, .gitignore, or license (we already have them)
3. Click **Create repository**
4. Copy the repository URL: `https://github.com/YOUR_USERNAME/askindia-marketplace.git`

### 3.2  Push the Code

Open your terminal in the project folder (`/Users/kushagra/Desktop/ecomvsy`) and run:

```bash
# Check git status — .env should NOT appear (it's gitignored)
git status

# Stage all files
git add .

# Commit
git commit -m "feat: production-ready AskIndia marketplace with Supabase integration"

# Connect to GitHub (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/askindia-marketplace.git

# Push
git branch -M main
git push -u origin main
```

> ⚠️ **Verify `.env` is NOT in the commit**: Run `git status` before committing. If `.env` appears, it means `.gitignore` isn't working — stop and fix it before pushing.

---

## STEP 4 — Vercel Deployment

### 4.1  Create a Vercel Account / Project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Click **Import Git Repository**
3. Authorize Vercel to access GitHub if prompted
4. Select your `askindia-marketplace` repository
5. Vercel should auto-detect it as a **Vite** project

### 4.2  Configure Build Settings

Vercel usually detects these automatically, but verify:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 18.x or 20.x |

### 4.3  Set Environment Variables

In the Vercel project setup (or after: **Project Settings** → **Environment Variables**), add these for **Production** scope:

```
VITE_SUPABASE_URL          = https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV               = production
VITE_APP_URL               = https://askindia.shop
VITE_APP_DOMAIN            = askindia.shop
VITE_APP_NAME              = AskIndia
```

> Only these 6 variables are **required** to make the app functional. All other variables in `.env` are for future integrations (payments, SMS, etc.) and can be added later.

### 4.4  Deploy

1. Click **Deploy** in the Vercel setup wizard
2. Vercel will run `npm run build` — takes ~60 seconds
3. Your app goes live at `https://askindia-marketplace.vercel.app`

---

## STEP 5 — Configure Supabase Auth Redirect URLs

After getting your Vercel URL, you must tell Supabase which URLs are allowed for auth redirects:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://askindia.shop` (your final domain, or Vercel URL initially)
3. **Redirect URLs** — add all of these:
   ```
   https://askindia.shop/**
   https://askindia-marketplace.vercel.app/**
   http://localhost:5173/**
   ```
4. Click **Save**

---

## STEP 6 — Custom Domain Setup (askindia.shop)

### 6.1  Add Domain in Vercel

1. Vercel → your project → **Settings** → **Domains**
2. Click **Add** → type `askindia.shop` → **Add**
3. Also add `www.askindia.shop`
4. Vercel shows you the DNS records needed

### 6.2  Update DNS at Your Domain Registrar

Log in to your domain registrar (GoDaddy / Namecheap / Google Domains etc.) and add:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

> DNS changes take 2–48 hours to propagate worldwide.

### 6.3  Enable HTTPS

Vercel automatically provisions a free SSL certificate via Let's Encrypt once DNS propagates. No action needed.

---

## STEP 7 — Post-Deployment Verification

After the domain is live, test each user role:

### Admin (`admin@askindia.shop`)
- [ ] Login works → redirected to `/admin`
- [ ] Dashboard shows stats
- [ ] Can view stores, users, orders

### Store Owner (`store@demo.com`)
- [ ] Login works → redirected to `/store`
- [ ] Can create a product
- [ ] Store profile page loads (`/store/profile`)
- [ ] Invoice & GST settings section visible

### Service Provider (`provider@demo.com`)
- [ ] Login works → redirected to `/service-provider`
- [ ] Provider profile page loads (`/service-provider/profile`)
- [ ] Can create a service

### Customer (`customer@demo.com`)
- [ ] Login works → redirected to `/shop`
- [ ] Can browse products
- [ ] Customer orders page loads (`/shop/orders`)

### Agent (`agent@demo.com`)
- [ ] Login works → redirected to `/agent`
- [ ] Dashboard shows commission stats

---

## STEP 8 — Enable Supabase Row Level Security

> ✅ RLS is already configured in `schema.sql`. Verify it's active:

1. Supabase Dashboard → **Database** → **Tables**
2. For each table, click it and check **Row Level Security** badge shows **Enabled**
3. All 15 tables should show RLS as enabled

---

## Environment Variables Reference

### Required for Production

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key |

### Optional (add when ready)

| Variable | Integration |
|---|---|
| `VITE_RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard → Account Details |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary → Settings → Upload Presets |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics → Admin → Data Streams |
| `VITE_SENTRY_DSN` | Sentry → Project Settings → Client Keys |

---

## Troubleshooting

### "Invalid API key" on login
→ Double-check `VITE_SUPABASE_ANON_KEY` in Vercel env vars. Must be the `anon public` key, not the service role key.

### Login succeeds but redirects to wrong page
→ The `role` in the `profiles` table isn't set. Run the UPDATE statements from Step 1.4.

### "row-level security policy" error on data fetch
→ The logged-in user's `id` in `auth.users` must match `profiles.id`. This is automatic via the trigger in `schema.sql`.

### App shows mock data instead of Supabase data
→ `isSupabaseConfigured` returns false when `VITE_SUPABASE_URL` is the placeholder value. Make sure the real URL is set in Vercel env vars and redeploy.

### New deployment doesn't pick up env var changes
→ In Vercel, after changing env vars you must **Redeploy** (Deployments tab → three-dot menu → Redeploy) for changes to take effect.

### Supabase free tier limits
- **Database**: 500 MB (enough for 1M+ records)
- **Auth**: 50,000 monthly active users
- **Realtime**: 200 concurrent connections
- **Storage**: 1 GB (we use emoji icons, so no storage used)

---

## Continuous Deployment

Once connected, every `git push origin main` automatically triggers a Vercel rebuild and deployment. No manual steps needed after the initial setup.

```bash
# Typical development workflow after initial deploy:
git add .
git commit -m "feat: add new feature"
git push origin main
# → Vercel deploys automatically in ~60 seconds
```

---

## File Overview

```
ecomvsy/
├── supabase/
│   ├── schema.sql          ← Run first in Supabase SQL editor
│   └── seed.sql            ← Run second (homepage config + demo user setup)
├── src/
│   ├── lib/
│   │   ├── supabase.ts     ← Supabase client (isSupabaseConfigured flag)
│   │   ├── dataService.ts  ← All DB read/write operations
│   │   └── database.types.ts ← TypeScript types matching DB schema
│   ├── hooks/
│   │   └── useSupabaseInit.ts ← Session bootstrap on app load
│   └── store/
│       └── useAppStore.ts  ← Zustand store + loadFromSupabase action
├── .env                    ← Local dev secrets (gitignored)
├── .env.example            ← Template to share with team (committed)
├── .env.production         ← Production defaults (placeholder values, committed)
├── vercel.json             ← SPA routing + security headers + cache rules
└── DEPLOY.md               ← This file
```
