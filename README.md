# Sumaya Resto — Multi-Tenant Restaurant Management Platform

A complete restaurant & food chain management system built from the **Sumaya_Resto_Complete_Requirement_Pack.xlsx** specification.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + PostgreSQL + Redis |
| Web App | React + Vite + Tailwind CSS |
| Mobile App | React Native (Expo) |
| Auth | JWT + Role-Based Access Control |

## Features (22 Modules)

All modules have **full CRUD APIs** connected to PostgreSQL — no dummy/fake on-screen data:

- Tenant & Brand Management
- Authentication, RBAC & Staff
- Branch & Location Management
- Floor, Table & Seating
- Waiter POS & Order Capture
- Customer QR Ordering
- Menu & Recipe Management
- Kitchen Display & KOT
- Billing, Taxes & Payments
- Delivery, Takeaway & Dispatch
- Customer App & Loyalty
- Promotions & Coupons
- Inventory & Stock Control
- Supplier & Purchase
- Finance & Accounting
- Reservations & Events
- Reporting & Analytics
- Admin CMS & Content
- Integrations & Webhooks
- Audit, Security & Compliance
- Mobile Apps & Offline Mode
- Super Admin & SaaS Billing

## Quick Start

### 1. Start Database & API

```bash
docker compose up -d
docker exec sumayarestro-backend-1 python seed.py
```

API: http://localhost:8001/docs

### 2. Start Web App

```bash
cd web
npm install
npm run dev
```

Web: http://localhost:5173

### 3. Start Mobile App

```bash
cd mobile
npm install
npx expo start
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@sumayaresto.com | Sumaya@123 |
| Restaurant Owner | owner@spice-garden.com | Sumaya@123 |
| Branch Manager | manager@spice-garden.com | Sumaya@123 |
| Waiter | waiter@spice-garden.com | Sumaya@123 |
| Kitchen | kitchen@spice-garden.com | Sumaya@123 |
| Cashier | cashier@spice-garden.com | Sumaya@123 |

## Demo Restaurants

| Slug | Name | City |
|------|------|------|
| spice-garden | Spice Garden | Ahmedabad (2 branches) |
| urban-bowl | Urban Bowl Cafe | Pune |
| coastal-curry | Coastal Curry House | Mumbai |

Public ordering: http://localhost:5173/r/spice-garden

## Theme

Warm restaurant palette per requirements:
- Amber `#F59E0B` · Chili Red `#DC2626` · Coffee Brown `#78350F` · Cream `#FFFBEB`

## API Endpoints

All domains follow REST pattern:
- `GET /api/v1/{domain}/list` — Paginated list
- `POST /api/v1/{domain}/create` — Create record
- `GET /api/v1/{domain}/detail/{id}` — Get by ID
- `PATCH /api/v1/{domain}/update/{id}` — Update record
- `PATCH /api/v1/{domain}/status/{id}` — Status change
- `GET /api/v1/{domain}/export` — Export data

## Deploy on Render

See **[DEPLOY.md](DEPLOY.md)** for full instructions.

```powershell
.\scripts\deploy-all.ps1   # Docker + seed + tunnel + Render checklist
```

1. `render.yaml` — Blueprint for API + static web (CORS + API URL pre-configured)
2. `.\scripts\tunnel-postgres.ps1` — ngrok TCP tunnel (requires free ngrok authtoken)
3. `.\scripts\tunnel-cloudflared.ps1` — Cloudflare alternative
4. Repo: [github.com/mayankmehta1610/sumayarestro](https://github.com/mayankmehta1610/sumayarestro)

