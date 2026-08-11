// C:\Users\HP\MediTrack\frontend\src\features\users\Consultation-users.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// ── CACHE KEYS ─────────────────────────────────────────────────────────────
const MSG_CACHE_KEY      = 'meditrack_chat_messages';
const CONSULT_CACHE_KEY  = 'meditrack_consultations';
const PRESENCE_CACHE_KEY = 'meditrack_clinic_presence';
const PRESENCE_TTL_MS    = 60000; // 1 minute cache for clinic status

// ── Message Cache Helpers ─────────────────────────────────────────────────
const getCachedMessages = (consultationId) => {
  if (!consultationId) return null;
  try {
    const cache = JSON.parse(sessionStorage.getItem(MSG_CACHE_KEY) || '{}');
    const entry = cache[consultationId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) return null;
    return entry.data;
  } catch { return null; }
};

const setCachedMessages = (consultationId, messages) => {
  if (!consultationId) return;
  try {
    const cache = JSON.parse(sessionStorage.getItem(MSG_CACHE_KEY) || '{}');
    cache[consultationId] = { data: messages, timestamp: Date.now() };
    sessionStorage.setItem(MSG_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

// ── Consultation Cache Helpers ────────────────────────────────────────────
const getCachedConsultations = (userId) => {
  if (!userId) return null;
  try {
    const cache = JSON.parse(sessionStorage.getItem(CONSULT_CACHE_KEY) || '{}');
    const entry = cache[userId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 2 * 60 * 1000) return null;
    return entry.data;
  } catch { return null; }
};

const setCachedConsultations = (userId, data) => {
  if (!userId) return;
  try {
    const cache = JSON.parse(sessionStorage.getItem(CONSULT_CACHE_KEY) || '{}');
    cache[userId] = { data, timestamp: Date.now() };
    sessionStorage.setItem(CONSULT_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

// ── Presence Cache Helpers ─────────────────────────────────────────────────
const getCachedPresence = () => {
  try {
    const cache = JSON.parse(sessionStorage.getItem(PRESENCE_CACHE_KEY) || 'null');
    if (!cache) return null;
    if (Date.now() - cache.timestamp > PRESENCE_TTL_MS) return null;
    return cache.isOnline;
  } catch { return null; }
};

const setCachedPresence = (isOnline) => {
  try {
    sessionStorage.setItem(PRESENCE_CACHE_KEY, JSON.stringify({ isOnline, timestamp: Date.now() }));
  } catch {}
};

// ── Fetch sender roles from users table ────────────────────────────────────────
const fetchSenderRoles = async (senderIds) => {
  if (!senderIds || senderIds.length === 0) return {};
  const uniqueIds = [...new Set(senderIds.filter(Boolean))];
  const { data } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, sex')
    .in('id', uniqueIds);
  if (!data) return {};
  const roleMap = {};
  data.forEach(u => {
    roleMap[u.id] = { role: u.role, first_name: u.first_name, last_name: u.last_name, sex: u.sex };
  });
  return roleMap;
};

// Gender icon helper
const getGenderIcon = (sex) => {
  if (!sex) return null;
  const s = sex.toLowerCase();
  if (s === 'male') return <span className="text-blue-500" title="Male">♂</span>;
  if (s === 'female') return <span className="text-pink-500" title="Female">♀</span>;
  return null;
};

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

function BotText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
    </span>
  );
}

// ── Linkify: Converts URLs in text to clickable links ────────────────────────
function LinkifiedText({ text, isPatient = false }) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const linkColor = isPatient ? '#a8d5ba' : '#1a5c3a';

  if (!text) return null;
  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    const lines = text.split('\n');
    return (
      <span>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            <BotText text={line} />
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
               className="underline break-all hover:opacity-80"
               style={{ color: linkColor }} onClick={(e) => e.stopPropagation()}>
              {part}
            </a>
          );
        }
        const lines = part.split('\n');
        return (
          <React.Fragment key={i}>
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                <BotText text={line} />
                {j < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </span>
  );
}

const INITIAL_OPTIONS = [
  { label: '🤒 Illness / Fever',         type: 'medical' },
  { label: '🤕 Injury / Pain',           type: 'medical' },
  { label: '💊 Prescription / Medicine', type: 'medical' },
  { label: '📄 Medical Certificate',     type: 'medical' },
  { label: '🩺 Follow-up Check-up',      type: 'medical' },
  { label: '🦷 Toothache / Pain',        type: 'dental'  },
  { label: '🔍 Dental Check-up',         type: 'dental'  },
  { label: '😬 Oral Health Concern',     type: 'dental'  },
];

const MSG_PAGE_SIZE = 30;
const PROFILE_CACHE_KEY = 'meditrack_user_profile';

const readProfileCache = () => {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY) || 'null'); }
  catch { return null; }
};

const writeProfileCache = (data) => {
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data)); }
  catch {}
};

// ── PTR spinner keyframe (self-contained, injected once) ──────────────────────
const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

// ── Pull-to-Refresh Indicator ─────────────────────────────────────────────────
const PullIndicator = ({ indicatorRef }) => (
  <div ref={indicatorRef} data-spin="false" style={{ overflow: 'hidden', height: 0, opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, opacity 0.2s ease' }}>
    <svg data-ptr-icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
    <svg data-ptr-spin width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" style={{ animation: 'ptr-spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

export default function ConsultationUsers() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const profileCacheRef = useRef(readProfileCache());
  const profileCache    = profileCacheRef.current;

  const [messages,          setMessages]        = useState([]);
  const [inputValue,        setInputValue]      = useState('');
  const [isClinicOnline,    setIsClinicOnline]  = useState(false);
  const [isEnded,           setIsEnded]         = useState(true);
  const [consultType,       setConsultType]     = useState(null);
  const [historyFilter,     setHistoryFilter]   = useState('medical'); // 'medical' or 'dental'
  const [activeRoomId,      setActiveRoomId]    = useState(null);
  const [internalUserId,    setInternalUserId]  = useState(profileCache?.internalUserId ?? null);
  const [internalName,      setInternalName]    = useState(profileCache?.internalName   ?? 'Patient');
  const [sessionReady,      setSessionReady]    = useState(!!(profileCache?.internalUserId));
  const [loadingHistory,    setLoadingHistory]  = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore,       setLoadingMore]     = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [clinicUnreadCount, setClinicUnreadCount] = useState(0);
  const [senderRoles, setSenderRoles] = useState({});
  const [hasRecords,      setHasRecords]     = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // ── REAL TIME CLOCK FOR APPOINTMENT RESTRICTION ──
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const [onlineAppt,          setOnlineAppt]          = useState({ medical: false, dental: false });
  const [onlineApptDetails,   setOnlineApptDetails]   = useState({ medical: null, dental: null });
  const [loadingOnlineAppt, setLoadingOnlineAppt]  = useState(true);

  const [lastEndedByType, setLastEndedByType] = useState({ medical: null, dental: null });
  const lastEndedByTypeRef = useRef({ medical: null, dental: null });

  const updateLastEndedByType = useCallback((next) => {
    lastEndedByTypeRef.current = next;
    setLastEndedByType(next);
  }, []);

  // Check records
  useEffect(() => {
    const checkRecords = async () => {
      if (!profileCache?.internalUserId) {
        setLoadingRecords(false);
        setHasRecords(false);
        return;
      }
      try {
        const { data: medicalData } = await supabase
          .from('medical_records')
          .select('id, status')
          .eq('user_id', profileCache.internalUserId)
          .eq('is_archived', false);

        const { data: dentalData } = await supabase
          .from('dental_records')
          .select('id, status')
          .eq('user_id', profileCache.internalUserId)
          .eq('is_archived', false);

        setHasRecords((medicalData && medicalData.length > 0) || (dentalData && dentalData.length > 0));
      } catch (err) {
        setHasRecords(false);
      } finally {
        setLoadingRecords(false);
      }
    };
    checkRecords();
  }, [profileCache?.internalUserId]);

const checkOnlineAppointments = useCallback(async () => {
    if (!internalUserId) {
      setLoadingOnlineAppt(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        // ADDED 'reason' TO THIS SELECT
        .select('id, service_type, reason, status, month, day, year, time, created_at')
        .eq('user_id', internalUserId)
        .eq('is_archived', false);

      if (error) throw error;

      const approvedOnline = (data || []).filter(a => {
        const isApproved = a.status?.toLowerCase() === 'approved';
        // CHECK BOTH COLUMNS
        const isOnline = a.service_type?.toLowerCase().includes('online') ||
                         a.reason?.toLowerCase().includes('online');
        return isApproved && isOnline;
      });

      const medicalAppt = approvedOnline.find(a =>
        a.service_type?.toLowerCase().includes('medical') ||
        a.reason?.toLowerCase().includes('medical')
      ) || null;

      const dentalAppt  = approvedOnline.find(a =>
        a.service_type?.toLowerCase().includes('dental') ||
        a.reason?.toLowerCase().includes('dental')
      ) || null;

      setOnlineAppt({ medical: !!medicalAppt, dental: !!dentalAppt });
      setOnlineApptDetails({ medical: medicalAppt, dental: dentalAppt });

    } catch (err) {
      setOnlineAppt({ medical: false, dental: false });
      setOnlineApptDetails({ medical: null, dental: null });
    } finally {
      setLoadingOnlineAppt(false);
    }
  }, [internalUserId]);

  useEffect(() => {
    checkOnlineAppointments();
  }, [checkOnlineAppointments]);

  // Keep gate live
  useEffect(() => {
    if (!internalUserId) return;
    const channel = supabase
      .channel(`appointments-consult-gate-${internalUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          const row = payload.new || payload.old;
          if (String(row?.user_id) !== String(internalUserId)) return;
          checkOnlineAppointments();
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [internalUserId, checkOnlineAppointments]);

  // TIME VALIDATOR HELPER
  const isApptActive = useCallback((type) => {
    const appt = onlineApptDetails[type];

    if (!appt || !appt.year || !appt.month || !appt.day || !appt.time) {
      return false; // No valid appointment to check
    }

    const [hour, minute] = appt.time.split(':').map(Number);
    // Note: JavaScript Date months are 0-indexed, so we subtract 1 from the DB month
    const apptStart = new Date(appt.year, appt.month - 1, appt.day, hour, minute);
    const apptEnd = new Date(apptStart.getTime() + 60 * 60 * 1000); // +1 Hour

    const isActive = currentTime >= apptStart && currentTime <= apptEnd;

    // Log the math happening in the background for debugging
    console.log(`[Time Check - ${type.toUpperCase()}]`);
    console.log(`   └─ Target Appt Start: ${apptStart.toLocaleString()}`);
    console.log(`   └─ Target Appt End:   ${apptEnd.toLocaleString()}`);
    console.log(`   └─ Current Time:      ${currentTime.toLocaleString()}`);
    console.log(`   └─ Access Granted?    ${isActive ? 'YES 🟢' : 'NO 🔴'}`);

    return isActive;
  }, [onlineApptDetails, currentTime]);

  useEffect(() => {
    try {
      localStorage.setItem('consultUnreadCount', String(clinicUnreadCount));
    } catch {}
  }, [clinicUnreadCount]);

  useEffect(() => {
    if (isEnded) {
      setClinicUnreadCount(0);
      return;
    }
    if (!messages.length || !internalUserId) {
      setClinicUnreadCount(0);
      return;
    }
    const clinicMessages = messages.filter(m =>
      m.sender_id && String(m.sender_id) !== String(internalUserId)
    );
    const unread = clinicMessages.filter(m => !m.read_at).length;
    setClinicUnreadCount(unread);
  }, [messages, internalUserId, isEnded]);

  useEffect(() => {
    sessionStorage.removeItem(CONSULT_CACHE_KEY);
  }, []);

  const [startingOption,  setStartingOption]  = useState(null);

  const messagesEndRef  = useRef(null);
  const scrollAreaRef   = useRef(null);
  const isEndedRef      = useRef(true);
  const initRanRef      = useRef(false);
  const fetchRanRef     = useRef(false);
  const activeRoomIdRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const prevFirstIdRef  = useRef(null);
  const isSendingRef    = useRef(false);
  const justStartedAtRef = useRef(0);

  useEffect(() => { isEndedRef.current = isEnded; }, [isEnded]);
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId, null, true);
    }
  }, [activeRoomId]);

  useEffect(() => {
    if (internalUserId && internalName && internalName !== 'Patient') {
      writeProfileCache({ internalUserId, internalName });
    }
  }, [internalUserId, internalName]);

  const refreshMessages = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    const { data } = await supabase
      .from('consultation_messages')
      .select('*')
      .eq('consultation_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE);
    if (data) {
      const ordered = [...data].reverse();
      setMessages(ordered);
      setCachedMessages(roomId, ordered);
    }
  }, []);

  const {
    scrollElRef:  ptrScrollRef,
    indicatorRef,
    onTouchStart: ptrTouchStart,
    onTouchMove:  ptrTouchMove,
    onTouchEnd:   ptrTouchEnd,
  } = usePullToRefresh(refreshMessages);

  const setScrollRef = useCallback((el) => {
    scrollAreaRef.current = el;
    ptrScrollRef.current  = el;
  }, [ptrScrollRef]);

  const isTokenExpired = (token) => {
    try {
     const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() / 1000 > payload.exp - 30;
    } catch {
      return true;
    }
  };

  const ensureValidSession = useCallback(async () => {
    const accessToken  = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token') || '';

    if (!accessToken) return null;

    if (!isTokenExpired(accessToken)) {
      try {
        const { data: sd } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        const liveToken = sd?.session?.access_token || accessToken;
        try { supabase.realtime.setAuth(liveToken); } catch {}
        return liveToken;
      } catch {
        return accessToken;
      }
    }

    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed?.session) {
        const newAccess  = refreshed.session.access_token;
        const newRefresh = refreshed.session.refresh_token;
        localStorage.setItem('token', newAccess);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
        try { supabase.realtime.setAuth(newAccess); } catch {}
        return newAccess;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, []);

  // INIT
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const run = async () => {
      if (!currentUser?.uid || !localStorage.getItem('token')) {
        setLoadingHistory(false);
        return;
      }

      await ensureValidSession();

      if (profileCache?.internalUserId) {
        try {
          await supabase.from('presence').upsert(
            { user_id: profileCache.internalUserId, status: 'online', last_seen: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        } catch {}
        return;
      }

      const { data: profiles, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('uid', currentUser.uid)
        .limit(1);

      const profile = profiles?.[0] || null;
      if (error || !profile) {
        setLoadingHistory(false);
        return;
      }

      const name = `${profile.first_name} ${profile.last_name}`.trim();
      setInternalUserId(profile.id);
      setInternalName(name);
      setSessionReady(true);

      try {
        await supabase.from('presence').upsert(
          { user_id: profile.id, status: 'online', last_seen: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      } catch {}
    };

    run();

    const tokenRefreshInterval = setInterval(() => {
      ensureValidSession().catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
      const storedId = localStorage.getItem('_internalUserId');
      if (storedId) {
        supabase.from('presence').upsert(
          { user_id: storedId, status: 'offline', last_seen: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      }
    };
  }, [ensureValidSession, currentUser?.uid, profileCache?.internalUserId]);

  useEffect(() => {
    if (internalUserId) localStorage.setItem('_internalUserId', String(internalUserId));
  }, [internalUserId]);

  const fetchMessages = useCallback(async (roomId, beforeId = null, forceRefresh = false) => {
    if (!beforeId && !forceRefresh) {
      const cached = getCachedMessages(roomId);
      if (cached) {
        setMessages(cached);
        setHasMoreMessages(cached.length === MSG_PAGE_SIZE);
        return;
      }
    }

    let query = supabase
      .from('consultation_messages')
      .select('*')
      .eq('consultation_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE);

    if (beforeId) {
      const { data: pivot } = await supabase
        .from('consultation_messages')
        .select('created_at')
        .eq('id', beforeId)
        .single();
      if (pivot) query = query.lt('created_at', pivot.created_at);
    }

    const { data } = await query;
    if (!data) return;

    const ordered = [...data].reverse();

    if (beforeId) {
      setMessages(prev => [...ordered, ...prev]);
    } else {
      setMessages(ordered);
      setCachedMessages(roomId, ordered);
    }

    setHasMoreMessages(data.length === MSG_PAGE_SIZE);

    const senderIds = ordered.map(m => m.sender_id).filter(Boolean);
    if (senderIds.length > 0) {
      const roles = await fetchSenderRoles(senderIds);
      setSenderRoles(prev => ({ ...prev, ...roles }));
    }
  }, []);

  useEffect(() => {
    if (!internalUserId || !sessionReady) return;
    if (fetchRanRef.current) return;
    fetchRanRef.current = true;

    const fetchConsultation = async () => {
      await ensureValidSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data: activeConsults } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        const activeConsult = activeConsults?.[0] || null;

        if (activeConsult) {
          setActiveRoomId(activeConsult.id);
          setIsEnded(false);
          setConsultType(activeConsult.consultation_type || null);
          await fetchMessages(activeConsult.id);
          setCachedConsultations(internalUserId, { activeConsult, lastEnded: null });
          return;
        }

        const cached = getCachedConsultations(internalUserId);
        if (cached?.activeConsult) {
          const { data: verifyData } = await supabase
            .from('consultations')
            .select('id, status')
            .eq('id', cached.activeConsult.id)
            .single();

          if (verifyData?.status === 'active') {
            setActiveRoomId(cached.activeConsult.id);
            setIsEnded(false);
            setConsultType(cached.activeConsult.consultation_type || null);
            await fetchMessages(cached.activeConsult.id);
            return;
          }
        }

        const { data: allEnded } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', internalUserId)
          .eq('status', 'ended')
          .order('created_at', { ascending: false });

        const latestByType = {};
        (allEnded || []).forEach(c => {
          if (!latestByType[c.consultation_type]) latestByType[c.consultation_type] = c;
        });
        updateLastEndedByType({
          medical: latestByType.medical?.id || null,
          dental:  latestByType.dental?.id  || null,
        });

        const lastEnded = latestByType[historyFilter] || null;
        if (lastEnded) {
          setActiveRoomId(lastEnded.id);
          setConsultType(lastEnded.consultation_type || null);
          await fetchMessages(lastEnded.id);
          setCachedConsultations(internalUserId, { activeConsult: null, lastEnded });
        } else {
          setCachedConsultations(internalUserId, { activeConsult: null, lastEnded: null });
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchConsultation();

    const pollInterval = setInterval(async () => {
      try {
        if (Date.now() - justStartedAtRef.current < 8000) return;
        await ensureValidSession();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: activeData } = await supabase
          .from('consultations')
          .select('id, status, consultation_type')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        const activeRow = activeData?.[0] || null;
        const currentRoomId = activeRoomIdRef.current;

        if (activeRow) {
          if (activeRow.id !== currentRoomId) {
            setIsEnded(false);
            setActiveRoomId(activeRow.id);
            setConsultType(activeRow.consultation_type || null);
            await fetchMessages(activeRow.id);
          } else {
            await fetchMessages(activeRow.id, null, true);
          }
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: recheckActive } = await supabase
          .from('consultations')
          .select('id, status')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .limit(1);

        if (recheckActive?.[0]) {
          setIsEnded(false);
          setActiveRoomId(recheckActive[0].id);
          setConsultType(recheckActive[0].consultation_type || null);
          await fetchMessages(recheckActive[0].id);
          return;
        }

        const currentlyEnded = isEndedRef.current;
        if (!currentlyEnded) {
          const { data: endedData } = await supabase
            .from('consultations')
            .select('id, status, consultation_type')
            .eq('patient_id', internalUserId)
            .eq('status', 'ended')
            .order('created_at', { ascending: false })
            .limit(1);

          const endedRow = endedData?.[0] || null;
          if (endedRow) {
            setIsEnded(true);
            setActiveRoomId(endedRow.id);
            setConsultType(endedRow.consultation_type || null);
            await fetchMessages(endedRow.id);
          } else {
            setIsEnded(true);
            setActiveRoomId(null);
            setConsultType(null);
          }
        }
      } catch (err) {}
    }, 15000);

    const readStatusPoll = setInterval(async () => {
      if (!activeRoomId || isEndedRef.current) return;
      try {
        const { data } = await supabase
          .from('consultation_messages')
          .select('id, read_at')
          .eq('consultation_id', activeRoomId);
        if (data && data.length > 0) {
          setMessages(msgs =>
            msgs.map(msg => {
              const updated = data.find(m => m.id === msg.id);
              return updated && updated.read_at !== msg.read_at ? { ...msg, read_at: updated.read_at } : msg;
            })
          );
        }
      } catch (err) {}
    }, 5000);

    const messagesChannel = supabase
      .channel(`consultation-msgs-${internalUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages' },
        async (payload) => {
          const currentRoomId = activeRoomIdRef.current;
          const newMsgRoomId = String(payload.new.consultation_id);

          if (newMsgRoomId === String(currentRoomId)) {
            if (isSendingRef.current) return;
            setMessages(msgs => {
              if (msgs.some(m => m.id === payload.new.id)) return msgs;
              return [...msgs, payload.new];
            });
            if (payload.new.sender_id) {
              const roles = await fetchSenderRoles([payload.new.sender_id]);
              setSenderRoles(prev => ({ ...prev, ...roles }));
            }
          } else if (isEndedRef.current && currentRoomId) {
            const { data: consultData } = await supabase
              .from('consultations')
              .select('id, status')
              .eq('id', newMsgRoomId)
              .single();

            if (consultData?.status === 'active') {
              setIsEnded(false);
              setActiveRoomId(newMsgRoomId);
              await fetchMessages(newMsgRoomId);
            }
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultation_messages' },
        (payload) => {
          if (payload.new?.read_at) {
            setMessages(msgs =>
              msgs.map(msg =>
                msg.id === payload.new.id ? { ...msg, read_at: payload.new.read_at } : msg
              )
            );
          }
        })
      .subscribe();

    const statusChannel = supabase
      .channel(`consultation-status-${internalUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultations' },
        async (payload) => {
          if (String(payload.new.patient_id) !== String(internalUserId)) return;
          if (payload.new.status === 'active') {
            justStartedAtRef.current = Date.now();
            setIsEnded(false);
            setActiveRoomId(payload.new.id);
            setConsultType(payload.new.consultation_type || null);
            await fetchMessages(payload.new.id, null, true);
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations' },
        async (payload) => {
          if (String(payload.new.patient_id) !== String(internalUserId)) return;
          const currentRoomId = activeRoomIdRef.current;

          if (String(payload.new.id) !== String(currentRoomId)) {
            if (payload.new.status === 'active') {
              setIsEnded(false);
              setActiveRoomId(payload.new.id);
              setConsultType(payload.new.consultation_type || null);
              await fetchMessages(payload.new.id);
            }
            return;
          }

          if (payload.new.status === 'ended') {
            if (Date.now() - justStartedAtRef.current < 8000) return;
            await fetchMessages(payload.new.id);
            setActiveRoomId(payload.new.id);
            setConsultType(null);
            setIsEnded(true);
            setCachedConsultations(internalUserId, { activeConsult: null, lastEnded: payload.new });
            updateLastEndedByType({
              ...lastEndedByTypeRef.current,
              [payload.new.consultation_type]: payload.new.id,
            });
          } else if (payload.new.status === 'active') {
            justStartedAtRef.current = Date.now();
            setIsEnded(false);
            setConsultType(payload.new.consultation_type || null);
            setActiveRoomId(payload.new.id);
          }
        })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      clearInterval(readStatusPoll);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [internalUserId, sessionReady]);

  useEffect(() => {
    let isMounted = true;

    const fetchPresence = async () => {
      const cachedOnline = getCachedPresence();
      if (cachedOnline !== null) {
        if (isMounted) setIsClinicOnline(cachedOnline);
        return;
      }

      const { data: onlineRows } = await supabase.from('presence').select('user_id').eq('status', 'online');

      if (!isMounted || !onlineRows?.length) {
        if (isMounted) {
          setIsClinicOnline(false);
          setCachedPresence(false);
        }
        return;
      }

      const onlineIds = onlineRows.map(r => r.user_id);
      const { data: staffRows } = await supabase.from('users').select('id, role').in('id', onlineIds);
      if (!isMounted) return;

      const clinicOnline = (staffRows || []).some(u =>
        ['doctor', 'nurse', 'dentist', 'sysadmin', 'administrator'].includes(u.role?.toLowerCase())
      );
      setIsClinicOnline(clinicOnline);
      setCachedPresence(clinicOnline);
    };

    const cachedOnline = getCachedPresence();
    if (cachedOnline !== null) {
      setIsClinicOnline(cachedOnline);
    }
    fetchPresence();

    const presenceChannel = supabase
      .channel('presence-clinic-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, fetchPresence)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  useEffect(() => {
    const prev      = prevMsgCountRef.current;
    const prevFirst = prevFirstIdRef.current;
    const curr      = messages.length;
    const currFirst = messages[0]?.id ?? null;

    prevMsgCountRef.current = curr;
    prevFirstIdRef.current  = currFirst;

    if (currFirst !== prevFirst && prev > 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isEnded]);

  const handleLoadMore = async () => {
    if (!activeRoomId || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    try {
      const oldestMsg = messages[0];
      if (!oldestMsg) return;

      const { data: pivot } = await supabase.from('consultation_messages').select('created_at').eq('id', oldestMsg.id).single();
      if (!pivot) return;

      const { data } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', activeRoomId)
        .lt('created_at', pivot.created_at)
        .order('created_at', { ascending: false })
        .limit(MSG_PAGE_SIZE);

      if (!data) return;

      const ordered = [...data].reverse();
      const scrollEl = scrollAreaRef.current;
      const scrollHeightBefore = scrollEl?.scrollHeight ?? 0;
      const scrollTopBefore    = scrollEl?.scrollTop    ?? 0;

      setMessages(prev => [...ordered, ...prev]);
      setHasMoreMessages(data.length === MSG_PAGE_SIZE);

      const senderIds = ordered.map(m => m.sender_id).filter(Boolean);
      if (senderIds.length > 0) {
        const roles = await fetchSenderRoles(senderIds);
        setSenderRoles(prev => ({ ...prev, ...roles }));
      }

      requestAnimationFrame(() => {
        if (!scrollEl) return;
        const added = scrollEl.scrollHeight - scrollHeightBefore;
        scrollEl.scrollTop = scrollTopBefore + added;
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOptionSelect = async (option) => {
    if (!internalUserId || startingOption) return;

    if (!isEndedRef.current && activeRoomIdRef.current) {
      setStartingOption(null);
      return;
    }

    justStartedAtRef.current = Date.now();
    setStartingOption(option.label);

    try {
      await ensureValidSession();

      let roomId;
      let consultation;
      let isReactivation = false;

      let existingEndedId = (isEndedRef.current && activeRoomIdRef.current && consultType === option.type)
        ? activeRoomIdRef.current
        : lastEndedByTypeRef.current[option.type];

      if (!existingEndedId) {
        const { data: dbCheck } = await supabase
          .from('consultations')
          .select('id')
          .eq('patient_id', internalUserId)
          .eq('consultation_type', option.type)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (dbCheck) existingEndedId = dbCheck.id;
      }

      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      if (existingEndedId) {
        const reactivateResponse = await fetch(`${API_URL}/consultations/${existingEndedId}/reactivate`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        const reactivateResult = await reactivateResponse.json();

        if (!reactivateResponse.ok) {
          if (reactivateResponse.status === 403) {
             alert(reactivateResult.message || 'You can only join during your scheduled time.');
             setStartingOption(null);
             return;
          }
          console.error('[Chat] Failed to reactivate consultation:', reactivateResult.message);
        } else if (reactivateResult.success && reactivateResult.data) {
          roomId = reactivateResult.data.id;
          consultation = reactivateResult.data;
          isReactivation = true;
        }
      }

      if (!roomId) {
        const response = await fetch(`${API_URL}/consultations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            patient_id:        internalUserId,
            patient_name:      internalName,
            patient_role:      currentUser.role || 'student',
            consultation_type: option.type,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
             alert(result.message || 'You can only join during your scheduled time.');
             setStartingOption(null);
             return;
          }
          throw new Error(result.message || 'Failed to create consultation');
        }

        consultation = result.data;
        roomId = consultation.id;

        const { data: verifyData } = await supabase.from('consultations').select('id, status').eq('id', roomId).single();

        if (verifyData?.status !== 'active') {
          await fetch(`${API_URL}/consultations/${roomId}/reactivate`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
          });
        }
      }

      updateLastEndedByType({ ...lastEndedByTypeRef.current, [option.type]: null });
      justStartedAtRef.current = Date.now();

      setActiveRoomId(roomId);
      setIsEnded(false);
      setConsultType(option.type);
      setMessages([]);
      setHasMoreMessages(false);

      setCachedConsultations(internalUserId, { activeConsult: consultation, lastEnded: null });
      setCachedMessages(roomId, null);

      await supabase.from('consultation_messages').insert([
        {
          consultation_id: roomId,
          sender_id:       internalUserId,
          sender_name:     internalName,
          sender_role:     currentUser.role || 'student',
          message:         option.label,
          created_at:      new Date().toISOString(),
        },
        {
          consultation_id: roomId,
          sender_id:       null,
          sender_name:     'System',
          sender_role:     'system',
          message:         `Connecting you to the ${option.type === 'dental' ? 'Dental' : 'Medical'} team... They will be with you shortly. 💬`,
          created_at:      new Date(Date.now() + 100).toISOString(),
        }
      ]);

      const { data: newMessages } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', roomId)
        .order('created_at', { ascending: true });

      if (newMessages && newMessages.length > 0) {
        setMessages(newMessages);
        setCachedMessages(roomId, newMessages);
      }
    } catch (err) {
      setIsEnded(true);
    } finally {
      setStartingOption(null);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeRoomId || isEnded) return;
    const text = inputValue.trim();
    setInputValue('');
    isSendingRef.current = true;

    try {
      await supabase.from('consultation_messages').insert({
        consultation_id: activeRoomId,
        sender_id:       internalUserId,
        sender_name:     internalName,
        sender_role:     currentUser.role || 'student' ,
        message:         text,
        created_at:      new Date().toISOString(),
      });

      const { data: updatedMessages } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', activeRoomId)
        .order('created_at', { ascending: true });

      if (updatedMessages) {
        const uniqueMessages = updatedMessages.reduce((acc, msg) => {
          if (!acc.some(m => m.id === msg.id)) {
            acc.push(msg);
          }
          return acc;
        }, []);
        setMessages(uniqueMessages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        setTimeout(async () => {
          await fetchMessages(activeRoomId, null, true);
        }, 2000);
      }
      setCachedMessages(activeRoomId, null);
    } catch (err) {
    } finally {
      isSendingRef.current = false;
    }
  };

  const markMessagesAsRead = useCallback(async () => {
    if (!activeRoomId || !internalUserId || isEnded) return;

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const bodyToSend = {
      sender_id: internalUserId,
      sender_role: currentUser.role || 'student',
    };

    try {
      await fetch(`${API_URL}/consultations/${activeRoomId}/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyToSend),
      });
    } catch (err) { }
  }, [activeRoomId, internalUserId, isEnded, currentUser.role]);

  useEffect(() => {
    if (activeRoomId && !isEnded && internalUserId) {
      markMessagesAsRead();
    }
  }, [activeRoomId, messages, isEnded, markMessagesAsRead]);

  const handleHistoryFilterSwitch = async (filterType) => {
    setHistoryFilter(filterType);
    setLoadingHistory(true);
    await ensureValidSession();

    const knownId = lastEndedByTypeRef.current[filterType];
    if (knownId) {
      const { data: known } = await supabase.from('consultations').select('*').eq('id', knownId).single();
      if (known) {
        setActiveRoomId(known.id);
        setConsultType(known.consultation_type);
        await fetchMessages(known.id);
        setLoadingHistory(false);
        return;
      }
    }

    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', internalUserId)
      .eq('status', 'ended')
      .eq('consultation_type', filterType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.[0]) {
      setActiveRoomId(data[0].id);
      setConsultType(data[0].consultation_type);
      await fetchMessages(data[0].id);
      updateLastEndedByType({ ...lastEndedByTypeRef.current, [filterType]: data[0].id });
    } else {
      setActiveRoomId(null);
      setConsultType(null);
      setMessages([]);
    }
    setLoadingHistory(false);
  };

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const dateLabel = formatDate(msg.created_at);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel, key: `date-${msg.created_at}` });
        lastDate = dateLabel;
      }
      groups.push(msg);
    });
    return groups;
  }, [messages]);

  const typeConfig = useMemo(() => ({
    generic: { label: 'MediTrack', sublabel: 'Assistant',      accent: '#466460', accentLight: '#e0eceb', accentBorder: '#c4dbd8' },
    medical: { label: 'Medical',   sublabel: 'Doctors & Nurses', accent: '#1a5c3a', accentLight: '#e8f5ee', accentBorder: '#b2d9c2' },
    dental:  { label: 'Dental',    sublabel: 'Dentists',         accent: '#1a4a7a', accentLight: '#e8f0fa', accentBorder: '#b2c8e8' },
  }), []);
  const cfg = useMemo(() => (consultType && !isEnded) ? typeConfig[consultType] : typeConfig.generic, [consultType, isEnded, typeConfig]);

  const availableOptions = useMemo(
    () => INITIAL_OPTIONS.filter(opt => onlineAppt[opt.type]),
    [onlineAppt]
  );

  const renderMessage = (item, i, overrideCfg = null) => {
    if (item.type === 'date') {
      return (
        <div key={item.key} className="flex justify-center my-2">
          <span className="px-4 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">
            {item.label}
          </span>
        </div>
      );
    }

    if (item.sender_role === 'system' || item.sender_role === 'bot') {
      return (
        <div key={item.id || i} className="flex items-end gap-2 my-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 bg-[#e0eceb]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <path strokeLinecap="round" d="M8 8V6a4 4 0 018 0v2" />
              <circle cx="9" cy="14" r="1" fill="#466460" />
              <circle cx="15" cy="14" r="1" fill="#466460" />
            </svg>
          </div>
          <div className="max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm rounded-2xl rounded-bl-sm break-words bg-white text-[#1a2e22] border border-[#c4dbd8]">
            <LinkifiedText text={item.message} isPatient={false} />
          </div>
        </div>
      );
    }

    const isPatient  = String(item.sender_id) === String(internalUserId);
    const activeCfg  = overrideCfg || cfg;
    const msgCfg     = isPatient ? activeCfg : (consultType === 'dental' ? typeConfig.dental : typeConfig.medical);

    return (
      <div key={item.id || i} className={`flex flex-col my-1 ${isPatient ? 'items-end' : 'items-start'}`}>
        {!isPatient && (
          <div className="flex items-center gap-1.5 mb-0.5 ml-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: msgCfg.accentLight }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={msgCfg.accent} strokeWidth="2" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {(() => {
              const senderInfo = senderRoles[item.sender_id] || {};
              const role = senderInfo.role || item.sender_role || 'staff';
              const firstName = senderInfo.first_name || '';
              const lastName = senderInfo.last_name || '';
              const roleLower = role.toLowerCase();

              let displayName = item.sender_name || 'Clinic Staff';
              if (firstName || lastName) displayName = `${firstName} ${lastName}`.trim();
              if (roleLower === 'doctor') displayName = `Dr. ${displayName}`;

              const roleBadgeClass = roleLower === 'doctor'
                ? 'bg-emerald-100 text-emerald-700'
                : roleLower === 'nurse' ? 'bg-blue-100 text-blue-700'
                  : roleLower === 'dentist' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600';

              return (
                <>
                  <p className="text-[10px] font-bold" style={{ color: msgCfg.accent }}>
                    {displayName}
                    {getGenderIcon(senderInfo.sex)}
                  </p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold capitalize ${roleBadgeClass}`}>
                    {role}
                  </span>
                </>
              );
            })()}
          </div>
        )}
        <div
          className="max-w-[80%] px-4 py-3 text-[13px] leading-relaxed shadow-sm rounded-2xl break-words transition-colors duration-300"
          style={isPatient
            ? { backgroundColor: '#466460', color: '#fff', borderBottomRightRadius: 4 }
            : { backgroundColor: '#fff', color: '#1a2e22', border: `1px solid ${msgCfg.accentBorder}`, borderBottomLeftRadius: 4 }
          }
        >
          <LinkifiedText text={item.message} isPatient={isPatient} />
        </div>
        <div className={`text-[9px] text-[#9bb5a5] mt-1 mx-2 flex items-center gap-1 ${isPatient ? 'justify-end' : ''}`}>
          <span>{formatTime(item.created_at)}</span>
          {isPatient && (
            <span className={item.read_at ? 'text-blue-500' : ''} title={item.read_at ? `Seen at ${new Date(item.read_at).toLocaleString()}` : 'Sent'}>
              {item.read_at ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f4f7f5' }}>
      <style>{ptrStyles}</style>

      {!loadingRecords && !hasRecords ? (
        <div className="flex-1 flex items-center justify-center p-8 h-full">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E8EFEC] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#466460]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[#1a2e22] mb-2">Visit the Clinic First</h3>
            <p className="text-[13px] text-[#64748b]">
              Please proceed to the clinic for a face-to-face consultation to create your medical or dental record before accessing digital consultations.
            </p>
          </div>
        </div>
      ) : !loadingRecords && !loadingOnlineAppt && !onlineAppt.medical && !onlineAppt.dental ? (
        <div className="flex-1 flex items-center justify-center p-8 h-full">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E8EFEC] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#466460]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[#1a2e22] mb-2">Book an Online Consultation First</h3>
            <p className="text-[13px] text-[#64748b] mb-4">
              Digital consultations open up once the clinic approves an online medical or dental appointment for you. Please request one from your Appointments page and wait for approval.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('meditrack:navigate', { detail: { to: 'appointments' } }))}
              className="inline-flex items-center gap-2 bg-[#466460] hover:bg-[#364e4a] text-white text-[12px] font-bold px-4 py-2.5 rounded-full transition-colors"
            >
              <i className="fa-solid fa-calendar-plus"></i>
              Go to Appointments
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{ position: 'sticky', top: 0, zIndex: 20, background: '#ffffff', borderBottom: '1px solid #edf3f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', flexShrink: 0 }}
            className="px-5 py-4 flex items-center gap-3 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300" style={{ backgroundColor: cfg.accentLight }}>
              {consultType === 'dental' && !isEnded ? (
                <svg viewBox="0 0 64 64" fill="none" stroke={cfg.accent} strokeWidth="2.4" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 8c-6 0-12 4-12 13 0 5 2 9 4 13l4 16c1 4 3 6 5 6s3-2 5-6l2-8 2 8c2 4 3 6 5 6s4-2 5-6l4-16c2-4 4-8 4-13C48 12 42 8 36 8c-3 0-5.5 1-8 2.5C25.5 9 23 8 20 8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth="1.5" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#1a2e22]">{cfg.label}{!isEnded && ' Consultation'}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold transition-colors duration-300" style={{ backgroundColor: cfg.accentLight, color: cfg.accent }}>
                  {cfg.sublabel}
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mt-0.5 transition-colors duration-300"
                style={{ backgroundColor: isClinicOnline ? cfg.accentLight : '#f1f5f9', color: isClinicOnline ? cfg.accent : '#94a3b8' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isClinicOnline ? cfg.accent : '#94a3b8' }} />
                {isClinicOnline ? 'Clinic Online' : 'Clinic Offline'}
              </span>
            </div>

            {isEnded && (
              <div className="relative">
                <button onClick={() => setShowHistoryMenu(!showHistoryMenu)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors" title="View Chat History">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#466460]">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {showHistoryMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowHistoryMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20" onClick={(e) => e.stopPropagation()}>
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Chat History</div>
                      <button onClick={() => { handleHistoryFilterSwitch('medical'); setShowHistoryMenu(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${historyFilter === 'medical' ? 'bg-[#1a5c3a]/10 text-[#1a5c3a]' : 'text-[#466460] hover:bg-slate-50'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Medical History
                      </button>
                      <button onClick={() => { handleHistoryFilterSwitch('dental'); setShowHistoryMenu(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${historyFilter === 'dental' ? 'bg-[#1a4a7a]/10 text-[#1a4a7a]' : 'text-[#466460] hover:bg-slate-50'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Dental History
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div
            ref={setScrollRef}
            onTouchStart={!isEnded ? ptrTouchStart : undefined}
            onTouchMove={!isEnded  ? ptrTouchMove  : undefined}
            onTouchEnd={!isEnded   ? ptrTouchEnd   : undefined}
            style={{ flex: 1, overflowY: 'auto', minHeight: 0, position: 'relative', touchAction: 'manipulation' }}
            className="px-4 py-5 flex flex-col gap-2 bg-[#f4f7f5]"
          >
            {!isEnded && <PullIndicator indicatorRef={indicatorRef} />}

            {loadingHistory && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                <div className="flex items-center gap-2 text-[#9bb5a5] bg-white/80 px-3 py-2 rounded-full shadow-sm">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="text-[10px]">Loading…</span>
                </div>
              </div>
            )}

            {!loadingHistory && hasMoreMessages && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold bg-white border border-[#c4dbd8] text-[#466460] hover:border-[#466460] hover:shadow-sm transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Loading…
                    </>
                  ) : '↑ Load earlier messages'}
                </button>
              </div>
            )}

            {!isEnded && sessionReady && groupedMessages.map((item, i) => renderMessage(item, i))}

            {isEnded && messages.length > 0 && (
              <>
                {sessionReady && groupedMessages.map((item, i) => renderMessage(item, i, typeConfig.generic))}
                <div className="flex items-center gap-3 my-4 opacity-60">
                  <div className="flex-1 h-px bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Ended</span>
                  <div className="flex-1 h-px bg-slate-300" />
                </div>
              </>
            )}

            {!loadingHistory && isEnded && (
              <div className="mt-2 mb-2 flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 bg-[#e0eceb]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="3" y="8" width="18" height="13" rx="2" />
                      <path strokeLinecap="round" d="M8 8V6a4 4 0 018 0v2" />
                      <circle cx="9" cy="14" r="1" fill="#466460" />
                      <circle cx="15" cy="14" r="1" fill="#466460" />
                    </svg>
                  </div>
                  <div className="max-w-[85%] px-4 py-3 text-[13px] leading-relaxed shadow-sm rounded-2xl rounded-bl-sm bg-white border border-[#c4dbd8] text-[#1a2e22]">
                    <span>👋 Hello! I'm the MediTrack assistant.</span>
                    <br />
                    <strong>What brings you in today?</strong> Please select the type of consultation you need:
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-9 max-w-[90%]">
                  {availableOptions.map((opt, idx) => {
                    const isThisLoading = startingOption === opt.label;
                    const isActiveNow   = isApptActive(opt.type);
                    const appt          = onlineApptDetails[opt.type];

                    let timeText = '';
                    if (!isActiveNow && appt?.time) {
                       const [h, m] = appt.time.split(':').map(Number);
                       const period = h >= 12 ? 'PM' : 'AM';
                       const hr = h % 12 || 12;
                       timeText = `Unlocks at ${hr}:${String(m).padStart(2, '0')} ${period}`;
                    }

                    const isDisabled = !sessionReady || startingOption !== null || !isActiveNow;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(opt)}
                        disabled={isDisabled}
                        className={`text-left px-4 py-3 rounded-xl border-2 bg-white transition-all duration-300 flex items-center justify-between ${
                          isDisabled
                            ? 'border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                            : 'border-[#c4dbd8] text-[#466460] hover:shadow-md active:scale-[0.98] hover:border-[#466460]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold">{opt.label}</span>
                          {!isActiveNow && timeText && (
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-lock text-[9px]"></i> {timeText}
                            </span>
                          )}
                        </div>
                        {isThisLoading && (
                          <svg className="animate-spin w-4 h-4 text-[#466460]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{ position: 'sticky', bottom: 0, zIndex: 20, background: '#ffffff', borderTop: '1px solid #edf3f0', boxShadow: '0 -4px 10px rgba(0,0,0,0.04)', flexShrink: 0 }}
            className="px-4 py-3 flex gap-3 items-center transition-colors duration-300"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isEnded ? 'Please select an option above…' : 'Type a message…'}
              disabled={isEnded || !sessionReady}
              className="flex-1 border rounded-full px-5 py-3.5 text-[13px] bg-[#f9fbfa] text-[#1a2e22] outline-none transition-colors placeholder:text-[#9bb5a5] disabled:opacity-50 disabled:cursor-not-allowed duration-300"
              style={{ borderColor: cfg.accentBorder }}
              onFocus={e => !isEnded && (e.target.style.borderColor = cfg.accent)}
              onBlur={e  =>             (e.target.style.borderColor = cfg.accentBorder)}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isEnded || !sessionReady}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white transition disabled:opacity-40 flex-shrink-0 shadow-md duration-300"
              style={{ backgroundColor: cfg.accent }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-[-2px] mt-[2px]">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}