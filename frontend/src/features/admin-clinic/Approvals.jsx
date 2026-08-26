// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Approvals.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { MedicalCertificate } from '../../components/MedicalCertificate';
import { DentalExaminationReport } from '../../components/DentalExaminationReport';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';
import {updateRecord} from '../../services/records.service';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

const getAuthToken = () => {
  return localStorage.getItem('token');
};

const parseApiResponse = async (response) => {
  const contentType =
    response.headers.get('content-type') || '';

  const result = contentType.includes('application/json')
    ? await response.json()
    : {
        success: false,
        message: await response.text(),
      };

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      `Request failed with status ${response.status}`
    );
  }

  return result.data;
};

const updateRecordThroughApi = async (
  recordType,
  recordId,
  updates
) => {
  if (!recordId) {
    throw new Error('Record ID is required.');
  }

  if (!['medical', 'dental'].includes(recordType)) {
    throw new Error('Invalid record type.');
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error(
      'Authentication token was not found. Please sign in again.'
    );
  }

  const response = await fetch(
    `${API_URL}/records/${recordType}/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    }
  );

  return parseApiResponse(response);
};

const updateRecordStatusThroughApi = async (
  recordType,
  recordId,
  status
) => {
  if (!recordId) {
    throw new Error('Record ID is required.');
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error(
      'Authentication token was not found. Please sign in again.'
    );
  }

  const response = await fetch(
    `${API_URL}/records/${recordType}/${recordId}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  return parseApiResponse(response);
};

// Abbreviate program names
const shortenCourse = (courseName) => {
  if (!courseName) return '';
  const courseMap = {
    'Bachelor of Science in Information Technology': 'BSIT',
    'Bachelor of Science in Information System': 'BSIS',
    'Bachelor of Science in Computer Engineering': 'BSCpE',
    'Bachelor of Science in Industrial Engineering': 'BSIE',
    'Bachelor of Science in Entrepreneurship': 'BSEntrep',
    'Bachelor of Science in Public Administration': 'BSPA',
    'Bachelor of Science in Office Administration': 'BSOA',
    'Bachelor of Science in Business Administration Major in Human Resource Development Management': 'BSBA-HRDM',
    'Bachelor of Science in Business Administration Major in Financial Management': 'BSBA-FM',
    'Bachelor of Science in Business Administration Major in Marketing Management': 'BSBA-MM',
    'Bachelor of Science in Economics': 'BSEcon',
    'Bachelor of Arts in Communication': 'BAC',
    'Bachelor of Science in Psychology': 'BSPsych',
    'Bachelor of Arts in Political Science': 'BAPolSci',
    'Bachelor of Science in Tourism Management': 'BSTM',
    'Bachelor of Science in Hospitality Management': 'BSHM',
    'Bachelor of Science in Accountancy': 'BSA',
    'Bachelor of Science in Accountancy Information System': 'BSAIS',
    'Bachelor of Science in Management Accounting': 'BSMA',
  };
  return courseMap[courseName] || courseName;
};

// Normalize patient data similar to Records.jsx
const normalizePatientData = (uid, d) => {
  const firstName     = d.firstName    || d.first_name    || '';
  const lastName      = d.lastName     || d.last_name     || '';
  const middleName = d.middleName || d.middle_name   || '';
  const suffix        = d.suffix       || '';
  const universityId  = d.universityId || d.university_id || d.studentId || d.student_id || '';

  const name = lastName
    ? `${lastName}, ${firstName} ${middleName} ${suffix}`.trim()
    : firstName || '—';

  return {
    uid, name, firstName, lastName, middleName, suffix,
    id:             universityId || uid,
    universityId,
    studentId:      d.studentId  || d.student_id  || universityId || '',
    role:           d.role       || '',
    prog:           d.program    || d.course       || '',
    program:        d.program    || d.course       || '',
    year:           d.yearLevel  || d.year_level   || '',
    yearLevel:      d.yearLevel  || d.year_level   || '',
    section:        d.section    || '',
    age:            d.age        || '',
    gender:         d.gender     || d.sex          || '',
    sex:            d.gender     || d.sex          || '',
    birthdate:      d.birthday   || d.birthdate    || '',
    birthday:       d.birthday   || d.birthdate    || '',
    email:          d.email      || '',
    phoneNumber:    d.phoneNumber || d.phone_number || d.contact_no || '',
    department:     d.department || '',
    jobTitle:       d.jobTitle   || d.job_title    || '',
    classification: d.classification || '',
    homeAddress:    d.homeAddress || d.home_address || d.address || '',
    religion:       d.religion   || '',
    nationality:    d.nationality || '',
    civilStatus:    d.civilStatus || d.civil_status || '',
    bloodType:      d.bloodType  || d.blood_type   || '',
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

// Maps questionnaire keys (q1, q2...) to the actual question text from the exam form
const HEALTH_HISTORY_QUESTIONS = [
  { q: 'Are you in good health?', name: 'q1', detail: null },
  { q: 'Are you under medical treatment now?', name: 'q2', detail: 'q2Details' },
  { q: 'Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?', name: 'q3', detail: 'q3Details' },
  { q: 'Are you taking any medication?', name: 'q4', detail: 'q4Details' },
  { q: 'For women only: Are you pregnant?', name: 'q5', detail: null },
  { q: 'Are you nursing?', name: 'q5b', detail: null },
];

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
      ${visible ? '-translate-x-1/2 translate-y-0 opacity-100' : '-translate-x-1/2 translate-y-32 opacity-0 pointer-events-none'}
      ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}
  >
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// STATUS BADGE
// ============================================================
const StatusBadge = ({ status }) => {
  const statusClass = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-[#466460]',
    done: 'bg-emerald-100 text-[#466460]',
    rejected: 'bg-red-100 text-red-700'
  }[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusClass}`}>
      {status || 'pending'}
    </span>
  );
};

// ============================================================
// PAST MEDICAL RECORD HISTORY HELPERS (redesigned)
// ============================================================
const SectionLabel = ({ icon, color, children }) => (
  <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
    <i className={`fa-solid ${icon} ${color}`}></i>{children}
  </h5>
);

const HistoryGroup = ({ title, items, other, tint }) => {
  const tints = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {(items.length > 0 ? items : ['None recorded']).map((h, i) => (
          <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${tints[tint]}`}>{h}</span>
        ))}
      </div>
      {other && <p className="text-[11px] text-slate-500 italic mt-1.5">Other: {other}</p>}
    </div>
  );
};

const PastMedicalRecord = ({ consult, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  const parseJson = (str, fallback = {}) => {
    if (!str) return fallback;
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const vitalRec = (() => {
    const v = consult.vital_records;
    if (!v) return {};
    if (Array.isArray(v)) return v[0] || {};
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
    return v;
  })();

  const labResultsRaw = parseJson(consult.laboratory_results, {});
  const labResults = {
    cbc: labResultsRaw.cbc?.result || consult.lab_cbc || '',
    cbcFacility: labResultsRaw.cbc?.facility || consult.lab_cbc_facility || '',
    ua: labResultsRaw.ua?.result || consult.lab_ua || '',
    uaFacility: labResultsRaw.ua?.facility || consult.lab_ua_facility || '',
    xray: labResultsRaw.xray?.result || consult.lab_xray || '',
    xrayFacility: labResultsRaw.xray?.facility || consult.lab_xray_facility || '',
  };

  const pastMedicalHistory = consult.checked_medical || [];
  const pastFamilyHistory = consult.checked_family || [];
  const pastSurgicalHistory = consult.surgical_history?.map(s => `${s.operation} (${s.date})`) || [];
  const pastQuestionnaire = parseJson(consult.questionnaire, {});
  const pastCovidHistory = parseJson(consult.covid_history, {});
  const dateTime = formatFullDate(consult.exam_date || consult.created_at);

  return (
    <div className="relative">
      <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-[#466460] ring-4 ring-white"></div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-chevron-right text-slate-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}></i>
            <div>
              <p className="text-sm font-semibold text-slate-800">{dateTime}</p>
              <p className="text-xs text-slate-500">
                Physician: <span className="font-medium text-slate-600">{consult.physician || consult.nurse_on_duty || 'Unknown'}</span>
              </p>
            </div>
          </div>
          <StatusBadge status={consult.status} />
        </button>

        {open && (
          <div className="p-4 space-y-4 border-t border-slate-100">
            {(vitalRec.bp || vitalRec.pr || vitalRec.rr || vitalRec.temp) && (
              <div>
                <SectionLabel icon="fa-heart-pulse" color="text-rose-500">Vital Signs</SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {[
                    { label: 'Blood Pressure', value: vitalRec.bp, unit: 'mmHg' },
                    { label: 'Heart Rate', value: vitalRec.pr, unit: 'bpm' },
                    { label: 'Respiratory Rate', value: vitalRec.rr, unit: 'cpm' },
                    { label: 'Temperature', value: vitalRec.temp, unit: '°C' },
                  ].filter(v => v.value).map((v, i) => (
                    <div key={i} className="bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">{v.label}</p>
                      <p className="text-sm font-bold text-slate-800">{v.value} <span className="text-[11px] font-medium text-slate-400">{v.unit}</span></p>
                    </div>
                  ))}
                </div>
                {vitalRec.remarks && <p className="text-xs text-slate-500 italic mt-2">Remarks: {vitalRec.remarks}</p>}
              </div>
            )}

            {(pastMedicalHistory.length > 0 || pastFamilyHistory.length > 0 || pastSurgicalHistory.length > 0 || consult.other_medical_history || consult.other_family_history) && (
              <div>
                <SectionLabel icon="fa-notes-medical" color="text-purple-500">Clinical History</SectionLabel>
                <div className="grid md:grid-cols-3 gap-3 mt-2">
                  <HistoryGroup title="Medical History" items={pastMedicalHistory} other={consult.other_medical_history} tint="purple" />
                  <HistoryGroup title="Family History" items={pastFamilyHistory} other={consult.other_family_history} tint="fuchsia" />
                  <HistoryGroup title="Surgical History" items={pastSurgicalHistory} tint="indigo" />
                </div>
              </div>
            )}

            {(labResults.cbc || labResults.ua || labResults.xray) && (
              <div>
                <SectionLabel icon="fa-flask" color="text-teal-500">Laboratory Results</SectionLabel>
                <div className="grid md:grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'CBC', result: labResults.cbc, facility: labResults.cbcFacility },
                    { label: 'UA', result: labResults.ua, facility: labResults.uaFacility },
                    { label: 'CXR', result: labResults.xray, facility: labResults.xrayFacility },
                  ].filter(t => t.result).map((t, i) => (
                    <div key={i} className="bg-teal-50/60 border border-teal-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">{t.label}</p>
                      <p className="text-sm font-semibold text-slate-800">{t.result}</p>
                      {t.facility && <p className="text-[11px] text-slate-400">{t.facility}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastQuestionnaire && Object.keys(pastQuestionnaire).length > 0 && (
              <div>
                <SectionLabel icon="fa-circle-question" color="text-cyan-500">Health History Questionnaire</SectionLabel>
                <div className="space-y-1.5 mt-2">
                  {HEALTH_HISTORY_QUESTIONS.map(({ q, name, detail }) => {
                    const answer = pastQuestionnaire?.[name];
                    if (answer === undefined) return null;
                    const isYes = answer?.toLowerCase() === 'yes';
                    return (
                      <div key={name} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-600 flex-1">{q}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {detail && pastQuestionnaire?.[detail] && (
                            <span className="text-[11px] text-slate-400 italic max-w-[180px] truncate">{pastQuestionnaire[detail]}</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isYes ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {answer}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pastCovidHistory && (pastCovidHistory.dose1?.vaccineName || pastCovidHistory.dose2?.vaccineName || pastCovidHistory.booster1?.vaccineName || pastCovidHistory.booster2?.vaccineName || pastCovidHistory.history) && (
              <div>
                <SectionLabel icon="fa-syringe" color="text-lime-500">COVID-19 Vaccination</SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {[
                    { label: '1st Dose', name: pastCovidHistory.dose1?.vaccineName, date: pastCovidHistory.dose1?.date },
                    { label: '2nd Dose', name: pastCovidHistory.dose2?.vaccineName, date: pastCovidHistory.dose2?.date },
                    { label: 'Booster 1', name: pastCovidHistory.booster1?.vaccineName, date: pastCovidHistory.booster1?.date },
                    { label: 'Booster 2', name: pastCovidHistory.booster2?.vaccineName, date: pastCovidHistory.booster2?.date },
                  ].filter(v => v.name).map((v, i) => (
                    <div key={i} className="bg-lime-50/60 border border-lime-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-lime-600 uppercase">{v.label}</p>
                      <p className="text-xs font-semibold text-slate-800">{v.name}</p>
                      {v.date && <p className="text-[11px] text-slate-400">{v.date}</p>}
                    </div>
                  ))}
                </div>
                {pastCovidHistory.history && <p className="text-xs text-slate-500 italic mt-2">History: {pastCovidHistory.history}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const Approvals = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [examType, setExamType] = useState('medical'); // 'medical' or 'dental'
  const [examinations, setExaminations] = useState([]);
  const [dentalExaminations, setDentalExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Get current user role for filtering
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function to determine role from user data
  const getUserRoleFromData = (userData) => {
    const role = userData?.role?.toLowerCase() || '';
    const classification = userData?.classification?.toLowerCase() || '';
    const jobTitle = (userData?.job_title || '').toLowerCase();

    if (classification === 'dentist' || jobTitle.includes('dentist')) return 'dentist';
    if (classification === 'doctor' || jobTitle.includes('doctor')) return 'doctor';
    if (classification === 'nurse' || jobTitle.includes('nurse')) return 'nurse';
    if (classification === 'sysadmin' || classification === 'administrator' || role === 'sysadmin') return 'sysadmin';
    return role || 'staff';
  };

  // Check if user is dentist or doctor
  const userRole = getUserRoleFromData(currentUser);
  const isDentist = userRole === 'dentist';
  const isDoctor = userRole === 'doctor' || userRole === 'nurse';
  const isAdmin = userRole === 'sysadmin';

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterIssueCert, setFilterIssueCert] = useState('All');
  const [filterRequested, setFilterRequested] = useState('All');

  const [snackbar, setSnackbar] = useState({ message: '', type: 'success', visible: false });
  const [loading, setLoading] = useState(true);

  // Notification counters shown on the Pending and Approved tabs.
  // Pending = records waiting for clinic approval.
  // Requested = approved records where the patient requested a certificate/report
  // but the clinic has not issued/sent it yet.
  const [pendingCount, setPendingCount] = useState(0);
  const [requestedCount, setRequestedCount] = useState(0);

  // State for Medical History
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // States for Certificate Toggle
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ status: 'pending', issue_cert: false });
  const [showReportForm, setShowReportForm] = useState(false);

  // Full exam edit modal - shows the actual Medical/Dental form
  const [showFullExamModal, setShowFullExamModal] = useState(false);
  const [examRecordData, setExamRecordData] = useState(null);
  const [normalizedPatient, setNormalizedPatient] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Fetch current user info and set default exam type
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // First try to get from localStorage
      const rawUser = localStorage.getItem('user');
      let userData = null;

      if (rawUser) {
        userData = JSON.parse(rawUser);
      }

      // If not in localStorage, try Supabase
      if (!userData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('*').eq('uid', user.id).single();
          userData = data;
        }
      }

      if (userData) {
        setCurrentUser(userData);

        // Determine role and set default exam type
        const role = getUserRoleFromData(userData);

        if (role === 'dentist') {
          setExamType('dental');
        } else if (role === 'doctor' || role === 'nurse') {
          setExamType('medical');
        }
        // For admin and others, default is medical (can see both tabs)
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch the notification counts independently of the currently selected tab.
  // The list fetch only loads the active tab, so counting from examinations/
  // dentalExaminations alone would make the other tab's badge disappear.
  const refreshNotificationCounts = async () => {
    const table = examType === 'dental' ? 'dental_records' : 'medical_records';

    try {
      const [pendingResult, requestedResult] = await Promise.all([
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .ilike('status', 'pending'),
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .ilike('status', 'approved')
          .eq('cert_requested', true)
          .eq('issue_cert', false),
      ]);

      if (pendingResult.error) throw pendingResult.error;
      if (requestedResult.error) throw requestedResult.error;

      setPendingCount(pendingResult.count || 0);
      setRequestedCount(requestedResult.count || 0);
    } catch (error) {
      console.error('[Approvals] Error fetching notification counts:', error);
    }
  };

  // Fetch records based on activeTab
  useEffect(() => {
    const fetchExaminations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('medical_records')
          .select('*, users(*)')
          .eq('is_archived', false)
          .ilike('status', activeTab)
          .order('created_at', { ascending: false });

        if (error) throw error;

 const fetchedExams = (data || []).map(record => {
  let userData = record.users || {};
  if (Array.isArray(userData)) userData = userData[0] || {};

  // Safely parse a JSONB field whether Supabase returns it as an object or a string
  const parseJsonField = (field, fallback = {}) => {
    if (!field) return fallback;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch { return fallback; }
    }
    return field;
  };

  const patientInfo   = parseJsonField(record.patient_info, {});
  const covidHistory  = parseJsonField(record.covid_history, {});
  const labResultsRaw = parseJsonField(record.laboratory_results, {});
  const questionnaire = parseJsonField(record.questionnaire, {});

  // vital_records is now a flat object (not an array like before)
  const vitalRec = (() => {
    const v = record.vital_records;
    if (!v) return {};
    if (Array.isArray(v)) return v[0] || {};              // old-schema safety net
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
    return v;
  })();

  const fName = record.first_name || userData.first_name || '';
  const mName = record.middle_name || userData.middle_name || '';
  const lName = record.last_name || userData.last_name || '';
  const patientName = [fName, mName, lName].filter(Boolean).join(' ') || 'Unknown Patient';

  const patientId = record.university_id || record.student_id || userData.university_id || 'N/A';

  const department = userData.department || record.department || 'N/A';
  const program = userData.program || record.program || userData.course || record.course || 'N/A';
  const yLevel = userData.year_level || record.year_level || '';
  const sec = userData.section || record.section || '';
  const yearSection = [yLevel, sec].filter(Boolean).join(' - ') || '';

  // FIX: certificate-issued badge was derived from finding1/remarks text
  // presence, which is a different signal than issue_cert. A record could
  // have blank findings but issue_cert = true (or vice versa), causing the
  // "CERT SENT" badge and the "Issue Certificate" button to disagree.
  // issue_cert is the single source of truth for whether a cert was sent.
  const certificateIssued = !!record.issue_cert;

  return {
    id: record.id,
    recordId: record.id,
    userId: record.user_id,
    patientName,
    patientId,
    firstName: fName,
    middleName: mName,
    lastName: lName,
    type: record.role || userData.role || 'student',

    course: program,
    yearSection,
    address: patientInfo.address || record.address || record.home_address || userData.home_address || '',
    age: patientInfo.age || record.age || userData.age || '',
    sex: patientInfo.sex || record.sex || record.gender || userData.sex || '',
    examDate: record.exam_date || (record.created_at ? new Date(record.created_at).toISOString().split('T')[0] : ''),

    program,
    year: yearSection,
    department,
    nurseName: record.nurse_on_duty || 'Unknown',
    physician: record.physician || '',
    schoolYear: record.school_year || '',
    status: record.status || 'pending',
    reason: record.reason || 'Medical Examination',

    // Certificate Details
    finding1: record.finding1,
    remarks: record.remarks,
    isFit: record.is_fit,
    isNormalFindings: record.is_normal_findings,
    certificateIssued,
    issue_cert: record.issue_cert ?? false,
    certRequested: !!record.cert_requested,
    certRequestedAt: record.cert_requested_at || null,

    // Patient profile info (now nested under patient_info)
    contactNo: patientInfo.contact_no || '',
    religion: patientInfo.religion || '',
    nationality: patientInfo.nationality || '',
    civilStatus: patientInfo.civil_status || '',
    emergency: {
      name: patientInfo.emergency_name || '',
      relation: patientInfo.emergency_relation || '',
      address: patientInfo.emergency_address || '',
      contact: patientInfo.emergency_contact || '',
    },

    vitals: vitalRec,
    anthropometrics: {
      height: vitalRec.height ?? record.height,
      weight: vitalRec.weight ?? record.weight,
      bmi: vitalRec.bmi ?? record.bmi,
      waist: vitalRec.waist ?? record.waist,
      lmp: vitalRec.lmp || '',
    },
    medicalHistory: record.checked_medical || [],
    surgicalHistory: record.surgical_history?.map(s => `${s.operation} (${s.date})`) || [],
    familyHistory: record.checked_family || [],
    healthConditions: record.checked_health || [],
    questionnaire,

    vaccine: {
      dose1:        covidHistory.dose1?.vaccineName   || record.vax1        || '',
      dose1Date:    covidHistory.dose1?.date          || record.vax1_date   || '',
      dose2:        covidHistory.dose2?.vaccineName   || record.vax2        || '',
      dose2Date:    covidHistory.dose2?.date          || record.vax2_date   || '',
      booster:      covidHistory.booster1?.vaccineName|| record.booster1     || '',
      boosterDate:  covidHistory.booster1?.date       || record.booster1_date || '',
      booster2:     covidHistory.booster2?.vaccineName || '',
      booster2Date: covidHistory.booster2?.date        || '',
      history:      covidHistory.history || '',
    },
    labResults: {
      cbc:         labResultsRaw.cbc?.result   || record.lab_cbc          || '',
      cbcFacility: labResultsRaw.cbc?.facility || record.lab_cbc_facility || '',
      ua:          labResultsRaw.ua?.result    || record.lab_ua           || '',
      uaFacility:  labResultsRaw.ua?.facility  || record.lab_ua_facility  || '',
      xray:        labResultsRaw.xray?.result  || record.lab_xray         || '',
      xrayFacility:labResultsRaw.xray?.facility|| record.lab_xray_facility|| '',
    },
    social: {
      smoking: record.smoking, smokingDetails: record.smoking_details,
      alcohol: record.alcohol, alcoholDetails: record.alcohol_details,
      drugs: record.drugs, drugsDetails: record.drugs_details,
    },
    otherMedicalHistory: record.other_medical_history || '',
    otherFamilyHistory: record.other_family_history || '',
  };
});
        setExaminations(fetchedExams);
      } catch (error) {
        console.error("Error fetching approvals:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDentalExaminations = async () => {
      try {
        const { data, error } = await supabase
          .from('dental_records')
          .select('*, users(*)')
          .eq('is_archived', false)
          .ilike('status', activeTab)
          .order('created_at', { ascending: false });

        console.log('[Approvals] Dental records fetched:', data?.length);
        if (data && data[0]) {
          console.log('[Approvals] First record tooth_data raw:', data[0].tooth_data);
        }

        if (error) throw error;

        const fetchedExams = (data || []).map(record => {
          let userData = record.users || {};
          if (Array.isArray(userData)) userData = userData[0] || {};

          // Get first, middle, last name
          const fName = record.first_name || userData.first_name || record.dFirstName || '';
          const mName = record.middle_name || userData.middle_name || record.dMiddleName || '';
          const lName = record.last_name || userData.last_name || record.dLastName || '';
          // Format as "FirstName MiddleName LastName"
          const patientName = [fName, mName, lName].filter(Boolean).join(' ') || 'Unknown Patient';

          const patientId = record.student_id || record.university_id || userData.university_id || record.universityId || 'N/A';

          const dentalHistory = typeof record.dental_history === 'string'
            ? JSON.parse(record.dental_history || '{}')
            : record.dental_history || {};
          const intraoral = typeof record.intraoral === 'string'
            ? JSON.parse(record.intraoral || '{}')
            : record.intraoral || {};

          // Parse tooth_data
          let toothDataRaw = record.tooth_data;
          console.log('[Approvals] tooth_data raw type:', typeof toothDataRaw, 'value:', toothDataRaw);
          const toothData = typeof toothDataRaw === 'string'
            ? JSON.parse(toothDataRaw || '{}')
            : (toothDataRaw || {});

          // FIX: reportForwarded was derived from hasDentalData && status === 'approved',
          // which is unrelated to whether the report was actually generated/sent. That
          // caused the "REPORT SENT" badge to show while "Generate Report" was still
          // visible (issue_cert still false), or vice versa. issue_cert is the single
          // source of truth here, matching what the detail-panel buttons check.
          const reportForwarded = !!record.issue_cert;

          return {
            id: record.id,
            recordId: record.id,
            userId: record.user_id,
            patientName,
            patientId,
            firstName: fName,
            middleName: mName,
            lastName: lName,
            type: record.role || userData.role || 'student',
            courseYear: userData.program || '',
            department: userData.department || record.department || '',
            program: userData.program || record.program || '',
            yearLevel: userData.year_level || record.year_level || '',
            section: userData.section || record.section || '',
            examDate: record.exam_date || record.created_at || '',
            status: record.status,
            createdAt: record.created_at,
            dentalHistory,
            intraoral,
            toothData: toothData,
            treatment_remarks: record.treatment_remarks ? (typeof record.treatment_remarks === 'string' ? JSON.parse(record.treatment_remarks) : record.treatment_remarks) : {},
            treatments: record.treatments ? (typeof record.treatments === 'string' ? JSON.parse(record.treatments) : record.treatments) : mapDentalProcedures(record.dental_history || {}),
            examinedBy: record.examined_by,
            sigDate: record.sig_date,
            patientSignature: '',
            reportForwarded,
            issue_cert: record.issue_cert ?? false,
            certRequested: !!record.cert_requested,
            certRequestedAt: record.cert_requested_at || null,
            age: record.age || userData.age || '',
            sex: record.sex || userData.sex || '',
            address: record.address || userData.address || '',
            lastVisit: record.last_visit,
            prevDentist: record.prev_dentist,
            university_id: record.university_id,
            teeth_upper: record.teeth_upper || '',
            teeth_lower: record.teeth_lower || '',
          };
        });

        setDentalExaminations(fetchedExams);
      } catch (err) {
        console.error('Error fetching dental examinations:', err);
      }
    };

    fetchExaminations();
    fetchDentalExaminations();
    refreshNotificationCounts();

    // Clear selections and filters when switching tabs
    setSelectedExam(null);
    setShowCertForm(false);
    setShowReportForm(false);
    setSearchTerm('');
    setFilterRole('All');
    setFilterDept('All');
    setFilterProgram('All');
    setFilterIssueCert('All');
    setFilterRequested('All');
  }, [activeTab, examType]);

  // Fetch Past Medical/Dental Records when a patient is selected
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      if (!selectedExam) {
        setConsultationHistory([]);
        return;
      }

      const userId = selectedExam.userId;
      if (!userId) {
        console.warn('[Approvals] No userId in selectedExam:', selectedExam);
        setConsultationHistory([]);
        setLoadingHistory(false);
        return;
      }

      setLoadingHistory(true);
      try {
        // Use captured examType to avoid stale closure
        const currentExamType = examType;
        const currentRecordId = selectedExam.recordId || selectedExam.id;

        console.log('[Approvals] Fetching history for userId:', userId, 'currentRecordId:', currentRecordId, 'examType:', currentExamType);

        let data;
        if (currentExamType === 'dental') {
          // Fetch dental records history for dental exams
          let query = supabase
            .from('dental_records')
            .select('*')
            .eq('user_id', userId)
            .eq('is_archived', false);

          // Exclude current record if we have a valid ID
          if (currentRecordId) {
            query = query.neq('id', currentRecordId);
          }

          const { data: dentalData, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;
          data = dentalData;
          console.log('[Approvals] Dental history fetched:', data?.length, 'records');
        } else {
          // Fetch medical records history for medical exams
          let query = supabase
            .from('medical_records')
            .select('*')
            .eq('user_id', userId)
            .eq('is_archived', false);

          // Exclude current record if we have a valid ID
          if (currentRecordId) {
            query = query.neq('id', currentRecordId);
          }

          const { data: medicalData, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;
          data = medicalData;
          console.log('[Approvals] Medical history fetched:', data?.length, 'records');
        }

        if (isMounted) {
          setConsultationHistory(data || []);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedExam, examType]);

  // Derived Filter Lists based on current data (both medical and dental)
  const allExaminations = [...examinations, ...dentalExaminations];
  const uniqueRoles = ['All', ...new Set(allExaminations.map(e => e.type).filter(Boolean))].sort();
  const uniqueDepts = ['All', ...new Set(allExaminations.map(e => e.department).filter(d => d && d !== 'N/A'))].sort();
  const uniquePrograms = ['All', ...new Set(
    allExaminations
      .filter(e => filterDept === 'All' || e.department === filterDept)
      .map(e => e.program)
      .filter(p => p && p !== 'N/A')
  )].sort();

  // Apply Filters for Medical
  const filteredExaminations = examinations.filter(exam => {
    const matchSearch = exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        exam.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = filterRole === 'All' || exam.type === filterRole;
    const matchDept = filterDept === 'All' || exam.department === filterDept;
    const matchProgram = filterProgram === 'All' || exam.program === filterProgram;
    const matchIssueCert = filterIssueCert === 'All' ||
      (filterIssueCert === 'Issued' ? !!exam.issue_cert : !exam.issue_cert);
    const matchRequested = filterRequested === 'All' ||
      (filterRequested === 'Requested' ? !!exam.certRequested && !exam.issue_cert : true);

    return matchSearch && matchRole && matchDept && matchProgram && matchIssueCert && matchRequested;
  }).sort((a, b) =>
    (b.certRequested && !b.issue_cert ? 1 : 0) - (a.certRequested && !a.issue_cert ? 1 : 0)
  );

  // Apply Filters for Dental
  const filteredDentalExaminations = dentalExaminations.filter(exam => {
    const matchSearch = exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        exam.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = filterRole === 'All' || exam.type === filterRole;
    const matchDept = filterDept === 'All' || exam.department === filterDept;
    const matchProgram = filterProgram === 'All' || exam.program === filterProgram;
    const matchIssueCert = filterIssueCert === 'All' ||
      (filterIssueCert === 'Issued' ? !!exam.issue_cert : !exam.issue_cert);
    const matchRequested = filterRequested === 'All' ||
      (filterRequested === 'Requested' ? !!exam.certRequested && !exam.issue_cert : true);

    return matchSearch && matchRole && matchDept && matchProgram && matchIssueCert && matchRequested;
  }).sort((a, b) =>
    (b.certRequested && !b.issue_cert ? 1 : 0) - (a.certRequested && !a.issue_cert ? 1 : 0)
  );

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type, visible: true });
    setTimeout(() => setSnackbar(prev => ({ ...prev, visible: false })), 3500);
  };

  // Helper to format date cleanly (Year Month Day)
  const formatDateClean = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper to format date like: "July 02, 2026. 11:31 PM"
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

  // Helper to convert full name to abbreviation for condition matching
  // FIX: added 'f' -> 'filled' to abbrMap, and a fullName.includes('filled')
  // fallback check — previously "Filled" conditions were never recognized,
  // so the Filled count in the Tooth Conditions Chart always showed 0.
  const getConditionAbbrFromFull = (fullName) => {
    if (!fullName) return '';
    // Handle formats like "Caries (C)" or just "caries"
    const match = fullName.match(/\(([A-Za-z-]+)\)$/);
    if (match) {
      const abbr = match[1].toLowerCase();
      // Map common abbreviations
      const abbrMap = {
        'c': 'caries',
        'f': 'filled',
        'm': 'missing',
        'x': 'extracted',
        'rf': 'root-fragment',
        'im': 'improved',
      };
      return abbrMap[abbr] || abbr;
    }
    // Check if it's already an abbreviation (case-insensitive)
    const lower = fullName.toLowerCase();
    if (lower.includes('caries')) return 'caries';
    if (lower.includes('filled')) return 'filled';
    if (lower.includes('missing')) return 'missing';
    if (lower.includes('extracted')) return 'extracted';
    if (lower.includes('root fragment')) return 'root-fragment';
    if (lower.includes('improved')) return 'improved';
    return fullName;
  };

  // Helper to convert full operation name to abbreviation
  const getOperationAbbrFromFull = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([A-Za-z]+)\)$/);
    if (match) return match[1];
    return fullName;
  };

  // Helper to extract tooth conditions for restoration/extraction display
  const extractToothConditions = (toothData, conditions) => {
    if (!toothData || typeof toothData !== 'object') return '';
    const conditionLabels = {
      'caries': 'Caries',
      'filled': 'Filled',
      'improved': 'Improved',
      'extracted': 'Extraction Needed',
      'root-fragment': 'Root Fragment',
      'missing': 'Missing',
    };
    const filtered = Object.entries(toothData)
      .filter(([, data]) => {
        if (!data?.condition) return false;
        // Convert full name to abbreviation if needed
        const condAbbr = getConditionAbbrFromFull(data.condition);
        return conditions.includes(condAbbr);
      })
      .map(([num, data]) => {
        const condAbbr = getConditionAbbrFromFull(data.condition);
        const opAbbr = getOperationAbbrFromFull(data.operation);
        return `Tooth #${num}: ${conditionLabels[condAbbr] || data.condition}${data.operation ? ' (' + opAbbr + ')' : ''}`;
      });
    return filtered.length > 0 ? filtered.join('\n') : 'None';
  };

  // Helper to map dental history JSON to treatments object
  const mapDentalProcedures = (dentalHistory) => {
    if (!dentalHistory || typeof dentalHistory !== 'object') return {};
    return {
      oralProphylaxis: dentalHistory['Oral Prophylaxis'] === 'Yes',
      gumTreatment: dentalHistory['Periodontal Therapy'] === 'Yes',
      orthodontic: dentalHistory['Orthodontic Therapy'] === 'Yes',
      prosthodontic: dentalHistory['Prosthodontic Therapy'] === 'Yes',
      endodontic: dentalHistory['Endodontic Treatment'] === 'Yes',
      tmj: dentalHistory['TMJ Treatment'] === 'Yes',
      xray: false,
      fluoride: dentalHistory['Fluoride Treatment'] === 'Yes' || dentalHistory['Fluoride'] === 'Yes',
      sealant: dentalHistory['Sealant'] === 'Yes',
    };
  };

  const handleSelectExam = (exam) => {
    // Auto-detect exam type based on exam data (dentalHistory, toothData, intraoral indicate dental)
    const hasDentalData = exam.dentalHistory || exam.toothData || exam.intraoral || exam.dental_history || exam.tooth_data || exam.intraoral;
    const detectedExamType = hasDentalData ? 'dental' : examType;

    // Update examType state when selecting a dental record
    if (hasDentalData && examType !== 'dental') {
      setExamType('dental');
    } else if (!hasDentalData && examType !== 'medical') {
      setExamType('medical');
    }

    // Map dental exam data for DentalExaminationReport
    if (detectedExamType === 'dental') {
      const mappedExam = {
        ...exam,
        // Use first, middle, last name for proper display
        patientName: exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName,
        age: exam.age,
        sex: exam.sex,
        address: exam.address || '',
        course: shortenCourse(exam.program) || '',
        yearSection: [shortenCourse(exam.program), exam.yearLevel, exam.section].filter(Boolean).join(' '),
        year: exam.yearLevel || exam.year || '',
        gradeLevel: exam.yearLevel || exam.year || '',
        // Pass through exam date and examined by - use multiple fallbacks
        examDate: exam.examDate || exam.exam_date || exam.createdAt || '',
        exam_date: exam.exam_date || exam.examDate || exam.createdAt || '',
        examinedBy: exam.examinedBy || exam.examined_by || '',
        examined_by: exam.examined_by || exam.examinedBy || '',
        // Pass JSONB fields directly
        dentalHistory: exam.dental_history || {},
        toothData: exam.toothData || exam.tooth_data || {},
        intraoral: exam.intraoral || {},
        // Map to DentalExaminationReport expected fields
        parentName: '',
        // Check dental_history first for saved restoration/extraction, then fall back to tooth_data
        restoration: exam.dental_history?.['needs_restoration'] || extractToothConditions(exam.tooth_data || {}, ['caries', 'filled', 'improved']),
        extraction: exam.dental_history?.['for_extraction'] || extractToothConditions(exam.tooth_data || {}, ['extracted', 'root-fragment']),
        // Use stored treatments if available, otherwise map from dental_history
        treatments: exam.treatments && Object.keys(exam.treatments).length > 0
          ? exam.treatments
          : mapDentalProcedures(exam.dental_history || {}),
        treatmentDetails: {
          orthodontic: exam.dental_history?.['Orthodontic Therapy'] === 'Yes' ? 'Yes' : '',
          prosthodontic: exam.dental_history?.['Prosthodontic Therapy'] === 'Yes' ? 'Yes' : '',
          endodontic: exam.dental_history?.['Endodontic Treatment'] === 'Yes' ? 'Yes' : '',
        },
        treatmentRemarks: exam.treatment_remarks || {},
        familyDentist: exam.prev_dentist || '',
        lastVisit: exam.last_visit || '',
        teethUpper: exam.teeth_upper || '',
        teethLower: exam.teeth_lower || '',
      };
      setSelectedExam(mappedExam);
    } else {
      setSelectedExam(exam);
    }
    setShowCertForm(false);
    setShowReportForm(false);
  };

const handleApprove = async (exam) => {
  if (!exam) return;

  const recordId =
    exam.recordId || exam.id;

  setLoading(true);

  try {
   await updateRecord(recordId, {
  recordType: 'medical',
  status: 'approved',
  is_approved: true,
  approved_at: new Date().toISOString(),
});

    if (activeTab === 'pending') {
      setExaminations((previous) =>
        previous.filter(
          (item) => item.id !== exam.id
        )
      );

      setSelectedExam(null);
    } else {
      setExaminations((previous) =>
        previous.map((item) =>
          item.id === exam.id
            ? {
                ...item,
                status: 'approved',
                is_approved: true,
                approved_at:
                  new Date().toISOString(),
              }
            : item
        )
      );
    }

    await refreshNotificationCounts();

    setShowCertForm(false);

    showSnackbar(
      `Examination for ${exam.patientName} has been approved!`,
      'success'
    );
  } catch (error) {
    console.error(
      'Error approving examination:',
      error
    );

    showSnackbar(
      error.message ||
        'Failed to approve examination',
      'error'
    );
  } finally {
    setLoading(false);
  }
};

  // Dental approve handler
const handleDentalApprove = async (exam) => {
  if (!exam) return;

  const recordId =
    exam.recordId || exam.id;

  setLoading(true);

  try {
 await updateRecord(recordId, {
  recordType: 'dental',
  status: 'approved',
  is_approved: true,
  approved_at: new Date().toISOString(),
});

    if (activeTab === 'pending') {
      setDentalExaminations((previous) =>
        previous.filter(
          (item) => item.id !== exam.id
        )
      );

      setSelectedExam(null);
    } else {
      setDentalExaminations((previous) =>
        previous.map((item) =>
          item.id === exam.id
            ? {
                ...item,
                status: 'approved',
                is_approved: true,
                approved_at:
                  new Date().toISOString(),
              }
            : item
        )
      );
    }

    await refreshNotificationCounts();

    showSnackbar(
      `Dental examination for ${exam.patientName} has been approved!`,
      'success'
    );
  } catch (error) {
    console.error(
      'Error approving dental examination:',
      error
    );

    showSnackbar(
      error.message ||
        'Failed to approve dental examination',
      'error'
    );
  } finally {
    setLoading(false);
  }
};

const handleSaveDentalReport = async (data) => {
  if (!selectedExam) return;

  const recordId =
    selectedExam.recordId ||
    selectedExam.id;

  setLoading(true);

  try {
    const updatedDentalHistory = {
      ...(data.dentalHistory || {}),
    };

    if (data.treatments) {
      updatedDentalHistory['Oral Prophylaxis'] =
        data.treatments.oralProphylaxis
          ? 'Yes'
          : 'No';

      updatedDentalHistory['Periodontal Therapy'] =
        data.treatments.gumTreatment
          ? 'Yes'
          : 'No';

      updatedDentalHistory['Orthodontic Therapy'] =
        data.treatments.orthodontic
          ? 'Yes'
          : 'No';

      updatedDentalHistory['Prosthodontic Therapy'] =
        data.treatments.prosthodontic
          ? 'Yes'
          : 'No';

      updatedDentalHistory['Endodontic Treatment'] =
        data.treatments.endodontic
          ? 'Yes'
          : 'No';

      updatedDentalHistory['TMJ Treatment'] =
        data.treatments.tmj
          ? 'Yes'
          : 'No';

      updatedDentalHistory['Fluoride Treatment'] =
        data.treatments.fluoride
          ? 'Yes'
          : 'No';

      updatedDentalHistory.Sealant =
        data.treatments.sealant
          ? 'Yes'
          : 'No';
    }

    if (data.restoration) {
      updatedDentalHistory.needs_restoration =
        data.restoration;
    }

    if (data.extraction) {
      updatedDentalHistory.for_extraction =
        data.extraction;
    }

    const approvedAt =
      selectedExam.status === 'approved'
        ? selectedExam.approved_at ||
          selectedExam.approvedAt ||
          new Date().toISOString()
        : new Date().toISOString();

await updateRecord(recordId, {
  recordType: 'dental',
  dental_history: updatedDentalHistory,
  intraoral: data.intraoral || {},
  tooth_data: data.toothData || {},
  treatment_remarks:
    data.treatmentRemarks || {},
  treatments: data.treatments || {},
  status: 'approved',
  is_approved: true,
  approved_at: approvedAt,
  examined_by: data.examinedBy || null,
  exam_date: data.examDate || null,
  issue_cert: true,
});

    const updatedExam = {
      ...selectedExam,
      dentalHistory:
        updatedDentalHistory,
      dental_history:
        updatedDentalHistory,
      intraoral:
        data.intraoral || {},
      toothData:
        data.toothData || {},
      tooth_data:
        data.toothData || {},
      treatment_remarks:
        data.treatmentRemarks || {},
      treatments:
        data.treatments || {},
      patientSignature:
        data.patientSignature,
      sigDate:
        data.sigDate,
      examinedBy:
        data.examinedBy,
      examined_by:
        data.examinedBy,
      examDate:
        data.examDate,
      exam_date:
        data.examDate,
      status: 'approved',
      is_approved: true,
      approved_at: approvedAt,
      issue_cert: true,
      reportForwarded: true,
    };

    if (activeTab === 'pending') {
      setDentalExaminations((previous) =>
        previous.filter(
          (item) =>
            item.id !== selectedExam.id
        )
      );

      setSelectedExam(null);
    } else {
      setDentalExaminations((previous) =>
        previous.map((item) =>
          item.id === selectedExam.id
            ? updatedExam
            : item
        )
      );

      setSelectedExam(updatedExam);
    }

    await refreshNotificationCounts();

    setShowReportForm(false);

    showSnackbar(
      'Dental report saved and forwarded successfully!',
      'success'
    );
  } catch (error) {
    console.error(
      'Error saving dental report:',
      error
    );

    showSnackbar(
      error.message ||
        'Failed to save dental report',
      'error'
    );
  } finally {
    setLoading(false);
  }
};

const handleSubmitCertificate = async (data) => {
  if (!selectedExam) return;

  const recordId =
    selectedExam.recordId ||
    selectedExam.id;

  setLoading(true);

  try {
    const approvedAt =
      selectedExam.status === 'approved'
        ? selectedExam.approved_at ||
          selectedExam.approvedAt ||
          new Date().toISOString()
        : new Date().toISOString();

await updateRecord(recordId, {
  recordType: 'medical',
  status: 'approved',
  is_approved: true,
  finding1: data.finding1 ?? '',
  remarks: data.remarks ?? '',
  is_fit: data.isFit ?? true,
  is_normal_findings:
    data.isNormalFindings ?? true,
  approved_at: approvedAt,
  issue_cert: true,
});

    const updatedExam = {
      ...selectedExam,
      finding1:
        data.finding1 ?? '',
      remarks:
        data.remarks ?? '',
      isFit:
        data.isFit ?? true,
      is_fit:
        data.isFit ?? true,
      isNormalFindings:
        data.isNormalFindings ?? true,
      is_normal_findings:
        data.isNormalFindings ?? true,
      status: 'approved',
      is_approved: true,
      approved_at:
        approvedAt,
      issue_cert: true,
      certificateIssued: true,
    };

    if (activeTab === 'pending') {
      setExaminations((previous) =>
        previous.filter(
          (item) =>
            item.id !== selectedExam.id
        )
      );

      setSelectedExam(null);
    } else {
      setExaminations((previous) =>
        previous.map((item) =>
          item.id === selectedExam.id
            ? updatedExam
            : item
        )
      );

      setSelectedExam(updatedExam);
    }

    await refreshNotificationCounts();

    setShowCertForm(false);

    showSnackbar(
      `Medical Certificate for ${
        data.patientName ||
        selectedExam.patientName
      } has been issued!`,
      'success'
    );
  } catch (error) {
    console.error(
      'Error submitting certificate:',
      error
    );

    showSnackbar(
      error.message ||
        'Failed to submit certificate',
      'error'
    );
  } finally {
    setLoading(false);
  }
};

  const handleEdit = async () => {
    if (!selectedExam) return;

    setModalLoading(true);
    try {
      const table = examType === 'dental' ? 'dental_records' : 'medical_records';
      const recordId = selectedExam.recordId || selectedExam.id;

      // Also fetch the user data for additional info
      const { data: record, error } = await supabase
        .from(table)
        .select('*, users(*)')
        .eq('id', recordId)
        .single();

      if (error) throw error;

      // Get user data
      const userData = Array.isArray(record.users) ? record.users[0] || {} : record.users || {};

      // Set normalized patient for the modal (like Records.jsx does)
      setNormalizedPatient(normalizePatientData(record.user_id, userData));

      // Format the data for Medical/Dental components
      if (examType === 'dental') {
        // Parse JSONB fields for dental
        const parseJson = (str, fallback = {}) => {
          if (!str) return fallback;
          if (typeof str === 'object') return str;
          try { return JSON.parse(str); } catch { return fallback; }
        };

        // Build dental form data that matches what Dental.jsx expects
        // Pass record data in a way that works with buildDentalForm
        const dentalData = {
          // User info - these match what Dental.jsx expects
          uid: record.user_id,
          id: record.university_id || record.student_id || userData.university_id,
          name: `${record.first_name || ''} ${record.middle_name || ''} ${record.last_name || ''}`.trim(),
          firstName: record.first_name || userData.first_name,
          middleName: record.middle_name || userData.middle_name,
          lastName: record.last_name || userData.last_name,
          gender: record.sex || userData.sex,
          sex: record.sex || userData.sex,
          age: record.age || userData.age,
          birthday: record.birthday || userData.birthday,
          homeAddress: record.address || userData.home_address || userData.address,
          phoneNumber: record.cellphone || userData.phone_number || userData.contact_no,
          program: record.program || userData.program,
          yearLevel: record.year_level || userData.year_level,
          section: record.section || userData.section,
          role: record.role || userData.role,
          department: userData.department,
          nationality: record.nationality || userData.nationality,

          // Dental-specific fields from record - as existingRecord
          existingRecord: {
            // Row primary key — required so Dental.jsx can UPDATE this row
            // instead of INSERTing a duplicate on submit.
            id: record.id,

            // Patient info
            patient_info: parseJson(record.patient_info, {}),

            // Dental-specific
            dental_history: parseJson(record.dental_history, {}),
            tooth_data: parseJson(record.tooth_data, {}),
            intraoral: parseJson(record.intraoral, {}),
            treatment_remarks: parseJson(record.treatment_remarks, {}),
            treatments: parseJson(record.treatments, {}),

            // Exam details
            last_visit: record.last_visit,
            prev_dentist: record.prev_dentist,
            teeth_upper: record.teeth_upper,
            teeth_lower: record.teeth_lower,
            examined_by: record.examined_by,
            exam_date: record.exam_date,
            sig_date: record.sig_date,
            school_year: record.school_year,
            semester: record.semester,
            status: record.status,
            first_name: record.first_name,
            middle_name: record.middle_name,
            last_name: record.last_name,
            sex: record.sex,
            age: record.age,
            birthday: record.birthday,
            address: record.address,
            university_id: record.university_id,
            student_id: record.student_id,
          },

          // Also keep direct access for dentalHistory/toothData
          dentalHistory: parseJson(record.dental_history, {}),
          toothData: parseJson(record.tooth_data, {}),
          intraoral: parseJson(record.intraoral, {}),
          treatmentRemarks: parseJson(record.treatment_remarks, {}),
          treatments: parseJson(record.treatments, {}),
          lastVisit: record.last_visit,
          prevDentist: record.prev_dentist,
          teethUpper: record.teeth_upper,
          teethLower: record.teeth_lower,
          examinedBy: record.examined_by,
          examDate: record.exam_date,
          patientSignature: '',
          sigDate: record.sig_date,
          schoolYear: record.school_year,
          semester: record.semester,
          status: record.status,
        };

        setExamRecordData(dentalData);
      } else {
        // Parse JSONB fields for medical
        const parseJson = (str, fallback = {}) => {
          if (!str) return fallback;
          if (typeof str === 'object') return str;
          try { return JSON.parse(str); } catch { return fallback; }
        };

        // Build medical form data that matches what Medical.jsx expects
        const medicalData = {
          // User info - these match what Medical.jsx expects
          uid: record.user_id,
          id: record.university_id || record.student_id || userData.university_id,
          name: `${record.first_name || ''} ${record.middle_name || ''} ${record.last_name || ''}`.trim(),
          firstName: record.first_name || userData.first_name,
          middleName: record.middle_name || userData.middle_name,
          lastName: record.last_name || userData.last_name,
          gender: record.sex || userData.sex,
          sex: record.sex || userData.sex,
          age: record.age || userData.age,
          birthday: record.birthday || userData.birthday,
          homeAddress: record.address || record.home_address || userData.home_address || userData.address,
          phoneNumber: record.contact_no || userData.phone_number || userData.contact_no,
          program: record.program || userData.program,
          yearLevel: record.year_level || userData.year_level,
          section: record.section || userData.section,
          role: record.role || userData.role,
          department: record.department || userData.department,
          nationality: record.nationality || userData.nationality,
          civilStatus: record.civil_status || userData.civil_status,

          // Store the existing record for buildInitialForm to use
          // (record already includes record.id, the medical_records PK)
          existingRecord: record,

          // Medical-specific fields from record (direct access)
          patientInfo: parseJson(record.patient_info, {}),
          covidHistory: parseJson(record.covid_history, {}),
          vitalRecords: parseJson(record.vital_records, {}),
          questionnaire: parseJson(record.questionnaire, {}),
          labResults: parseJson(record.laboratory_results, {}),

          // Exam details
          reason: record.reason,
          nurseOnDuty: record.nurse_on_duty,
          nurse_on_duty: record.nurse_on_duty,
          physician: record.physician,
          examDate: record.exam_date,
          exam_date: record.exam_date,
          schoolYear: record.school_year,
          school_year: record.school_year,
          status: record.status,

          // Medical history
          medicalHistory: record.checked_medical || [],
          familyHistory: record.checked_family || [],
          healthConditions: record.checked_health || [],
          surgicalHistory: record.surgical_history || { operations: [], declined: false },
          checked_medical: record.checked_medical || [],
          checked_family: record.checked_family || [],
          checked_health: record.checked_health || [],
          surgical_history: record.surgical_history || { operations: [], declined: false },
          other_medical_history: record.other_medical_history || '',
          other_family_history: record.other_family_history || '',

          // Social history
          smoking: record.smoking,
          smokingDetails: record.smoking_details,
          alcohol: record.alcohol,
          alcoholDetails: record.alcohol_details,
          drugs: record.drugs,
          drugsDetails: record.drugs_details,

          // Anthropometrics
          height: record.height,
          weight: record.weight,
          bmi: record.bmi,
          waist: record.waist,
          lmp: record.lmp,

          // Certificate
          finding1: record.finding1,
          remarks: record.remarks,
          isFit: record.is_fit,
          isNormalFindings: record.is_normal_findings,

          // Vaccination
          vax1: record.vax1,
          vax1Date: record.vax1_date,
          vax2: record.vax2,
          vax2Date: record.vax2_date,
          booster1: record.booster1,
          booster1Date: record.booster1_date,
        };

        setExamRecordData(medicalData);
      }

      // Increment resetKey to ensure Medical/Dental components re-render with new data
      setResetKey(k => k + 1);
      setShowFullExamModal(true);
    } catch (err) {
      console.error('Error fetching record for view:', err);
      showSnackbar('Failed to load examination record', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Called by Medical.jsx / Dental.jsx right after a successful submit
  // (insert or update). Closes the Full Examination Modal automatically
  // so the person isn't left staring at the form after saving.
  const handleExamSaved = () => {
    setShowFullExamModal(false);
    setExamRecordData(null);
    setNormalizedPatient(null);
  };

  const renderExamItem = (exam) => (
    <div
      key={exam.id}
      onClick={() => handleSelectExam(exam)}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-3 mb-2
        ${selectedExam?.id === exam.id
          ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[#466460]'
          : 'bg-slate-50 hover:bg-gradient-to-r hover:from-[#f0f7f6] hover:to-white border-l-transparent'
        }`}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="text-[13px] font-bold text-slate-800 truncate pr-2">
          {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
        </p>
        <StatusBadge status={exam.status} />
      </div>
      <p className="text-[11px] text-slate-500 truncate mb-1">
        {exam.patientId} • {exam.program !== 'N/A' ? exam.program : exam.department}
      </p>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[10px] text-slate-400">{formatDateTime(exam.examDate)}</p>
        <div className="flex items-center gap-1.5">
          {exam.certificateIssued && (
            <span className="text-[9px] font-bold text-[#466460] bg-[#e0eceb] px-1.5 py-0.5 rounded-sm">CERT SENT</span>
          )}
          {exam.certRequested && !exam.issue_cert && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">REQUESTED</span>
          )}
        </div>
      </div>
    </div>
  );

  // Dental exam item renderer
  const renderDentalExamItem = (exam) => (
    <div
      key={exam.id}
      onClick={() => handleSelectExam(exam)}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-3 mb-2
        ${selectedExam?.id === exam.id
          ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[#466460]'
          : 'bg-slate-50 hover:bg-gradient-to-r hover:from-[#f0f7f6] hover:to-white border-l-transparent'
        }`}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="text-[13px] font-bold text-slate-800 truncate pr-2">
          {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
        </p>
        <StatusBadge status={exam.status} />
      </div>
      <p className="text-[11px] text-slate-500 truncate mb-1">
        {exam.patientId} • {exam.courseYear}
      </p>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[10px] text-slate-400">{formatDateTime(exam.examDate)}</p>
        <div className="flex items-center gap-1.5">
          {exam.reportForwarded && (
            <span className="text-[9px] font-bold text-[#466460] bg-[#e0eceb] px-1.5 py-0.5 rounded-sm">REPORT SENT</span>
          )}
          {exam.certRequested && !exam.issue_cert && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">REQUESTED</span>
          )}
        </div>
      </div>
    </div>
  );

  // Dental exam detail renderer
  const renderDentalExamDetail = (exam) => {
    if (!exam) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <i className="fa-solid fa-tooth text-slate-200 text-5xl mb-3"></i>
          <p className="text-slate-400 text-sm">Select a dental examination from the list</p>
        </div>
      );
    }

    // Helper to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '—';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${month} ${day}, ${year}. ${time}`;
    };

    // Get dental history object - ensure it's an object even if stored as string
    const dentalHistory = (() => {
      const dh = exam.dentalHistory || exam.dental_history || {};
      if (typeof dh === 'string') {
        try { return JSON.parse(dh); } catch { return {}; }
      }
      return dh;
    })();
    const intraoral = (() => {
      const io = exam.intraoral || exam.intraoral || {};
      if (typeof io === 'string') {
        try { return JSON.parse(io); } catch { return {}; }
      }
      return io;
    })();
    const toothData = (() => {
      const td = exam.toothData || exam.tooth_data || {};
      if (typeof td === 'string') {
        try { return JSON.parse(td); } catch { return {}; }
      }
      return td;
    })();

    console.log('[Dental Exam Detail] toothData:', toothData);

    // Filter dental procedures that are "Yes"
    const proceduresDone = Object.entries(dentalHistory)
      .filter(([key, val]) => val === 'Yes' && !key.startsWith('d'))
      .map(([key]) => key);

    return (
      <div className="animate-in fade-in duration-300">
        {exam.certRequested && !exam.issue_cert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <i className="fa-solid fa-bell text-amber-500"></i>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Patient Requested Dental Report
              </p>
              <p className="text-xs text-amber-700">Requested on {formatDateTime(exam.certRequestedAt)}</p>
            </div>
          </div>
        )}

        {/* Patient Header */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#466460] uppercase tracking-wide">
                {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName || 'Unknown Patient'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {exam.patientId || exam.university_id || exam.universityId || exam.patientId || '—'} •
                {exam.courseYear || exam.program || exam.course || '—'}
              </p>
            </div>
            <StatusBadge status={exam.status} />
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Age</p>
              <p className="font-semibold text-slate-700">{exam.age || exam.dAge || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Sex</p>
              <p className="font-semibold text-slate-700">{exam.sex || exam.dSex || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Exam Date</p>
              <p className="font-semibold text-slate-700">{formatDate(exam.examDate || exam.exam_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Examined By</p>
              <p className="font-semibold text-slate-700">{exam.examinedBy || exam.examined_by || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Upper Teeth</p>
              <p className="font-semibold text-slate-700">{exam.teethUpper || exam.teeth_upper || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Lower Teeth</p>
              <p className="font-semibold text-slate-700">{exam.teethLower || exam.teeth_lower || '—'}</p>
            </div>
          </div>
        </div>

        {/* Intraoral Examination */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
            <i className="fa-solid fa-teeth mr-2"></i>Intraoral Examination
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(intraoral).filter(([k, v]) => v && k !== 'tmjExam').map(([key, val]) => (
              <div key={key} className="text-xs">
                <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                <span className="font-medium text-slate-700">{String(val)}</span>
              </div>
            ))}
            {intraoral.tmjExam && (
              <div className="text-xs">
                <span className="text-slate-400">TMJ Exam: </span>
                <span className="font-medium text-slate-700">Yes</span>
              </div>
            )}
          </div>
        </div>

        {/* Tooth Chart */}
        {toothData && Object.keys(toothData).length > 0 && (
          <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
              <i className="fa-solid fa-teeth-open mr-2"></i>Tooth Conditions Chart
            </h4>

            {/* Summary counts - convert full names to abbreviations for counting */}
            <div className="flex gap-4 mb-4 text-xs">
              {(() => {
                const conditions = { caries: 0, filled: 0, extracted: 0, missing: 0, improved: 0 };
                Object.values(toothData).forEach(d => {
                  const condAbbr = getConditionAbbrFromFull(d.condition);
                  if (condAbbr && conditions.hasOwnProperty(condAbbr)) {
                    conditions[condAbbr]++;
                  }
                });
                return (
                  <>
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">Caries: {conditions.caries}</span>
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">Filled: {conditions.filled}</span>
                    <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-200">Extracted: {conditions.extracted}</span>
                  </>
                );
              })()}
            </div>

            {/* Individual teeth - display full names but use abbreviations for colors */}
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(toothData).map(([tooth, data]) => {
                const condAbbr = getConditionAbbrFromFull(data.condition);
                const conditionColors = {
                  'caries': 'bg-red-100 text-red-700 border-red-300',
                  'filled': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                  'extracted': 'bg-pink-100 text-pink-700 border-pink-300',
                  'missing': 'bg-slate-100 text-slate-600 border-slate-300',
                  'improved': 'bg-blue-100 text-blue-700 border-blue-300',
                  'root-fragment': 'bg-amber-100 text-amber-700 border-amber-300',
                };
                return (
                  <div key={tooth} className={`text-xs px-2 py-2 rounded border ${conditionColors[condAbbr] || 'bg-slate-50 text-slate-600'}`}>
                    <span className="font-bold">#{tooth}</span>
                    <span className="block">{data.condition || '—'}</span>
                    {data.operation && <span className="text-[10px] opacity-75">{data.operation}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No tooth data */}
        {(!toothData || Object.keys(toothData).length === 0) && (
          <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide border-b border-slate-200 pb-2">
              <i className="fa-solid fa-teeth-open mr-2"></i>Tooth Conditions
            </h4>
            <p className="text-xs text-slate-400 italic">No tooth conditions recorded</p>
          </div>
        )}

        {/* --- Past Records History Section (Dental) --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#466460]/5 to-transparent">
            <h4 className="text-sm font-bold text-[#466460] uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left"></i>Past Dental Records
            </h4>
            {!loadingHistory && consultationHistory.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {consultationHistory.length} record{consultationHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="p-5">
            {loadingHistory ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading history...
              </div>
            ) : consultationHistory.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <i className="fa-regular fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                <p className="text-sm text-slate-400">No previous dental records found for this patient.</p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
                <div className="space-y-4">
                  {consultationHistory.map((consult, idx) => {
                    const parseJson = (str, fallback = {}) => {
                      if (!str) return fallback;
                      if (typeof str === 'object') return str;
                      try { return JSON.parse(str); } catch { return fallback; }
                    };
                    const formatFullDate = (dateStr) => {
                      if (!dateStr) return '—';
                      const d = new Date(dateStr);
                      if (isNaN(d.getTime())) return dateStr;
                      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
                        ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    };
                    const dateTime = formatFullDate(consult.exam_date || consult.created_at);
                    const cIntraoral = parseJson(consult.intraoral, {});
                    const cToothData = parseJson(consult.tooth_data, {});
                    const cDentalHistory = parseJson(consult.dental_history, {});

                    return (
                      <div key={consult.id || idx} className="relative">
                        <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-[#466460] ring-4 ring-white"></div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                          <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{dateTime}</p>
                                <p className="text-xs text-slate-500">
                                  Examined by: <span className="font-medium text-slate-600">{consult.examined_by || '—'}</span>
                                </p>
                              </div>
                            </div>
                            <StatusBadge status={consult.status} />
                          </div>

                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Upper Teeth</p>
                                <p className="text-sm font-mono text-slate-700">{consult.teeth_upper || '—'}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Lower Teeth</p>
                                <p className="text-sm font-mono text-slate-700">{consult.teeth_lower || '—'}</p>
                              </div>
                            </div>

                            {cIntraoral && Object.keys(cIntraoral).some(k => cIntraoral[k]) && (
                              <div>
                                <SectionLabel icon="fa-teeth" color="text-[#466460]">Intraoral Examination</SectionLabel>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                  {Object.entries(cIntraoral).filter(([k, v]) => v && k !== 'tmjExam').map(([key, val]) => (
                                    <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
                                      <p className="text-[10px] text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                      <p className="text-xs font-semibold text-slate-700">{String(val)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {cToothData && Object.keys(cToothData).length > 0 && (
                              <div>
                                <SectionLabel icon="fa-teeth-open" color="text-[#466460]">Tooth Conditions Chart</SectionLabel>
                                <div className="flex gap-2 my-2 text-xs">
                                  {(() => {
                                    // FIX: was comparing conditions.hasOwnProperty(d.condition) directly
                                    // against the raw stored condition string (e.g. "Filled (●)"),
                                    // which never matched any of the lowercase keys below and so
                                    // "Filled" never got counted here either. Route through
                                    // getConditionAbbrFromFull for consistency with the main chart above.
                                    const conditions = { caries: 0, filled: 0, extracted: 0 };
                                    Object.values(cToothData).forEach(d => {
                                      const condAbbr = getConditionAbbrFromFull(d.condition);
                                      if (condAbbr && conditions.hasOwnProperty(condAbbr)) conditions[condAbbr]++;
                                    });
                                    return (
                                      <>
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">Caries: {conditions.caries}</span>
                                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">Filled: {conditions.filled}</span>
                                        <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-200">Extracted: {conditions.extracted}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {Object.entries(cToothData).map(([tooth, data]) => {
                                    const condAbbr = getConditionAbbrFromFull(data.condition);
                                    const conditionColors = {
                                      'caries': 'bg-red-100 text-red-700 border-red-300',
                                      'filled': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                      'extracted': 'bg-pink-100 text-pink-700 border-pink-300',
                                      'missing': 'bg-slate-100 text-slate-600 border-slate-300',
                                      'improved': 'bg-blue-100 text-blue-700 border-blue-300',
                                    };
                                    return (
                                      <div key={tooth} className={`p-2 rounded border text-center ${conditionColors[condAbbr] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                                        <span className="block font-bold text-xs">#{tooth}</span>
                                        <span className="block text-[10px] capitalize">{data.condition || '—'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {cDentalHistory && Object.keys(cDentalHistory).some(k => cDentalHistory[k] === 'Yes') && (
                              <div>
                                <SectionLabel icon="fa-clipboard-list" color="text-[#466460]">Procedures Done</SectionLabel>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {Object.entries(cDentalHistory).filter(([key, val]) => val === 'Yes' && !key.startsWith('d')).map(([key]) => (
                                    <span key={key} className="text-[10px] px-2 py-1 bg-emerald-100 text-[#466460] rounded-full font-semibold">{key}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExamDetail = (exam) => {
    if (!exam) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <i className="fa-regular fa-clipboard text-slate-200 text-5xl mb-3"></i>
          <p className="text-slate-400 text-sm">Select an examination from the list</p>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in duration-300">
        {exam.certRequested && !exam.issue_cert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <i className="fa-solid fa-bell text-amber-500"></i>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Patient Requested Medical Certificate
              </p>
              <p className="text-xs text-amber-700">Requested on {formatDateTime(exam.certRequestedAt)}</p>
            </div>
          </div>
        )}

        {/* Patient Header */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#466460]"></div>
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-lg font-bold text-[#466460] uppercase tracking-wide">
                {exam.firstName || exam.lastName ? `${exam.firstName || ''} ${exam.middleName || ''} ${exam.lastName || ''}`.replace(/\s+/g, ' ').trim() : exam.patientName}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {exam.patientId} • {exam.type === 'student' ? 'Student' : exam.type === 'instructor' ? 'Faculty' : 'Staff'}
              </p>
            </div>
            <StatusBadge status={exam.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Program/Department</p>
              {exam.program !== 'N/A' ? (
                <>
                  <p className="text-base font-semibold text-slate-800 leading-tight">{exam.program}</p>
                  {exam.year && <p className="text-base font-semibold text-slate-800 leading-tight">({exam.year})</p>}
                  <p className="text-xs text-slate-500 mt-1">{exam.department}</p>
                </>
              ) : (
                <p className="text-base font-semibold text-slate-800 leading-tight">N/A<br/><span className="text-xs text-slate-500 font-normal">N/A</span></p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Examination Date</p>
              <p className="text-base font-semibold text-slate-800">{exam.examDate}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">School Year</p>
              <p className="text-base font-semibold text-slate-800">{exam.schoolYear || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-base font-semibold text-slate-800">{exam.reason}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nurse on Duty</p>
              <p className="text-base font-semibold text-slate-800">{exam.nurseName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Examining Physician</p>
              <p className="text-base font-semibold text-slate-800">{exam.physician || '—'}</p>
            </div>
          </div>
        </div>

        {/* Certificate Display (If Issued) */}
        {exam.certificateIssued && (
          <div className="bg-gradient-to-r from-[#f0f7f6] to-white border border-[#c8ddd8] rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#466460]"></div>
            <h4 className="text-sm font-bold text-[#466460] mb-3 uppercase tracking-wide flex items-center gap-2 border-b border-[#c8ddd8] pb-2">
              <i className="fa-solid fa-file-medical"></i> Forwarded Medical Certificate
            </h4>

            <div className="flex flex-wrap gap-2 mb-4">
              {exam.isNormalFindings !== undefined && exam.isNormalFindings !== null && (
                <span className={`text-sm px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 ${exam.isNormalFindings ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  <i className={`fa-solid ${exam.isNormalFindings ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                  {exam.isNormalFindings ? 'Normal Findings' : 'Abnormal Findings'}
                </span>
              )}
              {exam.isFit !== undefined && exam.isFit !== null && (
                <span className={`text-sm px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 ${exam.isFit ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                  <i className={`fa-solid ${exam.isFit ? 'fa-person-walking' : 'fa-bed'}`}></i>
                  {exam.isFit ? 'Physically Fit' : 'Not Fit'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exam.finding1 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnosis / Findings</p>
                  <div className="text-sm text-slate-700 bg-white rounded-lg p-3 leading-relaxed border border-slate-200 shadow-sm min-h-[60px]">
                    {exam.finding1}
                  </div>
                </div>
              )}
              {exam.remarks && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Remarks / Recommendation</p>
                  <div className="text-sm text-slate-700 bg-white rounded-lg p-3 leading-relaxed border border-slate-200 shadow-sm min-h-[60px]">
                    {exam.remarks}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Grid for Medical Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">

          {/* LEFT COLUMN: Physical Exam & Social */}
          <div className="space-y-4">

            {/* Vital Signs Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-rose-400"></div>
              <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-heart-pulse text-rose-500"></i> Vital Signs
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Blood Pressure', value: exam.vitals?.bp || '—', unit: 'mmHg', icon: 'fa-droplet', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { label: 'Heart Rate', value: exam.vitals?.pr || '—', unit: 'bpm', icon: 'fa-wave-square', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                  { label: 'Respiratory Rate', value: exam.vitals?.rr || '—', unit: 'cpm', icon: 'fa-lungs', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
                  { label: 'Temperature', value: exam.vitals?.temp || '—', unit: '°C', icon: 'fa-temperature-half', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                ].map((item, idx) => (
                  <div key={idx} className={`${item.bg} ${item.border} border rounded-lg p-3 flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <i className={`fa-solid ${item.icon} ${item.color} text-[10px]`}></i>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${item.color}`}>{item.label}</p>
                    </div>
                    <div className="flex items-baseline gap-1 mt-auto">
                      <p className="text-2xl font-black text-slate-800 leading-none">{item.value}</p>
                      <p className="text-xs font-medium text-slate-500">{item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
              {exam.vitals?.remarks && (
                <p className="text-xs text-slate-500 mt-3 italic bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <span className="font-bold not-italic text-slate-600">Remarks: </span>{exam.vitals.remarks}
                </p>
              )}
            </div>

            {/* Anthropometrics Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-blue-400"></div>
              <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-weight-scale text-blue-500"></i> Anthropometrics
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Height', value: exam.anthropometrics?.height || '—', unit: 'cm' },
                  { label: 'Weight', value: exam.anthropometrics?.weight || '—', unit: 'kg' },
                  { label: 'BMI', value: exam.anthropometrics?.bmi || '—', unit: '' },
                  { label: 'Waist', value: exam.anthropometrics?.waist || '—', unit: 'cm' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-xl font-black text-slate-700">
                      {item.value} {item.unit && <span className="text-xs font-medium text-slate-500">{item.unit}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lifestyle & Social History Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400"></div>
              <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-martini-glass text-emerald-500"></i> Lifestyle & Social History
              </h5>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Smoking', value: exam.social?.smoking || 'No', details: exam.social?.smokingDetails, icon: 'fa-smoking' },
                  { label: 'Alcohol', value: exam.social?.alcohol || 'No', details: exam.social?.alcoholDetails, icon: 'fa-wine-bottle' },
                  { label: 'Illicit Drugs', value: exam.social?.drugs || 'No', details: exam.social?.drugsDetails, icon: 'fa-capsules' },
                ].map((item, idx) => {
                  const isPositive = item.value.toLowerCase().includes('yes');
                  return (
                    <div key={idx} className={`p-2.5 rounded-lg border flex flex-col items-center justify-center text-center ${isPositive ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <i className={`fa-solid ${item.icon} mb-1.5 ${isPositive ? 'text-red-500' : 'text-emerald-500'}`}></i>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className={`text-sm font-black ${isPositive ? 'text-red-700' : 'text-emerald-700'}`}>{item.value}</p>
                      {item.details && (
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.details}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Clinical History & Labs */}
          <div className="space-y-4">

            {/* Clinical History Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-purple-400"></div>
              <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-notes-medical text-purple-500"></i> Clinical History
              </h5>

              <div className="space-y-4">
                {/* 1. Past Medical History */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-file-waveform"></i> Past Medical History
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(exam.medicalHistory.length > 0 ? exam.medicalHistory : ['None recorded']).map((h, idx) => (
                      <span key={idx} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-bold border border-purple-100">{h}</span>
                    ))}
                  </div>
                  {exam.otherMedicalHistory && (
                    <p className="text-xs text-slate-600 mt-2 italic">Other: {exam.otherMedicalHistory}</p>
                  )}
                </div>

                {/* 2. Family History */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-people-roof"></i> Family History
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(exam.familyHistory.length > 0 ? exam.familyHistory : ['None recorded']).map((h, idx) => (
                      <span key={idx} className="bg-fuchsia-50 text-fuchsia-700 px-2.5 py-1 rounded-md text-xs font-bold border border-fuchsia-100">{h}</span>
                    ))}
                  </div>
                  {exam.otherFamilyHistory && (
                    <p className="text-xs text-slate-600 mt-2 italic">Other: {exam.otherFamilyHistory}</p>
                  )}
                </div>

                {/* 3. Surgical History */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-scalpel"></i> Surgical History
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(exam.surgicalHistory.length > 0 ? exam.surgicalHistory : ['None recorded']).map((h, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-100">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Laboratory Results Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-teal-400"></div>
              <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-microscope text-teal-500"></i> Laboratory Results
              </h5>

              <div className="space-y-2">
                {[
                  { label: 'Complete Blood Count', short: 'CBC', result: exam.labResults?.cbc, facility: exam.labResults?.cbcFacility },
                  { label: 'Urinalysis', short: 'UA', result: exam.labResults?.ua, facility: exam.labResults?.uaFacility },
                  { label: 'Chest X-Ray', short: 'CXR', result: exam.labResults?.xray, facility: exam.labResults?.xrayFacility },
                ].map((test, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs">
                        {test.short}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{test.label}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <i className="fa-solid fa-hospital text-slate-400"></i> {test.facility || 'No facility recorded'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${test.result && test.result.toLowerCase() !== 'pending' && test.result !== '—' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>
                        {test.result || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Health History Questionnaire */}
        {exam.questionnaire && Object.keys(exam.questionnaire).length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden mb-4">
            <div className="absolute left-0 top-0 w-1 h-full bg-cyan-400"></div>
            <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fa-solid fa-circle-question text-cyan-500"></i> Health History Questionnaire
            </h5>
            <div className="space-y-2">
              {HEALTH_HISTORY_QUESTIONS.map(({ q, name, detail }) => {
                const answer = exam.questionnaire?.[name];
                if (answer === undefined) return null;
                const isYes = answer?.toLowerCase() === 'yes';
                return (
                  <div key={name} className="flex items-start justify-between gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <p className="text-sm text-slate-700 flex-1">{q}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isYes ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {answer || '—'}
                      </span>
                      {detail && exam.questionnaire?.[detail] && (
                        <span className="text-xs text-slate-500 italic max-w-[220px] text-right">{exam.questionnaire[detail]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COVID-19 Vaccination History */}
        {exam.vaccine && (exam.vaccine.dose1 || exam.vaccine.dose2 || exam.vaccine.booster || exam.vaccine.booster2 || exam.vaccine.history) && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden mb-4">
            <div className="absolute left-0 top-0 w-1 h-full bg-lime-400"></div>
            <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fa-solid fa-syringe text-lime-500"></i> COVID-19 Vaccination History
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Dose', 'Vaccine', 'Date'].map(h => (
                      <th key={h} className="border border-slate-100 p-2 text-left font-bold text-slate-400 uppercase tracking-wider text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '1st Dose', name: exam.vaccine.dose1, date: exam.vaccine.dose1Date },
                    { label: '2nd Dose', name: exam.vaccine.dose2, date: exam.vaccine.dose2Date },
                    { label: 'Booster (1)', name: exam.vaccine.booster, date: exam.vaccine.boosterDate },
                    { label: 'Booster (2)', name: exam.vaccine.booster2, date: exam.vaccine.booster2Date },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="border border-slate-100 p-2 font-semibold text-slate-700">{row.label}</td>
                      <td className="border border-slate-100 p-2 text-slate-600">{row.name || '—'}</td>
                      <td className="border border-slate-100 p-2 text-slate-600">{row.date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {exam.vaccine.history && (
              <p className="text-xs text-slate-500 mt-2 italic">COVID-19 History: {exam.vaccine.history}</p>
            )}
          </div>
        )}

        {/* --- Past Records History Section (Medical - redesigned timeline) --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#466460]/5 to-transparent">
            <h4 className="text-sm font-bold text-[#466460] uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left"></i>
              {(selectedExam?.dentalHistory || selectedExam?.toothData || selectedExam?.dental_history || selectedExam?.tooth_data) ? 'Past Dental Records' : 'Past Medical Records'}
            </h4>
            {!loadingHistory && consultationHistory.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {consultationHistory.length} record{consultationHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="p-5">
            {loadingHistory ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading history...
              </div>
            ) : consultationHistory.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <i className="fa-regular fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                <p className="text-sm text-slate-400">
                  {(selectedExam?.dentalHistory || selectedExam?.toothData || selectedExam?.dental_history || selectedExam?.tooth_data)
                    ? 'No previous dental records found for this patient.'
                    : 'No previous medical records found for this patient.'}
                </p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
                <div className="space-y-4">
                  {consultationHistory.map((consult, idx) => (
                    <PastMedicalRecord key={consult.id || idx} consult={consult} defaultOpen={idx === 0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] bg-[#f8fafc]">
      {/* Left Column - Examination List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white shadow-sm z-10">

        {/* TABS HEADER */}
        <div className="p-4 border-b border-slate-200">
          {/* Exam Type Tabs - Medical/Dental - Show based on role */}
          {/* Dentists see only Dental, Doctors/Nurses see only Medical, Admins see both */}
          <div className="flex mb-4 border-b border-slate-100">
            {/* Medical Tab - shown for Doctors/Nurses or Admins */}
            {(isDoctor || isAdmin) && (
              <button
                onClick={() => { setExamType('medical'); setSelectedExam(null); }}
                className={`mr-4 pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  examType === 'medical' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className="fa-solid fa-stethoscope mr-1"></i>Medical
                {examType === 'medical' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
              </button>
            )}
            {/* Dental Tab - shown for Dentists or Admins */}
            {(isDentist || isAdmin) && (
              <button
                onClick={() => { setExamType('dental'); setSelectedExam(null); }}
                className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  examType === 'dental' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className="fa-solid fa-tooth mr-1"></i>Dental
                {examType === 'dental' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
              </button>
            )}
          </div>

          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'pending' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-clock"></i>
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span
                    title={`${pendingCount} examination${pendingCount === 1 ? '' : 's'} waiting for approval`}
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold leading-none shadow-sm"
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </div>
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative
                ${activeTab === 'approved' ? 'text-[#466460]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-circle-check"></i>
                <span>Approved</span>
                {requestedCount > 0 && (
                  <span
                    title={`${requestedCount} patient certificate/report request${requestedCount === 1 ? '' : 's'} waiting to be sent`}
                    className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full bg-amber-500 text-white text-[9px] font-extrabold leading-none shadow-sm"
                  >
                    <i className="fa-solid fa-bell text-[8px]"></i>
                    {requestedCount > 99 ? '99+' : requestedCount}
                  </span>
                )}
              </div>
              {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#466460] rounded-t-full"></div>}
            </button>
          </div>

          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">
              {activeTab === 'pending' ? 'Pending Approvals' : 'Approved Records'}
              {examType === 'dental' && ' - Dental'}
            </h3>
            <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">
              {examType === 'dental' ? filteredDentalExaminations.length : filteredExaminations.length}
            </span>
          </div>

          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-[#466460] focus:bg-white transition"
            />
          </div>

          {/* DYNAMIC FILTER ROW */}
          <div className="flex flex-col mt-3 border-t border-slate-100 pt-3">
            <div className="flex w-full gap-1.5">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniqueRoles.map(r => (
                  <option key={r} value={r}>{r === 'All' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select
                value={filterDept}
                onChange={e => { setFilterDept(e.target.value); setFilterProgram('All'); }}
                className="flex-[1.5] min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniqueDepts.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>
                ))}
              </select>
              <select
                value={filterProgram}
                onChange={e => setFilterProgram(e.target.value)}
                className="flex-[1.5] min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                {uniquePrograms.map(p => (
                  <option key={p} value={p}>{p === 'All' ? 'All Programs' : p}</option>
                ))}
              </select>
            </div>
            <div className="flex w-full gap-1.5 mt-1.5">
              <select
                value={filterIssueCert}
                onChange={e => setFilterIssueCert(e.target.value)}
                className="w-full min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate"
              >
                <option value="All">{examType === 'dental' ? 'All Reports' : 'All Certificates'}</option>
                <option value="Issued">{examType === 'dental' ? 'Report Sent' : 'Cert Issued'}</option>
                <option value="Not Issued">{examType === 'dental' ? 'Report Not Sent' : 'Cert Not Issued'}</option>
              </select>
              <select
                value={filterRequested}
                onChange={e => setFilterRequested(e.target.value)}
                className="w-full min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:border-[#466460] text-slate-600 cursor-pointer truncate mt-1.5"
              >
                <option value="All">All Requests</option>
                <option value="Requested">Patient Requested</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {loading ? (
            <div className="text-center text-slate-400 text-sm py-12 flex flex-col items-center">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#466460] mb-3"></i>
              Loading records...
            </div>
          ) : examType === 'dental' ? (
            filteredDentalExaminations.length > 0 ? (
              filteredDentalExaminations.map(renderDentalExamItem)
            ) : (
              <div className="text-center text-slate-400 text-sm py-12">
                <i className="fa-solid fa-tooth text-3xl mb-2 opacity-50 block"></i>
                No {activeTab} dental examinations
              </div>
            )
          ) : filteredExaminations.length > 0 ? (
            filteredExaminations.map(renderExamItem)
          ) : (
            <div className="text-center text-slate-400 text-sm py-12">
              <i className="fa-regular fa-folder-open text-3xl mb-2 opacity-50 block"></i>
              No {activeTab} examinations
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Examination Detail */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[11px] uppercase text-[#466460]">
              {examType === 'dental' ? 'Dental Examination Details' : 'Examination Details'}
            </h3>
            {selectedExam && (
              <div className="flex gap-2">


                {/* Dental Actions */}
                {examType === 'dental' ? (
                  <>
                    <button
                      onClick={handleEdit}
                      className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-eye"></i> View
                    </button>

                    {/* Pending Tab: Approve Record (modal decides approve-only vs. send report) */}
                    {activeTab === 'pending' && selectedExam.status !== 'approved' && (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        disabled={loading}
                        className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                        Approve Record
                      </button>
                    )}

                    {/* Approved Tab: Generate Report OR View Report Forwarded status */}
                    {/* FIX: gated strictly on selectedExam.issue_cert (boolean) so this
                        button and the "Report Forwarded" pill below are always mutually
                        exclusive and reflect the same field the list badge now uses. */}
                    {activeTab === 'approved' && !selectedExam.issue_cert && (
                      <button
                        onClick={() => setShowReportForm(true)}
                        className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-file-pdf"></i> Generate Report
                      </button>
                    )}

                    {activeTab === 'approved' && selectedExam.issue_cert && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                        <span className="text-[10px] text-[#466460] bg-emerald-100 border border-[#466460]/30 px-2 py-1.5 rounded-md font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-paper-plane"></i> Report Forwarded
                        </span>
                        <button
                          onClick={() => setShowReportForm(true)}
                          className="bg-white border border-[#466460] text-[#466460] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e0eceb] transition flex items-center gap-1.5 shadow-sm"
                        >
                          <i className="fa-solid fa-eye"></i> View/Edit Report
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                /* Medical Actions */
                <>
                  <button
                    onClick={handleEdit}
                    className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-eye"></i> View
                  </button>

                  {/* Pending Tab: Approve Record */}
                  {activeTab === 'pending' && selectedExam.status !== 'approved' && (
                    <button
                      onClick={() => setShowApproveModal(true)}
                      disabled={loading}
                      className="bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white border-none px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                      Approve Record
                    </button>
                  )}

                  {/* Approved Tab: Issue Certificate OR View Certificate */}
                  {/* FIX: gated strictly on selectedExam.issue_cert (boolean) so this
                      button and the "Cert Forwarded" pill below are always mutually
                      exclusive and reflect the same field the list badge now uses. */}
                  {activeTab === 'approved' && !selectedExam.issue_cert && (
                    <button
                      onClick={() => setShowCertForm(true)}
                      className="bg-gradient-to-r from-[#e07a5f] to-[#c96a4f] text-white border-none px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-file-medical"></i> Issue Certificate
                    </button>
                  )}

                  {activeTab === 'approved' && selectedExam.issue_cert && (
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                      <span className="text-[10px] text-[#466460] bg-emerald-100 border border-[#466460]/30 px-2 py-1.5 rounded-md font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-paper-plane"></i> Cert Forwarded
                      </span>
                      <button
                        onClick={() => setShowCertForm(true)}
                        className="bg-white border border-[#466460] text-[#466460] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e0eceb] transition flex items-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-eye"></i> View/Edit Cert
                      </button>
                    </div>
                  )}
                </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {examType === 'dental' ? renderDentalExamDetail(selectedExam) : renderExamDetail(selectedExam)}
        </div>
      </div>

      {/* --- APPROVAL OPTIONS MODAL --- */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check"></i> Approve Examination
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 fill-current">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              {examType === 'dental' ? (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    You are about to approve the dental examination for <span className="font-bold text-slate-800">{selectedExam?.patientName}</span>.
                  </p>
                  <div className="bg-[#466460]/10 border border-[#466460]/30 rounded-lg p-3.5 flex gap-3 items-start">
                    <i className="fa-solid fa-circle-question text-[#466460] mt-0.5"></i>
                    <p className="text-[13px] text-[#466460] font-medium leading-relaxed">
                      Would you like to send the Dental Report to the patient before finalizing the approval?
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    You are about to approve the medical examination for <span className="font-bold text-slate-800">{selectedExam?.patientName}</span>.
                  </p>
                  <div className="bg-[#466460]/10 border border-[#466460]/30 rounded-lg p-3.5 flex gap-3 items-start">
                    <i className="fa-solid fa-circle-question text-[#466460] mt-0.5"></i>
                    <p className="text-[13px] text-[#466460] font-medium leading-relaxed">
                      Would you like to issue a Medical Certificate for this patient before finalizing the approval?
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  if (examType === 'dental') {
                    handleDentalApprove(selectedExam);
                  } else {
                    handleApprove(selectedExam);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#466460] rounded-lg transition shadow-sm"
              >
                No, Approve Only
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  if (examType === 'dental') {
                    setShowReportForm(true);
                  } else {
                    setShowCertForm(true);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white hover:opacity-90 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                {examType === 'dental' ? (
                  <>
                    <i className="fa-solid fa-file-pdf"></i> Yes, Send Report
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-file-medical"></i> Yes, Issue Certificate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT RECORD MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square"></i> Edit Record
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 fill-current">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditData({ ...editData, status: 'pending' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      editData.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-clock mr-1"></i> Pending
                  </button>
                  <button
                    onClick={() => setEditData({ ...editData, status: 'approved' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      editData.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-check-circle mr-1"></i> Approved
                  </button>
                </div>
              </div>

              {/* Issue Cert Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                  {examType === 'dental' ? 'Dental Report Sent' : 'Certificate Issued'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditData({ ...editData, issue_cert: false })}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      !editData.issue_cert
                        ? 'bg-red-100 text-red-700 border-2 border-red-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> No
                  </button>
                  <button
                    onClick={() => setEditData({ ...editData, issue_cert: true })}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      editData.issue_cert
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-check mr-1"></i> Yes
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const table = examType === 'dental' ? 'dental_records' : 'medical_records';
                    const { error } = await supabase
                      .from(table)
                      .update({
                        status: editData.status,
                        is_approved: editData.status === 'approved',
                        approved_at: editData.status === 'approved' ? new Date().toISOString() : null,
                        issue_cert: editData.issue_cert,
                      })
                      .eq('id', selectedExam.recordId || selectedExam.id);

                    if (error) throw error;

                    // Update local state
                    const updatedExam = {
                      ...selectedExam,
                      status: editData.status,
                      is_approved: editData.status === 'approved',
                      issue_cert: editData.issue_cert,
                      certificateIssued: editData.issue_cert,
                      reportForwarded: editData.issue_cert,
                    };

                    if (examType === 'dental') {
                      setDentalExaminations(dentalExaminations.map(e =>
                        e.id === selectedExam.id ? updatedExam : e
                      ));
                    } else {
                      setExaminations(examinations.map(e =>
                        e.id === selectedExam.id ? updatedExam : e
                      ));
                    }
                    setSelectedExam(updatedExam);
                    setShowEditModal(false);
                    showSnackbar('Record updated successfully!', 'success');
                  } catch (err) {
                    console.error('Error updating record:', err);
                    showSnackbar('Failed to update record', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white hover:opacity-90 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DENTAL REPORT MODAL --- */}
      {showReportForm && selectedExam && examType === 'dental' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-[#f0f7f6] to-white">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-tooth"></i> Dental Examination Report
              </h3>
              <button onClick={() => setShowReportForm(false)} className="text-slate-400 hover:text-red-500 transition-colors rounded-full p-1 hover:bg-slate-200" title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#f8fafc] flex-1">
              <DentalExaminationReport
                examination={selectedExam}
                onSubmit={handleSaveDentalReport}
                readOnly={selectedExam.issue_cert}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MEDICAL CERTIFICATE MODAL --- */}
      {showCertForm && selectedExam && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-[#466460] text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-medical"></i> {activeTab === 'approved' && selectedExam.issue_cert ? 'Edit/View Medical Certificate' : 'Issue Medical Certificate'}
              </h3>
              <button onClick={() => setShowCertForm(false)} className="text-slate-400 hover:text-red-500 transition-colors rounded-full p-1 hover:bg-slate-200" title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#f8fafc] flex-1">
              <MedicalCertificate
                examination={selectedExam}
                onSubmit={handleSubmitCertificate}
                onEdit={handleEdit}
                readOnly={selectedExam.issue_cert}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- FULL EXAMINATION MODAL (Unified - like Records.jsx) --- */}
      {showFullExamModal && examRecordData && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowFullExamModal(false); setExamRecordData(null); setNormalizedPatient(null); }}></div>

          {/* Modal Content */}
          <div className="relative w-full h-full max-w-6xl mx-4 my-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeInSlide_0.3s_ease-out_forwards]">
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#466460] flex items-center justify-center">
                  <i className="fa-solid fa-user text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {normalizedPatient?.name || examRecordData.name || 'Patient Examination'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {normalizedPatient?.id || examRecordData.id || examRecordData.university_id || ''} •
                    {normalizedPatient?.department || examRecordData.department || ''}
                    {normalizedPatient?.prog || examRecordData.program ? ` • ${normalizedPatient?.prog || examRecordData.program}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowFullExamModal(false); setExamRecordData(null); setNormalizedPatient(null); }}
                className="w-10 h-10 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
                </svg>
              </button>
            </div>

            {/* Tabs and School Year */}
            <div className="shrink-0 flex gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50 items-center">
              <div className="flex gap-2">
              {examType === 'medical' ? (
                <div className="px-6 py-3 text-base font-semibold rounded-lg bg-[#466460] text-white shadow-md flex items-center gap-2">
                  <i className="fa-solid fa-stethoscope"></i>
                  Medical Examination
                </div>
              ) : (
                <div className="px-6 py-3 text-base font-semibold rounded-lg bg-[#466460] text-white shadow-md flex items-center gap-2">
                  <i className="fa-solid fa-tooth"></i>
                  Dental Examination
                </div>
              )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">School Year:</span>
                <select
                  value={examRecordData.schoolYear || examRecordData.school_year || ''}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
                >
                  <option value="">Select</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const y = new Date().getFullYear() - 5 + i;
                    return <option key={y} value={`${y}-${y + 1}`}>{`${y}-${y + 1}`}</option>;
                  })}
                </select>
                <select
                  value={examRecordData.semester || '1st Semester'}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Mid Year">Mid Year</option>
                </select>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              {modalLoading ? (
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
                      selectedPatient={examRecordData}
                      showMessage={(msg) => showSnackbar(msg, 'success')}
                      defaultSchoolYear={examRecordData.schoolYear || examRecordData.school_year || ''}
                      defaultSemester={examRecordData.semester || '1st Semester'}
                      readOnly={activeTab === 'approved'}
                      onSaved={handleExamSaved}
                    />
                  )}
                  {examType === 'dental' && (
                    <Dental
                      key={`dental-${resetKey}`}
                      selectedPatient={examRecordData}
                      showMessage={(msg) => showSnackbar(msg, 'success')}
                      defaultSchoolYear={examRecordData.schoolYear || examRecordData.school_year || ''}
                      defaultSemester={examRecordData.semester || '1st Semester'}
                      readOnly={activeTab === 'approved'}
                      onSaved={handleExamSaved}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Snackbar */}
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Approvals;