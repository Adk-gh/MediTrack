import React, { useState, useEffect } from "react";

// ─── Icons (Replacing Emojis) ─────────────────────────────────────────────────
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

const AccountIcon = ({ active }) => (
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

// ─── Data shared between desktop sidebar / mobile nav ─────────────────────────
const DESKTOP_NAV = [
  { id: "home",    label: "Home",    icon: HomeIcon },
  { id: "booking", label: "Booking", icon: CalendarIcon },
  { id: "consult", label: "Consult", icon: ConsultIcon },
  { id: "records", label: "Records", icon: RecordsIcon },
  { id: "account", label: "Account", icon: AccountIcon },
];

const MOBILE_NAV = [
  { id: "home",    label: "Home",    icon: HomeIcon },
  { id: "booking", label: "Booking", icon: CalendarIcon },
  { id: "consult", label: "Consult", icon: ConsultIcon },
  { id: "records", label: "Records", icon: RecordsIcon },
  { id: "account", label: "Account", icon: AccountIcon },
];

// ─── Preview Modal ─────────────────────────────────────────────────────────────
export function PreviewModal({ record, onClose, isDesktop }) {
  if (!record) return null;

  if (isDesktop) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">
              Medical Document Preview
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 text-xl transition-colors">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="bg-slate-50 rounded-3xl p-6 text-center">
              <div className="mb-3"><DocumentPreviewIcon /></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                {record.title}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 mb-5">{record.date}</p>
              <div className="space-y-3 text-left">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1.5">
                    Clinical Assessment
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed italic">{record.desc}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">
                    Physician in Charge
                  </p>
                  <p className="text-xs font-bold text-slate-700">{record.doc}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex gap-3">
            <button className="flex-1 py-3 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 hover:bg-[#4a6b4f] transition-colors">
              Download PDF
            </button>
            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              Print
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
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 text-2xl leading-none">
          ‹
        </button>
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.12em]">
          Medical Document Preview
        </span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="bg-slate-50 rounded-3xl p-5 text-center">
          <div className="mb-3"><DocumentPreviewIcon /></div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {record.title}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 mt-0.5 mb-5">{record.date}</p>
          <div className="space-y-3 text-left">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1.5">
                Clinical Assessment
              </p>
              <p className="text-xs text-slate-600 leading-relaxed italic">{record.desc}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">
                Physician in Charge
              </p>
              <p className="text-xs font-bold text-slate-700">{record.doc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-10 pt-4 border-t border-slate-100 space-y-3 flex-shrink-0">
        <button className="w-full py-4 bg-[#557a5b] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">
          Download as PDF
        </button>
        <button className="w-full py-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2">
          Print Record
        </button>
      </div>
    </div>
  );
}

// ─── Desktop shell ─────────────────────────────────────────────────────────────
function DesktopShell({ activeTab, onTabChange, userName, userId, preview, onClosePreview, children }) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top Bar - No Sign Out Button */}
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="../logo.jpg" 
            alt="MediTrack Logo" 
            className="w-30 h-11 object-contain rounded-xl"/>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold text-slate-700">{userName}</p>
            <p className="text-[9px] text-slate-400">{userId}</p>
          </div>
          <div className="w-9 h-9 bg-[#557a5b]/10 rounded-xl flex items-center justify-center text-[#557a5b] font-black text-sm">
            {initials}
          </div>
        </div>
      </header>

      {/* Body: Widened the layout constraint here for proper desktop view */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-6 md:px-8 py-8 gap-8">

        {/* Left Sidebar — Nav */}
        <aside className="w-56 flex-shrink-0">
          <nav className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 sticky top-24">
            {DESKTOP_NAV.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 mb-1 last:mb-0 ${
                    isActive
                      ? "bg-[#557a5b] text-white shadow-md shadow-green-900/15"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {IconComponent && <IconComponent active={isActive} />}
                  </div>
                  <span className="text-[12px] font-bold">{item.label}</span>
                </button>
              );
            })}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] mb-1">
                  Status
                </p>
                <p className="text-[11px] font-bold text-emerald-600">CLEARED / FIT</p>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content: Allowed to fill out to max-w-4xl (approx 896px) */}
        <main className="flex-1 w-full max-w-4xl">
          <div 
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" 
            style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
          >
            <div className="overflow-y-auto flex-1">
              {children}
            </div>
          </div>
        </main>

      </div>

      {/* Preview modal lives at layout level so it overlays everything */}
      {preview && (
        <PreviewModal record={preview} onClose={onClosePreview} isDesktop />
      )}
    </div>
  );
}

// ─── Mobile shell ──────────────────────────────────────────────────────────────
function MobileShell({ activeTab, onTabChange, userName, userId, preview, onClosePreview, children }) {
  return (
    <div className="relative flex flex-col min-h-screen bg-slate-50 font-sans">

      {/* Mobile Top Bar - No Sign Out Button */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="MediTrack Logo" 
            className="w-15 h-11 object-contain rounded-xl"/>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-700 leading-tight">{userName}</p>
            <p className="text-[8px] text-slate-400 leading-tight">{userId}</p>
          </div>
        </div>
      </header>

      {/* Scrollable page content */}
      <div className="flex-1 overflow-y-auto pb-24 relative">
        {children}

        {/* Preview modal (mobile full-screen) sits inside scroll container */}
        <PreviewModal record={preview} onClose={onClosePreview} isDesktop={false} />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 z-20 shadow-lg">
        <div className="flex justify-around">
          {MOBILE_NAV.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
                  isActive ? "text-[#557a5b]" : "text-slate-400"
                }`}
              >
                <div className={`transition-transform flex items-center justify-center mb-0.5 w-6 h-6 ${isActive ? "scale-110" : ""}`}>
                  {IconComponent && <IconComponent active={isActive} />}
                </div>
                
                <span className={`text-[8px] font-black uppercase tracking-wide ${isActive ? "text-[#557a5b]" : "text-slate-400"}`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <span className="w-1 h-1 bg-[#557a5b] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
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

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 641);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sharedProps = {
    activeTab,
    onTabChange,
    onLogout, // Pass down to children so ProfileUsers receives it
    userName,
    userId,
    preview,
    onClosePreview,
    children,
  };

  return isDesktop
    ? <DesktopShell {...sharedProps} />
    : <MobileShell  {...sharedProps} />;
}