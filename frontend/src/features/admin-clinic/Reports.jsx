// frontend/src/features/admin-clinic/Reports.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import authService from '../../services/auth.service.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler,
  RadialLinearScale
);

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Medical conditions for tracking based on schema fields
const MEDICAL_CONDITIONS = [
  // From checked_medical array
  { id: 'asthma', name: 'Asthma', keywords: ['asthma'], category: 'Respiratory', color: '#ef4444' },
  { id: 'diabetes', name: 'Diabetes', keywords: ['diabetes', 'diabetic'], category: 'Endocrine', color: '#f97316' },
  { id: 'hypertension', name: 'Hypertension', keywords: ['hypertension', 'high blood pressure', 'bp'], category: 'Cardiovascular', color: '#eab308' },
  { id: 'heart_disease', name: 'Heart Disease', keywords: ['heart disease', 'heart problem', 'cardiac'], category: 'Cardiovascular', color: '#84cc16' },
  { id: 'kidney', name: 'Kidney Disease', keywords: ['kidney', 'renal'], category: 'Renal', color: '#06b6d4' },
  { id: 'liver', name: 'Liver Disease', keywords: ['liver', 'hepatitis'], category: 'Hepatic', color: '#8b5cf6' },
  { id: 'tb', name: 'Tuberculosis', keywords: ['tuberculosis', 'tb'], category: 'Infectious', color: '#ec4899' },
  { id: 'thyroid', name: 'Thyroid', keywords: ['thyroid'], category: 'Endocrine', color: '#14b8a6' },
  { id: 'anemia', name: 'Anemia', keywords: ['anemia'], category: 'Hematological', color: '#f43f5e' },
  { id: 'epilepsy', name: 'Epilepsy', keywords: ['epilepsy', 'seizure'], category: 'Neurological', color: '#0ea5e9' },

  // From checked_health array - health concerns
  { id: 'vision', name: 'Vision Problems', keywords: ['vision', 'eye problem', 'blurred vision'], category: 'Vision', color: '#22c55e' },
  { id: 'hearing', name: 'Hearing Problems', keywords: ['hearing', 'ear problem', 'deaf'], category: 'Hearing', color: '#a855f7' },
  { id: 'orthopedic', name: 'Orthopedic', keywords: ['orthopedic', 'bone', 'joint', 'fracture'], category: 'Musculoskeletal', color: '#eab308' },
  { id: 'dental', name: 'Dental Problems', keywords: ['dental', 'teeth', 'tooth'], category: 'Dental', color: '#06b6d4' },
  { id: 'nutritional', name: 'Nutritional', keywords: ['nutritional', 'malnutrition', 'underweight', 'obesity'], category: 'Nutritional', color: '#f97316' },

  // From finding1 and other_medical_history - common findings
  { id: 'normal', name: 'Normal Findings', keywords: ['normal', 'no findings', 'healthy', 'fit'], category: 'Normal', color: '#10b981' },
  { id: 'cough', name: 'Cough/URTI', keywords: ['cough', 'upper respiratory', 'urti'], category: 'Respiratory', color: '#f59e0b' },
  { id: 'fever', name: 'Fever', keywords: ['fever', 'pyrexia', 'febrile'], category: 'General', color: '#ef4444' },
  { id: 'headache', name: 'Headache', keywords: ['headache', 'head pain', 'migraine'], category: 'Neurological', color: '#8b5cf6' },
  { id: 'allergy', name: 'Allergies', keywords: ['allergy', 'allergic'], category: 'Immune', color: '#ec4899' },
  { id: 'skin_rash', name: 'Skin Conditions', keywords: ['skin', 'rash', 'dermatitis', 'eczema'], category: 'Dermatological', color: '#14b8a6' },
  { id: 'gi', name: 'GI Problems', keywords: ['stomach', 'gastritis', 'nausea', 'abdominal'], category: 'Gastrointestinal', color: '#0ea5e9' },
];

// Dental conditions for tracking based on dental_records schema
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

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconDownload = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconFileText = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconCalendar = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconActivity = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconPieChart = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

const IconTrendingUp = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconFilter = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const IconHeartPulse = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
);

const IconStethoscope = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
    <circle cx="20" cy="10" r="2"/>
  </svg>
);

const IconAlert = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconTrends = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18"/>
    <path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

const IconUsers = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconTooth = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3v18"/>
    <path d="M8 3v4a4 4 0 0 0 8 0V3"/>
    <path d="M6 8h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>
    <path d="M8 14h.01"/>
    <path d="M12 14h.01"/>
    <path d="M16 14h.01"/>
    <path d="M8 18h.01"/>
    <path d="M12 18h.01"/>
    <path d="M16 18h.01"/>
  </svg>
);

const IconBrain = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

const IconFirstAid = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v4"/>
    <path d="m7.5 6-3 3 3 3"/>
    <path d="m17.5 6 3 3-3 3"/>
    <path d="M12 8v4"/>
    <path d="m7.5 14 3 3 3-3"/>
    <rect x="4" y="8" width="16" height="12" rx="2"/>
  </svg>
);

const IconVirus = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v2"/>
    <path d="M12 20v2"/>
    <path d="m4.93 4.93 1.41 1.41"/>
    <path d="m17.66 17.66 1.41 1.41"/>
    <path d="M2 12h2"/>
    <path d="M20 12h2"/>
    <path d="m6.34 17.66-1.41 1.41"/>
    <path d="m19.07 4.93-1.41 1.41"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

// ─── Card Components ────────────────────────────────────────────────────────
const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color = '#466460', trend = null }) => (
  <GlassCard className="p-4 md:p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
    <h4 className="text-2xl md:text-3xl font-bold text-slate-800">{value}</h4>
    {subtitle && (
      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
        {subtitle}
        {trend && (
          <span className={`text-[10px] font-semibold ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </p>
    )}
  </GlassCard>
);

// ─── Loading Skeleton ────────────────────────────────────────────────────────
const ChartSkeleton = ({ h = '220px' }) => (
  <div className="flex items-center justify-center bg-slate-50 rounded-lg animate-pulse" style={{ height: h }}>
    <div className="text-slate-300 text-xs">Loading chart…</div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [dentalRecords, setDentalRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('year'); // 'month', 'quarter', 'year'

  // ── Fetch Data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = await authService.getAuthHeaders();

      // Fetch users
      const usersRes = await fetch(`${API_URL}/records`, { headers }).catch(() => null);
      let usersData = [];
      if (usersRes && usersRes.ok) {
        const json = await usersRes.json();
        usersData = json.data || json || [];
      }
      setUsers(usersData);

      // Fetch appointments
      const apptRes = await fetch(`${API_URL}/appointments`, { headers }).catch(() => null);
      let apptData = [];
      if (apptRes && apptRes.ok) {
        const json = await apptRes.json();
        apptData = json.data || json || [];
      }
      setAppointments(apptData);

      // ✅ FIX: Fetch medical records through backend (bypasses Supabase RLS)
      const medRes = await fetch(`${API_URL}/examinations/medical`, { headers }).catch(() => null);
      let medData = [];
      if (medRes && medRes.ok) {
        const json = await medRes.json();
        medData = json.data || json || [];
      }
      setMedicalRecords(medData);

      // ✅ FIX: Fetch dental records through backend (bypasses Supabase RLS)
      const denRes = await fetch(`${API_URL}/examinations/dental`, { headers }).catch(() => null);
      let denData = [];
      if (denRes && denRes.ok) {
        const json = await denRes.json();
        denData = json.data || json || [];
      }
      setDentalRecords(denData);

    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Process Data based on Date Range ──────────────────────────────────────
  const processedData = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Filter appointments by date range (for charts/stats only)
    const filteredAppts = appointments.filter(a => {
      if (!a.year || !a.month) return false;
      const d = new Date(Number(a.year), Number(a.month) - 1, Number(a.day));
      return d >= startDate;
    });

    // ALL medical records (no date filter) - for display
    const allMedRecords = medicalRecords;

    // ALL dental records (no date filter) - for display
    const allDenRecords = dentalRecords;

    // Filtered for stats only (charts)
    const filteredMed = medicalRecords.filter(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      return d >= startDate;
    });

    const filteredDen = dentalRecords.filter(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      return d >= startDate;
    });

    // Group by month
    const monthlyAppts = Array(12).fill(0);
    const monthlyMed = Array(12).fill(0);
    const monthlyDen = Array(12).fill(0);

    filteredAppts.forEach(a => {
      if (a.month) monthlyAppts[Number(a.month) - 1]++;
    });

    filteredMed.forEach(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      if (d.getFullYear() === now.getFullYear()) {
        monthlyMed[d.getMonth()]++;
      }
    });

    filteredDen.forEach(r => {
      const d = new Date(r.exam_date || r.created_at || r.createdAt || 0);
      if (d.getFullYear() === now.getFullYear()) {
        monthlyDen[d.getMonth()]++;
      }
    });

    // Calculate illness statistics from ALL medical records (no date filter)
    const conditionCounts = {};
    MEDICAL_CONDITIONS.forEach(condition => {
      conditionCounts[condition.id] = 0;
    });

    // Track ALL individual findings (for the findings display - NO FILTER)
    const findingsList = [];

    // Fitness and findings stats - use ALL records
    let fitCount = 0;
    let notFitCount = 0;
    let normalFindingsCount = 0;
    let abnormalFindingsCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    // Use ALL medical records, not filtered
    allMedRecords.forEach(r => {
      // Count fitness status
      if (r.is_fit === true) fitCount++;
      else if (r.is_fit === false) notFitCount++;

      // Count findings status
      if (r.is_normal_findings === true) normalFindingsCount++;
      else if (r.is_normal_findings === false) abnormalFindingsCount++;

      // Count status
      if (r.status === 'approved' || r.is_approved === true) approvedCount++;
      else if (r.status === 'pending') pendingCount++;

      // Collect all text from schema fields for analysis
      const finding1 = (r.finding1 || '').toLowerCase();
      const checkedMedical = Array.isArray(r.checked_medical) ? r.checked_medical.join(' ').toLowerCase() : '';
      const checkedFamily = Array.isArray(r.checked_family) ? r.checked_family.join(' ').toLowerCase() : '';
      const checkedHealth = Array.isArray(r.checked_health) ? r.checked_health.join(' ').toLowerCase() : '';
      const otherHistory = (r.other_medical_history || '').toLowerCase();
      const searchText = `${finding1} ${checkedMedical} ${checkedFamily} ${checkedHealth} ${otherHistory}`;

      // Track all conditions found in this record
      const foundConditions = new Set();

      // Check each condition against all fields
      MEDICAL_CONDITIONS.forEach(condition => {
        condition.keywords.forEach(keyword => {
          if (searchText.includes(keyword)) {
            if (!foundConditions.has(condition.id)) {
              foundConditions.add(condition.id);
              conditionCounts[condition.id]++;
            }
          }
        });
      });

      // Collect ALL medical records for findings display (no filtering)
      const recordFindings = {
        id: r.id,
        name: `${r.last_name || ''}, ${r.first_name || ''}`.replace(/^, |, $/g, '') || 'Unknown',
        universityId: r.university_id || '',
        finding1: r.finding1 || null,
        checkedMedical: r.checked_medical || [],
        checkedHealth: r.checked_health || [],
        otherHistory: r.other_medical_history || null,
        isFit: r.is_fit,
        isNormal: r.is_normal_findings,
        examDate: r.exam_date,
        status: r.status,
      };
      findingsList.push(recordFindings);
    });

    // Calculate health trends by category
    const categoryBreakdown = {};
    MEDICAL_CONDITIONS.forEach(condition => {
      if (!categoryBreakdown[condition.category]) {
        categoryBreakdown[condition.category] = 0;
      }
      categoryBreakdown[condition.category] += conditionCounts[condition.id];
    });

    // Calculate dental condition counts from dental_records
    const dentalConditionCounts = {};
    DENTAL_CONDITIONS.forEach(condition => {
      dentalConditionCounts[condition.id] = 0;
    });

    const dentalFindingsList = [];
    // Use ALL dental records, not filtered
    allDenRecords.forEach(r => {
      const dentalHistory = typeof r.dental_history === 'string' ? JSON.parse(r.dental_history || '{}') : (r.dental_history || {});
      const intraoral = typeof r.intraoral === 'string' ? JSON.parse(r.intraoral || '{}') : (r.intraoral || {});

      // Track dental conditions
      DENTAL_CONDITIONS.forEach(condition => {
        condition.keywords.forEach(keyword => {
          // Check dental history
          Object.values(dentalHistory).forEach(val => {
            if (String(val).toLowerCase().includes(keyword.toLowerCase()) && String(val).toLowerCase() !== 'no') {
              dentalConditionCounts[condition.id]++;
            }
          });
          // Check intraoral
          Object.values(intraoral).forEach(val => {
            if (String(val).toLowerCase().includes(keyword.toLowerCase()) && String(val).toLowerCase() !== 'no' && String(val).toLowerCase() !== 'false') {
              dentalConditionCounts[condition.id]++;
            }
          });
        });
      });

      // Add to dental findings list
      dentalFindingsList.push({
        id: r.id,
        name: `${r.last_name || ''}, ${r.first_name || ''}`.replace(/^, |, $/g, '') || 'Unknown',
        universityId: r.university_id || '',
        dentalHistory: dentalHistory,
        intraoral: intraoral,
        status: r.status,
        examDate: r.exam_date,
      });
    });

    // Dental category breakdown
    const dentalCategoryBreakdown = {};
    DENTAL_CONDITIONS.forEach(condition => {
      if (!dentalCategoryBreakdown[condition.category]) {
        dentalCategoryBreakdown[condition.category] = 0;
      }
      dentalCategoryBreakdown[condition.category] += dentalConditionCounts[condition.id];
    });

    return {
      appointments: filteredAppts,
      medical: allMedRecords,  // ALL records
      dental: allDenRecords,   // ALL records
      users: users,
      monthlyAppts,
      monthlyMed,
      monthlyDen,
      totalAppts: filteredAppts.length,
      totalMed: allMedRecords.length,  // ALL records
      totalDen: allDenRecords.length,  // ALL records
      totalUsers: users.length,
      completedAppts: filteredAppts.filter(a => a.status === 'done').length,
      pendingAppts: filteredAppts.filter(a => a.status === 'pending').length,
      approvedAppts: filteredAppts.filter(a => a.status === 'approved').length,
      missedAppts: filteredAppts.filter(a => a.status === 'missed').length,
      conditionCounts,
      categoryBreakdown,
      mostCommonCondition: Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0],
      // Medical records specific stats
      fitCount,
      notFitCount,
      normalFindingsCount,
      abnormalFindingsCount,
      medApprovedCount: approvedCount,
      medPendingCount: pendingCount,
      // All findings from records
      findingsList,
      // Dental records data
      dentalConditionCounts,
      dentalCategoryBreakdown,
      dentalFindingsList,
      mostCommonDentalCondition: Object.entries(dentalConditionCounts).sort((a, b) => b[1] - a[1])[0],
    };
  }, [appointments, medicalRecords, dentalRecords, users, dateRange]);

  // ── Chart Data: Appointment Trends (Line Chart) ────────────────────────────
  const appointmentTrendsData = useMemo(() => {
    return {
      labels: MONTHS,
      datasets: [
        {
          label: 'Appointments',
          data: processedData.monthlyAppts,
          borderColor: '#466460',
          backgroundColor: 'rgba(70, 100, 96, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [processedData.monthlyAppts]);

  // ── Chart Data: Medical vs Dental (Doughnut Chart) ────────────────────────
  const medicalDentalData = useMemo(() => {
    return {
      labels: ['Medical Exams', 'Dental Exams'],
      datasets: [{
        data: [processedData.totalMed, processedData.totalDen],
        backgroundColor: ['#466460', '#e07a5f'],
        borderWidth: 0,
      }],
    };
  }, [processedData.totalMed, processedData.totalDen]);

  // ── Chart Data: Appointment Status (Bar Chart) ────────────────────────────
  const appointmentStatusData = useMemo(() => {
    return {
      labels: ['Completed', 'Pending', 'Approved', 'Missed'],
      datasets: [{
        label: 'Appointments',
        data: [
          processedData.completedAppts,
          processedData.pendingAppts,
          processedData.approvedAppts,
          processedData.missedAppts
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        borderRadius: 6,
      }],
    };
  }, [processedData]);

  // ── Chart Data: Monthly Comparison (Bar Chart) ──────────────────────────
  const monthlyComparisonData = useMemo(() => {
    return {
      labels: MONTHS,
      datasets: [
        {
          label: 'Medical',
          data: processedData.monthlyMed,
          backgroundColor: '#466460',
          borderRadius: 4,
        },
        {
          label: 'Dental',
          data: processedData.monthlyDen,
          backgroundColor: '#e07a5f',
          borderRadius: 4,
        },
      ],
    };
  }, [processedData.monthlyMed, processedData.monthlyDen]);

  // ── Chart Data: Condition Distribution (Polar Area) ────────────────────────
  const conditionDistributionData = useMemo(() => {
    const labels = MEDICAL_CONDITIONS.map(i => i.name);
    const data = MEDICAL_CONDITIONS.map(i => processedData.conditionCounts[i.id]);
    const colors = MEDICAL_CONDITIONS.map(i => i.color);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '80'),
        borderColor: colors,
        borderWidth: 1,
      }],
    };
  }, [processedData.conditionCounts]);

  // ── Chart Data: Health Category Breakdown (Bar) ─────────────────────────
  const categoryBreakdownData = useMemo(() => {
    const categories = Object.keys(processedData.categoryBreakdown);
    const values = Object.values(processedData.categoryBreakdown);
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];

    return {
      labels: categories,
      datasets: [{
        label: 'Cases',
        data: values,
        backgroundColor: colors.slice(0, categories.length),
        borderRadius: 6,
      }],
    };
  }, [processedData.categoryBreakdown]);

  // ── Chart Data: Dental Conditions Distribution (Bar) ─────────────────────
  const dentalConditionData = useMemo(() => {
    const labels = DENTAL_CONDITIONS.map(c => c.name);
    const data = DENTAL_CONDITIONS.map(c => processedData.dentalConditionCounts[c.id]);
    const colors = DENTAL_CONDITIONS.map(c => c.color);

    return {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: colors,
        borderRadius: 4,
      }],
    };
  }, [processedData.dentalConditionCounts]);

  // ── Chart Data: Patient Type Distribution ────────────────────────────────
  const patientTypeData = useMemo(() => {
    const typeCounts = {
      student: 0,
      faculty: 0,
      staff: 0,
    };

    processedData.users.forEach(u => {
      const role = (u.role || '').toLowerCase();
      if (role.includes('student')) typeCounts.student++;
      else if (role.includes('faculty') || role.includes('lecturer') || role.includes('professor')) typeCounts.faculty++;
      else typeCounts.staff++;
    });

    return {
      labels: ['Students', 'Faculty', 'Staff'],
      datasets: [{
        data: [typeCounts.student, typeCounts.faculty, typeCounts.staff],
        backgroundColor: ['#466460', '#e07a5f', '#81b29a'],
        borderWidth: 0,
      }],
    };
  }, [processedData.users]);

  // ── Export to PDF ────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    const element = document.getElementById('reports-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`MediTrack_Reports_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  // ── Export to Excel (CSV) ─────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ['Category', 'Type', 'Count', 'Date Range'];
    const rows = [
      ['Appointments', 'Total', processedData.totalAppts, dateRange],
      ['Appointments', 'Completed', processedData.completedAppts, dateRange],
      ['Appointments', 'Pending', processedData.pendingAppts, dateRange],
      ['Appointments', 'Approved', processedData.approvedAppts, dateRange],
      ['Appointments', 'Missed', processedData.missedAppts, dateRange],
      ['Examinations', 'Medical', processedData.totalMed, dateRange],
      ['Examinations', 'Dental', processedData.totalDen, dateRange],
      ['Users', 'Total', processedData.totalUsers, dateRange],
      ['Health Trends', 'Most Common', processedData.mostCommonCondition?.[0] || 'N/A', dateRange],
    ];

    // Add condition breakdown
    MEDICAL_CONDITIONS.forEach(condition => {
      rows.push(['Condition', condition.name, processedData.conditionCounts[condition.id], dateRange]);
    });

    // Add monthly breakdown
    MONTHS.forEach((month, idx) => {
      rows.push(['Appointments', month, processedData.monthlyAppts[idx], dateRange]);
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MediTrack_Reports_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ── Get top insights ─────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const insightList = [];

    // Most common condition
    const mostCommon = processedData.mostCommonCondition;
    if (mostCommon && mostCommon[1] > 0) {
      const condition = MEDICAL_CONDITIONS.find(i => i.id === mostCommon[0]);
      insightList.push({
        type: 'warning',
        title: 'Most Common Health Issue',
        description: `${condition?.name || mostCommon[0]} found in ${mostCommon[1]} cases (${Math.round(mostCommon[1] / Math.max(processedData.totalMed, 1) * 100)}% of all records)`,
        icon: IconAlert,
      });
    }

    // Fitness rate
    const totalExamined = processedData.fitCount + processedData.notFitCount;
    const fitnessRate = totalExamined > 0
      ? Math.round((processedData.fitCount / totalExamined) * 100)
      : 0;
    insightList.push({
      type: fitnessRate >= 70 ? 'success' : 'warning',
      title: 'Fitness Rate',
      description: `${fitnessRate}% of examined patients were marked as fit`,
      icon: IconHeartPulse,
    });

    // Normal findings rate
    const totalFindings = processedData.normalFindingsCount + processedData.abnormalFindingsCount;
    const normalFindingsRate = totalFindings > 0
      ? Math.round((processedData.normalFindingsCount / totalFindings) * 100)
      : 0;
    insightList.push({
      type: normalFindingsRate >= 80 ? 'success' : 'info',
      title: 'Normal Findings Rate',
      description: `${normalFindingsRate}% had normal findings`,
      icon: IconActivity,
    });

    // Completion rate
    const completionRate = processedData.totalAppts > 0
      ? Math.round((processedData.completedAppts / processedData.totalAppts) * 100)
      : 0;
    insightList.push({
      type: completionRate >= 70 ? 'success' : 'info',
      title: 'Appointment Completion Rate',
      description: `${completionRate}% of scheduled appointments were completed`,
      icon: IconCalendar,
    });

    return insightList;
  }, [processedData]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto bg-[#f4f7f6] px-4 md:px-6 py-4 md:py-6 font-['Inter',sans-serif] text-[#2d3748] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">
            <i className="fa-solid fa-chart-line mr-2"></i>Health Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">Comprehensive health insights for better decision-making</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-[#e2e8f0] p-1">
            <IconFilter size={14} className="text-slate-400 ml-2" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-medium bg-transparent outline-none text-slate-600 pr-2 py-1"
            >
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Export Buttons */}
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 bg-[#466460] text-white text-xs font-semibold rounded-lg hover:bg-[#3a524f] transition-colors"
          >
            <IconDownload size={14} />
            PDF
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            <IconFileText size={14} />
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

      {/* ── Report Content for PDF Export ── */}
      <div id="reports-content">
        {/* ── Key Insights ── */}
        <GlassCard className="p-4 md:p-5 mb-6">
          <h3 className="font-bold text-sm text-[#466460] mb-4">
            <i className="fa-solid fa-lightbulb mr-2"></i>Key Health Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              const colors = {
                warning: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '#d97706' },
                success: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', icon: '#059669' },
                info: { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
              };
              const c = colors[insight.type];
              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <Icon size={20} style={{ color: c.icon, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: c.text }}>{insight.title}</p>
                    <p className="text-[11px] mt-1" style={{ color: c.text, opacity: 0.8 }}>{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
          <StatCard
            title="Total Patients"
            value={processedData.totalUsers}
            subtitle={`Active in system`}
            icon={IconUsers}
            color="#466460"
          />
          <StatCard
            title="Medical Exams"
            value={processedData.totalMed}
            subtitle="Health consultations"
            icon={IconStethoscope}
            color="#3b82f6"
          />
          <StatCard
            title="Dental Exams"
            value={processedData.totalDen}
            subtitle="Dental consultations"
            icon={IconTooth}
            color="#e07a5f"
          />
          <StatCard
            title="Appointments"
            value={processedData.totalAppts}
            subtitle={`${processedData.completedAppts} completed`}
            icon={IconCalendar}
            color="#10b981"
          />
        </div>

        {/* ── Charts Row 1: Health Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Condition Distribution (Polar Area) */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-virus mr-2"></i>Health Conditions Distribution
            </h3>
            <div className="h-[280px]">
              {loading ? <ChartSkeleton h="280px" /> : (
                processedData.totalMed === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No medical data available
                  </div>
                ) : (
                  <PolarArea
                    id="condition-distribution"
                    data={conditionDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 }, padding: 8 } },
                      },
                      scales: {
                        r: { ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      },
                    }}
                  />
                )
              )}
            </div>
          </GlassCard>

          {/* Health Category Breakdown */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-chart-column mr-2"></i>Health Issues by Category
            </h3>
            <div className="h-[280px]">
              {loading ? <ChartSkeleton h="280px" /> : (
                <Bar
                  id="category-breakdown"
                  data={categoryBreakdownData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      y: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Charts Row 2: Visit Trends ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Appointment Trends */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-chart-line mr-2"></i>Appointment Visit Trends
            </h3>
            <div className="h-[250px]">
              {loading ? <ChartSkeleton h="250px" /> : (
                <Line
                  id="appointment-trends"
                  data={appointmentTrendsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          {/* Medical vs Dental */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-chart-pie mr-2"></i>Medical vs Dental Consultations
            </h3>
            <div className="h-[250px] flex justify-center">
              {loading ? <ChartSkeleton h="250px" /> : (
                processedData.totalMed === 0 && processedData.totalDen === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No consultation data available
                  </div>
                ) : (
                  <Doughnut
                    id="medical-dental"
                    data={medicalDentalData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 15 } },
                      },
                    }}
                  />
                )
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Charts Row 3: Performance & Demographics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Appointment Status */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-clipboard-check mr-2"></i>Appointment Status
            </h3>
            <div className="h-[250px]">
              {loading ? <ChartSkeleton h="250px" /> : (
                <Bar
                  id="appointment-status"
                  data={appointmentStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          {/* Patient Demographics */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-users mr-2"></i>Patient Demographics
            </h3>
            <div className="h-[250px] flex justify-center">
              {loading ? <ChartSkeleton h="250px" /> : (
                processedData.totalUsers === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No patient data available
                  </div>
                ) : (
                  <Doughnut
                    id="patient-demographics"
                    data={patientTypeData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 15 } },
                      },
                    }}
                  />
                )
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Monthly Comparison & Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Monthly Comparison */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-chart-bar mr-2"></i>Monthly Consultations Comparison
            </h3>
            <div className="h-[250px]">
              {loading ? <ChartSkeleton h="250px" /> : (
                <Bar
                  id="monthly-comparison"
                  data={monthlyComparisonData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 }, padding: 10 } },
                    },
                    scales: {
                      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              )}
            </div>
          </GlassCard>

          {/* Summary Report Table */}
          <GlassCard className="p-4 md:p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-table mr-2"></i>Summary Report
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#eef2f6]">
                    <th className="text-left font-semibold text-slate-500 py-2 pr-4">Category</th>
                    <th className="text-left font-semibold text-slate-500 py-2 pr-4">Type</th>
                    <th className="text-right font-semibold text-slate-500 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Patients</td>
                    <td className="py-2 pr-4 text-slate-600">Total Registered</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{processedData.totalUsers}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Consultations</td>
                    <td className="py-2 pr-4 text-slate-600">Medical</td>
                    <td className="py-2 text-right font-semibold text-blue-600">{processedData.totalMed}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Consultations</td>
                    <td className="py-2 pr-4 text-slate-600">Dental</td>
                    <td className="py-2 text-right font-semibold text-orange-600">{processedData.totalDen}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Appointments</td>
                    <td className="py-2 pr-4 text-slate-600">Completed</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{processedData.completedAppts}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Appointments</td>
                    <td className="py-2 pr-4 text-slate-600">Pending</td>
                    <td className="py-2 text-right font-semibold text-amber-600">{processedData.pendingAppts}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Medical Records</td>
                    <td className="py-2 pr-4 text-slate-600">Approved</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{processedData.medApprovedCount}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Medical Records</td>
                    <td className="py-2 pr-4 text-slate-600">Pending Review</td>
                    <td className="py-2 text-right font-semibold text-amber-600">{processedData.medPendingCount}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Fitness Status</td>
                    <td className="py-2 pr-4 text-slate-600">Fit</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{processedData.fitCount}</td>
                  </tr>
                  <tr className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-4 text-slate-700">Fitness Status</td>
                    <td className="py-2 pr-4 text-slate-600">Not Fit</td>
                    <td className="py-2 text-right font-semibold text-red-600">{processedData.notFitCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-700">Findings</td>
                    <td className="py-2 pr-4 text-slate-600">Normal</td>
                    <td className="py-2 text-right font-semibold text-blue-600">{processedData.normalFindingsCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* ── Individual Findings Display ── */}
        {processedData.findingsList && processedData.findingsList.length > 0 && (
          <GlassCard className="p-4 md:p-5 mb-6">
            <h3 className="font-bold text-sm text-[#466460] mb-4">
              <i className="fa-solid fa-file-medical-alt mr-2"></i>Patient Findings Details
            </h3>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-[#eef2f6]">
                    <th className="text-left font-semibold text-slate-500 py-2 pr-3">Patient</th>
                    <th className="text-left font-semibold text-slate-500 py-2 pr-3">Finding1 (Examination)</th>
                    <th className="text-left font-semibold text-slate-500 py-2 pr-3">Medical History</th>
                    <th className="text-left font-semibold text-slate-500 py-2 pr-3">Health Check</th>
                    <th className="text-left font-semibold text-slate-500 py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.findingsList.slice(0, 20).map((finding, idx) => (
                    <tr key={finding.id || idx} className="border-b border-[#f1f5f9]">
                      <td className="py-2 pr-3 text-slate-700 font-medium">{finding.name}</td>
                      <td className="py-2 pr-3 text-slate-600 max-w-[200px]">
                        <span className="block truncate" title={finding.finding1}>
                          {finding.finding1 || '-'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {finding.checkedMedical?.length > 0 ? (
                            finding.checkedMedical.map((item, i) => (
                              <span key={i} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{item}</span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {finding.checkedHealth?.length > 0 ? (
                            finding.checkedHealth.map((item, i) => (
                              <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{item}</span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                          finding.isFit === true
                            ? 'bg-green-100 text-green-700'
                            : finding.isFit === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {finding.isFit === true ? 'Fit' : finding.isFit === false ? 'Not Fit' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {processedData.findingsList.length > 20 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Showing 20 of {processedData.findingsList.length} records
                </p>
              )}
            </div>
          </GlassCard>
        )}

        {/* ── Dental Records Section ── */}
        <GlassCard className="p-4 md:p-5 mb-6">
          <h3 className="font-bold text-sm text-[#466460] mb-4">
            <i className="fa-solid fa-tooth mr-2"></i>Dental Records Analytics
          </h3>

          {/* Dental Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Dental</p>
              <p className="text-xl font-bold text-slate-700">{processedData.totalDen}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-green-600 uppercase">Approved</p>
              <p className="text-xl font-bold text-green-700">{processedData.dentalFindingsList.filter(d => d.status === 'approved').length}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p>
              <p className="text-xl font-bold text-amber-700">{processedData.dentalFindingsList.filter(d => d.status === 'pending').length}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase">With Treatment</p>
              <p className="text-xl font-bold text-blue-700">{processedData.dentalConditionCounts.oral_prophylaxis + processedData.dentalConditionCounts.filling}</p>
            </div>
          </div>

          {/* Dental Conditions Chart */}
          <div className="h-[250px] mb-4">
            {loading ? <ChartSkeleton h="250px" /> : (
              <Bar
                id="dental-conditions"
                data={dentalConditionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, ticks: { font: { size: 10 } } },
                    y: { ticks: { font: { size: 9 } } },
                  },
                }}
              />
            )}
          </div>

          {/* Dental Findings Table */}
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#eef2f6]">
                  <th className="text-left font-semibold text-slate-500 py-2 pr-3">Patient</th>
                  <th className="text-left font-semibold text-slate-500 py-2 pr-3">Dental History</th>
                  <th className="text-left font-semibold text-slate-500 py-2 pr-3">Oral Hygiene</th>
                  <th className="text-left font-semibold text-slate-500 py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {processedData.dentalFindingsList.slice(0, 15).map((dental, idx) => (
                  <tr key={dental.id || idx} className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-3 text-slate-700 font-medium">{dental.name}</td>
                    <td className="py-2 pr-3 text-slate-600 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(dental.dentalHistory || {}).filter(([k, v]) => v === 'Yes').slice(0, 4).map(([key, val], i) => (
                          <span key={i} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">{key}</span>
                        ))}
                        {Object.entries(dental.dentalHistory || {}).filter(([k, v]) => v === 'Yes').length === 0 && <span className="text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${
                        dental.intraoral?.oralHygiene === 'Good' ? 'bg-green-100 text-green-700' :
                        dental.intraoral?.oralHygiene === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                        dental.intraoral?.oralHygiene === 'Poor' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {dental.intraoral?.oralHygiene || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                        dental.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {dental.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* ── Condition Breakdown Table ── */}
        <GlassCard className="p-4 md:p-5">
          <h3 className="font-bold text-sm text-[#466460] mb-4">
            <i className="fa-solid fa-list-check mr-2"></i>Health Conditions Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#eef2f6]">
                  <th className="text-left font-semibold text-slate-500 py-2 pr-4">Condition</th>
                  <th className="text-left font-semibold text-slate-500 py-2 pr-4">Category</th>
                  <th className="text-right font-semibold text-slate-500 py-2 pr-4">Cases</th>
                  <th className="text-right font-semibold text-slate-500 py-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {MEDICAL_CONDITIONS.map(condition => {
                  const count = processedData.conditionCounts[condition.id];
                  const percentage = processedData.totalMed > 0 ? Math.round((count / processedData.totalMed) * 100) : 0;
                  return (
                    <tr key={condition.id} className="border-b border-[#f1f5f9]">
                      <td className="py-2 pr-4 text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: condition.color }}></span>
                        {condition.name}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{condition.category}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-slate-800">{count}</td>
                      <td className="py-2 text-right text-slate-500">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* ── Spacer for bottom padding ── */}
      <div className="h-6"></div>
    </div>
  );
};

export default Reports;