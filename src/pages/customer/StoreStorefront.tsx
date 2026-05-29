import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../data/mockData';
import type { Product } from '../../types';
import {
  ArrowLeft, ShoppingBag, ShoppingCart, User, AlertTriangle,
  Store as StoreIcon, Globe, Instagram, Facebook, MessageCircle,
  LayoutGrid, List, Megaphone, Share2, Star,
} from 'lucide-react';
import { QRCanvas, StoreShareModal } from '../../components/ui/StoreShareModal';
import { BottomNav } from '../../components/layout/BottomNav';
import clsx from 'clsx';

export const StoreStorefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { stores, products, cart, addToCart, currentUser } = useAppStore();

  const [addedId, setAddedId] = useState<string | null>(null);
  const [layoutOverride, setLayoutOverride] = useState<'grid' | 'list' | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);

  const store = stores.find(s => s.slug === slug || s.subdomain === slug);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const custom = store?.customization;
  const layout = layoutOverride ?? custom?.layoutStyle ?? 'grid';

  // ── All useMemo hooks MUST be before any early returns (Rules of Hooks) ──────
  const allActiveProducts = useMemo(
    () => products.filter(p => p.status === 'active' && (!store || true)),
    [products]
  );
  const pinnedIds = custom?.featuredProductIds ?? [];
  const sorted = useMemo(() => {
    if (!store) return allActiveProducts;
    const pinned = pinnedIds.map(id => allActiveProducts.find(p => p.id === id)).filter(Boolean) as Product[];
    const rest = allActiveProducts.filter(p => !pinnedIds.includes(p.id));
    return [...pinned, ...rest];
  }, [allActiveProducts, pinnedIds, store]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const discount = (p: Product) =>
    p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  // ── Store not found ─────────────────────────────────────────────────────────
  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-sm text-slate-400">Store</span>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <StoreIcon className="h-10 w-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Store Not Found</h1>
            <p className="text-slate-500 mb-6">
              The store <span className="font-mono font-medium text-slate-700">{slug}.askindia.shop</span> doesn't exist or has been removed.
            </p>
            <button onClick={() => navigate('/shop')} className="btn-primary">Browse All Products</button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Store unavailable ───────────────────────────────────────────────────────
  if (store.status === 'pending' || store.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-sm font-medium text-slate-700">{store.name}</span>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Store Temporarily Unavailable</h1>
            <p className="text-slate-500 mb-2">
              <strong>{store.name}</strong> is currently{' '}
              {store.status === 'pending' ? 'awaiting activation' : 'suspended'}.
            </p>
            <p className="text-sm text-slate-400 mb-6">Please check back later.</p>
            <button onClick={() => navigate('/shop')} className="btn-primary">Browse Other Products</button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Active store ────────────────────────────────────────────────────────────
  const categories = Array.from(new Set(sorted.map(p => p.category)));

  const displayed = sorted.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const storeFullUrl = `${window.location.origin}/shop/store/${store.slug}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/shop" className="hover:text-slate-800 transition-colors">Shop</Link>
          <span>/</span>
          <Link to="/shop/stores" className="hover:text-slate-800 transition-colors">Stores</Link>
          <span>/</span>
          <span className="font-medium text-slate-800 truncate max-w-[120px]">{store.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/shop/cart')}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/shop/account')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Announcement bar ── */}
      {custom?.announcement && (
        <div
          className="px-4 py-2 text-xs text-white font-medium text-center"
          style={{ background: store.themeColor }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="h-3 w-3 opacity-80" />
            {custom.announcement}
          </span>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${store.themeColor}, ${store.themeColor}cc)` }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)',
        }} />

        <div className="relative px-4 sm:px-8 py-10 sm:py-14">
          <div className="max-w-2xl flex items-start gap-5 flex-wrap">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {store.logo}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">
                {custom?.bannerHeadline || store.name}
              </h1>
              <p className="text-white/80 text-sm sm:text-base mb-3">
                {custom?.bannerSubtext || store.tagline}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Share2 className="h-3 w-3" />
                  Share Store
                </button>
                <span className="flex items-center gap-1 text-xs bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-2.5 py-1 rounded-lg font-medium">
                  <span>✓</span> Verified Store
                </span>
                {custom?.customBadge && (
                  <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-lg font-medium">
                    {custom.customBadge}
                  </span>
                )}
              </div>

              {/* Social links */}
              {(custom?.socialWhatsapp || custom?.socialInstagram || custom?.socialFacebook || custom?.socialWebsite) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {custom.socialWhatsapp && (
                    <a
                      href={`https://wa.me/${custom.socialWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  {custom.socialInstagram && (
                    <a
                      href={`https://instagram.com/${custom.socialInstagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  )}
                  {custom.socialFacebook && (
                    <a
                      href={custom.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                  {custom.socialWebsite && (
                    <a
                      href={custom.socialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* QR code */}
            {custom?.showQr !== false && (
              <button
                onClick={() => setShowShareModal(true)}
                className="hidden sm:flex flex-col items-center gap-1 ml-auto flex-shrink-0 group"
              >
                <div className="bg-white rounded-xl p-2 shadow-lg group-hover:scale-105 transition-transform">
                  <QRCanvas value={storeFullUrl} size={80} />
                </div>
                <p className="text-white/60 text-[10px] text-center">Tap to share</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Products Section ── */}
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24">
        {/* Toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Products</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {displayed.length} of {allActiveProducts.length} item{allActiveProducts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.city && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                Shipping to {currentUser.city}
              </span>
            )}
            {/* Layout toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setLayoutOverride('grid')}
                className={clsx('p-1.5 rounded-md transition-colors', layout === 'grid' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayoutOverride('list')}
                className={clsx('p-1.5 rounded-md transition-colors', layout === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <input
              className="input pl-8 text-sm"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input max-w-[160px] text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {displayed.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-semibold text-slate-700 text-lg mb-1">No products found</p>
            <p className="text-slate-400 text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : layout === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="space-y-3">
            {displayed.map(product => {
              const disc = discount(product);
              const isAvailable = !currentUser?.city ||
                product.availableCities.length === 0 ||
                product.availableCities.includes(currentUser.city);
              const isPinned = pinnedIds.includes(product.id);

              return (
                <Link
                  key={product.id}
                  to={`/shop/product/${product.id}`}
                  className={clsx(
                    'card flex items-center gap-4 p-3 hover:shadow-md transition-all duration-200 block',
                    !isAvailable && 'opacity-70'
                  )}
                >
                  <div className={clsx('h-20 w-20 rounded-xl bg-gradient-to-br flex items-center justify-center text-3xl flex-shrink-0 relative', product.imageColor)}>
                    {isPinned && <span className="absolute -top-1 -left-1 text-[10px] bg-amber-400 text-white px-1 rounded-full">★</span>}
                    {product.imageIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate">{product.category}</p>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{product.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-base font-bold text-slate-900">{formatCurrency(product.price)}</span>
                      {disc > 0 && <span className="text-xs text-slate-400 line-through">{formatCurrency(product.mrp)}</span>}
                      {disc > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">-{disc}%</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); if (isAvailable) handleAddToCart(product); }}
                    disabled={!isAvailable}
                    className={clsx(
                      'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                      !isAvailable ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : addedId === product.id ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    {!isAvailable ? 'N/A' : addedId === product.id ? '✓' : 'Add'}
                  </button>
                </Link>
              );
            })}
          </div>
        ) : layout === 'magazine' ? (
          /* ── MAGAZINE VIEW ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayed.map((product, idx) => {
              const disc = discount(product);
              const isAvailable = !currentUser?.city ||
                product.availableCities.length === 0 ||
                product.availableCities.includes(currentUser.city);
              const isPinned = pinnedIds.includes(product.id);
              const isHero = idx === 0;

              return (
                <Link
                  key={product.id}
                  to={`/shop/product/${product.id}`}
                  className={clsx(
                    'card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block',
                    isHero && 'col-span-2 sm:col-span-1 sm:row-span-2',
                    !isAvailable && 'opacity-70'
                  )}
                >
                  <div className={clsx('bg-gradient-to-br flex items-center justify-center relative', product.imageColor, isHero ? 'h-52 text-6xl' : 'h-32 text-4xl')}>
                    {isPinned && <span className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">⭐ Pinned</span>}
                    {disc > 0 && <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Not in your city</span>
                      </div>
                    )}
                    {product.imageIcon}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">{formatCurrency(product.price)}</span>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); if (isAvailable) handleAddToCart(product); }}
                        disabled={!isAvailable}
                        className={clsx(
                          'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          !isAvailable ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : addedId === product.id ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        )}
                      >
                        {addedId === product.id ? '✓' : '+ Cart'}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── GRID VIEW (default) ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayed.map(product => {
              const disc = discount(product);
              const isAvailable = !currentUser?.city ||
                product.availableCities.length === 0 ||
                product.availableCities.includes(currentUser.city);
              const isPinned = pinnedIds.includes(product.id);

              return (
                <Link
                  key={product.id}
                  to={`/shop/product/${product.id}`}
                  className={clsx(
                    'card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block',
                    !isAvailable && 'opacity-70'
                  )}
                >
                  <div className={clsx('h-36 sm:h-40 bg-gradient-to-br flex items-center justify-center text-4xl sm:text-5xl relative', product.imageColor)}>
                    {isPinned && (
                      <span className="absolute top-2 left-2 bg-amber-400/90 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ⭐ Featured
                      </span>
                    )}
                    {disc > 0 && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        -{disc}%
                      </span>
                    )}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Not in your city</span>
                      </div>
                    )}
                    {product.imageIcon}
                  </div>

                  <div className="p-3">
                    <p className="text-[10px] text-slate-400 mb-0.5 truncate">{product.category}</p>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1.5 line-clamp-2">
                      {product.name}
                    </h3>

                    {product.sold > 0 && (
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={clsx('h-2.5 w-2.5', i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')}
                          />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-0.5">({product.sold})</span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-1.5 mb-2.5">
                      <span className="text-base font-bold text-slate-900">{formatCurrency(product.price)}</span>
                      {disc > 0 && <span className="text-xs text-slate-400 line-through">{formatCurrency(product.mrp)}</span>}
                    </div>

                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); if (isAvailable) handleAddToCart(product); }}
                      disabled={!isAvailable}
                      className={clsx(
                        'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                        !isAvailable
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : addedId === product.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                      )}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {!isAvailable ? 'Unavailable' : addedId === product.id ? 'Added!' : 'Add to Cart'}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />

      <StoreShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        storeUrl={storeFullUrl}
        storeName={store.name}
        storeSlug={store.slug}
      />
    </div>
  );
};
