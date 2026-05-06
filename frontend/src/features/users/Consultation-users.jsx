// C:\Users\HP\MediTrack\frontend\src\features\users\Consultation-users.jsx
import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../../firebase';
import {
  ref, onValue, push, set, get, serverTimestamp, onDisconnect, off
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

export default function ConsultationUsers() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [messages, setMessages]             = useState([]);
  const [inputValue, setInputValue]         = useState('');
  const [convId, setConvId]                 = useState(null);
  const [isClinicOnline, setIsClinicOnline] = useState(false);
  const [loading, setLoading]               = useState(true);
  const messagesEndRef                      = useRef(null);
  const convIdRef                           = useRef(null);
  const resolvedNameRef                     = useRef(currentUser.name || null);

  // ── Set patient presence ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;

    const setPresence = async () => {
      let resolvedName = currentUser.name || currentUser.displayName || null;
      if (!resolvedName) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const d = snap.data();
            resolvedName = [
              d.firstName,
              d.middleInitial ? `${d.middleInitial}.` : '',
              d.lastName,
            ].filter(Boolean).join(' ').trim() || 'Unknown';
            const updated = { ...currentUser, name: resolvedName };
            localStorage.setItem('user', JSON.stringify(updated));
          }
        } catch (err) {
          console.error('Failed to fetch name:', err);
          resolvedName = 'Unknown';
        }
      }

      resolvedNameRef.current = resolvedName || 'Unknown';

      const presenceData = {
        online:   true,
        lastSeen: serverTimestamp(),
        name:     resolvedNameRef.current,
        role:     currentUser.role || 'student',
      };
      const offlineData = { ...presenceData, online: false };

      const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
      set(presenceRef, presenceData);
      onDisconnect(presenceRef).set(offlineData);

      return () => set(presenceRef, offlineData);
    };

    setPresence();
  }, [currentUser?.uid]);

  // ── Find or create this patient's conversation ────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;

    const initConversation = async () => {
      setLoading(true);
      const convRef = ref(rtdb, `consultations/${currentUser.uid}`);
      const snap = await get(convRef);

      if (!snap.exists()) {
        await set(convRef, {
          metadata: {
            patientUid:     currentUser.uid,
            patientName:    resolvedNameRef.current || currentUser.name || 'Patient',
            patientRole:    currentUser.role  || 'student',
            lastMessage:    '',
            lastTimestamp:  Date.now(),
            lastSenderRole: 'patient',
            createdAt:      Date.now(),
          },
          messages: {},
        });
      }

      setConvId(currentUser.uid);
      convIdRef.current = currentUser.uid;
      setLoading(false);
    };

    initConversation();
  }, [currentUser?.uid]);

  // ── Listen to messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!convId) return;
    const msgsRef = ref(rtdb, `consultations/${convId}/messages`);
    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
    });
    return () => off(msgsRef, 'value', unsub);
  }, [convId]);

  // ── Listen to clinic online presence ─────────────────────────────────────
  useEffect(() => {
    const presRef = ref(rtdb, 'presence');
    const unsub = onValue(presRef, (snap) => {
      const data = snap.val() || {};
      const anyClinicOnline = Object.values(data).some(p =>
        p.online && ['doctor','nurse','dentist','admin','administrator'].includes(p.role?.toLowerCase())
      );
      setIsClinicOnline(anyClinicOnline);
    });
    return () => off(presRef, 'value', unsub);
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputValue.trim() || !convId) return;
    const text = inputValue.trim();
    setInputValue('');

    try {
      const msgsRef = ref(rtdb, `consultations/${convId}/messages`);
      await push(msgsRef, {
        text,
        sender:       'patient',
        senderUid:    currentUser.uid,
        senderName:   resolvedNameRef.current || 'Patient',
        timestamp:    Date.now(),
        readByClinic: false,
      });
      await set(ref(rtdb, `consultations/${convId}/metadata/lastMessage`), text);
      await set(ref(rtdb, `consultations/${convId}/metadata/lastTimestamp`), Date.now());
      await set(ref(rtdb, `consultations/${convId}/metadata/lastSenderRole`), 'patient');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  // ── Group messages by date ────────────────────────────────────────────────
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f4f7f5]">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-[#1a5c3a]"></i>
      </div>
    );
  }

  return (
    /* Clean, math-free wrapper. Relies on the parent to define screen height. */
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#f4f7f5] font-sans">

      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-[#edf3f0] flex items-center gap-4 shadow-sm z-20 flex-shrink-0">
        <div className="w-14 h-14 bg-[#e8f5ee] rounded-full flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="1.5" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1a2e22] tracking-tight">University Clinic</h3>
          <p className="text-[11px] text-[#6b8577] font-medium mb-1">Medical & Dental Staff</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
            isClinicOnline ? 'bg-[#e8f5ee] text-[#1a5c3a]' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isClinicOnline ? 'bg-[#1a5c3a]' : 'bg-slate-400'}`}></span>
            {isClinicOnline ? 'Clinic Online' : 'Clinic Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-5 py-6 flex flex-col gap-3 bg-[#f4f7f5] overflow-y-auto min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16 gap-3 text-[#6b8577]">
            <i className="fa-regular fa-comment-medical text-4xl text-[#c8e0d8]"></i>
            <p className="text-sm font-semibold">Start a consultation</p>
            <p className="text-xs max-w-[220px]">Send a message and our clinic staff will respond as soon as possible.</p>
          </div>
        )}

        {groupedMessages().map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="flex justify-center my-2">
                <span className="bg-[#ddeee5] text-[#1a5c3a] px-4 py-1 rounded-full text-[10px] font-bold">
                  {item.label}
                </span>
              </div>
            );
          }

          const isPatient = item.sender === 'patient';
          return (
            <div key={item.id || i} className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}>

              {/* Clinic responder name + role */}
              {!isPatient && (
                <div className="flex items-center gap-1.5 mb-0.5 ml-2">
                  <div className="w-5 h-5 rounded-full bg-[#e8f5ee] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <p className="text-[10px] text-[#1a5c3a] font-bold">
                    {item.senderName || 'Clinic Staff'}
                  </p>
                  {item.senderRole && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#e8f5ee] text-[#1a5c3a] font-semibold capitalize">
                      {item.senderRole}
                    </span>
                  )}
                </div>
              )}

              <div className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed shadow-sm rounded-2xl break-words ${
                isPatient
                  ? 'bg-[#1a5c3a] text-white rounded-br-sm'
                  : 'bg-white text-[#1a2e22] border border-[#ddeee5] rounded-bl-sm'
              }`}>
                {item.text}
              </div>

              <div className={`text-[9px] text-[#9bb5a5] mt-1 mx-2 flex items-center gap-1 ${isPatient ? 'justify-end' : ''}`}>
                <span>{formatTime(item.timestamp)}</span>
                {isPatient && (
                  <i className={`fa-solid fa-check${item.readByClinic ? '-double text-[#1a5c3a]' : ''} text-[8px]`}></i>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-[#edf3f0] px-4 py-3 flex gap-3 items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] flex-shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          className="flex-1 border border-[#ddeee5] rounded-full px-5 py-3.5 text-[13px] bg-[#f9fbfa] text-[#1a2e22] outline-none focus:border-[#1a5c3a] transition-colors placeholder:text-[#9bb5a5]"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="w-11 h-11 bg-[#1a5c3a] rounded-full flex items-center justify-center text-white hover:bg-[#124028] transition disabled:opacity-40 flex-shrink-0 shadow-md"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-[-2px] mt-[2px]">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

    </div>
  );
}