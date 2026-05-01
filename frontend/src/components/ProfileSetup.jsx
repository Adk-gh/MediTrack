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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ProfileSetup = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [birthdayError, setBirthdayError] = useState('');
  const navigate = useNavigate();

  const rawRole = user?.role || 'student';
  const userRole = rawRole.toLowerCase();

  // --- Initial Form State ---
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    middleInitial: user?.middleInitial || '',
    lastName: user?.lastName || '',
    suffix: user?.suffix || '',
    birthday: '',
    age: '',
    gender: '',
    bloodType: '',
    studentId: user?.universityId || '',
    department: '',
    program: '',
    yearLevel: '1st Year',
    section: '',
    classification: getDefaultClassification(userRole),
    jobTitle: getDefaultJobTitle(userRole),
    email: user?.email || '',
    phoneNumber: '',
    emergencyName: '',
    emergencyPhone: ''
  });

  // --- Helpers for Dynamic Defaults ---
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

  // --- Auth Guard: Ensure token exists on mount ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn("No authentication token found. Redirecting to login.");
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

  const nextStep = () => {
    if (step === 1 && !formData.birthday) {
      setBirthdayError('Birthday is required.');
      return;
    }
    setBirthdayError('');
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

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
        alert("Session expired. Please log in again.");
        navigate('/login');
        return;
      }

      const payload = {
        ...formData,
        role: userRole,
        profileComplete: true, // Mark as finished in database
      };

      const response = await fetch(`${API_URL}/user/profile-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert("Invalid session. Please login again.");
        navigate('/login');
        return;
      }

      const result = await response.json();

      if (result.success) {
        // --- Sync Local Session ---
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, profileComplete: true }));
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

  const tabClass = (tabNum) =>
    `flex-1 text-center text-[11px] font-bold uppercase tracking-wider relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
      step === tabNum
        ? 'text-[#2d7a52] after:bg-[#2d7a52]'
        : 'text-[#9bb5a5] hover:text-[#6b8577] after:bg-[#e2f0ea]'
    }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[480px] p-8 overflow-hidden">
        
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-[#1a2e22]">Complete Your Profile</h1>
          <p className="text-sm text-[#6b8577] mt-1">Please provide your details to finish setting up.</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-between mb-6 px-1">
          <div className={tabClass(1)} onClick={() => setStep(1)}>Personal</div>
          <div className={tabClass(2)} onClick={() => setStep(2)}>
            {userRole === 'student' ? 'Academic' : 'Work'}
          </div>
          <div className={tabClass(3)} onClick={() => setStep(3)}>Contact</div>
        </div>

        <form onSubmit={handleSubmit} className="relative min-h-[380px] flex flex-col">
          
          {/* STEP 1: PERSONAL */}
          {step === 1 && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              <div className="grid grid-cols-12 gap-3 mb-[12px]">
                <div className="col-span-5 text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">First Name</label>
                  <input id="firstName" type="text" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="col-span-2 text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">M.I.</label>
                  <input id="middleInitial" type="text" maxLength="1" className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] text-center" value={formData.middleInitial} onChange={handleChange} />
                </div>
                <div className="col-span-5 text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Last Name</label>
                  <input id="lastName" type="text" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.lastName} onChange={handleChange} />
                </div>
              </div>

              <div className="text-left mb-[12px]">
                <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Suffix</label>
                <select id="suffix" className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.suffix} onChange={handleChange}>
                  <option value="">None</option>
                  {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-[12px]">
                <div className="text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Birthday <span className="text-red-500">*</span></label>
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
                    className={`w-full px-[16px] py-[10px] border-[1.5px] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] bg-white ${birthdayError ? 'border-red-400' : 'border-[#cbd5d1]'}`}
                    portalId="root-portal"
                  />
                  {birthdayError && <p className="text-red-500 text-[11px] mt-1 ml-2">{birthdayError}</p>}
                </div>
                <div className="text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Age</label>
                  <input id="age" type="number" readOnly className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-slate-50 outline-none" value={formData.age} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-[15px]">
                <div className="text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Sex</label>
                  <select id="gender" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.gender} onChange={handleChange}>
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="text-left">
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Blood Type</label>
                  <select id="bloodType" className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.bloodType} onChange={handleChange}>
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-auto pt-4 border-t border-slate-100">
                <button type="button" onClick={nextStep} className="w-[48%] py-[12px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a] transition-all">Next Step</button>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC / WORK */}
          {step === 2 && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              {userRole === 'student' ? (
                <>
                  <div className="text-left mb-[12px]">
                    <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Student No.</label>
                    <input id="studentId" type="text" placeholder="e.g. 23-11067" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.studentId} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-[12px]">
                    <div className="text-left">
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Department</label>
                      <select id="department" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.department} onChange={handleChange}>
                        <option value="" disabled>Select Dept</option>
                        {Object.keys(programsData).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div className="text-left">
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Program</label>
                      <select id="program" required disabled={!formData.department} className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d] disabled:bg-slate-50" value={formData.program} onChange={handleChange}>
                        <option value="" disabled>Select Program</option>
                        {formData.department && programsData[formData.department].map(prog => <option key={prog} value={prog}>{prog}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-[15px]">
                    <div className="text-left">
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Year Level</label>
                      <select id="yearLevel" className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.yearLevel} onChange={handleChange}>
                        {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map(yr => <option key={yr} value={yr}>{yr}</option>)}
                      </select>
                    </div>
                    <div className="text-left">
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Section</label>
                      <input id="section" type="text" placeholder="e.g. BSIT-1" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.section} onChange={handleChange} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left mb-[12px]">
                    <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Classification</label>
                    <select id="classification" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.classification} onChange={handleChange}>
                      <option value="Teaching Personnel">Teaching Personnel</option>
                      <option value="Nurse Personnel">Nurse Personnel</option>
                      <option value="Physician / Doctor">Physician / Doctor</option>
                      <option value="Administrator">Administrator</option>
                      <option value="Non-Teaching Personnel">Non-Teaching Personnel</option>
                      <option value="Security Personnel">Security Personnel</option>
                    </select>
                  </div>
                  <div className="text-left mb-[12px]">
                    <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Office/Department</label>
                    <select id="department" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-white outline-none focus:border-[#4a635d]" value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select Office</option>
                      {PLSP_OFFICES.map(off => <option key={off} value={off}>{off}</option>)}
                    </select>
                  </div>
                  <div className="text-left mb-[15px]">
                    <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Job Title</label>
                    <input id="jobTitle" type="text" placeholder="e.g. Associate Professor" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.jobTitle} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[12px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">Back</button>
                <button type="button" onClick={nextStep} className="w-[48%] py-[12px] rounded-[50px] text-[13px] font-bold bg-[#2d7a52] text-white hover:bg-[#1a5c3a]">Next Step</button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT */}
          {step === 3 && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              <div className="text-left mb-[12px]">
                <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Email Address</label>
                <input id="email" type="email" readOnly className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] bg-slate-50 outline-none" value={formData.email} />
              </div>
              <div className="text-left mb-[12px]">
                <label className="block text-[12px] font-bold text-[#64748b] uppercase mb-[4px] ml-[10px]">Phone Number</label>
                <input id="phoneNumber" type="tel" placeholder="09XXXXXXXXX" required pattern="[0-9]{11}" className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.phoneNumber} onChange={handleChange} />
              </div>
              <div className="bg-[#f4f7f5] p-4 rounded-2xl mb-[15px] border border-[#e2f0ea]">
                <h3 className="text-[11px] font-black text-[#1a5c3a] uppercase mb-3">Emergency Contact</h3>
                <div className="text-left mb-[10px]">
                  <input id="emergencyName" type="text" placeholder="Contact Name" required className="w-full px-[14px] py-[8px] border border-[#cbd5d1] rounded-[10px] text-[12px] outline-none" value={formData.emergencyName} onChange={handleChange} />
                </div>
                <div className="text-left">
                  <input id="emergencyPhone" type="tel" placeholder="Contact Number" required pattern="[0-9]{11}" className="w-full px-[14px] py-[8px] border border-[#cbd5d1] rounded-[10px] text-[12px] outline-none" value={formData.emergencyPhone} onChange={handleChange} />
                </div>
              </div>
              <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
                <button type="button" onClick={prevStep} className="w-[48%] py-[12px] rounded-[50px] text-[13px] font-bold border-[1.5px] border-[#cbd5d1] text-[#6b8577]">Back</button>
                <button type="submit" disabled={loading} className="w-[48%] py-[12px] rounded-[50px] text-[13px] font-bold bg-[#1a2e22] text-white hover:bg-black transition-all flex items-center justify-center">
                  {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> : 'Complete Setup'}
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