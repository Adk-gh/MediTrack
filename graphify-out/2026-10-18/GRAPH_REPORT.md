# Graph Report - MediTrack  (2026-08-04)

## Corpus Check

* 199 files · \~245,599 words
* Verdict: corpus is large enough that graph structure adds value.

## Summary

* 1659 nodes · 2209 edges · 164 communities (116 shown, 48 thin omitted)
* Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 191 edges (avg confidence: 0.5)
* Token cost: 0 input · 0 output

## Graph Freshness

* Built from commit: `28e6439f`
* Run `git rev-parse HEAD` and compare to check if the graph is stale.
* Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

* Records-users.jsx
* auth.controller.js
* Consultations.jsx
* dependencies
* devDependencies
* Profile-users.jsx
* consultations.controller.js
* Reports.jsx
* Records.jsx
* appointments/appointments.service.js
* ProfileSetup.jsx
* Dental.jsx
* User-Management.jsx
* DashboardLayout.jsx
* Appointments.jsx
* Medical.jsx
* Headers.jsx
* App.jsx
* medi\_ocr.py
* AppDelegate
* UserDashboardLayout.jsx
* database.js
* Consultation-users.jsx
* MediTrack SQLite Offline Mode Implementation Guide
* examinations.controller.js
* Settings.jsx
* user.route.js
* dependencies
* authorized.js
* Announcements.jsx
* archive.service.js
* examinations.route.js
* Record-Management.jsx
* services/notifications.service.js
* Meditrack.jsx
* DateTimePicker.jsx
* Dashboard.jsx
* LoginForm.jsx
* homepage-users.jsx
* AuthLayout.jsx
* announcements.route.js
* appointments.route.js
* records.route.js
* auth.routes.js
* index.js
* MediTrack Technology Stack Analysis
* Appointments
* announcements/announcements.service.js
* archives.controller.js
* archives.service.js
* token.service.js
* getProvincesByRegion
* Appointment-users.jsx
* records.controller.js
* Firebase Firestore to Supabase Migration Guide
* app.js
* Records/records.service.js
* loading.jsx
* services/announcements.service.js
* announcements.controller.js
* AppointmentContext.jsx
* services/examinations.service.js
* archiveHelper.js
* TimePicker.jsx
* ExampleInstrumentedTest.java
* @capacitor/filesystem
* token.js
* ExampleUnitTest.java
* gradlew
* AddressModal.jsx
* update-user-passwords.js
* imports
* imports
* BridgeActivity
* cors.js
* announcements.schema.js
* appointments.schema.js
* examinations.schema.js
* records.schema.js
* user.schema.js
* Examinations.jsx
* OcrSettings.jsx
* @capacitor/ios
* @capacitor/android
* date-fns
* MediTrack System Data Flow Documentation
* exceljs
* capacitor.config.ts
* Package.swift
* @capacitor/share
* html2canvas
* @ionic/react
* lucide-react
* MediTrack Archive Function Implementation Plan
* react-router-dom
* vite-plugin-compression
* zod
* index.ts
* db
* Frontend Update Plan - Medical Records JSONB Schema
* Backend Migration Plan: Hybrid Approach
* MediTrack Setup Guide
* Datepicker.jsx
* MediTrack Project Guidelines
* Medical Records Database Cleanup Plan
* Changes Required
* AuditLogs.jsx
* MediTrack - Student Health Record Management System
* Getting Started
* services/records.service.js
* API Endpoints
* Firestore Collections
* docs/CLAUDE.md
* ApprovalManagement.jsx
* ⚙️ Settings Page (Role-Based Access)
* @emotion/react
* Technology Stack
* Features
* CLAUDE.md
* medical\_records\&users table.md
* docs/xtodo.md
* Architecture
* Environment Variables
* Validation
* file-saver
* CapApp-SPM/README.md
* react-chartjs-2
* yup
* xtodo.md
* auth.service.js
* src/supabase.js
* @emotion/styled
* axios
* @mui/material
* react-hook-form
* react-query
* react-toastify
* @supabase/supabase-js

## God Nodes (most connected - your core abstractions)

1. `supabase` - 32 edges
2. `Consultations()` - 21 edges
3. `MediTrack - Student Health Record Management System` - 17 edges
4. `MediTrack System Data Flow Documentation` - 17 edges
5. `Medical()` - 15 edges
6. `ConsultationUsers()` - 15 edges
7. `MediTrack SQLite Offline Mode Implementation Guide` - 15 edges
8. `Firebase Firestore to Supabase Migration Guide` - 15 edges
9. `Reports()` - 14 edges
10. `MediTrack Setup Guide` - 14 edges

## Surprising Connections (you probably didn't know these)

* `forgotPassword()` --calls--> `sendEmail()`  \[EXTRACTED]
  controllers/auth.controller.js → configs/email.js
* `sendVerificationEmail()` --calls--> `sendEmail()`  \[EXTRACTED]
  controllers/auth.controller.js → configs/email.js
* `createConsultation()` --calls--> `sendNotification()`  \[EXTRACTED]
  features/consultations/consultations.controller.js → utils/notifier.js
* `updateConsultation()` --calls--> `sendNotification()`  \[EXTRACTED]
  features/consultations/consultations.controller.js → utils/notifier.js
* `endConsultation()` --calls--> `sendNotification()`  \[EXTRACTED]
  features/consultations/consultations.controller.js → utils/notifier.js

## Import Cycles

* None detected.

## Communities (164 total, 48 thin omitted)

### Community 0 - "Records-users.jsx"

Cohesion: 0.09
Nodes (22): jspdf, DentalExaminationReport(), DentalNotesTextarea, TextInput, DoctorTextarea, MedicalCertificate(), RemarksTextarea, Approvals() (+14 more)

### Community 1 - "auth.controller.js"

Cohesion: 0.06
Nodes (31): nodemailer, sendEmail(), adminResendVerification(), crypto, emailVerificationTokens, forgotPassword(), login(), passwordResetTokens (+23 more)

### Community 2 - "Consultations.jsx"

Cohesion: 0.08
Nodes (41): ConsultationManagement(), formatDate(), SORT\_OPTIONS, STATUS\_OPTIONS, TYPE\_OPTIONS, Consultations(), DentalRecordRow(), fmtDateTime() (+33 more)

### Community 3 - "dependencies"

Cohesion: 0.04
Nodes (47): cors, dotenv, express, form-data, helmet, jest, jest-environment-jsdom, jsonwebtoken (+39 more)

### Community 4 - "devDependencies"

Cohesion: 0.05
Nodes (40): autoprefixer, @capacitor/cli, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, autoprefixer (+32 more)

### Community 5 - "Profile-users.jsx"

Cohesion: 0.06
Nodes (31): ALL\_PROGRAMS, calculateAge(), CIVIL\_STATUSES, classificationColors, CLASSIFICATIONS, DENTAL\_PROCEDURES, DEPARTMENTS, DEPARTMENTS\_DATA (+23 more)

### Community 6 - "consultations.controller.js"

Cohesion: 0.07
Nodes (19): consultationsService, createConsultation(), endConsultation(), getConsultationById(), getMessages(), reactivateConsultation(), sendMessage(), { sendNotification } (+11 more)

### Community 7 - "Reports.jsx"

Cohesion: 0.10
Nodes (17): addDataRow(), addSectionHeader(), addTableHeader(), addTitleBanner(), applyPercentFormat(), DENTAL\_CONDITIONS, getSchoolYear(), IconActivity() (+9 more)

### Community 8 - "Records.jsx"

Cohesion: 0.36
Nodes (5): ExaminationModal(), normalizePatientData(), normalizeUser(), Records(), typeBadgeClass()

### Community 9 - "appointments/appointments.service.js"

Cohesion: 0.07
Nodes (8): appointmentsService, getMyAppointments(), getUserAppointments(), notificationsService, supabase, notificationsService, notificationsService, supabase

### Community 10 - "ProfileSetup.jsx"

Cohesion: 0.11
Nodes (24): buildFullAddress(), calcAge(), CIVIL\_STATUSES, departmentsData, deptAbbrToFull, EMERGENCY\_RELATIONSHIPS, getDefaultClassification(), getDefaultJobTitle() (+16 more)

### Community 11 - "Dental.jsx"

Cohesion: 0.10
Nodes (22): buildDentalForm(), buildDentalHistoryProcedures(), conditionLabel, decidLowerLeft, decidLowerRight, decidUpperLeft, decidUpperRight, Dental() (+14 more)

### Community 12 - "User-Management.jsx"

Cohesion: 0.11
Nodes (21): CLASSIFICATION\_MAP, classificationColors, CLINIC\_ROLES, CreateUserModal(), currentUser, departmentsData, deptAbbrToFull, FACULTY\_ROLES (+13 more)

### Community 13 - "DashboardLayout.jsx"

Cohesion: 0.09
Nodes (8): react, MobileHeader(), ProfileDrawer(), DashboardLayout(), DEFAULT\_MOBILE\_NAV, getStoredUserRole(), ROLE\_MOBILE\_NAV, react

### Community 14 - "Appointments.jsx"

Cohesion: 0.08
Nodes (6): ExaminationModal(), HOUR\_SLOTS, MONTH\_SHORT, MONTHS, normalizePatientData(), WEEKDAYS

### Community 15 - "Medical.jsx"

Cohesion: 0.13
Nodes (18): buildInitialForm(), createDefaultVital(), familyConditions, fetchNurses(), fetchPhysicians(), filterNumbersAndDot(), filterNumbersAndSlash(), filterNumbersOnly() (+10 more)

### Community 16 - "Headers.jsx"

Cohesion: 0.09
Nodes (8): DEFAULT\_MOBILE\_ITEMS, DENTAL\_PROCEDURES, DesktopNav(), getStoredUserRole(), parseJsonIfNeeded(), ROLE\_MOBILE\_NAV\_CONFIG, ROLE\_NAV\_CONFIG, withProfileDefaults()

### Community 17 - "App.jsx"

Cohesion: 0.10
Nodes (18): Approvals, Archives, AuditLogs, Examination, GlobalLoading(), OcrSettings, ProfileSetup, RecordManagement (+10 more)

### Community 18 - "medi\_ocr.py"

Cohesion: 0.15
Nodes (20): after\_request, add\_cors\_headers(), config\_options(), get\_config(), load\_config(), load\_config\_fallback(), ocr\_options(), parse\_id\_fields() (+12 more)

### Community 19 - "AppDelegate"

Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 21 - "database.js"

Cohesion: 0.20
Nodes (8): { createClient }, supabase, { authorized }, express, multer, router, supabase, upload

### Community 22 - "Consultation-users.jsx"

Cohesion: 0.18
Nodes (15): ConsultationUsers(), fetchSenderRoles(), formatDate(), formatTime(), getCachedConsultations(), getCachedMessages(), getCachedPresence(), getGenderIcon() (+7 more)

### Community 23 - "MediTrack SQLite Offline Mode Implementation Guide"

Cohesion: 0.05
Nodes (43): Architecture, Common Issues, File Structure Summary, Goals, Integration Tests, MediTrack SQLite Offline Mode Implementation Guide, Next Steps, Overview (+35 more)

### Community 25 - "Settings.jsx"

Cohesion: 0.18
Nodes (10): BellIcon(), DataIcon(), GeneralIcon(), InfoIcon(), LockIcon(), OCR\_SERVICE\_URL, OcrIcon(), Settings() (+2 more)

### Community 26 - "user.route.js"

Cohesion: 0.14
Nodes (13): { auditLog }, { authorized }, express, multer, {
registerSchema,
loginSchema,
}, router, supabase, upload (+5 more)

### Community 27 - "dependencies"

Cohesion: 0.29
Nodes (7): @capacitor/core, chart.js, dependencies, @capacitor/core, chart.js, react-datepicker, react-datepicker

### Community 28 - "authorized.js"

Cohesion: 0.11
Nodes (19): archivesController, { auditLog }, { authorized }, express, router, { auditLog }, { authorized: authorize }, consultationsController (+11 more)

### Community 29 - "Announcements.jsx"

Cohesion: 0.19
Nodes (13): Announcements(), CATEGORIES, CATEGORY\_COLORS, departmentsData, DEPT\_OPTIONS, EMPTY\_FORM, formatDate(), formatDeptDisplay() (+5 more)

### Community 30 - "archive.service.js"

Cohesion: 0.46
Nodes (7): archiveItem(), getArchives(), getArchiveStats(), getAuthHeaders(), getCurrentUser(), permanentDeleteArchive(), restoreItem()

### Community 31 - "examinations.route.js"

Cohesion: 0.16
Nodes (12): { auditLog }, { authorized }, { createExaminationSchema, updateExaminationSchema }, examinationsController, express, router, validateData, createExaminationSchema (+4 more)

### Community 32 - "Record-Management.jsx"

Cohesion: 0.19
Nodes (14): react-dom, ActionMenu(), EDIT\_STATUS\_OPTIONS, formatDate(), getFullName(), getInitials(), getStatusStyle(), MONTHS (+6 more)

### Community 33 - "services/notifications.service.js"

Cohesion: 0.10
Nodes (19): DesktopHeader(), formatTimeAgo(), getNotificationIcon(), NotificationBell(), NotificationPanel(), formatTimeAgo(), getNotificationIcon(), UserNotificationPanel() (+11 more)

### Community 34 - "Meditrack.jsx"

Cohesion: 0.19
Nodes (6): getSavedTab(), MediTrack(), PERSIST\_TABS, RECORDS, TAG\_ICON, VALID\_TABS

### Community 35 - "DateTimePicker.jsx"

Cohesion: 0.21
Nodes (10): ALL\_YEARS, AMPM, buildDays(), DateTimePicker(), getDaysInMonth(), HOURS\_12, MINUTES, MONTH\_FULL (+2 more)

### Community 36 - "Dashboard.jsx"

Cohesion: 0.21
Nodes (8): useAppointments(), DashboardContent(), getAuthHeaders(), isClinicStaff(), MONTHS, normaliseRole(), RECORD\_COLORS, TYPE\_COLORS

### Community 37 - "LoginForm.jsx"

Cohesion: 0.20
Nodes (8): createAnnouncementSchema, createAppointmentSchema, createRecordSchema, examinationSchema, loginSchema, profileSetupSchema, registerSchema, vaccinationRecordSchema

### Community 38 - "homepage-users.jsx"

Cohesion: 0.17
Nodes (13): Dashboard(), AnnouncementCard(), AnnouncementModal(), CATEGORY\_COLORS, formatApptTime(), formatDate(), HEALTH\_TIPS, HomePageUsers() (+5 more)

### Community 39 - "AuthLayout.jsx"

Cohesion: 0.36
Nodes (4): ForgotPassword(), ResetPassword(), VerifyEmail(), AuthLayout()

### Community 40 - "announcements.route.js"

Cohesion: 0.20
Nodes (10): announcementsController, { auditLog }, { authorized }, { createAnnouncementSchema, updateAnnouncementSchema }, express, router, validateData, createAnnouncementSchema (+2 more)

### Community 41 - "appointments.route.js"

Cohesion: 0.20
Nodes (10): appointmentsController, { auditLog }, { authorized }, { createAppointmentSchema, updateAppointmentSchema }, express, router, validateData, createAppointmentSchema (+2 more)

### Community 42 - "records.route.js"

Cohesion: 0.18
Nodes (8): { authorized }, { createRecordSchema, updateRecordSchema }, express, recordsController, router, validateData, createRecordSchema, { z }

### Community 43 - "auth.routes.js"

Cohesion: 0.17
Nodes (9): multer, storage, upload, { auditLog }, authController, express, router, supabase (+1 more)

### Community 44 - "index.js"

Cohesion: 0.17
Nodes (11): announcementsRoutes, appointmentsRoutes, archivesRoutes, authRoutes, consultationsRoutes, examinationsRoutes, express, notificationsRoutes (+3 more)

### Community 45 - "MediTrack Technology Stack Analysis"

Cohesion: 0.22
Nodes (8): 1️⃣  Project Overview, 2️⃣  Backend (Node.js + Express), 3️⃣  Frontend (React + Vite + Ionic), 4️⃣  OCR Service (Python Flask), 5️⃣  Recommendations Overview, MediTrack Technology Stack Analysis, Missing / Can‑Optional Packages, Missing / Can‑Optional Packages

### Community 46 - "Appointments"

Cohesion: 0.18
Nodes (11): Appointments(), IconBuilding(), IconCalendar(), IconCircleCheck(), IconClock(), IconGraduationCap(), IconIdCard(), IconStethoscope() (+3 more)

### Community 47 - "announcements/announcements.service.js"

Cohesion: 0.29
Nodes (7): announcementsCache, archiveHelper, clearCache(), createAnnouncement(), supabase, updateAnnouncement(), uploadImageToStorage()

### Community 48 - "archives.controller.js"

Cohesion: 0.22
Nodes (3): archiveItem(), archivesService, moveToArchives()

### Community 49 - "archives.service.js"

Cohesion: 0.14
Nodes (5): { createClient }, supabase, ARCHIVE\_TYPES, supabase, supabaseAuth

### Community 50 - "token.service.js"

Cohesion: 0.23
Nodes (10): AdminLayoutWrapper(), App(), root, logout(), ensureValidToken(), getAuthHeaders(), getValidToken(), isTokenExpired() (+2 more)

### Community 51 - "getProvincesByRegion"

Cohesion: 0.67
Nodes (3): getCitiesByProvince(), getProvincesByRegion(), PHILIPPINES\_REGIONS

### Community 52 - "Appointment-users.jsx"

Cohesion: 0.27
Nodes (7): AppointmentUsers(), HOUR\_SLOTS, MONTHS, PURPOSES, STATUS\_STYLES, useCurrentPatient(), usePullToRefresh()

### Community 53 - "records.controller.js"

Cohesion: 0.22
Nodes (3): autoArchiveRecords(), recordsService, autoArchiveOldRecords()

### Community 54 - "Firebase Firestore to Supabase Migration Guide"

Cohesion: 0.06
Nodes (35): 10. Frontend Migration Checklist (Updated 2026-05-28), 11. Supabase Realtime Setup, 12. Storage Bucket Setup, 1. Data Model Analysis, 2.1 Users Table, 2.2 Appointments Table, 2.3 Examinations Table (Legacy), 2.3b Medical Records Table (+27 more)

### Community 55 - "app.js"

Cohesion: 0.22
Nodes (7): app, cors, express, globalErr, helmet, routes, server

### Community 56 - "Records/records.service.js"

Cohesion: 0.25
Nodes (3): archiveHelper, notificationsService, supabase

### Community 58 - "services/announcements.service.js"

Cohesion: 0.43
Nodes (6): announcementsCache, clearAnnouncementsCache(), createAnnouncement(), deleteAnnouncement(), updateAnnouncement(), uploadImageToStorage()

### Community 60 - "AppointmentContext.jsx"

Cohesion: 0.43
Nodes (5): AppointmentContext, AppointmentProvider(), mapRow(), readCache(), writeCache()

### Community 61 - "services/examinations.service.js"

Cohesion: 0.43
Nodes (4): deleteExamination(), getAllExaminations(), getAuthHeaders(), getExaminationById()

### Community 62 - "archiveHelper.js"

Cohesion: 0.33
Nodes (5): deleteAnnouncement(), archiveAndDelete(), archivesController, deleteConsultation(), deleteRecord()

### Community 63 - "TimePicker.jsx"

Cohesion: 0.33
Nodes (3): AMPM, HOURS\_12, MINUTES

### Community 64 - "ExampleInstrumentedTest.java"

Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 68 - "gradlew"

Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 69 - "AddressModal.jsx"

Cohesion: 0.50
Nodes (3): AddressModal(), COUNTRIES, GENERIC\_BARANGAYS

### Community 71 - "imports"

Cohesion: 0.50
Nodes (3): imports, std/http/server, @supabase/supabase-js

### Community 72 - "imports"

Cohesion: 0.50
Nodes (3): imports, <https://deno.land/std@0.168.0/http/server.ts>, @supabase/supabase-js

### Community 85 - "MediTrack System Data Flow Documentation"

Cohesion: 0.06
Nodes (35): 1. User Registration (SignupForm.jsx), 2. User Login (LoginForm.jsx), Admin/Clinic Layout (DashboardLayout.jsx), Admin Dashboard Flow, Admin Records View (Records.jsx), Application Routing Flow, Appointment System Flow, Authentication Flow (+27 more)

### Community 93 - "MediTrack Archive Function Implementation Plan"

Cohesion: 0.07
Nodes (26): 1.1 Add Archive API Endpoints (if not fully exposed), 1.2 Create Archive Helper Utility, 2.1 Create Archive Service, 3.1 Announcements Page, 3.2 Appointments Page, 3.3 Consultations Page, 3.4 Records Page, 3.5 User Management Page (+18 more)

### Community 118 - "Frontend Update Plan - Medical Records JSONB Schema"

Cohesion: 0.08
Nodes (25): 1. Medical.jsx ✅ IN PROGRESS, 2. Records.jsx, 3. Approvals.jsx, 4. ApprovalManagement.jsx, 5. Records-users.jsx, 6. Archives.jsx, 7. Record-Management.jsx, 8. Dashboard.jsx (+17 more)

### Community 119 - "Backend Migration Plan: Hybrid Approach"

Cohesion: 0.08
Nodes (23): Backend Implementation, Backend Migration Plan: Hybrid Approach, Backend Tests (Postman/cURL), Frontend Implementation, Frontend Tests (Browser), Hybrid Architecture, Implementation Steps, Overview (+15 more)

### Community 120 - "MediTrack Setup Guide"

Cohesion: 0.08
Nodes (23): Additional Resources, Android, Common Issues, iOS, MediTrack Setup Guide, Mobile App Setup (Optional), Option A: Using Existing Environment Variables, Option A: Using Virtual Environment (Recommended) (+15 more)

### Community 121 - "Datepicker.jsx"

Cohesion: 0.12
Nodes (24): ALL\_YEARS, buildDays(), DatePicker(), getDaysInMonth(), MONTH\_FULL, MONTHS, parseDateValue(), AppointmentManagement() (+16 more)

### Community 122 - "MediTrack Project Guidelines"

Cohesion: 0.11
Nodes (17): API Endpoints, Architecture, Authentication Flow, Backend (port 5000), Backend Structure, Commands, Environment Variables (.env), Frontend (port 3000) (+9 more)

### Community 123 - "Medical Records Database Cleanup Plan"

Cohesion: 0.13
Nodes (14): Benefits:, Columns to REMOVE (move to JSONB):, COVID Vaccine Columns to MERGE:, Current Problem, Frontend Updates Required, Medical.jsx - Update formData structure:, Medical Records Database Cleanup Plan, Migration Steps (+6 more)

### Community 124 - "Changes Required"

Cohesion: 0.14
Nodes (13): 1. Classification Dropdowns (CLASSIFICATIONS array), 2. Role-based Configuration (ROLE\_NAV\_CONFIG, ROLE\_MOBILE\_NAV\_CONFIG), 3. ProtectedRoute and Role Checks, 4. Display Labels, 5. ProfileSetup.jsx - Classification Mapping, 6. User-Management.jsx - Stats and Dropdowns, 7. Headers.jsx - Default Display, Changes Required (+5 more)

### Community 127 - "AuditLogs.jsx"

Cohesion: 0.31
Nodes (7): ACTION\_COLORS, ActionPill(), ACTIVITY\_TYPES, AuditLogs(), formatDate(), getActionStyle(), getInitials()

### Community 128 - "MediTrack - Student Health Record Management System"

Cohesion: 0.22
Nodes (9): Contributing, Frontend Services, License, MediTrack - Student Health Record Management System, Overview, Project Structure, Support, Table of Contents (+1 more)

### Community 129 - "Getting Started"

Cohesion: 0.25
Nodes (8): 1. Clone the Repository, 2. Backend Setup, 3. OCR Service Setup (Windows), 4. Frontend Setup, 5. Build for Desktop (Electron), 6. Build for Mobile (Capacitor), Getting Started, Prerequisites

### Community 130 - "services/records.service.js"

Cohesion: 0.52
Nodes (6): createRecord(), deleteRecord(), getAllRecords(), getAuthHeaders(), getRecordById(), updateRecord()

### Community 131 - "API Endpoints"

Cohesion: 0.29
Nodes (7): Announcements, API Endpoints, Appointments, Authentication, Examinations, Health Records, OCR Service

### Community 132 - "Firestore Collections"

Cohesion: 0.29
Nodes (7): announcements, appointments, Database Schema, examinations, Firestore Collections, records, users

### Community 133 - "docs/CLAUDE.md"

Cohesion: 0.33
Nodes (4): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution

### Community 134 - "ApprovalManagement.jsx"

Cohesion: 0.40
Nodes (5): ApprovalManagement(), formatDate(), SORT\_OPTIONS, STATUS\_OPTIONS, TYPE\_OPTIONS

### Community 135 - "⚙️ Settings Page (Role-Based Access)"

Cohesion: 0.40
Nodes (4): 🔒 Admin-Only Sections, ⚙️ Settings Page (Role-Based Access), 👩‍💻 Staff/Registrar Sections, 🎓 Student Sections

### Community 137 - "Technology Stack"

Cohesion: 0.40
Nodes (5): Backend, Development Tools, Frontend, OCR Service, Technology Stack

### Community 138 - "Features"

Cohesion: 0.50
Nodes (4): Admin Features (Dashboard), Features, Mobile Features (Meditrack), User Features

### Community 143 - "Architecture"

Cohesion: 0.67
Nodes (3): Architecture, Authentication Flow, System Flow

### Community 144 - "Environment Variables"

Cohesion: 0.67
Nodes (3): Backend (.env), Environment Variables, Frontend (.env)

### Community 145 - "Validation"

Cohesion: 0.67
Nodes (3): Backend Validation Schemas, Frontend Validation Schemas, Validation

### Community 152 - "auth.service.js"

Cohesion: 0.18
Nodes (11): DEFAULT\_STEPS, LoadingAnimation(), LoginForm(), SignupForm(), validateEmailWithEasyEmail(), checkIdExists(), getAuthHeaders(), getProfile() (+3 more)

### Community 153 - "src/supabase.js"

Cohesion: 0.18
Nodes (3): UserNotificationBell(), ARCHIVE\_TYPE\_LABELS, supabase

## Knowledge Gaps

* **655 isolated node(s):** `express`, `globalErr`, `routes`, `cors`, `helmet` (+650 more)
  These have ≤1 connection - possible missing edges or undocumented components.
* **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

* **Why does** **`dependencies`** **connect** **`dependencies`** **to** **`Records-users.jsx`,** **`devDependencies`,** **`@emotion/react`,** **`DashboardLayout.jsx`,** **`file-saver`,** **`react-chartjs-2`,** **`yup`,** **`@emotion/styled`,** **`axios`,** **`@mui/material`,** **`react-hook-form`,** **`react-query`,** **`react-toastify`,** **`Record-Management.jsx`,** **`@supabase/supabase-js`,** **`@capacitor/filesystem`,** **`@capacitor/ios`,** **`@capacitor/android`,** **`date-fns`,** **`exceljs`,** **`@capacitor/share`,** **`html2canvas`,** **`@ionic/react`,** **`lucide-react`,** **`react-router-dom`,** **`vite-plugin-compression`,** **`zod`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
* **Why does** **`supabase`** **connect** **`src/supabase.js`** **to** **`Records-users.jsx`,** **`Consultations.jsx`,** **`Profile-users.jsx`,** **`ApprovalManagement.jsx`,** **`Records.jsx`,** **`Dental.jsx`,** **`User-Management.jsx`,** **`Appointments.jsx`,** **`Medical.jsx`,** **`Headers.jsx`,** **`UserDashboardLayout.jsx`,** **`Consultation-users.jsx`,** **`auth.service.js`,** **`Announcements.jsx`,** **`Record-Management.jsx`,** **`services/notifications.service.js`,** **`homepage-users.jsx`,** **`token.service.js`,** **`Appointment-users.jsx`,** **`services/announcements.service.js`,** **`AppointmentContext.jsx`,** **`Examinations.jsx`,** **`Datepicker.jsx`,** **`AuditLogs.jsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
* **Why does** **`react`** **connect** **`DashboardLayout.jsx`** **to** **`Consultations.jsx`,** **`dependencies`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
* **What connects** **`express`,** **`globalErr`,** **`routes`** **to the rest of the system?**
  _655 weakly-connected nodes found - possible documentation gaps or missing edges._
* **Should** **`Records-users.jsx`** **be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
* **Should** **`auth.controller.js`** **be split into smaller, more focused modules?**
  _Cohesion score 0.06086956521739131 - nodes in this community are weakly interconnected._
* **Should** **`Consultations.jsx`** **be split into smaller, more focused modules?**
  _Cohesion score 0.08156028368794327 - nodes in this community are weakly interconnected._

