# MediTrack Project Guidelines

## Project Overview

Cross-platform student health record management system.

- **Backend**: Node.js + Express + Firebase Admin SDK (Firestore)
- **OCR Service**: Python Flask + PaddleOCR (port 5001)
- **Frontend**: React + Vite + React Router + TailwindCSS + Chart.js

## Commands

### Backend (port 5000)
```bash
node app.js
```

### OCR Service (port 5001)
```bash
cd backend/ocr_service
.\venv_ocr\Scripts\Activate.ps1
python ocr_service.py
# Production: gunicorn -w 2 -b 0.0.0.0:5001 ocr_service:app
```

### Frontend (port 3000)
```bash
cd frontend
npm start
# or for dev: npm run dev
```

### Linting
```bash
cd frontend
npm run lint
```

## Architecture

### Backend Structure
```
routes/          # Route definitions (auth.routes.js, index.js)
controllers/     # Controller logic (auth.controller.js)
features/        # User feature module with validation, schema, routes, controller, service
configs/         # Configuration (firebase-admin.js, database.js, cors.js, token.js)
middleware/      # Middleware (authorized.js, global-err.js)
models/          # Data models (user.js)
validation/      # Validation schemas
```

### Authentication Flow
1. **Registration**: Email/password + student ID image -> OCR verification -> Firebase Auth + Firestore
2. **Login**: Firebase Auth REST API -> JWT token returned
3. **Protected Routes**: Use `authorized` middleware for JWT verification

### API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/signup | Register with OCR-verified student ID |
| POST | /api/auth/login | Login with email/password |
| POST | /api/users/register | Register with email/password |
| POST | /api/users/login | Login with email/password |
| POST | /api/users/firebase-auth | Firebase OAuth login |
| GET | /api/users/profile | Get user profile (auth required) |
| POST | http://localhost:5001/ocr | OCR processing |

### Frontend Structure
```
frontend/src/
  features/       # Page components (Dashboard, Records, Appointments, Examinations, Announcements)
  components/     # Reusable components (LoginForm, SignupForm, ProfileSetup, HealthProfileSetup)
  layouts/        # Layout components (Header, Sidebar, DashboardLayout, AuthLayout)
  services/       # API services (auth.service.js)
  App.jsx         # Main app with routing
  main.jsx        # Entry point
```

## Key Configuration

### Environment Variables (.env)
```

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001
PORT=5000
FIREBASE_API_KEY=your_firebase_web_api_key
```

### Firebase
- Uses Firebase Admin SDK for server-side operations
- Uses Firebase Auth REST API for client authentication
- Firestore database for user profiles

## UI/UX Guidelines
- Prioritize modern UI/UX design, clean aesthetics, and responsive layouts
- Use TailwindCSS for styling
- Implement smooth animations for transitions and interactions
-  use Zod Validation

## Software Requirements:for MediTrack

- Development Environment (IDE): 
- Visual Studio Code

- Frontend:
- Framework: React.js
- UI library: tailwindcss
- IONIC react since im trying to build a crossplatform meditrack system.


- Backend Environment: 
- Primary Backend: node.js 
- Secondary Backend: Python OCR 
- backend is Integrated with Electron


- Database: 
- Firebase Firestore
- SQLite for offline mode 

- Deployment & Hosting: 
- Desktop: Electron builds packaged with electron-builder,
- Mobile: Capacitor builds deployed via Android Studio,firebase hosting web dashboard, 
- Vercel(maybe render) backend API, 
- Docker

- Development tools:
- Testing: Jest (JS), PyTest (Python).
- Packaging: Electron Builder, Capacitor CLI.
- Version Control: Git + GitHub/GitLab
- Testing: Jest (JS), PyTest (Python OCR)
- API Testing: Postman / REST Client in VS Code
- CI/CD: GitHub Actions or Firebase CI for automated deploys
- Security: Token management (token.js), CORS setup (cors.js).
