import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout.jsx';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import authService from '../../services/auth.service.js';
import ProfileSetup from '../../components/ProfileSetup.jsx'; // 👈 IMPORT YOUR MODAL HERE

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const diseaseData = {
  student: { "Influenza": 12, "Dental Caries": 8, "Allergic Rhinitis": 7, "Minor Wound": 5, "Common Cold": 10, "Eye Strain": 4, "Anxiety": 3, "Migraine": 4 },
  instructor: { "Hypertension": 8, "Type 2 Diabetes": 5, "Migraine": 6, "Stress": 7, "Arthritis": 3 },
  staff: { "Lower Back Pain": 6, "Bronchitis": 3, "Hypertension": 5, "Digital Eye Strain": 4, "Chest Pain": 2 }
};

const samplePatients = [
  { name: "De Vera, Jenny", id: "23-00142", type: "student", dept: "College of Computing", year: 3, section: "A", history: ["Flu symptoms; prescribed bed rest.", "Internship Medical Clearance issued."], diseases: ["Influenza"] },
  { name: "Santos, Sofia", id: "23-23406", type: "student", dept: "College of Engineering", year: 2, section: "B", history: ["Routine dental examination.", "Vital signs within normal range."], diseases: ["Dental Caries"] },
  { name: "Mendoza, Paolo", id: "22-09123", type: "student", dept: "College of Health Sciences", year: 4, section: "C", history: ["Physical assessment for RLE.", "Immunization record updated."], diseases: ["Allergic Rhinitis"] },
  { name: "Garcia, Rico", id: "24-11002", type: "student", dept: "College of Arts & Sciences", year: 1, section: "A", history: ["Standard first aid for minor abrasion.", "Tetanus shot administered."], diseases: ["Minor Wound"] },
  { name: "Reyes, Clara", id: "23-55678", type: "student", dept: "College of Engineering", year: 2, section: "A", history: ["Eye strain consultation.", "Ergonomic assessment recommended."], diseases: ["Eye Strain"] },
  { name: "Villanueva, Mark", id: "22-98102", type: "student", dept: "College of Computing", year: 3, section: "B", history: ["Back pain consultation; physical therapy referral."], diseases: ["Lower Back Pain"] },
  { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", dept: "College of Computing", history: ["Hypertension check-up.", "Stress management consultation."], diseases: ["Hypertension"] },
  { name: "Prof. Cruz, Andres", id: "FAC-045", type: "instructor", dept: "College of Engineering", history: ["Diabetes monitoring.", "Regular check-up."], diseases: ["Type 2 Diabetes"] },
  { name: "Ms. Fernandez, Leah", id: "STAFF-012", type: "staff", dept: "Registrar's Office", history: ["Back pain therapy.", "Ergonomic assessment."], diseases: ["Lower Back Pain"] },
  { name: "Ms. Garcia, Rosalie", id: "STAFF-034", type: "staff", dept: "Accounting Office", history: ["Hypertension monitoring.", "Lifestyle change advice."], diseases: ["Hypertension"] },
];

const sampleAppointments = [
  { name: "De Vera, Jenny", id: "23-00142", type: "student", dept: "College of Computing", day: 5, time: "09:00", reason: "Annual Physical Exam", status: "confirmed" },
  { name: "Santos, Sofia", id: "23-23406", type: "student", dept: "College of Engineering", day: 5, time: "10:30", reason: "Dental Check-up", status: "pending" },
  { name: "Mendoza, Paolo", id: "22-09123", type: "student", dept: "College of Health Sciences", day: 10, time: "08:00", reason: "Medical Clearance for RLE", status: "confirmed" },
  { name: "Garcia, Rico", id: "24-11002", type: "student", dept: "College of Arts & Sciences", day: 10, time: "09:30", reason: "Tetanus Booster", status: "pending" },
  { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", dept: "College of Computing", day: 15, time: "14:00", reason: "Hypertension Monitoring", status: "confirmed" },
  { name: "Villanueva, Mark", id: "22-98102", type: "student", dept: "College of Computing", day: 18, time: "10:00", reason: "Back Pain Follow-up", status: "pending" },
  { name: "Aquino, Patricia", id: "23-99881", type: "student", dept: "College of Computing", day: 22, time: "09:00", reason: "Migraine consultation", status: "confirmed" },
  { name: "Luna, Gabriel", id: "24-56789", type: "student", dept: "College of Business", day: 25, time: "15:30", reason: "Bronchitis follow-up", status: "pending" },
];

const auditLogs = [
  { id: 1, action: "Record Created", user: "Admin User", target: "Jenny De Vera", details: "New patient record added", timestamp: "09:15:23" },
  { id: 2, action: "Appointment Approved", user: "Admin User", target: "Paolo Mendoza", details: "Medical clearance appointment confirmed", timestamp: "08:45:10" },
  { id: 3, action: "Document Uploaded", user: "Admin User", target: "Sofia Santos", details: "Lab results document uploaded", timestamp: "14:30:45" },
  { id: 4, action: "Examination Completed", user: "Dr. Reyes", target: "Rico Garcia", details: "Medical examination recorded", timestamp: "11:20:33" },
  { id: 5, action: "Announcement Posted", user: "Admin User", target: "All Departments", details: "Flu vaccination drive announcement", timestamp: "16:00:00" },
];

export const Dashboard = () => {
  const [filter, setFilter] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false); // 👈 ADDED MODAL STATE

  const session = authService.getCurrentUser();
  const currentUser = session;

  // 👈 ADDED EFFECT TO TRIGGER MODAL - Check from API instead of localStorage
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

  const today = new Date();
  const todayAppts = sampleAppointments.filter(a => a.day === today.getDate());
  const pendingCount = todayAppts.filter(a => a.status === 'pending').length;

  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const weekAppts = sampleAppointments.filter(a => a.day >= today.getDate() && a.day <= weekFromNow.getDate());

  const chartData = useMemo(() => {
    let combined = {};
    if (filter === 'all') {
      Object.values(diseaseData).forEach(cat => {
        Object.entries(cat).forEach(([d, c]) => combined[d] = (combined[d] || 0) + c);
      });
    } else {
      combined = diseaseData[filter] || {};
    }

    const sortedLabels = Object.keys(combined).sort((a, b) => combined[b] - combined[a]).slice(0, 6);
    const sortedData = sortedLabels.map(label => combined[label]);

    const total = Object.values(combined).reduce((a, b) => a + b, 0);
    const topDisease = sortedLabels[0] || '-';

    return { combined, sortedLabels, sortedData, total, topDisease };
  }, [filter]);

  const barChartData = {
    labels: chartData.sortedLabels,
    datasets: [{
      data: chartData.sortedData,
      backgroundColor: '#466460',
      borderRadius: 6
    }]
  };

  const typeTotals = {
    student: Object.values(diseaseData.student).reduce((a, b) => a + b, 0),
    instructor: Object.values(diseaseData.instructor).reduce((a, b) => a + b, 0),
    staff: Object.values(diseaseData.staff).reduce((a, b) => a + b, 0)
  };

  const doughnutData = {
    labels: ['Students', 'Faculty', 'Staff'],
    datasets: [{
      data: [typeTotals.student, typeTotals.instructor, typeTotals.staff],
      backgroundColor: ['#466460', '#81b29a', '#e9c46a']
    }]
  };

  const getDiseaseDataFromPatients = () => {
    const counts = {};
    samplePatients.forEach(p => {
      if (p.diseases) {
        p.diseases.forEach(d => {
          counts[d] = (counts[d] || 0) + 1;
        });
      }
    });
    return counts;
  };

  const getAlerts = () => {
    const alerts = [];
    if (pendingCount > 0) {
      alerts.push({ icon: 'fa-calendar', text: `${pendingCount} appointments pending approval`, type: 'warning' });
    }
    alerts.push({ icon: 'fa-syringe', text: 'Vaccination stock running low', type: 'info' });
    alerts.push({ icon: 'fa-file-medical', text: '5 medical clearances expiring soon', type: 'warning' });
    return alerts;
  };

  const totalVisits = samplePatients.reduce((acc, p) => acc + (p.history ? p.history.length : 0), 0);

  return (
    <>
      {/* 👈 RENDER THE ONBOARDING MODAL OVER THE DASHBOARD */}
      {showOnboarding && (
        <ProfileSetup 
          user={currentUser} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      <DashboardLayout>
        <div className="animate-[fadeInSlide_0.4s_ease-out_forwards] p-6 max-w-7xl mx-auto">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total Patients</p>
              <h4 className="text-xl font-bold text-slate-800">{samplePatients.length}</h4>
              <p className="text-[9px] text-emerald-500 mt-1">Active records</p>
            </div>
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Today's Appointments</p>
              <h4 className="text-xl font-bold text-slate-800">{todayAppts.length}</h4>
              <p className="text-[9px] text-amber-500 mt-1">{pendingCount} pending</p>
            </div>
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Upcoming This Week</p>
              <h4 className="text-xl font-bold text-slate-800">{weekAppts.length}</h4>
              <p className="text-[9px] text-emerald-500 mt-1">scheduled</p>
            </div>
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Clearances Issued</p>
              <h4 className="text-xl font-bold text-slate-800">486</h4>
              <p className="text-[9px] text-emerald-500 mt-1">This month</p>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="glass-card p-4 mb-5 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#466460]">Health Analytics</h3>
              <div className="flex gap-1">
                {['all', 'student', 'instructor', 'staff'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`filter-pill ${filter === f ? 'active' : ''}`}
                  >
                    {f === 'all' ? 'All' : f === 'student' ? 'Students' : f === 'instructor' ? 'Faculty' : 'Staff'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[160px] flex justify-center">
                <Bar data={barChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="h-[160px] flex justify-center">
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } } }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mt-4">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">Total Visits</p>
                <p className="text-lg font-bold text-[#466460]">{totalVisits}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">Most Common</p>
                <p className="text-xs font-bold text-[#466460]">{chartData.topDisease}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">Recovery Rate</p>
                <p className="text-lg font-bold text-[#466460]">94%</p>
              </div>
            </div>
          </div>

          {/* Visit Trends Section */}
          <div className="glass-card p-4 mb-5 bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-xs text-[#466460] mb-3"><i className="fa-solid fa-clock-rotate-left mr-1"></i>Visit Trends</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">Today</p>
                <p className="text-sm font-bold text-[#466460]">{todayAppts.length}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">This Week</p>
                <p className="text-sm font-bold text-[#466460]">{weekAppts.length}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">This Month</p>
                <p className="text-sm font-bold text-[#466460]">{sampleAppointments.length}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-[8px] font-black text-slate-400">Avg/Day</p>
                <p className="text-sm font-bold text-[#466460]">{Math.round(sampleAppointments.length / 30)}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-xs text-[#466460] mb-3"><i className="fa-solid fa-clock-rotate-left mr-1"></i>Recent Activity</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-700">{log.action}</p>
                      <p className="text-[9px] text-slate-500">{log.target}</p>
                    </div>
                    <p className="text-[8px] text-slate-400">{log.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-xs text-[#466460] mb-3"><i className="fa-solid fa-bell mr-1"></i>Alerts & Notifications</h3>
              <div className="space-y-2">
                {getAlerts().map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <i className={`fa-solid ${alert.icon} text-xs ${alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}></i>
                    <p className="text-[10px] text-slate-600">{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};