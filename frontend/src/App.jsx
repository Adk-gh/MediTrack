import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignupForm from './features/SignupForm.jsx';
import LoginForm from './features/LoginForm.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import ProfileSetup from './components/ProfileSetup.jsx';
import './index.css';
import HealthProfileSetup from './components/HealthProfileSetup.jsx';
import  Records  from './features/admin-clinic/Records.jsx';
import  Appointments from './features/admin-clinic/Appointments.jsx';
import { Dashboard } from './features/admin-clinic/Dashboard.jsx';
import  Examination  from './features/admin-clinic/Examinations.jsx';
import  Announcements  from './features/admin-clinic/Announcements.jsx'; 

import Meditrack from './features/users/Meditrack.jsx';


function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/onboarding" element={<ProfileSetup />} />
      <Route path="/student_onboarding" element={<HealthProfileSetup />} />
      <Route path="/records" element={<Records />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/examinations" element={<Examination />} />
      <Route path="/announcements" element={<Announcements />} />

      <Route path="/student/meditrack" element={<Meditrack />} />
      
      
      {/* Wrap the Dashboard in the Layout */}
      <Route path="/dashboard" element={
        <DashboardLayout>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800">Your Health Overview</h3>
            <p className="text-slate-500 mt-2">Welcome to the PLSP Student Health System.</p>
          </div>
        </DashboardLayout>
      } />

      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;