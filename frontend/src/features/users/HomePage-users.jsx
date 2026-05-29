// C:\Users\HP\MediTrack\frontend\src\features\users\HomePageUsers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service.js';
import * as announcementsService from '../../services/announcements.service';
import { useAppointments } from '../../context/AppointmentContext';

// Lucide React icons
import {
  // Outline — UI chrome
  CalendarDays,
  Clock,
  MapPin,
  User,
  Megaphone,
  ChevronRight,
  CalendarX,
  // Solid-style accents
  BellRing,
  Zap,
  ShieldAlert,
  Activity,
  Droplets,
  Salad,
  PersonStanding,
  Moon,
  HandMetal,
  ArrowRight,
  Sparkles,
  HeartPulse,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

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

// Health tips
const HEALTH_TIPS = [
  { Icon: Droplets,  iconColor: 'text-sky-300',    tip: 'Stay hydrated! Drink at least 8 glasses of water daily for optimal health.' },
  { Icon: Salad,     iconColor: 'text-emerald-300',tip: 'Eat a balanced diet rich in vegetables, fruits, and whole grains every day.' },
  { Icon: Activity,  iconColor: 'text-lime-300',   tip: 'Aim for at least 30 minutes of physical activity most days of the week.' },
  { Icon: Moon,      iconColor: 'text-indigo-300', tip: 'Get 7–9 hours of quality sleep each night to support your immune system.' },
  { Icon: HandMetal, iconColor: 'text-teal-300',   tip: 'Wash your hands regularly for at least 20 seconds to prevent the spread of illness.' },
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// ── Micro-Animation Styles ─────────────────────────────────────────────────

const microAnimStyles = `
  @keyframes wave {
    0%   { transform: rotate(0deg)   scale(1);    }
    15%  { transform: rotate(18deg)  scale(1.15); }
    30%  { transform: rotate(-10deg) scale(1.1);  }
    45%  { transform: rotate(14deg)  scale(1.15); }
    60%  { transform: rotate(-6deg)  scale(1.05); }
    75%  { transform: rotate(8deg)   scale(1.1);  }
    100% { transform: rotate(0deg)   scale(1);    }
  }

  @keyframes icon-pop {
    0%   { transform: scale(0.7) rotate(-12deg); opacity: 0; }
    60%  { transform: scale(1.2) rotate(6deg);   opacity: 1; }
    100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
  }

  @keyframes float-y {
    0%, 100% { transform: translateY(0px);  }
    50%       { transform: translateY(-4px); }
  }

  @keyframes shimmer-slide {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  @keyframes badge-pulse {
    0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(74,222,128,0.5); }
    50%       { transform: scale(1.04); box-shadow: 0 0 0 5px rgba(74,222,128,0);   }
  }

  @keyframes card-rise {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  @keyframes tip-glow {
    0%, 100% { box-shadow: 0 4px 20px rgba(70,100,96,0.25); }
    50%       { box-shadow: 0 8px 32px rgba(70,100,96,0.45); }
  }

  @keyframes bell-ring {
    0%,100% { transform: rotate(0deg);   }
    15%      { transform: rotate(14deg);  }
    30%      { transform: rotate(-10deg); }
    45%      { transform: rotate(8deg);   }
    60%      { transform: rotate(-4deg);  }
    75%      { transform: rotate(2deg);   }
  }

  @keyframes heartbeat {
    0%,100% { transform: scale(1);    }
    14%      { transform: scale(1.18); }
    28%      { transform: scale(1);    }
    42%      { transform: scale(1.12); }
    70%      { transform: scale(1);    }
  }

  .icon-wave {
    display: inline-flex;
    transform-origin: 70% 80%;
    animation: wave 2.4s ease-in-out 0.4s 1 both;
  }

  .icon-pop {
    display: inline-flex;
    animation: icon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.5s 1 both;
  }

  .icon-bell {
    display: inline-flex;
    transform-origin: 50% 0%;
    animation: bell-ring 1.8s ease-in-out 0.6s 1 both;
  }

  .icon-heartbeat {
    display: inline-flex;
    animation: heartbeat 1.6s ease-in-out infinite;
  }

  .pinned-float {
    animation: float-y 3.8s ease-in-out infinite;
  }

  .tip-banner {
    animation: tip-glow 3s ease-in-out infinite;
  }

  .clinic-badge {
    animation: badge-pulse 2.4s ease-in-out infinite;
  }

  .ann-card-rise {
    animation: card-rise 0.4s ease both;
  }

  .shimmer-text {
    background: linear-gradient(
      90deg,
      #79a39d 0%,
      #c8e6e2 40%,
      #79a39d 60%,
      #79a39d 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer-slide 3s linear infinite;
  }
`;

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
          {item.image_url && (
            <div className="h-44 w-full overflow-hidden bg-slate-100 flex-shrink-0">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-5 py-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {item.priority && item.priority !== 'normal' && (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${PRIORITY_STRIPE[item.priority]}`}>
                    {item.priority === 'urgent'
                      ? <><Zap size={9} fill="white" /> Urgent</>
                      : <><ShieldAlert size={9} /> High</>}
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
                <span className="inline-flex items-center gap-1"><CalendarDays size={10} /> {formatDate(item.date)}</span>
                {item.location      && <span className="inline-flex items-center gap-1"><MapPin size={10} /> {item.location}</span>}
                {item.contactPerson && <span className="inline-flex items-center gap-1"><User size={10} /> {item.contactPerson}</span>}
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

const AnnouncementCard = ({ item, onClick, index = 0 }) => {
  const catStyle    = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;
  const stripeColor = PRIORITY_STRIPE[item.priority]  || PRIORITY_STRIPE.normal;

  return (
    <div
      onClick={() => onClick(item)}
      className="ann-card-rise bg-white border border-[#dfe6e5] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] hover:shadow-md hover:border-[#466460] transition-all relative flex-shrink-0 w-[220px]"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${stripeColor}`}></div>

      {item.image_url ? (
        <div className="h-28 w-full overflow-hidden bg-slate-100">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
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
            <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white ${stripeColor}`}>
              {item.priority === 'urgent' ? <Zap size={8} fill="white" /> : <ShieldAlert size={8} />}
              {item.priority}
            </span>
          )}
        </div>

        <p className="text-xs font-bold text-[#1f2d2b] leading-snug line-clamp-2 mb-1">{item.title}</p>
        <p className="text-[10px] text-[#98a8a5] line-clamp-2 leading-relaxed">{item.content}</p>
        <p className="text-[9px] text-[#b8c9c6] mt-1.5 inline-flex items-center gap-1">
          <CalendarDays size={9} />{formatDate(item.date)}
        </p>
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

  const isMissingVaccination      = !currentUser?.vaccinationStatus && !currentUser?.vaccinationHistory;
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

  const { getPatientAppointments, loadingAppts } = useAppointments();

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn, setLoadingAnn]       = useState(true);
  const [selectedAnn, setSelectedAnn]     = useState(null);
  const [tipIndex]                        = useState(() => Math.floor(Math.random() * HEALTH_TIPS.length));

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

  const studentAppointments = studentId ? getPatientAppointments(studentId) : [];
  const upcomingAppt = studentAppointments.find(a => a.status === 'approved')
                    || studentAppointments.find(a => a.status === 'pending');

  const tip = HEALTH_TIPS[tipIndex];

  const urgentAnn = announcements.find(a => a.priority === 'urgent');
  const latestAnn = announcements[0];
  const pinnedAnn = urgentAnn || latestAnn;

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] pb-16">

      <style>{microAnimStyles}</style>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* ── Welcome Header ── */}
        <div className="flex items-start justify-between mt-2 animate-[slideUp_0.3s_ease_both]">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2d2b] flex items-center gap-2">
              Hello, {userName}
              {/* Sparkles icon with wave animation */}
              <span className="icon-wave text-[#466460]" aria-hidden="true">
                <Sparkles size={22} fill="#466460" strokeWidth={1.5} />
              </span>
            </h1>
            <p className="text-xs text-[#98a8a5] mt-1 flex items-center gap-1.5">
              <span className="icon-pop text-[#466460]">
                <Activity size={11} strokeWidth={2.5} />
              </span>
              Here is your health overview for today.
            </p>
          </div>

          <div className="clinic-badge inline-flex items-center gap-1.5 bg-green-100 px-2.5 py-1 rounded-full mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Clinic Open</span>
          </div>
        </div>

        {/* ── Pending Actions ── */}
        {pendingAction && (
          <div className="animate-[slideUp_0.35s_ease_both]">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm">
              <span className="icon-bell text-amber-500 mt-0.5">
                <BellRing size={16} fill="#f59e0b" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">{pendingAction.title}</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">{pendingAction.desc}</p>
              </div>
              <button
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'profile' } })}
                className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-300 transition-colors flex-shrink-0 shadow-sm"
              >
                {pendingAction.btnText}
              </button>
            </div>
          </div>
        )}

        {/* ── Upcoming Appointment ── */}
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
                      <><Clock size={11} className="text-[#f0c070]" strokeWidth={2} /> Awaiting Schedule</>
                    ) : (
                      <><Clock size={11} strokeWidth={2} /> {formatApptTime(upcomingAppt.time)} · University Clinic</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'booking' } })}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-[#466460]"
              >
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="bg-[#f7faf8] border border-dashed border-[#cdd6d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
              <CalendarX size={20} className="text-[#cdd6d5]" strokeWidth={1.5} />
              <span className="text-[11px] text-[#98a8a5]">No upcoming appointments</span>
              <button
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'booking' } })}
                className="text-[10px] font-bold bg-white border border-[#cdd6d5] text-[#466460] px-4 py-1.5 rounded-full hover:bg-[#eef2f1] transition-colors shadow-sm"
              >
                Book Now
              </button>
            </div>
          )}
        </div>

        {/* ── Notice Board ── */}
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
              className="pinned-float bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-sm"
              onClick={() => setSelectedAnn(pinnedAnn)}
            >
              {pinnedAnn.image_url && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={pinnedAnn.image_url} alt={pinnedAnn.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {urgentAnn
                      ? <Zap size={14} fill="#466460" strokeWidth={0} className="text-[#466460]" />
                      : <Megaphone size={14} className="text-[#466460]" strokeWidth={2} />
                    }
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#466460]">
                      {urgentAnn ? 'Urgent Notice' : 'Latest Announcement'}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#98a8a5] inline-flex items-center gap-1">
                    <CalendarDays size={9} />{formatDate(pinnedAnn.date)}
                  </span>
                </div>

                <div className="text-sm font-bold text-[#1f2d2b] mb-1 leading-snug">{pinnedAnn.title}</div>
                <div className="text-xs text-[#697d7a] line-clamp-2 leading-relaxed">{pinnedAnn.content}</div>

                {(pinnedAnn.location || pinnedAnn.contactPerson) && (
                  <div className="flex gap-3 mt-2 text-[10px] text-[#98a8a5]">
                    {pinnedAnn.location      && <span className="inline-flex items-center gap-1"><MapPin size={9} />{pinnedAnn.location}</span>}
                    {pinnedAnn.contactPerson && <span className="inline-flex items-center gap-1"><User size={9} />{pinnedAnn.contactPerson}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).bg} ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).text}`}>
                    {pinnedAnn.category || 'General'}
                  </span>
                  <span className="text-[10px] text-[#466460] font-semibold inline-flex items-center gap-1">
                    Tap to read more <ChevronRight size={11} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl p-4">
              <p className="text-xs text-[#98a8a5]">No announcements at the moment. Check back later.</p>
            </div>
          )}
        </div>

        {/* ── All Announcements Scroll ── */}
        {!loadingAnn && announcements.length > 1 && (
          <div className="animate-[slideUp_0.5s_ease_both]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide">All Announcements</span>
              <span className="text-[10px] text-[#98a8a5]">{announcements.length} posts</span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {announcements.map((item, i) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  onClick={setSelectedAnn}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Health Tip Banner ── */}
        <div className="tip-banner bg-gradient-to-r from-[#2f4542] to-[#466460] rounded-2xl p-4 flex items-center gap-3.5 animate-[slideUp_0.55s_ease_both] mt-1">
          <span className="icon-heartbeat flex-shrink-0">
            <tip.Icon size={26} className={tip.iconColor} strokeWidth={1.8} />
          </span>
          <div>
            <div className="shimmer-text text-[10px] font-bold uppercase tracking-[1px] mb-0.5 flex items-center gap-1">
              <HeartPulse size={10} strokeWidth={2.5} />
              Health Tip
            </div>
            <div className="text-[11px] text-white/90 leading-[1.45]">{tip.tip}</div>
          </div>
        </div>

      </div>

      {/* ── Announcement Modal ── */}
      {selectedAnn && (
        <AnnouncementModal item={selectedAnn} onClose={() => setSelectedAnn(null)} />
      )}

    </div>
  );
};

export default HomePageUsers;