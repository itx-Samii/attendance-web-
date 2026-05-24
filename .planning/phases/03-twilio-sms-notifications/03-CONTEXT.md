# Phase 3: Twilio SMS Notifications - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Twilio API integration and parents' daily notification system. Educators preview customized drafts of SMS parent alerts dynamically before dispatching real-time notifications to the parents of absentees. Maintains localized logs in the system database for full audit transparency.

</domain>

<decisions>
## Implementation Decisions

### Alert Dispatch Trigger Model
- **D-01:** Integrate a Review/Preview Modal when saving attendance. If absentees exist, show an overlay listing all draft parent SMS alerts.
- **D-02:** Educators can inspect and customize each text dynamically, triggering SMS dispatch only upon a final explicit click of "Dispatch Parent Alerts" to prevent accidental sends.

### SMS Sandbox & API Fail-safes
- **D-03:** Support both real API operations and a local fallback simulator. Environment variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) configure real dispatches.
- **D-04:** If credentials are blank, invalid, or during development, the application seamlessly activates "Sandbox Simulator Mode," logging alerts to the server terminal and persisting them in the database for demonstration.

### SMS Messaging Template
- **D-05:** Provide an input field in the review modal for base template text, allowing educators to custom-adjust the template on the fly before triggering. Default template reads: `"Dear Parent, your child {student_name} (Roll: {roll_number}) was marked ABSENT from {class_name} today ({date}). Please contact the administration."`

### Notification Log & Auditor Display
- **D-06:** Build a dedicated `/dashboard/alerts` auditor page. Displays a detailed table logs grid of all historical dispatches showing Parent Phone, Student Name, Timestamp, Delivery Status (`Sent`, `Failed`, or `Simulator`), and Message Preview content.

### the agent's Discretion
- Standard UI details (button sizing, micro-animations, glassmorphic layout card overrides, and hover transition states) are left to the agent's design discretion following Phase 1 & 2 aesthetic standards.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Planning Specifications
- `.planning/ROADMAP.md` §Phase 3 — Defines Phase 3 goals and success criteria.
- `.planning/REQUIREMENTS.md` §NOTF-01-03 — Relational parents message requirement descriptions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts`: `readTable` and `writeTable` are used to persist SMS logs in `notifications.json`.
- `src/components/DashboardLayout.tsx`: Inherited dashboard sidebar grid navigation structure to link `/dashboard/alerts`.

### Established Patterns
- Symmetrical AES-256 state cookies for authentication, HSL color tokens for badge styling, and robust atomic JSON table writes.

### Integration Points
- `/api/attendance` POST route: Modifies attendance status, which triggers the ABSENT parent review modal.
- `/api/notifications` (NEW REST Route): GET retrieves sent logs, POST triggers dispatches.

</code_context>

<specifics>
## Specific Ideas
- A visually gorgeous toaster/status badge grid in `/dashboard/alerts` showcasing status badge colors (e.g. Emerald Green for `Sent`, Cyan for `Simulator`, Rose Red for `Failed`).

</specifics>

<deferred>
## Deferred Ideas
- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Twilio SMS Notifications*
*Context gathered: 2026-05-24*
