// C:\Users\HP\MediTrack\frontend\src\features\users\Records-users.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../supabase';
import { MedicalCertificate } from '../../components/MedicalCertificate';
import { DentalExaminationReport } from '../../components/DentalExaminationReport';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { formatUserDate } from '../../utils/dateFormat';
import { useTranslation } from 'react-i18next'; // <-- Imported i18next hook

// =============================================================================
// CACHE
// =============================================================================

const CACHE_KEY_PREFIX = 'meditrack_records_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const readCache = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      return null;
    }
    const { data, expiresAt } = parsed;
    if (!Array.isArray(data) || !expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const writeCache = (userId, data) => {
  if (!userId || !Array.isArray(data)) return;
  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${userId}`,
      JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // Ignore localStorage quota/private-mode errors.
  }
};

const clearCache = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors.
  }
};

// =============================================================================
// HELPERS
// =============================================================================

const fmt = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
};

const COURSE_MAP = {
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

const shortenCourse = (courseName) => (courseName ? COURSE_MAP[courseName] || courseName : '');

const getRecordTimestamp = (record) => {
  const raw = record?.approved_at || record?.created_at || record?.examDate || record?.dExamDate || record?.dSigDate;
  const timestamp = new Date(raw || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

// Formats a date using the month name but respects user preference layout
const formatDisplayDateWithMonth = (raw, preferences) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  const formatString = preferences?.dateFormat?.toUpperCase() || 'MM/DD/YYYY';
  const monthStr = date.toLocaleDateString('en-US', { month: 'long' });
  const dayStr = String(date.getDate()).padStart(2, '0');
  const yearStr = date.getFullYear();

  if (formatString.startsWith('DD')) {
    return `${dayStr} ${monthStr} ${yearStr}`;
  } else if (formatString.startsWith('YYYY')) {
    return `${yearStr} ${monthStr} ${dayStr}`;
  } else {
    return `${monthStr} ${dayStr}, ${yearStr}`;
  }
};

// =============================================================================
// SEARCH HELPERS
// =============================================================================

const getDateSearchString = (dateValue) => {
  if (!dateValue) return '';
  let searchString = String(dateValue).toLowerCase().replace(/,/g, '').trim();
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return searchString;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const monthFull = monthNames[date.getMonth()];
  const monthShort = monthFull.slice(0, 3);

  searchString += ' ' + [
    String(yyyy), `${mm}/${dd}/${yyyy}`, `${mm}-${dd}-${yyyy}`, `${dd}/${mm}/${yyyy}`,
    `${monthFull} ${dd} ${yyyy}`, `${monthShort} ${dd} ${yyyy}`, `${monthFull} ${dd}`,
    `${monthShort} ${dd}`, `${mm}/${dd}`, `${dd}/${mm}`, monthFull, monthShort,
  ].join(' ').toLowerCase();

  return searchString;
};

const recordMatchesSearch = (record, searchQuery) => {
  if (!searchQuery?.trim()) return true;
  const query = searchQuery.toLowerCase().replace(/,/g, '').trim();
  if (!query) return true;

  if (record.recordType?.toLowerCase().includes(query)) return true;

  const patientName = [
    record.lastName, record.firstName, record.middleName,
    record.dLastName, record.dFirstName, record.dMiddleName,
    `${record.dLastName || ''} ${record.dFirstName || ''}`,
    `${record.lastName || ''} ${record.firstName || ''}`,
    `${record.dLastName || ''} ${record.dMiddleName || ''} ${record.dFirstName || ''}`,
    `${record.lastName || ''} ${record.middleName || ''} ${record.firstName || ''}`,
  ].filter(Boolean).map((name) => String(name).toLowerCase()).join(' ');

  if (patientName.includes(query)) return true;

  const dateFields = [
    record.created_at, record.updated_at, record.approved_at,
    record.examDate, record.exam_date, record.dExamDate, record.dSigDate,
    record.labCbcDate, record.labCbc_date, record.labUaDate, record.labUa_date,
    record.labXrayDate, record.labXray_date,
  ].filter(Boolean);

  const queryParts = query.split(/\s+/).filter(Boolean);
  return dateFields.some((dateValue) => {
    const searchString = getDateSearchString(dateValue);
    if (searchString.includes(query)) return true;
    return queryParts.every((part) => searchString.includes(part));
  });
};

// =============================================================================
// DENTAL HELPERS
// =============================================================================

const extractToothConditions = (toothData, conditions) => {
  if (!toothData || typeof toothData !== 'object') return 'None';

  const conditionLabels = {
    caries: 'Caries', filled: 'Filled', improved: 'Improved',
    extracted: 'Extraction Needed', 'root-fragment': 'Root Fragment', missing: 'Missing',
  };

  const result = Object.entries(toothData)
    .filter(([, data]) => data?.condition && conditions.includes(data.condition))
    .map(([number, data]) => {
      const label = conditionLabels[data.condition] || data.condition;
      const operation = data.operation ? ` (${data.operation})` : '';
      return `Tooth #${number}: ${label}${operation}`;
    });

  return result.length ? result.join('\n') : 'None';
};

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

// =============================================================================
// STYLES
// =============================================================================

const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"] [data-ptr-icon] { display: none; }
  [data-spin="true"] [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none; }
`;

// =============================================================================
// PULL TO REFRESH
// =============================================================================

const PullIndicator = ({ indicatorRef }) => (
  <div
    ref={indicatorRef}
    data-spin="false"
    style={{ overflow: 'hidden', height: 0, opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, opacity 0.2s ease' }}
  >
    <svg data-ptr-icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
    <svg data-ptr-spin width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" style={{ animation: 'ptr-spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

// =============================================================================
// SORT DROPDOWN
// =============================================================================

const SortDropdown = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const options = [
    { value: 'newest', label: t('records.newestFirst', 'Newest First') },
    { value: 'oldest', label: t('records.oldestFirst', 'Oldest First') },
  ];

  const currentLabel = options.find((option) => option.value === value)?.label || 'Sort';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ padding: '6px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, border: '1px solid #c4dbd8', background: '#fff', color: '#466460', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {currentLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 140, background: '#fff', border: '1px solid #c4dbd8', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 50 }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === option.value ? '#e0eceb' : 'transparent', color: value === option.value ? '#466460' : '#1a2e22' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid #edf3f0' }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b8577', flexShrink: 0, marginRight: 12 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2e22', textAlign: 'right' }}>{fmt(value)}</span>
  </div>
);

const SectionHead = ({ label }) => (
  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#466460', borderLeft: '3px solid #466460', paddingLeft: 8, marginBottom: 10, marginTop: 18 }}>
    {label}
  </div>
);

const RequestCertificateCard = ({ requested, requestedAt, onRequest, label, loading, preferences }) => {
  const { t } = useTranslation();

  if (requested) {
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '14px 16px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: '#f59e0b', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 14 }}>⏳</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>{t('records.requestSent', 'Request Sent')}</div>
          <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
            {t('records.requestSentDesc', `You requested your ${label.toLowerCase()} on {{date}}. The clinic will notify you once it's ready.`).replace('{{date}}', requestedAt ? formatDisplayDateWithMonth(requestedAt, preferences) : '—')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={loading}
      style={{ width: '100%', background: '#fff', color: '#466460', border: '1.5px dashed #466460', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 6, opacity: loading ? 0.6 : 1 }}
    >
      {loading ? t('records.sendingRequest', 'Sending request…') : t('records.requestLabel', `Request ${label} →`)}
    </button>
  );
};

const TagList = ({ items, color }) => {
  const { t } = useTranslation();
  if (!items || items.length === 0) {
    return <span style={{ fontSize: 11, color: '#9bb5a5', fontStyle: 'italic' }}>{t('records.noneRecorded', 'None recorded')}</span>;
  }

  const colors = {
    amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    purple: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    slate: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  }[color] || { bg: '#e0eceb', text: '#466460', border: '#c4dbd8' };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, index) => (
        <span key={index} style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
          {typeof item === 'object' ? JSON.stringify(item) : item}
        </span>
      ))}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RecordsUsers() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [view, setView] = useState('list');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [preferences, setPreferences] = useState({ language: 'English', dateFormat: 'MM/DD/YYYY' });

  // Sync i18next with the user's database preference
  useEffect(() => {
    if (preferences?.language) {
      const langCode = preferences.language.toLowerCase() === 'filipino' ? 'fil' : 'en';
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [preferences?.language, i18n]);

  // ===========================================================================
  // FETCH RECORDS
  // ===========================================================================

  const fetchRecords = useCallback(async (forceRefresh = false) => {
    let mounted = true;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) console.error('[RecordsUsers] auth lookup failed:', authError);

      if (!user) {
        if (mounted) { setCurrentUserId(null); setRecords([]); setLoading(false); setFromCache(false); }
        return;
      }
      if (mounted) setCurrentUserId(user.id);

      if (!forceRefresh) {
        const cached = readCache(user.id);
        if (cached) {
          if (mounted) { setRecords(cached); setFromCache(true); setLoading(false); }
          return;
        }
      } else {
        clearCache(user.id);
      }

      if (mounted) { setFromCache(false); setLoading(true); }

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select(`id, uid, first_name, middle_name, last_name, program, year_level, section, department, home_address, age, sex, preferences`)
        .eq('uid', user.id)
        .single();

      if (userError || !userRow) {
        console.error('[RecordsUsers] user lookup failed:', userError);
        if (mounted) { setRecords([]); setLoading(false); }
        return;
      }

      if (mounted && userRow.preferences) {
        setPreferences({
          language: userRow.preferences.language || 'English',
          dateFormat: userRow.preferences.dateFormat || 'MM/DD/YYYY',
        });
      }

      const internalUserId = userRow.id;
      const userYearLevel = userRow.year_level;
      const userSection = userRow.section;

      const [medicalResult, dentalResult] = await Promise.all([
        supabase.from('medical_records').select('*').eq('user_id', internalUserId).eq('status', 'approved').eq('is_archived', false),
        supabase.from('dental_records').select('*').eq('user_id', internalUserId).eq('status', 'approved').eq('is_archived', false),
      ]);

      if (medicalResult.error) console.error('[RecordsUsers] medical records failed:', medicalResult.error);
      if (dentalResult.error) console.error('[RecordsUsers] dental records failed:', dentalResult.error);

      const medicalRecords = medicalResult.data || [];
      const medDocs = medicalRecords.map((record) => ({
        recordType: 'medical',
        id: record.id,
        approved_at: record.approved_at || record.updated_at || record.created_at,
        created_at: record.created_at,
        updated_at: record.updated_at,
        firstName: record.first_name || userRow.first_name,
        middleName: record.middle_name || userRow.middle_name,
        lastName: record.last_name || userRow.last_name,
        age: record.age ?? userRow.age,
        sex: record.sex ?? userRow.sex,
        address: record.address || userRow.home_address,
        course: userRow.program,
        yearSection: [userRow.year_level, userRow.section].filter(Boolean).join(' - '),
        examDate: record.exam_date,
        physician: record.physician,
        nurseOnDuty: record.nurse_on_duty,
        height: record.height,
        weight: record.weight,
        bmi: record.bmi,
        waist: record.waist,
        lmp: record.lmp,
        vitalRecords: record.vital_records || [],
        labCbc: record.lab_cbc,
        labCbcFacility: record.lab_cbc_facility,
        labCbcDate: record.lab_cbc_date,
        labUa: record.lab_ua,
        labUaFacility: record.lab_ua_facility,
        labUaDate: record.lab_ua_date,
        labXray: record.lab_xray,
        labXrayFacility: record.lab_xray_facility,
        labXrayDate: record.lab_xray_date,
        checkedMedical: record.checked_medical || [],
        checkedFamily: record.checked_family || [],
        checkedHealth: record.checked_health || [],
        smoking: record.smoking,
        smokingDetails: record.smoking_details,
        alcohol: record.alcohol,
        alcoholDetails: record.alcohol_details,
        drugs: record.drugs,
        drugsDetails: record.drugs_details,
        covidHistory: record.covid_history,
        otherMedHistory: record.other_medical_history,
        otherFamilyHistory: record.other_family_history,
        surgicalHistory: [],
        remarks: record.remarks || record.other_medical_history || '',
        finding1: record.finding1 || '',
        isFit: record.is_fit,
        isNormalFindings: record.is_normal_findings,
        issue_cert: record.issue_cert || false,
        certRequested: record.cert_requested || false,
        certRequestedAt: record.cert_requested_at || null,
      }));

      const dentalRecords = dentalResult.data || [];
      const denDocs = dentalRecords.map((record) => ({
        recordType: 'dental',
        id: record.id,
        approved_at: record.approved_at || record.updated_at || record.created_at,
        created_at: record.created_at,
        updated_at: record.updated_at,
        dFirstName: record.first_name || userRow.first_name,
        dMiddleName: record.middle_name || userRow.middle_name,
        dLastName: record.last_name || userRow.last_name,
        dAge: record.age ?? userRow.age,
        dSex: record.sex ?? userRow.sex,
        dCourseYear: shortenCourse(record.course_year) || shortenCourse(userRow.program) || '',
        dAddress: record.address || userRow.home_address,
        dLastVisit: record.last_visit,
        dPrevDentist: record.prev_dentist,
        dExaminedBy: record.examined_by,
        dSigDate: record.sig_date,
        dExamDate: record.exam_date,
        dentalHistory: record.dental_history || {},
        toothData: record.tooth_data || {},
        intraoral: record.intraoral || {},
        issue_cert: record.issue_cert || false,
        certRequested: record.cert_requested || false,
        certRequestedAt: record.cert_requested_at || null,
        dYearLevel: userYearLevel || '',
        dSection: userSection || '',
      }));

      const combined = [...medDocs, ...denDocs].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
      writeCache(user.id, combined);

      if (mounted) { setRecords(combined); setLoading(false); }
    } catch (error) {
      console.error('[RecordsUsers] fetch error:', error);
      if (mounted) setLoading(false);
    }
  }, []);

  // ===========================================================================
  // CERTIFICATE REQUEST
  // ===========================================================================

  const handleRequestCertificate = useCallback(async (record) => {
    if (!record || record.certRequested || requestingId) return;
    setRequestingId(record.id);

    try {
      const table = record.recordType === 'medical' ? 'medical_records' : 'dental_records';
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from(table).update({ cert_requested: true, cert_requested_at: nowIso }).eq('id', record.id);

      if (error) throw error;

      const updatedRecord = { ...record, certRequested: true, certRequestedAt: nowIso };

      setRecords((previous) => {
        const updatedRecords = previous.map((item) => item.id === record.id && item.recordType === record.recordType ? updatedRecord : item);
        if (currentUserId) writeCache(currentUserId, updatedRecords);
        return updatedRecords;
      });
      setSelectedRecord(updatedRecord);
    } catch (error) {
      console.error('[RecordsUsers] request certificate failed:', error);
    } finally {
      setRequestingId(null);
    }
  }, [currentUserId, requestingId]);

  // ===========================================================================
  // PULL TO REFRESH
  // ===========================================================================

  const { scrollElRef, indicatorRef } = usePullToRefresh(async () => {
    await fetchRecords(true);
  });

  // ===========================================================================
  // AUTH LISTENER
  // ===========================================================================

  useEffect(() => {
    let active = true;
    fetchRecords();

    const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        if (currentUserId) clearCache(currentUserId);
        setCurrentUserId(null);
        setRecords([]);
        setSelectedRecord(null);
        setView('list');
        return;
      }
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session?.user) {
        await fetchRecords(true);
      }
    });

    return () => {
      active = false;
      authData.subscription.unsubscribe();
    };
  }, [fetchRecords, currentUserId]);

  // ===========================================================================
  // VIEW CONTROLS
  // ===========================================================================

  const openRecord = useCallback((record) => { setSelectedRecord(record); setView('summary'); }, []);
  const close = useCallback(() => { setSelectedRecord(null); setView('list'); }, []);

  // ===========================================================================
  // FILTERED RECORDS
  // ===========================================================================

  const filteredRecords = useMemo(() => {
    const result = records.filter((record) => {
      if (filter !== 'All' && record.recordType?.toLowerCase() !== filter.toLowerCase()) return false;
      return recordMatchesSearch(record, searchQuery);
    });

    result.sort((a, b) => {
      const dateA = getRecordTimestamp(a);
      const dateB = getRecordTimestamp(b);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [records, filter, searchQuery, sortBy]);

  // ===========================================================================
  // CERTIFICATE DATA
  // ===========================================================================

  const buildExamination = useCallback((record) => ({
    patientName: `${record.lastName || ''}, ${record.firstName || ''}`.trim(),
    age: record.age,
    sex: record.sex,
    address: record.address || '',
    course: record.course || '',
    yearSection: record.yearSection || '',
    examDate: record.examDate,
    remarks: record.remarks || '',
    ...record,
  }), []);

  const buildDentalExamination = useCallback((record) => ({
    patientName: `${record.dLastName || ''}, ${record.dFirstName || ''} ${record.dMiddleName || ''}`.trim(),
    firstName: record.dFirstName || '',
    middleName: record.dMiddleName || '',
    lastName: record.dLastName || '',
    age: record.dAge,
    sex: record.dSex,
    address: record.dAddress || '',
    course: record.dCourseYear || '',
    yearSection: record.dCourseYear || '',
    year: record.dYearLevel || '',
    gradeLevel: record.dYearLevel || '',
    examDate: record.dExamDate || record.dSigDate ? formatUserDate(record.dExamDate || record.dSigDate, preferences) : '',
    dentalHistory: record.dentalHistory || {},
    toothData: record.toothData || {},
    intraoral: record.intraoral || {},
    parentName: '',
    restoration: extractToothConditions(record.toothData || {}, ['caries', 'filled', 'improved']),
    extraction: extractToothConditions(record.toothData || {}, ['extracted', 'root-fragment']),
    treatments: mapDentalProcedures(record.dentalHistory || {}),
    treatmentDetails: {
      orthodontic: record.dentalHistory?.['Orthodontic Therapy'] === 'Yes' ? 'Yes' : '',
      prosthodontic: record.dentalHistory?.['Prosthodontic Therapy'] === 'Yes' ? 'Yes' : '',
      endodontic: record.dentalHistory?.['Endodontic Treatment'] === 'Yes' ? 'Yes' : '',
    },
    familyDentist: record.dPrevDentist || '',
    lastVisit: record.dLastVisit || '',
    examinedBy: record.dExaminedBy || '',
    teethUpper: record.dentalHistory?.teethUpper || '',
    teethLower: record.dentalHistory?.teethLower || '',
    status: { complete: false, notCompleted: false, followUp: '' },
    ...record,
  }), [preferences]);

  // ===========================================================================
  // SELECTED RECORD
  // ===========================================================================

  const rec = selectedRecord;
  const isMedical = rec?.recordType === 'medical';
  const vitals = rec?.vitalRecords?.[0] || {};
  const dentalProceduresDone = !isMedical && rec ? Object.entries(rec.dentalHistory || {}).filter(([, value]) => value === 'Yes').map(([key]) => key) : [];
  const affectedTeeth = !isMedical && rec ? Object.entries(rec.toothData || {}).filter(([, data]) => data?.condition).map(([number, data]) => `Tooth ${number}: ${data.condition.toUpperCase()}${data.operation ? ` (${data.operation})` : ''}`) : [];

  // ===========================================================================
  // COVID DATA
  // ===========================================================================

  let covidData = {};
  if (isMedical && rec?.covidHistory) {
    if (typeof rec.covidHistory === 'string') {
      try { covidData = JSON.parse(rec.covidHistory); } catch { covidData = {}; }
    } else if (typeof rec.covidHistory === 'object') {
      covidData = rec.covidHistory;
    }
  }

  const hasCovidData = Object.keys(covidData).length > 0;
  const tabs = rec ? [{ key: 'summary', label: t('records.summary', 'Summary') }, ...(rec.issue_cert ? [{ key: 'certificate', label: isMedical ? t('records.certificate', 'Certificate') : t('records.report', 'Report') }] : [])] : [];

  // ===========================================================================
  // LOADING
  // ===========================================================================

  if (loading && records.length === 0) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#466460', fontSize: 13, fontWeight: 600 }}>{t('common.loading', 'Loading records...')}</div>;
  }

  // ===========================================================================
  // LIST VIEW
  // ===========================================================================

  if (view === 'list') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <style>{ptrStyles}</style>

        {/* HEADER */}
        <div style={{ flexShrink: 0, padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a2e22', margin: 0 }}>{t('records.healthRecords', 'Health Records')}</h2>
              <p style={{ fontSize: 11, color: '#6b8577', margin: '2px 0 0' }}>{t('records.subtitle', 'Official records and health certifications issued by the clinic.')}</p>
            </div>
          </div>

          {/* SEARCH */}
          <div style={{ position: 'relative', marginBottom: 16, marginTop: 16 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9bb5a5', fontSize: 12 }} />
            <input
              type="text"
              placeholder={t('records.searchPlaceholder', 'Search by name, date (e.g. 2024, Jan 15)...')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 14, fontSize: 12, border: '1px solid #c4dbd8', outline: 'none', background: '#fbfcfc', color: '#1a2e22', boxSizing: 'border-box' }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9bb5a5', cursor: 'pointer', fontSize: 14 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['All', 'Medical', 'Dental'].map((filterName) => (
                <button
                  key={filterName}
                  type="button"
                  onClick={() => setFilter(filterName)}
                  style={{ padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none', background: filter === filterName ? '#466460' : '#e0eceb', color: filter === filterName ? '#fff' : '#466460' }}
                >
                  {t(`records.${filterName.toLowerCase()}`, filterName)}
                </button>
              ))}
            </div>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div ref={scrollElRef} style={{ flex: 1, padding: '0 16px 32px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <PullIndicator indicatorRef={indicatorRef} />

          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9bb5a5' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t('records.noRecords', 'No approved records found.')}</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>{t('records.noRecordsDesc', 'Records will appear here once examinations are finalized.')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRecords.map((record) => (
                <div
                  key={`${record.recordType}-${record.id}`}
                  onClick={() => openRecord(record)}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = '#466460'; event.currentTarget.style.boxShadow = '0 4px 16px rgba(70,100,96,0.12)'; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = '#edf3f0'; event.currentTarget.style.boxShadow = 'none'; }}
                  style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 20, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b8577', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                      {formatDisplayDateWithMonth(record.approved_at || record.created_at, preferences)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2e22', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {record.recordType === 'dental' ? <i className="fa-solid fa-tooth" style={{ color: '#466460' }} /> : <i className="fa-solid fa-stethoscope" style={{ color: '#466460' }} />}
                      {record.recordType === 'dental' ? t('records.dentalExamination', 'Dental Examination') : t('records.medicalExamination', 'Medical Examination')}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b8577', marginTop: 4 }}>
                      {record.recordType === 'dental' ? [record.dCourseYear, record.dYearLevel, record.dSection].filter(Boolean).join(' - ') : fmt(record.course || '')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#e0eceb', color: '#466460', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 30, textTransform: 'uppercase' }}>{t('records.approved', 'Approved')}</span>
                    <div style={{ width: 32, height: 32, background: '#e0eceb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" width="15" height="15"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // DETAIL VIEW
  // ===========================================================================

  if (!rec) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* STICKY TOP BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #edf3f0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={close} style={{ background: '#e0eceb', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#466460' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2e22' }}>{isMedical ? t('records.medicalExamination', 'Medical Examination') : t('records.dentalExamination', 'Dental Examination')}</div>
          <div style={{ fontSize: 10, color: '#6b8577' }}>{formatDisplayDateWithMonth(rec.approved_at || rec.created_at, preferences)}</div>
        </div>
        {tabs.length > 1 && (
          <div style={{ display: 'flex', background: '#f4f7f5', borderRadius: 12, padding: 3, gap: 2 }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                style={{ border: 'none', borderRadius: 9, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: view === key ? '#466460' : 'transparent', color: view === key ? '#fff' : '#6b8577' }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SCROLLABLE DETAIL */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* SUMMARY TAB */}
        {view === 'summary' && (
          <div style={{ padding: '16px 16px 32px' }}>
            {/* APPROVED STATUS */}
            <div style={{ background: 'linear-gradient(135deg, #e0eceb, #f4f7f5)', border: '1px solid #c4dbd8', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: '#466460', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 16 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2e22' }}>{t('records.examApproved', 'Examination Approved')}</div>
                <div style={{ fontSize: 10, color: '#466460', marginTop: 2 }}>{t('records.approvedAt', 'Approved at')} {formatDisplayDateWithMonth(rec.approved_at || rec.created_at, preferences)}</div>
              </div>
            </div>

            {/* MEDICAL DETAILS */}
            {isMedical ? (
              <>
                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.patientInformation', 'Patient Information')} />
                  <InfoRow label={t('common.name', 'Name')} value={`${rec.firstName || ''} ${rec.lastName || ''}`.trim()} />
                  <InfoRow label={t('profile.age', 'Age')} value={rec.age} />
                  <InfoRow label={t('profile.sex', 'Sex')} value={rec.sex} />
                  <InfoRow label={t('profile.address', 'Address')} value={rec.address} />
                  <InfoRow label={t('profile.program', 'Program')} value={rec.course} />
                  <InfoRow label={t('profile.yearLevel', 'Year/Section')} value={rec.yearSection} />
                  <InfoRow label={t('profile.examDate', 'Exam Date')} value={rec.examDate ? formatDisplayDateWithMonth(rec.examDate, preferences) : '—'} />
                  <InfoRow label={t('profile.physician', 'Physician')} value={rec.physician} />
                  <InfoRow label={t('profile.nurseOnDuty', 'Nurse on Duty')} value={rec.nurseOnDuty} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.vitalSigns', 'Vital Signs')} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Blood Pressure', value: vitals.bp, unit: 'mmHg' },
                      { label: 'Pulse Rate', value: vitals.pr, unit: 'bpm' },
                      { label: 'Resp. Rate', value: vitals.rr, unit: 'cpm' },
                      { label: 'Temperature', value: vitals.temp, unit: '°C' },
                      { label: 'Height', value: rec.height, unit: 'cm' },
                      { label: 'Weight', value: rec.weight, unit: 'kg' },
                      { label: 'BMI', value: rec.bmi, unit: 'kg/m²' },
                      { label: 'Waist', value: rec.waist, unit: 'cm' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} style={{ background: '#f4f7f5', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#9bb5a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: value ? '#466460' : '#c4dbd8' }}>{value || '—'}</div>
                        <div style={{ fontSize: 9, color: '#9bb5a5' }}>{unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.laboratoryResults', 'Laboratory Results')} />
                  {[
                    { label: 'CBC', result: rec.labCbc, facility: rec.labCbcFacility, date: rec.labCbcDate },
                    { label: 'Urinalysis', result: rec.labUa, facility: rec.labUaFacility, date: rec.labUaDate },
                    { label: 'Chest X-Ray', result: rec.labXray, facility: rec.labXrayFacility, date: rec.labXrayDate },
                  ].map(({ label, result, facility, date }) => (
                    <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid #edf3f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2e22' }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: result ? '#466460' : '#9bb5a5' }}>{result || '—'}</span>
                      </div>
                      {facility && (
                        <div style={{ fontSize: 10, color: '#9bb5a5', marginTop: 2 }}>
                          {facility} {date ? ` · ${formatDisplayDateWithMonth(date, preferences)}` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.pastMedicalHistory', 'Past Medical History')} />
                  <TagList items={rec.checkedMedical} color="amber" />
                  <SectionHead label={t('records.familyHistory', 'Family History')} />
                  <TagList items={rec.checkedFamily} color="purple" />
                  <SectionHead label={t('records.healthHistory', 'Health History')} />
                  <TagList items={rec.checkedHealth} color="blue" />
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 16 }}>
                  <SectionHead label={t('records.lifestyleHabits', 'Lifestyle & Habits')} />
                  <InfoRow label="Smoking" value={rec.smoking ? `${rec.smoking}${rec.smokingDetails ? ` — ${rec.smokingDetails}` : ''}` : null} />
                  <InfoRow label="Alcohol" value={rec.alcohol ? `${rec.alcohol}${rec.alcoholDetails ? ` — ${rec.alcoholDetails}` : ''}` : null} />
                  <InfoRow label="Drugs" value={rec.drugs ? `${rec.drugs}${rec.drugsDetails ? ` — ${rec.drugsDetails}` : ''}` : null} />
                </div>

                {hasCovidData && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #84cc16', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-syringe" style={{ color: '#84cc16' }} /> {t('records.covidVaccinationHistory', 'COVID-19 VACCINATION HISTORY')}
                    </div>
                    <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 6 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '10px 14px', background: '#f8fafc', color: '#94a3b8', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #f1f5f9' }}>{t('records.dose', 'DOSE')}</th>
                            <th style={{ padding: '10px 14px', background: '#f8fafc', color: '#94a3b8', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #f1f5f9' }}>{t('records.vaccine', 'VACCINE')}</th>
                            <th style={{ padding: '10px 14px', background: '#f8fafc', color: '#94a3b8', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #f1f5f9' }}>{t('records.date', 'DATE')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: t('vaccination.dose1', '1st Dose'), data: covidData.dose1 },
                            { label: t('vaccination.dose2', '2nd Dose'), data: covidData.dose2 },
                            { label: t('vaccination.booster1', 'Booster (1)'), data: covidData.booster1 },
                            { label: t('vaccination.booster2', 'Booster (2)'), data: covidData.booster2 },
                          ].map((row, index, array) => (
                            <tr key={row.label}>
                              <td style={{ padding: '12px 14px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #f1f5f9', fontWeight: 600, color: '#475569' }}>{row.label}</td>
                              <td style={{ padding: '12px 14px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #f1f5f9', color: '#64748b' }}>{row.data?.vaccineName || '—'}</td>
                              <td style={{ padding: '12px 14px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #f1f5f9', color: '#64748b' }}>{row.data?.date ? formatDisplayDateWithMonth(row.data.date, preferences) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {covidData.history && (
                      <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 12 }}>COVID-19 History: {covidData.history}</div>
                    )}
                  </div>
                )}

                {(rec.otherMedHistory || rec.otherFamilyHistory) && (
                  <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <SectionHead label={t('records.additionalHistory', 'Additional History')} />
                    {rec.otherMedHistory && <InfoRow label="Other Medical" value={rec.otherMedHistory} />}
                    {rec.otherFamilyHistory && <InfoRow label="Other Family" value={rec.otherFamilyHistory} />}
                  </div>
                )}

                {(rec.remarks || rec.finding1) && (
                  <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <SectionHead label={t('records.doctorsNote', "Doctor's Note")} />
                    {rec.finding1 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b8577', marginBottom: 4 }}>FINDINGS</div>
                        <p style={{ fontSize: 12, color: '#1a2e22', lineHeight: 1.7, margin: '0 0 12px' }}>{rec.finding1}</p>
                      </>
                    )}
                    {rec.remarks && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b8577', marginBottom: 4 }}>REMARKS & RECOMMENDATIONS</div>
                        <p style={{ fontSize: 12, color: '#1a2e22', lineHeight: 1.7, margin: 0 }}>{rec.remarks}</p>
                      </>
                    )}
                    {rec.isFit !== null && rec.isFit !== undefined && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: rec.isFit ? '#e0eceb' : '#fef2f2', color: rec.isFit ? '#466460' : '#dc2626', border: `1px solid ${rec.isFit ? '#c4dbd8' : '#fecaca'}`, borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 800 }}>
                          {rec.isFit ? `✓ ${t('records.fitForSchool', 'Fit for School Activities')}` : `✗ ${t('records.notFit', 'Not Fit')}`}
                        </span>
                        {rec.isNormalFindings !== null && rec.isNormalFindings !== undefined && (
                          <span style={{ background: rec.isNormalFindings ? '#e0eceb' : '#fff8e1', color: rec.isNormalFindings ? '#466460' : '#b45309', border: `1px solid ${rec.isNormalFindings ? '#c4dbd8' : '#fde68a'}`, borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 800 }}>
                            {rec.isNormalFindings ? `✓ ${t('records.normalFindings', 'Normal Findings')}` : `⚠ ${t('records.abnormalFindings', 'Abnormal Findings')}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {rec.issue_cert ? (
                  <button type="button" onClick={() => setView('certificate')} style={{ width: '100%', background: '#466460', color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}>
                    {t('records.viewMedicalCert', 'View Medical Certificate →')}
                  </button>
                ) : (
                  <RequestCertificateCard requested={rec.certRequested} requestedAt={rec.certRequestedAt} onRequest={() => handleRequestCertificate(rec)} loading={requestingId === rec.id} label={t('records.certificate', 'Medical Certificate')} preferences={preferences} />
                )}
              </>
            ) : (
              /* DENTAL DETAILS */
              <>
                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.patientInformation', 'Patient Information')} />
                  <InfoRow label={t('common.name', 'Name')} value={`${rec.dFirstName || ''} ${rec.dMiddleName || ''} ${rec.dLastName || ''}`.trim()} />
                  <InfoRow label={`${t('profile.age', 'Age')} / ${t('profile.sex', 'Sex')}`} value={`${fmt(rec.dAge)} / ${fmt(rec.dSex)}`} />
                  <InfoRow label={t('profile.yearLevel', 'Course/Year')} value={[rec.dCourseYear, rec.dYearLevel, rec.dSection].filter(Boolean).join(' - ')} />
                  <InfoRow label={t('profile.address', 'Address')} value={rec.dAddress} />
                  <InfoRow label={t('profile.examDate', 'Exam Date')} value={rec.dExamDate || rec.dSigDate ? formatDisplayDateWithMonth(rec.dExamDate || rec.dSigDate, preferences) : '—'} />
                  <InfoRow label="Examined By" value={rec.dExaminedBy} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.dentalHistory', 'Dental History')} />
                  <InfoRow label="Last Visit" value={rec.dLastVisit ? formatDisplayDateWithMonth(rec.dLastVisit, preferences) : '—'} />
                  <InfoRow label="Previous Dentist" value={rec.dPrevDentist ? `Dr. ${rec.dPrevDentist}` : '—'} />
                  <SectionHead label={t('records.proceduresDone', 'Procedures Done')} />
                  <TagList items={dentalProceduresDone} color="blue" />
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.intraoralFindings', 'Intraoral Findings')} />
                  <InfoRow label="Gingiva" value={rec.intraoral?.gingiva} />
                  <InfoRow label="Oral Hygiene" value={rec.intraoral?.oralHygiene} />
                  <InfoRow label="Gingival Color" value={rec.intraoral?.gingivalColor} />
                  <InfoRow label="Occlusion" value={rec.intraoral?.occlusion} />
                  <InfoRow label="Lymph Nodes" value={rec.intraoral?.lymph} />
                  <InfoRow label="Status" value={rec.intraoral?.status} />
                  <InfoRow label="TMJ Exam" value={rec.intraoral?.tmjExam ? t('common.yes', 'Yes') : t('common.no', 'No')} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #edf3f0', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label={t('records.affectedTeethChart', 'Affected Teeth Chart')} />
                  <TagList items={affectedTeeth} color="amber" />
                </div>

                {rec.issue_cert ? (
                  <button type="button" onClick={() => setView('certificate')} style={{ width: '100%', background: '#466460', color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}>
                    {t('records.viewDentalReport', 'View Dental Report →')}
                  </button>
                ) : (
                  <RequestCertificateCard requested={rec.certRequested} requestedAt={rec.certRequestedAt} onRequest={() => handleRequestCertificate(rec)} loading={requestingId === rec.id} label={t('records.report', 'Dental Report')} preferences={preferences} />
                )}
              </>
            )}
          </div>
        )}

        {/* CERTIFICATE/REPORT TABS */}
        {view === 'certificate' && isMedical && (
          <div style={{ padding: '8px 16px 32px' }}>
            <MedicalCertificate examination={buildExamination(rec)} onSubmit={null} onEdit={null} readOnly={true} />
          </div>
        )}

        {view === 'certificate' && !isMedical && (
          <div style={{ padding: '8px 16px 32px' }}>
            <DentalExaminationReport examination={buildDentalExamination(rec)} onSubmit={null} onEdit={null} readOnly={true} />
          </div>
        )}
      </div>
    </div>
  );
}