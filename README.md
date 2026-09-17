# Syncora

**Syncora is a full-stack Collaborative Work Management platform built with Next.js, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Zustand, and realtime collaboration, supporting project management, workflows, approvals, requests, customer operations, reporting, and organization-level management.**

## 🚀 Overview

Syncora was built to demonstrate complex, enterprise-grade architecture in a modern React ecosystem. It moves beyond simple task management by incorporating deep domain workflows, role-based access control (RBAC), row-level security (RLS), and a real-time sync engine.

### Key Features
- **Multi-Tenant Architecture**: Support for Organizations, Teams, and isolated Workspaces.
- **Real-Time Collaboration**: Powered by Supabase Postgres changes, ensuring tasks, comments, and statuses update instantly across all connected clients without browser refreshes.
- **Dynamic Domain Workflows**: Deep template seeding for Software Development, Sales, HR, IT, and Content Creation that dictate custom statuses and labels.
- **Enterprise Operations**: 
  - Top-down strategic alignment via Goals and Portfolios.
  - Immutable global Audit Logs.
  - Granular RBAC mapped directly to PostgreSQL Row-Level Security.
- **Business Workflows**: External Customer Requests, Peer Approvals, Workload capacity planning, and comprehensive cross-project Reporting.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui + Radix Primitives
- **State Management**: Zustand (Global/Realtime) + React Context
- **Database & Auth**: Supabase (PostgreSQL)
- **Realtime Engine**: Supabase Channels

## 🔐 Architecture & Security

Syncora utilizes a dual-layer security model:
1. **Frontend RBAC**: Zustand stores and React hooks intelligently disable or hide UI elements based on the current user's role (Owner, Admin, Member, Guest).
2. **Backend RLS**: The ultimate source of truth. Supabase Row-Level Security policies are strictly enforced on all core tables (`projects`, `tasks`, `documents`, `audit_logs`). Even if the frontend UI is manipulated, Postgres will reject unauthorized operations via custom `is_workspace_member()` and `is_org_member()` database functions.

## 🏃‍♂️ Running Locally

1. **Clone the repository**
2. **Install dependencies**: 
   ```bash
   npm install
   ```
3. **Configure Environment Variables**: Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-key"
   ```
4. **Run Database Migrations**:
   ```bash
   npx supabase db push
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing & Validation

Syncora was built through 9 major release phases, culminating in a rigorous Portfolio & Production Validation sequence covering:
- **E2E Multi-User Workflows**: Simulating Owner → Admin → Member interactions across shared workspaces.
- **Domain Template Verification**: Ensuring Software, IT, and Sales workflows adapt structurally, not just visually.
- **Data Integrity**: Eliminating N+1 query patterns and guaranteeing that all actions result in persistent, immutable database mutations.
- **Zero-Dead-End Guarantee**: No placeholder pages, "Coming Soon" buttons, or simulated data. Everything on the screen is connected to the operational backbone.

## 📝 License
MIT
