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
  const r = String(raw).toLowerCase();

  // 1. Clinic Staff
  if (['doctor', 'dentist', 'nurse', 'clinic', 'physician'].some(k => r.includes(k))) return 'staff';

  // 2. Faculty Staff
  if (['instructor', 'faculty', 'lecturer', 'professor', 'dean'].some(k => r.includes(k))) return 'faculty';

  // 3. Students (and default fallback)
  return 'student';
};

// Helper to check if a role is clinic staff
const isClinicStaff = (role) => {
  const r = (role || '').toLowerCase();
  return ['doctor', 'dentist', 'nurse', 'clinic', 'physician'].some(k => r.includes(k));
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
  const [clinicStaffCount, setClinicStaffCount] = useState(0);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [dentalRecords,  setDentalRecords]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [filter,         setFilter]         = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [semesterFilter,  setSemesterFilter]  = useState('all');

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
        // Exclude archived users and sysadmin (but keep clinic staff to count separately)
        const activeRaw = raw.filter(u => {
          const role = (u.role || '').toLowerCase();
          return u.is_archived !== true && role !== 'sysadmin';
        });

        // Separate patients (students + faculty) from clinic staff
        const patients = activeRaw.filter(u => !isClinicStaff(u.role));
        const clinicStaff = activeRaw.filter(u => isClinicStaff(u.role));

        setUsers(patients.map(u => ({
          uid:          u.id, // Explicitly mapped to 'id' from users table
          universityId: u.university_id || u.universityId || u.idno || '',
          name:         `${u.last_name || u.lastName || ''}, ${u.first_name || u.firstName || ''}`.replace(/^,\s*/, '') || u.name || 'Unknown',
          type:         normaliseRole(u.role || u.type || u.user_type || 'student'),
          role:         u.role || 'student',
          prog:         u.program || u.course || '',
          year:         u.year_level || u.yearLevel || '',
          section:      u.section || '',
          email:        u.email || '',
          department:   u.department || '',
          createdAt:    u.created_at ||  '',
        })));
        setClinicStaffCount(clinicStaff.length);
      }

      // ── Medical Records ──────────────────────────────────
      let medData = [];
      if (medRes && medRes.ok) {
        const json = await medRes.json();
        medData = json.data || json || [];
      } else {
        const fallback = await fetch(`${API_URL}/examinations`, { headers }).catch(() => null);
        if (fallback && fallback.ok) {
          const json = await fallback.json();
          const all = json.data || json || [];
          medData = all.filter(r => (r.type || r.record_type || '').toLowerCase().includes('medical') || r.examType === 'medical');
        }
      }
      // Exclude archived records — only show is_archived === false (or missing/undefined)
      medData = medData.filter(r => r.is_archived !== true);
      setMedicalRecords(medData.map(r => ({
        ...r,
        kind:       'Medical',
        dateObj:    r.exam_date || r.examDate || r.created_at || r.createdAt
          ? new Date(r.exam_date || r.examDate || r.created_at || r.createdAt)
          : new Date(),
        userId:     r.user_id, // Explicitly mapped to 'user_id' from records
        schoolYear: r.school_year || r.schoolYear || '',
        semester:   r.semester || '',
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
      // Exclude archived records — only show is_archived === false (or missing/undefined)
      denData = denData.filter(r => r.is_archived !== true);
      setDentalRecords(denData.map(r => ({
        ...r,
        kind:       'Dental',
        dateObj:    r.created_at || r.createdAt || r.exam_date || r.examDate
          ? new Date(r.created_at || r.createdAt || r.exam_date || r.examDate)
          : new Date(),
        userId:     r.user_id, // Explicitly mapped to 'user_id' from records
        schoolYear: r.school_year || r.schoolYear || '',
        semester:   r.semester || '',
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

  // ── Filtered records by school year and semester ─────────────────────
  const filteredAllRecords = useMemo(() => {
    return allRecords.filter(r => {
      const matchesSchoolYear = schoolYearFilter === 'all' || r.schoolYear === schoolYearFilter;
      const matchesSemester = semesterFilter === 'all' || r.semester === semesterFilter;
      return matchesSchoolYear && matchesSemester;
    });
  }, [allRecords, schoolYearFilter, semesterFilter]);

  // ── Filtered users ────────────────────────────────────────
  const filteredUsers = useMemo(() =>
    filter === 'all' ? users : users.filter(u => u.type === filter),
  [users, filter]);

  // ── Available school years from records ─────────────────────
  const availableSchoolYears = useMemo(() => {
    const yrs = new Set(allRecords.map(r => r.schoolYear).filter(Boolean));
    return ['all', ...Array.from(yrs).sort()];
  }, [allRecords]);

  // ── Line Chart: visits over time ──────────────────────────
  const trendData = useMemo(() => {
    const filteredRecords = allRecords.filter(r => {
      const matchesSchoolYear = schoolYearFilter === 'all' || r.schoolYear === schoolYearFilter;
      const matchesSemester = semesterFilter === 'all' || r.semester === semesterFilter;
      return matchesSchoolYear && matchesSemester;
    });

    let labels = [];
    let ymTargets = [];

    if (filteredRecords.length > 0) {
      const dates = filteredRecords.map(r => r.dateObj).filter(Boolean);
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

      while (current <= end) {
        const y = current.getFullYear();
        const m = current.getMonth();
        ymTargets.push(`${y}-${String(m).padStart(2, '0')}`);
        labels.push(`${MONTHS[m]} ${y}`);
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const y = new Date().getFullYear();
      ymTargets = MONTHS.map((m, i) => `${y}-${String(i).padStart(2, '0')}`);
      labels = MONTHS.map(m => `${m} ${y}`);
    }

    const types = filter === 'all' ? ['student', 'faculty', 'staff'] : [filter];
    const borderDashes = { student: [], faculty: [6, 3], staff: [2, 3] };

    const recordsWithTypes = filteredRecords.map(r => {
      // Clean, exact ID match based on your schema
      const user = users.find(u => r.userId && String(u.uid) === String(r.userId));
      return {
        uType: user?.type || 'student',
        ymString: r.dateObj ? `${r.dateObj.getFullYear()}-${String(r.dateObj.getMonth()).padStart(2, '0')}` : null,
      };
    });

    const datasets = types.map(t => ({
      label:            t.charAt(0).toUpperCase() + t.slice(1),
      data:             ymTargets.map(ymTarget => {
        return recordsWithTypes.filter(r => r.uType === t && r.ymString === ymTarget).length;
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
  }, [filter, schoolYearFilter, semesterFilter, allRecords, users]);

  // ── Doughnut: record type distribution ───────────────────
  const recordsChartData = useMemo(() => {
    const filteredMedical = medicalRecords.filter(r => {
      const matchesSchoolYear = schoolYearFilter === 'all' || r.schoolYear === schoolYearFilter;
      const matchesSemester = semesterFilter === 'all' || r.semester === semesterFilter;
      return matchesSchoolYear && matchesSemester;
    });
    const filteredDental = dentalRecords.filter(r => {
      const matchesSchoolYear = schoolYearFilter === 'all' || r.schoolYear === schoolYearFilter;
      const matchesSemester = semesterFilter === 'all' || r.semester === semesterFilter;
      return matchesSchoolYear && matchesSemester;
    });

    return {
      config: {
        labels:   ['Medical Records', 'Dental Records'],
        datasets: [{
          data:            [filteredMedical.length || 0, filteredDental.length || 0],
          backgroundColor: RECORD_COLORS,
          borderWidth:     0,
        }],
      },
    };
  }, [medicalRecords, dentalRecords, schoolYearFilter, semesterFilter]);

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
    <div className="flex-1 h-full min-h-0 overflow-y-auto bg-[#f4f7f6] px-6 py-6 font-['Inter',sans-serif] text-[#2d3748] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-5 gap-5 mb-6">
        {loading ? [1,2,3,4,5].map(i => <StatSkeleton key={i} />) : (
          <>
            <GlassCard className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Patients</p>
              <h4 className="text-3xl font-bold text-slate-800">{users.length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Students + Faculty</p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Clinic Staff</p>
              <h4 className="text-3xl font-bold text-slate-800">{clinicStaffCount}</h4>
              <p className="text-xs text-emerald-500 mt-1">Doctor + Nurse + Dentist</p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Today's Appts</p>
              <h4 className="text-3xl font-bold text-slate-800">{todayAppts.length}</h4>
              <p className={`text-xs mt-1 ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                {pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} pending` : 'none pending'}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Medical</p>
              <h4 className="text-3xl font-bold text-slate-800">{filteredAllRecords.filter(r => r.kind === 'Medical').length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Exams recorded</p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Dental</p>
              <h4 className="text-3xl font-bold text-slate-800">{filteredAllRecords.filter(r => r.kind === 'Dental').length}</h4>
              <p className="text-xs text-emerald-500 mt-1">Exams recorded</p>
            </GlassCard>
          </>
        )}
      </div>

      {/* ── Analytics Card ── */}
      <GlassCard className="p-5 mb-6">
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
            <div className="flex gap-2 flex-wrap items-center">
              {/* Semester Filter */}
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="px-2.5 py-[3px] rounded-full text-[10px] font-semibold border border-[#e2e8f0] bg-white text-[#475569] focus:outline-none focus:border-[#466460]"
              >
                <option value="all">All Semesters</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Mid Year">Mid Year</option>
              </select>

              {/* School Year Filter */}
              <select
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
                className="px-2.5 py-[3px] rounded-full text-[10px] font-semibold border border-[#e2e8f0] bg-white text-[#475569] focus:outline-none focus:border-[#466460]"
              >
                {availableSchoolYears.map(sy => (
                  <option key={sy} value={sy}>
                    {sy === 'all' ? 'All School Years' : sy}
                  </option>
                ))}
              </select>
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

          <div className="w-full h-[30vh] min-h-[220px] relative">
            {loading ? <ChartSkeleton h="100%" /> : (
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      ticks: { font: { size: 10 }, maxRotation: 45, maxTicksLimit: 12 },
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
        <div className="grid grid-cols-2 gap-5">
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
      <div className="grid grid-cols-3 gap-5 pb-6">

        {/* Pending Appointments (spans 2 cols) */}
        <GlassCard className="p-0 overflow-hidden col-span-2 flex flex-col h-[400px]">
          <div className="p-5 border-b border-[#eef2f6] shrink-0 bg-white flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#466460] flex items-center">
              <i className="fa-regular fa-calendar-clock mr-2"></i>Action Required: Pending Appointments
              {pendingAppointments.length > 0 && (
                <span className="ml-3 text-[10px] font-bold text-[#854F0B] bg-[#FAEEDA] px-2 py-0.5 rounded-full">
                  {pendingAppointments.length} Pending
                </span>
              )}
            </h3>
            {pendingAppointments.length > 0 && (
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-bold text-[#466460] hover:underline flex items-center gap-1"
              >
                View All <i className="fa-solid fa-arrow-right"></i>
              </button>
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
                    appt?.bookedAt || appt?.createdAt || appt?.created_at || appt?.date || Date.now()
                  ).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                  const matchedUser = users.find(u =>
                    String(u.uid) === String(appt?.user_id || appt?.userId || appt?.patient_id || appt?.patientId || appt?.student_id)
                  );

                  const patientName = matchedUser?.name || appt?.name || appt?.patientName || appt?.student_name || appt?.studentName || 'Unknown Patient';
                  const patientId   = matchedUser?.universityId || appt?.university_id || appt?.universityId || appt?.idno || 'No ID';
                  const patientProg = matchedUser?.prog || appt?.prog || appt?.program || appt?.dept || appt?.department || 'N/A';
                  const reason      = appt?.reason || appt?.consultation_type || appt?.type || 'Consultation';

                  return (
                    <div
                      key={appt?.id || i}
                      className="grid grid-cols-12 items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-[#8aacaa] hover:shadow-sm transition-all group"
                    >
                      {/* Grid Column 1: # and Patient Name */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <div className="font-['DM_Mono',monospace] text-[10px] font-bold text-[#854F0B] bg-[#FAEEDA] rounded-md px-1.5 py-0.5 shrink-0">
                          #{i + 1}
                        </div>
                        <div className="text-[12px] font-bold text-[#1e293b] truncate group-hover:text-[#466460] transition-colors">
                          {patientName}
                        </div>
                      </div>

                      {/* Grid Column 2: ID & Program */}
                      <div className="col-span-3 text-[10px] text-[#64748b] truncate">
                        {patientId} &middot; {patientProg}
                      </div>

                      {/* Grid Column 3: Consultation Reason Badge */}
                      <div className="col-span-2 truncate">
                        <span className="text-[10px] text-[#6d28d9] bg-[#ede9fe] px-2 py-0.5 rounded-full inline-block font-medium truncate max-w-full">
                          {reason}
                        </span>
                      </div>

                      {/* Grid Column 4: Date & Time */}
                      <div className="col-span-2 text-right shrink-0">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
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
        </GlassCard>

        {/* Right column: Recent Records + Alerts */}
        <div className="flex flex-col gap-5 h-[400px]">

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
              ) : filteredAllRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No records found for selected filters</p>
              ) : (
                <div className="space-y-2">
                  {filteredAllRecords.slice(0, 6).map((rec, i) => {
                    // Exact match lookup
                    const user = users.find(u => rec.userId && String(u.uid) === String(rec.userId)) || {};
                    const isMed = rec.kind === 'Medical';
                    return (
                      <div key={rec.id || i} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isMed ? 'bg-[#81b29a]/20 text-[#466460]' : 'bg-[#e07a5f]/20 text-[#e07a5f]'
                        }`}>
                          <i className={`fa-solid ${isMed ? 'fa-stethoscope' : 'fa-tooth'} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {isMed ? 'Medical Exam' : 'Dental Exam'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {user.name || rec.userId || 'ID Missing'}
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
                  {alerts.map((alert, idx) => {
                    const isWarning = alert.type === 'warning';
                    return (
                      <div key={idx} className={`flex items-start gap-3 p-2.5 bg-white border border-slate-100 rounded-lg border-l-4 ${isWarning ? 'border-l-amber-500' : 'border-l-[#466460]'}`}>
                        <i className={`fa-solid ${alert.icon} text-sm mt-0.5 ${isWarning ? 'text-amber-500' : 'text-[#466460]'}`}></i>
                        <div>
                          <p className="text-[11px] font-bold text-slate-700">{isWarning ? 'Action Required' : 'System Update'}</p>
                          <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">{alert.text}</p>
                        </div>
                      </div>
                    );
                  })}
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