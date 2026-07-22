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

// ── Linkify: Converts URLs in text to clickable links ────────────────────────
function LinkifiedText({ text, isPatient = false }) {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s<]+)/g;

  // Link color based on sender
  const linkColor = isPatient ? '#a8d5ba' : '#1a5c3a';
  const linkHoverColor = isPatient ? '#c8e6cf' : '#237a4a';

  if (!text) return null;

  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    // No URLs found, process text with bold formatting and newlines
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
          // This is a URL
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all hover:opacity-80"
              style={{ color: linkColor }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        // Regular text - process bold formatting and newlines
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
  const [historyFilter,   setHistoryFilter]   = useState('medical'); // 'medical' or 'dental'
  const [activeRoomId,    setActiveRoomId]    = useState(null);
  const [internalUserId,  setInternalUserId]  = useState(profileCache?.internalUserId ?? null);
  const [internalName,    setInternalName]    = useState(profileCache?.internalName   ?? 'Patient');
  const [sessionReady,    setSessionReady]    = useState(!!(profileCache?.internalUserId));
  const [loadingHistory,  setLoadingHistory]  = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [clinicUnreadCount, setClinicUnreadCount] = useState(0);

  // 🟢 NEW: Tracks the most recent ENDED consultation id per type (medical/dental)
  // for this patient. Populated whenever we fetch consultation history, so that
  // handleOptionSelect can reactivate an existing thread instead of creating a
  // brand-new row every time the patient starts a new conversation.
  const [lastEndedByType, setLastEndedByType] = useState({ medical: null, dental: null });
  const lastEndedByTypeRef = useRef({ medical: null, dental: null });
  const updateLastEndedByType = useCallback((next) => {
    lastEndedByTypeRef.current = next;
    setLastEndedByType(next);
  }, []);

  // Update localStorage with clinic unread count for nav indicator
  useEffect(() => {
    try {
      localStorage.setItem('consultUnreadCount', String(clinicUnreadCount));
    } catch {}
  }, [clinicUnreadCount]);

  // Compute unread messages from clinic (not from patient)
  useEffect(() => {
    // If consultation ended, clear the unread count
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

  // Clear consultation cache on mount to ensure fresh data fetch
  useEffect(() => {
    sessionStorage.removeItem(CONSULT_CACHE_KEY);
  }, []);

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
  const isSendingRef    = useRef(false); // Track if sending to skip realtime dupes
  const justStartedAtRef = useRef(0); // 🟢 NEW: timestamp of the last "start consultation" click — used as a grace period

  useEffect(() => { isEndedRef.current = isEnded; }, [isEnded]);
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  // Fetch fresh messages with read_at when switching rooms
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId, null, true); // force refresh to get read_at
    }
  }, [activeRoomId]);

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

  // ── 2. Message fetcher function (exposed for toggle handlers) ─────────
  const fetchMessages = useCallback(async (roomId, beforeId = null, forceRefresh = false) => {
    // Try cache first for initial load (no beforeId and not forcing refresh)
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

    const ordered = [...data].reverse(); // oldest-first for display

    if (beforeId) {
      setMessages(prev => [...ordered, ...prev]);
    } else {
      setMessages(ordered);
      // Cache the initial messages (or refresh the cache on force refresh)
      setCachedMessages(roomId, ordered);
    }

    // Log read_at status for debugging seen indicator
    if (ordered.some(m => m.read_at)) {
      console.log('[Chat] Messages with read_at:', ordered.filter(m => m.read_at).map(m => ({ id: m.id, read_at: m.read_at })));
    }

    setHasMoreMessages(data.length === MSG_PAGE_SIZE);
  }, []);

  // ── 2. Consultation fetch + realtime listeners ────────────────────────
  useEffect(() => {
    if (!internalUserId || !sessionReady) return;
    if (fetchRanRef.current) return;
    fetchRanRef.current = true;

    // ── Initial consultation fetch ────────────────────────────────────
    const fetchConsultation = async () => {
      console.log('[Chat] fetchConsultation called, internalUserId:', internalUserId);

      // Ensure session is valid before querying
      await ensureValidSession();

      // Verify session is active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[Chat] fetchConsultation: No session, returning early');
        return;
      }

      try {
        // FOR REAL-TIME DATA: Always query the database first, don't rely on cache
        // This ensures we get the correct status after page refresh
        // Add a small delay to ensure any pending database updates are processed
        await new Promise(resolve => setTimeout(resolve, 300));

        const { data: activeConsults, error: activeError } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeError) {
          console.error('[Chat] Error fetching active consult:', activeError);
        }

        const activeConsult = activeConsults?.[0] || null;

        if (activeConsult) {
          console.log('[Chat] Found active consultation:', activeConsult.id, activeConsult.status);
          setActiveRoomId(activeConsult.id);
          setIsEnded(false);
          setConsultType(activeConsult.consultation_type || null);
          await fetchMessages(activeConsult.id);
          // Cache for future reference
          setCachedConsultations(internalUserId, { activeConsult, lastEnded: null });
          return;
        }

        // Only check cache if no active session found in DB
        console.log('[Chat] No active consultation in DB, checking cache...');
        const cached = getCachedConsultations(internalUserId);
        if (cached?.activeConsult) {
          // Verify this cached consult is actually active in DB
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

        // 🟢 NEW: No active session — fetch ALL ended consultations for this
        // patient (both types) in one query, so we know the latest ended
        // consultation id for BOTH 'medical' and 'dental'. This lets
        // handleOptionSelect reactivate the right one later regardless of
        // which type the patient ends up picking, without another round trip.
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
        // 🟢 NEW: Skip the poll entirely right after starting a consultation.
        // The freshly-created row's "active" status can take a moment to be
        // reliably reflected on read-back; polling during that window risked
        // concluding "no active consultation" and prematurely marking it ended.
        // Local state (set synchronously in handleOptionSelect) is already
        // correct during this window, so there's nothing for the poll to fix.
        if (Date.now() - justStartedAtRef.current < 8000) {
          console.log('[Chat] Poll: within start grace period, skipping');
          return;
        }

        // Ensure session is valid before querying
        await ensureValidSession();

        // Verify session is active
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[Chat] Poll: No session, skipping...');
          return;
        }

        console.log('[Chat] Poll: Checking for active consultation for patient:', internalUserId);

        // First check if there's an active consultation
        console.log('[Chat] Poll: Querying with patient_id:', internalUserId);
        const { data: activeData, error: activeError } = await supabase
          .from('consultations')
          .select('id, status, consultation_type')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeError) {
          console.error('[Chat] Poll: Error querying active:', activeError);
          return;
        }

        console.log('[Chat] Poll: Active consultations found:', activeData?.map(c => ({ id: c.id, status: c.status })));

        // Debug: Also get ALL consultations to see what's in DB
        const { data: allConsults } = await supabase
          .from('consultations')
          .select('id, status, consultation_type')
          .eq('patient_id', internalUserId)
          .order('created_at', { ascending: false })
          .limit(5);
        console.log('[Chat] Poll: All recent consultations:', allConsults?.map(c => ({ id: c.id, status: c.status })));

        const activeRow = activeData?.[0] || null;
        const currentRoomId = activeRoomIdRef.current;

        // If there's an active consultation and we're not already viewing it
        if (activeRow) {
          if (activeRow.id !== currentRoomId) {
            console.log('[Chat] Poll: Switching to active consultation:', activeRow.id);
            setIsEnded(false);
            setActiveRoomId(activeRow.id);
            setConsultType(activeRow.consultation_type || null);
            await fetchMessages(activeRow.id);
          } else {
            // Already viewing this consultation - refresh messages to check for read_at updates (seen indicator)
            console.log('[Chat] Poll: Refreshing messages to check for read status...');
            await fetchMessages(activeRow.id, null, true); // force refresh to get read_at
          }
          return;
        }

        // No active consultation - verify it's truly ended before switching
        // Add a small delay to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 500));

        // Double-check: query again after delay to ensure we have the latest status
        const { data: recheckActive } = await supabase
          .from('consultations')
          .select('id, status')
          .eq('patient_id', internalUserId)
          .eq('status', 'active')
          .limit(1);

        // If a new active consultation appeared during the delay, use that instead
        if (recheckActive?.[0]) {
          console.log('[Chat] Poll: Active consultation appeared after delay:', recheckActive[0].id);
          setIsEnded(false);
          setActiveRoomId(recheckActive[0].id);
          setConsultType(recheckActive[0].consultation_type || null);
          await fetchMessages(recheckActive[0].id);
          return;
        }

        const currentlyEnded = isEndedRef.current;
        if (!currentlyEnded) {
          console.log('[Chat] Poll: No active consultation found, showing ended/history');
          // Load the most recent ended consultation
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
      } catch (err) {
        console.warn('[Chat] Poll error:', err);
      }
    }, 15000);

    // ── READ STATUS POLL (5s — ensures seen indicator updates) ─────────────
    const readStatusPoll = setInterval(async () => {
      if (!activeRoomId || isEndedRef.current) return;
      try {
        // Just fetch the messages with read_at to update the seen indicator
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
      } catch (err) {
        // Silent fail for polling
      }
    }, 5000);

    // ── NEW MESSAGE LISTENER ──────────────────────────────────────────
    const messagesChannel = supabase
      .channel(`consultation-msgs-${internalUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages' },
        async (payload) => {
          console.log('[Chat] Realtime message received:', payload.new);

          const currentRoomId = activeRoomIdRef.current;
          const newMsgRoomId = String(payload.new.consultation_id);

          // If message is for current room, add it
          if (newMsgRoomId === String(currentRoomId)) {
            // Skip realtime add if we're currently sending (we handle it via fetch)
            if (isSendingRef.current) return;
            setMessages(msgs => {
              if (msgs.some(m => m.id === payload.new.id)) return msgs;
              return [...msgs, payload.new];
            });
          } else if (isEndedRef.current && currentRoomId) {
            // If we're in ended/history mode and a new message arrives for a different room,
            // check if it's for a newer consultation
            const { data: consultData } = await supabase
              .from('consultations')
              .select('id, status')
              .eq('id', newMsgRoomId)
              .single();

            if (consultData?.status === 'active') {
              // A new active consultation has messages - switch to it
              console.log('[Chat] New active consultation has messages, switching:', newMsgRoomId);
              setIsEnded(false);
              setActiveRoomId(newMsgRoomId);
              await fetchMessages(newMsgRoomId);
            }
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultation_messages' },
        (payload) => {
          console.log('[Chat] Message UPDATE received:', payload.new);
          // Update the message in the local state to show the read status
          if (payload.new?.read_at) {
            console.log('[Chat] Read_at updated for message:', payload.new.id, payload.new.read_at);
            setMessages(msgs =>
              msgs.map(msg =>
                msg.id === payload.new.id
                  ? { ...msg, read_at: payload.new.read_at }
                  : msg
              )
            );
          }
        })
      .subscribe((status) => {
        console.log('[Chat] Messages channel status:', status);
      });

    // ── STATUS CHANGE LISTENER ────────────────────────────────────────
    const statusChannel = supabase
      .channel(`consultation-status-${internalUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultations' },
        async (payload) => {
          // 🟢 NEW: Catches a freshly-created consultation the moment it lands,
          // instead of waiting for the next poll cycle. Filtering stays in JS
          // since Postgres-side realtime filters have been unreliable here.
          if (String(payload.new.patient_id) !== String(internalUserId)) return;

          console.log('[Chat] New consultation INSERT received:', payload.new);

          if (payload.new.status === 'active') {
            console.log('[Chat] New active consultation inserted, switching:', payload.new.id);
            justStartedAtRef.current = Date.now();
            setIsEnded(false);
            setActiveRoomId(payload.new.id);
            setConsultType(payload.new.consultation_type || null);
            await fetchMessages(payload.new.id, null, true);
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations' },
        async (payload) => {
          console.log('[Chat] Status update received:', payload.new);
          if (String(payload.new.patient_id) !== String(internalUserId)) return;

          const currentRoomId = activeRoomIdRef.current;

          // Handle status update - even if it's a different room, check if we need to switch
          if (String(payload.new.id) !== String(currentRoomId)) {
            // If a new consultation became active and we're not in one, switch to it
            if (payload.new.status === 'active') {
              console.log('[Chat] New consultation became active, switching:', payload.new.id);
              setIsEnded(false);
              setActiveRoomId(payload.new.id);
              setConsultType(payload.new.consultation_type || null);
              await fetchMessages(payload.new.id);
            }
            return;
          }

          if (payload.new.status === 'ended') {
            // 🟢 NEW: Ignore a stale "ended" update for the room we *just*
            // started — this was the source of consultations getting ended
            // prematurely right after the patient started them.
            if (Date.now() - justStartedAtRef.current < 8000) {
              console.log('[Chat] Ignoring stale "ended" update within grace period after starting');
              return;
            }
            console.log('[Chat] Consultation ended by clinic');
            await fetchMessages(payload.new.id);
            setActiveRoomId(payload.new.id);
            setConsultType(null);
            setIsEnded(true);
            // Clear the cache so next refresh doesn't show ended session
            setCachedConsultations(internalUserId, { activeConsult: null, lastEnded: payload.new });
            // 🟢 NEW: This consultation is now ended again — remember it as the
            // latest ended one for its type so a future reactivation picks it up.
            updateLastEndedByType({
              ...lastEndedByTypeRef.current,
              [payload.new.consultation_type]: payload.new.id,
            });
          } else if (payload.new.status === 'active') {
            console.log('[Chat] Consultation activated');
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
        ['doctor', 'nurse', 'dentist', 'sysadmin', 'administrator'].includes(u.role?.toLowerCase())
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

    // New message appended or initial load → scroll to bottom
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

    // Don't create a new consultation if we're already in an active one
    if (!isEndedRef.current && activeRoomIdRef.current) {
      console.log('[Chat] Already in active consultation:', activeRoomIdRef.current);
      setStartingOption(null);
      return;
    }

    justStartedAtRef.current = Date.now();
    setStartingOption(option.label); // Lock UI immediately

    try {
      await ensureValidSession();

      let roomId;
      let consultation;
      let isReactivation = false;

      // 1. Try to grab the ID from the currently viewed history if the types match
      let existingEndedId = (isEndedRef.current && activeRoomIdRef.current && consultType === option.type)
        ? activeRoomIdRef.current
        : lastEndedByTypeRef.current[option.type];

      // 2. Ultimate Fallback: Query the database to guarantee we don't miss an existing record
      if (!existingEndedId) {
        const { data: dbCheck } = await supabase
          .from('consultations')
          .select('id')
          .eq('patient_id', internalUserId)
          .eq('consultation_type', option.type)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (dbCheck) {
          existingEndedId = dbCheck.id;
        }
      }

      // 3. Reactivate if an existing record was found
      if (existingEndedId) {
        console.log('[Chat] Reactivating existing ended consultation:', existingEndedId, 'type:', option.type);
        const { data: updated, error: updateErr } = await supabase
          .from('consultations')
          .update({ status: 'active', ended_at: null, updated_at: new Date().toISOString() })
          .eq('id', existingEndedId)
          .eq('patient_id', internalUserId) // guard: only ever touch this patient's own row
          .select()
          .single();

        if (updateErr || !updated) {
          console.error('[Chat] Failed to reactivate consultation, falling back to create:', updateErr);
        } else {
          roomId = updated.id;
          consultation = updated;
          isReactivation = true;
        }
      }

      // 4. Create new ONLY if absolutely no record exists or reactivation failed
      if (!roomId) {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        console.log('[Chat] Creating consultation with:', { patient_id: internalUserId, consultation_type: option.type });

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
        console.log('[Chat] Consultation response FULL:', JSON.stringify(result));

        if (!response.ok) {
          console.error('[Chat] FAILED to create consultation:', result);
          throw new Error(result.message || 'Failed to create consultation');
        }

        consultation = result.data;
        roomId = consultation.id;

        console.log('[Chat] Setting active room:', roomId, 'status:', consultation.status);

        // Double-check: fetch the consultation directly from DB to verify status
        const { data: verifyData } = await supabase
          .from('consultations')
          .select('id, status')
          .eq('id', roomId)
          .single();

        if (verifyData?.status !== 'active') {
          console.log('[Chat] Fix: Manually updating status to active...');
          await supabase
            .from('consultations')
            .update({ status: 'active', ended_at: null })
            .eq('id', roomId);
        }
      }

      // This type's ended consultation is now active — clear it from the map
      updateLastEndedByType({ ...lastEndedByTypeRef.current, [option.type]: null });

      // Refresh the grace period now that we know the exact room id
      justStartedAtRef.current = Date.now();

      // Update state BEFORE inserting messages
      setActiveRoomId(roomId);
      setIsEnded(false);
      setConsultType(option.type);
      setMessages([]);
      setHasMoreMessages(false);

      // Invalidate consultation cache when reactivated/new one is created
      setCachedConsultations(internalUserId, { activeConsult: consultation, lastEnded: null });
      setCachedMessages(roomId, null);

      console.log('[Chat] Inserting messages...', isReactivation ? '(reactivated room)' : '(new room)');
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

      // Force fetch messages after inserting to ensure the full thread appears
      console.log('[Chat] Fetching messages after insert...');
      const { data: newMessages } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', roomId)
        .order('created_at', { ascending: true });

      console.log('[Chat] New messages fetched:', newMessages?.length);
      if (newMessages && newMessages.length > 0) {
        setMessages(newMessages);
        setCachedMessages(roomId, newMessages);
      }

    } catch (err) {
      console.error('[Chat] Failed to start consultation:', err);
      // Reset to ended state on error so user can try again
      setIsEnded(true);
    } finally {
      setStartingOption(null); // Unlock UI once complete
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeRoomId || isEnded) return;
    const text = inputValue.trim();
    setInputValue('');
    isSendingRef.current = true; // Prevent realtime dupe

    try {
      await supabase.from('consultation_messages').insert({
        consultation_id: activeRoomId,
        sender_id:       internalUserId,
        sender_name:     internalName,
        sender_role:     currentUser.role || 'student',
        message:         text,
        created_at:      new Date().toISOString(),
      });

      // Immediately fetch updated messages
      const { data: updatedMessages } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', activeRoomId)
        .order('created_at', { ascending: true });

      // Deduplicate by message ID
      if (updatedMessages) {
        const uniqueMessages = updatedMessages.reduce((acc, msg) => {
          if (!acc.some(m => m.id === msg.id)) {
            acc.push(msg);
          }
          return acc;
        }, []);
        setMessages(uniqueMessages);
        // Scroll to bottom after new message is sent
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // After sending, poll for read_at updates (clinic may mark as read and reply)
        setTimeout(async () => {
          await fetchMessages(activeRoomId, null, true); // force refresh to get read_at
        }, 2000);
      }
      // Invalidate message cache so next fetch gets fresh data
      setCachedMessages(activeRoomId, null);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      isSendingRef.current = false; // Re-enable realtime
    }
  };

  // ── Mark messages as read ────────────────────────────────────────────────
  const markMessagesAsRead = useCallback(async () => {
    if (!activeRoomId || !internalUserId || isEnded) return;

    console.log('[Chat] Marking messages as read - internalUserId:', internalUserId, 'currentUser.uid:', currentUser.uid, 'activeRoomId:', activeRoomId);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // IMPORTANT: Use internalUserId (the users table ID), NOT currentUser.uid (auth UID)
    const bodyToSend = {
      sender_id: internalUserId,  // Internal ID from users table
      sender_role: currentUser.role || 'student',
    };
    console.log('[Chat] Sending body:', bodyToSend);

    try {
      await fetch(`${API_URL}/consultations/${activeRoomId}/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyToSend),
      });
    } catch (err) {
      console.error('[Chat] Error marking messages as read:', err);
    }
  }, [activeRoomId, internalUserId, isEnded, currentUser.role]);

  // ── Mark messages as read when consultation is active ───────────────────
  useEffect(() => {
    if (activeRoomId && !isEnded && internalUserId) {
      markMessagesAsRead();
    }
  }, [activeRoomId, messages, isEnded, markMessagesAsRead]);

  // ── History filter switcher ────────────────────────────────────────────
  const handleHistoryFilterSwitch = async (filterType) => {
    setHistoryFilter(filterType);
    setLoadingHistory(true);

    await ensureValidSession();

    // 🟢 Reuse the already-known id for this type when we have it, avoiding
    // a redundant query; fall back to a fresh lookup otherwise.
    const knownId = lastEndedByTypeRef.current[filterType];

    if (knownId) {
      const { data: known } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', knownId)
        .single();

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
            <LinkifiedText text={item.message} isPatient={false} />
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
          <LinkifiedText text={item.message} isPatient={isPatient} />
        </div>
        <div className={`text-[9px] text-[#9bb5a5] mt-1 mx-2 flex items-center gap-1 ${isPatient ? 'justify-end' : ''}`}>
          <span>{formatTime(item.created_at)}</span>
          {/* Seen indicator - only show for patient messages */}
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

        {/* Hamburger Menu for Chat History */}
        {isEnded && (
          <div className="relative">
            <button
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              title="View Chat History"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#466460]">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showHistoryMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowHistoryMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Chat History
                  </div>
                  <button
                    onClick={() => { handleHistoryFilterSwitch('medical'); setShowHistoryMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${
                      historyFilter === 'medical'
                        ? 'bg-[#1a5c3a]/10 text-[#1a5c3a]'
                        : 'text-[#466460] hover:bg-slate-50'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Medical History
                  </button>
                  <button
                    onClick={() => { handleHistoryFilterSwitch('dental'); setShowHistoryMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${
                      historyFilter === 'dental'
                        ? 'bg-[#1a4a7a]/10 text-[#1a4a7a]'
                        : 'text-[#466460] hover:bg-slate-50'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Dental History
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
          touchAction:  'manipulation',
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
        {/* DEBUG: isEnded=, sessionReady=, messages.length=, loadingHistory= */}
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

        {/* Greeting — shown when consultation has ended (including when viewing history) */}
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