// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Consultations.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { rtdb } from '../../firebase';
import {
  ref, onValue, push, set, serverTimestamp, onDisconnect, off
} from 'firebase/database';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

const getRoleClass = (role) => {
  if (!role) return 'bg-slate-100 text-slate-600';
  const r = role.toLowerCase();
  if (r === 'student') return 'bg-blue-100 text-blue-700';
  if (r === 'instructor' || r === 'faculty') return 'bg-purple-100 text-purple-700';
  return 'bg-green-100 text-green-700';
};

export const Consultations = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [conversations, setConversations]       = useState([]);
  const [selectedConvId, setSelectedConvId]     = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [messageInput, setMessageInput]         = useState('');
  const [onlinePresence, setOnlinePresence]     = useState({});
  const [patientProfiles, setPatientProfiles]   = useState({});
  const [loadingMsgs, setLoadingMsgs]           = useState(false);
  const [toast, setToast]                       = useState(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  
  const messagesEndRef      = useRef(null);
  const msgListenerRef      = useRef(null);
  const resolvedNameRef     = useRef(currentUser.name || null);

  // ── Auto-select conversation from URL (Triggered from Records.jsx) ────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convIdToOpen = params.get('convId');
    if (convIdToOpen) {
      setSelectedConvId(convIdToOpen);
    }
  }, [location.search]);

  // ── Set doctor presence ───────────────────────────────────────────────────
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
            ].filter(Boolean).join(' ').trim() || 'Clinic Staff';
            const updated = { ...currentUser, name: resolvedName };
            localStorage.setItem('user', JSON.stringify(updated));
          }
        } catch (err) {
          console.error('Failed to fetch name:', err);
          resolvedName = 'Clinic Staff';
        }
      }

      resolvedNameRef.current = resolvedName || 'Clinic Staff';

      const presenceData = {
        online:   true,
        lastSeen: serverTimestamp(),
        name:     resolvedNameRef.current,
        role:     currentUser.role || 'staff',
      };
      const offlineData = { ...presenceData, online: false };

      const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
      set(presenceRef, presenceData);
      onDisconnect(presenceRef).set(offlineData);

      return () => set(presenceRef, offlineData);
    };

    setPresence();
  }, [currentUser?.uid]);

  // ── Load Firestore user profiles for display ──────────────────────────────
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() }; });
        setPatientProfiles(map);
      } catch (err) {
        console.error('Failed to load profiles:', err);
      }
    };
    loadProfiles();
  }, []);

  // ── Listen to all conversations ───────────────────────────────────────────
  useEffect(() => {
    const convRef = ref(rtdb, 'consultations');
    const unsub = onValue(convRef, (snap) => {
      const data = snap.val() || {};
      
      // Map ALL conversations to state so we don't lose data
      const list = Object.entries(data).map(([id, conv]) => {
        const hasMessages = conv.messages && Object.keys(conv.messages).length > 0;
        
        return {
          id,
          ...conv.metadata,
          hasMessages,
          lastMessage:   conv.metadata?.lastMessage   || '',
          lastTimestamp: conv.metadata?.lastTimestamp || 0,
          unreadCount:   Object.values(conv.messages || {}).filter(
            m => m.sender === 'patient' && !m.readByClinic
          ).length,
        };
      });
      
      list.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      setConversations(list);
    });
    return () => off(convRef, 'value', unsub);
  }, []);

  // ── Listen to presence ────────────────────────────────────────────────────
  useEffect(() => {
    const presRef = ref(rtdb, 'presence');
    const unsub = onValue(presRef, (snap) => {
      setOnlinePresence(snap.val() || {});
    });
    return () => off(presRef, 'value', unsub);
  }, []);

  // ── Listen to selected conversation messages ──────────────────────────────
  useEffect(() => {
    if (msgListenerRef.current) {
      off(msgListenerRef.current);
      msgListenerRef.current = null;
    }
    if (!selectedConvId) { setMessages([]); return; }

    setLoadingMsgs(true);
    const msgsRef = ref(rtdb, `consultations/${selectedConvId}/messages`);
    msgListenerRef.current = msgsRef;

    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setLoadingMsgs(false);

      // Mark patient messages as read
      list.forEach(msg => {
        if (msg.sender === 'patient' && !msg.readByClinic) {
          set(ref(rtdb, `consultations/${selectedConvId}/messages/${msg.id}/readByClinic`), true);
        }
      });
    });

    return () => off(msgsRef, 'value', unsub);
  }, [selectedConvId]);

  // ── Close patient panel when conversation changes ─────────────────────────
  useEffect(() => {
    setShowPatientPanel(false);
  }, [selectedConvId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedConvId || !messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput('');

    try {
      const msgsRef = ref(rtdb, `consultations/${selectedConvId}/messages`);
      await push(msgsRef, {
        text,
        sender:       'clinic',
        senderUid:    currentUser.uid,
        senderName:   resolvedNameRef.current || 'Clinic Staff',
        senderRole:   currentUser.role || 'staff',
        timestamp:    Date.now(),
        readByClinic: true,
      });
      await set(ref(rtdb, `consultations/${selectedConvId}/metadata/lastMessage`), text);
      await set(ref(rtdb, `consultations/${selectedConvId}/metadata/lastTimestamp`), Date.now());
      await set(ref(rtdb, `consultations/${selectedConvId}/metadata/lastSenderRole`), 'clinic');
    } catch (err) {
      console.error('Send error:', err);
      showToast('Failed to send message', 'error');
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = () => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const dateLabel = formatDate(msg.timestamp);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel, id: `date-${msg.timestamp}` });
        lastDate = dateLabel;
      }
      groups.push(msg);
    });
    return groups;
  };

  const selectedConv   = conversations.find(c => c.id === selectedConvId);
  const patientUid     = selectedConv?.patientUid;
  const patientProfile = patientProfiles[patientUid] || {};
  const patientName    = patientProfile.firstName
    ? `${patientProfile.lastName || ''}, ${patientProfile.firstName || ''}`.trim()
    : selectedConv?.patientName || 'Unknown';
  const isPatientOnline = onlinePresence[patientUid]?.online || false;

  const onlineClinicStaff = Object.entries(onlinePresence)
    .filter(([uid, p]) => p.online && uid !== currentUser.uid &&
      ['doctor','nurse','dentist','admin','administrator'].includes(p.role?.toLowerCase()))
    .map(([, p]) => p.name);

  // ── Sidebar Filter (The Fix) ──────────────────────────────────────────────
  // We filter visually here instead of in the Firebase listener
  const visibleConversations = conversations.filter(
    conv => conv.hasMessages || conv.id === selectedConvId
  );

  // ── Navigate to full examination ──────────────────────────────────────────
  const handleOpenExamination = () => {
    if (!patientUid) return;
    const person = {
      uid:        patientUid,
      name:       patientName,
      firstName:  patientProfile.firstName  || '',
      lastName:   patientProfile.lastName   || '',
      id:         patientProfile.universityId || patientProfile.studentId || patientUid,
      role:       patientProfile.role       || '',
      prog:       patientProfile.program    || patientProfile.course || '',
      year:       patientProfile.yearLevel  || '',
      section:    patientProfile.section    || '',
      age:        patientProfile.age        || '',
      gender:     patientProfile.gender     || patientProfile.sex || '',
      birthdate:  patientProfile.birthday   || '',
      email:      patientProfile.email      || '',
      phoneNumber: patientProfile.phoneNumber || '',
      department: patientProfile.department || '',
      _raw:       patientProfile,
    };
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${patientUid}`);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white overflow-hidden relative">

      {/* ── Left: Conversation List ── */}
      <div 
        className={`w-full md:w-[340px] border-r border-slate-200 flex-col flex-shrink-0 ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-extrabold text-[#466460] text-base">
            <i className="fa-regular fa-comment-dots mr-2"></i>Consultations
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {visibleConversations.length} active thread{visibleConversations.length !== 1 ? 's' : ''}
          </p>
          {onlineClinicStaff.length > 0 && (
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
              <i className="fa-solid fa-circle text-[7px] mr-1"></i>
              {onlineClinicStaff.join(', ')} also online
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
              <i className="fa-regular fa-comment-dots text-4xl text-slate-200"></i>
              <p className="text-sm">No consultations yet</p>
              <p className="text-xs">Patients will appear here when they send a message</p>
            </div>
          ) : visibleConversations.map(conv => {
            const profile     = patientProfiles[conv.patientUid] || {};
            const displayName = profile.firstName
              ? `${profile.lastName || ''}, ${profile.firstName || ''}`.trim()
              : conv.patientName || 'Unknown';
            const initial  = displayName.charAt(0).toUpperCase();
            const isOnline = onlinePresence[conv.patientUid]?.online || false;
            const isActive = selectedConvId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-[#f0f7f6] ${
                  isActive ? 'md:bg-gradient-to-r md:from-[#e0eceb] md:to-white md:border-l-4 md:border-l-[#466460]' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-base">
                    {initial}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm text-slate-800 truncate">{displayName}</p>
                    <span className="text-[9px] text-slate-400 flex-shrink-0 ml-2">
                      {conv.lastTimestamp ? formatTime(conv.lastTimestamp) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${getRoleClass(conv.patientRole)}`}>
                      {conv.patientRole || 'patient'}
                    </span>
                    <p className="text-[10px] text-slate-400 truncate">{conv.lastMessage || 'No messages'}</p>
                  </div>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="bg-[#e07a5f] text-white text-[9px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Chat + optional Patient Panel ── */}
      <div 
        className={`flex-1 min-w-0 overflow-hidden ${
          !selectedConvId ? 'hidden md:flex' : 'flex'
        }`}
      >

        {/* ── Chat Column ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat Header */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-white flex items-center gap-2 md:gap-3">
            
            {/* Native Mobile Back Button */}
            <button
              onClick={() => {
                setSelectedConvId(null);
                setShowPatientPanel(false);
              }}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            {selectedConv ? (
              <>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460]">
                    {patientName.charAt(0).toUpperCase()}
                  </div>
                  {isPatientOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{patientName}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isPatientOnline
                      ? <span className="text-emerald-500 font-semibold">● Online</span>
                      : <span>● Offline</span>}
                    {patientProfile.program    ? ` · ${patientProfile.program}`    : ''}
                    {patientProfile.department ? ` · ${patientProfile.department}` : ''}
                  </p>
                </div>

                {/* ── View Records Toggle Button ── */}
                <button
                  onClick={() => setShowPatientPanel(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 ${
                    showPatientPanel
                      ? 'bg-[#466460] text-white shadow-sm'
                      : 'bg-[#e0eceb] text-[#466460] hover:bg-[#466460] hover:text-white'
                  }`}
                >
                  <i className="fa-solid fa-address-card text-[10px] md:mr-1"></i>
                  <span className="hidden md:inline">{showPatientPanel ? 'Hide Records' : 'View Records'}</span>
                </button>
              </>
            ) : (
              <div className="hidden md:block">
                <p className="font-bold text-sm text-slate-800">Consultation Thread</p>
                <p className="text-[10px] text-slate-400">Select a patient to view conversation</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-3 bg-slate-50">
            {!selectedConvId ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <i className="fa-regular fa-message text-5xl text-slate-200"></i>
                <p className="text-sm">No conversation selected</p>
                <p className="text-xs">Choose a patient from the list</p>
              </div>
            ) : loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <i className="fa-solid fa-spinner fa-spin text-[#466460] text-xl"></i>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <i className="fa-regular fa-comment text-4xl text-slate-200"></i>
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              groupedMessages().map((item) => {
                if (item.type === 'date') {
                  return (
                    <div key={item.id} className="flex justify-center my-2">
                      <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-[10px] font-semibold">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const isClinic = item.sender === 'clinic';
                return (
                  <div key={item.id} className={`flex flex-col ${isClinic ? 'items-end' : 'items-start'}`}>
                    {isClinic && (
                      <div className="flex items-center gap-1.5 mb-0.5 mr-2">
                        <p className="text-[9px] text-slate-400 font-semibold">
                          {item.senderName || 'Clinic Staff'}
                        </p>
                        {item.senderRole && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold capitalize">
                            {item.senderRole}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                      isClinic
                        ? 'bg-[#466460] text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {item.text}
                    </div>
                    <div className={`text-[9px] text-slate-400 mt-1 mx-1 flex items-center gap-1 ${isClinic ? 'justify-end' : ''}`}>
                      <span>{formatTime(item.timestamp)}</span>
                      {isClinic && (
                        <i className={`fa-solid fa-check${item.readByClinic ? '-double' : ''} text-[8px]`}></i>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 md:px-4 py-3 bg-white border-t border-slate-200 flex gap-2 md:gap-3 items-center">
            <input
              type="text"
              placeholder={selectedConvId ? 'Type a reply…' : 'Select a conversation first'}
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={!selectedConvId}
              className="flex-1 border border-slate-200 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedConvId || !messageInput.trim()}
              className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-full bg-[#466460] text-white flex items-center justify-center hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <i className="fa-regular fa-paper-plane"></i>
            </button>
          </div>
        </div>

        {/* ── Patient Records Side Panel ── */}
        {showPatientPanel && selectedConv && (
          <div className="absolute inset-0 z-50 md:relative md:z-auto w-full md:w-[420px] flex-shrink-0 md:border-l border-slate-200 bg-white flex flex-col overflow-hidden">

            {/* Panel Header */}
            <div className="px-4 py-3 md:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm md:shadow-none">
              <p className="text-xs font-extrabold text-[#466460] flex items-center gap-1.5">
                <i className="fa-solid fa-address-card text-[11px]"></i>
                Patient Records
              </p>
              <button
                onClick={() => setShowPatientPanel(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

              {/* Avatar + Name */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-lg">
                    {patientName.charAt(0).toUpperCase()}
                  </div>
                  {isPatientOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 leading-tight truncate">{patientName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {patientProfile.universityId || patientProfile.studentId || '—'}
                  </p>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${getRoleClass(patientProfile.role || selectedConv?.patientRole)}`}>
                    {patientProfile.role || selectedConv?.patientRole || 'patient'}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Age',    value: patientProfile.age    || '—' },
                  { label: 'Gender', value: patientProfile.gender || patientProfile.sex || '—' },
                  { label: 'Blood',  value: patientProfile.bloodType || '—' },
                  { label: 'Civil',  value: patientProfile.civilStatus || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Birthdate */}
              {patientProfile.birthday && (
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <p className="text-[8px] text-slate-400 uppercase tracking-wide">Birthdate</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{patientProfile.birthday}</p>
                </div>
              )}

              {/* Contact */}
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <i className="fa-solid fa-envelope text-[#466460] w-3"></i>
                    <span className="truncate">{patientProfile.email || '—'}</span>
                  </p>
                  {patientProfile.phoneNumber && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <i className="fa-solid fa-phone text-[#466460] w-3"></i>
                      {patientProfile.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Program / Department */}
              {(patientProfile.program || patientProfile.course || patientProfile.department) && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Program</p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {patientProfile.program || patientProfile.course || '—'}
                    {patientProfile.yearLevel ? ` · ${patientProfile.yearLevel}` : ''}
                    {patientProfile.section   ? ` · Sec ${patientProfile.section}` : ''}
                  </p>
                  {patientProfile.department && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{patientProfile.department}</p>
                  )}
                  {patientProfile.jobTitle && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{patientProfile.jobTitle}</p>
                  )}
                </div>
              )}

              {/* Home Address */}
              {patientProfile.homeAddress && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Address</p>
                  <p className="text-[11px] text-slate-600">{patientProfile.homeAddress}</p>
                </div>
              )}

              {/* Emergency Contact */}
              {patientProfile.emergencyContact?.name && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {patientProfile.emergencyContact.name}
                    {patientProfile.emergencyContact.relationship
                      ? ` (${patientProfile.emergencyContact.relationship})`
                      : ''}
                  </p>
                  {patientProfile.emergencyContact.phone && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <i className="fa-solid fa-phone text-[9px]"></i>
                      {patientProfile.emergencyContact.phone}
                    </p>
                  )}
                  {patientProfile.emergencyContact.address && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{patientProfile.emergencyContact.address}</p>
                  )}
                </div>
              )}

              {/* Vaccinations */}
              {patientProfile.vaccinations &&
                Object.values(patientProfile.vaccinations).some(v => v?.vaccineName) && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">COVID-19 Vaccination</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(patientProfile.vaccinations).map(([key, v]) =>
                      v?.vaccineName ? (
                        <div key={key} className="text-[8px] px-2 py-1 rounded-lg bg-green-50 border border-green-100 text-green-700">
                          <span className="font-semibold">
                            {key.replace('dose', 'Dose ').replace('booster', 'Booster ')}:
                          </span>{' '}
                          {v.vaccineName}
                          {v.date ? ` · ${v.date}` : ''}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-100 pt-1"></div>

              {/* Open Full Examination Button */}
              <button
                onClick={handleOpenExamination}
                className="w-full bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white text-[11px] font-bold py-3 md:py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-stethoscope text-[10px]"></i>
                Open Full Examination
              </button>

              <button
                onClick={() => navigate(`/records`)}
                className="w-full bg-[#e0eceb] text-[#466460] text-[11px] font-bold py-3 md:py-2 rounded-xl hover:bg-[#466460] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-folder-open text-[10px]"></i>
                Go to Records
              </button>

            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-lg z-[60] flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
        }`}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default Consultations;