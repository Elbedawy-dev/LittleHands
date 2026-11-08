# Little Hands (أيدي صغيرة)

**Little Hands (أيدي صغيرة)** is an Arabic-first marketplace connecting nursery educators and parents with skilled Egyptian artisan workshops crafting handmade educational felt and cloth teaching aids.

---

## 1. Architecture Overview

- **Backend (`Backend/`):**
  - Node.js + Express (Layered architecture: Routes → Controllers → Services → Models).
  - Database: **MongoDB Atlas** (Replica Set).
  - Storage: **Cloudinary** (Secure CDN for public images; authenticated streaming for private payment receipts).
  - Security: HTTP-only cookies, JWT rotation with token-family reuse detection, strict CORS, CSRF protection (`X-Requested-With: lh-web`), and rate limiting.
  - Automated Tests: Vitest suite with in-memory Mongo server and memory storage driver.

- **Frontend (`Frontend/`):**
  - React 19 + Vite 8 + Tailwind CSS v4.
  - Bilingual (`ar` & `en`) with full RTL/LTR support via `i18next`.
  - Direct integration with Backend REST API (`/api/v1`) using Axios with automatic silent token refresh, idempotency keys, and localized error handling.

---

## 2. Quick Start

### Backend Setup
1. Configure `Backend/.env` based on `Backend/.env.example`:
   ```bash
   cp Backend/.env.example Backend/.env
   ```
2. Verify configuration:
   ```powershell
   npm --prefix Backend run check:env
   ```
3. Seed baseline categories and settings (into Atlas):
   ```powershell
   npm --prefix Backend run seed:base
   ```
4. Seed platform super-admin account (into Atlas):
   ```powershell
   npm --prefix Backend run seed:admin
   ```
5. Start development backend:
   ```powershell
   npm --prefix Backend run dev
   ```
   Server runs on `http://localhost:5000` (Health check: `http://localhost:5000/api/v1/health`).

### Frontend Setup
1. Start development frontend:
   ```powershell
   npm --prefix Frontend run dev
   ```
   Frontend runs on `http://localhost:5173` (with `/api` proxied to port 5000).

---

## 3. Testing & Verification

- **Backend Automated Tests:**
  ```powershell
  npm --prefix Backend test
  ```
  Runs 192 tests across 21 test suites in full isolation.

- **Canonical Route Parity:**
  ```powershell
  node check-routes.mjs
  ```
  Validates that all 80 canonical endpoints match route definitions exactly.

- **Frontend Lint & Child Constraints:**
  ```powershell
  npm --prefix Frontend run lint
  ```

- **Frontend Production Build:**
  ```powershell
  npm --prefix Frontend run build
  ```

