import React, { useState, useRef, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../data/mockData';
import { CheckCircle, CreditCard, Smartphone, Wallet, Truck, Loader2 } from 'lucide-react';
import { useTracking } from '../../hooks/useTracking';
import { mutations } from '../../lib/dataService';
import { isSupabaseConfigured } from '../../lib/supabase';

type Step = 'address' | 'payment' | 'success';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'Pay via Google Pay, PhonePe, Paytm' },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay accepted' },
  { id: 'cod', label: 'Cash on Delivery', icon: Truck, desc: 'Pay when your order arrives' },
  { id: 'wallet', label: 'AskIndia Wallet', icon: Wallet, desc: 'Instant, secure payment' },
];

export const CustomerCheckout: React.FC = () => {
  const { cart, clearCart, addOrder, currentUser, stores, markCartRecovered } = useAppStore();
  const navigate = useNavigate();
  const { track } = useTracking();
  const [step, setStep] = useState<Step>('address');

  useEffect(() => { track('checkout_start', { itemCount: cart.length }, '/shop/checkout'); }, []);
  const [payMethod, setPayMethod] = useState<'card' | 'upi' | 'wallet' | 'cod'>('upi');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const orderIdRef = useRef(`ORD${Date.now().toString().slice(-6)}`);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 999 ? 0 : 49;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setPlaceError('');

    // Find the correct store for cart items (use first product's store_id if available)
    const firstProduct = cart[0]?.product;
    const targetStore = firstProduct
      ? (stores.find(s => s.id === (firstProduct as any).storeId) ?? stores[0])
      : stores[0];
    const storeId   = targetStore?.id   ?? 'global';
    const storeName = targetStore?.name ?? 'AskIndia Store';

    const items = cart.map(({ product, quantity }) => ({
      productId:    product.id,
      productName:  product.name,
      productIcon:  product.imageIcon,
      productColor: product.imageColor,
      price:        product.price,
      quantity,
      commission:   product.commission,
    }));

    const commissionTotal = items.reduce((s, i) => s + (i.price * i.quantity * i.commission / 100), 0);
    const adminRevenue    = total - commissionTotal;

    const orderData: Omit<import('../../types').Order, 'id'> = {
      customerId:      currentUser?.id    ?? 'guest',
      customerName:    currentUser?.name  ?? 'Guest',
      customerEmail:   currentUser?.email ?? '',
      storeId,
      storeName,
      items,
      subtotal,
      total,
      commissionTotal,
      adminRevenue,
      status:        'pending',
      paymentMethod: payMethod,
      paymentStatus: 'paid',
      address:       address || 'Address not provided',
      city,
      createdAt:     new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured) {
        // Write to database — this makes the order visible to admin & store owner
        const dbId = await mutations.createOrder(orderData);
        orderIdRef.current = dbId;
        addOrder(orderData, dbId);   // pass real DB id so Zustand matches DB
      } else {
        addOrder(orderData);         // mock / offline mode
      }

      track('checkout_complete', { total, itemCount: cart.length }, '/shop/checkout');
      markCartRecovered(`ac_${currentUser?.id}_latest`);
      setStep('success');
      setTimeout(() => { clearCart(); }, 500);
    } catch (err) {
      console.error('[Checkout] createOrder failed:', err);
      setPlaceError('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (step === 'success') {
    return (
      <AppLayout title="Order Confirmed">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-slate-500 mb-2">Your order <span className="font-mono font-bold text-brand-600">#{orderIdRef.current}</span> has been confirmed.</p>
          <p className="text-slate-500 text-sm mb-8">You'll receive a confirmation email shortly. Expected delivery in 3-5 business days.</p>
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Order Summary</p>
            <div className="space-y-2">
              {['Subtotal', 'Delivery', 'Total'].map((label, i) => (
                <div key={label} className={`flex justify-between text-sm ${i === 2 ? 'font-bold pt-2 border-t border-slate-200' : ''}`}>
                  <span className="text-slate-600">{label}</span>
                  <span>{i === 0 ? formatCurrency(subtotal) : i === 1 ? (shipping === 0 ? 'FREE' : formatCurrency(shipping)) : formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/shop/orders')} className="btn-secondary">Track Order</button>
            <button onClick={() => navigate('/shop')} className="btn-primary">Continue Shopping</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Checkout">
      <div className="max-w-4xl mx-auto grid xl:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="xl:col-span-2 space-y-5">
          {/* Steps indicator */}
          <div className="flex items-center gap-3">
            {(['address', 'payment'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${step === s ? 'text-brand-600' : i < (['address', 'payment'] as const).indexOf(step) ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === s ? 'bg-brand-600 text-white' :
                    i < (['address', 'payment'] as const).indexOf(step) ? 'bg-emerald-600 text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>{i + 1}</div>
                  <span className="text-sm font-medium capitalize">{s}</span>
                </div>
                {i < 1 && <div className="flex-1 h-px bg-slate-200" />}
              </React.Fragment>
            ))}
          </div>

          {/* Address step */}
          {step === 'address' && (
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">Delivery Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                  <input className="input" defaultValue="Priya" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                  <input className="input" defaultValue="Singh" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address Line 1</label>
                  <input className="input" placeholder="House/Flat/Block no." value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address Line 2</label>
                  <input className="input" placeholder="Street, Area, Landmark" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                  <input className="input" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">PIN Code</label>
                  <input className="input" placeholder="400001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <select className="input">
                    <option>Maharashtra</option>
                    <option>Delhi</option>
                    <option>Karnataka</option>
                    <option>Tamil Nadu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile</label>
                  <input className="input" placeholder="+91 98765 43210" />
                </div>
              </div>
              <button onClick={() => setStep('payment')} className="btn-primary w-full justify-center py-3">
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Payment step */}
          {step === 'payment' && (
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">Payment Method</h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                  <label key={id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      payMethod === id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <input type="radio" name="payment" value={id} checked={payMethod === id}
                      onChange={() => setPayMethod(id as 'card' | 'upi' | 'wallet' | 'cod')} className="text-brand-600" />
                    <div className={`p-2 rounded-lg ${payMethod === id ? 'bg-brand-100' : 'bg-slate-100'}`}>
                      <Icon className={`h-5 w-5 ${payMethod === id ? 'text-brand-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {payMethod === 'card' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                  <input className="input" placeholder="Card Number" />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" placeholder="MM / YY" />
                    <input className="input" placeholder="CVV" />
                  </div>
                  <input className="input" placeholder="Cardholder Name" />
                </div>
              )}
              {payMethod === 'upi' && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <input className="input" placeholder="Enter UPI ID (e.g. name@paytm)" />
                </div>
              )}
              {placeError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{placeError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('address')} disabled={placing} className="btn-secondary flex-1 justify-center">← Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary flex-1 justify-center py-3 gap-2">
                  {placing ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing Order…</> : <>Place Order & Pay {formatCurrency(total)}</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart summary */}
        <div className="card p-5 h-fit sticky top-24">
          <h3 className="font-semibold text-slate-900 mb-4">Order ({cart.length} items)</h3>
          <div className="space-y-3 mb-4">
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${product.imageColor} flex items-center justify-center text-xl flex-shrink-0`}>
                  {product.imageIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-400">Qty: {quantity}</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(product.price * quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery</span>
              <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-brand-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
