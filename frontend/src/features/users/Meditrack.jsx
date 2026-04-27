import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "../../components/Headers.jsx";
import authService from "../../services/auth.service.js";
import ProfileSetup from "../../components/ProfileSetup.jsx";
// ─── Data ────────────────────────────────────────────────────────────────────
const records = [
  { id: 1, date: "Feb 18, 2026", title: "Medical Clearance",   desc: "Patient is clinically fit for academic internship and physical education activities.", doc: "Dr. Suarez, MD"  },
  { id: 2, date: "Jan 10, 2026", title: "Consultation",        desc: "Seasonal Influenza. Prescribed 3 days rest and Vitamin C supplement.",               doc: "Dr. Mercado, MD" },
  { id: 3, date: "Nov 12, 2025", title: "Dental Exam",         desc: "Routine cleaning completed. Recommended molar checkup in 6 months.",                 doc: "Dr. Lanto, DMD"  },
  { id: 4, date: "Oct 05, 2025", title: "Laboratory Referral", desc: "Annual CBC and Chest X-Ray referral issued for campus compliance.",                   doc: "Dr. Suarez, MD"  },
  { id: 5, date: "Sep 20, 2025", title: "First Aid",           desc: "Treatment for minor sprain on right ankle during campus event.",                      doc: "Nurse Ramos, RN" },
];

const TAG_ICON = {
  "Medical Clearance":   "🛡️",
  Consultation:          "🩺",
  "Dental Exam":         "🦷",
  "Laboratory Referral": "🧪",
  "First Aid":           "🩹",
};

// ─── Shared Atoms ─────────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div className="border-b border-slate-100 pb-2">
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.12em]">{label}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.08em] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ readOnly, ...props }) {
  return (
    <input
      readOnly={readOnly}
      {...props}
      className={`w-full px-3 py-2.5 ${readOnly ? "bg-slate-50" : "bg-white"} border border-slate-200 rounded-lg text-[12px] text-slate-800 outline-none focus:border-[#557a5b] transition-colors`}
    />
  );
}

function SelectInput({ options = [], defaultValue }) {
  return (
    <select
      defaultValue={defaultValue}
      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-800 outline-none focus:border-[#557a5b] transition-colors appearance-none"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

// ─── Shared Views ─────────────────────────────────────────────────────────────
function HomeView({ userName }) {
  const firstName = userName?.split(" ")[0] || "Student";
  return (
    <div className="p-5 space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Hello, {firstName}!</h2>
        <p className="text-[11px] text-slate-400 font-medium mt-1">Welcome to your University Health Portal.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.12em] mb-1">Clinic Status</p>
          <p className="text-sm font-bold text-emerald-600">CLEARED / FIT</p>
        </div>
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">🛡️</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-2xl font-black text-slate-800 leading-none">05</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Clinic Visits</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-2xl font-black text-red-500 leading-none">O+</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Blood Type</p>
        </div>
      </div>

      <div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.12em] mb-3">Recent Activity</p>
        <div className="space-y-2">
          {records.slice(0, 3).map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3">
              <span className="text-base">{TAG_ICON[r.title] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-700 truncate">{r.title}</p>
                <p className="text-[9px] text-slate-400">{r.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ onPreview }) {
  return (
    <div className="p-5 animate-fadeIn">
      <h2 className="text-xl font-black text-slate-800 mb-5">Medical Logs</h2>
      <div className="space-y-3">
        {records.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-xl">{TAG_ICON[r.title] ?? "📋"}</span>
              <div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em]">{r.date}</p>
                <p className="text-sm font-bold text-slate-700">{r.title}</p>
              </div>
            </div>
            <button
              onClick={() => onPreview(r)}
              className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-sm"
            >
              👁️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ userName, userId }) {
  return (
    <div className="p-5 animate-fadeIn pb-10">
      <div className="text-center mb-7">
        <div className="w-12 h-12 bg-[#557a5b]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🏥</div>
        <h2 className="text-sm font-extrabold text-[#557a5b]">Health Profile Registration</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">
          University Health Services Office • PLSP
        </p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <SectionDivider label="Personal Information" />
        <Field label="Full Name"><Input value={userName || "De Vera, Jenny"} readOnly /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Student Number"><Input value={userId || "23-00142"} readOnly /></Field>
          <Field label="Gender">
            <SelectInput defaultValue="Female" options={["Select Gender", "Female", "Male"]} />
          </Field>
        </div>
        <Field label="Age"><Input type="number" defaultValue="21" /></Field>

        <SectionDivider label="Academic Details" />
        <Field label="Department">
          <SelectInput defaultValue="College of Computer Studies" options={["Select Dept", "College of Computer Studies", "College of Engineering"]} />
        </Field>
        <Field label="Program / Course">
          <SelectInput defaultValue="BS Information Technology" options={["Select Program", "BS Information Technology"]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year Level">
            <SelectInput defaultValue="3rd Year" options={["1st Year", "2nd Year", "3rd Year", "4th Year"]} />
          </Field>
          <Field label="Section"><Input defaultValue="BSIT-3" /></Field>
        </div>

        <SectionDivider label="Contact Information" />
        <Field label="PLSP Email Address"><Input type="email" defaultValue="jenny.00142@plsp.edu.ph" /></Field>
        <Field label="Emergency Contact Person & Number"><Input placeholder="Name - 0912 345 6789" /></Field>

        <button
          type="submit"
          className="w-full py-4 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-green-900/10 active:scale-95 transition-transform mt-2"
        >
          Submit Health Profile
        </button>
      </form>
    </div>
  );
}

// ─── Logout Icon ──────────────────────────────────────────────────────────────
function LogoutIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ record, onClose, isDesktop }) {
  if (!record) return null;

  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          style={{ maxHeight: "80vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">Medical Document Preview</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 text-xl transition-colors"
            >✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="bg-slate-50 rounded-3xl p-6 text-center">
              <div className="text-5xl mb-3">{TAG_ICON[record.title] ?? "📋"}</div>
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
            <button className="flex-1 py-3 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 hover:bg-[#4a6b4f] transition-colors">
              ⬇ Download PDF
            </button>
            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              🖨 Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: full-screen slide-up
  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-slideUp">
      <div className="flex justify-between items-center px-5 pt-12 pb-4 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 text-2xl leading-none">‹</button>
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">Medical Document Preview</span>
        <div className="w-8" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="bg-slate-50 rounded-3xl p-5 text-center">
          <div className="text-4xl mb-3">{TAG_ICON[record.title] ?? "📋"}</div>
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
        <button className="w-full py-4 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">
          ⬇ Download as PDF
        </button>
        <button className="w-full py-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2">
          🖨 Print Record
        </button>
      </div>
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────
const DESKTOP_NAV = [
  { id: "home",    label: "Home",    emoji: "🏠" },
  { id: "history", label: "History", emoji: "🕐" },
  { id: "profile", label: "Profile", emoji: "✏️" },
];

function DesktopLayout({ activeTab, setActiveTab, preview, setPreview, onLogout, userName, userId }) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

  const VIEW = {
    home:    <HomeView userName={userName} />,
    history: <HistoryView onPreview={setPreview} />,
    profile: <ProfileView userName={userName} userId={userId} />,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#557a5b] rounded-xl flex items-center justify-center text-white font-black text-lg">+</div>
          <span className="text-base font-black text-slate-800 tracking-tight">MediTrack</span>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1 hidden sm:block">
            University Health Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold text-slate-700">{userName}</p>
            <p className="text-[9px] text-slate-400">{userId}</p>
          </div>
          <div className="w-9 h-9 bg-[#557a5b]/10 rounded-xl flex items-center justify-center text-[#557a5b] font-black text-sm">
            {initials}
          </div>
          <button
            onClick={onLogout}
            title="Secure Logout"
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center ml-1"
          >
            <LogoutIcon size={16} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-8 gap-6">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0">
          <nav className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 sticky top-24">
            {DESKTOP_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 mb-1 last:mb-0 ${
                  activeTab === item.id
                    ? "bg-[#557a5b] text-white shadow-md shadow-green-900/15"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                <span className="text-[12px] font-bold">{item.label}</span>
              </button>
            ))}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">Status</p>
                <p className="text-[11px] font-bold text-emerald-600">✓ CLEARED / FIT</p>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 text-red-400 hover:bg-red-50 hover:text-red-500"
              >
                <LogoutIcon size={15} />
                <span className="text-[12px] font-bold">Sign Out</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex justify-center">
          <div
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            style={{ width: "100%", maxWidth: "480px", minHeight: "600px" }}
          >
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 180px)", maxHeight: "720px" }}>
              {VIEW[activeTab]}
            </div>
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sticky top-24 space-y-4">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.12em]">Quick Stats</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-medium">Clinic Visits</span>
                <span className="text-[11px] font-black text-slate-800">05</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-medium">Blood Type</span>
                <span className="text-[11px] font-black text-red-500">O+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-medium">Records</span>
                <span className="text-[11px] font-black text-slate-800">{records.length}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.12em] mb-2">Last Visit</p>
              <p className="text-[10px] font-bold text-slate-700">{records[0].title}</p>
              <p className="text-[9px] text-slate-400">{records[0].date}</p>
            </div>
          </div>
        </aside>
      </div>

      {preview && <PreviewModal record={preview} onClose={() => setPreview(null)} isDesktop />}
    </div>
  );
}

// ─── Nav Items (mobile) ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",    label: "Home",    emoji: "🏠" },
  { id: "history", label: "History", emoji: "🕐" },
  { id: "profile", label: "Profile", emoji: "✏️" },
];

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function MediTrack() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("home");
  const [preview,   setPreview]   = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 641);
  const [showOnboarding, setShowOnboarding] = useState(false); // 👈 MODAL STATE
  const scrollRef = useRef(null);

  const currentUser = authService.getCurrentUser();
  const userName    = currentUser?.name         || "Student";
  const userId      = currentUser?.universityId || "—";

  // ── ONBOARDING CHECK ───────────────────────────────────────────────────
  useEffect(() => {
    const checkProfileSetup = async () => {
      if (!currentUser) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
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

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 641);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const VIEW = {
    home:    <HomeView userName={userName} />,
    history: <HistoryView onPreview={setPreview} />,
    profile: <ProfileView userName={userName} userId={userId} />,
  };

  return (
    <>
      {/* 🔴 ONBOARDING MODAL OVERLAY 🔴 */}
      {showOnboarding && (
        <ProfileSetup 
          user={currentUser} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      {isDesktop ? (
        <DesktopLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          preview={preview}
          setPreview={setPreview}
          onLogout={handleLogout}
          userName={userName}
          userId={userId}
        />
      ) : (
        <MobileLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userName={userName}
          userId={userId}
          bottomNavItems={NAV_ITEMS}
          onLogout={handleLogout}
        >
          {VIEW[activeTab]}
          <PreviewModal record={preview} onClose={() => setPreview(null)} isDesktop={false} />
        </MobileLayout>
      )}
    </>
  );
}