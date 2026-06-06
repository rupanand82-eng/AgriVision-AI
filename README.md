# AgriVision AI — Environmental Intelligence & Pathology Platform

AgriVision AI is an advanced agricultural intelligence and pathology platform designed to provide agronomists, farmers, and pathologists with real-time crop disease diagnosis, soil nutrient profiling, agrometeorological insights, and interactive ecological monitoring.

---

## 🌟 Core Modules & Capabilities

### 1. Unified Search & Diagnostics (Global Search)
- **Instant Local Indexing**: Seamless global search bar integrated into the header that scans across all crop records, soil reports, and chats.
- **Deep Reader Drawer**: A modular lateral inspector for high-fidelity viewing of pathology logs, specific symptoms, precise fertilizer treatment protocols, and soil reclamation steps.

### 2. Crop Disease Classification & Pathology AI
- **Surgical Plant Pathology**: Diagnose crop diseases from uploaded leaf images or real-time simulation inputs.
- **Detailed Clinical Summaries**: Calculates disease confidence indices, symptom breakdowns, preventative actions, and recommended organic/chemical defense protocols.
- **Gemini-Powered Engine**: Leverages Gemini 3.5 Flash via the modern `@google/genai` SDK for high-fidelity agricultural diagnostics.

### 3. Soil Analysis & Irrigation Optimization
- **Dynamic Soil Profiling**: Input soil type (e.g., Clay, Loam, Sand), current N-P-K nutrient values, pH levels, and moisture content.
- **Reclamation Advisories**: Instant calculations of soil health status with custom nutrient replenishment recommendations and precise water retention steps.

### 4. Intel Meteorology & Grounded Advisories
- **Ecosystem Dynamics**: Displays real-time forecasts, barometric measurements, wind vectors, and humidity.
- **Preset Climatological Plains**: Switch between global agricultural zones (such as Salinas Valley, California; Iowa Corn Belt; Punjab Plains; and Murrumbidgee Irrigation Area) to evaluate local weather conditions.
- **AI-Driven Advisories**: Weather-conditioned smart recommendations for seed selection, harvesting windows, and irrigation schedules.

### 5. Interactive Ecosystem Health Grid
- **Spatial Grid Modeling**: A high-density 36-cell microclimatic heatmap representing soil moisture, soil water tension, ambient heat index, and active light/UV exposure.
- **Climatological Stress Shifter**: Simulate diurnal transitions (Day/Night) or trigger environmental stress events (such as arid dry spells) to stress-test crop resilience.

---

## 🛠️ Technological Stack

- **Frontend & App Interface**: React 19, Vite 6, Tailwind CSS v4, Lucide React, and Motion (fka Framer Motion) for physics-based fluid transitions.
- **Database & Persistence**: Google Cloud Firebase Firestore database for real-time reports, analysis saving, and profile storage.
- **AI Inference Orchestration**: Server-side integration with `@google/genai` TypeScript SDK utilizing the Gemini 3.5 Flash model.
- **Backend Architecture**: Node.js and Express running in a production-ready compiled CommonJS bundle format.

---

## ⚙️ Environment Variables

Copy the `.env.example` template and define your keys:

```env
# GEMINI_API_KEY: Required for Gemini AI API calls.
# Configure this via your AI Studio developer secrets.
GEMINI_API_KEY="your_api_key_here"

# APP_URL: Self-referential URL where this applet is hosted.
APP_URL="http://localhost:3000"
```

---

## 🚀 Local Development Setup

To run AgriVision AI locally in a development environment:

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
*The dev server will boot on `http://localhost:3000` via Express + Vite integration.*

### 3. Build & Package for Production
To bundle the frontend assets and compile the server-side architecture into a self-contained production bundle:
```bash
npm run build
```

### 4. Start Production Server
```bash
npm run start
```

---

## ☁️ Vercel Deployment Guide

Deploying AgriVision AI to Vercel is streamlined and fully configured. Because of our custom `/vercel.json` configuration and Serverless Function API architecture in `/api/index.ts`, your full-stack app will work natively on Vercel's edge network under a single domain.

### 📋 Prerequisites & Automatic Config
1. **Repository Hub**: Ensure your directory has been committed and pushed to a GitHub, GitLab, or Bitbucket repository.
2. **Configuration Auto-Detection**: Vercel will automatically read the `vercel.json` file in your root folder. This file configures the frontend assets under `dist/` and maps all API routes (`/api/*`) to Vercel serverless function instances inside the `/api/index.ts` handler.

### 🚀 Step-by-Step Vercel Setup

1. **Import Project**:
   - Log in to your [Vercel Dashboard](https://vercel.com).
   - Click **Add New...** > **Project**.
   - Select and import your AgriVision AI repository.

2. **Environment Variables**:
   - Expand the **Environment Variables** section in Vercel before triggering the build.
   - Add the following environment secret:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: `Your_Gemini_API_Key_Here` (Retrieve this from Google AI Studio / Google Cloud console)
   - *Note: Your Firebase setup config is stored directly in `/firebase-applet-config.json` inside your codebase, meaning Firebase Auth and Firestore will automatically initialize without needing additional environment configuration input on Vercel!*

3. **Deploy**:
   - Click the **Deploy** button.
   - Vercel will build the frontend assets using `vite build` under the Vite framework preset and compile your API functions automatically.

4. **That's it!** Your app is now live under a secure, serverless `.vercel.app` domain. Enjoy real-time, global-scale diagnostic intelligence.

---

## 🔐 Troubleshooting: Firebase Unauthorized Domain Error

If you see an error saying **`Firebase: Error (auth/unauthorized-domain)`** when trying to register or sign in:

### Why this happens
By default, Firebase Authentication restricts authorization requests to safe-listed domains. Since you are using a custom Firebase project (`agri-e98b2`) with this applet interface, you must explicitly whitelist the host domains where this application runs:
1. **Google AI Studio Development URL** (for live preview and coding sessions).
2. **Google AI Studio Shared/Preview URL** (for sharing with colleagues).
3. **Vercel Domain** (e.g., `agri-vision-ai-five.vercel.app` for production).

### How to resolve it in 3 steps:

1. **Open Firebase Console**:
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Select your custom project: **`agri-e98b2`**.

2. **Navigate to Authorized Domains**:
   - In the left-hand navigation rail, click **Build** > **Authentication**.
   - Navigate to the **Settings** tab at the top.
   - Click on **Authorized domains** under the list of options.

3. **Add your domains**:
   - Click **Add domain** for each of the following host domains *(enter only the domain name, omitting the `https://` prefix or any trailing paths)*:
     - `localhost`
     - `ais-dev-75xv4gvhhf6fbfpyg6pi2i-372504018832.asia-southeast1.run.app`
     - `ais-pre-75xv4gvhhf6fbfpyg6pi2i-372504018832.asia-southeast1.run.app`
     - `agri-vision-ai-five.vercel.app`
   - Click **Add** for each.

*Once added, the change takes effect almost immediately. Refresh your app pages, and authentication/registration will succeed!*



