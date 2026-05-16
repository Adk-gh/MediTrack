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
        firstName:     user.firstName ?? '',
        lastName:      user.lastName ?? '',
        middleInitial: user.middleInitial ?? user.middleName ?? '',
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

  // ── Multi-select purposes ──
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

  // ── Check if patient already has an active appointment ──
  const hasActiveAppointment = myAppointments.some(
    (appt) => appt.status === 'pending' || appt.status === 'approved'
  );

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
    const parts = selectedPurposes.map(p =>
      p === 'Other' && otherPurpose.trim() ? `Other: ${otherPurpose.trim()}` : p
    );
    const reason = parts.join(', ');

    if (!reason) {
      setSubmitError('Please select at least one purpose before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

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
    <div className="flex flex-col h-full bg-[#f7faf8] overflow-hidden">

      {/* Success flash */}
      {submitted && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl
          text-[12px] font-semibold text-[#3B6D11] flex items-center gap-2">
          <i className="fa-solid fa-circle-check"></i>
          Request submitted! The clinic will assign your schedule soon.
        </div>
      )}

      {/* Content Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Fixed Upper Section (Action Row, Calendar, Title) */}
        <div className="shrink-0 p-5 pb-3 flex flex-col gap-4">

          {/* Action row */}
          <div
            className="flex justify-end"
            title={hasActiveAppointment ? "You can only have one active appointment at a time. Please wait for the clinic to complete your current appointment." : ""}
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

          {/* Calendar */}
          <div className="bg-white border border-[#ddeee5] rounded-3xl p-3.5 relative z-10">
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
                      ${isToday ? 'bg-[#466460] text-white font-bold' : 'text-[#1a2e22] hover:bg-[#e8f5ee]'}
                      ${hasAppt ? 'cursor-default' : ''}`}
                    onMouseEnter={() => hasAppt && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {day}

                    {/* Dot indicator */}
                    {hasAppt && (
                      <span className={`absolute bottom-[2px] left-1/2 -translate-x-1/2
                        w-[5px] h-[5px] rounded-full ${isToday ? 'bg-white' : 'bg-[#466460]'}`} />
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
              <span className="w-[7px] h-[7px] rounded-full bg-[#466460] inline-block"></span>
              Approved appointment — hover to see count
            </div>
          </div>

          {/* Appointments list Header */}
          <div className="text-[13px] font-bold text-[#1a2e22] mt-1">My Appointment Requests</div>
        </div>

        {/* Scrollable Appointments List Section */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5">
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
                    className={`border rounded-3xl p-3 transition-all shrink-0
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
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

            {/* Header — fixed, never scrolls */}
            <div className="bg-[#466460] px-6 py-5 text-white flex-shrink-0">
              <h3 className="font-serif text-xl tracking-wide">Request Appointment</h3>
              <p className="text-[12px] opacity-80 mt-1">
                The clinic will assign your date &amp; time after review.
              </p>
            </div>

            {/* Scrollable body */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">

              {/* Patient info — read-only */}
              <div className="bg-[#f4f8f7] border border-[#d0dedd] rounded-2xl px-4 py-3">
                <div className="text-[10px] font-bold text-[#466460] uppercase tracking-widest mb-1.5">Booking as</div>
                <div className="text-[13px] font-semibold text-[#1a2e22]">{currentPatient.name}</div>
                <div className="text-[11px] text-[#6b8577] mt-0.5">
                  {currentPatient.idno}
                  {currentPatient.prog && currentPatient.prog !== '—' ? ` · ${currentPatient.prog}` : ''}
                  {currentPatient.dept && currentPatient.dept !== '—' ? ` · ${currentPatient.dept}` : ''}
                </div>
              </div>

              {/* Purpose — multi-select checkboxes */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#466460] uppercase tracking-widest">
                  Purpose <span className="normal-case font-normal text-[#9bb5a5]">* select all that apply</span>
                </label>

                {/* Two-column grid on desktop, single column on mobile */}
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
                          }
                          ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {/* Custom checkbox */}
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all
                            ${checked
                              ? 'bg-[#466460] border-[#466460]'
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
                    className="mt-1 border border-[#ddeee5] rounded-2xl px-3.5 py-2.5 text-[12px]
                      bg-[#f7faf8] outline-none resize-none disabled:opacity-50
                      focus:border-[#466460] transition-colors"
                    rows="2"
                  />
                )}

                {/* Selected summary pills */}
                {selectedPurposes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedPurposes.map(p => (
                      <span key={p}
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#466460] text-white">
                        {p === 'Other' && otherPurpose ? `Other: ${otherPurpose}` : p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 bg-[#FAEEDA] border border-[#f0c070]
                rounded-2xl px-4 py-3 text-[11px] text-[#854F0B]">
                <i className="fa-solid fa-circle-info mt-[1px] shrink-0 text-[13px]"></i>
                <span>
                  You don't need to pick a date — the clinic will schedule you
                  and you'll see the confirmed date &amp; time here once approved.
                </span>
              </div>

              {/* Firestore error */}
              {submitError && (
                <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca]
                  rounded-2xl px-4 py-3 text-[11px] text-[#dc2626]">
                  <i className="fa-solid fa-circle-exclamation mt-[1px] shrink-0 text-[13px]"></i>
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Footer — fixed, never scrolls */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#ddeee5] bg-white flex-shrink-0">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 bg-transparent border border-[#ddeee5] py-2.5 rounded-[40px]
                  font-bold text-[12px] text-[#6b8577] cursor-pointer hover:bg-[#f0f5f4]
                  hover:border-[#9bb5a5] transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="flex-1 bg-[#466460] border-none py-2.5 rounded-[40px] font-bold
                  text-[12px] text-white cursor-pointer hover:bg-[#364e4a]
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