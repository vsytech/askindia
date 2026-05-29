import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../data/mockData';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Layout, Star, Globe, Megaphone, QrCode,
  Save, Eye, ChevronDown, ChevronUp, Share2, Check,
} from 'lucide-react';
import { QRCanvas, StoreShareModal } from '../../components/ui/StoreShareModal';
import clsx from 'clsx';

// ── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600">
            {icon}
          </div>
          <span className="font-semibold text-slate-900 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
};

// ── Colour swatches ──────────────────────────────────────────────────────────
const THEME_COLORS = [
  '#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#db2777', '#ea580c', '#16a34a', '#0284c7',
];

// ── Main component ────────────────────────────────────────────────────────────
export const StoreCustomize: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, stores, products, updateStore, updateStoreCustomization } = useAppStore();

  const store = stores.find(s => s.ownerId === currentUser?.id);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // ── Form state ──
  const [themeColor, setThemeColor] = useState(store?.themeColor ?? '#4f46e5');
  const [logo, setLogo] = useState(store?.logo ?? '🏪');
  const [tagline, setTagline] = useState(store?.tagline ?? '');
  const [description, setDescription] = useState(store?.description ?? '');

  const [bannerHeadline, setBannerHeadline] = useState(store?.customization?.bannerHeadline ?? '');
  const [bannerSubtext, setBannerSubtext] = useState(store?.customization?.bannerSubtext ?? '');
  const [announcement, setAnnouncement] = useState(store?.customization?.announcement ?? '');
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'list' | 'magazine'>(
    store?.customization?.layoutStyle ?? 'grid'
  );
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    store?.customization?.featuredProductIds ?? []
  );
  const [showQr, setShowQr] = useState(store?.customization?.showQr ?? true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [customBadge, setCustomBadge] = useState(store?.customization?.customBadge ?? '');
  const [socialWhatsapp, setSocialWhatsapp] = useState(store?.customization?.socialWhatsapp ?? '');
  const [socialInstagram, setSocialInstagram] = useState(store?.customization?.socialInstagram ?? '');
  const [socialFacebook, setSocialFacebook] = useState(store?.customization?.socialFacebook ?? '');
  const [socialWebsite, setSocialWebsite] = useState(store?.customization?.socialWebsite ?? '');

  const storeProducts = products.filter(p => p.status === 'active');

  const toggleFeatured = (id: string) => {
    setFeaturedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);

    // Update base store fields
    updateStore(store.id, {
      themeColor,
      logo,
      tagline,
      description,
    });

    // Update customization object
    updateStoreCustomization(store.id, {
      bannerHeadline: bannerHeadline || undefined,
      bannerSubtext: bannerSubtext || undefined,
      announcement: announcement || undefined,
      layoutStyle,
      featuredProductIds: featuredIds,
      showQr,
      customBadge: customBadge || undefined,
      socialWhatsapp: socialWhatsapp || undefined,
      socialInstagram: socialInstagram || undefined,
      socialFacebook: socialFacebook || undefined,
      socialWebsite: socialWebsite || undefined,
    });

    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSavedMsg('Changes saved successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  if (!store) {
    return (
      <AppLayout title="Customize Store">
        <div className="card py-20 text-center">
          <p className="text-slate-500">No store found. Please contact admin.</p>
        </div>
      </AppLayout>
    );
  }

  const storeUrl = `/shop/store/${store.slug}`;
  const storeFullUrl = `${window.location.origin}/shop/store/${store.slug}`;

  return (
    <AppLayout title="Customize Store">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Customize Your Store</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Personalise your storefront — changes reflect live for your customers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share Store
            </button>
            <button
              onClick={() => navigate(storeUrl)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-colors',
                saving
                  ? 'bg-emerald-300 text-white cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              )}
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Success toast */}
        {savedMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
            <Check className="h-4 w-4 flex-shrink-0" />
            {savedMsg}
          </div>
        )}

        {/* ── Branding ── */}
        <Section title="Brand Identity" icon={<Palette className="h-4 w-4" />}>
          <div className="space-y-4 mt-3">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Logo (emoji)</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: themeColor + '22', border: `2px solid ${themeColor}44` }}
                >
                  {logo}
                </div>
                <input
                  className="input flex-1"
                  value={logo}
                  onChange={e => setLogo(e.target.value)}
                  placeholder="🏪"
                  maxLength={4}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Paste any emoji — this is your store's main icon.</p>
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Theme Colour</label>
              <div className="flex items-center gap-2 flex-wrap">
                {THEME_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setThemeColor(color)}
                    className={clsx(
                      'w-8 h-8 rounded-full border-2 transition-transform',
                      themeColor === color ? 'border-slate-900 scale-125' : 'border-transparent hover:scale-110'
                    )}
                    style={{ background: color }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={e => setThemeColor(e.target.value)}
                    className="w-8 h-8 rounded-full border-2 border-slate-300 cursor-pointer p-0"
                    title="Custom colour"
                  />
                  <span className="text-xs text-slate-400 font-mono">{themeColor}</span>
                </div>
              </div>
              <div
                className="mt-3 h-10 rounded-xl flex items-center px-4"
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)` }}
              >
                <span className="text-white text-sm font-semibold opacity-80">Preview — {store.name}</span>
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tagline</label>
              <input
                className="input"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Premium products at unbeatable prices"
                maxLength={100}
              />
              <p className="text-xs text-slate-400 mt-1">{tagline.length}/100 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Description</label>
              <textarea
                className="input min-h-[80px] resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tell customers what makes your store special..."
                maxLength={300}
              />
              <p className="text-xs text-slate-400 mt-1">{description.length}/300 characters</p>
            </div>

            {/* Custom badge */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Store Badge</label>
              <input
                className="input"
                value={customBadge}
                onChange={e => setCustomBadge(e.target.value)}
                placeholder="e.g. 🏆 Top Rated Store  |  ✅ Official Reseller"
                maxLength={40}
              />
              <p className="text-xs text-slate-400 mt-1">Shown as a badge in your hero banner. Leave blank to hide.</p>
            </div>
          </div>
        </Section>

        {/* ── Banner / Hero ── */}
        <Section title="Hero Banner" icon={<Megaphone className="h-4 w-4" />}>
          <div className="space-y-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Banner Headline</label>
              <input
                className="input"
                value={bannerHeadline}
                onChange={e => setBannerHeadline(e.target.value)}
                placeholder="e.g. Welcome to India's Best Electronics Store!"
                maxLength={80}
              />
              <p className="text-xs text-slate-400 mt-1">Overrides your store name in the banner. Leave blank to use store name.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Banner Subtext</label>
              <input
                className="input"
                value={bannerSubtext}
                onChange={e => setBannerSubtext(e.target.value)}
                placeholder="e.g. Free shipping on orders above ₹999 · Same day dispatch"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Announcement Bar</label>
              <input
                className="input"
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder="e.g. 🎉 Monsoon Sale — Flat 20% off sitewide! Use code RAIN20"
                maxLength={150}
              />
              <p className="text-xs text-slate-400 mt-1">Shown as a scrolling banner above your products. Leave blank to hide.</p>
            </div>

            {/* Live preview */}
            {(bannerHeadline || store.name) && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)` }}
              >
                {announcement && (
                  <div className="bg-black/20 px-4 py-1.5 text-xs text-white/90 text-center font-medium truncate">
                    📢 {announcement}
                  </div>
                )}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                    {logo}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{bannerHeadline || store.name}</p>
                    <p className="text-white/75 text-xs mt-0.5">{bannerSubtext || tagline}</p>
                    {customBadge && (
                      <span className="inline-block mt-1 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                        {customBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Layout ── */}
        <Section title="Products Layout" icon={<Layout className="h-4 w-4" />}>
          <div className="space-y-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Product Grid Style</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'grid', label: 'Grid', desc: '2–4 columns', icon: '▦' },
                  { value: 'list', label: 'List', desc: 'Full-width rows', icon: '≡' },
                  { value: 'magazine', label: 'Magazine', desc: 'Large + small mix', icon: '⊞' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLayoutStyle(opt.value)}
                    className={clsx(
                      'flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center',
                      layoutStyle === opt.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="text-2xl mb-1">{opt.icon}</span>
                    <p className={clsx('text-sm font-semibold', layoutStyle === opt.value ? 'text-brand-700' : 'text-slate-700')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Featured Products ── */}
        <Section title="Featured Products" icon={<Star className="h-4 w-4" />} defaultOpen={false}>
          <div className="mt-3">
            <p className="text-sm text-slate-500 mb-3">
              Pin specific products to appear at the top of your storefront.{' '}
              <span className="font-medium text-slate-700">{featuredIds.length} selected</span>
            </p>
            {storeProducts.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No active products yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {storeProducts.map(p => (
                  <label
                    key={p.id}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      featuredIds.includes(p.id)
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={featuredIds.includes(p.id)}
                      onChange={() => toggleFeatured(p.id)}
                      className="rounded border-slate-300 text-amber-500 w-4 h-4 flex-shrink-0"
                    />
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.imageColor} flex items-center justify-center text-base flex-shrink-0`}
                    >
                      {p.imageIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(p.price)}</p>
                    </div>
                    {featuredIds.includes(p.id) && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── Social Links ── */}
        <Section title="Social Links" icon={<Globe className="h-4 w-4" />} defaultOpen={false}>
          <div className="space-y-3 mt-3">
            {[
              { icon: '💬', label: 'WhatsApp Number', value: socialWhatsapp, onChange: setSocialWhatsapp, placeholder: '+91 98765 43210' },
              { icon: '📸', label: 'Instagram Handle', value: socialInstagram, onChange: setSocialInstagram, placeholder: '@yourstore' },
              { icon: '👤', label: 'Facebook Page URL', value: socialFacebook, onChange: setSocialFacebook, placeholder: 'https://facebook.com/yourstore' },
              { icon: '🌐', label: 'Website URL', value: socialWebsite, onChange: setSocialWebsite, placeholder: 'https://yourstore.com' },
            ].map(({ icon, label, value, onChange, placeholder }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input
                    className="input text-sm"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── QR Code ── */}
        <Section title="Store QR Code" icon={<QrCode className="h-4 w-4" />} defaultOpen={false}>
          <div className="mt-3 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setShowQr(!showQr)}
                className={clsx(
                  'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                  showQr ? 'bg-brand-600' : 'bg-slate-300'
                )}
              >
                <div
                  className={clsx(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                    showQr ? 'left-[22px]' : 'left-0.5'
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Show QR code on your storefront</p>
                <p className="text-xs text-slate-400">Customers can scan to open your store on mobile</p>
              </div>
            </label>

            {showQr && (
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 inline-block">
                  <QRCanvas value={storeFullUrl} size={128} />
                  <p className="text-[10px] text-slate-400 text-center mt-2 font-mono truncate max-w-[128px]">
                    {storeFullUrl.replace('https://', '')}
                  </p>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-slate-600">
                    This QR code is scannable by any smartphone camera and links directly to your store.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                    <p>✅ Share on WhatsApp, social media, or print on visiting cards</p>
                    <p>✅ Customers scan → open your store instantly</p>
                    <p>✅ Works with any smartphone camera</p>
                  </div>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share & Download QR
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Save button (bottom) */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            onClick={() => navigate(storeUrl)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview Store
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors',
              saving
                ? 'bg-emerald-300 text-white cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <StoreShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        storeUrl={storeFullUrl}
        storeName={store.name}
        storeSlug={store.slug}
      />
    </AppLayout>
  );
};
