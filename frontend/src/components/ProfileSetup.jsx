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
const SECTIONS            = ['A', 'B', 'C', 'D', 'E', 'F'];
const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];

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
    job_titles: {}
  });
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName:     user?.firstName    || '',
    middleName:    user?.middleName   || '',
    lastName:      user?.lastName     || '',
    suffix:        user?.suffix       || '',
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
    if (isSysAdmin && !hasAttemptedAdminSetup.current && !isConfigLoading) {
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
  }, [isSysAdmin, navigate, onComplete, userRole, user, isConfigLoading, configData]);


  // Show loading screen while fetching initial API configuration or routing sysadmin
  if (isSysAdmin || isConfigLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin"></span>
            <p className="text-white font-bold tracking-widest text-sm">
              {isSysAdmin ? 'ROUTING ADMIN...' : 'LOADING CONFIGURATION...'}
            </p>
         </div>
      </div>
    );
  }

  // ── Field change handler ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === 'phoneNumber' || id === 'emergencyPhone') {
      const clean = sanitizePhone(value);
      setFormData(prev => ({ ...prev, [id]: clean }));
      clearError(id);
      return;
    }

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

  const validateStep = (targetStep) => {
    const newErrors = {};

    if (targetStep > 1) {
      if (isEmpty(formData.firstName)) newErrors.firstName = 'First name is required.';
      if (isEmpty(formData.lastName))  newErrors.lastName  = 'Last name is required.';
      if (!formData.birthday)          newErrors.birthday  = 'Birthday is required.';
      const ageNum = Number(formData.age);
      if (!isValidAge(ageNum))         newErrors.birthday  = ageNum < 1 ? 'Birthday cannot be in the future.' : 'Please enter a valid birthday.';
      if (!formData.sex)               newErrors.sex       = 'Sex is required.';
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
      if (allErrors.firstName || allErrors.lastName || allErrors.birthday || allErrors.sex) { setStep(1); return; }
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
        nationality:   formData.nationality,
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

  const tabClass = (tabNum) =>
    `flex-1 text-center text-[10px] font-bold uppercase tracking-wider relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
      step === tabNum
        ? 'text-[#2d7a52] after:bg-[#2d7a52]'
        : step > tabNum
        ? 'text-[#2d7a52]/60 after:bg-[#2d7a52]/30'
        : 'text-[#9bb5a5] hover:text-[#6b8577] after:bg-[#e2f0ea]'
    }`;

  const inputCls  = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white transition-colors";
  const selectCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] bg-white outline-none focus:border-[#4a635d] transition-colors";
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
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
                  <select id="suffix" className={selectCls} value={formData.suffix} onChange={handleChange}>
                    <option value="">None</option>
                    {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Civil Status</label>
                  <select id="civilStatus" className={selectCls} value={formData.civilStatus} onChange={handleChange}>
                    {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  <select id="sex" required className={`${selectCls} ${inputErrCls('sex')}`} value={formData.sex} onChange={handleChange}>
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {fieldError('sex')}
                </div>
                <div>
                  <label className={labelCls}>Blood Type</label>
                  <select id="bloodType" className={selectCls} value={formData.bloodType} onChange={handleChange}>
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Religion</label>
                  <select id="religion" className={selectCls} value={formData.religion} onChange={handleChange}>
                    <option value="">Select</option>
                    {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nationality</label>
                  <select id="nationality" className={selectCls} value={formData.nationality} onChange={handleChange}>
                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

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
                      <select id="departmentAbbr" required className={`${selectCls} ${inputErrCls('departmentAbbr')}`} value={formData.departmentAbbr} onChange={handleChange}>
                        <option value="" disabled>Select Dept</option>
                        {configData.departments.map(d => <option key={d.abbr} value={d.abbr}>{d.abbr}</option>)}
                      </select>
                      {formData.departmentAbbr && (
                        <p className="text-[10px] text-[#6b8577] mt-1 ml-1 leading-tight">
                          {deptAbbrToFull[formData.departmentAbbr]}
                        </p>
                      )}
                      {fieldError('departmentAbbr')}
                    </div>

                    <div>
                      <label className={labelCls}>Program <span className="text-red-400">*</span></label>
                      <select id="program" required disabled={!formData.departmentAbbr}
                        className={`${selectCls} disabled:bg-slate-50 ${inputErrCls('program')}`}
                        value={formData.program} onChange={handleChange}>
                        <option value="" disabled>Select Program</option>
                        {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {fieldError('program')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Year Level</label>
                      <select id="yearLevel" className={selectCls} value={formData.yearLevel} onChange={handleChange}>
                        {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Section <span className="text-red-400">*</span></label>
                      <select id="section" required className={`${selectCls} ${inputErrCls('section')}`} value={formData.section} onChange={handleChange}>
                        <option value="" disabled>Select</option>
                        {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                      </select>
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
                    <select id="classification" required className={`${selectCls} ${inputErrCls('classification')}`} value={formData.classification} onChange={handleChange}>
                      <option value="" disabled>Select Classification</option>
                      {uniqueClassifications.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {fieldError('classification')}
                  </div>

                  <div>
                    <label className={labelCls}>Office / Department <span className="text-red-400">*</span></label>
                    <select id="department" required className={`${selectCls} ${inputErrCls('department')}`} value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select Office</option>
                      {PLSP_OFFICES_FOR_STAFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {formData.department && configData.departments.find(d => d.full === formData.department) && (
                      <p className="text-[10px] text-[#6b8577] mt-1 ml-1 leading-tight">{formData.department}</p>
                    )}
                    {fieldError('department')}
                  </div>

                  <div>
                    <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
                    <select id="jobTitle" required className={`${selectCls} ${inputErrCls('jobTitle')}`} value={formData.jobTitle} onChange={handleChange}>
                      <option value="" disabled>Select Job Title</option>
                      {uniqueJobTitles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
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
                      <select id="emergencyRelationship" required
                        className={`${selectCls} ${inputErrCls('emergencyRelationship')}`}
                        value={formData.emergencyRelationship} onChange={handleChange}>
                        <option value="" disabled>Select</option>
                        {EMERGENCY_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
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

      </div>
    </div>
  );
};

export default ProfileSetup;