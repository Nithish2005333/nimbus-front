import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import CloudVisualization from '../components/CloudVisualization';
import DatePicker from '../components/DatePicker';
import CustomSelect from '../components/CustomSelect';
import Logo from '../components/Logo';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [storagePlan, setStoragePlan] = useState('10GB');
  const [backupPreference, setBackupPreference] = useState('automatic');
  const [syncPreference, setSyncPreference] = useState('real-time');
  const [securityLevel, setSecurityLevel] = useState('standard');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Validation functions
  const validateEmail = (email) => {
    if (!email.includes('@')) {
      return 'Email must contain @ symbol';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateMobile = (mobile) => {
    // Remove all non-digit characters
    const digitsOnly = mobile.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      return 'Mobile number must be exactly 10 digits';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    const newErrors = {};

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate mobile
    const mobileError = validateMobile(mobile);
    if (mobileError) {
      newErrors.mobile = mobileError;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Validate password match
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate date of birth
    if (!dob) {
      newErrors.dob = 'Date of birth is required';
    }

    // Validate terms
    if (!agreeToTerms) {
      newErrors.terms = 'Please agree to the terms and conditions';
    }

    // If there are errors, show them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show first error in toast
      const firstError = Object.values(newErrors)[0];
      showToast(firstError, 'error');
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    setLoading(true);

    try {
      // Combine first and last name for the API
      const fullName = `${firstName} ${lastName}`;

      // Prepare all user data
      const userData = {
        name: fullName,
        firstName,
        lastName,
        email,
        password,
        phone: mobile,
        dob,
        storagePlan,
        backupPreference,
        syncPreference,
        securityLevel
      };

      // FINAL SANITY CHECK
      if (!userData.phone || !userData.dob || !userData.email) {
        throw new Error('Critical data missing: Please check Phone and DOB fields.');
      }

      console.log('Sending Registration Data:', userData);
      console.table(userData);
      await authAPI.register(userData);
      showToast('Registration successful! Please login.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const diagramSteps = [
    {
      title: 'Client Device',
      detail: 'Your data originates on your device with local processing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-cyan-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: 'Client Encryption',
      detail: 'AES-256 encryption happens on your device before upload. Keys never leave your device.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-emerald-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      title: 'Cloud Storage',
      detail: 'Only encrypted data is stored. Cloud has zero knowledge of your content.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-sky-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    },
    {
      title: 'Client Decryption',
      detail: 'Decryption happens on your device. Your keys remain private and secure.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-amber-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-y-auto custom-scrollbar">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),transparent_55%)] pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col lg:flex-row lg:gap-8">
        {/* Header Section - Order 1 on mobile, appears in left side on desktop */}
        <div className="w-full lg:hidden px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 order-1">
          <div className="text-center flex flex-col items-center">
            <Logo className="h-10 w-auto mb-1" />
            <h2 className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">NIMBUS CLOUD</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-widest font-medium opacity-80">Join the secure revolution</p>
          </div>
        </div>

        {/* Left Side - Visualization and Info (Order 3 on mobile, 1 on desktop) */}
        <div className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12 order-3 lg:order-1">
          <div className="w-full max-w-[960px] mx-auto space-y-6 sm:space-y-8">
            {/* Header Section - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <Logo className="h-14 w-auto" />
                <div>
                  <h2 className="text-3xl font-black tracking-widest bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">NIMBUS CLOUD</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-widest font-medium opacity-80">Join the secure revolution</p>
                </div>
              </div>
            </div>

            {/* 3D Cloud Visualization */}
            <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[500px] rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] p-3 sm:p-4 lg:p-6 shadow-xl shadow-black/10">
              <CloudVisualization isRegisterPage={true} />
            </div>

            {/* Data Flow Details */}
            <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)]/50 p-4 sm:p-6 lg:p-8 shadow-inner">
              <p className="text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[var(--text-muted)] mb-4 sm:mb-6">Data Flow Process</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {diagramSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-4 hover:bg-[var(--bg-primary)] transition-all shadow-sm"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="text-xl sm:text-2xl flex-shrink-0">{step.icon}</span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form (Order 2 on mobile, 2 on desktop, Scrolls with page) */}
        <div className="w-full lg:w-[500px] lg:flex-shrink-0 flex items-center justify-center px-4 py-6 sm:py-8 lg:py-12 order-2 lg:order-2">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/10">
            <div className="mb-6 sm:mb-8 text-center">
              <p className="text-xs uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[var(--text-muted)]">Onboarding</p>
              <h2 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">Create your Nimbus ID</h2>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)]">Zero-knowledge encrypted cloud storage</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full input-field text-sm sm:text-base"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full input-field text-sm sm:text-base"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dob" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Date of Birth
                </label>
                <DatePicker
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    if (errors.dob) setErrors({ ...errors, dob: '' });
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  error={errors.dob}
                  required
                  placeholder="Select your date of birth"
                />
                {errors.dob && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.dob}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  onBlur={() => {
                    const error = validateEmail(email);
                    if (error) setErrors({ ...errors, email: error });
                  }}
                  className={`w-full input-field text-sm sm:text-base ${errors.email ? 'border-rose-500/70 focus:border-rose-500/70' : ''}`}
                  placeholder="you@workspace.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Mobile */}
              <div>
                <label htmlFor="mobile" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Mobile Number
                </label>
                <input
                  id="mobile"
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => {
                    // Allow only digits, maximum 10
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(value);
                    if (errors.mobile) setErrors({ ...errors, mobile: '' });
                  }}
                  onBlur={() => {
                    const error = validateMobile(mobile);
                    if (error) setErrors({ ...errors, mobile: error });
                  }}
                  className={`w-full input-field text-sm sm:text-base ${errors.mobile ? 'border-rose-500/70 focus:border-rose-500/70' : ''}`}
                  placeholder="1234567890"
                  maxLength={10}
                />
                {errors.mobile && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.mobile}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Enter 10 digits (e.g., 1234567890)</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    onBlur={() => {
                      const error = validatePassword(password);
                      if (error) setErrors({ ...errors, password: error });
                    }}
                    className={`flex-1 input-field text-sm sm:text-base ${errors.password ? 'border-rose-500/70 focus:border-rose-500/70' : ''}`}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    className="btn-secondary px-2.5 sm:px-3 py-2 text-xs whitespace-nowrap"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Must contain: uppercase, lowercase, number, and special character
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Confirm Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    onBlur={() => {
                      if (password !== confirmPassword) {
                        setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
                      }
                    }}
                    className={`flex-1 input-field text-sm sm:text-base ${errors.confirmPassword ? 'border-rose-500/70 focus:border-rose-500/70' : ''}`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    className="btn-secondary px-2.5 sm:px-3 py-2 text-xs whitespace-nowrap"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Storage Plan */}
              <div>
                <label htmlFor="storagePlan" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Storage Plan
                </label>
                <CustomSelect
                  id="storagePlan"
                  value={storagePlan}
                  onChange={(e) => setStoragePlan(e.target.value)}
                  options={[
                    { value: '10GB', label: '10GB - Free Tier' },
                    { value: '100GB', label: '100GB - Personal' },
                    { value: '1TB', label: '1TB - Professional' },
                    { value: '5TB', label: '5TB - Enterprise' },
                  ]}
                  placeholder="Select storage plan"
                />
              </div>

              {/* Backup Preference */}
              <div>
                <label htmlFor="backupPreference" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Backup Preference
                </label>
                <CustomSelect
                  id="backupPreference"
                  value={backupPreference}
                  onChange={(e) => setBackupPreference(e.target.value)}
                  options={[
                    { value: 'automatic', label: 'Automatic Backup' },
                    { value: 'manual', label: 'Manual Backup' },
                    { value: 'scheduled', label: 'Scheduled Backup' },
                  ]}
                  placeholder="Select backup preference"
                />
              </div>

              {/* Sync Preference */}
              <div>
                <label htmlFor="syncPreference" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Sync Preference
                </label>
                <CustomSelect
                  id="syncPreference"
                  value={syncPreference}
                  onChange={(e) => setSyncPreference(e.target.value)}
                  options={[
                    { value: 'real-time', label: 'Real-time Sync' },
                    { value: 'on-demand', label: 'On-demand Sync' },
                    { value: 'scheduled', label: 'Scheduled Sync' },
                  ]}
                  placeholder="Select sync preference"
                />
              </div>

              {/* Security Level */}
              <div>
                <label htmlFor="securityLevel" className="block text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-bold">
                  Security Level
                </label>
                <CustomSelect
                  id="securityLevel"
                  value={securityLevel}
                  onChange={(e) => setSecurityLevel(e.target.value)}
                  options={[
                    { value: 'standard', label: 'Standard (AES-256)' },
                    { value: 'enhanced', label: 'Enhanced (AES-256 + 2FA)' },
                    { value: 'maximum', label: 'Maximum (AES-256 + 2FA + Biometric)' },
                  ]}
                  placeholder="Select security level"
                />
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className={`flex items-start gap-3 rounded-xl sm:rounded-2xl border ${errors.terms ? 'border-rose-500/70' : 'border-[var(--border-color)]'} bg-[var(--bg-primary)] p-3 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]`}>
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => {
                      setAgreeToTerms(e.target.checked);
                      if (errors.terms) setErrors({ ...errors, terms: '' });
                    }}
                    className="mt-1"
                    required
                  />
                   <span>
                    I agree to the <Link to="/terms" className="text-cyan-600 hover:text-cyan-700 font-bold">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="text-cyan-600 hover:text-cyan-700 font-bold">Privacy Policy</Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.terms}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account…' : 'Create Nimbus Account'}
              </button>
            </form>

            <div className="mt-5 sm:mt-6 rounded-xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 sm:p-4 text-xs sm:text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">Already have an account?</p>
              <p className="mt-1 text-[var(--text-muted)]">Sign in to access your cloud workspace.</p>
              <Link to="/login" className="mt-2 sm:mt-3 inline-flex items-center gap-1 text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors text-xs sm:text-sm font-bold">
                Sign in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
