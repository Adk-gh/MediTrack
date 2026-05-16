// C:\Users\HP\MediTrack\frontend\src\features\users\Consultation-users.jsx
import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../../firebase';
import {
  ref, onValue, push, update, set, serverTimestamp, onDisconnect, off
} from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
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

  const messagesEndRef  = useRef(null);
  const resolvedNameRef = useRef(currentUser.name || null);
  const convId = currentUser.uid;

  // ── Presence ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    const setPresence = async () => {
      let resolvedName = currentUser.name || currentUser.displayName || null;
      if (!resolvedName) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const d = snap.data();
            resolvedName = [d.firstName, d.middleInitial ? `${d.middleInitial}.` : '', d.lastName]
              .filter(Boolean).join(' ').trim() || 'Unknown';
            localStorage.setItem('user', JSON.stringify({ ...currentUser, name: resolvedName }));
          }
        } catch { resolvedName = 'Unknown'; }
      }
      resolvedNameRef.current = resolvedName || 'Unknown';
      const presenceRef   = ref(rtdb, `presence/${currentUser.uid}`);
      const presenceData  = { online: true, lastSeen: serverTimestamp(), name: resolvedNameRef.current, role: currentUser.role || 'student' };
      set(presenceRef, presenceData);
      onDisconnect(presenceRef).set({ ...presenceData, online: false });
    };
    setPresence();
  }, [currentUser?.uid]);

  // ── DB Listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!convId) return;
    const convRef = ref(rtdb, `consultations/${convId}`);
    const unsub = onValue(convRef, (snap) => {
      const data = snap.val() || {};
      const meta = data.metadata || {};
      setIsEnded(!meta.status || meta.status === 'ended');
      setConsultType(meta.consultType || null);

      const msgList = Object.entries(data.messages || {})
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgList);

      const unread = msgList.filter(m => m.sender === 'clinic' && !m.readByPatient && !m.isBot);
      if (unread.length > 0) {
        const updates = {};
        unread.forEach(m => { updates[`messages/${m.id}/readByPatient`] = true; });
        update(ref(rtdb, `consultations/${convId}`), updates);
      }
    });
    return () => off(convRef, 'value', unsub);
  }, [convId]);

  // ── Clinic Online ──────────────────────────────────────────────────────
  useEffect(() => {
    const presRef = ref(rtdb, 'presence');
    const unsub = onValue(presRef, (snap) => {
      const data = snap.val() || {};
      const anyOnline = Object.values(data).some(p =>
        p.online && ['doctor','nurse','dentist','admin','administrator'].includes(p.role?.toLowerCase())
      );
      setIsClinicOnline(anyOnline);
    });
    return () => off(presRef, 'value', unsub);
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEnded]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleOptionSelect = async (option) => {
    const metadataRef = ref(rtdb, `consultations/${convId}/metadata`);
    const msgsRef     = ref(rtdb, `consultations/${convId}/messages`);
    await update(metadataRef, {
      patientUid: currentUser.uid,
      patientName: resolvedNameRef.current || currentUser.name || 'Patient',
      patientRole: currentUser.role || 'student',
      status: 'active',
      consultType: option.type,
      lastMessage: `Started new ${option.type} consultation`,
      lastTimestamp: Date.now(),
      lastSenderRole: 'patient',
      createdAt: Date.now(),
    });
    await push(msgsRef, { text: option.label, isBot: false, isTriageChoice: true, timestamp: Date.now() });
    await push(msgsRef, {
      text: `Connecting you to the ${option.type === 'dental' ? 'Dental' : 'Medical'} team... They will be with you shortly. 💬`,
      isBot: true,
      timestamp: Date.now() + 1,
    });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !convId || isEnded) return;
    const text = inputValue.trim();
    setInputValue('');
    try {
      const msgsRef = ref(rtdb, `consultations/${convId}/messages`);
      await push(msgsRef, {
        text, sender: 'patient', senderUid: currentUser.uid,
        senderName: resolvedNameRef.current || 'Patient',
        timestamp: Date.now(), readByClinic: false, isBot: false,
      });
      await update(ref(rtdb, `consultations/${convId}/metadata`), {
        lastMessage: text, lastTimestamp: Date.now(), lastSenderRole: 'patient',
      });
    } catch (err) { console.error('Send error:', err); }
  };

  // ── Group by date ──────────────────────────────────────────────────────
  const groupedMessages = () => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const dateLabel = formatDate(msg.timestamp);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel, key: `date-${msg.timestamp}` });
        lastDate = dateLabel;
      }
      groups.push(msg);
    });
    return groups;
  };

  // ── Style config ───────────────────────────────────────────────────────
  const typeConfig = {
    generic: { label: 'MediTrack', sublabel: 'Assistant',        accent: '#466460', accentLight: '#e0eceb', accentBorder: '#c4dbd8' },
    medical: { label: 'Medical',   sublabel: 'Doctors & Nurses', accent: '#1a5c3a', accentLight: '#e8f5ee', accentBorder: '#b2d9c2' },
    dental:  { label: 'Dental',    sublabel: 'Dentists',         accent: '#1a4a7a', accentLight: '#e8f0fa', accentBorder: '#b2c8e8' },
  };
  const cfg = (consultType && !isEnded) ? typeConfig[consultType] : typeConfig.generic;

  // ─────────────────────────────────────────────────────────────────────
  //  Layout (works on both mobile & desktop):
  //
  //  The component fills the full height of whatever container mounts it.
  //  It is a flex-column with three children:
  //
  //    1. HEADER  — position:sticky top:0    → always visible at top
  //    2. MESSAGES — flex:1 overflow-y:auto  → scrollable middle
  //    3. INPUT   — position:sticky bottom:0 → always visible at bottom
  //
  //  On MOBILE:  MobileShell is the scroll-port (overflow-y:auto).
  //              paddingBottom:136px on MobileShell clears the pill nav.
  //              sticky header/input stick to the top/bottom of the VIEWPORT,
  //              which is what we want.
  //
  //  On DESKTOP: DesktopShell's inner div is the scroll-port (overflow-y:auto).
  //              sticky header/input stick to the top/bottom of THAT div.
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f4f7f5' }}>

      {/* 1. STICKY HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#ffffff',
          borderBottom: '1px solid #edf3f0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          flexShrink: 0,
        }}
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
        {groupedMessages().map((item, i) => {

          if (item.type === 'date') {
            return (
              <div key={item.key} className="flex justify-center my-2">
                <span className="px-4 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">
                  {item.label}
                </span>
              </div>
            );
          }

          if (item.isBot) {
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
                  <BotText text={item.text} />
                </div>
              </div>
            );
          }

          if (item.isTriageChoice) {
            return (
              <div key={item.id || i} className="flex justify-end my-1">
                <div className="max-w-[72%] px-4 py-2.5 text-[12px] font-medium leading-relaxed rounded-2xl rounded-br-sm break-words opacity-70 bg-[#e0eceb] text-[#466460] border border-[#c4dbd8]">
                  {item.text}
                </div>
              </div>
            );
          }

          const isPatient = item.sender === 'patient';
          const msgCfg = isPatient ? cfg : (item.consultType === 'dental' ? typeConfig.dental : typeConfig.medical);

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
                  <p className="text-[10px] font-bold" style={{ color: msgCfg.accent }}>
                    {item.senderName || 'Clinic Staff'}
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
                {item.text}
              </div>
              <div className={`text-[9px] text-[#9bb5a5] mt-1 mx-2 flex items-center gap-1 ${isPatient ? 'justify-end' : ''}`}>
                <span>{formatTime(item.timestamp)}</span>
                {isPatient && (
                  <i
                    className={`fa-solid ${item.readByClinic ? 'fa-check-double' : 'fa-check'} text-[10px] ml-0.5`}
                    style={item.readByClinic ? { color: msgCfg.accent } : { color: '#9bb5a5' }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isEnded && (
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
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 20,
          background: '#ffffff',
          borderTop: '1px solid #edf3f0',
          boxShadow: '0 -4px 10px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}
        className="px-4 py-3 flex gap-3 items-center transition-colors duration-300"
      >
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={isEnded ? 'Please select an option above…' : 'Type a message…'}
          disabled={isEnded}
          className="flex-1 border rounded-full px-5 py-3.5 text-[13px] bg-[#f9fbfa] text-[#1a2e22] outline-none transition-colors placeholder:text-[#9bb5a5] disabled:opacity-50 disabled:cursor-not-allowed duration-300"
          style={{ borderColor: cfg.accentBorder }}
          onFocus={e => !isEnded && (e.target.style.borderColor = cfg.accent)}
          onBlur={e  =>             (e.target.style.borderColor = cfg.accentBorder)}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isEnded}
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