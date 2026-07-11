# BuildWise AI — Production Materials Engine & Web Platform

AI-powered construction material estimation and Bill of Quantities (BOQ) compilation. Uses pre-processed computer vision overlays to extract layout geometries, calibrating estimations with high-fidelity structural, masonry, and finishing parameters.

---

## Workspace Layout

- `buildwise_web/` — Next.js 15 + TypeScript Web App (Dashboard, Projects, Upload, Estimator, AI Chat, Admin)
- `buildwise_api/` — FastAPI + SQLAlchemy + Celery + PostgreSQL Python Backend
- `buildwise_web_landing/` — HTML/CSS/JS Premium Marketing Landing Page (Theme switcher, interactive preview)
- `buildwise_app/` — Flutter mobile application client (Riverpod, GoRouter, Material 3)

---

## Technical Stack

- **Web Frontend:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Framer Motion, TanStack Query, Recharts, Zod.
- **Mobile Client:** Flutter, Hooks, Riverpod, GoRouter, Material 3.
- **Backend API:** FastAPI, Async SQLAlchemy 2.0, Pydantic settings.
- **Background Tasks:** Redis, Celery workers for async CPU-heavy computer vision pipelines.
- **AI Pipeline:** OpenCV preprocessing (Adaptive Thresholding), EasyOCR dimension parsing, YOLO room segmentation.
- **PDF Engine:** ReportLab generating dynamic tables, metadata blocks, contractor pricing headers.
- **DevOps:** Docker multi-container setups, root-level Orchestration.

---

## Getting Started

### Complete Docker Compose Launch (Web App + Backend API + DB + Worker)

Launch all required system modules and services simultaneously using the root orchestrator:
```bash
docker-compose up --build
```
Once initialized, the services will be running at:
- **Next.js Web App:** `http://localhost:3000`
- **FastAPI API Documentation:** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5432`
- **Redis Queue Server:** `localhost:6379`

---

## Manual Setup

### 1. Web Frontend (Next.js)
1. Navigate to the web folder:
   ```bash
   cd buildwise_web
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the hot-reloading development server:
   ```bash
   npm run dev
   ```

### 2. Marketing Landing Page
1. Navigate to the landing page folder:
   ```bash
   cd buildwise_web_landing
   ```
2. Open `index.html` directly in any web browser or serve it using an extension like Live Server.

### 3. Backend API
1. Navigate to the api directory:
   ```bash
   cd buildwise_api
   ```
2. Copy environment properties:
   ```bash
   cp .env.example .env
   ```
3. Boot services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

---

## Estimation Calculations Criteria

- **Wet-to-Dry Concrete Expansion Factor:** 1.54 multiplier.
- **Mix Ratio Quantities (Cement/Sand/Aggregate):**
  - **M15:** 1 : 2 : 4
  - **M20:** 1 : 1.5 : 3
  - **M25:** 1 : 1 : 2
  - **M30:** 1 : 0.75 : 1.5
- **Wet-to-Dry Mortar Expansion Factor:** 1.33 multiplier.
- **Masonry Units:** 500 standard red clay bricks per cubic meter of wall volume.
- **Steel Reinforcement Index (Concrete Volume percentage):** Average 80 kg of rebar steel per m³ concrete structure.
