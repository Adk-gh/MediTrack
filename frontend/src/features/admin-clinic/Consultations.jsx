// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Consultations.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import * as consultationsService from '../../services/consultations.service';

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

  const allowedTabs = React.useMemo(() => {
    if (['doctor', 'nurse'].includes(userRole)) return TABS.filter(t => t.key === 'medical');
    if (userRole === 'dentist') return TABS.filter(t => t.key === 'dental');
    return TABS;
  }, [userRole]);

  const [activeTab, setActiveTab]               = useState(allowedTabs[0]?.key || 'medical');
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterStatus, setFilterStatus]       = useState('all'); // 'all', 'active', 'ended'
  const [sortOrder, setSortOrder]             = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [conversations, setConversations]       = useState([]);
  const [unreadCounts, setUnreadCounts]         = useState({}); // { convId: count }
  const [selectedConvId, setSelectedConvId]     = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [messageInput, setMessageInput]         = useState('');
  const [onlinePresence, setOnlinePresence]     = useState({});
  const [patientProfiles, setPatientProfiles]   = useState({});
  const [loadingMsgs, setLoadingMsgs]           = useState(false);
  const [toast, setToast]                       = useState(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);

  // 🔴 FIXED: Core internal tracking states for the staff member
  const [internalStaffId, setInternalStaffId]   = useState(null);
  const [sessionReady, setSessionReady]         = useState(false);

  const messagesEndRef  = useRef(null);
  const msgChannelRef   = useRef(null);
  const convChannelRef  = useRef(null);
  const presenceChannelRef = useRef(null);
  const globalMsgChannelRef = useRef(null); // 🟢 NEW: cross-conversation realtime channel
  const selectedConvIdRef = useRef(null);
  const isSendingRef    = useRef(false); // Track if sending to skip realtime dupes

  const tabCfg = allowedTabs.find(t => t.key === activeTab) || allowedTabs[0] || TABS[0];

  // ── 1. Secure Authentication & Fetch Internal Staff ID ───────────────
  useEffect(() => {
    const initAdminSession = async () => {
      if (!currentUser?.uid) return;

      const accessToken  = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';

      if (accessToken) {
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
      }

      // Resolve the internal users.id for the logged-in staff member
      const { data: profiles, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('uid', currentUser.uid)
        .limit(1);

      const profile = profiles?.[0];
      if (profile) {
        setInternalStaffId(profile.id);
        // Set presence using the valid internal ID
        consultationsService.setUserPresence(profile.id, 'online');
      }
      setSessionReady(true);
    };

    initAdminSession();

    return () => {
      const storedId = localStorage.getItem('_internalStaffId');
      if (storedId) {
        consultationsService.setUserPresence(storedId, 'offline').catch(() => {});
      }
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (internalStaffId) localStorage.setItem('_internalStaffId', internalStaffId);
  }, [internalStaffId]);

  // ── 2. Auto-select conversation from URL ──────────────────────────────
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

  // ── 3. Load patient profiles from Supabase ────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        const map = {};
        data?.forEach(p => { map[p.id] = p; });
        setPatientProfiles(map);
      } catch (err) { console.error('Failed to load profiles:', err); }
    };
    loadProfiles();
  }, [sessionReady]);

  // ── 4. Subscribe to consultations ─────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadConsultations = async () => {
      try {
        console.log('[Clinic] Loading consultations...');
        const data = await consultationsService.getAllConsultations(null, true); // Force refresh
        console.log('[Clinic] Raw data from API:', data?.map(c => ({ id: c.id, status: c.status, patient_id: c.patient_id })));

        // Load conversations with last message and unread count
        const consultationsWithLastMessage = await Promise.all(
          (data || []).map(async (conv) => {
            try {
              const msgs = await consultationsService.getMessagesByConsultationId(conv.id);
              const lastMsg = msgs?.slice(-1)[0];
              // Count unread messages (from patients, not from staff)
              // Only count if internalStaffId is available and sender_id exists
              const unreadCount = internalStaffId
                ? (msgs || []).filter(m => !m.read_at && m.sender_id && m.sender_id !== internalStaffId).length
                : 0;
              console.log('[Clinic] Conv', conv.id, '- total msgs:', msgs?.length || 0, 'unread:', unreadCount);
              return {
                ...conv,
                last_message: lastMsg?.message || '',
                last_timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
                unread_count: unreadCount,
              };
            } catch {
              return conv;
            }
          })
        );
        consultationsWithLastMessage.sort((a, b) => b.last_timestamp - a.last_timestamp);
        setConversations(consultationsWithLastMessage);

        // Build unread counts map
        const unreadMap = {};
        consultationsWithLastMessage.forEach(c => {
          if (c.unread_count > 0) unreadMap[c.id] = c.unread_count;
        });
        setUnreadCounts(unreadMap);

        // REMOVED: Auto-select first active conversation - user selects manually
      } catch (err) {
        console.error('Failed to load consultations:', err);
      }
    };
    loadConsultations();

    convChannelRef.current = consultationsService.subscribeToConsultations((payload) => {
      if (payload.eventType === 'INSERT') {
        const newConv = { ...payload.new, last_message: '', last_timestamp: 0 };
        setConversations(prev => [newConv, ...prev]);
        // REMOVED: Auto-select new consultation - user selects manually
      } else if (payload.eventType === 'UPDATE') {
        setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      }
    });

    // Poll for unread count updates more frequently (every 3 seconds) to detect when patient reads messages
    const pollInterval = setInterval(async () => {
      try {
        const data = await consultationsService.getAllConsultations(null, true);
        if (!data) return;

        // Update only the unread counts in conversations (don't re-fetch all messages)
        const unreadMap = {};
        const updatedConversations = await Promise.all(
          (data || []).map(async (conv) => {
            try {
              const msgs = await consultationsService.getMessagesByConsultationId(conv.id);
              const lastMsg = msgs?.slice(-1)[0];
              const unreadCount = internalStaffId
                ? (msgs || []).filter(m => !m.read_at && m.sender_id && m.sender_id !== internalStaffId).length
                : 0;
              if (unreadCount > 0) unreadMap[conv.id] = unreadCount;
              return {
                ...conv,
                last_message: lastMsg?.message || '',
                last_timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
                unread_count: unreadCount,
              };
            } catch {
              return conv;
            }
          })
        );
        updatedConversations.sort((a, b) => b.last_timestamp - a.last_timestamp);
        setConversations(updatedConversations);
        setUnreadCounts(unreadMap);
      } catch (err) {
        // Silent fail for polling
      }
    }, 3000);

    return () => {
      if (convChannelRef.current) convChannelRef.current();
      clearInterval(pollInterval);
    };
  }, [sessionReady]);

  // ── 4.5 Global real-time message listener (all conversations) ─────────
  // Catches new/updated messages regardless of which conversation is
  // currently open, so the sidebar and open thread update instantly
  // without needing a manual reload or waiting for the 3s poll above.
  useEffect(() => {
    if (!sessionReady || !internalStaffId) return;

    const isClinicSender = (role) =>
      ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes((role || '').toLowerCase());

    const channel = supabase
      .channel('admin-consultations-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages' }, (payload) => {
        const newMsg = payload.new;
        const convId = newMsg.consultation_id;
        const isFromPatient = !isClinicSender(newMsg.sender_role);

        // Update sidebar: last message, timestamp, unread count, ordering
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === convId);
          if (idx === -1) return prev; // brand-new conv row hasn't landed yet — the consultations channel/poll will add it
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.last_message = newMsg.message;
          conv.last_timestamp = new Date(newMsg.created_at).getTime();
          if (isFromPatient && convId !== selectedConvIdRef.current) {
            conv.unread_count = (conv.unread_count || 0) + 1;
          }
          updated[idx] = conv;
          updated.sort((a, b) => (b.last_timestamp || 0) - (a.last_timestamp || 0));
          return updated;
        });

        if (isFromPatient && convId !== selectedConvIdRef.current) {
          setUnreadCounts(prev => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
        }

        // If it's for the currently open conversation, append instantly
        if (convId === selectedConvIdRef.current && !isSendingRef.current) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              ...newMsg,
              text: newMsg.message,
              timestamp: new Date(newMsg.created_at).getTime(),
              sender: isClinicSender(newMsg.sender_role) ? 'clinic' : 'patient',
              read_at: newMsg.read_at,
            }];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultation_messages' }, (payload) => {
        // Keeps the ✓✓ seen indicator accurate even if the (removed)
        // per-room channel hasn't resubscribed yet after switching threads.
        if (!payload.new?.read_at) return;
        if (payload.new.consultation_id !== selectedConvIdRef.current) return;
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m));
      })
      .subscribe();

    globalMsgChannelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [sessionReady, internalStaffId]);

  // ── 5. Subscribe to presence ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadPresence = async () => {
      try {
        const users = await consultationsService.getOnlineUsers();
        const presenceMap = {};
        users?.forEach(u => { presenceMap[u.user_id] = u; });
        setOnlinePresence(presenceMap);
      } catch (err) { console.error('Failed to load presence:', err); }
    };
    loadPresence();

    presenceChannelRef.current = consultationsService.subscribeToPresence((payload) => {
      if (payload.eventType === 'UPSERT') {
        setOnlinePresence(prev => ({ ...prev, [payload.new.user_id]: payload.new }));
      }
    });

    return () => {
      if (presenceChannelRef.current) presenceChannelRef.current();
    };
  }, [sessionReady]);

  // ── 6. Load messages (live updates now handled by the global channel above) ──
  useEffect(() => {
    if (!sessionReady) return;
    const loadMessages = async () => {
      if (!selectedConvId) { setMessages([]); return; }

      setLoadingMsgs(true);
      try {
        const data = await consultationsService.getMessagesByConsultationId(selectedConvId);
        // 🔴 FIXED: Classify styling based on the staff's internal ID, not the raw UID
        const formatted = (data || []).map(msg => ({
          ...msg,
          text: msg.message,
          timestamp: new Date(msg.created_at).getTime(),
          sender: ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes(msg.sender_role?.toLowerCase()) ? 'clinic' : 'patient',
          read_at: msg.read_at, // Include read_at for seen indicator
        }));
        setMessages(formatted);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMsgs(false);
      }
    };
    loadMessages();
    // 🟢 NOTE: per-room msgChannelRef/readChannel subscriptions were removed here —
    // the global channel (effect 4.5) now handles new-message and read-receipt
    // updates for every conversation, including whichever one is open.
  }, [selectedConvId, sessionReady]);

  useEffect(() => { setShowPatientPanel(false); }, [selectedConvId]);
  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Mark messages as read when viewing consultation ───────────────────
  useEffect(() => {
    const isEnded = conversations.find(c => c.id === selectedConvId)?.status === 'ended';
    if (selectedConvId && !isEnded && internalStaffId) {
      markMessagesAsRead();
    }
  }, [selectedConvId, messages, conversations, internalStaffId]);

  // ── Send Message ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    // 🔴 FIXED: Ensure the staff ID is fully loaded before allowing sends
    if (!selectedConvId || !messageInput.trim() || !internalStaffId) return;
    const text = messageInput.trim();
    setMessageInput('');
    isSendingRef.current = true; // Prevent realtime dupe
    try {
      await consultationsService.sendMessage(selectedConvId, {
        text,
        sender_id: internalStaffId, // 🔴 FIXED: Injects the secure Postgres Internal Table ID
        sender_name: currentUser.name || 'Clinic Staff',
        sender_role: currentUser.role || 'staff',
      });

      // Immediately fetch updated messages (force refresh to skip cache)
      const data = await consultationsService.getMessagesByConsultationId(selectedConvId, true);
      // Deduplicate by message ID
      const uniqueData = (data || []).reduce((acc, msg) => {
        if (!acc.some(m => m.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, []);
      const formatted = (uniqueData || []).map(msg => ({
        ...msg,
        text: msg.message,
        timestamp: new Date(msg.created_at).getTime(),
        sender: ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes(msg.sender_role?.toLowerCase()) ? 'clinic' : 'patient',
      }));
      setMessages(formatted);
    } catch (err) {
      console.error('Send error:', err);
      showToast('Failed to send message', 'error');
    } finally {
      isSendingRef.current = false; // Re-enable realtime
    }
  };

  // ── Mark messages as read ──────────────────────────────────────────────
  const markMessagesAsRead = async () => {
    const isEnded = conversations.find(c => c.id === selectedConvId)?.status === 'ended';
    if (!selectedConvId || !internalStaffId || isEnded) return;

    console.log('[Clinic] Marking messages as read for consultation:', selectedConvId, 'staffId:', internalStaffId);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${API_URL}/consultations/${selectedConvId}/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sender_id: internalStaffId,
          sender_role: currentUser?.role || 'doctor',
        }),
      });
      const result = await response.json();
      console.log('[Clinic] Marked messages as read result:', result);

      // Update unread counts - remove this conversation from the map
      if (result && result.length > 0) {
        setUnreadCounts(prev => {
          const newMap = { ...prev };
          delete newMap[selectedConvId];
          return newMap;
        });
        // Also update the conversation's unread_count
        setConversations(prev => prev.map(c =>
          c.id === selectedConvId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (err) {
      console.error('[Clinic] Error marking messages as read:', err);
    }
  };

  // ── End Consultation ──────────────────────────────────────────────────
  const handleEndConsultation = async () => {
    if (!selectedConvId) return;
    try {
      await consultationsService.endConsultation(selectedConvId);
      await consultationsService.sendMessage(selectedConvId, {
        text: "Consultation marked as complete by clinic staff.",
        sender_id: null,
        sender_name: "System",
        sender_role: "system",
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

  // ── Derived data ─────────────────────────────────────────────────────
  const selectedConv   = conversations.find(c => c.id === selectedConvId);
  const isConvEnded    = selectedConv?.status === 'ended';
  const patientId     = selectedConv?.patient_id;
  const patientProfile = patientProfiles[patientId] || {};
  const patientName    = patientProfile.first_name
    ? `${patientProfile.last_name || ''}, ${patientProfile.first_name || ''}`.trim()
    : selectedConv?.patient_name || 'Unknown';
  const isPatientOnline = onlinePresence[patientId]?.status === 'online';

  const onlineClinicStaff = Object.entries(onlinePresence)
    .filter(([uid, p]) => p.status === 'online' && uid !== internalStaffId && // 🔴 FIXED
      ['doctor','nurse','dentist','sysadmin','administrator'].includes(p.role?.toLowerCase()))
    .map(([, p]) => p.name || 'Staff');

  const visibleConversations = conversations.filter(conv => {
    // Filter by tab
    if (conv.consultation_type !== activeTab) return false;

    // Filter by status
    if (filterStatus === 'active' && conv.status === 'ended') return false;
    if (filterStatus === 'ended' && conv.status !== 'ended') return false;

    // Get profile for search
    const profile = patientProfiles[conv.patient_id] || {};

    // Filter by search term
    if (searchTerm) {
      const displayName = profile.first_name
        ? `${profile.last_name || ''}, ${profile.first_name || ''}`.trim()
        : conv.patient_name || '';
      const searchLower = searchTerm.toLowerCase();
      const matchesName = displayName.toLowerCase().includes(searchLower);
      const matchesId = (profile.university_id || '').toLowerCase().includes(searchLower);
      const matchesProgram = (profile.program || '').toLowerCase().includes(searchLower);
      if (!matchesName && !matchesId && !matchesProgram) return false;
    }

    return conv.last_message || conv.id === selectedConvId;
  }).sort((a, b) => {
    // Sort by last_timestamp: newest first (desc) or oldest first (asc)
    const timeA = a.last_timestamp || 0;
    const timeB = b.last_timestamp || 0;
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const unreadByTab = {};
  allowedTabs.forEach(tab => {
    unreadByTab[tab.key] = 0;
  });
  // Accumulate unread counts from conversations (using visibleConversations after it's defined)
  conversations.forEach(conv => {
    if (conv.consultation_type && conv.unread_count > 0) {
      unreadByTab[conv.consultation_type] = (unreadByTab[conv.consultation_type] || 0) + conv.unread_count;
    }
  });

  const handleOpenExamination = () => {
    if (!patientId) return;
    const person = {
      uid: patientId, name: patientName,
      firstName: patientProfile.first_name || '', lastName: patientProfile.last_name || '',
      id: patientProfile.university_id || patientProfile.student_id || patientId,
      role: patientProfile.role || '', prog: patientProfile.program || patientProfile.course || '',
      year: patientProfile.year_level || '', section: patientProfile.section || '',
      age: patientProfile.age || '', gender: patientProfile.gender || patientProfile.sex || '',
      birthdate: patientProfile.birthdate || '', email: patientProfile.email || '',
      phoneNumber: patientProfile.phone_number || '', department: patientProfile.department || '',
      _raw: patientProfile,
    };
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${patientId}`);
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
      <div className={`w-full md:w-1/3 border-r border-slate-200 flex-col flex-shrink-0 ${
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
                  if (selectedConv && selectedConv.consultation_type !== tab.key) setSelectedConvId(null);
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

        {/* Search and Filter */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 bg-white">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, ID, or program..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#466460] focus:bg-white transition"
              />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center text-sm font-bold"
            >
              {sortOrder === 'desc' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#466460]">
                  <path d="M3 5V15M3 15L8 10M3 15L-2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 10V2M9 2L14 7M9 2L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 13V3M3 3L8 8M3 3L-2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 8V16M9 16L14 11M9 16L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-[#466460] text-slate-600 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
            <p className="text-sm text-slate-400 flex items-center whitespace-nowrap">
              {visibleConversations.length} thread{visibleConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
              <i className="fa-regular fa-comment-dots text-5xl text-slate-200"></i>
              <p className="text-base">No {tabCfg.label.toLowerCase()} consultations yet</p>
              <p className="text-sm">Patients will appear here when they send a message</p>
            </div>
          ) : visibleConversations.map(conv => {
            const profile = patientProfiles[conv.patient_id] || {};
            const displayName = profile.first_name
              ? `${profile.last_name || ''}, ${profile.first_name || ''}`.trim()
              : conv.patient_name || 'Unknown';
            const initial  = displayName.charAt(0).toUpperCase();
            const isOnline = onlinePresence[conv.patient_id]?.status === 'online';
            const isActive = selectedConvId === conv.id;
            const tab = TABS.find(t => t.key === conv.consultation_type) || TABS[0];
            const isEnded = conv.status === 'ended';
            const unreadCount = conv.unread_count || 0;
            const hasUnread = unreadCount > 0 && !isEnded;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-[#f0f7f6] ${
                  isActive ? 'md:bg-gradient-to-r md:from-[#e0eceb] md:to-white md:border-l-4 md:border-l-[#466460]' : ''
                } ${hasUnread ? 'bg-yellow-50' : ''} ${isEnded ? 'opacity-70' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isEnded ? 'grayscale' : ''}`}
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
                    <p className={`font-bold text-base truncate flex items-center gap-2 ${hasUnread ? 'text-[#466460]' : 'text-slate-800'}`}>
                      {displayName}
                      {isEnded && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase">Ended</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {conv.last_timestamp ? formatTime(conv.last_timestamp) : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-slate-500 truncate">
                      {profile.university_id && `${profile.university_id} • `}
                      {profile.program && `${profile.program}`}
                      {profile.section && ` Sec ${profile.section}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRoleClass(conv.patient_role)}`}>
                      {conv.patient_role || 'patient'}
                    </span>
                    <p className={`text-sm truncate ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                      {conv.last_message || 'No messages'}
                    </p>
                  </div>
                </div>
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
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#466460] transition-colors flex-shrink-0 border border-slate-200"
              title="Close conversation"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {selectedConv ? (
              <>
                {(() => {
                  const t = TABS.find(tab => tab.key === selectedConv.consultation_type) || TABS[0];
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
                    {patientProfile.university_id && `${patientProfile.university_id} • `}
                    {patientProfile.program && `${patientProfile.program}`}
                    {patientProfile.section && ` Sec ${patientProfile.section}`}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isConvEnded
                      ? <span className="text-slate-500 font-semibold">● Session Ended</span>
                      : isPatientOnline
                        ? <span className="text-emerald-500 font-semibold">● Online</span>
                        : <span>● Offline</span>}
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
                  if (['system', 'bot', 'triage'].includes(item.sender_role?.toLowerCase())) {
                    return null;
                  }
                  const isClinic = item.sender === 'clinic';
                  return (
                    <div key={item.id} className={`flex flex-col ${isClinic ? 'items-end' : 'items-start'}`}>
                      {isClinic && (
                        <div className="flex items-center gap-1.5 mb-0.5 mr-2">
                          <p className="text-[9px] text-slate-400 font-semibold">{item.sender_name || 'Clinic Staff'}</p>
                          {item.sender_role && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold capitalize">
                              {item.sender_role}
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
                        {/* Seen indicator - only show for clinic messages */}
                        {isClinic && (
                          <span className={item.read_at ? 'text-blue-500' : ''} title={item.read_at ? `Seen at ${new Date(item.read_at).toLocaleString()}` : 'Sent'}>
                            {item.read_at ? '✓✓' : '✓'}
                          </span>
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

          {/* Input */}
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
              disabled={!selectedConvId || isConvEnded || !sessionReady}
              className="flex-1 border border-slate-200 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedConvId || !messageInput.trim() || isConvEnded || !sessionReady}
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
                  <p className="text-[10px] text-slate-400 mt-0.5">{patientProfile.university_id || patientProfile.student_id || '—'}</p>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${getRoleClass(patientProfile.role || selectedConv?.patient_role)}`}>
                    {patientProfile.role || selectedConv?.patient_role || 'patient'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Age',    value: patientProfile.age    || '—' },
                  { label: 'Gender', value: patientProfile.gender || patientProfile.sex || '—' },
                  { label: 'Blood',  value: patientProfile.blood_type || '—' },
                  { label: 'Civil',  value: patientProfile.civil_status || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {patientProfile.birthdate && (
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <p className="text-[8px] text-slate-400 uppercase tracking-wide">Birthdate</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{patientProfile.birthdate}</p>
                </div>
              )}

              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <i className="fa-solid fa-envelope text-[#466460] w-3"></i>
                    <span className="truncate">{patientProfile.email || '—'}</span>
                  </p>
                  {patientProfile.phone_number && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <i className="fa-solid fa-phone text-[#466460] w-3"></i>
                      {patientProfile.phone_number}
                    </p>
                  )}
                </div>
              </div>

              {(patientProfile.program || patientProfile.course || patientProfile.department) && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Program</p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {patientProfile.program || patientProfile.course || '—'}
                    {patientProfile.year_level ? ` · ${patientProfile.year_level}` : ''}
                    {patientProfile.section   ? ` · Sec ${patientProfile.section}` : ''}
                  </p>
                  {patientProfile.department && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{patientProfile.department}</p>
                  )}
                </div>
              )}

              {patientProfile.home_address && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Address</p>
                  <p className="text-[11px] text-slate-600">{patientProfile.home_address}</p>
                </div>
              )}

              {patientProfile.emergency_contact?.name && (
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {patientProfile.emergency_contact.name}
                    {patientProfile.emergency_contact.relationship
                      ? ` (${patientProfile.emergency_contact.relationship})` : ''}
                  </p>
                  {patientProfile.emergency_contact.phone && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <i className="fa-solid fa-phone text-[9px]"></i>
                      {patientProfile.emergency_contact.phone}
                    </p>
                  )}
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