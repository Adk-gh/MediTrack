// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Consultations.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import * as consultationsService from '../../services/consultations.service';

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Linkify: Converts URLs in text to clickable links ────────────────────────
const LinkifiedText = ({ text, isPatient = false }) => {
  // Regex to match URLs (including Google Meet links)
  const urlRegex = /(https?:\/\/[^\s<]+)/g;

  // Link color based on sender
  const linkColor = isPatient ? '#a8d5ba' : '#60a5fa';
  const linkHoverColor = isPatient ? '#c8e6cf' : '#93c5fd';

  if (!text) return null;

  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    // No URLs found, just return text with preserved newlines
    const lines = text.split('\n');
    return (
      <span>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          // This is a URL
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all hover:opacity-80"
              style={{ color: linkColor }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        // Regular text - preserve newlines
        const lines = part.split('\n');
        return (
          <React.Fragment key={i}>
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </span>
  );
};

const getRoleClass = (role) => {
  if (!role) return 'bg-slate-100 text-slate-600';
  const r = role.toLowerCase();
  if (r === 'student') return 'bg-blue-100 text-blue-700';
  if (r === 'instructor' || r === 'faculty') return 'bg-purple-100 text-purple-700';
  return 'bg-green-100 text-green-700';
};

// Gender icon helper
const getGenderIcon = (sex) => {
  if (!sex) return null;
  const s = sex.toLowerCase();
  if (s === 'male') {
    return <span className="text-blue-500" title="Male">♂</span>;
  }
  if (s === 'female') {
    return <span className="text-pink-500" title="Female">♀</span>;
  }
  return null;
};

// Full name helper - builds full name from users table fields
const getFullName = (profile) => {
  if (!profile) return 'Unknown';
  const parts = [];
  if (profile.first_name) parts.push(profile.first_name);
  if (profile.middle_name) parts.push(profile.middle_name);
  if (profile.last_name) parts.push(profile.last_name);
  if (profile.suffix) parts.push(profile.suffix);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
};

// Format name for list display (Last, First Middle)
const formatNameForList = (profile) => {
  if (!profile?.first_name && !profile?.last_name) return 'Unknown';
  const parts = [];
  if (profile.last_name) parts.push(profile.last_name);
  if (profile.first_name) parts.push(profile.first_name);
  if (profile.middle_name) parts.push(profile.middle_name);
  if (profile.suffix) parts.push(profile.suffix);
  return parts.join(', ');
};

const TABS = [
  {
    key:     'medical',
    label:   'Medical',
    sublabel:'Doctors & Nurses',
    accent:  '#1a5c3a',
    light:   '#e8f5ee',
    border:  '#b2d9c2',
    icon: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
        <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key:     'dental',
    label:   'Dental',
    sublabel:'Dentists',
    accent:  '#1a4a7a',
    light:   '#e8f0fa',
    border:  '#b2c8e8',
    icon: (color) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20 8c-6 0-12 4-12 13 0 5 2 9 4 13l4 16c1 4 3 6 5 6s3-2 5-6l2-8 2 8c2 4 3 6 5 6s4-2 5-6l4-16c2-4 4-8 4-13C48 12 42 8 36 8c-3 0-5.5 1-8 2.5C25.5 9 23 8 20 8z" />
      </svg>
    ),
  },
];

// ============================================================
// PATIENT RECORDS MODAL — compact clinical profile + full visit history
// ============================================================

// Safely parse a jsonb field that may arrive as a string, object, or null.
const pjson = (v, fallback = {}) => {
  if (!v) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v) || fallback; } catch { return fallback; }
  }
  if (typeof v === 'object') return v;
  return fallback;
};

const fmtDateTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const StatusPill = ({ status }) => {
  const map = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500'}`}>
      {status || 'unknown'}
    </span>
  );
};

const tintMap = {
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  cyan:   'bg-cyan-50 text-cyan-700 border-cyan-100',
};

const TagRow = ({ label, items, tint }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className={`text-xs px-2 py-1 rounded-full border font-medium ${tintMap[tint]}`}>{it}</span>
        ))}
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
    <p className="text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
    <p className="text-sm font-semibold text-slate-700">{value || '—'}</p>
  </div>
);

const MedicalRecordRow = ({ r, isOpen, onToggle }) => {
  const vitals = r.vital_records || {};
  const meds   = r.checked_medical || [];
  const fam    = r.checked_family || [];
  const health = r.checked_health || [];
  const hasVitals = vitals.bp || vitals.pr || vitals.rr || vitals.temp;
  const hasBody   = r.height || r.weight || r.bmi || r.waist;

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-4 w-3 h-3 rounded-full bg-[#466460] ring-4 ring-white"></div>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <i className={`fa-solid fa-chevron-right text-slate-400 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}></i>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700 truncate">{fmtDateTime(r.exam_date || r.created_at)}</p>
              <p className="text-xs text-slate-400 truncate">
                {r.nurse_on_duty ? `Nurse: ${r.nurse_on_duty}` : 'Medical Exam'}{r.physician ? ` • Dr. ${r.physician}` : ''}
              </p>
            </div>
          </div>
          <StatusPill status={r.status} />
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 text-sm">
            {hasVitals && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Vital Signs</p>
                <div className="grid grid-cols-4 gap-2">
                  {[['BP', vitals.bp, 'mmHg'], ['PR', vitals.pr, 'bpm'], ['RR', vitals.rr, 'cpm'], ['Temp', vitals.temp, '°C']]
                    .filter(([, v]) => v)
                    .map(([l, v, u]) => (
                      <div key={l} className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-rose-400 uppercase font-semibold">{l}</p>
                        <p className="font-bold text-rose-700 text-sm">{v} <span className="text-[11px] font-medium">{u}</span></p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {hasBody && (
              <div className="grid grid-cols-4 gap-2">
                <MiniStat label="Height" value={r.height ? `${r.height} cm` : ''} />
                <MiniStat label="Weight" value={r.weight ? `${r.weight} kg` : ''} />
                <MiniStat label="BMI" value={r.bmi} />
                <MiniStat label="Waist" value={r.waist ? `${r.waist} cm` : ''} />
              </div>
            )}

            {(meds.length > 0 || fam.length > 0 || health.length > 0) && (
              <div className="space-y-2.5">
                <TagRow label="Past Medical History" items={meds} tint="amber" />
                <TagRow label="Family History" items={fam} tint="purple" />
                <TagRow label="Other Conditions" items={health} tint="cyan" />
              </div>
            )}

            {(r.finding1 || r.remarks) && (
              <div className="bg-[#f7fbfa] border border-[#e0eceb] rounded-lg p-3">
                <p className="text-[11px] font-bold text-[#466460] uppercase mb-1.5">Findings / Remarks</p>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {r.finding1 || ''}{r.finding1 && r.remarks ? ' — ' : ''}{r.remarks || ''}
                </p>
              </div>
            )}

            {!hasVitals && !hasBody && meds.length === 0 && fam.length === 0 && health.length === 0 && !r.finding1 && !r.remarks && (
              <p className="text-slate-400 italic text-sm">No additional details recorded for this visit.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DentalRecordRow = ({ r, isOpen, onToggle }) => {
  const toothData      = pjson(r.tooth_data, {});
  const dentalHistory  = pjson(r.dental_history, {});
  const intraoral      = pjson(r.intraoral, {});
  const proceduresDone = Object.entries(dentalHistory).filter(([, v]) => v === 'Yes').map(([k]) => k);
  const teethNoted     = Object.entries(toothData).filter(([, d]) => d?.condition);
  const intraoralNoted = Object.entries(intraoral).filter(([k, v]) => v && k !== 'tmjExam');

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-4 w-3 h-3 rounded-full bg-[#3b82f6] ring-4 ring-white"></div>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <i className={`fa-solid fa-chevron-right text-slate-400 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}></i>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700 truncate">{fmtDateTime(r.exam_date || r.created_at)}</p>
              <p className="text-xs text-slate-400 truncate">
                {r.examined_by ? `Dr. ${r.examined_by}` : 'Dental Visit'}
              </p>
            </div>
          </div>
          <StatusPill status={r.status} />
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 text-sm">
            {(r.teeth_upper || r.teeth_lower) && (
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Upper Teeth" value={r.teeth_upper} />
                <MiniStat label="Lower Teeth" value={r.teeth_lower} />
              </div>
            )}

            {intraoralNoted.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Intraoral Findings</p>
                <div className="flex flex-wrap gap-2">
                  {intraoralNoted.map(([k, v]) => (
                    <span key={k} className="text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1 capitalize">
                      {k.replace(/([A-Z])/g, ' $1').trim()}: {String(v)}
                    </span>
                  ))}
                  {intraoral.tmjExam && (
                    <span className="text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1">TMJ Examined</span>
                  )}
                </div>
              </div>
            )}

            {teethNoted.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Tooth Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {teethNoted.map(([num, d]) => (
                    <span key={num} className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 font-semibold">
                      #{num}: {d.condition}{d.operation ? ` (${d.operation})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <TagRow label="Procedures Done" items={proceduresDone} tint="cyan" />

            {teethNoted.length === 0 && intraoralNoted.length === 0 && proceduresDone.length === 0 && !r.teeth_upper && !r.teeth_lower && (
              <p className="text-slate-400 italic text-sm">No additional details recorded for this visit.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PR_TABS = [
  { key: 'profile', label: 'Profile',       icon: 'fa-id-card' },
  { key: 'medical', label: 'Medical Visits', icon: 'fa-stethoscope' },
  { key: 'dental',  label: 'Dental Visits',  icon: 'fa-tooth' },
];

const PatientRecordsModal = ({ patientId, patientName, patientRole, consultationType, onClose }) => {
  const [activeTab, setActiveTab]           = useState('profile');
  const [profile, setProfile]               = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [dentalRecords, setDentalRecords]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [expandedId, setExpandedId]         = useState(null);

  // Determine which tabs to show based on consultation type
  const visibleTabs = consultationType === 'dental'
    ? PR_TABS.filter(t => t.key === 'profile' || t.key === 'dental')
    : consultationType === 'medical'
      ? PR_TABS.filter(t => t.key === 'profile' || t.key === 'medical')
      : PR_TABS;

  // Set default active tab based on consultation type
  useEffect(() => {
    if (consultationType === 'dental') {
      setActiveTab('dental');
    } else if (consultationType === 'medical') {
      setActiveTab('medical');
    } else {
      setActiveTab('profile');
    }
  }, [consultationType]);

  useEffect(() => {
    if (!patientId) return;
    let isMounted = true;
    setLoading(true);
    setExpandedId(null);
    setActiveTab('profile');

    (async () => {
      try {
        const [{ data: userData }, { data: medData }, { data: denData }] = await Promise.all([
          supabase.from('users').select('*').eq('id', patientId).maybeSingle(),
          supabase.from('medical_records').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
          supabase.from('dental_records').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        ]);
        if (!isMounted) return;
        setProfile(userData || null);
        setMedicalRecords(medData || []);
        setDentalRecords(denData || []);
      } catch (err) {
        console.error('[PatientRecordsModal] Failed to load patient data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [patientId]);

  const p         = profile || {};
  const emergency = pjson(p.emergency_contact);
  const vax       = pjson(p.vaccinations);
  const hasVax    = Object.values(vax || {}).some(v => v?.vaccineName);
  const isStudent = (patientRole || p.role || '').toLowerCase() === 'student';
  const initials  = (patientName || '?').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[650px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-5 py-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#466460] flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base text-slate-800 truncate">{patientName}</p>
            <div className="flex items-center gap-2 mt-1">
              {getGenderIcon(p.sex)}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getRoleClass(patientRole || p.role)}`}>
                {patientRole || p.role || 'patient'}
              </span>
              {p.university_id && <span className="text-xs text-slate-400">{p.university_id}</span>}
            </div>
          </div>
          <button
  onClick={onClose}
  className="w-9 h-9 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
</button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50">
          {visibleTabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === key ? 'bg-[#466460] text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:shadow-sm'
              }`}
            >
              <i className={`fa-solid ${icon}`}></i>
              {label}
              {key === 'medical' && medicalRecords.length > 0 && (
                <span className={`text-xs rounded-full px-1.5 ${activeTab === key ? 'bg-white/20' : 'bg-slate-200'}`}>{medicalRecords.length}</span>
              )}
              {key === 'dental' && dentalRecords.length > 0 && (
                <span className={`text-xs rounded-full px-1.5 ${activeTab === key ? 'bg-white/20' : 'bg-slate-200'}`}>{dentalRecords.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40 min-h-0 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              <i className="fa-solid fa-circle-notch fa-spin text-xl mr-2"></i> Loading records…
            </div>
          ) : activeTab === 'profile' ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-[#466460] uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-id-card"></i> Personal Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <MiniStat label="Age" value={p.age} />
                  <MiniStat label="Gender" value={p.sex || p.gender} />
                  <MiniStat label="Birthdate" value={p.birthday} />
                  <MiniStat label="Blood Type" value={p.blood_type} />
                  <MiniStat label="Civil Status" value={p.civil_status} />
                  <MiniStat label="Nationality" value={p.nationality} />
                  <MiniStat label="Religion" value={p.religion} />
                  <MiniStat label="Home Address" value={p.home_address} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#466460] uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-graduation-cap"></i> {isStudent ? 'Academic' : 'Work'} Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {isStudent ? (
                    <>
                      <MiniStat label="Program" value={p.program} />
                      <MiniStat label="Year Level" value={p.year_level} />
                      <MiniStat label="Section" value={p.section} />
                      <MiniStat label="Classification" value={p.student_classification} />
                    </>
                  ) : (
                    <>
                      <MiniStat label="Department" value={p.department} />
                      <MiniStat label="Job Title" value={p.job_title} />
                      <MiniStat label="Classification" value={p.classification} />
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#466460] uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-phone"></i> Contact Information
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <MiniStat label="Email" value={p.email} />
                  <MiniStat label="Phone" value={p.phone_number} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation"></i> Emergency Contact
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                    <p className="text-[10px] text-red-400 uppercase font-semibold">Name</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {emergency?.name || '—'}{emergency?.relationship ? ` (${emergency.relationship})` : ''}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                    <p className="text-[10px] text-red-400 uppercase font-semibold">Phone</p>
                    <p className="text-sm font-semibold text-slate-700">{emergency?.phone || '—'}</p>
                  </div>
                </div>
              </div>

              {hasVax && (
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-syringe"></i> Vaccinations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(vax).map(([key, v]) =>
                      v?.vaccineName ? (
                        <span key={key} className="text-xs px-2.5 py-1.5 rounded-full bg-green-100 text-green-700 font-medium capitalize">
                          {key.replace('dose', 'Dose ').replace('booster', 'Booster ')}: {v.vaccineName}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {!profile && (
                <p className="text-sm text-slate-400 italic text-center py-6">No profile data found for this patient.</p>
              )}
            </div>
          ) : activeTab === 'medical' ? (
            medicalRecords.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white">
                <i className="fa-solid fa-file-medical text-3xl text-slate-300 mb-2 block"></i>
                <p className="text-base text-slate-400">No medical visit history found.</p>
              </div>
            ) : (
              <div className="relative pl-2">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
                <div className="space-y-2.5">
                  {medicalRecords.map(r => (
                    <MedicalRecordRow
                      key={r.id}
                      r={r}
                      isOpen={expandedId === r.id}
                      onToggle={() => setExpandedId(prev => prev === r.id ? null : r.id)}
                    />
                  ))}
                </div>
              </div>
            )
          ) : (
            dentalRecords.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white">
                <i className="fa-solid fa-tooth text-3xl text-slate-300 mb-2 block"></i>
                <p className="text-base text-slate-400">No dental visit history found.</p>
              </div>
            ) : (
              <div className="relative pl-2">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>
                <div className="space-y-2.5">
                  {dentalRecords.map(r => (
                    <DentalRecordRow
                      key={r.id}
                      r={r}
                      isOpen={expandedId === r.id}
                      onToggle={() => setExpandedId(prev => prev === r.id ? null : r.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const Consultations = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole    = (currentUser.role || '').toLowerCase();

  const allowedTabs = React.useMemo(() => {
    if (['doctor', 'nurse'].includes(userRole)) return TABS.filter(t => t.key === 'medical');
    if (userRole === 'dentist') return TABS.filter(t => t.key === 'dental');
    return TABS;
  }, [userRole]);

  const [activeTab, setActiveTab]               = useState(allowedTabs[0]?.key || 'medical');
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterStatus, setFilterStatus]       = useState('all'); // 'all', 'active', 'ended'
  const [sortOrder, setSortOrder]             = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [conversations, setConversations]       = useState([]);
  const [unreadCounts, setUnreadCounts]         = useState({}); // { convId: count }
  const [selectedConvId, setSelectedConvId]     = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [messageInput, setMessageInput]         = useState('');
  const [onlinePresence, setOnlinePresence]     = useState({});
  const [patientProfiles, setPatientProfiles]   = useState({});
  const [loadingMsgs, setLoadingMsgs]           = useState(false);
  const [toast, setToast]                       = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [newConsultationAlert, setNewConsultationAlert] = useState(null); // 🟢 NEW: Real-time alert for new consultations

  // 🔴 FIXED: Core internal tracking states for the staff member
  const [internalStaffId, setInternalStaffId]   = useState(null);
  // 🟢 NEW: Staff's real first+last name (from `users` table), used as sender_name
  // when sending messages — previously we fell back to currentUser.name, which
  // doesn't exist on the localStorage user object, so every message was saved as
  // "Clinic Staff" no matter who actually replied.
  const [internalStaffName, setInternalStaffName] = useState(null);
  const [sessionReady, setSessionReady]         = useState(false);

  const messagesEndRef  = useRef(null);
  const msgChannelRef   = useRef(null);
  const convChannelRef  = useRef(null);
  const presenceChannelRef = useRef(null);
  const globalMsgChannelRef = useRef(null); // 🟢 NEW: cross-conversation realtime channel
  const selectedConvIdRef = useRef(null);
  const isSendingRef    = useRef(false); // Track if sending to skip realtime dupes

  const tabCfg = allowedTabs.find(t => t.key === activeTab) || allowedTabs[0] || TABS[0];

  // ── Token Management Helper ─────────────────────────────────────────────
  // Returns true when a raw JWT access token is expired (or unparseable).
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds; subtract 30s so we refresh slightly early
      return Date.now() / 1000 > payload.exp - 30;
    } catch {
      return true;
    }
  };

  // Ensures we have a valid session, proactively refreshing if needed.
  // This keeps the user logged in seamlessly without manual intervention.
  const ensureValidSession = useCallback(async () => {
    try {
      // First check if Supabase already has a valid session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[Clinic] Session error:', error.message);
        return null;
      }

      if (session) {
        // Session is valid - update localStorage for other components that depend on it
        localStorage.setItem('token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        // Update Supabase realtime auth
        try { supabase.realtime.setAuth(session.access_token); } catch {}
        return session.access_token;
      }

      // No session - try to refresh using stored tokens
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';

      if (!accessToken) {
        console.warn('[Clinic] No tokens available');
        return null;
      }

      // Check if token is expired
      if (!isTokenExpired(accessToken)) {
        // Token valid, just set session
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        try { supabase.realtime.setAuth(accessToken); } catch {}
        return accessToken;
      }

      // Token expired - refresh it
      console.log('[Clinic] Token expired, refreshing...');
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();

      if (!refreshErr && refreshed?.session) {
        const newAccess = refreshed.session.access_token;
        const newRefresh = refreshed.session.refresh_token;
        localStorage.setItem('token', newAccess);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
        try { supabase.realtime.setAuth(newAccess); } catch {}
        console.log('[Clinic] Token refreshed successfully');
        return newAccess;
      }

      console.warn('[Clinic] Token refresh failed');
      return null;
    } catch (err) {
      console.error('[Clinic] ensureValidSession error:', err);
      return null;
    }
  }, []);

  // ── 1. Secure Authentication & Fetch Internal Staff ID ───────────────
  useEffect(() => {
    const initAdminSession = async () => {
      if (!currentUser?.uid) return;

      const accessToken  = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';

      if (accessToken) {
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
      }

      // Resolve the internal users.id (and real name) for the logged-in staff member
      const { data: profiles, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('uid', currentUser.uid)
        .limit(1);

      const profile = profiles?.[0];
      if (profile) {
        setInternalStaffId(profile.id);
        // 🟢 NEW: Build "First Last" from the users table row — this is what
        // gets saved as sender_name on every outgoing message.
        const staffName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        setInternalStaffName(staffName || null);
        // Set presence using the valid internal ID
        consultationsService.setUserPresence(profile.id, 'online');
      }
      setSessionReady(true);
    };

    initAdminSession();

    // ── Proactive token refresh every 10 minutes ─────────────────────────
    // This ensures the token is refreshed before it expires, preventing
    // any interruption to the user's session
    const tokenRefreshInterval = setInterval(() => {
      ensureValidSession().catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
      const storedId = localStorage.getItem('_internalStaffId');
      if (storedId) {
        consultationsService.setUserPresence(storedId, 'offline').catch(() => {});
      }
    };
  }, [currentUser?.uid, ensureValidSession]);

  useEffect(() => {
    if (internalStaffId) localStorage.setItem('_internalStaffId', internalStaffId);
  }, [internalStaffId]);

  // ── 2. Auto-select conversation from URL ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convIdToOpen = params.get('convId');
    if (convIdToOpen) {
      setSelectedConvId(convIdToOpen);
      if (convIdToOpen.endsWith('_dental') && allowedTabs.some(t => t.key === 'dental')) {
        setActiveTab('dental');
      } else if (allowedTabs.some(t => t.key === 'medical')) {
        setActiveTab('medical');
      }
    }
  }, [location.search, allowedTabs]);

  // ── 3. Load patient profiles from Supabase ────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        const map = {};
        data?.forEach(p => { map[p.id] = p; });
        setPatientProfiles(map);
      } catch (err) { console.error('Failed to load profiles:', err); }
    };
    loadProfiles();
  }, [sessionReady]);

  // ── 4. Subscribe to consultations ─────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadConsultations = async () => {
      try {
        // Ensure valid session before making API calls
        await ensureValidSession();

        console.log('[Clinic] Loading consultations...');
        const data = await consultationsService.getAllConsultations(null, true); // Force refresh
        console.log('[Clinic] Raw data from API:', data?.map(c => ({ id: c.id, status: c.status, patient_id: c.patient_id, is_archived: c.is_archived, consultation_type: c.consultation_type })));

        // Load conversations with last message and unread count
        const consultationsWithLastMessage = await Promise.all(
          (data || []).map(async (conv) => {
            try {
              // 🟢 FIX: Force refresh to get fresh messages
              const msgs = await consultationsService.getMessagesByConsultationId(conv.id, true);
              const lastMsg = msgs?.slice(-1)[0];
              // Count unread messages (from patients, not from staff)
              // Only count if internalStaffId is available and sender_id exists
              const unreadCount = internalStaffId
                ? (msgs || []).filter(m => !m.read_at && m.sender_id && m.sender_id !== internalStaffId).length
                : 0;
              console.log('[Clinic] Conv', conv.id, '- total msgs:', msgs?.length || 0, 'unread:', unreadCount);
              return {
                ...conv,
                last_message: lastMsg?.message || '',
                last_timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
                unread_count: unreadCount,
              };
            } catch {
              return conv;
            }
          })
        );
        consultationsWithLastMessage.sort((a, b) => b.last_timestamp - a.last_timestamp);
        setConversations(consultationsWithLastMessage);

        // Build unread counts map
        const unreadMap = {};
        consultationsWithLastMessage.forEach(c => {
          if (c.unread_count > 0) unreadMap[c.id] = c.unread_count;
        });
        setUnreadCounts(unreadMap);

        // REMOVED: Auto-select first active conversation - user selects manually
      } catch (err) {
        console.error('Failed to load consultations:', err);
      }
    };
    loadConsultations();

    // 🔴 ENHANCED: More robust realtime handling for consultation status changes
    convChannelRef.current = consultationsService.subscribeToConsultations((payload) => {
      console.log('[Clinic] Realtime consultation event:', payload.eventType, payload.new);

      if (payload.eventType === 'INSERT') {
        // New consultation created - add to list and refresh messages/last message
        const newConv = { ...payload.new, last_message: '', last_timestamp: 0, unread_count: 0 };

        // 🟢 NEW: Show alert notification for new consultation
        const patientName = payload.new.patient_name || 'A patient';
        const consultType = payload.new.consultation_type === 'dental' ? 'Dental' : 'Medical';
        setNewConsultationAlert({
          id: payload.new.id,
          message: `${patientName} started a new ${consultType} consultation`,
          type: payload.new.consultation_type
        });
        // Auto-dismiss alert after 5 seconds
        setTimeout(() => setNewConsultationAlert(null), 5000);

        // Immediately fetch the last message and update
        consultationsService.getMessagesByConsultationId(payload.new.id, true).then(msgs => {
          if (msgs && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            setConversations(prev => {
              const idx = prev.findIndex(c => c.id === payload.new.id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], last_message: lastMsg.message, last_timestamp: new Date(lastMsg.created_at).getTime() };
                return updated;
              }
              return [{ ...newConv, last_message: lastMsg.message, last_timestamp: new Date(lastMsg.created_at).getTime() }, ...prev];
            });
          } else {
            setConversations(prev => {
              // Avoid duplicates
              if (prev.some(c => c.id === newConv.id)) return prev;
              return [newConv, ...prev];
            });
          }
        }).catch(() => {
          // Fallback: just add the conversation
          setConversations(prev => {
            if (prev.some(c => c.id === newConv.id)) return prev;
            return [newConv, ...prev];
          });
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedConv = payload.new;

        // Check if status changed to active - need to refresh data and show alert
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === updatedConv.id);

          // Get existing conversation for comparison
          const existing = idx !== -1 ? prev[idx] : null;
          const statusChanged = existing && existing.status !== updatedConv.status;

          // 🟢 NEW: Alert when consultation is reactivated (ended -> active)
          if (statusChanged && updatedConv.status === 'active') {
            const patientName = existing?.patient_name || updatedConv.patient_name || 'A patient';
            const consultType = updatedConv.consultation_type === 'dental' ? 'Dental' : 'Medical';
            setNewConsultationAlert({
              id: updatedConv.id,
              message: `${patientName} reactivated their ${consultType} consultation`,
              type: updatedConv.consultation_type
            });
            setTimeout(() => setNewConsultationAlert(null), 5000);
          }

          if (idx === -1) {
            // Conversation not in list - add it if it's active
            if (updatedConv.status === 'active') {
              return [{ ...updatedConv, last_message: '', last_timestamp: 0, unread_count: 0 }, ...prev];
            }
            return prev;
          }

          // If status changed to active, refresh the conversation data
          if (statusChanged && updatedConv.status === 'active') {
            // Fetch fresh data for this conversation
            consultationsService.getMessagesByConsultationId(updatedConv.id, true).then(msgs => {
              if (msgs && msgs.length > 0) {
                const lastMsg = msgs[msgs.length - 1];
                setConversations(prev => prev.map(c =>
                  c.id === updatedConv.id
                    ? { ...c, ...updatedConv, last_message: lastMsg.message, last_timestamp: new Date(lastMsg.created_at).getTime() }
                    : c
                ));
              } else {
                setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
              }
            }).catch(() => {
              setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
            });
          }

          return prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c);
        });

        // If this is the selected conversation, refresh messages too
        if (selectedConvId === updatedConv.id && updatedConv.status === 'active') {
          consultationsService.getMessagesByConsultationId(updatedConv.id, true).then(msgs => {
            if (msgs) {
              const formatted = (msgs || []).map(msg => ({
                ...msg,
                text: msg.message,
                timestamp: new Date(msg.created_at).getTime(),
                sender: ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes(msg.sender_role?.toLowerCase()) ? 'clinic' : 'patient',
                read_at: msg.read_at,
              }));
              setMessages(formatted);
            }
          }).catch(() => {});
        }
      }
    });

    // Poll for unread count updates more frequently (every 3 seconds) to detect when patient reads messages
    // 🟢 FIX: Clear message cache before polling to ensure fresh data
    const pollInterval = setInterval(async () => {
      try {
        // Clear message cache for all conversations to ensure we get fresh data
        consultationsService.clearMessagesCache();

        const data = await consultationsService.getAllConsultations(null, true);
        if (!data) return;

        // Update only the unread counts in conversations (don't re-fetch all messages)
        const unreadMap = {};
        const updatedConversations = await Promise.all(
          (data || []).map(async (conv) => {
            try {
              // 🟢 FIX: Force refresh to get fresh messages
              const msgs = await consultationsService.getMessagesByConsultationId(conv.id, true);
              const lastMsg = msgs?.slice(-1)[0];
              const unreadCount = internalStaffId
                ? (msgs || []).filter(m => !m.read_at && m.sender_id && m.sender_id !== internalStaffId).length
                : 0;
              if (unreadCount > 0) unreadMap[conv.id] = unreadCount;
              return {
                ...conv,
                last_message: lastMsg?.message || '',
                last_timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
                unread_count: unreadCount,
              };
            } catch {
              return conv;
            }
          })
        );
        updatedConversations.sort((a, b) => b.last_timestamp - a.last_timestamp);
        setConversations(updatedConversations);
        setUnreadCounts(unreadMap);
      } catch (err) {
        // Silent fail for polling
      }
    }, 3000);

    return () => {
      if (convChannelRef.current) convChannelRef.current();
      clearInterval(pollInterval);
    };
  }, [sessionReady]);

  // ── 4.5 Global real-time message listener (all conversations) ─────────
  // Catches new/updated messages regardless of which conversation is
  // currently open, so the sidebar and open thread update instantly
  // without needing a manual reload or waiting for the 3s poll above.
  useEffect(() => {
    if (!sessionReady || !internalStaffId) return;

    const isClinicSender = (role) =>
      ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes((role || '').toLowerCase());

    const channel = supabase
      .channel('admin-consultations-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages' }, (payload) => {
        const newMsg = payload.new;
        const convId = newMsg.consultation_id;
        const isFromPatient = !isClinicSender(newMsg.sender_role);

        // Update sidebar: last message, timestamp, unread count, ordering
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === convId);
          if (idx === -1) return prev; // brand-new conv row hasn't landed yet — the consultations channel/poll will add it
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.last_message = newMsg.message;
          conv.last_timestamp = new Date(newMsg.created_at).getTime();
          if (isFromPatient && convId !== selectedConvIdRef.current) {
            conv.unread_count = (conv.unread_count || 0) + 1;
          }
          updated[idx] = conv;
          updated.sort((a, b) => (b.last_timestamp || 0) - (a.last_timestamp || 0));
          return updated;
        });

        if (isFromPatient && convId !== selectedConvIdRef.current) {
          setUnreadCounts(prev => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
        }

        // If it's for the currently open conversation, append instantly
        if (convId === selectedConvIdRef.current && !isSendingRef.current) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              ...newMsg,
              text: newMsg.message,
              timestamp: new Date(newMsg.created_at).getTime(),
              sender: isClinicSender(newMsg.sender_role) ? 'clinic' : 'patient',
              read_at: newMsg.read_at,
            }];
          });
          // 🟢 FIX: Clear message cache so next fetch gets fresh data
          consultationsService.clearMessagesCache(convId);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultation_messages' }, (payload) => {
        // Keeps the ✓✓ seen indicator accurate even if the (removed)
        // per-room channel hasn't resubscribed yet after switching threads.
        if (!payload.new?.read_at) return;
        if (payload.new.consultation_id !== selectedConvIdRef.current) return;
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m));
      })
      .subscribe();

    globalMsgChannelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [sessionReady, internalStaffId]);

  // ── 5. Subscribe to presence ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const loadPresence = async () => {
      try {
        const users = await consultationsService.getOnlineUsers();
        const presenceMap = {};
        users?.forEach(u => { presenceMap[u.user_id] = u; });
        setOnlinePresence(presenceMap);
      } catch (err) { console.error('Failed to load presence:', err); }
    };
    loadPresence();

    presenceChannelRef.current = consultationsService.subscribeToPresence((payload) => {
      if (payload.eventType === 'UPSERT') {
        setOnlinePresence(prev => ({ ...prev, [payload.new.user_id]: payload.new }));
      }
    });

    return () => {
      if (presenceChannelRef.current) presenceChannelRef.current();
    };
  }, [sessionReady]);

  // ── 6. Load messages (live updates now handled by the global channel above) ──
  useEffect(() => {
    if (!sessionReady) return;
    const loadMessages = async () => {
      if (!selectedConvId) { setMessages([]); return; }

      setLoadingMsgs(true);
      try {
        // Ensure valid session before loading messages
        await ensureValidSession();

        // 🟢 FIX: Always get fresh data for the selected conversation
        // This ensures new messages are displayed immediately
        const data = await consultationsService.getMessagesByConsultationId(selectedConvId, true);
        // 🔴 FIXED: Classify styling based on the staff's internal ID, not the raw UID
        const formatted = (data || []).map(msg => ({
          ...msg,
          text: msg.message,
          timestamp: new Date(msg.created_at).getTime(),
          sender: ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes(msg.sender_role?.toLowerCase()) ? 'clinic' : 'patient',
          read_at: msg.read_at, // Include read_at for seen indicator
        }));
        setMessages(formatted);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMsgs(false);
      }
    };
    loadMessages();
    // 🟢 NOTE: per-room msgChannelRef/readChannel subscriptions were removed here —
    // the global channel (effect 4.5) now handles new-message and read-receipt
    // updates for every conversation, including whichever one is open.
  }, [selectedConvId, sessionReady]);

  useEffect(() => { setShowPatientModal(false); }, [selectedConvId]);
  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Mark messages as read when viewing consultation ───────────────────
  useEffect(() => {
    const isEnded = conversations.find(c => c.id === selectedConvId)?.status === 'ended';
    if (selectedConvId && !isEnded && internalStaffId) {
      markMessagesAsRead();
    }
  }, [selectedConvId, messages, conversations, internalStaffId]);

  // ── Send Message ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    // 🔴 FIXED: Ensure the staff ID is fully loaded before allowing sends
    if (!selectedConvId || !messageInput.trim() || !internalStaffId) return;

    // Ensure valid session before sending
    await ensureValidSession();

    const text = messageInput.trim();
    setMessageInput('');
    isSendingRef.current = true; // Prevent realtime dupe
    try {
      await consultationsService.sendMessage(selectedConvId, {
        text,
        sender_id: internalStaffId, // 🔴 FIXED: Injects the secure Postgres Internal Table ID
        // 🟢 FIXED: Use the staff member's real first+last name (fetched from the
        // `users` table in initAdminSession) instead of currentUser.name, which
        // doesn't exist on the localStorage user object and always fell back to
        // the generic "Clinic Staff" placeholder.
        sender_name: internalStaffName || currentUser.name || 'Clinic Staff',
        sender_role: currentUser.role || 'staff',
      });

      // Immediately fetch updated messages (force refresh to skip cache)
      const data = await consultationsService.getMessagesByConsultationId(selectedConvId, true);
      // Deduplicate by message ID
      const uniqueData = (data || []).reduce((acc, msg) => {
        if (!acc.some(m => m.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, []);
      const formatted = (uniqueData || []).map(msg => ({
        ...msg,
        text: msg.message,
        timestamp: new Date(msg.created_at).getTime(),
        sender: ['doctor', 'nurse', 'dentist', 'sysadmin', 'system'].includes(msg.sender_role?.toLowerCase()) ? 'clinic' : 'patient',
      }));
      setMessages(formatted);
    } catch (err) {
      console.error('Send error:', err);
      showToast('Failed to send message', 'error');
    } finally {
      isSendingRef.current = false; // Re-enable realtime
    }
  };

  // ── Mark messages as read ──────────────────────────────────────────────
  const markMessagesAsRead = async () => {
    const isEnded = conversations.find(c => c.id === selectedConvId)?.status === 'ended';
    if (!selectedConvId || !internalStaffId || isEnded) return;

    // Ensure valid session before making API call
    await ensureValidSession();

    console.log('[Clinic] Marking messages as read for consultation:', selectedConvId, 'staffId:', internalStaffId);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${API_URL}/consultations/${selectedConvId}/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sender_id: internalStaffId,
          sender_role: currentUser?.role || 'doctor',
        }),
      });
      const result = await response.json();
      console.log('[Clinic] Marked messages as read result:', result);

      // Update unread counts - remove this conversation from the map
      if (result && result.length > 0) {
        setUnreadCounts(prev => {
          const newMap = { ...prev };
          delete newMap[selectedConvId];
          return newMap;
        });
        // Also update the conversation's unread_count
        setConversations(prev => prev.map(c =>
          c.id === selectedConvId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (err) {
      console.error('[Clinic] Error marking messages as read:', err);
    }
  };

  // ── End Consultation ──────────────────────────────────────────────────
  const handleEndConsultation = async () => {
    if (!selectedConvId) return;

    // Ensure valid session before making API call
    await ensureValidSession();

    try {
      await consultationsService.endConsultation(selectedConvId);
      await consultationsService.sendMessage(selectedConvId, {
        text: "Consultation marked as complete by clinic staff.",
        sender_id: null,
        sender_name: "System",
        sender_role: "system",
      });
      showToast('Consultation ended');
    } catch (err) {
      console.error('Failed to end consultation', err);
      showToast('Failed to end consultation', 'error');
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const groupedMessages = () => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const dateLabel = formatDate(msg.timestamp);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel, id: `date-${msg.timestamp}` });
        lastDate = dateLabel;
      }
      groups.push(msg);
    });
    return groups;
  };

  // ── Derived data ─────────────────────────────────────────────────────
  const selectedConv   = conversations.find(c => c.id === selectedConvId);
  const isConvEnded    = selectedConv?.status === 'ended';
  const patientId     = selectedConv?.patient_id;
  const patientProfile = patientProfiles[patientId] || {};
  const patientName    = getFullName(patientProfile);
  const isPatientOnline = onlinePresence[patientId]?.status === 'online';

  const onlineClinicStaff = Object.entries(onlinePresence)
    .filter(([uid, p]) => p.status === 'online' && uid !== internalStaffId && // 🔴 FIXED
      ['doctor','nurse','dentist','sysadmin','administrator'].includes(p.role?.toLowerCase()))
    .map(([, p]) => p.name || 'Staff');

  const visibleConversations = conversations.filter(conv => {
    // Filter by tab - only filter if activeTab is set
    if (activeTab && conv.consultation_type !== activeTab) return false;

    // Filter by archived status - only show non-archived (is_archived is null or false)
    if (conv.is_archived === true) return false;

    // Filter by status
    if (filterStatus === 'active' && conv.status === 'ended') return false;
    if (filterStatus === 'ended' && conv.status !== 'ended') return false;

    // Get profile for search
    const profile = patientProfiles[conv.patient_id] || {};

    // Filter by search term
    if (searchTerm) {
      const displayName = profile.first_name
        ? `${profile.last_name || ''}, ${profile.first_name || ''}`.trim()
        : conv.patient_name || '';
      const searchLower = searchTerm.toLowerCase();
      const matchesName = displayName.toLowerCase().includes(searchLower);
      const matchesId = (profile.university_id || '').toLowerCase().includes(searchLower);
      const matchesProgram = (profile.program || '').toLowerCase().includes(searchLower);
      if (!matchesName && !matchesId && !matchesProgram) return false;
    }

    return true; // Show all consultations in the list
  }).sort((a, b) => {
    // Sort by last_timestamp: newest first (desc) or oldest first (asc)
    const timeA = a.last_timestamp || 0;
    const timeB = b.last_timestamp || 0;
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Debug: show why each conversation passes/fails filter
  const debugFilter = conversations.map(conv => {
    const tabMatch = activeTab ? conv.consultation_type === activeTab : true;
    const archivedMatch = conv.is_archived !== true;
    const statusMatch = filterStatus === 'all' ||
      (filterStatus === 'active' && conv.status === 'active') ||
      (filterStatus === 'ended' && conv.status === 'ended');
    return {
      id: conv.id,
      type: conv.consultation_type,
      status: conv.status,
      archived: conv.is_archived,
      tabMatch,
      archivedMatch,
      statusMatch,
      passes: tabMatch && archivedMatch && statusMatch
    };
  });
  console.log('[Clinic] filter debug:', debugFilter);
  console.log('[Clinic] visibleConversations:', visibleConversations.map(c => ({ id: c.id, status: c.status, type: c.consultation_type, archived: c.is_archived })));
  console.log('[Clinic] filterStatus:', filterStatus, 'activeTab:', activeTab);

  const unreadByTab = {};
  allowedTabs.forEach(tab => {
    unreadByTab[tab.key] = 0;
  });
  // Accumulate unread counts from conversations (using visibleConversations after it's defined)
  conversations.forEach(conv => {
    if (conv.consultation_type && conv.unread_count > 0 && conv.status !== 'ended') {
    unreadByTab[conv.consultation_type] = (unreadByTab[conv.consultation_type] || 0) + conv.unread_count;
    }
  });

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* ── MAGIC FIX: Hide hamburger when a chat is open on mobile ── */}
      {selectedConvId && (
        <style>{`
          @media (max-width: 768px) {
            #mobile-hamburger-btn,
            #mobile-active-tab-chip {
              display: none !important;
            }
          }
          @keyframes slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out forwards;
          }
        `}</style>
      )}

      {/* ── Left: Sidebar ── */}
      <div className={`w-full md:w-1/3 border-r border-slate-200 flex-col flex-shrink-0 ${
        selectedConvId ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-extrabold text-[#466460] text-lg">
            <i className="fa-regular fa-comment-dots mr-2"></i>Consultations
          </h3>
          {onlineClinicStaff.length > 0 && (
            <p className="text-xs text-emerald-600 mt-1 font-semibold">
              <i className="fa-solid fa-circle text-[7px] mr-1"></i>
              {onlineClinicStaff.join(', ')} also online
            </p>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-white">
          {allowedTabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (selectedConv && selectedConv.consultation_type !== tab.key) setSelectedConvId(null);
                }}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 text-sm font-bold transition-all relative"
                style={{ color: isActive ? tab.accent : '#94a3b8', backgroundColor: isActive ? tab.light : 'transparent' }}
              >
                <div className="flex items-center gap-1.5">
                  {tab.icon(isActive ? tab.accent : '#94a3b8')}
                  <span>{tab.label}</span>
                  {unreadByTab[tab.key] > 0 && (
                    <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white min-w-[18px] text-center" style={{ backgroundColor: '#e07a5f' }}>
                      {unreadByTab[tab.key]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-normal" style={{ color: isActive ? tab.accent : '#94a3b8' }}>
                  {tab.sublabel}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: tab.accent }}></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search and Filter */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 bg-white">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, ID, or program..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#466460] focus:bg-white transition"
              />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center text-sm font-bold"
            >
              {sortOrder === 'desc' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V15M9 15L4 10M9 15L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 15V3M9 3L4 8M9 3L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}

            </button>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-[#466460] text-slate-600 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
            <p className="text-sm text-slate-400 flex items-center whitespace-nowrap">
              {visibleConversations.length} thread{visibleConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
              <i className="fa-regular fa-comment-dots text-5xl text-slate-200"></i>
              <p className="text-base">No {tabCfg.label.toLowerCase()} consultations yet</p>
              <p className="text-sm">Patients will appear here when they send a message</p>
            </div>
          ) : visibleConversations.map(conv => {
            const profile = patientProfiles[conv.patient_id] || {};
            const displayName = formatNameForList(profile);
            const initial  = displayName.charAt(0).toUpperCase();
            const isOnline = onlinePresence[conv.patient_id]?.status === 'online';
            const isActive = selectedConvId === conv.id;
            const tab = TABS.find(t => t.key === conv.consultation_type) || TABS[0];
            const isEnded = conv.status === 'ended';
            const unreadCount = conv.unread_count || 0;
            const hasUnread = unreadCount > 0 && !isEnded;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-[#f0f7f6] ${
                  isActive ? 'md:bg-gradient-to-r md:from-[#e0eceb] md:to-white md:border-l-4 md:border-l-[#466460]' : ''
                } ${hasUnread ? 'bg-yellow-50' : ''} ${isEnded ? 'opacity-70' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isEnded ? 'grayscale' : ''}`}
                    style={{ backgroundColor: tab.light, color: tab.accent }}
                  >
                    {initial}
                  </div>
                  {isOnline && !isEnded && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold text-base truncate flex items-center gap-2 ${hasUnread ? 'text-[#466460]' : 'text-slate-800'}`}>
                      {displayName}
                      {isEnded && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase">Ended</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {conv.last_timestamp ? formatTime(conv.last_timestamp) : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-slate-500 truncate">
                      {profile.university_id && `${profile.university_id} • `}
                      {profile.program && `${profile.program}`}
                      {profile.section && ` Sec ${profile.section}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {getGenderIcon(profile.sex)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRoleClass(profile.role || conv.patient_role)}`}>
                      {profile.role || conv.patient_role || 'patient'}
                    </span>
                    <p className={`text-sm truncate ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                      {conv.last_message || 'No messages'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div className={`flex-1 min-w-0 overflow-hidden ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat Header */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-white flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
  onClick={() => { setSelectedConvId(null); setShowPatientModal(false); }}
  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#466460] transition-colors flex-shrink-0 border border-slate-200"
  title="Back to conversations"
>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
</button>

            {selectedConv ? (
              <>
                {(() => {
                  const t = TABS.find(tab => tab.key === selectedConv.consultation_type) || TABS[0];
                  return (
                    <div
                      className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: t.light, color: t.accent }}
                    >
                      {t.icon(t.accent)}
                      {t.label}
                    </div>
                  );
                })()}

                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460]">
                    {patientName.charAt(0).toUpperCase()}
                  </div>
                  {isPatientOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-slate-800 truncate">{patientName}</p>
                    {getGenderIcon(patientProfile.sex)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRoleClass(patientProfile.role || selectedConv?.patient_role)}`}>
                      {patientProfile.role || selectedConv?.patient_role || 'patient'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {patientProfile.university_id && `${patientProfile.university_id} • `}
                    {patientProfile.program && `${patientProfile.program}`}
                    {patientProfile.section && ` Sec ${patientProfile.section}`}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {isConvEnded
                      ? <span className="text-slate-500 font-semibold">● Session Ended</span>
                      : isPatientOnline
                        ? <span className="text-emerald-500 font-semibold">● Online</span>
                        : <span>● Offline</span>}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {!isConvEnded && (
                    <button
                      onClick={handleEndConsultation}
                      title="End Consultation"
                      className="flex items-center justify-center gap-1.5 w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all border border-red-100 hover:border-red-500 shadow-sm"
                    >
                      <i className="fa-solid fa-check-double text-sm md:text-xs"></i>
                      <span className="hidden md:inline">End Consult</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowPatientModal(true)}
                    title="View Records"
                    className="flex items-center justify-center gap-1.5 w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm bg-[#e0eceb] text-[#466460] hover:bg-[#466460] hover:text-white"
                  >
                    <i className="fa-solid fa-address-card text-sm md:text-xs"></i>
                    <span className="hidden md:inline">Records</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:block">
                <p className="font-bold text-base text-slate-800">Consultation Thread</p>
                <p className="text-xs text-slate-400">Select a patient to view conversation</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-3 bg-slate-50">
            {!selectedConvId ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <i className="fa-regular fa-message text-5xl text-slate-200"></i>
                <p className="text-sm">No conversation selected</p>
                <p className="text-xs">Choose a patient from the list</p>
              </div>
            ) : loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <i className="fa-solid fa-spinner fa-spin text-[#466460] text-xl"></i>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <i className="fa-regular fa-comment text-4xl text-slate-200"></i>
                <p className="text-sm">No messages yet</p>
                <p className="text-xs text-center px-4">The patient is completing the intake form. Their first message will appear here.</p>
              </div>
            ) : (
              <>
                {groupedMessages().map((item) => {
                  if (item.type === 'date') {
                    return (
                      <div key={item.id} className="flex justify-center my-2">
                        <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold">
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                  if (['system', 'bot', 'triage'].includes(item.sender_role?.toLowerCase())) {
                    return null;
                  }
                  const isClinic = item.sender === 'clinic';
                  return (
                    <div key={item.id} className={`flex flex-col ${isClinic ? 'items-end' : 'items-start'}`}>
                      {isClinic && (
                        <div className="flex items-center gap-1.5 mb-0.5 mr-2">
                          <p className="text-xs text-slate-400 font-semibold">{item.sender_name || 'Clinic Staff'}</p>
                          {item.sender_role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold capitalize">
                              {item.sender_role}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[85%] md:max-w-[72%] px-4 py-2.5 rounded-2xl text-base leading-relaxed break-words shadow-sm ${
                        isClinic
                          ? 'bg-[#466460] text-white rounded-br-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}>
                        <LinkifiedText text={item.text} isPatient={!isClinic} />
                      </div>
                      <div className={`text-xs text-slate-400 mt-1 mx-1 flex items-center gap-1 ${isClinic ? 'justify-end' : ''}`}>
                        <span>{formatTime(item.timestamp)}</span>
                        {/* Seen indicator - only show for clinic messages */}
                        {isClinic && (
                          <span className={item.read_at ? 'text-blue-500' : ''} title={item.read_at ? `Seen at ${new Date(item.read_at).toLocaleString()}` : 'Sent'}>
                            {item.read_at ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isConvEnded && (
                  <div className="flex items-center gap-3 my-4 opacity-60">
                    <div className="flex-1 h-px bg-slate-300"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Session Ended</span>
                    <div className="flex-1 h-px bg-slate-300"></div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 md:px-4 py-3 bg-white border-t border-slate-200 flex gap-2 md:gap-3 items-center flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))]">
            <input
              type="text"
              placeholder={
                !selectedConvId
                  ? 'Select a conversation first'
                  : isConvEnded
                    ? 'Consultation has been ended.'
                    : 'Type a reply…'
              }
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={!selectedConvId || isConvEnded || !sessionReady}
              className="flex-1 border border-slate-200 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-base outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
  onClick={sendMessage}
  disabled={!selectedConvId || !messageInput.trim() || isConvEnded || !sessionReady}
  className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-full bg-[#466460] text-white flex items-center justify-center hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
  </svg>
</button>
          </div>
        </div>
      </div>

      {/* Patient Records Modal */}
      {showPatientModal && selectedConv && createPortal(
        <PatientRecordsModal
          patientId={patientId}
          patientName={patientName}
          patientRole={patientProfile.role || selectedConv?.patient_role}
          consultationType={selectedConv?.consultation_type}
          onClose={() => setShowPatientModal(false)}
        />,
        document.body
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-lg z-[60] flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
        }`}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toast.text}
        </div>
      )}

      {/* 🟢 NEW: Real-time consultation alert - shows when patient starts/reactivates consultation */}
      {newConsultationAlert && (
        <div
          className="fixed top-4 right-4 z-[70] animate-slide-in cursor-pointer"
          onClick={() => {
            setSelectedConvId(newConsultationAlert.id);
            setNewConsultationAlert(null);
          }}
        >
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border-l-4 bg-white ${
            newConsultationAlert.type === 'dental'
              ? 'border-l-blue-500'
              : 'border-l-emerald-500'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              newConsultationAlert.type === 'dental' ? 'bg-blue-100' : 'bg-emerald-100'
            }`}>
              <i className={`fa-solid fa-bell ${newConsultationAlert.type === 'dental' ? 'text-blue-500' : 'text-emerald-500'}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">New Consultation!</p>
              <p className="text-xs text-slate-500 truncate">{newConsultationAlert.message}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNewConsultationAlert(null); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultations;