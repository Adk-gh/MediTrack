// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Consultations.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { rtdb, db } from '../../firebase';
import {
  ref, onValue, push, set, update, serverTimestamp, onDisconnect, off
} from 'firebase/database';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

const TABS = [
  {
    key:     'medical',
    label:   'Medical',
    sublabel:'Doctors & Nurses',
    accent:  '#1a5c3a',
    light:   '#e8f5ee',
    border:  '#b2d9c2',
    icon: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
        <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key:     'dental',
    label:   'Dental',
    sublabel:'Dentists',
    accent:  '#1a4a7a',
    light:   '#e8f0fa',
    border:  '#b2c8e8',
    icon: (color) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20 8c-6 0-12 4-12 13 0 5 2 9 4 13l4 16c1 4 3 6 5 6s3-2 5-6l2-8 2 8c2 4 3 6 5 6s4-2 5-6l4-16c2-4 4-8 4-13C48 12 42 8 36 8c-3 0-5.5 1-8 2.5C25.5 9 23 8 20 8z" />
      </svg>
    ),
  },
];

export const Consultations = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole    = (currentUser.role || '').toLowerCase();

  // ── Determine Allowed Tabs based on Role ──────────────────────────────
  const allowedTabs = React.useMemo(() => {
    if (['doctor', 'nurse'].includes(userRole)) return TABS.filter(t => t.key === 'medical');
    if (userRole === 'dentist') return TABS.filter(t => t.key === 'dental');
    return TABS; // Admins or unrecognized roles see both
  }, [userRole]);

  const [activeTab, setActiveTab]               = useState(allowedTabs[0]?.key || 'medical');
  const [conversations, setConversations]       = useState([]);
  const [selectedConvId, setSelectedConvId]     = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [messageInput, setMessageInput]         = useState('');
  const [onlinePresence, setOnlinePresence]     = useState({});
  const [patientProfiles, setPatientProfiles]   = useState({});
  const [loadingMsgs, setLoadingMsgs]           = useState(false);
  const [toast, setToast]                       = useState(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);

  const messagesEndRef  = useRef(null);
  const msgListenerRef  = useRef(null);
  const resolvedNameRef = useRef(currentUser.name || null);

  const tabCfg = allowedTabs.find(t => t.key === activeTab) || allowedTabs[0] || TABS[0];

  // ── Auto-select conversation from URL ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convIdToOpen = params.get('convId');
    if (convIdToOpen) {
      setSelectedConvId(convIdToOpen);
      if (convIdToOpen.endsWith('_dental') && allowedTabs.some(t => t.key === 'dental')) {
        setActiveTab('dental');
      } else if (allowedTabs.some(t => t.key === 'medical')) {
        setActiveTab('medical');
      }
    }
  }, [location.search, allowedTabs]);

  // ── Doctor presence ───────────────────────────────────────────────────
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
            localStorage.setItem('user', JSON.stringify({ ...currentUser, name: resolvedName }));
          }
        } catch { resolvedName = 'Clinic Staff'; }
      }
      resolvedNameRef.current = resolvedName || 'Clinic Staff';

      const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
      const presenceData = {
        online: true, lastSeen: serverTimestamp(),
        name: resolvedNameRef.current, role: currentUser.role || 'staff',
      };
      set(presenceRef, presenceData);
      onDisconnect(presenceRef).set({ ...presenceData, online: false });
    };
    setPresence();
  }, [currentUser?.uid]);

  // ── Load Firestore profiles ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() }; });
        setPatientProfiles(map);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // ── Listen to ALL conversations ───────────────────────────────────────
  useEffect(() => {
    const convRef = ref(rtdb, 'consultations');
    const unsub = onValue(convRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, conv]) => {
        const realMessages = Object.values(conv.messages || {}).filter(m => !m.isBot);
        const hasRealMessages = realMessages.length > 0;
        const consultType = conv.metadata?.consultType || 'medical';

        return {
          id,
          ...conv.metadata,
          consultType,
          hasMessages: hasRealMessages,
          lastMessage:   conv.metadata?.lastMessage   || '',
          lastTimestamp: conv.metadata?.lastTimestamp || 0,
          status:        conv.metadata?.status || 'ended',
          unreadCount: realMessages.filter(m => m.sender === 'patient' && !m.readByClinic).length,
        };
      });
      list.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      setConversations(list);
    });
    return () => off(convRef, 'value', unsub);
  }, []);

  // ── Presence ──────────────────────────────────────────────────────────
  useEffect(() => {
    const presRef = ref(rtdb, 'presence');
    const unsub = onValue(presRef, (snap) => setOnlinePresence(snap.val() || {}));
    return () => off(presRef, 'value', unsub);
  }, []);

  // ── Messages listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (msgListenerRef.current) { off(msgListenerRef.current); msgListenerRef.current = null; }
    if (!selectedConvId) { setMessages([]); return; }

    setLoadingMsgs(true);
    const msgsRef = ref(rtdb, `consultations/${selectedConvId}/messages`);
    msgListenerRef.current = msgsRef;

    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .filter(msg => !msg.isBot)
        .sort((a, b) => a.timestamp - b.timestamp);

      setMessages(list);
      setLoadingMsgs(false);

      const unreadPatientMsgs = list.filter(msg => msg.sender === 'patient' && !msg.readByClinic);
      if (unreadPatientMsgs.length > 0) {
        const updates = {};
        unreadPatientMsgs.forEach(msg => {
          updates[`${msg.id}/readByClinic`] = true;
        });
        update(ref(rtdb, `consultations/${selectedConvId}/messages`), updates);
      }
    });
    return () => off(msgsRef, 'value', unsub);
  }, [selectedConvId]);

  useEffect(() => { setShowPatientPanel(false); }, [selectedConvId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send Message ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedConvId || !messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput('');
    try {
      const msgsRef = ref(rtdb, `consultations/${selectedConvId}/messages`);
      await push(msgsRef, {
        text,
        sender:        'clinic',
        senderUid:     currentUser.uid,
        senderName:    resolvedNameRef.current || 'Clinic Staff',
        senderRole:    currentUser.role || 'staff',
        timestamp:     Date.now(),
        readByPatient: false,
        isBot:         false,
      });
      await update(ref(rtdb, `consultations/${selectedConvId}/metadata`), {
        lastMessage:    text,
        lastTimestamp:  Date.now(),
        lastSenderRole: 'clinic'
      });
    } catch (err) {
      console.error('Send error:', err);
      showToast('Failed to send message', 'error');
    }
  };

  // ── End Consultation ──────────────────────────────────────────────────
  const handleEndConsultation = async () => {
    if (!selectedConvId) return;
    try {
      await update(ref(rtdb, `consultations/${selectedConvId}/metadata`), { status: 'ended' });
      await push(ref(rtdb, `consultations/${selectedConvId}/messages`), {
        text: "Consultation marked as complete by clinic staff.",
        isBot: true,
        timestamp: Date.now()
      });
      showToast('Consultation ended');
    } catch (err) {
      console.error('Failed to end consultation', err);
      showToast('Failed to end consultation', 'error');
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  // ── Derived data ──────────────────────────────────────────────────────
  const selectedConv   = conversations.find(c => c.id === selectedConvId);
  const isConvEnded    = selectedConv?.status === 'ended';
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

  const visibleConversations = conversations.filter(conv =>
    conv.consultType === activeTab &&
    (conv.hasMessages || conv.id === selectedConvId)
  );

  const unreadByTab = {};
  allowedTabs.forEach(tab => {
    unreadByTab[tab.key] = conversations
      .filter(c => c.consultType === tab.key && c.status === 'active')
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  });

  const handleOpenExamination = () => {
    if (!patientUid) return;
    const person = {
      uid: patientUid, name: patientName,
      firstName: patientProfile.firstName || '', lastName: patientProfile.lastName || '',
      id: patientProfile.universityId || patientProfile.studentId || patientUid,
      role: patientProfile.role || '', prog: patientProfile.program || patientProfile.course || '',
      year: patientProfile.yearLevel || '', section: patientProfile.section || '',
      age: patientProfile.age || '', gender: patientProfile.gender || patientProfile.sex || '',
      birthdate: patientProfile.birthday || '', email: patientProfile.email || '',
      phoneNumber: patientProfile.phoneNumber || '', department: patientProfile.department || '',
      _raw: patientProfile,
    };
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${patientUid}`);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">

      {/* ── MAGIC FIX: Hide hamburger when a chat is open on mobile ── */}
      {selectedConvId && (
        <style>{`
          @media (max-width: 768px) {
            #mobile-hamburger-btn,
            #mobile-active-tab-chip {
              display: none !important;
            }
          }
        `}</style>
      )}

      {/* ── Left: Sidebar ── */}
      <div className={`w-full md:w-[340px] border-r border-slate-200 flex-col flex-shrink-0 ${
        selectedConvId ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-extrabold text-[#466460] text-base">
            <i className="fa-regular fa-comment-dots mr-2"></i>Consultations
          </h3>
          {onlineClinicStaff.length > 0 && (
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
              <i className="fa-solid fa-circle text-[7px] mr-1"></i>
              {onlineClinicStaff.join(', ')} also online
            </p>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-white">
          {allowedTabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (selectedConv && selectedConv.consultType !== tab.key) setSelectedConvId(null);
                }}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 text-xs font-bold transition-all relative"
                style={{ color: isActive ? tab.accent : '#94a3b8', backgroundColor: isActive ? tab.light : 'transparent' }}
              >
                <div className="flex items-center gap-1.5">
                  {tab.icon(isActive ? tab.accent : '#94a3b8')}
                  <span>{tab.label}</span>
                  {unreadByTab[tab.key] > 0 && (
                    <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5 text-white min-w-[16px] text-center" style={{ backgroundColor: '#e07a5f' }}>
                      {unreadByTab[tab.key]}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-normal" style={{ color: isActive ? tab.accent : '#94a3b8' }}>
                  {tab.sublabel}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: tab.accent }}></span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 pt-2 pb-1">
          <p className="text-[10px] text-slate-400">
            {visibleConversations.length} total thread{visibleConversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
              <i className="fa-regular fa-comment-dots text-4xl text-slate-200"></i>
              <p className="text-sm">No {tabCfg.label.toLowerCase()} consultations yet</p>
              <p className="text-xs">Patients will appear here when they send a message</p>
            </div>
          ) : visibleConversations.map(conv => {
            const profile = patientProfiles[conv.patientUid] || {};
            const displayName = profile.firstName
              ? `${profile.lastName || ''}, ${profile.firstName || ''}`.trim()
              : conv.patientName || 'Unknown';
            const initial  = displayName.charAt(0).toUpperCase();
            const isOnline = onlinePresence[conv.patientUid]?.online || false;
            const isActive = selectedConvId === conv.id;
            const tab = TABS.find(t => t.key === conv.consultType) || TABS[0];
            const isEnded = conv.status === 'ended';

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-[#f0f7f6] ${
                  isActive ? 'md:bg-gradient-to-r md:from-[#e0eceb] md:to-white md:border-l-4 md:border-l-[#466460]' : ''
                } ${isEnded ? 'opacity-70' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base ${isEnded ? 'grayscale' : ''}`}
                    style={{ backgroundColor: tab.light, color: tab.accent }}
                  >
                    {initial}
                  </div>
                  {isOnline && !isEnded && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm text-slate-800 truncate flex items-center gap-2">
                      {displayName}
                      {isEnded && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase">Ended</span>
                      )}
                    </p>
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
                {conv.unreadCount > 0 && !isEnded && (
                  <span className="bg-[#e07a5f] text-white text-[9px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div className={`flex-1 min-w-0 overflow-hidden ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat Header */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-white flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={() => { setSelectedConvId(null); setShowPatientPanel(false); }}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            {selectedConv ? (
              <>
                {(() => {
                  const t = TABS.find(tab => tab.key === selectedConv.consultType) || TABS[0];
                  return (
                    <div
                      className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: t.light, color: t.accent }}
                    >
                      {t.icon(t.accent)}
                      {t.label}
                    </div>
                  );
                })()}

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
                    {isConvEnded
                      ? <span className="text-slate-500 font-semibold">● Session Ended</span>
                      : isPatientOnline
                        ? <span className="text-emerald-500 font-semibold">● Online</span>
                        : <span>● Offline</span>}
                    {patientProfile.program ? ` · ${patientProfile.program}` : ''}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {!isConvEnded && (
                    <button
                      onClick={handleEndConsultation}
                      title="End Consultation"
                      className="flex items-center justify-center gap-1.5 w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all border border-red-100 hover:border-red-500 shadow-sm"
                    >
                      <i className="fa-solid fa-check-double text-[12px] md:text-[10px]"></i>
                      <span className="hidden md:inline">End Consult</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowPatientPanel(v => !v)}
                    title={showPatientPanel ? 'Hide Records' : 'View Records'}
                    className={`flex items-center justify-center gap-1.5 w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-full text-[11px] font-semibold transition-all shadow-sm ${
                      showPatientPanel
                        ? 'bg-[#466460] text-white'
                        : 'bg-[#e0eceb] text-[#466460] hover:bg-[#466460] hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-address-card text-[12px] md:text-[10px]"></i>
                    <span className="hidden md:inline">{showPatientPanel ? 'Hide' : 'Records'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:block">
                <p className="font-bold text-sm text-slate-800">Consultation Thread</p>
                <p className="text-[10px] text-slate-400">Select a patient to view conversation</p>
              </div>
            )}
          </div>

          {/* Messages — flex-1 so it fills remaining height, own scroll */}
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
                <p className="text-xs text-center px-4">The patient is completing the intake form. Their first message will appear here.</p>
              </div>
            ) : (
              <>
                {groupedMessages().map((item) => {
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
                          <p className="text-[9px] text-slate-400 font-semibold">{item.senderName || 'Clinic Staff'}</p>
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
                          <i className={`fa-solid ${item.readByPatient ? 'fa-check-double text-[#466460]' : 'fa-check text-slate-300'} text-[10px] ml-1`}></i>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isConvEnded && (
                  <div className="flex items-center gap-3 my-4 opacity-60">
                    <div className="flex-1 h-px bg-slate-300"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Ended</span>
                    <div className="flex-1 h-px bg-slate-300"></div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — flex-shrink-0 so it never gets squashed */}
          <div className="px-3 md:px-4 py-3 bg-white border-t border-slate-200 flex gap-2 md:gap-3 items-center flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))]">
            <input
              type="text"
              placeholder={
                !selectedConvId
                  ? 'Select a conversation first'
                  : isConvEnded
                    ? 'Consultation has been ended.'
                    : 'Type a reply…'
              }
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={!selectedConvId || isConvEnded}
              className="flex-1 border border-slate-200 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedConvId || !messageInput.trim() || isConvEnded}
              className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-full bg-[#466460] text-white flex items-center justify-center hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <i className="fa-regular fa-paper-plane"></i>
            </button>
          </div>
        </div>

        {/* ── Patient Records Side Panel ── */}
        {showPatientPanel && selectedConv && (
          <div className="absolute inset-0 z-50 md:relative md:z-auto w-full md:w-[420px] flex-shrink-0 md:border-l border-slate-200 bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 md:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm md:shadow-none flex-shrink-0">
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

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
                  <p className="text-[10px] text-slate-400 mt-0.5">{patientProfile.universityId || patientProfile.studentId || '—'}</p>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${getRoleClass(patientProfile.role || selectedConv?.patientRole)}`}>
                    {patientProfile.role || selectedConv?.patientRole || 'patient'}
                  </span>
                </div>
              </div>

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

              {patientProfile.birthday && (
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <p className="text-[8px] text-slate-400 uppercase tracking-wide">Birthdate</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{patientProfile.birthday}</p>
                </div>
              )}

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
                </div>
              )}

              {patientProfile.homeAddress && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Address</p>
                  <p className="text-[11px] text-slate-600">{patientProfile.homeAddress}</p>
                </div>
              )}

              {patientProfile.emergencyContact?.name && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {patientProfile.emergencyContact.name}
                    {patientProfile.emergencyContact.relationship
                      ? ` (${patientProfile.emergencyContact.relationship})` : ''}
                  </p>
                  {patientProfile.emergencyContact.phone && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <i className="fa-solid fa-phone text-[9px]"></i>
                      {patientProfile.emergencyContact.phone}
                    </p>
                  )}
                </div>
              )}

              {patientProfile.vaccinations &&
                Object.values(patientProfile.vaccinations).some(v => v?.vaccineName) && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">COVID-19 Vaccination</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(patientProfile.vaccinations).map(([key, v]) =>
                      v?.vaccineName ? (
                        <div key={key} className="text-[8px] px-2 py-1 rounded-lg bg-green-50 border border-green-100 text-green-700">
                          <span className="font-semibold">{key.replace('dose', 'Dose ').replace('booster', 'Booster ')}:</span>{' '}
                          {v.vaccineName}{v.date ? ` · ${v.date}` : ''}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
              <button
                onClick={handleOpenExamination}
                className="w-full bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white text-[12px] font-bold py-3 md:py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-stethoscope text-[12px]"></i>
                Open Full Examination
              </button>

              <button
                onClick={() => navigate('/records')}
                className="w-full bg-[#e0eceb] text-[#466460] text-[12px] font-bold py-3 md:py-2.5 rounded-xl hover:bg-[#466460] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-folder-open text-[12px]"></i>
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