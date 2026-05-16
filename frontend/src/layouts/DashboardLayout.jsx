// frontend/src/layouts/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import {
  DesktopHeader,
  DesktopNav,
  MobileHeader,
  ProfileDrawer,
} from '../components/Headers.jsx';
import { NotificationPanel } from '../components/Notifications.jsx';
import notificationsService from '../services/notifications.service.js';

// ─── SVG Icons (Unified style for Pill Nav) ──────────────────────────────────
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

// ─── Default mobile nav items ─────────────────────────────────────────────────
const DEFAULT_MOBILE_NAV = [
  { id: 'dashboard',     label: 'Home',     Icon: NavHomeIcon },
  { id: 'records',       label: 'Records',  Icon: NavRecordsIcon },
  { id: 'appointments',  label: 'Schedule', Icon: NavScheduleIcon },
  { id: 'examinations',  label: 'Exam',     Icon: NavExamIcon },
  { id: 'approvals',     label: 'Approval', Icon: NavApprovalIcon },
  { id: 'consultations', label: 'Consult',  Icon: NavConsultIcon },
  { id: 'announcements', label: 'Announce', Icon: NavAnnounceIcon },
  { id: 'users',         label: 'Users',    Icon: NavUsersIcon },
];

// ─── Floating Pill Nav ────────────────────────────────────────────────────────
function MobilePillNav({ activeTab, onTabChange, items, hidden }) {
  const [vw, setVw] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scale  = Math.min(1.1, Math.max(0.85, vw / 360));
  const pillH  = Math.round(56 * scale);
  const bubble = Math.round(48 * scale);
  const iconSm = Math.round(18 * scale);
  const iconLg = Math.round(20 * scale);
  const labelSz= Math.max(9, Math.round(10 * scale));
  const popUp  = Math.round(24 * scale);
  const bottomOffset = Math.round(20 * scale);

  // Fixed width to prevent squishing when there are 8 items
  const itemWidth = Math.round(62 * scale);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40, // Low enough so modals/drawers cover it
        pointerEvents: "none",
        // Smoothly translate the nav down and fade it out when hidden is true
        transform: hidden ? "translateY(100%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        className="dl-scroll"
        style={{
          width: "100%",
          overflowX: "auto",
          pointerEvents: hidden ? "none" : "auto",
          paddingTop: popUp + 10,
          paddingBottom: bottomOffset,
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "max-content",
            minWidth: "100%",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#ffffff",
              borderRadius: 999,
              padding: `0 ${Math.round(4 * scale)}px`,
              height: pillH,
              boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
            }}
          >
            {items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.Icon || item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  style={{
                    flex: "0 0 auto", // Stops buttons from squishing
                    width: itemWidth,
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
                    <div style={{ width: isActive ? iconLg : iconSm, height: isActive ? iconLg : iconSm }}>
                      <Icon active={isActive} />
                    </div>
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
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Layout Component ────────────────────────────────────────────────────────
export const DashboardLayout = ({
  children,
  onOpenQR,
  activeTab,
  onTabChange,
  mobileNavItems = DEFAULT_MOBILE_NAV,
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

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleProfileClick  = () => setShowProfileDrawer(true);
  const handleCloseProfile  = () => setShowProfileDrawer(false);
  const handleProfileLogout = () => { setShowProfileDrawer(false); onLogout?.(); };

  const handleNotificationClick = () => setShowNotifications(true);
  const handleCloseNotifications = () => setShowNotifications(false);

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

  // Determine if any blocking overlay is open so we can hide the bottom nav
  const isOverlayOpen = showProfileDrawer || showNotifications;

  return (
    <>
      <style>{`
        .dl-scroll::-webkit-scrollbar { display: none; }
        .dl-scroll { scrollbar-width: none; -ms-overflow-style: none; }

        @keyframes dl-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .dl-fade { animation: dl-fade 0.25s ease both; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP (md+)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[#f4f7f6] to-[#eef2f0]">
        <div className="shrink-0"><DesktopHeader onOpenQR={onOpenQR} /></div>
        <div className="shrink-0"><DesktopNav /></div>
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="dl-fade h-full">{children}</div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE (<md)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative flex flex-col h-screen overflow-hidden bg-slate-50">

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

        {/* CRITICAL FIX:
          1. paddingTop: '64px' clears the top header
          2. paddingBottom: '90px' ensures content has a safe zone from the pill nav
          3. min-h-full allows the content inside to naturally expand to full height
        */}
        <div
          className="flex-1 min-h-0 overflow-y-auto dl-scroll"
          style={{ paddingTop: '64px', paddingBottom: '90px' }}
        >
          <div className="dl-fade min-h-full flex flex-col">
            {children}
            {/* Safe spacer for bottom padding */}
            <div style={{ height: '24px', flexShrink: 0, width: '100%' }} />
          </div>
        </div>

        <MobilePillNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          items={mobileNavItems}
          hidden={isOverlayOpen}
        />

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