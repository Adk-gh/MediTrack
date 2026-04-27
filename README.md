# MediTrack - Student Health Record Management System

A comprehensive cross-platform student health record management system for educational institutions. MediTrack enables efficient management of student health records, appointments, medical examinations, and announcements through a modern, responsive web interface.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Validation](#validation)
- [Frontend Services](#frontend-services)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

---

## Overview

MediTrack is designed to streamline the management of student health records in educational institutions. It provides:

- **Student Health Portal**: Students can view their medical history, clinic status, and health profiles
- **Admin Dashboard**: Staff can manage records, appointments, examinations, and announcements
- **OCR Integration**: Automated student ID verification through OCR technology
- **Multi-platform Support**: Web, Desktop (Electron), and Mobile (Capacitor) deployments

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore (primary), SQLite (offline mode)
- **Authentication**: Firebase Auth + JWT
- **Validation**: Zod

### OCR Service
- **Runtime**: Python
- **Framework**: Flask
- **OCR Engine**: PaddleOCR

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: TailwindCSS
- **Charts**: Chart.js
- **Validation**: Zod
- **Build Tools**: Electron (desktop), Capacitor (mobile)

### Development Tools
- **Testing**: Jest (JS), PyTest (Python)
- **Packaging**: Electron Builder, Capacitor CLI
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions, Firebase CI

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MediTrack                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │   Frontend  │────▶│  Node.js    │────▶│  Firebase   │               │
│  │   (React)   │◀────│   Backend   │◀────│  Firestore   │               │
│  └─────────────┘     └─────────────┘     └─────────────┘               │
│         │                   │                   │                        │
│         │                   │                   │                        │
│         ▼                   ▼                   ▼                        │
│  ┌─────────────┐     ┌─────────────┐                                  │
│  │   Electron  │     │   Python    │                                  │
│  │  (Desktop) │     │   OCR API   │                                  │
│  │             │     │  (Paddle)  │                                  │
│  └─────────────┘     └─────────────┘                                  │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  Capacitor  │                                                       │
│  │  (Mobile)  │                                                       │
│  └─────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **Registration**: Email/password + student ID image → OCR verification → Firebase Auth + Firestore
2. **Login**: Firebase Auth REST API → JWT token returned
3. **Protected Routes**: Use `authorized` middleware for JWT verification

---

## Project Structure

```
MediTrack/
├── app.js                      # Main Node.js entry point
├── CLAUDE.md                   # Project guidelines for AI
├── README.md                   # This file
│
├── backend/
│   └── ocr_service/            # Python OCR service
│       ├── ocr_service.py      # Flask OCR API
│       └── venv_ocr/           # Python virtual environment
│
├── configs/                    # Configuration files
│   ├── firebase-admin.js       # Firebase Admin SDK
│   ├── cors.js                 # CORS configuration
│   └── token.js                # Token management
│
├── controllers/                # Controller logic
│   └── auth.controller.js
│
├── features/                  # Feature modules (MVC pattern)
│   ├── user/                  # User authentication & profile
│   │   ├── user.controller.js
│   │   ├── user.route.js
│   │   ├── user.schema.js
│   │   ├── user.service.js
│   │   └── user.validation.js
│   ├── records/               # Health records management
│   ├── appointments/         # Appointment scheduling
│   ├── examinations/        # Medical examinations
│   └── announcements/      # System announcements
│
├── middleware/                # Express middleware
│   ├── authorized.js        # JWT authentication
│   └── global-err.js        # Error handling
│
├── models/                   # Data models
│   └── user.js
│
├── routes/                   # Route definitions
│   ├── index.js             # Main router
│   └── auth.routes.js       # Auth routes
│
├── utils/                    # Utility functions
│
├── validation/              # Validation schemas
│   └── validate-data.js     # Zod validation middleware
│
└── frontend/                # React frontend
    ├── public/
    ├── src/
    │   ├── components/      # Reusable components
    │   │   ├── LoginForm.jsx
    │   │   ├── SignupForm.jsx
    │   │   ├── ProfileSetup.jsx
    │   │   └── HealthProfileSetup.jsx
    │   ├── features/        # Page components
    │   │   ├── Dashboard.jsx
    │   │   ├── Records.jsx
    │   │   ├── Appointments.jsx
    │   │   ├── Examinations.jsx
    │   │   ├── Announcements.jsx
    │   │   └── Meditrack.jsx
    │   ├── layouts/        # Layout components
    │   │   ├── DashboardLayout.jsx
    │   │   ├── Header.jsx
    │   │   ├── Headers.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── AuthLayout.jsx
    │   ├── services/        # API services
    │   │   ├── auth.service.js
    │   │   ├── records.service.js
    │   │   ├── appointments.service.js
    │   │   ├── examinations.service.js
    │   │   ├── announcements.service.js
    │   │   └── users.service.js
    │   ├── validation/      # Frontend validation
    │   │   └── schemas.js   # Zod schemas
    │   ├── App.jsx          # Main app with routing
    │   ├── main.jsx        # Entry point
    │   └── index.css       # Global styles
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Features

### User Features
- **Registration**: Email/password with student ID OCR verification
- **Login**: Email/password or Firebase OAuth (Google/Facebook)
- **Profile Management**: View and update health profiles
- **Medical History**: View personal medical records and logs

### Admin Features (Dashboard)
- **Dashboard Overview**: Statistics, charts, recent activities
- **Records Management**: CRUD operations for health records
- **Appointment Scheduling**: Calendar-based appointment management
- **Medical Examinations**: Multi-phase examination forms (History → Clinical)
- **Announcements**: Create, edit, delete system announcements

### Mobile Features (Meditrack)
- **Home View**: Clinic status, visit count, blood type, recent activity
- **History View**: Medical logs with document preview
- **Profile View**: Health profile registration form

---

## API Endpoints

### Authentication
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/signup` | Register with OCR-verified student ID | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/users/register` | Register with email/password | No |
| POST | `/api/users/login` | Login with email/password | No |
| POST | `/api/users/firebase-auth` | Firebase OAuth login | No |
| GET | `/api/users/profile` | Get user profile | Required |

### Health Records
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/records` | Get all records | Required |
| GET | `/api/records/:id` | Get record by ID | Required |
| POST | `/api/records` | Create new record | No |
| PUT | `/api/records/:id` | Update record | No |
| DELETE | `/api/records/:id` | Delete record | Required |

### Appointments
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/appointments` | Get all appointments | Required |
| GET | `/api/appointments/date/:date` | Get appointments by date | Required |
| POST | `/api/appointments` | Create appointment | No |
| PUT | `/api/appointments/:id` | Update appointment | No |
| DELETE | `/api/appointments/:id` | Delete appointment | Required |

### Examinations
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/examinations` | Get all examinations | Required |
| GET | `/api/examinations/:id` | Get examination by ID | Required |
| POST | `/api/examinations` | Create examination | No |
| PUT | `/api/examinations/:id` | Update examination | No |
| DELETE | `/api/examinations/:id` | Delete examination | Required |

### Announcements
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/announcements` | Get all announcements | No |
| GET | `/api/announcements/:id` | Get announcement by ID | - |
| POST | `/api/announcements` | Create announcement | No |
| PUT | `/api/announcements/:id` | Update announcement | No |
| DELETE | `/api/announcements/:id` | Delete announcement | Required |

### OCR Service
| Method | Route | Description |
|--------|-------|-------------|
| POST | `http://localhost:5001/ocr` | Process image for OCR |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+
- MongoDB (optional, using Firebase)
- Firebase Project

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MediTrack
```

### 2. Backend Setup

```bash
# Install Node.js dependencies
npm install

# Start the backend server
node app.js
```

The backend runs on `http://localhost:5000`

### 3. OCR Service Setup (Windows)

```bash
cd backend/ocr_service
.\venv_ocr\Scripts\Activate.ps1
python ocr_service.py
```

The OCR service runs on `http://localhost:5001`

For production:
```bash
gunicorn -w 2 -b 0.0.0.0:5001 ocr_service:app
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000`

For development with hot reload:
```bash
npm run dev
```

### 5. Build for Desktop (Electron)

```bash
npm run electron:build
```

### 6. Build for Mobile (Capacitor)

```bash
npm run capacitor:add
npm run capacitor:build
```

---

## Environment Variables

### Backend (.env)

```env
# Required
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001
PORT=5000

# Firebase (create in Firebase Console)
FIREBASE_API_KEY=your_firebase_web_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Database (optional - using Firebase Firestore)
MONGO_URI=mongodb://localhost:27017/meditrack
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
```

---

## Validation

The project uses **Zod** for validation in both backend and frontend.

### Backend Validation Schemas

Located in `features/*/validation.js`:
- `user.validation.js` - Register, login, firebase auth
- `records.validation.js` - Create, update records
- `appointments.validation.js` - Create, update appointments
- `examinations.validation.js` - Create, update examinations
- `announcements.validation.js` - Create, update announcements

### Frontend Validation Schemas

Located in `frontend/src/validation/schemas.js`:
- `registerSchema` - User registration
- `loginSchema` - User login
- `createRecordSchema` - Health records
- `createAppointmentSchema` - Appointments
- `examinationSchema` - Medical examinations
- `createAnnouncementSchema` - Announcements

---

## Frontend Services

The frontend uses service modules to communicate with the backend API:

| Service | Description |
|---------|-------------|
| `auth.service.js` | Authentication (register, login, logout) |
| `users.service.js` | User profile management |
| `records.service.js` | Health records CRUD |
| `appointments.service.js` | Appointments CRUD |
| `examinations.service.js` | Examinations CRUD |
| `announcements.service.js` | Announcements CRUD |

Each service includes:
- API calls with proper headers
- Token-based authentication
- Error handling
- Fallback data for offline scenarios

---

## Database Schema

### Firestore Collections

#### users
```javascript
{
  id: string,           // Firestore document ID
  uid: string,          // Firebase Auth UID
  name: string,
  email: string,
  password: string,     // Hashed
  provider: "local" | "google" | "facebook",
  avatar: string,
  isVerified: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### records
```javascript
{
  id: string,
  patientId: string,
  name: string,
  type: "student" | "instructor" | "staff",
  department: string,
  history: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### appointments
```javascript
{
  id: string,
  patientId: string,
  name: string,
  type: "student" | "instructor" | "staff",
  day: number,
  time: string,
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled",
  createdAt: timestamp
}
```

#### examinations
```javascript
{
  id: string,
  patientId: string,
  lastName: string,
  firstName: string,
  middleName: string,
  // ... personal info
  // ... medical conditions
  // ... vital signs (bp, pr, rr, temp, wt, ht, waist)
  // ... logs array
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### announcements
```javascript
{
  id: string,
  title: string,
  content: string,
  dept: string,
  date: string,
  createdAt: timestamp
}
```

---

## UI/UX Guidelines

- **Design System**: Modern, clean aesthetics with responsive layouts
- **Color Palette**:
  - Primary: `#466460` (Deep teal)
  - Secondary: `#81b29a` (Sage green)
  - Accent: `#e07a5f` (Terracotta)
- **Typography**: Inter (desktop), DM Sans (mobile)
- **Animations**: Smooth transitions using CSS animations and Tailwind
- **Mobile-first**: Optimized for both desktop and mobile views

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software for educational institution use.

---

## Support

For issues or questions:
- Check the [CLAUDE.md](./CLAUDE.md) for detailed project guidelines
- Review API documentation in this README
- Contact the development team