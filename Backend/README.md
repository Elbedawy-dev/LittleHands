# Little Hands (أيدي صغيرة) — Backend API

Backend API server for **Little Hands (أيدي صغيرة)**, an Arabic-first marketplace for handmade educational teaching aids for nurseries in Egypt.

---

## 1. Quick Start (Local Development)

### Prerequisites
- Node.js LTS (v20+ recommended)
- MongoDB Atlas cluster (read from MONGODB_URI)
- PowerShell 5.1+ (Windows) or bash (macOS/Linux)

### Installation & Environment
1. Ensure `.env` is configured in `Backend/`:
   ```bash
   cp .env.example .env
   ```
2. Verify environment configuration:
   ```powershell
   npm run check:env
   ```
3. Seed categories and platform settings:
   ```powershell
   npm run seed:base
   ```
4. Seed platform super-admin user:
   ```powershell
   npm run seed:admin
   ```
5. (Optional) Create artisan workshop sellers via CLI:
   ```powershell
   npm run create:seller -- --name "ورشة الأمل للوسائل" --email "seller1@workshop.eg" --phone "01011112222" --password "SellerPass123!"
   ```
6. Start the development server:
   ```powershell
   npm run dev
   ```
   API is accessible at `http://localhost:5000/api/v1` (Health check: `http://localhost:5000/api/v1/health`).

---

## 2. Testing & Quality Assurance

- **Run Linter:**
  ```powershell
  npm run lint
  ```
- **Run Automated Test Suite:**
  ```powershell
  npm test
  ```
  *(Uses `mongodb-memory-server` in-memory database; completely isolated from production/development databases).*

- **Run Production Environment Pre-flight Check:**
  ```powershell
  npm run check:env -- --prod
  ```

---

## 3. Production Deployment Checklist

Before deploying Little Hands Backend to production:

- [ ] **Database Connection:** `MONGODB_URI` points to a high-availability MongoDB replica set (e.g. MongoDB Atlas) with SSL/TLS enabled. No localhost URIs.
- [ ] **Strong Secrets:**
  - `JWT_ACCESS_SECRET`: At least 32 cryptographically secure random characters.
  - `JWT_REFRESH_SECRET`: At least 32 cryptographically secure random characters.
- [ ] **Cookie Security:**
  - `NODE_ENV=production` ensures auth cookies (`lh_at`, `lh_rt`) have the `Secure` flag enabled (HTTPS only).
  - `COOKIE_SAMESITE=lax` (or `strict` / `none` depending on front-end domain alignment).
- [ ] **CORS & CSRF:**
  - `CLIENT_ORIGINS` configured strictly to platform production domains (e.g. `https://littlehands.eg,https://www.littlehands.eg`). No wildcards or localhost origins.
  - Reverse proxy passes `X-Forwarded-For` and `X-Forwarded-Proto` with `trust proxy: 1`.
- [ ] **Email Delivery:**
  - `EMAIL_DRIVER=smtp`
  - Valid `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` configured.
  - `REQUIRE_EMAIL_VERIFICATION=true`.
- [ ] **Storage Infrastructure:**
  - `STORAGE_DRIVER=cloudinary` with production credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) or secure private object storage.
- [ ] **Admin Credentials:** Change default `ADMIN_PASSWORD` to a strong unique password.
- [ ] **Monitoring & Process Management:** Run via process manager (e.g., PM2 or container orchestration) with graceful shutdown hooks (`SIGINT`/`SIGTERM`).

