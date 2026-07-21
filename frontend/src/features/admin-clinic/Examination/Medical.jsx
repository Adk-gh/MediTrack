// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examination\Medical.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import DatePicker from '../../../components/Datepicker';
import TimePicker from '../../../components/TimePicker';

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
const inputClass   = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
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
// Postgres `uid` / `user_id` columns are real uuid columns. Various parts of
// the app pass around "id-shaped" values that are NOT uuids (e.g. university
// student numbers like "23-10029"). Never trust an `.id` field as the DB
// primary key unless it actually matches the uuid shape — otherwise a stray
// student number ends up being inserted straight into a uuid column and
// Postgres throws 22P02 ("invalid input syntax for type uuid").
const isUUID = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ── Helper: normalize selectedPatient into the flat "users" row shape ───────
// selectedPatient can arrive either as the raw users row, or as a joined
// record with the users row nested under `.users` (array or object).
// This mirrors the same unwrapping logic used in buildInitialForm so that
// every consumer of selectedPatient agrees on where uid/id actually live.
const normalizePatient = (p) => {
  let u = p || {};
  if (p?.users) u = Array.isArray(p.users) ? (p.users[0] || {}) : p.users;

  const rawId = u.id ?? p?.id ?? null;

  return {
    uid: u.uid || p?.uid || null,
    // FIX: only accept `id` as the internal primary key if it's actually a
    // uuid. Some patient objects surface a non-uuid value (e.g. the
    // university_id / student number) under `.id`, which previously got
    // used directly as user_id and blew up the insert with 22P02.
    id: isUUID(rawId) ? rawId : null,
  };
};

// ── Medical Visit History Component ─────────────────────────────────────────
const MedicalVisitHistory = ({ selectedPatient }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { uid } = normalizePatient(selectedPatient);
    if (!uid) return;

    const fetchRecords = async () => {
      try {
        // Fetch ONLY medical records
        const { data: medData, error: medError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (medError) console.error('Error fetching medical records:', medError);

        const medRecords = (medData || []).map(r => ({
          ...r,
          kind: 'medical',
          _date: r.exam_date || r.created_at?.split('T')[0] || '',
          _datetime: r.created_at ? new Date(r.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          }) : (r.exam_date || ''),
        }));

        setRecords(medRecords);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedPatient?.uid, selectedPatient?.id, selectedPatient?.users]);

  const StatusBadge = ({ status }) => {
    const map = {
      approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {status || 'unknown'}
      </span>
    );
  };

  const getVitalSigns = (record) => {
    const v = record.vital_records;
    const vitals = Array.isArray(v) ? (v[0] || {}) : (v || {});
    return {
      bp: vitals.bp || '-',
      pr: vitals.pr || '-',
      rr: vitals.rr || '-',
      temp: vitals.temp || '-',
      o2sat: vitals.o2sat || vitals.o2Sat || '-',
    };
  };

  const getHistory = (r) => ({
    medical: (Array.isArray(r.checked_medical) ? r.checked_medical : []).map(parseHistoryItemDisplay),
    family: (Array.isArray(r.checked_family) ? r.checked_family : []).map(parseHistoryItemDisplay),
    health: (Array.isArray(r.checked_health) ? r.checked_health : []).map(parseHistoryItemDisplay),
    surgical: r.other_medical_history || '',
  });

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#7c3aed] mb-3 block"></i>
        Loading records…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <i className="fa-solid fa-file-medical text-4xl mb-3 block opacity-30"></i>
        <p>No medical visit history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-stethoscope text-[#e07a5f]"></i>
          <h4 className="text-sm font-bold text-[#466460] uppercase">Medical Records</h4>
          <span className="text-[9px] bg-[#e07a5f]/20 text-[#e07a5f] px-2 py-0.5 rounded-full font-semibold">
            {records.length}
          </span>
        </div>
        <div className="space-y-4">
          {records.map((r) => {
            const vitals = getVitalSigns(r);
            const history = getHistory(r);
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#e07a5f]/10 to-[#c96a4f]/5 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{r._datetime}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><p className="text-[7px] text-slate-400 uppercase">Nurse</p><p className="font-medium">{r.nurse_on_duty || '-'}</p></div>
                    <div><p className="text-[7px] text-slate-400 uppercase">BP</p><p className="font-medium">{vitals.bp}</p></div>
                    <div><p className="text-[7px] text-slate-400 uppercase">PR</p><p className="font-medium">{vitals.pr} bpm</p></div>
                    <div><p className="text-[7px] text-slate-400 uppercase">Temp</p><p className="font-medium">{vitals.temp}°C</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {history.medical.map((item, i) => (
                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{item}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {history.family.map((item, i) => (
                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{item}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {history.health.map((item, i) => (
                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">{item}</span>
                    ))}
                  </div>
                  {(r.finding1 || r.remarks) && (
                    <div className="bg-slate-50 rounded-lg p-2 text-xs">
                      <p className="text-[7px] text-slate-400 uppercase mb-1">Doctor's Remarks</p>
                      <p className="text-slate-700">{r.finding1 || ''}{r.remarks ? ` - ${r.remarks}` : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Helper: build initial formData from selectedPatient ───────────────────────
const buildInitialForm = (p, existingRecord = null, defaultSchoolYear = '', defaultSemester = '') => {
  let u = p || {};
  if (p?.users) u = Array.isArray(p.users) ? (p.users || {}) : p.users;

  const patientInfo = existingRecord?.patient_info || {};
  const labResults = existingRecord?.laboratory_results || {};

  // Safely grab existing vitals whether saved as array or object previously
  const rawVitals = existingRecord?.vital_records;
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

  const covidSource = (existingRecord && existingRecord.covid_history && Object.keys(existingRecord.covid_history).length > 0)
    ? existingRecord.covid_history
    : userVax;

  return {
    lastName:      u.last_name || u.lastName || '',
    firstName:     u.first_name || u.firstName || '',
    middleName:    u.middle_name || u.middleName || '',
    schoolYear:    existingRecord?.school_year || defaultSchoolYear,
    semester:      existingRecord?.semester || defaultSemester || '1st Semester',
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

    otherMedicalHistory: existingRecord?.other_medical_history || '',
    otherFamilyHistory:  existingRecord?.other_family_history || '',
    smoking: existingRecord?.smoking || 'No',
    smokingDetails: existingRecord?.smoking_details || '',
    alcohol: existingRecord?.alcohol || 'No',
    alcoholDetails: existingRecord?.alcohol_details || '',
    drugs:   existingRecord?.drugs || 'No',
    drugsDetails:   existingRecord?.drugs_details || '',
    studentSignature: existingRecord?.student_signature || '',
    dateSigned: existingRecord?.date_signed || '',
    q1: 'Yes', q2: 'No', q2Details: '',
    q3: 'No',  q3Details: '',
    q4: 'No',  q4Details: '',
    q5: 'No',  q5b: 'No',

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

    physician: existingRecord?.physician || '',
    examDate: existingRecord?.exam_date ? existingRecord.exam_date.split('T')[0] : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10),
    examTime: existingRecord?.exam_date ? existingRecord.exam_date.slice(11, 16) : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(11, 16),
    nurseOnDuty: existingRecord?.nurse_on_duty || '',
  };
};

// Initialized as a flat object, not an array
const createDefaultVital = () => ({ bp: '', pr: '', rr: '', temp: '', nurse: '', remarks: '' });

// ─────────────────────────────────────────────────────────────────────────────
export const Medical = ({ selectedPatient, showMessage, defaultSchoolYear, defaultSemester }) => {
  const [showSummary, setShowSummary]   = useState(false);
  const [activeTab, setActiveTab]       = useState('patientProfile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [surgicalHistory, setSurgicalHistory] = useState([]);

  // FIX: vitalRecords is now a flat object, binding perfectly to the inputs and DB
  const [vitalRecords, setVitalRecords] = useState(createDefaultVital());

  const [checkedMedical, setCheckedMedical] = useState([]);
  const [medicalSpecs, setMedicalSpecs]     = useState({});

  const [checkedFamily,  setCheckedFamily]  = useState([]);
  const [familySpecs, setFamilySpecs]       = useState({});

  const [checkedHealth,  setCheckedHealth]  = useState([]);
  const [healthSpecs, setHealthSpecs]       = useState({});

  const [formData, setFormData] = useState(() => buildInitialForm(selectedPatient, null, defaultSchoolYear, defaultSemester));

  useEffect(() => {
    let isMounted = true;
    const { uid, id } = normalizePatient(selectedPatient);
    const userId = uid || id;

    const fetchFullProfile = async () => {
      setActiveTab('patientProfile');
      setCheckedMedical([]);
      setMedicalSpecs({});
      setCheckedFamily([]);
      setFamilySpecs({});
      setCheckedHealth([]);
      setHealthSpecs({});
      setSurgicalHistory([]);

      // Reset to a clean object
      setVitalRecords(createDefaultVital());

      setFormData(buildInitialForm(selectedPatient, null, defaultSchoolYear, defaultSemester));

      if (userId) {
        const matchCol = uid ? 'uid' : 'id';
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq(matchCol, userId)
          .maybeSingle();

        if (isMounted && data && !error) {
          setFormData(buildInitialForm(data, null, defaultSchoolYear, defaultSemester));
        }
      }
    };

    fetchFullProfile();

    return () => { isMounted = false; };
  }, [selectedPatient?.uid, selectedPatient?.id, selectedPatient?.users]);

  const handleChange = (e) => {
    const { id, value, name } = e.target;
    setFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const handleDateChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const calculateAge = (val) => {
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
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const addSurgical    = () => setSurgicalHistory(p => [...p, { id: Date.now(), operation: '', date: '', notes: '' }]);
  const removeSurgical = (id) => setSurgicalHistory(p => p.filter(i => i.id !== id));
  const updateSurgical = (id, field, value) => setSurgicalHistory(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));

  // FIX: Updates a flat object instead of an array
  const updateVital = (field, value) => {
    setVitalRecords(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenSummary = () => {
    if (!formData.lastName) { alert("Please fill in patient's last name."); return; }
    setShowSummary(true);
  };

  // ── DB Submission Helper: Format checks as clean strings ─────────────────────
  const formatCheckedForDb = (checks, specsMap) => {
    return checks.map(item => {
      const cleanName = item.replace(', specify', '').replace(' (If PTB, category)', '');
      const detail = specsMap[item]?.trim();
      return detail ? `${cleanName}: ${detail}` : cleanName;
    });
  };

// ── Database Submit Handler ──────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    // normalizePatient now guarantees `id` is either null or a real uuid,
    // so patientInternalId can never be a stray university/student number.
    const { uid: patientUid, id: patientInternalId } = normalizePatient(selectedPatient);

    if (!patientUid && !patientInternalId) {
      alert("Error: No patient selected. Cannot save record.");
      return;
    }

    setIsSubmitting(true);

    try {
      // If we already have the internal users.id (e.g. selectedPatient came
      // from a query against `users` directly), skip the extra round trip.
      let userId = patientInternalId || null;

      // patientUid from normalizePatient is actually the internal uuid (doc.id)
      // because normalizeUser in Records.jsx sets uid: doc.id. Since patientUid
      // is already the internal uuid (users.id), we can use it directly.
      if (!userId && patientUid && isUUID(patientUid)) {
        userId = patientUid;
      }

      // Belt-and-braces: never let a non-uuid value reach the uuid column,
      // regardless of where it came from.
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

      const examDateValue = formData.examDate || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const examTimeValue = formData.examTime || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(11, 16);
      const combinedExamDate = `${examDateValue}T${examTimeValue}:00`;

      const supabasePayload = {
        user_id: userId,
        university_id: formData.studentId,
        school_year: formData.schoolYear,
        semester: formData.semester,
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

      const { error } = await supabase.from('medical_records').insert(supabasePayload);
      if (error) throw error;

      setShowSummary(false);
      showMessage('Medical record saved to database successfully!');

    } catch (error) {
      console.error("Error saving medical record: ", error);
      alert("Failed to save the record to the database. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={e => { e.preventDefault(); handleOpenSummary(); }}
        className="overflow-y-auto h-[calc(100vh-320px)] pr-4 pb-12
          [&::-webkit-scrollbar]:w-[5px]
          [&::-webkit-scrollbar-thumb]:bg-gradient-to-b
          [&::-webkit-scrollbar-thumb]:from-[#466460]
          [&::-webkit-scrollbar-thumb]:to-[#8aacaa]
          [&::-webkit-scrollbar-thumb]:rounded-full"
      >

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('patientProfile')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'patientProfile' ? 'bg-[#3b82f6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className="fa-solid fa-user mr-1"></i> Patient Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('examination')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'examination' ? 'bg-[#466460] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className="fa-solid fa-clipboard-list mr-1"></i> Examination
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visitHistory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'visitHistory' ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className="fa-solid fa-clock-rotate-left mr-1"></i> Visit History
          </button>
        </div>

        {activeTab === 'visitHistory' ? (
          <MedicalVisitHistory selectedPatient={selectedPatient} />
        ) : activeTab === 'patientProfile' ? (
        <>
          {/* ════ PATIENT PROFILE TAB ════ */}
          <div className={sectionClass}>Patient Demographics</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className={labelClass}>Last Name / Family Name</label><input type="text" id="lastName" className={inputClass} value={formData.lastName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>First Name</label><input type="text" id="firstName" className={inputClass} value={formData.firstName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="middleName" className={inputClass} value={formData.middleName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Student No.</label><input type="text" id="studentId" className={inputClass} value={formData.studentId} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Course</label><input type="text" id="course" className={inputClass} value={formData.course} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Year / Section</label><input type="text" id="yearSection" className={inputClass} value={formData.yearSection} onChange={handleChange} /></div>
            <div className="col-span-3">
              <label className={labelClass}>Sex</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="sex" value="Male"   checked={formData.sex === 'Male'}   onChange={handleChange} /> Male</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} onChange={handleChange} /> Female</label>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Birthday</label>
              <DatePicker value={formData.birthday} onChange={calculateAge} />
            </div>
            <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="age" className={`${inputClass} bg-slate-50`} value={formData.age} readOnly /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="address" className={inputClass} placeholder="Home Address" value={formData.address} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Contact No.</label><input type="text" id="contactNo" className={inputClass} value={formData.contactNo} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Landline No.</label><input type="text" id="landlineNo" className={inputClass} value={formData.landlineNo} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Religion</label><input type="text" id="religion" className={inputClass} value={formData.religion} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="nationality" className={inputClass} placeholder="Filipino" value={formData.nationality} onChange={handleChange} /></div>
            <div className="col-span-3">
              <label className={labelClass}>Civil Status</label>
              <select id="civilStatus" className={inputClass} value={formData.civilStatus} onChange={handleChange}>
                {['Single','Married','Widowed','Separated'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={sectionClass}>Person to Contact in Case of Emergency</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5"><label className={labelClass}>Name</label><input type="text" id="emergencyName" className={inputClass} placeholder="Full name" value={formData.emergencyName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Relationship</label><input type="text" id="emergencyRelation" className={inputClass} placeholder="e.g. Parent, Spouse" value={formData.emergencyRelation} onChange={handleChange} /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="emergencyAddress" className={inputClass} value={formData.emergencyAddress} onChange={handleChange} /></div>
            <div className="col-span-4"><label className={labelClass}>Contact No./s</label><input type="text" id="emergencyContact" className={inputClass} value={formData.emergencyContact} onChange={handleChange} /></div>
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
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={inputClass} value={formData[id]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      <DatePicker value={formData[`${id}Date`]} onChange={(val) => handleDateChange(`${id}Date`, val)} />
                    </td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Remarks`} className={inputClass} value={formData[`${id}Remarks`]} onChange={handleChange} /></td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-300 p-2 font-semibold whitespace-nowrap">COVID-19 History</td>
                  <td colSpan={3} className="border border-slate-300 p-2">
                    <input type="text" id="covidHistory" className={inputClass} placeholder="Date of infection, severity, treatment, recovery details" value={formData.covidHistory} onChange={handleChange} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>
            <span>Past Surgical History</span>
            <button type="button" onClick={addSurgical} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Operation</button>
          </div>
          {surgicalHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 text-center">No surgical history recorded. Click "Add Operation" to add.</p>
          ) : surgicalHistory.map(s => (
            <div key={s.id} className="grid grid-cols-12 gap-4 mb-3 p-3 bg-slate-50 rounded-lg relative border border-slate-200 items-end">
              <button type="button" onClick={() => removeSurgical(s.id)} className="absolute top-2 right-2 bg-[#e07a5f] text-white px-2 py-1 rounded text-xs">×</button>
              <div className="col-span-6"><label className={labelClass}>Operation Name</label><input type="text" placeholder="Operation/Procedure Name" className={inputClass} value={s.operation} onChange={e => updateSurgical(s.id, 'operation', e.target.value)} /></div>
              <div className="col-span-3">
                <label className={labelClass}>Date</label>
                <DatePicker value={s.date} onChange={(val) => updateSurgical(s.id, 'date', val)} />
              </div>
              <div className="col-span-3"><label className={labelClass}>Notes</label><input type="text" placeholder="Hospital / complications" className={inputClass} value={s.notes} onChange={e => updateSurgical(s.id, 'notes', e.target.value)} /></div>
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
                      onChange={() => toggleCheck(checkedMedical, setCheckedMedical, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && needsSpecify && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white"
                      placeholder="Please specify..."
                      value={medicalSpecs[c] || ''}
                      onChange={(e) => setMedicalSpecs(prev => ({ ...prev, [c]: e.target.value }))}
                      autoFocus
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Additional details for checked conditions (Optional)</label><input type="text" id="otherMedicalHistory" className={inputClass} placeholder="Severity, medications taken, etc." value={formData.otherMedicalHistory} onChange={handleChange} /></div>
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
                      onChange={() => toggleCheck(checkedFamily, setCheckedFamily, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && needsSpecify && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white"
                      placeholder="Specify relation / details..."
                      value={familySpecs[c] || ''}
                      onChange={(e) => setFamilySpecs(prev => ({ ...prev, [c]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Additional details for family history (Optional)</label><input type="text" id="otherFamilyHistory" className={inputClass} placeholder="Specify members affected and other details" value={formData.otherFamilyHistory} onChange={handleChange} /></div>
          </div>

          <div className={sectionClass}>Personal / Social History</div>
          <div className="grid grid-cols-12 gap-4">
            {[
              { label: 'Smoking',       name: 'smoking', detailId: 'smokingDetails', placeholder: 'If yes: Quit? No. of years / days & type'   },
              { label: 'Alcohol',       name: 'alcohol', detailId: 'alcoholDetails', placeholder: 'If yes: Quit? No. of bottles / days & type' },
              { label: 'Illicit Drugs', name: 'drugs',   detailId: 'drugsDetails',   placeholder: 'If yes: Quit? Specify type / frequency'     },
            ].map(({ label, name, detailId, placeholder }) => (
              <div key={name} className="col-span-4">
                <label className={labelClass}>{label}</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} onChange={handleChange} /> Yes</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  onChange={handleChange} /> No</label>
                </div>
                <input type="text" id={detailId} className={inputClass} placeholder={placeholder} value={formData[detailId]} onChange={handleChange} />
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
                  { q: '1. Are you in good health?',                                                               name: 'q1',  detail: null        },
                  { q: '2. Are you under medical treatment now?',                                                  name: 'q2',  detail: 'q2Details' },
                  { q: '3. Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?',  name: 'q3',  detail: 'q3Details' },
                  { q: '4. Are you taking any medication?',                                                        name: 'q4',  detail: 'q4Details' },
                  { q: '5. For women only: Are you pregnant?',                                                     name: 'q5',  detail: null        },
                  { q: 'Are you nursing?',                                                                         name: 'q5b', detail: null        },
                ].map(({ q, name, detail }) => (
                  <tr key={name}>
                    <td className="border border-slate-300 p-2">{q}</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      {detail && <input type="text" id={detail} className={inputClass} placeholder="If yes, specify" value={formData[detail]} onChange={handleChange} />}
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
                      onChange={() => toggleCheck(checkedHealth, setCheckedHealth, c)} />
                    <span className="leading-tight pt-0.5">{c}</span>
                  </label>
                  {isChecked && (
                    <input
                      type="text"
                      className="ml-6 p-1.5 border border-slate-300 rounded text-[11px] outline-none focus:border-[#466460] bg-white"
                      placeholder="Optional details (type, year, etc)..."
                      value={healthSpecs[c] || ''}
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
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={inputClass} value={formData[id]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Facility`} className={inputClass} value={formData[`${id}Facility`]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      <DatePicker value={formData[`${id}Date`]} onChange={(val) => handleDateChange(`${id}Date`, val)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>
            <span>Anthropometric Measurements & Vital Signs</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <div className="grid grid-cols-12 gap-3 items-end">
              {/* FIX: Bind values to the new flat object */}
              <div className="col-span-2 col-start-1"><label className={labelClass}>BP (mmHg)</label><input type="text" className={inputClass} placeholder="120/80" value={vitalRecords.bp} onChange={e => updateVital('bp', filterNumbersAndSlash(e.target.value))} /></div>
              <div className="col-span-2"><label className={labelClass}>PR (bpm)</label><input type="text" className={inputClass} placeholder="72" value={vitalRecords.pr} onChange={e => updateVital('pr', filterNumbersOnly(e.target.value))} /></div>
              <div className="col-span-2"><label className={labelClass}>RR (cpm)</label><input type="text" className={inputClass} placeholder="18" value={vitalRecords.rr} onChange={e => updateVital('rr', filterNumbersOnly(e.target.value))} /></div>
              <div className="col-span-2"><label className={labelClass}>Temp (°C)</label><input type="text" className={inputClass} placeholder="36.5" value={vitalRecords.temp} onChange={e => updateVital('temp', filterNumbersAndDot(e.target.value))} /></div>
              <div className="col-span-4"><label className={labelClass}>Remarks</label><input type="text" className={inputClass} placeholder="Additional notes" value={vitalRecords.remarks} onChange={e => updateVital('remarks', e.target.value)} /></div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-3"><label className={labelClass}>Height (cm)</label><input type="text" id="height" className={inputClass} placeholder="cm" value={formData.height} onChange={e => handleChange({ target: { id: 'height', value: filterNumbersOnly(e.target.value) } })} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>Weight (kg)</label><input type="text" id="weight" className={inputClass} placeholder="kg" value={formData.weight} onChange={e => handleChange({ target: { id: 'weight', value: filterNumbersOnly(e.target.value) } })} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>BMI (auto-calc)</label><input type="text" id="bmi" className={`${inputClass} bg-slate-50`} placeholder="kg/m²" value={formData.bmi} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Waist Circumference (cm)</label><input type="text" id="waist" className={inputClass} placeholder="cm" value={formData.waist} onChange={e => handleChange({ target: { id: 'waist', value: filterNumbersOnly(e.target.value) } })} /></div>
            <div className="col-span-6">
              <label className={labelClass}>Last Menstrual Period (LMP) — Females only</label>
              <DatePicker value={formData.lmp} onChange={(val) => handleDateChange('lmp', val)} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-6">
            <div className="col-span-5"><label className={labelClass}>Examining Physician / LIC. No.</label><input type="text" id="physician" className={inputClass} placeholder="Full name and license number" value={formData.physician} onChange={handleChange} /></div>
            <div className="col-span-2">
              <label className={labelClass}>Exam Date</label>
              <DatePicker value={formData.examDate} onChange={(val) => handleDateChange('examDate', val)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Exam Time</label>
              <TimePicker value={formData.examTime} onChange={(val) => handleDateChange('examTime', val)} />
            </div>
            <div className="col-span-3"><label className={labelClass}>Nurse on Duty</label><input type="text" id="nurseOnDuty" className={inputClass} placeholder="Nurse name" value={formData.nurseOnDuty} onChange={handleChange} /></div>
          </div>

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
        </>
        )}
      </form>

      {/* ═══ SUMMARY MODAL ══════════════════════════════════════════════════ */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-7 py-5 text-white shrink-0">
              <h3 className="text-lg font-extrabold flex items-center gap-3 mb-1">
                <i className="fa-solid fa-clipboard-check"></i> Medical Examination Summary
              </h3>
              <p className="text-[11px] opacity-70">Review all entries carefully before final submission.</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              <SumSection icon="fa-user" title="Patient Demographics">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Last Name"      value={formData.lastName} />
                  <SumItem label="First Name"     value={formData.firstName} />
                  <SumItem label="Middle Name"    value={formData.middleName} />
                  <SumItem label="Student No."    value={formData.studentId} />
                  <SumItem label="Course"         value={formData.course} />
                  <SumItem label="Year / Section" value={formData.yearSection} />
                  <SumItem label="School Year"    value={formData.schoolYear} />
                  <SumItem label="Semester"      value={formData.semester} />
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
                  <SumItem label="LMP (Females)" value={formData.lmp}    />
                </div>
              </SumSection>

              <SumSection icon="fa-user-doctor" title="Examining Physician & Staff">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Physician"        value={formData.physician}    />
                  <SumItem label="Examination Date" value={formData.examDate}     />
                  <SumItem label="Examination Time" value={formData.examTime}     />
                  <SumItem label="Nurse on Duty"    value={formData.nurseOnDuty} />
                </div>
              </SumSection>
            </div>
            <div className="px-7 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Medical;