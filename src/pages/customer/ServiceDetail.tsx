import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppStore } from '../../store/useAppStore';
import { SERVICE_CATEGORIES, formatCurrency } from '../../data/mockData';
import {
  ArrowLeft, Star, MapPin, Clock, User, Check,
  ChevronRight, X, CalendarDays, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { mutations } from '../../lib/dataService';
import { isSupabaseConfigured } from '../../lib/supabase';

export const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { services, currentUser, addServiceOrder } = useAppStore();

  const service = services.find(s => s.id === id);

  const [showModal, setShowModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!service) {
    return (
      <AppLayout title="Service Not Found">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Service Not Found</h2>
          <p className="text-slate-400 mb-6">This service does not exist or has been removed.</p>
          <button onClick={() => navigate('/shop/services')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Services
          </button>
        </div>
      </AppLayout>
    );
  }

  const cat = SERVICE_CATEGORIES.find(c => c.slug === service.category);
  const isAvailable = !currentUser?.city || service.availableCities.length === 0 || service.availableCities.includes(currentUser.city);
  const relatedServices = services.filter(s => s.category === service.category && s.id !== service.id && s.status === 'active').slice(0, 4);

  const priceLabel = service.priceType === 'hourly' ? '/hr' : service.priceType === 'starting_from' ? ' onwards' : '';
  const fullStars = Math.floor(service.rating);
  const hasHalf = service.rating - fullStars >= 0.5;

  const today = new Date().toISOString().split('T')[0];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingAddress || !currentUser) return;
    setSubmitting(true);

    const orderData: Omit<import('../../types').ServiceOrder, 'id'> = {
      serviceId:     service.id,
      serviceTitle:  service.title,
      serviceIcon:   service.imageIcon,
      serviceColor:  service.imageColor,
      providerId:    service.providerId,
      providerName:  service.providerName,
      customerId:    currentUser.id,
      customerName:  currentUser.name,
      customerEmail: currentUser.email,
      amount:        service.price,
      status:        'pending',
      scheduledDate: bookingDate,
      address:       bookingAddress,
      city:          currentUser.city ?? '',
      notes:         bookingNotes || undefined,
      createdAt:     new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured) {
        const dbId = await mutations.createServiceOrder(orderData);
        addServiceOrder(orderData, dbId);
      } else {
        addServiceOrder(orderData);
      }
      setBookingSuccess(true);
    } catch (err) {
      console.error('[ServiceDetail] createServiceOrder failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setBookingDate('');
    setBookingAddress('');
    setBookingNotes('');
    setBookingSuccess(false);
  };

  return (
    <AppLayout title="Service Details">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
          <Link to="/shop/services" className="hover:text-violet-600 transition-colors">All Services</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-slate-500">{cat?.name ?? service.category}</span>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-slate-700 font-medium truncate max-w-xs">{service.title}</span>
        </nav>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* LEFT — Hero image (sticky on desktop) */}
          <div className="w-full lg:w-[55%] lg:sticky lg:top-4">
            {service.images && service.images.length > 0 ? (
              <div className="rounded-2xl overflow-hidden aspect-video">
                <img
                  src={service.images[0]}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden">
                <div className={clsx(
                  'h-72 sm:h-96 bg-gradient-to-br flex items-center justify-center text-9xl',
                  service.imageColor
                )}>
                  {service.imageIcon}
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  {cat && (
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {cat.icon} {cat.name}
                    </span>
                  )}
                  {service.featured && (
                    <span className="bg-white/90 backdrop-blur text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Service info */}
          <div className="w-full lg:w-[45%] space-y-5">

            {/* Category badge */}
            {cat && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full">
                {cat.icon} {cat.name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {service.title}
            </h1>

            {/* Provider */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="h-4 w-4 text-slate-400" />
              by <span className="font-semibold text-slate-700">{service.providerName}</span>
            </div>

            {/* Rating row */}
            {service.rating > 0 ? (
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
                <span className="text-sm font-semibold text-slate-700">{service.rating.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({service.reviewCount} reviews)</span>
              </div>
            ) : (
              <span className="inline-flex items-center text-xs font-semibold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                New Service
              </span>
            )}

            {/* Price row */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-slate-900">{formatCurrency(service.price)}</span>
              {priceLabel && (
                <span className="text-base text-slate-400 font-medium">{priceLabel}</span>
              )}
            </div>

            {/* Delivery time */}
            {service.deliveryTime && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Estimated time: <span className="font-semibold text-slate-700">{service.deliveryTime}</span></span>
              </div>
            )}

            {/* City availability */}
            <div className={clsx(
              'flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg w-fit',
              isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            )}>
              <MapPin className="h-4 w-4 flex-shrink-0" />
              {service.availableCities.length === 0
                ? 'Available Nationwide'
                : isAvailable
                  ? `Available in: ${service.availableCities.slice(0, 3).join(', ')}${service.availableCities.length > 3 ? ` +${service.availableCities.length - 3} more` : ''}`
                  : `Not available in ${currentUser?.city}`
              }
            </div>

            {/* Book Now button */}
            <button
              onClick={() => isAvailable && setShowModal(true)}
              disabled={!isAvailable}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150',
                isAvailable
                  ? 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {isAvailable ? 'Book Now' : 'Not Available in Your City'}
            </button>

            {/* What's Included */}
            {service.includes && service.includes.length > 0 && (
              <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">What's Included</h3>
                <ul className="space-y-2">
                  {service.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* How it Works */}
            {service.process && service.process.length > 0 && (
              <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">How it Works</h3>
                <ol className="space-y-3">
                  {service.process.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{step.step}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Tags */}
            {service.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {service.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-slate-900">Related Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedServices.map(s => {
                const sCat = SERVICE_CATEGORIES.find(c => c.slug === s.category);
                const sPriceLabel = s.priceType === 'hourly' ? '/hr' : s.priceType === 'starting_from' ? ' onwards' : '';
                return (
                  <Link
                    key={s.id}
                    to={`/shop/service/${s.id}`}
                    className="card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block"
                  >
                    <div className={clsx('h-28 bg-gradient-to-br flex items-center justify-center text-4xl relative', s.imageColor)}>
                      {s.imageIcon}
                    </div>
                    <div className="p-3">
                      {sCat && (
                        <span className="text-xs text-violet-600">{sCat.icon} {sCat.name}</span>
                      )}
                      <h3 className="font-semibold text-slate-800 text-xs leading-tight mt-1 mb-1.5 line-clamp-2">{s.title}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(s.price)}</span>
                        {sPriceLabel && <span className="text-xs text-slate-400">{sPriceLabel}</span>}
                      </div>
                      <span className="mt-2 block text-center text-xs py-1.5 rounded-lg bg-violet-50 text-violet-700 font-medium hover:bg-violet-100 transition-colors">
                        View Service
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Book Service</h3>
                <p className="text-sm text-slate-500 mt-0.5">{service.title}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Booking Confirmed!</h4>
                <p className="text-sm text-slate-500">
                  Your booking for <span className="font-semibold text-slate-700">{service.title}</span> on{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>{' '}
                  has been placed. The provider will confirm shortly.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { closeModal(); navigate('/shop/orders'); }}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    View Orders
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    min={today}
                    onChange={e => setBookingDate(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Service Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bookingAddress}
                    onChange={e => setBookingAddress(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter your full address where the service is needed…"
                    className="input w-full resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Additional Notes <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                    rows={2}
                    placeholder="Any specific requirements or preferences…"
                    className="input w-full resize-none"
                  />
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-slate-500">Service fee</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(service.price)}{priceLabel}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !bookingDate || !bookingAddress}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors',
                    submitting || !bookingDate || !bookingAddress
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
                  ) : (
                    <><CalendarDays className="h-4 w-4" /> Confirm Booking</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};
