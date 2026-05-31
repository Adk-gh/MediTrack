// frontend/src/layouts/DashboardLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  DesktopHeader,
  DesktopNav,
  MobileHeader,
  ProfileDrawer,
} from '../components/Headers.jsx';
import { NotificationPanel } from '../components/Notifications.jsx';
import notificationsService from '../services/notifications.service.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const NavHomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const NavRecordsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const NavScheduleIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const NavExamIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M10 2v2M14 2v2" />
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <path d="M8 10h8M8 14h4" />
  </svg>
);

const NavApprovalIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const NavConsultIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
    <path d="M18 21v-2a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4v2" />
    <path d="M12 12v3" />
    <path d="M10.5 13.5h3" />
  </svg>
);

const NavAnnounceIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M19.07 4.93a10 10 0 010 14.14" />
  </svg>
);

const NavUsersIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const NavOcrIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 7h.01" />
    <path d="M11 7h.01" />
    <path d="M7 11h10" />
    <path d="M7 15h10" />
  </svg>
);

const NavReportsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M3 3v18h18" />
    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
  </svg>
);

// ─── Role-based mobile nav items ──────────────────────────────────────────────
const ROLE_MOBILE_NAV = {
  admin: [
    { id: 'dashboard', label: 'Home', Icon: NavHomeIcon },
    { id: 'recordManagement', label: 'Records', Icon: NavRecordsIcon },
    { id: 'auditLogs', label: 'Audit', Icon: NavAnnounceIcon },
    { id: 'announcements', label: 'Announcements', Icon: NavAnnounceIcon },
    { id: 'users', label: 'Users', Icon: NavUsersIcon },
    { id: 'ocrSettings', label: 'OCR Settings', Icon: NavOcrIcon },
    { id: 'reports', label: 'Reports', Icon: NavReportsIcon },
  ],
  doctor: [
    { id: 'dashboard', label: 'Home', Icon: NavHomeIcon },
    { id: 'records', label: 'Records', Icon: NavRecordsIcon },
    { id: 'appointments', label: 'Appointments', Icon: NavScheduleIcon },
    { id: 'approvals', label: 'Approval', Icon: NavApprovalIcon },
    { id: 'announcements', label: 'Announcements', Icon: NavAnnounceIcon },
    { id: 'consultations', label: 'Consultations', Icon: NavConsultIcon },
  ],
  dentist: [
    { id: 'dashboard', label: 'Home', Icon: NavHomeIcon },
    { id: 'records', label: 'Records', Icon: NavRecordsIcon },
    { id: 'appointments', label: 'Appointments', Icon: NavScheduleIcon },
    { id: 'announcements', label: 'Announcements', Icon: NavAnnounceIcon },
    { id: 'consultations', label: 'Consultations', Icon: NavConsultIcon },
  ],
  nurse: [
    { id: 'dashboard', label: 'Home', Icon: NavHomeIcon },
    { id: 'records', label: 'Records', Icon: NavRecordsIcon },
    { id: 'appointments', label: 'Appointments', Icon: NavScheduleIcon },
    { id: 'announcements', label: 'Announcements', Icon: NavAnnounceIcon },
    { id: 'consultations', label: 'Consultations', Icon: NavConsultIcon },
  ],
};

// ─── Default mobile nav items ─────────────────────────────────────────────────
const DEFAULT_MOBILE_NAV = [
  { id: 'dashboard',     label: 'Home',          Icon: NavHomeIcon },
  { id: 'records',       label: 'Records',       Icon: NavRecordsIcon },
  { id: 'appointments',  label: 'Appointments',  Icon: NavScheduleIcon },
  { id: 'examinations',  label: 'Exam',          Icon: NavExamIcon },
  { id: 'approvals',     label: 'Approval',      Icon: NavApprovalIcon },
  { id: 'consultations', label: 'Consultations', Icon: NavConsultIcon },
  { id: 'announcements', label: 'Announcements', Icon: NavAnnounceIcon },
  { id: 'users',         label: 'Users',         Icon: NavUsersIcon },
  { id: 'reports',       label: 'Reports',       Icon: NavReportsIcon },
];

// ─── Floating Hamburger Button ────────────────────────────────────────────────
function HamburgerButton({ isOpen, onClick }) {
  return (
    <button
      id="mobile-hamburger-btn"
      data-hamburger="true"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 20,
        zIndex: 50,
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: isOpen
          ? 'rgba(26, 46, 34, 0.92)'
          : 'rgba(5, 150, 105, 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isOpen
          ? '1.5px solid rgba(255,255,255,0.12)'
          : '1.5px solid rgba(255,255,255,0.22)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isOpen
          ? '0 8px 32px rgba(26,46,34,0.5), 0 0 0 4px rgba(26,46,34,0.12)'
          : '0 8px 32px rgba(5,150,105,0.4), 0 0 0 4px rgba(5,150,105,0.12)',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isOpen ? 'rotate(45deg) scale(1.06)' : 'scale(1)',
      }}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}

// ─── Floating Drawer Nav — glassmorphism style ────────────────────────────────
function HamburgerDrawerNav({ isOpen, activeTab, onTabChange, items, onClose }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        if (e.target.closest('[data-hamburger]')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen, onClose]);

  const handleSelect = (id) => {
    onTabChange(id);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 44,
          background: 'rgba(8, 18, 12, 0.25)',
          backdropFilter: isOpen ? 'blur(4px)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(4px)' : 'blur(0px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease',
        }}
      />

      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          bottom: 88,
          right: 16,
          zIndex: 45,
          width: 248,
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          borderRadius: 22,
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.18),
            0 8px 24px rgba(0, 0, 0, 0.10),
            inset 0 1px 0 rgba(255,255,255,0.8)
          `,
          overflow: 'hidden',
          transformOrigin: 'bottom right',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(12px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.85) 0%, rgba(4,120,87,0.9) 100%)',
          backdropFilter: 'blur(8px)',
          padding: '11px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.92)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Navigation
          </span>
        </div>

        <div style={{ padding: '6px 0' }}>
          {items.map((item, idx) => {
            const isActive = activeTab === item.id;
            const Icon = item.Icon || item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 14px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(5,150,105,0.12) 0%, rgba(5,150,105,0.04) 100%)'
                    : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid rgba(5,150,105,0.85)' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(5,150,105,0.06)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: isActive
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'rgba(241, 245, 243, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isActive
                    ? '0 3px 10px rgba(5,150,105,0.35)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ width: 15, height: 15, color: isActive ? '#ffffff' : '#64748b' }}>
                    <Icon active={isActive} />
                  </div>
                </div>

                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#065f46' : '#374151',
                  transition: 'color 0.15s',
                }}>
                  {item.label}
                </span>

                {isActive && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#059669',
                    boxShadow: '0 0 6px rgba(5,150,105,0.6)',
                    flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Layout Component Refactored ──────────────────────────────────────────────
export const DashboardLayout = ({
  children,
  onOpenQR,
  activeTab,
  onTabChange,
  mobileNavItems: propMobileNavItems,
  userName = 'Admin User',
  userId   = '',
  onLogout,
  userProfile,
}) => {
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase() || 'AU';
  };

  const [showProfileDrawer,   setShowProfileDrawer]   = useState(false);
  const [showNotifications,   setShowNotifications]   = useState(false);
  const [showHamburger,       setShowHamburger]       = useState(false);
  const [notificationCount,   setNotificationCount]   = useState(0);
  const [userRole, setUserRole] = useState('admin');

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data?.role) {
          setUserRole(result.data.role.toLowerCase());
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };
    fetchUserRole();
  }, []);

  const mobileNavItems = propMobileNavItems && propMobileNavItems.length > 0
    ? propMobileNavItems
    : (ROLE_MOBILE_NAV[userRole] || ROLE_MOBILE_NAV.admin);

  const handleProfileClick    = () => { setShowHamburger(false); setShowProfileDrawer(true); };
  const handleCloseProfile    = () => setShowProfileDrawer(false);
  const handleProfileLogout   = () => { setShowProfileDrawer(false); onLogout?.(); };

  const handleNotificationClick  = () => { setShowHamburger(false); setShowNotifications(true); };
  const handleCloseNotifications = () => setShowNotifications(false);

  const toggleHamburger = () => setShowHamburger(prev => !prev);
  const closeHamburger  = () => setShowHamburger(false);

  useEffect(() => {
    if (showProfileDrawer || showNotifications) setShowHamburger(false);
  }, [showProfileDrawer, showNotifications]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setNotificationCount(count);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = mobileNavItems.find(i => i.id === activeTab);

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { currentUserRole: userRole });
    }
    return child;
  });

  return (
    <>
      <style>{`
        .dl-scroll::-webkit-scrollbar { display: none; }
        .dl-scroll { scrollbar-width: none; -ms-overflow-style: none; }

        @keyframes dl-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dl-fade { animation: dl-fade 0.25s ease both; }
      `}</style>

      {/* ── SINGLE UNIFIED LAYOUT CONTAINER ── */}
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 md:bg-gradient-to-br md:from-[#f4f7f6] md:to-[#eef2f0]">

        {/* ── DESKTOP HEADERS (Hidden on Mobile) ── */}
        <div className="hidden md:block shrink-0">
          <DesktopHeader onOpenQR={onOpenQR} />
          <DesktopNav />
        </div>

        {/* ── MOBILE HEADER (Hidden on Desktop) ── */}
        <div className="md:hidden shrink-0">
          <MobileHeader
            userName={userName}
            userId={userId}
            initials={getInitials(userName)}
            onLogout={onLogout}
            onProfileClick={handleProfileClick}
            onNotificationClick={handleNotificationClick}
            notificationCount={notificationCount}
            simple={false}
          />
        </div>

        {/* ── SINGLE MAIN CONTENT AREA (Prevents Double Fetching) ── */}
        <main className="flex-1 min-h-0 overflow-hidden dl-scroll md:pt-0 pt-[64px]">
          <div className="dl-fade h-full w-full flex flex-col">
            {childrenWithProps}
          </div>
        </main>

        {/* ── MOBILE OVERLAYS & NAVIGATION (Hidden on Desktop) ── */}
        <div className="md:hidden">
          <HamburgerDrawerNav
            isOpen={showHamburger}
            activeTab={activeTab}
            onTabChange={onTabChange}
            items={mobileNavItems}
            onClose={closeHamburger}
          />

          <HamburgerButton
            isOpen={showHamburger}
            onClick={toggleHamburger}
          />

          <div
            id="mobile-active-tab-chip"
            style={{
              position: 'fixed',
              bottom: 35,
              right: 84,
              zIndex: 49,
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 999,
              padding: '6px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              opacity: showHamburger ? 0 : 1,
              transform: showHamburger ? 'translateX(6px) scale(0.95)' : 'translateX(0) scale(1)',
              transition: 'all 0.22s ease',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#059669',
              boxShadow: '0 0 6px rgba(5,150,105,0.55)',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: '#1a2e22',
              whiteSpace: 'nowrap',
            }}>
              {activeItem?.label || 'Menu'}
            </span>
          </div>
        </div>

        {/* ── SHARED DRAWERS ── */}
        <ProfileDrawer
          isOpen={showProfileDrawer}
          onClose={handleCloseProfile}
          onLogout={handleProfileLogout}
          userProfile={userProfile}
          forceBottomSheet={true}
        />

        <NotificationPanel
          isOpen={showNotifications}
          onClose={handleCloseNotifications}
        />

      </div>
    </>
  );
};

export default DashboardLayout;