// C:\Users\HP\MediTrack\frontend\src\layouts/UserDashboardLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserNotificationBell, UserNotificationPanel } from "../components/UserNotifications.jsx";
import notificationsService from "../services/notifications.service.js";

// ─── Desktop sidebar icons ────────────────────────────────────────────────────
const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CalendarIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ConsultIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
    <path d="M18 21v-2a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4v2" />
    <path d="M12 12v3" />
    <path d="M10.5 13.5h3" />
  </svg>
);

const RecordsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function DocumentPreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#557a5b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

// ─── Nav configs ──────────────────────────────────────────────────────────────
const DESKTOP_NAV = [
  { id: "home",     label: "Home",    Icon: HomeIcon },
  { id: "booking",  label: "Booking", Icon: CalendarIcon },
  { id: "consult",  label: "Consult", Icon: ConsultIcon },
  { id: "records",  label: "Records", Icon: RecordsIcon },
  { id: "profile",  label: "Profile", Icon: ProfileIcon },
];

// ─── Mobile pill nav icons ────────────────────────────────────────────────────
const NavHomeIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size }}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const NavBookIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size }}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const NavConsultIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const NavRecordsIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const NavProfileIcon = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MOBILE_NAV = [
  { id: "home",     label: "Home",    Icon: NavHomeIcon },
  { id: "booking",  label: "Book",    Icon: NavBookIcon },
  { id: "consult",  label: "Consult", Icon: NavConsultIcon },
  { id: "records",  label: "Records", Icon: NavRecordsIcon },
  { id: "profile",  label: "Profile", Icon: NavProfileIcon },
];

// ─── Header Profile Dropdown ──────────────────────────────────────────────────
function ProfileDropdown({ userName, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Sleek downward chevron button instead of the initials circle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center"
        aria-label="Profile Menu"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Signed in as</p>
            <p className="text-xs font-bold text-slate-800 truncate">{userName || 'Student'}</p>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/student/settings');
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#466460] transition-colors flex items-center gap-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Floating Pill Nav ────────────────────────────────────────────────────────
function MobilePillNav({ activeTab, onTabChange }) {
  const [vw, setVw] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pillW  = Math.min(480, Math.max(280, vw * 0.88));
  const scale  = pillW / 360;
  const pillH  = Math.round(56 * scale);
  const bubble = Math.round(48 * scale);
  const iconSm = Math.round(18 * scale);
  const iconLg = Math.round(20 * scale);
  const labelSz= Math.max(9, Math.round(10 * scale));
  const popUp  = Math.round(24 * scale);
  const bottomOffset = Math.round(20 * scale);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: bottomOffset,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "#ffffff",
          borderRadius: 999,
          padding: `0 ${Math.round(6 * scale)}px`,
          height: pillH,
          width: pillW,
          boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
          pointerEvents: "auto",
        }}
      >
        {MOBILE_NAV.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              aria-label={label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: pillH,
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: isActive ? bubble : Math.round(34 * scale),
                  height: isActive ? bubble : Math.round(34 * scale),
                  borderRadius: "50%",
                  background: isActive ? "#059669" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: isActive ? -popUp : 0,
                  boxShadow: isActive ? "0 6px 20px rgba(5,150,105,0.40)" : "none",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  transition: "all 0.28s cubic-bezier(.34,1.56,.64,1)",
                  flexShrink: 0,
                }}
              >
                <Icon size={isActive ? iconLg : iconSm} />
              </div>
              <span
                style={{
                  fontSize: labelSz,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: isActive ? "#059669" : "#94a3b8",
                  marginTop: isActive ? Math.round(5 * scale) : Math.round(3 * scale),
                  lineHeight: 1,
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
export function PreviewModal({ record, onClose, isDesktop }) {
  if (!record) return null;

  if (isDesktop) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={onClose}>
        <div className="bg-transparent rounded-3xl overflow-hidden flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">Medical Document Preview</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 text-xl transition-colors">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="bg-slate-50 rounded-3xl p-6 text-center">
              <div className="mb-3"><DocumentPreviewIcon /></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{record.title}</h3>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 mb-5">{record.date}</p>
              <div className="space-y-3 text-left">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1.5">Clinical Assessment</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic">{record.desc}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">Physician in Charge</p>
                  <p className="text-xs font-bold text-slate-700">{record.doc}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex gap-3">
            <button className="flex-1 py-3 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 hover:bg-[#4a6b4f] transition-colors">Download PDF</button>
            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">Print</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-slideUp">
      <div className="flex justify-between items-center px-5 pt-12 pb-4 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 text-2xl leading-none">‹</button>
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">Medical Document Preview</span>
        <div className="w-8" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="bg-slate-50 rounded-3xl p-5 text-center">
          <div className="mb-3"><DocumentPreviewIcon /></div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{record.title}</h3>
          <p className="text-[9px] font-bold text-slate-400 mt-0.5 mb-5">{record.date}</p>
          <div className="space-y-3 text-left">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1.5">Clinical Assessment</p>
              <p className="text-xs text-slate-600 leading-relaxed italic">{record.desc}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">Physician in Charge</p>
              <p className="text-xs font-bold text-slate-700">{record.doc}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-10 pt-4 border-t border-slate-100 space-y-3 flex-shrink-0">
        <button className="w-full py-4 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">Download as PDF</button>
        <button className="w-full py-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2">Print Record</button>
      </div>
    </div>
  );
}

// ─── Desktop shell ─────────────────────────────────────────────────────────────
function DesktopShell({ activeTab, onTabChange, preview, onClosePreview, children, notificationCount, onNotificationClick, userName, onLogout }) {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="bg-transparent px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <img src="../logo.jpg" alt="MediTrack Logo" className="h-10 object-contain rounded-xl" />
        <div className="flex items-center gap-1 sm:gap-2">
          <UserNotificationBell onClick={onNotificationClick} count={notificationCount} />
          <ProfileDropdown userName={userName} onLogout={onLogout} />
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-6 md:px-8 py-8 gap-8">
        <aside className="w-56 flex-shrink-0">
          <nav className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 sticky top-24">
            {DESKTOP_NAV.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 mb-1 last:mb-0 ${
                    isActive
                      ? "bg-[#557a5b] text-white shadow-md shadow-green-900/15"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <Icon active={isActive} />
                  </div>
                  <span className="text-[12px] font-bold">{label}</span>
                </button>
              );
            })}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">Status</p>
                <p className="text-[11px] font-bold text-emerald-600">CLEARED / FIT</p>
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 w-full max-w-4xl">
          <div
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
            style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
          >
            <div className="overflow-y-auto flex-1 flex flex-col">{children}</div>
          </div>
        </main>
      </div>

      {preview && <PreviewModal record={preview} onClose={onClosePreview} isDesktop />}
    </div>
  );
}

// ─── Mobile shell ─────────────────────────────────────────────────────────────
function MobileShell({ activeTab, onTabChange, preview, onClosePreview, children, notificationCount, onNotificationClick, userName, onLogout }) {
  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily: "sans-serif",
      }}
    >
      <header className="bg-transparent px-5 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <img src="/logo.jpg" alt="MediTrack Logo" className="h-10 object-contain rounded-xl" />
        <div className="flex items-center gap-1">
          <UserNotificationBell onClick={onNotificationClick} count={notificationCount} />
          <ProfileDropdown userName={userName} onLogout={onLogout} />
        </div>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          position: "relative",
          paddingBottom: "88px",
        }}
      >
        {children}
        <PreviewModal record={preview} onClose={onClosePreview} isDesktop={false} />
      </div>

      <MobilePillNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function UserDashboardLayout({
  activeTab,
  onTabChange,
  preview,
  onClosePreview,
  onLogout,
  userName,
  userId,
  children,
}) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 641);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleNotificationClick = () => setShowNotifications(true);
  const handleCloseNotifications = () => setShowNotifications(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setNotificationCount(count);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 641);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sharedProps = {
    activeTab,
    onTabChange,
    onLogout,
    userName,
    userId,
    preview,
    onClosePreview,
    children,
    notificationCount,
    onNotificationClick: handleNotificationClick,
  };

  return (
    <>
      {isDesktop
        ? <DesktopShell {...sharedProps} />
        : <MobileShell  {...sharedProps} />}
      <UserNotificationPanel
        isOpen={showNotifications}
        onClose={handleCloseNotifications}
      />
    </>
  );
}