// frontend/src/features/admin-clinic/User-Management.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { createPortal } from 'react-dom';
import DatePicker from '../../components/Datepicker';
import AddressModal from '../../components/AddressModal';
import { logAdminAction } from '../../services/audit.service';

// ── Frontend Email Validation Helper ──────────────────────────────────────────
const validateEmailWithEasyEmail = async (email) => {
  const API_KEY = import.meta.env.VITE_EASY_EMAIL_API;

  if (!API_KEY) {
    console.warn("VITE_EASY_EMAIL_API missing in frontend .env. Skipping email validation.");
    return { isDeliverable: true };
  }

  const API_URL = `https://api.easyemailapi.com/v1/verify?email=${encodeURIComponent(email)}&apikey=${API_KEY}`;

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.valid === false || data.inbox_exists === false || data.deliverable === false) {
       return {
           isDeliverable: false,
           message: "This email address does not exist or cannot receive emails. Please provide a valid email."
       };
    }

    return { isDeliverable: true };
  } catch (error) {
    console.error("Frontend Email validation API error:", error);
    return { isDeliverable: true };
  }
};

// ── Password Validation Helpers ───────────────────────────────────────────────
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
  if (!rules) return { valid: true, message: '' }; // Fallback
  const requirements = getPasswordRequirements(rules);
  const failedRequirements = requirements.filter((r) => !r.test(password));
  if (failedRequirements.length > 0) {
    return {
      valid: false,
      message: `Password must contain ${failedRequirements.map((r) => r.label.toLowerCase()).join(', ')}.`
    };
  }
  return { valid: true, message: '' };
};

const PasswordRequirements = ({ password, rules }) => {
  if (!rules || !password) return null;
  const requirements = getPasswordRequirements(rules);
  if (requirements.length === 0) return null;

  return (
    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password Requirements</div>
      <div className="flex flex-col gap-1">
        {requirements.map((req) => {
          const satisfied = req.test(password);
          return (
            <div key={req.key} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${satisfied ? 'text-emerald-600' : 'text-slate-500'}`}>
              <span className="w-3 h-3 flex items-center justify-center font-bold text-[10px]">{satisfied ? '✓' : '○'}</span>
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Helper Functions ──────────────────────────────────────────────────────────
const isClinicStaff = (r, config) => config?.clinic_roles?.includes(r?.toLowerCase());
const isFaculty     = (r, config) => config?.faculty_roles?.includes(r?.toLowerCase());
const isStudent     = (r) => r?.toLowerCase() === 'student';
const isAdmin       = (r, config) => config?.admin_roles?.includes(r?.toLowerCase());

// Extracts unique values from a config field (array or JSONB object values)
const extractUniqueConfigValues = (configField) => {
  if (!configField) return [];
  if (Array.isArray(configField)) return Array.from(new Set(configField));
  return Array.from(new Set(Object.values(configField).flat()));
};

const STUDENT_CLASSIFICATIONS = ['Regular','Irregular','Returning'];

const ITEMS_PER_PAGE = 100;

// ── Name Normalization ────────────────────────────────────────────────────────
const normalizeName = (name) => {
  if (!name) return '';
  let trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const capitalizeWords = (str) => {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls  = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] bg-white";
const filterSelectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
const labelCls  = "block text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Unsaved Changes Modal
// ─────────────────────────────────────────────────────────────────────────────
const UnsavedChangesModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Unsaved Changes</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">You have unsaved changes. Are you sure you want to discard them? Any edits you made will be lost.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">
            Keep Editing
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition">
            Discard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Component
// ─────────────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    style={{
      position: 'relative', width: 40, height: 20, minWidth: 40, maxWidth: 40, padding: 0,
      border: 'none', borderRadius: 9999, cursor: 'pointer', flexShrink: 0,
      background: checked ? '#466460' : '#cbd5e1', transition: 'background-color 0.15s ease',
    }}
  >
    <span
      style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 16, height: 16,
        borderRadius: 9999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        transition: 'left 0.15s ease',
      }}
    />
  </button>
);

const EyeIcon = ({ open }) => open
  ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/></svg>
  : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>;

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const currentUser = getCurrentUser();
const isCurrentUserSysAdmin = ['sysadmin', 'administrator', 'admin'].includes(currentUser?.role?.toLowerCase());
const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

// ─────────────────────────────────────────────────────────────────────────────
// CustomSelect Component (Fixes max-height browser issue for native <select>)
// ─────────────────────────────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = "— Select —", disabled = false, grouped = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizeOpt = (opt) => (typeof opt === 'object' && opt !== null) ? opt : { value: opt, label: opt };

  const getDisplay = () => {
    if (!value) return placeholder;
    if (!grouped) {
       const found = options.map(normalizeOpt).find(o => String(o.value) === String(value));
       return found ? found.label : value;
    } else {
       for (const g of options) {
         const found = g.options.map(normalizeOpt).find(o => String(o.value) === String(value));
         if (found) return found.label;
       }
       return value;
    }
  };

  return (
    <div className={`relative ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} ref={ref}>
      <div
        className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center justify-between transition-colors focus:ring-2 focus:ring-[#e0eceb] ${disabled ? 'bg-slate-50 text-slate-500' : 'bg-white cursor-pointer hover:border-[#466460]'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
         <span className={`truncate pr-2 ${!value ? 'text-slate-400' : 'text-slate-800'}`}>
           {getDisplay()}
         </span>
         <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#466460]' : 'text-slate-400'}`}><polyline points="2,4 6,8 10,4"/></svg>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[100] top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
           <div
             className="px-3 py-2 text-sm text-slate-400 cursor-pointer hover:bg-slate-50 italic border-b border-slate-100"
             onClick={() => { onChange(''); setIsOpen(false); }}
           >
             {placeholder}
           </div>
           {grouped ? (
             options.map((g, i) => (
               <div key={i}>
                 <div className="px-3 py-1.5 bg-slate-50/90 backdrop-blur-sm text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">{g.label}</div>
                 {g.options.map(o => {
                   const opt = normalizeOpt(o);
                   return (
                     <div
                       key={opt.value}
                       className={`px-4 py-2 text-sm cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-[#e0eceb] text-[#466460] font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                       onClick={() => { onChange(opt.value); setIsOpen(false); }}
                     >
                       {opt.label}
                     </div>
                   )
                 })}
               </div>
             ))
           ) : (
             options.map((o, i) => {
               const opt = normalizeOpt(o);
               return (
                 <div
                   key={opt.value || i}
                   className={`px-4 py-2 text-sm cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-[#e0eceb] text-[#466460] font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                   onClick={() => { onChange(opt.value); setIsOpen(false); }}
                 >
                   {opt.label}
                 </div>
               )
             })
           )}
        </div>
      )}
    </div>
  );
};

// Generate Grouped Role Options safely
const getRoleOptions = (configData) => {
  if (!configData) return [];
  const groups = [];
  if (isCurrentUserSysAdmin) {
    groups.push({ label: 'System Administration', options: (configData.admin_roles || []).map(r => ({ value: r, label: capitalizeWords(r) })) });
  }
  groups.push({ label: 'Clinic Staff', options: (configData.clinic_roles || []).map(r => ({ value: r, label: capitalizeWords(r) })) });
  groups.push({ label: 'Faculty', options: (configData.faculty_roles || []).map(r => ({ value: r, label: capitalizeWords(r) })) });
  groups.push({ label: 'Student', options: [{ value: 'student', label: 'Student' }] });
  return groups;
};

// ─────────────────────────────────────────────────────────────────────────────
// CreateUserModal
// ─────────────────────────────────────────────────────────────────────────────
const CreateUserModal = ({ onClose, onCreated, showSnackbar, configData }) => {
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const [initialForm] = useState({
    first_name: '', middle_name: '', last_name: '', suffix: '',
    university_id: '', email: '', phone_number: '', password: '',
    role: 'student',
    department: '', departmentAbbr: '', program: '',
    job_title: '', classification: 'Student',
    birthday: '', age: '', sex: '', blood_type: '', civil_status: 'Single',
    religion: '', nationality: 'Filipino', home_address: '',
    year_level: '1st Year', section: '', student_classification: 'Regular',
    is_verified: true, profile_complete: false,
  });

  const [form, setForm] = useState(initialForm);

  const deptAbbrToFull = Object.fromEntries(configData.departments.map(d => [d.abbr, d.full]));
  const programsByDeptAbbr = Object.fromEntries(configData.departments.map(d => [d.abbr, d.programs]));

  const PLSP_OFFICES_FOR_STAFF = [
    ...configData.departments.map(d => ({ label: d.abbr, value: d.full })),
    ...configData.non_academic_offices.map(o => ({ label: o, value: o })),
  ];
  const uniqueClassifications = extractUniqueConfigValues(configData.classifications);
  const uniqueJobTitles = extractUniqueConfigValues(configData.job_titles);

  const cf = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRoleChange = (val) => {
    let rawClassification = configData.classifications[val?.toLowerCase()];
    if (Array.isArray(rawClassification)) rawClassification = rawClassification[0];

    let rawJobTitle = configData.job_titles[val?.toLowerCase()];
    if (Array.isArray(rawJobTitle)) rawJobTitle = rawJobTitle[0];

    setForm(f => ({
      ...f, role: val, classification: rawClassification || '',
      job_title: rawJobTitle || '', department: '', departmentAbbr: '', program: '',
      year_level: '1st Year', section: '', student_classification: 'Regular',
    }));
  };

  const handleDeptChange = (val) => {
    setForm(f => ({ ...f, departmentAbbr: val, department: deptAbbrToFull[val] || val, program: '' }));
  };

  const handleBirthdayChange = (val) => {
    const birth = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setForm(f => ({ ...f, birthday: val, age: String(age) }));
  };

  const handleCloseRequest = () => {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const availablePrograms = form.departmentAbbr ? (programsByDeptAbbr[form.departmentAbbr] || []) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.university_id) {
      showSnackbar('Please fill all required fields', 'error'); return;
    }

    const pwCheck = validatePassword(form.password, configData.passwordRules);
    if (!pwCheck.valid) {
      showSnackbar(pwCheck.message, 'error');
      return;
    }

    setLoading(true);

    try {
      const validationResult = await validateEmailWithEasyEmail(form.email);
      if (!validationResult.isDeliverable) {
        showSnackbar(validationResult.message, 'error');
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase.from('users').select('id').eq('university_id', form.university_id).maybeSingle();
      if (existing) { showSnackbar('This University ID is already registered', 'error'); setLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-auth-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ email: form.email, password: form.password, firstName: normalizeName(form.first_name), lastName: normalizeName(form.last_name) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update auth user');

      const newUser = {
        uid: result.userId,
        first_name: normalizeName(form.first_name), middle_name: normalizeName(form.middle_name),
        last_name: normalizeName(form.last_name), suffix: form.suffix || '',
        email: form.email.toLowerCase(), university_id: form.university_id,
        phone_number: form.phone_number || '', role: form.role,
        department: form.department || '', program: form.program || '',
        job_title: form.job_title || '',
        birthday: form.birthday || '', age: form.age === '' ? null : Number(form.age),
        sex: form.sex || '', blood_type: form.blood_type || '',
        civil_status: form.civil_status || '', religion: form.religion || '',
        nationality: form.nationality || '', home_address: form.home_address || '',
        year_level: form.year_level || '', section: form.section || '',
        student_classification: form.student_classification || '',
        classification: form.classification || '',
        is_verified: form.is_verified, profile_complete: form.profile_complete,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase.from('users').insert(newUser).select().single();
      if (insertError) throw insertError;

      logAdminAction({
        action: 'user_created',
        details: {
          userId: inserted.id,
          uid: inserted.uid,
          email: inserted.email,
          role: inserted.role,
          universityId: inserted.university_id,
        },
        adminUid,
      });

      onCreated(inserted);
      showSnackbar('User created successfully', 'success');
      onClose();
    } catch (err) {
      showSnackbar('Error creating user: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  const isStudentRole = isStudent(form.role);
  const isFacultyRole = isFaculty(form.role, configData);
  const isClinicRole  = isClinicStaff(form.role, configData);
  const isAdminRole   = isAdmin(form.role, configData);
  const secHead = "col-span-full text-[10px] font-black uppercase tracking-widest text-[#466460] border-b border-[#e0eceb] pb-1 mt-2";

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-4 pt-4 md:pt-10" onClick={e => e.target === e.currentTarget && handleCloseRequest()}>
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">
          <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">Create New User</h3>
              <p className="text-xs text-white/70 mt-0.5">Fill in the details below</p>
            </div>
            <button onClick={handleCloseRequest} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} id="create-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className={secHead}>Account</div>
                <div><label className={labelCls}>Email <span className="text-red-400">*</span></label><input className={inputCls} type="email" value={form.email} autoComplete="off" onChange={e => cf('email', e.target.value)} placeholder="user@example.com" required /></div>
                <div className="flex flex-col">
                  <label className={labelCls}>Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input className={`${inputCls} pr-10`} type={showPwd ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={e => cf('password', e.target.value)} placeholder="Create a password" required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460]"><EyeIcon open={showPwd} /></button>
                  </div>
                  <PasswordRequirements password={form.password} rules={configData?.passwordRules} />
                </div>

                <div className={secHead}>Identity</div>
                <div><label className={labelCls}>First Name <span className="text-red-400">*</span></label><input className={inputCls} value={form.first_name} onChange={e => cf('first_name', e.target.value)} placeholder="First name" required /></div>
                <div><label className={labelCls}>Last Name <span className="text-red-400">*</span></label><input className={inputCls} value={form.last_name} onChange={e => cf('last_name', e.target.value)} placeholder="Last name" required /></div>
                <div><label className={labelCls}>Middle Name</label><input className={inputCls} value={form.middle_name} onChange={e => cf('middle_name', e.target.value)} placeholder="Middle name" /></div>
                <div>
                  <label className={labelCls}>Suffix</label>
                  <CustomSelect value={form.suffix} onChange={v => cf('suffix', v)} options={['Jr.','Sr.','II','III','IV','V']} placeholder="None" />
                </div>
                <div><label className={labelCls}>Birthday</label><DatePicker value={form.birthday} onChange={(val) => handleBirthdayChange(val)} /></div>
                <div><label className={labelCls}>Age</label><input className={`${inputCls} bg-slate-50`} type="number" readOnly value={form.age} placeholder="Auto" /></div>
                <div>
                  <label className={labelCls}>Sex</label>
                  <CustomSelect value={form.sex} onChange={v => cf('sex', v)} options={['Male', 'Female']} />
                </div>
                <div>
                  <label className={labelCls}>Civil Status</label>
                  <CustomSelect value={form.civil_status} onChange={v => cf('civil_status', v)} options={['Single','Married','Widowed','Divorced','Separated']} />
                </div>
                <div>
                  <label className={labelCls}>Religion</label>
                  <CustomSelect value={form.religion} onChange={v => cf('religion', v)} options={['Roman Catholic','Islam','Iglesia ni Cristo','Seventh-day Adventist','Protestant','Born Again Christian','Buddhism','Hinduism','Other']} />
                </div>
                <div>
                  <label className={labelCls}>Nationality</label>
                  <CustomSelect value={form.nationality} onChange={v => cf('nationality', v)} options={['Filipino','American','Chinese','Japanese','Korean','Indian','British','Australian','Canadian','Other']} />
                </div>
                <div><label className={labelCls}>Phone Number</label><input className={inputCls} value={form.phone_number} onChange={e => cf('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" /></div>

                <div className={secHead}>Role &amp; Work</div>
                <div>
                  <label className={labelCls}>Role <span className="text-red-400">*</span></label>
                  <CustomSelect value={form.role} onChange={handleRoleChange} options={getRoleOptions(configData)} grouped={true} placeholder="— Select Role —" />
                </div>
                <div><label className={labelCls}>University ID <span className="text-red-400">*</span></label><input className={inputCls} value={form.university_id} onChange={e => cf('university_id', e.target.value)} placeholder="e.g. 2021-00001" required /></div>

                {isStudentRole && (
                  <>
                    <div>
                      <label className={labelCls}>Department <span className="text-red-400">*</span></label>
                      <CustomSelect value={form.departmentAbbr} onChange={handleDeptChange} options={configData.departments.map(d => ({ value: d.abbr, label: d.abbr }))} />
                      {form.departmentAbbr && <p className="text-[10px] text-slate-400 mt-1">{deptAbbrToFull[form.departmentAbbr]}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Program <span className="text-red-400">*</span></label>
                      <CustomSelect value={form.program} onChange={v => cf('program', v)} options={availablePrograms} disabled={!form.departmentAbbr} />
                    </div>
                    <div>
                      <label className={labelCls}>Year Level</label>
                      <CustomSelect value={form.year_level} onChange={v => cf('year_level', v)} options={['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate']} />
                    </div>
                    <div>
                      <label className={labelCls}>Section</label>
                      <CustomSelect value={form.section} onChange={v => cf('section', v)} options={configData.sections || []} />
                    </div>
                    <div>
                      <label className={labelCls}>Student Classification</label>
                      <CustomSelect value={form.student_classification} onChange={v => cf('student_classification', v)} options={STUDENT_CLASSIFICATIONS} />
                    </div>
                  </>
                )}

                {(isFacultyRole || isClinicRole || isAdminRole) && (
                  <>
                    <div>
                      <label className={labelCls}>Department / Office {!isAdminRole && <span className="text-red-400">*</span>}</label>
                      <CustomSelect value={form.department} onChange={v => cf('department', v)} options={PLSP_OFFICES_FOR_STAFF} placeholder="— Select Office —" />
                    </div>

                    <div>
                      <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
                      <CustomSelect value={form.job_title} onChange={v => cf('job_title', v)} options={uniqueJobTitles} placeholder="— Select Job Title —" />
                    </div>

                    {!isAdminRole && (
                      <div>
                        <label className={labelCls}>Classification</label>
                        <CustomSelect value={form.classification} onChange={v => cf('classification', v)} options={uniqueClassifications} placeholder="— Select Classification —" />
                      </div>
                    )}
                  </>
                )}

                <div className={secHead}>Account Flags</div>
                {[
                  { key: 'is_verified',      label: 'Mark as Email Verified',   desc: 'User can log in without verifying email.' },
                  { key: 'profile_complete', label: 'Mark Profile as Complete', desc: 'Skips profile setup on first login.' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Toggle checked={form[key]} onChange={() => cf(key, !form[key])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 truncate">{label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
            <button type="button" onClick={handleCloseRequest} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
            <button type="submit" form="create-form" disabled={loading} className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              {loading ? 'Creating…' : '✓ Create User'}
            </button>
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showConfirmClose}
        onCancel={() => setShowConfirmClose(false)}
        onConfirm={onClose}
      />
    </>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main UserManagement component
// ─────────────────────────────────────────────────────────────────────────────
export const UserManagement = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [configData, setConfigData]     = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [resendingId, setResendingId]   = useState(null);

  // Search & Filters
  const [currentFilter, setCurrentFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [verifyFilter, setVerifyFilter]   = useState('all');
  const [sexFilter, setSexFilter]         = useState('all');
  const [deptFilter, setDeptFilter]       = useState('all');
  const [sortOrder, setSortOrder]         = useState('asc');
  const [searchInput, setSearchInput]   = useState('');

  // Pagination
  const [currentPage, setCurrentPage]   = useState(1);

  const [message, setMessage]           = useState(null);
  const [editSaving, setEditSaving]     = useState(false);

  const [showEditModal, setShowEditModal]     = useState(false);
  const [showEditCloseConfirm, setShowEditCloseConfirm] = useState(false);
  const [editTarget, setEditTarget]           = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [editShowPwd, setEditShowPwd] = useState(false);

  const EMPTY_FORM = {
    first_name:'', middle_name:'', last_name:'', suffix:'',
    university_id:'', email:'', phone_number:'', password:'',
    role:'student', department:'', departmentAbbr:'', program:'', job_title:'',
    birthday:'', age:'', sex:'', blood_type:'', civil_status:'',
    religion:'', nationality:'', home_address:'',
    year_level:'', section:'', student_classification:'', classification:'',
    is_verified:false, profile_complete:false, is_profile_setup:false,
  };
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [initialEditForm, setInitialEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchUsers();
    fetchConfig();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, currentFilter, profileFilter, verifyFilter, sexFilter, deptFilter, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('*').eq('is_archived', false);
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setIsConfigLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system-config`);
      const result = await res.json();
      if (result.success) {
        const data = result.data;
        if (data.password_rules) {
          data.passwordRules = {
            minLength: Number(data.password_rules.minLength) || 8,
            requireUppercase: data.password_rules.requireUppercase === true,
            requireLowercase: data.password_rules.requireLowercase === true,
            requireNumber: data.password_rules.requireNumber === true,
            requireSpecialCharacter: data.password_rules.requireSpecialCharacter === true,
          };
        } else {
          data.passwordRules = { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialCharacter: false };
        }
        setConfigData(data);
      }
    } catch(e) {
      console.error("Failed to load config:", e);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const getFullName = (user) =>
    [user.first_name, user.middle_name || '', user.last_name, user.suffix || ''].filter(Boolean).join(' ') || '—';

  const getInitials = (user) =>
    ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U';

  const getRoleLabel = (role) => capitalizeWords(role) || '—';

  const getRoleBadgeStyle = (role) => {
    const r = role?.toLowerCase();
    if (isAdmin(r, configData)) return { background: '#fef9c3', color: '#854d0e' };
    if (isClinicStaff(r, configData)) return { background: '#dbeafe', color: '#1d4ed8' };
    if (isStudent(r)) return { background: '#f3e8ff', color: '#6b21a8' };
    if (isFaculty(r, configData)) return { background: '#fff7ed', color: '#9a3412' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  const deptAbbrToFull = configData ? Object.fromEntries(configData.departments.map(d => [d.abbr, d.full])) : {};
  const programsByDeptAbbr = configData ? Object.fromEntries(configData.departments.map(d => [d.abbr, d.programs])) : {};
  const PLSP_OFFICES_FOR_STAFF = configData ? [
    ...configData.departments.map(d => ({ label: d.abbr, value: d.full })),
    ...configData.non_academic_offices.map(o => ({ label: o, value: o })),
  ] : [];

  const uniqueClassifications = configData ? extractUniqueConfigValues(configData.classifications) : [];
  const uniqueJobTitles = configData ? extractUniqueConfigValues(configData.job_titles) : [];

  let filteredUsers = users.filter(user => {
    const role = user.role?.toLowerCase();

    if (currentFilter === 'faculty') { if (!isFaculty(role, configData)) return false; }
    else if (currentFilter === 'clinic_staff') { if (!isClinicStaff(role, configData)) return false; }
    else if (currentFilter !== 'all') { if (role !== currentFilter) return false; }

    if (profileFilter !== 'all') {
      const isComplete = !!user.profile_complete;
      if (profileFilter === 'active' && !isComplete) return false;
      if (profileFilter === 'pending' && isComplete) return false;
    }

    if (verifyFilter !== 'all') {
      const isVer = !!user.is_verified;
      if (verifyFilter === 'verified' && !isVer) return false;
      if (verifyFilter === 'unverified' && isVer) return false;
    }

    if (sexFilter !== 'all') {
      if (user.sex !== sexFilter) return false;
    }

    if (deptFilter !== 'all') {
      if (user.department !== deptFilter) return false;
    }

    if (searchInput) {
      const s = searchInput.toLowerCase();
      if (!(getFullName(user).toLowerCase().includes(s) || user.email?.toLowerCase().includes(s) || user.university_id?.toLowerCase().includes(s))) return false;
    }

    return true;
  });

  filteredUsers.sort((a, b) => {
    const nameA = getFullName(a).toLowerCase();
    const nameB = getFullName(b).toLowerCase();
    if (sortOrder === 'asc') return nameA.localeCompare(nameB);
    return nameB.localeCompare(nameA);
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEditModal = (user) => {
    let foundDeptAbbr = '';
    if (configData) {
      for (const d of configData.departments) {
        if (d.full === user.department) { foundDeptAbbr = d.abbr; break; }
      }
    }
    setEditTarget(user);

    const newForm = {
      first_name: user.first_name || '', middle_name: user.middle_name || '',
      last_name: user.last_name || '', suffix: user.suffix || '',
      university_id: user.university_id || '', email: user.email || '',
      phone_number: user.phone_number || '', password: '', role: user.role || 'student',
      department: user.department || '', departmentAbbr: foundDeptAbbr, program: user.program || '',
      job_title: user.job_title || '', birthday: user.birthday || '',
      age: user.age ?? '', sex: user.sex || '', blood_type: user.blood_type || '',
      civil_status: user.civil_status || '', religion: user.religion || '',
      nationality: user.nationality || '', home_address: user.home_address || '',
      year_level: user.year_level || '', section: user.section || '',
      student_classification: user.student_classification || '',
      classification: user.classification || '',
      is_verified: user.is_verified ?? false, profile_complete: user.profile_complete ?? false,
      is_profile_setup: user.is_profile_setup ?? false,
    };

    setEditForm(newForm);
    setInitialEditForm(newForm);
    setPhoneError('');
    setEditShowPwd(false);
    setShowEditModal(true);
  };

  const handleEditCloseRequest = () => {
    if (JSON.stringify(editForm) !== JSON.stringify(initialEditForm)) {
      setShowEditCloseConfirm(true);
    } else {
      setShowEditModal(false);
    }
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return String(age);
  };

  const handlePhoneChange = (value) => {
    const cleaned = value.replace(/\D/g, '');
    setEditForm(f => ({ ...f, phone_number: cleaned }));
    if (cleaned.length > 0 && cleaned.length !== 11) {
      setPhoneError('Phone number must be exactly 11 digits');
    } else {
      setPhoneError('');
    }
  };

  const handleDeptChange = (val) => {
    setEditForm(f => ({ ...f, departmentAbbr: val, department: deptAbbrToFull[val] || val, program: '' }));
  };

  const handleAddressConfirm = (addressData) => {
    const fullAddress = [
      addressData.addressStreet, addressData.addressBarangay, addressData.addressCity,
      addressData.addressProvince, addressData.addressRegion,
    ].filter(Boolean).join(', ');
    setEditForm(f => ({ ...f, home_address: fullAddress }));
    setShowAddressModal(false);
  };

  const handleRoleEditChange = (val) => {
    let rawClassification = configData.classifications[val?.toLowerCase()];
    if (Array.isArray(rawClassification)) rawClassification = rawClassification[0];

    let rawJobTitle = configData.job_titles[val?.toLowerCase()];
    if (Array.isArray(rawJobTitle)) rawJobTitle = rawJobTitle[0];

    setEditForm(f => ({
      ...f, role: val, classification: rawClassification || '',
      job_title: rawJobTitle || capitalizeWords(val),
    }));
  };

  const field = (key, value) => setEditForm(f => ({ ...f, [key]: value }));

  const toggleProfileComplete = () => {
    setEditForm(f => {
      const next = !f.profile_complete;
      return { ...f, profile_complete: next, is_profile_setup: next };
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (editForm.phone_number && editForm.phone_number.length !== 11) {
      showSnackbar('Phone number must be exactly 11 digits', 'error');
      setPhoneError('Phone number must be exactly 11 digits');
      return;
    }

    if (editForm.password) {
      const pwCheck = validatePassword(editForm.password, configData.passwordRules);
      if (!pwCheck.valid) {
        showSnackbar(pwCheck.message, 'error');
        return;
      }
    }

    setEditSaving(true);

    try {
      if (editForm.email !== editTarget?.email) {
        const validationResult = await validateEmailWithEasyEmail(editForm.email);
        if (!validationResult.isDeliverable) {
          showSnackbar(validationResult.message, 'error');
          setEditSaving(false);
          return;
        }
      }

      const { password, first_name, middle_name, last_name, ...payloadWithoutPassword } = editForm;
      const payload = {
        ...payloadWithoutPassword,
        first_name: normalizeName(first_name), middle_name: normalizeName(middle_name),
        last_name: normalizeName(last_name), age: editForm.age === '' ? null : Number(editForm.age),
        updated_at: new Date().toISOString(),
        ...(editForm.password ? { newPassword: editForm.password } : {})
      };

      const targetUid = editTarget?.uid || editTarget?.id;
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/admin-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: targetUid, ...payload })
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || result.error || 'Failed to update user');

      logAdminAction({
        action: 'user_updated',
        details: {
          userId: targetUid,
          email: editForm.email,
          previousRole: editTarget?.role,
          newRole: editForm.role,
          passwordChanged: !!editForm.password,
        },
        adminUid,
      });

      showSnackbar('User updated successfully', 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      showSnackbar('Error updating user: ' + (err.message || ''), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const resendVerificationEmail = async (user) => {
    const targetId = user.uid || user.id;
    setResendingId(targetId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/auth/admin-resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId })
      });
      const data = await response.json();

      if (data.success) {
        logAdminAction({
          action: 'verification_email_resent',
          details: { userId: targetId, email: user.email },
          adminUid,
        });

        showSnackbar(`Verification email sent successfully to ${user.email}`, 'success');
        setShowEditModal(false);
      } else {
        const errorMsg = data.message || 'Failed to send verification email.';
        showSnackbar(errorMsg, 'error');
      }
    } catch (err) {
      showSnackbar('Error sending verification email. Please verify if the user\'s email is correct.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const openDeleteModal = (user) => { setDeleteTarget(user); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/user/users/${deleteTarget.uid}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to archive user');

      logAdminAction({
        action: 'user_archived',
        details: {
          userId: deleteTarget.uid,
          email: deleteTarget.email,
          role: deleteTarget.role,
        },
        adminUid,
      });

      setUsers(users.filter(u => u.uid !== deleteTarget.uid));
      showSnackbar('User archived successfully. You can restore them from the Archives page.', 'success');
    } catch (err) {
      showSnackbar('Error archiving user', 'error');
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const showSnackbar = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const statTotal       = filteredUsers.length;
  const statAdmin       = filteredUsers.filter(u => isAdmin(u.role, configData)).length;
  const statClinicStaff = filteredUsers.filter(u => isClinicStaff(u.role, configData)).length;
  const statStudent     = filteredUsers.filter(u => isStudent(u.role)).length;
  const statFaculty     = filteredUsers.filter(u => isFaculty(u.role, configData)).length;

  const sectionHeadCls = "col-span-full text-[10px] font-black uppercase tracking-widest text-[#466460] border-b border-[#e0eceb] pb-1 mt-2";
  const COL_COUNT = 9;

  if (isConfigLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500 font-semibold">
          <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading system configurations...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 shrink-0">
        {[
          { label: 'Total', count: statTotal, color: 'text-slate-800' },
          { label: 'Admins', count: statAdmin, color: 'text-amber-600' },
          { label: 'Clinic', count: statClinicStaff, color: 'text-blue-600' },
          { label: 'Students', count: statStudent, color: 'text-purple-600' },
          { label: 'Faculty', count: statFaculty, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-center gap-2 shadow-sm">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-sm font-medium text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1 w-full xl:w-auto">

            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input type="text" placeholder="Search by name, email, or ID..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm" />
            </div>

            <select value={currentFilter} onChange={e => setCurrentFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="all">All Roles</option>
              <option value="sysadmin">System Administrators</option>
              <option value="clinic_staff">Clinic Staff</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
            </select>

            <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="all">All Profile Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending Setup</option>
            </select>

            <select value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)} className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>

            <select value={sexFilter} onChange={e => setSexFilter(e.target.value)} className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="all">All Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="all">All Departments</option>
              {PLSP_OFFICES_FOR_STAFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={`${filterSelectCls} w-full sm:w-auto`}>
              <option value="asc">Name (A-Z)</option>
              <option value="desc">Name (Z-A)</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap items-center justify-end shrink-0">
           <button onClick={() => setShowCreateWizard(true)}
             className="bg-white hover:bg-slate-100 text-[#466460] border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
             </svg>
             <span className="hidden sm:inline">Add User</span>
           </button>

           <button onClick={fetchUsers}
             className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
             </svg>
             <span className="hidden sm:inline">Refresh</span>
           </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Name</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">University ID</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Role</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Department</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Sex</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Email</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Profile</th>
                <th className="bg-slate-50 text-right p-3 pr-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COL_COUNT} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading users...
                  </div>
                </td></tr>
              ) : paginatedUsers.length === 0 ? (
                <tr><td colSpan={COL_COUNT} className="text-center py-10 text-slate-400">No users found</td></tr>
              ) : paginatedUsers.map((user, idx) => (
                <tr key={user.id} className={`border-b border-slate-100 hover:bg-[#e0eceb]/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                    {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs md:text-sm shrink-0">
                        {getInitials(user)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700 text-sm whitespace-nowrap">{getFullName(user)}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px] md:max-w-xs">{user.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm font-mono text-slate-600 whitespace-nowrap">{user.university_id || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold" style={getRoleBadgeStyle(user.role)}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.department || '—'}</td>
                  <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.sex || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    {user.is_verified
                      ? <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-green-100 text-green-700">Verified</span>
                      : <div className="flex items-center gap-1">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-red-100 text-red-700">Unverified</span>
                          <button
                            onClick={() => resendVerificationEmail(user)}
                            disabled={resendingId === (user.uid || user.id)}
                            title="Resend verification email"
                            className="w-6 h-6 flex items-center justify-center rounded text-[#466460] hover:bg-[#e0eceb] transition disabled:opacity-50 disabled:cursor-wait"
                          >
                            {resendingId === (user.uid || user.id) ? (
                              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                            )}
                          </button>
                        </div>
                    }
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {user.profile_complete
                      ? <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-green-100 text-green-700">Active</span>
                      : <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700">Pending Setup</span>
                    }
                  </td>
                  <td className="p-3 pr-6 whitespace-nowrap">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => openEditModal(user)} title="Edit user"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#466460] bg-slate-50 hover:bg-[#e0eceb] transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8zM16.862 4.487L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => openDeleteModal(user)} title="Delete user"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-slate-50 hover:bg-red-50 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{filteredUsers.length === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-semibold">{filteredUsers.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              <div className="text-xs font-semibold px-2">
                Page {currentPage} of {Math.max(1, totalPages)}
              </div>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {showCreateWizard && configData && (
        <CreateUserModal
          onClose={() => setShowCreateWizard(false)}
          onCreated={() => fetchUsers()}
          showSnackbar={showSnackbar}
          configData={configData}
        />
      )}

      {showEditModal && editTarget && createPortal(
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-4 pt-4 md:pt-10" onClick={e => e.target === e.currentTarget && handleEditCloseRequest()}>
            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">
              <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">{getInitials(editTarget)}</div>
                <div className="overflow-hidden">
                  <h3 className="text-base font-bold truncate">Edit User — {getFullName(editTarget)}</h3>
                  <p className="text-xs text-white/70 mt-0.5 truncate">{editTarget.email}</p>
                </div>
                <button onClick={handleEditCloseRequest} className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={saveEdit} id="edit-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                    <div className="sm:col-span-2">
                      <div className={sectionHeadCls}>Account Information</div>
                    </div>
                    <div><label className={labelCls}>University ID</label><input className={inputCls} value={editForm.university_id} onChange={e => field('university_id', e.target.value)} required /></div>
                    <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={editForm.email} onChange={e => field('email', e.target.value)} required /></div>
                    <div className="flex flex-col">
                      <label className={labelCls}>New Password <span className="text-slate-400 font-normal">(leave blank to keep)</span></label>
                      <div className="relative">
                        <input className={inputCls} type={editShowPwd ? 'text' : 'password'} value={editForm.password || ''} onChange={e => field('password', e.target.value)} placeholder="Enter new password" />
                        <button type="button" onClick={() => setEditShowPwd(!editShowPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <EyeIcon open={editShowPwd} />
                        </button>
                      </div>
                      {editForm.password && <PasswordRequirements password={editForm.password} rules={configData.passwordRules} />}
                    </div>

                    <div className="sm:col-span-2">
                      <div className={sectionHeadCls}>Personal Information</div>
                    </div>
                    <div><label className={labelCls}>First Name</label><input className={inputCls} value={editForm.first_name} onChange={e => field('first_name', e.target.value)} required /></div>
                    <div><label className={labelCls}>Middle Name</label><input className={inputCls} value={editForm.middle_name} onChange={e => field('middle_name', e.target.value)} /></div>
                    <div><label className={labelCls}>Last Name</label><input className={inputCls} value={editForm.last_name} onChange={e => field('last_name', e.target.value)} required /></div>
                    <div>
                      <label className={labelCls}>Suffix</label>
                      <CustomSelect value={editForm.suffix} onChange={v => field('suffix', v)} options={['Jr.','Sr.','II','III','IV','V']} placeholder="None" />
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number</label>
                      <input
                        className={`${inputCls} ${phoneError ? 'border-red-400 bg-red-50' : ''}`}
                        value={editForm.phone_number}
                        onChange={e => handlePhoneChange(e.target.value)}
                        placeholder="11 digits (e.g. 09123456789)"
                        maxLength={11}
                      />
                      {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <div className={sectionHeadCls}>Role &amp; Work Information</div>
                    </div>
                    <div>
                      <label className={labelCls}>Role</label>
                      <CustomSelect value={editForm.role} onChange={handleRoleEditChange} options={getRoleOptions(configData)} grouped={true} placeholder="— Select Role —" />
                    </div>

                    {isStudent(editForm.role) && (
                      <>
                        <div>
                          <label className={labelCls}>Department</label>
                          <CustomSelect value={editForm.departmentAbbr} onChange={handleDeptChange} options={configData?.departments?.map(d => ({ value: d.abbr, label: d.abbr }))} />
                          {editForm.departmentAbbr && <p className="text-[10px] text-slate-400 mt-1">{deptAbbrToFull[editForm.departmentAbbr]}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Program</label>
                          <CustomSelect value={editForm.program} onChange={v => field('program', v)} options={programsByDeptAbbr[editForm.departmentAbbr] || []} disabled={!editForm.departmentAbbr} />
                        </div>
                      </>
                    )}

                    {(isFaculty(editForm.role, configData) || isClinicStaff(editForm.role, configData) || isAdmin(editForm.role, configData)) && (
                      <>
                        <div>
                          <label className={labelCls}>Department / Office</label>
                          <CustomSelect value={editForm.department} onChange={v => field('department', v)} options={PLSP_OFFICES_FOR_STAFF} placeholder="— Select Office —" />
                        </div>

                        <div>
                          <label className={labelCls}>Job Title</label>
                          <CustomSelect value={editForm.job_title} onChange={v => field('job_title', v)} options={uniqueJobTitles} placeholder="— Select Job Title —" />
                        </div>

                        {!isAdmin(editForm.role, configData) && (
                          <div>
                            <label className={labelCls}>Classification</label>
                            <CustomSelect value={editForm.classification} onChange={v => field('classification', v)} options={uniqueClassifications} placeholder="— Select Classification —" />
                          </div>
                        )}
                      </>
                    )}

                    <div className="sm:col-span-2">
                      <div className={sectionHeadCls}>Personal Details</div>
                    </div>
                    <div>
                      <label className={labelCls}>Birthday</label>
                      <DatePicker
                        value={editForm.birthday}
                        onChange={(val) => { field('birthday', val); field('age', calculateAge(val)); }}
                      />
                    </div>
                    <div><label className={labelCls}>Age</label><input className={`${inputCls} bg-slate-100`} value={editForm.age} readOnly /></div>
                    <div>
                      <label className={labelCls}>Sex</label>
                      <CustomSelect value={editForm.sex} onChange={v => field('sex', v)} options={['Male', 'Female']} />
                    </div>
                    <div>
                      <label className={labelCls}>Civil Status</label>
                      <CustomSelect value={editForm.civil_status} onChange={v => field('civil_status', v)} options={['Single','Married','Widowed','Divorced','Separated']} />
                    </div>
                    <div>
                      <label className={labelCls}>Blood Type</label>
                      <CustomSelect value={editForm.blood_type} onChange={v => field('blood_type', v)} options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} />
                    </div>
                    <div>
                      <label className={labelCls}>Religion</label>
                      <CustomSelect value={editForm.religion} onChange={v => field('religion', v)} options={['Roman Catholic','Islam','Iglesia ni Cristo','Seventh-day Adventist','Protestant','Born Again Christian','Buddhism','Hinduism','Other']} />
                    </div>
                    <div>
                      <label className={labelCls}>Nationality</label>
                      <CustomSelect value={editForm.nationality} onChange={v => field('nationality', v)} options={['Filipino','American','Chinese','Japanese','Korean','Indian','British','Australian','Canadian','Other']} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Home Address</label>
                      <div className="flex gap-2">
                        <input className={`${inputCls} bg-slate-50`} value={editForm.home_address} readOnly placeholder="Click to set address" />
                        <button type="button" onClick={() => setShowAddressModal(true)} className="px-3 py-2 bg-[#466460] text-white rounded-lg text-sm font-semibold hover:bg-[#3a524f] transition">
                          <i className="fa-solid fa-location-dot"></i>
                        </button>
                      </div>
                    </div>

                    {(editForm.role === 'student') && (
                      <>
                        <div className="sm:col-span-2">
                          <div className={sectionHeadCls}>Academic Information</div>
                        </div>
                        <div>
                          <label className={labelCls}>Year Level</label>
                          <CustomSelect value={editForm.year_level} onChange={v => field('year_level', v)} options={['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate']} />
                        </div>
                        <div>
                          <label className={labelCls}>Section</label>
                          <CustomSelect value={editForm.section} onChange={v => field('section', v)} options={configData?.sections || []} />
                        </div>
                        <div>
                          <label className={labelCls}>Student Classification</label>
                          <CustomSelect value={editForm.student_classification} onChange={v => field('student_classification', v)} options={STUDENT_CLASSIFICATIONS} />
                        </div>
                      </>
                    )}

                    <div className="sm:col-span-2">
                      <div className={sectionHeadCls}>Account Status</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Toggle checked={editForm.is_verified} onChange={() => field('is_verified', !editForm.is_verified)} />
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-700 truncate">Email Verified</span>
                            {!editTarget?.is_verified && (
                              <button
                                type="button"
                                onClick={() => resendVerificationEmail(editTarget)}
                                disabled={resendingId === (editTarget.uid || editTarget.id)}
                                className="text-[11px] text-[#466460] hover:text-[#3a524f] underline font-bold shrink-0 disabled:opacity-50 disabled:no-underline"
                              >
                                {resendingId === (editTarget.uid || editTarget.id) ? 'Sending...' : 'Resend Email'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Toggle checked={editForm.profile_complete} onChange={toggleProfileComplete} />
                          <span className="text-sm font-semibold text-slate-700 truncate">Profile Complete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button type="button" onClick={handleEditCloseRequest} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
                <button type="submit" form="edit-form" disabled={editSaving} className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition flex items-center justify-center gap-2 disabled:opacity-60">
                   {editSaving && <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                   {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <UnsavedChangesModal
            isOpen={showEditCloseConfirm}
            onCancel={() => setShowEditCloseConfirm(false)}
            onConfirm={() => {
              setShowEditCloseConfirm(false);
              setShowEditModal(false);
            }}
          />
        </>,
        document.body
      )}

      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          onConfirm={handleAddressConfirm}
          initialData={{
            addressStreet: editForm.home_address?.split(',')[0] || '',
            addressBarangay: '',
            addressCity: '',
            addressProvince: '',
            addressRegion: '',
          }}
        />
      )}

      {showDeleteModal && deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Archive User</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive <span className="font-semibold">{getFullName(deleteTarget)}</span>?
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Email: <span className="font-semibold">{deleteTarget?.email}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0a3 3 0 013 3h-2.25a3 3 0 013-3m0 0h.008v.008h-.008V14.25m0 0h2.25a3 3 0 003-3v-2.25a3 3 0 00-3-3H9.75a3 3 0 00-3 3v2.25a3 3 0 003 3h2.25z" />
                </svg>
                Archive
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-[100000] flex items-center gap-2 whitespace-nowrap shadow-xl ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success'
            ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          }
          {message.text}
        </div>
      )}

    </div>
  );
};

export default UserManagement;