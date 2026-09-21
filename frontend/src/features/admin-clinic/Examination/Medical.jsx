// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examination\Medical.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import DatePicker from '../../../components/Datepicker';
import DateTimePicker from '../../../components/DateTimePicker';
import {
  createMedicalExamination,
  updateMedicalExamination,
} from '../../../services/examinations.service';


const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

const BRANDING_LOGO_EVENT = 'meditrack:branding-logo-updated';
const BRANDING_LOGO_STORAGE_KEY = 'meditrack_branding_logo_updated';

const useBrandingLogo = () => {
  const [logoUrl, setLogoUrl] = useState('');

  const loadLogo = async () => {
    try {
      const response = await fetch(`${API_URL}/storage/branding/logo`, {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error ||
            `Branding endpoint returned ${response.status}`
        );
      }

      const separator = data.url.includes('?') ? '&' : '?';
      setLogoUrl(`${data.url}${separator}v=${Date.now()}`);
    } catch (error) {
      console.error('[Branding] Failed to load active logo:', error);
      setLogoUrl('');
    }
  };

  useEffect(() => {
    loadLogo();

    const handleLogoUpdate = (event) => {
      const nextUrl = event?.detail?.url;

      if (nextUrl) {
        const separator = nextUrl.includes('?') ? '&' : '?';
        setLogoUrl(`${nextUrl}${separator}v=${Date.now()}`);
      } else {
        loadLogo();
      }
    };

    const handleStorage = (event) => {
      if (event.key === BRANDING_LOGO_STORAGE_KEY) {
        loadLogo();
      }
    };

    window.addEventListener(BRANDING_LOGO_EVENT, handleLogoUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(BRANDING_LOGO_EVENT, handleLogoUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return logoUrl;
};

// ── Static data ────────────────────────────────────────────────────────────────

const medicalConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular Disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Pneumonia', 'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)',
  'Urinary Tract Infection', 'Genito/Reproductive, specify', 'Others',
];

const familyConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)', 'Others',
];

const healthConditions = [
  'Heart Attack', 'High Blood Pressure', 'Low Blood Pressure', 'Heart Trouble',
  'HIV/AIDS and Documented Dx', 'Hay Fever / Allergies', 'Epilepsy/Convulsions', 'Fainting/Seizure',
  'Rapid Weight Loss', 'Sexually Transmitted Dx / Ulcers', 'Diabetes', 'Heart Problem/Surgery',
  'Cancer / Tumors', 'Anemia', 'Asthma', 'Stomach Troubles / Ulcers',
  'Head Injuries', 'Allergies/Drugs', 'Rheumatic Heart Disease', 'Respiratory Dx / PTB',
  'Stroke', 'Kidney Disease', 'Thyroid Problem', 'Hepatitis',
];

// Each visit reason has a default classification. Clinic staff can correct the
// classification before saving if the actual encounter differs from its purpose.
const visitReasonGroups = [
  {
    label: 'Patient Visit — Consultation / Treatment',
    options: [
      'General Consultation',
      'Fever / Flu-like Symptoms',
      'Headache / Dizziness',
      'Injury / Accident',
      'Pain / Discomfort',
      'Emergency',
      'Follow-up Consultation',
      'Other Health Concern',
    ],
    type: 'patient',
  },
  {
    label: 'Non-Patient Visit — Clearance / Requirement',
    options: [
      'Medical Clearance',
      'School Requirement',
      'OJT / Internship Requirement',
      'Employment Requirement',
      'Medical Certificate / Documentation',
      'Physical Examination',
      'Other Requirement',
    ],
    type: 'non_patient',
  },
];

const visitReasonOptions = visitReasonGroups.flatMap(group =>
  group.options.map(label => ({ label, type: group.type }))
);

const getSuggestedVisitType = (reason) => {
  const normalizedReason = String(reason || '').trim().toLowerCase();
  if (!normalizedReason) return '';

  const exactMatch = visitReasonOptions.find(
    option => option.label.toLowerCase() === normalizedReason
  );
  if (exactMatch) return exactMatch.type;

  const nonPatientKeywords = [
    'clearance', 'requirement', 'ojt', 'internship', 'employment',
    'documentation', 'physical examination', 'medical certificate',
  ];

  return nonPatientKeywords.some(keyword => normalizedReason.includes(keyword))
    ? 'non_patient'
    : 'patient';
};

const getVisitTypeLabel = (type) => {
  if (type === 'patient') return 'Patient Visit';
  if (type === 'non_patient') return 'Non-Patient Visit';
  return 'Unclassified';
};

// ─── Academic School Year Generator ────────────────────────────────────────────
const generateSchoolYears = () => {
  const years = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startYear = 2025;
  const endLimitYear = 2058;

  for (let i = startYear; i <= endLimitYear; i++) {
    const endYear = i + 1;
    const yearStr = `${i}-${endYear}`;

    let include1stSem = false;
    let include2ndSem = false;
    let includeMidYear = false;

    if (i > currentYear) {
      include1stSem = true;
      include2ndSem = true;
      includeMidYear = true;
    } else if (i === currentYear) {
      if (currentMonth >= 7) include1stSem = true;
      if (currentMonth >= 0 && currentMonth <= 4) include2ndSem = true;
      if (currentMonth >= 5 && currentMonth <= 6) includeMidYear = true;
    } else if (i === currentYear - 1) {
      if (currentMonth >= 0 && currentMonth <= 4) include2ndSem = true;
      if (currentMonth >= 5 && currentMonth <= 6) includeMidYear = true;
    }

    if (i === 2025) {
      include1stSem = true;
      include2ndSem = true;
      includeMidYear = true;
    }

    if (include1stSem) years.push(`${yearStr} 1st Semester`);
    if (include2ndSem) years.push(`${yearStr} 2nd Semester`);
    if (includeMidYear) years.push(`${yearStr} Mid Year`);
  }

  return years;
};

const schoolYearOptions = generateSchoolYears();

// ── Shared style tokens ────────────────────────────────────────────────────────
// ── Helper: Fetch physicians for dropdown ───────────────────────────────────────
const fetchPhysicians = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, license_number, role')
      .eq('role', 'doctor')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching physicians:', error);
      return [];
    }

    // Format: "LastName, FirstName M.D / License no. XXXXXX"
    return (data || []).map(doc => ({
      id: doc.id,
      display: `${doc.last_name || ''}, ${doc.first_name || ''} M.D / License no. ${doc.license_number || ''}`.trim(),
      licenseNumber: doc.license_number || '',
      firstName: doc.first_name || '',
      lastName: doc.last_name || '',
    }));
  } catch (err) {
    console.error('Error fetching physicians:', err);
    return [];
  }
};

// ── Helper: Fetch nurses for dropdown ───────────────────────────────────────
const fetchNurses = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, uid, first_name, last_name, role')
      .eq('role', 'nurse')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching nurses:', error);
      return [];
    }

    // Format: "LastName, FirstName"
    return (data || []).map(doc => ({
      id: doc.id,
      uid: doc.uid,
      display: `${doc.last_name || ''}, ${doc.first_name || ''}`.trim(),
      firstName: doc.first_name || '',
      lastName: doc.last_name || ''
    }));
  } catch (err) {
    console.error('Error fetching nurses:', err);
    return [];
  }
};

const inputClass   = "w-full min-h-11 p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
const requiredLabelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1";
const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

// ── Summary sub-components ─────────────────────────────────────────────────────

const SumItem = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
    <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{label}</div>
    <div className={`text-[12px] font-semibold ${value ? 'text-slate-800' : 'text-slate-300 italic font-normal'}`}>
      {value || 'Not provided'}
    </div>
  </div>
);

const SumSection = ({ icon, title, children }) => (
  <div className="mb-5">
    <h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-[#466460] tracking-widest pb-1.5 border-b-2 border-[#e0eceb] mb-3">
      <i className={`fa-solid ${icon}`}></i> {title}
    </h4>
    {children}
  </div>
);

// ── Input Validation Helpers ─────────────────────────────────────────────────
const filterNumbersOnly = (value) => value.replace(/[^0-9]/g, '');
const filterNumbersAndDot = (value) => value.replace(/[^0-9.]/g, '');
const filterNumbersAndSlash = (value) => value.replace(/[^0-9/]/g, '');

// ── DB History Display Helper ───────────────────────────────────────────────
const parseHistoryItemDisplay = (item) => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && item.condition) {
    const base = item.condition.replace(', specify', '').replace(' (If PTB, category)', '');
    return item.specified ? `${base}: ${item.specified}` : base;
  }
  return String(item);
};

// ── UUID validation ───────────────────────────────────────────────────────────
const isUUID = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ── Safe JSON field parser ───────────────────────────────────────────────────
const parseJsonField = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) || fallback; } catch (e) { return fallback; }
  }
  if (typeof value === 'object') return value;
  return fallback;
};

// ── Helper: normalize selectedPatient into the flat "users" row shape ───────
const normalizePatient = (p) => {
  let u = p || {};
  if (p?.users) u = Array.isArray(p.users) ? (p.users[0] || {}) : p.users;

  const rawId = u.id ?? p?.id ?? null;

  return {
    uid: u.uid || p?.uid || null,
    id: isUUID(rawId) ? rawId : null,
  };
};

// ── Shared timeline / accordion helpers (matches Approvals "Past Records" design) ──
const HistoryStatusBadge = ({ status }) => {
  const map = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {status || 'unknown'}
    </span>
  );
};

const HistorySectionLabel = ({ icon, color, children }) => (
  <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
    <i className={`fa-solid ${icon} ${color}`}></i>{children}
  </h5>
);

const HistoryTagGroup = ({ title, items, tint }) => {
  const tints = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((h, i) => (
          <span key={i} className={`px-2 py-1 rounded-md text-[11px] font-bold border ${tints[tint]}`}>{h}</span>
        ))}
      </div>
    </div>
  );
};

// ── Visit-history analytics helpers ──────────────────────────────────────────
const HEALTH_QUESTIONNAIRE_ITEMS = [
  { key: 'q1', label: 'Are you in good health?' },
  { key: 'q2', label: 'Are you under medical treatment now?', detailKey: 'q2Details' },
  { key: 'q3', label: 'Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?', detailKey: 'q3Details' },
  { key: 'q4', label: 'Are you taking any medication?', detailKey: 'q4Details' },
  { key: 'q5', label: 'For women only: Are you pregnant?' },
  { key: 'q5b', label: 'Are you nursing?' },
];

const parseHistoryJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const asHistoryArray = (value) => {
  const parsed = parseHistoryJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

const asHistoryObject = (value) => {
  const parsed = parseHistoryJson(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const formatHistoryDate = (value, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(withTime
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : {}),
  });
};

const normalizeYesNo = (value) => String(value || '').trim().toLowerCase();

const getRecordPatientInfo = (record) => asHistoryObject(record?.patient_info);
const getRecordVitals = (record) => {
  const raw = parseHistoryJson(record?.vital_records, {});
  return Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
};

const getRecordQuestionnaire = (record) => asHistoryObject(record?.questionnaire);
const getRecordLabs = (record) => asHistoryObject(record?.laboratory_results);
const getRecordCovid = (record) => asHistoryObject(record?.covid_history);
const getRecordSurgical = (record) => {
  const parsed = parseHistoryJson(record?.surgical_history, []);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.operations)) return parsed.operations;
  return [];
};

const getRecordSex = (record) => {
  const patientInfo = getRecordPatientInfo(record);
  return String(patientInfo?.sex || record?.sex || '').trim();
};

const TinyBar = ({ label, value, total, suffix = '' }) => {
  const safeTotal = Math.max(Number(total) || 0, 1);
  const safeValue = Math.max(Number(value) || 0, 0);
  const width = Math.min(100, Math.round((safeValue / safeTotal) * 100));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[11px] font-semibold text-slate-600 truncate">{label}</span>
        <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
          {safeValue}{suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#466460] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const MiniLineChart = ({ title, values, unit = '' }) => {
  const clean = values
    .map((item, index) => ({
      index,
      label: item.label,
      value: Number(item.value),
    }))
    .filter(item => Number.isFinite(item.value));

  if (clean.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-xs text-slate-400 mt-3 italic">No recorded values yet.</p>
      </div>
    );
  }

  const width = 260;
  const height = 92;
  const pad = 12;
  const min = Math.min(...clean.map(v => v.value));
  const max = Math.max(...clean.map(v => v.value));
  const spread = Math.max(max - min, 1);

  const points = clean.map((item, i) => {
    const x = clean.length === 1
      ? width / 2
      : pad + (i / (clean.length - 1)) * (width - pad * 2);

    const y = height - pad - ((item.value - min) / spread) * (height - pad * 2);
    return { ...item, x, y };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const latest = clean[clean.length - 1]?.value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-sm font-extrabold text-[#466460]">
          {latest}{unit}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[92px] overflow-visible">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e2e8f0" strokeWidth="1" />
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-[#466460]"
        />
        {points.map((point, index) => (
          <g key={`${title}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="currentColor" strokeWidth="2" className="text-[#466460]" />
            <title>{`${point.label}: ${point.value}${unit}`}</title>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-slate-400 mt-1">
        <span>Oldest</span>
        <span>Latest</span>
      </div>
    </div>
  );
};

const MedicalHistoryAnalytics = ({ records }) => {
  const chronological = [...records].sort(
    (a, b) => new Date(a.exam_date || a.created_at || 0) - new Date(b.exam_date || b.created_at || 0)
  );

  const total = records.length;
  const patientVisits = records.filter(r => r.visit_type === 'patient').length;
  const nonPatientVisits = records.filter(r => r.visit_type === 'non_patient').length;
  const approved = records.filter(r => normalizeYesNo(r.status) === 'approved').length;
  const pending = records.filter(r => normalizeYesNo(r.status) === 'pending').length;
  const certificates = records.filter(r => r.issue_cert === true).length;

  const purposeCounts = records.reduce((acc, record) => {
    const label = String(record.visit_reason || '').trim() || 'Unspecified';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const topPurposes = Object.entries(purposeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const conditionCounts = records.reduce((acc, record) => {
    asHistoryArray(record.checked_health).forEach(item => {
      const label = parseHistoryItemDisplay(item);
      if (label) acc[label] = (acc[label] || 0) + 1;
    });
    return acc;
  }, {});

  const topConditions = Object.entries(conditionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const questionnaireYes = HEALTH_QUESTIONNAIRE_ITEMS.map(item => ({
    ...item,
    count: records.filter(record => {
      const questionnaire = getRecordQuestionnaire(record);
      return normalizeYesNo(questionnaire[item.key]) === 'yes';
    }).length,
  }));

  const smokingYes = records.filter(r => normalizeYesNo(r.smoking) === 'yes').length;
  const alcoholYes = records.filter(r => normalizeYesNo(r.alcohol) === 'yes').length;
  const drugsYes = records.filter(r => normalizeYesNo(r.drugs) === 'yes').length;

  const vitalsSeries = chronological.map(record => {
    const vitals = getRecordVitals(record);
    return {
      label: formatHistoryDate(record.exam_date || record.created_at),
      pr: vitals.pr,
      rr: vitals.rr,
      temp: vitals.temp,
    };
  });

  if (records.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border border-[#d1e7e5] bg-gradient-to-br from-[#f0f7f6] to-white p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h5 className="text-sm font-extrabold text-[#466460] flex items-center gap-2">
              <i className="fa-solid fa-chart-line"></i>
              Personalized Visit Analytics
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Summary of this patient's recorded medical visits. This is descriptive history, not a diagnosis.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#466460] bg-white border border-[#d1e7e5] px-2.5 py-1 rounded-full">
            {total} total visit{total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {[
            ['Patient Visits', patientVisits, 'fa-stethoscope'],
            ['Non-Patient', nonPatientVisits, 'fa-file-circle-check'],
            ['Approved', approved, 'fa-circle-check'],
            ['Pending', pending, 'fa-clock'],
            ['Certificates', certificates, 'fa-file-medical'],
            ['Unclassified', total - patientVisits - nonPatientVisits, 'fa-circle-question'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <i className={`fa-solid ${icon} text-[#466460] text-xs`}></i>
              <p className="text-xl font-extrabold text-slate-800 mt-2">{value}</p>
              <p className="text-[10px] font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Visit Purpose Distribution
          </h6>
          <div className="space-y-3">
            {topPurposes.map(([label, count]) => (
              <TinyBar key={label} label={label} value={count} total={total} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Repeated Health Conditions
          </h6>
          {topConditions.length > 0 ? (
            <div className="space-y-3">
              {topConditions.map(([label, count]) => (
                <TinyBar key={label} label={label} value={count} total={total} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No checked health conditions recorded yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniLineChart
          title="Pulse Rate Trend"
          unit=" bpm"
          values={vitalsSeries.map(v => ({ label: v.label, value: v.pr }))}
        />
        <MiniLineChart
          title="Respiratory Rate Trend"
          unit=" cpm"
          values={vitalsSeries.map(v => ({ label: v.label, value: v.rr }))}
        />
        <MiniLineChart
          title="Temperature Trend"
          unit=" °C"
          values={vitalsSeries.map(v => ({ label: v.label, value: v.temp }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Questionnaire — Yes Responses Across Visits
          </h6>
          <div className="space-y-3">
            {questionnaireYes.map(item => (
              <TinyBar
                key={item.key}
                label={item.label}
                value={item.count}
                total={total}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Personal / Social History Occurrence
          </h6>
          <div className="space-y-3">
            <TinyBar label="Smoking marked Yes" value={smokingYes} total={total} />
            <TinyBar label="Alcohol marked Yes" value={alcoholYes} total={total} />
            <TinyBar label="Illicit drugs marked Yes" value={drugsYes} total={total} />
          </div>
          <p className="text-[10px] text-slate-400 mt-4">
            Counts show how many recorded visits contained a “Yes” response; they do not determine current behavior.
          </p>
        </div>
      </div>
    </div>
  );
};

const MedicalVisitCard = ({ record, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  const vitals = getRecordVitals(record);
  const questionnaire = getRecordQuestionnaire(record);
  const patientInfo = getRecordPatientInfo(record);
  const labs = getRecordLabs(record);
  const covid = getRecordCovid(record);
  const surgicalHistory = getRecordSurgical(record);
  const sex = getRecordSex(record);
  const isFemale = sex.toLowerCase() === 'female';

  const history = {
    medical: asHistoryArray(record.checked_medical).map(parseHistoryItemDisplay),
    family: asHistoryArray(record.checked_family).map(parseHistoryItemDisplay),
    health: asHistoryArray(record.checked_health).map(parseHistoryItemDisplay),
  };

  const hasVitals = [
    vitals.bp,
    vitals.pr,
    vitals.rr,
    vitals.temp,
    vitals.height,
    vitals.weight,
    vitals.bmi,
    vitals.waist,
    isFemale ? vitals.lmp : '',
  ].some(Boolean);

  const hasHistory =
    history.medical.length > 0 ||
    history.family.length > 0 ||
    history.health.length > 0;

  const hasOtherHistory =
    record.other_medical_history ||
    record.other_family_history;

  const hasVisitInfo =
    record.visit_reason ||
    record.visit_type ||
    record.school_year ||
    record.semester;

  const hasSocialHistory =
    record.smoking ||
    record.alcohol ||
    record.drugs;

  const hasQuestionnaire =
    Object.keys(questionnaire).length > 0;

  const hasLabs = ['cbc', 'ua', 'xray'].some(key => {
    const item = labs?.[key] || {};
    return item?.result || item?.facility || item?.date;
  });

  const hasCovid =
    Object.keys(covid).length > 0 &&
    (
      covid?.history ||
      covid?.dose1?.vaccineName ||
      covid?.dose2?.vaccineName ||
      covid?.booster1?.vaccineName ||
      covid?.booster2?.vaccineName
    );

  const hasRemarks =
    record.finding1 ||
    record.remarks ||
    record.is_fit !== null ||
    record.is_normal_findings !== null;

  return (
    <div className="relative">
      <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-[#e07a5f] ring-4 ring-white"></div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <i className={`fa-solid fa-chevron-right text-slate-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}></i>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{record._datetime}</p>
              <p className="text-xs text-slate-500 truncate">
                {record.physician ? (
                  <>Physician: <span className="font-medium text-slate-600">{record.physician}</span></>
                ) : (
                  <>Nurse on duty: <span className="font-medium text-slate-600">{record.nurse_on_duty || 'Unknown'}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.visit_type && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                record.visit_type === 'patient'
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-sky-100 text-sky-700 border-sky-200'
              }`}>
                {getVisitTypeLabel(record.visit_type)}
              </span>
            )}
            <HistoryStatusBadge status={record.status} />
          </div>
        </button>

        {open && (
          <div className="p-4 space-y-5 border-t border-slate-100">

            {/* Visit information */}
            <div>
              <HistorySectionLabel icon="fa-clipboard-question" color="text-[#466460]">
                Visit Information
              </HistorySectionLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Reason / Purpose</p>
                  <p className="text-sm font-bold text-slate-800">{record.visit_reason || 'Not recorded'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Classification</p>
                  <p className="text-sm font-bold text-slate-800">{getVisitTypeLabel(record.visit_type)}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">School Year / Semester</p>
                  <p className="text-sm font-bold text-slate-800">
                    {[record.school_year, record.semester].filter(Boolean).join(' · ') || 'Not recorded'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Exam Date</p>
                  <p className="text-sm font-bold text-slate-800">
                    {formatHistoryDate(record.exam_date || record.created_at, true)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Physician</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{record.physician || 'Not recorded'}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Nurse on Duty</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{record.nurse_on_duty || 'Not recorded'}</p>
                </div>
              </div>
            </div>

            {/* Vitals + LMP */}
            {hasVitals && (
              <div>
                <HistorySectionLabel icon="fa-heart-pulse" color="text-rose-500">
                  Vital Signs & Anthropometric Measurements
                </HistorySectionLabel>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2 mt-2">
                  {[
                    { label: 'Blood Pressure', value: vitals.bp, unit: 'mmHg' },
                    { label: 'Pulse Rate', value: vitals.pr, unit: 'bpm' },
                    { label: 'Respiratory Rate', value: vitals.rr, unit: 'cpm' },
                    { label: 'Temperature', value: vitals.temp, unit: '°C' },
                    { label: 'Height', value: vitals.height, unit: 'cm' },
                    { label: 'Weight', value: vitals.weight, unit: 'kg' },
                    { label: 'BMI', value: vitals.bmi, unit: 'kg/m²' },
                    { label: 'Waist', value: vitals.waist, unit: 'cm' },
                  ].filter(item => item.value !== undefined && item.value !== null && item.value !== '').map((item) => (
                    <div key={item.label} className="bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {item.value} <span className="text-[10px] font-medium text-slate-400">{item.unit}</span>
                      </p>
                    </div>
                  ))}

                  {isFemale && (
                    <div className="bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide">
                        Last Menstrual Period (LMP)
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {vitals.lmp ? formatHistoryDate(vitals.lmp) : 'Not recorded'}
                      </p>
                    </div>
                  )}
                </div>

                {vitals.remarks && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Vital-sign remarks</p>
                    <p className="text-xs text-slate-600 mt-1">{vitals.remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Social history */}
            {hasSocialHistory && (
              <div>
                <HistorySectionLabel icon="fa-person" color="text-orange-500">
                  Personal / Social History
                </HistorySectionLabel>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {[
                    ['Smoking', record.smoking, record.smoking_details],
                    ['Alcohol', record.alcohol, record.alcohol_details],
                    ['Illicit Drugs', record.drugs, record.drugs_details],
                  ].map(([label, answer, details]) => {
                    const yes = normalizeYesNo(answer) === 'yes';

                    return (
                      <div
                        key={label}
                        className={`rounded-lg border px-3 py-2 ${
                          yes
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-emerald-50/50 border-emerald-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            yes
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {answer || 'Not recorded'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-2">
                          {details || (yes ? 'Yes, but no additional details were recorded.' : 'No additional details.')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Questionnaire */}
            {hasQuestionnaire && (
              <div>
                <HistorySectionLabel icon="fa-circle-question" color="text-blue-500">
                  Health History Questionnaire
                </HistorySectionLabel>

                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                  {HEALTH_QUESTIONNAIRE_ITEMS.map((item, index) => {
                    const answer = questionnaire[item.key];
                    const detail = item.detailKey ? questionnaire[item.detailKey] : '';
                    const yes = normalizeYesNo(answer) === 'yes';

                    return (
                      <div
                        key={item.key}
                        className={`grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5 ${
                          index > 0 ? 'border-t border-slate-100' : ''
                        }`}
                      >
                        <div>
                          <p className="text-xs text-slate-700">{item.label}</p>
                          {detail && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              Details: <span className="font-medium">{detail}</span>
                            </p>
                          )}
                        </div>

                        <span className={`self-start text-[10px] font-bold px-2 py-1 rounded-full ${
                          yes
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {answer || 'Not answered'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clinical history */}
            {(hasHistory || hasOtherHistory) && (
              <div>
                <HistorySectionLabel icon="fa-notes-medical" color="text-purple-500">
                  Clinical History
                </HistorySectionLabel>

                <div className="grid md:grid-cols-3 gap-3 mt-2">
                  <HistoryTagGroup title="Past Medical History" items={history.medical} tint="amber" />
                  <HistoryTagGroup title="Family History" items={history.family} tint="purple" />
                  <HistoryTagGroup title="Checked Health Conditions" items={history.health} tint="cyan" />
                </div>

                {record.other_medical_history && (
                  <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Additional Medical History</p>
                    <p className="text-xs text-slate-600 mt-1">{record.other_medical_history}</p>
                  </div>
                )}

                {record.other_family_history && (
                  <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Additional Family History</p>
                    <p className="text-xs text-slate-600 mt-1">{record.other_family_history}</p>
                  </div>
                )}
              </div>
            )}

            {/* Surgical history */}
            {surgicalHistory.length > 0 && (
              <div>
                <HistorySectionLabel icon="fa-scalpel" color="text-fuchsia-500">
                  Surgical / Hospitalization History
                </HistorySectionLabel>

                <div className="mt-2 space-y-2">
                  {surgicalHistory.map((item, index) => (
                    <div key={item.id || index} className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Operation</p>
                        <p className="text-xs font-semibold text-slate-700">{item.operation || 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                        <p className="text-xs font-semibold text-slate-700">{formatHistoryDate(item.date)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Notes</p>
                        <p className="text-xs font-semibold text-slate-700">{item.notes || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labs */}
            {hasLabs && (
              <div>
                <HistorySectionLabel icon="fa-flask" color="text-teal-500">
                  Laboratory Results
                </HistorySectionLabel>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {[
                    ['Complete Blood Count (CBC)', labs?.cbc],
                    ['Urinalysis', labs?.ua],
                    ['Chest X-Ray', labs?.xray],
                  ].map(([label, item]) => (
                    <div key={label} className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-teal-600">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{item?.result || 'No result recorded'}</p>
                      {item?.facility && <p className="text-[10px] text-slate-500 mt-1">Facility: {item.facility}</p>}
                      {item?.date && <p className="text-[10px] text-slate-500">Date: {formatHistoryDate(item.date)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COVID history */}
            {hasCovid && (
              <div>
                <HistorySectionLabel icon="fa-syringe" color="text-lime-500">
                  COVID-19 History & Vaccination
                </HistorySectionLabel>

                {covid.history && (
                  <div className="mt-2 mb-2 rounded-lg bg-lime-50/60 border border-lime-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-lime-600">COVID-19 History</p>
                    <p className="text-xs text-slate-700 mt-1">{covid.history}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    ['Dose 1', covid?.dose1],
                    ['Dose 2', covid?.dose2],
                    ['Booster 1', covid?.booster1],
                    ['Booster 2', covid?.booster2],
                  ].map(([label, dose]) => (
                    <div key={label} className="rounded-lg border border-lime-100 bg-lime-50/40 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-lime-600">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{dose?.vaccineName || 'Not recorded'}</p>
                      {dose?.date && <p className="text-[10px] text-slate-500 mt-1">{formatHistoryDate(dose.date)}</p>}
                      {dose?.remarks && <p className="text-[10px] text-slate-500">{dose.remarks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment */}
            {hasRemarks && (
              <div>
                <HistorySectionLabel icon="fa-user-doctor" color="text-teal-500">
                  Clinical Assessment
                </HistorySectionLabel>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Finding</p>
                    <p className="text-xs text-slate-700 mt-1">{record.finding1 || 'Not recorded'}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Remarks</p>
                    <p className="text-xs text-slate-700 mt-1">{record.remarks || 'Not recorded'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {record.is_fit !== null && record.is_fit !== undefined && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      record.is_fit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.is_fit ? 'Fit' : 'Not marked fit'}
                    </span>
                  )}

                  {record.is_normal_findings !== null && record.is_normal_findings !== undefined && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      record.is_normal_findings ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.is_normal_findings ? 'Normal findings' : 'Findings require attention'}
                    </span>
                  )}

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    record.issue_cert
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {record.issue_cert ? 'Certificate issued' : 'No certificate issued'}
                  </span>
                </div>
              </div>
            )}

            {/* Patient demographics snapshot */}
            {Object.keys(patientInfo).length > 0 && (
              <details className="rounded-lg border border-slate-200 bg-white">
                <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold uppercase text-slate-500">
                  Demographics snapshot from this visit
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 pb-3">
                  {[
                    ['Age', patientInfo.age],
                    ['Sex', patientInfo.sex],
                    ['Birthday', formatHistoryDate(patientInfo.birthday)],
                    ['Civil Status', patientInfo.civil_status],
                    ['Religion', patientInfo.religion],
                    ['Nationality', patientInfo.nationality],
                    ['Contact', patientInfo.contact_no],
                    ['Emergency Contact', patientInfo.emergency_contact],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-slate-50 px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Medical Visit History Component ─────────────────────────────────────────
const MedicalVisitHistory = ({ selectedPatient }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // History + analytics filter
  const [historyFilterMode, setHistoryFilterMode] = useState('all');
  const [historyDate, setHistoryDate] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');

  useEffect(() => {
    const { uid } = normalizePatient(selectedPatient);

    if (!uid) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);

      try {
        const { data: medData, error: medError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', uid)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (medError) throw medError;

        const medRecords = (medData || []).map(record => ({
          ...record,

          // Normalize JSONB fields in case a database export/API returns them as strings.
          patient_info: asHistoryObject(record.patient_info),
          vital_records: getRecordVitals(record),
          questionnaire: getRecordQuestionnaire(record),
          checked_medical: asHistoryArray(record.checked_medical),
          checked_family: asHistoryArray(record.checked_family),
          checked_health: asHistoryArray(record.checked_health),
          laboratory_results: getRecordLabs(record),
          covid_history: getRecordCovid(record),
          surgical_history: getRecordSurgical(record),

          kind: 'medical',
          _date: record.exam_date || record.created_at?.split('T')[0] || '',
          _datetime: formatHistoryDate(record.created_at || record.exam_date, true),
        }));

        setRecords(medRecords);
      } catch (err) {
        console.error('Error fetching medical visit history:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedPatient?.uid, selectedPatient?.id, selectedPatient?.users]);

  // Reset filters when switching to a different patient
  useEffect(() => {
    setHistoryFilterMode('all');
    setHistoryDate('');
    setHistoryMonth('');
  }, [selectedPatient?.uid, selectedPatient?.id]);

  const getRecordFilterDate = (record) => {
    const rawDate =
      record.exam_date ||
      record.created_at ||
      record.approved_at ||
      record.updated_at;

    if (!rawDate) return null;

    const parsed = new Date(rawDate);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  };

  const filteredRecords = records.filter(record => {
    if (historyFilterMode === 'all') {
      return true;
    }

    const recordDate = getRecordFilterDate(record);

    if (!recordDate) {
      return false;
    }

    if (historyFilterMode === 'date') {
      if (!historyDate) return true;

      const year = recordDate.getFullYear();
      const month = String(recordDate.getMonth() + 1).padStart(2, '0');
      const day = String(recordDate.getDate()).padStart(2, '0');
      const recordDateString = `${year}-${month}-${day}`;

      return recordDateString === historyDate;
    }

    if (historyFilterMode === 'month') {
      if (!historyMonth) return true;

      const year = recordDate.getFullYear();
      const month = String(recordDate.getMonth() + 1).padStart(2, '0');
      const recordMonthString = `${year}-${month}`;

      return recordMonthString === historyMonth;
    }

    return true;
  });

  const clearHistoryFilter = () => {
    setHistoryFilterMode('all');
    setHistoryDate('');
    setHistoryMonth('');
  };

  const hasActiveHistoryFilter =
    historyFilterMode !== 'all' &&
    (
      (historyFilterMode === 'date' && historyDate) ||
      (historyFilterMode === 'month' && historyMonth)
    );

  const getFilterLabel = () => {
    if (historyFilterMode === 'date' && historyDate) {
      const parsed = new Date(`${historyDate}T00:00:00`);

      return Number.isNaN(parsed.getTime())
        ? historyDate
        : parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
    }

    if (historyFilterMode === 'month' && historyMonth) {
      const [year, month] = historyMonth.split('-');
      const parsed = new Date(Number(year), Number(month) - 1, 1);

      return Number.isNaN(parsed.getTime())
        ? historyMonth
        : parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          });
    }

    return 'All dates';
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#7c3aed] mb-3 block"></i>
        Loading records…
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ===================================================== */}
      {/* VISIT HISTORY / ANALYTICS FILTER */}
      {/* ===================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h5 className="text-sm font-extrabold text-[#466460] flex items-center gap-2">
              <i className="fa-solid fa-filter"></i>
              Filter Visit History & Analytics
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              The same filter is applied to both the personalized analytics and the detailed visit history below.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">

            {/* FILTER MODE */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter By
              </label>
              <select
                value={historyFilterMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setHistoryFilterMode(mode);

                  if (mode !== 'date') {
                    setHistoryDate('');
                  }

                  if (mode !== 'month') {
                    setHistoryMonth('');
                  }
                }}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
              >
                <option value="all">All Dates</option>
                <option value="month">Specific Month</option>
                <option value="date">Specific Date</option>
              </select>
            </div>

            {/* MONTH PICKER */}
            {historyFilterMode === 'month' && (
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Month
                </label>
                <input
                  type="month"
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
                />
              </div>
            )}

            {/* DATE PICKER */}
            {historyFilterMode === 'date' && (
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
                />
              </div>
            )}

            {/* RESET */}
            {historyFilterMode !== 'all' && (
              <button
                type="button"
                onClick={clearHistoryFilter}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
              >
                <i className="fa-solid fa-rotate-left mr-1.5"></i>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Showing:
          </span>

          <span className="text-[11px] font-semibold text-[#466460] bg-[#e0eceb] px-2.5 py-1 rounded-full">
            {getFilterLabel()}
          </span>

          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredRecords.length} of {records.length} visit{records.length !== 1 ? 's' : ''}
          </span>

          {hasActiveHistoryFilter && filteredRecords.length === 0 && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              No visits found for this period
            </span>
          )}
        </div>
      </div>

      {/* Analytics uses FILTERED records */}
      <MedicalHistoryAnalytics records={filteredRecords} />

      {/* Detailed history also uses FILTERED records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#e07a5f]/10 to-transparent">
          <div>
            <h4 className="text-sm font-bold text-[#466460] uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-stethoscope text-[#e07a5f]"></i>
              Detailed Medical Visit History
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Expand a visit to review questionnaire answers, social history, health conditions, vitals, LMP, labs, surgical history, and clinical assessment.
            </p>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5">
          {records.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <i className="fa-solid fa-file-medical text-2xl text-slate-300 mb-2 block"></i>
              <p className="text-sm text-slate-400">No medical visit history found.</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-amber-200 rounded-xl bg-amber-50/50">
              <i className="fa-solid fa-calendar-xmark text-2xl text-amber-300 mb-2 block"></i>
              <p className="text-sm font-semibold text-amber-700">
                No visits found for {getFilterLabel()}.
              </p>
              <button
                type="button"
                onClick={clearHistoryFilter}
                className="mt-3 px-4 py-2 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-50 transition"
              >
                Show all visits
              </button>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
              <div className="space-y-4">
                {filteredRecords.map((record, index) => (
                  <MedicalVisitCard
                    key={record.id}
                    record={record}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helper: build initial formData from selectedPatient ───────────────────────
const buildInitialForm = (p, existingRecord = null, defaultSchoolYear = '', defaultSemester = '') => {
  let u = p || {};
  if (p?.users) u = Array.isArray(p.users) ? (p.users || {}) : p.users;

  const record = p?.existingRecord || existingRecord || null;

  const initialVisitReason =
    record?.visit_reason ||
    p?.visit_reason ||
    p?.appointment_reason ||
    p?.reason ||
    p?.appointment?.reason ||
    '';

  const initialVisitType =
    record?.visit_type ||
    p?.visit_type ||
    getSuggestedVisitType(initialVisitReason);

  const patientInfo = record?.patient_info || {};
  const labResults = record?.laboratory_results || {};

  const rawVitals = record?.vital_records;
  const vitalRec = Array.isArray(rawVitals) ? (rawVitals[0] || {}) : (rawVitals || {});

  const rawEmergency = u.emergency_contact || u.emergencyContact;
  let emergency = {};
  if (rawEmergency) {
    if (typeof rawEmergency === 'string') {
      try { emergency = JSON.parse(rawEmergency); } catch (e) {}
    } else if (typeof rawEmergency === 'object') {
      emergency = rawEmergency;
    }
  }

  const rawVax = u.vaccinations;
  let userVax = {};
  if (rawVax) {
    if (typeof rawVax === 'string') {
      try { userVax = JSON.parse(rawVax); } catch (e) {}
    } else if (typeof rawVax === 'object') {
      userVax = rawVax;
    }
  }

  const covidSource = (record && record.covid_history && Object.keys(record.covid_history).length > 0)
    ? record.covid_history
    : userVax;

  return {
    lastName:      u.last_name || u.lastName || '',
    firstName:     u.first_name || u.firstName || '',
    middleName:    u.middle_name || u.middleName || '',
    recordId:      record?.id || null,
    schoolYear:    record?.school_year || defaultSchoolYear,
    semester:      record?.semester || defaultSemester || '1st Semester',
    visitReason:   initialVisitReason,
    visitType:     initialVisitType,
    studentId:     u.university_id || u.universityId || u.student_id || '',
    course:        u.program || u.course || '',
    department:    u.department || '',
    yearSection:   [u.year_level || u.yearLevel || '', u.section || ''].filter(Boolean).join(' - ') || '',

    sex:           patientInfo?.sex || u.sex || u.gender || 'Male',
    birthday:      patientInfo?.birthday || u.birthday || u.birthdate || '',
    age:           patientInfo?.age || u.age ? String(patientInfo?.age || u.age) : '',
    address:       patientInfo?.address || u.home_address || u.homeAddress || u.address || '',
    contactNo:     patientInfo?.contact_no || u.phone_number || u.phoneNumber || u.contact_no || u.contactNo || '',
    landlineNo:    '',
    religion:      patientInfo?.religion || u.religion || '',
    nationality:   patientInfo?.nationality || u.nationality || '',
    civilStatus:   patientInfo?.civil_status || u.civil_status || 'Single',

    emergencyName:      patientInfo?.emergency_name || emergency?.name || u.emergencyName || '',
    emergencyRelation:  patientInfo?.emergency_relation || emergency?.relationship || u.emergencyRelation || '',
    emergencyAddress:   patientInfo?.emergency_address || emergency?.address || u.emergencyAddress || '',
    emergencyContact:   patientInfo?.emergency_contact || emergency?.phone || u.emergencyPhone || '',

    covidHistory: covidSource?.history || '',
    vax1:         covidSource?.dose1?.vaccineName || '',
    vax1Date:     covidSource?.dose1?.date || '',
    vax1Remarks:  covidSource?.dose1?.remarks || '',
    vax2:         covidSource?.dose2?.vaccineName || '',
    vax2Date:     covidSource?.dose2?.date || '',
    vax2Remarks:  covidSource?.dose2?.remarks || '',
    booster1:     covidSource?.booster1?.vaccineName || '',
    booster1Date: covidSource?.booster1?.date || '',
    booster1Remarks: covidSource?.booster1?.remarks || '',
    booster2:     covidSource?.booster2?.vaccineName || '',
    booster2Date: covidSource?.booster2?.date || '',
    booster2Remarks: covidSource?.booster2?.remarks || '',

    otherMedicalHistory: record?.other_medical_history || '',
    otherFamilyHistory:  record?.other_family_history || '',
    smoking: record?.smoking || 'No',
    smokingDetails: record?.smoking_details || '',
    alcohol: record?.alcohol || 'No',
    alcoholDetails: record?.alcohol_details || '',
    drugs:   record?.drugs || 'No',
    drugsDetails:   record?.drugs_details || '',

    surgicalHistoryFromProfile: record?.surgical_history || parseJsonField(u.surgical_history, { operations: [], declined: false }),

    q1: p?.questionnaire?.q1 || record?.questionnaire?.q1 || 'No',
    q2: p?.questionnaire?.q2 || record?.questionnaire?.q2 || 'No',
    q2Details: p?.questionnaire?.q2Details || record?.questionnaire?.q2Details || '',
    q3: p?.questionnaire?.q3 || record?.questionnaire?.q3 || 'No',
    q3Details: p?.questionnaire?.q3Details || record?.questionnaire?.q3Details || '',
    q4: p?.questionnaire?.q4 || record?.questionnaire?.q4 || 'No',
    q4Details: p?.questionnaire?.q4Details || record?.questionnaire?.q4Details || '',
    q5: p?.questionnaire?.q5 || record?.questionnaire?.q5 || 'No',
    q5b: p?.questionnaire?.q5b || record?.questionnaire?.q5b || 'No',

    height: vitalRec?.height || '',
    weight: vitalRec?.weight || '',
    bmi:    vitalRec?.bmi || '',
    waist:  vitalRec?.waist || '',
    lmp:    vitalRec?.lmp || '',

    labCbc:        labResults?.cbc?.result || '',
    labCbcFacility: labResults?.cbc?.facility || '',
    labCbcDate:    labResults?.cbc?.date || '',
    labUa:         labResults?.ua?.result || '',
    labUaFacility: labResults?.ua?.facility || '',
    labUaDate:     labResults?.ua?.date || '',
    labXray:       labResults?.xray?.result || '',
    labXrayFacility: labResults?.xray?.facility || '',
    labXrayDate:   labResults?.xray?.date || '',

    physician: record?.physician || '',
    examDateTime: record?.exam_date
      ? record.exam_date.slice(0, 16)
      : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
    nurseOnDuty: record?.nurse_on_duty || '',
  };
};

const createDefaultVital = () => ({ bp: '', pr: '', rr: '', temp: '', nurse: '', remarks: '' });

// ─────────────────────────────────────────────────────────────────────────────
export const Medical = ({ selectedPatient, showMessage, defaultSchoolYear, defaultSemester, readOnly = false, onSaved }) => {
  const logoUrl = useBrandingLogo();
  const [showSummary, setShowSummary]   = useState(false);
  const [activeTab, setActiveTab]       = useState('patientProfile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [physicians, setPhysicians]     = useState([]);
  const [nurses, setNurses]             = useState([]);

  // Custom Validation Alert Modal State
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });
const [formData, setFormData] = useState(() => buildInitialForm(selectedPatient, null, defaultSchoolYear, defaultSemester));

  // Fetch physicians and nurses on mount
  useEffect(() => {
    const loadData = async () => {
      const [docs, nursesData] = await Promise.all([fetchPhysicians(), fetchNurses()]);
      setPhysicians(docs);
      setNurses(nursesData);
    };
    loadData();
  }, []);

// Set default selections once lists are available
  useEffect(() => {
    const setDefaults = async () => {
      // Auto-select physician if only one available
      if (physicians.length === 1 && !formData.physician) {
        setFormData(prev => ({ ...prev, physician: physicians[0].display }));
      }

      // Auto-select nurse matching logged-in user
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      const currentUserId = session?.user?.id;

      if (currentUserId && nurses.length > 0 && !formData.nurseOnDuty) {
        console.log('[Medical] Current session uid:', currentUserId);
        console.log('[Medical] Nurse list:', nurses);

        // 1. Try to find the exact match by UID
        let targetNurse = nurses.find(n => n.uid === currentUserId);

        // 2. Fallback: Check user_metadata or app_metadata for the role if direct role fails
        const userRole = session?.user?.role || session?.user?.user_metadata?.role || session?.user?.app_metadata?.role;

        if (!targetNurse && userRole === 'nurse') {
          targetNurse = nurses[0]; // Default to the first nurse if they are a nurse but IDs don't match
        }

        // 3. Actually update the state if a nurse was found
        if (targetNurse) {
          setFormData(prev => ({ ...prev, nurseOnDuty: targetNurse.display }));
        }
      }
    };

    setDefaults();
  }, [physicians, nurses, formData.physician, formData.nurseOnDuty]);
  const getInitialSurgicalHistory = () => {
    const sh = parseJsonField(selectedPatient?.surgicalHistory || selectedPatient?.surgical_history, null);
    if (sh && sh.operations && sh.operations.length > 0) {
      return sh.operations;
    }
    return [];
  };
  const [surgicalHistory, setSurgicalHistory] = useState(getInitialSurgicalHistory);

  const [vitalRecords, setVitalRecords] = useState(createDefaultVital());

  const [checkedMedical, setCheckedMedical] = useState([]);
  const [medicalSpecs, setMedicalSpecs]     = useState({});

  const [checkedFamily,  setCheckedFamily]  = useState([]);
  const [familySpecs, setFamilySpecs]       = useState({});

  const [checkedHealth,  setCheckedHealth]  = useState([]);
  const [healthSpecs, setHealthSpecs]       = useState({});


  useEffect(() => {
    let isMounted = true;
    const { uid, id } = normalizePatient(selectedPatient);
    const userId = uid || id;

    const normalizeCondition = (value) => {
      const baseName = value.split(':')[0].trim();
      return baseName.replace(', specify', '').replace(' (If PTB, category)', '').toLowerCase();
    };

    const extractDetails = (value) => {
      const parts = value.split(':');
      return parts.length > 1 ? parts.slice(1).join(':').trim() : '';
    };

    const matchConditions = (storedValues, conditionArray) => {
      const matched = [];
      const specs = {};

      storedValues.forEach(val => {
        const normalized = normalizeCondition(val);
        const details = extractDetails(val);

        const found = conditionArray.find(c => normalizeCondition(c) === normalized);
        if (found) {
          matched.push(found);
          if (details) {
            specs[found] = details;
          }
        }
      });

      return { matched, specs };
    };

    const fetchFullProfile = async () => {
      setActiveTab('patientProfile');

      const passedMedicalHistory = selectedPatient?.medicalHistory || selectedPatient?.checked_medical || [];
      const passedFamilyHistory = selectedPatient?.familyHistory || selectedPatient?.checked_family || [];
      const passedHealthConditions = selectedPatient?.healthConditions || selectedPatient?.checked_health || [];
      const passedSurgicalHistory = parseJsonField(selectedPatient?.surgicalHistory || selectedPatient?.surgical_history, null);

      const { matched: matchedMedical, specs: medicalSpecsData } = matchConditions(passedMedicalHistory, medicalConditions);
      const { matched: matchedFamily, specs: familySpecsData } = matchConditions(passedFamilyHistory, familyConditions);
      const { matched: matchedHealth, specs: healthSpecsData } = matchConditions(passedHealthConditions, healthConditions);

      setCheckedMedical(matchedMedical);
      setMedicalSpecs(medicalSpecsData);
      setCheckedFamily(matchedFamily);
      setFamilySpecs(familySpecsData);
      setCheckedHealth(matchedHealth);
      setHealthSpecs(healthSpecsData);
      setSurgicalHistory(passedSurgicalHistory?.operations || []);

      const passedVitalRecords = selectedPatient?.vitalRecords || selectedPatient?.vital_records || null;
      if (passedVitalRecords && typeof passedVitalRecords === 'object') {
        setVitalRecords({
          bp: passedVitalRecords.bp || '',
          pr: passedVitalRecords.pr || '',
          rr: passedVitalRecords.rr || '',
          temp: passedVitalRecords.temp || '',
          nurse: passedVitalRecords.nurse || '',
          remarks: passedVitalRecords.remarks || '',
        });
      } else {
        setVitalRecords(createDefaultVital());
      }

      setFormData(buildInitialForm(selectedPatient, null, defaultSchoolYear, defaultSemester));

      if (userId) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`uid.eq.${userId},id.eq.${userId}`)
          .maybeSingle();

        if (isMounted && data && !error) {
          if (!selectedPatient?.existingRecord) {
            setFormData(buildInitialForm(data, null, defaultSchoolYear, defaultSemester));
          }

          if (!passedSurgicalHistory || !passedSurgicalHistory.operations || passedSurgicalHistory.operations.length === 0) {
            const userSurgicalHistory = parseJsonField(data.surgical_history, { operations: [], declined: false });
            if (userSurgicalHistory.operations && userSurgicalHistory.operations.length > 0) {
              setSurgicalHistory(userSurgicalHistory.operations);
            }
          }
        }
      }
    };

    fetchFullProfile();

    return () => { isMounted = false; };
  }, [selectedPatient?.uid, selectedPatient?.id, selectedPatient?.users]);

  const handleChange = (e) => {
    if (readOnly) return;
    const { id, value, name } = e.target;
    setFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const handleVisitReasonChange = (e) => {
    if (readOnly) return;
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      visitReason: value,
      visitType: getSuggestedVisitType(value),
    }));
    setValidationErrors(prev => ({
      ...prev,
      visitReason: undefined,
      visitType: undefined,
    }));
  };

  const handleDateChange = (field, val) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const calculateAge = (val) => {
    if (readOnly) return;
    if (!val) {
      setFormData(prev => ({ ...prev, birthday: '', age: '' }));
      return;
    }
    const dob = new Date(val);
    const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
    setFormData(prev => ({ ...prev, birthday: val, age: isNaN(age) ? '' : String(age) }));
  };

  const calculateBMI = () => {
    const h = parseFloat(formData.height), w = parseFloat(formData.weight);
    if (h && w && h > 0) setFormData(prev => ({ ...prev, bmi: (w / ((h / 100) ** 2)).toFixed(1) }));
  };

  const toggleCheck = (list, setList, value) => {
    if (readOnly) return;
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const updateVital = (field, value) => {
    if (readOnly) return;
    setVitalRecords(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenSummary = () => {
    // Validate required fields
    const errors = {};

    if (!formData.visitReason?.trim()) errors.visitReason = 'Reason for Visit is required';
    if (!formData.visitType?.trim()) errors.visitType = 'Visit Classification is required';

    // Validate vital signs (at least one should be filled)
    if (!vitalRecords.bp?.trim()) errors.bp = 'Blood Pressure is required';
    if (!vitalRecords.pr?.trim()) errors.pr = 'Pulse Rate is required';
    if (!vitalRecords.temp?.trim()) errors.temp = 'Temperature is required';

    // Validate exam date
    if (!formData.examDateTime?.trim()) errors.examDateTime = 'Examination Date is required';

    // Validate physician
    if (!formData.physician?.trim()) errors.physician = 'Examining Physician is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setAlertModal({
        open: true,
        title: 'Missing Required Fields',
        message: 'Please fill in all required fields:\n\n• Reason for Visit\n• Visit Classification\n• Blood Pressure (BP)\n• Pulse Rate (PR)\n• Temperature\n• Examining Physician\n• Examination Date'
      });
      return;
    }

    setValidationErrors({});
    if (!formData.lastName) {
      setAlertModal({
        open: true,
        title: 'Missing Patient Information',
        message: "Please fill in the patient's last name."
      });
      return;
    }
    setShowSummary(true);
  };

  const formatCheckedForDb = (checks, specsMap) => {
    return checks.map(item => {
      const cleanName = item.replace(', specify', '').replace(' (If PTB, category)', '');
      const detail = specsMap[item]?.trim();
      return detail ? `${cleanName}: ${detail}` : cleanName;
    });
  };

  const handleFinalSubmit = async () => {
    if (readOnly) return;
    const { uid: patientUid, id: patientInternalId } = normalizePatient(selectedPatient);

    if (!patientUid && !patientInternalId) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: "No patient selected. Cannot save record."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let userId = patientInternalId || null;

      if (!userId && patientUid && isUUID(patientUid)) {
        userId = patientUid;
      }

      if (userId && !isUUID(userId)) {
        console.warn('Resolved userId is not a valid uuid, discarding it:', userId);
        userId = null;
      }

      if (!userId) {
        console.warn('Could not resolve internal user id for this patient — user_id will be saved as null.', {
          patientUid,
          patientInternalId,
          selectedPatient,
        });
      }

      const combinedExamDate = formData.examDateTime
        ? `${formData.examDateTime}:00`
        : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) + ':00';

      const supabasePayload = {
        user_id: userId,
        university_id: formData.studentId,
        school_year: formData.schoolYear,
        semester: formData.semester,
        visit_reason: formData.visitReason.trim(),
        visit_type: formData.visitType,
        last_name: formData.lastName,
        first_name: formData.firstName,
        middle_name: formData.middleName,

        patient_info: {
          sex: formData.sex,
          birthday: formData.birthday,
          age: parseInt(formData.age) || null,
          address: formData.address,
          contact_no: formData.contactNo,
          religion: formData.religion,
          nationality: formData.nationality,
          civil_status: formData.civilStatus,
          emergency_name: formData.emergencyName,
          emergency_relation: formData.emergencyRelation,
          emergency_address: formData.emergencyAddress,
          emergency_contact: formData.emergencyContact,
        },

        covid_history: {
          dose1: { vaccineName: formData.vax1, date: formData.vax1Date, remarks: formData.vax1Remarks },
          dose2: { vaccineName: formData.vax2, date: formData.vax2Date, remarks: formData.vax2Remarks },
          booster1: { vaccineName: formData.booster1, date: formData.booster1Date, remarks: formData.booster1Remarks },
          booster2: { vaccineName: formData.booster2, date: formData.booster2Date, remarks: formData.booster2Remarks },
          history: formData.covidHistory,
        },

        laboratory_results: {
          cbc: { result: formData.labCbc, facility: formData.labCbcFacility, date: formData.labCbcDate },
          ua: { result: formData.labUa, facility: formData.labUaFacility, date: formData.labUaDate },
          xray: { result: formData.labXray, facility: formData.labXrayFacility, date: formData.labXrayDate },
        },

        other_medical_history: formData.otherMedicalHistory,
        other_family_history: formData.otherFamilyHistory,
        smoking: formData.smoking,
        smoking_details: formData.smokingDetails,
        alcohol: formData.alcohol,
        alcohol_details: formData.alcoholDetails,
        drugs: formData.drugs,
        drugs_details: formData.drugsDetails,

        questionnaire: {
          q1: formData.q1,
          q2: formData.q2,
          q2Details: formData.q2Details,
          q3: formData.q3,
          q3Details: formData.q3Details,
          q4: formData.q4,
          q4Details: formData.q4Details,
          q5: formData.q5,
          q5b: formData.q5b
        },

        vital_records: {
          ...vitalRecords,
          height: formData.height,
          weight: formData.weight,
          bmi: formData.bmi,
          waist: formData.waist,
          lmp: formData.lmp,
        },

        checked_medical: formatCheckedForDb(checkedMedical, medicalSpecs),
        checked_family: formatCheckedForDb(checkedFamily, familySpecs),
        checked_health: formatCheckedForDb(checkedHealth, healthSpecs),

        surgical_history: surgicalHistory.map(s => ({
          operation: s.operation,
          date: s.date,
          notes: s.notes,
        })),

        physician: formData.physician,
        exam_date: combinedExamDate,
        nurse_on_duty: formData.nurseOnDuty,
        status: "pending",
        is_approved: false,
        created_at: new Date().toISOString(),
      };

      const recordId = selectedPatient?.existingRecord?.id || formData.recordId || null;

      if (recordId) {
        const {
          status,
          is_approved,
          created_at,
          ...updatePayload
        } = supabasePayload;

        await updateMedicalExamination(
          recordId,
          updatePayload
        );
      } else {
        await createMedicalExamination(
          supabasePayload
        );
      }

      setShowSummary(false);
      showMessage(recordId ? 'Medical record updated successfully!' : 'Medical record saved to database successfully!');
      onSaved?.();

    } catch (error) {
      console.error("Error saving medical record: ", error);
      setAlertModal({
        open: true,
        title: 'Database Error',
        message: "Failed to save the record to the database. Check console for details."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Tabs - Outside the form so they remain clickable in read-only mode */}
      <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('patientProfile')}
          className={`min-h-11 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'patientProfile' ? 'bg-[#3b82f6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <i className="fa-solid fa-user mr-1"></i> Patient Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('examination')}
          className={`min-h-11 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'examination' ? 'bg-[#466460] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <i className="fa-solid fa-clipboard-list mr-1"></i> Examination
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visitHistory')}
          className={`min-h-11 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'visitHistory' ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <i className="fa-solid fa-clock-rotate-left mr-1"></i> Visit History
        </button>
      </div>

      {readOnly && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <i className="fa-solid fa-lock mr-1"></i> Read-only mode - You can view all information but cannot make changes
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); if (!readOnly) handleOpenSummary(); }}
        className={`min-w-0 overflow-y-visible lg:overflow-y-auto overflow-x-hidden h-auto lg:h-[calc(100vh-320px)] pr-0 lg:pr-4 pb-12
          [&_.grid-cols-12]:grid-cols-1 md:[&_.grid-cols-12]:grid-cols-12
          [&_.col-span-2]:col-span-1 md:[&_.col-span-2]:col-span-2
          [&_.col-span-3]:col-span-1 md:[&_.col-span-3]:col-span-3
          [&_.col-span-4]:col-span-1 md:[&_.col-span-4]:col-span-4
          [&_.col-span-5]:col-span-1 md:[&_.col-span-5]:col-span-5
          [&_.col-span-6]:col-span-1 md:[&_.col-span-6]:col-span-6
          [&_.col-span-12]:col-span-1 md:[&_.col-span-12]:col-span-12
          [&::-webkit-scrollbar]:w-[5px]
          [&::-webkit-scrollbar-thumb]:bg-gradient-to-b
          [&::-webkit-scrollbar-thumb]:from-[#466460]
          [&::-webkit-scrollbar-thumb]:to-[#8aacaa]
          [&::-webkit-scrollbar-thumb]:rounded-full`}
      >
        <div>

        {activeTab === 'visitHistory' ? (
          <MedicalVisitHistory selectedPatient={selectedPatient} />
        ) : activeTab === 'patientProfile' ? (
        <>
          {/* ════ PATIENT PROFILE TAB ════ */}
          <div className={sectionClass}>Patient Demographics</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className={labelClass}>Last Name / Family Name</label><input type="text" id="lastName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.lastName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>First Name</label><input type="text" id="firstName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.firstName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="middleName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.middleName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Student No.</label><input type="text" id="studentId" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.studentId} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Course</label><input type="text" id="course" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.course} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Year / Section</label><input type="text" id="yearSection" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.yearSection} readOnly /></div>
            <div className="col-span-3">
              <label className={labelClass}>Sex</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-not-allowed text-slate-500"><input type="radio" name="sex" value="Male"   checked={formData.sex === 'Male'}   disabled /> Male</label>
                <label className="flex items-center gap-2 text-sm cursor-not-allowed text-slate-500"><input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} disabled /> Female</label>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Birthday</label>
              <DatePicker value={formData.birthday} disabled={true} />
            </div>
            <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="age" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.age} readOnly /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="address" className={`${inputClass} bg-slate-50 cursor-not-allowed`} placeholder="Home Address" value={formData.address} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Contact No.</label><input type="text" id="contactNo" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.contactNo} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Landline No.</label><input type="text" id="landlineNo" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.landlineNo} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Religion</label><input type="text" id="religion" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.religion} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="nationality" className={`${inputClass} bg-slate-50 cursor-not-allowed`} placeholder="Filipino" value={formData.nationality} readOnly /></div>
            <div className="col-span-3">
              <label className={labelClass}>Civil Status</label>
              <select id="civilStatus" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.civilStatus} disabled>
                {['Single','Married','Widowed','Separated'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={sectionClass}>Person to Contact in Case of Emergency</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5"><label className={labelClass}>Name</label><input type="text" id="emergencyName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} placeholder="Full name" value={formData.emergencyName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Relationship</label><input type="text" id="emergencyRelation" className={`${inputClass} bg-slate-50 cursor-not-allowed`} placeholder="e.g. Parent, Spouse" value={formData.emergencyRelation} readOnly /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="emergencyAddress" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.emergencyAddress} readOnly /></div>
            <div className="col-span-4"><label className={labelClass}>Contact No./s</label><input type="text" id="emergencyContact" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData.emergencyContact} readOnly /></div>
          </div>

          <div className={sectionClass}>COVID-19 Vaccine History</div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Dose</th>
                  <th className="border border-slate-300 p-2 text-left">Name of Vaccine</th>
                  <th className="border border-slate-300 p-2 text-left">Date</th>
                  <th className="border border-slate-300 p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {[{label:'1st Dose',id:'vax1'},{label:'2nd Dose',id:'vax2'},{label:'Booster (1)',id:'booster1'},{label:'Booster (2)',id:'booster2'}].map(({ label, id }) => (
                  <tr key={id}>
                    <td className="border border-slate-300 p-2 font-semibold whitespace-nowrap">{label}</td>
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData[id]} readOnly /></td>
                    <td className="border border-slate-300 p-2">
                      <DatePicker value={formData[`${id}Date`]} disabled={true} />
                    </td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Remarks`} className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={formData[`${id}Remarks`]} readOnly /></td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-300 p-2 font-semibold whitespace-nowrap">COVID-19 History</td>
                  <td colSpan={3} className="border border-slate-300 p-2">
                    <input type="text" id="covidHistory" className={`${inputClass} bg-slate-50 cursor-not-allowed`} placeholder="Date of infection, severity, treatment, recovery details" value={formData.covidHistory} readOnly />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>
            <span>Past Surgical History</span>
          </div>
          {surgicalHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 text-center">No surgical history recorded.</p>
          ) : surgicalHistory.map(s => (
            <div key={s.id} className="grid grid-cols-12 gap-4 mb-3 p-3 bg-slate-50 rounded-lg relative border border-slate-200 items-end">
              <div className="col-span-6"><label className={labelClass}>Operation Name</label><input type="text" placeholder="Operation/Procedure Name" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={s.operation} readOnly /></div>
              <div className="col-span-3">
                <label className={labelClass}>Date</label>
                <DatePicker value={s.date} disabled={true} />
              </div>
              <div className="col-span-3"><label className={labelClass}>Notes</label><input type="text" placeholder="Hospital / complications" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={s.notes} readOnly /></div>
            </div>
          ))}

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={() => setActiveTab('examination')} className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              Next: Examination →
            </button>
          </div>
        </>
        ) : (
        <>
        {/* ════ EXAMINATION TAB ════ */}

          <div className={sectionClass}>Visit Information</div>
          <div className="grid grid-cols-12 gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className={requiredLabelClass}>
                Reason / Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <input
                id="visitReason"
                type="text"
                list="medical-visit-reasons"
                className={`${inputClass} ${validationErrors.visitReason ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                placeholder="Select or type the reason for this visit"
                value={formData.visitReason}
                disabled={readOnly}
                onChange={handleVisitReasonChange}
              />
              <datalist id="medical-visit-reasons">
                {visitReasonGroups.map(group => (
                  <React.Fragment key={group.label}>
                    {group.options.map(option => (
                      <option key={option} value={option}>{group.label}</option>
                    ))}
                  </React.Fragment>
                ))}
              </datalist>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Choose a common reason or type a specific reason from the appointment or walk-in encounter.
              </p>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className={requiredLabelClass}>
                Visit Classification <span className="text-red-500">*</span>
              </label>
              <select
                id="visitType"
                className={`${inputClass} font-semibold ${validationErrors.visitType ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                value={formData.visitType}
                disabled={readOnly || !formData.visitReason.trim()}
                onChange={handleChange}
              >
                <option value="">Select classification</option>
                <option value="patient">Patient Visit</option>
                <option value="non_patient">Non-Patient Visit</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Suggested automatically from the reason. Clinic staff may correct it when needed.
              </p>
            </div>

            {formData.visitType && (
              <div className={`col-span-12 px-3 py-2 rounded-lg border text-xs font-semibold ${
                formData.visitType === 'patient'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' // Changed from rose to emerald
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}>
                <i className={`fa-solid ${formData.visitType === 'patient' ? 'fa-stethoscope' : 'fa-file-circle-check'} mr-2`}></i>
                This encounter will be counted as a {getVisitTypeLabel(formData.visitType)} on the dashboard.
              </div>
            )}
          </div>

          <div className={sectionClass}>Past Medical History</div>
          <p className="text-xs text-slate-500 mb-3">Check all that apply:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4 items-start">
            {medicalConditions.map(c => {
              const needsSpecify = c.includes('specify') || c === 'Others';
              const isChecked = checkedMedical.includes(c);

              return (
                <div key={c} className="flex flex-col gap-1.5 w-full">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#466460] mt-0.5 shrink-0"
                      checked={isChecked}
                      disabled={readOnly}
                      onChange={() => toggleCheck(checkedMedical, setCheckedMedical, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && needsSpecify && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                      placeholder="Please specify..."
                      value={medicalSpecs[c] || ''}
                      disabled={readOnly}
                      onChange={(e) => setMedicalSpecs(prev => ({ ...prev, [c]: e.target.value }))}
                      autoFocus={!readOnly}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Additional details for checked conditions (Optional)</label><input type="text" id="otherMedicalHistory" className={inputClass} placeholder="Severity, medications taken, etc." value={formData.otherMedicalHistory} disabled={readOnly} onChange={handleChange} /></div>
          </div>

          <div className={sectionClass}>Family History</div>
          <p className="text-xs text-slate-500 mb-3">Check all that apply in your family:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4 items-start">
            {familyConditions.map(c => {
              const needsSpecify = c.includes('specify') || c === 'Others';
              const isChecked = checkedFamily.includes(c);

              return (
                <div key={c} className="flex flex-col gap-1.5 w-full">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#466460] mt-0.5 shrink-0"
                      checked={isChecked}
                      disabled={readOnly}
                      onChange={() => toggleCheck(checkedFamily, setCheckedFamily, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && needsSpecify && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                      placeholder="Specify relation / details..."
                      value={familySpecs[c] || ''}
                      disabled={readOnly}
                      onChange={(e) => setFamilySpecs(prev => ({ ...prev, [c]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Additional details for family history (Optional)</label><input type="text" id="otherFamilyHistory" className={inputClass} placeholder="Specify members affected and other details" value={formData.otherFamilyHistory} disabled={readOnly} onChange={handleChange} /></div>
          </div>

          <div className={sectionClass}>Personal / Social History</div>
          <div className="grid grid-cols-12 gap-4">
            {[
              { label: 'Smoking',       name: 'smoking', detailId: 'smokingDetails', placeholder: 'If yes: Quit? No. of years / days & type'   },
              { label: 'Alcohol',       name: 'alcohol', detailId: 'alcoholDetails', placeholder: 'If yes: Quit? No. of bottles / days & type' },
              { label: 'Illicit Drugs', name: 'drugs',   detailId: 'drugsDetails',   placeholder: 'If yes: Quit? Specify type / frequency'      },
            ].map(({ label, name, detailId, placeholder }) => (
              <div key={name} className="col-span-4">
                <label className={labelClass}>{label}</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} disabled={readOnly} onChange={handleChange} /> Yes</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  disabled={readOnly} onChange={handleChange} /> No</label>
                </div>
                {formData[name] === 'Yes' && <input type="text" id={detailId} className={inputClass} placeholder={placeholder} value={formData[detailId]} disabled={readOnly} onChange={handleChange} />}
              </div>
            ))}
          </div>

          <div className={sectionClass}>Health History Questions</div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left" style={{ width: '70%' }}>Question</th>
                  <th className="border border-slate-300 p-2 text-center">YES</th>
                  <th className="border border-slate-300 p-2 text-center">NO</th>
                  <th className="border border-slate-300 p-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { q: '1. Are you in good health?',                                                              name: 'q1',  detail: null       },
                  { q: '2. Are you under medical treatment now?',                                                 name: 'q2',  detail: 'q2Details' },
                  { q: '3. Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?',  name: 'q3',  detail: 'q3Details' },
                  { q: '4. Are you taking any medication?',                                                       name: 'q4',  detail: 'q4Details' },
                  { q: '5. For women only: Are you pregnant?',                                                    name: 'q5',  detail: null       },
                  { q: 'Are you nursing?',                                                                        name: 'q5b', detail: null       },
                ].map(({ q, name, detail }) => (
                  <tr key={name}>
                    <td className="border border-slate-300 p-2">{q}</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} disabled={readOnly} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  disabled={readOnly} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      {detail && formData[name] === 'Yes' && <input type="text" id={detail} className={inputClass} placeholder="If yes, specify" value={formData[detail]} disabled={readOnly} onChange={handleChange} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>Do you have or have you had any of the following?</div>
          <p className="text-xs text-slate-500 mb-3">Check all that apply, and optionally provide details:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4 items-start">
            {healthConditions.map(c => {
              const isChecked = checkedHealth.includes(c);

              return (
                <div key={c} className="flex flex-col gap-1.5 w-full">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#466460] mt-0.5 shrink-0"
                      checked={isChecked}
                      disabled={readOnly}
                      onChange={() => toggleCheck(checkedHealth, setCheckedHealth, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                      placeholder="Optional details (type, year, etc)..."
                      value={healthSpecs[c] || ''}
                      disabled={readOnly}
                      onChange={(e) => setHealthSpecs(prev => ({ ...prev, [c]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={sectionClass}>Laboratory Results</div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left" style={{ width: '180px' }}>Test</th>
                  <th className="border border-slate-300 p-2 text-left">Results</th>
                  <th className="border border-slate-300 p-2 text-left" style={{ width: '180px' }}>Name of Lab Facility</th>
                  <th className="border border-slate-300 p-2 text-left" style={{ width: '140px' }}>Date Reported</th>
                </tr>
              </thead>
              <tbody>
                {[{label:'Complete Blood Count (CBC)',id:'labCbc'},{label:'Urinalysis',id:'labUa'},{label:'Chest X-Ray',id:'labXray'}].map(({ label, id }) => (
                  <tr key={id}>
                    <td className="border border-slate-300 p-2 font-semibold">{label}</td>
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={inputClass} value={formData[id]} disabled={readOnly} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Facility`} className={inputClass} value={formData[`${id}Facility`]} disabled={readOnly} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      <DatePicker value={formData[`${id}Date`]} disabled={readOnly} onChange={(val) => handleDateChange(`${id}Date`, val)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>
            <span>Anthropometric Measurements & Vital Signs</span> <span className="text-[10px] font-normal text-red-500">* Required</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-2 col-start-1">
                <label className={requiredLabelClass}>BP (mmHg) <span className="text-red-500">*</span></label>
                <input type="text" className={`${inputClass} ${validationErrors.bp ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`} placeholder="120/80" value={vitalRecords.bp} disabled={readOnly} onChange={e => { updateVital('bp', filterNumbersAndSlash(e.target.value)); setValidationErrors(prev => ({ ...prev, bp: '' })); }} />
              </div>
              <div className="col-span-2">
                <label className={requiredLabelClass}>PR (bpm) <span className="text-red-500">*</span></label>
                <input type="text" className={`${inputClass} ${validationErrors.pr ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`} placeholder="72" value={vitalRecords.pr} disabled={readOnly} onChange={e => { updateVital('pr', filterNumbersOnly(e.target.value)); setValidationErrors(prev => ({ ...prev, pr: '' })); }} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>RR (cpm)</label>
                <input type="text" className={inputClass} placeholder="18" value={vitalRecords.rr} disabled={readOnly} onChange={e => updateVital('rr', filterNumbersOnly(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className={requiredLabelClass}>Temp (°C) <span className="text-red-500">*</span></label>
                <input type="text" className={`${inputClass} ${validationErrors.temp ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`} placeholder="36.5" value={vitalRecords.temp} disabled={readOnly} onChange={e => { updateVital('temp', filterNumbersAndDot(e.target.value)); setValidationErrors(prev => ({ ...prev, temp: '' })); }} />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Remarks</label>
                <input type="text" className={inputClass} placeholder="Additional notes" value={vitalRecords.remarks} disabled={readOnly} onChange={e => updateVital('remarks', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-3"><label className={labelClass}>Height (cm)</label><input type="text" id="height" className={inputClass} placeholder="cm" value={formData.height} disabled={readOnly} onChange={e => handleChange({ target: { id: 'height', value: filterNumbersOnly(e.target.value) } })} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>Weight (kg)</label><input type="text" id="weight" className={inputClass} placeholder="kg" value={formData.weight} disabled={readOnly} onChange={e => handleChange({ target: { id: 'weight', value: filterNumbersOnly(e.target.value) } })} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>BMI (auto-calc)</label><input type="text" id="bmi" className={`${inputClass} bg-slate-50`} placeholder="kg/m²" value={formData.bmi} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Waist Circumference (cm)</label><input type="text" id="waist" className={inputClass} placeholder="cm" value={formData.waist} disabled={readOnly} onChange={e => handleChange({ target: { id: 'waist', value: filterNumbersOnly(e.target.value) } })} /></div>

          {formData.sex === 'Female' && (
            <div className="col-span-6">
              <label className={labelClass}>Last Menstrual Period (LMP) — Females only</label>
              <DatePicker value={formData.lmp} disabled={readOnly} onChange={(val) => handleDateChange('lmp', val)} />
            </div>
            )}
          </div>

          <div className="grid grid-cols-12 gap-4 mt-6">
            <div className="col-span-5">
              <label className={requiredLabelClass}>Examining Physician / LIC. No. <span className="text-red-500">*</span></label>
              <select
                id="physician"
                className={`${inputClass} ${validationErrors.physician ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                value={formData.physician}
                disabled={readOnly}
                onChange={handleChange}
              >
                <option value="">Select Physician</option>
                {physicians.map(doc => (
                  <option key={doc.id} value={doc.display}>{doc.display}</option>
                ))}
              </select>
            </div>
            <div className="col-span-4">
              <label className={requiredLabelClass}>Exam Date & Time <span className="text-red-500">*</span></label>
              <DateTimePicker
                value={formData.examDateTime}
                disabled={readOnly}
                onChange={(val) => handleDateChange('examDateTime', val)}
              />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Nurse on Duty</label>
              <select
                id="nurseOnDuty"
                className={inputClass}
                value={formData.nurseOnDuty}
                disabled={readOnly}
                onChange={handleChange}
              >
                <option value="">Select Nurse</option>
                {nurses.map(nurse => (
                  <option key={nurse.id} value={nurse.display}>{nurse.display}</option>
                ))}
              </select>
            </div>
          </div>

          {!readOnly && (
            <div className="mt-9 px-6 py-5 bg-gradient-to-r from-[#f0f7f6] to-[#e8f2f1] rounded-2xl border border-[#d1e7e5] flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-sm font-bold text-[#466460] m-0">Ready to submit this medical record?</p>
                <p className="text-[11px] text-slate-500 mt-1">Review all entries carefully before submitting.</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                  <i className="fa-solid fa-paper-plane"></i> Review & Submit
                </button>
              </div>
            </div>
          )}
          {readOnly && (
            <div className="mt-9 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 text-center">
              <i className="fa-solid fa-lock mr-2"></i>This record has already been approved and is shown for reference only.
            </div>
          )}
        </>
        )}
      </div>
      </form>

      {/* ═══ SUMMARY MODAL ══════════════════════════════════════════════════ */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl w-full max-w-[740px] max-h-[94dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-4 sm:px-7 py-4 sm:py-5 text-white shrink-0 relative">
              <button
                type="button"
                onClick={() => !isSubmitting && setShowSummary(false)}
                disabled={isSubmitting}
                title="Close"
                className="absolute top-3 right-3 sm:top-4 sm:right-5 w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              <div className="flex items-center gap-4 pr-10">
                {logoUrl && (
                  <div className="w-14 h-14 rounded-xl bg-white p-1.5 shrink-0 shadow-sm">
                    <img
                      src={logoUrl}
                      alt="Active university logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-3 mb-1">
                    <i className="fa-solid fa-clipboard-check"></i> Medical Examination Summary
                  </h3>
                  <p className="text-[11px] opacity-70">
                    Review all entries carefully before final submission.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 sm:px-7 py-5 pb-[calc(1rem+env(safe-area-inset-bottom))] [&_.grid-cols-2]:grid-cols-1 min-[390px]:[&_.grid-cols-2]:grid-cols-2 [&_.grid-cols-3]:grid-cols-1 min-[390px]:[&_.grid-cols-3]:grid-cols-2 sm:[&_.grid-cols-3]:grid-cols-3">
              <SumSection icon="fa-clipboard-question" title="Visit Information">
                <div className="grid grid-cols-2 gap-2">
                  <SumItem label="Reason for Visit" value={formData.visitReason} />
                  <SumItem label="Visit Classification" value={getVisitTypeLabel(formData.visitType)} />
                </div>
              </SumSection>

              <SumSection icon="fa-user" title="Patient Demographics">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Last Name"      value={formData.lastName} />
                  <SumItem label="First Name"     value={formData.firstName} />
                  <SumItem label="Middle Name"    value={formData.middleName} />
                  <SumItem label="Student No."    value={formData.studentId} />
                  <SumItem label="Course"         value={formData.course} />
                  <SumItem label="Year / Section" value={formData.yearSection} />
                  <SumItem label="School Year"    value={formData.schoolYear} />
                  <SumItem label="Semester"       value={formData.semester} />
                  <SumItem label="Sex"            value={formData.sex} />
                  <SumItem label="Age"            value={String(formData.age)} />
                  <SumItem label="Birthday"       value={formData.birthday} />
                  <SumItem label="Civil Status"   value={formData.civilStatus} />
                  <SumItem label="Nationality"    value={formData.nationality} />
                  <SumItem label="Religion"       value={formData.religion} />
                  <SumItem label="Contact No."    value={formData.contactNo} />
                  <SumItem label="Landline"       value={formData.landlineNo} />
                </div>
                {formData.address && (
                  <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600">
                    <span className="font-bold text-slate-700">Address: </span>{formData.address}
                  </div>
                )}
              </SumSection>

              <SumSection icon="fa-phone-volume" title="Emergency Contact">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Full Name"    value={formData.emergencyName} />
                  <SumItem label="Relationship" value={formData.emergencyRelation} />
                  <SumItem label="Contact No."  value={formData.emergencyContact} />
                  <SumItem label="Address"      value={formData.emergencyAddress} />
                </div>
              </SumSection>

              <SumSection icon="fa-syringe" title="COVID-19 Vaccine History">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        {['Dose','Vaccine','Date','Remarks'].map(h => (
                          <th key={h} className="border border-slate-200 p-2 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[{label:'1st Dose',id:'vax1'},{label:'2nd Dose',id:'vax2'},{label:'Booster (1)',id:'booster1'},{label:'Booster (2)',id:'booster2'}].map(({ label, id }) => (
                        <tr key={id}>
                          <td className="border border-slate-200 p-2 font-semibold">{label}</td>
                          <td className="border border-slate-200 p-2">{formData[id] || '—'}</td>
                          <td className="border border-slate-200 p-2">{formData[`${id}Date`] || '—'}</td>
                          <td className="border border-slate-200 p-2">{formData[`${id}Remarks`] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SumSection>

              <SumSection icon="fa-notes-medical" title="Past Medical History">
                {checkedMedical.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {formatCheckedForDb(checkedMedical, medicalSpecs).map(c => (
                        <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">{c}</span>
                      ))}
                    </div>}
              </SumSection>

              <SumSection icon="fa-scalpel" title={`Past Surgical History — ${surgicalHistory.length} procedure(s)`}>
                {surgicalHistory.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None.</p>
                  : surgicalHistory.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-3 gap-2 mb-2">
                      <SumItem label={`Operation ${i+1}`} value={s.operation} />
                      <SumItem label="Date" value={s.date} />
                      <SumItem label="Notes" value={s.notes} />
                    </div>
                  ))}
              </SumSection>

              <SumSection icon="fa-people-roof" title="Family History">
                {checkedFamily.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {formatCheckedForDb(checkedFamily, familySpecs).map(c => (
                        <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{c}</span>
                      ))}
                    </div>}
              </SumSection>

              <SumSection icon="fa-person" title="Personal / Social History">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Smoking"       value={formData.smoking === 'Yes' ? `Yes — ${formData.smokingDetails || 'no details'}` : 'No'} />
                  <SumItem label="Alcohol"       value={formData.alcohol === 'Yes' ? `Yes — ${formData.alcoholDetails || 'no details'}` : 'No'} />
                  <SumItem label="Illicit Drugs" value={formData.drugs   === 'Yes' ? `Yes — ${formData.drugsDetails   || 'no details'}` : 'No'} />
                </div>
              </SumSection>

              <SumSection icon="fa-heart-pulse" title="Health Conditions Checked">
                {checkedHealth.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {formatCheckedForDb(checkedHealth, healthSpecs).map(c => (
                        <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">{c}</span>
                      ))}
                    </div>}
              </SumSection>

              <SumSection icon="fa-flask" title="Laboratory Results">
                <div className="grid grid-cols-3 gap-2">
                  {[{label:'CBC',id:'labCbc'},{label:'Urinalysis',id:'labUa'},{label:'Chest X-Ray',id:'labXray'}].map(({ label, id }) => (
                    <SumItem key={id} label={label} value={formData[id]} />
                  ))}
                </div>
              </SumSection>

              <SumSection icon="fa-heart" title="Vital Signs">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="BP"    value={vitalRecords.bp}    />
                  <SumItem label="PR"    value={vitalRecords.pr}    />
                  <SumItem label="RR"    value={vitalRecords.rr}    />
                  <SumItem label="Temp"  value={vitalRecords.temp}  />
                  <SumItem label="Remarks" value={vitalRecords.remarks} />
                </div>
              </SumSection>

              <SumSection icon="fa-ruler-vertical" title="Anthropometric Measurements">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Height (cm)"   value={formData.height} />
                  <SumItem label="Weight (kg)"   value={formData.weight} />
                  <SumItem label="BMI (kg/m²)"   value={formData.bmi}    />
                  <SumItem label="Waist (cm)"    value={formData.waist}  />
                 {/* Add conditional check here */}
                  {formData.sex === 'Female' && (
                    <SumItem label="LMP (Females)" value={formData.lmp}    />
                  )}
                </div>
              </SumSection>

              <SumSection icon="fa-user-doctor" title="Examining Physician & Staff">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Physician"        value={formData.physician}    />
                  <SumItem label="Examination Date & Time" value={formData.examDateTime ? formData.examDateTime.replace('T', ' ') : ''} />
                  <SumItem label="Nurse on Duty"    value={formData.nurseOnDuty} />
                </div>
              </SumSection>
            </div>
            <div className="px-7 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
              {!readOnly && (
                <>
                  <button onClick={() => setShowSummary(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-300 transition disabled:opacity-70">
                    <i className="fa-solid fa-pen-to-square mr-2"></i>Edit
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-circle-check"></i>
                    )}
                    {isSubmitting ? 'Saving...' : 'Submit Medical Record'}
                  </button>
                </>
              )}
              {readOnly && (
                <div className="flex-1 text-center text-sm text-slate-500 font-medium">
                  <i className="fa-solid fa-lock mr-2"></i>View Only - This record has already been submitted
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALERT MODAL ══════════════════════════════════════════════════════ */}
      {alertModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[28px] sm:rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out] pb-[env(safe-area-inset-bottom)]">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-[#e0eceb] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-clipboard-list text-2xl text-[#466460]"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{alertModal.title}</h3>
              <p className="text-sm text-slate-500 whitespace-pre-line leading-relaxed">
                {alertModal.message}
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button
                onClick={() => setAlertModal({ open: false, title: '', message: '' })}
                className="w-full min-h-11 bg-[#466460] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3a524f] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Medical;
