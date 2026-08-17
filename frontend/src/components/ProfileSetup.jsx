// frontend/src/components/ProfileSetup.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import DatePicker from './Datepicker';
import AddressModal from './AddressModal';

// ── Standard Constants (Kept hardcoded as they rarely change) ────────────────
const SUFFIXES            = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
const RELIGIONS           = ['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist', 'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'];
const NATIONALITIES       = ['Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian', 'British', 'Australian', 'Canadian', 'Other'];
const CIVIL_STATUSES      = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const EMERGENCY_RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent', 'Relative', 'Guardian', 'Friend', 'Other'];
const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];
const BLOOD_TYPES         = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const YEAR_LEVELS         = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEX_OPTIONS         = ['Male', 'Female'];

const VACCINE_DOSES = [
  { key: 'dose1',    label: 'Dose 1'    },
  { key: 'dose2',    label: 'Dose 2'    },
  { key: 'booster1', label: 'Booster 1' },
  { key: 'booster2', label: 'Booster 2' },
];

// ── Name Normalization ────────────────────────────────────────────────────────
const normalizeName = (name) => {
  if (!name) return '';
  let trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const API_URL     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOTAL_STEPS = 3;

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 11);
const validatePhone = (value) => {
  if (!value) return 'Phone number is required.';
  if (value.length !== 11) return 'Phone number must be exactly 11 digits.';
  if (!value.startsWith('09')) return 'Phone number must start with 09.';
  return '';
};
const isEmpty = (v) => !v || !String(v).trim();

function calcAge(isoDate) {
  if (!isoDate) return '';
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function isValidAge(age) {
  if (age === '' || age === null || age === undefined) return false;
  const numAge = Number(age);
  if (isNaN(numAge) || numAge < 1 || numAge > 120) return false;
  return true;
}

// Shared styling constants for the custom dropdown trigger (desktop/modal variant), mirrored
// from the plain <select> styling below so swapping components doesn't change how anything looks.
const CUSTOM_SELECT_TRIGGER_CLS = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] bg-white outline-none focus:border-[#4a635d] transition-colors flex items-center justify-between gap-2 text-left";

const ChevronIcon = ({ open, color = '#6b8577', size = 10 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3"
    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Custom Select (replaces native <select> so mobile doesn't fall back to the OS picker UI) ──
// `variant` selects between the desktop/modal trigger styling and the mobile pill styling
// (mirrors the SuffixSelect pattern used on the signup form).
const CustomSelect = ({ value, onChange, options, placeholder = 'Select', disabled = false, error = false, dropUp = false, variant = 'desktop' }) => {
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

  const normalized = options.map(opt =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: opt }
  );
  const current = normalized.find(o => o.value === value);

  if (variant === 'mobile') {
    return (
      <div ref={wrapRef} className="psm-select">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className={`psm-input-pill psm-select-trigger ${error ? 'is-invalid' : ''}`}
        >
          <span className={`psm-pill-input psm-select-value ${!current ? 'placeholder' : ''}`}>
            {current ? current.label : placeholder}
          </span>
          <span className="psm-pill-btn">
            <ChevronIcon open={open} color="#A0B8B4" size={11} />
          </span>
        </button>
        {open && (
          <div className="psm-select-menu" style={{ top: dropUp ? 'auto' : 'calc(100% + 6px)', bottom: dropUp ? 'calc(100% + 6px)' : 'auto' }}>
            {normalized.map(opt => (
              <button
                key={opt.value === '' ? '__empty' : opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`psm-select-option ${value === opt.value ? 'active' : ''}`}
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${CUSTOM_SELECT_TRIGGER_CLS} ${error ? 'border-red-400 focus:border-red-400 bg-red-50' : ''} ${disabled ? 'disabled:bg-slate-50 opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${current ? 'text-[#1a2e22]' : 'text-slate-400'}`}>
          {current ? current.label : placeholder}
        </span>
        <ChevronIcon open={open} color="#6b8577" size={10} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-50 bg-white border-[1.5px] border-[#cbd5d1] rounded-[13px] shadow-lg overflow-y-auto"
          style={{ maxHeight: 220, top: dropUp ? 'auto' : 'calc(100% + 6px)', bottom: dropUp ? 'calc(100% + 6px)' : 'auto' }}
        >
          {normalized.map(opt => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value === '' ? '__empty' : opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`block w-full text-left px-3.5 py-2.5 text-[13px] font-medium ${
                  isActive ? 'bg-[#e8f5ef] text-[#1a5c3a] font-semibold' : 'text-[#1a2e22] hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ProfileSetup = ({ user, onComplete }) => {
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const rawRole  = user?.role || 'student';
  const userRole = rawRole.toLowerCase();
  const isSysAdmin = userRole === 'sysadmin' || userRole === 'administrator' || userRole === 'admin';

  // ── Dynamic System Configuration States ──
  const [configData, setConfigData] = useState({
    departments: [],
    non_academic_offices: [],
    classifications: {},
    job_titles: {},
    sections: []
  });
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Initialize with props data first for immediate rendering
  const [formData, setFormData] = useState({
    firstName:     user?.firstName     || '',
    middleName:    user?.middleName    || '',
    lastName:      user?.lastName      || '',
    suffix:        user?.suffix        || '',
    birthday:      '',
    age:           '',
    sex:           '',
    bloodType:     '',
    homeAddress:   '',
    addressCountry:   'Philippines',
    addressRegion:    '',
    addressProvince:  '',
    addressCity:      '',
    addressBarangay:  '',
    addressStreet:    '',
    addressZipCode:   '',
    religion:      '',
    nationality:   'Filipino',
    nationalityOther: '',
    civilStatus:   'Single',
    universityId:           user?.universityId || '',
    departmentAbbr:         '',
    department:             '',
    program:                '',
    yearLevel:              '1st Year',
    section:                '',
    studentClassification:  'Regular',
    classification:         '',
    jobTitle:               '',
    email:       user?.email || '',
    phoneNumber: '',
    emergencyName:         '',
    emergencyRelationship: '',
    emergencyPhone:        '',
    emergencyAddress:      '',
    emergencyAddressCountry:   'Philippines',
    emergencyAddressRegion:    '',
    emergencyAddressProvince:  '',
    emergencyAddressCity:      '',
    emergencyAddressBarangay:  '',
    emergencyAddressStreet:    '',
    emergencyAddressZipCode:   '',
    vaccinations: {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  });

  const [errors, setErrors] = useState({});
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showEmergencyAddressModal, setShowEmergencyAddressModal] = useState(false);
  const hasAttemptedAdminSetup = useRef(false);

  // Auth Guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  // Fetch System Configurations on Mount
  useEffect(() => {
    const fetchSystemConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/system-config`);
        const result = await response.json();

        if (result.success) {
          setConfigData(result.data);

          // Pre-fill default classification and job title based on user role from DB data
          setFormData(prev => ({
            ...prev,
            classification: result.data.classifications[userRole] || '',
            jobTitle: result.data.job_titles[userRole] || ''
          }));
        }
      } catch (error) {
        console.error('Failed to fetch system configuration:', error);
      } finally {
        setIsConfigLoading(false);
      }
    };

    fetchSystemConfig();
  }, [userRole]);

  // Fetch latest profile from DB to merge with passed-down props
  useEffect(() => {
    const fetchLatestProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsProfileLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
          const dbUser = result.data;
          const dbBirthday = dbUser.birthday ?? dbUser.birthDate ?? dbUser.birth_date ?? null;

          setFormData(prev => ({
            ...prev,
            firstName:    dbUser.firstName ?? prev.firstName ?? '',
            middleName:   dbUser.middleName ?? prev.middleName ?? '',
            lastName:     dbUser.lastName ?? prev.lastName ?? '',
            suffix:       dbUser.suffix ?? prev.suffix ?? '',
            email:        dbUser.email ?? prev.email ?? '',
            universityId: dbUser.universityId ?? prev.universityId ?? '',
            // Previously dropped: without this, the DatePicker had nothing to
            // display even when the record already had a saved birthday.
            birthday:     dbBirthday ?? prev.birthday ?? '',
            age:          dbBirthday ? String(calcAge(dbBirthday)) : prev.age,
            sex:          dbUser.sex ?? prev.sex ?? '',
            bloodType:    dbUser.bloodType ?? prev.bloodType ?? '',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch latest profile:', error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchLatestProfile();
  }, []);

  // ── Derived Data Variables ──
  const deptAbbrToFull = Object.fromEntries(configData.departments.map(d => [d.abbr, d.full]));
  const programsByDeptAbbr = Object.fromEntries(configData.departments.map(d => [d.abbr, d.programs]));

  const PLSP_OFFICES_FOR_STAFF = [
    ...configData.departments.map(d => ({ label: d.abbr, value: d.full })),
    ...configData.non_academic_offices.map(o => ({ label: o, value: o })),
  ];

  // Extract unique classifications and job titles for dropdown options
  const uniqueClassifications = Array.from(new Set(Object.values(configData.classifications)));
  const uniqueJobTitles = Array.from(new Set(Object.values(configData.job_titles)));

  // Auto-complete profile setup for sysadmin
  useEffect(() => {
    if (isSysAdmin && !hasAttemptedAdminSetup.current && !isConfigLoading && !isProfileLoading) {
      hasAttemptedAdminSetup.current = true;

      const completeSysAdminProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        try {
          const payload = {
            firstName: user?.firstName || 'Admin',
            lastName: user?.lastName || 'Admin',
            sex: user?.sex || 'Male',
            birthday: user?.birthday || '1990-01-01',
            age: user?.age ? Number(user.age) : 36,
            role: userRole,
            classification: configData.classifications[userRole] || 'System Administrator',
            jobTitle: configData.job_titles[userRole] || 'System Administrator'
          };

          const response = await fetch(`${API_URL}/user/profile-setup`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, isProfileSetup: true, profileComplete: true }));

            if (onComplete) {
              onComplete();
            } else {
              navigate('/dashboard');
              window.location.reload();
            }
          } else {
            console.error("Auto-setup failed with status:", response.status);
            if (onComplete) onComplete();
          }
        } catch (err) {
          console.error('Error completing sysadmin profile:', err);
          if (onComplete) onComplete();
        }
      };

      completeSysAdminProfile();
    }
  }, [isSysAdmin, navigate, onComplete, userRole, user, isConfigLoading, isProfileLoading, configData]);


  // Show loading screen while fetching initial API configuration or routing sysadmin
  if (isSysAdmin || isConfigLoading || isProfileLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin"></span>
            <p className="text-white font-bold tracking-widest text-sm">
              {isSysAdmin ? 'ROUTING ADMIN...' : 'LOADING PROFILE...'}
            </p>
         </div>
      </div>
    );
  }

  // ── Field change handler (text inputs) ────────────────────────────────────
  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === 'phoneNumber' || id === 'emergencyPhone') {
      const clean = sanitizePhone(value);
      setFormData(prev => ({ ...prev, [id]: clean }));
      clearError(id);
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
    clearError(id);
  };

  // ── Field change handler (custom dropdowns) ────────────────────────────────
  // Mirrors handleChange's id-specific logic (department abbreviation → full name mapping),
  // but takes a plain value instead of a native <select> change event.
  const handleSelectChange = (id, value) => {
    if (id === 'departmentAbbr' && userRole === 'student') {
      const fullName = deptAbbrToFull[value] || value;
      setFormData(prev => ({
        ...prev,
        departmentAbbr: value,
        department: fullName,
        program: '',
      }));
      clearError('departmentAbbr');
      clearError('department');
      return;
    }

    if (id === 'department' && userRole !== 'student') {
      setFormData(prev => ({ ...prev, department: value }));
      clearError('department');
      return;
    }

    if (id === 'nationality') {
      setFormData(prev => ({
        ...prev,
        nationality: value,
        // Only relevant when "Other" is picked — clear any previously typed
        // value if the user switches back to a listed nationality.
        nationalityOther: value === 'Other' ? prev.nationalityOther : '',
      }));
      clearError('nationality');
      clearError('nationalityOther');
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
    clearError(id);
  };

  const handleBirthdayChange = (isoDate) => {
    const calculatedAge = calcAge(isoDate);

    if (isoDate && !isValidAge(calculatedAge)) {
      setError('birthday', calculatedAge < 1 ? 'Birthday cannot be in the future.' : 'Please enter a valid birthday.');
      return;
    }

    setFormData(prev => ({ ...prev, birthday: isoDate, age: String(calculatedAge) }));
    clearError('birthday');
  };

  const handlePhoneKeyDown = (e) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (e.ctrlKey || e.metaKey) return;
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handlePhonePaste = (e, field) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const clean  = sanitizePhone(pasted);
    setFormData(prev => ({ ...prev, [field]: clean }));
    clearError(field);
  };

  const setError   = (field, msg) => setErrors(prev => ({ ...prev, [field]: msg }));
  const clearError = (field)      => setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Desktop/modal phone field (unchanged styling)
  const phoneField = (id, label, value, required = true) => (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400 pointer-events-none select-none">
          PH
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder="09XXXXXXXXX"
          maxLength={11}
          value={value}
          onChange={handleChange}
          onKeyDown={handlePhoneKeyDown}
          onPaste={e => handlePhonePaste(e, id)}
          className={`${inputCls} pl-10 ${errors[id] ? 'border-red-400 focus:border-red-400 bg-red-50' : ''}`}
        />
        <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums ${
          value.length === 11 ? 'text-emerald-500' : 'text-slate-300'
        }`}>
          {value.length}/11
        </span>
      </div>
      {errors[id] && (
        <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors[id]}
        </p>
      )}
      {!errors[id] && value.length === 11 && (
        <p className="text-emerald-600 text-[11px] mt-1 ml-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-check text-[10px]"></i> Looks good!
        </p>
      )}
    </div>
  );

  // Mobile pill phone field (mirrors signup's m-input-pill styling)
  const phoneFieldMobile = (id, label, value, required = true) => (
    <div className="psm-field">
      <label className="psm-field-label">{label} {required && <span className="psm-req">*</span>}</label>
      <div className={`psm-input-pill ${errors[id] ? 'is-invalid' : ''}`}>
        <span className="psm-pill-prefix">PH</span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder="09XXXXXXXXX"
          maxLength={11}
          value={value}
          onChange={handleChange}
          onKeyDown={handlePhoneKeyDown}
          onPaste={e => handlePhonePaste(e, id)}
          className="psm-pill-input"
        />
        <span className={`psm-pill-counter ${value.length === 11 ? 'ok' : ''}`}>{value.length}/11</span>
      </div>
      {errors[id] && <span className="psm-field-error">{errors[id]}</span>}
      {!errors[id] && value.length === 11 && <span className="psm-field-ok">Looks good!</span>}
    </div>
  );

  const validateStep = (targetStep) => {
    const newErrors = {};

    if (targetStep > 1) {
      if (isEmpty(formData.firstName)) newErrors.firstName = 'First name is required.';
      if (isEmpty(formData.lastName))  newErrors.lastName  = 'Last name is required.';
      if (!formData.birthday)          newErrors.birthday  = 'Birthday is required.';
      const ageNum = Number(formData.age);
      if (!isValidAge(ageNum))         newErrors.birthday  = ageNum < 1 ? 'Birthday cannot be in the future.' : 'Please enter a valid birthday.';
      if (!formData.sex)               newErrors.sex       = 'Sex is required.';
      if (formData.nationality === 'Other' && isEmpty(formData.nationalityOther)) {
        newErrors.nationalityOther = 'Please specify your nationality.';
      }
    }

    if (targetStep > 2) {
      if (userRole === 'student') {
        if (isEmpty(formData.universityId))   newErrors.universityId   = 'Student number is required.';
        if (isEmpty(formData.departmentAbbr)) newErrors.departmentAbbr = 'Department is required.';
        if (isEmpty(formData.program))        newErrors.program        = 'Program is required.';
        if (isEmpty(formData.section))        newErrors.section        = 'Section is required.';
      } else {
        if (isEmpty(formData.classification)) newErrors.classification = 'Classification is required.';
        if (isEmpty(formData.department)) newErrors.department = 'Office / Department is required.';
        if (isEmpty(formData.jobTitle))   newErrors.jobTitle   = 'Job title is required.';
      }
    }

    if (targetStep > 3) {
      const phoneErr = validatePhone(formData.phoneNumber);
      if (phoneErr) newErrors.phoneNumber = phoneErr;
      if (isEmpty(formData.emergencyName))         newErrors.emergencyName         = 'Contact name is required.';
      if (isEmpty(formData.emergencyRelationship)) newErrors.emergencyRelationship = 'Relationship is required.';
      const ePhoneErr = validatePhone(formData.emergencyPhone);
      if (ePhoneErr) newErrors.emergencyPhone = ePhoneErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.birthday) {
        setError('birthday', 'Birthday is required.');
        return;
      }
      const ageNum = Number(formData.age);
      if (!isValidAge(ageNum)) {
        setError('birthday', ageNum < 1 ? 'Birthday cannot be in the future.' : 'Please enter a valid birthday.');
        return;
      }
    }
    if (!validateStep(step + 1)) return;
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allErrors = {};
    if (isEmpty(formData.firstName)) allErrors.firstName = 'First name is required.';
    if (isEmpty(formData.lastName))  allErrors.lastName  = 'Last name is required.';
    if (!formData.birthday)          allErrors.birthday  = 'Birthday is required.';
    const ageNum = Number(formData.age);
    if (!isValidAge(ageNum))   allErrors.birthday  = ageNum < 1 ? 'Birthday cannot be in the future.' : 'Please enter a valid birthday.';
    if (!formData.sex)               allErrors.sex       = 'Sex is required.';
    if (formData.nationality === 'Other' && isEmpty(formData.nationalityOther)) {
      allErrors.nationalityOther = 'Please specify your nationality.';
    }

    if (userRole === 'student') {
      if (isEmpty(formData.universityId))   allErrors.universityId   = 'Student number is required.';
      if (isEmpty(formData.departmentAbbr)) allErrors.departmentAbbr = 'Department is required.';
      if (isEmpty(formData.program))        allErrors.program        = 'Program is required.';
      if (isEmpty(formData.section))        allErrors.section        = 'Section is required.';
    } else {
      if (isEmpty(formData.classification)) allErrors.classification = 'Classification is required.';
      if (isEmpty(formData.department)) allErrors.department = 'Office / Department is required.';
      if (isEmpty(formData.jobTitle))   allErrors.jobTitle   = 'Job title is required.';
    }

    const phoneErr = validatePhone(formData.phoneNumber);
    if (phoneErr) allErrors.phoneNumber = phoneErr;
    if (isEmpty(formData.emergencyName))         allErrors.emergencyName         = 'Contact name is required.';
    if (isEmpty(formData.emergencyRelationship)) allErrors.emergencyRelationship = 'Relationship is required.';
    const ePhoneErr = validatePhone(formData.emergencyPhone);
    if (ePhoneErr) allErrors.emergencyPhone = ePhoneErr;

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (allErrors.firstName || allErrors.lastName || allErrors.birthday || allErrors.sex || allErrors.nationalityOther) { setStep(1); return; }
      if (allErrors.universityId || allErrors.departmentAbbr || allErrors.department || allErrors.program || allErrors.section || allErrors.jobTitle || allErrors.classification) { setStep(2); return; }
      if (allErrors.phoneNumber || allErrors.emergencyName || allErrors.emergencyRelationship || allErrors.emergencyPhone) { setStep(3); return; }
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      const payload = {
        firstName:     normalizeName(formData.firstName),
        middleName:    normalizeName(formData.middleName),
        lastName:      normalizeName(formData.lastName),
        suffix:        formData.suffix,
        birthday:      formData.birthday,
        age:           formData.age,
        sex:           formData.sex,
        bloodType:     formData.bloodType,
        homeAddress:   formData.homeAddress,
        religion:      formData.religion,
        nationality:   formData.nationality === 'Other' ? normalizeName(formData.nationalityOther) : formData.nationality,
        civilStatus:   formData.civilStatus,

        universityId:  formData.universityId,
        department:    formData.department,
        program:       formData.program,
        yearLevel:     formData.yearLevel,
        section:       formData.section,
        studentClassification: userRole === 'student' ? formData.studentClassification : '',
        classification: formData.classification,
        jobTitle:      formData.jobTitle,

        email:         formData.email,
        phoneNumber:   formData.phoneNumber,
        emergencyContact: {
          name:         formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone:        formData.emergencyPhone,
          address:      formData.emergencyAddress,
        },
        vaccinations:    formData.vaccinations,

        role:            userRole,
        is_profile_setup:  true,
        profile_complete: true,
      };

      console.log('[ProfileSetup] Submitting payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/user/profile-setup`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Invalid session. Please login again.');
        navigate('/login');
        return;
      }

      const result = await response.json();

      if (result.success) {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, isProfileSetup: true, profileComplete: true }));
        localStorage.setItem('name', `${formData.firstName} ${formData.lastName}`.trim());
        if (onComplete) {
          onComplete();
        } else {
          userRole === 'student' ? navigate('/student/meditrack') : navigate('/dashboard');
        }
      } else {
        alert(result.message || 'Failed to save profile.');
      }
    } catch (err) {
      console.error('Profile setup error:', err);
      alert('Connection error. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ['Personal', userRole === 'student' ? 'Academic' : 'Work', 'Contact & Emergency'];
  const STEP_EYEBROWS = ['Tell us about you', userRole === 'student' ? 'Your academic info' : 'Your work info', 'How to reach you'];
  const STEP_SUBTITLES = [
    'A few basic details to get your health record started.',
    userRole === 'student' ? "We'll match this to your enrollment records." : "We'll match this to your office records.",
    "In case of emergency, we'll know who to call.",
  ];

  const tabClass = (tabNum) =>
    `flex-1 text-center text-[10px] font-bold uppercase tracking-wider relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
      step === tabNum
        ? 'text-[#2d7a52] after:bg-[#2d7a52]'
        : step > tabNum
        ? 'text-[#2d7a52]/60 after:bg-[#2d7a52]/30'
        : 'text-[#9bb5a5] hover:text-[#6b8577] after:bg-[#e2f0ea]'
    }`;

  const inputCls  = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white transition-colors";
  const labelCls  = "block text-[11px] font-bold text-[#64748b] uppercase mb-[4px] ml-[2px]";

  const fieldError = (field) => errors[field] ? (
    <p className="text-red-500 text-[11px] mt-1 ml-1 flex items-center gap-1">
      <i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors[field]}
    </p>
  ) : null;

  const inputErrCls = (field) => errors[field] ? 'border-red-400 focus:border-red-400 bg-red-50' : '';

  const availablePrograms = formData.departmentAbbr
    ? (programsByDeptAbbr[formData.departmentAbbr] || [])
    : [];

  const classificationColors = {
    Regular:   { bg: '#e8f5ef', text: '#1a5c3a', dot: '#2d7a52' },
    Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' },
    Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
  };

  const tabClassMobile = (tabNum) =>
    `psm-tab ${step === tabNum ? 'active' : step > tabNum ? 'done' : ''}`;

  return (
    <>
      <style>{`
        /* Desktop/mobile visibility toggle — same pattern as SignupForm */
        .ps-desktop-wrapper { display: flex; }
        .ps-mobile-wrapper { display: none; }
        @media (max-width: 640px) {
          .ps-desktop-wrapper { display: none !important; }
          .ps-mobile-wrapper { display: flex !important; }
        }

        @keyframes psm-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes psm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes psm-spin { to { transform: rotate(360deg); } }

        .psm-spinner { display: inline-block; width: 15px; height: 15px; border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: psm-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }

        .ps-mobile-wrapper {
          position: fixed;
          inset: 0;
          z-index: 100;
          width: 100%;
          min-height: 100dvh;
          flex-direction: column;
          background: #F2F4F3;
          box-sizing: border-box;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          overflow-y: auto;
        }

        .psm-topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; flex-shrink: 0; animation: psm-fadeIn 0.4s ease both; box-sizing: border-box; }
        .psm-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
        .psm-step-badge { background: #E4EFED; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #3D7A6F; }

        .psm-hero { padding: 24px 28px 16px; flex-shrink: 0; animation: psm-fadeUp 0.5s ease 0.1s both; }
        .psm-eyebrow { font-size: 12px; font-weight: 600; color: #4A8C82; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
        .psm-title { font-size: 26px; font-weight: 800; color: #1A2E2B; line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 6px; }
        .psm-subtitle { font-size: 13.5px; color: #6B8580; line-height: 1.4; }

        .psm-progress-track { width: 100%; height: 5px; background: #E2ECEA; border-radius: 50px; overflow: hidden; margin-bottom: 14px; }
        .psm-progress-fill { height: 100%; background: #2D5C52; border-radius: 50px; transition: width 0.4s ease; }

        .psm-tabs { display: flex; gap: 4px; margin-bottom: 6px; }
        .psm-tab { flex: 1; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #A0B8B4; padding-bottom: 8px; position: relative; cursor: pointer; }
        .psm-tab::after { content: ''; display: block; height: 3px; margin-top: 5px; border-radius: 10px; background: #E2ECEA; }
        .psm-tab.active { color: #2D5C52; }
        .psm-tab.active::after { background: #2D5C52; }
        .psm-tab.done { color: rgba(45,92,82,0.6); }
        .psm-tab.done::after { background: rgba(45,92,82,0.3); }

        .psm-card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          padding: 28px 24px calc(40px + env(safe-area-inset-bottom));
          box-shadow: 0 -2px 24px rgba(42,72,68,0.08);
          animation: psm-fadeUp 0.5s ease 0.2s both;
          margin-top: 10px;
          flex: 1 0 auto;
        }

        .psm-section-title { font-size: 11.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #A0B8B4; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #F0F4F3; }
        .psm-section-title:not(:first-of-type) { margin-top: 24px; }

        .psm-row { display: flex; gap: 10px; min-width: 0; }
        .psm-row .psm-field { flex: 1; min-width: 0; }

        .psm-field { margin-bottom: 12px; }
        .psm-field-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: #8AA09C; margin-bottom: 7px; display: block; }
        .psm-field-error { display: block; color: #ef4444; font-size: 12px; margin-top: 6px; margin-left: 6px; font-weight: 500; }
        .psm-field-ok { display: block; color: #0A7850; font-size: 12px; margin-top: 6px; margin-left: 6px; font-weight: 500; }
        .psm-req { color: #dc2626; font-weight: 700; margin-left: 2px; }
        .psm-hint { font-size: 11px; color: #8AA09C; margin-top: 6px; margin-left: 6px; line-height: 1.3; }

        .psm-input-pill { display: flex; align-items: center; background: #F4F7F6; border-radius: 14px; border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; overflow: hidden; min-width: 0; }
        .psm-input-pill:focus-within { border-color: #3D7A6F; background: #fff; box-shadow: 0 0 0 4px rgba(61,122,111,0.1); }
        .psm-input-pill.is-invalid { border-color: #ef4444; background: #fef2f2; }
        .psm-input-pill.is-invalid:focus-within { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1); }
        .psm-pill-input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 15px; font-family: inherit; color: #1A2E2B; padding: 13px 14px; }
        .psm-pill-input::placeholder { color: #B5C8C5; }
        .psm-pill-input:read-only { cursor: pointer; }
        .psm-pill-input:disabled { color: #B5C8C5; }
        .psm-pill-prefix { font-size: 12px; font-weight: 700; color: #A0B8B4; padding-left: 14px; }
        .psm-pill-prefix + .psm-pill-input { padding-left: 8px; }
        .psm-pill-counter { font-size: 10px; font-weight: 700; color: #C3D3D0; padding-right: 14px; flex-shrink: 0; }
        .psm-pill-counter.ok { color: #22C77A; }
        .psm-pill-btn { background: none; border: none; cursor: pointer; padding: 0 14px; display: flex; align-items: center; color: #A0B8B4; transition: color 0.2s; flex-shrink: 0; }

        .psm-select { position: relative; width: 100%; }
        .psm-select-trigger { width: 100%; border: none; background: transparent; cursor: pointer; text-align: left; }
        .psm-select-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
        .psm-select-value { display: flex; align-items: center; padding: 13px 0 13px 14px; color: #1A2E2B; font-size: 15px; }
        .psm-select-value.placeholder { color: #B5C8C5; }
        .psm-select-menu { position: absolute; left: 0; right: 0; min-width: 130px; background: #fff; border: 1.5px solid #E3ECEA; border-radius: 14px; box-shadow: 0 10px 28px rgba(42,72,68,0.14); overflow: hidden; z-index: 50; max-height: 220px; overflow-y: auto; }
        .psm-select-option { display: block; width: 100%; text-align: left; padding: 11px 16px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; background: transparent; color: #1A2E2B; }
        .psm-select-option:hover { background: #F4F8F7; }
        .psm-select-option.active { background: #EAF5F1; color: #2D5C52; font-weight: 700; }

        .psm-classification-row { display: flex; gap: 8px; margin-top: 2px; }
        .psm-classification-chip { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 8px; border-radius: 12px; font-size: 12.5px; font-weight: 600; border: 1.5px solid #cbd5d1; background: #f8fafc; color: #94a3b8; }
        .psm-classification-chip .dot { width: 7px; height: 7px; border-radius: 50%; background: #cbd5d1; flex-shrink: 0; }

        .psm-emergency-box { background: #f4f7f5; padding: 16px; border-radius: 18px; border: 1px solid #e2f0ea; margin-top: 4px; }
        .psm-emergency-title { font-size: 11px; font-weight: 800; color: #1a5c3a; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }

        .psm-actions { display: flex; gap: 10px; margin-top: 22px; }
        .psm-btn-back { flex: 1; padding: 15px; border-radius: 18px; border: 1.5px solid #cbd5d1; background: #fff; color: #6b8577; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
        .psm-btn-primary { flex: 1; padding: 15px; border-radius: 18px; border: none; background: #2D5C52; color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: transform 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .psm-btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .psm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* ═══════════════════ DESKTOP / MODAL ═══════════════════ */}
      <div className="ps-desktop-wrapper fixed inset-0 z-[100] items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[520px] p-8 overflow-hidden">

          <div className="mb-5 text-center">
            <h1 className="text-2xl font-black text-[#1a2e22]">Complete Your Profile</h1>
            <p className="text-sm text-[#6b8577] mt-1">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>

          <div className="w-full h-1.5 bg-[#e2f0ea] rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-[#2d7a52] rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          <div className="flex justify-between mb-5 px-1 gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={tabClass(i + 1)} onClick={() => setStep(i + 1)}>{label}</div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="relative flex flex-col">

            {/* ─── STEP 1: PERSONAL ─── */}
            {step === 1 && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                    <input id="firstName" type="text" required className={`${inputCls} ${inputErrCls('firstName')}`} value={formData.firstName} onChange={handleChange} />
                    {fieldError('firstName')}
                  </div>
                  <div>
                    <label className={labelCls}>Middle Name</label>
                    <input id="middleName" type="text" className={`${inputCls}`} value={formData.middleName} onChange={handleChange} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
                    <input id="lastName" type="text" required className={`${inputCls} ${inputErrCls('lastName')}`} value={formData.lastName} onChange={handleChange} />
                    {fieldError('lastName')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Suffix</label>
                    <CustomSelect
                      value={formData.suffix}
                      onChange={val => handleSelectChange('suffix', val)}
                      options={[{ value: '', label: 'None' }, ...SUFFIXES.map(s => ({ value: s, label: s }))]}
                      dropUp={true}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Civil Status</label>
                    <CustomSelect
                      value={formData.civilStatus}
                      onChange={val => handleSelectChange('civilStatus', val)}
                      options={CIVIL_STATUSES}
                      dropUp={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Birthday <span className="text-red-400">*</span></label>
                    <DatePicker
                      value={formData.birthday}
                      onChange={(date) => handleBirthdayChange(date)}
                      error={errors.birthday}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Age</label>
                    <input
                      id="age"
                      type="number"
                      readOnly
                      className={`${inputCls} bg-slate-50 cursor-default select-none`}
                      value={formData.age}
                      onFocus={(e) => e.target.blur()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Sex <span className="text-red-400">*</span></label>
                    <CustomSelect
                      value={formData.sex}
                      onChange={val => handleSelectChange('sex', val)}
                      options={SEX_OPTIONS}
                      placeholder="Select"
                      error={!!errors.sex}
                      dropUp={true}
                    />
                    {fieldError('sex')}
                  </div>
                  <div>
                    <label className={labelCls}>Blood Type</label>
                    <CustomSelect
                      value={formData.bloodType}
                      onChange={val => handleSelectChange('bloodType', val)}
                      options={[{ value: '', label: 'Unknown' }, ...BLOOD_TYPES.map(t => ({ value: t, label: t }))]}
                      dropUp={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Religion</label>
                    <CustomSelect
                      value={formData.religion}
                      onChange={val => handleSelectChange('religion', val)}
                      options={RELIGIONS}
                      placeholder="Select"
                      dropUp={true}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <CustomSelect
                      value={formData.nationality}
                      onChange={val => handleSelectChange('nationality', val)}
                      options={NATIONALITIES}
                      dropUp={true}
                    />
                  </div>
                </div>

                {formData.nationality === 'Other' && (
                  <div>
                    <label className={labelCls}>Specify Nationality <span className="text-red-400">*</span></label>
                    <input
                      id="nationalityOther"
                      type="text"
                      placeholder="Enter your nationality"
                      className={`${inputCls} ${inputErrCls('nationalityOther')}`}
                      value={formData.nationalityOther}
                      onChange={handleChange}
                    />
                    {fieldError('nationalityOther')}
                  </div>
                )}

                <div>
                  <label className={labelCls}>Home Address</label>
                  <div className="relative">
                    <input
                      id="homeAddress"
                      type="text"
                      placeholder="Click to enter address"
                      className={`${inputCls} cursor-pointer`}
                      value={formData.homeAddress}
                      readOnly
                      onClick={() => setShowAddressModal(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460]"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a3.5 3.5 0 114.95 4.95L3.464 16.536" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button type="button" onClick={nextStep}
                    className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a] transition-all">
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: ACADEMIC / WORK ─── */}
            {step === 2 && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                {userRole === 'student' ? (
                  <>
                    <div>
                      <label className={labelCls}>Student No. <span className="text-red-400">*</span></label>
                      <input id="universityId" type="text" placeholder="e.g. 23-11067" required
                        className={`${inputCls} ${inputErrCls('universityId')}`}
                        value={formData.universityId} onChange={handleChange} />
                      {fieldError('universityId')}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Department <span className="text-red-400">*</span></label>
                        <CustomSelect
                          value={formData.departmentAbbr}
                          onChange={val => handleSelectChange('departmentAbbr', val)}
                          options={configData.departments.map(d => ({ value: d.abbr, label: d.abbr }))}
                          placeholder="Select Dept"
                          error={!!errors.departmentAbbr}
                          dropUp={true}
                        />
                        {formData.departmentAbbr && (
                          <p className="text-[10px] text-[#6b8577] mt-1 ml-1 leading-tight">
                            {deptAbbrToFull[formData.departmentAbbr]}
                          </p>
                        )}
                        {fieldError('departmentAbbr')}
                      </div>

                      <div>
                        <label className={labelCls}>Program <span className="text-red-400">*</span></label>
                        <CustomSelect
                          value={formData.program}
                          onChange={val => handleSelectChange('program', val)}
                          options={availablePrograms}
                          placeholder="Select Program"
                          disabled={!formData.departmentAbbr}
                          error={!!errors.program}
                          dropUp={true}
                        />
                        {fieldError('program')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Year Level</label>
                        <CustomSelect
                          value={formData.yearLevel}
                          onChange={val => handleSelectChange('yearLevel', val)}
                          options={YEAR_LEVELS}
                          dropUp={true}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Section <span className="text-red-400">*</span></label>
                        <CustomSelect
                          value={formData.section}
                          onChange={val => handleSelectChange('section', val)}
                          options={configData.sections || []}
                          placeholder="Select"
                          error={!!errors.section}
                          dropUp={true}
                        />
                        {fieldError('section')}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Student Classification</label>
                      <div className="flex gap-2 mt-1">
                        {STUDENT_CLASSIFICATIONS.map(cls => {
                          const isActive = formData.studentClassification === cls;
                          const colors   = classificationColors[cls];
                          return (
                            <button key={cls} type="button"
                              onClick={() => setFormData(prev => ({ ...prev, studentClassification: cls }))}
                              className="flex-1 flex items-center justify-center gap-[6px] py-[9px] px-2 rounded-[11px] text-[12px] font-semibold border-[1.5px] transition-all duration-150"
                              style={isActive ? { background: colors.bg, borderColor: colors.dot, color: colors.text } : { background: '#f8fafc', borderColor: '#cbd5d1', color: '#94a3b8' }}
                            >
                              <span className="w-[7px] h-[7px] rounded-full shrink-0 transition-colors" style={{ background: isActive ? colors.dot : '#cbd5d1' }} />
                              {cls}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-[#6b8577] mt-[5px] ml-[2px] leading-tight">
                        {formData.studentClassification === 'Regular'
                          ? 'Following the standard curriculum sequence.'
                          : formData.studentClassification === 'Irregular'
                          ? 'Taking subjects outside the standard curriculum order.'
                          : 'Re-enrolled after a leave of absence or stopout.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelCls}>Classification <span className="text-red-400">*</span></label>
                      <CustomSelect
                        value={formData.classification}
                        onChange={val => handleSelectChange('classification', val)}
                        options={uniqueClassifications}
                        placeholder="Select Classification"
                        error={!!errors.classification}
                        dropUp={true}
                      />
                      {fieldError('classification')}
                    </div>

                    <div>
                      <label className={labelCls}>Office / Department <span className="text-red-400">*</span></label>
                      <CustomSelect
                        value={formData.department}
                        onChange={val => handleSelectChange('department', val)}
                        options={PLSP_OFFICES_FOR_STAFF}
                        placeholder="Select Office"
                        error={!!errors.department}
                        dropUp={true}
                      />
                      {formData.department && configData.departments.find(d => d.full === formData.department) && (
                        <p className="text-[10px] text-[#6b8577] mt-1 ml-1 leading-tight">{formData.department}</p>
                      )}
                      {fieldError('department')}
                    </div>

                    <div>
                      <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
                      <CustomSelect
                        value={formData.jobTitle}
                        onChange={val => handleSelectChange('jobTitle', val)}
                        options={uniqueJobTitles}
                        placeholder="Select Job Title"
                        error={!!errors.jobTitle}
                        dropUp={true}
                      />
                      {fieldError('jobTitle')}
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button type="button" onClick={prevStep}
                    className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">
                    ← Back
                  </button>
                  <button type="button" onClick={nextStep}
                    className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a]">
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: CONTACT & EMERGENCY ─── */}
            {step === 3 && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">

                <div>
                  <label className={labelCls}>Email Address</label>
                  <input id="email" type="email" readOnly className={`${inputCls} bg-slate-50 text-slate-500`} value={formData.email} />
                </div>

                {phoneField('phoneNumber', 'Phone Number', formData.phoneNumber, true)}

                <div className="bg-[#f4f7f5] p-4 rounded-2xl border border-[#e2f0ea] mt-1">
                  <h3 className="text-[11px] font-black text-[#1a5c3a] uppercase mb-3 tracking-widest">
                    Emergency Contact Information
                  </h3>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                      <input id="emergencyName" type="text" placeholder="Contact person's full name" required
                        className={`${inputCls} ${inputErrCls('emergencyName')}`}
                        value={formData.emergencyName} onChange={handleChange} />
                      {fieldError('emergencyName')}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Relationship <span className="text-red-400">*</span></label>
                        <CustomSelect
                          value={formData.emergencyRelationship}
                          onChange={val => handleSelectChange('emergencyRelationship', val)}
                          options={EMERGENCY_RELATIONSHIPS}
                          placeholder="Select"
                          error={!!errors.emergencyRelationship}
                          dropUp={true}
                        />
                        {fieldError('emergencyRelationship')}
                      </div>
                      <div>
                        {phoneField('emergencyPhone', 'Phone Number', formData.emergencyPhone, true)}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Address</label>
                      <div className="relative">
                        <input
                          id="emergencyAddress"
                          type="text"
                          placeholder="Click to enter address"
                          className={`${inputCls} cursor-pointer`}
                          value={formData.emergencyAddress}
                          readOnly
                          onClick={() => setShowEmergencyAddressModal(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmergencyAddressModal(true)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460]"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a3.5 3.5 0 114.95 4.95L3.464 16.536" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button type="button" onClick={prevStep}
                    className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#1a2e22] text-white hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      : '✓ Complete Setup'}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>

      {/* ═══════════════════ MOBILE ═══════════════════ */}
      <div className="ps-mobile-wrapper">
        <div className="psm-topbar">
          <span className="psm-logo-name">MediTrack</span>
          <span className="psm-step-badge">Step {step} of {TOTAL_STEPS}</span>
        </div>

        <div className="psm-hero">
          <p className="psm-eyebrow">{STEP_EYEBROWS[step - 1]}</p>
          <h1 className="psm-title">Complete your<br />profile.</h1>
          <p className="psm-subtitle">{STEP_SUBTITLES[step - 1]}</p>
        </div>

        <div className="psm-card">
          <div className="psm-progress-track">
            <div className="psm-progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <div className="psm-tabs">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={tabClassMobile(i + 1)} onClick={() => setStep(i + 1)}>{label}</div>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ─── STEP 1: PERSONAL ─── */}
            {step === 1 && (
              <>
                <p className="psm-section-title">Basic info</p>

                <div className="psm-row">
                  <div className="psm-field" style={{ flex: 3 }}>
                    <label className="psm-field-label">First name<span className="psm-req">*</span></label>
                    <div className={`psm-input-pill ${errors.firstName ? 'is-invalid' : ''}`}>
                      <input id="firstName" type="text" className="psm-pill-input" placeholder="First name" value={formData.firstName} onChange={handleChange} />
                    </div>
                    {errors.firstName && <span className="psm-field-error">{errors.firstName}</span>}
                  </div>
                  <div className="psm-field" style={{ flex: 2 }}>
                    <label className="psm-field-label">Middle</label>
                    <div className="psm-input-pill">
                      <input id="middleName" type="text" className="psm-pill-input" placeholder="Middle" value={formData.middleName} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="psm-field">
                  <label className="psm-field-label">Last name<span className="psm-req">*</span></label>
                  <div className={`psm-input-pill ${errors.lastName ? 'is-invalid' : ''}`}>
                    <input id="lastName" type="text" className="psm-pill-input" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
                  </div>
                  {errors.lastName && <span className="psm-field-error">{errors.lastName}</span>}
                </div>

                <div className="psm-row">
                  <div className="psm-field" style={{ flex: 1 }}>
                    <label className="psm-field-label">Suffix</label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.suffix}
                      onChange={val => handleSelectChange('suffix', val)}
                      options={[{ value: '', label: 'None' }, ...SUFFIXES.map(s => ({ value: s, label: s }))]}
                    />
                  </div>
                  <div className="psm-field" style={{ flex: 2 }}>
                    <label className="psm-field-label">Civil status</label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.civilStatus}
                      onChange={val => handleSelectChange('civilStatus', val)}
                      options={CIVIL_STATUSES}
                    />
                  </div>
                </div>

                <div className="psm-row">
                  <div className="psm-field" style={{ flex: 3 }}>
                    <label className="psm-field-label">Birthday<span className="psm-req">*</span></label>
                    <DatePicker
                      value={formData.birthday}
                      onChange={(date) => handleBirthdayChange(date)}
                      error={errors.birthday}
                    />
                    {errors.birthday && <span className="psm-field-error">{errors.birthday}</span>}
                  </div>
                  <div className="psm-field" style={{ flex: 2 }}>
                    <label className="psm-field-label">Age</label>
                    <div className="psm-input-pill">
                      <input id="age" type="text" readOnly className="psm-pill-input" value={formData.age} onFocus={(e) => e.target.blur()} />
                    </div>
                  </div>
                </div>

                <div className="psm-row">
                  <div className="psm-field">
                    <label className="psm-field-label">Sex<span className="psm-req">*</span></label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.sex}
                      onChange={val => handleSelectChange('sex', val)}
                      options={SEX_OPTIONS}
                      placeholder="Select"
                      error={!!errors.sex}
                    />
                    {errors.sex && <span className="psm-field-error">{errors.sex}</span>}
                  </div>
                  <div className="psm-field">
                    <label className="psm-field-label">Blood type</label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.bloodType}
                      onChange={val => handleSelectChange('bloodType', val)}
                      options={[{ value: '', label: 'Unknown' }, ...BLOOD_TYPES.map(t => ({ value: t, label: t }))]}
                    />
                  </div>
                </div>

                <p className="psm-section-title">Background</p>

                <div className="psm-row">
                  <div className="psm-field">
                    <label className="psm-field-label">Religion</label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.religion}
                      onChange={val => handleSelectChange('religion', val)}
                      options={RELIGIONS}
                      placeholder="Select"
                      dropUp={true}
                    />
                  </div>
                  <div className="psm-field">
                    <label className="psm-field-label">Nationality</label>
                    <CustomSelect
                      variant="mobile"
                      value={formData.nationality}
                      onChange={val => handleSelectChange('nationality', val)}
                      options={NATIONALITIES}
                      dropUp={true}
                    />
                  </div>
                </div>

                {formData.nationality === 'Other' && (
                  <div className="psm-field">
                    <label className="psm-field-label">Specify nationality<span className="psm-req">*</span></label>
                    <div className={`psm-input-pill ${errors.nationalityOther ? 'is-invalid' : ''}`}>
                      <input
                        id="nationalityOther"
                        type="text"
                        placeholder="Enter your nationality"
                        className="psm-pill-input"
                        value={formData.nationalityOther}
                        onChange={handleChange}
                      />
                    </div>
                    {errors.nationalityOther && <span className="psm-field-error">{errors.nationalityOther}</span>}
                  </div>
                )}

                <div className="psm-field">
                  <label className="psm-field-label">Home address</label>
                  <div className="psm-input-pill" onClick={() => setShowAddressModal(true)}>
                    <input
                      id="homeAddress"
                      type="text"
                      placeholder="Tap to enter address"
                      className="psm-pill-input"
                      value={formData.homeAddress}
                      readOnly
                    />
                    <span className="psm-pill-btn">
                      <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a3.5 3.5 0 114.95 4.95L3.464 16.536" />
                      </svg>
                    </span>
                  </div>
                </div>

                <button type="button" onClick={nextStep} className="psm-btn-primary" style={{ width: '100%', marginTop: 8 }}>
                  Next step →
                </button>
              </>
            )}

            {/* ─── STEP 2: ACADEMIC / WORK ─── */}
            {step === 2 && (
              <>
                {userRole === 'student' ? (
                  <>
                    <p className="psm-section-title">Enrollment</p>

                    <div className="psm-field">
                      <label className="psm-field-label">Student no.<span className="psm-req">*</span></label>
                      <div className={`psm-input-pill ${errors.universityId ? 'is-invalid' : ''}`}>
                        <input id="universityId" type="text" placeholder="e.g. 23-11067" className="psm-pill-input" value={formData.universityId} onChange={handleChange} />
                      </div>
                      {errors.universityId && <span className="psm-field-error">{errors.universityId}</span>}
                    </div>

                    <div className="psm-row">
                      <div className="psm-field">
                        <label className="psm-field-label">Department<span className="psm-req">*</span></label>
                        <CustomSelect
                          variant="mobile"
                          value={formData.departmentAbbr}
                          onChange={val => handleSelectChange('departmentAbbr', val)}
                          options={configData.departments.map(d => ({ value: d.abbr, label: d.abbr }))}
                          placeholder="Select"
                          error={!!errors.departmentAbbr}
                        />
                        {formData.departmentAbbr && (
                          <p className="psm-hint">{deptAbbrToFull[formData.departmentAbbr]}</p>
                        )}
                        {errors.departmentAbbr && <span className="psm-field-error">{errors.departmentAbbr}</span>}
                      </div>
                      <div className="psm-field">
                        <label className="psm-field-label">Program<span className="psm-req">*</span></label>
                        <CustomSelect
                          variant="mobile"
                          value={formData.program}
                          onChange={val => handleSelectChange('program', val)}
                          options={availablePrograms}
                          placeholder="Select"
                          disabled={!formData.departmentAbbr}
                          error={!!errors.program}
                        />
                        {errors.program && <span className="psm-field-error">{errors.program}</span>}
                      </div>
                    </div>

                    <div className="psm-row">
                      <div className="psm-field">
                        <label className="psm-field-label">Year level</label>
                        <CustomSelect
                          variant="mobile"
                          value={formData.yearLevel}
                          onChange={val => handleSelectChange('yearLevel', val)}
                          options={YEAR_LEVELS}
                        />
                      </div>
                      <div className="psm-field">
                        <label className="psm-field-label">Section<span className="psm-req">*</span></label>
                        <CustomSelect
                          variant="mobile"
                          value={formData.section}
                          onChange={val => handleSelectChange('section', val)}
                          options={configData.sections || []}
                          placeholder="Select"
                          error={!!errors.section}
                        />
                        {errors.section && <span className="psm-field-error">{errors.section}</span>}
                      </div>
                    </div>

                    <div className="psm-field">
                      <label className="psm-field-label">Classification</label>
                      <div className="psm-classification-row">
                        {STUDENT_CLASSIFICATIONS.map(cls => {
                          const isActive = formData.studentClassification === cls;
                          const colors   = classificationColors[cls];
                          return (
                            <button key={cls} type="button"
                              onClick={() => setFormData(prev => ({ ...prev, studentClassification: cls }))}
                              className="psm-classification-chip"
                              style={isActive ? { background: colors.bg, borderColor: colors.dot, color: colors.text } : {}}
                            >
                              <span className="dot" style={{ background: isActive ? colors.dot : '#cbd5d1' }} />
                              {cls}
                            </button>
                          );
                        })}
                      </div>
                      <p className="psm-hint">
                        {formData.studentClassification === 'Regular'
                          ? 'Following the standard curriculum sequence.'
                          : formData.studentClassification === 'Irregular'
                          ? 'Taking subjects outside the standard curriculum order.'
                          : 'Re-enrolled after a leave of absence or stopout.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="psm-section-title">Work info</p>

                    <div className="psm-field">
                      <label className="psm-field-label">Classification<span className="psm-req">*</span></label>
                      <CustomSelect
                        variant="mobile"
                        value={formData.classification}
                        onChange={val => handleSelectChange('classification', val)}
                        options={uniqueClassifications}
                        placeholder="Select"
                        error={!!errors.classification}
                      />
                      {errors.classification && <span className="psm-field-error">{errors.classification}</span>}
                    </div>

                    <div className="psm-field">
                      <label className="psm-field-label">Office / Department<span className="psm-req">*</span></label>
                      <CustomSelect
                        variant="mobile"
                        value={formData.department}
                        onChange={val => handleSelectChange('department', val)}
                        options={PLSP_OFFICES_FOR_STAFF}
                        placeholder="Select office"
                        error={!!errors.department}
                      />
                      {errors.department && <span className="psm-field-error">{errors.department}</span>}
                    </div>

                    <div className="psm-field">
                      <label className="psm-field-label">Job title<span className="psm-req">*</span></label>
                      <CustomSelect
                        variant="mobile"
                        value={formData.jobTitle}
                        onChange={val => handleSelectChange('jobTitle', val)}
                        options={uniqueJobTitles}
                        placeholder="Select"
                        error={!!errors.jobTitle}
                      />
                      {errors.jobTitle && <span className="psm-field-error">{errors.jobTitle}</span>}
                    </div>
                  </>
                )}

                <div className="psm-actions">
                  <button type="button" onClick={prevStep} className="psm-btn-back">← Back</button>
                  <button type="button" onClick={nextStep} className="psm-btn-primary">Next step →</button>
                </div>
              </>
            )}

            {/* ─── STEP 3: CONTACT & EMERGENCY ─── */}
            {step === 3 && (
              <>
                <p className="psm-section-title">Contact</p>

                <div className="psm-field">
                  <label className="psm-field-label">Email address</label>
                  <div className="psm-input-pill">
                    <input id="email" type="email" readOnly className="psm-pill-input" value={formData.email} style={{ color: '#94a3b8' }} />
                  </div>
                </div>

                {phoneFieldMobile('phoneNumber', 'Phone number', formData.phoneNumber, true)}

                <div className="psm-emergency-box">
                  <p className="psm-emergency-title">Emergency contact</p>

                  <div className="psm-field">
                    <label className="psm-field-label">Full name<span className="psm-req">*</span></label>
                    <div className={`psm-input-pill ${errors.emergencyName ? 'is-invalid' : ''}`}>
                      <input id="emergencyName" type="text" placeholder="Contact's full name" className="psm-pill-input" value={formData.emergencyName} onChange={handleChange} />
                    </div>
                    {errors.emergencyName && <span className="psm-field-error">{errors.emergencyName}</span>}
                  </div>

                  <div className="psm-row">
                    <div className="psm-field">
                      <label className="psm-field-label">Relationship<span className="psm-req">*</span></label>
                      <CustomSelect
                        variant="mobile"
                        value={formData.emergencyRelationship}
                        onChange={val => handleSelectChange('emergencyRelationship', val)}
                        options={EMERGENCY_RELATIONSHIPS}
                        placeholder="Select"
                        error={!!errors.emergencyRelationship}
                      />
                      {errors.emergencyRelationship && <span className="psm-field-error">{errors.emergencyRelationship}</span>}
                    </div>
                    <div className="psm-field">
                      {phoneFieldMobile('emergencyPhone', 'Phone number', formData.emergencyPhone, true)}
                    </div>
                  </div>

                  <div className="psm-field" style={{ marginBottom: 0 }}>
                    <label className="psm-field-label">Address</label>
                    <div className="psm-input-pill" onClick={() => setShowEmergencyAddressModal(true)}>
                      <input
                        id="emergencyAddress"
                        type="text"
                        placeholder="Tap to enter address"
                        className="psm-pill-input"
                        value={formData.emergencyAddress}
                        readOnly
                      />
                      <span className="psm-pill-btn">
                        <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a3.5 3.5 0 114.95 4.95L3.464 16.536" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="psm-actions">
                  <button type="button" onClick={prevStep} className="psm-btn-back">← Back</button>
                  <button type="submit" disabled={loading} className="psm-btn-primary">
                    {loading && <span className="psm-spinner" />}
                    {loading ? 'Saving…' : '✓ Complete setup'}
                  </button>
                </div>
              </>
            )}

          </form>
        </div>
      </div>

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onConfirm={(addressData) => {
          setFormData(prev => ({ ...prev, ...addressData }));
        }}
        initialData={formData}
      />

      <AddressModal
        isOpen={showEmergencyAddressModal}
        onClose={() => setShowEmergencyAddressModal(false)}
        onConfirm={(addressData) => {
          setFormData(prev => ({
            ...prev,
            emergencyAddress: addressData.homeAddress,
            emergencyAddressCountry: addressData.addressCountry,
            emergencyAddressRegion: addressData.addressRegion,
            emergencyAddressProvince: addressData.addressProvince,
            emergencyAddressCity: addressData.addressCity,
            emergencyAddressBarangay: addressData.addressBarangay,
            emergencyAddressStreet: addressData.addressStreet,
            emergencyAddressZipCode: addressData.addressZipCode,
          }));
        }}
        initialData={{
          addressCountry: formData.emergencyAddressCountry,
          addressRegion: formData.emergencyAddressRegion,
          addressProvince: formData.emergencyAddressProvince,
          addressCity: formData.emergencyAddressCity,
          addressBarangay: formData.emergencyAddressBarangay,
          addressStreet: formData.emergencyAddressStreet,
          addressZipCode: formData.emergencyAddressZipCode,
        }}
      />
    </>
  );
};

export default ProfileSetup;