import React, { useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { formatCurrency, SERVICE_CATEGORIES } from '../../data/mockData';
import { useAppStore } from '../../store/useAppStore';
import type { Service } from '../../types';
import { Search, X, Briefcase, CheckCircle, MapPin, Star, Clock } from 'lucide-react';
import clsx from 'clsx';
import { mutations } from '../../lib/dataService';
import { isSupabaseConfigured } from '../../lib/supabase';

interface BookingFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  scheduledDate: string;
  notes: string;
}

const EMPTY_FORM: BookingFormData = {
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  scheduledDate: '',
  notes: '',
};

export const AgentServices: React.FC = () => {
  const { currentUser, services, agents, addServiceOrder } = useAppStore();

  const agent = agents.find(a => a.id === currentUser?.id);
  const agentCity = agent?.city ?? '';
  const agentRate = agent?.commissionRate ?? 0;

  // Services available in agent's city
  const availableServices = services.filter(s =>
    s.status === 'active' &&
    (s.availableCities.length === 0 || s.availableCities.includes(agentCity))
  );

  const categories = Array.from(new Set(availableServices.map(s => s.category)));

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = availableServices.filter(s => {
    const matchSearch = search === '' ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openModal = (service: Service) => {
    setSelectedService(service);
    setForm(EMPTY_FORM);
    setFormError('');
    setSuccessMessage('');
  };

  const closeModal = () => {
    setSelectedService(null);
    setSuccessMessage('');
    setFormError('');
  };

  const getCommissionAmount = (service: Service) => {
    // Agent earns their commission rate OR the service's agent commission, whichever the admin set
    const rate = Math.min(agentRate, service.commission);
    return Math.round((rate / 100) * service.price);
  };

  const getEffectiveRate = (service: Service) => Math.min(agentRate, service.commission);

  const handleConfirmBooking = async () => {
    if (!selectedService || !currentUser || !agent) return;
    if (!form.customerName.trim()) { setFormError('Customer name is required.'); return; }
    if (!form.customerPhone.trim()) { setFormError('Customer phone is required.'); return; }
    if (!form.customerAddress.trim()) { setFormError('Customer address is required.'); return; }
    if (!form.scheduledDate) { setFormError('Scheduled date is required.'); return; }

    setFormError('');
    setSubmitting(true);

    const commissionAmt = getCommissionAmount(selectedService);

    const orderData: Omit<import('../../types').ServiceOrder, 'id'> = {
      serviceId:     selectedService.id,
      serviceTitle:  selectedService.title,
      serviceIcon:   selectedService.imageIcon,
      serviceColor:  selectedService.imageColor,
      providerId:    selectedService.providerId,
      providerName:  selectedService.providerName,
      // Agent walk-in: use agent's own id as customer_id so RLS INSERT check passes
      customerId:    currentUser.id,
      customerName:  form.customerName.trim(),
      customerEmail: `${form.customerPhone.trim()}@agent.askindia`,
      customerPhone: form.customerPhone.trim(),
      amount:        selectedService.price,
      status:        'pending',
      scheduledDate: form.scheduledDate,
      address:       form.customerAddress.trim(),
      city:          agentCity,
      notes:         form.notes.trim() || undefined,
      agentId:       currentUser.id,
      agentName:     currentUser.name,
      agentCode:     agent.agentCode,
      agentCommission: commissionAmt,
      createdAt:     new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured) {
        const dbId = await mutations.createServiceOrder(orderData);
        addServiceOrder(orderData, dbId);
      } else {
        addServiceOrder(orderData);
      }
      setSuccessMessage(`Booking confirmed! You earned ${formatCurrency(commissionAmt)} commission.`);
    } catch (err) {
      console.error('[AgentServices] createServiceOrder failed:', err);
      setFormError('Failed to save booking. Please try again.');
    }

    setSubmitting(false);
  };

  const priceLabel = (s: Service) => {
    if (s.priceType === 'hourly') return `${formatCurrency(s.price)}/hr`;
    if (s.priceType === 'starting_from') return `From ${formatCurrency(s.price)}`;
    return formatCurrency(s.price);
  };

  return (
    <AppLayout title="Book Services">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Services to Book</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {availableServices.length} services available in {agentCity}
            </p>
          </div>
          <div className="text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
            Your commission rate: {agentRate}% per booking
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input max-w-[200px]"
          >
            <option value="all">All Categories</option>
            {categories.map(c => {
              const cat = SERVICE_CATEGORIES.find(sc => sc.slug === c);
              return (
                <option key={c} value={c}>{cat ? `${cat.icon} ${cat.name}` : c}</option>
              );
            })}
          </select>
        </div>

        {/* Service grid */}
        {filtered.length === 0 ? (
          <div className="card py-20 text-center text-slate-400">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No services found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(service => {
              const effRate = getEffectiveRate(service);
              const commAmt = getCommissionAmount(service);
              const cat = SERVICE_CATEGORIES.find(c => c.slug === service.category);
              return (
                <div key={service.id} className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className={`h-32 bg-gradient-to-br ${service.imageColor} flex items-center justify-center text-5xl relative`}>
                    {service.featured && (
                      <span className="absolute top-2 left-2 bg-white/90 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ⭐ Featured
                      </span>
                    )}
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {effRate}% comm.
                    </span>
                    {service.imageIcon}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 font-medium mb-0.5">
                        {cat ? `${cat.icon} ${cat.name}` : service.category}
                      </p>
                      <p className="font-semibold text-slate-900 line-clamp-2 leading-snug">{service.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{service.providerName}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-base font-bold text-violet-700">{priceLabel(service)}</span>
                        {service.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {service.rating.toFixed(1)} ({service.reviewCount})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {service.deliveryTime}
                      </div>

                      <div className="flex items-start gap-1 mt-1.5">
                        <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-400">
                          {service.availableCities.length === 0
                            ? 'Pan India'
                            : service.availableCities.slice(0, 2).join(', ') +
                              (service.availableCities.length > 2 ? ` +${service.availableCities.length - 2}` : '')}
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-emerald-600 mt-2 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                        Your commission: {formatCurrency(commAmt)} per booking
                      </p>
                    </div>

                    <button
                      onClick={() => openModal(service)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                      <Briefcase className="h-4 w-4" />
                      Book for Customer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-medium">Book Service</p>
                <h3 className="font-bold text-slate-900">{selectedService.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedService.providerName}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {successMessage ? (
              <div className="p-8 text-center">
                <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-900">Booking Confirmed!</p>
                <p className="text-sm text-slate-500 mt-2">{successMessage}</p>
                <button
                  onClick={closeModal}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Customer details */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Enter customer full name"
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Customer Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="10-digit mobile number"
                    value={form.customerPhone}
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Service Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input min-h-[80px] resize-none"
                    placeholder="Full address for service delivery"
                    value={form.customerAddress}
                    onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.scheduledDate}
                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                  <textarea
                    className="input min-h-[60px] resize-none"
                    placeholder="Any special instructions..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery City</label>
                  <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={agentCity} readOnly />
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Booking Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service Fee</span>
                    <span className="font-medium">{priceLabel(selectedService)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-600">
                    <span>Your Commission ({getEffectiveRate(selectedService)}%)</span>
                    <span>{formatCurrency(getCommissionAmount(selectedService))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 border-t border-slate-200 pt-2 mt-2">
                    <span>Booked by</span>
                    <span>{currentUser?.name} ({agent?.agentCode})</span>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-colors',
                    submitting ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                  )}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirming…
                    </span>
                  ) : 'Confirm Booking'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};
