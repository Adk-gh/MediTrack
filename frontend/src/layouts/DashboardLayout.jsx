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

import React from 'react';
import {
  DesktopHeader,
  DesktopNav,
  MobileHeader,
  MobileNav,
} from '../components/Headers.jsx';

// ─── Default mobile nav items ─────────────────────────────────────────────────
// Mirrors the links in DesktopNav. Override via the `mobileNavItems` prop.
const DEFAULT_MOBILE_NAV = [
  { id: 'dashboard',     label: 'Home',     emoji: '🏠' },
  { id: 'records',       label: 'Records',  emoji: '📋' },
  { id: 'appointments',  label: 'Schedule', emoji: '📅' },
  { id: 'consultations', label: 'Consult',  emoji: '💬' },
  { id: 'users',         label: 'Users',    emoji: '👥' },
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
}) => {
  // Derive two-letter initials from userName
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase() || 'AU';
  };

  return (
    <>
      {/* Scoped utility styles — scrollbar hide + fade-in animation */}
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
          DESKTOP  (md and above)
          Preserves the original layout exactly:
            ┌──────────────────────────────────────┐
            │  DesktopHeader  (gradient topbar)    │
            ├──────────────────────────────────────┤
            │  DesktopNav     (white link bar)     │
            ├──────────────────────────────────────┤
            │  <main>  scrollable content          │
            └──────────────────────────────────────┘
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen flex-col bg-gradient-to-br from-[#f4f7f6] to-[#eef2f0]">
        <DesktopHeader onOpenQR={onOpenQR} />
        <DesktopNav />
        <main className="flex-1 w-full overflow-y-auto dl-scroll">
          <div className="dl-fade">{children}</div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE  (below md) — mirrors MediTrack's UserDashboardLayout
            ┌──────────────────────────┐
            │  MobileHeader  (64 px)   │  sticky topbar
            ├──────────────────────────┤
            │                          │
            │  scrollable children     │  flex-1, pt-[64px] pb-[70px]
            │                          │
            ├──────────────────────────┤
            │  MobileNav     (70 px)   │  fixed bottom tab bar
            └──────────────────────────┘
      ════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative flex flex-col h-screen bg-slate-50 overflow-hidden">

        {/* Sticky topbar — avatar, name, bell, logout */}
        <MobileHeader
          userName={userName}
          userId={userId}
          initials={getInitials(userName)}
          onLogout={onLogout}
        />

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pt-[64px] pb-[70px] dl-scroll">
          <div className="dl-fade">{children}</div>
        </div>

        {/* Bottom tab bar */}
        <MobileNav
          active={activeTab}
          onSwitch={onTabChange}
          items={mobileNavItems}
        />

      </div>
    </>
  );
};

export default DashboardLayout;