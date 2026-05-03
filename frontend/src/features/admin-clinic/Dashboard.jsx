// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Dashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import authService from '../../services/auth.service.js';
import ProfileSetup from '../../components/ProfileSetup.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

// ============================================================
// CONSTANTS & MOCK DATA (Synced with HTML)
// ============================================================
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE_COLORS = { student: '#466460', instructor: '#e07a5f', staff: '#81b29a' };
const DISEASE_COLORS = ['#466460','#e07a5f','#e9c46a','#81b29a','#f4a261','#2a9d8f','#e76f51','#264653','#a8dadc'];

const peopleData = [
    { name: "De Vera, Jenny", id: "23-00142", type: "student", prog: "BSIT", year: "3rd Year", section: "A", history: ["Flu symptoms; prescribed bed rest."], diseases: ["Influenza"], visitDates: ["2025-01-15", "2026-03-05"] },
    { name: "Santos, Sofia", id: "23-23406", type: "student", prog: "BSCE", year: "2nd Year", section: "B", history: ["Routine dental examination."], diseases: ["Dental Caries"], visitDates: ["2025-02-20", "2026-03-05"] },
    { name: "Mendoza, Paolo", id: "22-09123", type: "student", prog: "BSN", year: "4th Year", section: "C", history: ["Physical assessment for RLE."], diseases: ["Allergic Rhinitis"], visitDates: ["2025-03-10", "2026-03-10"] },
    { name: "Garcia, Rico", id: "24-11002", type: "student", prog: "BS PSY", year: "1st Year", section: "A", history: ["Standard first aid for minor abrasion."], diseases: ["Minor Wound"], visitDates: ["2025-01-22", "2026-03-10"] },
    { name: "Reyes, Clara", id: "23-55678", type: "student", prog: "BS ARCH", year: "2nd Year", section: "A", history: ["Eye strain consultation."], diseases: ["Eye Strain"], visitDates: ["2025-04-18", "2026-03-10"] },
    { name: "Villanueva, Mark", id: "22-98102", type: "student", prog: "BSIT", year: "3rd Year", section: "B", history: ["Back pain consultation."], diseases: ["Lower Back Pain"], visitDates: ["2025-05-28", "2026-03-18"] },
    { name: "Dimagiba, Lea", id: "24-33457", type: "student", prog: "BSN", year: "1st Year", section: "A", history: ["Pre-enrollment medical exam."], diseases: ["Routine Check-up"], visitDates: ["2025-06-02", "2026-03-05"] },
    { name: "Cruz, Andrei", id: "23-77234", type: "student", prog: "BSCE", year: "3rd Year", section: "C", history: ["Sprained ankle; RICE treatment."], diseases: ["Sprain"], visitDates: ["2025-07-14", "2026-03-10"] },
    { name: "Fernandez, Bianca", id: "22-12098", type: "student", prog: "BS PSY", year: "4th Year", section: "A", history: ["Mental wellness check-up."], diseases: ["Anxiety"], visitDates: ["2025-08-30", "2026-02-14"] },
    { name: "Rivera, Kevin", id: "23-44567", type: "student", prog: "BSIT", year: "2nd Year", section: "D", history: ["Allergy testing."], diseases: ["Allergies"], visitDates: ["2025-09-07", "2026-04-07"] },
    { name: "Torres, Michelle", id: "21-88902", type: "student", prog: "BSN", year: "4th Year", section: "B", history: ["TB screening."], diseases: ["TB Screening"], visitDates: ["2025-10-19", "2026-03-28"] },
    { name: "Luna, Gabriel", id: "24-56789", type: "student", prog: "BSBA", year: "2nd Year", section: "A", history: ["Fever and cough."], diseases: ["Acute Bronchitis"], visitDates: ["2025-11-11", "2026-03-25"] },
    { name: "Aquino, Patricia", id: "23-99881", type: "student", prog: "BSCS", year: "3rd Year", section: "A", history: ["Migraine attack."], diseases: ["Migraine"], visitDates: ["2025-12-25", "2026-03-22"] },
    { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", prog: "PhD", history: ["Hypertension check-up."], diseases: ["Hypertension"], visitDates: ["2025-02-12", "2026-03-15"] },
    { name: "Prof. Cruz, Andres", id: "FAC-045", type: "instructor", prog: "Masters", history: ["Diabetes monitoring."], diseases: ["Type 2 Diabetes"], visitDates: ["2025-05-08", "2026-04-03"] },
    { name: "Prof. Mercado, Liza", id: "FAC-078", type: "instructor", prog: "EdD", history: ["Arthritis consultation."], diseases: ["Arthritis"], visitDates: ["2025-08-20", "2025-11-15"] },
    { name: "Dr. Villanueva, Paolo", id: "FAC-112", type: "instructor", prog: "MD", history: ["Migraine treatment."], diseases: ["Migraine"], visitDates: ["2025-03-15", "2026-01-10"] },
    { name: "Prof. Santos, Carmela", id: "FAC-203", type: "instructor", prog: "MA", history: ["Respiratory infection."], diseases: ["Bronchitis"], visitDates: ["2025-06-03", "2025-12-20"] },
    { name: "Ms. Fernandez, Leah", id: "STAFF-012", type: "staff", history: ["Back pain therapy."], diseases: ["Lower Back Pain"], visitDates: ["2024-08-22", "2025-04-15"] },
    { name: "Mr. Villanueva, Mark", id: "STAFF-089", type: "staff", history: ["Respiratory infection."], diseases: ["Bronchitis"], visitDates: ["2024-01-17", "2025-07-10"] },
    { name: "Ms. Garcia, Rosalie", id: "STAFF-034", type: "staff", history: ["Hypertension monitoring."], diseases: ["Hypertension"], visitDates: ["2024-10-05", "2025-10-22", "2026-03-22"] },
    { name: "Mr. Dimagiba, Ricardo", id: "STAFF-067", type: "staff", history: ["Chest pain evaluation."], diseases: ["Chest Pain"], visitDates: ["2024-07-30", "2025-01-15"] },
    { name: "Ms. Reyes, Teresa", id: "STAFF-101", type: "staff", history: ["Eye strain from computer work."], diseases: ["Digital Eye Strain"], visitDates: ["2024-02-14", "2025-09-08"] },
    { name: "Mr. Santos, Roberto", id: "STAFF-145", type: "staff", history: ["Annual physical exam."], diseases: ["Routine Check-up"], visitDates: ["2024-12-28", "2025-06-30"] }
];

const appointments = [
    { name: "De Vera, Jenny", status: "confirmed", year: 2026, month: 3, day: 5 },
    { name: "Santos, Sofia", status: "pending", year: 2026, month: 3, day: 5 },
    { name: "Mendoza, Paolo", status: "confirmed", year: 2026, month: 3, day: 10 },
    { name: "Garcia, Rico", status: "pending", year: 2026, month: 3, day: 10 },
    { name: "Reyes, Clara", status: "pending", year: 2026, month: 3, day: 10 },
    { name: "Dr. Reyes, Maria", status: "confirmed", year: 2026, month: 3, day: 15 },
    { name: "Villanueva, Mark", status: "pending", year: 2026, month: 3, day: 18 },
    { name: "Aquino, Patricia", status: "confirmed", year: 2026, month: 3, day: 22 },
    { name: "Ms. Garcia, Rosalie", status: "confirmed", year: 2026, month: 3, day: 22 },
    { name: "Luna, Gabriel", status: "pending", year: 2026, month: 3, day: 25 },
    { name: "Torres, Michelle", status: "confirmed", year: 2026, month: 3, day: 28 },
    { name: "Prof. Cruz, Andres", status: "confirmed", year: 2026, month: 4, day: 3 },
    { name: "Rivera, Kevin", status: "pending", year: 2026, month: 4, day: 7 },
    { name: "Fernandez, Bianca", status: "confirmed", year: 2026, month: 2, day: 14 },
];

const auditLogs = [
    { id: 1, action: "Record Created", target: "Jenny De Vera", timestamp: "2026-04-22 09:15:23", type: 'success' },
    { id: 2, action: "Appointment Approved", target: "Paolo Mendoza", timestamp: "2026-04-22 08:45:10", type: 'success' },
    { id: 3, action: "Document Uploaded", target: "Sofia Santos", timestamp: "2026-04-21 14:30:45", type: 'info' },
    { id: 4, action: "Examination Completed", target: "Rico Garcia", timestamp: "2026-04-21 11:20:33", type: 'success' },
    { id: 5, action: "Announcement Posted", target: "All Departments", timestamp: "2026-04-20 16:00:00", type: 'info' },
    { id: 6, action: "Appointment Rejected", target: "Kevin Rivera", timestamp: "2026-04-20 10:30:15", type: 'error' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Dashboard = () => {
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const checkProfileSetup = async () => {
      if (!currentUser) return;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success && !result.data.isProfileSetup) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
      }
    };
    checkProfileSetup();
  }, [currentUser]);

  // --- Dates & Stats Calculations ---
  const today = new Date();
  const todayAppts = appointments.filter(a => a.year === today.getFullYear() && a.month === (today.getMonth() + 1) && a.day === today.getDate());
  const pendingCount = todayAppts.filter(a => a.status === 'pending').length;

  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const weekAppts = appointments.filter(a => {
      const apptDate = new Date(a.year, a.month - 1, a.day);
      return apptDate >= today && apptDate <= weekFromNow;
  });

  const totalVisits = peopleData.reduce((s, p) => s + (p.visitDates ? p.visitDates.length : 0), 0);
  const clearancesIssued = Math.floor(Math.random() * 20) + 5; // Placeholder from original HTML

  // --- Filtered Data ---
  const filteredPeople = filter === 'all' ? peopleData : peopleData.filter(p => p.type === filter);

  // --- Chart 1: Trend Data (Line) ---
  const trendData = useMemo(() => {
      const years = yearFilter === 'all' ? ['2024', '2025', '2026'] : [yearFilter];
      const labels = [];
      years.forEach(yr => MONTHS.forEach(m => labels.push(`${m} ${yr}`)));

      const types = filter === 'all' ? ['student', 'instructor', 'staff'] : [filter];
      const borderDashes = { student: [], instructor: [6, 3], staff: [2, 3] };

      const datasets = types.map(t => {
          const data = labels.map(lbl => {
              const [mo, yr] = lbl.split(' ');
              const mIdx = MONTHS.indexOf(mo);
              return filteredPeople
                  .filter(p => p.type === t)
                  .reduce((sum, p) => {
                      if (!p.visitDates) return sum;
                      return sum + p.visitDates.filter(d => {
                          const dt = new Date(d);
                          return String(dt.getFullYear()) === yr && dt.getMonth() === mIdx;
                      }).length;
                  }, 0);
          });

          return {
              label: t.charAt(0).toUpperCase() + t.slice(1),
              data,
              borderColor: TYPE_COLORS[t],
              backgroundColor: TYPE_COLORS[t] + '18',
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5,
              tension: 0.35,
              fill: false,
              borderDash: borderDashes[t]
          };
      });

      return { labels, datasets };
  }, [filter, yearFilter, filteredPeople]);

  // --- Chart 2: Disease Data (Doughnut) ---
  const diseaseChartData = useMemo(() => {
      const counts = {};
      filteredPeople.forEach(p => {
          if (p.diseases) p.diseases.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
      });
      const labels = Object.keys(counts);
      const data = Object.values(counts);
      const topDisease = labels.length ? labels.reduce((a, b) => counts[a] > counts[b] ? a : b) : '-';

      return {
          topDisease,
          config: {
              labels: labels.length ? labels : ['No Data'],
              datasets: [{
                  data: data.length ? data : [1],
                  backgroundColor: DISEASE_COLORS.slice(0, Math.max(labels.length, 1)),
                  borderWidth: 0
              }]
          }
      };
  }, [filteredPeople]);

  // --- Chart 3: Type Data (Bar) ---
  const typeChartData = useMemo(() => {
      const counts = {};
      filteredPeople.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
      
      return {
          labels: Object.keys(counts),
          datasets: [{
              label: 'Count',
              data: Object.values(counts),
              backgroundColor: Object.keys(counts).map(t => TYPE_COLORS[t] || '#466460'),
              borderRadius: 4
          }]
      };
  }, [filteredPeople]);

  // --- Alerts generation ---
  const alerts = [];
  if (pendingCount > 0) alerts.push({ icon: 'fa-calendar', text: `${pendingCount} appointments pending approval`, type: 'warning' });
  alerts.push({ icon: 'fa-syringe', text: 'Vaccination stock running low', type: 'info' });
  alerts.push({ icon: 'fa-file-medical', text: '5 medical clearances expiring soon', type: 'warning' });

  // --- Helper Components ---
  const GlassCard = ({ children, className = '' }) => (
      <div className={`bg-white rounded-xl border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 ${className}`}>
          {children}
      </div>
  );

  return (
    <>
      {showOnboarding && <ProfileSetup user={currentUser} onComplete={() => setShowOnboarding(false)} />}

      <div className="min-h-[calc(100vh-120px)] bg-[#f4f7f6] p-6 font-['Inter',sans-serif] text-[#2d3748] animate-[fadeIn_0.4s_ease-out_forwards]">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <GlassCard className="p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Patients</p>
            <h4 className="text-3xl font-bold text-slate-800">{peopleData.length}</h4>
            <p className="text-xs text-emerald-500 mt-1">Active records</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Today's Appointments</p>
            <h4 className="text-3xl font-bold text-slate-800">{todayAppts.length}</h4>
            <p className="text-xs text-amber-500 mt-1">{pendingCount} pending</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Upcoming This Week</p>
            <h4 className="text-3xl font-bold text-slate-800">{weekAppts.length}</h4>
            <p className="text-xs text-emerald-500 mt-1">scheduled</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Clearances Issued</p>
            <h4 className="text-3xl font-bold text-slate-800">{clearancesIssued}</h4>
            <p className="text-xs text-emerald-500 mt-1">This month</p>
          </GlassCard>
        </div>

        {/* Analytics Section */}
        <GlassCard className="p-5 mb-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h3 className="font-bold text-base text-[#466460]">Health Analytics</h3>
            <div className="flex gap-2 flex-wrap">
              {['all', 'student', 'instructor', 'staff'].map(f => (
                <button key={f} onClick={() => setFilter(f)} 
                  className={`px-[14px] py-[5px] rounded-[20px] text-[12px] font-semibold cursor-pointer border transition-all duration-200
                  ${filter === f ? 'bg-gradient-to-br from-[#466460] to-[#5a7a76] text-white border-transparent' : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:bg-[#e2e8f0]'}`}>
                  {f === 'all' ? 'All' : f === 'student' ? 'Students' : f === 'instructor' ? 'Faculty' : 'Staff'}
                </button>
              ))}
            </div>
          </div>

          {/* Line Chart */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                <i className="fa-solid fa-chart-line mr-1 text-[#466460]"></i>Case Records Over Time
              </p>
              <div className="flex gap-2 flex-wrap">
                {['all', '2024', '2025', '2026'].map(y => (
                  <button key={y} onClick={() => setYearFilter(y)}
                    className={`px-[12px] py-[4px] rounded-[20px] text-[11px] font-semibold cursor-pointer border transition-all duration-200
                    ${yearFilter === y ? 'bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white border-transparent' : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:bg-[#e2e8f0]'}`}>
                    {y === 'all' ? 'All Years' : y}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Legend */}
            <div className="flex gap-5 mb-3 flex-wrap">
              {(filter === 'all' || filter === 'student') && <div className="flex items-center gap-[6px] text-[12px] text-[#475569]"><span className="w-[28px] h-[3px] rounded-[2px] bg-[#466460]"></span>Students</div>}
              {(filter === 'all' || filter === 'instructor') && <div className="flex items-center gap-[6px] text-[12px] text-[#475569]"><span className="w-[28px] h-[3px] rounded-[2px]" style={{background: 'repeating-linear-gradient(90deg, #e07a5f 0, #e07a5f 6px, transparent 6px, transparent 10px)'}}></span>Faculty</div>}
              {(filter === 'all' || filter === 'staff') && <div className="flex items-center gap-[6px] text-[12px] text-[#475569]"><span className="w-[28px] h-[3px] rounded-[2px]" style={{background: 'repeating-linear-gradient(90deg, #81b29a 0, #81b29a 3px, transparent 3px, transparent 6px)'}}></span>Staff</div>}
            </div>

            <div className="w-full h-[260px] relative">
              <Line 
                data={trendData} 
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { font: { size: 11 }, maxRotation: 45, maxTicksLimit: yearFilter === 'all' ? 18 : 12 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Number of records', font: { size: 11, weight: '600' }, color: '#64748b' }, ticks: { font: { size: 11 }, stepSize: 1, callback: val => Number.isInteger(val) ? val : null }, grid: { color: 'rgba(0,0,0,0.04)' } }
                  }
                }} 
              />
            </div>
          </div>

          <hr className="border-slate-100 mb-5" />

          {/* Doughnut & Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3"><i className="fa-solid fa-virus mr-1 text-[#466460]"></i>Disease Distribution</p>
              <div className="h-[160px] flex justify-center items-center">
                <Doughnut 
                  data={diseaseChartData.config} 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }} 
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3"><i className="fa-solid fa-users mr-1 text-[#466460]"></i>Patient Type Breakdown</p>
              <div className="h-[160px]">
                <Bar 
                  data={typeChartData} 
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Number of records', font: { size: 11, weight: '600' }, color: '#64748b' }, ticks: { font: { size: 11 }, stepSize: 1 } },
                      x: { ticks: { font: { size: 11 } } }
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">Total Visits</p>
              <p className="text-2xl font-bold text-[#466460]">{totalVisits}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">Most Common Case</p>
              <p className="text-sm font-bold text-[#466460] mt-2">{diseaseChartData.topDisease}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">Recovery Rate</p>
              <p className="text-2xl font-bold text-[#466460]">94%</p>
            </div>
          </div>
        </GlassCard>

        {/* Visit Trends */}
        <GlassCard className="p-5 mb-6">
          <h3 className="font-bold text-sm text-[#466460] mb-4"><i className="fa-solid fa-clock-rotate-left mr-2"></i>Visit Trends</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">Today</p>
              <p className="text-xl font-bold text-[#466460]">{todayAppts.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">This Week</p>
              <p className="text-xl font-bold text-[#466460]">{weekAppts.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">This Month</p>
              <p className="text-xl font-bold text-[#466460]">{appointments.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-black text-slate-400 mb-1">Avg/Day</p>
              <p className="text-xl font-bold text-[#466460]">{Math.round(appointments.length / 30)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Activity + Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GlassCard className="p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4"><i className="fa-solid fa-clock-rotate-left mr-2"></i>Recent Activity</h3>
            <div className="space-y-2 max-h-[208px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-br [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${log.type === 'error' ? 'bg-red-400' : log.type === 'info' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">{log.action}</p>
                    <p className="text-xs text-slate-500">{log.target}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{log.timestamp.split(' ')[1]}</p>
                </div>
              ))}
            </div>
          </GlassCard>
          
          <GlassCard className="p-5">
            <h3 className="font-bold text-sm text-[#466460] mb-4"><i className="fa-solid fa-bell mr-2"></i>Alerts & Notifications</h3>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <i className={`fa-solid ${alert.icon} text-sm ${alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}></i>
                  <p className="text-xs text-slate-600">{alert.text}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </>
  );
};

export default Dashboard;