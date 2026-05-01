// C:\Users\HP\MediTrack\frontend\src\components\Headers.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service.js';

// ─── Profile Drawer ───────────────────────────────────────────────────────────
function ProfileDrawer({ isOpen, onClose, onLogout, userProfile }) {
  if (!isOpen) return null;

  // Safely extract properties with fallbacks
  const {
    name, firstName, lastName, email, role,
    phoneNumber, department, classification, jobTitle,
    birthday, age, gender, bloodType,
    emergencyName, emergencyPhone,
    studentId, program, yearLevel, section
  } = userProfile || {};

  const displayName = (firstName && lastName) 
    ? `${firstName} ${lastName}` 
    : (name || 'User');
    
  const userRole = role?.toLowerCase() || 'user';
  const isStudent = userRole === 'student';

  const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <div className="flex items-center gap-2.5 text-slate-500">
        <i className={`fa-solid ${icon} text-[#466460] w-4 text-center opacity-70`}></i>
        <span>{label}</span>
      </div>
      <span className="font-semibold text-slate-800 text-right">{value || '—'}</span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[2000]" onClick={onClose}></div>
      <div
        className="fixed top-0 right-0 w-[380px] h-full bg-white shadow-[-4px_0_30px_rgba(0,0,0,0.15)] z-[2001] overflow-y-auto scrollbar-none"
        style={{ right: isOpen ? '0' : '-420px', transition: 'right 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 border-none text-white w-8 h-8 rounded-full cursor-pointer text-sm flex items-center justify-center transition-all hover:bg-white/35"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="w-[70px] h-[70px] rounded-full border-2 border-white/40 overflow-hidden mb-3 bg-white/10">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460&size=70`}
              alt="User"
            />
          </div>
          <h2 className="text-xl font-extrabold mb-1">{displayName}</h2>
          <p className="text-xs opacity-75">{email || 'No email provided'}</p>
          <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[9px] font-bold mt-2 tracking-wide uppercase">
            {role || 'USER'}
          </span>
        </div>

        {/* Personal Information */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Personal Details</div>
          <div className="flex flex-col gap-1">
            <InfoRow icon="fa-cake-candles" label="Birthday" value={birthday} />
            <InfoRow icon="fa-hashtag" label="Age" value={age} />
            <InfoRow icon="fa-venus-mars" label="Gender" value={gender} />
            <InfoRow icon="fa-droplet" label="Blood Type" value={bloodType} />
          </div>
        </div>

        {/* Academic or Professional Information */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
            {isStudent ? 'Academic Information' : 'Professional Information'}
          </div>
          <div className="flex flex-col gap-1">
            {isStudent ? (
              <>
                <InfoRow icon="fa-id-card" label="Student No." value={studentId} />
                <InfoRow icon="fa-building" label="Department" value={department} />
                <InfoRow icon="fa-graduation-cap" label="Program" value={program} />
                <InfoRow icon="fa-layer-group" label="Yr & Section" value={(yearLevel || section) ? `${yearLevel} - ${section}` : '—'} />
              </>
            ) : (
              <>
                <InfoRow icon="fa-user-tie" label="Classification" value={classification} />
                <InfoRow icon="fa-building" label="Department" value={department} />
                <InfoRow icon="fa-briefcase" label="Job Title" value={jobTitle} />
              </>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Contact Information</div>
          <div className="flex flex-col gap-1">
            <InfoRow icon="fa-phone" label="Phone Number" value={phoneNumber} />
            <InfoRow icon="fa-envelope" label="Email Address" value={email} />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="px-6 py-4 border-b border-slate-100 bg-red-50/30">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-red-400 mb-3">Emergency Contact</div>
          <div className="flex flex-col gap-1">
            <InfoRow icon="fa-address-book" label="Contact Name" value={emergencyName} />
            <InfoRow icon="fa-phone-volume" label="Contact Number" value={emergencyPhone} />
          </div>
        </div>

        {/* System & Actions */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4 px-2">
            <span>MediTrack v2.4.1</span>
            <span>Server: Online <span className="text-emerald-500 ml-1">✓</span></span>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-red-100 flex items-center justify-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
function LogoutConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[3000]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-arrow-right-from-bracket text-2xl text-red-600"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Confirm Logout</h3>
          <p className="text-sm text-slate-500 mt-2">Are you sure you want to log out?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Header ───────────────────────────────────────────────────────────
export const DesktopHeader = ({ onOpenQR }) => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // 1. Get the basic auth token data
  const authUser = authService.getCurrentUser();
  
  // 2. State to hold the FULL profile from the database
  const [fullProfile, setFullProfile] = useState(authUser || {});

  // 3. Fetch the real database profile on load
  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // HANDLE 401 UNAUTHORIZED
        if (response.status === 401) {
          console.warn("Unauthorized access in Header. Redirecting to login...");
          authService.logout();
          navigate('/login');
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Merge the auth user data with the fresh database data
          setFullProfile({ ...authUser, ...result.data });
        }
      } catch (err) {
        console.error("Error fetching full profile for header:", err);
      }
    };

    fetchFullProfile();
  }, [navigate]); // Dependencies updated

  // Determine display values for the top bar
  const displayName = (fullProfile.firstName && fullProfile.lastName) 
    ? `${fullProfile.firstName} ${fullProfile.lastName}` 
    : (fullProfile.name || 'Admin User');
  const displayRole = fullProfile.role || 'Administrator';

  const handleLogoutClick = () => {
    setShowProfileDrawer(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-gradient-to-br from-[#466460] to-[#3a524f] flex items-center justify-between shadow-lg z-20 border-b border-white/10 px-4">
        <img
          src="/logo1.jpg"
          alt="MediTrack Logo"
          className="w-[200px] h-[70px] object-contain"
          onError={(e) => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack'; }}
        />

        <div className="flex items-center gap-6">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
            <input
              type="text"
              placeholder="Search Name or ID..."
              className="bg-white/15 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/50 outline-none focus:bg-white/25 transition-all w-80"
            />
          </div>

          <div className="flex items-center gap-3 border-l border-white/20 pl-6 pr-6">
            <div className="text-right">
              <p className="text-xs font-bold text-white">{displayName}</p>
              <p className="text-[9px] text-white/60 uppercase">{displayRole}</p>
            </div>

            {/* Avatar — opens profile drawer */}
            <button
              onClick={() => setShowProfileDrawer(true)}
              className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 hover:border-white/50 transition-colors cursor-pointer"
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460`}
                alt="User"
              />
            </button>

            {/* Quick logout button */}
            <button
              onClick={handleLogoutClick}
              title="Secure Logout"
              className="w-8 h-8 rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center ml-2"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-base"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        onLogout={handleLogoutClick}
        userProfile={fullProfile} 
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

// ─── Desktop Navigation Bar ───────────────────────────────────────────────────
export const DesktopNav = () => {
  const navLinkClass = ({ isActive }) =>
    `relative font-bold text-[14px] tracking-[0.025em] transition-all pb-[4px] ${
      isActive
        ? 'opacity-100 text-[#466460] after:content-[""] after:absolute after:-bottom-[17px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-[#466460] after:to-[#81b29a] after:rounded-full'
        : 'text-[#466460] opacity-70 hover:opacity-100 hover:text-[#e07a5f]'
    }`;

  return (
    <nav className="bg-white px-8 py-4 border-b border-slate-200 flex gap-12 sticky top-0 z-10 shadow-sm">
      <NavLink to="/dashboard"     className={navLinkClass}>Dashboard</NavLink>
      <NavLink to="/records"       className={navLinkClass}>Records</NavLink>
      <NavLink to="/appointments"  className={navLinkClass}>Appointments</NavLink>
      <NavLink to="/examinations"  className={navLinkClass}>Examination</NavLink>
      <NavLink to="/announcements" className={navLinkClass}>Announcements</NavLink>
      <NavLink to="/consultations" className={navLinkClass}>Consultation</NavLink>
      <NavLink to="/users"         className={navLinkClass}>User Management</NavLink>
    </nav>
  );
};

// ... (MobileHeader, MobileNav, and MobileLayout)
// ─── Mobile Header ────────────────────────────────────────────────────────────
export const MobileHeader = ({ userName = 'User', userId = 'N/A', initials = 'US', onLogout }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 px-5 pt-10 pb-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#557a5b] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800 leading-none">{userName}</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em]">{userId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 text-xs">
          🔔
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
export const MobileNav = ({
  active = 'home',
  onSwitch,
  items = [
    { id: 'home',    label: 'Home',    emoji: '🏠' },
    { id: 'history', label: 'History', emoji: '🕐' },
    { id: 'profile', label: 'Profile', emoji: '✏️' },
  ],
}) => {
  return (
    <nav className="absolute bottom-0 left-0 right-0 h-[70px] bg-white/95 backdrop-blur border-t border-slate-100 flex justify-around items-center z-40 pb-2">
      {items.map((n) => (
        <button
          key={n.id}
          onClick={() => onSwitch(n.id)}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            active === n.id ? 'text-[#557a5b]' : 'text-slate-300'
          }`}
        >
          <span className={`text-xl leading-none transition-transform ${active === n.id ? 'scale-110' : 'scale-100'}`}>
            {n.emoji}
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.08em]">{n.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ─── Full Mobile Layout ───────────────────────────────────────────────────────
export const MobileLayout = ({ children, activeTab, onTabChange, userName, userId, bottomNavItems, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const handleLogoutRequest = () => setShowLogoutConfirm(true);
  const handleConfirm       = () => { setShowLogoutConfirm(false); onLogout?.(); };
  const handleCancel        = () => setShowLogoutConfirm(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800;9..40,900&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.28s ease both; }
        .animate-slideUp { animation: slideUp 0.32s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      {/* Desktop: Phone Frame */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-slate-800">
        <div
          className="relative w-[375px] h-[812px] border-[12px] border-slate-700 rounded-[40px] overflow-hidden bg-slate-50"
          style={{ boxShadow: '0 35px 70px -10px rgba(0,0,0,0.65)' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[22px] bg-slate-700 rounded-b-2xl z-50" />
          <MobileHeader
            userName={userName}
            userId={userId}
            initials={getInitials(userName)}
            onLogout={onLogout ? handleLogoutRequest : undefined}
          />
          <div className="h-full overflow-y-auto pt-[64px] pb-[80px] scrollbar-none">
            {children}
          </div>
          <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
        </div>
      </div>

      {/* Mobile: Full Screen */}
      <div className="md:hidden relative flex flex-col h-screen bg-slate-50 overflow-hidden">
        <MobileHeader
          userName={userName}
          userId={userId}
          initials={getInitials(userName)}
          onLogout={onLogout ? handleLogoutRequest : undefined}
        />
        <div className="flex-1 overflow-y-auto pt-[64px] pb-[70px] scrollbar-none">
          {children}
        </div>
        <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default { DesktopHeader, DesktopNav, MobileHeader, MobileNav, MobileLayout };