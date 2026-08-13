// frontend/src/features/SignupForm.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { registerSchema, getFieldErrors } from '../validation/schemas.js';
import LoadingAnimation from '../components/LoadingAnimation.jsx';

// API
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Default password rule shape/fallback while config loads (fetched from GET /api/system-config)
const DEFAULT_PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialCharacter: false,
};

// Suffix options for the custom dropdown (replaces native <select> so mobile doesn't fall back to the OS picker UI)
const SUFFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Jr.', label: 'Jr.' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV' },
];

// Frontend email validation via EasyEmail API
const validateEmailWithEasyEmail = async (email) => {
  const API_KEY = import.meta.env.VITE_EASY_EMAIL_API;
  if (!API_KEY) {
    console.warn('VITE_EASY_EMAIL_API missing in frontend .env. Skipping email validation.');
    return { isDeliverable: true };
  }
  const url = `https://api.easyemailapi.com/v1/verify?email=${encodeURIComponent(email)}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.valid === false || data.inbox_exists === false || data.deliverable === false) {
      return { isDeliverable: false, message: 'This email address does not exist or cannot receive emails. Please provide a valid email.' };
    }
    return { isDeliverable: true };
  } catch (error) {
    console.error('Frontend Email validation API error:', error);
    return { isDeliverable: true };
  }
};

// ID card icon
const IdCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
    <line x1="16" y1="2" x2="16" y2="4" /><line x1="8" y1="2" x2="8" y2="4" />
    <circle cx="9" cy="11" r="2" />
    <line x1="14" y1="10" x2="18" y2="10" /><line x1="14" y1="14" x2="18" y2="14" />
    <line x1="6" y1="16" x2="12" y2="16" />
  </svg>
);

// Eye icons for password visibility toggles
const EyeOpenIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z" /><circle cx="10" cy="10" r="2.5" />
  </svg>
);
const EyeClosedIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06" />
  </svg>
);

const ChevronIcon = ({ open, color = '#a0b8b4', size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Custom Suffix Dropdown — replaces the native <select> so mobile browsers don't fall back
// to the OS-level picker UI (which ignores our styling). `variant` selects desktop vs. mobile-pill styling.
const SuffixSelect = ({ value, onChange, disabled, variant = 'desktop' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const current = SUFFIX_OPTIONS.find(o => o.value === value) || SUFFIX_OPTIONS[0];

  if (variant === 'mobile') {
    return (
      <div ref={wrapRef} className="m-suffix-select">
        <button
          type="button"
          className="m-input-pill m-suffix-trigger"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
        >
          <span className="m-pill-input m-suffix-value">{current.label}</span>
          <span className="m-pill-btn" style={{ paddingRight: 14 }}>
            <ChevronIcon open={open} color="#A0B8B4" size={11} />
          </span>
        </button>
        {open && (
          <div className="m-suffix-menu">
            {SUFFIX_OPTIONS.map(opt => (
              <button
                key={opt.value || 'none'}
                type="button"
                className={`m-suffix-option ${value === opt.value ? 'active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="lf-suffix-select">
      <button
        type="button"
        className="lf-desktop-input lf-suffix-trigger"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
      >
        <span>{current.label}</span>
        <ChevronIcon open={open} color="#7f9490" size={10} />
      </button>
      {open && (
        <div className="lf-suffix-menu">
          {SUFFIX_OPTIONS.map(opt => (
            <button
              key={opt.value || 'none'}
              type="button"
              className={`lf-suffix-option ${value === opt.value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Password validation
const getPasswordRequirements = (rules) => {
  if (!rules) return [];
  const requirements = [{ key: 'minLength', label: `At least ${rules.minLength} characters`, test: (p) => p.length >= Number(rules.minLength) }];
  if (rules.requireUppercase) requirements.push({ key: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) });
  if (rules.requireLowercase) requirements.push({ key: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) });
  if (rules.requireNumber) requirements.push({ key: 'number', label: 'At least one number (0-9)', test: (p) => /[0-9]/.test(p) });
  if (rules.requireSpecialCharacter) requirements.push({ key: 'specialCharacter', label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) });
  return requirements;
};

const validatePassword = (password, rules) => {
  if (!rules) return { valid: false, message: 'Password requirements are still loading. Please try again.' };
  const requirements = getPasswordRequirements(rules);
  const failedRequirements = requirements.filter((r) => !r.test(password));
  if (failedRequirements.length > 0) {
    return {
      valid: false,
      message: `Password must contain ${failedRequirements.map((r) => r.label.toLowerCase()).join(', ')}.`,
      failedRequirements,
    };
  }
  return { valid: true, message: '', failedRequirements: [] };
};

// Password requirements checklist component
const PasswordRequirements = ({ password, rules, mobile = false }) => {
  if (!rules) {
    return <div className={mobile ? 'm-password-loading' : 'lf-password-loading'}>Loading password requirements…</div>;
  }
  const requirements = getPasswordRequirements(rules);
  if (requirements.length === 0) return null;

  return (
    <div className={mobile ? 'm-password-requirements' : 'lf-password-requirements'}>
      <div className={mobile ? 'm-password-requirements-title' : 'lf-password-requirements-title'}>Password requirements</div>
      <div className={mobile ? 'm-password-requirements-list' : 'lf-password-requirements-list'}>
        {requirements.map((requirement) => {
          const satisfied = requirement.test(password);
          const rowClass = mobile ? `m-password-requirement ${satisfied ? 'satisfied' : ''}` : `lf-password-requirement ${satisfied ? 'satisfied' : ''}`;
          return (
            <div key={requirement.key} className={rowClass}>
              <span className={mobile ? 'm-password-check' : 'lf-password-check'}>{satisfied ? '✓' : '○'}</span>
              <span>{requirement.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────

const SignupForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '',
    email: '', universityId: '', password: '', confirmPassword: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Unified validation states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic password rules (from system config)
  const [passwordRules, setPasswordRules] = useState(null);
  const [passwordRulesLoading, setPasswordRulesLoading] = useState(true);
  const [passwordRulesError, setPasswordRulesError] = useState(false);

  const normalizeRules = (raw) => ({
    minLength: Number(raw.minLength),
    requireUppercase: raw.requireUppercase === true,
    requireLowercase: raw.requireLowercase === true,
    requireNumber: raw.requireNumber === true,
    requireSpecialCharacter: raw.requireSpecialCharacter === true,
  });

  const fetchPasswordRules = async () => {
    try {
      setPasswordRulesLoading(true);
      setPasswordRulesError(false);
      const response = await fetch(`${API_URL}/system-config`, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Failed to fetch system configuration (${response.status})`);
      const result = await response.json();
      if (!result.success || !result.data || !result.data.password_rules) {
        throw new Error('Password rules were not returned by the server.');
      }
      const normalizedRules = normalizeRules(result.data.password_rules);
      if (!Number.isInteger(normalizedRules.minLength) || normalizedRules.minLength < 4 || normalizedRules.minLength > 128) {
        throw new Error('The server returned an invalid password minimum length.');
      }
      setPasswordRules(normalizedRules);
    } catch (err) {
      console.error('[Signup] Failed to fetch password rules:', err);
      setPasswordRules(null);
      setPasswordRulesError(true);
    } finally {
      setPasswordRulesLoading(false);
    }
  };

  useEffect(() => { fetchPasswordRules(); }, []);

  // Form change
  const handleChange = (e) => {
    const { id, value } = e.target;
    let formattedValue = value;

    if (['firstName', 'middleName', 'lastName'].includes(id)) {
      formattedValue = value.replace(/[0-9]/g, '').replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    } else if (id === 'universityId') {
      formattedValue = value.replace(/[^0-9-]/g, '');
    }

    setFormData((prev) => ({ ...prev, [id]: formattedValue }));

    // Clear field-specific error as the user types
    if (fieldErrors[id]) {
      setFieldErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  // Suffix is set from the custom dropdown (no native <select> event), so it gets its own setter
  const handleSuffixChange = (value) => {
    setFormData((prev) => ({ ...prev, suffix: value }));
    if (fieldErrors.suffix) {
      setFieldErrors(prev => ({ ...prev, suffix: undefined }));
    }
  };

  // Run Zod validation dynamically as user types (only updating fields they have touched)
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const zodErrors = getFieldErrors(registerSchema, formData);
      // We only want to set errors for things the user has actually touched
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(zodErrors).forEach(key => {
          if (touched[key]) newErrors[key] = zodErrors[key];
        });
        return newErrors;
      });
    }
  }, [formData, touched]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Specific check for password rules on blur
    if (field === 'password' && passwordRules) {
      const pwCheck = validatePassword(formData.password, passwordRules);
      if (!pwCheck.valid && formData.password.length > 0) {
        setFieldErrors(prev => ({ ...prev, password: pwCheck.message }));
      }
    }
  };

  // Drag and drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const validateAndSetFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      setFieldErrors(prev => ({ ...prev, idPhoto: 'File is too large (max 5MB). Please resize or crop.' }));
      setTouched(prev => ({ ...prev, idPhoto: true }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setFieldErrors(prev => ({ ...prev, idPhoto: undefined }));
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]); };
  const triggerFileInput = () => fileInputRef.current?.click();

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let activePasswordRules = passwordRules;

    // Attempt to fetch rules one last time if they failed initially
    if (!activePasswordRules) {
      try {
        setPasswordRulesLoading(true);
        const response = await fetch(`${API_URL}/system-config`, { method: 'GET', headers: { Accept: 'application/json' } });
        const result = await response.json();
        activePasswordRules = normalizeRules(result.data.password_rules);
        setPasswordRules(activePasswordRules);
        setPasswordRulesError(false);
      } catch (err) {
        setError('Unable to load the current password requirements. Please try again.');
        setPasswordRulesLoading(false);
        return;
      } finally {
        setPasswordRulesLoading(false);
      }
    }

    // --- Unified Error Checking ---
    const newErrors = {};
    const newTouched = {
      firstName: true, lastName: true, email: true,
      universityId: true, password: true, confirmPassword: true,
      idPhoto: true
    };

    // 1. Zod schema validation (Name, email format, ID format)
    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      Object.assign(newErrors, getFieldErrors(registerSchema, formData));
    }

    // 2. Dynamic password validation (overrides Zod password rules)
    const passwordValidation = validatePassword(formData.password, activePasswordRules);
    if (!passwordValidation.valid) {
      newErrors.password = 'Please ensure all password requirements are met.';
    } else {
      delete newErrors.password;
    }

    // 3. Password match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    // 4. File existence
    if (!selectedFile) {
      newErrors.idPhoto = 'Please upload a photo of your University ID.';
    }

    // Apply unified errors
    setTouched(newTouched);
    setFieldErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(err => err !== undefined && err !== '');

    if (hasErrors) {
      setError('Please check the highlighted fields and fix the errors to continue.');
      return;
    }

    // Start registration
    setLoading(true);

    try {
      // Email validation
      const validationResult = await validateEmailWithEasyEmail(formData.email);
      if (!validationResult.isDeliverable) {
        setFieldErrors(prev => ({ ...prev, email: validationResult.message }));
        setError('Email validation failed. Please check the email field.');
        setLoading(false);
        return;
      }

      // Check university ID
      const isIdUsed = await authService.checkIdExists(formData.universityId);
      if (isIdUsed) {
        setFieldErrors(prev => ({ ...prev, universityId: 'This University ID is already registered.' }));
        setError('Registration failed. Please check your University ID.');
        setLoading(false);
        return;
      }

      // Start OCR / ID scanning
      setIsScanning(true);

      const normalizeName = (name) => {
        if (!name) return '';
        return name.trim().replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      };

      const data = new FormData();
      data.append('firstName', normalizeName(formData.firstName));
      data.append('lastName', normalizeName(formData.lastName));
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('universityId', formData.universityId);
      data.append('image', selectedFile);
      if (formData.middleName) data.append('middleName', normalizeName(formData.middleName));
      if (formData.suffix) data.append('suffix', formData.suffix);

      // Register
      await authService.register(data);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsScanning(false);
      setSuccess('Account created! Check your email and click the confirmation link before signing in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setIsScanning(false);
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if a field has a visible error
  const hasError = (field) => touched[field] && fieldErrors[field];

  // ───────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────

  return (
    <>
      {isScanning && <LoadingAnimation file={selectedFile} />}

      <style>{`
        /* Force the entire page to allow natural scrolling (overrides layout restrictions) */
        html, body, #root {
          height: auto !important;
          min-height: 100vh;
          overflow-y: auto !important;
        }

        /* Animations */
        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes m-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes m-slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* Spinner */
        .lf-spinner { display: inline-block; width: 15px; height: 15px; border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: lf-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }

        /* Visibility */
        .lf-desktop-wrapper {
          display: block;
          padding-bottom: 60px; /* Ensures the bottom of the form doesn't hug the screen edge when scrolling */
        }
        .lf-mobile-wrapper { display: none; }
        @media (max-width: 640px) {
          .lf-desktop-wrapper { display: none !important; }
          .lf-mobile-wrapper { display: flex !important; flex-direction: column; }
        }

        /* Required marker */
        .lf-req, .m-req { color: #dc2626; font-weight: 700; margin-left: 2px; }

        /* --- Desktop Specifics --- */

        /* Desktop alerts */
        .lf-error { margin-bottom: 16px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px; border-radius: 10px; text-align: center; }
        .lf-success { margin-bottom: 16px; padding: 10px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 13px; font-weight: 500; border-radius: 10px; text-align: center; }

        /* Desktop fields */
        .lf-desktop-wrapper .lf-field { text-align: left; margin-bottom: 14px; }
        .lf-desktop-label { display: block; font-size: 11px; font-weight: 700; color: #4a635d; margin-bottom: 6px; margin-left: 4px; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; }
        .lf-desktop-input { width: 100%; padding: 10px 14px; box-sizing: border-box; border: 1.5px solid #d1dbd8; border-radius: 10px; font-size: 13.5px; outline: none; color: #1a2e2b; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; background: #f9fbfa; }
        .lf-desktop-input:focus { border-color: #4a635d; background: #fff; box-shadow: 0 0 0 3px rgba(74,99,93,0.1); }
        .lf-desktop-input::placeholder { color: #aabdb8; }
        .lf-desktop-row { display: flex; gap: 10px; margin-bottom: 0; min-width: 0; }
        .lf-desktop-row .lf-field { flex: 1; margin-bottom: 14px; min-width: 0; }

        /* Desktop Validation Styles */
        .lf-desktop-input.is-invalid { border-color: #ef4444; background: #fef2f2; }
        .lf-desktop-input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
        .lf-field-error { display: block; color: #ef4444; font-size: 11.5px; margin-top: 5px; margin-left: 4px; font-weight: 500; }

        /* Desktop password eye */
        .lf-input-wrap-desktop { position: relative; }
        .lf-input-wrap-desktop .lf-desktop-input { padding-right: 42px; }
        .lf-eye-btn-desktop { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 7px; display: flex; align-items: center; justify-content: center; color: #a0b8b4; transition: color 0.2s; -webkit-tap-highlight-color: transparent; }
        .lf-eye-btn-desktop:hover { color: #4a635d; }

        /* Desktop custom suffix dropdown */
        .lf-suffix-select { position: relative; width: 100%; }
        .lf-suffix-trigger { display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; gap: 8px; }
        .lf-suffix-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
        .lf-suffix-menu { position: absolute; top: calc(100% + 6px); left: 0; right: 0; min-width: 100px; background: #fff; border: 1.5px solid #d1dbd8; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.14); overflow: hidden; z-index: 50; max-height: 220px; overflow-y: auto; }
        .lf-suffix-option { display: block; width: 100%; text-align: left; padding: 9px 14px; font-size: 13.5px; font-weight: 500; border: none; cursor: pointer; background: transparent; color: #1a2e2b; }
        .lf-suffix-option:hover { background: #f6faf9; }
        .lf-suffix-option.active { background: #eef6f4; color: #3a524f; font-weight: 700; }

        /* Desktop password requirements */
        .lf-password-requirements { margin-top: -7px; margin-bottom: 14px; padding: 10px 12px; background: #f6faf9; border: 1px solid #e2ecea; border-radius: 9px; }
        .lf-password-requirements-title { font-size: 10px; font-weight: 700; color: #718b85; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; }
        .lf-password-requirements-list { display: flex; flex-wrap: wrap; gap: 5px 14px; }
        .lf-password-requirement { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #8da39e; transition: color 0.2s; }
        .lf-password-requirement.satisfied { color: #32836f; }
        .lf-password-check { width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .lf-password-loading { margin-top: -7px; margin-bottom: 14px; font-size: 10.5px; color: #8da39e; padding-left: 4px; }

        /* Desktop actions */
        .lf-desktop-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 22px; padding-bottom: 10px; }
        .lf-btn-primary-desktop { width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 700; background: #3a524f; color: white; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s; letter-spacing: 0.3px; }
        .lf-btn-primary-desktop:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(58,82,79,0.3); }
        .lf-btn-primary-desktop:disabled { opacity: 0.6; cursor: not-allowed; }
        .lf-desktop-link { text-align: center; font-size: 12.5px; color: #6b8577; margin-top: 2px; }
        .lf-desktop-link a { color: #3a524f; font-weight: 700; text-decoration: none; }
        .lf-desktop-link a:hover { text-decoration: underline; }

        /* Desktop dropzone */
        .lf-desktop-dropzone { width: 100%; padding: 18px 15px; border: 1.5px dashed #c5d5d2; border-radius: 12px; text-align: center; cursor: pointer; background: #f6faf9; transition: all 0.2s; box-sizing: border-box; }
        .lf-desktop-dropzone:hover { border-color: #4a635d; background: #eef6f4; }
        .lf-desktop-dropzone.dragging { border-color: #4a635d; background: #eef6f4; transform: scale(1.01); }
        .lf-desktop-dropzone.is-invalid { border-color: #ef4444; background: #fef2f2; }
        .lf-desktop-dropzone span { font-size: 13px; font-weight: 500; color: #4a635d; }
        .lf-divider { display: flex; align-items: center; gap: 10px; margin: 4px 0 14px; color: #aabdb8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
        .lf-divider::before, .lf-divider::after { content: ''; flex: 1; height: 1px; background: #e2ecea; }

        /* --- Mobile Specifics --- */
        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            position: fixed; /* Lock to viewport */
            top: 0; left: 0; right: 0; bottom: 0;
            height: 100dvh; /* Dynamic viewport height for modern mobile browsers */
            height: 100vh;  /* Fallback */
            background: #F2F4F3;
            overflow-y: auto; /* Enable vertical scrolling */
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
            width: 100%;
            box-sizing: border-box;
            z-index: 10;
          }

          /* Mobile top bar */
          .m-topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; flex-shrink: 0; animation: m-fadeIn 0.4s ease both; }
          .m-logo-wrap { display: flex; align-items: center; gap: 10px; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-step-badge { background: #E4EFED; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #3D7A6F; }

          /* Mobile hero */
          .m-hero { padding: 24px 28px 16px; flex-shrink: 0; animation: m-fadeUp 0.5s ease 0.1s both; }
          .m-eyebrow { font-size: 12px; font-weight: 600; color: #4A8C82; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
          .m-title { font-size: 28px; font-weight: 800; color: #1A2E2B; line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 6px; }
          .m-subtitle { font-size: 13.5px; color: #6B8580; line-height: 1.4; }

          /* Mobile card */
          .m-card {
            background: #fff;
            border-radius: 28px 28px 0 0;
            padding: 28px 24px calc(40px + env(safe-area-inset-bottom));
            box-shadow: 0 -2px 24px rgba(42,72,68,0.08);
            animation: m-fadeUp 0.5s ease 0.2s both;
            margin-top: 10px;
            flex: 1 0 auto; /* Allow card to expand and fill remaining space */
          }

          /* Mobile section */
          .m-section-title { font-size: 11.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #A0B8B4; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #F0F4F3; }
          .m-section-title:not(:first-of-type) { margin-top: 24px; }

          /* Mobile alerts */
          .m-error { display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px; background: #FFF0F0; border-radius: 14px; border: 1px solid #FFCCCC; animation: m-slideDown 0.3s ease; }
          .m-error-icon { width: 20px; height: 20px; border-radius: 50%; background: #FF4444; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .m-error-text { font-size: 13.5px; color: #C0392B; font-weight: 500; line-height: 1.4; }
          .m-success { display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px; background: #EDFAF4; border-radius: 14px; border: 1px solid #A7EED0; animation: m-slideDown 0.3s ease; }
          .m-success-icon { width: 20px; height: 20px; border-radius: 50%; background: #22C77A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .m-success-text { font-size: 13.5px; color: #0A7850; font-weight: 500; line-height: 1.4; }

          /* Mobile field & validation */
          .m-field { margin-bottom: 12px; }
          .m-field-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: #8AA09C; margin-bottom: 7px; display: block; }
          .m-field-error { display: block; color: #ef4444; font-size: 12px; margin-top: 6px; margin-left: 6px; font-weight: 500; }

          /* Mobile input */
          .m-input-pill { display: flex; align-items: center; background: #F4F7F6; border-radius: 14px; border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; overflow: hidden; min-width: 0; }
          .m-input-pill:focus-within { border-color: #3D7A6F; background: #fff; box-shadow: 0 0 0 4px rgba(61,122,111,0.1); }
          .m-input-pill.is-invalid { border-color: #ef4444; background: #fef2f2; }
          .m-input-pill.is-invalid:focus-within { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1); }
          .m-pill-input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 15px; font-family: inherit; color: #1A2E2B; padding: 13px 14px; }
          .m-pill-input::placeholder { color: #B5C8C5; }
          .m-pill-btn { background: none; border: none; cursor: pointer; padding: 0 14px; display: flex; align-items: center; color: #A0B8B4; transition: color 0.2s; flex-shrink: 0; }
          .m-pill-btn:hover { color: #3D7A6F; }

          /* Mobile custom suffix dropdown */
          .m-suffix-select { position: relative; width: 100%; }
          .m-suffix-trigger { width: 100%; border: none; background: transparent; padding: 0; cursor: pointer; text-align: left; }
          .m-suffix-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
          .m-suffix-value { display: flex; align-items: center; padding: 13px 0 13px 14px; color: #1A2E2B; font-size: 15px; }
          .m-suffix-menu { position: absolute; top: calc(100% + 6px); left: 0; min-width: 130px; background: #fff; border: 1.5px solid #E3ECEA; border-radius: 14px; box-shadow: 0 10px 28px rgba(42,72,68,0.14); overflow: hidden; z-index: 50; max-height: 220px; overflow-y: auto; }
          .m-suffix-option { display: block; width: 100%; text-align: left; padding: 11px 16px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; background: transparent; color: #1A2E2B; }
          .m-suffix-option:hover { background: #F4F8F7; }
          .m-suffix-option.active { background: #EAF5F1; color: #2D5C52; font-weight: 700; }

          /* Mobile row */
          .m-row { display: flex; gap: 10px; min-width: 0; }
          .m-row .m-field { flex: 1; min-width: 0; }

          /* Mobile password requirements */
          .m-password-requirements { margin-top: -6px; margin-bottom: 14px; padding: 11px 13px; background: #F4F8F7; border: 1px solid #E3ECEA; border-radius: 12px; }
          .m-password-requirements-title { font-size: 10px; font-weight: 700; color: #829A95; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 7px; }
          .m-password-requirements-list { display: flex; flex-direction: column; gap: 5px; }
          .m-password-requirement { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #91A7A2; transition: color 0.2s; }
          .m-password-requirement.satisfied { color: #32836F; }
          .m-password-check { width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
          .m-password-loading { margin-top: -5px; margin-bottom: 14px; font-size: 11px; color: #91A7A2; padding-left: 4px; }

          /* Mobile dropzone */
          .m-dropzone { background: #F4F7F6; border-radius: 16px; border: 1.5px dashed #C5D5D2; padding: 22px 16px; text-align: center; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
          .m-dropzone.dragging { border-color: #3D7A6F; background: #EAF5F1; transform: scale(1.01); }
          .m-dropzone.is-invalid { border-color: #ef4444; background: #fef2f2; }
          .m-dropzone-icon { color: #8AA09C; margin-bottom: 4px; }
          .m-dropzone-title { font-size: 14px; font-weight: 600; color: #2D5C52; }
          .m-dropzone-hint { font-size: 12px; color: #A0B8B4; }
          .m-file-preview { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #2D5C52; max-width: 100%; overflow: hidden; }
          .m-file-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          /* Mobile button */
          .m-btn-primary { width: 100%; padding: 16px; border-radius: 18px; border: none; background: #2D5C52; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: transform 0.15s, background 0.2s; margin-top: 8px; margin-bottom: 20px; -webkit-tap-highlight-color: transparent; }
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

          /* Mobile footer */
          .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
          .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ═══════════════════ DESKTOP ═══════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout title="Create your account" widthClass="max-w-[720px]">
          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}

            {/* Row 1: First / Middle / Last */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="firstName" className="lf-desktop-label">First Name<span className="lf-req">*</span></label>
                <input id="firstName" type="text" disabled={loading} className={`lf-desktop-input ${hasError('firstName') ? 'is-invalid' : ''}`} placeholder="First name" value={formData.firstName} onChange={handleChange} onBlur={() => handleBlur('firstName')} />
                {hasError('firstName') && <span className="lf-field-error">{fieldErrors.firstName}</span>}
              </div>
              <div className="lf-field" style={{ flex: 4 }}>
                <label htmlFor="middleName" className="lf-desktop-label">Middle Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span></label>
                <input id="middleName" type="text" disabled={loading} className="lf-desktop-input" placeholder="Middle name" value={formData.middleName} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="lastName" className="lf-desktop-label">Last Name<span className="lf-req">*</span></label>
                <input id="lastName" type="text" disabled={loading} className={`lf-desktop-input ${hasError('lastName') ? 'is-invalid' : ''}`} placeholder="Last name" value={formData.lastName} onChange={handleChange} onBlur={() => handleBlur('lastName')} />
                {hasError('lastName') && <span className="lf-field-error">{fieldErrors.lastName}</span>}
              </div>
            </div>

            {/* Row 2: Suffix / University ID */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 2 }}>
                <label htmlFor="suffix" className="lf-desktop-label">Suffix <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span></label>
                <SuffixSelect value={formData.suffix} onChange={handleSuffixChange} disabled={loading} variant="desktop" />
              </div>
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="universityId" className="lf-desktop-label">University ID<span className="lf-req">*</span></label>
                <input id="universityId" type="text" disabled={loading} className={`lf-desktop-input ${hasError('universityId') ? 'is-invalid' : ''}`} placeholder="e.g. 2021-00123" value={formData.universityId} onChange={handleChange} onBlur={() => handleBlur('universityId')} />
                {hasError('universityId') && <span className="lf-field-error">{fieldErrors.universityId}</span>}
              </div>
            </div>

            {/* Email */}
            <div className="lf-field">
              <label htmlFor="email" className="lf-desktop-label">Email Address<span className="lf-req">*</span></label>
              <input id="email" type="email" disabled={loading} className={`lf-desktop-input ${hasError('email') ? 'is-invalid' : ''}`} placeholder="you@plsp.edu.ph" value={formData.email} onChange={handleChange} onBlur={() => handleBlur('email')} />
              {hasError('email') && <span className="lf-field-error">{fieldErrors.email}</span>}
            </div>

            {/* ID upload */}
            <div className="lf-field">
              <label className="lf-desktop-label">University ID Photo<span className="lf-req">*</span></label>
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`lf-desktop-dropzone ${isDragging ? 'dragging' : ''} ${hasError('idPhoto') ? 'is-invalid' : ''}`}>
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                {selectedFile ? <span>✓ {selectedFile.name}</span> : <span><span style={{ fontWeight: 700 }}>Click to upload</span> or drag &amp; drop your ID photo</span>}
              </div>
              {hasError('idPhoto') && <span className="lf-field-error">{fieldErrors.idPhoto}</span>}
            </div>

            <div className="lf-divider">Password</div>

            {/* Password / confirm */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="password" className="lf-desktop-label">Password<span className="lf-req">*</span></label>
                <div className="lf-input-wrap-desktop">
                  <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" disabled={loading} className={`lf-desktop-input ${hasError('password') ? 'is-invalid' : ''}`} value={formData.password} onChange={handleChange} onBlur={() => handleBlur('password')} autoComplete="new-password" />
                  <button type="button" className="lf-eye-btn-desktop" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {hasError('password') && <span className="lf-field-error">{fieldErrors.password}</span>}
              </div>
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="confirmPassword" className="lf-desktop-label">Confirm Password<span className="lf-req">*</span></label>
                <div className="lf-input-wrap-desktop">
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repeat password" disabled={loading} className={`lf-desktop-input ${hasError('confirmPassword') ? 'is-invalid' : ''}`} value={formData.confirmPassword} onChange={handleChange} onBlur={() => handleBlur('confirmPassword')} autoComplete="new-password" />
                  <button type="button" className="lf-eye-btn-desktop" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {hasError('confirmPassword') && <span className="lf-field-error">{fieldErrors.confirmPassword}</span>}
              </div>
            </div>

            <PasswordRequirements password={formData.password} rules={passwordRules} />

            {/* Actions */}
            <div className="lf-desktop-actions">
              <button type="submit" disabled={loading || passwordRulesLoading} className="lf-btn-primary-desktop">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Processing…' : passwordRulesLoading ? 'Loading requirements…' : 'Create Account'}
              </button>
              <div className="lf-desktop-link">Already have an account? <Link to="/login">Sign in</Link></div>
            </div>
          </form>
        </AuthLayout>
      </div>

      {/* ═══════════════════ MOBILE ═══════════════════ */}
      <div className="lf-mobile-wrapper">
        <div className="m-topbar">
          <div className="m-logo-wrap"><span className="m-logo-name">MediTrack</span></div>
          <span className="m-step-badge">New account</span>
        </div>

        <div className="m-hero">
          <p className="m-eyebrow">Health Portal</p>
          <h1 className="m-title">Create your<br />account.</h1>
          <p className="m-subtitle">Register with your university credentials to get started.</p>
        </div>

        <div className="m-card">
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="m-error">
                <div className="m-error-icon"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 3v3M6 8.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
                <p className="m-error-text" style={{margin: 0, padding: 0}}>{error}</p>
              </div>
            )}

            {success && (
              <div className="m-success">
                <div className="m-success-icon"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <p className="m-success-text" style={{margin: 0, padding: 0}}>{success}</p>
              </div>
            )}

            <p className="m-section-title">Personal info</p>

            <div className="m-row">
              <div className="m-field" style={{ flex: 3 }}>
                <label className="m-field-label">First name<span className="m-req">*</span></label>
                <div className={`m-input-pill ${hasError('firstName') ? 'is-invalid' : ''}`}>
                  <input id="firstName" type="text" className="m-pill-input" placeholder="First name" value={formData.firstName} onChange={handleChange} onBlur={() => handleBlur('firstName')} autoComplete="given-name" />
                </div>
                {hasError('firstName') && <span className="m-field-error">{fieldErrors.firstName}</span>}
              </div>
              <div className="m-field" style={{ flex: 2 }}>
                <label className="m-field-label">Middle Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span></label>
                <div className="m-input-pill">
                  <input id="middleName" type="text" className="m-pill-input" placeholder="Middle" value={formData.middleName} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="m-field">
              <label className="m-field-label">Last name<span className="m-req">*</span></label>
              <div className={`m-input-pill ${hasError('lastName') ? 'is-invalid' : ''}`}>
                <input id="lastName" type="text" className="m-pill-input" placeholder="Last name" value={formData.lastName} onChange={handleChange} onBlur={() => handleBlur('lastName')} autoComplete="family-name" />
              </div>
              {hasError('lastName') && <span className="m-field-error">{fieldErrors.lastName}</span>}
            </div>

            <div className="m-row">
              <div className="m-field" style={{ flex: 1 }}>
                <label className="m-field-label">Suffix <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span></label>
                <SuffixSelect value={formData.suffix} onChange={handleSuffixChange} disabled={false} variant="mobile" />
              </div>
              <div className="m-field" style={{ flex: 2 }}>
                <label className="m-field-label">University ID<span className="m-req">*</span></label>
                <div className={`m-input-pill ${hasError('universityId') ? 'is-invalid' : ''}`}>
                  <input id="universityId" type="text" className="m-pill-input" placeholder="2021-XXXXX" value={formData.universityId} onChange={handleChange} onBlur={() => handleBlur('universityId')} autoComplete="off" />
                </div>
                {hasError('universityId') && <span className="m-field-error">{fieldErrors.universityId}</span>}
              </div>
            </div>

            <p className="m-section-title">Account details</p>

            <div className="m-field">
              <label className="m-field-label">Email<span className="m-req">*</span></label>
              <div className={`m-input-pill ${hasError('email') ? 'is-invalid' : ''}`}>
                <input id="email" type="email" className="m-pill-input" placeholder="you@plsp.edu.ph" value={formData.email} onChange={handleChange} onBlur={() => handleBlur('email')} autoComplete="email" inputMode="email" />
              </div>
              {hasError('email') && <span className="m-field-error">{fieldErrors.email}</span>}
            </div>

            <div className="m-field">
              <label className="m-field-label">Password<span className="m-req">*</span></label>
              <div className={`m-input-pill ${hasError('password') ? 'is-invalid' : ''}`}>
                <input id="password" type={showPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Create a password" value={formData.password} onChange={handleChange} onBlur={() => handleBlur('password')} autoComplete="new-password" />
                <button type="button" className="m-pill-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
                </button>
              </div>
              {hasError('password') && <span className="m-field-error">{fieldErrors.password}</span>}
            </div>

            <PasswordRequirements password={formData.password} rules={passwordRules} mobile />

            <div className="m-field">
              <label className="m-field-label">Confirm password<span className="m-req">*</span></label>
              <div className={`m-input-pill ${hasError('confirmPassword') ? 'is-invalid' : ''}`}>
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleChange} onBlur={() => handleBlur('confirmPassword')} autoComplete="new-password" />
                <button type="button" className="m-pill-btn" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
                </button>
              </div>
              {hasError('confirmPassword') && <span className="m-field-error">{fieldErrors.confirmPassword}</span>}
            </div>

            <p className="m-section-title">ID verification<span className="m-req">*</span></p>

            <div className="m-field">
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`m-dropzone ${isDragging ? 'dragging' : ''} ${hasError('idPhoto') ? 'is-invalid' : ''}`}>
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
                {selectedFile ? (
                  <div className="m-file-preview">
                    <svg viewBox="0 0 20 20" fill="none" stroke="#22C77A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M4 10.5l4 4 8-8" /></svg>
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="m-dropzone-icon"><IdCardIcon /></div>
                    <p className="m-dropzone-title">Tap to upload ID photo</p>
                    <p className="m-dropzone-hint">Your university-issued ID card</p>
                  </>
                )}
              </div>
              {hasError('idPhoto') && <span className="m-field-error">{fieldErrors.idPhoto}</span>}
            </div>

            <button type="submit" disabled={loading || passwordRulesLoading} className="m-btn-primary">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Creating account…' : passwordRulesLoading ? 'Loading requirements…' : 'Sign up'}
            </button>

            <p className="m-footer">Already have an account? <Link to="/login">Sign in</Link></p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignupForm;