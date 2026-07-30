// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examination\Dental.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase'; // Adjusted path for the Examination folder
import DatePicker from '../../../components/Datepicker';
import DateTimePicker from '../../../components/DateTimePicker';

// ── Static data ────────────────────────────────────────────────────────────────

const dentalProcedures = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

const permUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const permUpperLeft  = [21, 22, 23, 24, 25, 26, 27, 28];
const permLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
const permLowerLeft  = [31, 32, 33, 34, 35, 36, 37, 38];
const decidUpperRight = [55, 54, 53, 52, 51];
const decidUpperLeft  = [61, 62, 63, 64, 65];
const decidLowerRight = [85, 84, 83, 82, 81];
const decidLowerLeft  = [71, 72, 73, 74, 75];

const toothConditions = [
  { value: '',             label: 'Free from Caries ( / )' },
  { value: 'caries',         label: 'Caries (C)'                   },
  { value: 'filled',         label: 'Filled (●)'                   },
  { value: 'missing',        label: 'Missing (M)'                  },
  { value: 'extracted',      label: 'Indicated for Extraction (X)' },
  { value: 'root-fragment',  label: 'Root Fragment (RF)'           },
  { value: 'improved',       label: 'Improved (IM)'                },
  { value: 'pontic',         label: 'Pontic (P)'                   },
];

const toothOperations = [
  { value: '',    label: 'None'                          },
  { value: 'AM',  label: 'Amalgam (AM)'                  },
  { value: 'AB',  label: 'Abutment (AB)'                 },
  { value: 'SI',  label: 'Silicate Cement (SI)'          },
  { value: 'GI',  label: 'Gold Inlay (GI)'               },
  { value: 'LC',  label: 'Light Cure (LC)'               },
  { value: 'GC',  label: 'Gold Crown (GC)'               },
  { value: 'SSC', label: 'Stainless Steel Crown (SSC)'  },
  { value: 'PJC', label: 'Porcelain Jacket Crown (PJC)' },
  { value: 'TF',  label: 'Temporary Filling (TF)'        },
  { value: 'DC',  label: 'Dowel Crown (DC)'              },
  { value: 'SNT', label: 'Supernumerary Tooth (SNT)'    },
  { value: 'PP',  label: 'Periodontal Pocket (PP)'      },
  { value: 'CA',  label: 'Cervical Abrasion (CA)'        },
  { value: 'R',   label: 'Restorable (R)'                },
  { value: 'RCT', label: 'Root Canal Treatment (RCT)'    },
  { value: 'P',   label: 'Pontic (P)'                   },
];

// Helper to convert operation abbreviation to full name
const getOperationFullName = (abbr) => {
  const op = toothOperations.find(o => o.value === abbr);
  return op ? op.label : abbr;
};

// Helper to convert condition abbreviation to full name
const getConditionFullName = (abbr) => {
  const cond = toothConditions.find(c => c.value === abbr);
  return cond ? cond.label : abbr;
};

// Helper to convert full name back to abbreviation (for display in visit history)
const getConditionAbbr = (fullName) => {
  if (!fullName) return '';
  // 1) Exact match against value or label
  const exact = toothConditions.find(c => c.value === fullName || c.label === fullName);
  if (exact) return exact.value;

  // 2) Fallback: extract the abbreviation in trailing parentheses
  const match = fullName.match(/\(([A-Za-z-]+)\)$/);
  if (match) {
    const abbr = match[1].toLowerCase();
    const byAbbr = toothConditions.find(c => {
      const labelMatch = c.label.match(/\(([A-Za-z-]+)\)$/);
      return labelMatch && labelMatch[1].toLowerCase() === abbr;
    });
    if (byAbbr) return byAbbr.value;
  }

  return fullName;
};

const getOperationAbbr = (fullName) => {
  if (!fullName) return '';
  // Extract abbreviation from format like "Amalgam (AM)"
  const match = fullName.match(/\(([A-Za-z]+)\)$/);
  if (match) return match[1];
  // Check if it's already an abbreviation
  const found = toothOperations.find(o => o.value === fullName || o.label === fullName);
  return found ? found.value : fullName;
};

// ── Shared style tokens ────────────────────────────────────────────────────────
const inputClass   = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
const readOnlyInputClass = inputClass + " bg-slate-100 cursor-not-allowed text-slate-600";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
const requiredLabelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1";
const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

// ── Helper: Fetch dentists for dropdown ───────────────────────────────────────
const fetchDentists = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, license_number, role')
      .eq('role', 'dentist')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching dentists:', error);
      return [];
    }

    // Format: "LastName, FirstName D.M.D / License no. XXXXXX"
    return (data || []).map(doc => ({
      id: doc.id,
      display: `${doc.last_name || ''}, ${doc.first_name || ''} D.M.D / License no. ${doc.license_number || ''}`.trim(),
      licenseNumber: doc.license_number || '',
      firstName: doc.first_name || '',
      lastName: doc.last_name || '',
    }));
  } catch (err) {
    console.error('Error fetching dentists:', err);
    return [];
  }
};

// ── Tooth condition → style map ────────────────────────────────────────────────
const toothConditionStyle = {
  caries:          'bg-red-100 border-red-400 text-red-600',
  filled:          'bg-yellow-100 border-yellow-500 text-yellow-700',
  missing:         'bg-slate-100 border-slate-400 text-slate-500',
  extracted:       'bg-pink-100 border-pink-400 text-pink-700',
  'root-fragment': 'bg-amber-100 border-amber-400 text-amber-700',
  improved:        'bg-blue-100 border-blue-400 text-blue-700',
  pontic:          'bg-purple-100 border-purple-400 text-purple-700',
};

const conditionLabel = { caries: 'C', filled: '●', missing: 'M', extracted: 'X', 'root-fragment': 'RF', improved: 'IM', pontic: 'P' };

const summaryBadgeStyle = {
  caries:          'bg-red-100 text-red-700 border-red-200',
  filled:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  missing:         'bg-slate-100 text-slate-600 border-slate-200',
  extracted:       'bg-pink-100 text-pink-700 border-pink-200',
  'root-fragment': 'bg-amber-100 text-amber-700 border-amber-200',
  improved:        'bg-blue-100 text-blue-700 border-blue-200',
  pontic:          'bg-purple-100 text-purple-700 border-purple-200',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
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
      <i className={`fa-solid ${icon} text-[#466460]`}></i> {title}
    </h4>
    {children}
  </div>
);

// ── Helper: build initial dental form from patient ─────────────────────────────
const buildDentalForm = (p, defaultSchoolYear = '', defaultSemester = '') => {
  // Support passing existingRecord in the patient object (for editing)
  const existingRecord = p?.existingRecord || null;

  const lastName  = p?.lastName  || (p?.name ? p.name.split(', ')[0] : '') || existingRecord?.last_name || '';
  const firstName = p?.firstName || (p?.name ? (p.name.split(', ')[1] || '') : '') || existingRecord?.first_name || '';
  const middleName = p?.middleName || existingRecord?.middle_name || '';

  // Pull vaccination dates from user or existing record
  const vax = p?.vaccinations || {};
  const vaxDate = (key) => vax[key]?.date || '';

  // Pull existing dental history from patient or existingRecord
  const dh = p?.dentalHistory || existingRecord?.dental_history || {};

  // Parse dental history if it's a string
  const parsedDH = typeof dh === 'string' ? JSON.parse(dh || '{}') : dh;

  return {
    dId:         p?.id || existingRecord?.university_id || existingRecord?.student_id || '', // University ID
    dLastName:   lastName,
    dFirstName:  firstName,
    dMiddle:     middleName,
    dSex:        p?.gender || p?.sex || existingRecord?.sex || 'Male',
    dAge:        p?.age ? String(p.age) : existingRecord?.age ? String(existingRecord.age) : '',
    dBirthday:   p?.birthday || p?.birthdate || existingRecord?.birthday || '',
    dAddress:    p?.homeAddress || existingRecord?.address || '',
    dCellphone:  p?.phoneNumber || existingRecord?.cellphone || '',
    dCourseYear: [p?.program || p?.prog || existingRecord?.course_year || '', p?.yearLevel || p?.year || existingRecord?.year_level || '', p?.section || existingRecord?.section || ''].filter(Boolean).join(' '),
    dOfficeAddress: existingRecord?.office_address || '',
    dTelNo:      existingRecord?.tel_no || '',
    dNationality: p?.nationality || existingRecord?.nationality || 'Filipino',

    // MAP FIELDS FROM EXISTING RECORD OR USER'S DENTAL HISTORY
    dLastVisit: parsedDH?.lastVisit || parsedDH?.last_visit || existingRecord?.last_visit || '',
    dPrevDentist: parsedDH?.prevDentist || parsedDH?.prev_dentist || existingRecord?.prev_dentist || '',
    dTeethUpper: parsedDH?.teethUpper || parsedDH?.teeth_upper || existingRecord?.teeth_upper || '',
    dTeethLower: parsedDH?.teethLower || parsedDH?.teeth_lower || existingRecord?.teeth_lower || '',

    dVax1Date:      vaxDate('dose1'),
    dVax2Date:      vaxDate('dose2'),
    dBoosterDate:   vaxDate('booster1'),
    dExamDate: existingRecord?.exam_date ? existingRecord.exam_date.slice(0, 16) : (new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)),
    dExaminedBy: existingRecord?.examined_by || '',
    dSchoolYear: existingRecord?.school_year || defaultSchoolYear,
    dSemester: existingRecord?.semester || defaultSemester || '1st Semester',
  };
};

// ── Helper: build initial dental-history procedures table from patient ─────────
const buildDentalHistoryProcedures = (p) => {
  const existingRecord = p?.existingRecord || null;
  const dh = p?.dentalHistory || existingRecord?.dental_history || {};
  // Parse if string
  const parsedDH = typeof dh === 'string' ? JSON.parse(dh || '{}') : dh;

  const procedures = parsedDH?.procedures || parsedDH || {};

  return Object.fromEntries(
    dentalProcedures.map(proc => [proc, procedures[proc] === 'Yes' ? 'Yes' : 'No'])
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dental Visit History Component
const DentalVisitHistory = ({ selectedPatient }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatient?.uid) return;

    const fetchRecords = async () => {
      try {
        const { data: denData, error: denError } = await supabase
          .from('dental_records')
          .select('*')
          .eq('user_id', selectedPatient.uid)
          .order('created_at', { ascending: false });

        if (denError) console.error('Error fetching dental records:', denError);

        const denRecords = (denData || []).map(r => {
          const dateStr = r.exam_date || r.created_at;
          const _datetime = dateStr ? formatDate(dateStr) : '-';
          return {
            ...r,
            kind: 'dental',
            _date: r.exam_date || r.last_visit || r.created_at?.split('T')[0] || '',
            _datetime,
          };
        });

        setRecords(denRecords);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedPatient?.uid]);

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

  const parseJson = (str, fallback = {}) => {
    if (!str) return fallback;
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${year} ${time}`;
  };

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
        <p>No visit history found</p>
      </div>
    );
  }

  const dentalRecords = records;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#3b82f6]/10 to-transparent">
        <h4 className="text-sm font-bold text-[#466460] uppercase tracking-wide flex items-center gap-2">
          <i className="fa-solid fa-tooth text-[#3b82f6]"></i> Dental Visit History
        </h4>
        {dentalRecords.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {dentalRecords.length} record{dentalRecords.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
          <div className="space-y-6">
            {dentalRecords.map((r) => {
              const intraoral = parseJson(r.intraoral, {});
              const toothData = parseJson(r.tooth_data, {});
              const dentalHistory = parseJson(r.dental_history, {});

              return (
                <div key={r.id} className="relative">
                  <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-[#3b82f6] ring-4 ring-white"></div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#2563eb]/5 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">{r._datetime}</span>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="p-4 text-xs space-y-4">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><p className="text-[7px] text-slate-400 uppercase">Examined By</p><p className="font-medium">{r.examined_by || '-'}</p></div>
                        <div><p className="text-[7px] text-slate-400 uppercase">Exam Date</p><p className="font-medium">{formatDate(r.exam_date)}</p></div>
                        <div><p className="text-[7px] text-slate-400 uppercase">Upper Teeth</p><p className="font-mono">{r.teeth_upper || '-'}</p></div>
                        <div><p className="text-[7px] text-slate-400 uppercase">Lower Teeth</p><p className="font-mono">{r.teeth_lower || '-'}</p></div>
                      </div>

                      {/* Intraoral Examination */}
                      {intraoral && Object.keys(intraoral).some(k => intraoral[k]) && (
                        <div className="border-t border-slate-100 pt-3">
                          <h5 className="text-[10px] font-bold text-[#466460] uppercase mb-2">
                            <i className="fa-solid fa-teeth mr-1"></i>Intraoral Examination
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(intraoral).filter(([k, v]) => v && k !== 'tmjExam').map(([key, val]) => (
                              <div key={key} className="bg-slate-50 rounded px-2 py-1">
                                <span className="text-[9px] text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span className="font-medium text-slate-700">{String(val)}</span>
                              </div>
                            ))}
                            {intraoral.tmjExam && (
                              <div className="bg-slate-50 rounded px-2 py-1">
                                <span className="text-[9px] text-slate-400">TMJ: </span>
                                <span className="font-medium text-slate-700">Examined</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tooth Conditions Chart */}
                      {toothData && Object.keys(toothData).length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <h5 className="text-[10px] font-bold text-[#466460] uppercase mb-2">
                            <i className="fa-solid fa-teeth-open mr-1"></i>Tooth Conditions Chart
                          </h5>

                          <div className="flex gap-2 mb-3 text-xs">
                            {(() => {
                              const conditions = { caries: 0, filled: 0, extracted: 0, missing: 0, improved: 0 };
                              Object.values(toothData).forEach(d => {
                                const condAbbr = getConditionAbbr(d.condition);
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

                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(toothData).map(([tooth, data]) => {
                              const condAbbr = getConditionAbbr(data.condition);
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
                                  <span className="block text-[9px]">{data.condition || '-'}</span>
                                  {data.operation && <span className="block text-[8px] opacity-75">{data.operation}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dental History / Procedures */}
                      {dentalHistory && Object.keys(dentalHistory).some(k => dentalHistory[k] === 'Yes') && (
                        <div className="border-t border-slate-100 pt-3">
                          <h5 className="text-[10px] font-bold text-[#466460] uppercase mb-2">
                            <i className="fa-solid fa-clipboard-list mr-1"></i>Procedures Done
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(dentalHistory).filter(([key, val]) => val === 'Yes' && !key.startsWith('d')).map(([key]) => (
                              <span key={key} className="text-[9px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                {key}
                              </span>
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
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export const Dental = ({ selectedPatient, showMessage, defaultSchoolYear, defaultSemester, readOnly = false }) => {
  const [toothModal, setToothModal]         = useState({ open: false, toothNum: null });
  const [toothCondition, setToothCondition] = useState('');
  const [toothOperation, setToothOperation] = useState('');
  const [showSummary, setShowSummary]       = useState(false);
  const [activeTab, setActiveTab]           = useState('patientProfile');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dentists, setDentists]             = useState([]);

  // Custom Validation Alert Modal State
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });

  // Fetch dentists on mount
  useEffect(() => {
    const loadDentists = async () => {
      const docs = await fetchDentists();
      setDentists(docs);
    };
    loadDentists();
  }, []);

  const [dentalHistory, setDentalHistory]   = useState(
    () => buildDentalHistoryProcedures(selectedPatient)
  );
  const [intraoral, setIntraoral] = useState(() => {
    // Load existing intraoral data from selectedPatient if available
    const existingIntraoral = selectedPatient?.intraoral || selectedPatient?.existingRecord?.intraoral || {};
    if (typeof existingIntraoral === 'string') {
      try {
        return JSON.parse(existingIntraoral);
      } catch {
        return { gingiva: '', oralHygiene: '', gingivalColor: '', occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false };
      }
    }
    return existingIntraoral || { gingiva: '', oralHygiene: '', gingivalColor: '', occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false };
  });

  // Load existing tooth data
  const [toothData, setToothData] = useState(() => {
    const existingToothData = selectedPatient?.toothData || selectedPatient?.tooth_data || selectedPatient?.existingRecord?.tooth_data || {};
    if (typeof existingToothData === 'string') {
      try {
        return JSON.parse(existingToothData);
      } catch {
        return {};
      }
    }
    return existingToothData || {};
  });

  const [dentalFormData, setDentalFormData] = useState(() => buildDentalForm(selectedPatient, defaultSchoolYear, defaultSemester));

  // Re-populate when selectedPatient changes
  useEffect(() => {
    setDentalFormData(buildDentalForm(selectedPatient, defaultSchoolYear, defaultSemester));
    setDentalHistory(buildDentalHistoryProcedures(selectedPatient));

    const existingToothData = selectedPatient?.toothData || selectedPatient?.tooth_data || selectedPatient?.existingRecord?.tooth_data || {};
    const parsedToothData = typeof existingToothData === 'string' ? JSON.parse(existingToothData || '{}') : existingToothData;
    setToothData(parsedToothData || {});

    const existingIntraoral = selectedPatient?.intraoral || selectedPatient?.existingRecord?.intraoral || {};
    const parsedIntraoral = typeof existingIntraoral === 'string' ? JSON.parse(existingIntraoral || '{}') : existingIntraoral;
    setIntraoral(parsedIntraoral || { gingiva: '', oralHygiene: '', gingivalColor: '', occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false });

    setActiveTab('patientProfile');
  }, [selectedPatient?.uid, selectedPatient?.id]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDentalChange = (e) => {
    const { id, value, name } = e.target;
    setDentalFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const handleDentalDateChange = (field, value) => {
    setDentalFormData(prev => ({ ...prev, [field]: value }));
  };

  const openToothModal = (num) => {
    setToothModal({ open: true, toothNum: num });
    setToothCondition(toothData[num]?.condition || '');
    setToothOperation(toothData[num]?.operation || '');
  };

  const saveToothStatus = () => {
    if (toothModal.toothNum) {
      setToothData(prev => ({
        ...prev,
        [toothModal.toothNum]: { condition: toothCondition, operation: toothOperation },
      }));
      setToothModal({ open: false, toothNum: null });
    }
  };

  const getToothLabel = (num) => {
    const condition = toothData[num]?.condition;
    return conditionLabel[condition] || '/';
  };
  const getToothClass = (num) => toothConditionStyle[toothData[num]?.condition] || 'bg-white border-slate-300 text-slate-400';

  const renderToothRow = (teeth) => teeth.map(n => (
    <div key={n} className="flex flex-col items-center">
      <span className="text-[9px] text-slate-500 mb-1">{n}</span>
      <div
        className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded transition-all hover:scale-110 ${getToothClass(n)}`}
        onClick={() => openToothModal(n)}
        title={`Tooth #${n}`}
      >
        {getToothLabel(n)}
      </div>
    </div>
  ));

  const affectedTeeth = Object.entries(toothData)
    .filter(([, d]) => d?.condition)
    .map(([num, d]) => ({ num, condition: d.condition, operation: d.operation }));

  const handleOpenSummary = () => {
    // Validate required fields
    const errors = {};

    if (!dentalFormData.dExamDate?.trim()) errors.dExamDate = 'Examination Date is required';
    if (!dentalFormData.dExaminedBy?.trim()) errors.dExaminedBy = 'Examined By is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setAlertModal({
        open: true,
        title: 'Missing Required Fields',
        message: 'Please fill in all required fields:\n\n• Examination Date\n• Examined By'
      });
      return;
    }

    setValidationErrors({});
    if (!dentalFormData.dLastName) {
      setAlertModal({
        open: true,
        title: 'Missing Patient Information',
        message: "Please fill in the patient's last name."
      });
      return;
    }
    setShowSummary(true);
  };

  // ── Database Submit Handler ──────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!selectedPatient?.uid) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'No patient selected. Cannot save record.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const examDateTime = dentalFormData.dExamDate ? `${dentalFormData.dExamDate}:00` : null;

      const transformedToothData = {};
      Object.entries(toothData).forEach(([toothNum, data]) => {
        transformedToothData[toothNum] = {
          condition: data.condition ? getConditionFullName(data.condition) : '',
          operation: data.operation ? getOperationFullName(data.operation) : '',
        };
      });

      const payload = {
        ...dentalFormData,
        toothData: transformedToothData,
        dentalHistory,
        intraoral,
        status: "pending",
        isApproved: false,
        examDateTime,
      };

      const userId = selectedPatient.uid;

      if (!userId) {
        throw new Error("Could not find user ID. Please ensure the patient is registered in the system.");
      }

      const supabasePayload = {
        user_id: userId,
        university_id: payload.dId || payload.studentId || null,
        last_name: payload.dLastName || null,
        first_name: payload.dFirstName || null,
        middle_name: payload.dMiddle || null,
        sex: payload.dSex || null,
        age: payload.dAge ? parseInt(payload.dAge) : null,
        birthday: payload.dBirthday || null,
        address: payload.dAddress || null,
        cellphone: payload.dCellphone || null,
        course_year: payload.dCourseYear || null,
        office_address: payload.dOfficeAddress || null,
        tel_no: payload.dTelNo || null,
        nationality: payload.dNationality || null,
        last_visit: payload.dLastVisit || null,
        prev_dentist: payload.dPrevDentist || null,
        vax1_date: payload.dVax1Date || null,
        vax2_date: payload.dVax2Date || null,
        booster_date: payload.dBoosterDate || null,
        teeth_upper: payload.dTeethUpper || null,
        teeth_lower: payload.dTeethLower || null,
        tooth_data: payload.toothData || {},
        dental_history: payload.dentalHistory || {},
        intraoral: payload.intraoral || {},
        examined_by: payload.dExaminedBy || null,
        exam_date: payload.examDateTime || null,
        school_year: payload.dSchoolYear || null,
        semester: payload.dSemester || null,
        status: "pending",
        is_approved: false,
        created_at: new Date().toISOString(),
        approved_at: null,
      };

      const recordId = selectedPatient?.existingRecord?.id || dentalFormData.dRecordId || null;

      let error;
      if (recordId) {
        const { status, is_approved, created_at, approved_at, ...updatePayload } = supabasePayload;
        ({ error } = await supabase.from('dental_records').update(updatePayload).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('dental_records').insert(supabasePayload));
      }
      if (error) throw error;

      setShowSummary(false);
      showMessage(recordId ? 'Dental record updated successfully!' : 'Dental record saved successfully! Waiting for approval.');

    } catch (error) {
      console.error("Error saving dental record: ", error);
      setAlertModal({
        open: true,
        title: 'Database Error',
        message: 'Failed to save the record to the database. Check console for details.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Tabs - Outside the form so they remain clickable in read-only mode */}
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
          <i className="fa-solid fa-tooth mr-1"></i> Examination
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visitHistory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'visitHistory' ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
        onSubmit={e => { e.preventDefault(); handleOpenSummary(); }}
        className={`overflow-y-auto h-[calc(100vh-320px)] pr-4 pb-12
          [&::-webkit-scrollbar]:w-[5px]
          [&::-webkit-scrollbar-thumb]:bg-gradient-to-b
          [&::-webkit-scrollbar-thumb]:from-[#466460]
          [&::-webkit-scrollbar-thumb]:to-[#8aacaa]
          [&::-webkit-scrollbar-thumb]:rounded-full`}
      >
        {readOnly && (
          <style>{`
            .dental-form input, .dental-form select, .dental-form textarea,
            .dental-form radio, .dental-form checkbox {
              pointer-events: none !important;
              opacity: 0.7 !important;
            }
          `}</style>
        )}
        <div className={readOnly ? "dental-form" : ""}>

        {activeTab === 'visitHistory' ? (
          <DentalVisitHistory selectedPatient={selectedPatient} />
        ) : activeTab === 'patientProfile' ? (
        <>
          {/* ════ PATIENT PROFILE TAB ════ */}

          {/* ─── Patient Information (read-only) ─────────────────────────────── */}
          <div className={sectionClass}>Patient Information</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className={labelClass}>Last Name</label><input type="text" id="dLastName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dLastName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>First Name</label><input type="text" id="dFirstName" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dFirstName} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="dMiddle" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dMiddle} readOnly /></div>
            <div className="col-span-3">
              <label className={labelClass}>Sex</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-not-allowed text-slate-500"><input type="radio" name="dSex" value="Male"   checked={dentalFormData.dSex === 'Male'}   disabled /> Male</label>
                <label className="flex items-center gap-2 text-sm cursor-not-allowed text-slate-500"><input type="radio" name="dSex" value="Female" checked={dentalFormData.dSex === 'Female'} disabled /> Female</label>
              </div>
            </div>
            <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="dAge" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dAge} readOnly /></div>
            <div className="col-span-2">
              <label className={labelClass}>Birthday</label>
              <DatePicker value={dentalFormData.dBirthday} disabled={true} />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Address</label>
              <input
                type="text"
                id="dAddress"
                className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                value={dentalFormData.dAddress}
                readOnly
              />
            </div>
            <div className="col-span-4"><label className={labelClass}>Cellphone No.</label><input type="text" id="dCellphone" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dCellphone} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Course / Year / Section</label><input type="text" id="dCourseYear" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dCourseYear} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Office Address</label><input type="text" id="dOfficeAddress" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dOfficeAddress} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Tel. No.</label><input type="text" id="dTelNo" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dTelNo} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="dNationality" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dNationality} readOnly /></div>
          </div>

          {/* ─── Dental History ───────────────────────────────────────────────── */}
          <div className={sectionClass}>Dental History</div>
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className={labelClass}>Last Dental Visit</label>
              <DatePicker value={dentalFormData.dLastVisit} onChange={(val) => handleDentalDateChange('dLastVisit', val)} />
            </div>
            <div className="col-span-4"><label className={labelClass}>Previous Dentist: Dr.</label><input type="text" id="dPrevDentist" className={inputClass} value={dentalFormData.dPrevDentist} onChange={handleDentalChange} /></div>
          </div>
          <p className="text-xs font-bold text-slate-700 mb-3">Dental History — Check if applicable (Yes / No):</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Dental Procedure</th>
                  <th className="border border-slate-300 p-2 text-center w-16">Yes</th>
                  <th className="border border-slate-300 p-2 text-center w-16">No</th>
                </tr>
              </thead>
              <tbody>
                {dentalProcedures.map(proc => (
                  <tr key={proc}>
                    <td className="border border-slate-300 p-2 font-medium">{proc}</td>
                    <td className="border border-slate-300 p-2 text-center">
                      <input type="radio" name={`dh_${proc.replace(/\W/g,'')}`} value="Yes"
                        checked={dentalHistory[proc] === 'Yes'}
                        onChange={() => setDentalHistory(prev => ({ ...prev, [proc]: 'Yes' }))} />
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      <input type="radio" name={`dh_${proc.replace(/\W/g,'')}`} value="No"
                        checked={dentalHistory[proc] === 'No'}
                        onChange={() => setDentalHistory(prev => ({ ...prev, [proc]: 'No' }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          <div className="mt-8 flex justify-end">
            <button type="button" onClick={() => setActiveTab('examination')} className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              Next: Examination →
            </button>
          </div>
        </>
        ) : (
        <>
          {/* ════ EXAMINATION TAB ════ */}

          {/* ─── Intraoral Findings ───────────────────────────────────────────── */}
          <div className={sectionClass}>Intraoral Findings</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { name: 'gingiva',       title: 'Consistency of Gingiva', opts: ['Firm','Good','Pink','Palpable','Class (Molar)','Pain'] },
              { name: 'oralHygiene',   title: 'Oral Hygiene',          opts: ['Good','Fair','Poor'] },
              { name: 'gingivalColor', title: 'Gingival Color',        opts: ['Bright red','Pale'] },
              { name: 'occlusion',     title: 'Occlusion',             opts: ['Smooth','Overjet','Overbite','Clicking'] },
              { name: 'lymph',         title: 'Lymph Nodes',           opts: ['Palpable','Not Palpable'] },
              { name: 'status',        title: 'Status',                opts: ['Hyperplastic','Normal'] },
              { name: 'otherFindings', title: 'Other Findings',        opts: ['Midline Deviation','Tooth Wear','Trismus'] },
            ].map(({ name, title, opts }) => (
              <div key={name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">{title}</p>
                <div className="flex flex-col gap-2 text-xs">
                  {opts.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`intra_${name}`} value={opt}
                        checked={intraoral[name] === opt}
                        onChange={() => setIntraoral(prev => ({ ...prev, [name]: opt }))} />
                      {opt}
                    </label>
                  ))}
                </div>
                {name === 'otherFindings' && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer mt-2">
                    <input type="checkbox" checked={intraoral.tmjExam}
                      onChange={e => setIntraoral(prev => ({ ...prev, tmjExam: e.target.checked }))} />
                    TMJ Examination
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className={labelClass}>Number of Teeth Present</label>
              <div className="flex gap-4">
                <div><label className="text-xs block mb-1">Upper</label><input type="number" id="dTeethUpper" className={inputClass} style={{ width: '80px' }} min="0" max="16" value={dentalFormData.dTeethUpper} onChange={handleDentalChange} /></div>
                <div><label className="text-xs block mb-1">Lower</label><input type="number" id="dTeethLower" className={inputClass} style={{ width: '80px' }} min="0" max="16" value={dentalFormData.dTeethLower} onChange={handleDentalChange} /></div>
              </div>
            </div>
          </div>

          {/* ─── Patient Dental Chart ─────────────────────────────────────────── */}
          <div className={sectionClass}>Patient Dental Chart</div>
          <p className="text-xs text-slate-500 mb-3">Click on any tooth to set its condition and operation.</p>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
            {[
              { label: 'Deciduous Teeth (Upper)', right: decidUpperRight, left: decidUpperLeft  },
              { label: 'Deciduous Teeth (Lower)', right: decidLowerRight, left: decidLowerLeft  },
              { label: 'Permanent Teeth (Upper)', right: permUpperRight,  left: permUpperLeft   },
              { label: 'Permanent Teeth (Lower)', right: permLowerRight,  left: permLowerLeft   },
            ].map(({ label, right, left }) => (
              <div key={label} className="mb-4">
                <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">{label}</p>
                <div className="flex justify-center gap-1 my-2">
                  {renderToothRow(right)}
                  <span className="mx-4" />
                  {renderToothRow(left)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-400 text-center">
                  <div>RIGHT</div><div>LEFT</div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Legend ───────────────────────────────────────────────────────── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-[#e8f2f1] px-4 py-2 border-b border-slate-200">
              <p className="text-[9px] font-extrabold text-[#466460] uppercase tracking-widest">Legend — Condition</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs">
              {[['white','#86efac','( / ) Free from Caries'],['#fee2e2','#f87171','(C) Caries'],['#fef9c3','#f59e0b','(●) Filled'],['#fce7f3','#f472b6','(X) Indicated for Extraction'],['#fef3c7','#fbbf24','(RF) Root Fragment'],['#dbeafe','#60a5fa','(IM) Improved'],['#ede9fe','#a78bfa','(P) Pontic'],].map(([bg, border, lbl]) => (
                <div key={lbl} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded shrink-0" style={{ background: bg, border: `1.5px solid ${border}` }}></div>
                  <span>{lbl}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#e8f2f1] px-4 py-2 border-t border-b border-slate-200">
              <p className="text-[9px] font-extrabold text-[#466460] uppercase tracking-widest">Legend — Operation</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 border-r border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Condition & Miscellaneous</p>
                <div className="flex flex-col gap-2 text-xs">
                  {[['IM','Improved'],['X','Extracted'],['RF','Root Fragment'],['R','Restorable'],['SNT','Supernumerary Tooth'],['PP','Periodontal Pocket'],['M','Missing'],['CA','Cervical Abrasion']].map(([code, lbl]) => (
                    <div key={code} className="flex items-center gap-2">
                      <div className="w-6 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">{code}</div>{lbl}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Crowns, Inlays & Fillings</p>
                <div className="flex flex-col gap-2 text-xs">
                  {[['LC','Light Cure'],['GI','Gold Inlay'],['GC','Gold Crown'],['SSC','Stainless Steel Crown'],['RCT','Root Canal Treatment'],['TF','Temporary Filling'],['PJC','Porcelain Jacket Crown'],['DC','Dowel Crown'],['P','Pontic'],['AB','Abutment'],['SI','Silicate Cement'],['AM','Amalgam']].map(([code, lbl]) => (
                    <div key={code} className="flex items-center gap-2">
                      <div className="w-6 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">{code}</div>{lbl}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Signature ────────────────────────────────────────────────────── */}
          <div className={sectionClass}>Signature & Examiner <span className="text-[10px] font-normal text-red-500">* Required</span></div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <label className={requiredLabelClass}>Examination Date & Time <span className="text-red-500">*</span></label>
              <DateTimePicker
                value={dentalFormData.dExamDate}
                onChange={(val) => { handleDentalDateChange('dExamDate', val); setValidationErrors(prev => ({ ...prev, dExamDate: '' })); }}
              />
            </div>
            <div className="col-span-6">
              <label className={requiredLabelClass}>Examined By <span className="text-red-500">*</span></label>
              <select
                id="dExaminedBy"
                className={inputClass}
                value={dentalFormData.dExaminedBy}
                onChange={handleDentalChange}
              >
                <option value="">Select Dentist</option>
                {dentists.map(doc => (
                  <option key={doc.id} value={doc.display}>{doc.display}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── Action Footer ────────────────────────────────────────────────── */}
          {!readOnly ? (
            <div className="mt-9 px-6 py-5 bg-gradient-to-r from-[#f0f7f6] to-[#e8f2f1] rounded-2xl border border-[#d1e7e5] flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-sm font-bold text-[#466460] m-0">Ready to submit this dental record?</p>
                <p className="text-[11px] text-slate-500 mt-1">Review all entries carefully before submitting.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleOpenSummary}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-[1.5px] border-[#466460] bg-[#e0eceb] text-[#466460] font-bold text-sm hover:bg-[#d1e7e5] transition-all">
                  <i className="fa-solid fa-eye"></i> Review Summary
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-paper-plane"></i>
                  )}
                  {isSubmitting ? 'Saving...' : 'Review & Submit'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-9 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
              <p className="text-sm text-amber-700 font-medium">
                <i className="fa-solid fa-lock mr-2"></i>This record has already been submitted and is shown for reference only.
              </p>
            </div>
          )}
        </>
        )}
      </div>
      </form>

      {/* ═══ DENTAL SUMMARY MODAL ══════════════════════════════════════════ */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-7 py-5 text-white shrink-0">
              <h3 className="text-lg font-extrabold flex items-center gap-3 mb-1">
                <i className="fa-solid fa-tooth"></i> Dental Record Summary
              </h3>
              <p className="text-[11px] opacity-70">Review all entries carefully before submitting.</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              <SumSection icon="fa-user" title="Patient Information">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Last Name"       value={dentalFormData.dLastName}   />
                  <SumItem label="First Name"      value={dentalFormData.dFirstName}  />
                  <SumItem label="Middle Name"     value={dentalFormData.dMiddle}     />
                  <SumItem label="Sex"             value={dentalFormData.dSex}        />
                  <SumItem label="Age"             value={dentalFormData.dAge}        />
                  <SumItem label="Birthday"        value={dentalFormData.dBirthday}   />
                  <SumItem label="Address"         value={dentalFormData.dAddress}    />
                  <SumItem label="Cellphone"       value={dentalFormData.dCellphone}  />
                  <SumItem label="Course/Yr/Sec"   value={dentalFormData.dCourseYear} />
                  <SumItem label="School Year"     value={dentalFormData.dSchoolYear} />
                  <SumItem label="Semester"        value={dentalFormData.dSemester} />
                  <SumItem label="Nationality"     value={dentalFormData.dNationality}/>
                </div>
              </SumSection>

              <SumSection icon="fa-clock-rotate-left" title="Dental History">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <SumItem label="Last Dental Visit" value={dentalFormData.dLastVisit}   />
                  <SumItem label="Previous Dentist"  value={dentalFormData.dPrevDentist ? `Dr. ${dentalFormData.dPrevDentist}` : ''} />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Procedures</p>
                <div className="flex flex-wrap gap-1.5">
                  {dentalProcedures.map(proc => (
                    <span key={proc} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border ${dentalHistory[proc] === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      <i className={`fa-solid ${dentalHistory[proc] === 'Yes' ? 'fa-check' : 'fa-xmark'} text-[9px]`}></i>
                      {proc}
                    </span>
                  ))}
                </div>
              </SumSection>

              <SumSection icon="fa-magnifying-glass" title="Intraoral Findings">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Consistency of Gingiva" value={intraoral.gingiva}       />
                  <SumItem label="Oral Hygiene"           value={intraoral.oralHygiene}   />
                  <SumItem label="Gingival Color"         value={intraoral.gingivalColor} />
                  <SumItem label="Occlusion"              value={intraoral.occlusion}     />
                  <SumItem label="Lymph Nodes"            value={intraoral.lymph}         />
                  <SumItem label="Status"                 value={intraoral.status}        />
                  <SumItem label="Other Findings"         value={intraoral.otherFindings} />
                  <SumItem label="TMJ Examination"        value={intraoral.tmjExam ? 'Yes' : 'No'} />
                </div>
              </SumSection>


              <SumSection icon="fa-teeth" title={`Dental Chart — ${affectedTeeth.length} tooth/teeth with noted conditions`}>
                {affectedTeeth.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">All teeth recorded as free from caries.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {affectedTeeth.map(({ num, condition, operation }) => (
                      <div key={num} className="flex items-center gap-3 text-[11px]">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">{num}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${summaryBadgeStyle[condition] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {conditionLabel[condition] || condition}
                        </span>
                        <span className="text-slate-600">{toothConditions.find(c => c.value === condition)?.label || condition}</span>
                        {operation && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">{operation}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SumSection>

              <SumSection icon="fa-signature" title="Signature & Examiner">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Examined By"       value={dentalFormData.dExaminedBy} />
                  <SumItem
                    label="Date & Time"
                    value={dentalFormData.dExamDate ? new Date(dentalFormData.dExamDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}
                  />
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
                    {isSubmitting ? 'Saving...' : 'Submit Dental Record'}
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

      {/* ═══ TOOTH MODAL ════════════════════════════════════════════════════ */}
      {toothModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[320px] shadow-2xl">
            <h3 className="text-lg font-bold text-[#466460] mb-4">Tooth #{toothModal.toothNum}</h3>
            <div className="mb-3">
              <label className={labelClass}>Condition</label>
              <select className={inputClass} value={toothCondition} onChange={e => setToothCondition(e.target.value)}>
                {toothConditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className={labelClass}>Operation / Restoration</label>
              <select className={inputClass} value={toothOperation} onChange={e => setToothOperation(e.target.value)}>
                {toothOperations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={saveToothStatus} className="flex-1 bg-[#466460] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3a524f] transition">Save</button>
              <button type="button" onClick={() => setToothModal({ open: false, toothNum: null })} className="flex-1 bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALERT MODAL ══════════════════════════════════════════════════════ */}
      {alertModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
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
                className="w-full bg-[#466460] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3a524f] transition-colors"
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

export default Dental;