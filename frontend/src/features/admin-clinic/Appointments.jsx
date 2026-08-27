// frontend/src/features/admin-clinic/Appointments.jsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAppointments } from '../../context/AppointmentContext';
import { supabase } from '../../supabase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';
import Datepicker from '../../components/Datepicker';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

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
    hour: startH,
  };
});

// Recommended capacity per 1-hour slot
const RECOMMENDED_SLOT_CAPACITY = 10;

// Purpose options offered when staff create an appointment directly.
// Staff-created appointments are always face-to-face, so both may be selected.
const STAFF_PURPOSES_OPTS = [
  { value: 'Medical Check-up', key: 'medicalCheckup' },
  { value: 'Dental Check-up', key: 'dentalCheckup' },
];

// Quick-fill suggestions for the free-text reason field on staff-created appointments.
const STAFF_REASON_SUGGESTIONS = ['Follow-up Checkup', 'Walk-in', 'Referral', 'Re-evaluation'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr     = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${period}`;
};

// ── Normalize Patient Data for Examination Modal ──────────────────────────────
const normalizePatientData = (uid, d) => {
  const firstName     = d.firstName    || d.first_name     || '';
  const lastName      = d.lastName     || d.last_name      || '';
  const middleName    = d.middleName   || d.middle_name    || '';
  const suffix        = d.suffix       || '';
  const universityId  = d.universityId || d.university_id || d.studentId || d.student_id || '';

  const name = lastName
    ? `${lastName}, ${firstName} ${middleName} ${suffix}`.trim()
    : firstName || '—';

  return {
    uid, name, firstName, lastName, middleName, suffix,
    id:               universityId || uid,
    universityId,
    studentId:        d.studentId  || d.student_id   || universityId || '',
    role:             d.role       || '',
    prog:             d.program    || d.course       || '',
    program:          d.program    || d.course       || '',
    year:             d.yearLevel  || d.year_level   || '',
    yearLevel:        d.yearLevel  || d.year_level   || '',
    section:          d.section    || '',
    age:              d.age        || '',
    gender:           d.gender     || d.sex          || '',
    sex:              d.gender     || d.sex          || '',
    birthdate:        d.birthday   || d.birthdate    || '',
    birthday:         d.birthday   || d.birthdate    || '',
    email:            d.email      || '',
    phoneNumber:      d.phoneNumber || d.phone_number || d.contact_no || '',
    department:       d.department || '',
    jobTitle:         d.jobTitle   || d.job_title    || '',
    classification:   d.classification || '',
    homeAddress:      d.homeAddress || d.home_address || d.address || '',
    religion:         d.religion   || '',
    nationality:      d.nationality || '',
    civilStatus:      d.civilStatus || d.civil_status || '',
    bloodType:        d.bloodType  || d.blood_type   || '',
    emergencyContact: d.emergencyContact || d.emergency_contact || {
      name: '', relationship: '', phone: '', address: ''
    },
    vaccinations: d.vaccinations || {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
    dentalHistory: d.dentalHistory || d.dental_history || {},
  };
};

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const IconChevronLeft = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="8,2 4,6 8,10"/>
  </svg>
);

const IconChevronRight = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="4,2 8,6 4,10"/>
  </svg>
);

const IconChevronUp = ({ size = 11, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="2,8 6,4 10,8"/>
  </svg>
);

const IconChevronDown = ({ size = 11, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="2,4 6,8 10,4"/>
  </svg>
);

const IconCheck = ({ size = 9, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 9 7" fill="none" stroke="white"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 3.5L3.5 6L8 1"/>
  </svg>
);

const IconCircleCheck = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <path d="M5 8l2 2 4-4"/>
  </svg>
);

const IconCircleExclamation = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="8" y1="5" x2="8" y2="8.5"/>
    <circle cx="8" cy="11" r="0.5" fill={color}/>
  </svg>
);

const IconClock = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <polyline points="8,4.5 8,8 10.5,10"/>
  </svg>
);

const IconCalendar = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1.5" y="2.5" width="13" height="12" rx="2"/>
    <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
    <line x1="5" y1="1" x2="5" y2="4"/>
    <line x1="11" y1="1" x2="11" y2="4"/>
  </svg>
);

const IconCalendarCheck = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1.5" y="2.5" width="13" height="12" rx="2"/>
    <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
    <line x1="5" y1="1" x2="5" y2="4"/>
    <line x1="11" y1="1" x2="11" y2="4"/>
    <path d="M5.5 10.5l1.5 1.5 3-3"/>
  </svg>
);

const IconCalendarXmark = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="3.5" width="20" height="18" rx="3"/>
    <line x1="2" y1="9.5" x2="22" y2="9.5"/>
    <line x1="7" y1="1.5" x2="7" y2="5.5"/>
    <line x1="17" y1="1.5" x2="17" y2="5.5"/>
    <line x1="9" y1="14" x2="15" y2="19"/>
    <line x1="15" y1="14" x2="9" y2="19"/>
  </svg>
);

const IconInbox = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22,12 16,12 14,15 10,15 8,12 2,12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

const IconMagnifyingGlass = ({ size = 28, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="22" y2="22"/>
  </svg>
);

const IconUser = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="5" r="3"/>
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
  </svg>
);

const IconIdCard = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1" y="3.5" width="14" height="9" rx="2"/>
    <circle cx="5.5" cy="8" r="1.5"/>
    <line x1="8.5" y1="6.5" x2="13" y2="6.5"/>
    <line x1="8.5" y1="9.5" x2="13" y2="9.5"/>
  </svg>
);

const IconTag = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M13.5 8.5l-5-5H2v6.5l5 5 6.5-6.5z"/>
    <circle cx="5.5" cy="5.5" r="1"/>
  </svg>
);

const IconBuilding = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="1.5" width="12" height="13" rx="1"/>
    <line x1="2" y1="6" x2="14" y2="6"/>
    <line x1="2" y1="10" x2="14" y2="10"/>
    <line x1="6" y1="6" x2="6" y2="14.5"/>
    <line x1="10" y1="6" x2="10" y2="14.5"/>
  </svg>
);

const IconGraduationCap = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="8,2 15,6 8,10 1,6"/>
    <path d="M4 7.5v3.5c0 1.7 1.8 3 4 3s4-1.3 4-3V7.5"/>
    <line x1="15" y1="6" x2="15" y2="10"/>
  </svg>
);

const IconUsers = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="6" cy="5" r="2.5"/>
    <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
    <circle cx="11.5" cy="5" r="2"/>
    <path d="M13.5 13c0-1.9-1-3.5-2.5-4.3"/>
  </svg>
);

const IconStethoscope = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 2.5c0 3 2.5 5 5 5s5-2 5-5"/>
    <line x1="3" y1="2.5" x2="3" y2="5"/>
    <line x1="13" y1="2.5" x2="13" y2="5"/>
    <path d="M13 7.5a3.5 3.5 0 010 7h-1a3.5 3.5 0 01-3.5-3.5V10"/>
    <circle cx="13" cy="13.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IconVideo = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1.5" y="3.5" width="9.5" height="9" rx="2" />
    <polygon points="11,6.5 14.5,4.5 14.5,11.5 11,9.5" fill="currentColor" />
  </svg>
);

const IconXmark = ({ size = 12, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" {...props}>
    <line x1="2" y1="2" x2="10" y2="10"/>
    <line x1="10" y1="2" x2="2" y2="10"/>
  </svg>
);

const IconCircleInfo = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="8" y1="7" x2="8" y2="11"/>
    <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const IconUserClock = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="7" cy="5" r="3.5"/>
    <path d="M1 15c0-3.3 2.7-6 6-6"/>
    <circle cx="15" cy="10" r="4"/>
    <polyline points="15,8 15,10.5 16.5,12"/>
  </svg>
);

const IconBanCircle = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/>
  </svg>
);

const IconCircleXmark = ({ size = 14, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="8" r="7"/>
    <line x1="5.5" y1="5.5" x2="10.5" y2="10.5"/>
    <line x1="10.5" y1="5.5" x2="5.5" y2="10.5"/>
  </svg>
);

const IconPlus = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="8" y1="2" x2="8" y2="14"/>
    <line x1="2" y1="8" x2="14" y2="8"/>
  </svg>
);

// ── Groups a list of appointments so members sharing a batch_id collapse into a single group entry ──
const groupByBatch = (list) => {
  const seen = new Set();
  const result = [];
  list.forEach((a) => {
    if (a.batch_id) {
      if (seen.has(a.batch_id)) return;
      seen.add(a.batch_id);
      const members = list.filter((x) => x.batch_id === a.batch_id);
      result.push({
        __isBatchGroup: true,
        batchId:  a.batch_id,
        bookedBy: a.booked_by || '',
        reason:   a.reason,
        bookedAt: a.bookedAt,
        members,
      });
    } else {
      result.push(a);
    }
  });
  return result;
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-7 left-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-xl
    text-white text-[15px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.2)]
    transition-transform duration-400 font-['DM_Sans',sans-serif]
    ${visible ? 'translate-x-[-50%] translate-y-0' : 'translate-x-[-50%] translate-y-[80px]'}
    ${type === 'success'
      ? 'bg-gradient-to-br from-[#166534] to-[#15803d]'
      : type === 'warning'
        ? 'bg-gradient-to-br from-[#92400e] to-[#b45309]'
        : 'bg-gradient-to-br from-[#991b1b] to-[#dc2626]'}`}
  >
    {type === 'success'
      ? <IconCircleCheck size={16} color="white" />
      : type === 'warning'
        ? <IconCircleExclamation size={16} color="white" />
        : <IconCircleExclamation size={16} color="white" />
    }
    {message}
  </div>
);

const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/45 backdrop-blur-[3px] flex justify-center items-end sm:items-center z-[40]"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    {children}
  </div>
);

// ── Examination Modal Component ───────────────────────────────────────────────
const ExaminationModal = ({ isOpen, onClose, patient, examType, setExamType, onExamSubmitted, resetKey, currentUserRole }) => {
  const [loading, setLoading] = useState(true);
  const [normalizedPatient, setNormalizedPatient] = useState(null);
  const [schoolYear, setSchoolYear] = useState(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    if (currentMonth >= 7) return `${currentYear}-${currentYear + 1}`;
    return `${currentYear - 1}-${currentYear}`;
  });
  const [semester, setSemester] = useState(() => {
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 7 && currentMonth <= 11) return '1st Semester';
    if (currentMonth >= 0 && currentMonth <= 4) return '2nd Semester';
    return 'Mid Year';
  });

  const schoolYearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - 5 + i;
    return `${y}-${y + 1}`;
  });

  const userRole = String(currentUserRole || '').toLowerCase().trim();
  const canDoMedical = ['nurse', 'doctor', 'physician', 'sysadmin', 'administrator'].includes(userRole);
  const canDoDental = ['dentist', 'sysadmin', 'administrator'].includes(userRole);

  const availableTabs = [
    { key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' },
    { key: 'dental', icon: 'fa-tooth', label: 'Dental Examination' },
  ].filter(tab => {
    if (tab.key === 'medical') return canDoMedical;
    if (tab.key === 'dental') return canDoDental;
    return true;
  });

  useEffect(() => {
    if (!isOpen || !patient) {
      setNormalizedPatient(null);
      return;
    }

    const fetchPatientData = async () => {
      setLoading(true);
      const userId = patient.uid || patient.id;
      const matchCol = patient.uid ? 'id' : 'university_id';

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq(matchCol, userId)
          .maybeSingle();

        if (data && !error) {
          setNormalizedPatient(normalizePatientData(userId, data));
        } else {
          setNormalizedPatient(normalizePatientData(userId, patient));
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setNormalizedPatient(normalizePatientData(userId, patient));
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [isOpen, patient, resetKey]);

  if (!isOpen || !patient) return null;

  const displayPatient = normalizedPatient || patient;

  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full h-full max-w-6xl mx-4 my-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeInSlide_0.3s_ease-out_forwards]">
        <div className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#466460] flex items-center justify-center">
              <i className="fa-solid fa-user text-white text-lg"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{displayPatient.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {displayPatient.id} • {displayPatient.department || ''} {displayPatient.prog ? `• ${displayPatient.prog}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
            </svg>
          </button>
        </div>

        <div className="shrink-0 flex gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50 items-center">
          <div className="flex gap-2">
            {availableTabs.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setExamType(key)}
                className={`px-6 py-3 text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  examType === key
                    ? 'bg-[#466460] text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <i className={`fa-solid ${icon}`}></i>
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">School Year:</span>
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
            >
              {schoolYearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Mid Year">Mid Year</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-slate-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block text-[#466460]"></i>
                <p className="text-sm font-semibold">Loading patient data…</p>
              </div>
            </div>
          ) : (
            <>
              {examType === 'medical' && (
                <Medical
                  key={`medical-${resetKey}`}
                  selectedPatient={displayPatient}
                  showMessage={onExamSubmitted}
                  defaultSchoolYear={schoolYear}
                  defaultSemester={semester}
                />
              )}
              {examType === 'dental' && (
                <Dental
                  key={`dental-${resetKey}`}
                  selectedPatient={displayPatient}
                  showMessage={onExamSubmitted}
                  defaultSchoolYear={schoolYear}
                  defaultSemester={semester}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Create Appointment Modal (staff-booked, e.g. follow-ups / walk-ins) ───────
const CreateAppointmentModal = ({
  isOpen, onClose, onCreated, currentStaffName, currentStaffRole
}) => {
  const [patientSearch, setPatientSearch]       = useState('');
  const [patientResults, setPatientResults]     = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient]   = useState(null);

  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [reasonNote, setReasonNote]             = useState('');

  const [apptDate, setApptDate]                 = useState('');
  const [apptTime, setApptTime]                 = useState('08:00');

  const [submitting, setSubmitting]             = useState(false);
  const [formError, setFormError]               = useState('');

  const normalizedStaffRole = String(currentStaffRole || '').trim().toLowerCase();

  const availablePurposeOptions = useMemo(() => {
    if (
      normalizedStaffRole === 'doctor' ||
      normalizedStaffRole === 'physician' ||
      normalizedStaffRole === 'nurse'
    ) {
      return STAFF_PURPOSES_OPTS.filter(
        (purpose) => purpose.value === 'Medical Check-up'
      );
    }

    if (normalizedStaffRole === 'dentist') {
      return STAFF_PURPOSES_OPTS.filter(
        (purpose) => purpose.value === 'Dental Check-up'
      );
    }

    // Sysadmin and other authorized administrative roles may use both.
    return STAFF_PURPOSES_OPTS;
  }, [normalizedStaffRole]);

  const resetForm = () => {
    setPatientSearch('');
    setPatientResults([]);
    setSelectedPatient(null);
    setSelectedPurposes([]);
    setReasonNote('');
    setApptDate('');
    setApptTime('08:00');
    setFormError('');
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  // Remove invalid selections when the role changes
  useEffect(() => {
    const allowedValues = new Set(
      availablePurposeOptions.map((purpose) => purpose.value)
    );

    setSelectedPurposes((previous) =>
      previous.filter((purpose) => allowedValues.has(purpose))
    );
  }, [availablePurposeOptions]);

  // ── Debounced patient search against the users table ──
  useEffect(() => {
    if (!isOpen || selectedPatient) return;
    const q = patientSearch.trim();
    if (q.length < 2) { setPatientResults([]); return; }

    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            uid,
            first_name,
            last_name,
            middle_name,
            university_id,
            department,
            program,
            section,
            year_level,
            role,
            classification,
            job_title
          `)
          .eq('is_archived', false)
          .or(
            `first_name.ilike.%${q}%,last_name.ilike.%${q}%,university_id.ilike.%${q}%`
          )
          .limit(8);
        if (!error) setPatientResults(data || []);
      } catch (err) {
        console.error('[CreateAppointmentModal] patient search error:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, isOpen, selectedPatient]);

  const togglePurpose = (purpose) => {
    const isAllowed = availablePurposeOptions.some(
      (option) => option.value === purpose
    );

    if (!isAllowed) {
      setFormError(
        normalizedStaffRole === 'dentist'
          ? 'Dentists can only create dental appointments.'
          : 'Doctors and nurses can only create medical appointments.'
      );
      return;
    }

    setFormError('');

    // Only one appointment purpose is available for doctor, nurse,
    // and dentist accounts.
    if (
      ['doctor', 'physician', 'nurse', 'dentist'].includes(
        normalizedStaffRole
      )
    ) {
      setSelectedPurposes((previous) =>
        previous.includes(purpose) ? [] : [purpose]
      );
      return;
    }

    setSelectedPurposes((previous) =>
      previous.includes(purpose)
        ? previous.filter((item) => item !== purpose)
        : [...previous, purpose]
    );
  };

  const canSubmit = Boolean(selectedPatient) && selectedPurposes.length > 0 && Boolean(apptDate) && Boolean(apptTime) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setFormError('Please select a patient, purpose, date, and time.');
      return;
    }

    const selectedDental = selectedPurposes.includes('Dental Check-up');
    const selectedMedical = selectedPurposes.includes('Medical Check-up');

    if (
      ['doctor', 'physician', 'nurse'].includes(
        normalizedStaffRole
      ) &&
      (!selectedMedical || selectedDental)
    ) {
      setFormError(
        'Doctors and nurses can only create medical appointments.'
      );
      return;
    }

    if (
      normalizedStaffRole === 'dentist' &&
      (!selectedDental || selectedMedical)
    ) {
      setFormError(
        'Dentists can only create dental appointments.'
      );
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const fullName = selectedPatient.last_name
        ? `${selectedPatient.last_name}, ${selectedPatient.first_name || ''} ${
            selectedPatient.middle_name || ''
          }`.replace(/\s+/g, ' ').trim()
        : (
            selectedPatient.first_name ||
            selectedPatient.university_id ||
            'Unknown Patient'
          );

      const rawRole = String(
        selectedPatient.role ||
        selectedPatient.classification ||
        selectedPatient.job_title ||
        'student'
      )
        .trim()
        .toLowerCase();

      let patientType = 'student';

      if (
        rawRole.includes('faculty') ||
        rawRole.includes('instructor') ||
        rawRole.includes('professor')
      ) {
        patientType = 'instructor';
      } else if (
        rawRole.includes('staff') ||
        rawRole.includes('employee') ||
        rawRole.includes('personnel') ||
        rawRole.includes('doctor') ||
        rawRole.includes('dentist') ||
        rawRole.includes('nurse') ||
        rawRole.includes('admin')
      ) {
        patientType = 'staff';
      }

      const serviceType = selectedDental ? 'Dental Examination' : 'Medical Consultation';

      const reason = reasonNote.trim()
        ? `${selectedPurposes.join(', ')} — ${reasonNote.trim()}`
        : selectedPurposes.join(', ');

      const [year, month, day] = apptDate.split('-').map(Number);

      if (!selectedPatient.id) {
        throw new Error('The selected patient has no internal user ID.');
      }

      if (!selectedPatient.uid) {
        throw new Error(
          'The selected patient has no authentication UID. Make sure uid is included in the patient search query.'
        );
      }

      const payload = {
        authUid: String(selectedPatient.uid),
        userId: String(selectedPatient.id),

        patientId: String(
          selectedPatient.university_id ||
          selectedPatient.uid
        ),

        patientName: fullName,
        name: fullName,
        type: patientType,

        serviceType,
        reason,

        year,
        month,
        day,
        time: String(apptTime),

        bookedBy: currentStaffName || 'Clinic Staff',
        status: 'approved',
      };

      console.log(
        '[CreateAppointmentModal] Sending appointment to backend:',
        payload
      );

      const API_URL = (
        import.meta.env.VITE_API_URL ||
        'http://localhost:5000/api'
      ).replace(/\/$/, '');

      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      console.log(
        '[CreateAppointmentModal] Backend response:',
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
          result?.error ||
          `Failed to create appointment (${response.status}).`
        );
      }

      const inserted = result.data;

      console.log(
        '[CreateAppointmentModal] Appointment created successfully:',
        inserted
      );

      onCreated?.(inserted);

      resetForm();
      onClose();

    } catch (err) {
      console.error(
        '[CreateAppointmentModal] Error creating appointment:',
        err
      );

      setFormError(
        err?.message ||
        'Could not create the appointment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div
        className="bg-white w-full sm:max-w-[520px] sm:mx-4 sm:rounded-[16px] rounded-t-[20px]
          max-h-[92vh] overflow-y-auto animate-[fadeIn_0.25s_ease-out]
          [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="px-6 pt-5 pb-4 border-b border-[#eef2f6]">
          <div className="text-[18px] font-bold text-[#1e293b] flex items-center gap-2">
            <IconCalendarCheck size={18} style={{ color: '#0F6E56' }} />
            Create Appointment
          </div>
          <div className="text-[13px] text-[#64748b] mt-[4px]">
            Book an appointment directly — useful for follow-ups, walk-ins, or referrals.
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* ── Patient search / selection ── */}
          <div>
            <label className="block text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
              Patient *
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border border-[#466460] bg-[#E1F5EE] rounded-[10px]">
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#1e293b] truncate">
                    {selectedPatient.last_name ? `${selectedPatient.last_name}, ${selectedPatient.first_name || ''}` : (selectedPatient.first_name || selectedPatient.university_id)}
                  </div>
                  <div className="text-[12px] text-[#466460] mt-0.5 truncate">
                    {selectedPatient.university_id || '—'} · {selectedPatient.department || '—'} · {selectedPatient.program || '—'}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}
                  className="shrink-0 w-8 h-8 rounded-full bg-white border border-[#c6dfd0] flex items-center justify-center text-[#466460] hover:bg-[#f0f5f4] transition-colors"
                >
                  <IconXmark size={12} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search name or University ID…"
                  className="w-full px-[12px] py-[10px] border border-[#e2e8f0] rounded-[8px] text-[14px]
                    bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors"
                />
                {patientSearch.trim().length >= 2 && (
                  <div className="mt-1.5 border border-[#e2e8f0] rounded-[10px] overflow-hidden max-h-56 overflow-y-auto bg-white shadow-sm">
                    {searchingPatients ? (
                      <div className="px-4 py-3 text-[13px] text-[#94a3b8] flex items-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i> Searching…
                      </div>
                    ) : patientResults.length === 0 ? (
                      <div className="px-4 py-3 text-[13px] text-[#94a3b8]">No matching patients found.</div>
                    ) : (
                      patientResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            console.log(
                              '[CreateAppointmentModal] Selected patient:',
                              p
                            );
                            setSelectedPatient(p);
                            setPatientResults([]);
                          }}
                          className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#f0f5f4] transition-colors border-b border-[#f1f5f9] last:border-none"
                        >
                          <div className="font-bold text-[#1e293b]">
                            {p.last_name ? `${p.last_name}, ${p.first_name || ''}` : (p.first_name || p.university_id)}
                          </div>
                          <div className="text-[11px] text-[#64748b] mt-0.5">
                            {p.university_id || '—'} · {p.department || '—'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Purpose ── */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em]">
              Purpose *
            </label>

            <p className="text-[11px] text-[#64748b]">
              {normalizedStaffRole === 'dentist'
                ? 'Dentist accounts may schedule dental appointments only.'
                : normalizedStaffRole === 'doctor' ||
                    normalizedStaffRole === 'physician' ||
                    normalizedStaffRole === 'nurse'
                  ? 'Doctor and nurse accounts may schedule medical appointments only.'
                  : 'Select the appropriate appointment type.'}
            </p>

            <div
              className={
                availablePurposeOptions.length === 1
                  ? 'grid grid-cols-1 gap-2'
                  : 'grid grid-cols-2 gap-2'
              }
            >
              {availablePurposeOptions.map((purpose) => {
                const checked = selectedPurposes.includes(
                  purpose.value
                );

                return (
                  <label
                    key={purpose.key}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] border cursor-pointer transition-all text-[13px] font-semibold select-none ${
                      checked
                        ? 'bg-[#eef3f2] border-[#466460] text-[#466460]'
                        : 'bg-white border-[#e2e8f0] text-[#1e293b] hover:border-[#9bb5a5]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        togglePurpose(purpose.value)
                      }
                      className="sr-only"
                    />

                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        checked
                          ? 'bg-[#466460] border-[#466460] text-white'
                          : 'border-[#cbd5e1] bg-white'
                      }`}
                    >
                      {checked && (
                        <i className="fa-solid fa-check text-[9px]" />
                      )}
                    </span>

                    {purpose.value}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Reason / notes (free text, with quick suggestions) ── */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em]">
              Reason / Notes <span className="normal-case font-medium text-[#94a3b8]">optional</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STAFF_REASON_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReasonNote(s)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    reasonNote === s ? 'bg-[#466460] border-[#466460] text-white' : 'bg-[#f7faf8] border-[#ddeee5] text-[#466460] hover:bg-[#eef3f2]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={reasonNote}
              onChange={e => setReasonNote(e.target.value)}
              placeholder="e.g. Follow-up checkup for last month's dental treatment"
              rows="2"
              className="border border-[#e2e8f0] rounded-[10px] px-3.5 py-2.5 text-[13px] bg-white outline-none resize-none focus:border-[#466460] transition-colors"
            />
          </div>

          {/* ── Date ── */}
          <div>
            <label className="block text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
              Appointment Date *
            </label>
            <Datepicker
              value={apptDate}
              onChange={setApptDate}
              disablePastDates={true}
            />
          </div>

          {/* ── Time ── */}
          <div>
            <label className="block text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
              Time Slot *
            </label>
            <div className="relative">
              <select
                value={apptTime}
                onChange={e => setApptTime(e.target.value)}
                className="w-full appearance-none px-[12px] py-[10px] border border-[#e2e8f0] rounded-[8px] text-[15px]
                  bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors cursor-pointer"
              >
                {HOUR_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
              <IconChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-4 py-3 text-[12px] text-[#dc2626]">
              <IconCircleExclamation size={14} color="#dc2626" className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-5 border-t border-[#eef2f6] bg-white sticky bottom-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-[12px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white
              border-none rounded-[10px] text-[15px] font-semibold cursor-pointer
              transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating…</> : <><IconCircleCheck size={16} color="white" /> Create Appointment</>}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-[12px] bg-[#f1f5f9] text-[#475569] border-none
              rounded-[10px] text-[15px] font-semibold cursor-pointer
              transition-colors hover:bg-[#e2e8f0]"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today    = new Date();

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${year}. ${time}`;
  };

  const { appointments: allRawAppointments, approveAppointment, declineAppointment, markDone: ctxMarkDone, markMissed: ctxMarkMissed } = useAppointments();

  const missedRef = useRef(new Set());

  // ── Role resolution ──
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? JSON.parse(rawUser)?.role || 'student' : 'student';
    } catch {
      return 'student';
    }
  });

  const currentStaffName = useMemo(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const u = rawUser ? JSON.parse(rawUser) : null;
      if (!u) return 'Clinic Staff';
      return u.name || u.fullName || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Clinic Staff';
    } catch {
      return 'Clinic Staff';
    }
  }, []);

  // ── Role-based appointments filtering ──
  const isDentalRelated = (reasonStr) => {
    const r = String(reasonStr || '').toLowerCase();
    return r.includes('dent') || r.includes('oral') || r.includes('tooth') || r.includes('teeth');
  };

  const isOnlineConsultation = (reasonStr) => {
    const r = String(reasonStr || '').toLowerCase();
    return r.includes('online') || r.includes('consultation');
  };

  const appointments = useMemo(() => {
    // Filter out archived appointments
    const unarchivedAppts = allRawAppointments.filter(a => !a.is_archived);

    const role = String(currentUserRole || '').toLowerCase().trim();
    if (role === 'dentist') {
      return unarchivedAppts.filter(a => isDentalRelated(a.reason));
    }
    if (role === 'doctor' || role === 'physician') {
      return unarchivedAppts.filter(a => !isDentalRelated(a.reason));
    }
    // Nurse, Admin, Sysadmin see all
    return unarchivedAppts;
  }, [allRawAppointments, currentUserRole]);

  // ── Calendar state ──
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  // ── Accordion state for Time Slots ──
  const [expandedSlots, setExpandedSlots] = useState([]);
  useEffect(() => { setExpandedSlots([]); }, [selectedDay]);

  // ── Mobile view state ──
  const [mobileView, setMobileView] = useState('pending');

  // ── Tab state (pending vs approved vs rejected) ──
  const [activeTab, setActiveTab] = useState('pending');

  // ── Multi-select pending ──
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [searchTerm,     setSearchTerm]     = useState('');

  // ── Bulk-request batch grouping ──
  const [expandedBatches, setExpandedBatches] = useState([]);
  const toggleBatchExpand = (batchId) =>
    setExpandedBatches(prev =>
      prev.includes(batchId) ? prev.filter(b => b !== batchId) : [...prev, batchId]
    );
  const toggleBatchSelect = (group) => {
    const memberIds = group.members.map(m => m.id);
    const allSelected = memberIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      memberIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // ── Filter states for approved appointments ──
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');

  // ── User data cache (fetched from users table) ──
  const [userDataMap, setUserDataMap] = useState({});

  // ── Examination Modal State ──
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examType, setExamType] = useState('medical');
  const [examResetKey, setExamResetKey] = useState(0);
  const [selectedPatientForExam, setSelectedPatientForExam] = useState(null);

  // ── Create Appointment Modal State (staff-booked appointments) ──
  const [createApptModal, setCreateApptModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (appointments.length === 0) return;

      const userIds = [...new Set(appointments.map(a => a.user_id).filter(Boolean))];
      if (userIds.length === 0) return;

      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, university_id, department, program, section, year_level')
          .in('id', userIds);

        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }

        const map = {};
        (users || []).forEach(user => {
          map[user.id] = {
            university_id: user.university_id || '',
            department: user.department || '',
            program: user.program || '',
            section: user.section || '',
            yearLevel: user.year_level || '',
          };
        });

        setUserDataMap(map);
      } catch (err) {
        console.error('Error in fetchUserData:', err);
      }
    };

    fetchUserData();
  }, [appointments]);

  const getUserData = (appt) => {
    const userId = appt.user_id;
    if (!userId) return { university_id: appt.idno || '', department: appt.dept || '', program: appt.prog || '', section: appt.section || '' };
    return userDataMap[userId] || { university_id: appt.idno || '', department: appt.dept || '', program: appt.prog || '', section: appt.section || '' };
  };

  // ── Batch scheduling modal state ──
  const [batchModal,         setBatchModal]         = useState(false);
  const [batchDate,          setBatchDate]          = useState('');
  const [batchSlot,          setBatchSlot]          = useState('08:00');
  const [autoStagger,        setAutoStagger]        = useState(false);
  const [staggerCapacity,    setStaggerCapacity]    = useState(RECOMMENDED_SLOT_CAPACITY);

  // ── Decline confirmation modal ──
  const [declineModal, setDeclineModal] = useState({ open: false, ids: [] });
  const handleDeclineClick = () => {
    setDeclineModal({ open: true, ids: Array.from(selectedIds) });
  };

  // ── Detail / snackbar ──
  const [detailModal, setDetailModal] = useState(null);
  const [snackbar,    setSnackbar]    = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(
      () => setSnackbar(s => ({ ...s, visible: false })),
      3500
    );
  };

  useEffect(() => {
    if (!ctxMarkMissed) return;
    const todayMidnight = new Date(
      today.getFullYear(), today.getMonth(), today.getDate()
    );

    appointments.forEach(appt => {
      if (appt.status !== 'approved') return;
      if (!appt.year || !appt.month || !appt.day) return;
      if (missedRef.current.has(appt.id)) return;

      const apptDate = new Date(Number(appt.year), Number(appt.month) - 1, Number(appt.day));
      if (apptDate < todayMidnight) {
        missedRef.current.add(appt.id);
        ctxMarkMissed(appt.id);
      }
    });
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeMonth = (dir) => {
    let m = calMonth + dir, y = calYear;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setCalMonth(m); setCalYear(y); setSelectedDay(null);
  };

  // ── Derived data ──
  const pendingRequests = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.bookedAt) - new Date(b.bookedAt));

  const filteredPending = pendingRequests.filter(r => {
    const userData = getUserData(r);
    return !searchTerm ||
      (r.name || '').toLowerCase().includes(searchTerm)         ||
      (r.idno || '').toLowerCase().includes(searchTerm) ||
      (userData.university_id || '').toLowerCase().includes(searchTerm) ||
      (userData.department || '').toLowerCase().includes(searchTerm) ||
      (userData.program || '').toLowerCase().includes(searchTerm) ||
      (userData.section || '').toLowerCase().includes(searchTerm) ||
      (r.reason || '').toLowerCase().includes(searchTerm);
  });

  const scheduledAppts = appointments.filter(
    a => a.status === 'approved' || a.status === 'done' || a.status === 'missed'
  );

  const allApprovedAppts = appointments.filter(
    a => a.status === 'approved' || a.status === 'done' || a.status === 'missed'
  );

  const rejectedAppts = appointments
    .filter(a => a.status === 'rejected')
    .sort((a, b) => new Date(b.bookedAt || b.created_at) - new Date(a.bookedAt || a.created_at));

  const filteredRejected = rejectedAppts.filter(r => {
    const userData = getUserData(r);
    return !searchTerm ||
      (r.name || '').toLowerCase().includes(searchTerm)         ||
      (r.idno || '').toLowerCase().includes(searchTerm) ||
      (userData.university_id || '').toLowerCase().includes(searchTerm) ||
      (userData.department || '').toLowerCase().includes(searchTerm)   ||
      (userData.program || '').toLowerCase().includes(searchTerm)      ||
      (r.reason || '').toLowerCase().includes(searchTerm);
  });

  const filteredByDate = allApprovedAppts.filter(a => {
    if (filterDateRange === 'All') return true;

    const apptDate = new Date(Number(a.year), Number(a.month) - 1, Number(a.day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    if (filterDateRange === 'today') {
      return apptDate.getTime() === today.getTime();
    } else if (filterDateRange === 'thisWeek') {
      return apptDate >= startOfWeek && apptDate <= endOfWeek;
    } else if (filterDateRange === 'thisMonth') {
      return apptDate >= startOfMonth && apptDate <= endOfMonth;
    }
    return true;
  });

  const filteredApproved = filteredByDate.filter(a => {
    const matchStatus = filterStatus === 'All' || a.status === filterStatus;
    const userData = getUserData(a);
    const matchSearch = !searchTerm ||
      (a.name || '').toLowerCase().includes(searchTerm) ||
      (a.idno || '').toLowerCase().includes(searchTerm) ||
      (userData.university_id || '').toLowerCase().includes(searchTerm) ||
      (userData.department || '').toLowerCase().includes(searchTerm) ||
      (userData.program || '').toLowerCase().includes(searchTerm) ||
      (a.reason || '').toLowerCase().includes(searchTerm);
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    const dateA = new Date(Number(a.year), Number(a.month) - 1, Number(a.day));
    const dateB = new Date(Number(b.year), Number(b.month) - 1, Number(b.day));
    if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime();
    return (a.time || '').localeCompare(b.time || '');
  });

  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth    = new Date(calYear, calMonth, 0).getDate();

  const selectedDayAppts = scheduledAppts
    .filter(a => Number(a.year) === calYear && Number(a.month) === calMonth && Number(a.day) === selectedDay)
    .sort((a, b) => {
      const order = { approved: 0, missed: 1, done: 2 };
      const oa = order[a.status] ?? 3;
      const ob = order[b.status] ?? 3;
      if (oa !== ob) return oa - ob;
      return (a.time || '').localeCompare(b.time || '');
    });

  const groupedAppts = useMemo(() => {
    const groups = {};
    selectedDayAppts.forEach(a => {
      const t = a.time || '';
      if (!groups[t]) groups[t] = [];
      groups[t].push(a);
    });
    return Object.keys(groups).sort().map(time => ({ time, appts: groups[time] }));
  }, [selectedDayAppts]);

  const activeByTime = scheduledAppts
    .filter(a => Number(a.year) === calYear && Number(a.month) === calMonth && Number(a.day) === selectedDay && a.status === 'approved')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const selectedItems   = pendingRequests.filter(r => selectedIds.has(r.id));
  const chosenSlotLabel = HOUR_SLOTS.find(s => s.value === batchSlot)?.label ?? '';

  // ── Compute Stagger Distribution Preview ──
  const staggerPlan = useMemo(() => {
    if (!autoStagger || selectedItems.length === 0) return null;
    const startIdx = HOUR_SLOTS.findIndex(s => s.value === batchSlot);
    const validStart = startIdx === -1 ? 0 : startIdx;
    const chunks = [];
    for (let i = 0; i < selectedItems.length; i += staggerCapacity) {
      const slotIndex = Math.min(validStart + chunks.length, HOUR_SLOTS.length - 1);
      const slot = HOUR_SLOTS[slotIndex];
      const itemsInSlot = selectedItems.slice(i, i + staggerCapacity);
      chunks.push({ slot, items: itemsInSlot });
    }
    return chunks;
  }, [autoStagger, selectedItems, batchSlot, staggerCapacity]);

  // ── Selection helpers ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filteredPending.map(r => r.id)));
  const clearAll  = () => setSelectedIds(new Set());

// ── Optimized Batch Approve With Notifications ──
  const handleBatchApprove = async () => {
    if (!batchDate) { showSnackbar('Please select a date', 'error'); return; }
    const [y, m, d] = batchDate.split('-').map(Number);
    const ids = Array.from(selectedIds);

    try {
      if (autoStagger && staggerPlan) {
        await Promise.all(
          staggerPlan.map(({ slot, items }) => {
            const chunkIds = items.map(x => x.id);
            return supabase
              .from('appointments')
              .update({ year: y, month: m, day: d, time: slot.value, status: 'approved', updated_at: new Date().toISOString() })
              .in('id', chunkIds);
          })
        );
      } else {
        const { error } = await supabase
          .from('appointments')
          .update({ year: y, month: m, day: d, time: batchSlot, status: 'approved', updated_at: new Date().toISOString() })
          .in('id', ids);

        if (error) throw error;
      }

      // ── Dispatch notifications to approved patients ──
      const patientNotifications = selectedItems
        .filter(item => Boolean(item.user_id))
        .map(item => ({
          user_id: item.user_id,
          type: 'appointment_status',
          title: 'Appointment Approved!',
          message: `Your appointment has been approved for ${batchDate} (${batchSlot}).`,
          reference_id: item.id,
          reference_type: 'appointment',
          is_read: false,
          created_at: new Date().toISOString(),
        }));

if (patientNotifications.length > 0) {
  const { error: patientNotifyError } = await supabase
    .from('notifications')
    .insert(patientNotifications);

  if (patientNotifyError) {
    console.error(
      '[handleBatchApprove] Failed to notify patients:',
      patientNotifyError
    );
  }
}
// ── Notify each bulk appointment requester once ──
const requesterGroups = new Map();

selectedItems.forEach((item) => {
  if (!item.booked_by_id) return;

  const groupKey =
    item.batch_id ||
    `${item.booked_by_id}-${item.booked_by || 'Requester'}`;

  if (!requesterGroups.has(groupKey)) {
    requesterGroups.set(groupKey, {
      batchId: item.batch_id || null,
      requesterId: item.booked_by_id,
      requesterName: item.booked_by || 'Requester',
      count: 0,
    });
  }

  requesterGroups.get(groupKey).count += 1;
});

const requesterNotifications = Array.from(
  requesterGroups.values()
).map((group) => ({
  // Recipient comes from appointments.booked_by_id
  user_id: group.requesterId,

  type: 'bulk_appointment_approved',
  title: 'Bulk Appointment Request Approved',

  // Display name comes from appointments.booked_by
  message:
    `${group.requesterName}, your bulk appointment request for ` +
    `${group.count} student${group.count === 1 ? '' : 's'} ` +
    `has been approved and scheduled for ${batchDate}.`,

  reference_id: group.batchId,
  reference_type: 'appointment_batch',
  is_read: false,
  created_at: new Date().toISOString(),
}));

if (requesterNotifications.length > 0) {
  const { error: requesterNotifyError } = await supabase
    .from('notifications')
    .insert(requesterNotifications);

  if (requesterNotifyError) {
    console.error(
      '[handleBatchApprove] Failed to notify booked_by requester:',
      requesterNotifyError
    );
  }
}

      if (approveAppointment) {
        if (autoStagger && staggerPlan) {
          staggerPlan.forEach(({ slot, items }) => {
            items.forEach(item => approveAppointment(item.id, { year: y, month: m, day: d, time: slot.value }));
          });
        } else {
          selectedItems.forEach(item => approveAppointment(item.id, { year: y, month: m, day: d, time: batchSlot }));
        }
      }

      showSnackbar(`${selectedIds.size} appointment${selectedIds.size > 1 ? 's' : ''} approved`);
      setBatchModal(false);
      setSelectedIds(new Set());
      setSelectedDay(null);
      setCalYear(y); setCalMonth(m);
      setTimeout(() => setSelectedDay(d), 0);
    } catch (err) {
      console.error('Batch approve error:', err);
      showSnackbar('Failed to approve appointments', 'error');
    }
  };

  // ── Optimized Decline With Notifications ──
  const handleDeclineConfirm = async () => {
    try {
      const ids = declineModal.ids;
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      // ── Dispatch decline notifications to affected patients ──
      const declinedItems = appointments.filter(a => ids.includes(a.id) && Boolean(a.user_id));
      const patientNotifications = declinedItems.map(item => ({
        user_id: item.user_id,
        type: 'appointment_status',
        title: 'Appointment Declined',
        message: 'Your appointment request was not approved. Please contact clinic staff for details.',
        reference_id: item.id,
        reference_type: 'appointment',
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      if (patientNotifications.length > 0) {
        await supabase.from('notifications').insert(patientNotifications);
      }

      if (declineAppointment) {
        ids.forEach(id => declineAppointment(id));
      }

      showSnackbar(`${ids.length} request${ids.length > 1 ? 's' : ''} rejected`, 'error');
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Batch decline error:', err);
      showSnackbar('Failed to reject requests', 'error');
    }
    setDeclineModal({ open: false, ids: [] });
  };

  const handleDeclineCancel = () => {
    setDeclineModal({ open: false, ids: [] });
  };

  const handleMarkDone = (e, id) => {
    e.stopPropagation();
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    ctxMarkDone(id);
    showSnackbar(`${appt.name} marked as done`);
  };

  const toggleSlot = (time) =>
    setExpandedSlots(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );

  // ── Examination Flow Handlers ──
  const handleExaminePatient = (appt) => {
    const nameParts = (appt.name || '').trim().split(' ');
    const patientProfile = {
      uid: appt.user_id || `temp-${Date.now()}`,
      name: appt.name,
      firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : appt.name,
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      id: appt.idno,
      universityId: appt.idno,
      department: appt.dept,
      prog: appt.prog,
      section: appt.section,
      type: appt.type || 'student',
      role: appt.type || 'student'
    };

    const reasonLower = (appt.reason || '').toLowerCase();
    const defaultExamType = reasonLower.includes('dent') ? 'dental' : 'medical';

    setSelectedPatientForExam(patientProfile);
    setExamType(defaultExamType);
    setExamResetKey(k => k + 1);

    setDetailModal(null);
    setExamModalOpen(true);
  };

  // ── Consultation Redirection Handler ──
  const handleGoToConsultation = (appt) => {
    setDetailModal(null);
    const basePath = location.pathname.includes('/admin-clinic')
      ? '/admin-clinic/consultation'
      : location.pathname.includes('/admin')
        ? '/admin/consultation'
        : '/consultation';

    navigate(basePath, {
      state: {
        selectedAppointment: appt,
        patientId: appt.user_id || appt.idno,
        patientName: appt.name,
        fromAppointments: true
      }
    });
  };

  const handleExamModalClose = () => {
    setExamModalOpen(false);
    setSelectedPatientForExam(null);
    setExamResetKey(k => k + 1);
  };

  const handleExamSubmitted = (msg) => {
    showSnackbar(msg, 'success');
    setExamModalOpen(false);
    setSelectedPatientForExam(null);
    setExamResetKey(k => k + 1);
  };

const handleAppointmentCreated = (createdAppt) => {
  showSnackbar('Appointment created successfully');

  if (
    createdAppt?.year &&
    createdAppt?.month &&
    createdAppt?.day
  ) {
    setCalYear(Number(createdAppt.year));
    setCalMonth(Number(createdAppt.month));
    setSelectedDay(Number(createdAppt.day));
    setActiveTab('approved');
  }
};

  // ── Pending List ──────────────────────────────────────────────────────────
  const PendingList = () => (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="text-[16px] font-semibold text-[#1e293b]">Pending Requests</div>
          <div className="text-[12px] text-[#64748b] mt-[1px]">Select patients to schedule in batch</div>
        </div>
        <span className="text-[12px] font-semibold text-[#854F0B] bg-[#FAEEDA] px-[9px] py-[2px] rounded-[20px]">
          {pendingRequests.length} pending
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#eef2f6] shrink-0 flex flex-col gap-1.5 bg-white">
        <input
          type="text"
          placeholder="Search name, ID, dept..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase())}
          className="w-full px-[11px] py-[8px] border border-[#e2e8f0] rounded-lg text-[14px] bg-[#f8fafc]
            text-[#1e293b] outline-none focus:border-[#466460] focus:bg-white transition-colors"
        />
        {filteredPending.length > 0 && (
          <div className="flex items-center justify-between px-[2px]">
            <span className="text-[12px] text-[#64748b]">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredPending.length} selected`
                : `${filteredPending.length} shown`}
            </span>
            <div className="flex gap-2">
              {selectedIds.size < filteredPending.length && (
                <button onClick={selectAll}
                  className="text-[12px] font-semibold text-[#466460] hover:underline bg-transparent border-none cursor-pointer p-0">
                  Select all
                </button>
              )}
              {selectedIds.size > 0 && (
                <button onClick={clearAll}
                  className="text-[12px] font-semibold text-[#94a3b8] hover:underline bg-transparent border-none cursor-pointer p-0">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-[10px] py-[8px] min-h-0 bg-white
        [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
        {filteredPending.length === 0 ? (
          <div className="text-center py-[30px] px-4 text-[#94a3b8] text-[14px]">
            <div className="flex justify-center mb-3 text-[#cbd5e1]">
              {pendingRequests.length === 0
                ? <IconInbox size={32} />
                : <IconMagnifyingGlass size={32} />
              }
            </div>
            {pendingRequests.length === 0 ? 'All requests processed' : 'No results found'}
          </div>
        ) : groupByBatch(filteredPending).map(item => {
          if (item.__isBatchGroup) {
            const memberIds    = item.members.map(m => m.id);
            const allSelected  = memberIds.every(id => selectedIds.has(id));
            const someSelected = !allSelected && memberIds.some(id => selectedIds.has(id));
            const isExpanded   = expandedBatches.includes(item.batchId);
            return (
              <div key={`batch-${item.batchId}`} className={`border rounded-[10px] mb-[6px] overflow-hidden transition-all
                ${allSelected ? 'border-[#466460] bg-[#E1F5EE]' : 'border-[#eef2f6] hover:border-[#f0a030] hover:bg-[#fffdf7]'}`}>
                <div onClick={() => toggleBatchSelect(item)} className="flex items-start gap-[10px] px-[12px] py-[12px] cursor-pointer relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-opacity duration-150
                    ${allSelected ? 'bg-[#466460] opacity-100' : 'bg-[#EF9F27] opacity-0 group-hover:opacity-100'}`} />
                  <div className={`w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[1px] transition-all
                    ${allSelected ? 'bg-[#466460] border-[#466460]' : someSelected ? 'bg-[#9bb5a5] border-[#9bb5a5]' : 'bg-white border-[#cbd5e1] group-hover:border-[#466460]'}`}>
                    {allSelected && <IconCheck size={11} />}
                  </div>
                  <div className="w-[26px] h-[26px] rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <IconUsers size={13} style={{ color: '#6d28d9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[15px] font-semibold text-[#1e293b] leading-[1.3]">
                        Bulk Request &middot; {item.members.length} student{item.members.length > 1 ? 's' : ''}
                      </div>
                      <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px] rounded-[20px] font-medium shrink-0 whitespace-nowrap">
                        {item.reason}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#64748b] mt-[4px]">Requested by {item.bookedBy || '—'}</div>
                    <div className="text-[11px] text-[#94a3b8] mt-[5px] flex items-center gap-[4px]">
                      <IconClock size={11} />
                      Requested {formatDateTime(item.bookedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBatchExpand(item.batchId); }}
                    className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#466460] transition-colors"
                  >
                    {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#eef2f6] bg-[#fafbfc] px-[16px] py-[8px] flex flex-col gap-[4px] max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                    {item.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-[12px] text-[#475569] py-[4px] border-b border-[#f1f5f9] last:border-none">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[#94a3b8]">{getUserData(m).university_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const r         = item;
          const rank      = pendingRequests.findIndex(x => x.id === r.id) + 1;
          const isChecked = selectedIds.has(r.id);
          const bTime     = formatDateTime(r.bookedAt);
          return (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              className={`flex items-start gap-[10px] px-[12px] py-[12px] border rounded-[10px] mb-[6px]
                cursor-pointer transition-all relative overflow-hidden group
                ${isChecked
                  ? 'border-[#466460] bg-[#E1F5EE]'
                  : 'border-[#eef2f6] hover:border-[#f0a030] hover:bg-[#fffdf7]'}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-opacity duration-150
                ${isChecked ? 'bg-[#466460] opacity-100' : 'bg-[#EF9F27] opacity-0 group-hover:opacity-100'}`} />

              <div className={`w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center
                shrink-0 mt-[1px] transition-all
                ${isChecked
                  ? 'bg-[#466460] border-[#466460]'
                  : 'bg-white border-[#cbd5e1] group-hover:border-[#466460]'}`}>
                {isChecked && <IconCheck size={11} />}
              </div>

              <div className={`font-['DM_Mono',monospace] text-[12px] font-medium rounded-[5px] px-[8px]
                py-[2px] min-w-[28px] text-center shrink-0 mt-[1px]
                ${isChecked ? 'text-[#0F6E56] bg-[#E1F5EE] border border-[#9FE1CB]' : 'text-[#854F0B] bg-[#FAEEDA]'}`}>
                #{rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[15px] font-semibold text-[#1e293b] leading-[1.3] truncate">
                    {r.name}
                  </div>
                  <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px]
                    rounded-[20px] font-medium shrink-0 whitespace-nowrap">
                    {r.reason}
                  </span>
                </div>
                <div className="text-[12px] text-[#64748b] mt-[4px] leading-[1.5]">
                  {getUserData(r).university_id} &middot; {getUserData(r).department}
                </div>
                <div className="text-[12px] text-[#64748b] leading-[1.5]">
                  {getUserData(r).program} &middot; Sec {getUserData(r).section}
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-[5px] flex items-center gap-[4px]">
                  <IconClock size={11} />
                  Requested {bTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className="shrink-0 border-t-2 border-[#e0eceb] bg-[#f8fdfc] px-4 py-4 flex flex-col gap-3">
          {!selectedDay && (
            <div className="text-[12.5px] text-[#854F0B] bg-[#FAEEDA] px-3 py-[8px] rounded-[6px] border border-[#f0c070] flex items-center justify-center gap-[6px]">
              <IconCircleInfo size={14} />
              Select a date on the calendar to schedule
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!selectedDay) return;
                const formattedDate = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                setBatchDate(formattedDate);
                setAutoStagger(selectedIds.size > RECOMMENDED_SLOT_CAPACITY);
                setBatchModal(true);
              }}
              disabled={!selectedDay}
              className={`flex-1 py-[10px] border-none rounded-[8px] text-[14px] font-semibold flex items-center justify-center gap-[6px] transition-all
                ${selectedDay
                  ? 'bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white cursor-pointer hover:opacity-90'
                  : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'}`}
            >
              <IconCalendarCheck size={14} />
              Schedule {selectedIds.size} Patient{selectedIds.size > 1 ? 's' : ''}
            </button>
            <button
              onClick={handleDeclineClick}
              title="Decline selected"
              className="px-[16px] py-[10px] bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]
                rounded-[8px] text-[14px] font-semibold cursor-pointer transition-colors hover:bg-[#fee2e2]
                flex items-center justify-center"
            >
              <IconXmark size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Approved Item Render Helper ───────────────────────────────────────────
  const renderApprovedItem = (a) => {
    const isDone   = a.status === 'done';
    const isMissed = a.status === 'missed';
    const dateObj = (a.year && a.month && a.day)
      ? new Date(Number(a.year), Number(a.month) - 1, Number(a.day))
      : (a.created_at ? new Date(a.created_at) : new Date());
    const apptDate = formatDateTime(dateObj);

    return (
      <div
        key={a.id}
        onClick={() => setDetailModal(a)}
        className={`flex items-start gap-[10px] px-[12px] py-[12px] border rounded-[10px] cursor-pointer transition-all
          ${isDone
            ? 'border-[#eef2f6] bg-[#f8fafc] hover:border-[#cbd5e1]'
            : isMissed
              ? 'border-[#fde68a] bg-[#fffbeb] hover:border-[#f59e0b]'
              : 'border-[#eef2f6] hover:border-[#8aacaa] hover:bg-[#fafffe]'}`}
      >
        <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0 mt-[2px]
          ${isDone ? 'bg-[#94a3b8]' : isMissed ? 'bg-[#f59e0b]' : 'bg-[#1D9E75]'}`}>
          {isDone ? (
            <IconCheck size={11} color="white" />
          ) : isMissed ? (
            <IconBanCircle size={12} color="white" />
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-semibold leading-[1.3]
            ${isDone ? 'text-[#94a3b8]' : isMissed ? 'text-[#b45309]' : 'text-[#1e293b]'}`}>
            {a.name}
          </div>
          <div className="text-[12px] text-[#64748b] mt-[4px]">
            {getUserData(a).university_id} &middot; {getUserData(a).department}
          </div>
          <div className="text-[12px] text-[#64748b] mt-[2px]">
            {getUserData(a).program} &middot; Sec {getUserData(a).section}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px] rounded-[20px]">
              {a.reason}
            </span>
            <span className={`text-[11px] font-bold px-[8px] py-[2px] rounded-[20px] uppercase
              ${isDone ? 'bg-[#f1f5f9] text-[#64748b]' : isMissed ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
              {a.status}
            </span>
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-[5px] flex items-center gap-[4px]">
            <IconCalendar size={11} />
            {apptDate} &middot; {a.time}
          </div>
        </div>

        {!isDone && !isMissed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleMarkDone(e, a.id); }}
            className="px-[10px] py-[4px] text-[11px] font-bold rounded-[6px] border border-[#1D9E75] text-[#1D9E75] bg-white cursor-pointer transition-colors shrink-0 hover:bg-[#EAF3DE] flex items-center gap-[4px]"
          >
            <IconCheck size={10} style={{ stroke: '#1D9E75' }} />
            Done
          </button>
        )}
      </div>
    );
  };

  // ── Approved Appointments List ─────────────────────────────────────────────
  const ApprovedList = () => (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="text-[16px] font-semibold text-[#1e293b]">Approved Appointments</div>
          <div className="text-[12px] text-[#64748b] mt-[1px]">View all scheduled appointments</div>
        </div>
        <span className="text-[12px] font-semibold text-[#0F6E56] bg-[#E1F5EE] px-[9px] py-[2px] rounded-[20px]">
          {allApprovedAppts.length} total
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#eef2f6] shrink-0 flex flex-col gap-1.5 bg-white">
        <input
          type="text"
          placeholder="Search name, ID, dept, reason..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase())}
          className="w-full px-[11px] py-[8px] border border-[#e2e8f0] rounded-lg text-[14px] bg-[#f8fafc]
            text-[#1e293b] outline-none focus:border-[#466460] focus:bg-white transition-colors"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full appearance-none px-[12px] py-[8px] pr-[28px] border border-[#e2e8f0] rounded-lg text-[13px]
                bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="approved">Approved</option>
              <option value="done">Done</option>
              <option value="missed">Missed</option>
            </select>
            <IconChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
          </div>
          <div className="relative flex-1">
            <select
              value={filterDateRange}
              onChange={e => setFilterDateRange(e.target.value)}
              className="w-full appearance-none px-[12px] py-[8px] pr-[28px] border border-[#e2e8f0] rounded-lg text-[13px]
                bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
            </select>
            <IconChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
          </div>
        </div>
        <div className="text-[12px] text-[#64748b] px-[2px] mt-1">
          {filteredApproved.length} appointment{filteredApproved.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[10px] py-[8px] min-h-0 bg-white
        [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
        {filteredApproved.length === 0 ? (
          <div className="text-center py-[30px] px-4 text-[#94a3b8] text-[14px]">
            <div className="flex justify-center mb-3 text-[#cbd5e1]">
              {allApprovedAppts.length === 0
                ? <IconInbox size={32} />
                : <IconMagnifyingGlass size={32} />
              }
            </div>
            {allApprovedAppts.length === 0 ? 'No approved appointments yet' : 'No results match your filters'}
          </div>
        ) : (
          <div className="space-y-3">
            {groupByBatch(filteredApproved).map(item => {
              if (item.__isBatchGroup) {
                const isExpanded = expandedBatches.includes(item.batchId);
                const counts = item.members.reduce((acc, m) => {
                  acc[m.status] = (acc[m.status] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <div key={`batch-${item.batchId}`} className="border border-[#eef2f6] rounded-[10px] overflow-hidden">
                    <div onClick={() => toggleBatchExpand(item.batchId)} className="flex items-start gap-[10px] px-[12px] py-[12px] cursor-pointer hover:bg-[#fafffe] transition-colors">
                      <div className="w-[26px] h-[26px] rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0 mt-[2px]">
                        <IconUsers size={13} style={{ color: '#6d28d9' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[15px] font-semibold text-[#1e293b] leading-[1.3]">
                            Bulk Request &middot; {item.members.length} student{item.members.length > 1 ? 's' : ''}
                          </div>
                          <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px] rounded-[20px] font-medium shrink-0 whitespace-nowrap">
                            {item.reason}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#64748b] mt-[4px]">Requested by {item.bookedBy || '—'}</div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {counts.approved > 0 && <span className="text-[11px] font-bold px-[8px] py-[2px] rounded-[20px] bg-[#EAF3DE] text-[#3B6D11] uppercase">{counts.approved} approved</span>}
                          {counts.done > 0 && <span className="text-[11px] font-bold px-[8px] py-[2px] rounded-[20px] bg-[#f1f5f9] text-[#64748b] uppercase">{counts.done} done</span>}
                          {counts.missed > 0 && <span className="text-[11px] font-bold px-[8px] py-[2px] rounded-[20px] bg-[#fef3c7] text-[#92400e] uppercase">{counts.missed} missed</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBatchExpand(item.batchId); }}
                        className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#466460] transition-colors mt-[2px]"
                      >
                        {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[#eef2f6] bg-[#fafbfc] px-[10px] py-[8px] flex flex-col gap-[8px] max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                        {item.members.map(renderApprovedItem)}
                      </div>
                    )}
                  </div>
                );
              }
              return renderApprovedItem(item);
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Rejected Item Render Helper ───────────────────────────────────────────
  const renderRejectedItem = (r) => {
    const bTime = formatDateTime(r.bookedAt);
    return (
      <div
        key={r.id}
        onClick={() => setDetailModal(r)}
        className="flex items-start gap-[10px] px-[12px] py-[12px] border border-[#eef2f6]
          rounded-[10px] mb-[6px] cursor-pointer transition-all relative overflow-hidden
          hover:border-[#fca5a5] hover:bg-[#fffafa]"
      >
        <div className="w-[20px] h-[20px] rounded-full bg-[#dc2626] flex items-center justify-center shrink-0 mt-[2px]">
          <IconXmark size={11} color="white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#1e293b] leading-[1.3]">{r.name}</div>
          <div className="text-[12px] text-[#64748b] mt-[4px] leading-[1.5]">
            {getUserData(r).university_id} &middot; {getUserData(r).department}
          </div>
          <div className="text-[12px] text-[#64748b] leading-[1.5]">
            {getUserData(r).program} &middot; Sec {getUserData(r).section}
          </div>
          <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px]
            rounded-[20px] inline-block mt-[5px] font-medium">{r.reason}</span>
          <div className="text-[11px] text-[#94a3b8] mt-[5px] flex items-center gap-[4px]">
            <IconClock size={11} />
            Requested {bTime}
          </div>
        </div>
      </div>
    );
  };

  // ── Rejected Appointments List ─────────────────────────────────────────────
  const RejectedList = () => (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="text-[16px] font-semibold text-[#1e293b]">Rejected Requests</div>
          <div className="text-[12px] text-[#64748b] mt-[1px]">Requests that were rejected</div>
        </div>
        <span className="text-[12px] font-semibold text-[#991b1b] bg-[#fef2f2] px-[9px] py-[2px] rounded-[20px]">
          {rejectedAppts.length} rejected
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#eef2f6] shrink-0 bg-white">
        <input
          type="text"
          placeholder="Search name, ID, dept..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase())}
          className="w-full px-[11px] py-[8px] border border-[#e2e8f0] rounded-lg text-[14px] bg-[#f8fafc]
            text-[#1e293b] outline-none focus:border-[#466460] focus:bg-white transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-[10px] py-[8px] min-h-0 bg-white
        [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
        {filteredRejected.length === 0 ? (
          <div className="text-center py-[30px] px-4 text-[#94a3b8] text-[14px]">
            <div className="flex justify-center mb-3 text-[#cbd5e1]">
              {rejectedAppts.length === 0
                ? <IconInbox size={32} />
                : <IconMagnifyingGlass size={32} />
              }
            </div>
            {rejectedAppts.length === 0 ? 'No rejected requests' : 'No results found'}
          </div>
        ) : groupByBatch(filteredRejected).map(item => {
          if (item.__isBatchGroup) {
            const isExpanded = expandedBatches.includes(item.batchId);
            return (
              <div key={`batch-${item.batchId}`} className="border border-[#eef2f6] rounded-[10px] mb-[6px] overflow-hidden">
                <div onClick={() => toggleBatchExpand(item.batchId)} className="flex items-start gap-[10px] px-[12px] py-[12px] cursor-pointer hover:bg-[#fffafa] transition-colors">
                  <div className="w-[26px] h-[26px] rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0 mt-[2px]">
                    <IconUsers size={13} style={{ color: '#6d28d9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-[#1e293b] leading-[1.3]">
                      Bulk Request &middot; {item.members.length} student{item.members.length > 1 ? 's' : ''}
                    </div>
                    <div className="text-[12px] text-[#64748b] mt-[4px]">Requested by {item.bookedBy || '—'}</div>
                    <span className="text-[12px] text-[#6d28d9] bg-[#ede9fe] px-[8px] py-[2px] rounded-[20px] inline-block mt-[5px] font-medium">{item.reason}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBatchExpand(item.batchId); }}
                    className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#466460] transition-colors mt-[2px]"
                  >
                    {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#eef2f6] bg-[#fafbfc] px-[10px] py-[8px] flex flex-col gap-[6px] max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                    {item.members.map(renderRejectedItem)}
                  </div>
                )}
              </div>
            );
          }
          return renderRejectedItem(item);
        })}
      </div>
    </div>
  );

  // ── Calendar Panel ────────────────────────────────────────────────────────
  const CalendarPanel = () => (
    <div className="flex flex-col h-full bg-[#fafbfc] overflow-hidden w-full">
      <div className="px-4 py-4 border-b border-[#eef2f6] flex items-center justify-between shrink-0 bg-white">
        <button
          onClick={() => changeMonth(-1)}
          className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[32px] h-[32px]
            rounded-[8px] flex items-center justify-center transition-colors
            hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]"
        >
          <IconChevronLeft size={14} />
        </button>

        <span className="text-[18px] font-bold text-[#1e293b]">{MONTHS[calMonth - 1]} {calYear}</span>

        <button
          onClick={() => changeMonth(1)}
          className="bg-transparent border border-[#e2e8f0] text-[#475569] w-[32px] h-[32px]
            rounded-[8px] flex items-center justify-center transition-colors
            hover:bg-[#E1F5EE] hover:border-[#466460] hover:text-[#466460]"
        >
          <IconChevronRight size={14} />
        </button>
      </div>

      <div className="flex gap-[16px] px-4 py-[10px] border-b border-[#eef2f6] bg-white shrink-0">
        {[['#1D9E75','Approved'],['#f59e0b','Missed'],['#94a3b8','Done']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-[6px] text-[12px] text-[#64748b]">
            <div className="w-[8px] h-[8px] rounded-full" style={{ background: color }}></div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="px-3 pt-3 pb-3 shrink-0 bg-white border-b border-[#eef2f6]">
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[12px] font-semibold text-[#94a3b8] py-[3px]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[4px]">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = today.getFullYear() === calYear
              && (today.getMonth() + 1) === calMonth
              && today.getDate() === day;
            const isSel = selectedDay === day;

            const isPast = (() => {
              const cellDate      = new Date(calYear, calMonth - 1, day);
              const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return cellDate < todayMidnight;
            })();

            const dayAppts = scheduledAppts.filter(
              a => Number(a.year) === calYear && Number(a.month) === calMonth && Number(a.day) === day
            );

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[44px] sm:min-h-[50px] border px-2 py-1.5 rounded-[8px] transition-all cursor-pointer
                  ${isSel
                    ? 'bg-[#466460] border-[#466460]'
                    : isToday
                      ? 'border-[#466460] hover:bg-[#E1F5EE]'
                      : isPast
                        ? 'border-transparent hover:bg-[#f1f5f9]'
                        : 'border-transparent hover:bg-[#E1F5EE] hover:border-[#9FE1CB]'}`}
              >
                <div className={`text-[13px] font-bold
                  ${isSel
                    ? 'text-white'
                    : isToday
                      ? 'text-[#0F6E56]'
                      : isPast
                        ? 'text-[#8aa8a4]'
                        : 'text-[#475569]'}`}>
                  {day}
                </div>
                <div className="flex gap-[3px] flex-wrap mt-[3px]">
                  {dayAppts.slice(0, 4).map((a, i) => (
                    <div key={i} className={`w-[6px] h-[6px] rounded-full
                      ${a.status === 'done'
                        ? 'bg-[#94a3b8]'
                        : a.status === 'missed'
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#1D9E75]'}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4
        [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
        {!selectedDay ? (
          <div className="text-center py-8 px-4 text-[#94a3b8] text-[14px]">
            <div className="flex justify-center mb-3 text-[#cbd5e1]">
              <IconCalendar size={32} />
            </div>
            <p>Select a date to view appointments</p>
          </div>
        ) : selectedDayAppts.length === 0 ? (
          <>
            <div className="text-[15px] font-bold text-[#1e293b] mb-3 flex justify-between items-center">
              <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
              <span className="text-[12px] text-[#64748b] font-normal">No appointments</span>
            </div>
            <div className="text-center py-8 px-4 text-[#94a3b8] text-[14px]">
              <div className="flex justify-center mb-3 text-[#cbd5e1]">
                <IconCalendarXmark size={32} />
              </div>
              <p>No approved appointments on this date</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-[15px] font-bold text-[#1e293b] mb-4 flex justify-between items-center">
              <span>{MONTHS[calMonth - 1]} {selectedDay}, {calYear}</span>
              <span className="text-[12px] text-[#64748b] font-normal">
                {selectedDayAppts.length} appt{selectedDayAppts.length !== 1 ? 's' : ''}&nbsp;&middot;&nbsp;
                {selectedDayAppts.filter(a => a.status === 'done').length} done
                {selectedDayAppts.filter(a => a.status === 'missed').length > 0 && (
                  <span className="text-[#b45309]">
                    &nbsp;&middot;&nbsp;{selectedDayAppts.filter(a => a.status === 'missed').length} missed
                  </span>
                )}
              </span>
            </div>
            {groupedAppts.map(({ time, appts }) => {
              const isExpanded = expandedSlots.includes(time);
              const slotInfo  = HOUR_SLOTS.find(s => s.value === time);
              const slotLabel = slotInfo ? slotInfo.label : time;
              return (
                <div key={time} className="mb-4 last:mb-0">
                  <div
                    onClick={() => toggleSlot(time)}
                    className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border border-[#eef2f6] rounded-[8px] cursor-pointer hover:bg-[#f1f5f9] transition-colors mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <IconClock size={15} className="text-[#466460]" style={{ color: '#466460' }} />
                      <span className="text-[14px] font-bold text-[#1e293b]">{slotLabel}</span>
                      <span className={`text-[12px] border px-2.5 py-[3px] rounded-full font-bold shadow-sm ${
                        appts.length > RECOMMENDED_SLOT_CAPACITY
                          ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                          : 'bg-white text-[#64748b] border-[#e2e8f0]'
                      }`}>
                        {appts.length} appt{appts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {isExpanded
                      ? <IconChevronUp size={13} style={{ color: '#94a3b8' }} />
                      : <IconChevronDown size={13} style={{ color: '#94a3b8' }} />
                    }
                  </div>
                  {isExpanded && (
                    <div className="flex flex-col gap-2 pl-[8px] border-l-[3px] border-[#eef2f6] ml-[12px] max-h-80 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                      {appts.map(a => {
                        const isDone   = a.status === 'done';
                        const isMissed = a.status === 'missed';
                        const queueIdx = activeByTime.findIndex(x => x.id === a.id);
                        return (
                          <div
                            key={a.id}
                            onClick={() => setDetailModal(a)}
                            className={`flex items-center gap-3 px-[12px] py-[10px] border rounded-[8px]
                              bg-white transition-all cursor-pointer
                              ${isDone
                                ? 'bg-[#f8fafc] opacity-[0.72] border-[#eef2f6] hover:border-[#cbd5e1]'
                                : isMissed
                                  ? 'bg-[#fffbeb] border-[#fde68a] hover:border-[#f59e0b]'
                                  : 'border-[#eef2f6] hover:border-[#8aacaa] hover:bg-[#fafffe]'}`}
                          >
                            <span className={`font-['DM_Mono',monospace] text-[12px] font-bold text-white
                              rounded-[5px] px-[8px] py-[3px] min-w-[30px] text-center shrink-0 leading-[1.6] flex items-center justify-center
                              ${isDone ? 'bg-[#94a3b8]' : isMissed ? 'bg-[#f59e0b]' : 'bg-[#466460]'}`}>
                              {isDone
                                ? <IconCheck size={11} />
                                : isMissed
                                  ? <IconBanCircle size={12} color="white" />
                                  : `#${queueIdx + 1}`
                              }
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold text-[15px] truncate
                                ${isDone
                                  ? 'line-through text-[#94a3b8]'
                                  : isMissed
                                    ? 'line-through text-[#b45309]'
                                    : 'text-[#1e293b]'}`}>{a.name}</div>
                              <div className="text-[12px] text-[#64748b] mt-[2px] truncate">
                                {a.reason} &middot; {getUserData(a).program}
                              </div>
                            </div>
                            <span className={`text-[11px] font-bold px-[10px] py-[3px] rounded-[20px]
                              shrink-0 uppercase tracking-[0.03em] hidden sm:inline
                              ${isDone
                                ? 'bg-[#f1f5f9] text-[#64748b]'
                                : isMissed
                                  ? 'bg-[#fef3c7] text-[#92400e]'
                                  : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
                              {isDone ? 'done' : isMissed ? 'missed' : 'approved'}
                            </span>
                            {!isDone && !isMissed && (
                              <button
                                onClick={(e) => handleMarkDone(e, a.id)}
                                className="ml-2 px-[10px] py-[5px] text-[11px] font-bold rounded-[6px]
                                  border border-[#1D9E75] text-[#1D9E75] bg-white cursor-pointer
                                  transition-colors shrink-0 whitespace-nowrap hover:bg-[#EAF3DE]
                                  flex items-center gap-[4px]"
                              >
                                <IconCheck size={10} style={{ stroke: '#1D9E75' }} />
                                Done
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans',sans-serif] text-[#2d3748] bg-white w-full h-[calc(100vh-134px)] md:h-[calc(100vh-116px)] flex flex-col overflow-hidden relative">

      {/* ── MOBILE ── */}
      <div className="flex flex-col md:hidden flex-1 min-h-0 w-full h-full">
        <div className="flex border-b border-[#eef2f6] bg-white shrink-0 overflow-x-auto">
          <button
            onClick={() => { setMobileView('pending'); setActiveTab('pending'); }}
            className={`flex-1 py-4 text-[14px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap
              ${mobileView === 'pending' && activeTab === 'pending' ? 'text-[#466460] border-b-2 border-[#466460]' : 'text-[#94a3b8]'}`}
          >
            <IconClock size={15} /> Pending
            {pendingRequests.length > 0 && (
              <span className="text-[11px] font-bold bg-[#FAEEDA] text-[#854F0B] px-2 py-1 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setMobileView('pending'); setActiveTab('approved'); }}
            className={`flex-1 py-4 text-[14px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap
              ${mobileView === 'pending' && activeTab === 'approved' ? 'text-[#466460] border-b-2 border-[#466460]' : 'text-[#94a3b8]'}`}
          >
            <IconCircleCheck size={15} /> Approved
            {allApprovedAppts.length > 0 && (
              <span className="text-[11px] font-bold bg-[#E1F5EE] text-[#0F6E56] px-2 py-1 rounded-full">
                {allApprovedAppts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setMobileView('pending'); setActiveTab('rejected'); }}
            className={`flex-1 py-4 text-[14px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap
              ${mobileView === 'pending' && activeTab === 'rejected' ? 'text-[#991b1b] border-b-2 border-[#991b1b]' : 'text-[#94a3b8]'}`}
          >
            <IconCircleXmark size={15} /> Declined
            {rejectedAppts.length > 0 && (
              <span className="text-[11px] font-bold bg-[#fef2f2] text-[#991b1b] px-2 py-1 rounded-full">
                {rejectedAppts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView('calendar')}
            className={`flex-1 py-4 text-[14px] font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap
              ${mobileView === 'calendar' ? 'text-[#466460] border-b-[3px] border-[#466460]' : 'text-[#94a3b8]'}`}
          >
            <IconCalendar size={15} /> Calendar
          </button>
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {mobileView === 'pending' ? (
            activeTab === 'pending'
              ? PendingList()
              : activeTab === 'approved'
                ? ApprovedList()
                : RejectedList()
          ) : (
            CalendarPanel()
          )}
        </div>
      </div>

      {/* ── TABLET ── */}
      <div className="hidden md:flex lg:hidden flex-1 min-h-0 w-full h-full">
        <div className="w-1/3 border-r border-[#eef2f6] flex flex-col bg-white shadow-sm z-10">
          <div className="flex border-b border-[#eef2f6] bg-white shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'pending' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Pending
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'approved' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Approved
              {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'rejected' ? 'text-[#991b1b]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Declined
              {activeTab === 'rejected' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#991b1b] rounded-t-full"></div>}
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'pending'
              ? PendingList()
              : activeTab === 'approved'
                ? ApprovedList()
                : RejectedList()}
          </div>
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {CalendarPanel()}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex flex-1 min-h-0 w-full h-full">
        <div className="w-1/3 border-r border-[#eef2f6] flex flex-col bg-white shadow-sm z-10 overflow-hidden h-full">
          <div className="flex border-b border-[#eef2f6] bg-white shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'pending' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <IconClock size={15} /> Pending
              </div>
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 py-4 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'approved' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <IconCircleCheck size={15} /> Approved
              </div>
              {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex-1 py-4 text-[13px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'rejected' ? 'text-[#991b1b]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <IconCircleXmark size={15} /> Rejected
              </div>
              {activeTab === 'rejected' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#991b1b] rounded-t-full"></div>}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'pending'
              ? PendingList()
              : activeTab === 'approved'
                ? ApprovedList()
                : RejectedList()}
          </div>
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {CalendarPanel()}
        </div>
      </div>

      {/* ── FLOATING "CREATE APPOINTMENT" BUTTON (staff-booked, e.g. follow-ups) ── */}
      <button
        onClick={() => setCreateApptModal(true)}
        className="fixed bottom-6 right-6 z-[9000] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white
          rounded-full shadow-lg px-5 py-3.5 flex items-center gap-2 font-bold text-[13px]
          hover:opacity-90 transition-all"
      >
        <IconPlus size={14} />
        New Appointment
      </button>

      {/* ── CREATE APPOINTMENT MODAL ── */}
      <CreateAppointmentModal
        isOpen={createApptModal}
        onClose={() => setCreateApptModal(false)}
        onCreated={handleAppointmentCreated}
        currentStaffName={currentStaffName}
        currentStaffRole={currentUserRole}
      />

      {/* ── BATCH SCHEDULING MODAL ── */}
      {batchModal && createPortal(
        <ModalOverlay onClose={() => setBatchModal(false)}>
          <div className="bg-white w-full sm:max-w-[480px] sm:mx-4 sm:rounded-[16px] rounded-t-[20px]
            max-h-[92vh] overflow-y-auto animate-[fadeIn_0.25s_ease-out]
            [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7d7d4] [&::-webkit-scrollbar-thumb]:rounded-[4px]">

            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="px-6 pt-5 pb-4 border-b border-[#eef2f6]">
              <div className="text-[18px] font-bold text-[#1e293b] flex items-center gap-2">
                <IconCalendarCheck size={18} style={{ color: '#0F6E56' }} />
                Schedule {selectedIds.size} Patient{selectedIds.size > 1 ? 's' : ''}
              </div>
              <div className="text-[13px] text-[#64748b] mt-[4px]">
                Configure the schedule date and time distribution for this batch.
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              <div>
                <label className="block text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
                  Appointment Date *
                </label>
                <Datepicker
                  value={batchDate}
                  onChange={setBatchDate}
                  disablePastDates={selectedIds.size > 0}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em] mb-2">
                  {autoStagger ? 'Start Time Slot' : 'Time Slot (1-hour window)'}
                </label>
                <div className="relative">
                  <select
                    value={batchSlot}
                    onChange={e => setBatchSlot(e.target.value)}
                    className="w-full appearance-none px-[12px] py-[10px] border border-[#e2e8f0] rounded-[8px] text-[15px]
                      bg-white text-[#1e293b] outline-none focus:border-[#466460] transition-colors cursor-pointer"
                  >
                    {HOUR_SLOTS.map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                  <IconChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
                </div>
              </div>

              {selectedIds.size > 5 && (
                <div className="border border-[#e2e8f0] rounded-[10px] p-3.5 bg-[#f8fafc]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-[#1e293b]">Distribute Across Consecutive Slots</div>
                      <div className="text-[12px] text-[#64748b] mt-0.5">
                        Prevent clinic bottlenecks by spreading patients into multiple hours.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        checked={autoStagger}
                        onChange={e => setAutoStagger(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                    </label>
                  </div>

                  {autoStagger && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[#475569]">Max patients per 1-hour slot:</span>
                      <select
                        value={staggerCapacity}
                        onChange={e => setStaggerCapacity(Number(e.target.value))}
                        className="px-2.5 py-1 text-[13px] font-bold rounded-md border border-[#cbd5e1] bg-white text-[#1e293b] outline-none"
                      >
                        <option value={5}>5 patients / hr</option>
                        <option value={10}>10 patients / hr (Recommended)</option>
                        <option value={15}>15 patients / hr</option>
                        <option value={20}>20 patients / hr</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {!autoStagger && selectedIds.size > RECOMMENDED_SLOT_CAPACITY && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[8px] bg-[#fffbeb] border border-[#fde68a]">
                  <IconCircleExclamation size={16} color="#b45309" className="shrink-0 mt-0.5" />
                  <div className="text-[12.5px] text-[#92400e] leading-[1.5]">
                    <span className="font-bold">Capacity Notice:</span> Scheduling {selectedIds.size} students in a single 1-hour slot may cause heavy clinic queueing. Consider enabling distribution.
                  </div>
                </div>
              )}

              {batchDate && (
                <div className="flex flex-col gap-2 p-4 rounded-[10px] bg-[#EAF3DE] border border-[#c6e4a0]">
                  <div className="flex items-start gap-2 text-[13px] text-[#3B6D11]">
                    <IconCircleInfo size={15} style={{ color: '#3B6D11', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <span className="font-bold">{selectedIds.size} patient{selectedIds.size > 1 ? 's' : ''}</span>
                      {' '}on{' '}
                      <span className="font-bold">
                        {new Date(batchDate + 'T00:00:00').toLocaleDateString('en-PH', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {autoStagger && staggerPlan ? (
                    <div className="mt-1 flex flex-col gap-1 pl-6">
                      {staggerPlan.map(({ slot, items }, idx) => (
                        <div key={idx} className="text-[12px] text-[#2d520e] flex justify-between font-medium">
                          <span>{slot.label}:</span>
                          <span className="font-bold">{items.length} students</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#2d520e] pl-6">
                      Assigned to <span className="font-bold">{chosenSlotLabel}</span>.
                    </div>
                  )}
                </div>
              )}

              {selectedItems.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] font-bold text-[#475569] uppercase tracking-[0.06em]">
                      Selected Patients ({selectedItems.length})
                    </span>
                    {selectedItems.length > 10 && (
                      <span className="text-[11px] text-[#94a3b8]">Scroll to see all</span>
                    )}
                  </div>
                  <div className="border border-[#e2e8f0] rounded-[10px] overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                    {selectedItems.map((item, i) => (
                      <div key={item.id}
                        className={`flex items-center gap-3 px-3 py-[8px] text-[13px]
                          ${i < selectedItems.length - 1 ? 'border-b border-[#f1f5f9]' : ''}
                          ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                        <span className="font-['DM_Mono',monospace] text-[11px] font-bold text-white
                          bg-[#466460] rounded-[4px] px-[6px] py-[2px] min-w-[24px] text-center shrink-0">
                          #{pendingRequests.findIndex(x => x.id === item.id) + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1e293b] truncate text-[13px]">{item.name}</div>
                          <div className="text-[11px] text-[#64748b] truncate">{getUserData(item).university_id} &middot; {item.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-[#eef2f6] bg-white sticky bottom-0">
              <button
                onClick={handleBatchApprove}
                disabled={!batchDate}
                className="flex-1 py-[12px] bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white
                  border-none rounded-[10px] text-[15px] font-semibold cursor-pointer
                  transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                <IconCircleCheck size={16} color="white" />
                Confirm &amp; Approve All
              </button>
              <button
                onClick={() => setBatchModal(false)}
                className="px-6 py-[12px] bg-[#f1f5f9] text-[#475569] border-none
                  rounded-[10px] text-[15px] font-semibold cursor-pointer
                  transition-colors hover:bg-[#e2e8f0]"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>,
        document.body
      )}

      {/* ── DECLINE CONFIRMATION MODAL ── */}
      {declineModal.open && createPortal(
        <ModalOverlay onClose={handleDeclineCancel}>
          <div className="bg-white w-full sm:max-w-[400px] sm:mx-4 sm:rounded-[16px] rounded-t-[20px]
            p-8 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex justify-center -mt-2 mb-4 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            </div>

            <h3 className="text-center text-xl font-bold text-slate-800 mb-3">
              Decline Request{declineModal.ids.length > 1 ? 's' : ''}?
            </h3>

            <p className="text-center text-base text-slate-500 mb-8">
              Are you sure you want to decline {declineModal.ids.length} appointment request{declineModal.ids.length > 1 ? 's' : ''}?
              This action cannot be undone.
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleDeclineCancel}
                className="flex-1 px-5 py-3 bg-slate-100 text-slate-600 border-none rounded-xl text-base font-semibold cursor-pointer hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineConfirm}
                className="flex-1 px-5 py-3 bg-red-600 text-white border-none rounded-xl text-base font-semibold cursor-pointer hover:bg-red-700 transition-colors"
              >
                Yes, Decline
              </button>
            </div>
          </div>
        </ModalOverlay>,
        document.body
      )}

      {/* ── DETAIL MODAL ── */}
      {detailModal && createPortal(
        <ModalOverlay onClose={() => setDetailModal(null)}>
          <div className="bg-white w-full sm:max-w-[440px] sm:mx-4 sm:rounded-[14px] rounded-t-[20px]
            max-h-[85vh] overflow-y-auto p-[26px] animate-[fadeIn_0.3s_ease-out]">
            <div className="flex justify-center -mt-2 mb-4 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <h3 className="m-0 mb-[16px] text-[#466460] text-[1.1rem] font-bold flex items-center gap-2">
              <IconUserClock size={18} style={{ color: '#466460' }} />
              Appointment Details
            </h3>
            <div className="divide-y divide-[#f1f5f9]">
              {[
                { Icon: IconUser,          label: 'Full Name',   value: detailModal.name },
                { Icon: IconIdCard,        label: 'ID Number',   value: getUserData(detailModal).university_id },
                { Icon: IconTag,           label: 'Type',        value: detailModal.type?.charAt(0).toUpperCase() + detailModal.type?.slice(1) },
                { Icon: IconBuilding,      label: 'Department',  value: getUserData(detailModal).department },
                { Icon: IconGraduationCap, label: 'Program',     value: getUserData(detailModal).program },
                { Icon: IconUsers,         label: 'Section',     value: getUserData(detailModal).section },
                { Icon: IconStethoscope,   label: 'Purpose',     value: detailModal.reason },
                ...(detailModal.year && detailModal.month && detailModal.day
                  ? [{ Icon: IconCalendar, label: 'Date', value: formatDateTime(new Date(Number(detailModal.year), Number(detailModal.month) - 1, Number(detailModal.day))) }]
                  : []),
                ...(detailModal.time ? [{ Icon: IconClock, label: 'Time', value: detailModal.time }] : []),
                { Icon: IconCircleCheck,   label: 'Status',      value: detailModal.status?.charAt(0).toUpperCase() + detailModal.status?.slice(1) },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-[12px] py-[8px] text-[14px]">
                  <Icon size={16} style={{ color: '#0F6E56', flexShrink: 0 }} />
                  <span className="text-[#64748b] min-w-[110px]">{label}</span>
                  <span className={`font-bold ${label === 'Status' && (detailModal.status === 'missed' || detailModal.status === 'rejected') ? 'text-[#b45309]' : 'text-[#1e293b]'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <div className="flex gap-3">
                {/* ── Redirect to Consultation button if online consultation ── */}
                {isOnlineConsultation(detailModal.reason) && (
                  <button
                    onClick={() => handleGoToConsultation(detailModal)}
                    disabled={detailModal.status === 'done' || detailModal.status === 'missed' || detailModal.status === 'rejected'}
                    className={`flex-1 p-[12px] border-none rounded-[10px] font-semibold text-[14px] text-white flex items-center justify-center gap-2 transition-all shadow-sm
                      ${(detailModal.status === 'done' || detailModal.status === 'missed' || detailModal.status === 'rejected')
                        ? 'bg-gradient-to-br from-[#94a3b8] to-[#64748b] cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-br from-[#15803d] to-[#16a34a] cursor-pointer hover:opacity-90'
                      }`}
                  >
                    <IconVideo size={16} />
                    Go to Consultation
                  </button>
                )}

                {/* ── Examine Patient Button ── */}
                {detailModal.status !== 'rejected' && (
                  <button
                    onClick={() => handleExaminePatient(detailModal)}
                    disabled={detailModal.status === 'done' || detailModal.status === 'missed'}
                    className={`flex-1 p-[12px] border-none rounded-[10px] font-semibold
                      text-[14px] text-white flex items-center justify-center gap-2 transition-opacity
                      ${(detailModal.status === 'done' || detailModal.status === 'missed')
                        ? 'bg-gradient-to-br from-[#94a3b8] to-[#64748b] cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-br from-[#466460] to-[#5a7a76] cursor-pointer hover:opacity-90'
                      }`}
                  >
                    <IconStethoscope size={15} style={{ color: 'white' }} />
                    Examine Patient
                  </button>
                )}
              </div>

              <button
                onClick={() => setDetailModal(null)}
                className="w-full p-[12px] border-none rounded-[10px] cursor-pointer font-semibold
                  text-[14px] bg-[#e2e8f0] text-[#475569] hover:bg-[#cbd5e1] transition-colors text-center"
              >
                Close
              </button>
            </div>
          </div>
        </ModalOverlay>,
        document.body
      )}

      {/* ── Examination Modal rendered via Portal ── */}
      {examModalOpen && createPortal(
        <ExaminationModal
          isOpen={examModalOpen}
          onClose={handleExamModalClose}
          patient={selectedPatientForExam}
          examType={examType}
          setExamType={setExamType}
          onExamSubmitted={handleExamSubmitted}
          resetKey={examResetKey}
          currentUserRole={currentUserRole}
        />,
        document.body
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Appointments;