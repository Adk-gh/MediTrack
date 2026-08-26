// C:\Users\HP\MediTrack\frontend\src\features\users\Appointment-users.jsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { supabase } from '../../supabase';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import BulkAppointmentPanel from './BulkAppointmentPanel';
import { formatUserDate } from '../../utils/dateFormat';
import { useTranslation } from 'react-i18next'; // <-- Imported i18next hook

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FACULTY_ROLES = ['faculty', 'lecturer', 'instructor', 'teacher', 'professor'];

const STATUS_STYLES = {
  Pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  Approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  Done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  Missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  Declined: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Declined' },
  Rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Rejected' },
  pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Rejected' },
};

// Simplified purpose list: two Face-to-Face options (can select both) and
// two Online options (mutually exclusive with everything else).
const PURPOSES_OPTS = [
  { value: 'Medical Check-up', key: 'medicalCheckup', mode: 'f2f' },
  { value: 'Dental Check-up', key: 'dentalCheckup', mode: 'f2f' },
  { value: 'Online Medical Examination', key: 'onlineMedical', mode: 'online' },
  { value: 'Online Dental Examination', key: 'onlineDental', mode: 'online' },
];

const ONLINE_PURPOSES = PURPOSES_OPTS.filter(p => p.mode === 'online').map(p => p.value);
const F2F_PURPOSES = PURPOSES_OPTS.filter(p => p.mode === 'f2f').map(p => p.value);

const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const startH = 7 + i;
  const endH   = startH + 1;
  const fmt = (h) => { const period = h >= 12 ? 'PM' : 'AM'; const hr = h % 12 || 12; return `${hr}:00 ${period}`; };
  return { value: `${String(startH).padStart(2, '0')}:00`, label: `${fmt(startH)} – ${fmt(endH)}` };
});

const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

const PullIndicator = ({ indicatorRef }) => (
  <div ref={indicatorRef} data-spin="false" style={{ overflow: 'hidden', height: 0, opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, opacity 0.2s ease' }}>
    <svg data-ptr-icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9" /></svg>
    <svg data-ptr-spin width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" style={{ animation: 'ptr-spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" strokeOpacity="0.2" /><path d="M12 3 a9 9 0 0 1 9 9" /></svg>
  </div>
);

// ── Custom Sort Dropdown ──
const SortDropdown = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const sortOptions = [
    { value: 'newest', label: t('records.newestFirst', 'Newest First') },
    { value: 'oldest', label: t('records.oldestFirst', 'Oldest First') },
  ];

  const currentLabel = sortOptions.find(o => o.value === value)?.label || t('common.sort', 'Sort');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1px solid #ddeee5', background: '#fff', color: '#1a5c3a', cursor: 'pointer', outline: 'none' }}
        className="flex items-center gap-2"
      >
        {currentLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1.5 bg-white border border-[#ddeee5] rounded-xl shadow-lg overflow-hidden z-50"
          style={{ minWidth: 140 }}
        >
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-[11px] font-semibold transition-colors ${
                value === opt.value ? 'bg-[#eef3f2] text-[#466460]' : 'text-[#1a2e22] hover:bg-[#f7faf8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Date Formatting Helpers ──
const formatDisplayDateWithMonth = (raw, preferences) => {
  if (!raw) return '—';
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

const formatDisplayDateWithMonthAndTime = (raw, preferences) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  const datePart = formatDisplayDateWithMonth(raw, preferences);
  const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
};

const formatTimeStringTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;

  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  }
  return timeStr;
};

function useCurrentPatient() {
  return useMemo(() => {
    try {
      const raw  = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user) return null;
      const buildFullName = (u) => {
        if (u.name && u.name !== '—') return u.name;
        if (u.fullName && u.fullName !== '—') return u.fullName;
        const first  = u.first_name  || u.firstName  || '';
        const middle = u.middle_name || u.middleName || '';
        const last   = u.last_name   || u.lastName   || '';
        return [first, middle, last].filter(Boolean).join(' ').trim() || '—';
      };
      const role = user.role || user.type || 'student';
      return {
        uid:       user.id || user.uid || null,
        token:     user.token || localStorage.getItem('token') || null,
        name:      buildFullName(user),
        idno:      user.university_id || user.universityId || user.student_id || user.idno || user.idNumber || '—',
        type:      role,
        dept:      user.department || user.dept    || user.college || '—',
        prog:      user.program    || user.classification || user.student_classification || user.course || '—',
        yearLevel: user.year_level || user.yearLevel || user.year || '—',
        section:   user.section    || user.sectionName || '—',
      };
    } catch { return null; }
  }, []);
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp - 30;
  } catch { return true; }
}

async function getFreshToken() {
  const accessToken  = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token') || '';
  if (!accessToken) return null;
  if (!isTokenExpired(accessToken)) return accessToken;
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data?.session) {
      const newAccess  = data.session.access_token;
      const newRefresh = data.session.refresh_token;
      localStorage.setItem('token', newAccess);
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
      try { supabase.realtime.setAuth(newAccess); } catch {}
      return newAccess;
    }
  } catch (err) {}
  return accessToken;
}

export default function AppointmentUsers() {
  const { t, i18n } = useTranslation();
  const currentPatient = useCurrentPatient();
  const isFaculty = useMemo(() => FACULTY_ROLES.includes((currentPatient?.type || '').toLowerCase()), [currentPatient?.type]);

  const [viewMode, setViewMode] = useState('personal');

  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppts,   setLoadingAppts]   = useState(true);
  const [userProfile,    setUserProfile]    = useState(null);
  const [hasRecords,     setHasRecords]     = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);
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

  const getInternalUserId = async () => {
    if (!currentPatient?.uid && !currentPatient?.idno) return null;
    if (currentPatient.uid) {
      const { data } = await supabase.from('users').select('id').eq('uid', currentPatient.uid).maybeSingle();
      if (data?.id) return data.id;
    }
    if (currentPatient.idno) {
      const { data } = await supabase.from('users').select('id').eq('university_id', currentPatient.idno).maybeSingle();
      if (data?.id) return data.id;
    }
    return null;
  };

  useEffect(() => {
    const checkRecords = async () => {
      const internalId = await getInternalUserId();
      if (!internalId) {
        setLoadingRecords(false);
        setHasRecords(false);
        return;
      }
      try {
        const { data: medicalData } = await supabase.from('medical_records').select('id, status').eq('user_id', internalId).eq('is_archived', false);
        const { data: dentalData } = await supabase.from('dental_records').select('id, status').eq('user_id', internalId).eq('is_archived', false);
        setHasRecords((medicalData && medicalData.length > 0) || (dentalData && dentalData.length > 0));
      } catch (err) {
        setHasRecords(false);
      } finally {
        setLoadingRecords(false);
      }
    };
    checkRecords();
  }, [currentPatient?.uid, currentPatient?.idno]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentPatient?.uid && !currentPatient?.idno) return;
      try {
        let profile = null;
        if (currentPatient.uid) {
          const { data } = await supabase.from('users').select('id, university_id, department, program, year_level, section, preferences').eq('uid', currentPatient.uid).maybeSingle();
          if (data) profile = data;
        }
        if (!profile && currentPatient.idno) {
          const { data } = await supabase.from('users').select('id, university_id, department, program, year_level, section, preferences').eq('university_id', currentPatient.idno).maybeSingle();
          if (data) profile = data;
        }
        if (profile) {
          setUserProfile(profile);
          if (profile.preferences) {
            setPreferences({
              language: profile.preferences.language || 'English',
              dateFormat: profile.preferences.dateFormat || 'MM/DD/YYYY',
            });
          }
        }
      } catch (err) {}
    };
    fetchUserProfile();
  }, [currentPatient?.uid, currentPatient?.idno]);

  const [showModal,         setShowModal]         = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [submitError,       setSubmitError]       = useState('');
  const [submitted,         setSubmitted]         = useState(false);
  const [selectedAppt,      setSelectedAppt]      = useState(null);
  const [selectedPurposes,  setSelectedPurposes]  = useState([]);
  const [sortBy,            setSortBy]            = useState('newest');

  const sortedAppointments = useMemo(() => {
    return myAppointments
      .filter((appt) => appt.is_archived !== true)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.bookedAt || 0);
        const dateB = new Date(b.created_at || b.bookedAt || 0);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [myAppointments, sortBy]);

  const fetchAppointments = useCallback(async () => {
    if (!currentPatient?.uid) return;
    try {
      setLoadingAppts(true);
      const token = await getFreshToken();
      const response = await axios.get(`${API_URL}/appointments/my-appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      if (response.data.success) {
        setMyAppointments(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching my appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentPatient]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const { scrollElRef, indicatorRef } = usePullToRefresh(fetchAppointments);

  if (!currentPatient) {
    return (
      <div className="flex flex-col h-full bg-[#f7faf8] items-center justify-center text-[#9bb5a5] text-[12px]">
        <i className="fa-solid fa-circle-exclamation text-2xl mb-2 text-[#f0c070]"></i>
        {t('appointments.loadingProfile', 'Could not load your profile. Please log in again.')}
      </div>
    );
  }

  const hasActiveAppointment = myAppointments.some((appt) => appt.status?.toLowerCase() === 'pending' || appt.status?.toLowerCase() === 'approved');

  // Is at least one Online purpose currently selected? Used to lock out
  // every other option (both F2F options and the other Online option).
  const hasOnlineSelected = selectedPurposes.some(p => ONLINE_PURPOSES.includes(p));
  // Is at least one F2F purpose currently selected? Used to lock out the
  // Online options (F2F options can freely stack with each other).
  const hasF2FSelected = selectedPurposes.some(p => F2F_PURPOSES.includes(p));

  const togglePurpose = (purpose) => {
    setSelectedPurposes(prev => {
      if (prev.includes(purpose)) return prev.filter(p => p !== purpose);
      // Selecting an Online purpose clears everything else and becomes
      // the sole selection (Online options are mutually exclusive).
      if (ONLINE_PURPOSES.includes(purpose)) return [purpose];
      // Selecting an F2F purpose drops any Online selection but can
      // stack with the other F2F purpose.
      return [...prev.filter(p => !ONLINE_PURPOSES.includes(p)), purpose];
    });
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setSubmitError('');
    setSelectedPurposes([]);
  };

  const canSubmit = selectedPurposes.length > 0;

const handleSubmit = async () => {
    const reason = selectedPurposes.join(', ');

    if (!canSubmit) { setSubmitError(t('appointments.errorFields', 'Please complete all required fields.')); return; }
    setSubmitting(true);
    setSubmitError('');

    const isDentalPurpose = selectedPurposes.includes('Dental Check-up') || selectedPurposes.includes('Online Dental Examination');
    const isOnlinePurpose = selectedPurposes.includes('Online Medical Examination') || selectedPurposes.includes('Online Dental Examination');
    const serviceType = isDentalPurpose
      ? (isOnlinePurpose ? 'Online Dental Consultation' : 'Dental Examination')
      : (isOnlinePurpose ? 'Online Medical Consultation' : 'Medical Consultation');

    const internalId = userProfile?.id || (await getInternalUserId());

    // --- ADD THIS MAPPING LOGIC ---
    let mappedType = currentPatient.type.toLowerCase();
    if (FACULTY_ROLES.includes(mappedType)) {
      mappedType = 'instructor';
    } else if (mappedType !== 'staff' && mappedType !== 'instructor') {
      mappedType = 'student'; // Fallback to ensure schema compliance
    }
    // ------------------------------

    const payload = {
      authUid: currentPatient.uid,
      userId: internalId,
      patientId: currentPatient.idno !== '—' ? currentPatient.idno : (currentPatient.uid || 'unknown'),
      patientName: currentPatient.name,
      name: currentPatient.name,
      type: mappedType, // <-- UPDATE THIS LINE TO USE THE MAPPED VALUE
      serviceType: serviceType,
      reason: reason
    };

    try {
      const token = await getFreshToken();
      const response = await axios.post(`${API_URL}/appointments`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        setShowModal(false);
        setSubmitted(true);
        setSelectedPurposes([]);
        fetchAppointments();
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (err) {
      console.error('Error submitting appointment request:', err);
      setSubmitError(err.response?.data?.message || t('appointments.errorSubmit', 'Could not save your appointment request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatApptDate = (appt) => {
    if (!appt.year || !appt.time) return t('appointments.awaitingSchedule', 'Awaiting schedule from clinic');
    const slotInfo  = HOUR_SLOTS.find(s => s.value === appt.time || s.label.includes(appt.time));
    const timeLabel = slotInfo ? slotInfo.label : formatTimeStringTo12Hour(appt.time);
    const statusStr = appt.status?.toLowerCase();

    let prefix = t('appointments.prefixes.scheduledFor', 'Scheduled for');
    if (statusStr === 'pending') prefix = t('appointments.prefixes.requestedFor', 'Requested for');
    if (statusStr === 'missed')  prefix = t('appointments.prefixes.missedOn', 'Missed on');
    if (statusStr === 'done')    prefix = t('appointments.prefixes.completedOn', 'Completed on');

    const dateStr = `${appt.year}-${String(appt.month).padStart(2, '0')}-${String(appt.day).padStart(2, '0')}`;
    const formattedDate = formatDisplayDateWithMonth(dateStr, preferences);

    return `${prefix}: ${formattedDate} at ${timeLabel}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] overflow-hidden">
      <style>{ptrStyles}</style>

      {/* ── GLOBAL BLOCK: No records? Hide everything! ── */}
      {!loadingRecords && !hasRecords ? (
        <div className="flex flex-col h-full bg-[#f7faf8] items-center justify-center p-8 flex-1">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E8EFEC] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#466460]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[#1a2e22] mb-2">{t('consultation.visitClinicFirst', 'Visit the Clinic First')}</h3>
            <p className="text-[13px] text-[#64748b]">{t('appointments.visitClinicDescAppt', 'Please proceed to the clinic for a face-to-face consultation to create your medical or dental record before requesting digital appointments.')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── CLEAN UNDERLINE TABS (Faculty Only) ── */}
          {isFaculty && (
            <div className="shrink-0 px-6 pt-4 bg-white border-b border-[#ddeee5]">
              <div className="flex gap-6 max-w-[800px] mx-auto w-full">
                <button
                  onClick={() => setViewMode('personal')}
                  className={`pb-3 text-[13px] font-bold border-b-[3px] transition-colors ${
                    viewMode === 'personal' ? 'border-[#466460] text-[#1a2e22]' : 'border-transparent text-[#9bb5a5] hover:text-[#6b8577]'
                  }`}
                >
                  {t('appointments.myAppointments', 'My Appointments')}
                </button>
                <button
                  onClick={() => setViewMode('bulk')}
                  className={`pb-3 text-[13px] font-bold border-b-[3px] transition-colors ${
                    viewMode === 'bulk' ? 'border-[#466460] text-[#1a2e22]' : 'border-transparent text-[#9bb5a5] hover:text-[#6b8577]'
                  }`}
                >
                  {t('appointments.classBulkRequests', 'Class Bulk Requests')}
                </button>
              </div>
            </div>
          )}

          {isFaculty && viewMode === 'bulk' ? (
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <BulkAppointmentPanel currentPatient={currentPatient} userProfile={userProfile} />
              </div>
            </div>
          ) : (
            <>
              {/* ── PERSONAL APPOINTMENTS VIEW ── */}
              {submitted && (
                <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl text-[12px] font-semibold text-[#3B6D11] flex items-center gap-2 animate-fadeIn">
                  <i className="fa-solid fa-circle-check"></i>
                  {t('appointments.requestSubmittedMsg', 'Request submitted! The clinic will review and assign your schedule.')}
                </div>
              )}

              <div className="shrink-0 p-5 pb-3 flex flex-col gap-4 max-w-[800px] w-full mx-auto">
                <div className="flex justify-end" title={hasActiveAppointment ? "You can only have one active appointment request at a time." : ""}>
                  <button
                    onClick={() => !hasActiveAppointment && setShowModal(true)}
                    disabled={hasActiveAppointment}
                    className={`border-none rounded-xl py-2 px-4 text-[12px] font-bold shadow-sm transition-all flex items-center gap-2 ${
                      hasActiveAppointment ? 'bg-[#9bb5a5] text-white cursor-not-allowed opacity-70' : 'bg-[#466460] text-white cursor-pointer hover:bg-[#364e4a]'
                    }`}
                  >
                    <i className="fa-solid fa-plus"></i> {t('consultation.requestAppointment', 'Request Appointment')}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-bold text-[#1a2e22]">{t('appointments.myAppointmentRequests', 'My Appointment Requests')}</div>
                  <SortDropdown value={sortBy} onChange={setSortBy} />
                </div>
              </div>

              <div ref={scrollElRef} className="flex-1 overflow-y-auto min-h-0 px-5 pb-5">
                <PullIndicator indicatorRef={indicatorRef} />
                <div className="max-w-[800px] w-full mx-auto">
                  {loadingAppts ? (
                    <div className="text-center py-8 text-[#9bb5a5] text-[12px]">
                      <i className="fa-solid fa-spinner fa-spin block text-2xl mb-2 text-[#c6dfd0]"></i>
                      {t('appointments.loadingAppointments', 'Loading your appointments…')}
                    </div>
                  ) : sortedAppointments.length === 0 ? (
                    <div className="text-center py-8 text-[#9bb5a5] text-[12px] bg-white border border-dashed border-[#ddeee5] rounded-2xl">
                      <i className="fa-regular fa-calendar block text-2xl mb-2 text-[#c6dfd0]"></i>
                      {t('appointments.noRequests', 'No appointment requests yet')}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sortedAppointments.map((appt) => {
                        const style      = STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending;
                        const statusStr  = appt.status?.toLowerCase();
                        const isApproved = statusStr === 'approved';
                        const isMissed   = statusStr === 'missed';
                        const isDone     = statusStr === 'done';
                        const isRejected = statusStr === 'rejected';
                        const stampDate  = appt.created_at || appt.bookedAt || new Date();

                        let cardClasses = 'bg-[#fffdf7] border-[#f0c070]';
                        if (isApproved) cardClasses = 'bg-[#e8f5ee] border-[#c6dfd0] hover:-translate-y-0.5 hover:shadow-md hover:border-[#4aab72]';
                        if (isMissed)   cardClasses = 'bg-[#fffbeb] border-[#fde68a]';
                        if (isDone)     cardClasses = 'bg-[#f8fafc] border-[#e2e8f0]';
                        if (isRejected) cardClasses = 'bg-[#fef2f2] border-[#fecaca] opacity-75';

                        let timeColor = 'text-[#b07020]';
                        if (isApproved) timeColor = 'text-[#3B6D11]';
                        if (isMissed)   timeColor = 'text-[#b45309]';
                        if (isDone)     timeColor = 'text-[#64748b]';
                        if (isRejected) timeColor = 'text-[#b91c1c]';

                        let timeIcon = 'fa-hourglass-half';
                        if (isApproved) timeIcon = 'fa-calendar-check';
                        if (isMissed)   timeIcon = 'fa-calendar-xmark';
                        if (isDone)     timeIcon = 'fa-check-double';
                        if (isRejected) timeIcon = 'fa-xmark-circle';

                        return (
                          <div key={appt.id} onClick={() => setSelectedAppt(appt)} className={`border rounded-2xl p-4 transition-all shrink-0 cursor-pointer ${cardClasses}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-bold text-[#1a2e22]">{appt.reason || appt.service_type}</div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {t(`appointments.status.${(appt.status || 'pending').toLowerCase()}`, style.label)}
                              </span>
                            </div>
                            <div className={`text-[12px] mt-1 font-medium ${timeColor}`}>
                              <i className={`mr-1 fa-solid ${timeIcon}`}></i>
                              {formatApptDate(appt)}
                            </div>
                            <div className="text-[10px] text-[#9bb5a5] mt-1.5">
                              <i className="fa-regular fa-clock mr-1"></i>
                              {t('common.submit', 'Submitted')} {formatDisplayDateWithMonthAndTime(stampDate, preferences)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── REQUEST MODAL ── */}
          {showModal && createPortal(
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 pb-28 sm:p-6 sm:pb-6" onClick={closeModal}>
              <div className="w-full max-w-[520px] bg-white rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
                <div className="bg-[#466460] px-6 py-5 text-white flex-shrink-0">
                  <h3 className="font-serif text-xl tracking-wide">{t('consultation.requestAppointment', 'Request Appointment')}</h3>
                  <p className="text-[12px] opacity-80 mt-1">{t('appointments.modalDesc', 'Submit your request and the clinic will assign a schedule for you.')}</p>
                </div>
                <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
                  <div className="bg-[#f4f8f7] border border-[#d0dedd] rounded-2xl px-4 py-3">
                    <div className="text-[10px] font-bold text-[#466460] uppercase tracking-widest mb-1.5">{t('appointments.bookingAs', 'Booking as')}</div>
                    <div className="text-[13px] font-semibold text-[#1a2e22]">{currentPatient.name}</div>
                    <div className="text-[11px] text-[#6b8577] mt-0.5 flex flex-wrap gap-1">
                      <span className="font-medium">{userProfile?.university_id || currentPatient.idno || t('appointments.idNotSet', 'ID Not Set')}</span>
                      {(userProfile?.program || currentPatient.prog) && <><span>·</span><span>{userProfile?.program || currentPatient.prog}</span></>}
                      {(userProfile?.department || currentPatient.dept) && <><span>·</span><span>{userProfile?.department || currentPatient.dept}</span></>}
                      {(userProfile?.section || currentPatient.section) && <><span>·</span><span>{t('appointments.sec', 'Sec')} {userProfile?.section || currentPatient.section}</span></>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-[#466460] uppercase tracking-widest">
                      {t('appointments.purpose', 'Purpose')}
                    </label>

                    {/* Face-to-Face group */}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-[#6b8577] uppercase tracking-wider">
                      <i className="fa-solid fa-hospital text-[10px]"></i>
                      {t('appointments.f2fLabel', 'Face-to-Face — can select both')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PURPOSES_OPTS.filter(p => p.mode === 'f2f').map(p => {
                        const checked = selectedPurposes.includes(p.value);
                        const disabled = submitting || (!checked && hasOnlineSelected);
                        return (
                          <label
                            key={p.key}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border cursor-pointer transition-all text-[12px] font-medium select-none ${
                              checked ? 'bg-[#eef3f2] border-[#466460] text-[#466460]' : 'bg-[#f7faf8] border-[#ddeee5] text-[#1a2e22] hover:border-[#9bb5a5] hover:bg-[#f0f5f4]'
                            } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-[#ddeee5] hover:bg-[#f7faf8]' : ''}`}
                          >
                            <span className={`flex-shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#466460] border-[#466460]' : 'bg-white border-[#c6dfd0]'}`}>
                              {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <input type="checkbox" className="sr-only" value={p.value} checked={checked} onChange={() => !disabled && togglePurpose(p.value)} disabled={disabled} />
                            {t(`appointments.purposes.${p.key}`, p.value)}
                          </label>
                        );
                      })}
                    </div>

                    {/* Online group */}
                    <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-[#6b8577] uppercase tracking-wider">
                      <i className="fa-solid fa-video text-[10px]"></i>
                      {t('appointments.onlineLabel', 'Online — choose one only')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PURPOSES_OPTS.filter(p => p.mode === 'online').map(p => {
                        const checked = selectedPurposes.includes(p.value);
                        const disabled = submitting || (!checked && (hasOnlineSelected || hasF2FSelected));
                        return (
                          <label
                            key={p.key}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border cursor-pointer transition-all text-[12px] font-medium select-none ${
                              checked ? 'bg-[#eef3f2] border-[#466460] text-[#466460]' : 'bg-[#f7faf8] border-[#ddeee5] text-[#1a2e22] hover:border-[#9bb5a5] hover:bg-[#f0f5f4]'
                            } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-[#ddeee5] hover:bg-[#f7faf8]' : ''}`}
                          >
                            <span className={`flex-shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#466460] border-[#466460]' : 'bg-white border-[#c6dfd0]'}`}>
                              {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <input type="checkbox" className="sr-only" value={p.value} checked={checked} onChange={() => !disabled && togglePurpose(p.value)} disabled={disabled} />
                            {t(`appointments.purposes.${p.key}`, p.value)}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#FAEEDA] border border-[#f0c070] rounded-2xl px-4 py-3 text-[11px] text-[#854F0B]">
                    <i className="fa-solid fa-circle-info mt-[1px] shrink-0 text-[13px]"></i>
                    <span>{t('appointments.infoNotice', 'After submitting, the clinic staff will review your request and assign an appointment date and time for you. You will see it confirmed here once approved.')}</span>
                  </div>
                  {submitError && (
                    <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-2xl px-4 py-3 text-[11px] text-[#dc2626]">
                      <i className="fa-solid fa-circle-exclamation mt-[1px] shrink-0 text-[13px]"></i>
                      <span>{submitError}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-[#ddeee5] bg-white flex-shrink-0">
                  <button onClick={closeModal} disabled={submitting} className="flex-1 bg-transparent border border-[#ddeee5] py-2.5 rounded-[40px] font-bold text-[12px] text-[#6b8577] cursor-pointer hover:bg-[#f0f5f4] hover:border-[#9bb5a5] transition-colors disabled:opacity-40">{t('common.cancel', 'Cancel')}</button>
                  <button onClick={handleSubmit} disabled={submitting || !canSubmit} className="flex-1 bg-[#466460] border-none py-2.5 rounded-[40px] font-bold text-[12px] text-white cursor-pointer hover:bg-[#364e4a] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                    {submitting ? <><i className="fa-solid fa-spinner fa-spin text-[10px]"></i> {t('common.saving', 'Saving…')}</> : t('appointments.submitRequest', 'Submit Request')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ── APPOINTMENT DETAILS MODAL ── */}
          {selectedAppt && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setSelectedAppt(null)}>
              <div className="w-full max-w-[420px] bg-white rounded-[24px] overflow-hidden shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <div className="bg-[#f7faf8] px-5 py-4 border-b border-[#eef2f6]">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[selectedAppt.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[selectedAppt.status]?.text || 'text-gray-600'}`}>
                      {t(`appointments.status.${(selectedAppt.status || 'pending').toLowerCase()}`, STATUS_STYLES[selectedAppt.status]?.label || selectedAppt.status || 'Pending')}
                    </span>
                    <button onClick={() => setSelectedAppt(null)} className="w-8 h-8 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:text-[#466460] hover:border-[#466460] transition-colors"><i className="fa-solid fa-xmark text-xs"></i></button>
                  </div>
                </div>
                <div className="px-5 py-4 border-b border-[#eef2f6]">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">{t('records.patientInformation', 'Patient Information')}</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[#466460] font-bold text-sm">{currentPatient.name?.charAt(0).toUpperCase() || '?'}</div>
                      <div>
                        <div className="text-sm font-bold text-[#1a2e22]">{currentPatient.name}</div>
                        <div className="text-xs text-[#64748b]">{currentPatient.type.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('profile.universityId', 'University ID')}</div><div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.university_id || currentPatient.idno || '—'}</div></div>
                      <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('profile.department', 'Department')}</div><div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.department || currentPatient.dept || '—'}</div></div>
                      <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('profile.program', 'Program')}</div><div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.program || currentPatient.prog || '—'}</div></div>
                      <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('profile.yearLevel', 'Year Level')}</div><div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.year_level || currentPatient.yearLevel || '—'}</div></div>
                      <div className="col-span-2"><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('profile.section', 'Section')}</div><div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.section || currentPatient.section || '—'}</div></div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">{t('appointments.appointmentDetails', 'Appointment Details')}</div>
                  <div className="space-y-3">
                    <div className={`rounded-xl p-4 text-center ${
                      selectedAppt.status?.toLowerCase() === 'approved' ? 'bg-[#E1F5EE] border border-[#466460]' : selectedAppt.status?.toLowerCase() === 'done' ? 'bg-[#f1f5f9] border border-[#e2e8f0]' : selectedAppt.status?.toLowerCase() === 'missed' ? 'bg-[#fef3c7] border border-[#fde68a]' : selectedAppt.status?.toLowerCase() === 'rejected' ? 'bg-[#fef2f2] border border-[#fecaca]' : 'bg-[#FAEEDA] border border-[#f0c070]'
                    }`}>
                      <div className="text-xs text-[#64748b] mb-1">
                        {selectedAppt.status?.toLowerCase() === 'pending' ? t('appointments.dates.requestedDate', 'Requested Date') : selectedAppt.status?.toLowerCase() === 'missed' ? t('appointments.dates.missedDate', 'Missed Date') : selectedAppt.status?.toLowerCase() === 'done' ? t('appointments.dates.completedDate', 'Completed Date') : selectedAppt.status?.toLowerCase() === 'rejected' ? t('appointments.dates.rejectedDate', 'Rejected Date') : t('appointments.dates.scheduledDate', 'Scheduled Date')}
                      </div>
                      <div className={`text-lg font-bold ${
                        selectedAppt.status?.toLowerCase() === 'approved' ? 'text-[#466460]' : selectedAppt.status?.toLowerCase() === 'done' ? 'text-[#64748b]' : selectedAppt.status?.toLowerCase() === 'missed' ? 'text-[#92400e]' : selectedAppt.status?.toLowerCase() === 'rejected' ? 'text-[#dc2626]' : 'text-[#854F0B]'
                      }`}>
                        {selectedAppt.year && selectedAppt.month && selectedAppt.day
                          ? formatDisplayDateWithMonth(`${selectedAppt.year}-${String(selectedAppt.month).padStart(2, '0')}-${String(selectedAppt.day).padStart(2, '0')}`, preferences)
                          : t('appointments.status.pending', 'Pending')}
                      </div>
                      {selectedAppt.time && selectedAppt.year && (
                        <div className={`text-sm font-medium mt-1 ${
                          selectedAppt.status?.toLowerCase() === 'approved' ? 'text-[#466460]' : selectedAppt.status?.toLowerCase() === 'done' ? 'text-[#64748b]' : selectedAppt.status?.toLowerCase() === 'missed' ? 'text-[#92400e]' : selectedAppt.status?.toLowerCase() === 'rejected' ? 'text-[#dc2626]' : 'text-[#854F0B]'
                        }`}>
                          {(() => {
                            const slotInfo = HOUR_SLOTS.find(s => s.value === selectedAppt.time || s.label.includes(selectedAppt.time));
                            return slotInfo ? slotInfo.label : formatTimeStringTo12Hour(selectedAppt.time);
                          })()}
                        </div>
                      )}
                    </div>
                    <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('appointments.purpose', 'Purpose')}</div><div className="text-sm font-semibold text-[#1a2e22] mt-1">{selectedAppt.reason || selectedAppt.service_type || '—'}</div></div>
                    {selectedAppt.service_type && <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('appointments.serviceType', 'Service Type')}</div><div className="text-sm font-semibold text-[#1a2e22] mt-1">{selectedAppt.service_type}</div></div>}
                    <div><div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('common.submit', 'Submitted')}</div><div className="text-sm font-semibold text-[#1a2e22] mt-1">{selectedAppt.created_at ? formatDisplayDateWithMonthAndTime(selectedAppt.created_at, preferences) : '—'}</div></div>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-[#eef2f6] bg-[#f7faf8]">
                  <button onClick={() => setSelectedAppt(null)} className="w-full py-3 bg-white border border-[#e2e8f0] rounded-xl text-sm font-bold text-[#466460] hover:bg-[#E1F5EE] hover:border-[#466460] transition-colors">{t('common.close', 'Close')}</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}