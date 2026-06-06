import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../data/mockData';
import {
  ArrowLeft, Star, MapPin, ShoppingCart, Zap, Check,
  ChevronLeft, ChevronRight, Shield, RotateCcw, Package,
} from 'lucide-react';
import clsx from 'clsx';

const TABS = ['Description', 'Specifications', 'Warranty & Returns'] as const;
type Tab = typeof TABS[number];

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, currentUser, addToCart } = useAppStore();

  const product = products.find(p => p.id === id);

  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('Description');
  const [addedToCart, setAddedToCart] = useState(false);

  const shopPath = currentUser?.role === 'customer' ? '/shop' : currentUser ? '/shop' : '/';

  if (!product) {
    return (
      <AppLayout title="Product Not Found">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Product Not Found</h2>
          <p className="text-slate-400 mb-6">This product does not exist or has been removed.</p>
          <button onClick={() => navigate(shopPath)} className="btn-primary flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </button>
        </div>
      </AppLayout>
    );
  }

  const hasImages = product.images && product.images.length > 0;
  const isAvailable = !currentUser?.city || product.availableCities.length === 0 || product.availableCities.includes(currentUser.city);
  const isOutOfStock = product.status === 'out_of_stock' || product.stock === 0;
  const canAdd = isAvailable && !isOutOfStock;

  const disc = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const rating = Math.min(5, Math.max(3, 3 + product.sold / 200));
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  const relatedProducts = products.filter(
    p => p.categoryId === product.categoryId && p.id !== product.id && p.status === 'active'
  ).slice(0, 4);

  const handleAddToCart = () => {
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.role !== 'customer' || !canAdd) return;
    addToCart(product, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleBuyNow = () => {
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.role !== 'customer' || !canAdd) return;
    addToCart(product, qty);
    navigate('/shop/cart');
  };

  const changeQty = (delta: number) => {
    setQty(prev => Math.min(product.stock, Math.max(1, prev + delta)));
  };

  return (
    <AppLayout title="Product Details">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
          <Link to={shopPath} className="hover:text-brand-600 transition-colors">All Products</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-slate-500">{product.category}</span>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-slate-700 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* LEFT — Image gallery (sticky on desktop) */}
          <div className="w-full lg:w-[55%] lg:sticky lg:top-4">
            {hasImages ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100">
                  <img
                    src={product.images![selectedImg]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.featured && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  {disc > 0 && (
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      -{disc}%
                    </span>
                  )}
                  {product.images!.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImg(i => Math.max(0, i - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-700" />
                      </button>
                      <button
                        onClick={() => setSelectedImg(i => Math.min(product.images!.length - 1, i + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-700" />
                      </button>
                    </>
                  )}
                </div>
                {product.images!.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {product.images!.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImg(i)}
                        className={clsx(
                          'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                          selectedImg === i ? 'border-brand-500' : 'border-transparent hover:border-slate-300'
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden">
                <div className={clsx(
                  'h-80 sm:h-96 bg-gradient-to-br flex items-center justify-center text-9xl',
                  product.imageColor
                )}>
                  {product.imageIcon}
                  {product.featured && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  {disc > 0 && (
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      -{disc}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Product info */}
          <div className="w-full lg:w-[45%] space-y-5">

            {/* Badge row */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 rounded-full">
                {product.category}
              </span>
              {product.brand && (
                <span className="inline-flex items-center text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {product.brand}
                </span>
              )}
              {product.status === 'out_of_stock' && (
                <span className="inline-flex items-center text-xs font-semibold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating row */}
            {product.sold > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={clsx(
                        'h-4 w-4',
                        i < fullStars
                          ? 'fill-amber-400 text-amber-400'
                          : i === fullStars && hasHalf
                            ? 'fill-amber-200 text-amber-400'
                            : 'fill-slate-200 text-slate-200'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({product.sold} sold)</span>
              </div>
            )}

            {/* Price row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold text-slate-900">{formatCurrency(product.price)}</span>
              {disc > 0 && (
                <>
                  <span className="text-lg text-slate-400 line-through">{formatCurrency(product.mrp)}</span>
                  <span className="text-sm font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg">
                    {disc}% off
                  </span>
                </>
              )}
            </div>

            {/* Availability */}
            <div className={clsx(
              'flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg w-fit',
              isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            )}>
              <MapPin className="h-4 w-4 flex-shrink-0" />
              {product.availableCities.length === 0
                ? 'Available Nationwide'
                : isAvailable
                  ? `Available in: ${product.availableCities.slice(0, 3).join(', ')}${product.availableCities.length > 3 ? ` +${product.availableCities.length - 3} more` : ''}`
                  : `Not available in ${currentUser?.city}`
              }
            </div>

            {/* Quantity selector */}
            {canAdd && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Quantity:</span>
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => changeQty(-1)}
                    disabled={qty <= 1}
                    className="w-9 h-9 rounded-l-lg border border-r-0 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    max={product.stock}
                    onChange={e => {
                      const v = Math.min(product.stock, Math.max(1, Number(e.target.value) || 1));
                      setQty(v);
                    }}
                    className="w-14 h-9 border border-slate-200 text-center text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
                  />
                  <button
                    onClick={() => changeQty(1)}
                    disabled={qty >= product.stock}
                    className="w-9 h-9 rounded-r-lg border border-l-0 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400">{product.stock} available</span>
              </div>
            )}

            {/* Action buttons — guests see a sign-in prompt */}
            {!currentUser ? (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-5 text-center space-y-3">
                <p className="text-sm font-medium text-brand-700">Sign in to add this product to your cart or buy now</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate('/login')} className="btn-primary px-6 py-2.5 text-sm">
                    Sign In
                  </button>
                  <button onClick={() => navigate('/register/customer')} className="btn-secondary px-6 py-2.5 text-sm">
                    Create Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!canAdd}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150',
                    !canAdd
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : addedToCart
                        ? 'bg-emerald-600 text-white'
                        : 'btn-primary'
                  )}
                >
                  {addedToCart ? (
                    <><Check className="h-4 w-4" /> Added to Cart!</>
                  ) : (
                    <><ShoppingCart className="h-4 w-4" /> {canAdd ? 'Add to Cart' : isOutOfStock ? 'Out of Stock' : 'Unavailable'}</>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!canAdd}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150',
                    !canAdd ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-secondary'
                  )}
                >
                  <Zap className="h-4 w-4" />
                  Buy Now
                </button>
              </div>
            )}

            {/* Highlights */}
            {product.highlights && product.highlights.length > 0 && (
              <div className="card p-4 space-y-2.5">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-brand-600" /> Highlights
                </h3>
                <ul className="space-y-1.5">
                  {product.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabs */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-slate-100">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'flex-1 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap px-2',
                      activeTab === tab
                        ? 'text-brand-700 border-b-2 border-brand-600 bg-brand-50/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {activeTab === 'Description' && (
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                )}
                {activeTab === 'Specifications' && (
                  product.specifications && product.specifications.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      {product.specifications.map((spec, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'flex gap-3 px-4 py-2.5 text-sm',
                            i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                          )}
                        >
                          <span className="w-40 flex-shrink-0 font-medium text-slate-500">{spec.key}</span>
                          <span className="text-slate-800">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No specifications available.</p>
                  )
                )}
                {activeTab === 'Warranty & Returns' && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4.5 w-4.5 text-brand-600 h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 mb-0.5">Warranty</p>
                        <p className="text-sm text-slate-500">{product.warranty || 'No warranty information available.'}</p>
                      </div>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 mb-0.5">Return Policy</p>
                        <p className="text-sm text-slate-500">{product.returnPolicy || 'No return policy available.'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-slate-900">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map(p => {
                const rDisc = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/shop/product/${p.id}`}
                    className="card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block"
                  >
                    <div className={clsx('h-28 bg-gradient-to-br flex items-center justify-center text-4xl relative', p.imageColor)}>
                      {rDisc > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          -{rDisc}%
                        </span>
                      )}
                      {p.imageIcon}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-800 text-xs leading-tight mb-1.5 line-clamp-2">{p.name}</h3>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(p.price)}</span>
                        {rDisc > 0 && (
                          <span className="text-xs text-slate-400 line-through">{formatCurrency(p.mrp)}</span>
                        )}
                      </div>
                      <span className="mt-2 block text-center text-xs py-1.5 rounded-lg bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-colors">
                        View Product
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
