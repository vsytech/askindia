import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Store, ShoppingCart, Shield, Briefcase, Zap } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AskIndiaLogo } from '../../components/AskIndiaLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../lib/dataService';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@askindia.shop',
    password: 'admin@askindia',
    desc: 'Full platform control',
    icon: '🛡️',
    color: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
    badge: 'bg-slate-700 text-white',
  },
  {
    role: 'Store Owner',
    email: 'store@demo.com',
    password: 'Demo@1234',
    desc: 'Manage store & orders',
    icon: '🏪',
    color: 'border-brand-200 hover:border-brand-400 hover:bg-brand-50',
    badge: 'bg-brand-600 text-white',
  },
  {
    role: 'Service Provider',
    email: 'provider@demo.com',
    password: 'Demo@1234',
    desc: 'List & manage services',
    icon: '🛠️',
    color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    badge: 'bg-violet-600 text-white',
  },
  {
    role: 'Customer',
    email: 'customer@demo.com',
    password: 'Demo@1234',
    desc: 'Browse & shop products',
    icon: '🛒',
    color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    badge: 'bg-emerald-600 text-white',
  },
  {
    role: 'Agent',
    email: 'agent@demo.com',
    password: 'Demo@1234',
    desc: 'Sell products, earn commission',
    icon: '🤝',
    color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    badge: 'bg-orange-600 text-white',
  },
] as const;

const FEATURES = [
  { icon: '🏪', title: 'Open a Store', desc: 'Launch a branded storefront in minutes' },
  { icon: '🛠️', title: 'List Services', desc: 'Offer local services to your city' },
  { icon: '🛒', title: 'Shop & Discover', desc: 'Products & services tailored to you' },
];

const navigateByRole = (role: string, navigate: ReturnType<typeof useNavigate>) => {
  if (role === 'admin')             navigate('/admin');
  else if (role === 'store_owner')  navigate('/store');
  else if (role === 'service_provider') navigate('/service-provider');
  else if (role === 'agent')        navigate('/agent');
  else                              navigate('/shop');
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, setCurrentUser, loadFromSupabase, trackActivity } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setIsLoading(true);

    if (isSupabaseConfigured) {
      // Supabase mode — use real auth
      const result = await authService.signIn(demoEmail, demoPassword);
      setIsLoading(false);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        await loadFromSupabase(result.user.id, result.user.role, result.user.storeId ?? null);
        navigateByRole(result.user.role, navigate);
      } else {
        setError(result.error ?? 'Demo login failed.');
      }
    } else {
      // Mock mode — use local Zustand auth
      await new Promise(r => setTimeout(r, 500));
      const result = login(demoEmail, demoPassword);
      setIsLoading(false);
      if (result.success) {
        const { currentUser } = useAppStore.getState();
        navigateByRole(currentUser?.role ?? 'customer', navigate);
      } else {
        setError(result.error ?? 'Demo login failed.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }

    setError('');
    setIsLoading(true);

    if (isSupabaseConfigured) {
      // Supabase mode
      const result = await authService.signIn(email.trim(), password);
      setIsLoading(false);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        await loadFromSupabase(result.user.id, result.user.role, result.user.storeId ?? null);
        trackActivity('login', { method: 'email', role: result.user.role }, '/login');
        navigateByRole(result.user.role, navigate);
      } else {
        setError(result.error ?? 'Login failed. Please check your credentials.');
      }
    } else {
      // Mock mode
      await new Promise(r => setTimeout(r, 800));
      const result = login(email.trim(), password);
      setIsLoading(false);
      if (result.success) {
        const { currentUser } = useAppStore.getState();
        trackActivity('login', { method: 'email', role: currentUser?.role ?? '' }, '/login');
        navigateByRole(currentUser?.role ?? 'customer', navigate);
      } else {
        setError(result.error ?? 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #0d1f6e 0%, #1a3baa 60%, #0d1f6e 100%)' }}>
        <div className="flex items-center gap-3">
          <AskIndiaLogo size={38} showText={true} textClass="text-xl" className="brightness-0 invert" />
        </div>

        <div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            India's Unified<br />
            <span className="text-brand-300">Marketplace</span>
          </h2>
          <p className="text-brand-200 text-sm leading-relaxed mb-8">
            Products from verified stores, services from trusted providers — all in your city.
          </p>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-xl p-3.5">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-brand-200 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-400 text-xs">© 2024 AskIndia Technologies Pvt. Ltd.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <AskIndiaLogo size={32} showText={true} textClass="text-lg" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in to your account</h1>
          <p className="text-slate-500 text-sm mb-8">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="input pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Register section */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">New to AskIndia?</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Link
                to="/register/store-owner"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all group text-center"
              >
                <div className="w-9 h-9 bg-brand-100 group-hover:bg-brand-200 rounded-xl flex items-center justify-center transition-colors">
                  <Store className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Open a Store</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sell products</p>
                </div>
              </Link>

              <Link
                to="/register/service-provider"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group text-center"
              >
                <div className="w-9 h-9 bg-violet-100 group-hover:bg-violet-200 rounded-xl flex items-center justify-center transition-colors">
                  <Briefcase className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">List Services</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Offer skills</p>
                </div>
              </Link>

              <Link
                to="/register/customer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group text-center"
              >
                <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Shop Now</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Buy products</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Try Demo Accounts
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  onClick={() => handleDemoLogin(acc.email, acc.password)}
                  disabled={isLoading}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${acc.color}`}
                >
                  <span className="text-xl flex-shrink-0">{acc.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{acc.role}</p>
                    <p className="text-[10px] text-slate-400 truncate">{acc.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-xs text-amber-700 font-semibold mb-1.5">Demo credentials</p>
              <div className="space-y-0.5">
                {DEMO_ACCOUNTS.map(acc => (
                  <div key={acc.role} className="flex items-center gap-2 text-xs text-amber-800">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${acc.badge}`}>{acc.role}</span>
                    <span className="font-mono truncate">{acc.email}</span>
                    <span className="text-amber-500">·</span>
                    <span className="font-mono text-amber-600">{acc.password}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
