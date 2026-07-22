// C:\Users\HP\MediTrack\frontend\src\features\users\Appointment-users.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../../supabase';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// ── Define API URL from environment variables ─────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLES = {
  Pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  Approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  Done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  Missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  Declined: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Declined' },
  pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  declined: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Declined' },
};

const PURPOSES = [
  'Check-up', 'Consultation', 'Vaccination',
  'Dental', 'Medical Clearance', 'Physical Exam', 'Other',
];

const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const startH = 7 + i;
  const endH   = startH + 1;
  const fmt = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hr     = h % 12 || 12;
    return `${hr}:00 ${period}`;
  };
  return {
    value: `${String(startH).padStart(2, '0')}:00`,
    label: `${fmt(startH)} – ${fmt(endH)}`,
  };
});

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

    {/* Spinner — shown while fetchAppointments() is awaiting */}
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

// ── Read the logged-in user from localStorage ─────────────────────────────────
function useCurrentPatient() {
  return useMemo(() => {
    try {
      const raw  = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user) return null;

      const buildFullName = (u) => {
        if (u.name && u.name !== '—')         return u.name;
        if (u.fullName && u.fullName !== '—') return u.fullName;
        const first  = u.first_name  || u.firstName  || '';
        const middle = u.middle_name || u.middleName || '';
        const last   = u.last_name   || u.lastName   || '';
        const full   = [first, middle, last].filter(Boolean).join(' ').trim();
        return full || '—';
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
    } catch {
      return null;
    }
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AppointmentUsers() {
  const currentPatient = useCurrentPatient();

  // ── Database State ──
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppts,   setLoadingAppts]   = useState(true);
  const [userProfile,    setUserProfile]    = useState(null);

  // ── Fetch user profile from database ──
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentPatient?.uid && !currentPatient?.idno) {
        console.log('[AppointmentUsers] No uid or idno, skipping profile fetch');
        return;
      }
      console.log('[AppointmentUsers] Fetching profile for uid:', currentPatient.uid, 'idno:', currentPatient.idno);
      try {
        let profile = null;

        // First try by id (UUID)
        if (currentPatient.uid) {
          const { data, error } = await supabase
            .from('users')
            .select('id, university_id, department, program, year_level, section')
            .eq('id', currentPatient.uid)
            .maybeSingle();

          if (error) {
            console.error('[AppointmentUsers] Error fetching user profile by id:', error);
          } else if (data) {
            profile = data;
            console.log('[AppointmentUsers] User profile fetched by id:', profile);
          }
        }

        // If not found by id, try fallback by university_id
        if (!profile && currentPatient.idno) {
          const { data, error } = await supabase
            .from('users')
            .select('id, university_id, department, program, year_level, section')
            .eq('university_id', currentPatient.idno)
            .maybeSingle();

          if (error) {
            console.error('[AppointmentUsers] Error fetching user profile by university_id:', error);
          } else if (data) {
            profile = data;
            console.log('[AppointmentUsers] User profile fetched by university_id:', profile);
          }
        }

        if (profile) {
          setUserProfile(profile);
        } else {
          console.log('[AppointmentUsers] No user profile found in database');
        }
      } catch (err) {
        console.error('[AppointmentUsers] Error in fetchUserProfile:', err);
      }
    };

    fetchUserProfile();
  }, [currentPatient?.uid, currentPatient?.idno]);

  // ── Modal / Form State ──
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted,   setSubmitted]   = useState(false);

  // ── Appointment Detail Modal State ──
  const [selectedAppt, setSelectedAppt] = useState(null);

  // ── Multi-select Purposes ──
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [otherPurpose,     setOtherPurpose]     = useState('');

  // ── Sort State ──
  const [sortBy, setSortBy] = useState('newest');

  // ── Sorted Appointments ──
  const sortedAppointments = useMemo(() => {
    return [...myAppointments].sort((a, b) => {
      const dateA = new Date(a.created_at || a.bookedAt || 0);
      const dateB = new Date(b.created_at || b.bookedAt || 0);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [myAppointments, sortBy]);

  // ── Fetch appointments — extracted so PTR can call it directly ────────────
  const fetchAppointments = useCallback(async () => {
    if (!currentPatient?.uid) {
      console.log('[AppointmentUsers] No uid in currentPatient');
      return;
    }
    try {
      setLoadingAppts(true);
      console.log('[AppointmentUsers] Fetching appointments for:', currentPatient.uid);
      const response = await axios.get(`${API_URL}/appointments/my-appointments`, {
        headers: {
          'Authorization': `Bearer ${currentPatient.token}`,
          'x-user-uid':    currentPatient.uid,
        },
      });
      console.log('[AppointmentUsers] Response:', response.data);
      if (response.data.success) {
        setMyAppointments(response.data.data);
        console.log('[AppointmentUsers] Got appointments:', response.data.data?.length);
      }
    } catch (err) {
      console.error('[AppointmentUsers] Fetch error:', err);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentPatient]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Pull-to-refresh — re-runs fetchAppointments on release ───────────────
  const { scrollElRef, indicatorRef } = usePullToRefresh(fetchAppointments);

  // ── Guard: Profile check ──────────────────────────────────────────────────
  if (!currentPatient) {
    return (
      <div className="flex flex-col h-full bg-[#f7faf8] items-center justify-center text-[#9bb5a5] text-[12px]">
        <i className="fa-solid fa-circle-exclamation text-2xl mb-2 text-[#f0c070]"></i>
        Could not load your profile. Please log in again.
      </div>
    );
  }

  const hasActiveAppointment = myAppointments.some(
    (appt) => appt.status?.toLowerCase() === 'pending' || appt.status?.toLowerCase() === 'approved'
  );

  const togglePurpose = (purpose) => {
    setSelectedPurposes(prev =>
      prev.includes(purpose) ? prev.filter(p => p !== purpose) : [...prev, purpose]
    );
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setSubmitError('');
    setSelectedPurposes([]);
    setOtherPurpose('');
  };

  const canSubmit =
    selectedPurposes.length > 0 &&
    !(selectedPurposes.includes('Other') && !otherPurpose.trim());

  const handleSubmit = async () => {
    const parts = selectedPurposes.map(p =>
      p === 'Other' && otherPurpose.trim() ? `Other: ${otherPurpose.trim()}` : p
    );
    const reason = parts.join(', ');

    if (!canSubmit) { setSubmitError('Please complete all required fields.'); return; }

    setSubmitting(true);
    setSubmitError('');

    const serviceType = selectedPurposes.includes('Dental') ? 'Dental Examination' : 'Medical Consultation';

    // ── UPDATED PAYLOAD TO MATCH ZOD SCHEMA EXACTLY ──
    // Use userProfile.id if available (the correct UUID from users table), otherwise fall back to currentPatient values
    const payload = {
      user_id: userProfile?.id || currentPatient.uid || null,
      patientId: currentPatient.idno !== '—' ? currentPatient.idno : (currentPatient.uid || 'unknown'),
      name: currentPatient.name,
      type: currentPatient.type.toLowerCase(), // Ensures it matches the "student" enum
      serviceType: serviceType,
      reason: reason
    };

    try {
      console.log('[AppointmentUsers] Submitting appointment with payload:', payload);
      const response = await axios.post(`${API_URL}/appointments`, payload, {
        headers: {
          'Authorization': `Bearer ${currentPatient.token}`,
          'x-user-uid':    currentPatient.uid,
        },
      });

      if (response.data.success) {
        setShowModal(false);
        setSubmitted(true);
        setSelectedPurposes([]);
        setOtherPurpose('');
        fetchAppointments();
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (err) {
      console.error('[AppointmentUsers] Request error:', err);
      setSubmitError(err.response?.data?.message || 'Could not save your appointment request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatApptDate = (appt) => {
    if (!appt.year || !appt.time) return 'Awaiting schedule from clinic';
    const slotInfo  = HOUR_SLOTS.find(s => s.value === appt.time || s.label.includes(appt.time));
    const timeLabel = slotInfo ? slotInfo.label : appt.time;
    const statusStr = appt.status?.toLowerCase();
    let prefix = 'Scheduled for';
    if (statusStr === 'pending') prefix = 'Requested for';
    if (statusStr === 'missed')  prefix = 'Missed on';
    if (statusStr === 'done')    prefix = 'Completed on';
    return `${prefix}: ${MONTHS[appt.month - 1]} ${appt.day}, ${appt.year} at ${timeLabel}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] overflow-hidden">
      <style>{ptrStyles}</style>

      {/* Success alert */}
      {submitted && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl
          text-[12px] font-semibold text-[#3B6D11] flex items-center gap-2 animate-fadeIn">
          <i className="fa-solid fa-circle-check"></i>
          Request submitted! The clinic will review and assign your schedule.
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Top action bar — not part of the scroll area, so PTR won't fire here */}
        <div className="shrink-0 p-5 pb-3 flex flex-col gap-4">
          <div
            className="flex justify-end"
            title={hasActiveAppointment ? "You can only have one active appointment request at a time." : ""}
          >
            <button
              onClick={() => !hasActiveAppointment && setShowModal(true)}
              disabled={hasActiveAppointment}
              className={`border-none rounded-2xl py-2 px-3.5 text-xs font-semibold flex items-center gap-1 transition-colors ${
                hasActiveAppointment
                  ? 'bg-[#9bb5a5] text-white cursor-not-allowed opacity-70'
                  : 'bg-[#466460] text-white cursor-pointer hover:bg-[#364e4a]'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Request Appointment
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-[#1a2e22]">My Appointment Requests</div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                border: '1px solid #ddeee5', background: '#fff', color: '#1a5c3a',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* ── Scrollable list — PTR listeners live here ── */}
        <div
          ref={scrollElRef}
          className="flex-1 overflow-y-auto min-h-0 px-5 pb-5"
        >
          {/* PTR indicator — must be first child */}
          <PullIndicator indicatorRef={indicatorRef} />

          {loadingAppts ? (
            <div className="text-center py-8 text-[#9bb5a5] text-[12px]">
              <i className="fa-solid fa-spinner fa-spin block text-2xl mb-2 text-[#c6dfd0]"></i>
              Loading your appointments…
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="text-center py-8 text-[#9bb5a5] text-[12px]">
              <i className="fa-regular fa-calendar block text-2xl mb-2 text-[#c6dfd0]"></i>
              No appointment requests yet
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedAppointments.map((appt) => {
                const style      = STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending;
                const statusStr  = appt.status?.toLowerCase();
                const isApproved = statusStr === 'approved';
                const isMissed   = statusStr === 'missed';
                const isDone     = statusStr === 'done';
                const isDeclined = statusStr === 'declined';
                const stampDate  = appt.created_at || appt.bookedAt || new Date();

                let cardClasses = 'bg-[#fffdf7] border-[#f0c070]';
                if (isApproved) cardClasses = 'bg-[#e8f5ee] border-[#c6dfd0] hover:-translate-y-0.5 hover:shadow-md hover:border-[#4aab72]';
                if (isMissed)   cardClasses = 'bg-[#fffbeb] border-[#fde68a]';
                if (isDone)     cardClasses = 'bg-[#f8fafc] border-[#e2e8f0]';
                if (isDeclined) cardClasses = 'bg-[#fef2f2] border-[#fecaca] opacity-75';

                let timeColor = 'text-[#b07020]';
                if (isApproved) timeColor = 'text-[#3B6D11]';
                if (isMissed)   timeColor = 'text-[#b45309]';
                if (isDone)     timeColor = 'text-[#64748b]';
                if (isDeclined) timeColor = 'text-[#dc2626]';

                let timeIcon = 'fa-hourglass-half';
                if (isApproved) timeIcon = 'fa-calendar-check';
                if (isMissed)   timeIcon = 'fa-calendar-xmark';
                if (isDone)     timeIcon = 'fa-check-double';
                if (isDeclined) timeIcon = 'fa-xmark-circle';

                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`border rounded-3xl p-3 transition-all shrink-0 cursor-pointer ${cardClasses}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#1a2e22]">{appt.reason || appt.service_type}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                    <div className={`text-[11px] mt-1 font-medium ${timeColor}`}>
                      <i className={`mr-1 fa-solid ${timeIcon}`}></i>
                      {formatApptDate(appt)}
                    </div>
                    <div className="text-[10px] text-[#9bb5a5] mt-1">
                      <i className="fa-regular fa-clock mr-1"></i>
                      Submitted {new Date(stampDate).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Submission Request Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pb-28 sm:p-6 sm:pb-6"
          onClick={closeModal}
        >
          <div className="w-full max-w-[520px] bg-white rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[92vh]" onClick={(e) => e.stopPropagation()}>

            <div className="bg-[#466460] px-6 py-5 text-white flex-shrink-0">
              <h3 className="font-serif text-xl tracking-wide">Request Appointment</h3>
              <p className="text-[12px] opacity-80 mt-1">Submit your request and the clinic will assign a schedule for you.</p>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
              <div className="bg-[#f4f8f7] border border-[#d0dedd] rounded-2xl px-4 py-3">
                <div className="text-[10px] font-bold text-[#466460] uppercase tracking-widest mb-1.5">Booking as</div>
                <div className="text-[13px] font-semibold text-[#1a2e22]">{currentPatient.name}</div>
                <div className="text-[11px] text-[#6b8577] mt-0.5 flex flex-wrap gap-1">
                  <span className="font-medium">{userProfile?.university_id || currentPatient.idno || 'ID Not Set'}</span>
                  {(userProfile?.program || currentPatient.prog) && <><span>·</span><span>{userProfile?.program || currentPatient.prog}</span></>}
                  {(userProfile?.department || currentPatient.dept) && <><span>·</span><span>{userProfile?.department || currentPatient.dept}</span></>}
                  {(userProfile?.section || currentPatient.section) && <><span>·</span><span>Sec {userProfile?.section || currentPatient.section}</span></>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#466460] uppercase tracking-widest">
                  Purpose <span className="normal-case font-normal text-[#9bb5a5]">* select all that apply</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {PURPOSES.map(p => {
                    const checked = selectedPurposes.includes(p);
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border cursor-pointer
                          transition-all text-[12px] font-medium select-none
                          ${checked
                            ? 'bg-[#eef3f2] border-[#466460] text-[#466460]'
                            : 'bg-[#f7faf8] border-[#ddeee5] text-[#1a2e22] hover:border-[#9bb5a5] hover:bg-[#f0f5f4]'
                          } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`flex-shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all
                          ${checked ? 'bg-[#466460] border-[#466460]' : 'bg-white border-[#c6dfd0]'}`}
                        >
                          {checked && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <input type="checkbox" className="sr-only" value={p} checked={checked}
                          onChange={() => !submitting && togglePurpose(p)} disabled={submitting} />
                        {p}
                      </label>
                    );
                  })}
                </div>

                {selectedPurposes.includes('Other') && (
                  <textarea
                    placeholder="Please elaborate here..."
                    value={otherPurpose}
                    onChange={e => setOtherPurpose(e.target.value)}
                    disabled={submitting}
                    className="mt-1 border border-[#ddeee5] rounded-2xl px-3.5 py-2.5 text-[12px] bg-[#f7faf8] outline-none resize-none disabled:opacity-50 focus:border-[#466460] transition-colors"
                    rows="2"
                  />
                )}
              </div>

              <div className="flex items-start gap-2.5 bg-[#FAEEDA] border border-[#f0c070] rounded-2xl px-4 py-3 text-[11px] text-[#854F0B]">
                <i className="fa-solid fa-circle-info mt-[1px] shrink-0 text-[13px]"></i>
                <span>After submitting, the clinic staff will review your request and assign an appointment date and time for you. You will see it confirmed here once approved.</span>
              </div>

              {submitError && (
                <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-2xl px-4 py-3 text-[11px] text-[#dc2626]">
                  <i className="fa-solid fa-circle-exclamation mt-[1px] shrink-0 text-[13px]"></i>
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#ddeee5] bg-white flex-shrink-0">
              <button onClick={closeModal} disabled={submitting}
                className="flex-1 bg-transparent border border-[#ddeee5] py-2.5 rounded-[40px] font-bold text-[12px] text-[#6b8577] cursor-pointer hover:bg-[#f0f5f4] hover:border-[#9bb5a5] transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting || !canSubmit}
                className="flex-1 bg-[#466460] border-none py-2.5 rounded-[40px] font-bold text-[12px] text-white cursor-pointer hover:bg-[#364e4a] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                {submitting ? <><i className="fa-solid fa-spinner fa-spin text-[10px]"></i> Saving…</> : 'Submit Request'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Appointment Detail Modal ── */}
      {selectedAppt && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedAppt(null)}
        >
          <div className="w-full max-w-[420px] bg-white rounded-[24px] overflow-hidden shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Header with Status Badge */}
            <div className="bg-[#f7faf8] px-5 py-4 border-b border-[#eef2f6]">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[selectedAppt.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[selectedAppt.status]?.text || 'text-gray-600'}`}>
                  {STATUS_STYLES[selectedAppt.status]?.label || selectedAppt.status || 'Pending'}
                </span>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:text-[#466460] hover:border-[#466460] transition-colors"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            {/* Patient Information */}
            <div className="px-5 py-4 border-b border-[#eef2f6]">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">Patient Information</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[#466460] font-bold text-sm">
                    {currentPatient.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1a2e22]">{currentPatient.name}</div>
                    <div className="text-xs text-[#64748b]">Student</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">University ID</div>
                    <div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.university_id || currentPatient.idno || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Department</div>
                    <div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.department || currentPatient.dept || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Program</div>
                    <div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.program || currentPatient.prog || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Year Level</div>
                    <div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.year_level || currentPatient.yearLevel || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Section</div>
                    <div className="text-sm font-semibold text-[#1a2e22]">{userProfile?.section || currentPatient.section || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="px-5 py-4">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">Appointment Details</div>
              <div className="space-y-3">
                {/* Highlighted Date */}
                <div className={`rounded-xl p-4 text-center ${
                  selectedAppt.status?.toLowerCase() === 'approved'
                    ? 'bg-[#E1F5EE] border border-[#466460]'
                    : selectedAppt.status?.toLowerCase() === 'done'
                      ? 'bg-[#f1f5f9] border border-[#e2e8f0]'
                      : selectedAppt.status?.toLowerCase() === 'missed'
                        ? 'bg-[#fef3c7] border border-[#fde68a]'
                        : selectedAppt.status?.toLowerCase() === 'declined'
                          ? 'bg-[#fef2f2] border border-[#fecaca]'
                          : 'bg-[#FAEEDA] border border-[#f0c070]'
                }`}>
                  <div className="text-xs text-[#64748b] mb-1">
                    {selectedAppt.status?.toLowerCase() === 'pending' ? 'Requested Date' :
                     selectedAppt.status?.toLowerCase() === 'missed' ? 'Missed Date' :
                     selectedAppt.status?.toLowerCase() === 'done' ? 'Completed Date' :
                     selectedAppt.status?.toLowerCase() === 'declined' ? 'Declined Date' : 'Scheduled Date'}
                  </div>
                  <div className={`text-lg font-bold ${
                    selectedAppt.status?.toLowerCase() === 'approved' ? 'text-[#466460]' :
                    selectedAppt.status?.toLowerCase() === 'done' ? 'text-[#64748b]' :
                    selectedAppt.status?.toLowerCase() === 'missed' ? 'text-[#92400e]' :
                    selectedAppt.status?.toLowerCase() === 'declined' ? 'text-[#dc2626]' : 'text-[#854F0B]'
                  }`}>
                    {selectedAppt.year && selectedAppt.month
                      ? `${MONTHS[selectedAppt.month - 1]} ${selectedAppt.day}, ${selectedAppt.year}`
                      : 'No Date Set'}
                  </div>
                  {selectedAppt.time && (
                    <div className={`text-sm font-medium mt-1 ${
                      selectedAppt.status?.toLowerCase() === 'approved' ? 'text-[#466460]' :
                      selectedAppt.status?.toLowerCase() === 'done' ? 'text-[#64748b]' :
                      selectedAppt.status?.toLowerCase() === 'missed' ? 'text-[#92400e]' :
                      selectedAppt.status?.toLowerCase() === 'declined' ? 'text-[#dc2626]' : 'text-[#854F0B]'
                    }`}>
                      {(() => {
                        const [h, m] = selectedAppt.time.split(':').map(Number);
                        const period = h >= 12 ? 'PM' : 'AM';
                        const hr = h % 12 || 12;
                        return `${hr}:${String(m).padStart(2, '0')} ${period}`;
                      })()}
                    </div>
                  )}
                </div>

                {/* Reason/Purpose */}
                <div>
                  <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Purpose</div>
                  <div className="text-sm font-semibold text-[#1a2e22] mt-1">{selectedAppt.reason || selectedAppt.service_type || '—'}</div>
                </div>

                {/* Service Type */}
                {selectedAppt.service_type && (
                  <div>
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Service Type</div>
                    <div className="text-sm font-semibold text-[#1a2e22] mt-1">{selectedAppt.service_type}</div>
                  </div>
                )}

                {/* Submitted Date */}
                <div>
                  <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Submitted</div>
                  <div className="text-sm font-semibold text-[#1a2e22] mt-1">
                    {selectedAppt.created_at
                      ? new Date(selectedAppt.created_at).toLocaleString('en-PH', {
                          month: 'long', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="px-5 py-4 border-t border-[#eef2f6] bg-[#f7faf8]">
              <button
                onClick={() => setSelectedAppt(null)}
                className="w-full py-3 bg-white border border-[#e2e8f0] rounded-xl text-sm font-bold text-[#466460] hover:bg-[#E1F5EE] hover:border-[#466460] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}