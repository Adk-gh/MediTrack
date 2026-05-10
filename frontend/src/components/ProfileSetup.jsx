// frontend/src/components/ProfileSetup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from './Datepicker'; // ← replaces react-datepicker

// --- PLSP Department Data ---
const departmentsData = [
  {
    abbr: 'CCSE',
    full: 'College of Computing Science and Engineering',
    programs: [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Information System',
      'Bachelor of Science in Computer Engineering',
      'Bachelor of Science in Industrial Engineering',
    ],
  },
  {
    abbr: 'CBAM',
    full: 'College of Business Administration and Management',
    programs: [
      'Bachelor of Science in Entrepreneurship',
      'Bachelor of Science in Public Administration',
      'Bachelor of Science in Office Administration',
      'Bachelor of Science in Business Administration Major in Human Resource Development Management',
      'Bachelor of Science in Business Administration Major in Financial Management',
      'Bachelor of Science in Business Administration Major in Marketing Management',
    ],
  },
  {
    abbr: 'CAS',
    full: 'College of Art and Sciences',
    programs: [
      'Bachelor of Science in Economics',
      'Bachelor of Arts in Communication',
      'Bachelor of Science in Psychology',
      'Bachelor of Arts in Political Science',
    ],
  },
  {
    abbr: 'CTHM',
    full: 'College of Tourism and Hospitality Management',
    programs: [
      'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Hospitality Management',
    ],
  },
  {
    abbr: 'COA',
    full: 'College of Accountancy',
    programs: [
      'Bachelor of Science in Accountancy',
      'Bachelor of Science in Accountancy Information System',
      'Bachelor of Science in Management Accounting',
    ],
  },
  {
    abbr: 'CTE',
    full: 'College of Teacher Education',
    programs: [
      'Bachelor of Secondary Education Major in English',
      'Bachelor of Secondary Education Major in Filipino',
      'Bachelor of Secondary Education Major in Math',
      'Bachelor of Secondary Education Major in Science',
      'Bachelor of Secondary Education Major in Social Studies',
      'Bachelor of Elementary Education',
      'Bachelor of Technical-Vocational Teacher Education',
      'Bachelor of Special Needs Education',
    ],
  },
  {
    abbr: 'CHK',
    full: 'College of Human Kinetics',
    programs: [
      'Bachelor of Science in Physical Education',
      'Bachelor of Science in Sports Science',
    ],
  },
  {
    abbr: 'CNAHS',
    full: 'College of Nursing and Allied Health Sciences',
    programs: [
      'Bachelor of Science in Nursing',
    ],
  },
];

const deptAbbrToFull      = Object.fromEntries(departmentsData.map(d => [d.abbr, d.full]));
const programsByDeptAbbr  = Object.fromEntries(departmentsData.map(d => [d.abbr, d.programs]));

const NON_ACADEMIC_OFFICES = [
  'Accounting Office',
  'University Clinic',
  'Human Resources',
  'Library',
  'Maintenance',
  'Registrar Office',
  'Security Services',
];

const PLSP_OFFICES_FOR_STAFF = [
  ...departmentsData.map(d => ({ label: d.abbr, value: d.full })),
  ...NON_ACADEMIC_OFFICES.map(o => ({ label: o, value: o })),
];

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

const API_URL     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOTAL_STEPS = 3;

function getDefaultClassification(role) {
  const classMap = {
    'administrator': 'Administrator',
    'admin':         'Administrator',
    'nurse':         'Nurse Personnel',
    'doctor':        'Physician / Doctor',
    'staff':         'Non-Teaching Personnel',
    'employee':      'Non-Teaching Personnel',
    'guard':         'Security Personnel',
    'technician':    'Non-Teaching Personnel',
    'librarian':     'Non-Teaching Personnel',
    'lecturer':      'Teaching Personnel',
    'professor':     'Teaching Personnel',
    'instructor':    'Teaching Personnel',
  };
  return classMap[role] || 'Teaching Personnel';
}

function getDefaultJobTitle(role) {
  const titleMap = {
    'nurse':         'Nurse',
    'doctor':        'Physician',
    'admin':         'Administrator',
    'administrator': 'Administrator',
    'lecturer':      'Lecturer',
    'professor':     'Professor',
    'instructor':    'Instructor',
    'librarian':     'Librarian',
    'technician':    'Technician',
    'guard':         'Security Guard',
    'staff':         'Staff',
  };
  return titleMap[role] || '';
}

// ── Phone helpers ─────────────────────────────────────────────────────────────
const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 11);

const validatePhone = (value) => {
  if (!value) return 'Phone number is required.';
  if (value.length !== 11) return 'Phone number must be exactly 11 digits.';
  if (!value.startsWith('09')) return 'Phone number must start with 09.';
  return '';
};

const isEmpty = (v) => !v || !String(v).trim();

// ── Age calculator ────────────────────────────────────────────────────────────
function calcAge(isoDate) {
  if (!isoDate) return '';
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
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

  const [formData, setFormData] = useState({
    // STEP 1 – Personal
    firstName:     user?.firstName     || '',
    middleInitial: user?.middleInitial || '',
    lastName:      user?.lastName      || '',
    suffix:        user?.suffix        || '',
    birthday:      '',
    age:           '',
    sex:           '',
    bloodType:     '',
    homeAddress:   '',
    religion:      '',
    nationality:   'Filipino',
    civilStatus:   'Single',

    // STEP 2 – Academic / Work
    universityId:           user?.universityId || '',
    departmentAbbr:         '',
    department:             '',
    program:                '',
    yearLevel:              '1st Year',
    section:                '',
    studentClassification:  'Regular',  // ← tracked here
    classification:         getDefaultClassification(userRole),
    jobTitle:               getDefaultJobTitle(userRole),

    // STEP 3 – Contact & Emergency
    email:       user?.email || '',
    phoneNumber: '',

    emergencyName:         '',
    emergencyRelationship: '',
    emergencyPhone:        '',
    emergencyAddress:      '',

    vaccinations: {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  });

  const [errors, setErrors] = useState({});

  // Auth Guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

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

  // ── Birthday change (from DatePicker) ────────────────────────────
  const handleBirthdayChange = (isoDate) => {
    setFormData(prev => ({ ...prev, birthday: isoDate, age: calcAge(isoDate) }));
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

  // ── Step validation ───────────────────────────────────────────────────────
  const validateStep = (targetStep) => {
    const newErrors = {};

    if (targetStep > 1) {
      if (isEmpty(formData.firstName)) newErrors.firstName = 'First name is required.';
      if (isEmpty(formData.lastName))  newErrors.lastName  = 'Last name is required.';
      if (!formData.birthday)          newErrors.birthday  = 'Birthday is required.';
      if (!formData.sex)               newErrors.sex       = 'Sex is required.';
    }

    if (targetStep > 2) {
      if (userRole === 'student') {
        if (isEmpty(formData.universityId))   newErrors.universityId   = 'Student number is required.';
        if (isEmpty(formData.departmentAbbr)) newErrors.departmentAbbr = 'Department is required.';
        if (isEmpty(formData.program))        newErrors.program        = 'Program is required.';
        if (isEmpty(formData.section))        newErrors.section        = 'Section is required.';
      } else {
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
    if (step === 1 && !formData.birthday) {
      setError('birthday', 'Birthday is required.');
      return;
    }
    if (!validateStep(step + 1)) return;
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const allErrors = {};
    if (isEmpty(formData.firstName)) allErrors.firstName = 'First name is required.';
    if (isEmpty(formData.lastName))  allErrors.lastName  = 'Last name is required.';
    if (!formData.birthday)          allErrors.birthday  = 'Birthday is required.';
    if (!formData.sex)               allErrors.sex       = 'Sex is required.';

    if (userRole === 'student') {
      if (isEmpty(formData.universityId))   allErrors.universityId   = 'Student number is required.';
      if (isEmpty(formData.departmentAbbr)) allErrors.departmentAbbr = 'Department is required.';
      if (isEmpty(formData.program))        allErrors.program        = 'Program is required.';
      if (isEmpty(formData.section))        allErrors.section        = 'Section is required.';
    } else {
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
      if (allErrors.universityId || allErrors.departmentAbbr || allErrors.department || allErrors.program || allErrors.section || allErrors.jobTitle) { setStep(2); return; }
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
        // Personal
        firstName:     formData.firstName,
        middleInitial: formData.middleInitial,
        lastName:      formData.lastName,
        suffix:        formData.suffix,
        birthday:      formData.birthday,
        age:           formData.age,
        sex:           formData.sex,
        bloodType:     formData.bloodType,
        homeAddress:   formData.homeAddress,
        religion:      formData.religion,
        nationality:   formData.nationality,
        civilStatus:   formData.civilStatus,

        // Academic / Work
        universityId:  formData.universityId,
        department:    formData.department,
        program:       formData.program,
        yearLevel:     formData.yearLevel,
        section:       formData.section,
        // ✅ FIX: studentClassification is now included in the payload
        studentClassification: userRole === 'student' ? formData.studentClassification : '',
        classification: formData.classification,
        jobTitle:      formData.jobTitle,

        // Contact
        email:         formData.email,
        phoneNumber:   formData.phoneNumber,

        // Emergency Contact
        emergencyContact: {
          name:         formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone:        formData.emergencyPhone,
          address:      formData.emergencyAddress,
        },

        // Vaccinations
        vaccinations:    formData.vaccinations,

        // Meta
        role:            userRole,
        isProfileSetup:  true,
        profileComplete: true,
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

  // ── Shared styles ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[520px] p-8 overflow-hidden">

        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black text-[#1a2e22]">Complete Your Profile</h1>
          <p className="text-sm text-[#6b8577] mt-1">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#e2f0ea] rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-[#2d7a52] rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step Tabs */}
        <div className="flex justify-between mb-5 px-1 gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={tabClass(i + 1)} onClick={() => setStep(i + 1)}>{label}</div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative flex flex-col">

          {/* ─── STEP 1: PERSONAL ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                  <input id="firstName" type="text" required className={`${inputCls} ${inputErrCls('firstName')}`} value={formData.firstName} onChange={handleChange} />
                  {fieldError('firstName')}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>M.I.</label>
                  <input id="middleInitial" type="text" maxLength="1" className={`${inputCls} text-center`} value={formData.middleInitial} onChange={handleChange} />
                </div>
                <div className="col-span-5">
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

              {/* ── Birthday row: DatePicker + Age ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Birthday <span className="text-red-400">*</span></label>
                  <DatePicker
                    value={formData.birthday}
                    onChange={handleBirthdayChange}
                    error={errors.birthday}
                  />
                </div>
                <div>
                  <label className={labelCls}>Age</label>
                  <input id="age" type="number" readOnly className={`${inputCls} bg-slate-50`} value={formData.age} />
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
                <input
                  id="homeAddress"
                  type="text"
                  placeholder="House No., Street, Barangay, City/Municipality, Province"
                  className={inputCls}
                  value={formData.homeAddress}
                  onChange={handleChange}
                />
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
                        {departmentsData.map(d => <option key={d.abbr} value={d.abbr}>{d.abbr}</option>)}
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

                  {/* Student Classification */}
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
                    <select id="classification" required className={selectCls} value={formData.classification} onChange={handleChange}>
                      {['Teaching Personnel', 'Nurse Personnel', 'Physician / Doctor', 'Administrator', 'Non-Teaching Personnel', 'Security Personnel'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Office / Department <span className="text-red-400">*</span></label>
                    <select id="department" required className={`${selectCls} ${inputErrCls('department')}`} value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select Office</option>
                      {PLSP_OFFICES_FOR_STAFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {formData.department && departmentsData.find(d => d.full === formData.department) && (
                      <p className="text-[10px] text-[#6b8577] mt-1 ml-1 leading-tight">{formData.department}</p>
                    )}
                    {fieldError('department')}
                  </div>

                  <div>
                    <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
                    <input id="jobTitle" type="text" placeholder="e.g. Associate Professor" required
                      className={`${inputCls} ${inputErrCls('jobTitle')}`}
                      value={formData.jobTitle} onChange={handleChange} />
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
                    <input id="emergencyAddress" type="text" placeholder="Emergency contact's home address"
                      className={inputCls}
                      value={formData.emergencyAddress} onChange={handleChange} />
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
  );
};

export default ProfileSetup;