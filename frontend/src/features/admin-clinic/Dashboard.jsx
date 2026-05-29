// frontend/src/features/admin-clinic/Dashboard.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import authService from '../../services/auth.service.js';
import ProfileSetup from '../../components/ProfileSetup.jsx';
import { useAppointments } from '../../context/AppointmentContext';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
);

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_COLORS = {
  student:       '#466460',
  faculty:       '#e07a5f',
  staff:         '#81b29a',
  doctor:        '#e9c46a',
  nurse:         '#a8dadc',
  administrator: '#f4a261',
  lecturer:      '#2a9d8f',
  professor:     '#264653',
  guard:         '#e76f51',
};

const RECORD_COLORS = ['#466460', '#e07a5f'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normaliseRole = (raw = '') => {
  const r = raw.toLowerCase();
  if (r.includes('student')) return 'student';
  if (['instructor', 'faculty', 'lecturer', 'professor'].some(k => r.includes(k))) return 'faculty';
  if (['doctor', 'physician', 'nurse', 'dentist'].some(k => r.includes(k))) return 'staff';
  return 'staff';
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 md:p-5 animate-pulse">
    <div className="h-2.5 w-24 bg-slate-200 rounded mb-3" />
    <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
    <div className="h-2 w-20 bg-slate-100 rounded" />
  </div>
);

const ChartSkeleton = ({ h = '220px' }) => (
  <div className="flex items-center justify-center bg-slate-50 rounded-lg animate-pulse" style={{ height: h }}>
    <div className="text-slate-300 text-xs">Loading chart…</div>
  </div>
);

// ─── GlassCard ────────────────────────────────────────────────────────────────
const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionLabel = ({ icon, children }) => (
  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
    <i className={`fa-solid ${icon} mr-1.5 text-[#466460]`}></i>{children}
  </p>
);

// ============================================================
// DASHBOARD CONTENT
// ============================================================
function DashboardContent() {
  const navigate = useNavigate();
  const { appointments } = useAppointments();

  // ── State ─────────────────────────────────────────────────
  const [users,          setUsers]          = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [dentalRecords,  setDentalRecords]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [filter,         setFilter]         = useState('all');
  const [yearFilter,     setYearFilter]     = useState(String(new Date().getFullYear()));

  // ── Fetch from Supabase API ───────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // Fetch users (records), medical_records, dental_records in parallel
      const [usersRes, medRes, denRes] = await Promise.all([
        fetch(`${API_URL}/records`, { headers }),
        fetch(`${API_URL}/examinations/medical`, { headers }).catch(() => null),
        fetch(`${API_URL}/examinations/dental`, { headers }).catch(() => null),
      ]);

      // ── Users / Patient Records ──────────────────────────
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const raw = usersData.data || usersData || [];
        setUsers(raw.map(u => ({
          uid:        u.uid || u.id,
          name:       `${u.last_name || u.lastName || ''}, ${u.first_name || u.firstName || ''}`.replace(/^,\s*/, '') || u.name || 'Unknown',
          type:       normaliseRole(u.role || ''),
          role:       u.role || 'student',
          prog:       u.program || u.course || '',
          year:       u.year_level || u.yearLevel || '',
          section:    u.section || '',
          email:      u.email || '',
          department: u.department || '',
          createdAt:  u.created_at ||  '',
        })));
      }

      // ── Medical Records ──────────────────────────────────
      // Try the examinations endpoint first, fallback to medical_records
      let medData = [];
      if (medRes && medRes.ok) {
        const json = await medRes.json();
        medData = json.data || json || [];
      } else {
        // Fallback: try medical_records directly
        const fallback = await fetch(`${API_URL}/examinations`, { headers }).catch(() => null);
        if (fallback && fallback.ok) {
          const json = await fallback.json();
          const all = json.data || json || [];
          medData = all.filter(r => (r.type || r.record_type || '').toLowerCase().includes('medical') || r.examType === 'medical');
        }
      }
      setMedicalRecords(medData.map(r => ({
        ...r,
        kind:    'Medical',
        dateObj: r.exam_date || r.examDate || r.created_at || r.createdAt
          ? new Date(r.exam_date || r.examDate || r.created_at || r.createdAt)
          : new Date(),
        userId: r.user_id || r.userId || r.uid,
      })));

      // ── Dental Records ────────────────────────────────────
      let denData = [];
      if (denRes && denRes.ok) {
        const json = await denRes.json();
        denData = json.data || json || [];
      } else {
        const fallback = await fetch(`${API_URL}/examinations`, { headers }).catch(() => null);
        if (fallback && fallback.ok) {
          const json = await fallback.json();
          const all = json.data || json || [];
          denData = all.filter(r => (r.type || r.record_type || '').toLowerCase().includes('dental') || r.examType === 'dental');
        }
      }
      setDentalRecords(denData.map(r => ({
        ...r,
        kind:    'Dental',
        dateObj: r.created_at || r.createdAt || r.exam_date || r.examDate
          ? new Date(r.created_at || r.createdAt || r.exam_date || r.examDate)
          : new Date(),
        userId: r.user_id || r.userId || r.uid,
      })));

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Could not connect to database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Appointment Derivations ───────────────────────────────
  const today = new Date();

  const pendingAppointments = useMemo(() => {
    return (appointments || [])
      .filter(a => String(a?.status || 'pending').toLowerCase() === 'pending')
      .sort((a, b) => {
        const tA = new Date(a?.bookedAt || a?.createdAt || a?.created_at || a?.date || 0).getTime() || 0;
        const tB = new Date(b?.bookedAt || b?.createdAt || b?.created_at || b?.date || 0).getTime() || 0;
        return tA - tB;
      });
  }, [appointments]);

  const pendingCount = pendingAppointments.length;

  const scheduledAppointments = useMemo(() => {
    return (appointments || []).filter(a => {
      const status = String(a?.status || '').toLowerCase();
      return status === 'approved' || status === 'done';
    });
  }, [appointments]);

  const todayAppts = useMemo(() => {
    return scheduledAppointments.filter(a => {
      const dateString = a?.date || a?.bookedAt || a?.created_at || a?.createdAt;

      if (a?.year && a?.month && a?.day) {
        const d = new Date(a.year, a.month - 1, a.day);
        return d.toDateString() === today.toDateString();
      } else if (dateString) {
        const d = new Date(dateString);
        return d.toDateString() === today.toDateString();
      }
      return false;
    });
  }, [scheduledAppointments]);

  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);

  const weekAppts = useMemo(() =>
    scheduledAppointments.filter(a => {
      const d = a.year
        ? new Date(a.year, (a.month || 1) - 1, a.day || 1)
        : new Date(a.date || a.created_at || 0);
      return d >= today && d <= weekFromNow;
    }),
  [scheduledAppointments]);

  // ── Combined records ──────────────────────────────────────
  const allRecords = useMemo(() =>
    [...medicalRecords, ...dentalRecords].sort((a, b) => b.dateObj - a.dateObj),
  [medicalRecords, dentalRecords]);

  // ── Filtered users ────────────────────────────────────────
  const filteredUsers = useMemo(() =>
    filter === 'all' ? users : users.filter(u => u.type === filter),
  [users, filter]);

  // ── Available years from records ──────────────────────────
  const availableYears = useMemo(() => {
    const yrs = new Set(allRecords.map(r => r.dateObj?.getFullYear()).filter(Boolean));
    return ['all', ...Array.from(yrs).sort((a, b) => b - a).map(String)];
  }, [allRecords]);

  // ── Line Chart: visits over time ──────────────────────────
  const trendData = useMemo(() => {
    const years = yearFilter === 'all'
      ? availableYears.filter(y => y !== 'all').map(Number).sort((a, b) => a - b)
      : [parseInt(yearFilter)];
    if (years.length === 0) years.push(new Date().getFullYear());

    const labels = [];
    years.forEach(yr => MONTHS.forEach(m => labels.push(`${m} ${yr}`)));

    const types = filter === 'all' ? ['student', 'faculty', 'staff'] : [filter];
    const borderDashes = { student: [], faculty: [6, 3], staff: [2, 3] };

    const recordsWithTypes = allRecords.map(r => ({
      uType: users.find(u => u.uid === r.userId)?.type || 'staff',
      yr:    r.dateObj?.getFullYear(),
      mo:    r.dateObj?.getMonth(),
    }));

    const datasets = types.map(t => ({
      label:            t.charAt(0).toUpperCase() + t.slice(1),
      data:             labels.map(lbl => {
        const [moName, yrStr] = lbl.split(' ');
        const mIdx = MONTHS.indexOf(moName);
        const yNum = parseInt(yrStr);
        return recordsWithTypes.filter(r => r.uType === t && r.yr === yNum && r.mo === mIdx).length;
      }),
      borderColor:      TYPE_COLORS[t],
      backgroundColor:  TYPE_COLORS[t] + '18',
      borderWidth:      2,
      pointRadius:      3,
      pointHoverRadius: 5,
      tension:          0.35,
      fill:             false,
      borderDash:       borderDashes[t],
    }));

    return { labels, datasets };
  }, [filter, yearFilter, allRecords, users, availableYears]);

  // ── Doughnut: record type distribution ───────────────────
  const recordsChartData = useMemo(() => ({
    config: {
      labels:   ['Medical Records', 'Dental Records'],
      datasets: [{
        data:            [medicalRecords.length || 0, dentalRecords.length || 0],
        backgroundColor: RECORD_COLORS,
        borderWidth:     0,
      }],
    },
  }), [medicalRecords, dentalRecords]);

  // ── Bar: patient type breakdown ───────────────────────────
  const typeChartData = useMemo(() => {
    const counts = {};
    filteredUsers.forEach(u => { counts[u.type] = (counts[u.type] || 0) + 1; });
    return {
      labels:   Object.keys(counts),
      datasets: [{
        label:           'Count',
        data:            Object.values(counts),
        backgroundColor: Object.keys(counts).map(t => TYPE_COLORS[t] || '#466460'),
        borderRadius:    4,
      }],
    };
  }, [filteredUsers]);

  // ── Alerts ────────────────────────────────────────────────
  const alerts = useMemo(() => [
    ...(pendingCount > 0
      ? [{ icon: 'fa-calendar-clock', text: `${pendingCount} appointment request${pendingCount > 1 ? 's' : ''} pending approval`, type: 'warning' }]
      : []),
    ...(weekAppts.length > 0
      ? [{ icon: 'fa-calendar-days', text: `${weekAppts.length} appointment${weekAppts.length > 1 ? 's' : ''} scheduled this week`, type: 'info' }]
      : []),
    { icon: 'fa-users', text: `${users.length} patient record${users.length !== 1 ? 's' : ''} in the system`, type: 'info' },
  ], [pendingCount, weekAppts, users]);

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-400"></i>
        <p className="text-sm font-bold text-slate-600 text-center">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-full bg-[#466460] text-white text-xs font-bold hover:bg-[#3a524f] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto bg-[#f4f7f6] px-4 md:px-6 py-4 md:py-6 font-['Inter',sans-serif] text-[#2d3748] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-5 md:mb-6">
        {loading ? [1,2,3,4].map(i => <StatSkeleton key={i} />) : (
          <>
            <GlassCard className="p-4 md:p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Patients</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-800">{users.length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Active users</p>
            </GlassCard>

            <GlassCard className="p-4 md:p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Today's Appts</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-800">{todayAppts.length}</h4>
              <p className={`text-xs mt-1 ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                {pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} pending` : 'none pending'}
              </p>
            </GlassCard>

            <GlassCard className="p-4 md:p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Medical</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-800">{medicalRecords.length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Exams recorded</p>
            </GlassCard>

            <GlassCard className="p-4 md:p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Dental</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-800">{dentalRecords.length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Exams recorded</p>
            </GlassCard>
          </>
        )}
      </div>

      {/* ── Analytics Card ── */}
      <GlassCard className="p-4 md:p-5 mb-5 md:mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-base text-[#466460]">
            <i className="fa-solid fa-chart-mixed mr-2"></i>Health Analytics
            {loading && <span className="ml-2 text-[10px] font-normal text-slate-400 animate-pulse">loading…</span>}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden">
            {['all', 'student', 'faculty', 'staff'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all duration-200
                  ${filter === f
                    ? 'bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white border-transparent'
                    : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:border-[#466460]'
                  }`}
              >
                {f === 'all' ? 'All' : f === 'student' ? 'Students' : f === 'faculty' ? 'Faculty' : 'Staff'}
              </button>
            ))}
          </div>
        </div>

        {/* Line Chart */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <SectionLabel icon="fa-chart-line">Patient Visits Over Time</SectionLabel>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setYearFilter(y)}
                  className={`px-2.5 py-[3px] rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all duration-200
                    ${yearFilter === y
                      ? 'bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white border-transparent'
                      : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:border-[#e07a5f]'
                    }`}
                >
                  {y === 'all' ? 'All Years' : y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mb-3 flex-wrap">
            {(filter === 'all' || filter === 'student') && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                <span className="w-7 h-[3px] rounded bg-[#466460]"></span>Students
              </div>
            )}
            {(filter === 'all' || filter === 'faculty') && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                <span className="w-7 h-[3px] rounded" style={{ background: 'repeating-linear-gradient(90deg,#e07a5f 0,#e07a5f 6px,transparent 6px,transparent 10px)' }}></span>Faculty
              </div>
            )}
            {(filter === 'all' || filter === 'staff') && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                <span className="w-7 h-[3px] rounded" style={{ background: 'repeating-linear-gradient(90deg,#81b29a 0,#81b29a 3px,transparent 3px,transparent 6px)' }}></span>Staff
              </div>
            )}
          </div>

          <div className="w-full h-[220px] md:h-[260px] relative">
            {loading ? <ChartSkeleton h="220px" /> : (
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      ticks: { font: { size: 10 }, maxRotation: 45, maxTicksLimit: yearFilter === 'all' ? 12 : 8 },
                      grid:  { color: 'rgba(0,0,0,0.04)' },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { font: { size: 10 }, stepSize: 1, callback: v => Number.isInteger(v) ? v : null },
                      grid:  { color: 'rgba(0,0,0,0.04)' },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        <hr className="border-slate-100 mb-5" />

        {/* Doughnut + Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <SectionLabel icon="fa-file-medical">Record Type Distribution</SectionLabel>
            <div className="h-[180px] flex justify-center items-center">
              {loading ? <ChartSkeleton h="180px" /> : (
                medicalRecords.length === 0 && dentalRecords.length === 0 ? (
                  <p className="text-xs text-slate-400">No records found</p>
                ) : (
                  <Doughnut
                    data={recordsChartData.config}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } },
                    }}
                  />
                )
              )}
            </div>
          </div>

          <div>
            <SectionLabel icon="fa-users">Patient Type Breakdown</SectionLabel>
            <div className="h-[180px]">
              {loading ? <ChartSkeleton h="180px" /> : (
                <Bar
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } },
                      x: { ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Pending Appointments + Recent Records + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 pb-6">

        {/* Pending Appointments (spans 2 cols) */}
        <GlassCard className="p-0 overflow-hidden lg:col-span-2 flex flex-col h-[400px]">
          <div className="p-4 md:p-5 border-b border-[#eef2f6] shrink-0 bg-white flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#466460]">
              <i className="fa-regular fa-calendar-clock mr-2"></i>Action Required: Pending Appointments
            </h3>
            {pendingAppointments.length > 0 && (
              <span className="text-[10px] font-bold text-[#854F0B] bg-[#FAEEDA] px-2 py-0.5 rounded-full">
                {pendingAppointments.length} Pending
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 p-3 bg-white border border-slate-100 rounded-xl animate-pulse">
                    <div className="w-6 h-4 bg-slate-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-2 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 text-center">
                <i className="fa-regular fa-circle-check text-4xl text-slate-200 mb-2"></i>
                <p className="text-sm font-semibold text-slate-500">You're all caught up!</p>
                <p className="text-xs">There are no pending appointment requests.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingAppointments.map((appt, i) => {
                  const bTime = new Date(
                    appt?.bookedAt || appt?.created_at || appt?.created_at || appt?.date || Date.now()
                  ).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                  // Support both old Firebase shape and new Supabase shape
                  const patientName = appt?.name || appt?.patientName || appt?.student_name || appt?.studentName || 'Unknown Patient';
                  const patientId   = appt?.idno || appt?.university_id || appt?.universityId || 'No ID';
                  const patientProg = appt?.prog || appt?.program || appt?.dept || appt?.department || 'N/A';
                  const reason      = appt?.reason || appt?.consultation_type || appt?.type || 'Consultation';

                  return (
                    <div
                      key={appt?.id || i}
                      onClick={() => navigate('/appointments')}
                      className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-[#8aacaa] hover:shadow-sm transition-all group"
                    >
                      <div className="font-['DM_Mono',monospace] text-[10px] font-bold text-[#854F0B] bg-[#FAEEDA] rounded-md px-1.5 py-0.5 mt-0.5 shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[#1e293b] truncate group-hover:text-[#466460] transition-colors">{patientName}</div>
                        <div className="text-[10px] text-[#64748b] mt-0.5 truncate">{patientId} &middot; {patientProg}</div>
                        <span className="text-[10px] text-[#6d28d9] bg-[#ede9fe] px-2 py-0.5 rounded-full inline-block mt-1.5 font-medium truncate max-w-full">
                          {reason}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9px] text-slate-400 flex items-center gap-1 justify-end mt-1">
                          <i className="fa-regular fa-clock"></i>
                          {bTime.split(',')[0]}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {pendingAppointments.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => navigate('/appointments')}
                className="w-full py-2 text-xs font-bold text-[#466460] bg-[#e0eceb] rounded-lg hover:bg-[#466460] hover:text-white transition-colors flex justify-center items-center gap-2"
              >
                Go to Appointments <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          )}
        </GlassCard>

        {/* Right column: Recent Records + Alerts */}
        <div className="flex flex-col gap-4 md:gap-5 h-[400px]">

          {/* Recent Records */}
          <GlassCard className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 border-b border-[#eef2f6] shrink-0 bg-white">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-folder-plus mr-2"></i>Recent Records
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-[#f8fafc] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 bg-slate-200 rounded w-3/4" />
                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : allRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No records added yet</p>
              ) : (
                <div className="space-y-2">
                  {allRecords.slice(0, 6).map((rec, i) => {
                    const user = users.find(u => u.uid === rec.userId) || {};
                    const isMed = rec.kind === 'Medical';
                    return (
                      <div key={rec.id || i} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isMed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <i className={`fa-solid ${isMed ? 'fa-stethoscope' : 'fa-tooth'} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {isMed ? 'Medical Exam' : 'Dental Exam'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {user.name || 'Unknown Patient'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-slate-400">
                            {rec.dateObj?.toLocaleDateString([], { month: 'short', day: 'numeric' }) || ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Alerts */}
          <GlassCard className="flex flex-col shrink-0">
            <div className="p-4 border-b border-[#eef2f6] bg-white rounded-t-xl">
              <h3 className="font-bold text-sm text-[#466460]">
                <i className="fa-solid fa-bell mr-2"></i>Alerts
              </h3>
            </div>
            <div className="p-3 bg-[#f8fafc] rounded-b-xl">
              {loading ? (
                <div className="space-y-2">
                  {[1,2].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg animate-pulse">
                      <div className="w-4 h-4 rounded bg-slate-200 shrink-0" />
                      <div className="h-2.5 bg-slate-200 rounded flex-1" />
                    </div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">All clear — no alerts</p>
              ) : (
                <div className="space-y-2 max-h-[110px] overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg">
                      <i className={`fa-solid ${alert.icon} text-sm ${alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}></i>
                      <p className="text-[11px] font-medium text-slate-600 leading-tight">{alert.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

        </div>
      </div>

    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export const Dashboard = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const checkProfileSetup = async () => {
      if (!currentUser) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/user/profile-setup`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data && !result.data.isProfileSetup) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      }
    };
    checkProfileSetup();
  }, [currentUser]);

  return (
    <>
      {showOnboarding && (
        <ProfileSetup user={currentUser} onComplete={() => setShowOnboarding(false)} />
      )}
      <DashboardContent />
    </>
  );
};

export default Dashboard;