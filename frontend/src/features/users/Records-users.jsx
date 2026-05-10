// C:\Users\HP\MediTrack\frontend\src\features\users\Records-users.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { MedicalCertificate } from '../../components/MedicalCertificate';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => (!v || v === '') ? '—' : v;

const formatDate = (raw) => {
  if (!raw) return '—';
  // Handle Firestore Timestamp
  if (raw?.toDate) return raw.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  // Handle ISO string
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return raw;
};

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
  const [loading, setLoading]           = useState(true);
  const [records, setRecords]           = useState([]);
  const [filter, setFilter]             = useState('All'); // 'All', 'Medical', 'Dental'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [view, setView]                 = useState('list'); // 'list' | 'summary' | 'certificate'

  // Fetch approved medical AND dental records
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const medRef = collection(db, 'users', user.uid, 'medical_records');
        const denRef = collection(db, 'users', user.uid, 'dental_records');

        // Fetch both concurrently without orderBy to bypass index requirements
        const [medSnap, denSnap] = await Promise.all([
          getDocs(query(medRef, where('status', '==', 'approved'))),
          getDocs(query(denRef, where('status', '==', 'approved')))
        ]);

        const medDocs = medSnap.docs.map(d => ({ id: d.id, recordType: 'medical', ...d.data() }));
        const denDocs = denSnap.docs.map(d => ({ id: d.id, recordType: 'dental', ...d.data() }));

        // Combine and sort by date descending
        const combined = [...medDocs, ...denDocs].sort((a, b) => {
          const timeA = (a.approvedAt || a.createdAt)?.toMillis?.() || 0;
          const timeB = (b.approvedAt || b.createdAt)?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setRecords(combined);
      } catch (err) {
        console.error('[RecordsUsers] fetch error:', err);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openRecord = (rec) => { setSelectedRecord(rec); setView('summary'); };
  const close      = ()    => { setSelectedRecord(null); setView('list'); };

  // Filter logic
  const filteredRecords = records.filter(r => 
    filter === 'All' || r.recordType.toLowerCase() === filter.toLowerCase()
  );

  // Build object for MedicalCertificate
  const buildExamination = (rec) => ({
    patientName:  `${rec.lastName || ''}, ${rec.firstName || ''}`,
    age:          rec.age,
    sex:          rec.sex    || rec.gender,
    address:      rec.address || rec.homeAddress || '',
    course:       rec.course  || rec.program || '',
    yearSection:  rec.yearSection || [rec.yearLevel || rec.year, rec.section].filter(Boolean).join(' - '),
    examDate:     rec.examDate,
    remarks:      rec.remarks || '',
    ...rec,
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a5c3a', fontSize: 13, fontWeight: 600 }}>
        Loading records...
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={{ padding: '20px 16px 32px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a2e22', margin: '0 0 4px' }}>Health Records</h2>
        <p style={{ fontSize: 11, color: '#6b8577', margin: '0 0 16px' }}>Official records and health certifications issued by the clinic.</p>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['All', 'Medical', 'Dental'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                background: filter === f ? '#1a5c3a' : '#e8f5ee',
                color: filter === f ? '#fff' : '#1a5c3a',
              }}
            >
              {f}
            </button>
          ))}
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
                    {formatDate(rec.approvedAt || rec.createdAt)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2e22', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {rec.recordType === 'dental' ? <i className="fa-solid fa-tooth text-[#466460]"></i> : <i className="fa-solid fa-stethoscope text-[#466460]"></i>}
                    {rec.recordType === 'dental' ? 'Dental Examination' : 'Medical Examination'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b8577', marginTop: 4 }}>
                    {fmt(rec.course || rec.dCourseYear || rec.program)}
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
    );
  }

  // ── Detail views (summary + certificate) ─────────────────────────────────
  const rec = selectedRecord;
  if (!rec) return null;

  const isMedical = rec.recordType === 'medical';
  const vitals = rec.vitalRecords?.[0] || {};
  
  // Format dental procedures mapping to an array of "Yes" responses
  const dentalProceduresDone = isMedical ? [] : Object.entries(rec.dentalHistory || {})
    .filter(([_, value]) => value === 'Yes')
    .map(([key]) => key);

  // Format affected teeth to an array
  const affectedTeeth = isMedical ? [] : Object.entries(rec.toothData || {})
    .filter(([_, data]) => data.condition)
    .map(([num, data]) => `Tooth ${num}: ${data.condition.toUpperCase()} ${data.operation ? `(${data.operation})` : ''}`);

  // Determine available tabs
  const tabs = [{ key: 'summary', label: 'Summary' }];
  if (isMedical) {
    tabs.push({ key: 'certificate', label: 'Certificate' });
  }

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
          <div style={{ fontSize: 10, color: '#6b8577' }}>{formatDate(rec.approvedAt || rec.createdAt)}</div>
        </div>
        
        {/* Tab toggle (Only show if there are multiple tabs) */}
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
                  color: view === key ? '#fff' : '#6b8577',
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

            {/* Status banner */}
            <div style={{ background: 'linear-gradient(135deg, #e8f5ee, #f0fbf4)', border: '1px solid #b6e8c8', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: '#1a5c3a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 16 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2e22' }}>Examination Approved</div>
                <div style={{ fontSize: 10, color: '#2d7a52', marginTop: 2 }}>Recorded on {formatDate(rec.approvedAt || rec.createdAt)}</div>
              </div>
            </div>

            {/* ── MEDICAL SUMMARY ── */}
            {isMedical ? (
              <>
                {/* Patient Info */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Patient Information" />
                  <InfoRow label="Name"         value={`${rec.firstName || ''} ${rec.lastName || ''}`.trim()} />
                  <InfoRow label="Age"          value={rec.age} />
                  <InfoRow label="Sex"          value={rec.sex || rec.gender} />
                  <InfoRow label="Address"      value={rec.address || rec.homeAddress} />
                  <InfoRow label="Program"      value={rec.course || rec.program} />
                  <InfoRow label="Year/Section" value={rec.yearSection || rec.yearLevel} />
                  <InfoRow label="Exam Date"    value={formatDate(rec.examDate)} />
                </div>

                {/* Vitals */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Vital Signs" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Blood Pressure', value: vitals.bp,   unit: 'mmHg' },
                      { label: 'Pulse Rate',     value: vitals.pr,   unit: 'bpm'  },
                      { label: 'Resp. Rate',     value: vitals.rr,   unit: 'cpm'  },
                      { label: 'Temperature',    value: vitals.temp, unit: '°C'   },
                      { label: 'Height',         value: rec.height,  unit: 'cm'   },
                      { label: 'Weight',         value: rec.weight,  unit: 'kg'   },
                      { label: 'BMI',            value: rec.bmi,     unit: 'kg/m²'},
                      { label: 'Waist',          value: rec.waist,   unit: 'cm'   },
                    ].map(({ label, value, unit }) => (
                      <div key={label} style={{ background: '#f4f7f5', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#9bb5a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: value ? '#1a5c3a' : '#c4d9ce' }}>{value || '—'}</div>
                        <div style={{ fontSize: 9, color: '#9bb5a5' }}>{unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lab Results */}
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
                      {facility && <div style={{ fontSize: 10, color: '#9bb5a5', marginTop: 2 }}>{facility}{date ? ` · ${formatDate(date)}` : ''}</div>}
                    </div>
                  ))}
                </div>

                {/* Medical History */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Past Medical History" />
                  <TagList items={rec.checkedMedical} color="amber" />

                  <SectionHead label="Family History" />
                  <TagList items={rec.checkedFamily} color="purple" />

                  <SectionHead label="Surgical History" />
                  <TagList items={rec.surgicalHistory?.map(s => `${s.operation} (${s.date})`)} color="blue" />
                </div>

                {/* Remarks */}
                {rec.remarks && (
                  <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <SectionHead label="Remarks & Recommendations" />
                    <p style={{ fontSize: 12, color: '#1a2e22', lineHeight: 1.7, margin: 0 }}>{rec.remarks}</p>
                  </div>
                )}

                {/* CTA to certificate */}
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
                {/* Dental Patient Info */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Patient Information" />
                  <InfoRow label="Name"         value={`${rec.dFirstName || ''} ${rec.dLastName || ''}`.trim()} />
                  <InfoRow label="Age / Sex"    value={`${fmt(rec.dAge)} / ${fmt(rec.dSex)}`} />
                  <InfoRow label="Course/Year"  value={rec.dCourseYear} />
                  <InfoRow label="Address"      value={rec.dAddress} />
                  <InfoRow label="Exam Date"    value={formatDate(rec.dSigDate)} />
                  <InfoRow label="Examined By"  value={rec.dExaminedBy} />
                </div>

                {/* Dental History & Procedures */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Dental History" />
                  <InfoRow label="Last Visit"       value={formatDate(rec.dLastVisit)} />
                  <InfoRow label="Previous Dentist" value={rec.dPrevDentist ? `Dr. ${rec.dPrevDentist}` : '—'} />
                  
                  <SectionHead label="Procedures Done" />
                  <TagList items={dentalProceduresDone} color="blue" />
                </div>

                {/* Intraoral Findings */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Intraoral Findings" />
                  <InfoRow label="Gingiva"       value={rec.intraoral?.gingiva} />
                  <InfoRow label="Oral Hygiene"  value={rec.intraoral?.oralHygiene} />
                  <InfoRow label="Gingival Color" value={rec.intraoral?.gingivalColor} />
                  <InfoRow label="Occlusion"     value={rec.intraoral?.occlusion} />
                  <InfoRow label="Lymph Nodes"   value={rec.intraoral?.lymph} />
                  <InfoRow label="Status"        value={rec.intraoral?.status} />
                  <InfoRow label="TMJ Exam"      value={rec.intraoral?.tmjExam ? 'Yes' : 'No'} />
                </div>

                {/* Affected Teeth */}
                <div style={{ background: '#fff', border: '1px solid #ddeee5', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <SectionHead label="Affected Teeth Chart" />
                  <TagList items={affectedTeeth} color="amber" />
                </div>
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
      </div>
    </div>
  );
}