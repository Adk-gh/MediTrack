// frontend/src/layouts/DashboardLayout.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export const DashboardLayout = ({ children }) => {
  // This helper function perfectly replicates your custom active tab styling!
  const navLinkClass = ({ isActive }) =>
    `relative font-bold text-[14px] tracking-[0.025em] transition-all pb-[4px] ${
      isActive
        ? 'opacity-100 text-[#466460] after:content-[""] after:absolute after:-bottom-[17px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-[#466460] after:to-[#81b29a] after:rounded-full'
        : 'text-[#466460] opacity-70 hover:opacity-100 hover:text-[#e07a5f]'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f4f7f6] to-[#eef2f0] font-['Inter',_sans-serif]">
      
      {/* --- HEADER --- */}
      <header className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-8 py-2 flex items-center justify-between shadow-lg z-20 border-b border-white/10">
        
        {/* Make sure image copy.png is in your public folder */}
        <img 
          src="/logo1.jpg
          " 
          alt="MediTrack Logo" 
          className="w-[200px] h-[70px] object-contain"
          onError={(e) => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack' }}
        />
        
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
            <input 
              type="text" 
              placeholder="Search Name or ID..." 
              className="bg-white/15 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/50 outline-none focus:bg-white/25 transition-all w-80"
            />
          </div>
          
          {/* Admin Profile */}
          <div className="flex items-center gap-3 border-l border-white/20 pl-6">
            <div className="text-right">
              <p className="text-xs font-bold text-white">Admin Portal</p>
              <p className="text-[9px] text-white/60 uppercase">University Clinic</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
              <img src="https://ui-avatars.com/api/?name=Admin&background=ffffff&color=466460" alt="Admin User" />
            </div>
          </div>
        </div>
      </header>

      {/* --- NAVIGATION BAR --- */}
      <nav className="bg-white px-8 py-4 border-b border-slate-200 flex gap-12 sticky top-0 z-10 shadow-sm">
        {/* React Router NavLinks automatically know when they are active */}
        <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
        <NavLink to="/records" className={navLinkClass}>Records</NavLink>
        <NavLink to="/appointments" className={navLinkClass}>Appointments</NavLink>
        <NavLink to="/examinations" className={navLinkClass}>Examination</NavLink>
        <NavLink to="/announcements" className={navLinkClass}>Announcements</NavLink>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full p-0 m-0">
        {/* The specific page content (Charts, Forms, etc.) will inject right here */}
        {children}
      </main>
      
    </div>
  );
};