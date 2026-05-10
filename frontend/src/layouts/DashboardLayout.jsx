// frontend/src/layouts/DashboardLayout.jsx
//
// Responsive layout shell:
//   • Desktop  (md+) → DesktopHeader (topbar) + DesktopNav (link bar) — unchanged
//   • Mobile   (<md) → MobileHeader (sticky topbar) + MobileNav (bottom tabs)
//
// Props
//   children        – the active view rendered in the content area
//   onOpenQR        – forwarded to DesktopHeader's QR action button
//   activeTab       – current mobile tab key  (controlled by parent)
//   onTabChange     – (tabKey: string) => void
//   mobileNavItems  – [{ id, label, emoji }] overrides the default bottom-nav items
//   userName        – display name shown in MobileHeader
//   userId          – ID string shown under the name in MobileHeader
//   onLogout        – logout handler wired into MobileHeader's sign-out button

import React, { useState } from 'react';
import {
  DesktopHeader,
  DesktopNav,
  MobileHeader,
  MobileNav,
  HomeIcon,
  CalendarIcon,
  ConsultIcon,
  RecordsIcon,
  AccountIcon,
  ExamIcon,
  AnnouncementIcon,
  UsersIcon,
  ApprovalsIcon,
  ProfileDrawer,
} from '../components/Headers.jsx';

// ─── Default mobile nav items ─────────────────────────────────────────────────
const DEFAULT_MOBILE_NAV = [
  { id: 'dashboard',     label: 'Home',     icon: HomeIcon },
  { id: 'records',       label: 'Records',  icon: RecordsIcon },
  { id: 'appointments',  label: 'Schedule', icon: CalendarIcon },
  { id: 'examinations',  label: 'Exam',     icon: ExamIcon },
  { id: 'approvals',     label: 'Approval', icon: ApprovalsIcon },
  { id: 'consultations', label: 'Consult',  icon: ConsultIcon },
  { id: 'announcements', label: 'Announce', icon: AnnouncementIcon },
  { id: 'users',         label: 'Users',    icon: UsersIcon },
];

// ─── Layout ───────────────────────────────────────────────────────────────────
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

  const handleProfileClick  = () => setShowProfileDrawer(true);
  const handleCloseProfile  = () => setShowProfileDrawer(false);
  const handleProfileLogout = () => { setShowProfileDrawer(false); onLogout?.(); };

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
          The shell is exactly viewport-height and never scrolls itself.
          Each page/view is responsible for its own internal scrolling.

            ┌──────────────────────────────────────┐  ← h-screen, overflow-hidden
            │  DesktopHeader  (shrink-0)           │
            ├──────────────────────────────────────┤
            │  DesktopNav     (shrink-0)           │
            ├──────────────────────────────────────┤
            │  <main>  flex-1, overflow-hidden      │  ← hands full height to children
            └──────────────────────────────────────┘
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[#f4f7f6] to-[#eef2f0]">
        <div className="shrink-0"><DesktopHeader onOpenQR={onOpenQR} /></div>
        <div className="shrink-0"><DesktopNav /></div>
        <main className="flex-1 min-h-0 overflow-hidden">
          {/* dl-fade + h-full so the child can fill & scroll internally */}
          <div className="dl-fade h-full">{children}</div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE (<md)
          Same principle — the shell is h-screen, overflow-hidden.
          Only the scrollable content div scrolls.

            ┌──────────────────────────┐  ← h-screen, overflow-hidden
            │  MobileHeader  (64 px)   │  fixed topbar (handled via pt offset)
            ├──────────────────────────┤
            │  scrollable children     │  flex-1, overflow-y-auto
            ├──────────────────────────┤
            │  MobileNav     (70 px)   │  fixed bottom (handled via pb offset)
            └──────────────────────────┘
      ════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative flex flex-col h-screen overflow-hidden bg-slate-50">

        <MobileHeader
          userName={userName}
          userId={userId}
          initials={getInitials(userName)}
          onLogout={onLogout}
          onProfileClick={handleProfileClick}
          simple={false}
        />

        {/* Scrollable content — only this div scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-[64px] pb-[70px] dl-scroll">
          <div className="dl-fade">{children}</div>
        </div>

        <MobileNav
          active={activeTab}
          onSwitch={onTabChange}
          items={mobileNavItems}
        />

        <ProfileDrawer
          isOpen={showProfileDrawer}
          onClose={handleCloseProfile}
          onLogout={handleProfileLogout}
          userProfile={userProfile}
          forceBottomSheet={true}
        />

      </div>
    </>
  );
};

export default DashboardLayout;