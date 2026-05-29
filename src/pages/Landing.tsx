import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Search, ChevronDown, ArrowRight, Star,
  ShoppingBag, Store, Briefcase, CheckCircle, Truck, Shield, Headphones,
  LogIn, X, Package, ChevronLeft, ChevronRight, Zap, TrendingUp, Award,
  Heart, Flame, Home, LayoutGrid, User, SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTracking } from '../hooks/useTracking';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES, formatCurrency } from '../data/mockData';
import type { Product, Service } from '../types';
import { AskIndiaLogo } from '../components/AskIndiaLogo';
import { env } from '../utils/env';
import clsx from 'clsx';

/* ── Constants ────────────────────────────────────────────────────────────── */
const CITIES = [
  'Mumbai','Delhi','Bengaluru','Hyderabad','Ahmedabad','Chennai',
  'Kolkata','Pune','Jaipur','Surat','Lucknow','Kanpur','Nagpur',
  'Indore','Bhopal','Visakhapatnam','Patna','Vadodara','Ghaziabad',
  'Ludhiana','Agra','Nashik','Faridabad','Meerut','Rajkot',
  'Varanasi','Amritsar','Coimbatore','Madurai','Kochi',
];

const TRUST_BADGES = [
  { icon: Truck,      label: 'Free Delivery',    desc: 'Orders above ₹999',  color: 'text-sky-600',     bg: 'bg-sky-50'     },
  { icon: Shield,     label: 'Secure Payments',  desc: 'UPI, Cards & COD',   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Headphones, label: '24/7 Support',     desc: 'Always here for you',color: 'text-violet-600',  bg: 'bg-violet-50'  },
  { icon: Award,      label: 'Verified Sellers', desc: 'KYC approved',       color: 'text-accent-600',  bg: 'bg-orange-50'  },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const getRating = (id: string) => (3.8 + (id.split('').reduce((a,c) => a+c.charCodeAt(0),0) % 12)/10).toFixed(1);
const getReviews = (id: string) => 100 + (id.split('').reduce((a,c) => a+c.charCodeAt(0),0) % 1900);
const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-600','bg-amber-500','bg-rose-500','bg-cyan-600','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

/* ── Hero Slider ──────────────────────────────────────────────────────────── */
const HeroSlider: React.FC<{ onShop: () => void }> = ({ onShop }) => {
  const { homepageConfig, currentUser } = useAppStore();
  const navigate = useNavigate();
  const slides = (homepageConfig.heroSlides ?? []).filter(s => s.isActive);
  const [cur, setCur] = useState(0);
  const [tx, setTx] = useState(false);
  const touchX = useRef<number|null>(null);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);

  const goTo = useCallback((i:number) => {
    if (tx || slides.length<=1) return;
    setTx(true); setCur(i); setTimeout(()=>setTx(false),400);
  },[tx,slides.length]);
  const next = useCallback(()=>goTo((cur+1)%slides.length),[goTo,cur,slides.length]);
  const prev = useCallback(()=>goTo((cur-1+slides.length)%slides.length),[goTo,cur,slides.length]);

  React.useEffect(()=>{
    if(slides.length<=1) return;
    timer.current = setInterval(next,5000);
    return ()=>{if(timer.current) clearInterval(timer.current);};
  },[next,slides.length]);

  const p2g=(fn:()=>void)=>{if(timer.current)clearInterval(timer.current);fn();timer.current=setInterval(next,5000);};

  const ctaClick=(link:string)=>{
    if(currentUser){
      const r=currentUser.role;
      if(r==='customer') navigate('/shop');
      else if(r==='admin') navigate('/admin');
      else if(r==='store_owner') navigate('/store');
      else if(r==='service_provider') navigate('/service-provider');
      else navigate('/agent');
    } else navigate(link);
  };

  if(!slides.length) return null;
  const sl=slides[cur];
  return (
    <section className="relative overflow-hidden" style={{minHeight:'420px'}}
      onTouchStart={e=>{touchX.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{
        if(touchX.current===null) return;
        const d=touchX.current-e.changedTouches[0].clientX;
        if(Math.abs(d)>50) d>0?p2g(next):p2g(prev);
        touchX.current=null;
      }}
    >
      <div className="absolute inset-0 transition-all duration-700"
        style={{background:`linear-gradient(135deg,${sl.gradientFrom} 0%,${sl.gradientTo} 100%)`}}/>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{background:'radial-gradient(circle,white 0%,transparent 70%)',transform:'translate(30%,-30%)'}}/>
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
        style={{background:'radial-gradient(circle,white 0%,transparent 70%)',transform:'translate(-30%,30%)'}}/>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className={clsx('flex-1 text-center lg:text-left transition-opacity duration-300',tx?'opacity-0':'opacity-100')}>
            {sl.badge && (
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 text-sm text-white font-medium mb-4">
                <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse"/>
                {sl.badge}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 whitespace-pre-line">{sl.title}</h1>
            <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">{sl.subtitle}</p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              <button onClick={()=>ctaClick(sl.ctaLink)}
                className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-7 py-3.5 rounded-full transition-all shadow-lg w-full sm:w-auto justify-center text-sm">
                {sl.ctaText} <ArrowRight className="h-4 w-4"/>
              </button>
              {sl.secondaryCtaText && (
                <button onClick={()=>ctaClick(sl.secondaryCtaLink??'/')}
                  className="flex items-center gap-2 bg-white/15 backdrop-blur border border-white/30 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/25 transition-all w-full sm:w-auto justify-center text-sm">
                  {sl.secondaryCtaText}
                </button>
              )}
            </div>
          </div>
          {sl.imageEmoji && (
            <div className={clsx('hidden lg:flex flex-shrink-0 w-52 h-52 items-center justify-center bg-white/10 backdrop-blur rounded-3xl border border-white/20 transition-all duration-300',tx?'opacity-0 scale-95':'opacity-100 scale-100')}>
              <span className="text-8xl">{sl.imageEmoji}</span>
            </div>
          )}
        </div>
        {slides.length>1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {slides.map((_,i)=>(
              <button key={i} onClick={()=>p2g(()=>goTo(i))}
                className={clsx('rounded-full transition-all duration-300',i===cur?'w-8 h-2.5 bg-white':'w-2.5 h-2.5 bg-white/40 hover:bg-white/70')}/>
            ))}
          </div>
        )}
      </div>

      {slides.length>1 && (<>
        <button onClick={()=>p2g(prev)} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-white/20 hover:bg-white/35 backdrop-blur rounded-full text-white transition-all">
          <ChevronLeft className="h-5 w-5"/>
        </button>
        <button onClick={()=>p2g(next)} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-white/20 hover:bg-white/35 backdrop-blur rounded-full text-white transition-all">
          <ChevronRight className="h-5 w-5"/>
        </button>
      </>)}
    </section>
  );
};

/* ── Product Card ─────────────────────────────────────────────────────────── */
const ProductCard: React.FC<{
  product:Product; available:boolean; added:boolean; wishlisted:boolean;
  onAdd:(e:React.MouseEvent)=>void; onClick:()=>void; onWish:(e:React.MouseEvent)=>void;
}> = ({product,available,added,wishlisted,onAdd,onClick,onWish}) => {
  const disc = product.mrp>product.price ? Math.round(((product.mrp-product.price)/product.mrp)*100) : 0;
  return (
    <div onClick={onClick} className={clsx('bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group cursor-pointer',!available&&'opacity-60')}>
      <div className={clsx('relative h-40 sm:h-44 bg-gradient-to-br flex items-center justify-center',product.imageColor)}>
        <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">{product.imageIcon}</span>
        <button onClick={onWish} className={clsx('absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm',wishlisted?'bg-red-500 opacity-100':'bg-white/90 opacity-0 group-hover:opacity-100')}>
          <Heart className={clsx('h-3.5 w-3.5',wishlisted?'fill-white text-white':'text-slate-500')}/>
        </button>
        {disc>0&&available && <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">-{disc}%</span>}
        {product.featured&&available&&!disc && <span className="absolute top-2.5 left-2.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded shadow">⭐ Top Pick</span>}
        {!available && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Out of Stock</span></div>}
      </div>
      <div className="p-3 sm:p-3.5">
        {product.brand && <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5 truncate">{product.brand}</p>}
        <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mb-2 group-hover:text-accent-600 transition-colors min-h-[2.5rem]">{product.name}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-0.5 bg-emerald-500 rounded px-1.5 py-0.5">
            <span className="text-[10px] font-bold text-white leading-none">{getRating(product.id)}</span>
            <Star className="h-2.5 w-2.5 fill-white text-white"/>
          </div>
          <span className="text-[10px] text-slate-400">({getReviews(product.id).toLocaleString()})</span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap mb-3">
          <span className="text-base sm:text-lg font-bold text-slate-900">{formatCurrency(product.price)}</span>
          {product.mrp>product.price && <>
            <span className="text-xs text-slate-400 line-through">{formatCurrency(product.mrp)}</span>
            <span className="text-xs font-bold text-emerald-600">{disc}% off</span>
          </>}
        </div>
        <button onClick={onAdd} disabled={!available} className={clsx('w-full text-xs font-bold py-2.5 rounded-xl transition-all',
          added?'bg-emerald-500 text-white shadow-sm':
          available?'bg-accent-500 text-white hover:bg-accent-600 shadow-sm hover:shadow-md active:scale-95':
          'bg-slate-100 text-slate-400 cursor-not-allowed')}>
          {added?'✓ Added!':available?'Add to Cart':'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

/* ── Service Card ─────────────────────────────────────────────────────────── */
const ServiceCard: React.FC<{service:Service; onCardClick:()=>void}> = ({service,onCardClick}) => {
  const label = service.priceType==='hourly'?'/hr':service.priceType==='starting_from'?' onwards':'';
  const initials = service.providerName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  return (
    <div onClick={onCardClick} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
      <div className={clsx('h-32 bg-gradient-to-br flex items-center justify-center relative',service.imageColor)}>
        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{service.imageIcon}</span>
        <span className="absolute top-2.5 left-2.5 bg-white/90 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">{service.category}</span>
        {service.featured && <span className="absolute top-2.5 right-2.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Top Rated</span>}
      </div>
      <div className="p-3 sm:p-3.5">
        <p className="text-sm font-bold text-slate-800 line-clamp-1 mb-2 group-hover:text-violet-700 transition-colors">{service.title}</p>
        <div className="flex items-center gap-2 mb-2">
          <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',avatarColor(service.providerName))}>{initials}</div>
          <span className="text-xs text-slate-500 truncate flex-1">{service.providerName}</span>
          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5">
            <CheckCircle className="h-2.5 w-2.5"/> PRO
          </span>
        </div>
        {service.rating>0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-0.5 bg-emerald-500 rounded px-1.5 py-0.5">
              <span className="text-[10px] font-bold text-white leading-none">{service.rating.toFixed(1)}</span>
              <Star className="h-2.5 w-2.5 fill-white text-white"/>
            </div>
            {service.reviewCount>0 && <span className="text-[10px] text-slate-400">({service.reviewCount.toLocaleString()})</span>}
            <span className="ml-auto text-[10px] text-slate-400">{service.deliveryTime}</span>
          </div>
        )}
        <div className="flex items-baseline gap-1 mb-2.5">
          <span className="text-base font-bold text-violet-700">{formatCurrency(service.price)}</span>
          <span className="text-xs text-slate-400">{label}</span>
        </div>
        <button onClick={e=>{e.stopPropagation();onCardClick();}}
          className="w-full text-xs font-bold py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 active:scale-95">
          Book Now <ArrowRight className="h-3.5 w-3.5"/>
        </button>
      </div>
    </div>
  );
};

/* ── Section Header ───────────────────────────────────────────────────────── */
const SectionHeader: React.FC<{icon?:string; title:string; count?:number; onViewAll?:()=>void; accent?:string}> = ({icon,title,count,onViewAll,accent='bg-accent-500'}) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className={`w-1 h-7 rounded-full flex-shrink-0 ${accent}`}/>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
        </div>
        {count!==undefined && <p className="text-xs text-slate-400 mt-0.5 ml-7">{count} item{count!==1?'s':''}</p>}
      </div>
    </div>
    {onViewAll && (
      <button onClick={onViewAll} className="flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700 px-3 py-1.5 rounded-lg border border-accent-200 hover:border-accent-400 hover:bg-accent-50 transition-all">
        View All <ArrowRight className="h-3.5 w-3.5"/>
      </button>
    )}
  </div>
);

/* ── Category Tabs ────────────────────────────────────────────────────────── */
const CategoryTabs: React.FC<{categories:{id:string;name:string;icon:string}[]; active:string|null; onSelect:(id:string)=>void}> = ({categories,active,onSelect}) => (
  <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 mb-5">
    {categories.map(cat=>(
      <button key={cat.id} onClick={()=>onSelect(cat.id)}
        className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
          active===cat.id?'bg-accent-500 text-white border-accent-500 shadow-sm':'bg-white border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-600')}>
        <span>{cat.icon}</span><span>{cat.name}</span>
      </button>
    ))}
  </div>
);

/* ── Landing Page ─────────────────────────────────────────────────────────── */
export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { products, services, stores, currentUser, addToCart, cart, homepageConfig } = useAppStore();
  const { track } = useTracking();
  const searchDebounce = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [city, setCity] = useState(currentUser?.city||'');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [query, setQuery] = useState('');
  const [addedId, setAddedId] = useState<string|null>(null);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileCategories, setShowMobileCategories] = useState(false);

  // Product section tabs
  const validCategories = useMemo(()=>
    PRODUCT_CATEGORIES.filter(c=>products.some(p=>p.categoryId===c.id&&p.status==='active')).slice(0,6),
    [products]);
  const [trendingTab, setTrendingTab] = useState<string|null>(null);
  const [recTab, setRecTab] = useState<string|null>(null);

  const activeTab = (tab:string|null) => tab ?? validCategories[0]?.id ?? null;
  const activeRecTab = (tab:string|null) => tab ?? validCategories[1]?.id ?? validCategories[0]?.id ?? null;

  const cartCount = cart.reduce((s,i)=>s+i.quantity,0);
  const avail = (item:Product|Service) => !city||item.availableCities.length===0||item.availableCities.includes(city);

  const activeProducts = useMemo(()=>
    products.filter(p=>p.status==='active').filter(p=>!query||p.name.toLowerCase().includes(query.toLowerCase())),
    [products,query]);

  const trendingProducts = useMemo(()=>{
    const cId = activeTab(trendingTab);
    return cId ? activeProducts.filter(p=>p.categoryId===cId).slice(0,10) : activeProducts.slice(0,10);
  },[activeProducts,trendingTab,validCategories]);

  const recProducts = useMemo(()=>{
    const cId = activeRecTab(recTab);
    return cId ? activeProducts.filter(p=>p.categoryId===cId).slice(0,10) : activeProducts.slice(0,10);
  },[activeProducts,recTab,validCategories]);

  const bestDeals = useMemo(()=>
    activeProducts.filter(p=>p.mrp>p.price).sort((a,b)=>(b.mrp-b.price)/b.mrp-(a.mrp-a.price)/a.mrp).slice(0,4),
    [activeProducts]);

  const activeServices = useMemo(()=>
    services.filter(s=>s.status==='active').filter(s=>!city||s.availableCities.length===0||s.availableCities.includes(city)),
    [services,city]);

  const filteredCities = CITIES.filter(c=>c.toLowerCase().includes(citySearch.toLowerCase()));
  const activeMiniBanners = homepageConfig.miniBanners?.filter(b=>b.isActive)??[];
  const activeBrandLogos = homepageConfig.brandLogos?.filter(b=>b.isActive)??[];

  const handleAddToCart = (product:Product,e:React.MouseEvent) => {
    e.stopPropagation();
    if(!currentUser){navigate('/login');return;}
    if(currentUser.role!=='customer') return;
    if(product.status!=='active'||!avail(product)) return;
    addToCart(product,1);
    setAddedId(product.id);
    setTimeout(()=>setAddedId(null),1500);
  };

  const handleWishlist = (id:string,e:React.MouseEvent) => {
    e.stopPropagation();
    if(!currentUser){navigate('/login');return;}
    setWishlist(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  };

  const goProduct = (id:string) => {
    if(!currentUser){navigate('/login');return;}
    if(currentUser.role==='customer'){navigate(`/shop/product/${id}`);return;}
    navigate(currentUser.role==='admin'?'/admin':currentUser.role==='store_owner'?'/store':'/service-provider');
  };

  const goService = (id:string) => {
    if(!currentUser){navigate('/login');return;}
    if(currentUser.role==='customer'){navigate(`/shop/service/${id}`);return;}
    navigate(currentUser.role==='admin'?'/admin':currentUser.role==='store_owner'?'/store':'/service-provider');
  };

  const goDashboard = () => {
    if(!currentUser) return;
    navigate(currentUser.role==='admin'?'/admin':currentUser.role==='store_owner'?'/store':currentUser.role==='service_provider'?'/service-provider':currentUser.role==='agent'?'/agent':'/shop');
  };

  const goAllProducts = () => {
    if(!currentUser){navigate('/login');return;}
    currentUser.role==='customer'?navigate('/shop'):goDashboard();
  };

  const goAllServices = () => {
    if(!currentUser){navigate('/login');return;}
    currentUser.role==='customer'?navigate('/shop/services'):goDashboard();
  };

  const handleSearch = (q:string) => {
    setQuery(q);
    if(searchDebounce.current) clearTimeout(searchDebounce.current);
    if(q.trim().length>=2) searchDebounce.current=setTimeout(()=>track('search',{query:q.trim()},'/'),800);
  };

  return (
    <div className="min-h-screen bg-white pb-16 lg:pb-0">

      {/* ── Announcement Bar ─────────────────────────────────────────────── */}
      {homepageConfig.announcementBarActive && homepageConfig.announcementBar && (
        <div className="bg-brand-900 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium tracking-wide">
          <span className="hidden sm:inline">{homepageConfig.announcementBar}</span>
          <span className="sm:hidden">{homepageConfig.announcementBar.slice(0,60)}{homepageConfig.announcementBar.length>60?'…':''}</span>
        </div>
      )}

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center gap-3">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <AskIndiaLogo size={30} showText={true} textClass="text-base sm:text-lg"/>
            </Link>

            {/* All Categories button — desktop */}
            <button onClick={()=>setShowMobileCategories(true)}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-brand-900 hover:text-accent-600 px-3 py-2 border border-slate-200 rounded-lg transition-colors flex-shrink-0">
              <LayoutGrid className="h-4 w-4"/> <span className="hidden lg:inline">All Categories</span>
              <ChevronDown className="h-3.5 w-3.5"/>
            </button>

            {/* Search */}
            <div className="flex-1 relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
              <input type="text" value={query} onChange={e=>handleSearch(e.target.value)}
                placeholder="Search products, brands, services..."
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 bg-slate-50 hover:bg-white transition-colors"/>
            </div>

            {/* Location */}
            <button onClick={()=>setShowCityPicker(true)}
              className="hidden md:flex items-center gap-1.5 text-sm text-slate-600 hover:text-accent-600 px-3 py-2 transition-colors flex-shrink-0">
              <MapPin className="h-4 w-4 text-accent-500"/>
              <span className="max-w-[80px] truncate font-medium">{city||'Select City'}</span>
              <ChevronDown className="h-3.5 w-3.5"/>
            </button>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
              {/* Mobile search toggle */}
              <button onClick={()=>setShowMobileSearch(v=>!v)} className="sm:hidden p-2 text-slate-500 hover:text-accent-600">
                <Search className="h-5 w-5"/>
              </button>

              {currentUser ? (<>
                <button onClick={goDashboard} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-brand-900 hover:text-accent-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">
                  Dashboard
                </button>
                {currentUser.role==='customer' && (
                  <button onClick={()=>navigate('/shop/cart')} className="relative p-2 text-slate-600 hover:text-accent-600 transition-colors">
                    <ShoppingBag className="h-5 w-5"/>
                    {cartCount>0 && <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
                  </button>
                )}
              </>) : (<>
                <Link to="/login" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-accent-600 transition-colors px-3 py-1.5">
                  <LogIn className="h-4 w-4"/> Sign In
                </Link>
                <div className="relative">
                  <button onClick={()=>setShowGetStarted(!showGetStarted)}
                    className="flex items-center gap-1 bg-accent-500 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-accent-600 transition-all shadow-sm">
                    Join <ChevronDown className="h-3.5 w-3.5"/>
                  </button>
                  {showGetStarted && (<>
                    <div className="fixed inset-0 z-10" onClick={()=>setShowGetStarted(false)}/>
                    <div className="absolute right-0 top-11 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 w-52">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 pt-2 pb-1">Join as</p>
                      {[
                        {to:'/register/store-owner',  icon:Store,       color:'bg-brand-100',   ic:'text-brand-700',   label:'Store Owner',       desc:'Sell products'},
                        {to:'/register/service-provider',icon:Briefcase,color:'bg-violet-100',  ic:'text-violet-700',  label:'Service Provider',  desc:'Offer services'},
                        {to:'/register/customer',     icon:ShoppingBag, color:'bg-accent-100',  ic:'text-accent-700',  label:'Customer',          desc:'Shop & discover'},
                      ].map(({to,icon:Icon,color,ic,label,desc})=>(
                        <Link key={to} to={to} onClick={()=>setShowGetStarted(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center',color)}>
                            <Icon className={clsx('h-4 w-4',ic)}/>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{label}</p>
                            <p className="text-xs text-slate-400">{desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>)}
                </div>
              </>)}
            </div>
          </div>

          {/* Mobile search bar (expandable) */}
          {showMobileSearch && (
            <div className="sm:hidden pb-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
                <input autoFocus type="text" value={query} onChange={e=>handleSearch(e.target.value)}
                  placeholder="Search products, services..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-accent-400 bg-slate-50"/>
              </div>
            </div>
          )}
        </div>

        {/* ── Category strip (desktop nav below navbar) */}
        <div className="hidden sm:block border-t border-slate-100 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <button onClick={()=>navigate(currentUser?.role==='customer'?'/shop':'/login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-white hover:text-accent-600 transition-all flex-shrink-0 whitespace-nowrap">
                🏠 Home
              </button>
              {PRODUCT_CATEGORIES.slice(0,8).map(cat=>(
                <button key={cat.id} onClick={()=>{goAllProducts();}}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-white hover:text-accent-600 transition-all flex-shrink-0 whitespace-nowrap">
                  {cat.icon} {cat.name}
                </button>
              ))}
              <button onClick={goAllServices}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-violet-600 hover:bg-white hover:bg-violet-50 transition-all flex-shrink-0 whitespace-nowrap">
                🛠️ Services
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── City Picker Modal ─────────────────────────────────────────────── */}
      {showCityPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-bold text-slate-900">Choose Your City</h3><p className="text-xs text-slate-400 mt-0.5">See products available near you</p></div>
              <button onClick={()=>setShowCityPicker(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4"/></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
              <input type="text" value={citySearch} onChange={e=>setCitySearch(e.target.value)} placeholder="Search city..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-accent-400" autoFocus/>
            </div>
            {city && (
              <button onClick={()=>{setCity('');setShowCityPicker(false);setCitySearch('');}}
                className="w-full text-sm text-red-600 font-medium py-2 border border-red-200 rounded-xl mb-3 hover:bg-red-50 transition-colors">
                ✕ Show All India
              </button>
            )}
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
              {filteredCities.map(c=>(
                <button key={c} onClick={()=>{setCity(c);setShowCityPicker(false);setCitySearch('');}}
                  className={clsx('text-sm py-2.5 px-3 rounded-xl text-left font-medium transition-all',city===c?'bg-accent-500 text-white shadow-sm':'text-slate-700 hover:bg-slate-100')}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Categories Sheet ───────────────────────────────────────── */}
      {showMobileCategories && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">All Categories</h3>
              <button onClick={()=>setShowMobileCategories(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4"/></button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {PRODUCT_CATEGORIES.map(cat=>(
                <button key={cat.id} onClick={()=>{goAllProducts();setShowMobileCategories(false);}}
                  className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-accent-50 transition-colors">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-xs font-medium text-slate-700 text-center leading-tight">{cat.name}</span>
                </button>
              ))}
              <button onClick={()=>{goAllServices();setShowMobileCategories(false);}}
                className="flex flex-col items-center gap-2 p-3 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors">
                <span className="text-3xl">🛠️</span>
                <span className="text-xs font-medium text-violet-700 text-center leading-tight">Services</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Slider ──────────────────────────────────────────────────── */}
      <HeroSlider onShop={goAllProducts}/>

      {/* ── Mini Banners ─────────────────────────────────────────────────── */}
      {activeMiniBanners.length>0 && (
        <section className="bg-white py-4 sm:py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className={clsx('grid gap-3 sm:gap-4', activeMiniBanners.length>=3?'grid-cols-1 sm:grid-cols-3':activeMiniBanners.length===2?'grid-cols-2':'grid-cols-1')}>
              {activeMiniBanners.map(b=>(
                <div key={b.id} onClick={goAllProducts}
                  className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all group flex items-center gap-4"
                  style={{background:`linear-gradient(135deg,${b.gradientFrom},${b.gradientTo})`}}>
                  <div className="absolute inset-0 opacity-15" style={{backgroundImage:'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)'}}/>
                  <span className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform relative">{b.emoji}</span>
                  <div className="flex-1 relative">
                    <h3 className="font-extrabold text-base sm:text-lg leading-tight">{b.title}</h3>
                    <p className="text-white/80 text-xs mt-0.5">{b.subtitle}</p>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full relative whitespace-nowrap flex-shrink-0">
                    {b.ctaText} →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── City Filter Banner ───────────────────────────────────────────── */}
      {city && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <MapPin className="h-3.5 w-3.5"/>
              <span>Showing results for <strong>{city}</strong></span>
            </div>
            <button onClick={()=>setCity('')} className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold transition-colors">Show All ✕</button>
          </div>
        </div>
      )}

      {/* ── Trending Products (with tabs) ────────────────────────────────── */}
      {homepageConfig.showTrendingSection && trendingProducts.length>0 && (
        <section className="bg-white py-7 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader icon="🔥" title="Trending Products" onViewAll={goAllProducts}/>
            {validCategories.length>1 && (
              <CategoryTabs categories={validCategories} active={activeTab(trendingTab)} onSelect={setTrendingTab}/>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {trendingProducts.slice(0,10).map(p=>(
                <ProductCard key={p.id} product={p} available={avail(p)} added={addedId===p.id} wishlisted={wishlist.has(p.id)}
                  onAdd={e=>handleAddToCart(p,e)} onClick={()=>goProduct(p.id)} onWish={e=>handleWishlist(p.id,e)}/>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Best Deals Section ───────────────────────────────────────────── */}
      {homepageConfig.showBestDeals && bestDeals.length>0 && (
        <section className="bg-slate-50 py-7 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader icon="⚡" title="Best Deals" onViewAll={goAllProducts}/>
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Left: deal banner */}
              <div className="lg:col-span-1 bg-gradient-to-b from-accent-500 to-accent-700 rounded-2xl p-5 flex flex-col justify-between text-white min-h-[200px] lg:min-h-0">
                <div>
                  <p className="text-xs font-bold bg-white/20 inline-flex px-2 py-0.5 rounded-full mb-3">Hot Deals 🔥</p>
                  <h3 className="text-2xl font-extrabold leading-tight mb-2">Up to<br/>70% Off</h3>
                  <p className="text-white/80 text-xs leading-relaxed">Grab the best prices on top products before they're gone!</p>
                </div>
                <button onClick={goAllProducts} className="mt-4 bg-white text-accent-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-accent-50 transition-colors flex items-center gap-1.5 justify-center">
                  Shop Now <ArrowRight className="h-4 w-4"/>
                </button>
              </div>
              {/* Right: products */}
              <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {bestDeals.map(p=>(
                  <ProductCard key={p.id} product={p} available={avail(p)} added={addedId===p.id} wishlisted={wishlist.has(p.id)}
                    onAdd={e=>handleAddToCart(p,e)} onClick={()=>goProduct(p.id)} onWish={e=>handleWishlist(p.id,e)}/>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Promo Banners ────────────────────────────────────────────────── */}
      <section className="bg-white py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div onClick={goAllProducts}
            className="relative bg-gradient-to-r from-brand-800 to-brand-600 rounded-2xl p-5 sm:p-6 overflow-hidden text-white flex items-center gap-4 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all group">
            <div className="absolute inset-0 opacity-15" style={{backgroundImage:'radial-gradient(circle at 90% 50%, white 0%, transparent 60%)'}}/>
            <div className="text-4xl sm:text-5xl flex-shrink-0 group-hover:scale-110 transition-transform relative">💎</div>
            <div className="flex-1 relative">
              <p className="text-[10px] sm:text-xs font-bold bg-white/20 inline-flex px-2.5 py-0.5 rounded-full mb-1.5">Premium Selection</p>
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight mb-0.5">Top Brands, Best Prices</h3>
              <p className="text-white/75 text-xs">Genuine products from verified sellers</p>
            </div>
            <ArrowRight className="h-5 w-5 flex-shrink-0 opacity-70 relative"/>
          </div>
          <div onClick={goAllServices}
            className="relative bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-5 sm:p-6 overflow-hidden text-white flex items-center gap-4 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all group">
            <div className="absolute inset-0 opacity-15" style={{backgroundImage:'radial-gradient(circle at 90% 50%, white 0%, transparent 60%)'}}/>
            <div className="text-4xl sm:text-5xl flex-shrink-0 group-hover:scale-110 transition-transform relative">🛠️</div>
            <div className="flex-1 relative">
              <p className="text-[10px] sm:text-xs font-bold bg-white/20 inline-flex px-2.5 py-0.5 rounded-full mb-1.5">Trusted Professionals</p>
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight mb-0.5">Services from ₹99</h3>
              <p className="text-white/75 text-xs">Home repair, tutoring, beauty & more</p>
            </div>
            <ArrowRight className="h-5 w-5 flex-shrink-0 opacity-70 relative"/>
          </div>
        </div>
      </section>

      {/* ── Collection List (Category Circles) ───────────────────────────── */}
      {homepageConfig.showCollectionList && (
        <section className="bg-slate-50 py-7 sm:py-8 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader title="Shop by Category" onViewAll={goAllProducts}/>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {PRODUCT_CATEGORIES.map(cat=>{
                const count = products.filter(p=>p.categoryId===cat.id&&p.status==='active').length;
                return (
                  <button key={cat.id} onClick={goAllProducts}
                    className="flex flex-col items-center gap-2 p-2 sm:p-3 group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-sm border border-slate-100 group-hover:shadow-md group-hover:border-accent-200 group-hover:scale-105 transition-all">
                      {cat.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-700 leading-tight">{cat.name}</p>
                      {count>0 && <p className="text-[9px] text-slate-400 mt-0.5">{count} items</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust Strip ──────────────────────────────────────────────────── */}
      {homepageConfig.showTrustBadges && (
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
              {TRUST_BADGES.map(({icon:Icon,label,desc,color,bg})=>(
                <div key={label} className="flex items-center gap-3 flex-shrink-0 px-3 sm:px-4 first:pl-0 last:pr-0 border-r border-slate-100 last:border-0">
                  <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',bg)}>
                    <Icon className={clsx('h-4 w-4',color)}/>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">{label}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Recommended For You (with tabs) ──────────────────────────────── */}
      {recProducts.length>0 && (
        <section className="bg-white py-7 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader icon="✨" title="Recommended For You" onViewAll={goAllProducts}/>
            {validCategories.length>1 && (
              <CategoryTabs categories={validCategories} active={activeRecTab(recTab)} onSelect={setRecTab}/>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {recProducts.slice(0,10).map(p=>(
                <ProductCard key={p.id} product={p} available={avail(p)} added={addedId===p.id} wishlisted={wishlist.has(p.id)}
                  onAdd={e=>handleAddToCart(p,e)} onClick={()=>goProduct(p.id)} onWish={e=>handleWishlist(p.id,e)}/>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Services Section ─────────────────────────────────────────────── */}
      {homepageConfig.showServices && (
        <section className="bg-slate-50 py-7 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader icon="🛠️" title={`Services ${city?`in ${city}`:'Near You'}`} count={activeServices.length} onViewAll={activeServices.length>0?goAllServices:undefined} accent="bg-violet-500"/>

            {activeServices.length===0&&services.length===0 ? (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-8 border border-violet-100">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
                  {SERVICE_CATEGORIES.slice(0,10).map(cat=>(
                    <div key={cat.id} className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-violet-100 text-center hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs font-medium text-slate-600 leading-tight">{cat.name}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-800 mb-1">Services Coming to Your Area</p>
                  <p className="text-sm text-slate-500 mb-4">Book verified local service providers for home repairs, cleaning, tutoring & more.</p>
                  <Link to="/register/service-provider" className="inline-flex items-center gap-2 bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-violet-700 text-sm shadow-sm">
                    <Briefcase className="h-4 w-4"/> Offer Your Services Here
                  </Link>
                </div>
              </div>
            ) : activeServices.length===0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-3xl mb-2">📍</p>
                <p className="text-base font-semibold text-slate-700">No services in {city} yet.</p>
                <Link to="/register/service-provider" className="text-sm text-violet-600 font-medium hover:underline mt-2 inline-block">Be the first →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeServices.slice(0,8).map(s=>(
                  <ServiceCard key={s.id} service={s} onCardClick={()=>goService(s.id)}/>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Top Stores ───────────────────────────────────────────────────── */}
      {homepageConfig.showStores && stores.filter(s=>s.status==='active').length>0 && (
        <section className="bg-white py-7 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader icon="🏪" title="Top Stores" onViewAll={()=>{if(!currentUser){navigate('/login');return;}navigate('/shop/stores');}} accent="bg-amber-500"/>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {stores.filter(s=>s.status==='active').slice(0,5).map(store=>{
                const isP=(store.storeType??'product')==='product';
                return (
                  <div key={store.id} onClick={()=>{if(!currentUser){navigate('/login');return;}navigate(`/shop/store/${store.slug}`);}}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group cursor-pointer">
                    <div className="h-20 relative" style={{background:`linear-gradient(135deg,${store.themeColor}ee,${store.themeColor}88)`}}>
                      <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)'}}/>
                      <div className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 flex items-center gap-0.5">
                        {isP?<><Package className="h-2 w-2"/> Products</>:<><Briefcase className="h-2 w-2"/> Services</>}
                      </div>
                      <div className="absolute bottom-0 left-3 translate-y-1/2 w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center text-2xl border-2 border-white">{store.logo}</div>
                    </div>
                    <div className="pt-8 px-3 pb-3">
                      <p className="text-sm font-bold text-slate-900 leading-tight truncate group-hover:text-accent-600 transition-colors">{store.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5 mb-2">{store.tagline}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-slate-400"/>
                        <span className="text-[10px] text-slate-400">{store.city}</span>
                        <span className="ml-auto text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Brand Logos Strip ────────────────────────────────────────────── */}
      {homepageConfig.showBrandLogos && activeBrandLogos.length>0 && (
        <section className="bg-slate-50 border-y border-slate-100 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-5">Trusted Brands on AskIndia</p>
            <div className="flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto scrollbar-hide flex-wrap">
              {activeBrandLogos.map(b=>(
                <div key={b.id} className="flex items-center gap-2 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all cursor-pointer flex-shrink-0">
                  <span className="text-2xl sm:text-3xl">{b.emoji}</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-600 tracking-tight">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Seller CTA ───────────────────────────────────────────────────── */}
      {homepageConfig.showSellerCta && !currentUser && (
        <section className="bg-white py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-accent-600 uppercase tracking-widest mb-2">Join the platform</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Grow with AskIndia</h2>
              <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-xl mx-auto">Join thousands of sellers and service providers earning on our platform.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {gr:'from-brand-800 to-brand-600',icon:Store,badge:<><Zap className="h-3 w-3"/>Free to Start</>,title:'Open Your Store',desc:'Launch a branded storefront. Sell products and earn commission.',link:'/register/store-owner',cta:'Get Started Free',cc:'text-brand-800'},
                {gr:'from-violet-600 to-purple-700',icon:Briefcase,badge:<><TrendingUp className="h-3 w-3"/>High Earnings</>,title:'List Your Services',desc:'Offer skills like plumbing, tutoring, photography across your city.',link:'/register/service-provider',cta:'Start Listing',cc:'text-violet-800'},
                {gr:'from-accent-500 to-accent-700',icon:ShoppingBag,badge:<><CheckCircle className="h-3 w-3"/>Verified Sellers</>,title:'Shop Confidently',desc:'Genuine products from verified stores. Secure payments. Fast delivery.',link:'/register/customer',cta:'Shop Now',cc:'text-accent-800'},
              ].map(({gr,icon:Icon,badge,title,desc,link,cta,cc})=>(
                <div key={link} className={clsx('relative overflow-hidden bg-gradient-to-br rounded-2xl p-6 text-white',gr)}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"/>
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-4"><Icon className="h-6 w-6 text-white"/></div>
                  <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-bold mb-3">{badge}</div>
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-white/75 text-sm mb-5 leading-relaxed">{desc}</p>
                  <Link to={link} className={clsx('inline-flex items-center gap-2 bg-white font-bold px-5 py-2.5 rounded-xl hover:bg-opacity-90 transition-colors text-sm shadow-sm',cc)}>
                    {cta} <ArrowRight className="h-4 w-4"/>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ───────────────────────────────────────────────────── */}
      {homepageConfig.showNewsletter && (
        <section className="bg-brand-900 py-10 sm:py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <span className="text-4xl mb-4 block">📧</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{homepageConfig.newsletterTitle}</h2>
            <p className="text-brand-300 text-sm sm:text-base mb-6">{homepageConfig.newsletterSubtitle}</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input className="flex-1 bg-brand-800 text-white placeholder-brand-400 text-sm px-4 py-3 rounded-xl border border-brand-700 focus:outline-none focus:border-accent-400 transition-colors"
                placeholder="Enter your email address"/>
              <button className="bg-accent-500 hover:bg-accent-600 text-white font-bold px-5 sm:px-7 py-3 rounded-xl transition-colors text-sm whitespace-nowrap shadow-sm">
                Subscribe
              </button>
            </div>
            <p className="text-brand-400 text-xs mt-3">No spam, unsubscribe anytime. By subscribing you agree to our Privacy Policy.</p>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-4">
                <AskIndiaLogo size={30} showText={true} textClass="text-base" className="brightness-0 invert opacity-90"/>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">India's unified marketplace for products & services. Empowering local businesses to grow digitally.</p>
              <div className="flex items-center gap-2 mb-4">
                {([
                  {icon:'📘', href:env.social.facebook,  label:'Facebook'},
                  {icon:'📸', href:env.social.instagram, label:'Instagram'},
                  {icon:'🐦', href:env.social.twitter,   label:'Twitter'},
                  {icon:'▶️', href:env.social.youtube,   label:'YouTube'},
                ] as const).map(({icon,href,label})=>(
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-sm transition-colors">
                    {icon}
                  </a>
                ))}
              </div>
              <p className="text-slate-500 text-xs font-medium">Made with ❤️ in India 🇮🇳</p>
            </div>
            <div>
              <p className="text-white text-sm font-bold mb-4">Marketplace</p>
              <div className="space-y-2.5">
                {['All Products','All Services','Browse Stores','Top Deals','New Arrivals'].map(l=>(
                  <a key={l} href="#" className="block text-slate-400 text-xs hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-bold mb-4">For Sellers</p>
              <div className="space-y-2.5">
                {['Open a Store','List Services','Become an Agent','Seller Guide','Commission Rates'].map(l=>(
                  <a key={l} href="#" className="block text-slate-400 text-xs hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-bold mb-4">Company</p>
              <div className="space-y-2.5">
                {['About Us','Careers','Blog','Privacy Policy','Terms of Use','Contact Us'].map(l=>(
                  <a key={l} href="#" className="block text-slate-400 text-xs hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-500 text-xs">© {new Date().getFullYear()} AskIndia Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href={env.legal.privacy}  className="text-slate-500 text-xs hover:text-slate-300 transition-colors">Privacy</a>
              <a href={env.legal.terms}    className="text-slate-500 text-xs hover:text-slate-300 transition-colors">Terms</a>
              <a href="/sitemap.xml"        className="text-slate-500 text-xs hover:text-slate-300 transition-colors">Sitemap</a>
              <a href={env.legal.refund}   className="text-slate-500 text-xs hover:text-slate-300 transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation (visible even when not logged in) ────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch h-16 max-w-lg mx-auto">
          {[
            {icon:Home,label:'Home',action:()=>navigate('/'),active:true},
            {icon:LayoutGrid,label:'Categories',action:()=>setShowMobileCategories(true),active:false},
            {icon:ShoppingBag,label:'Cart',action:()=>currentUser?.role==='customer'?navigate('/shop/cart'):currentUser?goDashboard():navigate('/login'),active:false,badge:currentUser?.role==='customer'?cartCount:0},
            {icon:User,label:currentUser?'Account':'Sign In',action:()=>currentUser?goDashboard():navigate('/login'),active:false},
            {icon:SlidersHorizontal,label:'More',action:()=>setShowMobileCategories(true),active:false},
          ].map(({icon:Icon,label,action,badge})=>(
            <button key={label} onClick={action}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-accent-500 active:text-accent-600 transition-colors">
              <div className="relative">
                <Icon className="h-5 w-5"/>
                {!!badge && badge>0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-accent-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">{badge>9?'9+':badge}</span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
