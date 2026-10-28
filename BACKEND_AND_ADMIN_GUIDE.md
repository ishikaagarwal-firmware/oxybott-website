# Oxybott Enterprise Backend & Admin Dashboard

Complete technical reference and operations guide for the database, backend API, and administrative dashboard.

---

## 1. Quick Start

### Starting the Server
```bash
# Start backend server
node server/server.js
```
The server binds to `http://127.0.0.1:3000/`.

- **Public Website:** [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
- **Admin Dashboard:** [http://127.0.0.1:3000/admin/](http://127.0.0.1:3000/admin/)
- **Initial Admin Username:** `admin`
- **Initial Admin Password:** `AdminPassword123!`

---

## 2. Environment Variables (`.env`)

```env
PORT=3000
HOST=127.0.0.1
NODE_ENV=development
JWT_SECRET=oxybott_secure_jwt_secret_key_prod_2026_xyz987
DATABASE_FILE=./data/oxybott.db
UPLOAD_DIR=./uploads/products
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=20
```

---

## 3. Database Management

- **Database File:** `./data/oxybott.db` (SQLite in WAL mode with Foreign Keys enabled)
- **Re-seeding:** To reset or reseed default categories, authentic products, settings, and the admin account:
  ```bash
  node server/seed.js
  ```

---

## 4. Key Capabilities

- **Zero-Code Updates:** All product names, descriptions, images, prices, stock, categories, specs, and banners can be edited live from the dashboard without touching frontend code.
- **Dynamic Storefront Connection:** Public pages (`index.html`, `products.html`, `product-detail.html`) use `assets/js/store-client.js` to automatically fetch live database records.
- **Multi-Image Management:** Upload product photos directly through the dashboard with automated thumbnail and primary view management.
- **Audit Trail:** Every administrative action (logins, creates, updates, status toggles, deletions) is timestamped and recorded in the `audit_logs` table.
