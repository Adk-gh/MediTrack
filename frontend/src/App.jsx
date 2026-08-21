// frontend/src/App.jsx

import React, {
  useEffect,
  useState,
  Suspense,
  lazy,
  useRef,
} from "react";

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  App as CapacitorApp,
} from "@capacitor/app";

import Loading from "./components/loading.jsx";

import authService from "./services/auth.service.js";

import {
  startTokenRefresh,
} from "./services/token.service.js";

import "./index.css";


// ─────────────────────────────────────────────────────────────
// SHARED CONTEXT
// ─────────────────────────────────────────────────────────────

import {
  AppointmentProvider,
} from "./context/AppointmentContext.jsx";

import {
  LoadingProvider,
  useLoading,
} from "./context/LoadingContext.jsx";


// ─────────────────────────────────────────────────────────────
// COMMON PAGES
// ─────────────────────────────────────────────────────────────

import LoginForm from "./features/LoginForm.jsx";

import ForgotPassword from "./features/ForgotPassword.jsx";

import ResetPassword from "./features/ResetPassword.jsx";

import VerifyEmail from "./features/VerifyEmail.jsx";

import {
  DashboardLayout,
} from "./layouts/DashboardLayout.jsx";

import Records from "./features/admin-clinic/Records.jsx";

import Appointments from "./features/admin-clinic/Appointments.jsx";

import {
  Dashboard,
} from "./features/admin-clinic/Dashboard.jsx";

import Announcements from "./features/admin-clinic/Announcements.jsx";

import Consultations from "./features/admin-clinic/Consultations.jsx";

import ConsultationManagement from "./features/admin-clinic/ConsultationManagement.jsx";

import AppointmentManagement from "./features/admin-clinic/AppointmentManagement.jsx";

import ApprovalManagement from "./features/admin-clinic/ApprovalManagement.jsx";

import Meditrack from "./features/users/Meditrack.jsx";


// ─────────────────────────────────────────────────────────────
// LAZY LOADED PAGES
// ─────────────────────────────────────────────────────────────

const SignupForm =
  lazy(() =>
    import("./features/SignupForm.jsx")
  );

const ProfileSetup =
  lazy(() =>
    import("./components/ProfileSetup.jsx")
  );

const Examination =
  lazy(() =>
    import("./features/admin-clinic/Examinations.jsx")
  );

const Approvals =
  lazy(() =>
    import("./features/admin-clinic/Approvals.jsx")
  );

const UserManagement =
  lazy(() =>
    import("./features/admin-clinic/User-Management.jsx")
  );

const RecordManagement =
  lazy(() =>
    import("./features/admin-clinic/Record-Management.jsx")
  );

const NotificationsManagement =
  lazy(() =>
    import(
      "./features/admin-clinic/NotificationsManagement.jsx"
    )
  );

const AuditLogs =
  lazy(() =>
    import("./features/admin-clinic/AuditLogs.jsx")
  );

const OcrSettings =
  lazy(() =>
    import("./features/admin-clinic/OcrSettings.jsx")
  );

const Reports =
  lazy(() =>
    import("./features/admin-clinic/Reports.jsx")
  );

const Archives =
  lazy(() =>
    import("./features/admin-clinic/Archives.jsx")
  );

const Settings =
  lazy(() =>
    import("./components/Settings")
  );


// ─────────────────────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────────────────────

const PageLoader = () => (

  <div className="flex items-center justify-center min-h-[200px]">

    <div className="w-8 h-8 border-3 border-[#466460] border-t-transparent rounded-full animate-spin" />

  </div>

);


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";


// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTE GUARD
// ─────────────────────────────────────────────────────────────

const ProtectedRoute = ({
  children,
  adminOnly = false,
  allowedRoles = [],
}) => {

  const token =
    localStorage.getItem("token");

  const user =
    JSON.parse(
      localStorage.getItem("user") ||
      "null"
    );


  if (!token || !user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  if (
    user.isProfileSetup === false
  ) {

    return (
      <Navigate
        to="/onboarding"
        replace
      />
    );

  }


  // ─────────────────────────────────────────
  // ADMIN CHECK
  // ─────────────────────────────────────────

  if (adminOnly) {

    const role =
      user.role
        ?.toLowerCase()
        .trim() || "";


    const isStaffRole = [
      "nurse",
      "doctor",
      "dentist",
      "sysadmin",
    ].includes(role);


    if (!isStaffRole) {

      console.log(
        `[ProtectedRoute] Access Denied to Dashboard. Role parsed as: "${role}"`
      );


      return (
        <Navigate
          to="/student/meditrack"
          replace
        />
      );

    }

  }


  // ─────────────────────────────────────────
  // ROLE-BASED ACCESS
  // ─────────────────────────────────────────

  if (
    allowedRoles.length > 0
  ) {

    const role =
      user.role
        ?.toLowerCase()
        .trim() || "";


    const classification =
      user.classification
        ?.toLowerCase() || "";


    const jobTitle =
      user.job_title
        ?.toLowerCase() || "";


    let effectiveRole =
      role;


    if (
      !effectiveRole ||
      effectiveRole === "student"
    ) {

      if (
        classification === "dentist" ||
        jobTitle.includes("dentist")
      ) {

        effectiveRole =
          "dentist";

      } else if (
        classification === "doctor" ||
        jobTitle.includes("doctor")
      ) {

        effectiveRole =
          "doctor";

      } else if (
        classification === "nurse" ||
        jobTitle.includes("nurse")
      ) {

        effectiveRole =
          "nurse";

      } else if (
        classification ===
          "system administrator" ||
        role === "sysadmin"
      ) {

        effectiveRole =
          "sysadmin";

      }

    }


    if (
      !allowedRoles.includes(
        effectiveRole
      )
    ) {

      console.log(
        `[ProtectedRoute] Access Denied. User role: "${effectiveRole}", Required roles: ${allowedRoles.join(", ")}`
      );


      if (
        effectiveRole === "dentist"
      ) {

        return (
          <Navigate
            to="/examinations"
            replace
          />
        );

      }


      if (
        effectiveRole === "doctor" ||
        effectiveRole === "nurse"
      ) {

        return (
          <Navigate
            to="/approvals"
            replace
          />
        );

      }


      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );

    }

  }


  return children;
};


// ─────────────────────────────────────────────────────────────
// ROUTE ↔ TAB MAP
// ─────────────────────────────────────────────────────────────

const ROUTE_TO_TAB = {

  "/dashboard":
    "dashboard",

  "/records":
    "records",

  "/record-management":
    "recordManagement",

  "/notifications-management":
    "notificationsManagement",

  "/audit-logs":
    "auditLogs",

  "/appointments":
    "appointments",

  "/examinations":
    "examinations",

  "/approvals":
    "approvals",

  "/consultations":
    "consultations",

  "/consultation-management":
    "consultationManagement",

  "/appointment-management":
    "appointmentManagement",

  "/approval-management":
    "approvalManagement",

  "/announcements":
    "announcements",

  "/users":
    "users",

  "/ocr-settings":
    "ocrSettings",

  "/reports":
    "reports",

  "/archives":
    "archives",

};


const TAB_TO_ROUTE =
  Object.fromEntries(
    Object.entries(
      ROUTE_TO_TAB
    ).map(
      ([route, tab]) => [
        tab,
        route,
      ]
    )
  );


// ─────────────────────────────────────────────────────────────
// ADMIN ANDROID BACK BUTTON
// ─────────────────────────────────────────────────────────────
//
// IMPORTANT:
//
// MediTrack student tabs are handled INSIDE MediTrack.jsx.
//
// Therefore this handler deliberately ignores:
//
// /student/meditrack
//
// ─────────────────────────────────────────────────────────────

function AndroidBackButtonHandler() {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const currentPathRef =
    useRef(
      location.pathname
    );


  const handlingBackRef =
    useRef(false);


  // Keep current route synchronized
  useEffect(() => {

    currentPathRef.current =
      location.pathname;

  }, [
    location.pathname,
  ]);


  useEffect(() => {

    let listener = null;


    const setupBackButton =
      async () => {

        try {

          listener =
            await CapacitorApp.addListener(
              "backButton",
              ({ canGoBack }) => {

                if (
                  handlingBackRef.current
                ) {
                  return;
                }


                const currentPath =
                  currentPathRef.current;


                // ─────────────────────────
                // STUDENT ROUTE
                // ─────────────────────────
                //
                // MediTrack.jsx owns this.
                //
                if (
                  currentPath ===
                  "/student/meditrack"
                ) {

                  console.log(
                    "[App Back] Student route detected - MediTrack handles Back."
                  );

                  return;

                }


                handlingBackRef.current =
                  true;


                console.log(
                  "[App Back] Current route:",
                  currentPath
                );


                // ─────────────────────────
                // ADMIN DASHBOARD
                // ─────────────────────────
                //
                // Dashboard is the admin root.
                //
                if (
                  currentPath ===
                  "/dashboard"
                ) {

                  console.log(
                    "[App Back] Dashboard → Exit app"
                  );


                  CapacitorApp.exitApp();


                  handlingBackRef.current =
                    false;


                  return;

                }


                // ─────────────────────────
                // OTHER ROUTES
                // ─────────────────────────

                if (canGoBack) {

                  console.log(
                    "[App Back] Going to previous route"
                  );


                  navigate(-1);

                } else {

                  console.log(
                    "[App Back] No previous route → Exit app"
                  );


                  CapacitorApp.exitApp();

                }


                setTimeout(() => {

                  handlingBackRef.current =
                    false;

                }, 300);

              }
            );


          console.log(
            "[App Back] Listener registered successfully"
          );

        } catch (error) {

          console.error(
            "[App Back] Failed to register listener:",
            error
          );

        }

      };


    setupBackButton();


    return () => {

      if (listener) {

        listener.remove();

        listener = null;

      }

    };

  }, [
    navigate,
  ]);


  return null;
}


// ─────────────────────────────────────────────────────────────
// ADMIN LAYOUT WRAPPER
// ─────────────────────────────────────────────────────────────

const AdminLayoutWrapper = ({
  children,
}) => {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const [
    userProfile,
    setUserProfile,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const activeTab =
    ROUTE_TO_TAB[
      location.pathname
    ] || "dashboard";


  const handleTabChange =
    (tabId) => {

      const route =
        TAB_TO_ROUTE[tabId];


      if (route) {
        navigate(route);
      }

    };


  useEffect(() => {

    const fetchProfile =
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );


          if (!token) {

            navigate(
              "/login"
            );

            return;

          }


          const response =
            await fetch(
              `${API_URL}/user/profile`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );


          if (
            response.status === 401
          ) {

            authService.logout();

            navigate(
              "/login"
            );

            return;

          }


          const result =
            await response.json();


          if (
            result.success &&
            result.data
          ) {

            setUserProfile(
              result.data
            );

          }

        } catch (err) {

          console.error(
            "Error fetching profile:",
            err
          );

        } finally {

          setLoading(false);

        }

      };


    fetchProfile();

  }, [
    navigate,
  ]);


  const handleLogout =
    () => {

      authService.logout();

      navigate(
        "/login"
      );

    };


  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#466460]" />

      </div>

    );

  }


  return (

    <DashboardLayout

      userName={
        userProfile
          ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
          : "Admin"
      }

      userId={
        userProfile?.universityId ||
        userProfile?.employeeId ||
        ""
      }

      userProfile={
        userProfile
      }

      onLogout={
        handleLogout
      }

      activeTab={
        activeTab
      }

      onTabChange={
        handleTabChange
      }

    >

      {children}

    </DashboardLayout>

  );

};


// ─────────────────────────────────────────────────────────────
// ONBOARDING PAGE
// ─────────────────────────────────────────────────────────────

const OnboardingPage = () => {

  const navigate =
    useNavigate();


  const user =
    JSON.parse(
      localStorage.getItem(
        "user"
      ) || "null"
    );


  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  const handleComplete =
    () => {

      const updatedUser = {
        ...user,
        isProfileSetup: true,
      };


      localStorage.setItem(
        "user",
        JSON.stringify(
          updatedUser
        )
      );


      const role =
        user.role
          ?.toLowerCase()
          .trim() || "";


      const isStaffRole = [
        "nurse",
        "doctor",
        "dentist",
        "sysadmin",
      ].includes(role);


      navigate(
        isStaffRole
          ? "/dashboard"
          : "/student/meditrack"
      );

    };


  return (
    <ProfileSetup
      user={user}
      onComplete={
        handleComplete
      }
    />
  );

};


// ─────────────────────────────────────────────────────────────
// ROUTE CHANGE HANDLER
// ─────────────────────────────────────────────────────────────

function RouteChangeHandler() {

  const location =
    useLocation();


  const {
    loading,
    hideLoading,
  } = useLoading();


  const [
    prevLocation,
    setPrevLocation,
  ] = useState(
    location
  );


  useEffect(() => {

    if (
      prevLocation !== location
    ) {

      if (
        loading.show
      ) {

        hideLoading();

      }


      setPrevLocation(
        location
      );

    }

  }, [
    location,
    prevLocation,
    loading.show,
    hideLoading,
  ]);


  return null;
}


// ─────────────────────────────────────────────────────────────
// GLOBAL LOADING
// ─────────────────────────────────────────────────────────────

function GlobalLoading() {

  const {
    loading,
  } = useLoading();


  if (!loading.show) {
    return null;
  }


  return (

    <Loading
      variant="overlay"
      theme={loading.theme}
      label={loading.message}
      showLabel={true}
    />

  );

}


// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────

function App() {

  // Start token refresh when already logged in.
  useEffect(() => {

    const token =
      localStorage.getItem(
        "token"
      );


    const user =
      localStorage.getItem(
        "user"
      );


    if (
      token &&
      user
    ) {

      console.log(
        "[App] User already logged in, starting token refresh..."
      );


      startTokenRefresh();

    }

  }, []);


  // ─────────────────────────────────────────
  // ADMIN ROUTE HELPER
  // ─────────────────────────────────────────

  const AdminRoute = ({
    children,
    allowedRoles = [],
  }) => (

    <ProtectedRoute
      adminOnly={true}
      allowedRoles={
        allowedRoles
      }
    >

      <AdminLayoutWrapper>

        {children}

      </AdminLayoutWrapper>

    </ProtectedRoute>

  );


  return (

    <LoadingProvider>

      <AppointmentProvider>

        {/*
          IMPORTANT:
          This handles only actual application routes.
          MediTrack.jsx handles its own internal tabs.
        */}

        <AndroidBackButtonHandler />

        <RouteChangeHandler />

        <GlobalLoading />

        <Suspense
          fallback={
            <PageLoader />
          }
        >

          <Routes>

            {/* ─────────────────────────
                PUBLIC
            ───────────────────────── */}

            <Route
              path="/signup"
              element={
                <SignupForm />
              }
            />

            <Route
              path="/login"
              element={
                <LoginForm />
              }
            />

            <Route
              path="/forgot-password"
              element={
                <ForgotPassword />
              }
            />

            <Route
              path="/reset-password"
              element={
                <ResetPassword />
              }
            />

            <Route
              path="/verify-email"
              element={
                <VerifyEmail />
              }
            />

            <Route
              path="/onboarding"
              element={
                <OnboardingPage />
              }
            />


            {/* ─────────────────────────
                ADMIN / CLINIC
            ───────────────────────── */}

            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />

            <Route
              path="/records"
              element={
                <AdminRoute>
                  <Records />
                </AdminRoute>
              }
            />

            <Route
              path="/record-management"
              element={
                <AdminRoute>
                  <RecordManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/notifications-management"
              element={
                <AdminRoute>
                  <NotificationsManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/audit-logs"
              element={
                <AdminRoute>
                  <AuditLogs />
                </AdminRoute>
              }
            />

            <Route
              path="/appointments"
              element={
                <AdminRoute>
                  <Appointments />
                </AdminRoute>
              }
            />

            <Route
              path="/announcements"
              element={
                <AdminRoute>
                  <Announcements />
                </AdminRoute>
              }
            />

            <Route
              path="/consultations"
              element={
                <AdminRoute>
                  <Consultations />
                </AdminRoute>
              }
            />

            <Route
              path="/consultation-management"
              element={
                <AdminRoute>
                  <ConsultationManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/appointment-management"
              element={
                <AdminRoute>
                  <AppointmentManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/approval-management"
              element={
                <AdminRoute>
                  <ApprovalManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />

            <Route
              path="/ocr-settings"
              element={
                <AdminRoute>
                  <OcrSettings />
                </AdminRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />

            <Route
              path="/archives"
              element={
                <AdminRoute>
                  <Archives />
                </AdminRoute>
              }
            />


            {/* ─────────────────────────
                ROLE-RESTRICTED ADMIN
            ───────────────────────── */}

            <Route
              path="/examinations"
              element={
                <AdminRoute
                  allowedRoles={[
                    "sysadmin",
                    "doctor",
                    "nurse",
                    "dentist",
                  ]}
                >
                  <Examination />
                </AdminRoute>
              }
            />

            <Route
              path="/approvals"
              element={
                <AdminRoute
                  allowedRoles={[
                    "sysadmin",
                    "doctor",
                    "nurse",
                    "dentist",
                  ]}
                >
                  <Approvals />
                </AdminRoute>
              }
            />


            {/* ─────────────────────────
                STUDENT / PATIENT
            ───────────────────────── */}

            <Route
              path="/student/meditrack"
              element={
                <ProtectedRoute>
                  <Meditrack />
                </ProtectedRoute>
              }
            />


            {/* ─────────────────────────
                SETTINGS
            ───────────────────────── */}

            <Route
              path="/student/settings"
              element={
                <ProtectedRoute>

                  <Settings
                    userRole={
                      JSON.parse(
                        localStorage.getItem(
                          "user"
                        )
                      )?.role ||
                      "student"
                    }

                    onLogout={() =>
                      authService.logout()
                    }
                  />

                </ProtectedRoute>
              }
            />


            {/* ─────────────────────────
                FALLBACK
            ───────────────────────── */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/login"
                  replace
                />
              }
            />

          </Routes>

        </Suspense>

      </AppointmentProvider>

    </LoadingProvider>

  );

}


export default App;