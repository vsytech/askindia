import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Eye, EyeOff, CheckCircle, AlertCircle, MapPin, Star, Shield, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SERVICE_CATEGORIES } from '../../data/mockData';
import { AskIndiaLogo } from '../../components/AskIndiaLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../lib/dataService';
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

const YEARS_OPTIONS = ['Less than 1 year', '1–2 years', '3–5 years', '5–10 years', 'More than 10 years'];

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Yes Bank', 'Punjab National Bank',
  'Bank of Baroda', 'Other',
];

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi (NCT)',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

const MAJOR_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Patna', 'Ludhiana', 'Agra', 'Nashik', 'Vadodara',
];

const STEPS = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Business Profile' },
  { num: 3, label: 'Service Area' },
  { num: 4, label: 'Banking' },
  { num: 5, label: 'Create Password' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string; lastName: string; email: string;
  phone: string; city: string; state: string;
  businessType: string; businessName: string;
  serviceCategory: string; yearsOfExperience: string;
  gstNumber: string; briefDescription: string;
  availableCities: string[]; panIndia: boolean;
  accountHolderName: string; bankName: string;
  accountNumber: string; confirmAccountNumber: string;
  ifscCode: string; accountType: string;
  password: string; confirmPassword: string;
  agreeTerms: boolean; agreeServiceAgreement: boolean; agreePrivacy: boolean;
}

const INITIAL: FormData = {
  firstName: '', lastName: '', email: '', phone: '', city: '', state: '',
  businessType: '', businessName: '', serviceCategory: '',
  yearsOfExperience: '', gstNumber: '', briefDescription: '',
  availableCities: [], panIndia: false,
  accountHolderName: '', bankName: '', accountNumber: '',
  confirmAccountNumber: '', ifscCode: '', accountType: 'Savings',
  password: '', confirmPassword: '',
  agreeTerms: false, agreeServiceAgreement: false, agreePrivacy: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const passwordStrength = (p: string) => {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', bars: 1 };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', bars: 2 };
  if (score === 3) return { label: 'Good', color: 'bg-yellow-500', bars: 3 };
  if (score === 4) return { label: 'Strong', color: 'bg-emerald-500', bars: 4 };
  return { label: 'Very Strong', color: 'bg-emerald-600', bars: 5 };
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
        <AlertCircle className="h-3 w-3 flex-shrink-0" /> {error}
      </p>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const RegisterServiceProvider: React.FC = () => {
  const navigate = useNavigate();
  const { register, isEmailTaken, setCurrentUser, loadFromSupabase } = useAppStore();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showAccNum, setShowAccNum] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set_ = (field: keyof FormData, value: string | boolean | string[]) => {
    setData(d => ({ ...d, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const toggleCity = (city: string) => {
    setData(d => {
      const cities = d.availableCities.includes(city)
        ? d.availableCities.filter(c => c !== city)
        : [...d.availableCities, city];
      return { ...d, availableCities: cities };
    });
    setErrors(e => ({ ...e, availableCities: undefined }));
  };

  // ─── Validation ───────────────────────────────────────────────────────────

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
    if (!data.city.trim()) e.city = 'City is required';
    if (!data.state) e.state = 'Select your state';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = (): boolean => {
    const e: typeof errors = {};
    if (!data.businessType) e.businessType = 'Select a business type';
    if (!data.serviceCategory) e.serviceCategory = 'Select your primary service category';
    if (!data.yearsOfExperience) e.yearsOfExperience = 'Select your years of experience';
    if (!data.briefDescription.trim()) e.briefDescription = 'Description is required';
    else if (data.briefDescription.trim().length < 50) e.briefDescription = `Minimum 50 characters (${data.briefDescription.trim().length}/50)`;
    if (data.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber.toUpperCase()))
      e.gstNumber = 'Invalid GST number format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate3 = (): boolean => {
    const e: typeof errors = {};
    if (!data.panIndia && data.availableCities.length === 0)
      e.availableCities = 'Select at least one city or choose Pan India';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate4 = (): boolean => {
    const e: typeof errors = {};
    if (!data.accountHolderName.trim()) e.accountHolderName = 'Account holder name is required';
    if (!data.bankName) e.bankName = 'Select your bank';
    if (!data.accountNumber.trim()) e.accountNumber = 'Account number is required';
    else if (!/^\d{9,18}$/.test(data.accountNumber)) e.accountNumber = 'Enter a valid account number (9–18 digits)';
    if (!data.confirmAccountNumber.trim()) e.confirmAccountNumber = 'Please confirm your account number';
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
    if (!data.agreeServiceAgreement) e.agreeServiceAgreement = 'You must accept the Service Provider Agreement';
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
      // Supabase mode — create real account
      const result = await authService.signUp({
        email: data.email.trim(),
        password: data.password,
        name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        role: 'service_provider',
        phone: data.phone,
        city: data.panIndia ? 'Pan India' : (data.availableCities[0] || data.city),
        state: data.state,
      });
      if (result.success) {
        // Auto sign-in after registration
        const signInResult = await authService.signIn(data.email.trim(), data.password);
        if (signInResult.success && signInResult.user) {
          setCurrentUser(signInResult.user);
          await loadFromSupabase(signInResult.user.id, 'service_provider', null);
        }
      }
      setIsSubmitting(false);
      if (result.success) setSubmitted(true);
      else setErrors({ email: result.error });
    } else {
      // Mock mode
      await new Promise(r => setTimeout(r, 1200));
      const result = register({
        name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        email: data.email.trim(),
        role: 'service_provider',
        passwordHash: data.password,
        phone: data.phone,
        city: data.panIndia ? 'Pan India' : (data.availableCities[0] || data.city),
        state: data.state,
      });
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
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
          <p className="text-slate-500 mb-2">
            Welcome, <strong>{data.firstName}</strong>! Your service provider profile has been created.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Start listing your services on <span className="font-semibold text-violet-600">AskIndia</span> and reach thousands of customers.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">Next Steps</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-700">
              <li>Your banking details are under verification (1–2 business days)</li>
              <li>Add your first service to start accepting bookings</li>
              <li>Complete your profile to appear higher in search results</li>
            </ul>
          </div>
          <button onClick={() => navigate('/service-provider')} className="w-full py-3 px-6 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors">
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  const inp = (field: keyof FormData) =>
    clsx('input', errors[field] && 'border-red-400 bg-red-50 focus:ring-red-500');

  const strength = data.password ? passwordStrength(data.password) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AskIndiaLogo size={30} showText={true} textClass="text-base" />
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-sm text-slate-500">Service Provider Registration</span>
        </div>
        <Link to="/login" className="text-sm text-violet-600 font-medium hover:text-violet-700">
          Already registered? Sign in
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left panel */}
          <div className="hidden lg:block">
            <div className="rounded-2xl p-6 text-white sticky top-8"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #4c1d95)' }}>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Grow Your Service Business</h3>
              <p className="text-violet-200 text-sm mb-6 leading-relaxed">
                Join thousands of service professionals earning on AskIndia's marketplace.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <TrendingUp className="h-4 w-4" />, title: 'Earn More', desc: 'Access lakhs of verified customers across India' },
                  { icon: <MapPin className="h-4 w-4" />, title: 'Local & Pan India', desc: 'Choose your service coverage area flexibly' },
                  { icon: <Shield className="h-4 w-4" />, title: 'Secure Payments', desc: 'Guaranteed payouts within 3 business days' },
                  { icon: <Star className="h-4 w-4" />, title: 'Build Reputation', desc: 'Get verified badges and customer reviews' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-violet-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <p className="text-xs text-violet-300 mb-3">Registration Progress</p>
                <div className="space-y-2">
                  {STEPS.map(s => (
                    <div key={s.num} className="flex items-center gap-2">
                      <div className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        step > s.num ? 'bg-emerald-400 text-white'
                          : step === s.num ? 'bg-white text-violet-700'
                          : 'bg-white/20 text-violet-300'
                      )}>
                        {step > s.num ? '✓' : s.num}
                      </div>
                      <span className={clsx(
                        'text-xs',
                        step === s.num ? 'text-white font-semibold' : step > s.num ? 'text-emerald-300' : 'text-violet-300'
                      )}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-2">
            {/* Mobile step progress */}
            <div className="flex items-center mb-8 lg:hidden">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                      step > s.num ? 'bg-emerald-600 border-emerald-600 text-white'
                        : step === s.num ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    )}>
                      {step > s.num ? '✓' : s.num}
                    </div>
                    <span className={clsx(
                      'text-xs mt-1 font-medium hidden sm:block',
                      step === s.num ? 'text-violet-600' : step > s.num ? 'text-emerald-600' : 'text-slate-400'
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
            <div className="card p-8">

              {/* ── Step 1: Personal Info ──────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                    <p className="text-sm text-slate-500 mt-1">Basic details for your service provider account.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" required error={errors.firstName}>
                      <input className={inp('firstName')} value={data.firstName}
                        onChange={e => set_('firstName', e.target.value)} placeholder="Amit" />
                    </Field>
                    <Field label="Last Name" required error={errors.lastName}>
                      <input className={inp('lastName')} value={data.lastName}
                        onChange={e => set_('lastName', e.target.value)} placeholder="Kumar" />
                    </Field>
                  </div>
                  <Field label="Email Address" required error={errors.email}
                    hint="This will be your login ID and primary contact.">
                    <input className={inp('email')} type="email" value={data.email}
                      onChange={e => set_('email', e.target.value.trim())} placeholder="amit@example.com" />
                  </Field>
                  <Field label="Mobile Number" required error={errors.phone}
                    hint="10-digit Indian mobile number. Used for OTP verification and booking alerts.">
                    <div className="flex">
                      <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 whitespace-nowrap">+91</span>
                      <input className={clsx(inp('phone'), 'rounded-l-none')} type="tel" value={data.phone}
                        onChange={e => set_('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210" />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City" required error={errors.city}>
                      <input className={inp('city')} value={data.city}
                        onChange={e => set_('city', e.target.value)} placeholder="Your primary city" />
                    </Field>
                    <Field label="State" required error={errors.state}>
                      <select className={inp('state')} value={data.state}
                        onChange={e => set_('state', e.target.value)}>
                        <option value="">Select state</option>
                        {STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Step 2: Business Profile ───────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Business Profile</h2>
                    <p className="text-sm text-slate-500 mt-1">Help customers understand your expertise and credentials.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Business Type" required error={errors.businessType}>
                      <select className={inp('businessType')} value={data.businessType}
                        onChange={e => set_('businessType', e.target.value)}>
                        <option value="">Select type</option>
                        {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Years of Experience" required error={errors.yearsOfExperience}>
                      <select className={inp('yearsOfExperience')} value={data.yearsOfExperience}
                        onChange={e => set_('yearsOfExperience', e.target.value)}>
                        <option value="">Select</option>
                        {YEARS_OPTIONS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Business / Brand Name"
                    hint="Leave blank if operating under your personal name.">
                    <input className="input" value={data.businessName}
                      onChange={e => set_('businessName', e.target.value)} placeholder="e.g. Kumar Electricals" />
                  </Field>
                  <Field label="Primary Service Category" required error={errors.serviceCategory}>
                    <select className={inp('serviceCategory')} value={data.serviceCategory}
                      onChange={e => set_('serviceCategory', e.target.value)}>
                      <option value="">Select a category</option>
                      {SERVICE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="GST Number"
                    hint="Optional. Required if annual turnover exceeds ₹20L for services.">
                    <input className="input" value={data.gstNumber}
                      onChange={e => set_('gstNumber', e.target.value.toUpperCase().slice(0, 15))}
                      placeholder="22ABCDE1234F1Z5" maxLength={15} />
                    {errors.gstNumber && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.gstNumber}
                      </p>
                    )}
                  </Field>
                  <Field label="Brief Description" required error={errors.briefDescription}
                    hint={`${data.briefDescription.trim().length}/50 chars minimum. Describe your services, expertise, and what makes you stand out.`}>
                    <textarea
                      className={clsx(inp('briefDescription'), 'h-28 resize-none')}
                      value={data.briefDescription}
                      onChange={e => set_('briefDescription', e.target.value)}
                      placeholder="Describe your professional background, specialisations, certifications, and why customers should choose you..."
                    />
                  </Field>
                </div>
              )}

              {/* ── Step 3: Service Area ───────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Service Coverage Area</h2>
                    <p className="text-sm text-slate-500 mt-1">Select the cities where you offer your services.</p>
                  </div>

                  <label className={clsx(
                    'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                    data.panIndia ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                  )}>
                    <input type="checkbox" checked={data.panIndia}
                      onChange={e => set_('panIndia', e.target.checked)}
                      className="rounded border-slate-300 text-violet-600 h-4 w-4" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Pan India</p>
                      <p className="text-xs text-slate-500">I can provide services across all cities in India (remote/online services)</p>
                    </div>
                  </label>

                  {!data.panIndia && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-3">
                          Select Cities <span className="text-red-500">*</span>
                          {data.availableCities.length > 0 && (
                            <span className="ml-2 text-xs text-violet-600 font-normal">
                              {data.availableCities.length} selected
                            </span>
                          )}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {MAJOR_CITIES.map(city => (
                            <label key={city} className={clsx(
                              'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm',
                              data.availableCities.includes(city)
                                ? 'border-violet-500 bg-violet-50 text-violet-700 font-medium'
                                : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50/50'
                            )}>
                              <input type="checkbox"
                                checked={data.availableCities.includes(city)}
                                onChange={() => toggleCity(city)}
                                className="rounded border-slate-300 text-violet-600 flex-shrink-0" />
                              {city}
                            </label>
                          ))}
                        </div>
                        {errors.availableCities && (
                          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.availableCities}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {(data.panIndia || data.availableCities.length > 0) && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-700">
                      <strong>Coverage:</strong>{' '}
                      {data.panIndia ? 'All cities across India' : data.availableCities.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Banking ────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Banking & Payout Details</h2>
                    <p className="text-sm text-slate-500 mt-1">Your earnings will be transferred to this account.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                    <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Bank details are encrypted and verified before your first payout is processed.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Account Holder Name" required error={errors.accountHolderName}
                      hint="Exactly as on your bank passbook">
                      <input className={inp('accountHolderName')} value={data.accountHolderName}
                        onChange={e => set_('accountHolderName', e.target.value)} placeholder="AMIT KUMAR" />
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
                      hint="11-character code (e.g. HDFC0001234)">
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
                              ? 'border-violet-500 bg-violet-50 text-violet-700'
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

              {/* ── Step 5: Password ───────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Create Your Password</h2>
                    <p className="text-sm text-slate-500 mt-1">Secure your service provider account with a strong password.</p>
                  </div>
                  <Field label="Password" required error={errors.password}
                    hint="Minimum 8 characters. Use a mix of uppercase, numbers & symbols.">
                    <div className="relative">
                      <input className={inp('password')} type={showPass ? 'text' : 'password'}
                        value={data.password} onChange={e => set_('password', e.target.value)}
                        placeholder="Create a strong password" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {data.password && strength && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={clsx(
                              'flex-1 h-1.5 rounded-full transition-all',
                              i <= strength.bars ? strength.color : 'bg-slate-200'
                            )} />
                          ))}
                        </div>
                        <div className="flex justify-between">
                          <p className="text-xs text-slate-400">
                            {[
                              data.password.length < 8 && 'Use at least 8 chars',
                              !/[A-Z]/.test(data.password) && 'Add uppercase letters',
                              !/[0-9]/.test(data.password) && 'Add numbers',
                              !/[^A-Za-z0-9]/.test(data.password) && 'Add symbols like @#$%',
                            ].filter(Boolean)[0] ?? ''}
                          </p>
                          <span className={clsx('text-xs font-semibold', {
                            'text-red-500': strength.label === 'Weak',
                            'text-amber-500': strength.label === 'Fair',
                            'text-yellow-600': strength.label === 'Good',
                            'text-emerald-600': strength.label === 'Strong' || strength.label === 'Very Strong',
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
                      { key: 'agreeTerms' as const, text: 'I agree to the AskIndia ', link: 'Terms & Conditions', desc: ' governing service providers on the platform.' },
                      { key: 'agreeServiceAgreement' as const, text: 'I accept the ', link: 'Service Provider Agreement', desc: ' including commission structure and cancellation policies.' },
                      { key: 'agreePrivacy' as const, text: 'I consent to the collection and use of my data as described in the ', link: 'Privacy Policy', desc: '.' },
                    ].map(({ key, text, link, desc }) => (
                      <div key={key}>
                        <label className={clsx(
                          'flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors',
                          data[key] ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:bg-slate-50',
                          errors[key] ? 'border-red-300 bg-red-50' : ''
                        )}>
                          <input type="checkbox" checked={data[key] as boolean}
                            onChange={e => set_(key, e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 text-violet-600 flex-shrink-0" />
                          <span className="text-sm text-slate-600">
                            {text}
                            <button type="button" className="text-violet-600 hover:underline font-medium">{link}</button>
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
                    <button onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2">
                      Continue →
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Registering…
                        </>
                      ) : 'Create Account'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              By registering, you agree to comply with AskIndia's service provider policies and applicable Indian laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
