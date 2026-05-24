# Walking Skeleton — Aura Attendance Management System

**Phase:** 1
**Generated:** 2026-05-24

## Capability Proven End-to-End

> **A teacher can securely log in using single-account credentials, load the premium responsive dashboard layout displaying placeholder institutional metrics from local JSON storage, and toggle light/dark color themes dynamically.**

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js App Router (React 18/19 Server & Client Components) | Modern industry standard for reactive dashboard UIs and server-rendered API security. |
| Data layer | Relational Local JSON tables under `data/` | Super fast, zero-config localized file system CRUD operations matching client ERP requirements. |
| Auth | Cookie-based Session + Encrypted Tokens | Simple, highly secure teacher login state management utilizing cookie headers. |
| Styling system | Vanilla CSS Custom Variables + Global Layout System | Complete layout flexibility, bespoke premium glassmorphic visual aesthetics, and zero overhead. |
| Directory layout | Next.js standard App Router (`src/app/`, `src/components/`, `src/lib/`) | Best-practice clean separation of visual views, UI components, and business controllers. |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js, TypeScript, and styling variables structure).
- [x] Routing — `/login` route and `/dashboard` page setup.
- [x] Database — Read and write data helpers for local JSON tables under `data/`.
- [x] UI — Interactive theme toggle and credential submission login form.
- [x] Deployment — Running development server on local port.

## Out of Scope (Deferred to Later Slices)

- Dynamic teacher account registration (institutional administration credentials are hardcoded).
- Registering student details and classes (deferred to Phase 2 roster).
- Attendance marking table elements (deferred to Phase 2 attendance).
- Twilio parent absent SMS notification system (deferred to Phase 3 alerts).
- Live attendance percentage analytics graphs (deferred to Phase 4 reports).

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2 (Roster & Daily Marking)**: Develop student rosters and interactive daily attendance marking tables.
- **Phase 3 (Twilio SMS Notifications)**: Integrate the Twilio messaging API and real-time parent alert verification.
- **Phase 4 (Admin Analytics & Polish)**: Construct analytics graphs, key metric widgets, and finalize visual transitions.
