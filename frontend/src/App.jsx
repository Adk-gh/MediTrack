// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SignupForm from './features/SignupForm.jsx';
import LoginForm from './features/LoginForm.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import ProfileSetup from './components/ProfileSetup.jsx';
import './index.css';

// Features - Admin/Clinic
import Records from './features/admin-clinic/Records.jsx';
import Appointments from './features/admin-clinic/Appointments.jsx';
import { Dashboard } from './features/admin-clinic/Dashboard.jsx';
import Examination from './features/admin-clinic/Examinations.jsx';
import Announcements from './features/admin-clinic/Announcements.jsx';
import Consultations from './features/admin-clinic/Consultations.jsx';
import UserManagement from './features/admin-clinic/User-Management.jsx';

// Features - Students
import Meditrack from './features/users/Meditrack.jsx';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.profileComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly) {
    const role = user.role?.toLowerCase() || '';
    const isAdminRole = ['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role);
    if (!isAdminRole) return <Navigate to="/student/meditrack" replace />;
  }

  return children;
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (!user) return <Navigate to="/login" replace />;

  const handleComplete = () => {
    const updatedUser = { ...user, profileComplete: true };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    const role = user.role?.toLowerCase().trim() || '';
    if (['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role)) {
      navigate('/dashboard');
    } else {
      navigate('/student/meditrack');
    }
  };

  return <ProfileSetup user={user} onComplete={handleComplete} />;
};

function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route path="/dashboard" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Dashboard /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/records" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Records /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/appointments" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Appointments /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/examinations" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Examination /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/announcements" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Announcements /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/consultations" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><Consultations /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute adminOnly={true}>
          <DashboardLayout><UserManagement /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/student/meditrack" element={
        <ProtectedRoute adminOnly={false}>
          <Meditrack />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;