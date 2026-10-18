# MediTrack Technology Stack Analysis (Updated)

> **Note** – This document now reflects only the dependencies that are actually imported and used in the code‑base, together with the file(s) that reference each one.

***

## 1️⃣ Project Overview

| Component   | Technology               | Port |
| ----------- | ------------------------ | ---- |
| Backend     | Node.js + Express        | 5000 |
| Front‑end   | React + Vite + Ionic     | 3000 |
| OCR Service | Python Flask + PaddleOCR | 5001 |

***

## 2️⃣ Backend (Node.js + Express)

> **Dependencies listed in** **`package.json`** **that are** ***actually used*** (imports found via `require(...)`).

| Package                 | Version (from `package.json`) | Files that import / use it                                                                                                                                                                                             |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/supabase-js` | ^2.106.2                      | `configs/database.js`, `middleware/authorized.js`, `middleware/auditLogger.js`, `services/email.service.js`, `services/systemConfig.service.js`, many service/feature files (`user.service.js`, `user.route.js`, etc.) |
| `axios`                 | ^1.16.0                       | `features/user/user.service.js`, `services/email.service.js`, front‑end feature components (`BulkAppointmentPanel.jsx`, `Homepage-users.jsx`, `Appointment-users.jsx`, `Consultation-users.jsx`)                       |
| `cors`                  | ^2.8.6                        | `app.js` (via `./configs/cors.js`), `configs/cors.js`                                                                                                                                                                  |
| `dotenv`                | ^17.4.2                       | `app.js`, `configs/database.js`, `configs/token.js`, `configs/email.js`                                                                                                                                                |
| `express`               | ^5.2.1                        | `app.js`, route files (`routes/auth.routes.js`, `routes/index.js`, `routes/appointmentValidator.js`, etc.)                                                                                                             |
| `express-rate-limit`    | ^8.6.2                        | `routes/auth.routes.js` (loginLimiter, emailLimiter, registerLimiter, resendLimiter)                                                                                                                                   |
| `helmet`                | ^8.3.0                        | `app.js`                                                                                                                                                                                                               |
| `multer`                | ^2.2.0                        | `middleware/upload.js`                                                                                                                                                                                                 |
| `jsonwebtoken`          | ^9.0.3                        | `configs/token.js`                                                                                                                                                                                                     |
| `nodemailer`            | ^9.0.3                        | `configs/email.js` (fallback SMTP transport)                                                                                                                                                                           |
| `@sendgrid/mail`        | ^8.1.0                        | `configs/email.js` (optional SendGrid transport)                                                                                                                                                                       |
| `resend`                | ^4.8.0                        | `services/email.service.js`                                                                                                                                                                                            |
| `svix`                  | ^1.99.1                       | `controllers/webhook.controller.js`                                                                                                                                                                                    |
| `xlsx`                  | ^0.18.5                       | `features/user/user.service.js` (for importing/exporting Excel files)                                                                                                                                                  |
| `zod`                   | ^4.4.3                        | Used throughout validation schemas (`validation/*.js`, feature‑specific validation files) and some service files                                                                                                       |
| **Removed / Unused**    | —                             | `csurf` and `cookie-parser` were listed previously but are **not imported** anywhere in the current source tree. They have been omitted from this analysis.                                                            |
| `form-data`             | ^4.0.6                        | **Not imported directly** – used internally by `axios` when sending multipart/form‑data (e.g., OCR upload). No explicit `require('form-data')` in the source.                                                          |

***

## 3️⃣ Front‑end (React + Vite + Ionic)

> **Dependencies listed in** **`frontend/package.json`** **that are actually imported** (ES module `import` statements).

| Package                              | Version (from `frontend/package.json`) | Files that import / use it                                                                                                     |
| ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@capacitor/android`                 | ^8.3.4                                 | Native Android project; not imported in JS but required for build                                                              |
| `@capacitor/core`                    | ^8.3.4                                 | `src/main.jsx`, `src/services/capacitor.service.js`                                                                            |
| `@capacitor/ios`                     | ^8.3.4                                 | Native iOS project; not imported in JS                                                                                         |
| `@ionic/react`                       | ^8.8.7                                 | UI components across the app (`src/components/Headers.jsx`, `src/layouts/AuthLayout.jsx`, `src/features/SignupForm.jsx`, etc.) |
| `@mui/material`                      | ^9.0.1                                 | Admin UI components (`src/components/admin/UniversityIdImport.jsx`, etc.)                                                      |
| `@emotion/react` / `@emotion/styled` | ^11.14.x                               | Used implicitly by MUI components; referenced in theme files                                                                   |
| `@supabase/supabase-js`              | ^2.106.2                               | `src/services/auth.service.js`, `src/services/user.service.js`, other feature services                                         |
| `axios`                              | ^1.7.0                                 | `src/services/auth.service.js`, `src/services/health.service.js`, various feature‑level service files                          |
| `chart.js`                           | ^4.5.1                                 | Chart components (`src/components/Charts/BarChart.jsx`, `src/components/Charts/LineChart.jsx`, etc.)                           |
| `react-chartjs-2`                    | ^5.3.1                                 | React wrappers for Chart.js charts                                                                                             |
| `react-datepicker`                   | ^9.1.0                                 | Date picker component (`src/components/DatePicker.jsx`)                                                                        |
| `react-router-dom`                   | ^7.0.0                                 | Routing (`src/App.jsx`, `src/main.jsx`, layout components)                                                                     |
| `react-hook-form`                    | ^7.84.0                                | Form handling in many feature components (`SignupForm.jsx`, `ProfileSetup.jsx`, etc.)                                          |
| `react-toastify`                     | ^9.1.3                                 | Toast notifications (`src/components/ToastProvider.jsx`, called from services)                                                 |
| `@tanstack/react-query`              | ^5.101.4                               | Data‑fetching hooks (`src/hooks/useUserData.ts`, `src/hooks/useAppointments.ts`)                                               |
| `zod`                                | ^4.4.3                                 | Front‑end validation schemas (`src/validation/schemas.ts`)                                                                     |
| `yup`                                | ^1.7.1                                 | **Not imported directly** – present in `package.json` but unused in source files                                               |
| `vite-plugin-compression`            | ^0.5.1                                 | Configured in `vite.config.ts`; not imported in component code                                                                 |
| **Removed / Unused**                 | —                                      | `react-icons` was mentioned previously but has no import statements; it can be removed if not needed.                          |

***

## 4️⃣ OCR Service (Python Flask)

| Package     | Version           | Purpose                                   |
| ----------- | ----------------- | ----------------------------------------- |
| `flask`     | ^2.3.3            | Web framework                             |
| `paddleocr` | ^2.7.0            | OCR engine                                |
| `gunicorn`  | *(not installed)* | Recommended production WSGI server        |
| `uvicorn`   | *(not installed)* | Alternative ASGI server (if async needed) |

***

## 5️⃣ Recommendations (based on actual usage)

| Area                | Recommendation                                                                                                                                                                                     | Why                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Security**        | Keep `helmet`, `express-rate-limit`, and `cors` active; add `compression` middleware to reduce payload size.                                                                                       | Provides essential headers, rate‑limiting, CORS protection, and improves performance. |
| **Logging**         | Replace ad‑hoc `console.log` statements with a structured logger such as `pino` or `winston`.                                                                                                      | Structured logs are easier to ship to ELK/Loki and to query.                          |
| **Email**           | Retain the flexible `configs/email.js` which selects SendGrid when the API key is present, otherwise falls back to Nodemailer. No additional wrappers needed.                                      | Keeps a single source of truth for email transport.                                   |
| **Frontend State**  | Continue using `@tanstack/react-query` for caching & background refetch; pair with `react-hook-form` for complex forms.                                                                            | Gives a solid data‑fetching strategy and performant form handling.                    |
| **Unused Packages** | Remove `csurf`, `cookie-parser`, `yup`, and any other listed but unused dependencies from `package.json`. Run `npm prune` after cleanup.                                                           | Reduces bundle size and eliminates confusion.                                         |
| **Testing**         | Keep Jest for unit tests, React Testing Library for component tests, and SuperTest for API integration tests (already present).                                                                    | Ensures coverage across both stacks.                                                  |
| **Dockerisation**   | Create multi‑stage Dockerfiles for the Node backend and the Python OCR service; add a `docker-compose.yml` to spin them up together with Supabase (or a local Postgres).                           | Simplifies local development and CI/CD pipelines.                                     |
| **Documentation**   | Automate this `TECHNOLOGY_STACK_ANALYSIS.md` generation: add a CI step that scans `require`/`import` statements and regenerates the tables, failing the build if undocumented dependencies appear. | Guarantees the doc stays accurate as the code evolves.                                |

***

### Next Steps

1. **Replace the contents of** **`docs/TECHNOLOGY_STACK_ANALYSIS.md`** with the updated text above.
2. Run `npm uninstall csurf cookie-parser yup` (and remove any related import statements).
3. Add `compression` middleware in `app.js` (e.g., `app.use(require('compression')());`).
4. Consider integrating a structured logger (`pino` or `winston`) and replace existing `console.log` calls.
5. Update CI to run a dependency‑scan script and enforce documentation consistency.

***

*Generated with 🎉 Claude Code*
