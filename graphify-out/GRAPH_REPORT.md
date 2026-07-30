# Graph Report - .  (2026-07-30)

## Corpus Check

* cluster-only mode — file stats not available

## Summary

* 1298 nodes · 1864 edges · 119 communities (84 shown, 35 thin omitted)
* Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 191 edges (avg confidence: 0.5)
* Token cost: 0 input · 0 output

## Graph Freshness

* Built from commit: `687a60e5`
* Run `git rev-parse HEAD` and compare to check if the graph is stale.
* Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

* src/supabase.js
* auth.controller.js
* services/consultations.service.js
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
* Notifications.jsx
* database.js
* Consultation-users.jsx
* UserDashboardLayout.jsx
* examinations.controller.js
* Settings.jsx
* user.route.js
* dependencies
* archives.route.js
* Announcements.jsx
* token.service.js
* examinations.route.js
* Record-Management.jsx
* SignupForm.jsx
* Meditrack.jsx
* DateTimePicker.jsx
* Dashboard.jsx
* LoginForm.jsx
* homepage-users.jsx
* Records-users.jsx
* announcements.route.js
* appointments.route.js
* records.route.js
* auth.routes.js
* index.js
* services/notifications.service.js
* Appointments
* announcements/announcements.service.js
* archives.controller.js
* archives.service.js
* Datepicker.jsx
* auth.service.js
* Appointment-users.jsx
* records.controller.js
* UserNotifications.jsx
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
* logout
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
* chart.js
* date-fns
* @emotion/react
* exceljs
* capacitor.config.ts
* Package.swift
* @capacitor/core
* html2canvas
* @ionic/react
* lucide-react
* @mui/material
* react-router-dom
* vite-plugin-compression
* zod
* index.ts
* db

## God Nodes (most connected - your core abstractions)

1. `supabase` - 34 edges
2. `Consultations()` - 19 edges
3. `ConsultationUsers()` - 15 edges
4. `Medical()` - 14 edges
5. `Reports()` - 14 edges
6. `Appointments()` - 13 edges
7. `DatePicker()` - 12 edges
8. `ProfileSetup()` - 12 edges
9. `NotificationPanel()` - 11 edges
10. `useLoading()` - 11 edges

## Surprising Connections (you probably didn't know these)

* `adminResendVerification()` --calls--> `sendEmail()`  \[EXTRACTED]
  controllers/auth.controller.js → configs/email.js
* `forgotPassword()` --calls--> `sendEmail()`  \[EXTRACTED]
  controllers/auth.controller.js → configs/email.js
* `sendVerificationEmail()` --calls--> `sendEmail()`  \[EXTRACTED]
  controllers/auth.controller.js → configs/email.js
* `createConsultation()` --calls--> `sendNotification()`  \[EXTRACTED]
  features/consultations/consultations.controller.js → utils/notifier.js
* `updateConsultation()` --calls--> `sendNotification()`  \[EXTRACTED]
  features/consultations/consultations.controller.js → utils/notifier.js

## Import Cycles

* None detected.

## Communities (119 total, 35 thin omitted)

### Community 0 - "src/supabase.js"

Cohesion: 0.06
Nodes (42): jspdf, DentalExaminationReport(), DentalNotesTextarea, TextInput, DoctorTextarea, MedicalCertificate(), RemarksTextarea, AppointmentManagement() (+34 more)

### Community 1 - "auth.controller.js"

Cohesion: 0.06
Nodes (32): nodemailer, sendEmail(), { createClient }, supabase, adminResendVerification(), crypto, emailVerificationTokens, forgotPassword() (+24 more)

### Community 2 - "services/consultations.service.js"

Cohesion: 0.08
Nodes (39): ConsultationManagement(), formatDate(), SORT\_OPTIONS, STATUS\_OPTIONS, TYPE\_OPTIONS, Consultations(), DentalRecordRow(), fmtDateTime() (+31 more)

### Community 3 - "dependencies"

Cohesion: 0.05
Nodes (41): cors, dotenv, express, form-data, @supabase/supabase-js, jsonwebtoken, multer, nodemailer (+33 more)

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

Cohesion: 0.08
Nodes (17): addDataRow(), addSectionHeader(), addTableHeader(), addTitleBanner(), applyPercentFormat(), DENTAL\_CONDITIONS, IconActivity(), IconAlert() (+9 more)

### Community 8 - "Records.jsx"

Cohesion: 0.08
Nodes (24): CIVIL\_STATUSES, departmentsData, deptAbbrToFull, ExaminationModal(), getDefaultClassification(), getDefaultJobTitle(), NATIONALITIES, NON\_ACADEMIC\_OFFICES (+16 more)

### Community 9 - "appointments/appointments.service.js"

Cohesion: 0.07
Nodes (8): appointmentsService, getMyAppointments(), getUserAppointments(), notificationsService, supabase, notificationsService, notificationsService, supabase

### Community 10 - "ProfileSetup.jsx"

Cohesion: 0.10
Nodes (27): buildFullAddress(), calcAge(), CIVIL\_STATUSES, departmentsData, deptAbbrToFull, EMERGENCY\_RELATIONSHIPS, getCitiesByProvince(), getDefaultClassification() (+19 more)

### Community 11 - "Dental.jsx"

Cohesion: 0.10
Nodes (22): buildDentalForm(), buildDentalHistoryProcedures(), conditionLabel, decidLowerLeft, decidLowerRight, decidUpperLeft, decidUpperRight, Dental() (+14 more)

### Community 12 - "User-Management.jsx"

Cohesion: 0.11
Nodes (22): CLASSIFICATION\_MAP, classificationColors, CLINIC\_ROLES, CREATE\_STEP\_LABELS, CreateUserModal(), currentUser, departmentsData, deptAbbrToFull (+14 more)

### Community 13 - "DashboardLayout.jsx"

Cohesion: 0.09
Nodes (8): react, MobileHeader(), ProfileDrawer(), DashboardLayout(), DEFAULT\_MOBILE\_NAV, getStoredUserRole(), ROLE\_MOBILE\_NAV, react

### Community 14 - "Appointments.jsx"

Cohesion: 0.08
Nodes (4): HOUR\_SLOTS, MONTH\_SHORT, MONTHS, WEEKDAYS

### Community 15 - "Medical.jsx"

Cohesion: 0.13
Nodes (18): buildInitialForm(), createDefaultVital(), familyConditions, fetchNurses(), fetchPhysicians(), filterNumbersAndDot(), filterNumbersAndSlash(), filterNumbersOnly() (+10 more)

### Community 16 - "Headers.jsx"

Cohesion: 0.09
Nodes (8): DEFAULT\_MOBILE\_ITEMS, DENTAL\_PROCEDURES, DentalHistoryDrawerSection(), DesktopNav(), emptyDentalHistory(), getStoredUserRole(), ROLE\_MOBILE\_NAV\_CONFIG, ROLE\_NAV\_CONFIG

### Community 17 - "App.jsx"

Cohesion: 0.10
Nodes (18): Approvals, Archives, AuditLogs, Examination, GlobalLoading(), OcrSettings, ProfileSetup, RecordManagement (+10 more)

### Community 18 - "medi\_ocr.py"

Cohesion: 0.16
Nodes (19): after\_request, add\_cors\_headers(), config\_options(), get\_config(), load\_config(), load\_config\_fallback(), ocr\_options(), parse\_id\_fields() (+11 more)

### Community 19 - "AppDelegate"

Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 20 - "Notifications.jsx"

Cohesion: 0.14
Nodes (11): formatTimeAgo(), getNotificationIcon(), NotificationBell(), NotificationPanel(), getNotificationIcon(), UserNotificationPanel(), createTestNotification(), deleteNotification() (+3 more)

### Community 21 - "database.js"

Cohesion: 0.12
Nodes (15): { createClient }, supabase, { auditLog }, { authorized }, express, notificationsController, router, { authorized } (+7 more)

### Community 22 - "Consultation-users.jsx"

Cohesion: 0.18
Nodes (15): ConsultationUsers(), fetchSenderRoles(), formatDate(), formatTime(), getCachedConsultations(), getCachedMessages(), getCachedPresence(), getGenderIcon() (+7 more)

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

Cohesion: 0.13
Nodes (15): @capacitor/android, @emotion/styled, file-saver, dependencies, axios, @capacitor/android, @emotion/styled, file-saver (+7 more)

### Community 28 - "archives.route.js"

Cohesion: 0.15
Nodes (12): archivesController, { auditLog }, { authorized }, express, router, { auditLog }, { authorized: authorize }, consultationsController (+4 more)

### Community 29 - "Announcements.jsx"

Cohesion: 0.19
Nodes (13): Announcements(), CATEGORIES, CATEGORY\_COLORS, departmentsData, DEPT\_OPTIONS, EMPTY\_FORM, formatDate(), formatDeptDisplay() (+5 more)

### Community 30 - "token.service.js"

Cohesion: 0.25
Nodes (12): archiveItem(), getArchives(), getArchiveStats(), getAuthHeaders(), getCurrentUser(), permanentDeleteArchive(), restoreItem(), ensureValidToken() (+4 more)

### Community 31 - "examinations.route.js"

Cohesion: 0.16
Nodes (12): { auditLog }, { authorized }, { createExaminationSchema, updateExaminationSchema }, examinationsController, express, router, validateData, createExaminationSchema (+4 more)

### Community 32 - "Record-Management.jsx"

Cohesion: 0.21
Nodes (13): react-dom, ActionMenu(), formatDate(), getFullName(), getInitials(), getStatusStyle(), MONTHS, RecordManagement() (+5 more)

### Community 33 - "SignupForm.jsx"

Cohesion: 0.20
Nodes (7): DEFAULT\_STEPS, LoadingAnimation(), ForgotPassword(), ResetPassword(), VerifyEmail(), AuthLayout(), registerSchema

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

Cohesion: 0.21
Nodes (10): LoginForm(), startTokenRefresh(), createAnnouncementSchema, createAppointmentSchema, createRecordSchema, examinationSchema, getFieldErrors(), loginSchema (+2 more)

### Community 38 - "homepage-users.jsx"

Cohesion: 0.21
Nodes (11): AnnouncementCard(), AnnouncementModal(), CATEGORY\_COLORS, formatApptTime(), formatDate(), HEALTH\_TIPS, HomePageUsers(), HOUR\_SLOTS (+3 more)

### Community 39 - "Records-users.jsx"

Cohesion: 0.26
Nodes (9): clearCache(), fmt(), formatDate(), formatDateTime(), InfoRow(), readCache(), RecordsUsers(), shortenCourse() (+1 more)

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

### Community 45 - "services/notifications.service.js"

Cohesion: 0.27
Nodes (7): DesktopHeader(), UserDashboardLayout(), getCachedUnreadCount(), getUnreadCount(), getUserId(), NOTE: Notifications use the internal users.id (UUID), not Supabase Auth uid, setCachedUnreadCount()

### Community 46 - "Appointments"

Cohesion: 0.18
Nodes (11): Appointments(), IconBuilding(), IconCalendar(), IconCircleCheck(), IconClock(), IconGraduationCap(), IconIdCard(), IconStethoscope() (+3 more)

### Community 47 - "announcements/announcements.service.js"

Cohesion: 0.29
Nodes (7): announcementsCache, archiveHelper, clearCache(), createAnnouncement(), supabase, updateAnnouncement(), uploadImageToStorage()

### Community 48 - "archives.controller.js"

Cohesion: 0.22
Nodes (3): archiveItem(), archivesService, moveToArchives()

### Community 50 - "Datepicker.jsx"

Cohesion: 0.29
Nodes (7): ALL\_YEARS, buildDays(), DatePicker(), getDaysInMonth(), MONTH\_FULL, MONTHS, parseDateValue()

### Community 51 - "auth.service.js"

Cohesion: 0.24
Nodes (8): Dashboard(), SignupForm(), checkIdExists(), getAuthHeaders(), getCurrentUser(), getProfile(), login(), register()

### Community 52 - "Appointment-users.jsx"

Cohesion: 0.27
Nodes (7): AppointmentUsers(), HOUR\_SLOTS, MONTHS, PURPOSES, STATUS\_STYLES, useCurrentPatient(), usePullToRefresh()

### Community 53 - "records.controller.js"

Cohesion: 0.22
Nodes (3): autoArchiveRecords(), recordsService, autoArchiveOldRecords()

### Community 55 - "app.js"

Cohesion: 0.25
Nodes (6): app, cors, express, globalErr, routes, server

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

### Community 65 - "logout"

Cohesion: 0.40
Nodes (4): AdminLayoutWrapper(), App(), root, logout()

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

## Knowledge Gaps

* **408 isolated node(s):** `express`, `globalErr`, `routes`, `cors`, `app` (+403 more)
  These have ≤1 connection - possible missing edges or undocumented components.
* **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

* **Why does** **`dependencies`** **connect** **`dependencies`** **to** **`src/supabase.js`,** **`Record-Management.jsx`,** **`zod`,** **`dependencies`,** **`devDependencies`,** **`DashboardLayout.jsx`,** **`@capacitor/ios`,** **`chart.js`,** **`date-fns`,** **`@emotion/react`,** **`exceljs`,** **`@capacitor/core`,** **`html2canvas`,** **`@ionic/react`,** **`lucide-react`,** **`@mui/material`,** **`react-router-dom`,** **`vite-plugin-compression`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
* **Why does** **`supabase`** **connect** **`src/supabase.js`** **to** **`services/consultations.service.js`,** **`Profile-users.jsx`,** **`Records.jsx`,** **`Dental.jsx`,** **`User-Management.jsx`,** **`Appointments.jsx`,** **`Medical.jsx`,** **`Headers.jsx`,** **`Notifications.jsx`,** **`Consultation-users.jsx`,** **`UserDashboardLayout.jsx`,** **`Announcements.jsx`,** **`token.service.js`,** **`Record-Management.jsx`,** **`homepage-users.jsx`,** **`Records-users.jsx`,** **`services/notifications.service.js`,** **`auth.service.js`,** **`Appointment-users.jsx`,** **`UserNotifications.jsx`,** **`services/announcements.service.js`,** **`AppointmentContext.jsx`,** **`Examinations.jsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
* **Why does** **`react`** **connect** **`DashboardLayout.jsx`** **to** **`Headers.jsx`,** **`services/consultations.service.js`,** **`dependencies`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
* **What connects** **`express`,** **`globalErr`,** **`routes`** **to the rest of the system?**
  _408 weakly-connected nodes found - possible documentation gaps or missing edges._
* **Should** **`src/supabase.js`** **be split into smaller, more focused modules?**
  _Cohesion score 0.055051421657592255 - nodes in this community are weakly interconnected._
* **Should** **`auth.controller.js`** **be split into smaller, more focused modules?**
  _Cohesion score 0.05585106382978723 - nodes in this community are weakly interconnected._
* **Should** **`services/consultations.service.js`** **be split into smaller, more focused modules?**
  _Cohesion score 0.08405797101449275 - nodes in this community are weakly interconnected._

