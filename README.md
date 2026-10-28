# Oxybott — STEM Kits, ESP32 Robotics & Coding Education Platform

![Oxybott Banner](assets/images/banner-app.webp)

A full-stack, production-hardened web platform for **Oxybott**, a premier brand specializing in ESP32 smart robotics kits, IoT STEM learning modules, and classroom curriculum solutions.

---

## 🚀 Key Features

* **Storefront & Product Catalog:**
  * Dynamic, responsive catalog loaded from SQLite with real-time filtering by category, difficulty series, and age groups.
  * Product Detail Pages (PDP) with high-res multi-angle galleries, STEM curriculum highlights, technical pinouts, and code samples.
  * Standardized Indian Rupee (INR `₹`) pricing across all components via `Intl.NumberFormat`.
* **Lead Capture & Inquiry Workflow:**
  * Functional lead forms for general inquiries, institutional quotation requests, educator trial units, and newsletter subscriptions.
  * Direct backend persistence to SQLite with server-side validation, duplicate submission protection (60s anti-spam window), and IP rate limiting.
* **Admin Dashboard:**
  * Secure administrative portal with JWT authentication, `SameSite: Strict` / `HttpOnly` cookie protection, and anti-CSRF headers.
  * Complete product CRUD (Create, Read, Update, Delete) with image upload validation (MIME-type filtering and file size bounds).
  * Inquiry & Lead Management dashboard to track, filter, and transition incoming leads (`new` → `in_progress` → `resolved` → `archived`).
  * Immutable administrative audit trail logging all sensitive mutations.
* **Performance & Asset Pipeline:**
  * Optimized WebP imagery with high-priority preloading (`fetchpriority="high"`) for above-the-fold heroes and native lazy-loading for below-the-fold media.
  * Parallel non-blocking Google Fonts loading via preconnect links.
  * Zero Cumulative Layout Shift (CLS = 0.000).
* **Accessibility (WCAG 2.1 AA):**
  * Semantic HTML5 landmarks (`<main id="mainContent">`) across all pages.
  * Verified 100% WCAG 2.1 AA color contrast compliance across buttons, chips, badges, and code blocks.
  * Keyboard-focusable code panes (`tabindex="0"` and ARIA labels).

---

## 🛠️ Technology Stack

* **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES2022)
* **Backend:** Node.js, Express 5.x
* **Database:** SQLite via Node.js native `node:sqlite` (`DatabaseSync` with WAL mode enabled)
* **Authentication:** JWT, bcryptjs, HTTP-only SameSite=Strict cookies, anti-CSRF headers
* **Testing:** Playwright, `@axe-core/playwright`, Google Lighthouse CLI

---

## 🏁 Getting Started

### 1. Prerequisites
* **Node.js** v20.x or v22.x+
* **npm** v10.x+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ishikaagarwal-firmware/oxybott-website.git
cd oxybott-website

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the environment template and configure secrets:
```bash
cp .env.example .env
```
Generate a strong production JWT secret (at least 32 characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Running the Application
```bash
# Start the local server
node server/server.js
```
Open your browser to:
* **Storefront:** [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
* **Admin Portal:** [http://127.0.0.1:3000/admin/](http://127.0.0.1:3000/admin/)

---

## 🧪 Testing & Quality Assurance

The codebase includes an automated regression and compliance test suite:

```bash
# Run all tests across desktop and mobile
npx playwright test

# Run accessibility audits only (WCAG 2.1 AA compliance)
npx playwright test tests/accessibility.spec.js

# Run regression & hardening verification suite
npx playwright test tests/regression-fixes.spec.js

# Run admin CRUD & security access tests
npx playwright test tests/admin-crud.spec.js tests/security-api.spec.js
```

Detailed independent QA verification findings, metrics, and before/after comparisons are documented in [`reports/INDEPENDENT_QA_AUDIT.md`](reports/INDEPENDENT_QA_AUDIT.md).

---

## 📄 License
This project is proprietary and confidential to Oxybott. All rights reserved.
