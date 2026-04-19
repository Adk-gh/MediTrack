// frontend/src/components/ProfileSetup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', email: '', phoneNumber: '',
    position: 'Doctor', title: '', bio: ''
  });
  const [profilePhoto, setProfilePhoto] = useState(null);

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
      // In the future, send formData and profilePhoto to your backend here
      console.log("Submitting Profile Setup:", formData);
      
      // Navigate to the dashboard after successful onboarding
      setTimeout(() => navigate('/dashboard'), 1000); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for tab styling
  const tabClass = (tabNum) => `flex-1 text-center text-[12px] relative cursor-pointer pb-2 transition-colors duration-200 after:content-[''] after:block after:h-[3px] after:mt-[5px] after:rounded-[10px] ${
    step === tabNum 
      ? 'text-[#4a635d] font-bold after:bg-[#4a635d]' 
      : 'text-[#666] after:bg-[#cbd5d1]'
  }`;

  return (
    <AuthLayout widthClass="max-w-[380px]">
      
      {/* Tabs */}
      <div className="flex justify-between mb-[20px] px-2">
        <div className={tabClass(1)} onClick={() => setStep(1)}>Personal</div>
        <div className={tabClass(2)} onClick={() => setStep(2)}>Professional</div>
        <div className={tabClass(3)} onClick={() => setStep(3)}>Profile</div>
      </div>

      <form onSubmit={handleSubmit} className="relative min-h-[350px]">
        
        {/* === STEP 1: PERSONAL === */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease-in-out]">
            <h2 className="text-left text-[#4a635d] text-[18px] mb-[15px] font-bold">Personal Information</h2>
            
            <div className="text-left mb-[15px]"><label htmlFor="firstName" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">First Name</label><input id="firstName" type="text" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.firstName} onChange={handleChange} /></div>
            <div className="text-left mb-[15px]"><label htmlFor="middleName" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Middle Name</label><input id="middleName" type="text" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.middleName} onChange={handleChange} /></div>
            <div className="text-left mb-[15px]"><label htmlFor="lastName" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Last Name</label><input id="lastName" type="text" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.lastName} onChange={handleChange} /></div>
            <div className="text-left mb-[15px]"><label htmlFor="email" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Email</label><input id="email" type="email" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.email} onChange={handleChange} /></div>
            <div className="text-left mb-[15px]"><label htmlFor="phoneNumber" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Phone Number</label><input id="phoneNumber" type="text" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.phoneNumber} onChange={handleChange} /></div>

            <div className="flex justify-between mt-[20px]">
              <div></div> {/* Empty div keeps the Next button on the right */}
              <button type="button" onClick={nextStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#4a635d] text-white hover:opacity-90 transition-opacity">Next</button>
            </div>
          </div>
        )}

        {/* === STEP 2: PROFESSIONAL === */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease-in-out]">
            <h2 className="text-left text-[#4a635d] text-[18px] mb-[15px] font-bold">Professional Information</h2>
            
            <div className="text-left mb-[15px]">
              <label htmlFor="position" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Position</label>
              <select id="position" className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d] bg-white" value={formData.position} onChange={handleChange}>
                <option>Doctor</option>
                <option>Nurse</option>
                <option>Dentist</option>
                <option>Staff</option>
              </select>
            </div>

            <div className="text-left mb-[15px]"><label htmlFor="title" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Title</label><input id="title" type="text" placeholder="e.g. MD" className="w-full px-[20px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[14px] outline-none focus:border-[#4a635d]" value={formData.title} onChange={handleChange} /></div>

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

            <div className="text-left mb-[15px]"><label htmlFor="bio" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">Short Bio</label><textarea id="bio" rows="4" className="w-full px-[20px] py-[15px] border-[1.5px] border-[#cbd5d1] rounded-[20px] text-[14px] outline-none focus:border-[#4a635d] resize-none" value={formData.bio} onChange={handleChange} /></div>

            <div className="flex justify-between mt-[20px] absolute bottom-0 w-full">
              <button type="button" onClick={prevStep} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-transparent border-[1.5px] border-[#cbd5d1] text-[#4a635d] hover:bg-slate-50 transition-colors">Back</button>
              <button type="submit" disabled={loading} className="w-[48%] p-[10px] rounded-[50px] text-[14px] font-bold bg-[#4a635d] text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Saving...' : 'Finish'}
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default ProfileSetup;