//C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Records.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { rtdb } from '../../firebase';
import { ref, get, push, set } from 'firebase/database';
// Import your custom BirthdayPicker component
import BirthdayPicker from '../../components/Datepicker';
import recordsService from '../../services/records.service';

// ============================================================
// CONSTANTS FROM PROFILE SETUP
// ============================================================
const departmentsData = [
  {
    abbr: 'CCSE',
    full: 'College of Computing Science and Engineering',
    programs: [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Information System',
      'Bachelor of Science in Computer Engineering',
      'Bachelor of Science in Industrial Engineering',
    ],
  },
  {
    abbr: 'CBAM',
    full: 'College of Business Administration and Management',
    programs: [
      'Bachelor of Science in Entrepreneurship',
      'Bachelor of Science in Public Administration',
      'Bachelor of Science in Office Administration',
      'Bachelor of Science in Business Administration Major in Human Resource Development Management',
      'Bachelor of Science in Business Administration Major in Financial Management',
      'Bachelor of Science in Business Administration Major in Marketing Management',
    ],
  },
  {
    abbr: 'CAS',
    full: 'College of Art and Sciences',
    programs: [
      'Bachelor of Science in Economics',
      'Bachelor of Arts in Communication',
      'Bachelor of Science in Psychology',
      'Bachelor of Arts in Political Science',
    ],
  },
  {
    abbr: 'CTHM',
    full: 'College of Tourism and Hospitality Management',
    programs: [
      'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Hospitality Management',
    ],
  },
  {
    abbr: 'COA',
    full: 'College of Accountancy',
    programs: [
      'Bachelor of Science in Accountancy',
      'Bachelor of Science in Accountancy Information System',
      'Bachelor of Science in Management Accounting',
    ],
  },
  {
    abbr: 'CTE',
    full: 'College of Teacher Education',
    programs: [
      'Bachelor of Secondary Education Major in English',
      'Bachelor of Secondary Education Major in Filipino',
      'Bachelor of Secondary Education Major in Math',
      'Bachelor of Secondary Education Major in Science',
      'Bachelor of Secondary Education Major in Social Studies',
      'Bachelor of Elementary Education',
      'Bachelor of Technical-Vocational Teacher Education',
      'Bachelor of Special Needs Education',
    ],
  },
  {
    abbr: 'CHK',
    full: 'College of Human Kinetics',
    programs: [
      'Bachelor of Science in Physical Education',
      'Bachelor of Science in Sports Science',
    ],
  },
  {
    abbr: 'CNAHS',
    full: 'College of Nursing and Allied Health Sciences',
    programs: [
      'Bachelor of Science in Nursing',
    ],
  },
];

const deptAbbrToFull      = Object.fromEntries(departmentsData.map(d => [d.abbr, d.full]));
const programsByDeptAbbr  = Object.fromEntries(departmentsData.map(d => [d.abbr, d.programs]));

const NON_ACADEMIC_OFFICES = [
  'Accounting Office',
  'University Clinic',
  'Human Resources',
  'Library',
  'Maintenance',
  'Registrar Office',
  'Security Services',
];

const PLSP_OFFICES_FOR_STAFF = [
  ...departmentsData.map(d => ({ label: d.abbr, value: d.full })),
  ...NON_ACADEMIC_OFFICES.map(o => ({ label: o, value: o })),
];

const SUFFIXES            = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
const RELIGIONS           = ['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist', 'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'];
const NATIONALITIES       = ['Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian', 'British', 'Australian', 'Canadian', 'Other'];
const CIVIL_STATUSES      = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const SECTIONS            = ['A', 'B', 'C', 'D', 'E', 'F'];
const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];

function getDefaultClassification(role) {
  const classMap = {
    'administrator': 'Administrator',
    'admin':         'Administrator',
    'nurse':         'Nurse Personnel',
    'doctor':        'Physician / Doctor',
    'staff':         'Non-Teaching Personnel',
    'employee':      'Non-Teaching Personnel',
    'guard':         'Security Personnel',
    'technician':    'Non-Teaching Personnel',
    'librarian':     'Non-Teaching Personnel',
    'lecturer':      'Teaching Personnel',
    'professor':     'Teaching Personnel',
    'instructor':    'Teaching Personnel',
  };
  return classMap[role] || 'Teaching Personnel';
}

function getDefaultJobTitle(role) {
  const titleMap = {
    'nurse':         'Nurse',
    'doctor':        'Physician',
    'admin':         'Administrator',
    'administrator': 'Administrator',
    'lecturer':      'Lecturer',
    'professor':     'Professor',
    'instructor':    'Instructor',
    'librarian':     'Librarian',
    'technician':    'Technician',
    'guard':         'Security Guard',
    'staff':         'Staff',
  };
  return titleMap[role] || '';
}

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
      ${visible
        ? '-translate-x-1/2 translate-y-0 opacity-100'
        : '-translate-x-1/2 translate-y-32 opacity-0 pointer-events-none'
      }
      ${type === 'success'
        ? 'bg-gradient-to-r from-[#166534] to-[#15803d]'
        : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'
      }`}
  >
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// TYPE BADGE COLORS
// ============================================================
const typeBadgeClass = (roleStr) => {
  const t = (roleStr || '').toLowerCase();
  if (t.includes('student')) return 'bg-blue-100 text-blue-600';
  if (['instructor', 'faculty', 'lecturer', 'professor', 'doctor', 'nurse'].some(k => t.includes(k))) {
    return 'bg-purple-100 text-purple-600';
  }
  return 'bg-green-100 text-green-600';
};

// ============================================================
// NORMALIZE — map a Firestore user doc → display shape
// ============================================================
const normalizeUser = (doc) => {
  const d = doc;
  const firstName = d.firstName || '';
  const lastName  = d.lastName  || '';
  const middle    = d.middleInitial ? ` ${d.middleInitial}.` : '';
  const suffix    = d.suffix ? ` ${d.suffix}` : '';

  const name = lastName
    ? `${lastName}, ${firstName}${middle}${suffix}`.trim()
    : `${firstName}${middle}${suffix}`.trim() || '—';

  return {
    uid: doc.uid || doc.id,
    name,
    firstName,
    lastName,
    middleInitial: d.middleInitial || '',
    suffix:        d.suffix        || '',
    id:         d.universityId  || d.studentId || doc.uid,
    role:       d.role || d.type || 'staff',
    prog:       d.program       || d.course    || '',
    year:       d.yearLevel     || '',
    section:    d.section       || '',
    age:        d.age           || '',
    gender:     d.gender        || d.sex       || '',
    birthdate:  d.birthday      || '',
    email:      d.email         || '',
    phoneNumber: d.phoneNumber  || '',
    department: d.department    || '',
    jobTitle:   d.jobTitle      || '',
    classification: d.classification || '',
    emergencyContact: d.emergencyContact || {},
    vaccinations: d.vaccinations || {},
    history:  [],
    diseases: [],
    _raw: d,
  };
};

// ============================================================
// RECORD HISTORY VIEWER
// ============================================================
const RecordHistoryViewer = ({ person }) => {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('medical');
  const [expanded, setExpanded]     = useState(null);

  useEffect(() => {
    if (!person?.uid) return;
    setLoading(true);
    setExpanded(null);

    const fetchRecords = async () => {
      try {
        const medSnap = await getDocs(
          collection(db, 'users', person.uid, 'medical_records')
        );
        const medRecords = medSnap.docs.map(d => ({
          id: d.id,
          kind: 'medical',
          ...d.data(),
          _date: d.data().examDate || d.data().createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
        }));

        const denSnap = await getDocs(
          collection(db, 'users', person.uid, 'dental_records')
        );
        const denRecords = denSnap.docs.map(d => ({
          id: d.id,
          kind: 'dental',
          ...d.data(),
          _date: d.data().examDate || d.data().createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
        }));

        const all = [...medRecords, ...denRecords].sort((a, b) =>
          (b._date || '').localeCompare(a._date || '')
        );
        setRecords(all);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [person?.uid]);

  const filtered = records.filter(r => r.kind === activeTab);

  const StatusPill = ({ status }) => {
    const map = {
      approved: 'bg-emerald-100 text-emerald-700',
      pending:  'bg-amber-100 text-amber-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500'}`}>
        {status || 'unknown'}
      </span>
    );
  };

  const Field = ({ label, value }) =>
    value ? (
      <div>
        <p className="text-[8px] text-slate-400 uppercase">{label}</p>
        <p className="text-xs text-slate-700 font-medium">{value}</p>
      </div>
    ) : null;

  const SectionHeading = ({ icon, label }) => (
    <p className="text-[9px] font-bold text-[#466460] uppercase tracking-wide mb-2 flex items-center gap-1.5">
      <i className={`fa-solid ${icon} text-[#466460]`}></i>
      {label}
    </p>
  );

  const TagList = ({ items, color }) => (
    <div className="flex flex-wrap gap-1">
      {(items?.length > 0 ? items : ['None recorded']).map((h, i) => (
        <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${color}`}>{h}</span>
      ))}
    </div>
  );

  const MedicalDetail = ({ r }) => {
    const vitals = r.vitalRecords?.[0] || {};
    const surgicalHistory = r.surgicalHistory?.map(s =>
      typeof s === 'object' ? `${s.operation || ''}${s.date ? ` (${s.date})` : ''}` : s
    ) || [];

    return (
      <div className="mt-3 pt-4 border-t border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Exam Date',     value: r._date || r.examDate || '—' },
            { label: 'Nurse on Duty', value: r.nurseOnDuty || '—' },
            { label: 'Purpose',       value: r.purpose || r.reason || 'Medical Examination' },
            { label: 'Status',        value: null, custom: (
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                r.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                : r.status === 'pending' ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'}`}>
                {r.status || 'unknown'}
              </span>
            )},
          ].map(({ label, value, custom }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[8px] text-slate-400 uppercase mb-0.5">{label}</p>
              {custom || <p className="text-[11px] font-semibold text-slate-700">{value}</p>}
            </div>
          ))}
        </div>

        <div>
          <SectionHeading icon="fa-heart-pulse" label="Vital Signs" />
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'BP',     value: vitals.bp,               unit: 'mmHg' },
              { label: 'PR',     value: vitals.pr,               unit: 'bpm'  },
              { label: 'RR',     value: vitals.rr,               unit: 'cpm'  },
              { label: 'Temp',   value: vitals.temp,             unit: '°C'   },
              { label: 'O₂ Sat', value: vitals.o2sat || vitals.o2Sat, unit: '%' },
            ].map(v => (
              <div key={v.label} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                <p className="text-[7px] text-slate-400 uppercase">{v.label}</p>
                <p className="text-xs font-bold text-[#466460]">{v.value || '—'}</p>
                <p className="text-[7px] text-slate-400">{v.unit}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading icon="fa-ruler-vertical" label="Anthropometrics" />
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Height', value: r.height, unit: 'cm' },
              { label: 'Weight', value: r.weight, unit: 'kg' },
              { label: 'BMI',    value: r.bmi,    unit: ''   },
              { label: 'Waist',  value: r.waist,  unit: 'cm' },
            ].map(v => (
              <div key={v.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-[7px] text-slate-400 uppercase">{v.label}</p>
                <p className="text-xs font-semibold text-slate-700">{v.value ? `${v.value}${v.unit ? ' ' + v.unit : ''}` : '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <SectionHeading icon="fa-clock-rotate-left" label="Past Medical History" />
            <TagList items={r.checkedMedical} color="bg-amber-50 text-amber-700 border-amber-100" />
          </div>
          <div>
            <SectionHeading icon="fa-scissors" label="Surgical History" />
            <TagList items={surgicalHistory} color="bg-blue-50 text-blue-700 border-blue-100" />
          </div>
          <div>
            <SectionHeading icon="fa-dna" label="Family History" />
            <TagList items={r.checkedFamily} color="bg-purple-50 text-purple-700 border-purple-100" />
          </div>
        </div>

        {(r.labCbc || r.labUa || r.labXray) && (
          <div>
            <SectionHeading icon="fa-flask" label="Laboratory Results" />
            <table className="w-full text-[10px] border border-slate-100 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Test</th>
                  <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Result</th>
                  <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Facility</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { test: 'CBC',         result: r.labCbc,  facility: r.labCbcFacility  },
                  { test: 'Urinalysis',  result: r.labUa,   facility: r.labUaFacility   },
                  { test: 'Chest X-Ray', result: r.labXray, facility: r.labXrayFacility },
                ].filter(row => row.result).map((row, i, arr) => (
                  <tr key={row.test} className={i < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                    <td className="p-2 text-slate-500">{row.test}</td>
                    <td className="p-2 font-semibold text-slate-700">{row.result}</td>
                    <td className="p-2 text-slate-400">{row.facility || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(r.vax1 || r.vax2 || r.booster1) && (
          <div>
            <SectionHeading icon="fa-syringe" label="COVID-19 Vaccination" />
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Dose 1',   name: r.vax1,     date: r.vax1Date     },
                { label: 'Dose 2',   name: r.vax2,     date: r.vax2Date     },
                { label: 'Booster',  name: r.booster1, date: r.booster1Date },
              ].filter(v => v.name).map(v => (
                <span key={v.label} className="text-[9px] bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full">
                  {v.label}: {v.name}{v.date ? ` (${v.date})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {(r.smoking !== undefined || r.alcohol !== undefined || r.drugs !== undefined) && (
          <div>
            <SectionHeading icon="fa-person" label="Personal / Social History" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Smoking',       value: r.smoking },
                { label: 'Alcohol',       value: r.alcohol },
                { label: 'Illicit Drugs', value: r.drugs   },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <p className="text-[7px] text-slate-400 uppercase mb-0.5">{s.label}</p>
                  <p className={`text-[11px] font-bold ${String(s.value).toLowerCase().includes('yes') ? 'text-red-600' : 'text-green-600'}`}>
                    {s.value || 'No'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(r.finding1 || r.remarks || r.isNormalFindings !== undefined || r.isFit !== undefined) && (
          <div className="border border-[#e0eceb] rounded-xl p-3 bg-[#f7fbfa]">
            <SectionHeading icon="fa-notes-medical" label="Doctor's Assessment" />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {r.isNormalFindings !== undefined && (
                <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${r.isNormalFindings ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  <i className={`fa-solid ${r.isNormalFindings ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
                  {r.isNormalFindings ? 'Normal Findings' : 'Abnormal Findings'}
                </span>
              )}
              {r.isFit !== undefined && (
                <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${r.isFit ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  <i className={`fa-solid ${r.isFit ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
                  {r.isFit ? 'Physically Fit' : 'Not Fit'}
                </span>
              )}
            </div>
            {r.finding1 && (
              <div className="mb-2">
                <p className="text-[8px] text-slate-400 uppercase mb-1">Findings</p>
                <p className="text-[10px] text-slate-700 bg-white rounded-lg p-2.5 leading-relaxed border border-slate-100">{r.finding1}</p>
              </div>
            )}
            {r.remarks && (
              <div>
                <p className="text-[8px] text-slate-400 uppercase mb-1">Remarks</p>
                <p className="text-[10px] text-slate-700 bg-white rounded-lg p-2.5 leading-relaxed border border-slate-100">{r.remarks}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const DentalDetail = ({ r }) => (
    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
      <Field label="Dentist"    value={r.dentistName} />
      <Field label="Procedure"  value={r.procedure} />
      <Field label="Tooth"      value={r.toothNumber} />
      <Field label="Diagnosis"  value={r.diagnosis} />
      {r.notes && (
        <div className="col-span-2">
          <p className="text-[8px] font-bold text-[#466460] uppercase mb-1">Notes</p>
          <p className="text-[10px] text-slate-600 bg-slate-50 rounded-lg p-2 leading-relaxed">{r.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Visit History</p>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {['medical', 'dental'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setExpanded(null); }}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white text-[#466460] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className={`fa-solid ${tab === 'medical' ? 'fa-stethoscope' : 'fa-tooth'} mr-1`}></i>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#466460] mb-2 block"></i>
          Loading records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          <i className={`fa-solid ${activeTab === 'medical' ? 'fa-stethoscope' : 'fa-tooth'} text-2xl mb-2 block opacity-20`}></i>
          No {activeTab} records found
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setExpanded(prev => prev === r.id ? null : r.id)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#e0eceb] flex items-center justify-center flex-shrink-0">
                    <i className={`fa-solid ${activeTab === 'medical' ? 'fa-notes-medical' : 'fa-tooth'} text-[#466460] text-[10px]`}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{r._date || 'No date'}</p>
                    <p className="text-[9px] text-slate-400 truncate">
                      {activeTab === 'medical'
                        ? (r.nurseOnDuty ? `Nurse: ${r.nurseOnDuty}` : 'Medical Examination')
                        : (r.procedure || 'Dental Visit')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <StatusPill status={r.status} />
                  <i className={`fa-solid fa-chevron-${expanded === r.id ? 'up' : 'down'} text-[9px] text-slate-300 transition-transform`}></i>
                </div>
              </button>
              {expanded === r.id && (
                <div className="px-3.5 pb-3.5">
                  {activeTab === 'medical' ? <MedicalDetail r={r} /> : <DentalDetail r={r} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PROFILE PANEL
// ============================================================
const ProfilePanel = ({ person, onExamine, onClose, navigate, showSnackbar }) => {
  const [consultLoading, setConsultLoading] = useState(false);

  if (!person) return null;

  const handleConsult = async () => {
    setConsultLoading(true);
    try {
      localStorage.setItem('selectedPatient', JSON.stringify(person));

      const convRef = ref(rtdb, 'consultations');
      const snap = await get(convRef);
      const data = snap.val() || {};

      const existing = Object.entries(data).find(
        ([, conv]) => conv.metadata?.patientUid === person.uid
      );

      if (existing) {
        navigate(`/consultations?patientId=${person.uid}&convId=${existing[0]}`);
      } else {
        const newConvRef = push(ref(rtdb, 'consultations'));
        await set(newConvRef, {
          metadata: {
            patientUid:    person.uid,
            patientName:   person.name,
            patientRole:   person.role || person.type || 'student',
            lastMessage:   '',
            lastTimestamp: Date.now(),
            createdAt:     Date.now(),
          },
          messages: {},
        });
        navigate(`/consultations?patientId=${person.uid}&convId=${newConvRef.key}`);
      }
    } catch (err) {
      console.error('Consult error:', err);
      showSnackbar?.('Failed to open consultation', 'error');
    } finally {
      setConsultLoading(false);
    }
  };

  return (
    <div className="animate-[fadeInSlide_0.3s_ease-out_forwards] flex flex-col">
      {onClose && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[11px] uppercase text-[#466460]">Clinical Profile</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="Close profile"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-user text-lg text-[#466460]"></i>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-slate-800 truncate">{person.name}</h3>
          <p className="text-xs text-slate-500">
            {person.id} •{' '}
            {person.role
              ? person.role.charAt(0).toUpperCase() + person.role.slice(1)
              : person.type}
          </p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {person.department && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">{person.department}</span>
            )}
            {person.prog && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{person.prog}</span>
            )}
            {person.jobTitle && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{person.jobTitle}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Age',        value: person.age       || '-' },
          { label: 'Gender',     value: person.gender    || '-' },
          { label: 'Birthdate',  value: person.birthdate || '-' },
          { label: 'Year Level', value: person.year      || 'N/A' },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[8px] text-slate-400 uppercase mb-0.5">{label}</p>
            <p className="text-sm font-bold text-slate-700">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Contact</p>
          <p className="text-xs text-slate-600 mb-1 truncate">
            <i className="fa-solid fa-envelope w-4 mr-1 text-[#466460]"></i>
            {person.email || '-'}
          </p>
          {person.phoneNumber && (
            <p className="text-xs text-slate-600">
              <i className="fa-solid fa-phone w-4 mr-1 text-[#466460]"></i>
              {person.phoneNumber}
            </p>
          )}
        </div>
        {person.emergencyContact?.name && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Emergency Contact</p>
            <p className="text-xs text-slate-600 font-semibold">
              {person.emergencyContact.name}
              {person.emergencyContact.relationship ? ` (${person.emergencyContact.relationship})` : ''}
            </p>
            {person.emergencyContact.phone && (
              <p className="text-xs text-slate-500 mt-0.5">
                <i className="fa-solid fa-phone w-4 mr-1 text-[#466460]"></i>
                {person.emergencyContact.phone}
              </p>
            )}
          </div>
        )}
      </div>

      {person.vaccinations && Object.values(person.vaccinations).some(v => v?.vaccineName) && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
          <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">COVID-19 Vaccination</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(person.vaccinations).map(([key, v]) =>
              v?.vaccineName ? (
                <span key={key} className="text-[8px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {key.replace('dose', 'Dose ').replace('booster', 'Booster ')}: {v.vaccineName}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onExamine(person)}
          className="bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white px-5 py-2.5 rounded-full text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md"
        >
          <i className="fa-solid fa-stethoscope"></i>
          Examine
        </button>
        <button
          onClick={handleConsult}
          disabled={consultLoading}
          className="bg-gradient-to-br from-[#466460] to-[#2f4a46] text-white px-5 py-2.5 rounded-full text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {consultLoading
            ? <i className="fa-solid fa-spinner fa-spin"></i>
            : <i className="fa-solid fa-comment-medical"></i>
          }
          {consultLoading ? 'Opening...' : 'Consult'}
        </button>
      </div>

      <RecordHistoryViewer person={person} />
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Records = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [activeSubTab, setActiveSubTab]     = useState('view');
  const [peopleData, setPeopleData]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [currentDept, setCurrentDept]       = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');

  const [filterYear, setFilterYear]       = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterRole, setFilterRole]       = useState('All');
  const [sortOrder, setSortOrder]         = useState('asc');

  const [profileOpen, setProfileOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const [form, setForm] = useState({
    surname: '', firstname: '', middlename: '', suffix: '', id: '',
    birthdate: '', age: '', gender: 'Male', type: 'student',
    departmentAbbr: '',
    department: '',
    prog: '', year: '1st Year', section: '',
    studentClassification: 'Regular',
    jobTitle: '', classification: 'Teaching Personnel',
    civilStatus: 'Single', nationality: 'Filipino', religion: '',
    email: '', phone: '', password: '',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'users'));
      const users = snapshot.docs.map(doc =>
        normalizeUser({ uid: doc.id, ...doc.data() })
      );
      setPeopleData(users);
    } catch (err) {
      console.error('Failed to load users from Firestore:', err);
      showSnackbar('Could not load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const departments = [...new Set(peopleData.map(p => p.department).filter(Boolean))].sort();
  const uniqueYears = ['All', ...new Set(peopleData.filter(p => p.department === currentDept && p.year).map(p => p.year))].sort();
  const uniqueSections = ['All', ...new Set(peopleData.filter(p => p.department === currentDept && (filterYear === 'All' || p.year === filterYear) && p.section).map(p => p.section))].sort();
  const uniquePrograms = ['All', ...new Set(
    peopleData
      .filter(p => p.department === currentDept && p.prog)
      .map(p => p.prog)
  )].sort();
  const uniqueRoles = ['All', ...new Set(peopleData.filter(p => p.department === currentDept && p.role).map(p => p.role))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const roleLabel = (r) => r === 'All' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1);

  useEffect(() => {
    if (departments.length > 0 && !currentDept) {
      const first = departments[0];
      setCurrentDept(first);
      const firstPerson = peopleData.find(p => p.department === first);
      if (firstPerson) setSelectedPerson(firstPerson);
    }
  }, [peopleData]);

  const handleSelectDept = (dept) => {
    setCurrentDept(dept);
    setSelectedPerson(null);
    setSearchQuery('');
    setFilterYear('All');
    setFilterSection('All');
    setFilterRole('All');
    setFilterProgram('All');
    setProfileOpen(false);
  };

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const filteredPeople = peopleData
    .filter(p => {
      const inDept    = p.department === currentDept;
      const inYear    = filterYear    === 'All' ? true : p.year    === filterYear;
      const inSection = filterSection === 'All' ? true : p.section === filterSection;
      const inRole    = filterRole    === 'All' ? true : p.role    === filterRole;
      const inProgram = filterProgram === 'All' ? true : p.prog    === filterProgram;
      if (!inDept || !inYear || !inSection || !inRole || !inProgram) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setProfileOpen(true);
  };

  const handleExamine = (person) => {
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${person.uid}`);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'type') {
      setForm(f => ({
        ...f,
        [name]: value,
        classification: getDefaultClassification(value),
        jobTitle: getDefaultJobTitle(value)
      }));
      return;
    }

    if (name === 'departmentAbbr' && form.type === 'student') {
      const fullName = deptAbbrToFull[value] || value;
      setForm(f => ({
        ...f,
        departmentAbbr: value,
        department: fullName,
        prog: '',
      }));
      return;
    }

    setForm(f => ({ ...f, [name]: value }));
  };

  const handleBirthdateChange = (e) => {
    const dob = e.target.value;
    let age = '';
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      age = a;
    }
    setForm(f => ({ ...f, birthdate: dob, age: age.toString() }));
  };

  const handleAddRecord = async () => {
    if (!form.surname.trim() || !form.firstname.trim() || !form.id.trim() || !form.email.trim() || !form.password.trim()) {
      showSnackbar('Please fill all required fields, including Email and Password', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        firstName: form.firstname || '',
        lastName: form.surname || '',
        middleInitial: form.middlename || '',
        suffix: form.suffix || '',
        universityId: form.id || '',
        email: form.email || '',
        password: form.password || '',
        role: form.type || 'student',
        sex: form.gender || '',
        birthday: form.birthdate || '',
        age: String(form.age || '0'),
        department: form.department || '',
        phoneNumber: form.phone || '',
        civilStatus: form.civilStatus || '',
        nationality: form.nationality || '',
        religion: form.religion || '',
        program: form.type === 'student' ? (form.prog || '') : '',
        yearLevel: form.type === 'student' ? (form.year || '') : '',
        section: form.type === 'student' ? (form.section || '') : '',
        studentClassification: form.type === 'student' ? (form.studentClassification || '') : '',
        jobTitle: form.type !== 'student' ? (form.jobTitle || '') : '',
        classification: form.type !== 'student' ? (form.classification || '') : '',
        bloodType: '',
        homeAddress: '',
        emergencyContact: { name: '', relationship: '', phone: '', address: '' },
        vaccinations: {
          dose1: { vaccineName: '', date: '' },
          dose2: { vaccineName: '', date: '' },
          booster1: { vaccineName: '', date: '' },
          booster2: { vaccineName: '', date: '' }
        },
        isProfileSetup: true,
        profileComplete: true,
      };

      const createdUser = await recordsService.createRecord(payload);
      showSnackbar('User Account Created Successfully!');
      const newPerson = normalizeUser({ uid: createdUser.id, ...payload });
      setPeopleData(prev => [...prev, newPerson]);
      handleClearForm();
      setActiveSubTab('view');
    } catch (err) {
      console.error('Error adding user record:', err);
      showSnackbar(err.message || 'Network error. Failed to add record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setForm({
      surname: '', firstname: '', middlename: '', suffix: '', id: '',
      birthdate: '', age: '', gender: 'Male', type: 'student',
      departmentAbbr: '', department: '', prog: '', year: '1st Year', section: '',
      studentClassification: 'Regular', jobTitle: '', classification: 'Teaching Personnel',
      civilStatus: 'Single', nationality: 'Filipino', religion: '',
      email: '', phone: '', password: ''
    });
  };

  const FilterSelects = ({ size = 'sm' }) => {
    const base = size === 'sm'
      ? 'px-2 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[11px] outline-none focus:border-[#466460] transition-all text-slate-600 min-w-0 truncate'
      : 'px-1 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[10px] outline-none focus:border-[#466460] transition-all text-slate-600 min-w-0 truncate';

    const fixedCls  = `${base} w-[78px] shrink-0`;
    const progCls   = `${base} flex-1 min-w-0 max-w-[160px]`;

    return (
      <>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={fixedCls}>
          {uniqueRoles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
        <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterYear('All'); setFilterSection('All'); }} className={progCls}>
          {uniquePrograms.map(p => <option key={p} value={p}>{p === 'All' ? 'All Programs' : p}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterSection('All'); }} className={fixedCls}>
          {uniqueYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={fixedCls}>
          {uniqueSections.map(s => <option key={s} value={s}>{s === 'All' ? 'All Secs' : `Sec ${s}`}</option>)}
        </select>
      </>
    );
  };

  const formSelectCls = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white";
  const formInputCls  = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]";
  const formLabelCls  = "text-[10px] font-bold text-slate-500 uppercase block mb-1";

  const availablePrograms = form.departmentAbbr ? (programsByDeptAbbr[form.departmentAbbr] || []) : [];

  return (
    <>
      <div className="h-full flex flex-col bg-white overflow-hidden">
        {/* ── TAB BAR ── */}
        <div className="shrink-0 border-b border-slate-200 px-4 sm:px-6 py-2 flex gap-2 bg-white">
          {['view', 'add'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                activeSubTab === tab ? 'bg-[#466460] text-white' : 'text-slate-500 hover:bg-[#e0eceb] hover:text-[#466460]'
              }`}
            >
              {tab === 'view' ? 'Current' : 'Add New Record'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">

          {/* ══════════════════════════════════════════
              VIEW TAB
          ══════════════════════════════════════════ */}
          {activeSubTab === 'view' && (
            <>
              {/* ── MOBILE layout ── */}
              <div className="flex flex-col lg:hidden h-full bg-white overflow-hidden">

                {/* ── Department Dropdown (mobile only) ── */}
                <div className="shrink-0 border-b border-[#eef2f6] px-3 py-3">
                  {loading ? (
                    <div className="text-xs text-slate-400 py-1 px-1">
                      <i className="fa-solid fa-spinner fa-spin mr-1"></i> Loading departments...
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Label */}
                      <p className="text-[9px] font-bold uppercase text-[#466460] mb-1.5 px-0.5">Department</p>

                      {/* Custom styled select wrapper */}
                      <div className="relative">
                        {/* Left icon */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>

                        <select
                          value={currentDept || ''}
                          onChange={e => handleSelectDept(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 bg-[#f4f8f6] border border-[#c8ddd8] rounded-xl text-[12px] font-semibold text-[#1a2e22] outline-none appearance-none focus:border-[#466460] focus:bg-white transition-all cursor-pointer"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>

                        {/* Right chevron icon */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>

                      {/* Record count badge */}
                      <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                        <span className="text-[9px] font-semibold text-[#466460] bg-[#e0eceb] px-2 py-0.5 rounded-full">
                          {filteredPeople.length} record{filteredPeople.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[9px] text-slate-400">in selected department</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search + sort + filters */}
                <div className="shrink-0 px-3 py-3 border-b border-[#eef2f6]">
                  {/* Search row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search name or ID..."
                        className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs outline-none focus:border-[#466460] focus:bg-white transition-all"
                      />
                    </div>
                    {/* Sort button */}
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      style={{ minWidth: '38px', minHeight: '38px', flexShrink: 0 }}
                      className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center gap-0.5 text-[10px] font-bold"
                      title={`Sort ${sortOrder === 'asc' ? 'Z → A' : 'A → Z'}`}
                    >
                      {sortOrder === 'asc' ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <text x="1" y="7" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                          <text x="1" y="13" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                          <path d="M11 2v10M11 12l-2-2M11 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <text x="1" y="7" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                          <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                          <path d="M11 14V4M11 4l-2 2M11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Filter row */}
                  <div className="flex items-center gap-2 mt-2 overflow-hidden">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 2.5h10M3 6h6M5 9.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <div className="flex flex-1 gap-1.5 min-w-0 overflow-hidden">
                      <FilterSelects size="sm" />
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {filteredPeople.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-12">No records found</div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredPeople.map(person => (
                        <div
                          key={person.uid}
                          onClick={() => handleSelectPerson(person)}
                          className={`p-3 cursor-pointer rounded-xl transition-all border ${
                            selectedPerson?.uid === person.uid
                              ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                              : 'border-slate-100 hover:bg-slate-50 active:bg-[#e0eceb]'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-700 truncate">{person.name}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                                {person.id}{person.prog ? ` • ${person.prog}` : ''}{person.year ? ` ${person.year}` : ''}{person.section ? ` • Sec ${person.section}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[8px] px-2 py-0.5 rounded-full ${typeBadgeClass(person.role || person.type)}`}>
                                {person.role || person.type}
                              </span>
                              <i className="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile profile drawer */}
                {profileOpen && (
                  <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setProfileOpen(false)} />
                )}
                <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:hidden max-h-[85vh] flex flex-col ${profileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 [&::-webkit-scrollbar]:hidden">
                    <ProfilePanel person={selectedPerson} onExamine={handleExamine} onClose={() => setProfileOpen(false)} navigate={navigate} showSnackbar={showSnackbar} />
                  </div>
                </div>
              </div>

              {/* ── DESKTOP layout — unchanged ── */}
              <div className="hidden lg:flex h-full bg-white overflow-hidden">

                {/* Column 1 — Departments */}
                <div className="flex-[1.2] border-r border-[#eef2f6] flex flex-col min-w-[160px] overflow-hidden">
                  <div className="shrink-0 bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                    <h3 className="font-bold text-[11px] uppercase text-[#466460]">Departments</h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {loading ? (
                      <div className="text-center text-slate-400 text-xs py-8">
                        <i className="fa-solid fa-spinner fa-spin mr-1"></i> Loading...
                      </div>
                    ) : departments.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8">No departments found</div>
                    ) : departments.map(dept => (
                      <div
                        key={dept}
                        onClick={() => handleSelectDept(dept)}
                        className={`px-3 py-2 cursor-pointer rounded-lg transition-all border-l-[3px] text-xs font-semibold ${
                          currentDept === dept
                            ? 'bg-gradient-to-r from-[#e0eceb] to-white border-[#466460] text-[#466460]'
                            : 'border-transparent text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:translate-x-0.5'
                        }`}
                      >
                        {dept}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2 — People */}
                <div className="flex-[1.5] border-r border-[#eef2f6] flex flex-col min-w-[200px] overflow-hidden">
                  <div className="shrink-0 bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-[11px] uppercase text-[#466460]">People</h3>
                      <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">{filteredPeople.length}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-1">
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search name or ID..."
                          className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[11px] outline-none focus:border-[#466460] focus:bg-white transition-all"
                        />
                      </div>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        style={{ minWidth: '34px', minHeight: '34px', flexShrink: 0 }}
                        className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center"
                        title={`Sort ${sortOrder === 'asc' ? 'Z → A' : 'A → Z'}`}
                      >
                        {sortOrder === 'asc' ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <text x="1" y="7" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                            <text x="1" y="13" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                            <path d="M11 2v10M11 12l-2-2M11 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <text x="1" y="7" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                            <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                            <path d="M11 14V4M11 4l-2 2M11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                      <span className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 2.5h10M3 6h6M5 9.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <div className="flex flex-1 gap-1.5 min-w-0 overflow-hidden">
                        <FilterSelects size="xs" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredPeople.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm py-12">No records found</div>
                    ) : (
                      <div className="space-y-1">
                        {filteredPeople.map(person => (
                          <div
                            key={person.uid}
                            onClick={() => setSelectedPerson(person)}
                            className={`p-3 mb-1 cursor-pointer rounded-xl transition-all border relative ${
                              selectedPerson?.uid === person.uid
                                ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                                : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:border-[#8aacaa] hover:translate-x-0.5'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-700 truncate">{person.name}</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  {person.id} {person.prog ? `• ${person.prog}` : ''} {person.year || ''} {person.section ? `• Sec ${person.section}` : ''}
                                </p>
                              </div>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full flex-shrink-0 ml-1 ${typeBadgeClass(person.role)}`}>{person.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3 — Clinical Profile */}
                <div className="flex-[2.2] flex flex-col min-w-0 overflow-hidden">
                  <div className="shrink-0 bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                    <h3 className="font-bold text-[11px] uppercase text-[#466460]">Clinical Profile</h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {!selectedPerson ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <i className="fa-regular fa-user-circle text-slate-200 text-5xl mb-3"></i>
                        <p className="text-slate-400 text-sm">Select a person from the list</p>
                      </div>
                    ) : (
                      <ProfilePanel person={selectedPerson} onExamine={handleExamine} navigate={navigate} showSnackbar={showSnackbar} />
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
              ADD NEW RECORD TAB
          ══════════════════════════════════════════ */}
          {activeSubTab === 'add' && (
            <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="p-4 sm:p-6 lg:p-8 bg-white max-w-5xl">
                <h3 className="text-base sm:text-lg font-bold text-[#466460] mb-5">Create New User & Profile</h3>

                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 mt-4 border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                  <div>
                    <label className={formLabelCls}>Last Name *</label>
                    <input name="surname" type="text" value={form.surname} onChange={handleFormChange} className={formInputCls} />
                  </div>
                  <div>
                    <label className={formLabelCls}>First Name *</label>
                    <input name="firstname" type="text" value={form.firstname} onChange={handleFormChange} className={formInputCls} />
                  </div>
                  <div>
                    <label className={formLabelCls}>Middle Initial</label>
                    <input name="middlename" type="text" value={form.middlename} onChange={handleFormChange} className={formInputCls} maxLength="1" />
                  </div>
                  <div>
                    <label className={formLabelCls}>Suffix</label>
                    <select name="suffix" value={form.suffix} onChange={handleFormChange} className={formSelectCls}>
                      <option value="">None</option>
                      {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelCls}>Birthdate</label>
                    <BirthdayPicker
                      value={form.birthdate}
                      onChange={(dateStr) => handleBirthdateChange({ target: { value: dateStr } })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={formLabelCls}>Age</label>
                      <input name="age" type="number" value={form.age} readOnly className={`${formInputCls} bg-gray-50`} />
                    </div>
                    <div>
                      <label className={formLabelCls}>Gender</label>
                      <select name="gender" value={form.gender} onChange={handleFormChange} className={formSelectCls}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={formLabelCls}>Civil Status</label>
                    <select name="civilStatus" value={form.civilStatus} onChange={handleFormChange} className={formSelectCls}>
                      {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelCls}>Nationality</label>
                    <select name="nationality" value={form.nationality} onChange={handleFormChange} className={formSelectCls}>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelCls}>Religion</label>
                    <select name="religion" value={form.religion} onChange={handleFormChange} className={formSelectCls}>
                      <option value="">Select Religion</option>
                      {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 mt-4 border-b pb-2">Academic / Work Detail</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                  <div>
                    <label className={formLabelCls}>Role / Type</label>
                    <select name="type" value={form.type} onChange={handleFormChange} className={formSelectCls}>
                      <option value="student">Student</option>
                      <option value="instructor">Instructor/Faculty</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className={formLabelCls}>ID Number *</label>
                    <input name="id" type="text" value={form.id} onChange={handleFormChange} placeholder="e.g. 23-00001" className={formInputCls} />
                  </div>

                  {form.type === 'student' ? (
                    <>
                      <div>
                        <label className={formLabelCls}>Department *</label>
                        <select name="departmentAbbr" value={form.departmentAbbr} onChange={handleFormChange} className={formSelectCls}>
                          <option value="" disabled>Select Department</option>
                          {departmentsData.map(d => <option key={d.abbr} value={d.abbr}>{d.abbr}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={formLabelCls}>Program / Course</label>
                        <select name="prog" value={form.prog} onChange={handleFormChange} disabled={!form.departmentAbbr} className={formSelectCls}>
                          <option value="" disabled>Select Program</option>
                          {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={formLabelCls}>Year</label>
                          <select name="year" value={form.year} onChange={handleFormChange} className={formSelectCls}>
                            {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'N/A'].map(yr => <option key={yr} value={yr}>{yr}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={formLabelCls}>Section</label>
                          <select name="section" value={form.section} onChange={handleFormChange} className={formSelectCls}>
                            <option value="">None</option>
                            {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={formLabelCls}>Classification</label>
                        <select name="studentClassification" value={form.studentClassification} onChange={handleFormChange} className={formSelectCls}>
                          {STUDENT_CLASSIFICATIONS.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className={formLabelCls}>Office / Department *</label>
                        <select name="department" value={form.department} onChange={handleFormChange} className={formSelectCls}>
                          <option value="" disabled>Select Office</option>
                          {PLSP_OFFICES_FOR_STAFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={formLabelCls}>Job Title</label>
                        <input name="jobTitle" type="text" value={form.jobTitle} onChange={handleFormChange} placeholder="e.g. Associate Professor" className={formInputCls} />
                      </div>
                      <div>
                        <label className={formLabelCls}>Classification</label>
                        <select name="classification" value={form.classification} onChange={handleFormChange} className={formSelectCls}>
                          {['Teaching Personnel', 'Nurse Personnel', 'Physician / Doctor', 'Administrator', 'Non-Teaching Personnel', 'Security Personnel'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 mt-4 border-b pb-2">Account & Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                  <div>
                    <label className={formLabelCls}>Email Address *</label>
                    <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="e.g. name@plsp.edu.ph" className={formInputCls} />
                  </div>
                  <div>
                    <label className={formLabelCls}>Phone Number</label>
                    <input name="phone" type="text" value={form.phone} onChange={handleFormChange} placeholder="e.g. 09123456789" className={formInputCls} maxLength={11} />
                  </div>
                  <div>
                    <label className={formLabelCls}>Set Password *</label>
                    <input name="password" type="text" value={form.password} onChange={handleFormChange} placeholder="Initial secure password" className={formInputCls} />
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddRecord}
                    disabled={isSubmitting}
                    className="bg-[#466460] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <i className="fa-solid fa-spinner fa-spin"></i>}
                    {isSubmitting ? 'Saving Profile...' : 'Save User Record'}
                  </button>
                  <button
                    onClick={handleClearForm}
                    disabled={isSubmitting}
                    className="bg-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors w-full sm:w-auto"
                  >
                    Clear Fields
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </>
  );
};

export default Records;