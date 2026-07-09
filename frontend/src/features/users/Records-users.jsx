// C:\Users\HP\MediTrack\frontend\src\features\users\Records-users.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { MedicalCertificate } from '../../components/MedicalCertificate';
import { DentalExaminationReport } from '../../components/DentalExaminationReport';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// ── Cache helpers ─────────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'meditrack_records_';
const CACHE_TTL_MS     = 5 * 60 * 1000; // 5 minutes

const readCache = (userId) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(CACHE_KEY_PREFIX + userId); return null; }
    return data;
  } catch { return null; }
};

const writeCache = (userId, data) => {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify({
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }));
  } catch { /* storage full — silently skip */ }
};

const clearCache = (userId) => {
  try { localStorage.removeItem(CACHE_KEY_PREFIX + userId); } catch { /* ignore */ }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => (!v || v === '') ? '—' : v;

const formatDate = (raw) => {
  if (!raw) return '—';
  if (raw?.toDate) return raw.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return raw;
};

// ── PTR spinner keyframe ──────────────────────────────────────────────────────
const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

// ── Pull-to-Refresh Indicator ─────────────────────────────────────────────────
const PullIndicator = ({ indicatorRef }) => (
  <div
    ref={indicatorRef}
    data-spin="false"
    style={{
      overflow:       'hidden',
      height:         0,
      opacity:        0,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      transition:     'height 0.2s ease, opacity 0.2s ease',
    }}
  >
    {/* Arrow */}
    <svg
      data-ptr-icon
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>

    {/* Spinner */}
    <svg
      data-ptr-spin
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      style={{ animation: 'ptr-spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

// ── Sub-components ────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid #e2f0ea' }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b8577', flexShrink: 0, marginRight: 12 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2e22', textAlign: 'right' }}>{fmt(value)}</span>
  </div>
);

const SectionHead = ({ label }) => (
  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', borderLeft: '3px solid #34c472', paddingLeft: 8, marginBottom: 10, marginTop: 18 }}>
    {label}
  </div>
);

const TagList = ({ items, color }) => {
  if (!items || items.length === 0) return <span style={{ fontSize: 11, color: '#9bb5a5', fontStyle: 'italic' }}>None recorded</span>;
  const colors = {
    amber:  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    purple: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    blue:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    slate:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  }[color] || { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
          {item}
        </span>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function RecordsUsers() {
  const [loading, setLoading]               = useState(true);
  const [fromCache, setFromCache]           = useState(false);
  const [records, setRecords]               = useState([]);
  const [filter, setFilter]                 = useState('All');
  const [sortBy, setSortBy]                 = useState('newest');
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [view, setView]                     = useState('list');
  const [currentUserId, setCurrentUserId]   = useState(null);

  // ── Extracted fetch logic ───────────────────────────────────────────────────
  const fetchRecords = useCallback(async (forceRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setCurrentUserId(user.id);

      // Try cache first unless forced
      if (!forceRefresh) {
        const cached = readCache(user.id);
        if (cached) {
          setRecords(cached);
          setFromCache(true);
          setLoading(false);
          return;
        }
      } else {
        clearCache(user.id);
      }

      setFromCache(false);
      setLoading(true); // Show loading state briefly if forcing a fresh pull

      // Cache miss: fetch from Supabase
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, program, year_level, section, department, home_address, age, sex')
        .eq('uid', user.id)
        .single();

      if (userErr || !userRow) {
        console.error('[RecordsUsers] user lookup failed:', userErr);
        setLoading(false);
        return;
      }

      const internalUserId = userRow.id;

      const [medRes, denRes] = await Promise.all([
        supabase.from('medical_records').select('*').eq('user_id', internalUserId).eq('status', 'approved'),
        supabase.from('dental_records').select('*').eq('user_id', internalUserId).eq('status', 'approved'),
      ]);

      // Medical mapping
      const medDocs = (medRes.data || []).map(d => ({
        recordType:      'medical',
        id:              d.id,
        approved_at:     d.approved_at || d.updated_at || d.created_at,
        created_at:      d.created_at,
        firstName:       d.first_name  || userRow.first_name,
        lastName:        d.last_name   || userRow.last_name,
        age:             d.age         || userRow.age,
        sex:             d.sex         || userRow.sex,
        address:         d.address     || userRow.home_address,
        course:          userRow.program,
        yearSection:     [userRow.year_level, userRow.section].filter(Boolean).join(' - '),
        examDate:        d.exam_date,
        physician:       d.physician,
        nurseOnDuty:     d.nurse_on_duty,
        height:          d.height,
        weight:          d.weight,
        bmi:             d.bmi,
        waist:           d.waist,
        lmp:             d.lmp,
        vitalRecords:    d.vital_records   || [],
        labCbc:          d.lab_cbc,
        labCbcFacility:  d.lab_cbc_facility,
        labCbcDate:      d.lab_cbc_date,
        labUa:           d.lab_ua,
        labUaFacility:   d.lab_ua_facility,
        labUaDate:       d.lab_ua_date,
        labXray:         d.lab_xray,
        labXrayFacility: d.lab_xray_facility,
        labXrayDate:     d.lab_xray_date,
        checkedMedical:  d.checked_medical  || [],
        checkedFamily:   d.checked_family   || [],
        checkedHealth:   d.checked_health   || [],
        smoking:         d.smoking,
        smokingDetails:  d.smoking_details,
        alcohol:         d.alcohol,
        alcoholDetails:  d.alcohol_details,
        drugs:           d.drugs,
        drugsDetails:    d.drugs_details,
        covidHistory:       d.covid_history,
        otherMedHistory:    d.other_medical_history,
        otherFamilyHistory: d.other_family_history,
        surgicalHistory: [],
        remarks:         d.remarks || d.other_medical_history || '',
        finding1:        d.finding1 || '',
        isFit:           d.is_fit,
        isNormalFindings: d.is_normal_findings,
      }));

      // Dental mapping
      const denDocs = (denRes.data || []).map(d => ({
        recordType:    'dental',
        id:            d.id,
        approved_at:   d.approved_at || d.created_at,
        created_at:    d.created_at,
        dFirstName:    d.first_name,
        dMiddleName:   d.middle_name,
        dLastName:     d.last_name,
        dAge:          d.age,
        dSex:          d.sex,
        dCourseYear:   d.course_year,
        dAddress:      d.address,
        dLastVisit:    d.last_visit,
        dPrevDentist:  d.prev_dentist,
        dExaminedBy:   d.examined_by,
        dSigDate:      d.sig_date,
        dExamDate:     d.exam_date,
        dentalHistory: d.dental_history || {},
        toothData:     d.tooth_data     || {},
        intraoral:     d.intraoral      || {},
      }));

      const combined = [...medDocs, ...denDocs].sort((a, b) => {
        const timeA = new Date(a.approved_at || a.created_at).getTime() || 0;
        const timeB = new Date(b.approved_at || b.created_at).getTime() || 0;
        return timeB - timeA;
      });

      // Save to cache
      writeCache(user.id, combined);
      setRecords(combined);
    } catch (err) {
      console.error('[RecordsUsers] fetch error:', err);
    }
    setLoading(false);
  }, []);

  // ── Pull-to-refresh hook ────────────────────────────────────────────────────
  const { scrollElRef, indicatorRef } = usePullToRefresh(async () => {
    await fetchRecords(true);
  });

  useEffect(() => {
    fetchRecords();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && currentUserId) clearCache(currentUserId);
      fetchRecords(true);
    });
    return () => subscription.unsubscribe();
  }, [fetchRecords, currentUserId]);

  const openRecord = (rec) => { setSelectedRecord(rec); setView('summary'); };
  const close      = ()    => { setSelectedRecord(null); setView('list'); };

  // Helper to format date for search comparison
  // Helper to parse and format date for flexible search
  const getDateSearchString = (dateStr) => {
    if (!dateStr) return '';

    // Start with the raw string (lowercase)
    let searchStr = dateStr.toLowerCase().replace(/,/g, '').trim();

    // Try to parse and add more formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthShort = monthNames[date.getMonth()];
      const monthFull = date.toLocaleDateString('en-US', { month: 'long' });

      // Add all format variations
      searchStr += ' ' + [
        String(yyyy),
        `${mm}/${dd}/${yyyy}`,
        `${mm}-${dd}-${yyyy}`,
        `${dd}/${mm}/${yyyy}`,
        `${monthFull} ${dd} ${yyyy}`,
        `${monthShort} ${dd} ${yyyy}`,
        `${monthFull} ${dd}`,
        `${monthShort} ${dd}`,
        `${mm}/${dd}`,
        `${dd}/${mm}`,
        `${monthFull}`,
        `${monthShort}`,
      ].join(' ').toLowerCase();
    }

    return searchStr;
  };

  const filteredRecords = records
    .filter(r => {
      // Filter by category
      if (filter !== 'All' && r.recordType.toLowerCase() !== filter.toLowerCase()) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().replace(/,/g, '').trim();

        // Search in record type
        if (r.recordType?.toLowerCase().includes(query)) return true;

        // Search in patient name (various name fields)
        const patientName = [
          r.lastName, r.firstName, r.middleName,
          r.dLastName, r.dFirstName, r.dMiddleName,
          r.dLastName + ' ' + r.dFirstName,
          r.lastName + ' ' + r.firstName
        ].filter(Boolean).map(n => n.toLowerCase()).join(' ');

        if (patientName.includes(query)) return true;

        // Search in all possible date fields
        const dateFields = [
          r.created_at, r.updated_at, r.approved_at,
          r.examDate, r.exam_date,
          r.dExamDate, r.dSigDate,
          r.labCbcDate, r.labCbc_date,
          r.labUaDate, r.labUa_date,
          r.labXrayDate, r.labXray_date,
        ].filter(Boolean);
        const dateSearch = dateFields.some(d => {
          if (!d) return false;
          const searchStr = getDateSearchString(d);
          // Direct include check
          if (searchStr.includes(query)) return true;
          // Check if query parts match (e.g., "july 6" matches "july" and "6")
          const queryParts = query.split(' ').filter(p => p.length > 0);
          return queryParts.every(part => searchStr.includes(part));
        });

        if (dateSearch) return true;

        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.examDate || 0);
      const dateB = new Date(b.created_at || b.examDate || 0);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const buildExamination = (rec) => ({
    patientName:  `${rec.lastName || ''}, ${rec.firstName || ''}`,
    age:          rec.age,
    sex:          rec.sex,
    address:      rec.address || '',
    course:       rec.course  || '',
    yearSection:  rec.yearSection || '',
    examDate:     rec.examDate,
    remarks:      rec.remarks || '',
    ...rec,
  });

  const buildDentalExamination = (rec) => ({
    patientName:  `${rec.dLastName || ''}, ${rec.dFirstName || ''}`,
    firstName:    rec.dFirstName || '',
    middleName:  rec.dMiddleName || '',
    lastName:     rec.dLastName || '',
    age:          rec.dAge,
    sex:          rec.dSex,
    address:      rec.dAddress || '',
    course:       rec.dCourseYear || '',
    yearSection:  rec.dCourseYear || '',
    examDate:     formatDateClean(rec.dExamDate || rec.dSigDate),
    // Pass JSONB fields directly
    dentalHistory: rec.dentalHistory || {},
    toothData:     rec.toothData || {},
    intraoral:     rec.intraoral || {},
    // Map to DentalExaminationReport expected fields
    parentName:   '', // Parent name would need to be collected during exam
    restoration:  extractToothConditions(rec.toothData || {}, ['caries', 'filled', 'improved']),
    extraction:   extractToothConditions(rec.toothData || {}, ['extracted', 'root-fragment']),
    treatments:  mapDentalProcedures(rec.dentalHistory || {}),
    treatmentDetails: {
      orthodontic: rec.dentalHistory?.['Orthodontic Therapy'] === 'Yes' ? 'Yes' : '',
      prosthodontic: rec.dentalHistory?.['Prosthodontic Therapy'] === 'Yes' ? 'Yes' : '',
      endodontic: rec.dentalHistory?.['Endodontic Treatment'] === 'Yes' ? 'Yes' : '',
    },
    familyDentist: rec.dPrevDentist || '',
    lastVisit: rec.dLastVisit || '',
    examinedBy: rec.dExaminedBy || '',
    teethUpper: rec.dentalHistory?.teethUpper || '',
    teethLower: rec.dentalHistory?.teethLower || '',
    status: { complete: false, notCompleted: false, followUp: '' },
    ...rec,
  });

  // Helper to format date cleanly (Year Month Day)
  const formatDateClean = (dateStr) => {
    if (!dateStr) return '';
    // Handle ISO date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
      .filter(([, data]) => data?.condition && conditions.includes(data.condition))
      .map(([num, data]) => `Tooth #${num}: ${conditionLabels[data.condition] || data.condition}${data.operation ? ' (' + data.operation + ')' : ''}`);
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
      xray: false, // Not in the current form
      fluoride: dentalHistory['Fluoride Treatment'] === 'Yes' || dentalHistory['Fluoride'] === 'Yes',
      sealant: dentalHistory['Sealant'] === 'Yes',
    };
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && records.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a5c3a', fontSize: 13, fontWeight: 600 }}>
        Loading records...
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <style>{ptrStyles}</style>

        {/* This is the scrollable container.
          The PTR hook tracks scroll events on this element.
        */}
        <div
          ref={scrollElRef}
          style={{ flex: 1, padding: '20px 16px 32px', overflowY: 'auto', scrollbarWidth: 'none' }}
        >
          <PullIndicator indicatorRef={indicatorRef} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a2e22', margin: 0 }}>Health Records</h2>
              <p style={{ fontSize: 11, color: '#6b8577', margin: '2px 0 0' }}>Official records and health certifications issued by the clinic.</p>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: 16, marginTop: 16 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9bb5a5', fontSize: 12 }}></i>
            <input
              type="text"
              placeholder="Search by name, date (e.g. 2024, Jan 15, 01/15/2024)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 38px', borderRadius: 14, fontSize: 12,
                border: '1px solid #ddeee5', outline: 'none', background: '#fff',
                color: '#1a2e22', boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#9bb5a5', cursor: 'pointer', fontSize: 14,
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['All', 'Medical', 'Dental'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                    background: filter === f ? '#1a5c3a' : '#e8f5ee',
                    color:      filter === f ? '#fff'     : '#1a5c3a',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                border: '1px solid #ddeee5', background: '#fff', color: '#1a5c3a',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9bb5a5' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No approved records found.</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Records will appear here once examinations are finalized.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => openRecord(rec)}
                  style={{
                    background: '#fff', border: '1px solid #ddeee5', borderRadius: 20,
                    padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#34c472'; e.currentTarget.style.boxShadow = '0 4px 16px #34c47220'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddeee5'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b8577', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                      {formatDate(rec.approved_at || rec.created_at)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2e22', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {rec.recordType === 'dental'
                        ? <i className="fa-solid fa-tooth" style={{ color: '#466460' }}></i>
                        : <i className="fa-solid fa-stethoscope" style={{ color: '#466460' }}></i>}
                      {rec.recordType === 'dental' ? 'Dental Examination' : 'Medical Examination'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b8577', marginTop: 4 }}>
                      {fmt(rec.course || rec.dCourseYear)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#e8f5ee', color: '#1a5c3a', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 30, textTransform: 'uppercase' }}>
                      Approved
                    </span>
                    <div style={{ width: 32, height: 32, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2" width="15" height="15">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
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

  // ── Detail views ──────────────────────────────────────────────────────────
  const rec = selectedRecord;
  if (!rec) return null;

  const isMedical = rec.recordType === 'medical';
  const vitals    = rec.vitalRecords?.[0] || {};

  const dentalProceduresDone = isMedical ? [] : Object.entries(rec.dentalHistory || {})
    .filter(([, value]) => value === 'Yes')
    .map(([key]) => key);

  const affectedTeeth = isMedical ? [] : Object.entries(rec.toothData || {})
    .filter(([, data]) => data.condition)
    .map(([num, data]) => `Tooth ${num}: ${data.condition.toUpperCase()}${data.operation ? ` (${data.operation})` : ''}`);

  const tabs = [{ key: 'summary', label: 'Summary' }];
  if (isMedical) tabs.push({ key: 'certificate', label: 'Certificate' });
  if (!isMedical) tabs.push({ key: 'certificate', label: 'Certificate' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sticky top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddeee5', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={close}
          style={{ background: '#e8f5ee', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a5c3a' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2e22' }}>
            {isMedical ? 'Medical Examination' : 'Dental Examination'}
          </div>
          <div style={{ fontSize: 10, color: '#6b8577' }}>
            {formatDate(rec.approved_at || rec.created_at)}
          </div>
        </div>

        {tabs.length > 1 && (
          <div style={{ display: 'flex', background: '#f4f7f5', borderRadius: 12, padding: 3, gap: 2 }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  border: 'none', borderRadius: 9, padding: '6px 14px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: view === key ? '#1a5c3a' : 'transparent',
                  color:      view === key ? '#fff'     : '#6b8577',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* ── SUMMARY TAB ── */}
        {view === 'summary' && (
          <div style={{ padding: '16px 16px 32px' }}>

            <div style={{ background: 'linear-gradient(135deg, #e8f5ee, #f0fbf4)', border: '1px solid #b6e8c8', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: '#1a5c3a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 16 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2e22' }}>Examination Approved</div>
                <div style={{ fontSize: 10, color: '#2d7a52', marginTop: 2 }}>
                  Recorded on {formatDate(rec.approved_at || rec.created_at)}
                </div>
              </div>
            </div>

            {/* ── MEDICAL SUMMARY ── */}
            {isMedical ? (
              <>
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Patient Information" />
                  <InfoRow label="Name"         value={`${rec.firstName || ''} ${rec.lastName || ''}`.trim()} />
                  <InfoRow label="Age"          value={rec.age} />
                  <InfoRow label="Sex"          value={rec.sex} />
                  <InfoRow label="Address"      value={rec.address} />
                  <InfoRow label="Program"      value={rec.course} />
                  <InfoRow label="Year/Section" value={rec.yearSection} />
                  <InfoRow label="Exam Date"    value={formatDate(rec.examDate)} />
                  <InfoRow label="Physician"    value={rec.physician} />
                  <InfoRow label="Nurse on Duty" value={rec.nurseOnDuty} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Vital Signs" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Blood Pressure', value: vitals.bp,   unit: 'mmHg'  },
                      { label: 'Pulse Rate',     value: vitals.pr,   unit: 'bpm'   },
                      { label: 'Resp. Rate',     value: vitals.rr,   unit: 'cpm'   },
                      { label: 'Temperature',    value: vitals.temp, unit: '°C'    },
                      { label: 'Height',         value: rec.height,  unit: 'cm'    },
                      { label: 'Weight',         value: rec.weight,  unit: 'kg'    },
                      { label: 'BMI',            value: rec.bmi,     unit: 'kg/m²' },
                      { label: 'Waist',          value: rec.waist,   unit: 'cm'    },
                    ].map(({ label, value, unit }) => (
                      <div key={label} style={{ background: '#f4f7f5', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#9bb5a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: value ? '#1a5c3a' : '#c4d9ce' }}>{value || '—'}</div>
                        <div style={{ fontSize: 9, color: '#9bb5a5' }}>{unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Laboratory Results" />
                  {[
                    { label: 'CBC',         result: rec.labCbc,  facility: rec.labCbcFacility,  date: rec.labCbcDate  },
                    { label: 'Urinalysis',  result: rec.labUa,   facility: rec.labUaFacility,   date: rec.labUaDate   },
                    { label: 'Chest X-Ray', result: rec.labXray, facility: rec.labXrayFacility, date: rec.labXrayDate },
                  ].map(({ label, result, facility, date }) => (
                    <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid #e2f0ea' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2e22' }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: result ? '#1a5c3a' : '#9bb5a5' }}>{result || '—'}</span>
                      </div>
                      {facility && (
                        <div style={{ fontSize: 10, color: '#9bb5a5', marginTop: 2 }}>
                          {facility}{date ? ` · ${formatDate(date)}` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Past Medical History" />
                  <TagList items={rec.checkedMedical} color="amber" />
                  <SectionHead label="Family History" />
                  <TagList items={rec.checkedFamily} color="purple" />
                  <SectionHead label="Health History" />
                  <TagList items={rec.checkedHealth} color="blue" />
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Lifestyle & Habits" />
                  <InfoRow label="Smoking" value={rec.smoking ? `${rec.smoking}${rec.smokingDetails ? ` — ${rec.smokingDetails}` : ''}` : null} />
                  <InfoRow label="Alcohol"  value={rec.alcohol  ? `${rec.alcohol}${rec.alcoholDetails   ? ` — ${rec.alcoholDetails}`   : ''}` : null} />
                  <InfoRow label="Drugs"    value={rec.drugs    ? `${rec.drugs}${rec.drugsDetails       ? ` — ${rec.drugsDetails}`     : ''}` : null} />
                </div>

                {(rec.covidHistory || rec.otherMedHistory || rec.otherFamilyHistory) && (
                  <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <SectionHead label="Additional History" />
                    {rec.covidHistory       && <InfoRow label="COVID History" value={rec.covidHistory} />}
                    {rec.otherMedHistory    && <InfoRow label="Other Medical" value={rec.otherMedHistory} />}
                    {rec.otherFamilyHistory && <InfoRow label="Other Family"  value={rec.otherFamilyHistory} />}
                  </div>
                )}

                {/* Doctor's Note */}
                {(rec.remarks || rec.finding1) && (
                  <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <SectionHead label="Doctor's Note" />
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
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <span style={{
                          background: rec.isFit ? '#e8f5ee' : '#fef2f2',
                          color: rec.isFit ? '#1a5c3a' : '#dc2626',
                          border: `1px solid ${rec.isFit ? '#b6e8c8' : '#fecaca'}`,
                          borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 800,
                        }}>
                          {rec.isFit ? '✓ Fit for School Activities' : '✗ Not Fit'}
                        </span>
                        {rec.isNormalFindings !== null && rec.isNormalFindings !== undefined && (
                          <span style={{
                            background: rec.isNormalFindings ? '#e8f5ee' : '#fff8e1',
                            color: rec.isNormalFindings ? '#1a5c3a' : '#b45309',
                            border: `1px solid ${rec.isNormalFindings ? '#b6e8c8' : '#fde68a'}`,
                            borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 800,
                          }}>
                            {rec.isNormalFindings ? '✓ Normal Findings' : '⚠ Abnormal Findings'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setView('certificate')}
                  style={{ width: '100%', background: '#1a5c3a', color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
                >
                  View Medical Certificate →
                </button>
              </>
            ) : (

              /* ── DENTAL SUMMARY ── */
              <>
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Patient Information" />
                  <InfoRow label="Name"         value={`${rec.dFirstName || ''} ${rec.dLastName || ''}`.trim()} />
                  <InfoRow label="Age / Sex"    value={`${fmt(rec.dAge)} / ${fmt(rec.dSex)}`} />
                  <InfoRow label="Course/Year"  value={rec.dCourseYear} />
                  <InfoRow label="Address"      value={rec.dAddress} />
                  <InfoRow label="Exam Date"    value={formatDate(rec.dExamDate || rec.dSigDate)} />
                  <InfoRow label="Examined By"  value={rec.dExaminedBy} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Dental History" />
                  <InfoRow label="Last Visit"       value={formatDate(rec.dLastVisit)} />
                  <InfoRow label="Previous Dentist" value={rec.dPrevDentist ? `Dr. ${rec.dPrevDentist}` : '—'} />
                  <SectionHead label="Procedures Done" />
                  <TagList items={dentalProceduresDone} color="blue" />
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Intraoral Findings" />
                  <InfoRow label="Gingiva"        value={rec.intraoral?.gingiva} />
                  <InfoRow label="Oral Hygiene"   value={rec.intraoral?.oralHygiene} />
                  <InfoRow label="Gingival Color" value={rec.intraoral?.gingivalColor} />
                  <InfoRow label="Occlusion"      value={rec.intraoral?.occlusion} />
                  <InfoRow label="Lymph Nodes"    value={rec.intraoral?.lymph} />
                  <InfoRow label="Status"         value={rec.intraoral?.status} />
                  <InfoRow label="TMJ Exam"       value={rec.intraoral?.tmjExam ? 'Yes' : 'No'} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Affected Teeth Chart" />
                  <TagList items={affectedTeeth} color="amber" />
                </div>

                <button
                  onClick={() => setView('certificate')}
                  style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
                >
                  View Dental Certificate →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CERTIFICATE TAB (Medical Only) ── */}
        {view === 'certificate' && isMedical && (
          <div style={{ padding: '8px 16px 32px' }}>
            <MedicalCertificate
              examination={buildExamination(rec)}
              onSubmit={null}
              onEdit={null}
              readOnly={true}
            />
          </div>
        )}

        {/* ── CERTIFICATE TAB (Dental) ── */}
        {view === 'certificate' && !isMedical && (
          <div style={{ padding: '8px 16px 32px' }}>
            <DentalExaminationReport
              examination={buildDentalExamination(rec)}
              onSubmit={null}
              onEdit={null}
              readOnly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}