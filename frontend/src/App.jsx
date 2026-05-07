// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import SignupForm from './features/SignupForm.jsx';
import LoginForm from './features/LoginForm.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import ProfileSetup from './components/ProfileSetup.jsx';
import Loading from './components/loading.jsx';
import authService from './services/auth.service.js';
import './index.css';

// Shared context
import { AppointmentProvider } from './context/AppointmentContext.jsx';
import { LoadingProvider, useLoading } from './context/LoadingContext.jsx';

// Features - Admin/Clinic
import Records from './features/admin-clinic/Records.jsx';
import Appointments from './features/admin-clinic/Appointments.jsx';
import { Dashboard } from './features/admin-clinic/Dashboard.jsx';
import Examination from './features/admin-clinic/Examinations.jsx';
import Approvals from './features/admin-clinic/Approvals.jsx';
import Announcements from './features/admin-clinic/Announcements.jsx';
import Consultations from './features/admin-clinic/Consultations.jsx';
import UserManagement from './features/admin-clinic/User-Management.jsx';

// Features - Students
import Meditrack from './features/users/Meditrack.jsx';

// ── Protected route guard ─────────────────────────────────────────────────────
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token   = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');
  const user    = rawUser ? JSON.parse(rawUser) : null;

  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.isProfileSetup === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly) {
    const role = user.role?.toLowerCase().trim() || '';
    // Staff roles that can access Dashboard (clinic/admin functions)
    const isStaffRole = ['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role);
    if (!isStaffRole) {
      console.log(`Access Denied to Dashboard. Role parsed as: "${role}"`);
      return <Navigate to="/student/meditrack" replace />;
    }
  }

  return children;
};

// ── Route ↔ Tab maps ──────────────────────────────────────────────────────────
const ROUTE_TO_TAB = {
  '/dashboard':     'dashboard',
  '/records':       'records',
  '/appointments':  'appointments',
  '/examinations':  'examinations',
  '/approvals':     'approvals',
  '/consultations': 'consultations',
  '/announcements': 'announcements',
  '/users':         'users',
};

const TAB_TO_ROUTE = {
  'dashboard':     '/dashboard',
  'records':       '/records',
  'appointments':  '/appointments',
  'examinations':  '/examinations',
  'approvals':     '/approvals',
  'consultations': '/consultations',
  'announcements': '/announcements',
  'users':         '/users',
};

// ── Admin Layout Wrapper ───────────────────────────────────────────────────────
const AdminLayoutWrapper = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive active tab from the current URL — keeps mobile nav in sync automatically
  const activeTab = ROUTE_TO_TAB[location.pathname] || 'dashboard';

  // Mobile bottom-nav tap → navigate to the corresponding route
  const handleTabChange = (tabId) => {
    const route = TAB_TO_ROUTE[tabId];
    if (route) navigate(route);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          authService.logout();
          navigate('/login');
          return;
        }

        const result = await response.json();
        if (result.success && result.data) {
          setUserProfile(result.data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#466460]"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userName={userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() : 'Admin'}
      userId={userProfile?.universityId || userProfile?.employeeId || ''}
      userProfile={userProfile}
      onLogout={handleLogout}
      activeTab={activeTab}         // ← derived from current URL
      onTabChange={handleTabChange} // ← navigates on mobile tab tap
    >
      {children}
    </DashboardLayout>
  );
};

// ── Onboarding page ───────────────────────────────────────────────────────────
const OnboardingPage = () => {
  const navigate = useNavigate();
  const rawUser  = localStorage.getItem('user');
  const user     = rawUser ? JSON.parse(rawUser) : null;

  if (!user) return <Navigate to="/login" replace />;

  const handleComplete = () => {
    const updatedUser = { ...user, isProfileSetup: true };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    const role = user.role?.toLowerCase().trim() || '';
    // Staff roles that can access Dashboard (clinic/admin functions)
    const isStaffRole = ['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role);
    if (isStaffRole) {
      navigate('/dashboard');
    } else {
      navigate('/student/meditrack');
    }
  };

  return <ProfileSetup user={user} onComplete={handleComplete} />;
};

// ── Route Change Handler ───────────────────────────────────────────────────
function RouteChangeHandler() {
  const location = useLocation();
  const { loading, hideLoading } = useLoading();
  const [prevLocation, setPrevLocation] = useState(location);

  useEffect(() => {
    if (prevLocation !== location) {
      if (loading.show) {
        hideLoading();
      }
      setPrevLocation(location);
    }
  }, [location, prevLocation, loading.show, hideLoading]);

  return null;
}

// ── Global Loading Overlay ───────────────────────────────────────────────────
function GlobalLoading() {
  const { loading } = useLoading();

  if (!loading.show) return null;

  return (
    <Loading
      variant="overlay"
      theme={loading.theme}
      label={loading.message}
      showLabel={true}
    />
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <LoadingProvider>
      <AppointmentProvider>
        <RouteChangeHandler />
        <GlobalLoading />
        <Routes>
          {/* Public */}
          <Route path="/signup"     element={<SignupForm />} />
          <Route path="/login"      element={<LoginForm />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Admin / Clinic */}
          <Route path="/dashboard" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Dashboard /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/records" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Records /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/appointments" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Appointments /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/examinations" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Examination /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/approvals" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Approvals /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/announcements" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Announcements /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/consultations" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><Consultations /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute adminOnly={true}>
              <AdminLayoutWrapper><UserManagement /></AdminLayoutWrapper>
            </ProtectedRoute>
          } />

          {/* Student / Patient */}
          <Route path="/student/meditrack" element={
            <ProtectedRoute adminOnly={false}>
              <Meditrack />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </AppointmentProvider>
    </LoadingProvider>
  );
}

export default App;