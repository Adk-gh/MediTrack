// frontend/src/features/users/MediTrack.jsx
//
// Root orchestrator for the student portal.
// All layout chrome (topbar, sidebar, mobile nav, preview modal) lives in
// UserDashboardLayout.  This file only manages:
//   • auth / user identity
//   • active tab state
//   • record-preview state
//   • onboarding guard (ProfileSetup)
//   • the VIEW map that routes tabs → child components

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import authService from "../../services/auth.service.js";
import ProfileSetup from "../../components/ProfileSetup.jsx";

// Layout shell (handles desktop ↔ mobile, nav, topbar, preview modal)
import UserDashboardLayout from "../../layouts/UserDashboardLayout.jsx";

// Child view components
import HomePageUsers     from "./HomePage-users.jsx";
import AppointmentUsers  from "./Appointment-users.jsx";
import ConsultationUsers from "./Consultation-users.jsx";
import RecordsUsers      from "./Records-users.jsx";
import ProfileUsers      from "./Profile-users.jsx";

// ─── Icons (Replacing Emojis) ─────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const HeartbeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const ToothIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 20s4-1 4-6V7c0-2.2-1.8-4-4-4S8 4.8 8 7v7c0 5 4 6 4 6z" />
    <line x1="12" y1="20" x2="12" y2="12" />
  </svg>
);

const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 3H15M10 3V14L5.5 21H18.5L14 14V3M6 16H18" />
  </svg>
);

const BandageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M12 10v4m-2-2h4" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── History view (inline — small enough to live here) ────────────────────────
const records = [
  { id: 1, date: "Feb 18, 2026", title: "Medical Clearance",   desc: "Patient is clinically fit for academic internship and physical education activities.", doc: "Dr. Suarez, MD"  },
  { id: 2, date: "Jan 10, 2026", title: "Consultation",        desc: "Seasonal Influenza. Prescribed 3 days rest and Vitamin C supplement.",               doc: "Dr. Mercado, MD" },
  { id: 3, date: "Nov 12, 2025", title: "Dental Exam",         desc: "Routine cleaning completed. Recommended molar checkup in 6 months.",                 doc: "Dr. Lanto, DMD"  },
  { id: 4, date: "Oct 05, 2025", title: "Laboratory Referral", desc: "Annual CBC and Chest X-Ray referral issued for campus compliance.",                  doc: "Dr. Suarez, MD"  },
  { id: 5, date: "Sep 20, 2025", title: "First Aid",           desc: "Treatment for minor sprain on right ankle during campus event.",                       doc: "Nurse Ramos, RN" },
];

const TAG_ICON = {
  "Medical Clearance":   <ShieldIcon />,
  "Consultation":        <HeartbeatIcon />,
  "Dental Exam":         <ToothIcon />,
  "Laboratory Referral": <FlaskIcon />,
  "First Aid":           <BandageIcon />,
};

function HistoryView({ onPreview }) {
  return (
    <div className="p-5 animate-fadeIn">
      <h2 className="text-xl font-black text-slate-800 mb-5">Medical Logs</h2>
      <div className="space-y-3">
        {records.map((r) => (
          <div
            key={r.id}
            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center">
                {TAG_ICON[r.title]}
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em]">
                  {r.date}
                </p>
                <p className="text-sm font-bold text-slate-700">{r.title}</p>
              </div>
            </div>
            <button
              onClick={() => onPreview(r)}
              className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <EyeIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function MediTrack() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState("home");
  const [preview,        setPreview]        = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const scrollRef = useRef(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const currentUser = authService.getCurrentUser();
  const userName    = currentUser?.name         || "Student";
  const userId      = currentUser?.universityId || "—";

  // ── Onboarding guard ───────────────────────────────────────────────────────
  useEffect(() => {
    const checkProfileSetup = async () => {
      if (!currentUser) return;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && !result.data.isProfileSetup) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
      }
    };
    checkProfileSetup();
  }, [currentUser]);

  // ── Scroll-to-top on tab change ────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // ── View map ───────────────────────────────────────────────────────────────
  // "history" is desktop-only (it's in the desktop nav but not the mobile nav).
  // "account" is the unified key for both mobile "Account" and desktop "Account".
  const VIEW = {
    home:    <HomePageUsers     userName={userName} />,
    booking: <AppointmentUsers  />,
    consult: <ConsultationUsers />,
    records: <RecordsUsers      />,
    history: <HistoryView       onPreview={setPreview} />,
    account: <ProfileUsers      userName={userName} userId={userId} onLogout={handleLogout} />, // Passed onLogout here
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Onboarding overlay — rendered above everything until dismissed */}
      {showOnboarding && (
        <ProfileSetup
          user={currentUser}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <UserDashboardLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        preview={preview}
        onClosePreview={() => setPreview(null)}
        onLogout={handleLogout}
        userName={userName}
        userId={userId}
      >
        {/* The active view is passed as children into the layout's content area */}
        {VIEW[activeTab]}
      </UserDashboardLayout>
    </>
  );
}