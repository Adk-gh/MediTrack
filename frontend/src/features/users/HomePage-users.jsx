import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service.js';
import * as announcementsService from '../../services/announcements.service';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
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
  normal: 'bg-[#2d7a52]',
};

// ── Announcement Detail Modal ──────────────────────────────────────────────

const AnnouncementModal = ({ item, onClose }) => {
  if (!item) return null;
  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-[1000] px-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease_both]"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        {item.image && (
          <div className="h-44 w-full overflow-hidden bg-slate-100 rounded-t-3xl">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Drag handle */}
        {!item.image && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-200"></div>
          </div>
        )}

        <div className="px-5 py-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.priority && item.priority !== 'normal' && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${PRIORITY_STRIPE[item.priority]}`}>
                {item.priority === 'urgent' ? '⚡ Urgent' : '● High'}
              </span>
            )}
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
              {item.category || 'General'}
            </span>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f5ee] text-[#2d7a52]">
              {item.dept}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#1a2e22] leading-snug mb-1">{item.title}</h3>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#9bb5a5] mb-4">
            <span>📅 {formatDate(item.date)}</span>
            {item.location      && <span>📍 {item.location}</span>}
            {item.contactPerson && <span>👤 {item.contactPerson}</span>}
            {item.contactEmail  && <span>✉️ {item.contactEmail}</span>}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full bg-[#e8f5ee] text-[#2d7a52] font-bold text-sm py-3 rounded-2xl hover:bg-[#2d7a52] hover:text-white transition-all"
          >
            Close
          </button>
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
      className="bg-white border border-[#ddeee5] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] hover:shadow-md hover:border-[#4aab72] transition-all relative flex-shrink-0 w-[220px]"
    >
      {/* Priority stripe */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${stripeColor}`}></div>

      {/* Image */}
      {item.image ? (
        <div className="h-28 w-full overflow-hidden bg-slate-100">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-10"></div>
      )}

      <div className="px-3.5 pb-3.5">
        {/* Category badge */}
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

        <p className="text-xs font-bold text-[#1a2e22] leading-snug line-clamp-2 mb-1">{item.title}</p>
        <p className="text-[10px] text-[#9bb5a5] line-clamp-2 leading-relaxed">{item.content}</p>
        <p className="text-[9px] text-[#b5cfc0] mt-1.5">{formatDate(item.date)}</p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const HEALTH_TIPS = [
  { emoji: '💧', tip: 'Stay hydrated! Drink at least 8 glasses of water daily for optimal health.' },
  { emoji: '🥦', tip: 'Eat a balanced diet rich in vegetables, fruits, and whole grains every day.' },
  { emoji: '🏃', tip: 'Aim for at least 30 minutes of physical activity most days of the week.' },
  { emoji: '😴', tip: 'Get 7–9 hours of quality sleep each night to support your immune system.' },
  { emoji: '🧴', tip: 'Wash your hands regularly for at least 20 seconds to prevent the spread of illness.' },
];

const HomePageUsers = () => {
  const navigate    = useNavigate();
  const currentUser = authService.getCurrentUser();
  const userName    = currentUser?.name?.split(',')[0]?.trim() || 'Student';

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn, setLoadingAnn]       = useState(true);
  const [selectedAnn, setSelectedAnn]     = useState(null);
  const [tipIndex]                        = useState(() => Math.floor(Math.random() * HEALTH_TIPS.length));

  // ── Fetch announcements ──
  useEffect(() => {
    const load = async () => {
      try {
        const data = await announcementsService.getAllAnnouncements();
        // Sort newest first, take latest 10
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

  const quickActions = [
    {
      title: 'Book Appointment',
      subtitle: 'Schedule a visit',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      ),
      id: 'booking',
    },
    {
      title: 'My Records',
      subtitle: 'View health files',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      id: 'records',
    },
    {
      title: 'Consult',
      subtitle: 'Talk to a doctor',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      id: 'consult',
    },
    {
      title: 'My Account',
      subtitle: 'Profile & settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      id: 'account',
    },
  ];

  const tip = HEALTH_TIPS[tipIndex];

  // ── Urgent announcement (pinned banner) ───────────────────────────────────
  const urgentAnn = announcements.find(a => a.priority === 'urgent');
  const latestAnn = announcements[0];
  const pinnedAnn = urgentAnn || latestAnn;

  return (
    <div className="flex flex-col h-full bg-[#f7faf8]">

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* ── Pinned / Latest Announcement Banner ── */}
        {loadingAnn ? (
          <div className="bg-[#e8f5ee] border border-[#c0e0ce] rounded-2xl p-4 animate-pulse">
            <div className="h-3 bg-[#c0e0ce] rounded w-32 mb-3"></div>
            <div className="h-4 bg-[#c0e0ce] rounded w-48 mb-2"></div>
            <div className="h-3 bg-[#c0e0ce] rounded w-40"></div>
          </div>
        ) : pinnedAnn ? (
          <div
            className="bg-[#e8f5ee] border border-[#c0e0ce] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform animate-[slideUp_0.5s_ease_both]"
            onClick={() => setSelectedAnn(pinnedAnn)}
          >
            {/* Image if present */}
            {pinnedAnn.image && (
              <div className="h-32 w-full overflow-hidden">
                <img src={pinnedAnn.image} alt={pinnedAnn.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-4">
              {/* Header label */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M18 8a3 3 0 010 8" />
                    <path d="M14 8.5l4-3v9l-4-3H6a2 2 0 01-2-2v-1a2 2 0 012-2h8z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2d7a52]">
                    {urgentAnn ? '⚡ Urgent Notice' : 'Latest Announcement'}
                  </span>
                </div>
                <span className="text-[9px] text-[#9bb5a5]">{formatDate(pinnedAnn.date)}</span>
              </div>

              <div className="text-sm font-bold text-[#1a2e22] mb-1 leading-snug">{pinnedAnn.title}</div>
              <div className="text-xs text-[#6b8577] line-clamp-2 leading-relaxed">{pinnedAnn.content}</div>

              {(pinnedAnn.location || pinnedAnn.contactPerson) && (
                <div className="flex gap-3 mt-2 text-[10px] text-[#9bb5a5]">
                  {pinnedAnn.location      && <span>📍 {pinnedAnn.location}</span>}
                  {pinnedAnn.contactPerson && <span>👤 {pinnedAnn.contactPerson}</span>}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).bg} ${(CATEGORY_COLORS[pinnedAnn.category] || CATEGORY_COLORS.General).text}`}>
                  {pinnedAnn.category || 'General'}
                </span>
                <span className="text-[10px] text-[#2d7a52] font-semibold">Tap to read more →</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#e8f5ee] border border-[#c0e0ce] rounded-2xl p-4 animate-[slideUp_0.5s_ease_both]">
            <div className="flex items-center gap-1.5 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2d7a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 8a3 3 0 010 8" />
                <path d="M14 8.5l4-3v9l-4-3H6a2 2 0 01-2-2v-1a2 2 0 012-2h8z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2d7a52]">Announcements</span>
            </div>
            <p className="text-xs text-[#9bb5a5]">No announcements at the moment. Check back later.</p>
          </div>
        )}

        {/* ── All Announcements Horizontal Scroll ── */}
        {!loadingAnn && announcements.length > 1 && (
          <div className="animate-[slideUp_0.55s_ease_both]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#6b8577] uppercase tracking-wide">All Announcements</span>
              <span className="text-[10px] text-[#9bb5a5]">{announcements.length} posts</span>
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

        {/* ── Quick Actions ── */}
        <div className="text-[11px] font-bold text-[#6b8577] uppercase tracking-wide">Quick Access</div>
        <div className="grid grid-cols-2 gap-2.5 animate-[slideUp_0.6s_ease_both]">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(`/student/${action.id}`)}
              className="bg-white border border-[#ddeee5] rounded-2xl p-3.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-[#4aab72] transition-all active:scale-[0.97]"
            >
              <div className="w-[34px] h-[34px] bg-[#e8f5ee] rounded-[10px] flex items-center justify-center mb-2">
                {action.icon}
              </div>
              <div className="text-xs font-bold text-[#1a2e22]">{action.title}</div>
              <div className="text-[11px] text-[#9bb5a5] mt-0.5">{action.subtitle}</div>
            </div>
          ))}
        </div>

        {/* ── Health Tip Banner ── */}
        <div className="bg-gradient-to-r from-[#1a5c3a] to-[#2d7a52] rounded-2xl p-4 flex items-center gap-3 animate-[slideUp_0.65s_ease_both]">
          <span className="text-[28px] flex-shrink-0">{tip.emoji}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[1px] text-[#34c472] mb-0.5">Health Tip</div>
            <div className="text-xs text-white/90 leading-[1.45]">{tip.tip}</div>
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