# Phase 2: Roster & Daily Marking - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning
**Source:** Autonomous Phase 2 Context Formulation

<domain>
## Phase Boundary

This phase delivers the core daily attendance marking sheet and roster system, connecting the front-end layout with the local JSON database.

</domain>

<decisions>
## Implementation Decisions

### 1. Daily Roster Layout
- **Class & Date Selection**: Provide a dropdown to select the Class/Section and a date picker (defaulting to the current date).
- **Roster Table**: Render a robust, beautiful enterprise table displaying the student's Roll Number, Name, Parent Phone, and a Status Selector.
- **Status Options**: Support four atomic selections: **Present**, **Absent**, **Late**, and **Leave** (using interactive button chips styled with HSL status badges).
- **Save State**: Submit button triggering atomic saves to `data/attendance.json` using the local database helper.

### 2. Relational Key Constraints
- **relational key linking**: Map attendance records to `rollNumber` (string) and `classId` (string).
- **Date stamp**: Save date stamps in the standard ISO `YYYY-MM-DD` string format to guarantee reliable querying.

### 3. the agent's Discretion
- Code client-side forms state using React hooks (`useState`, `useTransition`) to ensure seamless interactions and instant button responses.
- Render dynamic statistics at the top of the roster (e.g. Total Students, Selected Present, Selected Absent, Leave) to give teachers instant feedback before saving.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Guidelines
- [PROJECT.md](file:///d:/New%20folder%20%283%29/.planning/PROJECT.md) — Base relational specs.
- [REQUIREMENTS.md](file:///d:/New%20folder%20%283%29/.planning/REQUIREMENTS.md) — Roster functional requirement checklists.
- [db.ts](file:///d:/New%20folder%20%283%29/src/lib/db.ts) — Relational atomic local JSON read/write handlers.

</canonical_refs>

<specifics>
## Specific Ideas

- Highlight absent records with a soft red outline or glass panel badge to indicate that an SMS parent notification is scheduled for dispatch.
- Group student rows with dynamic hovering actions to highlight the active row.

</specifics>

<deferred>
## Deferred Ideas

- **Twilio SMS Alerts**: The API triggers and message dispatching systems are deferred to Phase 3. Phase 2 will focus entirely on roster UI design and database records storage.

</deferred>

---

*Phase: 02-roster-daily-marking*
*Context gathered: 2026-05-24 after Phase 1 completion*
