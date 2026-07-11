# BuildWise AI — Production Cloud Deployment Guide

This guide describes how to deploy the entire BuildWise AI platform live on the web using **Firebase (Auth)**, **Vercel (Next.js Dashboard)**, **Render (FastAPI, Postgres, Redis, Celery)**, and **Cloudflare Pages (Marketing Landing Page)**.

---

## 🏗️ Deployment Architecture

- **`yourdomain.com`** (Apex) $\rightarrow$ **Cloudflare Pages** (Static landing page)
- **`app.yourdomain.com`** $\rightarrow$ **Vercel** (Next.js 15 Web Dashboard)
- **`api.yourdomain.com`** $\rightarrow$ **Render** (FastAPI Backend API)
- **Firebase Auth** $\rightarrow$ User authentication across frontends and backends

---

## 📋 Prerequisites

Before starting, ensure you have:
1. A **GitHub repository** containing the project code.
2. Accounts created on:
   - [Firebase Console](https://console.firebase.google.com/)
   - [Vercel](https://vercel.com/)
   - [Render](https://render.com/)
   - [Cloudflare](https://cloudflare.com/)

---

## 🛠️ Step-by-Step Deployment

### 1. Set Up Firebase Authentication

Firebase handles user sign-in. You need to configure it for both client and backend.

#### Client Setup (Next.js App)
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add Project**. Name it `BuildWise AI`.
2. Navigate to **Project Settings** $\rightarrow$ **General**.
3. Under *Your Apps*, click the **Web icon (`</>`)** to register a web app. Copy the `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
4. Navigate to **Build** $\rightarrow$ **Authentication** $\rightarrow$ **Sign-in method**, and enable **Email/Password**.

#### Backend Setup (FastAPI API)
1. In Firebase Console, go to **Project Settings** $\rightarrow$ **Service Accounts**.
2. Click **Generate New Private Key**. This downloads a JSON file containing your Admin credentials.
3. Keep this file secure; you will upload it to Render in Step 2.

---

### 2. Deploy Backend Ecosystem on Render

We use **Render Blueprints** to launch your Database, Redis Cache, FastAPI, and Celery Worker simultaneously using the config defined in [render.yaml](file:///c:/Users/Atharva/OneDrive/Documents/Atharva/Civil/render.yaml).

1. Log into [Render](https://render.com/).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml` and prompt you for configuration details:
   - **Service Group Name:** `buildwise`
   - **Database Password:** (Generated automatically)
   - **CORS Origins:** Update to match your live Vercel domains: `["https://app.yourdomain.com", "https://yourdomain.com"]`
5. Click **Apply**. Render will begin provisioning:
   - PostgreSQL Database
   - Redis Instance
   - FastAPI API Web Service
   - Celery Worker (which compiles OpenCV, OCR, and YOLO image dependencies)
6. Once deployed, note down your API Web Service URL (e.g., `https://buildwise-api.onrender.com`).

#### Injecting Firebase Credentials into Render Backend
1. Go to the Render dashboard, click on your **`buildwise-api`** web service.
2. Navigate to **Environment** $\rightarrow$ **Secret Files**.
3. Click **Add Secret File**. Name it `firebase-key.json` and paste the contents of the Firebase Private Key JSON file you downloaded in Step 1.
4. Go to **Environment Variables** and set `FIREBASE_CREDENTIALS_PATH` to `/etc/secrets/firebase-key.json`.
5. Repeat this step for the **`buildwise-celery`** worker service to allow background tasks to access Firebase.

---

### 3. Deploy Frontend Web App on Vercel

Vercel is optimized for building and serving Next.js applications.

1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** $\rightarrow$ **Project**.
2. Import your GitHub repository.
3. In the project setup wizard, configure the following:
   - **Root Directory:** Edit and select **`buildwise_web`**.
   - **Build Command:** `npm run build` (detected automatically)
   - **Output Directory:** `.next` (detected automatically)
4. Open the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL` $\rightarrow$ set to your Render backend API URL (e.g., `https://buildwise-api.onrender.com`).
5. Click **Deploy**. Vercel will build the standalone bundle and host it live.

---

### 4. Deploy Marketing Landing Page on Cloudflare Pages

Cloudflare Pages provides fast, global hosting for static web assets.

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and select **Workers & Pages**.
2. Click **Create** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
3. Select your repository.
4. Configure the build settings:
   - **Project Name:** `buildwise-landing`
   - **Production Branch:** `main` (or your default branch)
   - **Framework Preset:** `None`
   - **Build Command:** (Leave blank)
   - **Build Output Directory:** `/buildwise_web_landing`
5. Click **Save and Deploy**. Your landing page is now live!

---

### 5. Custom Domain & DNS Configuration

To route traffic cleanly under your branding, point your DNS records at your registrar (e.g., GoDaddy, Namecheap, Cloudflare DNS):

| Host / Subdomain | Type | Target / Value | Description |
| :--- | :--- | :--- | :--- |
| `@` (Apex) | `CNAME` | `buildwise-landing.pages.dev` | Points your root domain to Cloudflare Landing Page |
| `app` | `CNAME` | `cname.vercel-dns.com` | Points app subdomain to Next.js Web App |
| `api` | `CNAME` | `buildwise-api.onrender.com` | Points api subdomain to FastAPI backend API |

*Note: Enable SSL configuration on Cloudflare, Vercel, and Render to ensure complete `HTTPS` encryption.*

---

### 6. Update Flutter Mobile Application Client

To connect your Flutter mobile client to the new production backend API:

1. Open [api_endpoints.dart](file:///c:/Users/Atharva/OneDrive/Documents/Atharva/Civil/buildwise_app/lib/core/network/api_endpoints.dart) in your editor.
2. Comment out the local gateway and uncomment the production URL:
   ```dart
   // Localhost emulator gateway
   // static const String baseUrl = 'http://10.0.2.2:8000/api/v1'; 
   
   // Production live server API URL
   static const String baseUrl = 'https://api.yourdomain.com/api/v1';
   ```
3. Rebuild your iOS or Android app bundle:
   ```bash
   flutter build apk --release
   # or
   flutter build ipa --release
   ```

---

## 🔒 Production Security Checklist

- [ ] Change `SECRET_KEY` in Render API settings to a cryptographically strong 32-character random string.
- [ ] Turn off Django/FastAPI documentation endpoints in production (if desired) by checking `Settings.API_V1_STR` logic.
- [ ] Restrict Render PostgreSQL and Redis access using Render internal secure networking (the `buildwise-redis` `ipAllowList` has been initialized as empty for this reason).
- [ ] Set up database backup frequencies on Render.
