import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AskIndiaLogo } from '../../components/AskIndiaLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../lib/dataService';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 — Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  // Step 2 — Delivery Address
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pinCode: string;
  city: string;
  state: string;
  // Step 3 — Account Security
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const STEPS = [
  { number: 1, title: 'Personal Info',      desc: 'Your basic details' },
  { number: 2, title: 'Delivery Address',   desc: 'Where to ship your orders' },
  { number: 3, title: 'Account Security',   desc: 'Create your password' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '', color: 'bg-slate-200' },
    { label: 'Very Weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
    { label: 'Very Strong', color: 'bg-green-600' },
  ];
  return { score, ...map[score] };
}

// ─── Field sub-component ──────────────────────────────────────────────────────

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string }> = ({
  label, required, error, children, hint,
}) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{error}</p>}
  </div>
);

// ─── Validation ───────────────────────────────────────────────────────────────

function validate1(f: FormData): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'First name is required.';
  else if (f.firstName.trim().length < 2) e.firstName = 'Must be at least 2 characters.';
  if (!f.lastName.trim()) e.lastName = 'Last name is required.';
  else if (f.lastName.trim().length < 2) e.lastName = 'Must be at least 2 characters.';
  if (!f.email.trim()) e.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address.';
  if (!f.phone.trim()) e.phone = 'Mobile number is required.';
  else if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (!f.dateOfBirth) e.dateOfBirth = 'Date of birth is required.';
  else {
    const dob = new Date(f.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 13) e.dateOfBirth = 'You must be at least 13 years old to register.';
    if (age > 120) e.dateOfBirth = 'Please enter a valid date of birth.';
  }
  if (!f.gender) e.gender = 'Please select your gender.';
  return e;
}

function validate2(f: FormData): Errors {
  const e: Errors = {};
  if (!f.addressLine1.trim()) e.addressLine1 = 'Address Line 1 is required.';
  else if (f.addressLine1.trim().length < 10) e.addressLine1 = 'Please enter a complete address.';
  if (!f.pinCode.trim()) e.pinCode = 'PIN code is required.';
  else if (!/^\d{6}$/.test(f.pinCode)) e.pinCode = 'Enter a valid 6-digit PIN code.';
  if (!f.city.trim()) e.city = 'City is required.';
  if (!f.state) e.state = 'Please select your state.';
  return e;
}

function validate3(f: FormData): Errors {
  const e: Errors = {};
  if (!f.password) e.password = 'Password is required.';
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
  else if (passwordStrength(f.password).score < 2) e.password = 'Password is too weak. Add uppercase letters or numbers.';
  if (!f.confirmPassword) e.confirmPassword = 'Please confirm your password.';
  else if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match.';
  if (!f.agreeTerms) e.agreeTerms = 'You must accept the Terms of Service to continue.';
  if (!f.agreePrivacy) e.agreePrivacy = 'You must accept the Privacy Policy to continue.';
  return e;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BLANK: FormData = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
  addressLine1: '', addressLine2: '', landmark: '', pinCode: '', city: '', state: '',
  password: '', confirmPassword: '', agreeTerms: false, agreePrivacy: false,
};

export const RegisterCustomer: React.FC = () => {
  const navigate = useNavigate();
  const { register, isEmailTaken, setCurrentUser, loadFromSupabase } = useAppStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(BLANK);
  const [errors, setErrors] = useState<Errors>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field: keyof FormData, value: string | boolean) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validateStep = (s: number): Errors => {
    if (s === 1) return validate1(form);
    if (s === 2) return validate2(form);
    return validate3(form);
  };

  const handleNext = async () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (step === 1 && isEmailTaken(form.email)) {
      setErrors({ email: 'An account with this email already exists. Try signing in instead.' });
      return;
    }

    if (step < 3) { setStep(s => s + 1); setErrors({}); return; }

    // Submit
    setIsLoading(true);

    if (isSupabaseConfigured) {
      // Supabase mode — create real account
      const result = await authService.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        role: 'customer',
        phone: form.phone,
        city: form.city,
        state: form.state,
      });
      setIsLoading(false);
      if (result.success) {
        // Try to sign in immediately so the session is live
        const signInResult = await authService.signIn(
          form.email.trim().toLowerCase(),
          form.password
        );
        if (signInResult.success && signInResult.user) {
          setCurrentUser(signInResult.user);
          await loadFromSupabase(signInResult.user.id, 'customer', null);
        }
        setDone(true);
      } else {
        setErrors({ email: result.error });
      }
    } else {
      // Mock mode
      await new Promise(r => setTimeout(r, 1000));
      const result = register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim().toLowerCase(),
        role: 'customer',
        passwordHash: form.password,
      });
      setIsLoading(false);
      if (result.success) {
        setDone(true);
      } else {
        setErrors({ email: result.error });
      }
    }
  };

  const handleBack = () => { setStep(s => s - 1); setErrors({}); };

  const pwStrength = passwordStrength(form.password);

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to AskIndia!</h1>
          <p className="text-slate-500 mb-2">
            Hi <strong>{form.firstName}</strong>, your account has been created successfully.
          </p>
          <p className="text-slate-400 text-sm mb-8">
            You're now logged in and ready to start shopping from thousands of curated products.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="btn-primary w-full justify-center py-3 text-base mb-3"
          >
            Start Shopping
          </button>
          <p className="text-xs text-slate-400 mt-4">
            A welcome email has been sent to <strong>{form.email}</strong>
          </p>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <AskIndiaLogo size={36} showText={true} textClass="text-xl" className="brightness-0 invert" />
        </div>

        <div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Shop smarter,<br />
            <span className="text-emerald-300">not harder.</span>
          </h2>
          <p className="text-emerald-100 text-sm leading-relaxed mb-8">
            Discover thousands of products from verified stores. Enjoy secure payments,
            fast delivery, and easy returns — all in one place.
          </p>
          <div className="space-y-3">
            {[
              { icon: '🛡️', text: 'Secure & encrypted transactions' },
              { icon: '🚚', text: 'Fast delivery to your doorstep' },
              { icon: '🔄', text: 'Easy 7-day returns & refunds' },
              { icon: '💳', text: 'Multiple payment options including UPI' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-emerald-100 text-sm">
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-emerald-400/70 text-xs">
          © 2024 AskIndia Technologies Pvt. Ltd. · All rights reserved
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <AskIndiaLogo size={30} showText={true} textClass="text-lg" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-slate-500 text-sm">
              Join AskIndia and start shopping from verified stores across India.
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.number}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all',
                    step > s.number ? 'bg-emerald-600 text-white' :
                    step === s.number ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
                    'bg-slate-200 text-slate-500'
                  )}>
                    {step > s.number ? <CheckCircle className="h-4 w-4" /> : s.number}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className={clsx('text-xs font-semibold truncate', step === s.number ? 'text-emerald-700' : 'text-slate-500')}>
                      {s.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{s.desc}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={clsx('h-px flex-1 max-w-[2rem] transition-all', step > s.number ? 'bg-emerald-400' : 'bg-slate-200')} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-5">
              Step {step}: {STEPS[step - 1].title}
            </h2>

            {/* ── Step 1: Personal Info ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" required error={errors.firstName}>
                    <input
                      className={clsx('input', errors.firstName && 'border-red-400 focus:ring-red-300')}
                      value={form.firstName}
                      onChange={e => set('firstName', e.target.value)}
                      placeholder="Priya"
                    />
                  </Field>
                  <Field label="Last Name" required error={errors.lastName}>
                    <input
                      className={clsx('input', errors.lastName && 'border-red-400 focus:ring-red-300')}
                      value={form.lastName}
                      onChange={e => set('lastName', e.target.value)}
                      placeholder="Sharma"
                    />
                  </Field>
                </div>

                <Field label="Email Address" required error={errors.email}>
                  <input
                    className={clsx('input', errors.email && 'border-red-400 focus:ring-red-300')}
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="priya@example.com"
                    autoComplete="email"
                  />
                </Field>

                <Field label="Mobile Number" required error={errors.phone} hint="10-digit Indian mobile number (without +91)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium pointer-events-none">+91</span>
                    <input
                      className={clsx('input pl-12', errors.phone && 'border-red-400 focus:ring-red-300')}
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of Birth" required error={errors.dateOfBirth}>
                    <input
                      className={clsx('input', errors.dateOfBirth && 'border-red-400 focus:ring-red-300')}
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => set('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </Field>
                  <Field label="Gender" required error={errors.gender}>
                    <select
                      className={clsx('input', errors.gender && 'border-red-400 focus:ring-red-300')}
                      value={form.gender}
                      onChange={e => set('gender', e.target.value)}
                    >
                      <option value="">Select…</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 2: Delivery Address ──────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <Field label="Address Line 1" required error={errors.addressLine1} hint="House / Flat / Building number and Street name">
                  <input
                    className={clsx('input', errors.addressLine1 && 'border-red-400 focus:ring-red-300')}
                    value={form.addressLine1}
                    onChange={e => set('addressLine1', e.target.value)}
                    placeholder="Flat 4B, Sunrise Apartments, MG Road"
                  />
                </Field>

                <Field label="Address Line 2" error={errors.addressLine2} hint="Area / Colony / Locality (optional)">
                  <input
                    className="input"
                    value={form.addressLine2}
                    onChange={e => set('addressLine2', e.target.value)}
                    placeholder="Indiranagar, Sector 12"
                  />
                </Field>

                <Field label="Landmark" error={errors.landmark} hint="Nearby landmark (optional)">
                  <input
                    className="input"
                    value={form.landmark}
                    onChange={e => set('landmark', e.target.value)}
                    placeholder="Near City Mall"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="PIN Code" required error={errors.pinCode}>
                    <input
                      className={clsx('input', errors.pinCode && 'border-red-400 focus:ring-red-300')}
                      value={form.pinCode}
                      onChange={e => set('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="560001"
                      maxLength={6}
                    />
                  </Field>
                  <Field label="City" required error={errors.city}>
                    <input
                      className={clsx('input', errors.city && 'border-red-400 focus:ring-red-300')}
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="Bengaluru"
                    />
                  </Field>
                </div>

                <Field label="State / Union Territory" required error={errors.state}>
                  <select
                    className={clsx('input', errors.state && 'border-red-400 focus:ring-red-300')}
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                  >
                    <option value="">Select state…</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <strong>Note:</strong> This address will be used as your default shipping address. You can always update or add more addresses after signing in.
                </div>
              </div>
            )}

            {/* ── Step 3: Account Security ──────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <Field label="Create Password" required error={errors.password}>
                  <div className="relative">
                    <input
                      className={clsx('input pr-10', errors.password && 'border-red-400 focus:ring-red-300')}
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={clsx(
                              'h-1.5 flex-1 rounded-full transition-all',
                              i <= pwStrength.score ? pwStrength.color : 'bg-slate-200'
                            )}
                          />
                        ))}
                      </div>
                      {pwStrength.label && (
                        <p className={clsx('text-xs', pwStrength.score <= 2 ? 'text-orange-600' : 'text-emerald-600')}>
                          Password strength: {pwStrength.label}
                        </p>
                      )}
                    </div>
                  )}
                </Field>

                <Field label="Confirm Password" required error={errors.confirmPassword}>
                  <div className="relative">
                    <input
                      className={clsx('input pr-10', errors.confirmPassword && 'border-red-400 focus:ring-red-300')}
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Agreements</p>

                  <label className={clsx('flex items-start gap-3 cursor-pointer', errors.agreeTerms && 'ring-1 ring-red-300 rounded-lg p-2')}>
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={e => set('agreeTerms', e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-slate-600">
                      I agree to AskIndia's{' '}
                      <a href="#" className="text-emerald-600 underline font-medium">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="text-emerald-600 underline font-medium">User Agreement</a>.{' '}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="text-xs text-red-600 pl-7">{errors.agreeTerms}</p>}

                  <label className={clsx('flex items-start gap-3 cursor-pointer', errors.agreePrivacy && 'ring-1 ring-red-300 rounded-lg p-2')}>
                    <input
                      type="checkbox"
                      checked={form.agreePrivacy}
                      onChange={e => set('agreePrivacy', e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-slate-600">
                      I have read and understood the{' '}
                      <a href="#" className="text-emerald-600 underline font-medium">Privacy Policy</a>{' '}
                      and consent to data processing.{' '}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {errors.agreePrivacy && <p className="text-xs text-red-600 pl-7">{errors.agreePrivacy}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary flex items-center gap-2 px-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link to="/login" className="btn-secondary flex items-center gap-2 px-6">
                <ArrowLeft className="h-4 w-4" /> Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="btn-primary flex-1 justify-center py-3 flex items-center gap-2"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : step < 3 ? (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Create My Account <CheckCircle className="h-4 w-4" /></>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              Sign in here
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-4">
            Want to sell on AskIndia?{' '}
            <Link to="/register/store-owner" className="text-brand-600 hover:underline">
              Open a store instead →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
