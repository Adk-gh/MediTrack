// C:\Users\HP\MediTrack\frontend\src\features\users\HomePageUsers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service.js';
import * as announcementsService from '../../services/announcements.service';
import { useAppointments } from '../../context/AppointmentContext';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

// Map the 24hr string to the 12hr slot label
const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const startH = 7 + i;
  const endH   = startH + 1;
  const fmt = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hr     = h % 12 || 12;
    return `${hr}:00 ${period}`;
  };
  return {
    value: `${String(startH).padStart(2, '0')}:00`,
    label: `${fmt(startH)} – ${fmt(endH)}`,
  };
});

const formatApptTime = (timeValue) => {
  if (!timeValue) return '';
  const slot = HOUR_SLOTS.find(s => s.value === timeValue);
  return slot ? slot.label : timeValue;
};

const CATEGORY_COLORS = {
  General:        { bg: 'bg-slate-100',  text: 'text-slate-600'  },
  Vaccination:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Screening:      { bg: 'bg-purple-100', text: 'text-purple-700' },
  Dental:         { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  'Mental Health':{ bg: 'bg-pink-100',   text: 'text-pink-700'   },
  Emergency:      { bg: 'bg-red-100',    text: 'text-red-700'    },
  Schedule:       { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Event:          { bg: 'bg-green-100',  text: 'text-green-700'  },
};

const PRIORITY_STRIPE = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  normal: 'bg-[#466460]',
};

const HEALTH_TIPS = [
  { emoji: '💧', tip: 'Stay hydrated! Drink at least 8 glasses of water daily for optimal health.' },
  { emoji: '🥦', tip: 'Eat a balanced diet rich in vegetables, fruits, and whole grains every day.' },
  { emoji: '🏃', tip: 'Aim for at least 30 minutes of physical activity most days of the week.' },
  { emoji: '😴', tip: 'Get 7–9 hours of quality sleep each night to support your immune system.' },
  { emoji: '🧴', tip: 'Wash your hands regularly for at least 20 seconds to prevent the spread of illness.' },
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// ── Announcement Detail Modal ──────────────────────────────────────────────

const AnnouncementModal = ({ item, onClose }) => {
  if (!item) return null;
  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center z-[1000] px-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-[calc(100%-24px)] mx-3 mb-24 sm:mb-0 max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-[slideUp_0.25s_ease_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-4 pb-2 sticky top-0 bg-white z-10 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200"></div>
        </div>

        <div className="flex-1 overflow-y-auto pb-5 flex flex-col">
          {item.image && (
            <div className="h-44 w-full overflow-hidden bg-slate-100 flex-shrink-0">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-5 py-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {item.priority && item.priority !== 'normal' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${PRIORITY_STRIPE[item.priority]}`}>
                    {item.priority === 'urgent' ? '⚡ Urgent' : '● High'}
                  </span>
                )}
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                  {item.category || 'General'}
                </span>
                {item.dept && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#eef2f1] text-[#466460]">
                    {item.dept}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-[#1f2d2b] leading-snug mb-1">{item.title}</h3>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#98a8a5] mb-3">
                <span>📅 {formatDate(item.date)}</span>
                {item.location      && <span>📍 {item.location}</span>}
                {item.contactPerson && <span>👤 {item.contactPerson}</span>}
              </div>

              <div className="border-t border-slate-100 pt-3 mb-4">
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#eef2f1] text-[#466460] font-bold text-sm py-2.5 rounded-xl hover:bg-[#466460] hover:text-white transition-all mt-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Announcement Card ──────────────────────────────────────────────────────

const AnnouncementCard = ({ item, onClick }) => {
  const catStyle    = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;
  const stripeColor = PRIORITY_STRIPE[item.priority]  || PRIORITY_STRIPE.normal;

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-white border border-[#dfe6e5] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] hover:shadow-md hover:border-[#466460] transition-all relative flex-shrink-0 w-[220px]"
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${stripeColor}`}></div>

      {item.image ? (
        <div className="h-28 w-full overflow-hidden bg-slate-100">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-10"></div>
      )}

      <div className="px-3.5 pb-3.5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
            {item.category || 'General'}
          </span>
          {item.priority && item.priority !== 'normal' && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white ${stripeColor}`}>
              {item.priority === 'urgent' ? '⚡' : '●'} {item.priority}
            </span>
          )}
        </div>

        <p className="text-xs font-bold text-[#1f2d2b] leading-snug line-clamp-2 mb-1">{item.title}</p>
        <p className="text-[10px] text-[#98a8a5] line-clamp-2 leading-relaxed">{item.content}</p>
        <p className="text-[9px] text-[#b8c9c6] mt-1.5">{formatDate(item.date)}</p>
      </div>
    </div>
  );
};

// ── Main Dashboard Component ───────────────────────────────────────────────

const HomePageUsers = () => {
  const navigate    = useNavigate();
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.firstName || currentUser?.name?.split(',')[0]?.trim() || 'Student';
  const studentId   = currentUser?.universityId ?? currentUser?.idno ?? currentUser?.idNumber;

  // ── Missing Information Check ──
  const isMissingVaccination = !currentUser?.vaccinationStatus && !currentUser?.vaccinationHistory;
  const isMissingEmergencyContact = !currentUser?.emergencyContact;

  let pendingAction = null;
  if (isMissingVaccination) {
    pendingAction = {
      title: "Action Required",
      desc: "Please update your vaccination history in your profile for campus safety compliance.",
      btnText: "Update Profile",
      targetTab: "profile"
    };
  } else if (isMissingEmergencyContact) {
    pendingAction = {
      title: "Action Required",
      desc: "Please add an emergency contact to your profile.",
      btnText: "Add Contact",
      targetTab: "profile"
    };
  }

  // Global Contexts
  const { getPatientAppointments, loadingAppts } = useAppointments();

  // Local States
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn, setLoadingAnn]       = useState(true);
  const [selectedAnn, setSelectedAnn]     = useState(null);
  const [tipIndex]                        = useState(() => Math.floor(Math.random() * HEALTH_TIPS.length));

  // ── Fetch announcements ──
  useEffect(() => {
    const load = async () => {
      try {
        const data = await announcementsService.getAllAnnouncements();
        const sorted = (data || [])
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10);
        setAnnouncements(sorted);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        setLoadingAnn(false);
      }
    };
    load();
  }, []);

  // ── Fetch dynamic user appointments ──
  const studentAppointments = studentId ? getPatientAppointments(studentId) : [];
  const upcomingAppt = studentAppointments.find(a => a.status === 'approved')
                    || studentAppointments.find(a => a.status === 'pending');

  const tip = HEALTH_TIPS[tipIndex];

  // ── Pinned announcement logic ──
  const urgentAnn = announcements.find(a => a.priority === 'urgent');
  const latestAnn = announcements[0];
  const pinnedAnn = urgentAnn || latestAnn;

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] pb-16">

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* ── Welcome Header & Clinic Status ── */}
        <div className="flex items-start justify-between mt-2 animate-[slideUp_0.3s_ease_both]">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2d2b]">
              Hello, {userName} 👋
            </h1>
            <p className="text-xs text-[#98a8a5] mt-1">
              Here is your health overview for today.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-green-100 px-2.5 py-1 rounded-full mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Clinic Open</span>
          </div>
        </div>

        {/* ── Pending Actions (Dynamic) ── */}
        {pendingAction && (
          <div className="animate-[slideUp_0.35s_ease_both]">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">{pendingAction.title}</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">{pendingAction.desc}</p>
              </div>
              <button
                onClick={() => navigate('/student/account', { state: { activeTab: pendingAction.targetTab } })}
                className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-300 transition-colors flex-shrink-0 shadow-sm"
              >
                {pendingAction.btnText}
              </button>
            </div>
          </div>
        )}

        {/* ── Dynamic Upcoming Appointment ── */}
        <div className="animate-[slideUp_0.4s_ease_both]">
          <div className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide mb-2">Up Next</div>

          {loadingAppts ? (
            <div className="bg-white border border-[#dfe6e5] rounded-2xl p-4 animate-pulse h-[72px]"></div>
          ) : upcomingAppt ? (
            <div className={`bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm border-l-4 ${upcomingAppt.status === 'approved' ? 'border-l-[#466460]' : 'border-l-[#f0c070]'}`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-xl py-2 px-3 text-center min-w-[50px] ${upcomingAppt.status === 'approved' ? 'bg-[#eef2f1] text-[#466460]' : 'bg-[#fffdf7] text-[#b07020]'}`}>
                  <div className="text-[9px] uppercase font-bold">
                    {upcomingAppt.status === 'approved' && upcomingAppt.month ? MONTHS_SHORT[upcomingAppt.month - 1] : 'TBD'}
                  </div>
                  <div className="text-lg font-black leading-none mt-0.5">
                    {upcomingAppt.status === 'approved' ? upcomingAppt.day : '—'}
                  </div>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[#1f2d2b] line-clamp-1">{upcomingAppt.reason}</h4>
                  <p className="text-[10px] text-[#98a8a5] mt-0.5 flex items-center gap-1">
                    {upcomingAppt.status === 'pending' ? (
                      <><span className="text-[#f0c070] text-[12px]">⏳</span> Awaiting Schedule</>
                    ) : (
                      // Display the friendly 12-hour slot label
                      <>{formatApptTime(upcomingAppt.time)} • University Clinic</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/users/booking')}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-[#466460]"
              >
                <span className="text-lg">→</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#f7faf8] border border-dashed border-[#cdd6d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
               <span className="text-[11px] text-[#98a8a5] mb-2">No upcoming appointments</span>
               <button onClick={() => navigate('/users/booking')} className="text-[10px] font-bold bg-white border border-[#cdd6d5] text-[#466460] px-4 py-1.5 rounded-full hover:bg-[#eef2f1] transition-colors shadow-sm">
                 Book Now
               </button>
            </div>
          )}
        </div>

        {/* ── Pinned / Latest Announcement Banner ── */}
        <div className="animate-[slideUp_0.45s_ease_both]">
          <div className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide mb-2">Notice Board</div>
          {loadingAnn ? (
            <div className="bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-[#cdd6d5] rounded w-32 mb-3"></div>
              <div className="h-4 bg-[#cdd6d5] rounded w-48 mb-2"></div>
              <div className="h-3 bg-[#cdd6d5] rounded w-40"></div>
            </div>
          ) : pinnedAnn ? (
            <div
              className="bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-sm"
              onClick={() => setSelectedAnn(pinnedAnn)}
            >
              {pinnedAnn.image && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={pinnedAnn.image} alt={pinnedAnn.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M18 8a3 3 0 010 8" />
                      <path d="M14 8.5l4-3v9l-4-3H6a2 2 0 01-2-2v-1a2 2 0 012-2h8z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#466460]">
                      {urgentAnn ? '⚡ Urgent Notice' : 'Latest Announcement'}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#98a8a5]">{formatDate(pinnedAnn.date)}</span>
                </div>

                <div className="text-sm font-bold text-[#1f2d2b] mb-1 leading-snug">{pinnedAnn.title}</div>
                <div className="text-xs text-[#697d7a] line-clamp-2 leading-relaxed">{pinnedAnn.content}</div>

                {(pinnedAnn.location || pinnedAnn.contactPerson) && (
                  <div className="flex gap-3 mt-2 text-[10px] text-[#98a8a5]">
                    {pinnedAnn.location      && <span>📍 {pinnedAnn.location}</span>}
                    {pinnedAnn.contactPerson && <span>👤 {pinnedAnn.contactPerson}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).bg} ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).text}`}>
                    {pinnedAnn.category || 'General'}
                  </span>
                  <span className="text-[10px] text-[#466460] font-semibold">Tap to read more →</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl p-4">
              <p className="text-xs text-[#98a8a5]">No announcements at the moment. Check back later.</p>
            </div>
          )}
        </div>

        {/* ── All Announcements Horizontal Scroll ── */}
        {!loadingAnn && announcements.length > 1 && (
          <div className="animate-[slideUp_0.5s_ease_both]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide">All Announcements</span>
              <span className="text-[10px] text-[#98a8a5]">{announcements.length} posts</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {announcements.map(item => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  onClick={setSelectedAnn}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Health Tip Banner ── */}
        <div className="bg-gradient-to-r from-[#2f4542] to-[#466460] rounded-2xl p-4 flex items-center gap-3 animate-[slideUp_0.55s_ease_both] shadow-md mt-1">
          <span className="text-[28px] flex-shrink-0">{tip.emoji}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[1px] text-[#79a39d] mb-0.5">Health Tip</div>
            <div className="text-[11px] text-white/90 leading-[1.45]">{tip.tip}</div>
          </div>
        </div>

      </div>

      {/* ── Announcement Detail Modal ── */}
      {selectedAnn && (
        <AnnouncementModal item={selectedAnn} onClose={() => setSelectedAnn(null)} />
      )}

    </div>
  );
};

export default HomePageUsers;