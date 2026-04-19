// frontend/src/components/LoginForm.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';


const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login({ email, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');; // Go to onboarding on success , student_onboarding , onboarding
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Log In" widthClass="max-w-[320px]">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-[15px] p-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Email Input */}
        <div className="text-left mb-[15px]">
          <label htmlFor="email" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] box-border outline-none text-[14px] focus:border-[#4a635d] transition-colors"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password Input */}
        <div className="text-left mb-[15px]">
          <label htmlFor="password" className="block text-[14px] font-semibold text-[#666] mb-[5px] ml-[10px]">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="w-full px-[20px] py-[12px] border-[1.5px] border-[#cbd5d1] rounded-[50px] box-border outline-none text-[14px] focus:border-[#4a635d] transition-colors"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-[10px] mt-[20px]">
          <button
            type="submit"
            disabled={loading}
            className="w-[200px] p-[10px] rounded-[50px] text-[14px] font-bold cursor-pointer transition-all duration-200 bg-[#4a635d] text-white border-none hover:opacity-80 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <Link 
            to="/signup" 
            className="w-[200px] p-[10px] rounded-[50px] text-[14px] font-bold cursor-pointer transition-all duration-200 bg-transparent text-[#4a635d] border-[1.5px] border-[#cbd5d1] hover:opacity-80 hover:scale-[1.02] text-center inline-block box-border no-underline"
          >
            Signup
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;