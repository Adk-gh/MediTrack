import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import authService from '../../services/auth.service.js';
import { logAdminAction } from '../../services/audit.service';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler,
  RadialLinearScale
);

// ─── Brand palette ────────────────────────────────────────────────────────
const BRAND = '466460';
const BRAND_DARK = '3A524F';
const HEADER_TEXT = 'FFFFFF';
const LIGHT_BG = 'F4F7F6';
const BORDER_COLOR = 'D9E2E1';

// ─── Admin identity (audit logging) ──────────────────────────────────────
// Falls back through id -> uid -> 'system' so a log entry is still written
// even if the stored user object is incomplete. Kept consistent with the
// other admin-clinic screens (Record-Management.jsx, User-Management.jsx).
const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};
const currentUser = getCurrentUser();
const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

// ─── Medical conditions ─────────────────────────────────────────────────────
const MEDICAL_CONDITIONS = [
  { id: 'asthma', name: 'Asthma', keywords: ['asthma'], category: 'Respiratory', color: '#ef4444' },
  { id: 'diabetes', name: 'Diabetes', keywords: ['diabetes', 'diabetic'], category: 'Endocrine', color: '#f97316' },
  { id: 'hypertension', name: 'Hypertension', keywords: ['hypertension', 'high blood pressure', 'bp'], category: 'Cardiovascular', color: '#eab308' },
  { id: 'heart_disease', name: 'Heart Disease', keywords: ['heart disease', 'heart problem', 'cardiac'], category: 'Cardiovascular', color: '#84cc16' },
  { id: 'kidney', name: 'Kidney Disease', keywords: ['kidney', 'renal'], color: '#06b6d4' },
  { id: 'liver', name: 'Liver Disease', keywords: ['liver', 'hepatitis'], color: '#8b5cf6' },
  { id: 'tb', name: 'Tuberculosis', keywords: ['tuberculosis', 'tb'], category: 'Infectious', color: '#ec4899' },
  { id: 'thyroid', name: 'Thyroid', keywords: ['thyroid'], category: 'Endocrine', color: '#14b8a6' },
  { id: 'anemia', name: 'Anemia', keywords: ['anemia'], category: 'Hematological', color: '#f43f5e' },
  { id: 'epilepsy', name: 'Epilepsy', keywords: ['epilepsy', 'seizure'], category: 'Neurological', color: '#0ea5e9' },
  { id: 'vision', name: 'Vision Problems', keywords: ['vision', 'eye problem', 'blurred vision'], category: 'Vision', color: '#22c55e' },
  { id: 'hearing', name: 'Hearing Problems', keywords: ['hearing', 'ear problem', 'deaf'], category: 'Hearing', color: '#a855f7' },
  { id: 'orthopedic', name: 'Orthopedic', keywords: ['orthopedic', 'bone', 'joint', 'fracture'], category: 'Musculoskeletal', color: '#eab308' },
  { id: 'dental', name: 'Dental Problems', keywords: ['dental', 'teeth', 'tooth'], category: 'Dental', color: '#06b6d4' },
  { id: 'nutritional', name: 'Nutritional', keywords: ['nutritional', 'malnutrition', 'underweight', 'obesity'], category: 'Nutritional', color: '#f97316' },
  { id: 'normal', name: 'Normal Findings', keywords: ['normal', 'no findings', 'healthy', 'fit'], category: 'Normal', color: '#10b981' },
  { id: 'cough', name: 'Cough/URTI', keywords: ['cough', 'upper respiratory', 'urti'], category: 'Respiratory', color: '#f59e0b' },
  { id: 'fever', name: 'Fever', keywords: ['fever', 'pyrexia', 'febrile'], category: 'General', color: '#ef4444' },
  { id: 'headache', name: 'Headache', keywords: ['headache', 'head pain', 'migraine'], category: 'Neurological', color: '#8b5cf6' },
  { id: 'allergy', name: 'Allergies', keywords: ['allergy', 'allergic'], category: 'Immune', color: '#ec4899' },
  { id: 'skin_rash', name: 'Skin Conditions', keywords: ['skin', 'rash', 'dermatitis', 'eczema'], category: 'Dermatological', color: '#14b8a6' },
  { id: 'gi', name: 'GI Problems', keywords: ['stomach', 'gastritis', 'nausea', 'abdominal'], category: 'Gastrointestinal', color: '#0ea5e9' },
];

const DENTAL_CONDITIONS = [
  { id: 'extraction', name: 'Tooth Extraction', keywords: ['extraction'], category: 'Treatment History', color: '#ef4444' },
  { id: 'pulp_therapy', name: 'Pulp Therapy', keywords: ['pulp therapy'], category: 'Treatment History', color: '#f97316' },
  { id: 'tmj', name: 'TMJ Treatment', keywords: ['tmj treatment'], category: 'Treatment History', color: '#eab308' },
  { id: 'oral_prophylaxis', name: 'Oral Prophylaxis', keywords: ['oral prophylaxis'], category: 'Treatment History', color: '#84cc16' },
  { id: 'orthodontic', name: 'Orthodontic Therapy', keywords: ['orthodontic therapy', 'orthodontic'], category: 'Treatment History', color: '#06b6d4' },
  { id: 'periodontal', name: 'Periodontal Therapy', keywords: ['periodontal therapy', 'periodontal'], category: 'Treatment History', color: '#8b5cf6' },
  { id: 'filling', name: 'Filling/Restoration', keywords: ['filling', 'restoration'], category: 'Treatment History', color: '#ec4899' },
  { id: 'prosthodontic', name: 'Prosthodontic Therapy', keywords: ['prosthodontic therapy', 'prosthodontic'], category: 'Treatment History', color: '#14b8a6' },
  { id: 'drug_allergy', name: 'Drug Allergy', keywords: ['drug sensitivity', 'allergy'], category: 'Conditions', color: '#f43f5e' },
  { id: 'caries', name: 'Caries', keywords: ['caries', 'cavity'], category: 'Tooth Conditions', color: '#f59e0b' },
  { id: 'filled', name: 'Filled Teeth', keywords: ['filled'], category: 'Tooth Conditions', color: '#22c55e' },
  { id: 'missing', name: 'Missing Teeth', keywords: ['missing'], category: 'Tooth Conditions', color: '#94a3b8' },
  { id: 'good_oral_hygiene', name: 'Good Oral Hygiene', keywords: ['good'], category: 'Oral Hygiene', color: '#10b981' },
  { id: 'fair_oral_hygiene', name: 'Fair Oral Hygiene', keywords: ['fair'], category: 'Oral Hygiene', color: '#eab308' },
  { id: 'poor_oral_hygiene', name: 'Poor Oral Hygiene', keywords: ['poor'], category: 'Oral Hygiene', color: '#ef4444' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const IconTable = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);

// ─── Icons ────────────────────────────────────────────────────────────────
const IconDownload = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const IconFileText = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><polyline points="10 9 9 9 8 9"/></svg>
);
const IconCalendar = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IconActivity = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const IconFilter = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const IconHeartPulse = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
);
const IconStethoscope = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
);
const IconAlert = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconUsers = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconTooth = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v18"/><path d="M8 3v4a4 4 0 0 0 8 0V3"/><path d="M6 8h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
);

// ─── Card components ───────────────────────────────────────────────────────
const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);
const StatBox = ({ title, value, subtitle, icon: Icon, color = '#466460', className = '' }) => (
  <div className={`p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-center ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate mr-1">{title}</p>
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-white shadow-sm" style={{ color }}>
        <Icon size={14} />
      </div>
    </div>
    <h4 className="text-2xl font-bold text-slate-800 leading-none">{value}</h4>
    {subtitle && <p className="text-xs text-slate-500 mt-1.5 truncate">{subtitle}</p>}
  </div>
);
const ChartSkeleton = ({ h = '260px' }) => (
  <div className="flex items-center justify-center bg-slate-50 rounded-lg animate-pulse" style={{ height: h }}>
    <div className="text-slate-300 text-sm">Loading chart…</div>
  </div>
);

// ─── Excel export helpers ─────────────────────────────────────────────────
const thinBorder = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

function addTitleBanner(ws, title, subtitleLines, colSpan = 4) {
  ws.mergeCells(1, 1, 1, colSpan);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: HEADER_TEXT } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  ws.getRow(1).height = 30;

  subtitleLines.forEach((line, i) => {
    ws.mergeCells(2 + i, 1, 2 + i, colSpan);
    const c = ws.getCell(2 + i, 1);
    c.value = line;
    c.font = { size: 10, color: { argb: '5B6B69' }, italic: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
  });

  return 2 + subtitleLines.length + 1;
}
function addSectionHeader(ws, row, text, colSpan) {
  ws.mergeCells(row, 1, row, colSpan);
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { bold: true, size: 12, color: { argb: HEADER_TEXT } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
  c.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 22;
  return row + 1;
}
function addTableHeader(ws, row, headers) {
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: HEADER_TEXT } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.border = thinBorder;
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
  });
  ws.getRow(row).height = 18;
  return row + 1;
}
function addDataRow(ws, row, values, { zebra = false, boldFirst = false } = {}) {
  values.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.border = thinBorder;
    c.font = { size: 10, bold: boldFirst && i === 0 };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    if (zebra) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFA' } };
    }
  });
  return row + 1;
}
function pctOf(part, total) { return total > 0 ? part / total : 0; }
function applyPercentFormat(ws, row, col) { ws.getCell(row, col).numFmt = '0%'; }

// ─── Helper: range year calculation ───────────────────────────────────────
function getSchoolYear(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 7) {
    return `${y}-${y + 1}`;
  } else {
    return `${y - 1}-${y}`;
  }
}

// ─── Main component ───────────────────────────────────────────────────────
export const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [dentalRecords, setDentalRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [clinicStaffCount, setClinicStaffCount] = useState(0);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [schoolYear, setSchoolYear] = useState('all');
  const [specificMonth, setSpecificMonth] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await authService.getAuthHeaders();

      // ---- filter archived -------------------------------------------------
      const filterArchived = (data) => {
        if (!Array.isArray(data)) return [];
        return data.filter(item => {
          const archived = item.is_archived;
          return (
            archived !== true && archived !== 1 &&
            String(archived).toLowerCase().trim() !== 'true' &&
            String(archived).trim() !== '1'
          );
        });
      };

      // ---- Users -----------------------------------------------------------
      const usersRes = await fetch(`${import.meta.env.VITE_API_URL}/records`, { headers }).catch(() => null);
      let usersData = [];
      if (usersRes && usersRes.ok) {
        const json = await usersRes.json();
        const rawData = filterArchived(json.data || json || []);
        const patients = rawData.filter(u => u.role?.toLowerCase() !== 'sysadmin');
        const clinicStaff = rawData.filter(u => ['doctor', 'dentist', 'nurse', 'clinic', 'physician'].some(k => (u.role || '').toLowerCase().includes(k)));
        usersData = patients;
        setClinicStaffCount(clinicStaff.length);
      }
      setUsers(usersData);

      // ---- Appointments ----------------------------------------------------
      const apptRes = await fetch(`${import.meta.env.VITE_API_URL}/appointments`, { headers }).catch(() => null);
      let apptData = [];
      if (apptRes && apptRes.ok) {
        const json = await apptRes.json();
        apptData = filterArchived(json.data || json || []);
      }
      setAppointments(apptData);

      // ---- Medical Examinations --------------------------------------------
      const medRes = await fetch(`${import.meta.env.VITE_API_URL}/examinations/medical`, { headers }).catch(() => null);
      let medData = [];
      if (medRes && medRes.ok) {
        const json = await medRes.json();
        medData = filterArchived(json.data || json || []);
      }
      setMedicalRecords(medData);

      // ---- Dental Examinations ---------------------------------------------
      const denRes = await fetch(`${import.meta.env.VITE_API_URL}/examinations/dental`, { headers }).catch(() => null);
      let denData = [];
      if (denRes && denRes.ok) {
        const json = await denRes.json();
        denData = filterArchived(json.data || json || []);
      }
      setDentalRecords(denData);
    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------------------------------------------------------------------------
  //  Data processing & chart helpers
  // ------------------------------------------------------------------------
  const processedData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);

    const applyRange = (dateInput) => {
      if (!dateInput) return false;
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return false;
      if (dateRange !== 'all' && d < startDate) return false;
      if (schoolYear !== 'all' && getSchoolYear(d) !== schoolYear) return false;
      if (specificMonth !== 'all' && d.getMonth() !== parseInt(specificMonth)) return false;
      return true;
    };

    const filteredAppts = appointments.filter(a => {
      let dStr = a.created_at || a.createdAt;
      if (a.year && a.month && a.day) {
        dStr = new Date(Number(a.year), Number(a.month) - 1, Number(a.day)).toISOString();
      }
      return applyRange(dStr);
    });

    const filteredMed = medicalRecords.filter(r => applyRange(r.exam_date || r.created_at || r.createdAt));
    const filteredDen = dentalRecords.filter(r => applyRange(r.exam_date || r.created_at || r.createdAt));

    const monthlyAppts = Array(12).fill(0);
    const monthlyMed = Array(12).fill(0);
    const monthlyDen = Array(12).fill(0);
    filteredAppts.forEach(a => { if (a.month) monthlyAppts[Number(a.month) - 1]++; });
    filteredMed.forEach(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      if (d.getFullYear() === now.getFullYear()) monthlyMed[d.getMonth()]++;
    });
    filteredDen.forEach(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      if (d.getFullYear() === now.getFullYear()) monthlyDen[d.getMonth()]++;
    });

    const conditionCounts = {};
    MEDICAL_CONDITIONS.forEach(cond => { conditionCounts[cond.id] = 0; });
    const findingsList = [];

    let fitCount = 0, notFitCount = 0, normalFindingsCount = 0, abnormalFindingsCount = 0, approvedCount = 0, pendingCount = 0;
    filteredMed.forEach(r => {
      if (r.is_fit === true) fitCount++; else if (r.is_fit === false) notFitCount++;
      if (r.is_normal_findings === true) normalFindingsCount++; else if (r.is_normal_findings === false) abnormalFindingsCount++;
      if (r.status === 'approved' || r.is_approved === true) approvedCount++; else if (r.status === 'pending') pendingCount++;

      const finding1 = (r.finding1 || '').toLowerCase();
      const checkedMedical = Array.isArray(r.checked_medical) ? r.checked_medical.join(' ').toLowerCase() : '';
      const checkedFamily = Array.isArray(r.checked_family) ? r.checked_family.join(' ').toLowerCase() : '';
      const checkedHealth = Array.isArray(r.checked_health) ? r.checked_health.join(' ').toLowerCase() : '';
      const otherHistory = (r.other_medical_history || '').toLowerCase();
      const searchText = `${finding1} ${checkedMedical} ${checkedFamily} ${checkedHealth} ${otherHistory}`;

      const foundConditions = new Set();
      MEDICAL_CONDITIONS.forEach(cond => {
        cond.keywords.forEach(keyword => {
          if (searchText.includes(keyword) && !foundConditions.has(cond.id)) {
            foundConditions.add(cond.id);
            conditionCounts[cond.id]++;
          }
        });
      });

      findingsList.push({
        id: r.id, name: `${r.last_name || ''}, ${r.first_name || ''}`.replace(/^, |, $/g, '') || 'Unknown',
        universityId: r.university_id || '',
        finding1: r.finding1 || null,
        checkedMedical: r.checked_medical || [],
        checkedHealth: r.checked_health || [],
        otherHistory: r.other_medical_history || null,
        isFit: r.is_fit,
        isNormal: r.is_normal_findings,
        examDate: r.exam_date,
        status: r.status,
      });
    });

    const categoryBreakdown = {};
    MEDICAL_CONDITIONS.forEach(cond => {
      if (!categoryBreakdown[cond.category]) categoryBreakdown[cond.category] = 0;
      categoryBreakdown[cond.category] += conditionCounts[cond.id];
    });

    const dentalConditionCounts = {};
    DENTAL_CONDITIONS.forEach(cond => { dentalConditionCounts[cond.id] = 0; });
    const dentalFindingsList = [];

    filteredDen.forEach(r => {
      const dentalHistory = typeof r.dental_history === 'string' ? JSON.parse(r.dental_history || '{}') : (r.dental_history || {});
      const intraoral = typeof r.intraoral === 'string' ? JSON.parse(r.intraoral || '{}') : (r.intraoral || {});
      DENTAL_CONDITIONS.forEach(cond => {
        cond.keywords.forEach(keyword => {
          Object.values(dentalHistory).forEach(val => {
            if (String(val).toLowerCase().includes(keyword.toLowerCase()) && String(val).toLowerCase() !== 'no') dentalConditionCounts[cond.id]++;
          });
          Object.values(intraoral).forEach(val => {
            if (String(val).toLowerCase().includes(keyword.toLowerCase()) && !['no','false'].includes(String(val).toLowerCase())) dentalConditionCounts[cond.id]++;
          });
        });
      });
      dentalFindingsList.push({
        id: r.id, name: `${r.last_name || ''}, ${r.first_name || ''}`.replace(/^, |, $/g, '') || 'Unknown',
        universityId: r.university_id || '',
        dentalHistory, intraoral, status: r.status, examDate: r.exam_date,
      });
    });

    const dentalCategoryBreakdown = {};
    DENTAL_CONDITIONS.forEach(cond => {
      if (!dentalCategoryBreakdown[cond.category]) dentalCategoryBreakdown[cond.category] = 0;
      dentalCategoryBreakdown[cond.category] += dentalConditionCounts[cond.id];
    });

    return {
      appointments: filteredAppts,
      medical: filteredMed,
      dental: filteredDen,
      users,
      clinicStaffCount,
      monthlyAppts,
      monthlyMed,
      monthlyDen,
      totalAppts: filteredAppts.length,
      totalMed: filteredMed.length,
      totalDen: filteredDen.length,
      totalUsers: users.length,
      completedAppts: filteredAppts.filter(a => a.status === 'done').length,
      pendingAppts: filteredAppts.filter(a => a.status === 'pending').length,
      approvedAppts: filteredAppts.filter(a => a.status === 'approved').length,
      missedAppts: filteredAppts.filter(a => ['declined', 'rejected'].includes(a.status?.toLowerCase())).length,
      rejectedAppts: filteredAppts.filter(a => ['declined', 'rejected'].includes(a.status?.toLowerCase())).length,
      conditionCounts,
      categoryBreakdown,
      mostCommonCondition: Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0],
      fitCount,
      notFitCount,
      normalFindingsCount,
      abnormalFindingsCount,
      medApprovedCount: approvedCount,
      medPendingCount: pendingCount,
      findingsList,
      dentalConditionCounts,
      dentalCategoryBreakdown,
      dentalFindingsList,
      mostCommonDentalCondition: Object.entries(dentalConditionCounts).sort((a, b) => b[1] - a[1])[0],
    };
  }, [appointments, medicalRecords, dentalRecords, users, clinicStaffCount, dateRange, schoolYear, specificMonth]);

  // ------------------------------------------------------------------------
  //  Chart data memoization
  // ------------------------------------------------------------------------
  const appointmentTrendsData = useMemo(() => ({
    labels: MONTHS,
    datasets: [{ label: 'Appointments', data: processedData.monthlyAppts, borderColor: '#466460', backgroundColor: 'rgba(70, 100, 96, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 }]
  }), [processedData.monthlyAppts]);

  const medicalDentalData = useMemo(() => ({
    labels: ['Medical Exams', 'Dental Exams'],
    datasets: [{ data: [processedData.totalMed, processedData.totalDen], backgroundColor: ['#466460', '#e07a5f'], borderWidth: 0 }]
  }), [processedData.totalMed, processedData.totalDen]);

  const appointmentStatusData = useMemo(() => ({
    labels: ['Completed', 'Pending', 'Approved', 'Missed', 'Rejected'],
    datasets: [{
      label: 'Appointments',
      data: [
        processedData.completedAppts,
        processedData.pendingAppts,
        processedData.approvedAppts,
        processedData.missedAppts,
        processedData.rejectedAppts
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#f97316', '#ef4444'],
      borderRadius: 6
    }]
  }), [processedData]);

  const monthlyComparisonData = useMemo(() => ({
    labels: MONTHS,
    datasets: [{ label: 'Medical', data: processedData.monthlyMed, backgroundColor: '#466460', borderRadius: 4 }, { label: 'Dental', data: processedData.monthlyDen, backgroundColor: '#e07a5f', borderRadius: 4 }]
  }), [processedData.monthlyMed, processedData.monthlyDen]);

  const conditionDistributionData = useMemo(() => ({
    labels: MEDICAL_CONDITIONS.map(i => i.name),
    datasets: [{ data: MEDICAL_CONDITIONS.map(i => processedData.conditionCounts[i.id]), backgroundColor: MEDICAL_CONDITIONS.map(i => i.color + '80'), borderColor: MEDICAL_CONDITIONS.map(i => i.color), borderWidth: 1 }]
  }), [processedData.conditionCounts]);

  const categoryBreakdownData = useMemo(() => ({
    labels: Object.keys(processedData.categoryBreakdown),
    datasets: [{ label: 'Cases', data: Object.values(processedData.categoryBreakdown), backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'], borderRadius: 6 }]
  }), [processedData.categoryBreakdown]);

  const dentalConditionData = useMemo(() => ({
    labels: DENTAL_CONDITIONS.map(c => c.name),
    datasets: [{ label: 'Count', data: DENTAL_CONDITIONS.map(c => processedData.dentalConditionCounts[c.id]), backgroundColor: DENTAL_CONDITIONS.map(c => c.color), borderRadius: 4 }]
  }), [processedData.dentalConditionCounts]);

  const patientTypeData = useMemo(() => {
    const typeCounts = { student: 0, faculty: 0 };
    processedData.users.forEach(u => {
      const role = (u.role || '').toLowerCase();
      if (role.includes('student')) typeCounts.student++;
      else if (role.includes('faculty') || role.includes('lecturer') || role.includes('professor')) typeCounts.faculty++;
    });
    return { labels: ['Students', 'Faculty'], datasets: [{ data: [typeCounts.student, typeCounts.faculty], backgroundColor: ['#466460', '#e07a5f'], borderWidth: 0 }] };
  }, [processedData.users]);

  // ------------------------------------------------------------------------
  //  Appointment duration summary (average across all appointments)
  // ------------------------------------------------------------------------
  const appointmentDurationSummary = useMemo(() => {
    const durations = [];
    const byStatus = {};

    processedData.appointments.forEach(a => {
      const created = a.created_at || a.createdAt;
      const updated = a.updated_at || a.updatedAt;
      if (!created || !updated) return;
      const hours = (new Date(updated).getTime() - new Date(created).getTime()) / (1000 * 60 * 60);
      if (!Number.isFinite(hours) || hours < 0) return;

      durations.push(hours);
      const status = a.status || 'unknown';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(hours);
    });

    const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    const statusBreakdown = Object.entries(byStatus)
      .map(([status, arr]) => ({ status, avg: avg(arr), count: arr.length }))
      .sort((a, b) => b.count - a.count);

    return {
      trackedCount: durations.length,
      totalCount: processedData.appointments.length,
      overallAvg: avg(durations),
      overallMin: durations.length ? Math.min(...durations) : 0,
      overallMax: durations.length ? Math.max(...durations) : 0,
      statusBreakdown,
    };
  }, [processedData.appointments]);

  // ------------------------------------------------------------------------
  //  Export helpers
  // ------------------------------------------------------------------------
  const exportToCSV = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MediTrack';
      workbook.created = new Date();
      const todayLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const rangeLabel = dateRange === 'all' ? 'All Time' : dateRange === 'month' ? 'This Month' : dateRange === 'quarter' ? 'Last 3 Months' : 'This Year';
      const syLabel = schoolYear === 'all' ? 'All SY' : `SY ${schoolYear}`;
      const monthLabel = specificMonth === 'all' ? '' : MONTHS_FULL[parseInt(specificMonth)];
      const subtitle = [`Generated: ${todayLabel}`, `Date Range: ${rangeLabel}`, `School Year: ${syLabel}`];
      if (monthLabel) subtitle.push(`Month: ${monthLabel}`);

      // ---- Overview -------------------------------------------------------
      {
        const ws = workbook.addWorksheet('Overview');
        ws.columns = [{ width: 28 }, { width: 24 }, { width: 14 }, { width: 14 }];
        let r = addTitleBanner(ws, 'MediTrack Health Report', subtitle, 4);
        r = addSectionHeader(ws, r, 'Overview Statistics', 4);
        r = addTableHeader(ws, r, ['Category', 'Metric', 'Count', '']);
        const overviewRows = [
          ['Overview', 'Total Medical Exams', processedData.totalMed],
          ['Overview', 'Total Dental Exams', processedData.totalDen],
          ['Overview', 'Total Appointments', processedData.totalAppts],
          ['Overview', 'Total Patients', processedData.totalUsers],
          ['Overview', 'Total Clinic Staff', processedData.clinicStaffCount],
        ].sort((a, b) => b[2] - a[2]);
        overviewRows.forEach((row, i) => { r = addDataRow(ws, r, [...row, ''], { zebra: i % 2 === 1 }); });
      }

      // ---- Appointments ---------------------------------------------------
      {
        const ws = workbook.addWorksheet('Appointments');
        ws.columns = [{ width: 20 }, { width: 14 }, { width: 14 }, { width: 10 }];
        let r = addTitleBanner(ws, 'Appointments Analysis', subtitle, 4);
        r = addSectionHeader(ws, r, 'Status Breakdown', 4);
        r = addTableHeader(ws, r, ['Status', 'Count', 'Percentage', '']);
        const statusRows = [
          ['Completed', processedData.completedAppts],
          ['Pending', processedData.pendingAppts],
          ['Approved', processedData.approvedAppts],
          ['Missed', processedData.missedAppts],
          ['Rejected', processedData.rejectedAppts]
        ].sort((a, b) => b[1] - a[1]);
        statusRows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], pctOf(row[1], processedData.totalAppts), ''], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 3); });
        r += 1;
        r = addSectionHeader(ws, r, 'Monthly Appointments', 4);
        r = addTableHeader(ws, r, ['Month', 'Count', '', '']);
        MONTHS.forEach((m, idx) => { r = addDataRow(ws, r, [m, processedData.monthlyAppts[idx], '', ''], { zebra: idx % 2 === 1 }); });
        r += 1;
        r = addSectionHeader(ws, r, 'Duration Summary', 4);
        r = addTableHeader(ws, r, ['Metric', 'Value', '', '']);
        r = addDataRow(ws, r, ['Average Duration (hrs)', appointmentDurationSummary.overallAvg.toFixed(1), '', ''], { zebra: false });
        r = addDataRow(ws, r, ['Fastest (hrs)', appointmentDurationSummary.overallMin.toFixed(1), '', ''], { zebra: true });
        r = addDataRow(ws, r, ['Slowest (hrs)', appointmentDurationSummary.overallMax.toFixed(1), '', ''], { zebra: false });
        r = addDataRow(ws, r, ['Tracked / Total', `${appointmentDurationSummary.trackedCount} / ${appointmentDurationSummary.totalCount}`, '', ''], { zebra: true });
        r += 1;
        r = addSectionHeader(ws, r, 'Average Duration by Status', 4);
        r = addTableHeader(ws, r, ['Status', 'Count', 'Average Duration (hrs)', '']);
        appointmentDurationSummary.statusBreakdown.forEach((row, i) => {
          r = addDataRow(ws, r, [row.status, row.count, row.avg.toFixed(1), ''], { zebra: i % 2 === 1 });
        });
      }

      // ---- Medical Exams --------------------------------------------------
      {
        const ws = workbook.addWorksheet('Medical Exams');
        ws.columns = [{ width: 22 }, { width: 12 }, { width: 14 }, { width: 10 }];
        let r = addTitleBanner(ws, 'Medical Examinations', subtitle, 4);
        r = addSectionHeader(ws, r, 'Summary', 4);
        r = addTableHeader(ws, r, ['Metric', 'Count', 'Percentage', '']);
        const medRows = [
          ['Fit', processedData.fitCount, pctOf(processedData.fitCount, processedData.totalMed)],
          ['Not Fit', processedData.notFitCount, pctOf(processedData.notFitCount, processedData.totalMed)],
          ['Normal Findings', processedData.normalFindingsCount, pctOf(processedData.normalFindingsCount, processedData.totalMed)],
          ['Abnormal Findings', processedData.abnormalFindingsCount, pctOf(processedData.abnormalFindingsCount, processedData.totalMed)],
          ['Approved', processedData.medApprovedCount, pctOf(processedData.medApprovedCount, processedData.totalMed)],
          ['Pending', processedData.medPendingCount, pctOf(processedData.medPendingCount, processedData.totalMed)]
        ].sort((a, b) => b[1] - a[1]);
        r = addDataRow(ws, r, ['Total Medical Exams', processedData.totalMed, null, ''], { zebra: false });
        medRows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], row[2] === null ? '' : row[2], ''], { zebra: i % 2 === 1 }); if (row[2] !== null) applyPercentFormat(ws, r - 1, 3); });
        r += 1;
        r = addSectionHeader(ws, r, 'Monthly Medical Exams', 4);
        r = addTableHeader(ws, r, ['Month', 'Count', '', '']);
        MONTHS.forEach((m, idx) => { r = addDataRow(ws, r, [m, processedData.monthlyMed[idx], '', ''], { zebra: idx % 2 === 1 }); });
      }

      // ---- Health Conditions -----------------------------------------------
      {
        const ws = workbook.addWorksheet('Health Conditions');
        ws.columns = [{ width: 24 }, { width: 20 }, { width: 10 }, { width: 12 }];
        let r = addTitleBanner(ws, 'Health Conditions Breakdown', subtitle, 4);
        r = addSectionHeader(ws, r, 'All Conditions', 4);
        const headerRow = addTableHeader(ws, r, ['Condition', 'Category', 'Cases', '% of Total']);
        r = headerRow;
        const sortedMedConditions = [...MEDICAL_CONDITIONS]
          .map(cond => ({ ...cond, count: processedData.conditionCounts[cond.id] }))
          .sort((a, b) => b.count - a.count);
        sortedMedConditions.forEach((cond, i) => {
          r = addDataRow(ws, r, [cond.name, cond.category, cond.count, pctOf(cond.count, processedData.totalMed)], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 4);
        });
        ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: r - 1, column: 4 } };
        ws.views = [{ state: 'frozen', ySplit: headerRow }];
      }

      // ---- Dental -----------------------------------------------------------
      {
        const ws = workbook.addWorksheet('Dental');
        ws.columns = [{ width: 24 }, { width: 20 }, { width: 10 }, { width: 12 }];
        let r = addTitleBanner(ws, 'Dental Examinations', subtitle, 4);
        r = addSectionHeader(ws, r, 'Summary', 4);
        r = addTableHeader(ws, r, ['Metric', 'Count', 'Percentage', '']);
        const approvedDen = processedData.dentalFindingsList.filter(d => d.status === 'approved').length;
        const pendingDen = processedData.dentalFindingsList.filter(d => d.status === 'pending').length;
        const denRows = [
          ['Approved', approvedDen, pctOf(approvedDen, processedData.totalDen)],
          ['Pending', pendingDen, pctOf(pendingDen, processedData.totalDen)]
        ].sort((a, b) => b[1] - a[1]);
        r = addDataRow(ws, r, ['Total Dental Exams', processedData.totalDen, null, ''], { zebra: false });
        approvedDen && pendingDen.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], row[2] === null ? '' : row[2], ''], { zebra: i % 2 === 1 }); if (row[2] !== null) applyPercentFormat(ws, r - 1, 3); });
        r += 1;
        r = addSectionHeader(ws, r, 'Dental Conditions', 4);
        const dentalHeaderRow = addTableHeader(ws, r, ['Condition', 'Category', 'Count', '']);
        r = dentalHeaderRow;
        const sortedDentalConditions = [...DENTAL_CONDITIONS]
          .map(cond => ({ ...cond, count: processedData.dentalConditionCounts[cond.id] }))
          .sort((a, b) => b.count - a.count);
        sortedDentalConditions.forEach((cond, i) => { r = addDataRow(ws, r, [cond.name, cond.category, cond.count, ''], { zebra: i % 2 === 1 }); });
        ws.autoFilter = { from: { row: dentalHeaderRow, column: 1 }, to: { row: r - 1, column: 3 } };
      }

      // ---- Demographics ------------------------------------------------------
      {
        const ws = workbook.addWorksheet('Demographics');
        ws.columns = [{ width: 20 }, { width: 14 }, { width: 14 }, { width: 10 }];
        let r = addTitleBanner(ws, 'Patient Demographics', subtitle, 4);
        r = addSectionHeader(ws, r, 'By Role', 4);
        r = addTableHeader(ws, r, ['Type', 'Count', 'Percentage', '']);
        r = addDataRow(ws, r, ['Total Patients (Students + Faculty)', processedData.totalUsers, '', ''], { zebra: false });
        const typeCounts = { student: 0, faculty: 0 };
        processedData.users.forEach(u => {
          const role = (u.role || '').toLowerCase();
          if (role.includes('student')) typeCounts.student++;
          else if (role.includes('faculty') || role.includes('lecturer') || role.includes('professor')) typeCounts.faculty++;
        });
        const demoRows = [
          ['Students', typeCounts.student],
          ['Faculty', typeCounts.faculty],
          ['Clinic Staff', processedData.clinicStaffCount]
        ].sort((a, b) => b[1] - a[1]);
        demoRows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], pctOf(row[1], processedData.totalUsers), ''], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 3); });
      }

      // ---- Monthly Comparison ------------------------------------------------
      {
        const ws = workbook.addWorksheet('Monthly Consultations Comparison');
        ws.columns = [{ width: 26 }, { width: 20 }, { width: 14 }, { width: 12 }];
        let r = addTitleBanner(ws, 'Monthly Consultations Comparison', subtitle, 4);
        r = addSectionHeader(ws, r, 'Monthly Consultations Comparison', 4);
        MONTHS.forEach((m, idx) => {
          const med = processedData.monthlyMed[idx];
          const den = processedData.monthlyDen[idx];
          r = addDataRow(ws, r, [m, med, den, med + den], { zebra: idx % 2 === 1 });
        });
      }

      // ---- Summary -----------------------------------------------------------
      {
        const ws = workbook.addWorksheet('Summary Report');
        ws.columns = [{ width: 26 }, { width: 20 }, { width: 14 }, { width: 12 }];
        let r = addTitleBanner(ws, 'Summary Report', subtitle, 4);
        r = addSectionHeader(ws, r, 'Summary Report', 4);
        const rows = [
          ['Patients', 'Total Registered', processedData.totalUsers],
          ['Consultations', 'Medical', processedData.totalMed],
          ['Consultations', 'Dental', processedData.totalDen],
          ['Appointments', 'Completed', processedData.completedAppts],
          ['Appointments', 'Pending', processedData.pendingAppts],
          ['Medical Records', 'Approved', processedData.medApprovedCount],
          ['Medical Records', 'Pending', processedData.medPendingCount],
          ['Fitness Status', 'Fit', processedData.fitCount],
          ['Fitness Status', 'Not Fit', processedData.notFitCount],
          ['Findings', 'Normal', processedData.normalFindingsCount]
        ].sort((a, b) => b[2] - a[2]);
        rows.forEach((row, i) => { r = addDataRow(ws, r, [...row, ''], { zebra: i % 2 === 1 }); });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `MediTrack_${Date.now()}_Report.xlsx`);

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'report_exported',
        details: { scope: 'full', dateRange, schoolYear, specificMonth },
        adminUid,
      });
    } catch (err) {
      console.error('Error exporting Excel report:', err);
    }
  };

  const exportCategoryToCSV = async (category) => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MediTrack';
      workbook.created = new Date();
      const todayLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const rangeLabel = dateRange === 'all' ? 'All Time' : dateRange === 'month' ? 'This Month' : dateRange === 'quarter' ? 'Last 3 Months' : 'This Year';
      const syLabel = schoolYear === 'all' ? 'All SY' : `SY ${schoolYear}`;
      const monthLabel = specificMonth === 'all' ? '' : MONTHS_FULL[parseInt(specificMonth)];
      const subtitle = [`Generated: ${todayLabel}`, `Date Range: ${rangeLabel}`, `School Year: ${syLabel}`];
      if (monthLabel) subtitle.push(`Month: ${monthLabel}`);

      const titles = {
        appointments: 'Appointments Analysis',
        medical: 'Medical Examinations',
        dental: 'Dental Examinations',
        conditions: 'Health Conditions Breakdown',
        demographics: 'Patient Demographics',
        monthly: 'Monthly Consultations Comparison',
        summary: 'Summary Report'
      };

      const ws = workbook.addWorksheet(titles[category] ? titles[category].slice(0, 31) : 'Report');
      ws.columns = [{ width: 26 }, { width: 20 }, { width: 14 }, { width: 12 }];
      let r = addTitleBanner(ws, `MediTrack — ${titles[category] || 'Report'}`, subtitle, 4);

      switch (category) {
        case 'appointments': {
          r = addSectionHeader(ws, r, 'Status Breakdown', 4);
          r = addTableHeader(ws, r, ['Status', 'Count', 'Percentage', '']);
          const rows = [
            ['Completed', processedData.completedAppts],
            ['Pending', processedData.pendingAppts],
            ['Approved', processedData.approvedAppts],
            ['Missed', processedData.missedAppts],
            ['Rejected', processedData.rejectedAppts]
          ].sort((a, b) => b[1] - a[1]);
          r = addDataRow(ws, r, ['Total', processedData.totalAppts, null, ''], { zebra: false });
          rows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], pctOf(row[1], processedData.totalAppts), ''], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 3); });
          r += 1;
          r = addSectionHeader(ws, r, 'Monthly Appointments', 4);
          r = addTableHeader(ws, r, ['Month', 'Count', '', '']);
          MONTHS.forEach((m, idx) => { r = addDataRow(ws, r, [m, processedData.monthlyAppts[idx], '', ''], { zebra: idx % 2 === 1 }); });
          r += 1;
          r = addSectionHeader(ws, r, 'Duration Summary', 4);
          r = addTableHeader(ws, r, ['Metric', 'Value', '', '']);
          r = addDataRow(ws, r, ['Average Duration (hrs)', appointmentDurationSummary.overallAvg.toFixed(1), '', ''], { zebra: false });
          r = addDataRow(ws, r, ['Fastest (hrs)', appointmentDurationSummary.overallMin.toFixed(1), '', ''], { zebra: true });
          r = addDataRow(ws, r, ['Slowest (hrs)', appointmentDurationSummary.overallMax.toFixed(1), '', ''], { zebra: false });
          r = addDataRow(ws, r, ['Tracked / Total', `${appointmentDurationSummary.trackedCount} / ${appointmentDurationSummary.totalCount}`, '', ''], { zebra: true });
          r += 1;
          r = addSectionHeader(ws, r, 'Average Duration by Status', 4);
          r = addTableHeader(ws, r, ['Status', 'Count', 'Average Duration (hrs)', '']);
          appointmentDurationSummary.statusBreakdown.forEach((row, i) => {
            r = addDataRow(ws, r, [row.status, row.count, row.avg.toFixed(1), ''], { zebra: i % 2 === 1 });
          });
          break;
        }
        case 'medical': {
          r = addSectionHeader(ws, r, 'Summary', 4);
          r = addTableHeader(ws, r, ['Metric', 'Count', 'Percentage', '']);
          const rows = [
            ['Fit', processedData.fitCount, pctOf(processedData.fitCount, processedData.totalMed)],
            ['Not Fit', processedData.notFitCount, pctOf(processedData.notFitCount, processedData.totalMed)],
            ['Normal Findings', processedData.normalFindingsCount, pctOf(processedData.normalFindingsCount, processedData.totalMed)],
            ['Abnormal Findings', processedData.abnormalFindingsCount, pctOf(processedData.abnormalFindingsCount, processedData.totalMed)],
            ['Approved', processedData.medApprovedCount, pctOf(processedData.medApprovedCount, processedData.totalMed)],
            ['Pending', processedData.medPendingCount, pctOf(processedData.medPendingCount, processedData.totalMed)]
          ].sort((a, b) => b[1] - a[1]);
          r = addDataRow(ws, r, ['Total Medical Exams', processedData.totalMed, null, ''], { zebra: false });
          rows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], row[2] === null ? '' : row[2], ''], { zebra: i % 2 === 1 }); if (row[2] !== null) applyPercentFormat(ws, r - 1, 3); });
          r += 1;
          r = addSectionHeader(ws, r, 'Monthly Medical Exams', 4);
          r = addTableHeader(ws, r, ['Month', 'Count', '', '']);
          MONTHS.forEach((m, idx) => { r = addDataRow(ws, r, [m, processedData.monthlyMed[idx], '', ''], { zebra: idx % 2 === 1 }); });
          break;
        }
        case 'dental': {
          r = addSectionHeader(ws, r, 'Summary', 4);
          r = addTableHeader(ws, r, ['Metric', 'Count', 'Percentage', '']);
          const approvedDen = processedData.dentalFindingsList.filter(d => d.status === 'approved').length;
          const pendingDen = processedData.dentalFindingsList.filter(d => d.status === 'pending').length;
          const rows = [
            ['Approved', approvedDen, pctOf(approvedDen, processedData.totalDen)],
            ['Pending', pendingDen, pctOf(pendingDen, processedData.totalDen)]
          ].sort((a, b) => b[1] - a[1]);
          r = addDataRow(ws, r, ['Total Dental Exams', processedData.totalDen, null, ''], { zebra: false });
          rows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], row[2] === null ? '' : row[2], ''], { zebra: i % 2 === 1 }); if (row[2] !== null) applyPercentFormat(ws, r - 1, 3); });
          r += 1;
          r = addSectionHeader(ws, r, 'Dental Conditions', 4);
          const dentalHeaderRow = addTableHeader(ws, r, ['Condition', 'Category', 'Count', '']);
          r = dentalHeaderRow;
          const sortedDentalConditions = [...DENTAL_CONDITIONS]
            .map(cond => ({ ...cond, count: processedData.dentalConditionCounts[cond.id] }))
            .sort((a, b) => b.count - a.count);
          sortedDentalConditions.forEach((cond, i) => { r = addDataRow(ws, r, [cond.name, cond.category, cond.count, ''], { zebra: i % 2 === 1 }); });
          ws.autoFilter = { from: { row: dentalHeaderRow, column: 1 }, to: { row: r - 1, column: 3 } };
          break;
        }
        case 'conditions': {
          r = addSectionHeader(ws, r, 'All Conditions', 4);
          const headerRow = addTableHeader(ws, r, ['Condition', 'Category', 'Cases', '% of Total']);
          r = headerRow;
          const sortedMedConditions = [...MEDICAL_CONDITIONS]
            .map(cond => ({ ...cond, count: processedData.conditionCounts[cond.id] }))
            .sort((a, b) => b.count - a.count);
          sortedMedConditions.forEach((cond, i) => {
            r = addDataRow(ws, r, [cond.name, cond.category, cond.count, pctOf(cond.count, processedData.totalMed)], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 4);
          });
          ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: r - 1, column: 4 } };
          break;
        }
        case 'demographics': {
          r = addSectionHeader(ws, r, 'By Role', 4);
          r = addTableHeader(ws, r, ['Type', 'Count', 'Percentage', '']);
          const typeCounts = { student: 0, faculty: 0 };
          processedData.users.forEach(u => {
            const role = (u.role || '').toLowerCase();
            if (role.includes('student')) typeCounts.student++;
            else if (role.includes('faculty') || role.includes('lecturer') || role.includes('professor')) typeCounts.faculty++;
          });
          r = addDataRow(ws, r, ['Total Patients (Students + Faculty)', processedData.totalUsers, '', ''], { zebra: false });
          const demoRows = [
            ['Students', typeCounts.student],
            ['Faculty', typeCounts.faculty],
            ['Clinic Staff', processedData.clinicStaffCount]
          ].sort((a, b) => b[1] - a[1]);
          demoRows.forEach((row, i) => { r = addDataRow(ws, r, [row[0], row[1], pctOf(row[1], processedData.totalUsers), ''], { zebra: i % 2 === 1 }); applyPercentFormat(ws, r - 1, 3); });
          break;
        }
        case 'monthly': {
          r = addSectionHeader(ws, r, 'Monthly Consultations Comparison', 4);
          r = addTableHeader(ws, r, ['Month', 'Medical Exams', 'Dental Exams', 'Total']);
          MONTHS.forEach((m, idx) => {
            const med = processedData.monthlyMed[idx];
            const den = processedData.monthlyDen[idx];
            r = addDataRow(ws, r, [m, med, den, med + den], { zebra: idx % 2 === 1 });
          });
          break;
        }
        case 'summary': {
          r = addSectionHeader(ws, r, 'Summary Report', 4);
          r = addTableHeader(ws, r, ['Category', 'Metric', 'Count', '']);
          const rows = [
            ['Patients', 'Total Registered', processedData.totalUsers],
            ['Consultations', 'Medical', processedData.totalMed],
            ['Consultations', 'Dental', processedData.totalDen],
            ['Appointments', 'Completed', processedData.completedAppts],
            ['Appointments', 'Pending', processedData.pendingAppts],
            ['Medical Records', 'Approved', processedData.medApprovedCount],
            ['Medical Records', 'Pending', processedData.medPendingCount],
            ['Fitness Status', 'Fit', processedData.fitCount],
            ['Fitness Status', 'Not Fit', processedData.notFitCount],
            ['Findings', 'Normal', processedData.normalFindingsCount]
          ].sort((a, b) => b[2] - a[2]);
          rows.forEach((row, i) => { r = addDataRow(ws, r, [...row, ''], { zebra: i % 2 === 1 }); });
          break;
        }
        default:
          addDataRow(ws, r, ['No data available for this category', '', '', '']);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${category}_${Date.now()}.xlsx`);

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'report_exported',
        details: { scope: category, dateRange, schoolYear, specificMonth },
        adminUid,
      });
    } catch (err) {
      console.error('Error exporting category report:', err);
    }
  };

  // ------------------------------------------------------------------------
  //  Insights
  // ------------------------------------------------------------------------
  const insights = useMemo(() => {
    const insightList = [];

    const mostCommon = processedData.mostCommonCondition;
    if (mostCommon && mostCommon[1] > 0) {
      const condition = MEDICAL_CONDITIONS.find(i => i.id === mostCommon[0]);
      insightList.push({
        type: 'warning',
        title: 'Most Common Health Issue',
        description: `${condition?.name || mostCommon[0]} in ${mostCommon[1]} cases (${Math.round(mostCommon[1] / Math.max(processedData.totalMed, 1) * 100)}% of records)`,
        icon: IconAlert,
      });
    }

    const totalExamined = processedData.fitCount + processedData.notFitCount;
    const fitnessRate = totalExamined > 0 ? Math.round((processedData.fitCount / totalExamined) * 100) : 0;
    insightList.push({
      type: fitnessRate >= 70 ? 'success' : 'warning',
      title: 'Fitness Rate',
      description: `${fitnessRate}% of examined patients marked fit`,
      icon: IconHeartPulse,
    });

    const totalFindings = processedData.normalFindingsCount + processedData.abnormalFindingsCount;
    const normalFindingsRate = totalFindings > 0 ? Math.round((processedData.normalFindingsCount / totalFindings) * 100) : 0;
    insightList.push({
      type: normalFindingsRate >= 80 ? 'success' : 'info',
      title: 'Normal Findings Rate',
      description: `${normalFindingsRate}% had normal findings`,
      icon: IconActivity,
    });

    const completionRate = processedData.totalAppts > 0 ? Math.round((processedData.completedAppts / processedData.totalAppts) * 100) : 0;
    insightList.push({
      type: completionRate >= 70 ? 'success' : 'info',
      title: 'Appointment Completion',
      description: `${completionRate}% of appointments completed`,
      icon: IconCalendar,
    });

    return insightList.slice(0, 2);
  }, [processedData]);

  // ------------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------------
  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto bg-[#f4f7f6] px-4 md:px-6 py-4 md:py-6 font-['Inter',sans-serif] text-[#2d3748] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
      {/* ── Toolbar / Controls ── */}
      <div className="flex justify-end items-center mb-6">
        <div className="flex flex-wrap items-center justify-end gap-3 w-full">
          {/* School Year Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-[#e2e8f0] p-1.5 shadow-sm">
            <IconCalendar size={16} className="text-slate-400 ml-2" />
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="text-sm font-semibold bg-transparent outline-none text-slate-600 pr-2 py-0.5 cursor-pointer"
            >
              <option value="all">All School Years</option>
              <option value="2026-2027">SY 2026-2027</option>
              <option value="2025-2026">SY 2025-2026</option>
              <option value="2024-2025">SY 2024-2025</option>
              <option value="2023-2024">SY 2023-2024</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-[#e2e8f0] p-1.5 shadow-sm">
            <IconCalendar size={16} className="text-slate-400 ml-2" />
            <select
              value={specificMonth}
              onChange={(e) => setSpecificMonth(e.target.value)}
              className="text-sm font-semibold bg-transparent outline-none text-slate-600 pr-2 py-0.5 cursor-pointer"
            >
              <option value="all">All Months</option>
              {MONTHS_FULL.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-[#e2e8f0] p-1.5 shadow-sm">
            <IconFilter size={16} className="text-slate-400 ml-2" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-semibold bg-transparent outline-none text-slate-600 pr-2 py-0.5 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="quarter">Last 3 Months</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#466460] text-white text-sm font-semibold rounded-lg hover:bg-[#3a524f] transition-colors shadow-sm ml-1"
          >
            <IconFileText size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-2 text-xs font-semibold text-red-500 hover:underline">Retry</button>
        </div>
      )}

      {/* ── Report Content ── */}
      <div id="reports-content">

        {/* ── Top Bar: Insights & Stats ── */}
        <GlassCard className="mb-6 p-4">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Key Insights */}
            <div className="xl:w-5/12 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-slate-200 pb-4 xl:pb-0 xl:pr-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-[#466460] flex items-center">
                  <i className="fa-solid fa-lightbulb text-[#466460] mr-2"></i>Key Insights
                </h3>
                <button
                  onClick={() => exportCategoryToCSV('summary')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                >
                  <IconDownload size={14} /> Download
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  const colors = {
                    warning: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '#d97706' },
                    success: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', icon: '#059669' },
                    info: { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
                  };
                  const c = colors[insight.type];
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl h-full" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                      <Icon size={20} style={{ color: c.icon, flexShrink: 0, marginTop: 2 }} />
                      <div className="flex flex-col justify-center">
                        <p className="text-sm font-bold leading-tight" style={{ color: c.text }}>{insight.title}</p>
                        <p className="text-xs mt-1.5 leading-snug" style={{ color: c.text, opacity: 0.85 }}>{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compact Stat Cards */}
            <div className="xl:w-7/12 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatBox title="Total Patients" value={processedData.totalUsers} subtitle="Students + Fac" icon={IconUsers} color="#466460" className="col-span-2 sm:col-span-1" />
              <StatBox title="Clinic Staff" value={processedData.clinicStaffCount} subtitle="Doc+Nurse+Dentist" icon={IconUsers} color="#81b29a" />
              <StatBox title="Medical" value={processedData.totalMed} subtitle="Health Consults" icon={IconStethoscope} color="#3b82f6" />
              <StatBox title="Dental" value={processedData.totalDen} subtitle="Dental Consults" icon={IconTooth} color="#e07a5f" />
              <StatBox title="Appts" value={processedData.totalAppts} subtitle={`${processedData.completedAppts} done`} icon={IconCalendar} color="#10b981" className="col-span-2 sm:col-span-1" />
            </div>
          </div>
        </GlassCard>

        {/* ── Charts Row 1: Health Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-virus mr-2"></i>Health Conditions Distribution
              </h3>
              <button
                onClick={() => exportCategoryToCSV('conditions')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                processedData.totalMed === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">No medical data available</div>
                ) : (
                  <PolarArea
                    id="condition-distribution"
                    data={conditionDistributionData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } } },
                      scales: { r: { ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } } },
                    }}
                  />
                ))}

            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-chart-column mr-2"></i>Health Issues by Category
              </h3>
              <button
                onClick={() => exportCategoryToCSV('conditions')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                <Bar
                  id="category-breakdown"
                  data={categoryBreakdownData}
                  options={{
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Charts Row 2: Visit Trends ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-chart-line mr-2"></i>Appointment Visit Trends
              </h3>
              <button
                onClick={() => exportCategoryToCSV('appointments')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                <Line
                  id="appointment-trends"
                  data={appointmentTrendsData}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      y: { beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-chart-pie mr-2"></i>Medical vs Dental Consultations
              </h3>
              <button
                onClick={() => exportCategoryToCSV('monthly')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px] flex justify-center">
              {loading ? <ChartSkeleton h="260px" /> : (
                processedData.totalMed === 0 && processedData.totalDen === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">No consultation data available</div>
                ) : (
                  <Doughnut
                    id="medical-dental"
                    data={medicalDentalData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 15 } } },
                    }}
                  />
                ))}

            </div>
          </GlassCard>
        </div>

        {/* ── Charts Row 3: Performance & Demographics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-clipboard-check mr-2"></i>Appointment Status
              </h3>
              <button
                onClick={() => exportCategoryToCSV('appointments')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                <Bar
                  id="appointment-status"
                  data={appointmentStatusData}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-users mr-2"></i>Patient Demographics
              </h3>
              <button
                onClick={() => exportCategoryToCSV('demographics')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px] flex justify-center">
              {loading ? <ChartSkeleton h="260px" /> : (
                processedData.totalUsers === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">No patient data available</div>
                ) : (
                  <Doughnut
                    id="patient-demographics"
                    data={patientTypeData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 15 } } },
                    }}
                  />
                ))}

            </div>
          </GlassCard>
        </div>

        {/* ── Charts Row 4: Monthly Comparison & Dental Conditions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-chart-bar mr-2"></i>Monthly Consultations Comparison
              </h3>
              <button
                onClick={() => exportCategoryToCSV('monthly')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                <Bar
                  id="monthly-comparison"
                  data={monthlyComparisonData}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 }, padding: 10 } } },
                    scales: {
                      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-tooth mr-2"></i>Dental Conditions
              </h3>
              <button
                onClick={() => exportCategoryToCSV('dental')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors font-bold"
              >
                <IconDownload size={12} /> Download
              </button>
            </div>
            <div className="h-[260px]">
              {loading ? <ChartSkeleton h="260px" /> : (
                <Bar
                  id="dental-conditions"
                  data={dentalConditionData}
                  options={{
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Appointment Duration Summary ── */}
        <GlassCard className="mb-6 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#466460] flex items-center">
              <IconTable size={18} className="mr-2" /> Appointment Duration Summary
            </h3>
            <button
              onClick={() => exportCategoryToCSV('appointments')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
            >
              <IconDownload size={14} /> Download
            </button>
          </div>

          {loading ? (
            <ChartSkeleton h="180px" />
          ) : appointmentDurationSummary.trackedCount === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
              No duration data available
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatBox
                  title="Average Duration"
                  value={`${appointmentDurationSummary.overallAvg.toFixed(1)} hrs`}
                  subtitle={`Across ${appointmentDurationSummary.trackedCount} of ${appointmentDurationSummary.totalCount}`}
                  icon={IconActivity}
                  color="#466460"
                />
                <StatBox
                  title="Fastest"
                  value={`${appointmentDurationSummary.overallMin.toFixed(1)} hrs`}
                  subtitle="Shortest recorded"
                  icon={IconCalendar}
                  color="#10b981"
                />
                <StatBox
                  title="Slowest"
                  value={`${appointmentDurationSummary.overallMax.toFixed(1)} hrs`}
                  subtitle="Longest recorded"
                  icon={IconCalendar}
                  color="#f97316"
                />
                <StatBox
                  title="Tracked"
                  value={appointmentDurationSummary.trackedCount}
                  subtitle="Have timestamp data"
                  icon={IconFilter}
                  color="#3b82f6"
                />
              </div>

              <div className="overflow-x-auto rounded-lg bg-white border border-slate-200 shadow-sm">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Count</th>
                      <th className="px-3 py-2 text-left">Average Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointmentDurationSummary.statusBreakdown.map((row) => (
                      <tr key={row.status}>
                        <td className="px-3 py-1.5 font-medium capitalize">{row.status}</td>
                        <td className="px-3 py-1.5">{row.count}</td>
                        <td className="px-3 py-1.5">{row.avg.toFixed(1)} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </GlassCard>

        {/* ── Spacer for bottom padding ── */}
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default Reports;