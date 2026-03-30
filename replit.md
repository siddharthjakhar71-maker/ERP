# JAKHIRA ERP — Replit Project

## Overview
A full construction/purchase management ERP dashboard (JAKHIRA ERP) migrated from the Jakhira-main/ source.

## Architecture
- **Frontend:** React + Vite + TailwindCSS v4 + shadcn/ui + TanStack Query
- **Backend:** Express.js + TypeScript (tsx)
- **Database:** SQLite via better-sqlite3 (file: `data/local.db`)
- **Auth:** Custom session-based auth with express-session
- **Routing:** wouter (client-side)

## Default Credentials
- **Email:** admin@purchase.local
- **Password:** admin123

## Key Modules
- Dashboard
- Sites management
- Vendor management (with ledger, payables, quotations, rate list)
- Materials catalog
- Purchase Orders (with PO template designer)
- GRN (Goods Receipt Notes)
- Bills
- Payments
- Stock Management
- Reports (Cost Analysis, Rate Comparison, Rate History)
- Settings (users, roles, company profile, permissions, audit log)

## Role-Based Access Control
Roles: Admin, Manager, Purchase, Accounts, Store, Viewer
Defined in `shared/permissions.ts`

## Project Structure
```
server/
  index.ts          - Express app entry point
  auth.ts           - Auth routes (login/logout/register)
  auth-middleware.ts - Auth session middleware
  db.ts             - SQLite DB setup (creates all tables)
  storage.ts        - Data access layer (IStorage interface)
  routes.ts         - All API routes
  lib/
    audit-log.ts    - Audit logging helper
    profile-image.ts - Profile image handling

shared/
  schema.ts         - Drizzle/SQLite schema for 15+ tables
  permissions.ts    - RBAC roles and permissions

client/src/
  App.tsx           - Router + providers setup
  main.tsx          - React entry point
  index.css         - TailwindCSS v4 theme + shadcn CSS vars
  pages/            - 27 page components
  components/
    layout/         - AppLayout, Header, Sidebar
    ui/             - shadcn component library
  lib/
    api.ts          - API client helpers
    store.tsx       - Global store (StoreProvider)
    theme.ts        - ThemeProvider (dark/light mode)
    queryClient.ts  - TanStack Query setup
    poDocGenerator.ts - PO document generator
  hooks/
    usePermissions.ts - Permission check hook
    use-toast.ts    - Toast notification hook
  stores/
    user-store.ts   - User state store

data/
  local.db          - SQLite database file
```

## Running
The `Start application` workflow runs `npm run dev` which starts both backend (port 5000) and the Vite frontend dev server on the same port.

## Dependencies Added
- `better-sqlite3` + `@types/better-sqlite3` - SQLite driver
- `xlsx` - Excel import/export
- `jspdf` + `jspdf-autotable` - PDF generation
- `tailwindcss@latest` (v4) - CSS framework
- `@tailwindcss/vite` - TailwindCSS v4 Vite plugin
