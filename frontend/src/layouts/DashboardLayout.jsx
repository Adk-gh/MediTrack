// frontend/src/layouts/DashboardLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DesktopHeader,
  DesktopNav,
  MobileHeader,
  ProfileDrawer,
  ROLE_NAV_CONFIG,
} from '../components/Headers.jsx';
import { NotificationPanel } from '../components/Notifications.jsx';
import notificationsService from '../services/notifications.service.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Synchronous Role Helper ─────────────────────────────────────────────────
// This function extracts the user role synchronously from localStorage to prevent flash
const getStoredUserRole = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      let role = user.role?.toLowerCase() || '';

      // If role is not set or is student, check classification/job_title
      if (!role || role === 'student') {
        const classification = user.classification?.toLowerCase() || '';
        const jobTitle = user.job_title?.toLowerCase() || '';

        if (classification === 'dentist' || jobTitle.includes('dentist')) {
          return 'dentist';
        } else if (classification === 'doctor' || jobTitle.includes('doctor')) {
          return 'doctor';
        } else if (classification === 'nurse' || jobTitle.includes('nurse')) {
          return 'nurse';
        } else if (
          classification === 'system administrator' ||
          classification === 'sysadmin' ||
          classification === 'administrator'
        ) {
          return 'sysadmin';
        }
      }

      // Return if valid role found
      if (role && ['sysadmin', 'doctor', 'dentist', 'nurse'].includes(role)) {
        return role;
      }
    }
  } catch (e) {
    console.error('Error reading user role:', e);
  }

  return null; // Return null to indicate "loading needed"
};

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

const NavArchiveIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M21 8v13H3V8" />
    <path d="M1 3h22v5H1z" />
    <path d="M10 12h4" />
  </svg>
);

const NavConsultMgmtIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h6" />
  </svg>
);

const NavApptMgmtIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
  </svg>
);

const NavApprovalMgmtIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

// The mobile drawer is generated from the same configuration used by DesktopNav.
// This keeps the labels, order, role permissions, and destinations identical.
const NAV_ICON_BY_ROUTE = {
  '/dashboard': NavHomeIcon,
  '/appointments': NavScheduleIcon,
  '/appointment-management': NavApptMgmtIcon,
  '/records': NavRecordsIcon,
  '/record-management': NavRecordsIcon,
  '/approvals': NavApprovalIcon,
  '/consultations': NavConsultIcon,
  '/consultation-management': NavConsultMgmtIcon,
  '/users': NavUsersIcon,
  '/announcements': NavAnnounceIcon,
  '/reports': NavReportsIcon,
  '/notifications-management': NavAnnounceIcon,
  '/archives': NavArchiveIcon,
  '/audit-logs': NavRecordsIcon,
};

const NAV_ID_BY_ROUTE = {
  '/dashboard': 'dashboard',
  '/appointments': 'appointments',
  '/appointment-management': 'appointmentManagement',
  '/records': 'records',
  '/record-management': 'recordManagement',
  '/approvals': 'approvals',
  '/consultations': 'consultations',
  '/consultation-management': 'consultationManagement',
  '/users': 'users',
  '/announcements': 'announcements',
  '/reports': 'reports',
  '/notifications-management': 'notificationsManagement',
  '/archives': 'archives',
  '/audit-logs': 'auditLogs',
};

const getMobileNavItems = (role) => {
  const desktopItems = ROLE_NAV_CONFIG[role] || ROLE_NAV_CONFIG.sysadmin;

  return desktopItems.map((item) => ({
    ...item,
    id: NAV_ID_BY_ROUTE[item.to] || item.to,
    Icon: NAV_ICON_BY_ROUTE[item.to] || NavRecordsIcon,
  }));
};

// ─── Mobile left-side navigation drawer ──────────────────────────────────────
function HamburgerDrawerNav({ isOpen, activeTab, onTabChange, items, onClose }) {
  const drawerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelect = (item) => {
    if (typeof onTabChange === 'function') {
      onTabChange(item.id);
    }

    if (item.to && location.pathname !== item.to) {
      navigate(item.to);
    }

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
          background: 'rgba(8, 18, 12, 0.42)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 45,
          width: 'min(82vw, 320px)',
          background: '#ffffff',
          borderRight: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: '0 20px 20px 0',
          boxShadow: '18px 0 50px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-105%)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div style={{
          background: 'linear-gradient(135deg, #466460 0%, #38524d 100%)',
          padding: 'calc(env(safe-area-inset-top, 0px) + 17px) 18px 17px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 800, color: '#ffffff',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Navigation
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '10px 0 calc(env(safe-area-inset-bottom, 0px) + 12px)', overflowY: 'auto', flex: 1 }}>
          {items.map((item) => {
            const isActive = item.to
              ? location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              : activeTab === item.id;
            const Icon = item.Icon || item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
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

  // Initialize with stored role synchronously to prevent flash
  const storedRole = getStoredUserRole();
  const [userRole, setUserRole] = useState(storedRole || 'unknown');
  const [isRoleLoading, setIsRoleLoading] = useState(storedRole === null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // First try to get role from localStorage user object
        const rawUser = localStorage.getItem('user');
        if (rawUser) {
          const user = JSON.parse(rawUser);
          let role = user.role?.toLowerCase() || '';

          // If role is not set or is student, check classification/job_title
          if (!role || role === 'student') {
            const classification = user.classification?.toLowerCase() || '';
            const jobTitle = user.job_title?.toLowerCase() || '';

            if (classification === 'dentist' || jobTitle.includes('dentist')) {
              role = 'dentist';
            } else if (classification === 'doctor' || jobTitle.includes('doctor')) {
              role = 'doctor';
            } else if (classification === 'nurse' || jobTitle.includes('nurse')) {
              role = 'nurse';
            } else if (
              classification === 'system administrator' ||
              classification === 'sysadmin' ||
              classification === 'administrator'
            ) {
              role = 'sysadmin';
            }
          }

          if (role) {
            setUserRole(role);
            setIsRoleLoading(false);
            return;
          }
        }

        // Fallback to API call if not in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setIsRoleLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data?.role) {
          setUserRole(result.data.role.toLowerCase());
        } else if (result.success && result.data?.classification) {
          // Use classification from profile as fallback
          const classification = result.data.classification.toLowerCase();
          const jobTitle = (result.data.job_title || '').toLowerCase();

          if (classification === 'dentist' || jobTitle.includes('dentist')) {
            setUserRole('dentist');
          } else if (classification === 'doctor' || jobTitle.includes('doctor')) {
            setUserRole('doctor');
          } else if (classification === 'nurse' || jobTitle.includes('nurse')) {
            setUserRole('nurse');
          } else if (
            classification === 'system administrator' ||
            classification === 'sysadmin' ||
            classification === 'administrator'
          ) {
            setUserRole('sysadmin');
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      } finally {
        setIsRoleLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  // Use stored role for navigation items, default to admin only after loading completes
  const effectiveRole = isRoleLoading ? (storedRole || 'unknown') : userRole;

  const mobileNavItems = propMobileNavItems && propMobileNavItems.length > 0
    ? propMobileNavItems
    : getMobileNavItems(effectiveRole);

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

      {/* ── Loading State (prevents role flash) ── */}
      {isRoleLoading && storedRole === null && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-emerald-700 font-medium">Loading...</span>
          </div>
        </div>
      )}

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
            onMenuClick={toggleHamburger}
            isMenuOpen={showHamburger}
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
