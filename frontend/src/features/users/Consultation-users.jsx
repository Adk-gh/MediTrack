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
    // Cache valid for 5 minutes
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
    // Cache valid for 2 minutes
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
  <div
    ref={indicatorRef}
    data-spin="false"
    style={{
      overflow:       'hidden',
      height:         0,
      opacity:        0,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      transition:     'height 0.2s ease, opacity 0.2s ease',
    }}
  >
    {/* Arrow — rotates 180° when past threshold */}
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

    {/* Spinner — shown while refreshMessages() is awaiting */}
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

export default function ConsultationUsers() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const profileCacheRef = useRef(readProfileCache());
  const profileCache    = profileCacheRef.current;

  const [messages,        setMessages]        = useState([]);
  const [inputValue,      setInputValue]      = useState('');
  const [isClinicOnline,  setIsClinicOnline]  = useState(false);
  const [isEnded,         setIsEnded]         = useState(true);
  const [consultType,     setConsultType]     = useState(null);
  const [activeRoomId,    setActiveRoomId]    = useState(null);
  const [internalUserId,  setInternalUserId]  = useState(profileCache?.internalUserId ?? null);
  const [internalName,    setInternalName]    = useState(profileCache?.internalName   ?? 'Patient');
  const [sessionReady,    setSessionReady]    = useState(!!(profileCache?.internalUserId));
  const [loadingHistory,  setLoadingHistory]  = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);

  // State to track which option button was clicked and lock the UI
  const [startingOption,  setStartingOption]  = useState(null);

  const messagesEndRef  = useRef(null);
  const scrollAreaRef   = useRef(null);
  const isEndedRef      = useRef(true);
  const initRanRef      = useRef(false);
  const fetchRanRef     = useRef(false);
  const activeRoomIdRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const prevFirstIdRef  = useRef(null);

  useEffect(() => { isEndedRef.current = isEnded; }, [isEnded]);
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  useEffect(() => {
    if (internalUserId && internalName && internalName !== 'Patient') {
      writeProfileCache({ internalUserId, internalName });
    }
  }, [internalUserId, internalName]);

  // ── Pull-to-refresh — fetches latest messages for the active room ─────────
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
      // Update cache on refresh
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

  // ── Unified ref: keeps scrollAreaRef and ptrScrollRef in sync ────────────
  const setScrollRef = useCallback((el) => {
    scrollAreaRef.current = el;
    ptrScrollRef.current  = el;
  }, [ptrScrollRef]);

  // ── helpers ───────────────────────────────────────────────────────────
  // Returns true when a raw JWT access token is expired (or unparseable).
  const isTokenExpired = (token) => {
    try {
     const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds; subtract 30s so we refresh slightly early
      return Date.now() / 1000 > payload.exp - 30;
    } catch {
      return true;
    }
  };

  // FIX: Removed the pre-refresh setSession call that was causing the 400 Bad Request.
  // Supabase's refreshSession() handles the refresh token internally — manually calling
  // setSession() with an expired access token before refreshing can corrupt the session
  // state and cause the token endpoint to reject the request.
  const ensureValidSession = useCallback(async () => {
    const accessToken  = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token') || '';

    if (!accessToken) return null;

    // ── Fast path: token still valid ─────────────────────────────────
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

    // ── Token expired — call refreshSession() directly (no pre-setSession) ───
    console.log('[Chat] Access token expired, refreshing…');

    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();

      if (!refreshErr && refreshed?.session) {
        const newAccess  = refreshed.session.access_token;
        const newRefresh = refreshed.session.refresh_token;
        localStorage.setItem('token', newAccess);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
        try { supabase.realtime.setAuth(newAccess); } catch {}
        console.log('[Chat] Token refreshed successfully');
        return newAccess;
      }

      console.warn('[Chat] Token refresh failed, continuing without valid auth');
      return null;
    } catch (err) {
      console.warn('[Chat] Token refresh threw:', err);
      return null;
    }
  }, []);

  // ── 1. Session init — runs ONCE on mount ──────────────────────────────
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const run = async () => {
      if (!currentUser?.uid) {
        setLoadingHistory(false);
        return;
      }
      if (!localStorage.getItem('token')) {
        setLoadingHistory(false);
        return;
      }

      // Always ensure a valid (possibly refreshed) session before doing anything
      await ensureValidSession();

      if (profileCache?.internalUserId) {
        // FIX: Supabase query builders return a PromiseLike, not a real Promise.
        // .catch() does not exist on them. Use try/catch with await instead.
        try {
          await supabase.from('presence').upsert(
            { user_id: profileCache.internalUserId, status: 'online', last_seen: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        } catch {}
        return; // effect 2 will clear loadingHistory
      }

      // Cache miss — fetch profile
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

      // FIX: Same fix — use try/catch instead of .catch()
      try {
        await supabase.from('presence').upsert(
          { user_id: profile.id, status: 'online', last_seen: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      } catch {}
      // effect 2 will clear loadingHistory
    };

    run();

    // ── Proactive token refresh every 10 minutes ──────────────────────
    const tokenRefreshInterval = setInterval(() => {
      ensureValidSession().catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
      const storedId = localStorage.getItem('_internalUserId');
      if (storedId) {
        // FIX: Dropped .then() — fire-and-forget is fine without it.
        // .then() on a Supabase builder is unreliable in cleanup contexts.
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

  // ── 2. Consultation fetch + realtime listeners ────────────────────────
  useEffect(() => {
    if (!internalUserId || !sessionReady) return;
    if (fetchRanRef.current) return;
    fetchRanRef.current = true;

    // ── Paginated message fetcher ─────────────────────────────────────
    const fetchMessages = async (roomId, beforeId = null) => {
      // Try cache first for initial load (no beforeId)
      if (!beforeId) {
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

      const ordered = [...data].reverse(); // oldest-first for display

      if (beforeId) {
        setMessages(prev => [...ordered, ...prev]);
      } else {
        setMessages(ordered);
        // Cache the initial messages
        setCachedMessages(roomId, ordered);
      }

      setHasMoreMessages(data.length === MSG_PAGE_SIZE);
    };

    // ── Initial consultation fetch ────────────────────────────────────
    const fetchConsultation = async () => {
      try {
        // Check cache first
        const cached = getCachedConsultations(internalUserId);
        if (cached) {
          if (cached.activeConsult) {
            setActiveRoomId(cached.activeConsult.id);
            setIsEnded(false);
            setConsultType(cached.activeConsult.consultation_type || null);
            await fetchMessages(cached.activeConsult.id);
            return;
          }
          if (cached.lastEnded) {
            setActiveRoomId(cached.lastEnded.id);
            setConsultType(cached.lastEnded.consultation_type || null);
            await fetchMessages(cached.lastEnded.id);
            return;
          }
        }

        // Check for an active session first
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
          // Cache the result
          setCachedConsultations(internalUserId, { activeConsult, lastEnded: null });
          return;
        }

        // No active session — load most recent ended session for history
        const { data: endedConsults } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', internalUserId)
          .eq('status', 'ended')
          .order('created_at', { ascending: false })
          .limit(1);

        const lastEnded = endedConsults?.[0] || null;

        if (lastEnded) {
          setActiveRoomId(lastEnded.id);
          setConsultType(lastEnded.consultation_type || null);
          await fetchMessages(lastEnded.id);
          // Cache the result
          setCachedConsultations(internalUserId, { activeConsult: null, lastEnded });
          // isEnded stays true — history + greeting both show
        } else {
          // Cache the empty result
          setCachedConsultations(internalUserId, { activeConsult: null, lastEnded: null });
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchConsultation();

    // ── POLLING FALLBACK (15s — realtime covers instant updates) ─────
    const pollInterval = setInterval(async () => {
      try {
        const { data: latest } = await supabase
          .from('consultations')
          .select('id, status, consultation_type')
          .eq('patient_id', internalUserId)
          .order('created_at', { ascending: false })
          .limit(1);

        const row = latest?.[0] || null;
        if (!row) return;

        const currentlyEnded = isEndedRef.current;

        if (row.status === 'ended' && !currentlyEnded) {
          await fetchMessages(row.id);
          setActiveRoomId(row.id);
          setConsultType(null);
          setIsEnded(true);
        } else if (row.status === 'active' && currentlyEnded) {
          setIsEnded(false);
          setActiveRoomId(row.id);
          setConsultType(row.consultation_type || null);
          await fetchMessages(row.id);
        }
      } catch (err) {
        console.warn('[Chat] Poll error:', err);
      }
    }, 15000);

    // ── NEW MESSAGE LISTENER ──────────────────────────────────────────
    const messagesChannel = supabase
      .channel(`consultation-msgs-${internalUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages' },
        (payload) => {
          if (String(payload.new.consultation_id) !== String(activeRoomIdRef.current)) return;
          setMessages(msgs => {
            if (msgs.some(m => m.id === payload.new.id)) return msgs;
            return [...msgs, payload.new];
          });
        })
      .subscribe();

    // ── STATUS CHANGE LISTENER ────────────────────────────────────────
    const statusChannel = supabase
      .channel(`consultation-status-${internalUserId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations' },
        async (payload) => {
          if (String(payload.new.patient_id) !== String(internalUserId)) return;
          if (payload.new.status === 'ended') {
            await fetchMessages(payload.new.id);
            setActiveRoomId(payload.new.id);
            setConsultType(null);
            setIsEnded(true);
          } else if (payload.new.status === 'active') {
            setIsEnded(false);
            setConsultType(payload.new.consultation_type || null);
            setActiveRoomId(payload.new.id);
          }
        })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [internalUserId, sessionReady]);

  // ── 3. Presence Monitor ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchPresence = async () => {
      // Check cache first
      const cachedOnline = getCachedPresence();
      if (cachedOnline !== null) {
        if (isMounted) setIsClinicOnline(cachedOnline);
        return;
      }

      const { data: onlineRows } = await supabase
        .from('presence')
        .select('user_id')
        .eq('status', 'online');

      if (!isMounted || !onlineRows?.length) {
        if (isMounted) {
          setIsClinicOnline(false);
          setCachedPresence(false);
        }
        return;
      }

      const onlineIds = onlineRows.map(r => r.user_id);

      const { data: staffRows } = await supabase
        .from('users')
        .select('id, role')
        .in('id', onlineIds);

      if (!isMounted) return;

      const clinicOnline = (staffRows || []).some(u =>
        ['doctor', 'nurse', 'dentist', 'admin', 'administrator'].includes(u.role?.toLowerCase())
      );
      setIsClinicOnline(clinicOnline);
      setCachedPresence(clinicOnline);
    };

    // Initial fetch with cached value
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

  // ── 4. Auto-scroll — only on appended messages, not load-more prepends ─
  useEffect(() => {
    const prev      = prevMsgCountRef.current;
    const prevFirst = prevFirstIdRef.current;
    const curr      = messages.length;
    const currFirst = messages[0]?.id ?? null;

    prevMsgCountRef.current = curr;
    prevFirstIdRef.current  = currFirst;

    // First message ID changed → older messages were prepended (load-more) — don't scroll
    if (currFirst !== prevFirst && prev > 0) return;

    // New message appended or initial load — scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isEnded]);

  // ── 5. Load more handler ───────────────────────────────────────────────
  const handleLoadMore = async () => {
    if (!activeRoomId || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    try {
      const oldestMsg = messages[0];
      if (!oldestMsg) return;

      const { data: pivot } = await supabase
        .from('consultation_messages')
        .select('created_at')
        .eq('id', oldestMsg.id)
        .single();

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

      // Save scroll position before prepending
      const scrollEl = scrollAreaRef.current;
      const scrollHeightBefore = scrollEl?.scrollHeight ?? 0;
      const scrollTopBefore    = scrollEl?.scrollTop    ?? 0;

      setMessages(prev => [...ordered, ...prev]);
      setHasMoreMessages(data.length === MSG_PAGE_SIZE);

      // After React re-renders, restore scroll so the user stays in place
      requestAnimationFrame(() => {
        if (!scrollEl) return;
        const added = scrollEl.scrollHeight - scrollHeightBefore;
        scrollEl.scrollTop = scrollTopBefore + added;
      });

    } finally {
      setLoadingMore(false);
    }
  };

  // ── 6. Chat Handlers ───────────────────────────────────────────────────
  const handleOptionSelect = async (option) => {
    // Prevent execution if already starting a session or missing user ID
    if (!internalUserId || startingOption) return;

    setStartingOption(option.label); // Lock UI immediately

    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
      if (!response.ok) throw new Error(result.message || 'Failed to create consultation');

      const consultation = result.data;
      const roomId = consultation.id;

      setActiveRoomId(roomId);
      setIsEnded(false);
      setConsultType(option.type);
      setMessages([]);
      setHasMoreMessages(false);

      // Invalidate consultation cache when new one is created
      setCachedConsultations(internalUserId, { activeConsult: consultation, lastEnded: null });
      // Clear message cache for the new room
      setCachedMessages(roomId, []);

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

    } catch (err) {
      console.error('Failed to start consultation:', err);
    } finally {
      setStartingOption(null); // Unlock UI once complete
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeRoomId || isEnded) return;
    const text = inputValue.trim();
    setInputValue('');

    try {
      await supabase.from('consultation_messages').insert({
        consultation_id: activeRoomId,
        sender_id:       internalUserId,
        sender_name:     internalName,
        sender_role:     currentUser.role || 'student',
        message:         text,
        created_at:      new Date().toISOString(),
      });
      // Invalidate message cache so next fetch gets fresh data
      setCachedMessages(activeRoomId, null);
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  // ── Group by date (memoized) ───────────────────────────────────────────
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
    generic: { label: 'MediTrack', sublabel: 'Assistant',        accent: '#466460', accentLight: '#e0eceb', accentBorder: '#c4dbd8' },
    medical: { label: 'Medical',   sublabel: 'Doctors & Nurses', accent: '#1a5c3a', accentLight: '#e8f5ee', accentBorder: '#b2d9c2' },
    dental:  { label: 'Dental',    sublabel: 'Dentists',         accent: '#1a4a7a', accentLight: '#e8f0fa', accentBorder: '#b2c8e8' },
  }), []);
  const cfg = useMemo(() => (consultType && !isEnded) ? typeConfig[consultType] : typeConfig.generic, [consultType, isEnded, typeConfig]);

  // ── Shared message renderer ────────────────────────────────────────────
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
            <BotText text={item.message} />
          </div>
        </div>
      );
    }

    const isPatient  = String(item.sender_id) === String(internalUserId);
    const activeCfg  = overrideCfg || cfg;
    const msgCfg     = isPatient
      ? activeCfg
      : (consultType === 'dental' ? typeConfig.dental : typeConfig.medical);

    return (
      <div key={item.id || i} className={`flex flex-col my-1 ${isPatient ? 'items-end' : 'items-start'}`}>
        {!isPatient && (
          <div className="flex items-center gap-1.5 mb-0.5 ml-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: msgCfg.accentLight }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={msgCfg.accent} strokeWidth="2" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-[10px] font-bold" style={{ color: msgCfg.accent }}>
              {item.sender_name || 'Clinic Staff'}
            </p>
          </div>
        )}
        <div
          className="max-w-[80%] px-4 py-3 text-[13px] leading-relaxed shadow-sm rounded-2xl break-words transition-colors duration-300"
          style={isPatient
            ? { backgroundColor: '#466460', color: '#fff', borderBottomRightRadius: 4 }
            : { backgroundColor: '#fff', color: '#1a2e22', border: `1px solid ${msgCfg.accentBorder}`, borderBottomLeftRadius: 4 }
          }
        >
          {item.message}
        </div>
        <div className={`text-[9px] text-[#9bb5a5] mt-1 mx-2 flex items-center gap-1 ${isPatient ? 'justify-end' : ''}`}>
          <span>{formatTime(item.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f4f7f5' }}>
      <style>{ptrStyles}</style>

      {/* 1. STICKY HEADER */}
      <div
        style={{ position: 'sticky', top: 0, zIndex: 20, background: '#ffffff', borderBottom: '1px solid #edf3f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', flexShrink: 0 }}
        className="px-5 py-4 flex items-center gap-3 transition-all duration-300"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
          style={{ backgroundColor: cfg.accentLight }}
        >
          {consultType === 'dental' && !isEnded ? (
            <svg viewBox="0 0 64 64" fill="none" stroke={cfg.accent} strokeWidth="2.4" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M20 8c-6 0-12 4-12 13 0 5 2 9 4 13l4 16c1 4 3 6 5 6s3-2 5-6l2-8 2 8c2 4 3 6 5 6s4-2 5-6l4-16c2-4 4-8 4-13C48 12 42 8 36 8c-3 0-5.5 1-8 2.5C25.5 9 23 8 20 8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth="1.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#1a2e22]">
              {cfg.label}{!isEnded && ' Consultation'}
            </h3>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold transition-colors duration-300"
              style={{ backgroundColor: cfg.accentLight, color: cfg.accent }}
            >
              {cfg.sublabel}
            </span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mt-0.5 transition-colors duration-300"
            style={{
              backgroundColor: isClinicOnline ? cfg.accentLight : '#f1f5f9',
              color:           isClinicOnline ? cfg.accent      : '#94a3b8',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isClinicOnline ? cfg.accent : '#94a3b8' }} />
            {isClinicOnline ? 'Clinic Online' : 'Clinic Offline'}
          </span>
        </div>
      </div>

      {/* 2. SCROLLABLE MESSAGES */}
      <div
        ref={setScrollRef}
        onTouchStart={!isEnded ? ptrTouchStart : undefined}
        onTouchMove={!isEnded  ? ptrTouchMove  : undefined}
        onTouchEnd={!isEnded   ? ptrTouchEnd   : undefined}
        style={{
          flex:         1,
          overflowY:    'auto',
          minHeight:    0,
          position:     'relative',
          touchAction:  !isEnded ? 'pan-x' : 'auto',
        }}
        className="px-4 py-5 flex flex-col gap-2 bg-[#f4f7f5]"
      >
        {/* PTR indicator — first child, only mounted during an active consultation */}
        {!isEnded && <PullIndicator indicatorRef={indicatorRef} />}

        {/* Centered loading spinner */}
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

        {/* Load more button — top of list */}
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

        {/* Active session messages */}
        {!isEnded && sessionReady && groupedMessages.map((item, i) => renderMessage(item, i))}

        {/* Ended session — history + divider */}
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

        {/* Greeting — shown only after DB check confirms no active session */}
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
                👋 Hello! I'm the MediTrack assistant.<br />
                <strong>What brings you in today?</strong> Please select the type of consultation you need:
              </div>
            </div>

            {/* OPTION BUTTONS WITH UI LOCK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-9 max-w-[90%]">
              {INITIAL_OPTIONS.map((opt, idx) => {
                const isThisLoading = startingOption === opt.label;
                const isDisabled = !sessionReady || startingOption !== null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(opt)}
                    disabled={isDisabled}
                    className={`text-left text-[12px] font-bold px-4 py-3 rounded-xl border-2 bg-white transition-all duration-300 border-[#c4dbd8] text-[#466460] flex items-center justify-between ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-md active:scale-[0.98] hover:border-[#466460]'
                    }`}
                  >
                    <span>{opt.label}</span>
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

      {/* 3. STICKY INPUT BAR */}
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
    </div>
  );
}