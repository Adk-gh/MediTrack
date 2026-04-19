// frontend/src/components/HealthProfileSetup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

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

const HealthProfileSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', studentId: '', age: '', gender: '',
    department: '', program: '', yearLevel: '1st Year', section: '',
    email: '', emergencyName: '', emergencyPhone: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
      // Automatically reset the program field if the user changes their department
      ...(id === 'department' && { program: '' })
    }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Submitting Health Profile:", formData);
      alert("Health Profile Submitted Successfully!");
      setTimeout(() => navigate('/dashboard'), 1000); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for tab styling
  const tabClass = (tabNum) => `flex-1 text-center text-[12px] relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
    step === tabNum ? 'text-[#4a635d] font-bold after:bg-[#4a635d]' : 'text-[#666] after:bg-[#cbd5d1]'
  }`;

  return (
    <AuthLayout title="Health Registration" widthClass="max-w-[420px]">
      
      {/* Tabs */}
      <div className="flex justify-between mb-[20px] px-2">
        <div className={tabClass(1)} onClick={() => setStep(1)}>Personal</div>
        <div className={tabClass(2)} onClick={() => setStep(2)}>Academic</div>
        <div className={tabClass(3)} onClick={() => setStep(3)}>Contact</div>
      </div>

      <form onSubmit={handleSubmit} className="relative min-h-[360px] flex flex-col">
        
        {/* === STEP 1: PERSONAL === */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease-in-out] flex-1">
            
            <div className="text-left mb-[12px]">
              <label htmlFor="fullName" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Full Name</label>
              <input id="fullName" type="text" placeholder="Last Name, First Name M.I." required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.fullName} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-[12px]">
              <div className="text-left">
                <label htmlFor="studentId" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Student No.</label>
                <input id="studentId" type="text" placeholder="e.g. 23-11067" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.studentId} onChange={handleChange} />
              </div>
              <div className="text-left">
                <label htmlFor="age" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Age</label>
                <input id="age" type="number" placeholder="20" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.age} onChange={handleChange} />
              </div>
            </div>

            <div className="text-left mb-[20px]">
              <label htmlFor="gender" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Gender</label>
              <select id="gender" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] bg-white" value={formData.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
              <div></div>
              <button type="button" onClick={nextStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#557a5b] text-white hover:opacity-90 transition-opacity">Next</button>
            </div>
          </div>
        )}

        {/* === STEP 2: ACADEMIC === */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease-in-out] flex-1 flex flex-col">
            
            <div className="grid grid-cols-2 gap-3 mb-[12px]">
              <div className="text-left">
                <label htmlFor="department" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Department</label>
                <select id="department" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] bg-white" value={formData.department} onChange={handleChange}>
                  <option value="">Select Dept</option>
                  {Object.keys(programsData).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="text-left">
                <label htmlFor="program" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Program</label>
                <select id="program" required disabled={!formData.department} className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] bg-white disabled:bg-slate-50" value={formData.program} onChange={handleChange}>
                  <option value="">Select Program</option>
                  {formData.department && programsData[formData.department].map(prog => (
                    <option key={prog} value={prog}>{prog}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-[20px]">
              <div className="text-left">
                <label htmlFor="yearLevel" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Year Level</label>
                <select id="yearLevel" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d] bg-white" value={formData.yearLevel} onChange={handleChange}>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div className="text-left">
                <label htmlFor="section" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Section</label>
                <input id="section" type="text" placeholder="e.g. BSIT-1" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.section} onChange={handleChange} />
              </div>
            </div>

            <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
              <button type="button" onClick={prevStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-transparent border-[1.5px] border-[#cbd5d1] text-[#557a5b] hover:bg-slate-50 transition-colors">Back</button>
              <button type="button" onClick={nextStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#557a5b] text-white hover:opacity-90 transition-opacity">Next</button>
            </div>
          </div>
        )}

        {/* === STEP 3: CONTACT INFO === */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.3s_ease-in-out] flex-1 flex flex-col">
            
            <div className="text-left mb-[15px]">
              <label htmlFor="email" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">PLSP Email Address</label>
              <input id="email" type="email" placeholder="student@plsp.edu.ph" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.email} onChange={handleChange} />
            </div>

            <div className="text-left mb-[15px]">
              <label htmlFor="emergencyName" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Emergency Contact Name</label>
              <input id="emergencyName" type="text" placeholder="Full Name of Contact Person" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.emergencyName} onChange={handleChange} />
            </div>

            <div className="text-left mb-[20px]">
              <label htmlFor="emergencyPhone" className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-[4px] ml-[10px]">Emergency Contact Number</label>
              <input id="emergencyPhone" type="tel" placeholder="09XX XXX XXXX" required className="w-full px-[16px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[15px] text-[13px] outline-none focus:border-[#4a635d]" value={formData.emergencyPhone} onChange={handleChange} />
            </div>

            <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
              <button type="button" onClick={prevStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-transparent border-[1.5px] border-[#cbd5d1] text-[#557a5b] hover:bg-slate-50 transition-colors">Back</button>
              <button type="submit" disabled={loading} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#557a5b] text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default HealthProfileSetup;