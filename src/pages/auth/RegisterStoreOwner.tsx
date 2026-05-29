import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AskIndiaLogo } from '../../components/AskIndiaLogo';
import { useAppStore } from '../../store/useAppStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService, mutations } from '../../lib/dataService';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  'Individual / Sole Proprietor',
  'Partnership Firm',
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Public Limited Company',
  'Hindu Undivided Family (HUF)',
];

const BUSINESS_CATEGORIES = [
  'Electronics & Technology',
  'Fashion & Apparel',
  'Sports & Fitness',
  'Home & Living',
  'Beauty & Personal Care',
  'Food & Grocery',
  'Books & Stationery',
  'Toys & Games',
  'Automotive & Accessories',
  'Health & Wellness',
  'Jewellery & Accessories',
  'Other',
];

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'IndusInd Bank',
  'Yes Bank', 'Federal Bank', 'IDFC First Bank', 'RBL Bank',
  'South Indian Bank', 'Other',
];

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi (NCT)',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  firstName: string; lastName: string; email: string;
  phone: string; whatsapp: string; sameAsPhone: boolean;
  // Step 2
  businessType: string; legalName: string; panNumber: string;
  gstNumber: string; noGst: boolean; businessCategory: string; yearsInBusiness: string;
  // Step 3
  storeName: string; storeTagline: string; storeDescription: string;
  storeSlug: string; state: string; city: string; businessAddress: string;
  // Step 4
  accountHolderName: string; bankName: string; accountNumber: string;
  confirmAccountNumber: string; ifscCode: string; accountType: string;
  // Step 5
  password: string; confirmPassword: string;
  agreeTerms: boolean; agreeCommission: boolean; agreePrivacy: boolean;
}

const INITIAL: FormData = {
  firstName: '', lastName: '', email: '', phone: '', whatsapp: '', sameAsPhone: false,
  businessType: '', legalName: '', panNumber: '', gstNumber: '', noGst: false,
  businessCategory: '', yearsInBusiness: '',
  storeName: '', storeTagline: '', storeDescription: '', storeSlug: '',
  state: '', city: '', businessAddress: '',
  accountHolderName: '', bankName: '', accountNumber: '',
  confirmAccountNumber: '', ifscCode: '', accountType: 'Savings',
  password: '', confirmPassword: '',
  agreeTerms: false, agreeCommission: false, agreePrivacy: false,
};

const STEPS = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Business Details' },
  { num: 3, label: 'Store Setup' },
  { num: 4, label: 'Banking & Payout' },
  { num: 5, label: 'Create Password' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 40);

const passwordStrength = (p: string) => {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: '40%' };
  if (score === 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
  if (score === 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
  return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string; required?: boolean; hint?: string;
  error?: string; children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {error}
      </p>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const RegisterStoreOwner: React.FC = () => {
  const navigate = useNavigate();
  const { register, isEmailTaken, createStore, updateUserStoreId,
          setCurrentUser, loadFromSupabase } = useAppStore();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showAccNum, setShowAccNum] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set_ = (field: keyof FormData, value: string | boolean) => {
    setData(d => {
      const updated = { ...d, [field]: value };
      // Auto-slug
      if (field === 'storeName') updated.storeSlug = slugify(value as string);
      // Auto-fill whatsapp
      if (field === 'sameAsPhone' && value === true) updated.whatsapp = updated.phone;
      if (field === 'phone' && updated.sameAsPhone) updated.whatsapp = value as string;
      return updated;
    });
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  // ─── Validation per step ──────────────────────────────────────────────────

  const validate1 = (): boolean => {
    const e: typeof errors = {};
    if (!data.firstName.trim()) e.firstName = 'First name is required';
    else if (data.firstName.trim().length < 2) e.firstName = 'Minimum 2 characters';
    if (!data.lastName.trim()) e.lastName = 'Last name is required';
    else if (data.lastName.trim().length < 2) e.lastName = 'Minimum 2 characters';
    if (!data.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email address';
    else if (isEmailTaken(data.email)) e.email = 'An account with this email already exists';
    if (!data.phone.trim()) e.phone = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(data.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!data.sameAsPhone && data.whatsapp && !/^[6-9]\d{9}$/.test(data.whatsapp.replace(/\D/g, '')))
      e.whatsapp = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = (): boolean => {
    const e: typeof errors = {};
    if (!data.businessType) e.businessType = 'Select a business type';
    if (!data.legalName.trim()) e.legalName = 'Legal business name is required';
    else if (data.legalName.trim().length < 3) e.legalName = 'Minimum 3 characters';
    if (!data.panNumber.trim()) e.panNumber = 'PAN number is required';
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber.toUpperCase())) e.panNumber = 'Invalid PAN format (e.g. ABCDE1234F)';
    if (!data.noGst && data.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber.toUpperCase()))
      e.gstNumber = 'Invalid GST number format';
    if (!data.businessCategory) e.businessCategory = 'Select a business category';
    if (!data.yearsInBusiness) e.yearsInBusiness = 'Select years in business';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate3 = (): boolean => {
    const e: typeof errors = {};
    if (!data.storeName.trim()) e.storeName = 'Store name is required';
    else if (data.storeName.trim().length < 3) e.storeName = 'Minimum 3 characters';
    if (!data.storeTagline.trim()) e.storeTagline = 'Store tagline is required';
    else if (data.storeTagline.length > 80) e.storeTagline = 'Maximum 80 characters';
    if (!data.storeDescription.trim()) e.storeDescription = 'Store description is required';
    else if (data.storeDescription.length < 30) e.storeDescription = 'Minimum 30 characters';
    if (!data.storeSlug.trim()) e.storeSlug = 'Store URL is required';
    else if (!/^[a-z0-9-]+$/.test(data.storeSlug)) e.storeSlug = 'Only lowercase letters, numbers, and hyphens allowed';
    if (!data.state) e.state = 'Select your state';
    if (!data.city.trim()) e.city = 'City is required';
    if (!data.businessAddress.trim()) e.businessAddress = 'Business address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate4 = (): boolean => {
    const e: typeof errors = {};
    if (!data.accountHolderName.trim()) e.accountHolderName = 'Account holder name is required';
    if (!data.bankName) e.bankName = 'Select your bank';
    if (!data.accountNumber.trim()) e.accountNumber = 'Account number is required';
    else if (!/^\d{9,18}$/.test(data.accountNumber)) e.accountNumber = 'Enter a valid account number (9–18 digits)';
    if (!data.confirmAccountNumber.trim()) e.confirmAccountNumber = 'Please confirm account number';
    else if (data.accountNumber !== data.confirmAccountNumber) e.confirmAccountNumber = 'Account numbers do not match';
    if (!data.ifscCode.trim()) e.ifscCode = 'IFSC code is required';
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())) e.ifscCode = 'Invalid IFSC code format (e.g. HDFC0001234)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate5 = (): boolean => {
    const e: typeof errors = {};
    if (!data.password) e.password = 'Password is required';
    else if (data.password.length < 8) e.password = 'Minimum 8 characters required';
    if (!data.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (data.password !== data.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!data.agreeTerms) e.agreeTerms = 'You must accept the Terms & Conditions';
    if (!data.agreeCommission) e.agreeCommission = 'You must accept the Commission Policy';
    if (!data.agreePrivacy) e.agreePrivacy = 'You must accept the Privacy Policy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validators = [validate1, validate2, validate3, validate4, validate5];

  const handleNext = () => {
    if (validators[step - 1]()) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!validate5()) return;
    setIsSubmitting(true);

    if (isSupabaseConfigured) {
      // Supabase mode — create real account + store
      const ownerName = `${data.firstName} ${data.lastName}`;
      const signUpResult = await authService.signUp({
        email: data.email,
        password: data.password,
        name: ownerName,
        role: 'store_owner',
        phone: data.phone,
        city: data.city,
        state: data.state,
      });

      if (signUpResult.success && signUpResult.userId) {
        try {
          await mutations.createStore({
            ownerId: signUpResult.userId,
            ownerName,
            name: data.storeName,
            slug: data.storeSlug,
            tagline: data.storeTagline,
            description: data.storeDescription,
            logo: '🏪',
            themeColor: '#4f46e5',
            city: data.city,
            state: data.state,
            commissionRate: 20,
            status: 'pending',
            storeType: 'product',
            subdomain: data.storeSlug,
          });
        } catch (err) {
          console.error('[RegisterStoreOwner] Store creation failed:', err);
        }
        // Sign the user in after successful registration
        const signInResult = await authService.signIn(data.email, data.password);
        if (signInResult.success && signInResult.user) {
          setCurrentUser(signInResult.user);
          await loadFromSupabase(signInResult.user.id, 'store_owner', signInResult.user.storeId ?? null);
        }
      }
      setIsSubmitting(false);
      if (signUpResult.success) setSubmitted(true);
      else setErrors({ email: signUpResult.error });
    } else {
      // Mock mode
      await new Promise(r => setTimeout(r, 1200));
      const result = register({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        role: 'store_owner',
        passwordHash: data.password,
      });
      if (result.success && result.userId) {
        const storeId = createStore({
          ownerId: result.userId,
          ownerName: `${data.firstName} ${data.lastName}`,
          name: data.storeName,
          slug: data.storeSlug,
          tagline: data.storeTagline,
          description: data.storeDescription,
          logo: '🏪',
          themeColor: '#4f46e5',
          city: data.city,
          state: data.state,
          commissionRate: 20,
          status: 'pending',
          storeType: 'product',
          subdomain: data.storeSlug,
        });
        updateUserStoreId(result.userId, storeId);
      }
      setIsSubmitting(false);
      if (result.success) setSubmitted(true);
      else setErrors({ email: result.error });
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Store Registration Submitted!</h2>
          <p className="text-slate-500 mb-2">
            Welcome, <strong>{data.firstName}</strong>! Your store <strong>{data.storeName}</strong> has been registered.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Your store will be live at{' '}
            <span className="font-mono text-brand-600">{data.storeSlug}.askindia.shop</span>{' '}
            once approved by our team.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">⏳ Next Steps</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-700">
              <li>Your banking details are under verification (1–2 business days)</li>
              <li>Products from the platform catalog are now live on your store</li>
              <li>Share your store link to start earning commissions</li>
            </ul>
          </div>
          <button onClick={() => navigate('/store')} className="btn-primary w-full justify-center py-3 text-base">
            Go to My Store Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ─── Shared input style ───────────────────────────────────────────────────

  const inp = (field: keyof FormData) =>
    clsx('input', errors[field] && 'border-red-400 bg-red-50 focus:ring-red-500');

  const strength = passwordStrength(data.password);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AskIndiaLogo size={30} showText={true} textClass="text-base" />
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-sm text-slate-500">Store Owner Registration</span>
        </div>
        <Link to="/login" className="text-sm text-brand-600 font-medium hover:text-brand-700">
          Already registered? Sign in
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step progress */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  step > s.num ? 'bg-emerald-600 border-emerald-600 text-white'
                    : step === s.num ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                )}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={clsx(
                  'text-xs mt-1 font-medium hidden sm:block',
                  step === s.num ? 'text-brand-600' : step > s.num ? 'text-emerald-600' : 'text-slate-400'
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={clsx('flex-1 h-0.5 mx-1 mb-4', step > s.num ? 'bg-emerald-500' : 'bg-slate-200')} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form card */}
        <div className="card p-8 animate-fade-in">

          {/* ── Step 1: Personal Info ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-500 mt-1">This information is used for account verification and communication.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.firstName}>
                  <input className={inp('firstName')} value={data.firstName}
                    onChange={e => set_('firstName', e.target.value)} placeholder="Rahul" />
                </Field>
                <Field label="Last Name" required error={errors.lastName}>
                  <input className={inp('lastName')} value={data.lastName}
                    onChange={e => set_('lastName', e.target.value)} placeholder="Sharma" />
                </Field>
              </div>

              <Field label="Email Address" required error={errors.email}
                hint="This will be your login ID and primary contact for notifications.">
                <input className={inp('email')} type="email" value={data.email}
                  onChange={e => set_('email', e.target.value)} placeholder="rahul@yourstore.com" />
              </Field>

              <Field label="Mobile Number" required error={errors.phone}
                hint="A 10-digit Indian mobile number. Used for OTP verification and order alerts.">
                <div className="flex">
                  <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 whitespace-nowrap">+91</span>
                  <input className={clsx(inp('phone'), 'rounded-l-none')} type="tel" value={data.phone}
                    onChange={e => set_('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210" />
                </div>
              </Field>

              <div>
                <Field label="WhatsApp Number" error={errors.whatsapp}
                  hint="For important business notifications. Leave blank if not applicable.">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={data.sameAsPhone}
                        onChange={e => set_('sameAsPhone', e.target.checked)}
                        className="rounded border-slate-300 text-brand-600" />
                      Same as mobile number
                    </label>
                  </div>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600">+91</span>
                    <input className={clsx(inp('whatsapp'), 'rounded-l-none')} type="tel"
                      value={data.whatsapp} disabled={data.sameAsPhone}
                      onChange={e => set_('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={data.sameAsPhone ? data.phone : '98765 43210'} />
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Business Details ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Business Details</h2>
                <p className="text-sm text-slate-500 mt-1">Required for GST compliance, invoicing, and commission payouts.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Business Type" required error={errors.businessType}>
                  <select className={inp('businessType')} value={data.businessType}
                    onChange={e => set_('businessType', e.target.value)}>
                    <option value="">Select type</option>
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Years in Business" required error={errors.yearsInBusiness}>
                  <select className={inp('yearsInBusiness')} value={data.yearsInBusiness}
                    onChange={e => set_('yearsInBusiness', e.target.value)}>
                    <option value="">Select</option>
                    <option>Less than 1 year</option>
                    <option>1–2 years</option>
                    <option>3–5 years</option>
                    <option>6–10 years</option>
                    <option>More than 10 years</option>
                  </select>
                </Field>
              </div>

              <Field label="Legal Business / Trade Name" required error={errors.legalName}
                hint="As registered with MCA or GST authorities. This appears on invoices.">
                <input className={inp('legalName')} value={data.legalName}
                  onChange={e => set_('legalName', e.target.value)} placeholder="Sharma Electronics Pvt. Ltd." />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="PAN Number" required error={errors.panNumber}
                  hint="Permanent Account Number (e.g. ABCDE1234F)">
                  <input className={inp('panNumber')} value={data.panNumber}
                    onChange={e => set_('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F" maxLength={10} />
                </Field>
                <Field label="Business Category" required error={errors.businessCategory}>
                  <select className={inp('businessCategory')} value={data.businessCategory}
                    onChange={e => set_('businessCategory', e.target.value)}>
                    <option value="">Select category</option>
                    {BUSINESS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    GST Number
                    <span className="ml-1.5 text-xs text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={data.noGst}
                      onChange={e => set_('noGst', e.target.checked)}
                      className="rounded border-slate-300 text-brand-600" />
                    Not GST registered
                  </label>
                </div>
                <input className={clsx(inp('gstNumber'), data.noGst && 'opacity-50')}
                  value={data.gstNumber} disabled={data.noGst}
                  onChange={e => set_('gstNumber', e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="22ABCDE1234F1Z5" maxLength={15} />
                {errors.gstNumber && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{errors.gstNumber}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">15-character GSTIN. Required if annual turnover exceeds ₹40L.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Your business information is encrypted and used solely for compliance, invoicing, and commission payouts. We never share your data with third parties.</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Store Setup ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Store Setup</h2>
                <p className="text-sm text-slate-500 mt-1">Customize how your store appears to customers.</p>
              </div>

              <Field label="Store Display Name" required error={errors.storeName}
                hint="The public name customers will see. Can differ from your legal business name.">
                <input className={inp('storeName')} value={data.storeName}
                  onChange={e => set_('storeName', e.target.value)} placeholder="Rahul's Tech Corner" />
              </Field>

              <Field label="Store Tagline" required error={errors.storeTagline}
                hint={`${data.storeTagline.length}/80 characters. A short phrase describing your store.`}>
                <input className={inp('storeTagline')} value={data.storeTagline} maxLength={80}
                  onChange={e => set_('storeTagline', e.target.value)}
                  placeholder="Your one-stop destination for tech gadgets" />
              </Field>

              <Field label="Store Description" required error={errors.storeDescription}
                hint={`${data.storeDescription.length}/500 characters. Tell customers what makes your store unique.`}>
                <textarea className={clsx(inp('storeDescription'), 'h-24 resize-none')}
                  value={data.storeDescription} maxLength={500}
                  onChange={e => set_('storeDescription', e.target.value)}
                  placeholder="Describe your store, what products you focus on, and why customers should shop from you…" />
              </Field>

              <Field label="Store URL" required error={errors.storeSlug}
                hint="Your unique store URL. Only lowercase letters, numbers and hyphens allowed.">
                <div className="flex">
                  <input className={clsx(inp('storeSlug'), 'rounded-r-none')} value={data.storeSlug}
                    onChange={e => set_('storeSlug', slugify(e.target.value))} placeholder="rahultechcorner" />
                  <span className="flex items-center px-3 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-500 whitespace-nowrap">
                    .askindia.shop
                  </span>
                </div>
                {data.storeSlug && !errors.storeSlug && (
                  <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Your store will be live at: <span className="font-mono font-medium">{data.storeSlug}.askindia.shop</span>
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="State" required error={errors.state}>
                  <select className={inp('state')} value={data.state}
                    onChange={e => set_('state', e.target.value)}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="City" required error={errors.city}>
                  <input className={inp('city')} value={data.city}
                    onChange={e => set_('city', e.target.value)} placeholder="Mumbai" />
                </Field>
              </div>

              <Field label="Business / Registered Address" required error={errors.businessAddress}
                hint="Your full business address including landmark and PIN code.">
                <textarea className={clsx(inp('businessAddress'), 'h-20 resize-none')}
                  value={data.businessAddress}
                  onChange={e => set_('businessAddress', e.target.value)}
                  placeholder="Flat/Shop No., Building Name, Street, Area, Landmark, PIN Code" />
              </Field>
            </div>
          )}

          {/* ── Step 4: Banking ───────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Banking & Payout Details</h2>
                <p className="text-sm text-slate-500 mt-1">Commission payouts will be transferred to this bank account after order fulfilment.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Enter the bank account registered in your business or personal name. Bank details are verified before your first payout is processed.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Account Holder Name" required error={errors.accountHolderName}
                  hint="Exactly as it appears on your bank passbook">
                  <input className={inp('accountHolderName')} value={data.accountHolderName}
                    onChange={e => set_('accountHolderName', e.target.value)} placeholder="RAHUL SHARMA" />
                </Field>
                <Field label="Bank Name" required error={errors.bankName}>
                  <select className={inp('bankName')} value={data.bankName}
                    onChange={e => set_('bankName', e.target.value)}>
                    <option value="">Select bank</option>
                    {BANKS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Account Number" required error={errors.accountNumber}
                hint="9 to 18 digits. Do not include spaces or dashes.">
                <div className="relative">
                  <input className={inp('accountNumber')} type={showAccNum ? 'text' : 'password'}
                    value={data.accountNumber}
                    onChange={e => set_('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                    placeholder="Enter account number" />
                  <button type="button" onClick={() => setShowAccNum(!showAccNum)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showAccNum ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm Account Number" required error={errors.confirmAccountNumber}>
                <input className={inp('confirmAccountNumber')} type="text"
                  value={data.confirmAccountNumber}
                  onChange={e => set_('confirmAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                  placeholder="Re-enter account number" />
                {data.confirmAccountNumber && data.accountNumber === data.confirmAccountNumber && (
                  <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Account numbers match
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="IFSC Code" required error={errors.ifscCode}
                  hint="11-character code on your cheque book (e.g. HDFC0001234)">
                  <input className={inp('ifscCode')} value={data.ifscCode}
                    onChange={e => set_('ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                    placeholder="HDFC0001234" maxLength={11} />
                </Field>
                <Field label="Account Type" required>
                  <div className="flex gap-3 pt-1">
                    {['Savings', 'Current'].map(t => (
                      <label key={t} className={clsx(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium transition-all',
                        data.accountType === t
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}>
                        <input type="radio" name="accountType" value={t}
                          checked={data.accountType === t}
                          onChange={() => set_('accountType', t)} className="sr-only" />
                        {t}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 5: Password ──────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Create Your Password</h2>
                <p className="text-sm text-slate-500 mt-1">Set a secure password to protect your store account.</p>
              </div>

              <Field label="Password" required error={errors.password}
                hint="Minimum 8 characters. Use a mix of letters, numbers & symbols for a stronger password.">
                <div className="relative">
                  <input className={inp('password')} type={showPass ? 'text' : 'password'}
                    value={data.password} onChange={e => set_('password', e.target.value)}
                    placeholder="Create a strong password" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {data.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={clsx(
                          'flex-1 h-1.5 rounded-full transition-all',
                          i <= passwordStrength(data.password).label.split(' ')[0].length / 2
                            ? strength.color : 'bg-slate-200'
                        )} />
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-400">
                        {['Use at least 8 chars', 'Add uppercase letters', 'Add numbers', 'Add symbols like @#$%']
                          .filter(h => {
                            if (h.includes('8') && data.password.length >= 8) return false;
                            if (h.includes('uppercase') && /[A-Z]/.test(data.password)) return false;
                            if (h.includes('number') && /[0-9]/.test(data.password)) return false;
                            if (h.includes('symbol') && /[^A-Za-z0-9]/.test(data.password)) return false;
                            return true;
                          })[0] ?? ''}
                      </p>
                      <span className={clsx('text-xs font-semibold', {
                        'text-red-500': strength.label === 'Weak',
                        'text-amber-500': strength.label === 'Fair',
                        'text-yellow-600': strength.label === 'Good',
                        'text-emerald-600': strength.label.includes('Strong'),
                      })}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Confirm Password" required error={errors.confirmPassword}>
                <div className="relative">
                  <input className={inp('confirmPassword')} type={showConfirmPass ? 'text' : 'password'}
                    value={data.confirmPassword} onChange={e => set_('confirmPassword', e.target.value)}
                    placeholder="Re-enter your password" />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {data.confirmPassword && data.password === data.confirmPassword && (
                  <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </Field>

              {/* Agreements */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Terms & Agreements</p>

                {[
                  { key: 'agreeTerms' as const, text: 'I have read and agree to the AskIndia ', link: 'Terms & Conditions', desc: ' governing the use of the platform.' },
                  { key: 'agreeCommission' as const, text: 'I understand and accept the ', link: 'Commission Policy', desc: '. The platform will deduct the agreed commission % on every completed sale.' },
                  { key: 'agreePrivacy' as const, text: 'I consent to the collection and use of my personal and business information as described in the ', link: 'Privacy Policy', desc: '.' },
                ].map(({ key, text, link, desc }) => (
                  <div key={key}>
                    <label className={clsx(
                      'flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors',
                      data[key] ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
                      errors[key] ? 'border-red-300 bg-red-50' : ''
                    )}>
                      <input type="checkbox" checked={data[key] as boolean}
                        onChange={e => set_(key, e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-brand-600 flex-shrink-0" />
                      <span className="text-sm text-slate-600">
                        {text}
                        <button type="button" className="text-brand-600 hover:underline font-medium">{link}</button>
                        {desc}
                      </span>
                    </label>
                    {errors[key] && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1 ml-3">
                        <AlertCircle className="h-3 w-3" /> {errors[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary">
                ← Back
              </button>
            ) : (
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">← Back to Login</Link>
            )}

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Step {step} of {STEPS.length}</span>
              {step < 5 ? (
                <button onClick={handleNext} className="btn-primary px-6">
                  Continue →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary px-6 py-2.5">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering…
                    </span>
                  ) : 'Create Store Account'}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By registering, you agree to comply with AskIndia's seller policies and applicable Indian laws.
        </p>
      </div>
    </div>
  );
};
