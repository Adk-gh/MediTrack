# Graph Report - MediTrack  (2026-10-18)

## Corpus Check
- 230 files · ~656,451 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2476 nodes · 3907 edges · 207 communities (142 shown, 65 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e59129a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Approvals.jsx
- user.service.js
- Consultations.jsx
- package.json
- devDependencies
- Profile-users.jsx
- consultations.controller.js
- Reports.jsx
- auditLogger.js
- appointments/appointments.service.js
- User-Management.jsx
- Dental.jsx
- systemConfig.jsx
- DashboardLayout.jsx
- Appointments.jsx
- Medical.jsx
- Headers.jsx
- App.jsx
- medi_ocr.py
- AppDelegate
- UserDashboardLayout.jsx
- database.js
- Consultation-users.jsx
- MediTrack SQLite Offline Mode Implementation Guide
- examinations.controller.js
- Settings.jsx
- user.route.js
- @capacitor/core
- archives.route.js
- Announcements.jsx
- storageManager.jsx
- examinations.route.js
- Record-Management.jsx
- Notifications.jsx
- Meditrack.jsx
- storageRoutes.js
- Dashboard.jsx
- LoginForm.jsx
- Homepage-users.jsx
- ResetPassword.jsx
- announcements.route.js
- appointments.route.js
- records.route.js
- auth.routes.js
- routes/index.js
- MediTrack Technology Stack Analysis (Updated)
- Appointments
- announcements/announcements.service.js
- archives.service.js
- parseRecordJson
- UserPreferencesContext.jsx
- Records-users.jsx
- Appointment-users.jsx
- Records/records.service.js
- Firebase Firestore to Supabase Migration Guide
- app.js
- systemConfig.service.js
- loading.jsx
- services/announcements.service.js
- UniversityIdImport.jsx
- AppointmentContext.jsx
- AppointmentManagement.jsx
- services/consultations.service.js
- TimePicker.jsx
- ExampleInstrumentedTest.java
- @capacitor/filesystem
- token.js
- ExampleUnitTest.java
- gradlew
- dependencies
- update-user-passwords.js
- imports
- imports
- MainActivity
- scripts
- announcements.schema.js
- appointments.schema.js
- examinations.schema.js
- records.schema.js
- user.schema.js
- ConsultationManagement.jsx
- OcrSettings.jsx
- @capacitor/ios
- @capacitor/android
- date-fns
- MediTrack System Data Flow Documentation
- exceljs
- capacitor.config.ts
- Package.swift
- @capacitor/share
- html2canvas
- @ionic/react
- lucide-react
- MediTrack Archive Function Implementation Plan
- react-router-dom
- dependencies
- zod
- index.ts
- getSystemConfig
- supportSettings.jsx
- NotificationsManagement.jsx
- build
- auth.service.js
- db
- Frontend Update Plan - Medical Records JSONB Schema
- Backend Migration Plan: Hybrid Approach
- MediTrack Setup Guide
- services/appointments.service.js
- MediTrack Project Guidelines
- Medical Records Database Cleanup Plan
- Changes Required
- AuditLogs.jsx
- MediTrack - Student Health Record Management System
- Getting Started
- generalSettings.jsx
- API Endpoints
- Firestore Collections
- MediTrack Project Guidelines
- services/notifications.service.js
- ⚙️ Settings Page (Role-Based Access)
- @emotion/react
- Technology Stack
- Features
- CLAUDE.md
- medical_records&users table.md
- docs/xtodo.md
- Architecture
- Environment Variables
- Validation
- webhook.controller.js
- CapApp-SPM/README.md
- react-chartjs-2
- yup
- xtodo.md
- SignupForm.jsx
- UserNotifications.jsx
- @emotion/styled
- notifications.controller.js
- @mui/material
- react-hook-form
- MediTrack Tools & Technologies
- notifications.route.js
- @supabase/supabase-js
- Datepicker.jsx
- devDependencies
- main.js
- frontend/package.json
- supabase.js
- BulkAppointmentPanel.jsx
- language.js
- aboutSettings.jsx
- dateFormat.js
- examinations.validation.js
- script.js
- consultations.js
- email.js
- useDocumentManager.js
- scripts
- @capacitor/app
- appointmentValidator.js
- @capacitor/status-bar
- chart.js
- express-rate-limit
- form-data
- i18next
- multer
- react-datepicker
- react-dom
- react-i18next
- @tanstack/react-query
- electron
- globals
- vite
- @vitejs/plugin-react
- wait-on
- helmet
- jsonwebtoken
- nodemailer
- axios
- multer
- resend
- @tanstack/react-query
- zod
- t

## God Nodes (most connected - your core abstractions)
1. `supabase` - 34 edges
2. `getSystemConfig()` - 33 edges
3. `Consultations()` - 20 edges
4. `Medical()` - 20 edges
5. `DatePicker()` - 18 edges
6. `ConsultationUsers()` - 18 edges
7. `request()` - 18 edges
8. `Reports()` - 17 edges
9. `UserManagement()` - 17 edges
10. `MediTrack - Student Health Record Management System` - 17 edges

## Surprising Connections (you probably didn't know these)
- `allowDynamicClinicStaffs()` --calls--> `getSystemConfig()`  [EXTRACTED]
  features/user/user.route.js → services/systemConfig.service.js
- `allowDynamicAdmin()` --calls--> `getSystemConfig()`  [EXTRACTED]
  features/user/user.route.js → services/systemConfig.service.js
- `allowDynamicClinicStaffs()` --calls--> `getSystemConfig()`  [EXTRACTED]
  routes/settingsRoutes.js → services/systemConfig.service.js
- `allowDynamicAdmin()` --calls--> `getSystemConfig()`  [EXTRACTED]
  routes/storageRoutes.js → services/systemConfig.service.js
- `forgotPassword()` --calls--> `sendEmail()`  [EXTRACTED]
  controllers/auth.controller.js → services/email.service.js

## Import Cycles
- None detected.

## Communities (207 total, 65 thin omitted)

### Community 0 - "Approvals.jsx"
Cohesion: 0.06
Nodes (65): jspdf, API_URL, appendCacheBuster(), DentalExaminationReport(), DentalNotesTextarea, getPdfImageFormat(), loadImageForPdf(), TextInput (+57 more)

### Community 1 - "user.service.js"
Cohesion: 0.05
Nodes (61): adminResendVerification(), crypto, forgotPassword(), login(), register(), { sendEmail }, sendVerificationEmail(), supabase (+53 more)

### Community 2 - "Consultations.jsx"
Cohesion: 0.10
Nodes (19): Consultations(), ConsultationToothTopView(), formatDate(), formatNameForList(), formatTime(), getDentalConditionColor(), getDentalConditionShort(), getFullName() (+11 more)

### Community 3 - "package.json"
Cohesion: 0.14
Nodes (13): author, bugs, url, description, homepage, keywords, license, main (+5 more)

### Community 4 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, @capacitor/cli, concurrently, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies (+17 more)

### Community 5 - "Profile-users.jsx"
Cohesion: 0.07
Nodes (28): BLOOD_TYPES, calculateAge(), CIVIL_STATUSES, classificationColors, DENTAL_PROCEDURES, DocViewerModal(), EMERGENCY_RELATIONSHIPS, fmt() (+20 more)

### Community 6 - "consultations.controller.js"
Cohesion: 0.09
Nodes (27): consultationsService, createConsultation(), deleteConsultation(), endConsultation(), getConsultationById(), getMessages(), markMessagesAsRead(), reactivateConsultation() (+19 more)

### Community 7 - "Reports.jsx"
Cohesion: 0.08
Nodes (26): addChartImage(), addDataRow(), addSectionHeader(), addTableHeader(), addTitleBanner(), applyPercentFormat(), buildPersonnelCounts(), createChartImage() (+18 more)

### Community 8 - "auditLogger.js"
Cohesion: 0.11
Nodes (19): auditLog(), normalizeValue(), removeSensitiveFields(), resolveUserName(), supabase, IMPORTANT:, requireStaff, requireSysadmin (+11 more)

### Community 9 - "appointments/appointments.service.js"
Cohesion: 0.09
Nodes (25): appointmentsService, archiveAppointment(), createAppointment(), createBulkAppointment(), deleteAppointment(), getBulkHistory(), getMyAppointments(), resolveActorName() (+17 more)

### Community 10 - "User-Management.jsx"
Cohesion: 0.07
Nodes (47): AddressModal(), COUNTRIES, GENERIC_BARANGAYS, BLOOD_TYPES, calcAge(), CIVIL_STATUSES, EMERGENCY_RELATIONSHIPS, isEmpty() (+39 more)

### Community 11 - "Dental.jsx"
Cohesion: 0.06
Nodes (51): API_URL, buildDentalForm(), buildDentalHistoryProcedures(), conditionLabel, createEmptySurfaces(), decidLowerLeft, decidLowerRight, decidUpperLeft (+43 more)

### Community 12 - "systemConfig.jsx"
Cohesion: 0.10
Nodes (8): API_URL, ConfigArrayEditor(), ConfigObjectEditor(), DEFAULT_PASSWORD_RULES, inputStyle, pillButtonStyle(), SectionsEditor(), SystemConfigSettings()

### Community 13 - "DashboardLayout.jsx"
Cohesion: 0.09
Nodes (9): react, MobileHeader(), ROLE_NAV_CONFIG, DashboardLayout(), getMobileNavItems(), getStoredUserRole(), NAV_ICON_BY_ROUTE, NAV_ID_BY_ROUTE (+1 more)

### Community 14 - "Appointments.jsx"
Cohesion: 0.07
Nodes (9): AUTO_SCHEDULE_CAPACITY, ExaminationModal(), HOUR_SLOTS, MONTH_SHORT, MONTHS, normalizePatientData(), STAFF_PURPOSES_OPTS, STAFF_REASON_SUGGESTIONS (+1 more)

### Community 15 - "Medical.jsx"
Cohesion: 0.06
Nodes (51): ALL_YEARS, AMPM, buildDays(), DateTimePicker(), getDaysInMonth(), HOURS_12, MINUTES, MONTH_FULL (+43 more)

### Community 16 - "Headers.jsx"
Cohesion: 0.09
Nodes (11): DEFAULT_MOBILE_ITEMS, DENTAL_PROCEDURES, DesktopNav(), formatPhoneNumber(), getStoredUserRole(), isValidPhoneNumber(), MobileNavigationDrawer(), parseJsonIfNeeded() (+3 more)

### Community 17 - "App.jsx"
Cohesion: 0.09
Nodes (20): Approvals, Archives, AuditLogs, Examination, GlobalLoading(), NotificationsManagement, OcrSettings, ProfileSetup (+12 more)

### Community 18 - "medi_ocr.py"
Cohesion: 0.17
Nodes (20): after_request, add_cors_headers(), config_options(), get_config(), health(), load_config(), load_config_fallback(), normalize_config() (+12 more)

### Community 19 - "AppDelegate"
Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 20 - "UserDashboardLayout.jsx"
Cohesion: 0.10
Nodes (7): DESKTOP_NAV, formatRoleLabel(), getStoredUserRole(), MOBILE_NAV, ProfileDropdown(), RECORD_NOTIF_TYPES, UserDashboardLayout()

### Community 21 - "database.js"
Cohesion: 0.11
Nodes (17): { createClient }, supabase, { authorized }, express, multer, router, supabase, upload (+9 more)

### Community 22 - "Consultation-users.jsx"
Cohesion: 0.16
Nodes (15): ConsultationUsers(), fetchSenderRoles(), formatApptDateTime(), formatDate(), formatDisplayDateWithMonth(), formatTime(), getCachedMessages(), getCachedPresence() (+7 more)

### Community 23 - "MediTrack SQLite Offline Mode Implementation Guide"
Cohesion: 0.05
Nodes (43): Architecture, Common Issues, File Structure Summary, Goals, Integration Tests, MediTrack SQLite Offline Mode Implementation Guide, Next Steps, Overview (+35 more)

### Community 24 - "examinations.controller.js"
Cohesion: 0.08
Nodes (40): approveDentalExamination, approveMedicalExamination, approveTypedExamination(), buildAuditDetails(), createDentalExamination, createMedicalExamination, createTypedExamination(), deleteDentalExamination (+32 more)

### Community 25 - "Settings.jsx"
Cohesion: 0.22
Nodes (10): DentistIcon(), DoctorIcon(), GeneralIcon(), ImportIcon(), InfoIcon(), OcrIcon(), Settings(), StorageIcon() (+2 more)

### Community 26 - "user.route.js"
Cohesion: 0.09
Nodes (20): allowDynamicAdmin(), allowDynamicClinicStaffs(), attachTargetUserDetails(), { auditLog }, { authorized }, buildFullName(), excelUpload, express (+12 more)

### Community 28 - "archives.route.js"
Cohesion: 0.19
Nodes (14): allowDynamicAdmin(), ALLOWED_ARCHIVE_TABLES, archivesController, {
  auditLog,
}, {
  authorized,
}, buildArchiveItemDetails(), buildFullName(), express (+6 more)

### Community 29 - "Announcements.jsx"
Cohesion: 0.23
Nodes (9): Announcements(), CATEGORIES, CATEGORY_COLORS, EMPTY_FORM, formatDate(), formatDeptDisplay(), getRoleFromStorage(), PRIORITY_CONFIG (+1 more)

### Community 30 - "storageManager.jsx"
Cohesion: 0.06
Nodes (31): API_URL, DentistSettings(), fieldInputStyle(), API_URL, DoctorSettings(), fieldInputStyle(), halfFieldInputStyle(), API_URL (+23 more)

### Community 31 - "examinations.route.js"
Cohesion: 0.27
Nodes (10): allowDynamicAdmin(), allowDynamicClinicStaffs(), {
  auditLog,
}, {
  authorized,
}, examinationsController, express, {
  getSystemConfig,
}, normalizeConfiguredRoles() (+2 more)

### Community 32 - "Record-Management.jsx"
Cohesion: 0.12
Nodes (32): CERT_OPTIONS, departmentMatches(), EDIT_STATUS_OPTIONS, FALLBACK_CLINIC_ROLES, FALLBACK_NON_TEACHING_ROLES, FALLBACK_TEACHING_ROLES, formatDate(), getFullName() (+24 more)

### Community 33 - "Notifications.jsx"
Cohesion: 0.16
Nodes (6): formatTimeAgo(), getNotificationIcon(), NotificationBell(), NotificationRow(), ensurePermission(), sendNotification()

### Community 34 - "Meditrack.jsx"
Cohesion: 0.20
Nodes (6): getSavedTab(), MediTrack(), PERSIST_TABS, RECORDS, TAG_ICON, VALID_TABS

### Community 35 - "storageRoutes.js"
Cohesion: 0.14
Nodes (20): allowDynamicAdmin(), { authorized }, BRANDING_IMAGE_EXTENSIONS, brandingFileExists(), collectFilePaths(), express, findFallbackBrandingLogo(), getErrorMessage() (+12 more)

### Community 36 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (18): useAppointments(), Dashboard(), DashboardContent(), FALLBACK_CLINIC_ROLES, FALLBACK_NON_TEACHING_ROLES, FALLBACK_TEACHING_ROLES, findAppointmentUser(), findRecordUser() (+10 more)

### Community 37 - "LoginForm.jsx"
Cohesion: 0.19
Nodes (11): LoginForm(), startTokenRefresh(), createAnnouncementSchema, createAppointmentSchema, createRecordSchema, examinationSchema, getFieldErrors(), loginSchema (+3 more)

### Community 38 - "Homepage-users.jsx"
Cohesion: 0.21
Nodes (11): AnnouncementCard(), AnnouncementModal(), CATEGORY_COLORS, formatApptTime(), formatDisplayDateWithMonth(), HEALTH_TIPS_KEYS, HomePageUsers(), HOUR_SLOTS (+3 more)

### Community 39 - "ResetPassword.jsx"
Cohesion: 0.27
Nodes (6): ForgotPassword(), API_URL, DEFAULT_PASSWORD_RULES, ResetPassword(), VerifyEmail(), AuthLayout()

### Community 40 - "announcements.route.js"
Cohesion: 0.12
Nodes (17): allowDynamicClinicStaffs(), announcementsController, {
  auditLog,
}, {
  authorized,
}, {
  createAnnouncementSchema,
  updateAnnouncementSchema,
}, express, {
  getSystemConfig,
}, multer (+9 more)

### Community 41 - "appointments.route.js"
Cohesion: 0.16
Nodes (17): allowDynamicFaculty(), allowDynamicStaffAndFaculty(), appointmentsController, {
  auditLog,
}, {
  authorized,
}, {
  createAppointmentSchema,
  updateAppointmentSchema,
  bulkCreateAppointmentSchema,
}, express, {
  getSystemConfig,
} (+9 more)

### Community 42 - "records.route.js"
Cohesion: 0.12
Nodes (17): allowDynamicAdmin(), allowDynamicClinicStaffs(), {
  auditLog,
}, { authorized }, {
  createRecordSchema,
  updateRecordSchema,
}, express, {
  getSystemConfig,
}, normalizeRole() (+9 more)

### Community 43 - "auth.routes.js"
Cohesion: 0.09
Nodes (24): multer, storage, upload, allowDynamicAdmin(), attachLoginAuditDetails(), attachTargetUserAuditDetails(), { auditLog }, authController (+16 more)

### Community 44 - "routes/index.js"
Cohesion: 0.12
Nodes (16): announcementsRoutes, appointmentsRoutes, archivesRoutes, authRoutes, consultationsRoutes, examinationsRoutes, express, notificationsRoutes (+8 more)

### Community 45 - "MediTrack Technology Stack Analysis (Updated)"
Cohesion: 0.25
Nodes (7): 1️⃣ Project Overview, 2️⃣ Backend (Node.js + Express), 3️⃣ Front‑end (React + Vite + Ionic), 4️⃣ OCR Service (Python Flask), 5️⃣ Recommendations (based on actual usage), MediTrack Technology Stack Analysis (Updated), Next Steps

### Community 46 - "Appointments"
Cohesion: 0.15
Nodes (13): Appointments(), generateAutoSchedule(), groupByBatch(), IconBuilding(), IconCalendar(), IconCircleCheck(), IconClock(), IconGraduationCap() (+5 more)

### Community 47 - "announcements/announcements.service.js"
Cohesion: 0.12
Nodes (32): announcementsService, createAnnouncement(), deleteAnnouncement(), escapeHtml(), formatAnnouncementDate(), getAnnouncementById(), getAnnouncementSharePage(), resolveActorName() (+24 more)

### Community 48 - "archives.service.js"
Cohesion: 0.08
Nodes (40): archiveAndDelete(), archivesController, archiveItem(), archivesService, buildAuditTargetDetails(), formatTableName(), getAuditTarget(), moveToArchives() (+32 more)

### Community 49 - "parseRecordJson"
Cohesion: 0.17
Nodes (20): DentalRecordRow(), formatHistoryDate(), getDentalHistory(), getDentalIntraoral(), getDentalToothData(), getDentalTreatmentRemarks(), getDentalTreatments(), getMedicalCovid() (+12 more)

### Community 50 - "UserPreferencesContext.jsx"
Cohesion: 0.22
Nodes (6): App(), API_URL, DEFAULT_PREFERENCES, UserPreferencesContext, UserPreferencesProvider(), root

### Community 51 - "Records-users.jsx"
Cohesion: 0.16
Nodes (14): clearCache(), COURSE_MAP, extractToothConditions(), fmt(), formatDisplayDateWithMonth(), getDateSearchString(), getRecordTimestamp(), InfoRow() (+6 more)

### Community 52 - "Appointment-users.jsx"
Cohesion: 0.18
Nodes (14): AppointmentUsers(), F2F_PURPOSES, FACULTY_ROLES, formatDisplayDateWithMonth(), formatDisplayDateWithMonthAndTime(), formatTimeStringTo12Hour(), getFreshToken(), HOUR_SLOTS (+6 more)

### Community 53 - "Records/records.service.js"
Cohesion: 0.10
Nodes (42): archiveDentalRecord(), archiveMedicalRecord(), autoArchiveRecords(), createRecord(), deleteRecord(), recordsService, requestCertificate(), resolveActorName() (+34 more)

### Community 54 - "Firebase Firestore to Supabase Migration Guide"
Cohesion: 0.06
Nodes (35): 10. Frontend Migration Checklist (Updated 2026-05-28), 11. Supabase Realtime Setup, 12. Storage Bucket Setup, 1. Data Model Analysis, 2.1 Users Table, 2.2 Appointments Table, 2.3 Examinations Table (Legacy), 2.3b Medical Records Table (+27 more)

### Community 55 - "app.js"
Cohesion: 0.15
Nodes (10): app, corsMiddleware, express, globalErr, helmet, routes, server, allowedOrigins (+2 more)

### Community 56 - "systemConfig.service.js"
Cohesion: 0.16
Nodes (15): getPublicPasswordRules(), getSystemConfig(), notificationsService, resolveActorId(), resolveActorName(), sanitizeConfigForAudit(), setAuditData(), systemConfigService (+7 more)

### Community 58 - "services/announcements.service.js"
Cohesion: 0.52
Nodes (6): createAnnouncement(), deleteAnnouncement(), getAllAnnouncements(), getAnnouncementById(), getAuthHeaders(), updateAnnouncement()

### Community 59 - "UniversityIdImport.jsx"
Cohesion: 0.17
Nodes (10): fileKey(), formatBytes(), pillButtonStyle(), NOTE: Ensure your backend service has this method configured., UniversityIdImport(), validateFiles(), getAuthHeaders(), importManualIds() (+2 more)

### Community 60 - "AppointmentContext.jsx"
Cohesion: 0.48
Nodes (6): AppointmentContext, AppointmentProvider(), clearCache(), mapRow(), readCache(), writeCache()

### Community 61 - "AppointmentManagement.jsx"
Cohesion: 0.19
Nodes (17): AppointmentManagement(), CLINIC_SLOTS, departmentMatches(), FALLBACK_CLINIC_ROLES, FALLBACK_NON_TEACHING_ROLES, FALLBACK_TEACHING_ROLES, formatDate(), formatTime() (+9 more)

### Community 62 - "services/consultations.service.js"
Cohesion: 0.22
Nodes (17): clearConsultationsCache(), clearMessagesCache(), consultationsCache, createConsultation(), deleteConsultation(), endConsultation(), fetchApi(), getAllConsultations() (+9 more)

### Community 63 - "TimePicker.jsx"
Cohesion: 0.33
Nodes (3): AMPM, HOURS_12, MINUTES

### Community 64 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 68 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 69 - "dependencies"
Cohesion: 0.12
Nodes (17): bcrypt, cors, dotenv, express, dependencies, bcrypt, cors, dotenv (+9 more)

### Community 71 - "imports"
Cohesion: 0.50
Nodes (3): imports, std/http/server, @supabase/supabase-js

### Community 72 - "imports"
Cohesion: 0.50
Nodes (3): imports, https://deno.land/std@0.168.0/http/server.ts, @supabase/supabase-js

### Community 73 - "MainActivity"
Cohesion: 0.43
Nodes (4): BridgeActivity, Bundle, MainActivity, Override

### Community 74 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, cap:open:android, cap:open:ios, cap:sync, clean, dev, electron (+8 more)

### Community 80 - "ConsultationManagement.jsx"
Cohesion: 0.20
Nodes (14): ConsultationManagement(), departmentMatches(), FALLBACK_CLINIC_ROLES, FALLBACK_NON_TEACHING_ROLES, FALLBACK_TEACHING_ROLES, formatDate(), getUserDepartment(), getUserProgram() (+6 more)

### Community 85 - "MediTrack System Data Flow Documentation"
Cohesion: 0.06
Nodes (35): 1. User Registration (SignupForm.jsx), 2. User Login (LoginForm.jsx), Admin/Clinic Layout (DashboardLayout.jsx), Admin Dashboard Flow, Admin Records View (Records.jsx), Application Routing Flow, Appointment System Flow, Authentication Flow (+27 more)

### Community 93 - "MediTrack Archive Function Implementation Plan"
Cohesion: 0.07
Nodes (26): 1.1 Add Archive API Endpoints (if not fully exposed), 1.2 Create Archive Helper Utility, 2.1 Create Archive Service, 3.1 Announcements Page, 3.2 Appointments Page, 3.3 Consultations Page, 3.4 Records Page, 3.5 User Management Page (+18 more)

### Community 95 - "dependencies"
Cohesion: 0.22
Nodes (9): file-saver, dependencies, axios, file-saver, react-toastify, vite-plugin-compression, axios, react-toastify (+1 more)

### Community 100 - "getSystemConfig"
Cohesion: 0.25
Nodes (12): allowDynamicAdmin(), allowDynamicClinicStaffs(), allowDynamicPatients(), {
  auditLog,
}, {
  authorized: authorize,
}, consultationsController, express, {
  getSystemConfig,
} (+4 more)

### Community 101 - "supportSettings.jsx"
Cohesion: 0.15
Nodes (4): FAQ_DATA, HelpCenter(), API_URL, StudentSupportSettings()

### Community 102 - "NotificationsManagement.jsx"
Cohesion: 0.30
Nodes (12): formatDateTime(), formatTypeLabel(), getFullName(), getInitials(), getTypeBadge(), MONTHS, NotificationCard(), NotificationRow() (+4 more)

### Community 103 - "build"
Cohesion: 0.15
Nodes (13): build, appId, directories, mac, productName, win, output, category (+5 more)

### Community 104 - "auth.service.js"
Cohesion: 0.26
Nodes (9): AdminLayoutWrapper(), clearAppUserState(), clearSupabaseLocalSession(), getProfile(), login(), logout(), normalizeUser(), IMPORTANT: (+1 more)

### Community 118 - "Frontend Update Plan - Medical Records JSONB Schema"
Cohesion: 0.08
Nodes (25): 1. Medical.jsx ✅ IN PROGRESS, 2. Records.jsx, 3. Approvals.jsx, 4. ApprovalManagement.jsx, 5. Records-users.jsx, 6. Archives.jsx, 7. Record-Management.jsx, 8. Dashboard.jsx (+17 more)

### Community 119 - "Backend Migration Plan: Hybrid Approach"
Cohesion: 0.08
Nodes (23): Backend Implementation, Backend Migration Plan: Hybrid Approach, Backend Tests (Postman/cURL), Frontend Implementation, Frontend Tests (Browser), Hybrid Architecture, Implementation Steps, Overview (+15 more)

### Community 120 - "MediTrack Setup Guide"
Cohesion: 0.08
Nodes (23): Additional Resources, Android, Common Issues, iOS, MediTrack Setup Guide, Mobile App Setup (Optional), Option A: Using Existing Environment Variables, Option A: Using Virtual Environment (Recommended) (+15 more)

### Community 121 - "services/appointments.service.js"
Cohesion: 0.41
Nodes (11): allAppointmentsCache, clearAppointmentsCache(), createAppointment(), createBulkAppointment(), dateAppointmentsCache, deleteAppointment(), getAllAppointments(), getAppointmentsByDate() (+3 more)

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
Cohesion: 0.17
Nodes (14): ACTION_COLORS, ActionPill(), ACTIVITY_TYPE_ALIASES, ACTIVITY_TYPES, addDataRow(), addSectionHeader(), addTableHeader(), addTitleBanner() (+6 more)

### Community 128 - "MediTrack - Student Health Record Management System"
Cohesion: 0.22
Nodes (9): Contributing, Frontend Services, License, MediTrack - Student Health Record Management System, Overview, Project Structure, Support, Table of Contents (+1 more)

### Community 129 - "Getting Started"
Cohesion: 0.25
Nodes (8): 1. Clone the Repository, 2. Backend Setup, 3. OCR Service Setup (Windows), 4. Frontend Setup, 5. Build for Desktop (Electron), 6. Build for Mobile (Capacitor), Getting Started, Prerequisites

### Community 130 - "generalSettings.jsx"
Cohesion: 0.17
Nodes (3): API_URL, DEFAULT_PREFERENCES, GeneralSettings()

### Community 131 - "API Endpoints"
Cohesion: 0.29
Nodes (7): Announcements, API Endpoints, Appointments, Authentication, Examinations, Health Records, OCR Service

### Community 132 - "Firestore Collections"
Cohesion: 0.29
Nodes (7): announcements, appointments, Database Schema, examinations, Firestore Collections, records, users

### Community 133 - "MediTrack Project Guidelines"
Cohesion: 0.11
Nodes (17): API Endpoints, Architecture, Authentication Flow, Backend (port 5000), Backend Structure, Commands, Environment Variables (.env), Frontend (port 3000) (+9 more)

### Community 134 - "services/notifications.service.js"
Cohesion: 0.36
Nodes (11): DesktopHeader(), AllNotificationsModal(), normalizeNotification(), NotificationPanel(), deleteNotification(), getAuthHeaders(), getInternalUserId(), getNotifications() (+3 more)

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

### Community 146 - "webhook.controller.js"
Cohesion: 0.33
Nodes (10): getRecipientEmail(), getSvixHeaders(), getWebhookPayload(), handleResendWebhook(), normalizeEmail(), setWebhookAuditData(), supabase, updateEmailStatus() (+2 more)

### Community 152 - "SignupForm.jsx"
Cohesion: 0.11
Nodes (15): DEFAULT_STEPS, LoadingAnimation(), ALLOWED_IMAGE_TYPES, API_URL, DEFAULT_PASSWORD_RULES, getPasswordRequirements(), PasswordRequirements(), POLICY_SECTIONS (+7 more)

### Community 153 - "UserNotifications.jsx"
Cohesion: 0.22
Nodes (4): formatTimeAgo(), getNotificationIcon(), UserNotificationBell(), UserNotificationPanel()

### Community 155 - "notifications.controller.js"
Cohesion: 0.42
Nodes (10): createTestNotification(), deleteNotification(), getNotifications(), getUnreadCount(), markAllAsRead(), markAsRead(), notificationsService, resolveActorName() (+2 more)

### Community 158 - "MediTrack Tools & Technologies"
Cohesion: 0.20
Nodes (9): Backend (Node.js + Express), Build, Packaging & Deployment, Development Experience, Frontend (React + Vite + Ionic), MediTrack Tools & Technologies, OCR Service (Python + Flask), Overview, Rationale Summary (+1 more)

### Community 159 - "notifications.route.js"
Cohesion: 0.27
Nodes (9): allowDynamicAdmin(), {
  auditLog,
}, {
  authorized,
}, express, {
  getSystemConfig,
}, normalizeConfiguredRoles(), normalizeRole(), notificationsController (+1 more)

### Community 164 - "Datepicker.jsx"
Cohesion: 0.29
Nodes (7): ALL_YEARS, buildDays(), DatePicker(), getDaysInMonth(), MONTH_FULL, MONTHS, parseDateValue()

### Community 165 - "devDependencies"
Cohesion: 0.22
Nodes (9): jest, jest-environment-jsdom, devDependencies, electron, electron-builder, jest, jest-environment-jsdom, electron (+1 more)

### Community 166 - "main.js"
Cohesion: 0.25
Nodes (5): __dirname, __filename, files, dist/**/*, electron/**/*

### Community 167 - "frontend/package.json"
Cohesion: 0.25
Nodes (7): author, description, main, name, private, type, version

### Community 168 - "supabase.js"
Cohesion: 0.32
Nodes (3): ARCHIVE_TYPE_LABELS, SORT_OPTIONS, supabase

### Community 169 - "BulkAppointmentPanel.jsx"
Cohesion: 0.39
Nodes (7): BULK_PURPOSES_OPTS, BulkAppointmentPanel(), formatDisplayDateWithMonth(), getFreshToken(), isTokenExpired(), parseCsvToIds(), STATUS_STYLES

### Community 170 - "language.js"
Cohesion: 0.43
Nodes (6): English(), Filipino(), getTranslations(), isSupportedLanguage(), normalizeLanguage(), translate()

### Community 172 - "dateFormat.js"
Cohesion: 0.52
Nodes (6): DATE_FORMATS, formatDate(), formatUserDate(), getDateFormat(), pad(), parseDate()

### Community 173 - "examinations.validation.js"
Cohesion: 0.33
Nodes (5): createExaminationSchema, logEntrySchema, surgicalHistorySchema, updateExaminationSchema, { z }

### Community 174 - "script.js"
Cohesion: 0.33
Nodes (5): header, observer, roleData, rolePanel, year

### Community 175 - "consultations.js"
Cohesion: 0.40
Nodes (4): express, router, { supabase }, { verifyAppointmentWindow }

### Community 177 - "useDocumentManager.js"
Cohesion: 0.83
Nodes (3): ALLOWED_DOC_TYPES, getActiveUid(), useDocumentManager()

### Community 178 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, electron:build, electron:start, test

### Community 179 - "@capacitor/app"
Cohesion: 0.67
Nodes (3): @capacitor/app, @capacitor/app, AndroidBackButtonHandler()

## Knowledge Gaps
- **844 isolated node(s):** `express`, `helmet`, `corsMiddleware`, `globalErr`, `routes` (+839 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `supabase.js` to `Approvals.jsx`, `Consultations.jsx`, `Profile-users.jsx`, `services/notifications.service.js`, `User-Management.jsx`, `Dental.jsx`, `Appointments.jsx`, `Medical.jsx`, `Headers.jsx`, `UserDashboardLayout.jsx`, `Consultation-users.jsx`, `UserNotifications.jsx`, `storageManager.jsx`, `Record-Management.jsx`, `Notifications.jsx`, `Homepage-users.jsx`, `BulkAppointmentPanel.jsx`, `useDocumentManager.js`, `Records-users.jsx`, `Appointment-users.jsx`, `AppointmentContext.jsx`, `AppointmentManagement.jsx`, `services/consultations.service.js`, `ConsultationManagement.jsx`, `NotificationsManagement.jsx`, `auth.service.js`, `services/appointments.service.js`, `AuditLogs.jsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Approvals.jsx`, `@emotion/react`, `DashboardLayout.jsx`, `react-chartjs-2`, `yup`, `@emotion/styled`, `@capacitor/core`, `@mui/material`, `react-hook-form`, `@supabase/supabase-js`, `frontend/package.json`, `@capacitor/app`, `@capacitor/status-bar`, `chart.js`, `i18next`, `multer`, `react-datepicker`, `react-dom`, `react-i18next`, `@tanstack/react-query`, `@capacitor/filesystem`, `@capacitor/ios`, `@capacitor/android`, `date-fns`, `exceljs`, `@capacitor/share`, `html2canvas`, `@ionic/react`, `lucide-react`, `react-router-dom`, `zod`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `@capacitor/app` connect `@capacitor/app` to `Meditrack.jsx`, `dependencies`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `express`, `helmet`, `corsMiddleware` to the rest of the system?**
  _844 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Approvals.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055135135135135134 - nodes in this community are weakly interconnected._
- **Should `user.service.js` be split into smaller, more focused modules?**
  _Cohesion score 0.054773082942097026 - nodes in this community are weakly interconnected._
- **Should `Consultations.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10114942528735632 - nodes in this community are weakly interconnected._