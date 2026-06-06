import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { PRODUCT_CATEGORIES, formatCurrency } from '../../data/mockData';
import { useAppStore } from '../../store/useAppStore';
import { Search, ShoppingCart, Star, X, MapPin, SlidersHorizontal, Filter, Eye } from 'lucide-react';
import type { Product } from '../../types';
import clsx from 'clsx';

type SortOption = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'discount';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Best Discount' },
];

const PRICE_PRESETS = [
  { label: 'Under ₹500', max: 500 },
  { label: 'Under ₹1k', max: 1000 },
  { label: 'Under ₹2k', max: 2000 },
  { label: 'Under ₹5k', max: 5000 },
];

export const CustomerStorefront: React.FC = () => {
  const { products, currentUser, addToCart } = useAppStore();
  const [searchParams] = useSearchParams();
  const isCustomer = currentUser?.role === 'customer';

  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Pre-select category from URL param (?cat=categoryId)
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) setSelectedCats([cat]);
  }, [searchParams]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [availFilter, setAvailFilter] = useState<'all' | 'available'>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const isAvailable = (p: Product) =>
    !currentUser?.city || p.availableCities.length === 0 || p.availableCities.includes(currentUser.city);

  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);

  const filtered = useMemo(() => {
    return activeProducts
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
      .filter(p => selectedCats.length === 0 || selectedCats.includes(p.categoryId))
      .filter(p => !priceMin || p.price >= Number(priceMin))
      .filter(p => !priceMax || p.price <= Number(priceMax))
      .filter(p => !featuredOnly || p.featured)
      .filter(p => availFilter === 'all' || isAvailable(p))
      .sort((a, b) => {
        switch (sortBy) {
          case 'featured': return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'price_asc': return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'popular': return b.sold - a.sold;
          case 'discount':
            return ((b.mrp - b.price) / (b.mrp || 1)) - ((a.mrp - a.price) / (a.mrp || 1));
          default: return 0;
        }
      });
  }, [activeProducts, search, selectedCats, priceMin, priceMax, sortBy, availFilter, featuredOnly]);

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const clearAll = () => {
    setSearch('');
    setSelectedCats([]);
    setPriceMin('');
    setPriceMax('');
    setSortBy('featured');
    setAvailFilter('all');
    setFeaturedOnly(false);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const discount = (p: Product) =>
    p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  const activeChips = [
    ...selectedCats.map(id => ({
      label: PRODUCT_CATEGORIES.find(c => c.id === id)?.name ?? id,
      onRemove: () => toggleCat(id),
    })),
    ...(priceMin ? [{ label: `Min ₹${priceMin}`, onRemove: () => setPriceMin('') }] : []),
    ...(priceMax ? [{ label: `Max ₹${priceMax}`, onRemove: () => setPriceMax('') }] : []),
    ...(featuredOnly ? [{ label: 'Featured Only', onRemove: () => setFeaturedOnly(false) }] : []),
    ...(availFilter === 'available' ? [{ label: `In ${currentUser?.city ?? 'my city'}`, onRemove: () => setAvailFilter('all') }] : []),
  ];

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</h3>
          {selectedCats.length > 0 && (
            <button onClick={() => setSelectedCats([])} className="text-xs text-brand-600 font-medium hover:text-brand-800">
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1">
          {PRODUCT_CATEGORIES.map(cat => (
            <label
              key={cat.id}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm select-none',
                selectedCats.includes(cat.id)
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <input
                type="checkbox"
                checked={selectedCats.includes(cat.id)}
                onChange={() => toggleCat(cat.id)}
                className="rounded border-slate-300 text-brand-600 w-4 h-4 flex-shrink-0"
              />
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="truncate">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Price Range */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Price Range</h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              className="input pl-7 text-sm py-2 w-full"
              min="0"
            />
          </div>
          <span className="text-slate-300 font-medium">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              className="input pl-7 text-sm py-2 w-full"
              min="0"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map(p => (
            <button
              key={p.max}
              onClick={() => { setPriceMin(''); setPriceMax(String(p.max)); }}
              className={clsx(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                priceMax === String(p.max) && !priceMin
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-slate-200 text-slate-600 hover:border-brand-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Availability */}
      {currentUser?.city && (
        <>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Availability</h3>
            <div className="space-y-1">
              {([
                { value: 'all', label: 'All Products' },
                { value: 'available', label: `In ${currentUser.city} only` },
              ] as const).map(opt => (
                <label
                  key={opt.value}
                  className={clsx(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm select-none',
                    availFilter === opt.value
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <input
                    type="radio"
                    name="avail"
                    checked={availFilter === opt.value}
                    onChange={() => setAvailFilter(opt.value)}
                    className="border-slate-300 text-brand-600 w-4 h-4 flex-shrink-0"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="h-px bg-slate-100" />
        </>
      )}

      {/* Other */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Other</h3>
        <label className={clsx(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm select-none',
          featuredOnly ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-600'
        )}>
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={e => setFeaturedOnly(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 w-4 h-4 flex-shrink-0"
          />
          ⭐ Featured products only
        </label>
      </div>

      {activeChips.length > 0 && (
        <>
          <div className="h-px bg-slate-100" />
          <button
            onClick={clearAll}
            className="w-full text-sm text-slate-400 hover:text-red-500 transition-colors py-1 text-center"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );

  return (
    <AppLayout title="All Products">
      <div className="space-y-4">

        {/* Search + Sort + Filter toggle */}
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9 pr-9"
              placeholder="Search by product name or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="input w-auto text-sm hidden sm:block"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-shrink-0',
              showFilters || activeChips.length > 0
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden xs:inline">Filters</span>
            {activeChips.length > 0 && (
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full font-bold',
                activeChips.length > 0 ? 'bg-white text-brand-600' : 'bg-brand-500 text-white'
              )}>
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {/* Sort (mobile only) */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
          className="input w-full text-sm sm:hidden"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400 font-medium">Active:</span>
            {activeChips.map(chip => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {chip.label}
                <button onClick={chip.onRemove} className="hover:text-brand-900 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Main layout: sidebar + grid */}
        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 xl:w-60 flex-shrink-0 card p-5 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                Filters
              </h2>
              {activeChips.length > 0 && (
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {activeChips.length}
                </span>
              )}
            </div>
            <FilterSidebar />
          </aside>

          {/* Mobile filter drawer */}
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl overflow-y-auto">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </h2>
                    <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-700 p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <FilterSidebar />
                  <button
                    onClick={() => setShowFilters(false)}
                    className="mt-6 w-full btn-primary justify-center py-3 text-base"
                  >
                    Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{filtered.length}</span>
                {' '}of{' '}
                <span className="font-medium">{activeProducts.length}</span> products
              </p>
              {currentUser?.city && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Shipping to <strong>{currentUser.city}</strong></span>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="py-24 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-semibold text-slate-700 text-lg mb-1">No products found</p>
                <p className="text-slate-400 text-sm">
                  {activeProducts.length === 0
                    ? 'No products have been listed yet — check back soon!'
                    : 'Try adjusting your filters or search term.'}
                </p>
                {activeChips.length > 0 && (
                  <button onClick={clearAll} className="btn-primary mt-6">
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filtered.map(product => {
                  const available = isAvailable(product);
                  const disc = discount(product);
                  return (
                    <Link
                      key={product.id}
                      to={`/shop/product/${product.id}`}
                      className={clsx(
                        'card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block',
                        !available && 'opacity-70'
                      )}
                    >
                      <div className={clsx('h-40 bg-gradient-to-br flex items-center justify-center text-5xl relative', product.imageColor)}>
                        {product.featured && (
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            ⭐ Featured
                          </span>
                        )}
                        {disc > 0 && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            -{disc}%
                          </span>
                        )}
                        {!available && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        {product.imageIcon}
                      </div>

                      <div className="p-4">
                        <p className="text-xs text-slate-400 mb-0.5 truncate">{product.category}</p>
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1.5 line-clamp-2">
                          {product.name}
                        </h3>

                        {product.sold > 0 && (
                          <div className="flex items-center gap-0.5 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={clsx('h-3 w-3', i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')}
                              />
                            ))}
                            <span className="text-xs text-slate-400 ml-1">({product.sold} sold)</span>
                          </div>
                        )}

                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-lg font-bold text-slate-900">{formatCurrency(product.price)}</span>
                          {disc > 0 && (
                            <span className="text-xs text-slate-400 line-through">{formatCurrency(product.mrp)}</span>
                          )}
                        </div>

                        {isCustomer ? (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); available && handleAddToCart(product); }}
                            disabled={!available}
                            className={clsx(
                              'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
                              !available
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : addedId === product.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                            )}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {!available ? 'Out of Stock' : addedId === product.id ? 'Added to Cart!' : 'Add to Cart'}
                          </button>
                        ) : (
                          <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                            <Eye className="h-4 w-4" />
                            View Details
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
