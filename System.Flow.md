# MediTrack System Data Flow Documentation

## Overview

MediTrack is a cross-platform student health record management system designed to facilitate the administration of medical services within educational institutions. The system enables students to register, book appointments, view medical records, and receive consultations, while clinic staff (doctors, nurses, dentists, administrators) can manage patient records, conduct examinations, and process appointments.

This document provides a comprehensive technical overview of how data flows through the entire MediTrack application, from user authentication through frontend forms to backend API processing and database persistence.

---

## System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | Single Page Application |
| **Styling** | TailwindCSS | Responsive UI design |
| **Routing** | React Router DOM | Client-side navigation |
| **State Management** | React Context API | Cross-component state sharing |
| **Backend API** | Node.js + Express | RESTful API server |
| **Authentication** | Firebase Auth | User authentication |
| **Primary Database** | Firebase Firestore | Real-time NoSQL database |
| **OCR Service** | Python Flask + PaddleOCR | University ID verification |

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Dev) | 3000 | React development server |
| Backend API | 5000 | Node.js Express server |
| OCR Service | 5001 | Python Flask OCR service |

---

## Authentication Flow

### 1. User Registration (SignupForm.jsx)

**File Location:** `frontend/src/features/SignupForm.jsx`

**Flow:**
```
User Input → Client-Side Validation → Backend API → OCR Verification → Firebase Auth → Firestore Storage
```

**Step-by-Step Process:**

1. **User Input Collection**
   - First name, middle initial, last name, suffix
   - Email address
   - University ID number
   - Password and confirmation
   - University ID photo (upload)

2. **Client-Side Validation** (`frontend/src/validation/schemas.js`)
   - Uses Zod schema validation
   - Validates email format, password strength, required fields
   - Real-time field validation with error feedback

3. **Form Submission** (`frontend/src/services/auth.service.js`)
   - Creates FormData object with all fields including image
   - Sends POST request to `/api/users/register`

4. **Backend Processing** (`routes/auth.routes.js` → `controllers/auth.controller.js`)
   - Receives FormData with image file
   - Calls OCR service to verify University ID
   - On successful OCR verification:
     - Creates Firebase Auth user
     - Saves user profile to Firestore `users` collection

**Related Files:**
- `frontend/src/features/SignupForm.jsx` - Registration form UI
- `frontend/src/validation/schemas.js` - Zod validation schemas
- `frontend/src/services/auth.service.js` - Registration API service
- `frontend/src/layouts/AuthLayout.jsx` - Shared auth layout wrapper
- `frontend/src/components/LoadingAnimation.jsx` - OCR scanning animation
- `routes/auth.routes.js` - Registration route definition
- `controllers/auth.controller.js` - Registration controller logic

---

### 2. User Login (LoginForm.jsx)

**File Location:** `frontend/src/features/LoginForm.jsx`

**Flow:**
```
User Credentials → Firebase Auth SDK → Firestore User Profile → LocalStorage → Route Redirect
```

**Step-by-Step Process:**

1. **Credential Submission**
   - User enters email and password
   - Client-side Zod validation confirms format validity

2. **Firebase Authentication**
   - Uses Firebase Auth SDK (`signInWithEmailAndPassword`)
   - Returns user credential with Firebase UID and access token

3. **Profile Retrieval**
   - Queries Firestore `users` collection using Firebase UID as document ID
   - Retrieves complete user profile including role information

4. **Session Persistence**
   - Stores `token` (Firebase access token) in localStorage
   - Stores `role` (student/admin) in localStorage
   - Stores `uid` in localStorage
   - Stores `name` in localStorage
   - Stores complete `user` object in localStorage

5. **Route Redirection**
   - Admin roles (`nurse`, `doctor`, `dentist`, `admin`, `administrator`) → `/dashboard`
   - Student role → `/student/meditrack`

**Related Files:**
- `frontend/src/features/LoginForm.jsx` - Login form UI
- `frontend/src/firebase.js` - Firebase configuration and exports
- `frontend/src/services/auth.service.js` - Auth service methods
- `frontend/src/validation/schemas.js` - Login validation schema
- `frontend/src/layouts/AuthLayout.jsx` - Auth layout wrapper

---

## Application Routing Flow

### Main Router Configuration (App.jsx)

**File Location:** `frontend/src/App.jsx`

**Route Structure:**
```
/login              → LoginForm (Public)
/signup             → SignupForm (Public)
/onboarding         → ProfileSetup (Protected, requires auth)
/dashboard          → DashboardLayout > Dashboard (Admin only)
/records            → DashboardLayout > Records (Admin only)
/appointments       → DashboardLayout > Appointments (Admin only)
/examinations       → DashboardLayout > Examination (Admin only)
/announcements      → DashboardLayout > Announcements (Admin only)
/consultations      → DashboardLayout > Consultations (Admin only)
/users              → DashboardLayout > UserManagement (Admin only)
/student/meditrack  → Meditrack (Student portal)
/*                 → Redirect to /login
```

### Protected Route Guard

**File Location:** `frontend/src/App.jsx` (lines 26-47)

The `ProtectedRoute` component enforces:
1. **Authentication Check**: Validates presence of `token` and `user` in localStorage
2. **Profile Setup Check**: Redirects to `/onboarding` if `isProfileSetup` is false
3. **Role-Based Access**: For admin routes, validates user role contains admin keywords

**Related Files:**
- `frontend/src/App.jsx` - Main routing configuration
- `frontend/src/context/AppointmentContext.jsx` - Global appointment state provider

---

## Student Portal Flow (Meditrack.jsx)

### Entry Point

**File Location:** `frontend/src/features/users/Meditrack.jsx`

**Purpose:** Root orchestrator for the student/patient portal

**State Management:**
- `activeTab` - Current navigation tab
- `preview` - Selected record preview modal
- `showOnboarding` - Profile setup overlay visibility

**Tab Navigation Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  Tab: home     → HomePageUsers                         │
│  Tab: booking  → AppointmentUsers                      │
│  Tab: consult  → ConsultationUsers                     │
│  Tab: records  → RecordsUsers                          │
│  Tab: history → HistoryView (medical logs)            │
│  Tab: account  → ProfileUsers                          │
└─────────────────────────────────────────────────────────┘
```

**Onboarding Guard:**
- Checks `/api/users/profile` endpoint on mount
- If `isProfileSetup` is false, displays `ProfileSetup` overlay

**Related Files:**
- `frontend/src/features/users/Meditrack.jsx` - Student portal root
- `frontend/src/features/users/HomePage-users.jsx` - Home dashboard
- `frontend/src/features/users/Appointment-users.jsx` - Appointment booking
- `frontend/src/features/users/Consultation-users.jsx` - Consultation requests
- `frontend/src/features/users/Records-users.jsx` - Medical records view
- `frontend/src/features/users/Profile-users.jsx` - User profile management
- `frontend/src/layouts/UserDashboardLayout.jsx` - Student layout wrapper
- `frontend/src/components/ProfileSetup.jsx` - Profile completion form

---

## Appointment System Flow

### Context-Based Architecture

**File Location:** `frontend/src/context/AppointmentContext.jsx`

**Design Pattern:** React Context API with Firestore real-time listener

**Flow:**
```
Firestore onSnapshot → Real-time sync → Shared state → Both clinic & patient views
```

**Provider Wrapping:** `AppointmentProvider` wraps the entire `App` component, enabling both admin and student views to share identical appointment data.

### Core Functions

| Function | Called By | Operation |
|----------|-----------|------------|
| `submitRequest()` | Patient side | Adds new pending appointment to Firestore |
| `approveAppointment()` | Clinic side | Updates status to approved with schedule |
| `declineAppointment()` | Clinic side | Deletes rejected appointment |
| `markDone()` | Clinic side | Marks appointment as completed |
| `getPatientAppointments()` | Patient side | Filters appointments by patient ID |

### Data Structure (Firestore)

**Collection:** `appointments`

```javascript
{
  name: string,           // Patient full name
  idno: string,            // University ID number
  type: string,           // Appointment type
  dept: string,           // Department
  prog: string,           // Program/Course
  section: string,        // Section
  reason: string,         // Reason for visit
  status: string,         // 'pending' | 'approved' | 'done'
  bookedAt: timestamp,    // When request was made
  year: number,           // Approved appointment year (clinic-set)
  month: number,          // Approved appointment month (clinic-set)
  day: number,            // Approved appointment day (clinic-set)
  time: string            // Approved appointment time (clinic-set)
}
```

**Related Files:**
- `frontend/src/context/AppointmentContext.jsx` - Appointment state management
- `frontend/src/services/appointments.service.js` - REST API service
- `frontend/src/features/admin-clinic/Appointments.jsx` - Clinic appointment management
- `frontend/src/features/users/Appointment-users.jsx` - Patient appointment booking

---

## Admin Dashboard Flow

### Dashboard Overview (Dashboard.jsx)

**File Location:** `frontend/src/features/admin-clinic/Dashboard.jsx`

**Features:**
1. **Statistics Cards**
   - Total patients count
   - Today's appointments
   - Upcoming this week
   - Clearances issued this month

2. **Health Analytics Charts** (using Chart.js)
   - Line chart: Case records over time (trend analysis)
   - Doughnut chart: Disease distribution
   - Bar chart: Patient type breakdown (student/instructor/staff)

3. **Visit Trends**
   - Today, this week, this month, average/day statistics

4. **Activity & Alerts**
   - Recent activity log
   - System notifications and alerts

**Data Source:** Uses mock data with `peopleData`, `appointments`, and `auditLogs` arrays. In production, this would connect to Firestore collections.

**Related Files:**
- `frontend/src/features/admin-clinic/Dashboard.jsx` - Main dashboard
- `frontend/src/features/admin-clinic/Records.jsx` - Patient records management
- `frontend/src/features/admin-clinic/Appointments.jsx` - Appointment management
- `frontend/src/features/admin-clinic/Examinations.jsx` - Examination forms
- `frontend/src/features/admin-clinic/Announcements.jsx` - Announcement management
- `frontend/src/features/admin-clinic/Consultations.jsx` - Consultation records
- `frontend/src/features/admin-clinic/User-Management.jsx` - User account management

---

## Layout Architecture

### Admin/Clinic Layout (DashboardLayout.jsx)

**File Location:** `frontend/src/layouts/DashboardLayout.jsx`

**Desktop Structure:**
```
┌────────────────────────────────────────┐
│  DesktopHeader (gradient topbar)       │
├────────────────────────────────────────┤
│  DesktopNav (white link bar)           │
├────────────────────────────────────────┤
│  <main> scrollable content area        │
└────────────────────────────────────────┘
```

**Mobile Structure:**
```
┌──────────────────────┐
│  MobileHeader (64px) │ ← sticky topbar
├──────────────────────┤
│                      │
│  scrollable children │ ← pt-[64px] pb-[70px]
│                      │
├──────────────────────┤
│  MobileNav (70px)    │ ← fixed bottom tabs
└──────────────────────┘
```

**Navigation Items:**
| ID | Label | Route |
|----|-------|-------|
| dashboard | Home | /dashboard |
| records | Records | /records |
| appointments | Schedule | /appointments |
| consultations | Consult | /consultations |
| users | Users | /users |

**Related Files:**
- `frontend/src/layouts/DashboardLayout.jsx` - Admin layout wrapper
- `frontend/src/components/Headers.jsx` - Header and navigation components
- `frontend/src/components/Sidebar.jsx` - Desktop sidebar

---

## Records Management Flow

### Admin Records View (Records.jsx)

**File Location:** `frontend/src/features/admin-clinic/Records.jsx`

**Three-Column Layout:**
```
┌────────────┬────────────┬──────────────────┐
│ Departments│ People    │ Clinical Profile │
│ (1.2)      │ (1.5)     │ (2.2)            │
├────────────┼────────────┼──────────────────┤
│ List of    │ Filtered  │ Selected user   │
│ departments│ people   │ medical details │
└────────────┴────────────┴──────────────────┘
```

**Data Flow:**
1. Fetches all documents from Firestore `users` collection
2. Normalizes data to standard display format
3. Groups by department
4. On person selection, displays complete clinical profile

**Actions:**
- View patient details
- Navigate to examination forms (`/examinations?patientId={uid}`)
- Add new health records

**Related Files:**
- `frontend/src/features/admin-clinic/Records.jsx` - Records management
- `frontend/src/features/admin-clinic/Examinations.jsx` - Examination entry point
- `frontend/src/features/admin-clinic/Examination/Medical.jsx` - Medical exam form
- `frontend/src/features/admin-clinic/Examination/Dental.jsx` - Dental exam form
- `frontend/src/services/records.service.js` - Records API service

---

## Data Service Layers

### Frontend Services

| Service File | Purpose | Key Methods |
|--------------|---------|-------------|
| `auth.service.js` | Authentication | `register()`, `login()`, `getCurrentUser()`, `logout()` |
| `users.service.js` | User management | CRUD operations for user profiles |
| `appointments.service.js` | Appointment API | `getAllAppointments()`, `createAppointment()`, etc. |
| `records.service.js` | Medical records | `getRecords()`, `createRecord()`, etc. |
| `examinations.service.js` | Examination data | `submitExamination()`, `getExaminations()` |
| `announcements.service.js` | Announcements | `getAnnouncements()`, `createAnnouncement()` |

### Backend Routes

**File Location:** `routes/index.js`

```
/api/auth/*        → Authentication (legacy)
/api/users/*       → User management
/api/user/profile-setup/* → Profile setup
/api/records/*     → Medical records
/api/appointments/* → Appointments
/api/examinations/* → Examinations
/api/announcements/* → Announcements
```

### Backend Feature Modules

Each feature follows a consistent structure:
```
features/{feature}/
  ├── {feature}.route.js      # Express route definitions
  ├── {feature}.controller.js # Request handling logic
  ├── {feature}.service.js    # Business logic
  ├── {feature}.schema.js     # Data schemas
  └── {feature}.validation.js # Input validation
```

---

## Database Collections

### Firestore Schema

| Collection | Document ID | Key Fields |
|------------|-------------|------------|
| `users` | Firebase UID | firstName, lastName, email, role, universityId, program, yearLevel, section, department, age, gender, birthdate, phoneNumber, emergencyContact, vaccinations, isProfileSetup |
| `appointments` | Auto-generated | name, idno, type, dept, prog, section, reason, status, bookedAt, year, month, day, time |
| `records` | Auto-generated | patientId, examinationDate, diagnosis, treatment, notes, examinerId |
| `examinations` | Auto-generated | patientId, type, date, findings, prescription, followUp |
| `announcements` | Auto-generated | title, content, targetAudience, createdAt, expiresAt, authorId |

---

## Validation Schemas

**File Location:** `frontend/src/validation/schemas.js`

Uses **Zod** for schema-based validation:

| Schema | Fields | Validation Rules |
|--------|--------|------------------|
| `loginSchema` | email, password | Email format, min password length |
| `registerSchema` | firstName, lastName, email, universityId, password, confirmPassword | All required, email format, password match |
| `profileSchema` | firstName, lastName, age, gender, department | Required fields, valid values |

**Helper Functions:**
- `getFieldErrors(schema, formData)` - Returns validation errors for display
- `schema.safeParse(data)` - Validates and returns success/error state

---

## Environment Configuration

### Environment Variables Required

```bash
# Backend (.env)
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001
PORT=5000
FIREBASE_API_KEY=your_firebase_web_api_key

# Frontend (.env)
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
```

---

## Key Entry Points Summary

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Frontend Entry | `frontend/src/main.jsx` | React app initialization |
| Routing | `frontend/src/App.jsx` | Route definitions and guards |
| Auth Entry | `frontend/src/features/LoginForm.jsx` | User login |
| Auth Entry | `frontend/src/features/SignupForm.jsx` | User registration |
| Admin Portal | `frontend/src/features/admin-clinic/Dashboard.jsx` | Clinic dashboard |
| Student Portal | `frontend/src/features/users/Meditrack.jsx` | Student health portal |
| Global State | `frontend/src/context/AppointmentContext.jsx` | Appointment state |
| Backend Entry | `backend/app.js` | Express server initialization |
| API Routes | `routes/index.js` | Route aggregation |
| Auth Controller | `controllers/auth.controller.js` | Auth logic |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────┐                 │
│  │ LoginForm   │────▶│ firebase.js │────▶│ Firebase Auth│                 │
│  │ SignupForm  │     │ (SDK Config)│     │ (Authentication)              │
│  └─────────────┘     └─────────────┘     └──────────────┘                 │
│         │                                        │                          │
│         ▼                                        ▼                          │
│  ┌─────────────┐                        ┌──────────────┐                  │
│  │ auth.service│                        │ Firestore DB │                  │
│  │ .js         │                        │ (User Profile)                  │
│  └─────────────┘                        └──────────────┘                  │
│         │                                        │                          │
│         ▼                                        ▼                          │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │           App.jsx (Routing + Guards)                │                   │
│  └─────────────────────────────────────────────────────┘                   │
│         │                                                    │             │
│         ▼                                                    ▼             │
│  ┌──────────────────────────────────────────────────────────┐              │
│  │         AppointmentContext.jsx (Global State)           │              │
│  │  ┌────────────────────────────────────────────────────┐ │              │
│  │  │   onSnapshot Listener → Firestore appointments   │ │              │
│  │  └────────────────────────────────────────────────────┘ │              │
│  └──────────────────────────────────────────────────────────┘              │
│         │                                                    │             │
│         ▼                                                    ▼             │
│  ┌─────────────────────┐              ┌─────────────────────────┐         │
│  │  Student Portal     │              │    Admin Portal         │         │
│  │  Meditrack.jsx      │              │    Dashboard.jsx       │         │
│  │  ├─ HomePageUsers   │              │    ├─ Records.jsx      │         │
│  │  ├─ AppointmentUsers│              │    ├─ Appointments.jsx  │         │
│  │  ├─ ConsultationUsers              │    ├─ Examinations.jsx  │         │
│  │  ├─ RecordsUsers │              │    ├─ Consultations.jsx  │         │
│  │  └─ ProfileUsers │              │    └─ Announcements.jsx │         │
│  └─────────────────────┘              └─────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                     │
          ▼                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Node.js)                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐      ┌──────────────┐      ┌─────────────────┐      │
│  │ routes/index.js│─────▶│ controllers/ │─────▶│ features/       │      │
│  │ (Route Router) │      │ *.controller │      │ */{feature}.*   │      │
│  └────────────────┘      └──────────────┘      └─────────────────┘      │
│                                    │                      │                │
│                                    ▼                      ▼                │
│                           ┌──────────────┐      ┌─────────────┐            │
│                           │ auth.controller            │ OCR Service  │            │
│                           │ (Registration) │      │ (Python     │            │
│                           └──────────────┘      │  Flask +    │            │
│                                                 │  PaddleOCR) │            │
│                                                 └─────────────┘            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

This document provides a comprehensive overview of the MediTrack system's data flow architecture. The application follows a modern, component-based architecture with clear separation of concerns:

1. **Authentication** is handled by Firebase Auth with profile storage in Firestore
2. **State Management** uses React Context for shared appointment data across views
3. **Routing** enforces role-based access control through protected route guards
4. **Data Persistence** leverages Firestore's real-time capabilities for instant synchronization
5. **Validation** uses Zod schemas for robust client-side form validation
6. **API Structure** follows a modular feature-based organization pattern

For developers working on this project, understanding these flows will enable effective navigation, debugging, and feature development across the entire MediTrack application stack.