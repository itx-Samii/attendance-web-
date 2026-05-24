# Phase 1: Foundation & Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 01-foundation-layout
**Areas discussed:** Global Visual Aesthetic & Layout Style, Local JSON Database Structure & File I/O Safety, Teacher Authentication & Credentials Policy

---

## Global Visual Aesthetic & Layout Style

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Deep space dark theme by default (indigo background, glowing glassmorphic cards, transition toggle to light) | |
| Option B | Clean enterprise light theme by default (pure white/soft gray, subtle modern typography, high-contrast dark theme toggle) | ✓ |
| Option C | Custom brand design scheme | |

**User's choice:** Option B
**Notes:** The system must look clean, sophisticated, and professional with soft enterprise light styling, but support a high-contrast dark mode to ease eye strain.

---

## Local JSON Database Structure & File I/O Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Relational single-table files: `classes.json`, `students.json`, and `attendance.json` | ✓ |
| Option B | Cohesive class-centric JSON file with deeply nested student rosters and attendance logs | |
| Option C | Custom database schema / Fee Management relational format | |

**User's choice:** Option A
**Notes:** Highly scalable, allows efficient search, indexing, and modifications without updating massive nested objects.

---

## Teacher Authentication & Credentials Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Simplified secure local session utilizing encrypted state cookies and single-account institutional credentials | ✓ |
| Option B | Comprehensive teacher profile database in `teachers.json` with multi-account registration and password hashing | |

**User's choice:** Option A
**Notes:** Best suited for lightweight, fast school ERP deployments where an institutional credentials config is secure enough.

---

## the agent's Discretion

- Selection of specific modern sans-serif fonts (e.g., Google Fonts' Outfit or Inter).
- Custom UI design assets like Sidebar structure, logo watermark, layout spacing.
- Cookie encryption and salt length settings.

## Deferred Ideas

- None — discussion stayed within phase scope.

---

*Phase: 01-foundation-layout*
*Discussion log generated: 2026-05-24*
