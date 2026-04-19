// C:\Users\HP\MediTrack\frontend\src\features\Dashboard.jsx
import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const diseaseData = { 
  student: { "Influenza": 12, "Dental Caries": 8, "Allergic Rhinitis": 7, "Minor Wound": 5, "Common Cold": 10, "Eye Strain": 4, "Anxiety": 3, "Migraine": 4 }, 
  instructor: { "Hypertension": 8, "Type 2 Diabetes": 5, "Migraine": 6, "Stress": 7, "Arthritis": 3 }, 
  staff: { "Lower Back Pain": 6, "Bronchitis": 3, "Hypertension": 5, "Digital Eye Strain": 4, "Chest Pain": 2 } 
};

export const Dashboard = () => {
  const [filter, setFilter] = useState('all');

  // Calculate combined data for charts based on the active filter
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

  // Chart Configurations
  const barChartData = {
    labels: chartData.sortedLabels,
    datasets: [{
      data: chartData.sortedData,
      backgroundColor: '#466460',
      borderRadius: 6
    }]
  };

  const typeTotals = {
    student: Object.values(diseaseData.student).reduce((a,b)=>a+b,0),
    instructor: Object.values(diseaseData.instructor).reduce((a,b)=>a+b,0),
    staff: Object.values(diseaseData.staff).reduce((a,b)=>a+b,0)
  };

  const doughnutData = {
    labels: ['Students', 'Faculty', 'Staff'],
    datasets: [{
      data: [typeTotals.student, typeTotals.instructor, typeTotals.staff],
      backgroundColor: ['#466460', '#81b29a', '#e9c46a']
    }]
  };

  return (
    <DashboardLayout>
      <div className="animate-[fadeInSlide_0.4s_ease-out_forwards] p-6 max-w-7xl mx-auto">
        
        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Encounters</p>
            <h4 className="text-2xl font-bold text-slate-800">3,842</h4>
            <p className="text-[11px] font-semibold text-emerald-500 mt-1">↑ +15% from last month</p>
          </div>
          <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Requests</p>
            <h4 className="text-2xl font-bold text-slate-800">73</h4>
            <p className="text-[11px] font-semibold text-amber-500 mt-1">8 urgent requests</p>
          </div>
          <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clearances Issued</p>
            <h4 className="text-2xl font-bold text-slate-800">486</h4>
            <p className="text-[11px] font-semibold text-emerald-500 mt-1">This month</p>
          </div>
          <div className="glass-card p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Today's Queue</p>
            <h4 className="text-2xl font-bold text-slate-800">32</h4>
            <p className="text-[11px] font-semibold text-orange-500 mt-1">12 currently waiting</p>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="glass-card p-5 mb-5 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-sm text-[#466460]">Health Analytics</h3>
            <div className="flex gap-2">
              {['all', 'student', 'instructor', 'staff'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)} 
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            <div className="h-[200px] flex justify-center">
              <Bar data={barChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
            <div className="h-[200px] flex justify-center">
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mt-6">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Visits</p>
              <p className="text-xl font-bold text-[#466460]">{chartData.total}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase">Most Common</p>
              <p className="text-sm font-bold text-[#466460] mt-1">{chartData.topDisease}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase">Recovery Rate</p>
              <p className="text-xl font-bold text-[#466460]">94%</p>
            </div>
          </div>
        </div>

        {/* Bulletins Section */}
        <div className="glass-card p-5 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-xs text-[#466460] mb-4"><i className="fa-regular fa-bell mr-2"></i>Recent Bulletins</h3>
          <div className="flex gap-4">
            <div className="flex-1 p-4 bg-[#466460]/5 rounded-xl border border-[#466460]/10">
              <p className="text-xs font-bold text-[#466460]">Medical Clearance Drive</p>
              <p className="text-[11px] text-slate-500 mt-1">April 25-30, 2026</p>
            </div>
            <div className="flex-1 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-bold text-amber-700">Flu Vaccination</p>
              <p className="text-[11px] text-slate-500 mt-1">Schedule your appointment</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};