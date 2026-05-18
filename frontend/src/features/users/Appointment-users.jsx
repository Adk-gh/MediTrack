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

// Exact same time slots from the Admin side
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

  // ── Modal / form state ──
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted,   setSubmitted]   = useState(false);

  // ── Multi-select purposes ──
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [otherPurpose,     setOtherPurpose]     = useState('');

  // ── Schedule selection ──
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

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

  // ── Checkbox toggle ──
  const togglePurpose = (purpose) => {
    setSelectedPurposes(prev =>
      prev.includes(purpose)
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose]
    );
  };

  // ── Helpers ──
  const getTodayString = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setSubmitError('');
    setSelectedPurposes([]);
    setOtherPurpose('');
    setSelectedDate('');
    setSelectedTime('');
  };

  // Disable submit if fields are missing
  const canSubmit =
    selectedPurposes.length > 0 &&
    !(selectedPurposes.includes('Other') && !otherPurpose.trim()) &&
    selectedDate !== '' &&
    selectedTime !== '';

  // ── Submit to Firestore ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    const parts = selectedPurposes.map(p =>
      p === 'Other' && otherPurpose.trim() ? `Other: ${otherPurpose.trim()}` : p
    );
    const reason = parts.join(', ');

    if (!canSubmit) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const [year, month, day] = selectedDate.split('-').map(Number);

    const payload = {
      ...currentPatient,
      reason,
      year,
      month,
      day,
      time: selectedTime
    };

    try {
      await submitRequest(payload);
      setShowModal(false);
      setSubmitted(true);
      setSelectedPurposes([]);
      setOtherPurpose('');
      setSelectedDate('');
      setSelectedTime('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error('[AppointmentUsers] submitRequest threw →', err);
      setSubmitError('Could not save your request. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Format the date label for the list view ──
  const formatApptDate = (appt) => {
    // If year/month/day/time exist, format them. Otherwise show pending generic text.
    if (!appt.year || !appt.time) {
       return 'Awaiting schedule from clinic';
    }
    const slotInfo = HOUR_SLOTS.find(s => s.value === appt.time);
    const timeLabel = slotInfo ? slotInfo.label : appt.time;
    const prefix = appt.status === 'pending' ? 'Requested for' : 'Scheduled for';

    return `${prefix}: ${MONTHS[appt.month - 1]} ${appt.day}, ${appt.year} at ${timeLabel}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f7faf8] overflow-hidden">

      {/* Success flash */}
      {submitted && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl
          text-[12px] font-semibold text-[#3B6D11] flex items-center gap-2">
          <i className="fa-solid fa-circle-check"></i>
          Request submitted! The clinic will review your preferred schedule.
        </div>
      )}

      {/* Content Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Fixed Upper Section (Action Row, Title) */}
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

          {/* Appointments list Header */}
          <div className="text-[13px] font-bold text-[#1a2e22]">My Appointment Requests</div>
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
                      ${isPending ? 'text-[#b07020]' : 'text-[#3B6D11]'}`}>
                      <i className={`mr-1 fa-solid ${isPending ? 'fa-hourglass-half' : 'fa-calendar-check'}`}></i>
                      {formatApptDate(appt)}
                    </div>
                    <div className="text-[10px] text-[#9bb5a5] mt-1">
                      <i className="fa-regular fa-clock mr-1"></i>
                      Submitted {new Date(appt.bookedAt).toLocaleString('en-PH', {
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pb-28 sm:p-6 sm:pb-6">
         <div className="w-full max-w-[520px] bg-white rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[92vh]">

            {/* Header — fixed, never scrolls */}
            <div className="bg-[#466460] px-6 py-5 text-white flex-shrink-0">
              <h3 className="font-serif text-xl tracking-wide">Request Appointment</h3>
              <p className="text-[12px] opacity-80 mt-1">
                Select your preferred date and time for the clinic to review.
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

              {/* Schedule Selection: Date and Time */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#466460] uppercase tracking-widest">
                  Preferred Schedule <span className="normal-case font-normal text-[#9bb5a5]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      min={getTodayString()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled={submitting}
                      className="w-full border border-[#ddeee5] rounded-2xl px-3.5 py-2.5 text-[12px] bg-[#f7faf8] outline-none text-[#1a2e22] focus:border-[#466460] transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      disabled={submitting}
                      className="w-full border border-[#ddeee5] rounded-2xl px-3.5 py-2.5 text-[12px] bg-[#f7faf8] outline-none text-[#1a2e22] focus:border-[#466460] transition-colors disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select Time Slot</option>
                      {HOUR_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Purpose — multi-select checkboxes */}
              <div className="flex flex-col gap-2 mt-1">
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
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 bg-[#FAEEDA] border border-[#f0c070]
                rounded-2xl px-4 py-3 text-[11px] text-[#854F0B]">
                <i className="fa-solid fa-circle-info mt-[1px] shrink-0 text-[13px]"></i>
                <span>
                  The clinic must review your preferred schedule. If approved, you will see it confirmed here. If your slot is full, the clinic may adjust your time.
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