// C:\Users\HP\MediTrack\frontend\src\features\users\Appointment-users.jsx
import React, { useState, useMemo } from 'react';
import { useAppointments } from '../../context/AppointmentContext';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLES = {
  pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  approved: { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', label: 'Approved' },
  done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
};

const PURPOSES = [
  'Check-up', 'Consultation', 'Vaccination',
  'Dental', 'Medical Clearance', 'Physical Exam', 'Other',
];

const WEEKDAYS_SHORT = ['S','M','T','W','T','F','S'];

function buildCalendarDays(year, month) {
  return {
    firstDay:    new Date(year, month - 1, 1).getDay(),
    daysInMonth: new Date(year, month, 0).getDate(),
  };
}

// ── Read the logged-in user from localStorage ─────────────────────────────────
function useCurrentPatient() {
  return useMemo(() => {
    try {
      const raw  = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user) return null;

      const buildFullName = (u) => {
        // Already combined
        if (u.name && u.name !== '—')         return u.name;
        if (u.fullName && u.fullName !== '—') return u.fullName;

        const first  = u.firstName ?? '';
        const middle = u.middleName ?? u.middleInitial ?? '';
        const last   = u.lastName ?? '';

        const mi   = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
        const full = [first, mi, last].filter(Boolean).join(' ').trim();
        return full || '—';
      };

      const role = user.role ?? user.type ?? 'student';

      return {
        name:          buildFullName(user),
        // Add these three lines so the database receives the separated fields:
        firstName:     user.firstName ?? '',
        lastName:      user.lastName ?? '',
        middleInitial: user.middleInitial ?? user.middleName ?? '',
        // -------------------------------------------------------------------
        idno:          user.universityId ?? user.idno ?? user.idNumber ?? '—',
        type:          role,
        dept:          user.department ?? user.dept ?? user.college ?? '—',
        prog:          user.classification ?? user.program ?? user.course ?? user.prog ?? '—',
        section:       user.section ?? user.yearSection ?? (role === 'lecturer' ? 'N/A' : '—'),
      };
    } catch {
      return null;
    }
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AppointmentUsers() {
  const { submitRequest, getPatientAppointments, loadingAppts } = useAppointments();
  const currentPatient = useCurrentPatient();

  // ── Calendar nav ──
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);

  // ── Calendar tooltip hover state ──
  const [hoveredDay, setHoveredDay] = useState(null);

  // ── Modal / form state ──
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted,   setSubmitted]   = useState(false);

  // ── Now an array for multi-select ──
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [otherPurpose,     setOtherPurpose]     = useState('');

  // ── Guard: if no logged-in user, show nothing useful ──
  if (!currentPatient) {
    return (
      <div className="flex flex-col h-full bg-[#f7faf8] items-center justify-center text-[#9bb5a5] text-[12px]">
        <i className="fa-solid fa-circle-exclamation text-2xl mb-2 text-[#f0c070]"></i>
        Could not load your profile. Please log in again.
      </div>
    );
  }

  // ── Patient's own appointments ──
  const myAppointments = getPatientAppointments(currentPatient.idno)
    .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

  // ── Calendar ──
  const changeMonth = (dir) => {
    let m = calMonth + dir, y = calYear;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setCalMonth(m); setCalYear(y);
    setHoveredDay(null);
  };

  const { firstDay, daysInMonth } = buildCalendarDays(calYear, calMonth);

  // Build a map: day → count of approved appointments on that day
  const approvedCountByDay = useMemo(() => {
    const map = {};
    myAppointments
      .filter(a => a.status === 'approved' && a.year === calYear && a.month === calMonth)
      .forEach(a => { map[a.day] = (map[a.day] ?? 0) + 1; });
    return map;
  }, [myAppointments, calYear, calMonth]);

  // ── Checkbox toggle ──
  const togglePurpose = (purpose) => {
    setSelectedPurposes(prev =>
      prev.includes(purpose)
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose]
    );
  };

  // ── Submit to Firestore ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Build the reason string from all selected checkboxes
    const parts = selectedPurposes.map(p =>
      p === 'Other' && otherPurpose.trim() ? `Other: ${otherPurpose.trim()}` : p
    );
    const reason = parts.join(', ');

    // Guard: show a visible error instead of silently returning
    if (!reason) {
      setSubmitError('Please select at least one purpose before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    // Build the full payload and log it so you can verify in DevTools
    const payload = { ...currentPatient, reason };
    console.log('[AppointmentUsers] submitRequest payload →', payload);

    try {
      const newId = await submitRequest(payload);
      console.log('[AppointmentUsers] saved OK, Firestore ID →', newId);

      setShowModal(false);
      setSubmitted(true);
      setSelectedPurposes([]);
      setOtherPurpose('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error('[AppointmentUsers] submitRequest threw →', err);
      setSubmitError('Could not save your request. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setSubmitError('');
    setSelectedPurposes([]);
    setOtherPurpose('');
  };

  // Disable submit if: no purposes selected, or "Other" selected but no text
  const canSubmit =
    selectedPurposes.length > 0 &&
    !(selectedPurposes.includes('Other') && !otherPurpose.trim());

  const formatApptDate = (appt) => {
    if (appt.status === 'pending') return 'Awaiting schedule from clinic';
    return `${MONTHS[appt.month - 1]} ${appt.day}, ${appt.year} at ${appt.time}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f7faf8]">

      {/* Success flash */}
      {submitted && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl
          text-[12px] font-semibold text-[#3B6D11] flex items-center gap-2">
          <i className="fa-solid fa-circle-check"></i>
          Request submitted! The clinic will assign your schedule soon.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

        {/* Action row */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#1a5c3a] text-white border-none rounded-2xl py-2 px-3.5 text-xs
              font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#2d7a52] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Request Appointment
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white border border-[#ddeee5] rounded-3xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#1a2e22]">
              {MONTHS[calMonth - 1]} {calYear}
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => changeMonth(-1)}
                className="w-6 h-6 border border-[#ddeee5] rounded-lg bg-white cursor-pointer text-[#6b8577] text-xs">
                &#8249;
              </button>
              <button onClick={() => changeMonth(1)}
                className="w-6 h-6 border border-[#ddeee5] rounded-lg bg-white cursor-pointer text-[#6b8577] text-xs">
                &#8250;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <span key={i} className="text-center text-[10px] font-bold text-[#9bb5a5] uppercase py-0.5">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = today.getFullYear() === calYear
                && (today.getMonth() + 1) === calMonth
                && today.getDate() === day;
              const apptCount = approvedCountByDay[day] ?? 0;
              const hasAppt   = apptCount > 0;
              const isHovered = hoveredDay === day;

              return (
                <div
                  key={day}
                  className={`relative text-center py-1.5 text-xs font-medium rounded-2xl
                    ${isToday ? 'bg-[#2d7a52] text-white font-bold' : 'text-[#1a2e22] hover:bg-[#e8f5ee]'}
                    ${hasAppt ? 'cursor-default' : ''}`}
                  onMouseEnter={() => hasAppt && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {day}

                  {/* Dot indicator */}
                  {hasAppt && (
                    <span className={`absolute bottom-[2px] left-1/2 -translate-x-1/2
                      w-[5px] h-[5px] rounded-full ${isToday ? 'bg-white' : 'bg-[#1D9E75]'}`} />
                  )}

                  {/* Hover tooltip */}
                  {hasAppt && isHovered && (
                    <div
                      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5
                        bg-[#1a2e22] text-white text-[9.5px] font-semibold
                        px-2 py-1 rounded-lg whitespace-nowrap shadow-lg
                        pointer-events-none"
                      style={{ minWidth: '80px' }}
                    >
                      <i className="fa-solid fa-calendar-check mr-1 text-[#4aab72]"></i>
                      {apptCount} approved {apptCount === 1 ? 'appt' : 'appts'}
                      {/* Arrow */}
                      <span
                        className="absolute top-full left-1/2 -translate-x-1/2"
                        style={{
                          width: 0, height: 0,
                          borderLeft: '5px solid transparent',
                          borderRight: '5px solid transparent',
                          borderTop: '5px solid #1a2e22',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#9bb5a5]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#1D9E75] inline-block"></span>
            Approved appointment — hover to see count
          </div>
        </div>

        {/* Appointments list */}
        <div className="text-[13px] font-bold text-[#1a2e22]">My Appointment Requests</div>

        {loadingAppts ? (
          <div className="text-center py-8 text-[#9bb5a5] text-[12px]">
            <i className="fa-solid fa-spinner fa-spin block text-2xl mb-2 text-[#c6dfd0]"></i>
            Loading your appointments…
          </div>
        ) : myAppointments.length === 0 ? (
          <div className="text-center py-8 text-[#9bb5a5] text-[12px]">
            <i className="fa-regular fa-calendar block text-2xl mb-2 text-[#c6dfd0]"></i>
            No appointment requests yet
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myAppointments.map((appt) => {
              const style     = STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending;
              const isPending = appt.status === 'pending';

              return (
                <div key={appt.id}
                  className={`border rounded-3xl p-3 transition-all
                    ${isPending
                      ? 'bg-[#fffdf7] border-[#f0c070]'
                      : 'bg-[#e8f5ee] border-[#c6dfd0] hover:-translate-y-0.5 hover:shadow-md hover:border-[#4aab72]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[#1a2e22]">{appt.reason}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className={`text-[11px] mt-1 font-medium
                    ${isPending ? 'text-[#b07020] italic' : 'text-[#3B6D11]'}`}>
                    <i className={`mr-1 fa-solid ${isPending ? 'fa-hourglass-half' : 'fa-calendar-check'}`}></i>
                    {formatApptDate(appt)}
                  </div>
                  <div className="text-[10px] text-[#9bb5a5] mt-1">
                    <i className="fa-regular fa-clock mr-1"></i>
                    Requested {new Date(appt.bookedAt).toLocaleString('en-PH', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[3000] flex items-center justify-center">
          <div className="w-[300px] max-w-[88%] bg-white rounded-[28px] overflow-hidden shadow-2xl">

            <div className="bg-[#1a5c3a] px-5 py-4 text-white">
              <h3 className="font-serif text-lg">Request Appointment</h3>
              <p className="text-[11px] opacity-80 mt-1">
                The clinic will assign your date &amp; time after review.
              </p>
            </div>

            <div className="p-5 flex flex-col gap-4">

              {/* Patient info — pulled from real auth, read-only */}
              <div className="bg-[#f7faf8] border border-[#ddeee5] rounded-2xl px-3 py-2.5">
                <div className="text-[10px] font-bold text-[#2d7a52] uppercase tracking-wide mb-1">Booking as</div>
                <div className="text-[12px] font-semibold text-[#1a2e22]">{currentPatient.name}</div>
                <div className="text-[10px] text-[#6b8577]">
                  {currentPatient.idno} &middot; {currentPatient.prog} &middot; {currentPatient.dept}
                </div>
              </div>

              {/* Purpose — multi-select checkboxes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#2d7a52] uppercase tracking-wide">
                  Purpose * <span className="normal-case font-normal text-[#9bb5a5]">(select all that apply)</span>
                </label>
                <div className="flex flex-col gap-2 mt-1">
                  {PURPOSES.map(p => {
                    const checked = selectedPurposes.includes(p);
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer
                          transition-all text-xs font-medium select-none
                          ${checked
                            ? 'bg-[#e8f5ee] border-[#4aab72] text-[#1a5c3a]'
                            : 'bg-[#f7faf8] border-[#ddeee5] text-[#1a2e22] hover:border-[#9bb5a5]'
                          }
                          ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {/* Custom checkbox visual */}
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all
                            ${checked
                              ? 'bg-[#1a5c3a] border-[#1a5c3a]'
                              : 'bg-white border-[#c6dfd0]'
                            }`}
                        >
                          {checked && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          value={p}
                          checked={checked}
                          onChange={() => !submitting && togglePurpose(p)}
                          disabled={submitting}
                        />
                        {p}
                      </label>
                    );
                  })}
                </div>

                {/* "Other" textarea */}
                {selectedPurposes.includes('Other') && (
                  <textarea
                    placeholder="Please elaborate here..."
                    value={otherPurpose}
                    onChange={e => setOtherPurpose(e.target.value)}
                    disabled={submitting}
                    className="mt-1 border border-[#ddeee5] rounded-2xl px-3 py-2.5 text-xs
                      bg-[#f7faf8] outline-none resize-none disabled:opacity-50
                      focus:border-[#4aab72] transition-colors"
                    rows="2"
                  />
                )}

                {/* Selected summary pill */}
                {selectedPurposes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPurposes.map(p => (
                      <span key={p}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#1a5c3a] text-white">
                        {p === 'Other' && otherPurpose ? `Other: ${otherPurpose}` : p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 bg-[#FAEEDA] border border-[#f0c070]
                rounded-2xl px-3 py-2 text-[10.5px] text-[#854F0B]">
                <i className="fa-solid fa-circle-info mt-[1px] shrink-0"></i>
                <span>
                  You don't need to pick a date — the clinic will schedule you
                  and you'll see the confirmed date &amp; time here once approved.
                </span>
              </div>

              {/* Firestore error */}
              {submitError && (
                <div className="flex items-start gap-2 bg-[#fef2f2] border border-[#fecaca]
                  rounded-2xl px-3 py-2 text-[10.5px] text-[#dc2626]">
                  <i className="fa-solid fa-circle-exclamation mt-[1px] shrink-0"></i>
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 p-5 border-t border-[#ddeee5] bg-white">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 bg-transparent border border-[#ddeee5] py-2.5 rounded-[40px]
                  font-bold text-xs text-[#6b8577] cursor-pointer hover:bg-[#e8f5ee]
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="flex-1 bg-[#1a5c3a] border-none py-2.5 rounded-[40px] font-bold
                  text-xs text-white cursor-pointer hover:bg-[#2d7a52]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all
                  flex items-center justify-center gap-1.5"
              >
                {submitting
                  ? <><i className="fa-solid fa-spinner fa-spin text-[10px]"></i> Saving…</>
                  : 'Submit Request'
                }
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}