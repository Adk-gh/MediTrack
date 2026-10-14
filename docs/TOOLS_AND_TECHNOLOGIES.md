# MediTrack Tools & Technologies

## Overview
MediTrack is a cross‑platform student health record management system that manages student health records, appointments, examinations, and announcements. It runs on three platforms (web, desktop via Electron, and mobile via Capacitor) and integrates an OCR service for student‑ID verification.

---

## Backend (Node.js + Express)
| Tool / Library | Role | Why Chosen |
|----------------|------|------------|
| **Node.js** | Runtime for the server | High performance, rich ecosystem, aligns with JavaScript front‑end |
| **Express** | Web framework | Minimalist, flexible routing, widely adopted |
| **@supabase/supabase-js** | Supabase client (auth + DB) | Managed PostgreSQL, real‑time, built‑in auth, reduces infrastructure overhead |
| **PostgreSQL (Supabase)** | Primary relational database | Strong ACID guarantees, hosted by Supabase for easy scaling |
| **SQLite** | Offline local store | Enables full offline mode on desktop / mobile without a server |
| **jsonwebtoken** | JWT generation / verification | Stateless authentication that works across web, mobile, desktop |
| **Zod** | Schema validation (backend \& shared) | Type‑safe, declarative validation that works in both Node and React |
| **Helmet** | Security HTTP headers | Protects against common web‑based attacks |
| **csurf** | CSRF protection | Prevents cross‑site request forgery on state‑changing endpoints |
| **cors** | CORS middleware | Allows the front‑end (different origin) to call the API securely |
| **cookie-parser** | Cookie handling | Needed for session‑based features and token storage |
| **express-rate-limit** | Rate limiting | Thwarts brute‑force and DoS attempts |
| **multer** | File uploads (student‑ID images) | Handles multipart/form‑data for OCR processing |
| **axios** | HTTP client (server‑side) | Simplifies calls to external services (e.g., OCR API) |
| **nodemailer / resend** | Email sending | Sends verification, password‑reset, and notification emails |
| **dotenv** | Environment variable loading | Keeps secrets out of source code |
| **morgan** *(optional)* | Request logging | Gives structured request logs for debugging and monitoring |
| **winston / pino** *(optional)* | Production logging | Structured, high‑performance logging pipelines |
| **nodemon** *(dev)* | Auto‑restart on changes | Improves developer productivity |

---

## OCR Service (Python + Flask)
| Tool / Library | Role | Why Chosen |
|----------------|------|------------|
| **Python 3.8+** | Runtime for OCR micro‑service | Easy to work with AI/ML libraries |
| **Flask** | Lightweight HTTP API | Minimal footprint, simple routing |
| **PaddleOCR** | OCR engine | State‑of‑the‑art OCR for Chinese/Latin scripts, easy to install |
| **gunicorn** *(recommended for prod)* | WSGI server | Robust, multi‑worker process manager for production |
| **uvicorn** *(alternative)* | ASGI server | Supports async endpoints if needed |
| **python-dotenv** | Env var loading | Mirrors Node's dotenv pattern |
| **requests** | HTTP client (if needed) | Simple outbound calls from Python |

---

## Frontend (React + Vite + Ionic)
| Tool / Library | Role | Why Chosen |
|----------------|------|------------|
| **React 19** | UI library | Component‑based architecture, vast ecosystem |
| **Vite** | Dev server \& bundler | Lightning‑fast hot‑module replacement, native ES modules |
| **React Router v7** | Client‑side routing | Declarative routes, nested layout support |
| **TailwindCSS** | Utility‑first styling | Rapid UI development, responsive design, easy theming |
| **Chart.js** + **react-chartjs-2** | Data visualisation | Simple, well‑documented charts for dashboards |
| **Ionic React** | Cross‑platform UI components | Provides native‑look‑and‑feel on mobile \& desktop |
| **Capacitor** | Mobile bridge (iOS/Android) | Official Ionic native runtime, integrates with web code |
| **Electron** | Desktop packaging | Turns the web app into a native desktop executable |
| **Electron Builder** | Build \& distribution for Electron | Handles installers for Windows/macOS/Linux |
| **Zod** | Front‑end schema validation | Share validation logic with backend |
| **yup** | Alternative validation library | Used in some legacy forms |
| **react-hook-form** | Form state management | performant, integrates with Zod/Yup |
| **react-query** | Data fetching \& caching | Handles async API calls, automatic cache invalidation |
| **react-toastify** | Toast notifications | Simple, accessible user feedback UI |
| **react-datepicker** | Date picker UI component | Improves date input ergonomics |
| **@mui/material** + **@emotion/react** | Optional UI component library | Provides Material Design components when needed |
| **axios** | HTTP client (browser) | Consistent API with server‑side Axios |
| **@capacitor/core**, **@capacitor/android**, **@capacitor/ios** | Capacitor runtime \& platform plugins | Required for native capabilities on mobile |
| **@ionic/react** | Ionic integration for React | Enables Ionic components inside React |

---

## Build, Packaging \& Deployment
| Tool | Purpose | Why Chosen |
|------|---------|------------|
| **npm** | Package manager \& script runner | Standard for Node ecosystems |
| **Git** | Version control | Distributed workflow, integrates with GitHub/GitLab |
| **GitHub Actions** | CI/CD pipelines | Native to GitHub, easy to configure for tests \& builds |
| **Supabase CLI** | Database migrations \& local Supabase dev env | Mirrors production Supabase workflow |
| **Electron Builder** | Desktop binary generation | Handles code‑signing, installers across OSes |
| **Capacitor CLI** | Mobile app builds (Android/iOS) | Generates native projects from web assets |
| **Docker** *(optional)* | Containerisation of backend \& OCR services | Guarantees reproducible environments |

---

## Testing \& Quality Assurance
| Tool | Scope | Why Chosen |
|------|-------|------------|
| **Jest** | JavaScript unit \& integration tests | Snapshot testing, fast, works with Vite |
| **React Testing Library** | Component tests | Encourages testing UI behaviour rather than implementation details |
| **SuperTest** | API endpoint tests (Node) | Easy HTTP assertions on Express apps |
| **PyTest** | Python unit tests for OCR service | Powerful fixtures, simple syntax |
| **ESLint / Prettier** | Linting \& formatting | Enforces code style and catches common bugs |
| **Postman** | Manual API testing \& documentation | Quick exploratory testing for developers |

---

## Development Experience
| Tool | Role |
|------|------|
| **VS Code** | Primary IDE with extensions for JavaScript/TypeScript, Python, and React |
| **GitLens** (VS Code extension) | Visualises Git history and code authorship |
| **Graphify** | Generates a knowledge‑graph of the codebase (used for fast navigation \& impact analysis) |
| **Prettier** | Code formatting across the repo |
| **ESLint** | Linting for consistency and catching bugs |

---

## Rationale Summary
- **Unified Language Stack** – Node.js for back‑end and JavaScript/TypeScript for front‑end reduces context switching.
- **Managed Backend Services** – Supabase provides a hosted PostgreSQL with auth, lowering ops burden.
- **Offline Capability** – SQLite enables the app to function without network, essential for school environments.
- **Cross‑Platform Reach** – Electron + Capacitor + Ionic let the same React codebase run on desktop, Android, and iOS.
- **Robust Validation** – Zod (shared) and react‑hook‑form give strong type‑safe form handling.
- **Security‑First** – Helmet, csurf, rate limiting, and JWT protect the API surface.
- **Scalable OCR** – PaddleOCR gives accurate ID extraction; Flask keeps the service lightweight.
- **Developer Productivity** – Vite, nodemon, hot‑module reload, and VS Code extensions speed up iteration.
- **Observability** – Optional winston/pino logging and morgan request logs provide insight in production.
- **Testing Discipline** – Jest \& PyTest enforce correctness across both stacks.

---

> This document is kept up‑to‑date manually. When new dependencies are added, update the corresponding table and rationale.

