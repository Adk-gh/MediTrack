// frontend/src/components/SignupForm.jsx
import React, { useState, useRef } from 'react'; 
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';

const SignupForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({ 
    name: '', email: '', studentId: '', password: '', confirmPassword: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => fileInputRef.current.click();

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match!");
    if (!selectedFile) return setError("Please upload a photo of your Student ID.");

    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('studentId', formData.studentId);
      data.append('image', selectedFile); 

      const result = await authService.register(data);
      if (result.data?.token) localStorage.setItem("token", result.data.token);
      
      alert("Registration Successful! Your ID has been verified.");
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" widthClass="max-w-[480px]">
      <form onSubmit={handleSubmit}>
        
        {error && (
          <div className="mb-[15px] p-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">{error}</div>
        )}

        {/* Row 1: Name & ID (Side by Side) */}
        <div className="flex gap-3 mb-[10px]">
          <div className="flex-1 text-left">
            <label htmlFor="name" className="block text-[12px] font-semibold text-[#4a635d] mb-[5px] ml-[10px]">Full Name</label>
            <input id="name" type="text" required disabled={loading} className="w-full px-[15px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] transition-colors placeholder:text-slate-400" placeholder="Juan Dela Cruz" value={formData.name} onChange={handleChange} />
          </div>
          <div className="flex-1 text-left">
            <label htmlFor="studentId" className="block text-[12px] font-semibold text-[#4a635d] mb-[5px] ml-[10px]">Student ID Number</label>
            <input id="studentId" type="text" required disabled={loading} className="w-full px-[15px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] transition-colors placeholder:text-slate-400" placeholder="2021-XXXXX" value={formData.studentId} onChange={handleChange} />
          </div>
        </div>

        {/* Row 2: Email (Full Width) */}
        <div className="text-left mb-[15px]">
          <label htmlFor="email" className="block text-[12px] font-semibold text-[#4a635d] mb-[5px] ml-[10px]">Email</label>
          <input id="email" type="email" required disabled={loading} className="w-full px-[15px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] transition-colors placeholder:text-slate-400" placeholder="student@plsp.edu.ph" value={formData.email} onChange={handleChange} />
        </div>

        {/* Row 3: Drag & Drop File Upload */}
        <div className="mb-[15px]">
          <label className="block text-left text-[12px] font-semibold text-[#4a635d] mb-[5px] ml-[10px]">Upload Student ID (Photo)</label>
          <div 
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full p-[15px] border-[1.5px] border-dashed rounded-[20px] text-center cursor-pointer transition-all duration-200 flex flex-col justify-center items-center gap-1
              ${isDragging ? 'border-[#557a5b] bg-[#f0fdf4] scale-[1.02]' : 'border-[#cbd5d1] bg-slate-50 hover:bg-[#f2f6f4] hover:border-[#557a5b]'}`}
          >
            <input type="file" id="idCard" accept="image/*" required={!selectedFile} onChange={handleFileChange} ref={fileInputRef} className="hidden" />
            
            {selectedFile ? (
              <span className="text-[13px] font-bold text-[#557a5b] truncate w-full px-2">✓ {selectedFile.name}</span>
            ) : (
              <>
                <svg className="w-6 h-6 text-[#4a635d] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                <span className="text-[12px] text-slate-500 font-medium"><span className="text-[#557a5b] font-bold">Click to upload</span> or drag and drop</span>
              </>
            )}
          </div>
        </div>

        {/* Row 4: Passwords (Side by Side) */}
        <div className="flex gap-3 mb-[20px]">
          <div className="flex-1 text-left">
            <input id="password" type="password" placeholder="Password" required disabled={loading} className="w-full px-[15px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] transition-colors placeholder:text-slate-400" value={formData.password} onChange={handleChange} />
          </div>
          <div className="flex-1 text-left">
            <input id="confirmPassword" type="password" placeholder="Confirm Password" required disabled={loading} className="w-full px-[15px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[50px] text-[13px] outline-none focus:border-[#4a635d] transition-colors placeholder:text-slate-400" value={formData.confirmPassword} onChange={handleChange} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-[10px]">
          <button type="submit" disabled={loading} className="w-[200px] p-[10px] rounded-[50px] text-[14px] font-bold cursor-pointer transition-all duration-200 bg-[#4a635d] text-white border-none hover:opacity-80 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100">
            {loading ? 'Processing...' : 'Register'}
          </button>
          
          <div className="text-center text-[12px] pt-1">
            <span className="text-slate-500">Already have an account? </span>
            <Link to="/login" className="text-[#3b5e43] font-bold hover:underline">Sign in</Link>
          </div>
        </div>

      </form>
    </AuthLayout>
  );
};

export default SignupForm;