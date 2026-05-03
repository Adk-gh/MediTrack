// frontend/src/components/ProfileSetup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// --- PLSP Department Data ---
const programsData = {
  'CCSE': ['BS Computer Engineering', 'BS Information Technology', 'BS Industrial Engineering', 'BS Information Systems'],
  'CTED': ['Elem. Education', 'Secondary Education'],
  'CTHM': ['Hospitality Mgmt.', 'Tourism Mgmt.'],
  'CAS': ['BS Psychology', 'BA Communication'],
  'CBA': ['Business Admin', 'Accountancy'],
  'CHK': ['Physical Education', 'Sports Science'],
  'COA': ['BS Agriculture'],
  'CNAS': ['BS Nursing', 'BS Biology']
};

const PLSP_OFFICES = [
  ...Object.keys(programsData),
  "Accounting Office", "Human Resources", "Library",
  "Maintenance", "Registrar Office", "Security Services"
];

const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

const RELIGIONS = [
  'Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist',
  'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'
];

const NATIONALITIES = [
  'Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian',
  'British', 'Australian', 'Canadian', 'Other'
];

const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];

const EMERGENCY_RELATIONSHIPS = [
  'Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent',
  'Relative', 'Guardian', 'Friend', 'Other'
];

const VACCINE_DOSES = [
  { key: 'dose1',    label: 'Dose 1' },
  { key: 'dose2',    label: 'Dose 2' },
  { key: 'booster1', label: 'Booster 1' },
  { key: 'booster2', label: 'Booster 2' },
];

const COVID_VACCINES = [
  'Pfizer-BioNTech (Comirnaty)',
  'Moderna (Spikevax)',
  'AstraZeneca (Vaxzevria/Covishield)',
  'Sinovac (CoronaVac)',
  'Johnson & Johnson (Janssen)',
  'Novavax (Nuvaxovid)',
  'Sputnik V',
  'Sinopharm (BBIBP-CorV)',
  'Other COVID-19 Vaccine',
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOTAL_STEPS = 5;


function getDefaultClassification(role) {
  if (role === 'admin' || role === 'administrator') return 'Administrator';
  if (role === 'nurse') return 'Nurse Personnel';
  if (role === 'doctor') return 'Physician / Doctor';
  if (role === 'staff' || role === 'employee') return 'Non-Teaching Personnel';
  return 'Teaching Personnel';
}

function getDefaultJobTitle(role) {
  if (role === 'nurse') return 'Nurse';
  if (role === 'doctor') return 'Physician';
  if (role === 'admin' || role === 'administrator') return 'Administrator';
  return '';
}

const ProfileSetup = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [birthdayError, setBirthdayError] = useState('');
  const navigate = useNavigate();

  const rawRole = user?.role || 'student';
  const userRole = rawRole.toLowerCase();

  const [formData, setFormData] = useState({
    // STEP 1 – Personal
    firstName: user?.firstName || '',
    middleInitial: user?.middleInitial || '',
    lastName: user?.lastName || '',
    suffix: user?.suffix || '',
    birthday: '',
    age: '',
    sex: '',
    bloodType: '',
    // STEP 1 (extra) – Identity
    homeAddress: '',
    religion: '',
    nationality: 'Filipino',
    civilStatus: 'Single',

    // STEP 2 – Academic / Work
    universityId: user?.universityId || '',
    department: '',
    program: '',
    yearLevel: '1st Year',
    section: '',
    classification: getDefaultClassification(userRole),
    jobTitle: getDefaultJobTitle(userRole),

    // STEP 3 – Contact
    email: user?.email || '',
    phoneNumber: '',

    // STEP 4 – Emergency Contact
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyAddress: '',

    // STEP 5 – COVID-19 Vaccination (fixed doses, all optional)
    vaccinations: {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  });

  // --- Auth Guard ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === 'birthday') {
      const birthDate = new Date(value);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
      setFormData(prev => ({ ...prev, birthday: value, age: calculatedAge.toString() }));
      setBirthdayError('');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [id]: value,
      ...(id === 'department' && userRole === 'student' && { program: '' })
    }));
  };

  // Vaccination field handler (fixed doses)
  const handleVaccineChange = (doseKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      vaccinations: {
        ...prev.vaccinations,
        [doseKey]: { ...prev.vaccinations[doseKey], [field]: value },
      },
    }));
  };

  const nextStep = () => {
    if (step === 1 && !formData.birthday) {
      setBirthdayError('Birthday is required.');
      return;
    }
    setBirthdayError('');
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.birthday) {
      setBirthdayError('Birthday is required.');
      setStep(1);
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

      // Build the payload — all fields go to Firestore
      const payload = {
        // Personal
        firstName: formData.firstName,
        middleInitial: formData.middleInitial,
        lastName: formData.lastName,
        suffix: formData.suffix,
        birthday: formData.birthday,
        age: formData.age,
        sex: formData.sex,
        bloodType: formData.bloodType,
        homeAddress: formData.homeAddress,
        religion: formData.religion,
        nationality: formData.nationality,
        civilStatus: formData.civilStatus,

        // Academic / Work
       universityId: formData.universityId,
        department: formData.department,
        program: formData.program,
        yearLevel: formData.yearLevel,
        section: formData.section,
        classification: formData.classification,
        jobTitle: formData.jobTitle,

        // Contact
        email: formData.email,
        phoneNumber: formData.phoneNumber,

        // Emergency Contact
        emergencyContact: {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
          address: formData.emergencyAddress,
        },

        // Vaccination History (COVID-19) — store as object keyed by dose
        vaccinations: formData.vaccinations,

        role: userRole,
        // Both flags kept in sync — service treats isProfileSetup as source of truth
        isProfileSetup: true,
        profileComplete: true,
      };

      console.log('[ProfileSetup] Submitting payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/user/profile-setup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
        localStorage.setItem('user', JSON.stringify({ 
          ...storedUser, 
          isProfileSetup: true,
          profileComplete: true,
        }));
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

  // Step labels
  const STEP_LABELS = ['Personal', userRole === 'student' ? 'Academic' : 'Work', 'Contact', 'Emergency', 'Vaccination'];

  const tabClass = (tabNum) =>
    `flex-1 text-center text-[10px] font-bold uppercase tracking-wider relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
      step === tabNum
        ? 'text-[#2d7a52] after:bg-[#2d7a52]'
        : step > tabNum
        ? 'text-[#2d7a52]/60 after:bg-[#2d7a52]/30'
        : 'text-[#9bb5a5] hover:text-[#6b8577] after:bg-[#e2f0ea]'
    }`;

  // Shared input / select classes
  const inputCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white";
  const selectCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] bg-white outline-none focus:border-[#4a635d]";
  const labelCls = "block text-[11px] font-bold text-[#64748b] uppercase mb-[4px] ml-[2px]";

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

        {/* Tabs */}
        <div className="flex justify-between mb-5 px-1 gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={tabClass(i + 1)} onClick={() => setStep(i + 1)}>{label}</div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative flex flex-col">

          {/* ─── STEP 1: PERSONAL + IDENTITY ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              {/* Name row */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className={labelCls}>First Name *</label>
                  <input id="firstName" type="text" required className={inputCls} value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>M.I.</label>
                  <input id="middleInitial" type="text" maxLength="1" className={`${inputCls} text-center`} value={formData.middleInitial} onChange={handleChange} />
                </div>
                <div className="col-span-5">
                  <label className={labelCls}>Last Name *</label>
                  <input id="lastName" type="text" required className={inputCls} value={formData.lastName} onChange={handleChange} />
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
                  <label className={labelCls}>Birthday *</label>
                  <DatePicker
                    selected={formData.birthday ? new Date(formData.birthday) : null}
                    onChange={(date) => {
                      if (date) {
                        const offset = date.getTimezoneOffset();
                        const localDate = new Date(date.getTime() - offset * 60 * 1000);
                        handleChange({ target: { id: 'birthday', value: localDate.toISOString().split('T')[0] } });
                      } else {
                        handleChange({ target: { id: 'birthday', value: '' } });
                      }
                    }}
                    dateFormat="MMMM d, yyyy"
                    showMonthDropdown showYearDropdown dropdownMode="select"
                    maxDate={new Date()}
                    placeholderText="Select birthday"
                    className={`${inputCls} ${birthdayError ? 'border-red-400' : ''}`}
                    portalId="root-portal"
                  />
                  {birthdayError && <p className="text-red-500 text-[11px] mt-1 ml-1">{birthdayError}</p>}
                </div>
                <div>
                  <label className={labelCls}>Age</label>
                  <input id="age" type="number" readOnly className={`${inputCls} bg-slate-50`} value={formData.age} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Sex *</label>
                  <select id="sex" required className={selectCls} value={formData.sex} onChange={handleChange}>
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
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
                <button type="button" onClick={nextStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a] transition-all">Next Step →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: ACADEMIC / WORK ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              {userRole === 'student' ? (
                <>
                  <div>
                    <label className={labelCls}>Student No. *</label>
                   <input id="universityId" type="text" placeholder="e.g. 23-11067" required className={inputCls} value={formData.universityId} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Department *</label>
                      <select id="department" required className={selectCls} value={formData.department} onChange={handleChange}>
                        <option value="" disabled>Select Dept</option>
                        {Object.keys(programsData).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Program *</label>
                      <select id="program" required disabled={!formData.department} className={`${selectCls} disabled:bg-slate-50`} value={formData.program} onChange={handleChange}>
                        <option value="" disabled>Select Program</option>
                        {formData.department && programsData[formData.department].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Year Level</label>
                      <select id="yearLevel" className={selectCls} value={formData.yearLevel} onChange={handleChange}>
                        {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map(yr => <option key={yr} value={yr}>{yr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Section *</label>
                      <input id="section" type="text" placeholder="e.g. BSIT-1" required className={inputCls} value={formData.section} onChange={handleChange} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Classification *</label>
                    <select id="classification" required className={selectCls} value={formData.classification} onChange={handleChange}>
                      {['Teaching Personnel', 'Nurse Personnel', 'Physician / Doctor', 'Administrator', 'Non-Teaching Personnel', 'Security Personnel'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Office / Department *</label>
                    <select id="department" required className={selectCls} value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select Office</option>
                      {PLSP_OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Job Title *</label>
                    <input id="jobTitle" type="text" placeholder="e.g. Associate Professor" required className={inputCls} value={formData.jobTitle} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">← Back</button>
                <button type="button" onClick={nextStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a]">Next Step →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: CONTACT ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              <div>
                <label className={labelCls}>Email Address</label>
                <input id="email" type="email" readOnly className={`${inputCls} bg-slate-50 text-slate-500`} value={formData.email} />
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  required
                  pattern="[0-9]{11}"
                  className={inputCls}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">← Back</button>
                <button type="button" onClick={nextStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a]">Next Step →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: EMERGENCY CONTACT ─── */}
          {step === 4 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              <div className="bg-[#f4f7f5] p-4 rounded-2xl border border-[#e2f0ea]">
                <h3 className="text-[11px] font-black text-[#1a5c3a] uppercase mb-3 tracking-widest">Emergency Contact Information</h3>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input
                      id="emergencyName"
                      type="text"
                      placeholder="Contact person's full name"
                      required
                      className={inputCls}
                      value={formData.emergencyName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Relationship *</label>
                      <select id="emergencyRelationship" required className={selectCls} value={formData.emergencyRelationship} onChange={handleChange}>
                        <option value="" disabled>Select</option>
                        {EMERGENCY_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number *</label>
                      <input
                        id="emergencyPhone"
                        type="tel"
                        placeholder="09XXXXXXXXX"
                        required
                        pattern="[0-9]{11}"
                        className={inputCls}
                        value={formData.emergencyPhone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Address</label>
                    <input
                      id="emergencyAddress"
                      type="text"
                      placeholder="Emergency contact's home address"
                      className={inputCls}
                      value={formData.emergencyAddress}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">← Back</button>
                <button type="button" onClick={nextStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a]">Next Step →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: COVID-19 VACCINATION HISTORY ─── */}
          {step === 5 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              <div className="bg-[#f4f7f5] p-4 rounded-2xl border border-[#e2f0ea]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[11px] font-black text-[#1a5c3a] uppercase tracking-widest">COVID-19 Vaccination History</h3>
                    <p className="text-[10px] text-[#6b8577] mt-0.5">All fields are optional — leave blank if not applicable.</p>
                  </div>
                  <span className="bg-[#d1ead9] text-[#1a5c3a] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full">Optional</span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                  <div className="col-span-3 text-[10px] font-bold text-[#64748b] uppercase">Dose</div>
                  <div className="col-span-5 text-[10px] font-bold text-[#64748b] uppercase">Vaccine Brand</div>
                  <div className="col-span-4 text-[10px] font-bold text-[#64748b] uppercase">Date Given</div>
                </div>

                <div className="flex flex-col gap-2">
                  {VACCINE_DOSES.map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-12 gap-2 items-center">
                      {/* Dose Label (fixed, not editable) */}
                      <div className="col-span-3">
                        <div className="px-[10px] py-[8px] bg-white border border-[#cbd5d1] rounded-[10px] text-[11px] font-semibold text-[#1a5c3a] text-center">
                          {label}
                        </div>
                      </div>

                      {/* COVID Vaccine Dropdown */}
                      <div className="col-span-5">
                        <select
                          className="w-full px-[8px] py-[8px] border border-[#cbd5d1] rounded-[10px] text-[11px] bg-white outline-none focus:border-[#4a635d]"
                          value={formData.vaccinations[key].vaccineName}
                          onChange={e => handleVaccineChange(key, 'vaccineName', e.target.value)}
                        >
                          <option value="">— not yet —</option>
                          {COVID_VACCINES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>

                      {/* Date */}
                      <div className="col-span-4">
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-[8px] py-[8px] border border-[#cbd5d1] rounded-[10px] text-[11px] bg-white outline-none focus:border-[#4a635d]"
                          value={formData.vaccinations[key].date}
                          onChange={e => handleVaccineChange(key, 'date', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[11px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">← Back</button>
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