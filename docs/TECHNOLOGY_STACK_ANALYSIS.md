# MediTrack Technology Stack Analysis

> **Note** – This document periodically syncs with the code base. Any changes to dependencies should be updated here.

***

## 1️⃣  Project Overview

MediTrack is a cross‑platform student health record management system.

| Component   | Technology               | Port |
| ----------- | ------------------------ | ---- |
| Backend     | Node.js + Express        | 5000 |
| Frontend    | React + Vite + Ionic     | 3000 |
| OCR Service | Python Flask + PaddleOCR | 5001 |

***

## 2️⃣  Backend (Node.js + Express)

> Dependencies already in *package.json*

| Package                 | Current Version | Purpose                | Notes |
| ----------------------- | --------------- | ---------------------- | ----- |
| `@supabase/supabase-js` | ^2.106.2        | Database & auth client | ✅     |
| `axios`                 | ^1.16.0         | HTTP client            | ✅     |
| `cors`                  | ^2.8.6          | CORS middleware        | ✅     |
| `dotenv`                | ^17.4.2         | Env vars               | ✅     |
| `express`               | ^5.2.1          | Web framework          | ✅     |
| `express-rate-limit`    | ^6.7.0          | Rate limiting          | ✅     |
| `csurf`                 | ^1.11.0         | CSRF protection        | ✅     |
| `cookie-parser`         | ^1.4.6          | Cookie parsing         | ✅     |
| `helmet`                | ^8.3.0          | Security headers       | ✅     |
| `multer`                | ^2.1.1          | File uploads           | ✅     |
| `jsonwebtoken`          | ^9.0.3          | JWT handling           | ✅     |
| `nodemailer`            | ^9.0.3          | Email sending          | ✅     |
| `resend`                | ^4.0.0          | Email service wrapper  | ✅     |
| `zod`                   | ^4.4.3          | Schema validation      | ✅     |

### Missing / Can‑Optional Packages

The following packages are **not** in `package.json` but would add value:

| Package      | Category | Purpose                 | Recommendation                         |
| ------------ | -------- | ----------------------- | -------------------------------------- |
| `morgan`     | Logging  | HTTP request logging    | Great for dev and production logs      |
| `winston`    | Logging  | Structured logging      | Supports log rotation & external sinks |
| `pino`       | Logging  | Ultra‑fast JSON logger  | Lightweight alternative to winston     |
| `nodemon`    | Dev      | Auto‑restart on changes | Handy in development                   |
| `dotenv-cli` | Dev      | Enhanced env support    | Allows env file selection in scripts   |
|              |          |                         |                                        |

***

## 3️⃣  Frontend (React + Vite + Ionic)

> Dependencies already in *frontend/package.json*

| Package                             | Current Version | Purpose                    | Notes |
| ----------------------------------- | --------------- | -------------------------- | ----- |
| `@capacitor/android`                | ^8.3.4          | Android platform           | ✅     |
| `@capacitor/ios`                    | ^8.3.4          | iOS platform               | ✅     |
| `@capacitor/core`                   | ^8.3.4          | Capacitor runtime          | ✅     |
| `@emotion/react`, `@emotion/styled` | ^11.14.x        | CSS‑in‑JS (MUI)            | ✅     |
| `@ionic/react`                      | ^8.8.7          | Ionic interop              | ✅     |
| `@mui/material`                     | ^9.0.1          | Material‑UI                | ✅     |
| `@supabase/supabase-js`             | ^2.106.2        | Auth & data                | ✅     |
| `axios`                             | ^1.7.0          | HTTP client                | ✅     |
| `chart.js`                          | ^4.5.1          | Charting                   | ✅     |
| `react-chartjs-2`                   | ^5.3.1          | React wrapper for Chart.js | ✅     |
| `react-datepicker`                  | ^9.1.0          | Date picker                | ✅     |
| `react-router-dom`                  | ^7.0.0          | Routing                    | ✅     |
| `vite-plugin-compression`           | ^0.5.1          | Gzip / Brotli              | ✅     |
| `yup`                               | ^1.7.1          | Form validation            | ✅     |
| `zod`                               | ^4.3.6          | Schema validation          | ✅     |
| `react-hook-form`                   | ^7.84.0         | Complex form handling      | ✅     |
| `react-toastify`                    | ^9.1.3          | Toast notifications        | ✅     |
| `react-query`                       | ^4.0.0          | Data fetching / caching    | ✅     |
|                                     |                 |                            |       |

### Missing / Can‑Optional Packages

| Package           | Category   | Purpose                      | Recommendation                     |
| ----------------- | ---------- | ---------------------------- | ---------------------------------- |
| `react-query`     | Data fetch | Caching & background refetch | Improves front‑end UX              |
| `react-toastify`  | UI         | Toasts                       | Good for alerts                    |
| `react-hook-form` | Forms      | Performance & validation     | Scales with complex forms          |
| `react-icons`     | Icons      | Library                      | If you prefer a different icon set |

***

## 4️⃣  OCR Service (Python Flask)

> At the moment only the Flask + PaddleOCR stack is present.

|             | Package       | Version         | Purpose                 |
| :---------- | ------------- | --------------- | ----------------------- |
| `flask`     | ^2.3.3        | Web framework   | ✅                       |
| `paddleocr` | ^2.7.0        | OCR             | ✅                       |
| `gunicorn`  | Not installed | Production WSGI | Consider for deployment |
| `uvicorn`   | Not installed | Async server    | Alternative option      |

***

## 5️⃣  Recommendations Overview

| Area                 | Recommendation                                                                                 | Why                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Security**         | Keep Helmet and csurf active; add `compression` and `morgan` for HTTP logging.                 | Protects against common attacks & aids debugging.         |
| **Performance**      | Enable response compression (`compression()`).                                                 | Reduces payload size.                                     |
| **Real‑time**        | Integrate `socket.io` if live updates (vital signs, appointment status) are needed.            | Provides WebSocket support across Node and the front‑end. |
| **Logging**          | Switch from console logs to `winston` or `pino` in production.                                 | Structured logs facilitate Kibana/ELK or Loki.            |
| **Testing**          | Add **React Testing Library** for component tests and **SuperTest** for API integration tests. | Ensures regressions are caught early.                     |
| **State Management** | Use `react-query` for data refetching; switch to `react-hook-form` for complex forms.          | Improves UX with offline caching and validation.          |
| **Deployment**       | Docker‑ise the backend and OCR service (multi‑stage).                                          | Simplifies scaling and ensures consistency.               |
|                      |                                                                                                |                                                           |

***

> **Next Steps** – Add missing packages to `package.json`, run `npm install`, and verify that the API and front‑end run correctly. Then add the recommended middlewares in `app.js` and corresponding front‑end utilities.

