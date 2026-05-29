// C:\Users\HP\MediTrack\frontend\src\features\users\Consultation-users.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';

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

export default function ConsultationUsers() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [messages, setMessages]             = useState([]);
  const [inputValue, setInputValue]         = useState('');
  const [isClinicOnline, setIsClinicOnline] = useState(false);
  const [isEnded, setIsEnded]               = useState(true);
  const [consultType, setConsultType]       = useState(null);
  const [internalUserId, setInternalUserId] = useState(null);
  const [internalName, setInternalName]     = useState('Patient');
  const [sessionReady, setSessionReady]     = useState(false);

  // 🔴 FIXED: Store the actual consultation Room ID separate from the User ID
  const [activeRoomId, setActiveRoomId]     = useState(null);

  const messagesEndRef = useRef(null);

  // ── 1. Restore Supabase session & fetch internal profile ─────────────
  useEffect(() => {
    const initializeChatSession = async () => {
      if (!currentUser?.uid) return;

      const accessToken  = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';

      if (!accessToken) return;

      await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });

      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('uid', currentUser.uid)
        .limit(1);

      const profile = profiles?.[0] || null;

      if (profileError || !profile) return;

      setInternalUserId(profile.id);
      setInternalName(`${profile.first_name} ${profile.last_name}`.trim());
      setSessionReady(true);

      await supabase.from('presence').upsert({
        user_id:   profile.id,
        status:    'online',
        last_seen: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };

    initializeChatSession();

    return () => {
      const storedId = localStorage.getItem('_internalUserId');
      if (storedId) {
        supabase.from('presence').upsert({
          user_id:   storedId,
          status:    'offline',
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then();
      }
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (internalUserId) localStorage.setItem('_internalUserId', internalUserId);
  }, [internalUserId]);

  // ── 2. Real-time DB Listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!internalUserId || !sessionReady) return;

    let currentRoomId = null;

    const fetchConsultation = async () => {
      // 🔴 FIXED: Query by patient_id, grab the most recent one
      const { data: consults } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', internalUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      const data = consults?.[0] || null;

      if (data) {
        currentRoomId = data.id;
        setActiveRoomId(data.id);
        setIsEnded(!data.status || data.status === 'ended');
        setConsultType(data.consultation_type || null);
        fetchMessages(data.id);
      } else {
        setIsEnded(true);
        setConsultType(null);
      }
    };

    const fetchMessages = async (roomId) => {
      // 🔴 FIXED: Fetch messages using the real Room ID
      const { data } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', roomId)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchConsultation();

    const messagesChannel = supabase
      .channel(`consultation-msgs-${internalUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consultation_messages',
      }, (payload) => {
        // Only append if it belongs to the active room
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    const statusChannel = supabase
      .channel(`consultation-status-${internalUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'consultations',
        filter: `patient_id=eq.${internalUserId}`,
      }, (payload) => {
        setIsEnded(payload.new.status === 'ended');
        setConsultType(payload.new.consultation_type || null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [internalUserId, sessionReady]);

  // ── 3. Presence Monitor ────────────────────────────────────────────────
  useEffect(() => {
    const fetchPresence = async () => {
      const { data } = await supabase.from('presence').select('*').eq('status', 'online');
      const clinicOnline = (data || []).some(p =>
        ['doctor', 'nurse', 'dentist', 'admin', 'administrator'].includes(p.role?.toLowerCase())
      );
      setIsClinicOnline(clinicOnline);
    };

    fetchPresence();

    const presenceChannel = supabase
      .channel(`presence-listener-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, fetchPresence)
      .subscribe();

    return () => { supabase.removeChannel(presenceChannel); };
  }, []);

  // ── 4. Auto-scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEnded]);

  // ── 5. Chat Handlers ───────────────────────────────────────────────────
  const handleOptionSelect = async (option) => {
    if (!internalUserId) return;

    // 🔴 FIXED: Create a new room and let Supabase generate the random UUID
    const { data: newConsult, error: consultError } = await supabase.from('consultations').insert({
      patient_id:        internalUserId,
      patient_name:      internalName,
      consultation_type: option.type,
      status:            'active',
      created_at:        new Date().toISOString(),
    }).select().single();

    if (consultError || !newConsult) return;

    const newRoomId = newConsult.id;
    setActiveRoomId(newRoomId);

    // 🔴 FIXED: Link messages to the newly generated Room ID
    await supabase.from('consultation_messages').insert([
      {
        consultation_id: newRoomId,
        sender_id:       internalUserId,
        sender_name:     internalName,
        sender_role:     currentUser.role || 'student',
        message:         option.label,
        created_at:      new Date().toISOString(),
      },
      {
        consultation_id: newRoomId,
        sender_id:       null,
        sender_name:     'System',
        sender_role:     'system',
        message:         `Connecting you to the ${option.type === 'dental' ? 'Dental' : 'Medical'} team... They will be with you shortly. 💬`,
        created_at:      new Date().toISOString(),
      }
    ]);

    setIsEnded(false);
    setConsultType(option.type);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeRoomId || isEnded) return;
    const text = inputValue.trim();
    setInputValue('');

    try {
      await supabase.from('consultation_messages').insert({
        consultation_id: activeRoomId, // 🔴 FIXED
        sender_id:       internalUserId,
        sender_name:     internalName,
        sender_role:     currentUser.role || 'student',
        message:         text,
        created_at:      new Date().toISOString(),
      });
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  // ── Group by date ──────────────────────────────────────────────────────
  const groupedMessages = () => {
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
  };

  const typeConfig = {
    generic: { label: 'MediTrack', sublabel: 'Assistant',        accent: '#466460', accentLight: '#e0eceb', accentBorder: '#c4dbd8' },
    medical: { label: 'Medical',   sublabel: 'Doctors & Nurses', accent: '#1a5c3a', accentLight: '#e8f5ee', accentBorder: '#b2d9c2' },
    dental:  { label: 'Dental',    sublabel: 'Dentists',         accent: '#1a4a7a', accentLight: '#e8f0fa', accentBorder: '#b2c8e8' },
  };
  const cfg = (consultType && !isEnded) ? typeConfig[consultType] : typeConfig.generic;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f4f7f5' }}>

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
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
        className="px-4 py-5 flex flex-col gap-2 bg-[#f4f7f5]"
      >
        {!sessionReady && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-[#9bb5a5]">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-[11px]">Connecting…</span>
            </div>
          </div>
        )}

        {sessionReady && groupedMessages().map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="flex justify-center my-2">
                <span className="px-4 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">
                  {item.label}
                </span>
              </div>
            );
          }

          if (item.sender_role === 'system') {
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

          const isPatient = item.sender_id === internalUserId;
          const msgCfg = isPatient ? cfg : (consultType === 'dental' ? typeConfig.dental : typeConfig.medical);

          return (
            <div key={item.id || i} className={`flex flex-col my-1 ${isPatient ? 'items-end' : 'items-start'}`}>
              {!isPatient && (
                <div className="flex items-center gap-1.5 mb-0.5 ml-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: msgCfg.accentLight }}
                  >
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
        })}

        {sessionReady && isEnded && (
          <div className="mt-4 mb-2 flex flex-col gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-9 max-w-[90%]">
              {INITIAL_OPTIONS.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
                  className="text-left text-[12px] font-bold px-4 py-3 rounded-xl border-2 bg-white transition-all hover:shadow-md active:scale-[0.98] duration-300 border-[#c4dbd8] text-[#466460] hover:border-[#466460]"
                >
                  {opt.label}
                </button>
              ))}
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