# WorkPlan

Plan. Track. Review. Deliver.

WorkPlan is an internal operating system for monthly team work planning, progress tracking, meeting presentation, decisions, and reporting.

It replaces a Microsoft Word-based monthly work-plan and meeting process. **WorkPlan is the source of truth.** Word/PDF/CSV reports are generated from live data when needed.

During meetings, the team looks at one shared **Meeting Presentation** screen. Individual screen sharing is not required.

## Overview

The hierarchy is:

Company → Department → Project → Deliverable → Task → Activity / Update

The same records power:

- Monthly work plans
- Daily task tracking
- Team and leadership dashboards
- Meeting presentation slides
- Decisions and action items
- Monthly Word-style reports

## Architecture

- **Next.js App Router** (React Server Components by default)
- **Auth.js / NextAuth** credentials sessions (JWT)
- **MongoDB + Mongoose** with indexes
- **Server Actions** for mutations, with server-side RBAC
- **API routes** for search, live meeting state, and report downloads
- Meeting audience screens poll `/api/meetings/[id]/live` so slide changes stay in sync without WebSockets. Live state is stored on the Meeting document so a realtime transport can be added later without a redesign.

```
app/
  (auth)/login
  (app)/my-work, team, leadership, projects, calendar, meetings, reports, admin
  (present)/meetings/[id]/present
  actions/          server mutations
  api/              auth, search, reports, live meeting state
lib/                db, permissions, queries, reports, progress
models/             mongoose schemas
scripts/seed.ts     realistic demo data
```

## Tech stack

- Next.js 16 (App Router, TypeScript)
- MongoDB / Mongoose
- Auth.js (NextAuth v5)
- Tailwind CSS + shadcn/ui
- Lucide React, Recharts, Zod, React Hook Form, date-fns
- `docx`, `jspdf`, CSV for exports
- `@dnd-kit` for the Kanban board

## Installation

```bash
npm install
cp .env.example .env.local
```

Set `AUTH_SECRET` to a long random string:

```bash
openssl rand -base64 32
```

## Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_URL` | App URL, e.g. `http://localhost:3000` |

See `.env.example`. Do not commit secrets.

## MongoDB setup

Run a local MongoDB instance, or use MongoDB Atlas.

Local example:

```bash
# macOS
brew services start mongodb-community

# Docker
docker run -d --name workplan-mongo -p 27017:27017 mongo:7
```

Default URI:

```
mongodb://127.0.0.1:27017/workplan
```

## Authentication

Auth.js credentials provider. Passwords are hashed with bcrypt. Sessions are JWTs. Route protection:

- `proxy.ts` requires a session cookie for all non-public routes
- Layouts and server actions enforce roles
- TEAM_MEMBER cannot use admin mutations by URL guessing

After login:

- TEAM_MEMBER → `/my-work`
- MANAGER → `/team`
- ADMIN → `/leadership`

## Seed data

```bash
npm run seed
```

Creates the TBB Africa department and the August 2026 Team Meeting Brief-Out: Mike, John, Will, London, Drew, Kuyu, Kelvin, and Dos, with CEAI, HQ Kenya House, The ARC / Summer Series, Nia Sessions, Moto Tickets, Creative Economy 101, and General Operations.

| Email | Role | Password |
| --- | --- | --- |
| `mike@theburnsbrothers.com` | ADMIN | `WorkPlan2026!` |
| `will@theburnsbrothers.com` | MANAGER | `WorkPlan2026!` |
| `london@theburnsbrothers.com` | MANAGER | `WorkPlan2026!` |
| `john@theburnsbrothers.com` | TEAM_MEMBER | `WorkPlan2026!` |
| `drew@theburnsbrothers.com` | TEAM_MEMBER | `WorkPlan2026!` |
| `kuyu@theburnsbrothers.com` | TEAM_MEMBER | `WorkPlan2026!` |
| `kelvin@theburnsbrothers.com` | TEAM_MEMBER | `WorkPlan2026!` |
| `dos@theburnsbrothers.com` | TEAM_MEMBER | `WorkPlan2026!` |

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run lint
npm run build
npm start
```

## Deployment (Vercel)

1. Push the repo and import it in Vercel.
2. Set these environment variables for **Production**:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://your-domain.com` (no trailing slash) |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | `WorkPlan <connect@theburnsbrothers.com>` |
| `CRON_SECRET` | `openssl rand -base64 32` |

3. In Atlas, allow Vercel IPs (or `0.0.0.0/0` only if you accept that risk).
4. Verify the `theburnsbrothers.com` domain in Resend so invite mail delivers.
5. After deploy, sign in as admin and **Email the team** from Admin. Invite links use `AUTH_URL`.
6. Do not run `npm run seed` against production unless you intend to wipe and replace accounts.

Do not commit `.env.local`. `.env.example` must stay placeholders only.

## Roles and permissions

### ADMIN

Users, departments, all projects, all reports, meetings, settings, audit logs.

### MANAGER

Assigned-team planning, projects, reviews, meetings, presentation host controls, reports, decisions, action items.

### TEAM_MEMBER

Assigned work, progress updates, next actions, support/blockers, comments, own/team work they belong to, meeting participation.

Permissions are enforced in server actions and page loaders, not only by hiding buttons.

## Meeting Mode

1. Manager creates **August Team Review**.
2. **Start meeting** → status becomes LIVE.
3. Open `/meetings/[id]/present` on the TV/projector (host mode).
4. Everyone else clicks **Join presentation** (audience).
5. Host walks Team Overview → each person (completed, in progress, next, support) → decisions → action items.
6. Host can resolve support/blockers live; slides refresh from database data.
7. **End meeting** generates a summary from real records.

Keyboard (host): Left/Right arrows, Space pause, F fullscreen, Esc exit fullscreen.

Presenter mode (`?mode=presenter`) shows private talking points beside the audience slide. The presenter does not need to share their screen.

Audience clients poll live meeting state every 1.5s.

## Reports

`/reports` generates:

- Individual monthly
- Team monthly
- Project
- Weekly
- Meeting
- Leadership summary

Exports: **DOCX** (Word-style table), **PDF**, **CSV**.

The Word-style table is an export of Goal / Deliverable, Actions Taken, Planned, Support Needed, and % Complete. It is never the database source of truth.

## Progress

Task `weight` feeds weighted deliverable and project progress. A person’s monthly progress uses their active work-plan-month tasks, not a simple average of historical work.
