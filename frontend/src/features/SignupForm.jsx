import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { registerSchema, getFieldErrors } from '../validation/schemas.js';
import LoadingAnimation from '../components/LoadingAnimation.jsx';

// API
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Default password rule shape/fallback while config loads
const DEFAULT_PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialCharacter: false,
};

// Suffix options for the custom dropdown
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

// Icons
const IdCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
    <line x1="16" y1="2" x2="16" y2="4" /><line x1="8" y1="2" x2="8" y2="4" />
    <circle cx="9" cy="11" r="2" />
    <line x1="14" y1="10" x2="18" y2="10" /><line x1="14" y1="14" x2="18" y2="14" />
    <line x1="6" y1="16" x2="12" y2="16" />
  </svg>
);

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

// Inline notice shown directly under the submit button
const FormNotice = ({ show, type, message, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (show && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [show, message]);

  if (!show) return null;
  const isError = type === 'error';
  return (
    <div ref={ref} role="alert" className={`form-notice ${isError ? 'is-error' : 'is-success'}`}>
      <div className="form-notice-icon">{isError ? '!' : '✓'}</div>
      <p className="form-notice-msg">{message}</p>
      <button type="button" onClick={onClose} className="form-notice-close" aria-label="Close message">✕</button>
    </div>
  );
};

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
  const activeRules = rules || DEFAULT_PASSWORD_RULES;
  const requirements = getPasswordRequirements(activeRules);
  const failedRequirements = requirements.filter((r) => !r.test(password));
  if (failedRequirements.length > 0) {
    return {
      valid: false,
      message: `Password must contain ${failedRequirements.map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join(', ')}.`,
      failedRequirements,
    };
  }
  return { valid: true, message: '', failedRequirements: [] };
};

const PasswordRequirements = ({ password, rules, mobile = false, loadFailed = false }) => {
  const activeRules = rules || DEFAULT_PASSWORD_RULES;
  const requirements = getPasswordRequirements(activeRules);
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
      {loadFailed && (
        <div style={{ fontSize: 11, color: '#b45309', marginTop: 8, lineHeight: 1.4 }}>
          Couldn't load the latest password rules. The server may require more than what's listed here.
        </div>
      )}
    </div>
  );
};

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PRIVACY_POLICY_VERSION = 'PLSP-MEDITRACK-2026-10-DRAFT-1';

const POLICY_SECTIONS = [
  ['1. Purpose and scope', 'MediTrack is designed to help the Pamantasan ng Lungsod ng San Pablo (PLSP) University Clinic manage patient profiles, appointment requests, consultations, medical and dental records, health documents, clinic announcements, and aggregate health reporting. Information will be processed only for disclosed, legitimate university health-service purposes and other purposes permitted or required by law.'],
  ['2. Personal and sensitive information collected', 'Depending on the services used, information may include your name, university ID, contact information, department, academic or employment details, uploaded university ID image, date of birth, medical and dental history, symptoms, examinations, consultation notes, treatment-related information, appointment details, and health documents. Health and education data are sensitive personal information under Republic Act No. 10173.'],
  ['3. Legal bases and consent', 'PLSP must identify and document the appropriate lawful basis for each processing activity under Sections 12 and 13 of Republic Act No. 10173. Where consent is the applicable basis, it must be freely given, specific, informed and recorded. Certain information may also be processed where authorized by law or necessary for medical treatment under the requirements of the Act. Acceptance of this notice does not waive statutory rights.'],
  ['4. Access, confidentiality and safeguards', 'Personal information and clinic records must be protected using appropriate organizational, physical, and technical safeguards, including controlled staff access, authentication, secure transmission, access monitoring, and backups where implemented. Only duly authorized personnel may access information as needed for legitimate duties. No unauthorized sale, personal exploitation, or misuse of health records is permitted. No information system can promise absolute security.'],
  ['5. Who may receive information', 'Authorized PLSP clinic personnel and designated administrators may access data only according to their assigned duties. Contracted infrastructure, hosting, authentication, or storage providers may process data under appropriate privacy and security arrangements. Data may be disclosed to authorized recipients when required or permitted by law, with applicable safeguards. Individual health records will not be publicly displayed.'],
  ['6. Appointments, documents and analytics', 'Appointment and consultation data are used for clinic service delivery. Uploaded identity images are used for eligibility or account verification. Health analytics and reports should use aggregated or de-identified information where practicable, with safeguards to prevent identification of individuals.'],
  ['7. Retention, correction and deletion', 'Data must be retained only for the applicable documented retention period and legal, clinical, or institutional recordkeeping requirements, after which it must be securely disposed of or anonymized as appropriate. Requests for correction, deletion, blocking, or other rights will be assessed under applicable law; some health records may need to be retained even after an account is closed.'],
  ['8. Your data privacy rights', 'Subject to applicable law, you have rights to be informed, access your information, object to certain processing, request correction or erasure/blocking, seek data portability where applicable, claim damages, and file a complaint with the National Privacy Commission. You may also withdraw consent for processing that relies on consent, subject to other valid legal bases and legal obligations.'],
  ['9. Relevant Philippine law', 'Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations govern personal and sensitive information. Republic Act No. 11223 (Universal Health Care Act), particularly Section 36 on health information systems, may be relevant to applicable healthcare providers. Republic Act No. 11036 (Mental Health Act) applies to confidentiality of mental-health service-user records when those services or records are involved.'],
  ['10. Privacy inquiries and complaints', 'For access, correction, complaints, and other privacy requests, contact the official PLSP Data Protection Officer or duly designated privacy office through the contact details published by the university. The institution should publish verified contact information, actual retention periods, applicable recipients, and system-specific security practices before deploying this notice.'],
];

function PrivacyPolicyModal({ onDone, onClose, reachedBottom, setReachedBottom }) {
  const contentRef = useRef(null);
  const overlayRef = useRef(null);

  // ── Pin the overlay to the real screen ─────────────────────────
  // If any ancestor (html/body/#root) has a transform, filter, will-change
  // or contain rule, `position: fixed` stops being relative to the screen
  // and the overlay scrolls away with the page. To be immune to that, we
  // measure where the overlay actually landed and shift it back to 0,0 at
  // full window size. Re-checked on scroll and resize.
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el) return undefined;

    const align = () => {
      el.style.top = '0px';
      el.style.left = '0px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.width = `${window.innerWidth}px`;
      el.style.height = `${window.innerHeight}px`;
      const rect = el.getBoundingClientRect();
      if (rect.top !== 0) el.style.top = `${-rect.top}px`;
      if (rect.left !== 0) el.style.left = `${-rect.left}px`;
    };

    align();
    window.addEventListener('scroll', align, { passive: true });
    window.addEventListener('resize', align);
    return () => {
      window.removeEventListener('scroll', align);
      window.removeEventListener('resize', align);
    };
  }, []);

  useEffect(() => {
    // Lock the page behind the modal (scroll position is left untouched).
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlPriority = document.documentElement.style.getPropertyPriority('overflow');
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPriority = document.body.style.getPropertyPriority('overflow');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');

    // The footer is permanently visible, so completion must be based on
    // scrolling the actual policy content—not visibility of the footer.
    const content = contentRef.current;
    const checkBottom = () => {
      if (content && content.scrollTop + content.clientHeight >= content.scrollHeight - 8) {
        setReachedBottom(true);
      }
    };
    checkBottom();
    content?.addEventListener('scroll', checkBottom, { passive: true });

    return () => {
      content?.removeEventListener('scroll', checkBottom);
      if (previousHtmlOverflow) {
        document.documentElement.style.setProperty('overflow', previousHtmlOverflow, previousHtmlPriority);
      } else {
        document.documentElement.style.removeProperty('overflow');
      }
      if (previousBodyOverflow) {
        document.body.style.setProperty('overflow', previousBodyOverflow, previousBodyPriority);
      } else {
        document.body.style.removeProperty('overflow');
      }
    };
  }, [setReachedBottom]);

  return createPortal(
    <div
      ref={overlayRef}
      className="privacy-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483647,
        isolation: 'isolate',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
      }}
    >
      <div role="presentation" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', zIndex: 0 }} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 1,
          maxHeight: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          margin: 0,
        }}
      >
        <header className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id="privacy-title" className="text-lg font-bold text-[#2D4744]">MediTrack Privacy Notice and Data Protection Policy</h2>
            <p className="text-xs text-slate-500 mt-1">Pamantasan ng Lungsod ng San Pablo (PLSP) University Clinic · {PRIVACY_POLICY_VERSION}</p>
          </div>
          <button
            type="button"
            onClick={() => { if (reachedBottom) onClose(); }}
            disabled={!reachedBottom}
            className="shrink-0 h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close Privacy Policy"
            title={reachedBottom ? 'Close Privacy Policy' : 'Scroll down before closing'}
          >
            ✕
          </button>
        </header>

        <div
          ref={contentRef}
          tabIndex={0}
          className="px-5 py-4 overflow-y-auto overscroll-contain text-sm text-slate-700 leading-6 flex-1"
          style={{ minHeight: 0 }}
        >
          <p className="mb-4">Please review how MediTrack proposes to collect, use, protect, share, and retain university clinic information. This is a draft notice pending institutional approval.</p>
          {POLICY_SECTIONS.map(([title, description]) => (
            <section key={title} className="mb-5">
              <h3 className="font-bold text-[#2D4744] mb-1">{title}</h3>
              <p>{description}</p>
            </section>
          ))}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs">
            By continuing, you acknowledge that you have been given this privacy notice. Consent to processing that relies on consent must be voluntary and does not remove your statutory rights.
          </div>
        </div>

        <footer className="px-5 py-4 border-t border-slate-200 bg-white shrink-0">
          <p aria-live="polite" className="text-xs text-slate-500 mb-3">
            {reachedBottom ? 'You have reached the end of the notice. You can now acknowledge or close it.' : 'Scroll to the bottom to enable the acknowledgment and close buttons.'}
          </p>
          <button
            type="button"
            disabled={!reachedBottom}
            onClick={onDone}
            className="w-full rounded-xl bg-[#2D5C52] text-white p-3 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            I have reviewed the Privacy Notice
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function PrivacyAcceptance({ opened, reviewed, accepted, setAccepted, openPolicy, mobile = false }) {
  return (
    <div className="rounded-xl border border-[#c5d5d2] bg-[#f6faf9] p-3 my-4 text-left">
      <div className="text-xs font-bold text-[#2D4744] mb-2">Data Privacy and Protection <span className="text-red-600">*</span></div>
      <button type="button" onClick={openPolicy} className="text-xs font-semibold text-[#2D5C52] underline underline-offset-2">{reviewed ? 'Read Privacy Policy again' : 'Open and read Privacy Policy'}</button>
      <label
        className={`flex items-start gap-2 mt-3 text-xs leading-5 ${reviewed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
        title={!reviewed ? "Please open and read the Privacy Policy first before checking this box." : ""}
      >
        <input type="checkbox" className="mt-1 accent-[#2D5C52]" checked={accepted} disabled={!reviewed} onChange={(e) => setAccepted(e.target.checked)} />
        <span>I have reviewed the MediTrack Privacy Notice. I understand how my personal and sensitive health information may be processed for the university clinic's legitimate services, and I give consent where consent is the applicable legal basis.</span>
      </label>
      {!opened && <p className="text-[11px] text-slate-500 mt-2">Open the Privacy Policy before the checkbox becomes available.</p>}
      {opened && !reviewed && <p className="text-[11px] text-amber-700 mt-2">Finish reviewing the policy by scrolling to the bottom.</p>}
    </div>
  );
}

const SignupForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '',
    email: '', universityId: '', password: '', confirmPassword: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [snackbar, setSnackbar] = useState({ show: false, type: '', message: '' });
  const [isSubmitFailed, setIsSubmitFailed] = useState(false);

  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyWasOpened, setPrivacyWasOpened] = useState(false);
  const [privacyReachedBottom, setPrivacyReachedBottom] = useState(false);
  const [privacyReviewed, setPrivacyReviewed] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const openPrivacyPolicy = () => { setPrivacyWasOpened(true); setPrivacyOpen(true); };

  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState(DEFAULT_PASSWORD_RULES);
  const [rulesLoadFailed, setRulesLoadFailed] = useState(false);

  const showSnackbar = (type, message) => setSnackbar({ show: true, type, message });
  const hideSnackbar = () => setSnackbar(prev => ({ ...prev, show: false }));

  // Auto-hide error snackbars after 6 seconds
  useEffect(() => {
    if (snackbar.show && snackbar.type === 'error') {
      const timer = setTimeout(() => hideSnackbar(), 6000);
      return () => clearTimeout(timer);
    }
  }, [snackbar]);

  useEffect(() => {
    setIsSubmitFailed(false);
  }, [formData, selectedFile, privacyAccepted]);

  const normalizeRules = (raw = {}) => ({
    minLength: Number(raw.minLength ?? DEFAULT_PASSWORD_RULES.minLength),
    requireUppercase: raw.requireUppercase === true || raw.requireUppercase === 'true',
    requireLowercase: raw.requireLowercase === true || raw.requireLowercase === 'true',
    requireNumber: raw.requireNumber === true || raw.requireNumber === 'true',
    requireSpecialCharacter: raw.requireSpecialCharacter === true || raw.requireSpecialCharacter === 'true',
  });

  const fetchPasswordRules = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_URL}/system-config/password-rules`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Failed to fetch password rules (${response.status})`);
      const result = await response.json();
      if (!result.success || !result.data || !result.data.password_rules) {
        throw new Error('Password rules were not returned by the server.');
      }
      const normalizedRules = normalizeRules(result.data.password_rules);
      if (!Number.isInteger(normalizedRules.minLength) || normalizedRules.minLength < 4 || normalizedRules.minLength > 128) {
        throw new Error('The server returned an invalid password minimum length.');
      }
      setPasswordRules(normalizedRules);
      setRulesLoadFailed(false);
    } catch (err) {
      console.error('[Signup] Failed to fetch password rules:', err);
      setPasswordRules({ ...DEFAULT_PASSWORD_RULES });
      setRulesLoadFailed(true);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => { fetchPasswordRules(); }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    let formattedValue = value;

    if (['firstName', 'middleName', 'lastName'].includes(id)) {
      formattedValue = value.replace(/[0-9]/g, '').replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    } else if (id === 'universityId') {
      formattedValue = value.replace(/[^0-9-]/g, '');
    }

    setFormData((prev) => ({ ...prev, [id]: formattedValue }));
    if (fieldErrors[id]) {
      setFieldErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSuffixChange = (value) => {
    setFormData((prev) => ({ ...prev, suffix: value }));
    if (fieldErrors.suffix) {
      setFieldErrors(prev => ({ ...prev, suffix: undefined }));
    }
  };

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const zodErrors = getFieldErrors(registerSchema, formData);

      // Password strength follows the live server rules, not the schema
      let clearPassword = false;
      if (touched.password && formData.password.length > 0) {
        const pwCheck = validatePassword(formData.password, passwordRules || DEFAULT_PASSWORD_RULES);
        if (!pwCheck.valid) zodErrors.password = pwCheck.message;
        else { delete zodErrors.password; clearPassword = true; }
      }

      // Clear a stale "Passwords don't match" once the two fields agree
      const clearConfirm = touched.confirmPassword && formData.confirmPassword.length > 0 && !zodErrors.confirmPassword;

      setFieldErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(zodErrors).forEach(key => {
          if (touched[key]) newErrors[key] = zodErrors[key];
        });
        if (clearPassword) newErrors.password = undefined;
        if (clearConfirm) newErrors.confirmPassword = undefined;
        return newErrors;
      });
    }
  }, [formData, touched, passwordRules]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'password') {
      const pwCheck = validatePassword(
        formData.password,
        passwordRules || DEFAULT_PASSWORD_RULES
      );
      if (!pwCheck.valid && formData.password.length > 0) {
        setFieldErrors(prev => ({ ...prev, password: pwCheck.message }));
      }
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const rejectFile = (errMsg) => {
    setFieldErrors(prev => ({ ...prev, idPhoto: errMsg }));
    setTouched(prev => ({ ...prev, idPhoto: true }));
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateAndSetFile = (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejectFile('Unsupported file type. Please upload a JPG, PNG, or WEBP image of your University ID.');
    } else if (file.size > MAX_FILE_SIZE) {
      rejectFile(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). The limit is 5MB. Please resize or compress your image.`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    hideSnackbar();

    const activePasswordRules = passwordRules || DEFAULT_PASSWORD_RULES;

    if (!privacyReviewed || !privacyAccepted) {
      showSnackbar('error', 'Please read the Privacy Policy and check the consent box before signing up.');
      setIsSubmitFailed(true);
      return;
    }

    const newErrors = {};
    const newTouched = {
      firstName: true, lastName: true, email: true,
      universityId: true, password: true, confirmPassword: true,
      idPhoto: true
    };

    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      Object.assign(newErrors, getFieldErrors(registerSchema, formData));
    }

    const passwordValidation = validatePassword(formData.password, activePasswordRules);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    } else {
      delete newErrors.password;
    }

    // An empty confirm field is already reported by the schema ("Please confirm your password")
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (!selectedFile) {
      newErrors.idPhoto = 'Please upload a photo of your University ID.';
    }

    setTouched(newTouched);
    setFieldErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(err => err !== undefined && err !== '');

    if (hasErrors) {
      const errorMessages = Object.values(newErrors).filter(err => err !== undefined && err !== '');
      const extra = errorMessages.length - 1;
      showSnackbar(
        'error',
        `${errorMessages[0]}${extra > 0 ? ` (and ${extra} more highlighted ${extra === 1 ? 'field' : 'fields'} above)` : ''}`
      );
      setIsSubmitFailed(true);
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = formData.email.trim();
      const validationResult = await validateEmailWithEasyEmail(cleanEmail);
      if (!validationResult.isDeliverable) {
        setFieldErrors(prev => ({ ...prev, email: validationResult.message }));
        showSnackbar('error', validationResult.message);
        setIsSubmitFailed(true);
        setLoading(false);
        return;
      }

      const isIdUsed = await authService.checkIdExists(formData.universityId);
      if (isIdUsed) {
        setFieldErrors(prev => ({ ...prev, universityId: 'This University ID is already registered.' }));
        showSnackbar('error', 'This University ID is already registered. If this is your account, try signing in instead.');
        setIsSubmitFailed(true);
        setLoading(false);
        return;
      }

      setIsScanning(true);

      const normalizeName = (name) => {
        if (!name) return '';
        return name.trim().replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      };

      const data = new FormData();
      data.append('firstName', normalizeName(formData.firstName));
      data.append('lastName', normalizeName(formData.lastName));
      data.append('email', cleanEmail);
      data.append('password', formData.password);
      data.append('universityId', formData.universityId);
      data.append('image', selectedFile);
      data.append('privacyAccepted', 'true');
      data.append('privacyPolicyVersion', PRIVACY_POLICY_VERSION);
      if (formData.middleName) data.append('middleName', normalizeName(formData.middleName));
      if (formData.suffix) data.append('suffix', formData.suffix);

      await authService.register(data);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsScanning(false);
      showSnackbar('success', 'Account created! Check your email and click the confirmation link before signing in.');
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      setIsScanning(false);
      const raw = err?.message || '';
      const isNetworkError = /failed to fetch|network|load failed|timeout|timed out/i.test(raw);
      showSnackbar(
        'error',
        isNetworkError
          ? "Couldn't reach the server. Check your internet connection and try again."
          : raw || 'Something went wrong while creating your account. Please try again.'
      );
      setIsSubmitFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const hasError = (field) => touched[field] && fieldErrors[field];

  return (
    <>
      {privacyOpen && <PrivacyPolicyModal
        reachedBottom={privacyReachedBottom}
        setReachedBottom={setPrivacyReachedBottom}
        onDone={() => {
          if (privacyReachedBottom) {
            setPrivacyReviewed(true);
            setPrivacyAccepted(true);
            setPrivacyOpen(false);
          }
        }}
        onClose={() => setPrivacyOpen(false)}
      />}
      {isScanning && <LoadingAnimation file={selectedFile} />}

      <style>{`
        html, body, #root {
          height: auto;
          min-height: 100vh;
          overflow-y: auto;
        }

        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes m-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpSnackbar { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        /* Inline form notice (under submit button) */
        .form-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: 12px;
          text-align: left;
          animation: m-fadeIn 0.25s ease both;
        }
        .form-notice.is-error { background: #FFF0F0; border: 1.5px solid #FFCCCC; }
        .form-notice.is-success { background: #EDFAF4; border: 1.5px solid #A7EED0; }
        .form-notice-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
          font-weight: 800;
          font-size: 13px;
        }
        .form-notice.is-error .form-notice-icon { background: #FF4444; }
        .form-notice.is-success .form-notice-icon { background: #22C77A; }
        .form-notice-msg { font-size: 13.5px; font-weight: 600; margin: 0; flex: 1; color: #1a2e2b; line-height: 1.4; }
        .form-notice-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #8AA09C; padding: 4px; border-radius: 8px; transition: background 0.2s; }
        .form-notice-close:hover { background: rgba(0,0,0,0.05); }

        .lf-spinner { display: inline-block; width: 15px; height: 15px; border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: lf-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }

        .lf-desktop-wrapper {
          display: block;
          padding-bottom: 60px;
        }
        .lf-mobile-wrapper { display: none; }
        @media (max-width: 640px) {
          .lf-desktop-wrapper { display: none !important; }
          .lf-mobile-wrapper { display: flex !important; flex-direction: column; }
        }

        .lf-req, .m-req { color: #dc2626; font-weight: 700; margin-left: 2px; }

        /* --- Desktop Specifics --- */
        .lf-desktop-wrapper .lf-field { text-align: left; margin-bottom: 14px; }
        .lf-desktop-label { display: block; font-size: 11px; font-weight: 700; color: #4a635d; margin-bottom: 6px; margin-left: 4px; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; }
        .lf-desktop-input { width: 100%; padding: 10px 14px; box-sizing: border-box; border: 1.5px solid #d1dbd8; border-radius: 10px; font-size: 13.5px; outline: none; color: #1a2e2b; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; background: #f9fbfa; }
        .lf-desktop-input:focus { border-color: #4a635d; background: #fff; box-shadow: 0 0 0 3px rgba(74,99,93,0.1); }
        .lf-desktop-input::placeholder { color: #aabdb8; }
        .lf-desktop-row { display: flex; gap: 10px; margin-bottom: 0; min-width: 0; }
        .lf-desktop-row .lf-field { flex: 1; margin-bottom: 14px; min-width: 0; }

        .lf-desktop-input.is-invalid { border-color: #ef4444; background: #fef2f2; }
        .lf-desktop-input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
        .lf-field-error { display: block; color: #ef4444; font-size: 11.5px; margin-top: 5px; margin-left: 4px; font-weight: 500; }

        .lf-input-wrap-desktop { position: relative; }
        .lf-input-wrap-desktop .lf-desktop-input { padding-right: 42px; }
        .lf-eye-btn-desktop { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 7px; display: flex; align-items: center; justify-content: center; color: #a0b8b4; transition: color 0.2s; -webkit-tap-highlight-color: transparent; }
        .lf-eye-btn-desktop:hover { color: #4a635d; }

        .lf-suffix-select { position: relative; width: 100%; }
        .lf-suffix-trigger { display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; gap: 8px; }
        .lf-suffix-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
        .lf-suffix-menu { position: absolute; top: calc(100% + 6px); left: 0; right: 0; min-width: 100px; background: #fff; border: 1.5px solid #d1dbd8; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.14); overflow: hidden; z-index: 50; max-height: 220px; overflow-y: auto; }
        .lf-suffix-option { display: block; width: 100%; text-align: left; padding: 9px 14px; font-size: 13.5px; font-weight: 500; border: none; cursor: pointer; background: transparent; color: #1a2e2b; }
        .lf-suffix-option:hover { background: #f6faf9; }
        .lf-suffix-option.active { background: #eef6f4; color: #3a524f; font-weight: 700; }

        .lf-password-requirements { margin-top: -7px; margin-bottom: 14px; padding: 10px 12px; background: #f6faf9; border: 1px solid #e2ecea; border-radius: 9px; }
        .lf-password-requirements-title { font-size: 10px; font-weight: 700; color: #718b85; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; }
        .lf-password-requirements-list { display: flex; flex-wrap: wrap; gap: 5px 14px; }
        .lf-password-requirement { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #8da39e; transition: color 0.2s; }
        .lf-password-requirement.satisfied { color: #32836f; }
        .lf-password-check { width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }

        .lf-desktop-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 22px; padding-bottom: 10px; }
        .lf-btn-primary-desktop { width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 700; background: #3a524f; color: white; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s; letter-spacing: 0.3px; }
        .lf-btn-primary-desktop:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(58,82,79,0.3); }
        .lf-btn-primary-desktop:disabled { opacity: 0.6; cursor: not-allowed; }
        .lf-desktop-link { text-align: center; font-size: 12.5px; color: #6b8577; margin-top: 2px; }
        .lf-desktop-link a { color: #3a524f; font-weight: 700; text-decoration: none; }
        .lf-desktop-link a:hover { text-decoration: underline; }

        .lf-desktop-dropzone { width: 100%; padding: 18px 15px; border: 1.5px dashed #c5d5d2; border-radius: 12px; text-align: center; cursor: pointer; background: #f6faf9; transition: all 0.2s; box-sizing: border-box; }
        .lf-desktop-dropzone:hover { border-color: #4a635d; background: #eef6f4; }
        .lf-desktop-dropzone.dragging { border-color: #4a635d; background: #eef6f4; transform: scale(1.01); }
        .lf-desktop-dropzone.is-invalid { border-color: #ef4444; background: #fef2f2; }
        .lf-desktop-dropzone span { font-size: 13px; font-weight: 500; color: #4a635d; }
        .lf-divider { display: flex; align-items: center; gap: 10px; margin: 4px 0 14px; color: #aabdb8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
        .lf-divider::before, .lf-divider::after { content: ''; flex: 1; height: 1px; background: #e2ecea; }

        /* --- Mobile Specifics --- */
        @media (max-width: 640px) {
          .lf-mobile-wrapper { width: 100%; min-height: 100dvh; display: flex; flex-direction: column; background: #F2F4F3; box-sizing: border-box; z-index: 10; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }

          .m-topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; flex-shrink: 0; animation: m-fadeIn 0.4s ease both; box-sizing: border-box; }
          .m-logo-wrap { display: flex; align-items: center; gap: 10px; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-step-badge { background: #E4EFED; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #3D7A6F; }

          .m-hero { padding: 24px 28px 16px; flex-shrink: 0; animation: m-fadeUp 0.5s ease 0.1s both; }
          .m-eyebrow { font-size: 12px; font-weight: 600; color: #4A8C82; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
          .m-title { font-size: 28px; font-weight: 800; color: #1A2E2B; line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 6px; }
          .m-subtitle { font-size: 13.5px; color: #6B8580; line-height: 1.4; }

          .m-card { background: #fff; border-radius: 28px 28px 0 0; padding: 28px 24px calc(40px + env(safe-area-inset-bottom)); box-shadow: 0 -2px 24px rgba(42,72,68,0.08); animation: m-fadeUp 0.5s ease 0.2s both; margin-top: 10px; flex: 1 0 auto; }
          .m-section-title { font-size: 11.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #A0B8B4; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #F0F4F3; }
          .m-section-title:not(:first-of-type) { margin-top: 24px; }

          .m-field { margin-bottom: 12px; }
          .m-field-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: #8AA09C; margin-bottom: 7px; display: block; }
          .m-field-error { display: block; color: #ef4444; font-size: 12px; margin-top: 6px; margin-left: 6px; font-weight: 500; }

          .m-input-pill { display: flex; align-items: center; background: #F4F7F6; border-radius: 14px; border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; overflow: hidden; min-width: 0; }
          .m-input-pill:focus-within { border-color: #3D7A6F; background: #fff; box-shadow: 0 0 0 4px rgba(61,122,111,0.1); }
          .m-input-pill.is-invalid { border-color: #ef4444; background: #fef2f2; }
          .m-input-pill.is-invalid:focus-within { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1); }
          .m-pill-input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 15px; font-family: inherit; color: #1A2E2B; padding: 13px 14px; }
          .m-pill-input::placeholder { color: #B5C8C5; }
          .m-pill-btn { background: none; border: none; cursor: pointer; padding: 0 14px; display: flex; align-items: center; color: #A0B8B4; transition: color 0.2s; flex-shrink: 0; }
          .m-pill-btn:hover { color: #3D7A6F; }

          .m-suffix-select { position: relative; width: 100%; }
          .m-suffix-trigger { width: 100%; border: none; background: transparent; padding: 0; cursor: pointer; text-align: left; }
          .m-suffix-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
          .m-suffix-value { display: flex; align-items: center; padding: 13px 0 13px 14px; color: #1A2E2B; font-size: 15px; }
          .m-suffix-menu { position: absolute; top: calc(100% + 6px); left: 0; min-width: 130px; background: #fff; border: 1.5px solid #E3ECEA; border-radius: 14px; box-shadow: 0 10px 28px rgba(42,72,68,0.14); overflow: hidden; z-index: 50; max-height: 220px; overflow-y: auto; }
          .m-suffix-option { display: block; width: 100%; text-align: left; padding: 11px 16px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; background: transparent; color: #1A2E2B; }
          .m-suffix-option:hover { background: #F4F8F7; }
          .m-suffix-option.active { background: #EAF5F1; color: #2D5C52; font-weight: 700; }

          .m-row { display: flex; gap: 10px; min-width: 0; }
          .m-row .m-field { flex: 1; min-width: 0; }

          .m-password-requirements { margin-top: -6px; margin-bottom: 14px; padding: 11px 13px; background: #F4F8F7; border: 1px solid #E3ECEA; border-radius: 12px; }
          .m-password-requirements-title { font-size: 10px; font-weight: 700; color: #829A95; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 7px; }
          .m-password-requirements-list { display: flex; flex-direction: column; gap: 5px; }
          .m-password-requirement { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #91A7A2; transition: color 0.2s; }
          .m-password-requirement.satisfied { color: #32836F; }
          .m-password-check { width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }

          .m-dropzone { background: #F4F7F6; border-radius: 16px; border: 1.5px dashed #C5D5D2; padding: 22px 16px; text-align: center; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
          .m-dropzone.dragging { border-color: #3D7A6F; background: #EAF5F1; transform: scale(1.01); }
          .m-dropzone.is-invalid { border-color: #ef4444; background: #fef2f2; }
          .m-dropzone-icon { color: #8AA09C; margin-bottom: 4px; }
          .m-dropzone-title { font-size: 14px; font-weight: 600; color: #2D5C52; }
          .m-dropzone-hint { font-size: 12px; color: #A0B8B4; }
          .m-file-preview { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #2D5C52; max-width: 100%; overflow: hidden; }
          .m-file-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          .m-btn-primary { width: 100%; padding: 16px; border-radius: 18px; border: none; background: #2D5C52; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: transform 0.15s, background 0.2s; margin-top: 8px; margin-bottom: 20px; -webkit-tap-highlight-color: transparent; }
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .m-btn-primary + .form-notice { margin-top: -8px; margin-bottom: 16px; }

          .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
          .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ═══════════════════ DESKTOP ═══════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout title="Create your account" widthClass="max-w-[720px]">
          <form onSubmit={handleSubmit} noValidate>

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

            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 2 }}>
                <label htmlFor="suffix" className="lf-desktop-label">Suffix <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span></label>
                <SuffixSelect value={formData.suffix} onChange={handleSuffixChange} disabled={loading} variant="desktop" />
              </div>
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="universityId" className="lf-desktop-label">University ID<span className="lf-req">*</span></label>
                <input id="universityId" type="text" disabled={loading} className={`lf-desktop-input ${hasError('universityId') ? 'is-invalid' : ''}`} placeholder="e.g. 00-00000 or 0000-0000" value={formData.universityId} onChange={handleChange} onBlur={() => handleBlur('universityId')} />
                {hasError('universityId') && <span className="lf-field-error">{fieldErrors.universityId}</span>}
              </div>
            </div>

            <div className="lf-field">
              <label htmlFor="email" className="lf-desktop-label">Email Address<span className="lf-req">*</span></label>
              <input id="email" type="email" disabled={loading} className={`lf-desktop-input ${hasError('email') ? 'is-invalid' : ''}`} placeholder="you@plsp.edu.ph" value={formData.email} onChange={handleChange} onBlur={() => handleBlur('email')} />
              {hasError('email') && <span className="lf-field-error">{fieldErrors.email}</span>}
            </div>

            <div className="lf-field">
              <label className="lf-desktop-label">University ID Photo<span className="lf-req">*</span></label>
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`lf-desktop-dropzone ${isDragging ? 'dragging' : ''} ${hasError('idPhoto') ? 'is-invalid' : ''}`}>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                {selectedFile ? <span>✓ {selectedFile.name}</span> : <span><span style={{ fontWeight: 700 }}>Click to upload</span> or drag & drop your ID photo</span>}
              </div>
              {hasError('idPhoto') && <span className="lf-field-error">{fieldErrors.idPhoto}</span>}
            </div>

            <div className="lf-divider">Password</div>

            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="password" className="lf-desktop-label">Password<span className="lf-req">*</span></label>
                <div className="lf-input-wrap-desktop">
                  <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" disabled={loading} className={`lf-desktop-input ${hasError('password') ? 'is-invalid' : ''}`} value={formData.password} onChange={handleChange} onBlur={() => handleBlur('password')} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                  <button type="button" className="lf-eye-btn-desktop" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {hasError('password') && <span className="lf-field-error">{fieldErrors.password}</span>}
              </div>
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="confirmPassword" className="lf-desktop-label">Confirm Password<span className="lf-req">*</span></label>
                <div className="lf-input-wrap-desktop">
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repeat password" disabled={loading} className={`lf-desktop-input ${hasError('confirmPassword') ? 'is-invalid' : ''}`} value={formData.confirmPassword} onChange={handleChange} onBlur={() => handleBlur('confirmPassword')} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                  <button type="button" className="lf-eye-btn-desktop" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {hasError('confirmPassword') && <span className="lf-field-error">{fieldErrors.confirmPassword}</span>}
              </div>
            </div>

            <PasswordRequirements password={formData.password} rules={passwordRules} loadFailed={rulesLoadFailed} />

            <PrivacyAcceptance opened={privacyWasOpened} reviewed={privacyReviewed} accepted={privacyAccepted} setAccepted={setPrivacyAccepted} openPolicy={openPrivacyPolicy} />
            <div className="lf-desktop-actions">
              <button type="submit" disabled={loading || !privacyReviewed || !privacyAccepted || isSubmitFailed} className="lf-btn-primary-desktop">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Processing…' : 'Create Account'}
              </button>
              <FormNotice show={snackbar.show} type={snackbar.type} message={snackbar.message} onClose={hideSnackbar} />
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
                  <input id="universityId" type="text" className="m-pill-input" placeholder="e.g. 00-00000" value={formData.universityId} onChange={handleChange} onBlur={() => handleBlur('universityId')} autoComplete="off" />
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
                <input id="password" type={showPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Create a password" value={formData.password} onChange={handleChange} onBlur={() => handleBlur('password')} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                <button type="button" className="m-pill-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
                </button>
              </div>
              {hasError('password') && <span className="m-field-error">{fieldErrors.password}</span>}
            </div>

            <PasswordRequirements password={formData.password} rules={passwordRules} loadFailed={rulesLoadFailed} mobile />

            <div className="m-field">
              <label className="m-field-label">Confirm password<span className="m-req">*</span></label>
              <div className={`m-input-pill ${hasError('confirmPassword') ? 'is-invalid' : ''}`}>
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleChange} onBlur={() => handleBlur('confirmPassword')} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                <button type="button" className="m-pill-btn" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
                </button>
              </div>
              {hasError('confirmPassword') && <span className="m-field-error">{fieldErrors.confirmPassword}</span>}
            </div>

            <p className="m-section-title">ID verification<span className="m-req">*</span></p>

            <div className="m-field">
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`m-dropzone ${isDragging ? 'dragging' : ''} ${hasError('idPhoto') ? 'is-invalid' : ''}`}>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
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

            <PrivacyAcceptance opened={privacyWasOpened} reviewed={privacyReviewed} accepted={privacyAccepted} setAccepted={setPrivacyAccepted} openPolicy={openPrivacyPolicy} mobile />

            <button type="submit" disabled={loading || !privacyReviewed || !privacyAccepted || isSubmitFailed} className="m-btn-primary">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Creating account…' : 'Sign up'}
            </button>

            <FormNotice show={snackbar.show} type={snackbar.type} message={snackbar.message} onClose={hideSnackbar} />

            <p className="m-footer">Already have an account? <Link to="/login">Sign in</Link></p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignupForm;