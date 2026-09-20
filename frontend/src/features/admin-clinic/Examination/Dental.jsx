// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examination\Dental.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import DatePicker from '../../../components/Datepicker';
import DateTimePicker from '../../../components/DateTimePicker';


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
      const response = await fetch(`${API_URL}/storage/branding/logogo`, {
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

const dentalProcedures = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

// ── Dental visit purpose / classification ───────────────────────────────────
const dentalVisitReasonGroups = [
  {
    label: 'Patient Visit — Consultation / Treatment',
    options: [
      'Dental Consultation',
      'Toothache / Dental Pain',
      'Gum Pain / Swelling',
      'Dental Injury / Accident',
      'Emergency Dental Care',
      'Follow-up Dental Treatment',
      'Other Dental Concern',
    ],
    type: 'patient',
  },
  {
    label: 'Non-Patient Visit — Clearance / Requirement',
    options: [
      'Dental Clearance',
      'School Requirement',
      'OJT / Internship Requirement',
      'Employment Requirement',
      'Dental Certificate / Documentation',
      'Routine Dental Examination',
      'Other Requirement',
    ],
    type: 'non_patient',
  },
];

const dentalVisitReasonOptions = dentalVisitReasonGroups.flatMap(group =>
  group.options.map(label => ({
    label,
    type: group.type,
  }))
);

const getSuggestedDentalVisitType = (reason) => {
  const normalizedReason = String(reason || '').trim().toLowerCase();

  if (!normalizedReason) return '';

  const exactMatch = dentalVisitReasonOptions.find(
    option => option.label.toLowerCase() === normalizedReason
  );

  if (exactMatch) {
    return exactMatch.type;
  }

  const nonPatientKeywords = [
    'clearance',
    'requirement',
    'ojt',
    'internship',
    'employment',
    'documentation',
    'certificate',
    'routine dental examination',
  ];

  return nonPatientKeywords.some(keyword =>
    normalizedReason.includes(keyword)
  )
    ? 'non_patient'
    : 'patient';
};

const getDentalVisitTypeLabel = (type) => {
  if (type === 'patient') return 'Patient Visit';
  if (type === 'non_patient') return 'Non-Patient Visit';
  return 'Unclassified';
};

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
  { value: '',    label: 'None'                                },
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
  { value: 'P',   label: 'Pontic (P)'                    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getOperationFullName = (abbr) => {
  const op = toothOperations.find(o => o.value === abbr);
  return op ? op.label : abbr;
};

const getConditionFullName = (abbr) => {
  const cond = toothConditions.find(c => c.value === abbr);
  return cond ? cond.label : abbr;
};

const getConditionAbbr = (fullName) => {
  if (!fullName) return '';
  const exact = toothConditions.find(c => c.value === fullName || c.label === fullName);
  if (exact) return exact.value;

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

const fetchDentists = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, uid, first_name, last_name, license_number, role')
      .eq('role', 'dentist')
      .order('last_name', { ascending: true });

    if (error) return [];
    return (data || []).map(doc => ({
      id: doc.id,
      uid: doc.uid,
      display: `${doc.last_name || ''}, ${doc.first_name || ''} D.M.D / License no. ${doc.license_number || ''}`.trim(),
    }));
  } catch (err) {
    return [];
  }
};

const buildDentalForm = (p, defaultSchoolYear = '', defaultSemester = '') => {
  const existingRecord = p?.existingRecord || null;

  const lastName  = p?.lastName  || (p?.name ? p.name.split(', ')[0] : '') || existingRecord?.last_name || '';
  const firstName = p?.firstName || (p?.name ? (p.name.split(', ')[1] || '') : '') || existingRecord?.first_name || '';
  const middleName = p?.middleName || existingRecord?.middle_name || '';

  const vax = p?.vaccinations || {};
  const vaxDate = (key) => vax[key]?.date || '';

  const dh =
    p?.users?.dental_history ||
    p?.dental_history ||
    p?.dentalHistory ||
    existingRecord?.dental_history ||
    {};
  const parsedDH = typeof dh === 'string' ? JSON.parse(dh || '{}') : dh;

  const initialVisitReason =
    existingRecord?.visit_reason ||
    p?.visitReason ||
    p?.visit_reason ||
    p?.appointmentReason ||
    p?.appointment_reason ||
    p?.reason ||
    p?.appointment?.reason ||
    '';

  const initialVisitType =
    existingRecord?.visit_type ||
    p?.visitType ||
    p?.visit_type ||
    getSuggestedDentalVisitType(initialVisitReason);

  return {
    dRecordId:   existingRecord?.id || '',
    dId:         p?.id || existingRecord?.university_id || existingRecord?.student_id || '',
    dLastName:   lastName,
    dFirstName:  firstName,
    dMiddle:     middleName,
    dSex:        p?.gender || p?.sex || existingRecord?.sex || 'Male',
    dAge:        p?.age ? String(p.age) : existingRecord?.age ? String(existingRecord.age) : '',
    dBirthday:   p?.birthday || p?.birthdate || existingRecord?.birthday || '',
    dAddress:
      p?.users?.home_address ||
      p?.home_address ||
      p?.homeAddress ||
      existingRecord?.address ||
      '',
    dCellphone:  p?.phoneNumber || existingRecord?.cellphone || '',
    dCourseYear: [p?.program || p?.prog || existingRecord?.course_year || '', p?.yearLevel || p?.year || existingRecord?.year_level || '', p?.section || existingRecord?.section || ''].filter(Boolean).join(' '),
    dOfficeAddress: existingRecord?.office_address || '',
    dTelNo:      existingRecord?.tel_no || '',
    dNationality: p?.nationality || existingRecord?.nationality || 'Filipino',
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
    dVisitReason: initialVisitReason,
    dVisitType: initialVisitType,
  };
};

const buildDentalHistoryProcedures = (p) => {
  const existingRecord = p?.existingRecord || null;
  const dh = p?.dentalHistory || existingRecord?.dental_history || {};
  const parsedDH = typeof dh === 'string' ? JSON.parse(dh || '{}') : dh;
  const procedures = parsedDH?.procedures || parsedDH || {};

  return Object.fromEntries(
    dentalProcedures.map(proc => [proc, procedures[proc] === 'Yes' ? 'Yes' : 'No'])
  );
};

// ── Shared style tokens ────────────────────────────────────────────────────────
const inputClass   = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
const requiredLabelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1";
const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

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

const TOOTH_SURFACES = [
  { key: 'topLeft', label: 'Top Left' },
  { key: 'topRight', label: 'Top Right' },
  { key: 'bottomLeft', label: 'Bottom Left' },
  { key: 'bottomRight', label: 'Bottom Right' },
];

const createEmptySurfaces = () => ({
  topLeft: '',
  topRight: '',
  bottomLeft: '',
  bottomRight: '',
});

const normalizeOperationValue = (value) => {
  if (!value) return '';
  return toothOperations.find(op => op.value === value || op.label === value)?.value || value;
};

const normalizeToothEntry = (entry = {}) => {
  const emptySurfaces = createEmptySurfaces();

  if (entry?.surfaces && typeof entry.surfaces === 'object') {
    return {
      surfaces: Object.fromEntries(
        Object.keys(emptySurfaces).map(surfaceKey => [
          surfaceKey,
          getConditionAbbr(entry.surfaces[surfaceKey] || ''),
        ])
      ),
      operation: normalizeOperationValue(entry.operation),
    };
  }

  const oldCondition = getConditionAbbr(entry?.condition || '');
  if (oldCondition) {
    return {
      surfaces: {
        topLeft: oldCondition,
        topRight: oldCondition,
        bottomLeft: oldCondition,
        bottomRight: oldCondition,
      },
      operation: normalizeOperationValue(entry.operation),
    };
  }

  return {
    surfaces: emptySurfaces,
    operation: normalizeOperationValue(entry?.operation),
  };
};

const ToothTopView = ({
  surfaces = {},
  selectedSurface = null,
  onSurfaceClick,
  size = 56,
  interactive = true,
}) => {
  const conditionColors = {
    caries: '#fecaca',
    filled: '#fef08a',
    missing: '#e2e8f0',
    extracted: '#fbcfe8',
    'root-fragment': '#fde68a',
    improved: '#bfdbfe',
    pontic: '#ddd6fe',
  };

  const conditionLetters = {
    caries: 'C',
    filled: '●',
    missing: 'M',
    extracted: 'X',
    'root-fragment': 'RF',
    improved: 'IM',
    pontic: 'P',
  };

  const fillFor = surfaceKey =>
    conditionColors[surfaces?.[surfaceKey]] || '#ffffff';

  const labelFor = surfaceKey =>
    conditionLetters[surfaces?.[surfaceKey]] || '';

  const strokeFor = surfaceKey =>
    selectedSurface === surfaceKey ? '#466460' : '#94a3b8';

  const widthFor = surfaceKey =>
    selectedSurface === surfaceKey ? 5 : 2.5;

  const clickSurface = surfaceKey => {
    if (
      interactive &&
      typeof onSurfaceClick === 'function'
    ) {
      onSurfaceClick(surfaceKey);
    }
  };

  const getFontSize = label => {
    if (!label) return 0;
    if (label.length >= 2) return 10;
    return 14;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="drop-shadow-sm select-none"
      role="img"
      aria-label="Top view of tooth divided into four surfaces"
    >
      {/* Top Left */}
      <path
        d="M50 50 L12 50 Q7 30 22 15 Q35 5 50 9 Z"
        fill={fillFor('topLeft')}
        stroke={strokeFor('topLeft')}
        strokeWidth={widthFor('topLeft')}
        className={
          interactive
            ? 'cursor-pointer hover:brightness-95'
            : ''
        }
        onClick={() => clickSurface('topLeft')}
      />

      {/* Top Right */}
      <path
        d="M50 50 L50 9 Q65 5 78 15 Q93 30 88 50 Z"
        fill={fillFor('topRight')}
        stroke={strokeFor('topRight')}
        strokeWidth={widthFor('topRight')}
        className={
          interactive
            ? 'cursor-pointer hover:brightness-95'
            : ''
        }
        onClick={() => clickSurface('topRight')}
      />

      {/* Bottom Right */}
      <path
        d="M50 50 L88 50 Q93 70 78 85 Q65 95 50 91 Z"
        fill={fillFor('bottomRight')}
        stroke={strokeFor('bottomRight')}
        strokeWidth={widthFor('bottomRight')}
        className={
          interactive
            ? 'cursor-pointer hover:brightness-95'
            : ''
        }
        onClick={() => clickSurface('bottomRight')}
      />

      {/* Bottom Left */}
      <path
        d="M50 50 L50 91 Q35 95 22 85 Q7 70 12 50 Z"
        fill={fillFor('bottomLeft')}
        stroke={strokeFor('bottomLeft')}
        strokeWidth={widthFor('bottomLeft')}
        className={
          interactive
            ? 'cursor-pointer hover:brightness-95'
            : ''
        }
        onClick={() => clickSurface('bottomLeft')}
      />

      {/* Condition labels */}
      {labelFor('topLeft') && (
        <text
          x="32"
          y="34"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={getFontSize(labelFor('topLeft'))}
          fontWeight="800"
          fill="#334155"
          pointerEvents="none"
        >
          {labelFor('topLeft')}
        </text>
      )}

      {labelFor('topRight') && (
        <text
          x="68"
          y="34"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={getFontSize(labelFor('topRight'))}
          fontWeight="800"
          fill="#334155"
          pointerEvents="none"
        >
          {labelFor('topRight')}
        </text>
      )}

      {labelFor('bottomLeft') && (
        <text
          x="32"
          y="68"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={getFontSize(labelFor('bottomLeft'))}
          fontWeight="800"
          fill="#334155"
          pointerEvents="none"
        >
          {labelFor('bottomLeft')}
        </text>
      )}

      {labelFor('bottomRight') && (
        <text
          x="68"
          y="68"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={getFontSize(labelFor('bottomRight'))}
          fontWeight="800"
          fill="#334155"
          pointerEvents="none"
        >
          {labelFor('bottomRight')}
        </text>
      )}

      {/* Center circle */}
      <circle
        cx="50"
        cy="50"
        r="8"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
        pointerEvents="none"
      />
    </svg>
  );
};

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
  <h5 className="text-[10px] font-bold text-[#466460] uppercase mb-2">
    <i className={`fa-solid ${icon} mr-1 ${color}`}></i>{children}
  </h5>
);

// ── Dental visit-history helpers ─────────────────────────────────────────────
const parseDentalJson = (value, fallback = {}) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const formatDentalHistoryDate = (value, withTime = false) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(withTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }
      : {}),
  });
};

const normalizeDentalYesNo = (value) =>
  String(value || '').trim().toLowerCase();

const getDentalToothData = (record) => {
  const raw = parseDentalJson(
    record?.tooth_data,
    {}
  );

  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return raw;
};

const isNewSurfaceToothFormat = (entry) => {
  return Boolean(
    entry &&
    typeof entry === 'object' &&
    entry.surfaces &&
    typeof entry.surfaces === 'object'
  );
};

const normalizeDentalHistoryToothData = (
  record
) => {
  const rawToothData =
    getDentalToothData(record);

  return Object.fromEntries(
    Object.entries(rawToothData).map(
      ([toothNumber, rawEntry]) => [
        toothNumber,
        {
          ...normalizeToothEntry(
            rawEntry
          ),
          _format:
            isNewSurfaceToothFormat(
              rawEntry
            )
              ? 'surface'
              : 'legacy',
          _raw: rawEntry,
        },
      ]
    )
  );
};

const getAffectedDentalTeeth = (record) => {
  const normalized =
    normalizeDentalHistoryToothData(
      record
    );

  return Object.entries(normalized)
    .map(([toothNumber, entry]) => {
      const affectedSurfaces =
        Object.entries(
          entry.surfaces || {}
        )
          .filter(
            ([, condition]) =>
              Boolean(condition)
          )
          .map(
            ([surfaceKey, condition]) => ({
              surfaceKey,
              surfaceLabel:
                TOOTH_SURFACES.find(
                  (item) =>
                    item.key ===
                    surfaceKey
                )?.label ||
                surfaceKey,
              condition,
            })
          );

      return {
        toothNumber,
        ...entry,
        affectedSurfaces,
      };
    })
    .filter(
      (tooth) =>
        tooth.affectedSurfaces.length >
          0 ||
        Boolean(tooth.operation)
    );
};

const getDentalProcedureHistory = (
  record
) => {
  const parsed = parseDentalJson(
    record?.dental_history,
    {}
  );

  if (
    !parsed ||
    typeof parsed !== 'object'
  ) {
    return {};
  }

  return parsed?.procedures &&
    typeof parsed.procedures ===
      'object'
    ? parsed.procedures
    : parsed;
};

const getDentalIntraoral = (
  record
) => {
  const parsed = parseDentalJson(
    record?.intraoral,
    {}
  );

  return parsed &&
    typeof parsed === 'object'
    ? parsed
    : {};
};

const getDentalTreatments = (
  record
) => {
  const parsed = parseDentalJson(
    record?.treatments,
    {}
  );

  return parsed &&
    typeof parsed === 'object'
    ? parsed
    : {};
};

const getDentalTreatmentRemarks = (
  record
) => {
  const parsed = parseDentalJson(
    record?.treatment_remarks,
    {}
  );

  return parsed &&
    typeof parsed === 'object'
    ? parsed
    : {};
};

const DentalTinyBar = ({
  label,
  value,
  total,
}) => {
  const safeTotal = Math.max(
    Number(total) || 0,
    1
  );
  const safeValue = Math.max(
    Number(value) || 0,
    0
  );

  const width = Math.min(
    100,
    Math.round(
      (safeValue / safeTotal) * 100
    )
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[11px] font-semibold text-slate-600 truncate">
          {label}
        </span>
        <span className="text-[10px] font-bold text-slate-500">
          {safeValue}
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#466460] transition-all"
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
};

const DentalMiniLineChart = ({
  title,
  values,
}) => {
  const clean = values
    .map((item) => ({
      ...item,
      value: Number(item.value),
    }))
    .filter((item) =>
      Number.isFinite(item.value)
    );

  if (clean.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-3 italic">
          No recorded values yet.
        </p>
      </div>
    );
  }

  const width = 260;
  const height = 92;
  const pad = 12;

  const min = Math.min(
    ...clean.map(
      (item) => item.value
    )
  );

  const max = Math.max(
    ...clean.map(
      (item) => item.value
    )
  );

  const spread = Math.max(
    max - min,
    1
  );

  const points = clean.map(
    (item, index) => {
      const x =
        clean.length === 1
          ? width / 2
          : pad +
            (index /
              (clean.length - 1)) *
              (width - pad * 2);

      const y =
        height -
        pad -
        ((item.value - min) /
          spread) *
          (height - pad * 2);

      return {
        ...item,
        x,
        y,
      };
    }
  );

  const polyline = points
    .map(
      (point) =>
        `${point.x},${point.y}`
    )
    .join(' ');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>

        <p className="text-sm font-extrabold text-[#466460]">
          {
            clean[
              clean.length - 1
            ]?.value
          }
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[92px] overflow-visible"
      >
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-[#466460]"
        />

        {points.map(
          (point, index) => (
            <g
              key={`${title}-${index}`}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="white"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#466460]"
              />

              <title>
                {`${point.label}: ${point.value}`}
              </title>
            </g>
          )
        )}
      </svg>

      <div className="flex justify-between text-[9px] text-slate-400 mt-1">
        <span>Oldest</span>
        <span>Latest</span>
      </div>
    </div>
  );
};

const DentalVisitAnalytics = ({
  records,
}) => {
  if (records.length === 0) {
    return null;
  }

  const total = records.length;

  const patientVisits =
    records.filter(
      (record) =>
        record.visit_type ===
        'patient'
    ).length;

  const nonPatientVisits =
    records.filter(
      (record) =>
        record.visit_type ===
        'non_patient'
    ).length;

  const approved =
    records.filter(
      (record) =>
        normalizeDentalYesNo(
          record.status
        ) === 'approved' ||
        record.is_approved === true
    ).length;

  const pending =
    records.filter(
      (record) =>
        normalizeDentalYesNo(
          record.status
        ) === 'pending' &&
        record.is_approved !== true
    ).length;

  const certificates =
    records.filter(
      (record) =>
        record.issue_cert === true
    ).length;

  const purposeCounts =
    records.reduce(
      (acc, record) => {
        const label =
          String(
            record.visit_reason || ''
          ).trim() ||
          'Unspecified';

        acc[label] =
          (acc[label] || 0) + 1;

        return acc;
      },
      {}
    );

  const topPurposes =
    Object.entries(purposeCounts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 6);

  const conditionCounts = {};
  const procedureCounts = {};
  const intraoralCounts = {};
  const affectedTeethSeries = [];

  [...records]
    .sort(
      (a, b) =>
        new Date(
          a.exam_date ||
            a.created_at ||
            0
        ) -
        new Date(
          b.exam_date ||
            b.created_at ||
            0
        )
    )
    .forEach((record) => {
      const affectedTeeth =
        getAffectedDentalTeeth(
          record
        );

      affectedTeethSeries.push({
        label:
          formatDentalHistoryDate(
            record.exam_date ||
              record.created_at
          ),
        value:
          affectedTeeth.length,
      });

      affectedTeeth.forEach(
        (tooth) => {
          tooth.affectedSurfaces.forEach(
            ({ condition }) => {
              const label =
                getConditionFullName(
                  condition
                ) ||
                condition;

              conditionCounts[
                label
              ] =
                (conditionCounts[
                  label
                ] || 0) + 1;
            }
          );
        }
      );

      const procedures =
        getDentalProcedureHistory(
          record
        );

      Object.entries(
        procedures
      ).forEach(([name, value]) => {
        if (
          normalizeDentalYesNo(
            value
          ) === 'yes'
        ) {
          procedureCounts[name] =
            (procedureCounts[
              name
            ] || 0) + 1;
        }
      });

      const treatments =
        getDentalTreatments(
          record
        );

      Object.entries(
        treatments
      ).forEach(([name, value]) => {
        if (value === true) {
          const label = name
            .replace(
              /([A-Z])/g,
              ' $1'
            )
            .replace(
              /^./,
              (char) =>
                char.toUpperCase()
            );

          procedureCounts[label] =
            (procedureCounts[
              label
            ] || 0) + 1;
        }
      });

      const intraoral =
        getDentalIntraoral(
          record
        );

      Object.entries(
        intraoral
      ).forEach(([key, value]) => {
        if (
          !value ||
          key === 'tmjExam'
        ) {
          return;
        }

        const label =
          `${key
            .replace(
              /([A-Z])/g,
              ' $1'
            )
            .replace(
              /^./,
              (char) =>
                char.toUpperCase()
            )}: ${String(value)}`;

        intraoralCounts[label] =
          (intraoralCounts[
            label
          ] || 0) + 1;
      });

      if (
        intraoral.tmjExam === true
      ) {
        intraoralCounts[
          'TMJ Examination: Yes'
        ] =
          (intraoralCounts[
            'TMJ Examination: Yes'
          ] || 0) + 1;
      }
    });

  const topConditions =
    Object.entries(
      conditionCounts
    )
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 7);

  const topProcedures =
    Object.entries(
      procedureCounts
    )
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 7);

  const topIntraoral =
    Object.entries(
      intraoralCounts
    )
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 7);

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border border-[#d1e7e5] bg-gradient-to-br from-[#f0f7f6] to-white p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h5 className="text-sm font-extrabold text-[#466460] flex items-center gap-2">
              <i className="fa-solid fa-chart-line"></i>
              Personalized Dental Analytics
            </h5>

            <p className="text-[11px] text-slate-500 mt-1">
              Summary of this patient's recorded dental visits. This is descriptive history, not a diagnosis.
            </p>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wide text-[#466460] bg-white border border-[#d1e7e5] px-2.5 py-1 rounded-full">
            {total} total visit
            {total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {[
            [
              'Patient Visits',
              patientVisits,
              'fa-tooth',
            ],
            [
              'Non-Patient',
              nonPatientVisits,
              'fa-file-circle-check',
            ],
            [
              'Approved',
              approved,
              'fa-circle-check',
            ],
            [
              'Pending',
              pending,
              'fa-clock',
            ],
            [
              'Certificates',
              certificates,
              'fa-file-medical',
            ],
            [
              'Unclassified',
              total -
                patientVisits -
                nonPatientVisits,
              'fa-circle-question',
            ],
          ].map(
            ([label, value, icon]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <i
                  className={`fa-solid ${icon} text-[#466460] text-xs`}
                ></i>

                <p className="text-xl font-extrabold text-slate-800 mt-2">
                  {value}
                </p>

                <p className="text-[10px] font-semibold text-slate-500">
                  {label}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Visit Purpose Distribution
          </h6>

          <div className="space-y-3">
            {topPurposes.map(
              ([label, count]) => (
                <DentalTinyBar
                  key={label}
                  label={label}
                  value={count}
                  total={total}
                />
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Tooth Condition Occurrences
          </h6>

          {topConditions.length > 0 ? (
            <div className="space-y-3">
              {topConditions.map(
                ([label, count]) => (
                  <DentalTinyBar
                    key={label}
                    label={label}
                    value={count}
                    total={Math.max(
                      ...topConditions.map(
                        ([, value]) =>
                          value
                      ),
                      1
                    )}
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No tooth conditions recorded yet.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <DentalMiniLineChart
          title="Affected Teeth Per Visit"
          values={
            affectedTeethSeries
          }
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Procedures / Treatments
          </h6>

          {topProcedures.length >
          0 ? (
            <div className="space-y-3">
              {topProcedures.map(
                ([label, count]) => (
                  <DentalTinyBar
                    key={label}
                    label={label}
                    value={count}
                    total={total}
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No completed procedures or treatments recorded yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
            Common Intraoral Findings
          </h6>

          {topIntraoral.length > 0 ? (
            <div className="space-y-3">
              {topIntraoral.map(
                ([label, count]) => (
                  <DentalTinyBar
                    key={label}
                    label={label}
                    value={count}
                    total={total}
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No intraoral findings recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const DentalVisitCard = ({
  record,
  defaultOpen = false,
}) => {
  const [open, setOpen] =
    useState(defaultOpen);

  const intraoral =
    getDentalIntraoral(record);

  const toothData =
    normalizeDentalHistoryToothData(
      record
    );

  const affectedTeeth =
    getAffectedDentalTeeth(record);

  const dentalHistory =
    getDentalProcedureHistory(
      record
    );

  const treatments =
    getDentalTreatments(record);

  const treatmentRemarks =
    getDentalTreatmentRemarks(
      record
    );

  const hasIntraoral =
    Object.entries(intraoral).some(
      ([key, value]) =>
        key === 'tmjExam'
          ? value === true
          : Boolean(value)
    );

  const hasToothData =
    Object.keys(toothData).length >
      0;

  const hasAffectedTeeth =
    affectedTeeth.length > 0;

  const positiveProcedures =
    Object.entries(dentalHistory)
      .filter(
        ([, value]) =>
          normalizeDentalYesNo(
            value
          ) === 'yes'
      )
      .map(([name]) => name);

  const activeTreatments =
    Object.entries(treatments)
      .filter(([, value]) =>
        Boolean(value)
      )
      .map(([name]) => name);

  const hasTreatmentRemarks =
    Object.values(
      treatmentRemarks
    ).some(Boolean);

  const legacyCount =
    Object.values(
      toothData
    ).filter(
      (entry) =>
        entry._format === 'legacy'
    ).length;

  const surfaceCount =
    Object.values(
      toothData
    ).filter(
      (entry) =>
        entry._format === 'surface'
    ).length;

  const formatTypeLabel =
    legacyCount > 0 &&
    surfaceCount > 0
      ? 'Mixed legacy + surface format'
      : surfaceCount > 0
      ? 'Surface-based format'
      : legacyCount > 0
      ? 'Legacy whole-tooth format'
      : '';

  return (
    <div className="relative">
      <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-[#3b82f6] ring-4 ring-white"></div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() =>
            setOpen(!open)
          }
          className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <i
              className={`fa-solid fa-chevron-right text-slate-400 text-xs transition-transform ${
                open
                  ? 'rotate-90'
                  : ''
              }`}
            ></i>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {record._datetime}
              </p>

              <p className="text-xs text-slate-500 truncate">
                Examined by:{' '}
                <span className="font-medium text-slate-600">
                  {record.examined_by ||
                    'Unknown'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.visit_type && (
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  record.visit_type ===
                  'patient'
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-sky-100 text-sky-700 border-sky-200'
                }`}
              >
                {record.visit_type ===
                'patient'
                  ? 'Patient Visit'
                  : 'Non-Patient Visit'}
              </span>
            )}

            <HistoryStatusBadge
              status={
                record.status ||
                (record.is_approved
                  ? 'approved'
                  : 'pending')
              }
            />
          </div>
        </button>

        {open && (
          <div className="p-4 space-y-5 border-t border-slate-100 text-xs">

            {/* Visit information */}
            <div>
              <HistorySectionLabel
                icon="fa-clipboard-question"
                color="text-[#466460]"
              >
                Visit Information
              </HistorySectionLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Reason / Purpose
                  </p>

                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {record.visit_reason ||
                      'Not recorded'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Classification
                  </p>

                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {record.visit_type ===
                    'patient'
                      ? 'Patient Visit'
                      : record.visit_type ===
                        'non_patient'
                      ? 'Non-Patient Visit'
                      : 'Unclassified'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    School Year / Semester
                  </p>

                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {[
                      record.school_year,
                      record.semester,
                    ]
                      .filter(Boolean)
                      .join(' · ') ||
                      'Not recorded'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Exam Date
                  </p>

                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {formatDentalHistoryDate(
                      record.exam_date ||
                        record.created_at,
                      true
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {[
                  [
                    'Teeth Present — Upper',
                    record.teeth_upper,
                  ],
                  [
                    'Teeth Present — Lower',
                    record.teeth_lower,
                  ],
                  [
                    'Last Dental Visit',
                    record.last_visit
                      ? formatDentalHistoryDate(
                          record.last_visit
                        )
                      : '—',
                  ],
                  [
                    'Previous Dentist',
                    record.prev_dentist ||
                      '—',
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        {label}
                      </p>

                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {value || '—'}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Intraoral */}
            {hasIntraoral && (
              <div>
                <HistorySectionLabel
                  icon="fa-teeth"
                  color="text-[#3b82f6]"
                >
                  Intraoral Examination
                </HistorySectionLabel>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {Object.entries(
                    intraoral
                  )
                    .filter(
                      ([key, value]) =>
                        key !==
                          'tmjExam' &&
                        Boolean(value)
                    )
                    .map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                        >
                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            {key
                              .replace(
                                /([A-Z])/g,
                                ' $1'
                              )
                              .replace(
                                /^./,
                                (char) =>
                                  char.toUpperCase()
                              )}
                          </p>

                          <p className="text-xs font-semibold text-slate-700 mt-1">
                            {String(value)}
                          </p>
                        </div>
                      )
                    )}

                  {intraoral.tmjExam ===
                    true && (
                    <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                      <p className="text-[9px] font-bold uppercase text-sky-600">
                        TMJ Examination
                      </p>

                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        Examined
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tooth chart */}
            {hasToothData && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <HistorySectionLabel
                    icon="fa-teeth-open"
                    color="text-[#3b82f6]"
                  >
                    Patient Dental Chart
                  </HistorySectionLabel>

                  {formatTypeLabel && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {formatTypeLabel}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 mb-3">
                  Older whole-tooth records are automatically converted for display. Newer records show the four individual tooth surfaces.
                </p>

                {hasAffectedTeeth ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {affectedTeeth.map(
                      (tooth) => (
                        <div
                          key={
                            tooth.toothNumber
                          }
                          className="border border-slate-200 rounded-xl p-3 bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <div className="shrink-0">
                              <ToothTopView
                                size={72}
                                surfaces={
                                  tooth.surfaces
                                }
                                interactive={
                                  false
                                }
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-extrabold text-[#466460]">
                                  Tooth #
                                  {
                                    tooth.toothNumber
                                  }
                                </p>

                                {tooth._format ===
                                  'legacy' && (
                                  <span className="text-[8px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    Legacy
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1 mt-2">
                                {tooth.affectedSurfaces.map(
                                  (
                                    surface
                                  ) => (
                                    <div
                                      key={
                                        surface.surfaceKey
                                      }
                                      className="flex items-start justify-between gap-2"
                                    >
                                      <span className="text-[9px] font-bold uppercase text-slate-400">
                                        {
                                          surface.surfaceLabel
                                        }
                                      </span>

                                      <span className="text-[10px] font-semibold text-slate-700 text-right">
                                        {getConditionFullName(
                                          surface.condition
                                        ) ||
                                          surface.condition}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>

                              {tooth.operation && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <p className="text-[9px] font-bold uppercase text-slate-400">
                                    Operation
                                  </p>

                                  <p className="text-[10px] font-semibold text-[#466460] mt-0.5">
                                    {getOperationFullName(
                                      tooth.operation
                                    ) ||
                                      tooth.operation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Tooth chart was saved, but no affected surfaces or operations were recorded.
                  </p>
                )}
              </div>
            )}

            {/* Dental history */}
            {positiveProcedures.length >
              0 && (
              <div>
                <HistorySectionLabel
                  icon="fa-clipboard-list"
                  color="text-emerald-500"
                >
                  Dental History / Procedures
                </HistorySectionLabel>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {positiveProcedures.map(
                    (name) => (
                      <span
                        key={name}
                        className="text-[9px] px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-semibold"
                      >
                        {name}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Treatments */}
            {(activeTreatments.length >
              0 ||
              hasTreatmentRemarks) && (
              <div>
                <HistorySectionLabel
                  icon="fa-screwdriver-wrench"
                  color="text-indigo-500"
                >
                  Treatments & Remarks
                </HistorySectionLabel>

                {activeTreatments.length >
                  0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                    {activeTreatments.map(
                      (name) => (
                        <span
                          key={name}
                          className="text-[9px] px-2 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-semibold"
                        >
                          {name
                            .replace(
                              /([A-Z])/g,
                              ' $1'
                            )
                            .replace(
                              /^./,
                              (char) =>
                                char.toUpperCase()
                            )}
                        </span>
                      )
                    )}
                  </div>
                )}

                {hasTreatmentRemarks && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(
                      treatmentRemarks
                    )
                      .filter(
                        ([, value]) =>
                          Boolean(value)
                      )
                      .map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                          >
                            <p className="text-[9px] font-bold uppercase text-slate-400">
                              {key
                                .replace(
                                  /([A-Z])/g,
                                  ' $1'
                                )
                                .replace(
                                  /^./,
                                  (char) =>
                                    char.toUpperCase()
                                )}
                            </p>

                            <p className="text-xs text-slate-700 mt-1">
                              {String(
                                value
                              )}
                            </p>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Vaccination */}
            {(record.vax1_date ||
              record.vax2_date ||
              record.booster_date) && (
              <div>
                <HistorySectionLabel
                  icon="fa-syringe"
                  color="text-lime-500"
                >
                  Vaccination Dates
                </HistorySectionLabel>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {[
                    [
                      'Dose 1',
                      record.vax1_date,
                    ],
                    [
                      'Dose 2',
                      record.vax2_date,
                    ],
                    [
                      'Booster',
                      record.booster_date,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="bg-lime-50/50 border border-lime-100 rounded-lg px-3 py-2"
                      >
                        <p className="text-[9px] font-bold uppercase text-lime-600">
                          {label}
                        </p>

                        <p className="text-xs font-semibold text-slate-700 mt-1">
                          {value
                            ? formatDentalHistoryDate(
                                value
                              )
                            : 'Not recorded'}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Record outcome */}
            <div>
              <HistorySectionLabel
                icon="fa-circle-check"
                color="text-teal-500"
              >
                Record Outcome
              </HistorySectionLabel>

              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    record.is_approved
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {record.is_approved
                    ? 'Approved'
                    : 'Not approved'}
                </span>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    record.issue_cert
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {record.issue_cert
                    ? 'Certificate issued'
                    : 'No certificate issued'}
                </span>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    record.cert_requested
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {record.cert_requested
                    ? 'Certificate requested'
                    : 'No certificate request'}
                </span>
              </div>

              {record.approved_at && (
                <p className="text-[10px] text-slate-400 mt-2">
                  Approved:{' '}
                  {formatDentalHistoryDate(
                    record.approved_at,
                    true
                  )}
                </p>
              )}
            </div>

            {!hasIntraoral &&
              !hasToothData &&
              positiveProcedures.length ===
                0 &&
              activeTreatments.length ===
                0 &&
              !hasTreatmentRemarks && (
                <p className="text-xs text-slate-400 italic">
                  No additional dental details were recorded for this visit.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dental Visit History Component
const DentalVisitHistory = ({
  selectedPatient,
}) => {
  const [records, setRecords] =
    useState([]);
  const [loading, setLoading] =
    useState(true);

  const [
    historyFilterMode,
    setHistoryFilterMode,
  ] = useState('all');

  const [
    historyDate,
    setHistoryDate,
  ] = useState('');

  const [
    historyMonth,
    setHistoryMonth,
  ] = useState('');

  useEffect(() => {
    const patientUid =
      selectedPatient?.uid ||
      selectedPatient?.users?.uid ||
      selectedPatient?.user_id ||
      null;

    if (!patientUid) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);

      try {
        const {
          data: denData,
          error: denError,
        } = await supabase
          .from('dental_records')
          .select('*')
          .eq(
            'user_id',
            patientUid
          )
          .eq(
            'is_archived',
            false
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          );

        if (denError) {
          throw denError;
        }

        const denRecords = (
          denData || []
        ).map((record) => {
          const dateStr =
            record.exam_date ||
            record.created_at;

          return {
            ...record,

            tooth_data:
              getDentalToothData(
                record
              ),

            dental_history:
              getDentalProcedureHistory(
                record
              ),

            intraoral:
              getDentalIntraoral(
                record
              ),

            treatments:
              getDentalTreatments(
                record
              ),

            treatment_remarks:
              getDentalTreatmentRemarks(
                record
              ),

            kind: 'dental',

            _date:
              record.exam_date ||
              record.last_visit ||
              record.created_at?.split(
                'T'
              )[0] ||
              '',

            _datetime:
              formatDentalHistoryDate(
                dateStr,
                true
              ),
          };
        });

        setRecords(denRecords);
      } catch (err) {
        console.error(
          'Error fetching dental visit history:',
          err
        );

        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [
    selectedPatient?.uid,
    selectedPatient?.id,
    selectedPatient?.users,
  ]);

  useEffect(() => {
    setHistoryFilterMode('all');
    setHistoryDate('');
    setHistoryMonth('');
  }, [
    selectedPatient?.uid,
    selectedPatient?.id,
  ]);

  const getRecordFilterDate = (
    record
  ) => {
    const rawDate =
      record.exam_date ||
      record.created_at ||
      record.approved_at ||
      record.updated_at;

    if (!rawDate) return null;

    const parsed =
      new Date(rawDate);

    return Number.isNaN(
      parsed.getTime()
    )
      ? null
      : parsed;
  };

  const filteredRecords =
    records.filter((record) => {
      if (
        historyFilterMode ===
        'all'
      ) {
        return true;
      }

      const recordDate =
        getRecordFilterDate(
          record
        );

      if (!recordDate) {
        return false;
      }

      if (
        historyFilterMode ===
        'date'
      ) {
        if (!historyDate) {
          return true;
        }

        const year =
          recordDate.getFullYear();

        const month = String(
          recordDate.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
          recordDate.getDate()
        ).padStart(2, '0');

        return (
          `${year}-${month}-${day}` ===
          historyDate
        );
      }

      if (
        historyFilterMode ===
        'month'
      ) {
        if (!historyMonth) {
          return true;
        }

        const year =
          recordDate.getFullYear();

        const month = String(
          recordDate.getMonth() + 1
        ).padStart(2, '0');

        return (
          `${year}-${month}` ===
          historyMonth
        );
      }

      return true;
    });

  const clearHistoryFilter = () => {
    setHistoryFilterMode('all');
    setHistoryDate('');
    setHistoryMonth('');
  };

  const getFilterLabel = () => {
    if (
      historyFilterMode ===
        'date' &&
      historyDate
    ) {
      const parsed = new Date(
        `${historyDate}T00:00:00`
      );

      return parsed.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );
    }

    if (
      historyFilterMode ===
        'month' &&
      historyMonth
    ) {
      const [year, month] =
        historyMonth.split('-');

      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        1
      );

      return parsed.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
        }
      );
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

      {/* FILTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h5 className="text-sm font-extrabold text-[#466460] flex items-center gap-2">
              <i className="fa-solid fa-filter"></i>
              Filter Dental History & Analytics
            </h5>

            <p className="text-[11px] text-slate-500 mt-1">
              The selected period is applied to both the dental analytics and the detailed history.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter By
              </label>

              <select
                value={
                  historyFilterMode
                }
                onChange={(event) => {
                  const mode =
                    event.target.value;

                  setHistoryFilterMode(
                    mode
                  );

                  if (
                    mode !== 'date'
                  ) {
                    setHistoryDate('');
                  }

                  if (
                    mode !== 'month'
                  ) {
                    setHistoryMonth('');
                  }
                }}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
              >
                <option value="all">
                  All Dates
                </option>

                <option value="month">
                  Specific Month
                </option>

                <option value="date">
                  Specific Date
                </option>
              </select>
            </div>

            {historyFilterMode ===
              'month' && (
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Month
                </label>

                <input
                  type="month"
                  value={historyMonth}
                  onChange={(event) =>
                    setHistoryMonth(
                      event.target.value
                    )
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
                />
              </div>
            )}

            {historyFilterMode ===
              'date' && (
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Date
                </label>

                <input
                  type="date"
                  value={historyDate}
                  onChange={(event) =>
                    setHistoryDate(
                      event.target.value
                    )
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#466460]"
                />
              </div>
            )}

            {historyFilterMode !==
              'all' && (
              <button
                type="button"
                onClick={
                  clearHistoryFilter
                }
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
            {filteredRecords.length}{' '}
            of {records.length}{' '}
            visit
            {records.length !== 1
              ? 's'
              : ''}
          </span>
        </div>
      </div>

      {/* ANALYTICS */}
      <DentalVisitAnalytics
        records={filteredRecords}
      />

      {/* HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#3b82f6]/10 to-transparent">
          <div>
            <h4 className="text-sm font-bold text-[#466460] uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-tooth text-[#3b82f6]"></i>
              Detailed Dental Visit History
            </h4>

            <p className="text-[10px] text-slate-400 mt-1">
              Expand a visit to review its tooth chart, surface conditions, procedures, treatments, intraoral findings, and outcome.
            </p>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredRecords.length}{' '}
            record
            {filteredRecords.length !== 1
              ? 's'
              : ''}
          </span>
        </div>

        <div className="p-5">
          {records.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <i className="fa-solid fa-file-medical text-2xl text-slate-300 mb-2 block"></i>

              <p className="text-sm text-slate-400">
                No dental visit history found.
              </p>
            </div>
          ) : filteredRecords.length ===
            0 ? (
            <div className="text-center py-10 border border-dashed border-amber-200 rounded-xl bg-amber-50/50">
              <i className="fa-solid fa-calendar-xmark text-2xl text-amber-300 mb-2 block"></i>

              <p className="text-sm font-semibold text-amber-700">
                No dental visits found for{' '}
                {getFilterLabel()}.
              </p>

              <button
                type="button"
                onClick={
                  clearHistoryFilter
                }
                className="mt-3 px-4 py-2 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-50 transition"
              >
                Show all visits
              </button>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>

              <div className="space-y-4">
                {filteredRecords.map(
                  (
                    record,
                    index
                  ) => (
                    <DentalVisitCard
                      key={
                        record.id
                      }
                      record={
                        record
                      }
                      defaultOpen={
                        index === 0
                      }
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DENTAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const Dental = ({ selectedPatient, showMessage, defaultSchoolYear, defaultSemester, readOnly = false, onSaved, onDirtyChange }) => {
  const logoUrl = useBrandingLogo();
  const [toothModal, setToothModal] = useState({ open: false, toothNum: null });
  const [selectedSurface, setSelectedSurface] = useState('topLeft');
  const [toothSurfaces, setToothSurfaces] = useState(createEmptySurfaces());
  const [toothCondition, setToothCondition] = useState('');
  const [toothOperation, setToothOperation] = useState('');
  const [showSummary, setShowSummary]       = useState(false);
  const [activeTab, setActiveTab]           = useState('patientProfile');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dentists, setDentists]             = useState([]);

  // Alert Modal
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });

  // Form states
  const [dentalHistory, setDentalHistory]   = useState(() => buildDentalHistoryProcedures(selectedPatient));

  const [intraoral, setIntraoral] = useState(() => {
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

  const [toothData, setToothData] = useState(() => {
    const existingToothData = selectedPatient?.toothData || selectedPatient?.tooth_data || selectedPatient?.existingRecord?.tooth_data || {};
    if (typeof existingToothData === 'string') {
      try { return JSON.parse(existingToothData); } catch { return {}; }
    }
    return existingToothData || {};
  });

  const [dentalFormData, setDentalFormData] = useState(() => buildDentalForm(selectedPatient, defaultSchoolYear, defaultSemester));

  // ── Bulletproof Dirty State Management via Hash Comparison ──
  const [initialStateHash, setInitialStateHash] = useState(null);

  // Fetch dentists
  useEffect(() => {
    const loadDentists = async () => {
      const docs = await fetchDentists();
      setDentists(docs);
    };
    loadDentists();
  }, []);

  // Fetch the patient's HOME ADDRESS and DENTAL HISTORY directly
  // from the users table. These two fields use users as the source of truth.
  //
  // IMPORTANT:
  // In some MediTrack screens, selectedPatient.uid is actually users.id
  // (the internal UUID), while in others it is users.uid (Supabase Auth UUID).
  // Therefore we search BOTH columns using every available candidate.
  useEffect(() => {
    let isMounted = true;

    const loadUserDentalProfile = async () => {
      const nestedUser = Array.isArray(selectedPatient?.users)
        ? selectedPatient.users[0] || {}
        : selectedPatient?.users || {};

      const candidates = [
        selectedPatient?.user_id,
        selectedPatient?.uid,
        nestedUser?.id,
        nestedUser?.uid,
      ]
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(Boolean);

      const uniqueCandidates = [...new Set(candidates)];

      if (uniqueCandidates.length === 0) {
        console.warn(
          '[Dental] Cannot fetch users.home_address / users.dental_history because no user identifier was found.',
          { selectedPatient }
        );
        return;
      }

      try {
        const orConditions = uniqueCandidates
          .flatMap(value => [
            `id.eq.${value}`,
            `uid.eq.${value}`,
          ])
          .join(',');

        console.log(
          '[Dental] Looking up users profile with candidates:',
          uniqueCandidates
        );

        const {
          data,
          error,
        } = await supabase
          .from('users')
          .select(`
            id,
            uid,
            home_address,
            dental_history
          `)
          .or(orConditions)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        if (!data) {
          console.warn(
            '[Dental] No matching users row found for:',
            uniqueCandidates
          );
          return;
        }

        console.log(
          '[Dental] Loaded users profile:',
          {
            id: data.id,
            uid: data.uid,
            home_address: data.home_address,
            dental_history: data.dental_history,
          }
        );

        let parsedDentalHistory = {};

        try {
          parsedDentalHistory =
            typeof data.dental_history === 'string'
              ? JSON.parse(data.dental_history || '{}')
              : data.dental_history || {};
        } catch (parseError) {
          console.error(
            '[Dental] Failed to parse users.dental_history:',
            parseError
          );

          parsedDentalHistory = {};
        }

        const procedures =
          parsedDentalHistory?.procedures &&
          typeof parsedDentalHistory.procedures === 'object'
            ? parsedDentalHistory.procedures
            : parsedDentalHistory;

        const normalizedDentalHistory =
          Object.fromEntries(
            dentalProcedures.map(procedure => [
              procedure,
              String(procedures?.[procedure] || '')
                .trim()
                .toLowerCase() === 'yes'
                ? 'Yes'
                : 'No',
            ])
          );

        // users.home_address is the source of truth for Address.
        // users.dental_history is the source of truth for Last Visit,
        // Previous Dentist, and procedure history.
        setDentalFormData(prev => ({
          ...prev,
          dAddress: data.home_address || '',
          dLastVisit:
            parsedDentalHistory?.lastVisit ||
            parsedDentalHistory?.last_visit ||
            '',
          dPrevDentist:
            parsedDentalHistory?.prevDentist ||
            parsedDentalHistory?.prev_dentist ||
            '',
        }));

        setDentalHistory(
          normalizedDentalHistory
        );
      } catch (error) {
        console.error(
          '[Dental] Failed to fetch users.home_address / users.dental_history:',
          error
        );
      }
    };

    loadUserDentalProfile();

    return () => {
      isMounted = false;
    };
  }, [
    selectedPatient?.uid,
    selectedPatient?.id,
    selectedPatient?.user_id,
    selectedPatient?.users,
  ]);

  // Re-populate when a *new* patient is selected
  useEffect(() => {
    const newFormData = buildDentalForm(selectedPatient, defaultSchoolYear, defaultSemester);
    const newDentalHistory = buildDentalHistoryProcedures(selectedPatient);

    const existingToothData = selectedPatient?.toothData || selectedPatient?.tooth_data || selectedPatient?.existingRecord?.tooth_data || {};
    let parsedToothData = {};
    try { parsedToothData = typeof existingToothData === 'string' ? JSON.parse(existingToothData || '{}') : existingToothData; } catch { parsedToothData = {}; }

    const existingIntraoral = selectedPatient?.intraoral || selectedPatient?.existingRecord?.intraoral || {};
    let parsedIntraoral = {};
    try { parsedIntraoral = typeof existingIntraoral === 'string' ? JSON.parse(existingIntraoral || '{}') : existingIntraoral; } catch { parsedIntraoral = {}; }

    const defaultIntraoral = { gingiva: '', oralHygiene: '', gingivalColor: '', occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false };

    setDentalFormData(newFormData);
    setDentalHistory(newDentalHistory);
    setToothData(parsedToothData || {});
    setIntraoral(parsedIntraoral || defaultIntraoral);
    setActiveTab('patientProfile');

    // Create the hash of the INITIAL clean state
    const hash = JSON.stringify({
      form: newFormData,
      history: newDentalHistory,
      tooth: parsedToothData || {},
      intra: parsedIntraoral || defaultIntraoral
    });
    setInitialStateHash(hash);

    if (typeof onDirtyChange === 'function') {
      onDirtyChange(false);
    }
  }, [selectedPatient?.uid, selectedPatient?.id]); // Strictly depends on patient ID

  // Continuous effect to check if current state deviates from the initial snapshot
  useEffect(() => {
    if (!initialStateHash || readOnly) return;

    const currentHash = JSON.stringify({
      form: dentalFormData,
      history: dentalHistory,
      tooth: toothData,
      intra: intraoral
    });

    const isCurrentlyDirty = currentHash !== initialStateHash;

    if (typeof onDirtyChange === 'function') {
      onDirtyChange(isCurrentlyDirty);
    }
  }, [dentalFormData, dentalHistory, toothData, intraoral, initialStateHash, readOnly, onDirtyChange]);


  // ONLY update school year / semester specifically if changed via modal header
  useEffect(() => {
    setDentalFormData(prev => ({ ...prev, dSchoolYear: defaultSchoolYear, dSemester: defaultSemester }));
  }, [defaultSchoolYear, defaultSemester]);


  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDentalChange = (e) => {
    if (readOnly) return;
    const { id, value, name } = e.target;
    setDentalFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const handleDentalVisitReasonChange = (e) => {
    if (readOnly) return;

    const value = e.target.value;

    setDentalFormData(prev => ({
      ...prev,
      dVisitReason: value,
      dVisitType: getSuggestedDentalVisitType(value),
    }));

    setValidationErrors(prev => ({
      ...prev,
      dVisitReason: '',
      dVisitType: '',
    }));
  };

  const handleDentalDateChange = (field, value) => {
    if (readOnly) return;
    setDentalFormData(prev => ({ ...prev, [field]: value }));
  };

  const openToothModal = (num) => {
    if (readOnly) return;
    const normalizedEntry = normalizeToothEntry(toothData[num]);
    setToothModal({ open: true, toothNum: num });
    setSelectedSurface('topLeft');
    setToothSurfaces(normalizedEntry.surfaces);
    setToothCondition(normalizedEntry.surfaces.topLeft || '');
    setToothOperation(normalizedEntry.operation || '');
  };

  const selectToothSurface = (surfaceKey) => {
    setSelectedSurface(surfaceKey);
    setToothCondition(toothSurfaces[surfaceKey] || '');
  };

  const handleSurfaceConditionChange = (value) => {
    setToothCondition(value);
    setToothSurfaces(prev => ({ ...prev, [selectedSurface]: value }));
  };

  const clearSelectedSurface = () => handleSurfaceConditionChange('');

  const applyConditionToAllSurfaces = () => {
    setToothSurfaces({
      topLeft: toothCondition,
      topRight: toothCondition,
      bottomLeft: toothCondition,
      bottomRight: toothCondition,
    });
  };

  const closeToothModal = () => {
    setToothModal({ open: false, toothNum: null });
    setSelectedSurface('topLeft');
    setToothCondition('');
    setToothOperation('');
    setToothSurfaces(createEmptySurfaces());
  };

  const saveToothStatus = () => {
    if (readOnly || !toothModal.toothNum) return;
    setToothData(prev => ({
      ...prev,
      [toothModal.toothNum]: {
        surfaces: { ...createEmptySurfaces(), ...toothSurfaces },
        operation: toothOperation,
      },
    }));
    closeToothModal();
  };

  const hasToothCondition = (num) => Object.values(normalizeToothEntry(toothData[num]).surfaces).some(Boolean);

  const renderToothRow = (teeth) => teeth.map(num => {
    const entry = normalizeToothEntry(toothData[num]);
    return (
      <div key={num} className="flex flex-col items-center min-w-[42px]">
        <span className="text-[9px] text-slate-500 mb-1">{num}</span>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => openToothModal(num)}
          title={`Edit tooth #${num}`}
          className={`rounded-xl p-1 transition-all ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-110 hover:bg-white hover:shadow-md'} ${hasToothCondition(num) ? 'bg-white ring-1 ring-slate-300' : 'bg-transparent'}`}
        >
          <ToothTopView size={34} surfaces={entry.surfaces} interactive={false} />
        </button>
        {entry.operation && <span className="mt-1 max-w-[38px] truncate text-[7px] font-bold text-[#466460]" title={entry.operation}>{entry.operation}</span>}
      </div>
    );
  });

  const affectedTeeth = Object.entries(toothData)
    .map(([num, rawEntry]) => {
      const entry = normalizeToothEntry(rawEntry);
      const affectedSurfaces = Object.entries(entry.surfaces)
        .filter(([, condition]) => Boolean(condition))
        .map(([surface, condition]) => ({
          surface,
          surfaceLabel: TOOTH_SURFACES.find(item => item.key === surface)?.label || surface,
          condition,
        }));
      return { num, surfaces: entry.surfaces, affectedSurfaces, operation: entry.operation };
    })
    .filter(tooth => tooth.affectedSurfaces.length > 0);

  const handleOpenSummary = () => {
    const errors = {};

    if (!dentalFormData.dVisitReason?.trim()) {
      errors.dVisitReason = 'Reason / Purpose of Visit is required';
    }

    if (!dentalFormData.dVisitType?.trim()) {
      errors.dVisitType = 'Visit Classification is required';
    }

    if (!dentalFormData.dExamDate?.trim()) errors.dExamDate = 'Examination Date is required';
    if (!dentalFormData.dExaminedBy?.trim()) errors.dExaminedBy = 'Examined By is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setAlertModal({
        open: true,
        title: 'Missing Required Fields',
        message: 'Please fill in all required fields:\n\n• Reason / Purpose of Visit\n• Visit Classification\n• Examination Date\n• Examined By'
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
      setAlertModal({ open: true, title: 'Error', message: 'No patient selected. Cannot save record.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const examDateTime = dentalFormData.dExamDate ? `${dentalFormData.dExamDate}:00` : null;

      const transformedToothData = {};
      Object.entries(toothData).forEach(([toothNum, rawEntry]) => {
        const entry = normalizeToothEntry(rawEntry);
        transformedToothData[toothNum] = {
          surfaces: Object.fromEntries(
            Object.entries(entry.surfaces).map(([surfaceKey, condition]) => [
              surfaceKey,
              condition ? getConditionFullName(condition) : '',
            ])
          ),
          operation: entry.operation ? getOperationFullName(entry.operation) : '',
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
        visit_reason: payload.dVisitReason || null,
        visit_type: payload.dVisitType || null,
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

      // Update the "Clean" snapshot so if the user edits further it knows it's a fresh edit
      setInitialStateHash(JSON.stringify({
        form: dentalFormData,
        history: dentalHistory,
        tooth: toothData,
        intra: intraoral
      }));

      if (typeof onDirtyChange === 'function') {
        onDirtyChange(false);
      }

      setShowSummary(false);
      showMessage(recordId ? 'Dental record updated successfully!' : 'Dental record saved successfully! Waiting for approval.');
      onSaved?.();

    } catch (error) {
      setAlertModal({ open: true, title: 'Database Error', message: 'Failed to save the record to the database.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
        onSubmit={e => { e.preventDefault(); if (!readOnly) handleOpenSummary(); }}
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
              <input type="text" id="dAddress" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dAddress} readOnly />
            </div>
            <div className="col-span-4"><label className={labelClass}>Cellphone No.</label><input type="text" id="dCellphone" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dCellphone} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Course / Year / Section</label><input type="text" id="dCourseYear" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dCourseYear} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Office Address</label><input type="text" id="dOfficeAddress" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dOfficeAddress} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Tel. No.</label><input type="text" id="dTelNo" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dTelNo} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="dNationality" className={`${inputClass} bg-slate-50 cursor-not-allowed`} value={dentalFormData.dNationality} readOnly /></div>
          </div>

<div className={sectionClass}>Dental History</div>
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className={labelClass}>Last Dental Visit</label>
              <DatePicker
                value={dentalFormData.dLastVisit}
                disabled={true}
              />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Previous Dentist: Dr.</label>
              <input
                type="text"
                id="dPrevDentist"
                className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                value={dentalFormData.dPrevDentist}
                readOnly
              />
            </div>
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
                      <input
                        type="radio"
                        name={`dh_${proc.replace(/\W/g,'')}`}
                        value="Yes"
                        checked={dentalHistory[proc] === 'Yes'}
                        disabled
                        className="cursor-not-allowed"
                        readOnly
                      />
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      <input
                        type="radio"
                        name={`dh_${proc.replace(/\W/g,'')}`}
                        value="No"
                        checked={dentalHistory[proc] === 'No'}
                        disabled
                        className="cursor-not-allowed"
                        readOnly
                      />
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

          <div className={sectionClass}>Visit Information</div>

          <div className="grid grid-cols-12 gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className={requiredLabelClass}>
                Reason / Purpose of Visit <span className="text-red-500">*</span>
              </label>

              <input
                id="dVisitReason"
                type="text"
                list="dental-visit-reasons"
                className={`${inputClass} ${
                  validationErrors.dVisitReason
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                    : ''
                }`}
                placeholder="Select or type the reason for this visit"
                value={dentalFormData.dVisitReason}
                disabled={readOnly}
                onChange={handleDentalVisitReasonChange}
              />

              <datalist id="dental-visit-reasons">
                {dentalVisitReasonGroups.map(group => (
                  <React.Fragment key={group.label}>
                    {group.options.map(option => (
                      <option key={option} value={option}>
                        {group.label}
                      </option>
                    ))}
                  </React.Fragment>
                ))}
              </datalist>

              <p className="text-[10px] text-slate-400 mt-1.5">
                Choose a common reason or type a specific reason from the appointment or walk-in encounter.
              </p>

              {validationErrors.dVisitReason && (
                <p className="text-[10px] text-red-500 mt-1">
                  {validationErrors.dVisitReason}
                </p>
              )}
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className={requiredLabelClass}>
                Visit Classification <span className="text-red-500">*</span>
              </label>

              <select
                id="dVisitType"
                className={`${inputClass} font-semibold ${
                  validationErrors.dVisitType
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                    : ''
                }`}
                value={dentalFormData.dVisitType}
                disabled={readOnly || !dentalFormData.dVisitReason?.trim()}
                onChange={(e) => {
                  handleDentalChange(e);
                  setValidationErrors(prev => ({
                    ...prev,
                    dVisitType: '',
                  }));
                }}
              >
                <option value="">Select classification</option>
                <option value="patient">Patient Visit</option>
                <option value="non_patient">Non-Patient Visit</option>
              </select>

              <p className="text-[10px] text-slate-400 mt-1.5">
                Suggested automatically from the reason. Clinic staff may correct it when needed.
              </p>

              {validationErrors.dVisitType && (
                <p className="text-[10px] text-red-500 mt-1">
                  {validationErrors.dVisitType}
                </p>
              )}
            </div>

            {dentalFormData.dVisitType && (
              <div
                className={`col-span-12 px-3 py-2 rounded-lg border text-xs font-semibold ${
                  dentalFormData.dVisitType === 'patient'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                <i
                  className={`fa-solid ${
                    dentalFormData.dVisitType === 'patient'
                      ? 'fa-tooth'
                      : 'fa-file-circle-check'
                  } mr-2`}
                ></i>

                This encounter will be counted as a{' '}
                {getDentalVisitTypeLabel(dentalFormData.dVisitType)} on the dashboard.
              </div>
            )}
          </div>

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
                        disabled={readOnly}
                        onChange={() => { if (!readOnly) setIntraoral(prev => ({ ...prev, [name]: opt })); }} />
                      {opt}
                    </label>
                  ))}
                </div>
                {name === 'otherFindings' && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer mt-2">
                    <input type="checkbox" checked={intraoral.tmjExam}
                      disabled={readOnly}
                      onChange={e => { if (!readOnly) setIntraoral(prev => ({ ...prev, tmjExam: e.target.checked })); }} />
                    TMJ Examination
                  </label>
                )}
              </div>
            ))}

            {/* Added: Number of Teeth Present inline with the findings grid */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">
                Number of Teeth Present
              </p>
              <div className="flex gap-6 mt-2">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Upper</label>
                  <input
                    type="number"
                    id="dTeethUpper"
                    className={`w-full p-3 border border-slate-300 rounded-lg text-base outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white ${readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    min="0"
                    max="16"
                    value={dentalFormData.dTeethUpper}
                    readOnly={readOnly}
                    onChange={handleDentalChange}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Lower</label>
                  <input
                    type="number"
                    id="dTeethLower"
                    className={`w-full p-3 border border-slate-300 rounded-lg text-base outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white ${readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    min="0"
                    max="16"
                    value={dentalFormData.dTeethLower}
                    readOnly={readOnly}
                    onChange={handleDentalChange}
                  />
                </div>
              </div>
            </div>
          </div>

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
                <div className="overflow-x-auto pb-2">
                  <div className="flex justify-center gap-1.5 my-3 min-w-max">
                    {renderToothRow(right)}
                    <span className="mx-4 shrink-0" />
                    {renderToothRow(left)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-400 text-center">
                  <div>RIGHT</div><div>LEFT</div>
                </div>
              </div>
            ))}
          </div>

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

          <div className={sectionClass}>Signature & Examiner <span className="text-[10px] font-normal text-red-500">* Required</span></div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <label className={requiredLabelClass}>Examination Date & Time <span className="text-red-500">*</span></label>
              <DateTimePicker
                value={dentalFormData.dExamDate}
                disabled={readOnly}
                onChange={(val) => { if (!readOnly) { handleDentalDateChange('dExamDate', val); setValidationErrors(prev => ({ ...prev, dExamDate: '' })); } }}
              />
            </div>
            <div className="col-span-6">
              <label className={requiredLabelClass}>Examined By <span className="text-red-500">*</span></label>
              <select
                id="dExaminedBy"
                className={`${inputClass} ${readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                value={dentalFormData.dExaminedBy}
                disabled={readOnly}
                onChange={handleDentalChange}
              >
                <option value="">Select Dentist</option>
                {dentists.map(doc => (
                  <option key={doc.id} value={doc.display}>{doc.display}</option>
                ))}
              </select>
            </div>
          </div>

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
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-7 py-5 text-white shrink-0 relative">
              <button
                type="button"
                onClick={() => !isSubmitting && setShowSummary(false)}
                disabled={isSubmitting}
                title="Close"
                className="absolute top-4 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <i className="fa-solid fa-tooth"></i> Dental Record Summary
                  </h3>
                  <p className="text-[11px] opacity-70">
                    Review all entries carefully before submitting.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              <SumSection icon="fa-clipboard-question" title="Visit Information">
                <div className="grid grid-cols-2 gap-2">
                  <SumItem
                    label="Reason / Purpose of Visit"
                    value={dentalFormData.dVisitReason}
                  />
                  <SumItem
                    label="Visit Classification"
                    value={getDentalVisitTypeLabel(dentalFormData.dVisitType)}
                  />
                </div>
              </SumSection>

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
                    {affectedTeeth.map(({ num, surfaces, affectedSurfaces, operation }) => (
                      <div key={num} className="flex items-start gap-3 border border-slate-200 rounded-xl p-3 bg-white">
                        <div className="shrink-0 text-center">
                          <ToothTopView size={48} surfaces={surfaces} interactive={false} />
                          <span className="block text-[9px] font-bold text-slate-500 mt-1">#{num}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {affectedSurfaces.map(surface => (
                              <span key={surface.surface} className={`px-2 py-1 rounded-md border text-[9px] font-semibold ${summaryBadgeStyle[surface.condition] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {surface.surfaceLabel}: {conditionLabel[surface.condition] || surface.condition}
                              </span>
                            ))}
                          </div>
                          {operation && (
                            <p className="text-[10px] text-slate-500 mt-2">
                              <span className="font-bold">Operation:</span> {toothOperations.find(item => item.value === operation)?.label || operation}
                            </p>
                          )}
                        </div>
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

      {/* ═══ TOOTH SURFACE MODAL ═════════════════════════════════════════ */}
      {toothModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onMouseDown={e => { if (e.target === e.currentTarget) closeToothModal(); }}>
          <div className="bg-white rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Tooth #{toothModal.toothNum}</h3>
                <p className="text-[11px] text-white/70 mt-0.5">Select a tooth surface, then choose its condition.</p>
              </div>
              <button type="button" onClick={closeToothModal} className="w-9 h-9 rounded-full hover:bg-white/10 transition" aria-label="Close tooth modal">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-6">
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Occlusal / Top View</p>
                  <ToothTopView size={150} surfaces={toothSurfaces} selectedSurface={selectedSurface} onSurfaceClick={selectToothSurface} />
                  <p className="text-[10px] text-slate-400 text-center mt-4">Click one of the four sections.</p>
                </div>

                <div>
                  <div className="mb-4">
                    <label className={labelClass}>Selected Surface</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TOOTH_SURFACES.map(surface => {
                        const condition = toothSurfaces[surface.key];
                        const isSelected = selectedSurface === surface.key;
                        return (
                          <button type="button" key={surface.key} onClick={() => selectToothSurface(surface.key)} className={`px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all text-left ${isSelected ? 'border-[#466460] bg-[#e8f2f1] text-[#466460] ring-2 ring-[#466460]/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                            <span className="block">{surface.label}</span>
                            <span className="block text-[9px] mt-0.5 opacity-70 truncate">{condition ? toothConditions.find(item => item.value === condition)?.label : 'Free from caries'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={labelClass}>Condition for {TOOTH_SURFACES.find(surface => surface.key === selectedSurface)?.label}</label>
                    <select className={inputClass} value={toothCondition} onChange={e => handleSurfaceConditionChange(e.target.value)}>
                      {toothConditions.map(condition => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2 mb-5">
                    <button type="button" onClick={clearSelectedSurface} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition">Clear Surface</button>
                    <button type="button" onClick={applyConditionToAllSurfaces} className="flex-1 px-3 py-2 rounded-lg border border-[#466460] text-[#466460] bg-[#e8f2f1] text-[11px] font-semibold hover:bg-[#dcebea] transition">Apply to All</button>
                  </div>

                  <div>
                    <label className={labelClass}>Operation / Restoration</label>
                    <select className={inputClass} value={toothOperation} onChange={e => setToothOperation(e.target.value)}>
                      {toothOperations.map(operation => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">The operation applies to the entire tooth.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={closeToothModal} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition">Cancel</button>
              <button type="button" onClick={saveToothStatus} className="px-5 py-2.5 rounded-xl bg-[#466460] text-white text-sm font-bold hover:bg-[#3a524f] transition">
                <i className="fa-solid fa-check mr-2"></i>Save Tooth
              </button>
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