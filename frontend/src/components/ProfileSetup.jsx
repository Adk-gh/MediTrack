// frontend/src/components/ProfileSetup.jsx
import React, { useState, useEffect } from 'react';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { useNavigate } from 'react-router-dom';

// --- PLSP Department Data ---
const PLSP_COLLEGES = [
  "College of Accountancy",
  "College of Arts and Sciences",
  "College of Business Administration and Management",
  "College of Computing Science and Engineering",
  "College of Nursing and Allied Health Sciences",
  "College of Teacher Education",
  "College of Tourism and Hospitality Management"
];

const PLSP_OFFICES = [
  ...PLSP_COLLEGES,
  "Accounting Office",
  "Human Resources",
  "Library",
  "Maintenance",
  "Registrar Office",
  "Security Services"
];

const ProfileSetup = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const rawRole = user?.role || 'employee';
  const userRole = rawRole.toLowerCase();

  const [formData, setFormData] = useState({
    firstName: '',
    middleInitial: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    course: '',
    yearLevel: '1st Year',
    classification: 'Teaching Personnel',
    jobTitle: '',
    department: '',
    bio: ''
  });

  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    if (user && user.name) {
      let fName = '';
      let mInitial = '';
      let lName = '';

      if (user.name.includes(',')) {
        const [last, rest] = user.name.split(',');
        lName = last.trim();
        const firstParts = rest.trim().split(' ');
        if (firstParts.length > 1) {
          const middlePart = firstParts.pop();
          mInitial = middlePart.charAt(0).toUpperCase();
          fName = firstParts.join(' ');
        } else {
          fName = firstParts[0] || '';
        }
      } else {
        const nameParts = user.name.split(' ');
        fName = nameParts[0] || '';
        if (nameParts.length > 2) {
          mInitial = nameParts[1].charAt(0).toUpperCase();
          lName = nameParts.slice(2).join(' ');
        } else {
          lName = nameParts[1] || '';
        }
      }

      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: fName,
        middleInitial: mInitial,
        lastName: lName
      }));
    }
  }, [user]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setProfilePhoto(e.target.files[0]);
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('role', userRole);
      if (profilePhoto) data.append('image', profilePhoto);

      // Use token from localStorage (stored during login)
      const token = localStorage.getItem("token");
      console.log(">>> Sending token (first 50):", token ? token.substring(0, 50) : "EMPTY");
      if (!token) throw new Error("No authentication token found. Please login again.");

      const response = await fetch('http://localhost:5000/api/user/profile-setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('profileSetupComplete', 'true');
        localStorage.setItem('name', `${formData.firstName} ${formData.lastName}`);

        if (userRole === 'student') {
          navigate('/student/meditrack');
        } else {
          navigate('/dashboard');
        }
        onComplete();
      } else {
        alert(result.message || "Failed to save profile.");
      }
    } catch (err) {
      console.error("Connection Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (tabNum) => `flex-1 text-center text-[12px] relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
    step === tabNum
      ? 'text-[#4a635d] font-bold after:bg-[#4a635d]'
      : 'text-[#666] after:bg-[#cbd5d1]'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-[fadeIn_0.3s_ease]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] p-8 overflow-hidden animate-[slideIn_0.4s_ease-out]">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#2d5a52]">Welcome to MediTrack</h1>
          <p className="text-sm text-slate-500 mt-1">Let's finish setting up your account.</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-between mb-[20px] px-2">
          <div className={tabClass(1)} onClick={() => setStep(1)}>Personal</div>
          <div className={tabClass(2)} onClick={() => setStep(2)}>
            {userRole === 'student' ? 'Academic' : 'Professional'}
          </div>
          <div className={tabClass(3)} onClick={() => setStep(3)}>Profile</div>
        </div>

        <form onSubmit={handleSubmit} className="relative min-h-[360px]">

          {/* === STEP 1: PERSONAL === */}
          {step === 1 && (
            <div className="animate-[fadeIn_0.3s_ease-in-out]">
              <h2 className="text-left text-[#4a635d] text-[18px] mb-[15px] font-bold">Personal Information</h2>

              <div className="text-left mb-[15px]">
                <label htmlFor="firstName" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">First Name</label>
                <input id="firstName" type="text" required className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.firstName} onChange={handleChange} />
              </div>

              <div className="text-left mb-[15px]">
                <label htmlFor="middleInitial" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Middle Initial</label>
                <input id="middleInitial" type="text" maxLength="1" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.middleInitial} onChange={handleChange} />
              </div>

              <div className="text-left mb-[15px]">
                <label htmlFor="lastName" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Last Name</label>
                <input id="lastName" type="text" required className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.lastName} onChange={handleChange} />
              </div>

              <div className="text-left mb-[15px]">
                <label htmlFor="email" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Email</label>
                <input id="email" type="email" required className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.email} onChange={handleChange} />
              </div>

              <div className="text-left mb-[15px]">
                <label htmlFor="phoneNumber" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Phone Number</label>
                <input id="phoneNumber" type="text" required className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.phoneNumber} onChange={handleChange} />
              </div>

              <div className="flex justify-between mt-[20px]">
                <div></div>
                <button type="button" onClick={nextStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#4a635d] text-white hover:opacity-90 transition-opacity">Next</button>
              </div>
            </div>
          )}

          {/* === STEP 2: DYNAMIC ROLE (STUDENT vs EMPLOYEE) === */}
          {step === 2 && (
            <div className="animate-[fadeIn_0.3s_ease-in-out]">
              <h2 className="text-left text-[#4a635d] text-[18px] mb-[15px] font-bold">
                {userRole === 'student' ? 'Academic Information' : 'Professional Information'}
              </h2>

              {userRole === 'student' ? (
                <>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="department" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">College / Department</label>
                    <select id="department" required className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d] bg-white" value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select your College</option>
                      {PLSP_COLLEGES.map(college => (
                        <option key={college} value={college}>{college}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="course" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Course / Program</label>
                    <input id="course" type="text" required placeholder="e.g. BS in Information Technology" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.course} onChange={handleChange} />
                  </div>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="yearLevel" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Year Level</label>
                    <select id="yearLevel" className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d] bg-white" value={formData.yearLevel} onChange={handleChange}>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="classification" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Classification</label>
                    <select id="classification" className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d] bg-white" value={formData.classification} onChange={handleChange}>
                      <option value="Teaching Personnel">Teaching Personnel</option>
                      <option value="Non-Teaching Personnel">Non-Teaching Personnel</option>
                      <option value="Staff / Maintenance Personnel">Staff / Maintenance Personnel</option>
                      <option value="Security Personnel">Security Personnel</option>
                    </select>
                  </div>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="department" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Department / Office</label>
                    <select id="department" required className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d] bg-white" value={formData.department} onChange={handleChange}>
                      <option value="" disabled>Select your Office/Department</option>
                      {PLSP_OFFICES.map(office => (
                        <option key={office} value={office}>{office}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-left mb-[15px]">
                    <label htmlFor="jobTitle" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Job Title</label>
                    <input id="jobTitle" type="text" required placeholder="e.g. Associate Professor, IT Staff" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.jobTitle} onChange={handleChange} />
                  </div>
                </>
              )}

              <div className="flex justify-between mt-[20px] absolute bottom-0 w-full">
                <button type="button" onClick={prevStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-transparent border-[1.5px] border-[#cbd5d1] text-[#4a635d] hover:bg-slate-50 transition-colors">Back</button>
                <button type="button" onClick={nextStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#4a635d] text-white hover:opacity-90 transition-opacity">Next</button>
              </div>
            </div>
          )}

          {/* === STEP 3: PROFILE === */}
          {step === 3 && (
            <div className="animate-[fadeIn_0.3s_ease-in-out]">
              <h2 className="text-left text-[#4a635d] text-[18px] mb-[15px] font-bold">Profile Setup</h2>

              <div className="text-left mb-[15px]">
                <label className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Profile Photo</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full px-[15px] py-[8px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[12px] file:font-semibold file:bg-[#e8f0eb] file:text-[#2d523c] cursor-pointer" />
              </div>

              <div className="text-left mb-[15px]">
                <label htmlFor="bio" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Short Bio</label>
                <textarea id="bio" rows="4" placeholder="Tell us a little about yourself..." className="w-full px-[20px] py-[15px] border-[1.5px] border-[#cbd5d1] rounded-[20px] text-[14px] outline-none focus:border-[#4a635d] resize-none" value={formData.bio} onChange={handleChange} />
              </div>

              <div className="flex justify-between mt-[20px] absolute bottom-0 w-full">
                <button type="button" onClick={prevStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-transparent border-[1.5px] border-[#cbd5d1] text-[#4a635d] hover:bg-slate-50 transition-colors">Back</button>
                <button type="submit" disabled={loading} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#4a635d] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center">
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  ) : 'Finish'}
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