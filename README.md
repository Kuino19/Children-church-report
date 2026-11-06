# IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM

A mobile-first, full-stack reporting and collation web application designed to replace manual monthly Google Forms with a permanent, centralized reporting infrastructure for **Foursquare Idimu Missionary District**. Individual church representatives log their weekly service, demographic, and spiritual harvest metrics every Sunday, while the District Coordinator accesses real-time submissions, historical collations, compliance tracking, and automated summaries without data loss.

---

## 🚀 Quick Start

### 1. One-Click Launch (Windows)
Double-click:
```
launch_church_reports.bat
```
*(or run `church-reports\run.bat`)*

This opens the platform in your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

### 2. Manual CLI Start (Local Offline)
```bash
cd church-reports
npm start
```

### 3. Vercel Cloud Deployment
This project is pre-configured for 1-click deployment on **Vercel** with full serverless Express API and persistent cloud database support.
1. Import the GitHub repository into your Vercel Dashboard:
   👉 **[https://github.com/Kuino19/Children-church-report](https://github.com/Kuino19/Children-church-report)**
2. In your Vercel Project Settings > **Environment Variables**, add:
   - **`DATABASE_URL`**: Your Neon / PostgreSQL connection string (from your Neon console)
3. Click **Deploy**. Vercel will automatically build the client SPA and map all `/api/*` endpoints to the serverless function.

---

## 🔑 Demo Credentials

| Role | Email / Phone | Password | Notes |
|---|---|---|---|
| **District Coordinator (Admin)** | `admin@district.church` | `adminpassword123` | Full district collation & zone management |
| **Church Representative** | `rep@idimuzhq.church` | `reppassword123` | Idimu ZHQ (Idimu Zone) |

### 🏛️ Official District Directory (Configured)

- **IDIMU Zone:**
  - FGC Unity
  - Isheri
  - Awesome Solution Egan
  - Idimu ZHQ
  - Ikotun
  - Idowu-Egba
  - Ajegunle
- **ORISUMBARE Zone:**
  - National Temple

> *Note: Public self-registration is strictly for Church Representatives. Representatives type in their Zone and Church names by themselves during sign-up.*

---

## ✨ Core Features & Specifications

### 📱 Church Representative View (Mobile-First)
- **Persistent Profile & Context:** Reps register or log in directly to their assigned Church and Zone.
- **Sunday Selector (1st – 5th Sunday):** Clean horizontal pill tabs with green badges (`✓ Saved`) indicating completed submissions. Selecting an existing week loads the saved figures for instant review or edits.
- **Categorized Numeric Inputs (`inputmode="numeric"`):**
  1. **Service Attendance:** Sunday School, Worship Attendance, Bible Study, Prayer Meeting, Visitors, and Auto-calculated Total Attendance.
  2. **Demographics & Workforce:** Children Count, Cadets, Cupbearers, Candlelighters, and Teachers.
  3. **Bible Club Attendance:** Children and Teachers.
  4. **Spiritual Report:** Salvations, Holy Ghost Baptisms, and Healings.
  5. **Special & Forthcoming Programmes:** Special Events Held and Upcoming Events.
- **Auto-Calculated Monthly Summary:** Bottom card providing the rep with real-time monthly rollup metrics.

### 🛡️ District Coordinator Dashboard
- **Global Time Filter:** Month and Year dropdowns that dynamically query historical records without ever wiping or resetting previous data.
- **Scope Filter:** Toggle between `Full Month Collation` and specific Sunday weeks (`1st Sunday` to `5th Sunday`).
- **Submission Compliance Tracker:** Real-time progress bar showing the percentage of churches submitted, with an expandable accordion breakdown of **Submitted** vs. **Pending** churches grouped by Zone.
- **Smart Collation Engine:**
  - **Average Headcount Rollup (Default):** Computes demographic workforce counts as an average across submitted weeks to prevent 4x cumulative inflation of recurring church members.
  - **Cumulative Totals (Sum):** Computes direct totals across weeks for attendance, visitors, and spiritual decisions.
- **Hierarchical Collation Table:**
  - Collapsible Zone headers.
  - Church rows showing submission counts and full metric breakdown.
  - Clear **Zone Subtotals** row.
  - Prominent **District Grand Totals** row and top KPI cards.
- **Data Management & Name Corrections Modal:** Edit or merge misspelled Church or Zone names entered by reps during self-registration, or reassign churches to different zones.
- **One-Click Export & Print:**
  - **Export CSV:** Downloads a formatted spreadsheet containing zone breakdowns, subtotals, and grand totals.
  - **Print / PDF:** Formatted `@media print` layout that cleans navigation elements for district executive meetings.

---

## 🏗️ Technical Architecture

- **Backend:** Node.js Express server running on port `5000`.
- **Database:** Node.js native `node:sqlite` (`DatabaseSync`) stored at `church-reports/data/church_reports.db`. Requires zero external native C++ build tools.
- **Frontend:** React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), and Lucide React icons.
- **Security:** Bcrypt password hashing and JWT token authentication.
