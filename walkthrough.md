# BuildWise AI — Completion Walkthrough

BuildWise AI is a complete, production-ready AI-powered Construction Material Estimation and Bill of Quantities (BOQ) Mobile Application.

---

## 🏗️ What Was Created

### 1. Flutter Mobile Application (`buildwise_app/`)
- **Design System:** Clean, warm near-black and white design palette using Violet (`#7C3AED`) and Lavender (`#A78BFA`). Elegant typography (Inter), rounded cards (20px), haptics engine, and dynamic screen inputs.
- **Routing & Shell:** GoRouter config using nested `ShellRoute` tabs for Home, Projects, Estimate, AI, and Profile screens.
- **Onboarding & Auth Flow:** Splash (logo fade), Onboarding cards, Login, Register, Forgot Password, and OTP input screens.
- **Dashboard & Project Details:** Greeting indicators, KPI metrics cards, quick actions grids, and custom project context filters.
- **File Uploading:** File picker supporting PDF, DWG, DXF, PNG, and JPEG formats. Camera scan triggers and local upload handlers.
- **AI Analysis Confirmations:** Displays wall lengths, rooms, doors, and windows parsed by backend models, permitting adjustments.
- **Parameters Wizard:** Steppers collecting floor counts, heights, concrete/steel grades, brick/block models, and waste.
- **Estimation summary:** Tabbed summary grids showing material units and currency breakdowns.
- **PDF Previews:** Local PDF downloads and sharing wrappers.
- **AI Assistant Chat:** Prompt inputs supporting construction Mix Ratios, Steel, Bricks, and Scale query shortcuts.

### 2. FastAPI Backend Service (`buildwise_api/`)
- **Application Factory:** Uvicorn gateways with CORS policies, database connection pools, and mounted static upload route handlers.
- **Authentication Routes:** JWT hashing models verifying password matches and Firebase registration entries.
- **Project Context APIs:** CRUD endpoints supporting cloning and favoriting tables.
- **Celery Async Pipeline:** Background workers resolving computer vision tasks using broker queues.
- **OpenCV & OCR Pipelines:** Preprocessing contrast adjustments, line segment counts, easyocr room extracts, and scale detectors.
- **Civil Calculations Engine:**
  - Dry Volume concrete conversion (1.54 multiplier).
  - Mix ratio allocations (M15, M20, M25, M30).
  - Brick counts with mortar expansion factors (1.33 multiplier).
  - Plaster internal/external area, painting coverage ratios, tiles layout indices.
- **Labour Index & Costing:** Contractor margin adjustments, GST allocations, and contingencies.
- **ReportLab PDF Engine:** Compiles standard letter layouts, tables, headers, and pricing footers.

### 3. CI/CD & Docker Orchestration
- **Docker Compose:** FastAPI, PostgreSQL database, Redis caches, and Celery workers setup.
- **GitHub Actions workflows:** Linters and pytest setups for backend testing and flutter analyzer.

---

## 🛠️ Verification & Test Command References

```bash
# Backend pytest suite
cd buildwise_api && python -m pytest

# Run Docker Compose services
cd buildwise_api && docker-compose up --build

# Run Flutter mobile client
cd buildwise_app && flutter run
```
