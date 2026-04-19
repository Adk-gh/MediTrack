// frontend/src/layouts/Header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from "../services/auth.service.js";

export const Header = ({ onOpenQR }) => {
  const navigate = useNavigate();

  // 1. Retrieve the session data from local storage
  const session = authService.getCurrentUser();
  
  // 2. Extract the user object (Add fallbacks just in case the data is temporarily unavailable)
  const currentUser = session?.user;
  const displayName = currentUser?.name || 'A. Bermas'; 
  const displayRole = currentUser?.role || 'Student';

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between mb-8">
      
      {/* Logo & Branding */}
      <div className="flex items-center gap-4">
        <img 
          src="https://ui-avatars.com/api/?name=PLSP&background=557a5b&color=fff" 
          alt="PLSP Logo" 
          className="w-10 h-10 rounded-full border border-white shadow-sm" 
        />
        <div>
          <h1 className="text-xl font-bold text-[#557a5b] uppercase leading-none">
            MediTrack : Pamantasan ng Lungsod ng San Pablo
          </h1>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mt-1">
            University Health Services Office
          </p>
        </div>
      </div>
      
      {/* Controls & Profile */}
      <div className="flex items-center gap-6">
        
        {/* QR Access Button */}
        <button 
          onClick={onOpenQR} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-700 transition-all group"
        >
          <i className="fa-solid fa-qrcode text-2xl group-hover:scale-110 transition-transform"></i>
          <span className="text-[9px] font-bold uppercase tracking-tighter">Form Access</span>
        </button>

        {/* Dynamic User Profile Section */}
        <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
          <div className="text-right">
            {/* Inject the dynamic name and role */}
            <p className="text-xs font-bold text-gray-700">{displayName}</p>
            <p className="text-[9px] text-gray-400 uppercase">{displayRole}</p>
          </div>
          
          {/* Dynamically generate the avatar initials using template literals */}
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=557a5b&color=fff`} 
            alt={`${displayName} Avatar`}
            className="w-10 h-10 rounded-full border border-white shadow-sm" 
          />
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            title="Secure Logout"
            className="ml-3 flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
          </button>
        </div>

      </div>
    </header>
  );
};