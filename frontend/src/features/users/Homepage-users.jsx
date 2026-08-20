// C:\Users\HP\MediTrack\frontend\src\features\users\Homepage-users.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import authService from '../../services/auth.service.js';
import * as announcementsService from '../../services/announcements.service.js';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { supabase } from '../../supabase.js';
import { useTranslation } from 'react-i18next'; // <-- Imported i18next hook

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Lucide React icons
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Megaphone,
  ChevronRight,
  CalendarX,
  BellRing,
  Zap,
  ShieldAlert,
  Activity,
  Droplets,
  Salad,
  Moon,
  HandMetal,
  ArrowRight,
  Sparkles,
  HeartPulse,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDisplayDateWithMonth = (raw, preferences) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  const formatString = preferences?.dateFormat?.toUpperCase() || 'MM/DD/YYYY';
  const monthStr = date.toLocaleDateString('en-US', { month: 'long' });
  const dayStr = String(date.getDate()).padStart(2, '0');
  const yearStr = date.getFullYear();

  if (formatString.startsWith('DD')) {
    return `${dayStr} ${monthStr} ${yearStr}`;
  } else if (formatString.startsWith('YYYY')) {
    return `${yearStr} ${monthStr} ${dayStr}`;
  } else {
    return `${monthStr} ${dayStr}, ${yearStr}`;
  }
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

// Extracted text out of HEALTH_TIPS to use translation keys instead
const HEALTH_TIPS_KEYS = [
  { Icon: Droplets,  iconColor: 'text-sky-300',   key: 'hydration', defaultText: 'Stay hydrated! Drink at least 8 glasses of water daily for optimal health.' },
  { Icon: Salad,     iconColor: 'text-emerald-300',key: 'diet', defaultText: 'Eat a balanced diet rich in vegetables, fruits, and whole grains every day.' },
  { Icon: Activity,  iconColor: 'text-lime-300',   key: 'activity', defaultText: 'Aim for at least 30 minutes of physical activity most days of the week.' },
  { Icon: Moon,      iconColor: 'text-indigo-300', key: 'sleep', defaultText: 'Get 7–9 hours of quality sleep each night to support your immune system.' },
  { Icon: HandMetal, iconColor: 'text-teal-300',   key: 'hygiene', defaultText: 'Wash your hands regularly for at least 20 seconds to prevent the spread of illness.' },
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

  @keyframes ptr-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes loading-bar {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }

  .loading-bar-anim {
    animation: loading-bar 1.2s infinite ease-in-out;
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

  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

// ── Pull-to-Refresh Indicator ──────────────────────────────────────────────

const PullIndicator = ({ indicatorRef, isRefreshing }) => (
  <div
    ref={indicatorRef}
    data-spin={isRefreshing ? "true" : "false"}
    style={{
      overflow:        'hidden',
      height:          0,
      opacity:         0,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexShrink:      0,
      transition:      'height 0.2s ease, opacity 0.2s ease',
    }}
  >
    <svg
      data-ptr-icon
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>

    <svg
      data-ptr-spin
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      style={{ animation: 'ptr-spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

// ── Announcement Detail Modal ──────────────────────────────────────────────
// Rendered via createPortal to document.body so it always sits above the
// bottom nav bar / any other stacking context set up by MobileShell,
// regardless of where HomePageUsers is mounted in the tree.

const AnnouncementModal = ({ item, onClose, preferences }) => {
  const { t } = useTranslation();
  const [showAllDepts, setShowAllDepts] = useState(false);

  if (!item) return null;
  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

  let depts = [];
  try {
    if (typeof item.dept === 'string') {
      depts = JSON.parse(item.dept);
      if (!Array.isArray(depts)) depts = [item.dept];
    } else if (Array.isArray(item.dept)) {
      depts = item.dept;
    } else if (item.dept) {
      depts = [item.dept];
    }
  } catch (e) {
    depts = item.dept ? [item.dept] : [];
  }

  // Handle dynamic translation of DB categories (removes spaces for key matching)
  const categoryKey = item.category ? item.category.replace(/\s+/g, '') : 'General';
  const displayCategory = t(`homepage.categories.${categoryKey}`, item.category || 'General');

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center z-[9999] px-0"
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
                      ? <><Zap size={9} fill="white" /> {t('homepage.urgent', 'Urgent')}</>
                      : <><ShieldAlert size={9} /> {t('homepage.high', 'High')}</>}
                  </span>
                )}
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                  {displayCategory}
                </span>

                {depts.length > 0 && (
                  showAllDepts ? (
                    <>
                      {depts.map((d, i) => (
                        <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#eef2f1] text-[#466460]">
                          {d}
                        </span>
                      ))}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAllDepts(false); }}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                      >
                        {t('common.less', 'Less')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#eef2f1] text-[#466460]">
                        {depts[0]}
                      </span>
                      {depts.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAllDepts(true); }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#466460] text-white hover:bg-[#38534f] transition-colors shadow-sm"
                        >
                          {t('common.xMore', '+{{count}} more', { count: depts.length - 1 })}
                        </button>
                      )}
                    </>
                  )
                )}
              </div>

              <h3 className="text-base font-bold text-[#1f2d2b] leading-snug mb-1">{item.title}</h3>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#98a8a5] mb-3">
                <span className="inline-flex items-center gap-1"><CalendarDays size={10} /> {formatDisplayDateWithMonth(item.date, preferences)}</span>
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
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Announcement Card ──────────────────────────────────────────────────────

const AnnouncementCard = ({ item, onClick, index = 0, preferences }) => {
  const { t } = useTranslation();
  const catStyle    = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;
  const stripeColor = PRIORITY_STRIPE[item.priority]  || PRIORITY_STRIPE.normal;

  const categoryKey = item.category ? item.category.replace(/\s+/g, '') : 'General';
  const displayCategory = t(`homepage.categories.${categoryKey}`, item.category || 'General');

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
            {displayCategory}
          </span>
          {item.priority && item.priority !== 'normal' && (
            <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white ${stripeColor}`}>
              {item.priority === 'urgent' ? <Zap size={8} fill="white" /> : <ShieldAlert size={8} />}
              {t(`homepage.${item.priority}`, item.priority)}
            </span>
          )}
        </div>

        <p className="text-xs font-bold text-[#1f2d2b] leading-snug line-clamp-2 mb-1">{item.title}</p>
        <p className="text-[10px] text-[#98a8a5] line-clamp-2 leading-relaxed">{item.content}</p>
        <p className="text-[9px] text-[#b8c9c6] mt-1.5 inline-flex items-center gap-1">
          <CalendarDays size={9} />{formatDisplayDateWithMonth(item.date, preferences)}
        </p>
      </div>
    </div>
  );
};

// ── Main Dashboard Component ───────────────────────────────────────────────

const HomePageUsers = () => {
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const currentUser = authService.getCurrentUser();
  const userName    = currentUser?.firstName || currentUser?.name?.split(',')[0]?.trim() || 'Student';

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [preferences, setPreferences] = useState({ language: 'English', dateFormat: 'MM/DD/YYYY' });

  // Sync i18next with the user's database preference
  useEffect(() => {
    if (preferences?.language) {
      const langCode = preferences.language.toLowerCase() === 'filipino' ? 'fil' : 'en';
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [preferences?.language, i18n]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const uid = user?.uid;

        if (!uid) {
          setLoadingProfile(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', uid)
          .limit(1);

        if (error) throw error;

        if (data && data[0]) {
          setProfileData(data[0]);
          if (data[0].preferences) {
            setPreferences({
              language: data[0].preferences.language || 'English',
              dateFormat: data[0].preferences.dateFormat || 'MM/DD/YYYY',
            });
          }
        }
      } catch (err) {
        console.error('[HomePage] Error fetching profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const [hasRecords, setHasRecords] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    const checkRecords = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const uid  = user?.uid;
        const idno = user?.university_id || user?.universityId || user?.student_id || user?.idno;

        if (!uid && !idno) {
          setLoadingRecords(false);
          return;
        }

        let internalId = null;
        if (uid) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('uid', uid)
            .maybeSingle();
          internalId = data?.id || null;
        }
        if (!internalId && idno) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('university_id', idno)
            .maybeSingle();
          internalId = data?.id || null;
        }
        if (!internalId) {
          setLoadingRecords(false);
          setHasRecords(false);
          return;
        }

        const { data: medicalData } = await supabase
          .from('medical_records')
          .select('id')
          .eq('user_id', internalId)
          .eq('is_archived', false);

        const { data: dentalData } = await supabase
          .from('dental_records')
          .select('id')
          .eq('user_id', internalId)
          .eq('is_archived', false);

        setHasRecords((medicalData && medicalData.length > 0) || (dentalData && dentalData.length > 0));
      } catch (err) {
        console.error('[HomePage] Error checking records:', err);
        setHasRecords(false);
      } finally {
        setLoadingRecords(false);
      }
    };

    checkRecords();
  }, []);

  const isFieldEmpty = (val) => !val || val === '' || val === null || val === undefined;

  const hasEmptyAcademic = profileData && (
    isFieldEmpty(profileData.university_id) ||
    isFieldEmpty(profileData.department) ||
    isFieldEmpty(profileData.program) ||
    isFieldEmpty(profileData.year_level) ||
    isFieldEmpty(profileData.section)
  );

  const hasEmptyContact = profileData && (
    isFieldEmpty(profileData.email) ||
    isFieldEmpty(profileData.phone_number)
  );

  const hasEmptyEmergency = profileData && (
    isFieldEmpty(profileData.emergency_contact?.name) ||
    isFieldEmpty(profileData.emergency_contact?.relationship) ||
    isFieldEmpty(profileData.emergency_contact?.phone) ||
    isFieldEmpty(profileData.emergency_contact?.address)
  );

  const hasEmptyVaccinations = profileData && (
    (!profileData.vaccinations?.declined?.dose1 && !profileData.vaccinations?.dose1?.vaccineName && !profileData.vaccinations?.dose1?.date) ||
    (!profileData.vaccinations?.declined?.dose2 && !profileData.vaccinations?.dose2?.vaccineName && !profileData.vaccinations?.dose2?.date) ||
    (!profileData.vaccinations?.declined?.booster1 && !profileData.vaccinations?.booster1?.vaccineName && !profileData.vaccinations?.booster1?.date) ||
    (!profileData.vaccinations?.declined?.booster2 && !profileData.vaccinations?.booster2?.vaccineName && !profileData.vaccinations?.booster2?.date)
  );

  const hasEmptyDental = profileData && (
    !profileData.dental_history?.declined &&
    isFieldEmpty(profileData.dental_history?.lastVisit) &&
    isFieldEmpty(profileData.dental_history?.prevDentist) &&
    isFieldEmpty(profileData.dental_history?.physician)
  );

  const hasEmptySurgical = profileData && (
    !profileData.surgical_history?.declined &&
    (!profileData.surgical_history?.operations || profileData.surgical_history.operations.length === 0)
  );

  let pendingAction = null;
  if (hasEmptyVaccinations) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.vaccinationsDesc', "You have incomplete items (Vaccination History). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.updateProfile', "Update Profile"),
      targetTab: "profile",
      scrollTo:  "vaccinations",
    };
  } else if (hasEmptyEmergency) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.emergencyDesc', "You have incomplete items (Emergency Contact). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.addContact', "Add Contact"),
      targetTab: "profile",
      scrollTo:  "emergency",
    };
  } else if (hasEmptyAcademic) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.academicDesc', "You have incomplete items (Academic Info). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.updateProfile', "Update Profile"),
      targetTab: "profile",
      scrollTo:  "academic",
    };
  } else if (hasEmptyContact) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.contactDesc', "You have incomplete items (Contact Info). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.updateProfile', "Update Profile"),
      targetTab: "profile",
      scrollTo:  "contact",
    };
  } else if (hasEmptyDental) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.dentalDesc', "You have incomplete items (Dental History). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.addDentalHistory', "Add Dental History"),
      targetTab: "profile",
      scrollTo:  "dental",
    };
  } else if (hasEmptySurgical) {
    pendingAction = {
      title:     t('homepage.pendingActions.incompleteProfile', "Incomplete Profile"),
      desc:      t('homepage.pendingActions.surgicalDesc', "You have incomplete items (Surgical History). Please complete your profile before going to the clinic for a f2f consultation."),
      btnText:   t('homepage.pendingActions.addSurgicalHistory', "Add Surgical History"),
      targetTab: "profile",
      scrollTo:  "surgical",
    };
  }

  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const uid = user?.uid;

        if (!uid || !token) {
          setLoadingAppts(false);
          return;
        }

        const response = await axios.get(`${API_URL}/appointments/my-appointments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          setMyAppointments(response.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching appointments:', err.response || err);
      } finally {
        setLoadingAppts(false);
      }
    };

    fetchAppointments();
  }, []);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn,    setLoadingAnn]    = useState(true);
  const [selectedAnn,   setSelectedAnn]   = useState(null);
  const [tipIndex]                        = useState(() => Math.floor(Math.random() * HEALTH_TIPS_KEYS.length));
  const [isRefreshing, setIsRefreshing]   = useState(false);

  const loadAnnouncements = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAnnouncements();
    setIsRefreshing(false);
  }, [loadAnnouncements]);

  const { scrollElRef, indicatorRef, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh(handleRefresh);

  const studentAppointments = myAppointments;
  const upcomingAppt = studentAppointments.find(a => a.status?.toLowerCase() === 'approved')
                    || studentAppointments.find(a => a.status?.toLowerCase() === 'pending');
  const approvedAppts = studentAppointments.filter(a => a.status?.toLowerCase() === 'approved');

  const tipDef    = HEALTH_TIPS_KEYS[tipIndex];
  const urgentAnn = announcements.find(a => a.priority === 'urgent');
  const latestAnn = announcements[0];
  const pinnedAnn = urgentAnn || latestAnn;

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] relative">

      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 h-1 z-50 bg-[#eef2f1] overflow-hidden">
          <div className="h-full bg-[#466460] w-1/3 rounded-full loading-bar-anim"></div>
        </div>
      )}

      <style>{microAnimStyles}</style>

      {/* ── Scrollable body ── */}
      <div
        ref={scrollElRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

        <PullIndicator indicatorRef={indicatorRef} isRefreshing={isRefreshing} />

        {/* ── Welcome Header ── */}
        <div className="flex items-start justify-between mt-2 animate-[slideUp_0.3s_ease_both]">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2d2b] flex items-center gap-2">
              {t('homepage.hello', 'Hello, {{name}}', { name: userName })}
              <span className="icon-wave text-[#466460]" aria-hidden="true">
                <Sparkles size={22} fill="#466460" strokeWidth={1.5} />
              </span>
            </h1>
            <p className="text-xs text-[#98a8a5] mt-1 flex items-center gap-1.5">
              <span className="icon-pop text-[#466460]">
                <Activity size={11} strokeWidth={2.5} />
              </span>
              {t('homepage.subtitle', 'Here’s your health and clinic update for today.')}
            </p>
          </div>

          <div className="clinic-badge inline-flex items-center gap-1.5 bg-green-100 px-2.5 py-1 rounded-full mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">{t('homepage.clinicOpen', 'Clinic Open')}</span>
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
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'profile', scrollTo: pendingAction.scrollTo } })}
                className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-300 transition-colors flex-shrink-0 shadow-sm"
              >
                {pendingAction.btnText}
              </button>
            </div>
          </div>
        )}

        {/* ── Upcoming Appointment ── */}
        <div className="animate-[slideUp_0.4s_ease_both]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide">{t('homepage.upNext', 'Up Next')}</div>
            {approvedAppts.length > 0 && (
              <button
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'booking' } })}
                className="text-[9px] font-bold text-[#466460] bg-[#eef2f1] px-2 py-1 rounded-full hover:bg-[#dde8e5] transition-colors"
              >
                {t('homepage.approvedAppointments', '{{count}} Approved Appointment(s)', { count: approvedAppts.length })}
              </button>
            )}
          </div>

          {loadingAppts || loadingRecords ? (
            <div className="bg-white border border-[#dfe6e5] rounded-2xl p-4 animate-pulse h-[72px]"></div>
          ) : !hasRecords ? (
            <div className="bg-[#f7faf8] border border-dashed border-[#cdd6d5] rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#eef2f1] flex items-center justify-center flex-shrink-0">
                <CalendarX size={16} className="text-[#466460]" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#1f2d2b] leading-tight">{t('homepage.visitClinicFirst', 'Visit the clinic first')}</p>
                <p className="text-[10px] text-[#98a8a5] leading-snug mt-0.5">
                  {t('homepage.visitClinicDesc', 'A face-to-face visit creates your record before you can book online.')}
                </p>
              </div>
            </div>
          ) : upcomingAppt ? (
            <div
              onClick={() => navigate('/student/meditrack', { state: { activeTab: 'booking' } })}
              className={`bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow ${upcomingAppt.status?.toLowerCase() === 'approved' ? 'border-l-[#466460]' : 'border-l-[#f0c070]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-xl py-2 px-3 text-center min-w-[50px] ${upcomingAppt.status?.toLowerCase() === 'approved' ? 'bg-[#eef2f1] text-[#466460]' : 'bg-[#fffdf7] text-[#b07020]'}`}>
                  <div className="text-[9px] uppercase font-bold">
                    {upcomingAppt.status?.toLowerCase() === 'approved' && upcomingAppt.month ? MONTHS_SHORT[upcomingAppt.month - 1] : t('common.tbd', 'TBD')}
                  </div>
                  <div className="text-lg font-black leading-none mt-0.5">
                    {upcomingAppt.status?.toLowerCase() === 'approved' ? upcomingAppt.day : '—'}
                  </div>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[#1f2d2b] line-clamp-1">{upcomingAppt.reason}</h4>
                  <p className="text-[10px] text-[#98a8a5] mt-0.5 flex items-center gap-1">
                    {upcomingAppt.status?.toLowerCase() === 'pending' ? (
                      <><Clock size={11} className="text-[#f0c070]" strokeWidth={2} /> {t('homepage.awaitingSchedule', 'Awaiting Schedule')}</>
                    ) : (
                      <><Clock size={11} strokeWidth={2} /> {formatApptTime(upcomingAppt.time)} · {t('homepage.universityClinic', 'University Clinic')}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {upcomingAppt.status?.toLowerCase() === 'approved' && (
                  <span className="text-[9px] font-bold text-[#466460] bg-[#eef2f1] px-2 py-1 rounded-full">{t('common.view', 'VIEW')}</span>
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 transition-colors text-[#466460]">
                  <ArrowRight size={16} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f7faf8] border border-dashed border-[#cdd6d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
              <CalendarX size={20} className="text-[#cdd6d5]" strokeWidth={1.5} />
              <span className="text-[11px] text-[#98a8a5]">{t('homepage.noUpcomingAppts', 'No upcoming appointments')}</span>
              <button
                onClick={() => navigate('/student/meditrack', { state: { activeTab: 'booking' } })}
                className="text-[10px] font-bold bg-white border border-[#cdd6d5] text-[#466460] px-4 py-1.5 rounded-full hover:bg-[#eef2f1] transition-colors shadow-sm"
              >
                {t('homepage.bookNow', 'Book Now')}
              </button>
            </div>
          )}
        </div>

        {/* ── Notice Board ── */}
        <div className="animate-[slideUp_0.45s_ease_both]">
          <div className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide mb-2">{t('homepage.noticeBoard', 'Notice Board')}</div>
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
                      {urgentAnn ? t('homepage.urgentNotice', 'Urgent Notice') : t('homepage.latestAnnouncement', 'Latest Announcement')}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#98a8a5] inline-flex items-center gap-1">
                    <CalendarDays size={9} />{formatDisplayDateWithMonth(pinnedAnn.date, preferences)}
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
                    {t(`homepage.categories.${(pinnedAnn.category || 'General').replace(/\s+/g, '')}`, pinnedAnn.category || 'General')}
                  </span>
                  <span className="text-[10px] text-[#466460] font-semibold inline-flex items-center gap-1">
                    {t('homepage.tapToReadMore', 'Tap to read more')} <ChevronRight size={11} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#eef2f1] border border-[#cdd6d5] rounded-2xl p-4">
              <p className="text-xs text-[#98a8a5]">{t('homepage.noAnnouncements', 'No announcements at the moment. Check back later.')}</p>
            </div>
          )}
        </div>

        {/* ── All Announcements Scroll ── */}
        {!loadingAnn && announcements.length > 1 && (
          <div className="animate-[slideUp_0.5s_ease_both]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#697d7a] uppercase tracking-wide">{t('homepage.allAnnouncements', 'All Announcements')}</span>
              <span className="text-[10px] text-[#98a8a5]">{announcements.length} {t('homepage.posts', 'posts')}</span>
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
                  preferences={preferences}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Health Tip Banner ── */}
        <div className="tip-banner bg-gradient-to-r from-[#2f4542] to-[#466460] rounded-2xl p-4 flex items-center gap-3.5 animate-[slideUp_0.55s_ease_both] mt-1">
          <span className="icon-heartbeat flex-shrink-0">
            <tipDef.Icon size={26} className={tipDef.iconColor} strokeWidth={1.8} />
          </span>
          <div>
            <div className="shimmer-text text-[10px] font-bold uppercase tracking-[1px] mb-0.5 flex items-center gap-1">
              <HeartPulse size={10} strokeWidth={2.5} />
              {t('homepage.healthTip', 'Health Tip')}
            </div>
            <div className="text-[11px] text-white/90 leading-[1.45]">{t(`homepage.healthTips.${tipDef.key}`, tipDef.defaultText)}</div>
          </div>
        </div>

      </div>

      {/* ── Announcement Modal (portaled to document.body, see component above) ── */}
      {selectedAnn && (
        <AnnouncementModal item={selectedAnn} onClose={() => setSelectedAnn(null)} preferences={preferences} />
      )}

    </div>
  );
};

export default HomePageUsers;