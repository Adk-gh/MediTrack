// frontend/src/features/admin-clinic/User-Management.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker';
import AddressModal from '../../components/AddressModal';

// ── Department data (mirrors ProfileSetup) ────────────────────────────────────
const departmentsData = [
  { abbr: 'CCSE', full: 'College of Computing Science and Engineering', programs: ['Bachelor of Science in Information Technology','Bachelor of Science in Information System','Bachelor of Science in Computer Engineering','Bachelor of Science in Industrial Engineering'] },
  { abbr: 'CBAM', full: 'College of Business Administration and Management', programs: ['Bachelor of Science in Entrepreneurship','Bachelor of Science in Public Administration','Bachelor of Science in Office Administration','Bachelor of Science in Business Administration Major in Human Resource Development Management','Bachelor of Science in Business Administration Major in Financial Management','Bachelor of Science in Business Administration Major in Marketing Management'] },
  { abbr: 'CAS',  full: 'College of Art and Sciences', programs: ['Bachelor of Science in Economics','Bachelor of Arts in Communication','Bachelor of Science in Psychology','Bachelor of Arts in Political Science'] },
  { abbr: 'CTHM', full: 'College of Tourism and Hospitality Management', programs: ['Bachelor of Science in Tourism Management','Bachelor of Science in Hospitality Management'] },
  { abbr: 'COA',  full: 'College of Accountancy', programs: ['Bachelor of Science in Accountancy','Bachelor of Science in Accountancy Information System','Bachelor of Science in Management Accounting'] },
  { abbr: 'CTE',  full: 'College of Teacher Education', programs: ['Bachelor of Secondary Education Major in English','Bachelor of Secondary Education Major in Filipino','Bachelor of Secondary Education Major in Math','Bachelor of Secondary Education Major in Science','Bachelor of Secondary Education Major in Social Studies','Bachelor of Elementary Education','Bachelor of Technical-Vocational Teacher Education','Bachelor of Special Needs Education'] },
  { abbr: 'CHK',  full: 'College of Human Kinetics', programs: ['Bachelor of Science in Physical Education','Bachelor of Science in Sports Science'] },
  { abbr: 'CNAHS',full: 'College of Nursing and Allied Health Sciences', programs: ['Bachelor of Science in Nursing'] },
];
const deptAbbrToFull     = Object.fromEntries(departmentsData.map(d => [d.abbr, d.full]));
const programsByDeptAbbr = Object.fromEntries(departmentsData.map(d => [d.abbr, d.programs]));

const NON_ACADEMIC_OFFICES = ['Accounting Office','University Clinic','Human Resources','Library','Maintenance','Registrar Office','Security Services'];
const PLSP_OFFICES_FOR_STAFF = [
  ...departmentsData.map(d => ({ label: d.abbr, value: d.full })),
  ...NON_ACADEMIC_OFFICES.map(o => ({ label: o, value: o })),
];

const CLINIC_ROLES = new Set(['doctor','nurse','dentist','staff','employee','midwife','pharmacist','medical technologist','radiologist','physical therapist','clinic staff']);
const FACULTY_ROLES = new Set(['instructor','lecturer','teacher','professor','dean','assistant professor','associate professor','department head','program chair','coordinator','faculty','clinical instructor','part-time instructor','part time instructor','visiting professor','adjunct professor','registrar','guidance counselor','counselor','librarian']);
const isClinicStaff = r => CLINIC_ROLES.has(r?.toLowerCase());
const isFaculty     = r => FACULTY_ROLES.has(r?.toLowerCase());
const isStudent     = r => r?.toLowerCase() === 'student';
const isAdmin       = r => ['sysadmin','administrator'].includes(r?.toLowerCase());

const CLASSIFICATION_MAP = {
  admin:'System Administrator', administrator:'System Administrator',
  nurse:'Nurse Personnel', doctor:'Physician / Doctor',
  staff:'Non-Teaching Personnel', employee:'Non-Teaching Personnel',
  librarian:'Non-Teaching Personnel', technician:'Non-Teaching Personnel',
  lecturer:'Teaching Personnel', professor:'Teaching Personnel',
  instructor:'Teaching Personnel', teacher:'Teaching Personnel',
  student:'Student',
};
const JOB_TITLE_MAP = {
  nurse:'Nurse', doctor:'Physician', admin:'SysAdmin', administrator:'SysAdmin',
  lecturer:'Lecturer', professor:'Professor', instructor:'Instructor',
  librarian:'Librarian', staff:'Staff',
};

const STUDENT_CLASSIFICATIONS = ['Regular','Irregular','Returning'];
const classificationColors = {
  Regular:   { bg: '#e8f5ef', text: '#1a5c3a', dot: '#2d7a52' },
  Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' },
  Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

const TOTAL_CREATE_STEPS = 4;
const CREATE_STEP_LABELS = ['Account', 'Personal', 'Role & Work', 'Settings'];

// ── Name Normalization ────────────────────────────────────────────────────────
// Normalize name: first letter capitalized, rest lowercase, no ALL CAPS
const normalizeName = (name) => {
  if (!name) return '';
  // Trim whitespace
  let trimmed = name.trim();
  // Convert to lowercase first, then capitalize first letter
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls  = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] bg-white";
const selectCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]";
const labelCls  = "block text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide";
const errInputCls = "border-red-400 focus:border-red-400 bg-red-50";

const EMPTY_CREATE = {
  first_name:'', middle_name:'', last_name:'', suffix:'',
  university_id:'', email:'', phone_number:'',
  password:'', confirm_password:'',
  role:'student',
  department:'', departmentAbbr:'', program:'',
  job_title:'', classification:'Student',
  birthday:'', age:'', sex:'', blood_type:'', civil_status:'Single',
  religion:'', nationality:'Filipino', home_address:'',
  year_level:'1st Year', section:'', student_classification:'Regular',
  is_verified:true, profile_complete:false,
};

// ─────────────────────────────────────────────────────────────────────────────
// EyeIcon
// ─────────────────────────────────────────────────────────────────────────────
const EyeIcon = ({ open }) => open
  ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/></svg>
  : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>;

// ─────────────────────────────────────────────────────────────────────────────
// RoleOptions (shared between Create wizard and Edit modal)
// ─────────────────────────────────────────────────────────────────────────────
const RoleOptions = () => (
  <>
    <optgroup label="Administration"><option value="admin">Administrator</option></optgroup>
    <optgroup label="Clinic Staff">
      <option value="doctor">Doctor</option><option value="nurse">Nurse</option>
      <option value="dentist">Dentist</option><option value="staff">Staff</option>
      <option value="midwife">Midwife</option><option value="pharmacist">Pharmacist</option>
      <option value="medical technologist">Medical Technologist</option>
      <option value="radiologist">Radiologist</option>
      <option value="physical therapist">Physical Therapist</option>
      <option value="clinic staff">Clinic Staff (General)</option>
    </optgroup>
    <optgroup label="Faculty">
      <option value="instructor">Instructor</option><option value="lecturer">Lecturer</option>
      <option value="teacher">Teacher</option><option value="professor">Professor</option>
      <option value="assistant professor">Assistant Professor</option>
      <option value="associate professor">Associate Professor</option>
      <option value="dean">Dean</option><option value="department head">Department Head</option>
      <option value="program chair">Program Chair</option>
      <option value="coordinator">Coordinator</option>
      <option value="clinical instructor">Clinical Instructor</option>
      <option value="part-time instructor">Part-time Instructor</option>
      <option value="visiting professor">Visiting Professor</option>
      <option value="adjunct professor">Adjunct Professor</option>
      <option value="registrar">Registrar</option>
      <option value="guidance counselor">Guidance Counselor</option>
      <option value="counselor">Counselor</option>
      <option value="librarian">Librarian</option>
      <option value="faculty">Faculty (General)</option>
    </optgroup>
    <optgroup label="Student"><option value="student">Student</option></optgroup>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// CreateUserModal (flat form, mirrors Records.jsx Add New Record style)
// ─────────────────────────────────────────────────────────────────────────────
const CreateUserModal = ({ onClose, onCreated, showSnackbar }) => {
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', suffix: '',
    university_id: '', email: '', phone_number: '', password: '',
    role: 'student',
    department: '', departmentAbbr: '', program: '',
    job_title: '', classification: 'Teaching Personnel',
    birthday: '', age: '', sex: '', blood_type: '', civil_status: 'Single',
    religion: '', nationality: 'Filipino', home_address: '',
    year_level: '1st Year', section: '', student_classification: 'Regular',
    is_verified: true, profile_complete: false,
  });

  const cf = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRoleChange = (val) => {
    setForm(f => ({
      ...f,
      role: val,
      classification: CLASSIFICATION_MAP[val?.toLowerCase()] || '',
      job_title: JOB_TITLE_MAP[val?.toLowerCase()] || '',
      department: '', departmentAbbr: '', program: '',
      year_level: '1st Year', section: '', student_classification: 'Regular',
    }));
  };

  const handleDeptChange = (val) => {
    setForm(f => ({
      ...f,
      departmentAbbr: val,
      department: deptAbbrToFull[val] || val,
      program: '',
    }));
  };

  const handleBirthdayChange = (val) => {
    const birth = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setForm(f => ({ ...f, birthday: val, age: String(age) }));
  };

  const availablePrograms = form.departmentAbbr ? (programsByDeptAbbr[form.departmentAbbr] || []) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.university_id) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    if (form.password.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('university_id', form.university_id).maybeSingle();
      if (existing) { showSnackbar('This University ID is already registered', 'error'); setLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-auth-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ email: form.email, password: form.password, firstName: normalizeName(form.first_name), lastName: normalizeName(form.last_name) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create auth user');

      const newUser = {
        uid: result.uid,
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
  const isFacultyRole = isFaculty(form.role);
  const isClinicRole  = isClinicStaff(form.role);
  const isAdminRole   = isAdmin(form.role);

  const secHead = "col-span-full text-[10px] font-black uppercase tracking-widest text-[#466460] border-b border-[#e0eceb] pb-1 mt-2";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
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
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} id="create-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

              {/* Account */}
              <div className={secHead}>Account</div>
              <div>
                <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                <input className={inputCls} type="email" value={form.email} autoComplete="off"
                  onChange={e => cf('email', e.target.value)} placeholder="user@example.com" required />
              </div>
              <div>
                <label className={labelCls}>Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input className={`${inputCls} pr-10`} type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                    value={form.password} onChange={e => cf('password', e.target.value)}
                    placeholder="Min. 6 characters" required />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460]">
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>

              {/* Identity */}
              <div className={secHead}>Identity</div>
              <div>
                <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.first_name}
                  onChange={e => cf('first_name', e.target.value)} placeholder="First name" required />
              </div>
              <div>
                <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.last_name}
                  onChange={e => cf('last_name', e.target.value)} placeholder="Last name" required />
              </div>
              <div>
                <label className={labelCls}>Middle Name</label>
                <input className={inputCls} value={form.middle_name}
                  onChange={e => cf('middle_name', e.target.value)} placeholder="Middle name" />
              </div>
              <div>
                <label className={labelCls}>Suffix</label>
                <select className={selectCls} value={form.suffix} onChange={e => cf('suffix', e.target.value)}>
                  <option value="">None</option>
                  {['Jr.','Sr.','II','III','IV','V'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Birthday</label>
                <input className={inputCls} type="date" value={form.birthday}
                  onChange={e => handleBirthdayChange(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Age</label>
                <input className={`${inputCls} bg-slate-50`} type="number" readOnly value={form.age} placeholder="Auto" />
              </div>
              <div>
                <label className={labelCls}>Sex</label>
                <select className={selectCls} value={form.sex} onChange={e => cf('sex', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Civil Status</label>
                <select className={selectCls} value={form.civil_status} onChange={e => cf('civil_status', e.target.value)}>
                  {['Single','Married','Widowed','Divorced','Separated'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Religion</label>
                <select className={selectCls} value={form.religion} onChange={e => cf('religion', e.target.value)}>
                  <option value="">— Select —</option>
                  {['Roman Catholic','Islam','Iglesia ni Cristo','Seventh-day Adventist','Protestant','Born Again Christian','Buddhism','Hinduism','Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nationality</label>
                <select className={selectCls} value={form.nationality} onChange={e => cf('nationality', e.target.value)}>
                  {['Filipino','American','Chinese','Japanese','Korean','Indian','British','Australian','Canadian','Other'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input className={inputCls} value={form.phone_number}
                  onChange={e => cf('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" />
              </div>

              {/* Role & Work */}
              <div className={secHead}>Role &amp; Work</div>
              <div>
                <label className={labelCls}>Role <span className="text-red-400">*</span></label>
                <select className={selectCls} value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                  <RoleOptions />
                </select>
              </div>
              <div>
                <label className={labelCls}>University ID <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.university_id}
                  onChange={e => cf('university_id', e.target.value)} placeholder="e.g. 2021-00001" required />
              </div>

              {/* Student fields */}
              {isStudentRole && (
                <>
                  <div>
                    <label className={labelCls}>Department <span className="text-red-400">*</span></label>
                    <select className={selectCls} value={form.departmentAbbr} onChange={e => handleDeptChange(e.target.value)}>
                      <option value="">— Select —</option>
                      {departmentsData.map(d => <option key={d.abbr} value={d.abbr}>{d.abbr}</option>)}
                    </select>
                    {form.departmentAbbr && <p className="text-[10px] text-slate-400 mt-1">{deptAbbrToFull[form.departmentAbbr]}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Program <span className="text-red-400">*</span></label>
                    <select className={`${selectCls} disabled:opacity-50`} value={form.program}
                      disabled={!form.departmentAbbr} onChange={e => cf('program', e.target.value)}>
                      <option value="">— Select —</option>
                      {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Year Level</label>
                    <select className={selectCls} value={form.year_level} onChange={e => cf('year_level', e.target.value)}>
                      {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(yr => <option key={yr} value={yr}>{yr}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Section</label>
                    <select className={selectCls} value={form.section} onChange={e => cf('section', e.target.value)}>
                      <option value="">— Select —</option>
                      {['A','B','C','D','E','F'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Student Classification</label>
                    <select className={selectCls} value={form.student_classification} onChange={e => cf('student_classification', e.target.value)}>
                      {['Regular','Irregular','Returning'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Faculty / Clinic / Admin fields */}
              {(isFacultyRole || isClinicRole || isAdminRole) && (
                <>
                  <div>
                    <label className={labelCls}>Department / Office {!isAdminRole && <span className="text-red-400">*</span>}</label>
                    <select className={selectCls} value={form.department} onChange={e => cf('department', e.target.value)}>
                      <option value="">— Select Office —</option>
                      {PLSP_OFFICES_FOR_STAFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
                    <input className={inputCls} value={form.job_title}
                      onChange={e => cf('job_title', e.target.value)} placeholder="e.g. Nurse, Professor" />
                  </div>
                  {!isAdminRole && (
                    <div>
                      <label className={labelCls}>Classification</label>
                      <select className={selectCls} value={form.classification} onChange={e => cf('classification', e.target.value)}>
                        {['Teaching Personnel','Non-Teaching Personnel','Nurse Personnel','Physician / Doctor','System Administrator'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Account Flags */}
              <div className={secHead}>Account Flags</div>
              {[
                { key: 'is_verified',      label: 'Mark as Email Verified',   desc: 'User can log in without verifying email.' },
                { key: 'profile_complete', label: 'Mark Profile as Complete', desc: 'Skips profile setup on first login.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <button type="button" onClick={() => cf(key, !form[key])}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${form[key] ? 'bg-[#466460]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
            Cancel
          </button>
          <button type="submit" form="create-form" disabled={loading}
            className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Creating…' : '✓ Create User'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main UserManagement component
// ─────────────────────────────────────────────────────────────────────────────
export const UserManagement = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchInput, setSearchInput]   = useState('');
  const [message, setMessage]           = useState(null);

  const [showEditModal, setShowEditModal]     = useState(false);
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
    is_verified:false, profile_complete:false,
  };
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchUsers(); }, []);

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

  const getFullName = (user) =>
    [user.first_name, user.middle_name || '', user.last_name, user.suffix || ''].filter(Boolean).join(' ') || '—';

  const getInitials = (user) =>
    ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U';

  const getRoleLabel = (role) => {
    const map = {
      admin:'Admin', administrator:'Admin', doctor:'Doctor', nurse:'Nurse',
      staff:'Staff', employee:'Staff', dentist:'Dentist', midwife:'Midwife',
      pharmacist:'Pharmacist', 'medical technologist':'Med. Technologist',
      radiologist:'Radiologist', 'physical therapist':'Physical Therapist',
      'clinic staff':'Clinic Staff', student:'Student', instructor:'Instructor',
      lecturer:'Lecturer', teacher:'Teacher', professor:'Professor', dean:'Dean',
      'assistant professor':'Asst. Professor', 'associate professor':'Assoc. Professor',
      'department head':'Dept. Head', 'program chair':'Program Chair',
      coordinator:'Coordinator', faculty:'Faculty', 'clinical instructor':'Clinical Instructor',
      'part-time instructor':'Part-time Instructor', 'visiting professor':'Visiting Professor',
      'adjunct professor':'Adjunct Professor', registrar:'Registrar',
      'guidance counselor':'Guidance Counselor', counselor:'Counselor', librarian:'Librarian',
    };
    return map[role?.toLowerCase()] || (role || '—');
  };

  const getRoleBadgeStyle = (role) => {
    const r = role?.toLowerCase();
    if (['sysadmin','administrator'].includes(r)) return { background: '#fef9c3', color: '#854d0e' };
    if (isClinicStaff(r)) return { background: '#dbeafe', color: '#1d4ed8' };
    if (r === 'student') return { background: '#f3e8ff', color: '#6b21a8' };
    if (isFaculty(r)) return { background: '#fff7ed', color: '#9a3412' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  const filteredUsers = users.filter(user => {
    const role = user.role?.toLowerCase();
    if (currentFilter === 'faculty') { if (!isFaculty(role)) return false; }
    else if (currentFilter === 'clinic_staff') { if (!isClinicStaff(role)) return false; }
    else if (currentFilter !== 'all') { if (role !== currentFilter) return false; }
    if (searchInput) {
      const s = searchInput.toLowerCase();
      return getFullName(user).toLowerCase().includes(s) || user.email?.toLowerCase().includes(s) || user.university_id?.toLowerCase().includes(s);
    }
    return true;
  });

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEditModal = (user) => {
    // Find department abbreviation from full name
    let foundDeptAbbr = '';
    for (const d of departmentsData) {
      if (d.full === user.department) {
        foundDeptAbbr = d.abbr;
        break;
      }
    }
    setEditTarget(user);
    setEditForm({
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
    });
    setPhoneError('');
    setEditShowPwd(false);
    setShowEditModal(true);
  };

  // Calculate age from birthday
  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return String(age);
  };

  // Handle phone number validation
  const handlePhoneChange = (value) => {
    // Allow only digits
    const cleaned = value.replace(/\D/g, '');
    setEditForm(f => ({ ...f, phone_number: cleaned }));
    if (cleaned.length > 0 && cleaned.length !== 11) {
      setPhoneError('Phone number must be exactly 11 digits');
    } else {
      setPhoneError('');
    }
  };

  // Handle department change
  const handleDeptChange = (val) => {
    setEditForm(f => ({
      ...f,
      departmentAbbr: val,
      department: deptAbbrToFull[val] || val,
      program: '',
    }));
  };

  // Handle address modal confirm
  const handleAddressConfirm = (addressData) => {
    const fullAddress = [
      addressData.addressStreet,
      addressData.addressBarangay,
      addressData.addressCity,
      addressData.addressProvince,
      addressData.addressRegion,
    ].filter(Boolean).join(', ');
    setEditForm(f => ({ ...f, home_address: fullAddress }));
    setShowAddressModal(false);
  };

  // Handle role change in edit modal
  const handleRoleEditChange = (val) => {
    setEditForm(f => ({
      ...f,
      role: val,
      classification: CLASSIFICATION_MAP[val?.toLowerCase()] || '',
      job_title: JOB_TITLE_MAP[val?.toLowerCase()] || '',
    }));
  };

  const field = (key, value) => setEditForm(f => ({ ...f, [key]: value }));

  const saveEdit = async (e) => {
    e.preventDefault();

    // Validate phone number if provided
    if (editForm.phone_number && editForm.phone_number.length !== 11) {
      showSnackbar('Phone number must be exactly 11 digits', 'error');
      setPhoneError('Phone number must be exactly 11 digits');
      return;
    }

    try {
      // Prepare payload - remove empty password to keep existing
      const { password, first_name, middle_name, last_name, ...payloadWithoutPassword } = editForm;
      const payload = {
        ...payloadWithoutPassword,
        // Normalize names: first letter capitalized, rest lowercase
        first_name: normalizeName(first_name),
        middle_name: normalizeName(middle_name),
        last_name: normalizeName(last_name),
        age: editForm.age === '' ? null : Number(editForm.age),
        updated_at: new Date().toISOString(),
        // Only include password if it's not empty
        ...(editForm.password ? { newPassword: editForm.password } : {})
      };
      console.log('Saving payload via API:', payload);

      const token = localStorage.getItem('token');

      // Use backend API to update user (bypasses RLS)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/admin-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: editTarget.uid,
          ...payload
        })
      });
      const result = await response.json();
      console.log('API Response:', result);

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update user');
      }

      // Update local state with the result - convert camelCase to snake_case
      if (result.data) {
        const updatedUser = {
          ...result.data,
          // Convert camelCase to snake_case for frontend display
          first_name: result.data.firstName,
          middle_name: result.data.middleName,
          last_name: result.data.lastName,
          university_id: result.data.universityId,
          phone_number: result.data.phoneNumber,
          job_title: result.data.jobTitle,
          blood_type: result.data.bloodType,
          civil_status: result.data.civilStatus,
          home_address: result.data.homeAddress,
          year_level: result.data.yearLevel,
          student_classification: result.data.studentClassification,
          is_verified: result.data.isVerified,
          profile_complete: result.data.profileComplete,
        };
        setUsers(users.map(u => u.uid === editTarget.uid ? { ...u, ...updatedUser } : u));
      }
      showSnackbar('User updated successfully', 'success');
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating user:', err);
      showSnackbar('Error updating user: ' + (err.message || ''), 'error');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDeleteModal = (user) => { setDeleteTarget(user); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Get current user info for deleted_by
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = localStorage.getItem('name') || '';

      // Set is_archived to true instead of deleting
      const { error } = await supabase.from('users').update({
        is_archived: true,
        deleted_by: name || user.email || 'Admin',
        updated_at: new Date().toISOString()
      }).eq('uid', deleteTarget.uid);
      if (error) throw error;
      setUsers(users.filter(u => u.uid !== deleteTarget.uid));
      showSnackbar('User archived successfully. You can restore them from the Archives page.', 'success');
    } catch (err) {
      console.error('Error archiving user:', err);
      showSnackbar('Error archiving user', 'error');
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const showSnackbar = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statTotal       = users.length;
  const statAdmin       = users.filter(u => ['sysadmin','administrator'].includes(u.role?.toLowerCase())).length;
  const statClinicStaff = users.filter(u => isClinicStaff(u.role)).length;
  const statStudent     = users.filter(u => u.role?.toLowerCase() === 'student').length;
  const statFaculty     = users.filter(u => isFaculty(u.role)).length;

  const sectionHeadCls = "col-span-full text-[10px] font-black uppercase tracking-widest text-[#466460] border-b border-[#e0eceb] pb-1 mt-2";

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Top Section */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">User Management</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreateWizard(true)}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add User</span>
            </button>
            <button onClick={fetchUsers}
              className="bg-white hover:bg-slate-100 text-[#466460] border border-slate-200 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Users',    value: statTotal },
            { label: 'System Administrators', value: statAdmin },
            { label: 'Clinic Staff',   value: statClinicStaff },
            { label: 'Students',       value: statStudent },
            { label: 'Faculty',        value: statFaculty },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-2 truncate">{label}</div>
              <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <select value={currentFilter} onChange={e => setCurrentFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm">
            <option value="all">All Roles</option>
            <option value="sysadmin">System Administrators</option>
            <option value="clinic_staff">Clinic Staff</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
          </select>
          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" placeholder="Search by name, email, or ID..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Name','University ID','Role','Department','Sex','Status','Actions'].map(h => (
                  <th key={h} className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading users...
                  </div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No users found</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-[#e0eceb]/40 transition-colors">
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
                    {user.profile_complete
                      ? <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-green-100 text-green-700">Active</span>
                      : <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700">Pending Setup</span>
                    }
                  </td>
                  <td className="p-3 pr-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
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
      </div>

      {/* Create Wizard */}
      {showCreateWizard && (
        <CreateUserModal
          onClose={() => setShowCreateWizard(false)}
          onCreated={user => setUsers(prev => [user, ...prev])}
          showSnackbar={showSnackbar}
        />
      )}

      {/* ── Edit Modal (same structure as Create) ── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">{getInitials(editTarget)}</div>
              <div className="overflow-hidden">
                <h3 className="text-base font-bold truncate">Edit User — {getFullName(editTarget)}</h3>
                <p className="text-xs text-white/70 mt-0.5 truncate">{editTarget.email}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={saveEdit} id="edit-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                  {/* Account Section */}
                  <div className="sm:col-span-2">
                    <div className={sectionHeadCls}>Account Information</div>
                  </div>
                  <div><label className={labelCls}>University ID</label><input className={inputCls} value={editForm.university_id} onChange={e => field('university_id', e.target.value)} required /></div>
                  <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={editForm.email} onChange={e => field('email', e.target.value)} required /></div>
                  <div>
                    <label className={labelCls}>New Password <span className="text-slate-400 font-normal">(leave blank to keep)</span></label>
                    <div className="relative">
                      <input className={inputCls} type={editShowPwd ? 'text' : 'password'} value={editForm.password || ''} onChange={e => field('password', e.target.value)} placeholder="Enter new password" />
                      <button type="button" onClick={() => setEditShowPwd(!editShowPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <EyeIcon open={editShowPwd} />
                      </button>
                    </div>
                  </div>

                  {/* Identity Section */}
                  <div className="sm:col-span-2">
                    <div className={sectionHeadCls}>Personal Information</div>
                  </div>
                  <div><label className={labelCls}>First Name</label><input className={inputCls} value={editForm.first_name} onChange={e => field('first_name', e.target.value)} required /></div>
                  <div><label className={labelCls}>Middle Name</label><input className={inputCls} value={editForm.middle_name} onChange={e => field('middle_name', e.target.value)} /></div>
                  <div><label className={labelCls}>Last Name</label><input className={inputCls} value={editForm.last_name} onChange={e => field('last_name', e.target.value)} required /></div>
                  <div><label className={labelCls}>Suffix</label><input className={inputCls} value={editForm.suffix} onChange={e => field('suffix', e.target.value)} placeholder="e.g. Jr., III" /></div>
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

                  {/* Role & Work Section */}
                  <div className="sm:col-span-2">
                    <div className={sectionHeadCls}>Role &amp; Work Information</div>
                  </div>
                  <div><label className={labelCls}>Role</label><select className={selectCls} value={editForm.role} onChange={e => handleRoleEditChange(e.target.value)}><RoleOptions /></select></div>
                  <div><label className={labelCls}>Job Title</label><input className={inputCls} value={editForm.job_title} onChange={e => field('job_title', e.target.value)} /></div>
                  <div><label className={labelCls}>Classification</label><input className={inputCls} value={editForm.classification} onChange={e => field('classification', e.target.value)} /></div>
                  <div><label className={labelCls}>Department / Office</label>
                    <select className={selectCls} value={editForm.departmentAbbr} onChange={e => handleDeptChange(e.target.value)}>
                      <option value="">— Select —</option>
                      {departmentsData.map(d => <option key={d.abbr} value={d.abbr}>{d.full}</option>)}
                      {NON_ACADEMIC_OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Program / Unit</label>
                    <select className={selectCls} value={editForm.program} onChange={e => field('program', e.target.value)} disabled={!editForm.departmentAbbr}>
                      <option value="">— Select —</option>
                      {(programsByDeptAbbr[editForm.departmentAbbr] || []).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Personal Details Section */}
                  <div className="sm:col-span-2">
                    <div className={sectionHeadCls}>Personal Details</div>
                  </div>
                  <div>
                    <label className={labelCls}>Birthday</label>
                    <DatePicker
                      value={editForm.birthday}
                      onChange={(val) => {
                        field('birthday', val);
                        field('age', calculateAge(val));
                      }}
                    />
                  </div>
                  <div><label className={labelCls}>Age</label><input className={`${inputCls} bg-slate-100`} value={editForm.age} readOnly /></div>
                  <div><label className={labelCls}>Sex</label><select className={selectCls} value={editForm.sex} onChange={e => field('sex', e.target.value)}><option value="">— Select —</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  <div><label className={labelCls}>Civil Status</label><select className={selectCls} value={editForm.civil_status} onChange={e => field('civil_status', e.target.value)}><option value="">— Select —</option>{['Single','Married','Widowed','Divorced','Separated'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className={labelCls}>Blood Type</label><select className={selectCls} value={editForm.blood_type} onChange={e => field('blood_type', e.target.value)}><option value="">— Select —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className={labelCls}>Religion</label><select className={selectCls} value={editForm.religion} onChange={e => field('religion', e.target.value)}><option value="">— Select —</option>{['Roman Catholic','Islam','Iglesia ni Cristo','Seventh-day Adventist','Protestant','Born Again Christian','Buddhism','Hinduism','Other'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className={labelCls}>Nationality</label><select className={selectCls} value={editForm.nationality} onChange={e => field('nationality', e.target.value)}><option value="">— Select —</option>{['Filipino','American','Chinese','Japanese','Korean','Indian','British','Australian','Canadian','Other'].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Home Address</label>
                    <div className="flex gap-2">
                      <input className={`${inputCls} bg-slate-50`} value={editForm.home_address} readOnly placeholder="Click to set address" />
                      <button type="button" onClick={() => setShowAddressModal(true)} className="px-3 py-2 bg-[#466460] text-white rounded-lg text-sm font-semibold hover:bg-[#3a524f] transition">
                        <i className="fa-solid fa-location-dot"></i>
                      </button>
                    </div>
                  </div>

                  {/* Academic Section - Only show for students */}
                  {(editForm.role === 'student') && (
                    <>
                      <div className="sm:col-span-2">
                        <div className={sectionHeadCls}>Academic Information</div>
                      </div>
                      <div><label className={labelCls}>Year Level</label><select className={selectCls} value={editForm.year_level} onChange={e => field('year_level', e.target.value)}><option value="">— Select —</option>{['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(yr => <option key={yr} value={yr}>{yr}</option>)}</select></div>
                      <div><label className={labelCls}>Section</label><select className={selectCls} value={editForm.section} onChange={e => field('section', e.target.value)}><option value="">— Select —</option>{['A','B','C','D','E','F'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                      <div><label className={labelCls}>Student Classification</label><select className={selectCls} value={editForm.student_classification} onChange={e => field('student_classification', e.target.value)}><option value="">— Select —</option>{STUDENT_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </>
                  )}

                  {/* Account Flags */}
                  <div className="sm:col-span-2">
                    <div className={sectionHeadCls}>Account Status</div>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => field('is_verified', !editForm.is_verified)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editForm.is_verified ? 'bg-[#466460]' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.is_verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Email Verified</span>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => field('profile_complete', !editForm.profile_complete)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editForm.profile_complete ? 'bg-[#466460]' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.profile_complete ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Profile Complete</span>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
              <button type="submit" form="edit-form" className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Address Modal for Edit ── */}
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

      {/* ── Delete Modal ── */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 px-6 py-5 text-white rounded-t-2xl flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="text-lg font-bold">Archive User</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm md:text-base mb-5">
                Are you sure you want to archive <strong>{getFullName(deleteTarget)}</strong>? You can restore them later from the Archives page.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-700 transition">Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Snackbar ── */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
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