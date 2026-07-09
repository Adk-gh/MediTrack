# MediTrack Technology Stack Analysis

This document provides a comprehensive analysis of all packages, frameworks, and technologies used in the MediTrack project across all three components: Backend, Frontend, and OCR Service. It also lists technologies mentioned in the project requirements that are not currently implemented.

***

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend (Node.js + Express)](#backend-nodejs--express)
3. [Frontend (React + Vite + Ionic)](#frontend-react--vite--ionic)
4. [OCR Service (Python Flask)](#ocr-service-python-flask)
5. [Technologies Not Yet Implemented](#technologies-not-yet-implemented)
6. [Recommendations](#recommendations)

***

## Project Overview

MediTrack is a cross-platform student health record management system consisting of:

| Component   | Technology               | Port |
| ----------- | ------------------------ | ---- |
| Backend     | Node.js + Express        | 5000 |
| Frontend    | React + Vite + Ionic     | 3000 |
| OCR Service | Python Flask + PaddleOCR | 5001 |

***

## Backend (Node.js + Express)

### Location

`C:\Users\HP\MediTrack\package.json`

### Currently Used Packages

| Package                 | Version  | Purpose                                                    |
| ----------------------- | -------- | ---------------------------------------------------------- |
| `@supabase/supabase-js` | ^2.106.2 | Supabase client for database operations and authentication |
| `axios`                 | ^1.16.0  | HTTP client for external API calls                         |
| `cors`                  | ^2.8.6   | Cross-Origin Resource Sharing middleware                   |
| `dotenv`                | ^17.4.2  | Environment variable management                            |
| `express`               | ^5.2.1   | Web application framework                                  |
| `jsonwebtoken`          | ^9.0.3   | JWT token generation and verification                      |
| `multer`                | ^2.1.1   | File upload handling                                       |
| `zod`                   | ^4.4.3   | Schema validation                                          |

### How Each Package is Used

| Package                 | Usage                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/supabase-js` | Used in `configs/database.js` and `configs/token.js` to interact with Supabase PostgreSQL database and handle authentication |
| `axios`                 | Used for making HTTP requests to OCR service and other external APIs                                                         |
| `cors`                  | Configured in `configs/cors.js` to allow frontend access to backend API                                                      |
| `dotenv`                | Loads environment variables from `.env` file                                                                                 |
| `express`               | Main framework for building REST API routes, controllers, and middleware                                                     |
| `jsonwebtoken`          | Generates JWT tokens for authenticated users in `configs/token.js`                                                           |
| `multer`                | Handles file uploads (student ID images) in routes                                                                           |
| `zod`                   | Used in `features/user/user.validation.js` for input validation                                                              |

### Package Structure in Backend

```
backend/
├── configs/          # Configuration files (database.js, cors.js, token.js)
├── controllers/      # Controller logic
├── features/         # Feature modules (user module with validation, routes, controller, service)
├── middleware/      # Custom middleware (authorized.js, global-err.js)
├── models/           # Data models
├── routes/           # Route definitions
└── app.js           # Main application entry point
```

### Not Used (But Available in Node.js Ecosystem)

| Package             | Category    | Purpose                                       | Recommendation                     |
| ------------------- | ----------- | --------------------------------------------- | ---------------------------------- |
| `bcrypt`            | Security    | Password hashing (if not using Supabase Auth) | Not needed - Supabase handles auth |
| `helmet`            | Security    | HTTP security headers                         | Consider adding                    |
| `express-validator` | Validation  | Additional validation middleware              | Not needed - Zod is sufficient     |
| `cookie-parser`     | Middleware  | Cookie handling                               | Not needed - using JWT in headers  |
| `morgan`            | Logging     | HTTP request logging                          | Consider adding for debugging      |
| `compression`       | Performance | Response compression                          | Not needed for dev                 |
| `pg`                | Database    | PostgreSQL client                             | Not needed - using Supabase SDK    |
| `socket.io`         | Real-time   | WebSocket communication                       | Consider for real-time features    |
| `joi`               | Validation  | Alternative validation library                | Not needed - Zod is used           |
| `winston`           | Logging     | Advanced logging                              | Consider for production logging    |
| `dotenv-cli`        | Dev         | Extended dotenv functionality                 | Not needed - current dotenv works  |
| `nodemon`           | Dev         | Auto-restart on file changes                  | Consider adding                    |

***

## Frontend (React + Vite + Ionic)

### Location

`C:\Users\HP\MediTrack\frontend\package.json`

### Currently Used Packages (Dependencies)

| Package                   | Version  | Purpose                                  |
| ------------------------- | -------- | ---------------------------------------- |
| `@capacitor/android`      | ^8.3.4   | Capacitor Android platform support       |
| `@capacitor/core`         | ^8.3.4   | Core Capacitor runtime                   |
| `@capacitor/ios`          | ^8.3.4   | Capacitor iOS platform support           |
| `@emotion/react`          | ^11.14.0 | CSS-in-JS library (MUI dependency)       |
| `@emotion/styled`         | ^11.14.1 | Styled components (MUI dependency)       |
| `@ionic/react`            | ^8.8.7   | Ionic React components                   |
| `@mui/material`           | ^9.0.1   | Material-UI component library            |
| `@supabase/supabase-js`   | ^2.106.2 | Supabase client                          |
| `axios`                   | ^1.7.0   | HTTP client                              |
| `chart.js`                | ^4.5.1   | Charting library                         |
| `date-fns`                | ^4.1.0   | Date manipulation                        |
| `html2canvas`             | ^1.4.1   | Convert HTML to canvas (for screenshots) |
| `jspdf`                   | ^4.2.1   | PDF generation                           |
| `lucide-react`            | ^1.17.0  | Icon library                             |
| `react`                   | ^19.0.0  | React core library                       |
| `react-chartjs-2`         | ^5.3.1   | React wrapper for Chart.js               |
| `react-datepicker`        | ^9.1.0   | Date picker component                    |
| `react-dom`               | ^19.0.0  | React DOM rendering                      |
| `react-router-dom`        | ^7.0.0   | React Router for navigation              |
| `vite-plugin-compression` | ^0.5.1   | Compression plugin for Vite              |
| `yup`                     | ^1.7.1   | Form validation schema builder           |
| `zod`                     | ^4.3.6   | Schema validation                        |

### Currently Used Packages (DevDependencies)

| Package                       | Version  | Purpose                                |
| ----------------------------- | -------- | -------------------------------------- |
| `@capacitor/cli`              | ^8.3.4   | Capacitor CLI for building mobile apps |
| `@eslint/js`                  | ^9.0.0   | ESLint JavaScript support              |
| `@types/react`                | ^19.0.0  | TypeScript types for React             |
| `@types/react-dom`            | ^19.0.0  | TypeScript types for React DOM         |
| `@vitejs/plugin-react`        | ^4.3.0   | Vite React plugin                      |
| `autoprefixer`                | ^10.4.19 | CSS autoprefixer                       |
| `eslint`                      | ^9.0.0   | JavaScript linter                      |
| `eslint-plugin-react-hooks`   | ^5.0.0   | ESLint React Hooks rules               |
| `eslint-plugin-react-refresh` | ^0.4.10  | ESLint React refresh plugin            |
| `globals`                     | ^15.0.0  | Global identifiers for ESLint          |
| `postcss`                     | ^8.4.38  | CSS post-processor                     |
| `tailwindcss`                 | ^3.4.3   | CSS utility framework                  |
| `vite`                        | ^6.0.0   | Build tool and dev server              |

### How Each Package is Used

| Package                                 | Usage                                                        |
| --------------------------------------- | ------------------------------------------------------------ |
| `@capacitor/core`                       | Provides native functionality bridge for mobile apps         |
| `@capacitor/android` / `@capacitor/ios` | Platform-specific builds for mobile deployment               |
| `@ionic/react`                          | Cross-platform UI components following Ionic design patterns |
| `@mui/material`                         | Material Design UI components (used alongside Ionic)         |
| `@emotion/react` / `@emotion/styled`    | Styling engine for MUI components                            |
| `@supabase/supabase-js`                 | Authentication and database operations                       |
| `axios`                                 | HTTP requests to backend API                                 |
| `chart.js` / `react-chartjs-2`          | Dashboard charts and data visualization                      |
| `date-fns`                              | Date formatting and manipulation                             |
| `html2canvas` / `jspdf`                 | Generate PDF reports from health records                     |
| `lucide-react`                          | Icon set for UI elements                                     |
| `react-router-dom`                      | Client-side routing between pages                            |
| `tailwindcss`                           | Utility-first CSS styling                                    |
| `yup`                                   | Form validation schema alongside Zod                         |
| `zod`                                   | Runtime type validation                                      |
| `vite`                                  | Development server and build tool                            |
| `@vitejs/plugin-react`                  | Enables React Fast Refresh during development                |

### Package Structure in Frontend

```
frontend/src/
├── features/       # Page components (Dashboard, Records, Appointments, etc.)
├── components/     # Reusable components (LoginForm, SignupForm, etc.)
├── layouts/        # Layout components (Header, Sidebar, etc.)
├── services/       # API services (auth.service.js)
├── App.jsx         # Main app with routing
└── main.jsx       # Entry point
```

### Not Used (But Available in React Ecosystem)

| Package                          | Category             | Purpose                  | Recommendation                          |
| -------------------------------- | -------------------- | ------------------------ | --------------------------------------- |
| `react-redux`                    | State Management     | Global state management  | Not needed - using component state      |
| `@reduxjs/toolkit`               | State Management     | Redux utilities          | Not needed                              |
| `@tanstack/react-query`          | Data Fetching        | Server state management  | Consider for complex data               |
| `@tanstack/react-query-devtools` | Debugging            | React Query devtools     | Not needed without react-query          |
| `react-hook-form`                | Forms                | Form handling            | Consider for complex forms              |
| `react-icons`                    | Icons                | Alternative icon library | Not needed - Lucide is sufficient       |
| `framer-motion`                  | Animations           | Animation library        | Consider for UI polish                  |
| `react-toastify`                 | Notifications        | Toast notifications      | Consider adding                         |
| `axios-cache-interceptor`        | Performance          | Request caching          | Not needed for MVP                      |
| `lodash`                         | Utilities            | Utility functions        | Not needed - native JS sufficient       |
| `clsx`                           | Utilities            | Conditional class names  | Not needed - template literals work     |
| `date-fns`                       | Date                 | Already used             | ✓                                       |
| `i18next`                        | Internationalization | i18n support             | Not needed for MVP                      |
| `react-helmet`                   | SEO                  | Head management          | Consider for SEO                        |
| `react-snap`                     | SEO                  | Static rendering         | Not needed for SPA                      |
| `@stripe/react-stripe-js`        | Payments             | Payment integration      | Not in current scope                    |
| `react-big-calendar`             | Calendar             | Calendar component       | Consider for appointments               |
| `recharts`                       | Charts               | Alternative charting     | Not needed - Chart.js sufficient        |
| `@nivo/core`                     | Charts               | Data visualization       | Not needed                              |
| `react-pdf`                      | PDF                  | PDF viewer               | Not needed - using jsPDF for generation |
| `immer`                          | State                | Immutable state          | Not needed                              |
| `reselect`                       | State                | Selector library         | Not needed                              |
| `storybook`                      | Development          | Component documentation  | Consider for component dev              |
| `react-test-renderer`            | Testing              | Component testing        | Not needed - no tests                   |
| `testing-library/react`          | Testing              | React testing utilities  | Not needed                              |

***

## OCR Service (Python Flask)

### Location

`C:\Users\HP\MediTrack\backend\ocr_service\requirements.txt`

### Currently Used Packages

| Package        | Version | Purpose                       |
| -------------- | ------- | ----------------------------- |
| `flask`        | latest  | Web framework for OCR API     |
| `flask-cors`   | latest  | Cross-Origin Resource Sharing |
| `pillow`       | latest  | Image processing              |
| `paddlepaddle` | 2.6.2   | Deep learning platform        |
| `paddleocr`    | 2.7.0.3 | OCR engine                    |
| `pymupdf`      | 1.20.2  | PDF processing                |
| `gunicorn`     | latest  | Production WSGI server        |
| `numpy`        | <2.0.0  | Numerical computing           |

### How Each Package is Used

| Package        | Usage                                                 |
| -------------- | ----------------------------------------------------- |
| `flask`        | Creates REST API endpoints for OCR processing         |
| `flask-cors`   | Allows frontend to access OCR service                 |
| `pillow`       | Image loading and preprocessing for OCR               |
| `paddlepaddle` | Deep learning framework powering PaddleOCR            |
| `paddleocr`    | Performs optical character recognition on student IDs |
| `pymupdf`      | Handles PDF files (medical reports)                   |
| `gunicorn`     | Production server for running Flask app               |
| `numpy`        | Required by PaddleOCR for array operations            |

### OCR Service Structure

```
backend/ocr_service/
├── ocr_service.py      # Main Flask application
├── venv_ocr/           # Virtual environment
└── requirements.txt   # Python dependencies
```

### Not Used (But Available in Python Ecosystem)

| Package            | Category         | Purpose                   | Recommendation                        |
| ------------------ | ---------------- | ------------------------- | ------------------------------------- |
| `pytest`           | Testing          | Unit testing framework    | Consider adding                       |
| `opencv-python`    | Image Processing | Advanced image processing | Consider for preprocessing            |
| `pdf2image`        | PDF              | Convert PDF to images     | Not needed - pymupdf sufficient       |
| `wand`             | Image Processing | ImageMagick binding       | Not needed                            |
| `pytesseract`      | OCR              | Tesseract OCR fallback    | Not needed - PaddleOCR is primary     |
| `celery`           | Async            | Task queue                | Not needed for sync operations        |
| `redis`            | Cache/Queue      | Message broker for Celery | Not needed                            |
| `pillow-heif`      | Image            | HEIF format support       | Not needed for MVP                    |
| `python-dotenv`    | Environment      | Environment variables     | Not needed - Flask handles it         |
| `loguru`           | Logging          | Advanced logging          | Consider for debugging                |
| `marshmallow`      | Serialization    | Data serialization        | Not needed                            |
| `python-multipart` | HTTP             | Multipart form parsing    | Not needed - Flask handles it         |
| `werkzeug`         | Framework        | WSGI utilities            | Already included with Flask           |
| `click`            | CLI              | Command-line interface    | Not needed                            |
| `black`            | Linting          | Code formatting           | Not needed - not using Python linting |
| `flake8`           | Linting          | Python linting            | Not needed                            |
| `mypy`             | Type Checking    | Static type checking      | Not needed                            |
| `pillow-simd`      | Performance      | Fast Pillow fork          | Not needed for MVP                    |

***

## Technologies Not Yet Implemented

Based on the CLAUDE.md requirements, here are technologies that were planned but not yet implemented:

### ✅ Successfully Implemented

| Technology    | Purpose            | Status                       |
| ------------- | ------------------ | ---------------------------- |
| `React.js`    | Frontend framework | ✅ Implemented                |
| `IONIC React` | Cross-platform UI  | ✅ Implemented                |
| `TailwindCSS` | Utility-first CSS  | ✅ Implemented                |
| `Node.js`     | Backend runtime    | ✅ Implemented                |
| `Express`     | Backend framework  | ✅ Implemented                |
| `Python`      | OCR service        | ✅ Implemented                |
| `Flask`       | OCR web framework  | ✅ Implemented                |
| `PaddleOCR`   | OCR engine         | ✅ Implemented                |
| `Supabase`    | Database & Auth    | ✅ Implemented                |
| `PostgreSQL`  | Database           | ✅ Implemented (via Supabase) |
| `Capacitor`   | Mobile bridge      | ✅ Implemented                |
| `Vite`        | Build tool         | ✅ Implemented                |
| `Chart.js`    | Data visualization | ✅ Implemented                |
| `JWT`         | Authentication     | ✅ Implemented                |
| `Zod`         | Validation         | ✅ Implemented                |

### ❌ Not Yet Implemented

### Desktop Application

| Technology         | Purpose                       | Status          |
| ------------------ | ----------------------------- | --------------- |
| `Electron`         | Desktop application framework | Not implemented |
| `electron-builder` | Electron app packaging        | Not implemented |
| `electron-log`     | Electron logging              | Not implemented |

**Impact**: Cannot build desktop .exe/.app applications yet.

### Database (Offline Mode)

| Technology       | Purpose                         | Status          |
| ---------------- | ------------------------------- | --------------- |
| `SQLite`         | Local database for offline mode | Not implemented |
| `better-sqlite3` | SQLite Node.js driver           | Not implemented |
| `sql.js`         | SQLite in browser/WASM          | Not implemented |

**Impact**: App currently requires internet connection; no offline capability.

### Testing

| Technology               | Purpose                 | Status                   |
| ------------------------ | ----------------------- | ------------------------ |
| `Jest`                   | JavaScript testing      | Not installed (frontend) |
| `pytest`                 | Python testing          | Not installed (OCR)      |
| `@testing-library/react` | React component testing | Not installed            |
| `supertest`              | API integration testing | Not installed            |

**Impact**: No automated tests in place.

### CI/CD

| Technology       | Purpose             | Status         |
| ---------------- | ------------------- | -------------- |
| `GitHub Actions` | CI/CD automation    | Not configured |
| `Supabase CLI`   | Database migrations | Not used       |

**Impact**: No automated deployment pipeline.

### Mobile (Native)

| Technology       | Purpose              | Status         |
| ---------------- | -------------------- | -------------- |
| `Android Studio` | Android native build | Not configured |
| `Xcode`          | iOS native build     | Not configured |

**Impact**: Mobile builds not yet fully configured.

### Security

| Technology           | Purpose               | Status        |
| -------------------- | --------------------- | ------------- |
| `helmet`             | HTTP security headers | Not installed |
| `express-rate-limit` | Rate limiting         | Not installed |
| `csurf`              | CSRF protection       | Not installed |

**Impact**: Basic security measures only.

### Real-time Features

| Technology  | Purpose                 | Status        |
| ----------- | ----------------------- | ------------- |
| `socket.io` | Real-time communication | Not installed |

**Impact**: No real-time notifications or updates.

### Payment Integration

| Technology          | Purpose            | Status       |
| ------------------- | ------------------ | ------------ |
| `@stripe/stripe-js` | Payment processing | Not in scope |

**Impact**: No payment features in current scope.

***

## Recommendations

### High Priority

1. **Add Testing Framework**
   * Install Jest for frontend and backend
   * Install PyTest for OCR service
   * Critical for maintainability

2. **Add Security Middleware**
   * Install `helmet` for HTTP headers
   * Install `express-rate-limit` for API protection

3. **Offline Mode (SQLite)**
   * Add SQLite for local data storage
   * Enable offline functionality

### Medium Priority

1. **Logging**
   * Add `morgan` or `winston` for backend logging
   * Add `loguru` for OCR service logging

2. **State Management**
   * Consider adding React Query for server state
   * Not critical for MVP

3. **Animations**
   * Consider adding Framer Motion for polish

### Lower Priority

1. **Desktop Application**
   * Add Electron for desktop builds
   * Requires significant setup

2. **CI/CD**
   * Configure GitHub Actions
   * For production deployment

***

## Summary Table

| Component   | Total Packages | Core Packages Used                                                                                                                                 |
| ----------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend     | 8              | express, cors, dotenv, jsonwebtoken, multer, zod, axios, @supabase/supabase-js                                                                     |
| Frontend    | 22             | react, react-dom, react-router-dom, @ionic/react, @mui/material, tailwindcss, chart.js, axios, @supabase/supabase-js, zod, yup, jspdf, html2canvas |
| OCR Service | 8              | flask, flask-cors, pillow, paddlepaddle, paddleocr, pymupdf, gunicorn, numpy                                                                       |
| **Total**   | **38**         |                                                                                                                                                    |

***

*Generated on: 2026-06-22*
*Last updated: 2026-06-22*
