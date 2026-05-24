# Phase 3: Twilio SMS Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 3-Twilio SMS Notifications
**Areas discussed:** Alert Dispatch Trigger Model, SMS Sandbox & API Fail-safes, SMS Messaging Template, Notification Log & Auditor Display

---

## Alert Dispatch Trigger Model

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Automatically trigger and dispatch Twilio SMS alerts the moment a teacher clicks "Save Roster Attendance" for any student marked Absent. | |
| Option B | When saving attendance, if absentees exist, show an elegant overlay modal listing all draft SMS alerts. The teacher can preview the custom text per student and click a final "Dispatch Parent Alerts" button. | ✓ |

**User's choice:** Option B
**Notes:** Provides educators with peace of mind, full transparency, and zero risk of accidental duplicate SMS alerts.

---

## SMS Sandbox & API Fail-safes

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Error out or show delivery failures if paid Twilio API credentials are missing from environment files. | |
| Option B | Read real credentials from .env (TWILIO_ACCOUNT_SID, etc.). If they are blank, invalid, or during development, seamlessly fall back to an active "Sandbox Simulator Mode" that logs drafts visually to the server console and a custom simulator dashboard widget. | ✓ |

**User's choice:** Option B
**Notes:** Ensures immediate demo capability and testability for greenfield developers without requiring pre-paid credit cards or premium API numbers.

---

## SMS Messaging Template

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Pre-defined, fixed institutional notification text. | |
| Option B | Provide an active template input field in the review modal where teachers can adjust the base message dynamically before dispatching. | ✓ |

**User's choice:** Option B
**Notes:** Empower teachers to adjust school messages (e.g. adding exam notices or local weather remarks) on the fly.

---

## Notification Log & Auditor Display

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Display the last 5 sent notifications directly on the main Dashboard Overview Page. | |
| Option B | Build a dedicated sub-view screen /dashboard/alerts displaying a data-table of all sent logs (Timestamp, Parent Contact, Student, Delivery Status Sent/Failed/Simulator, and Message Preview). | ✓ |

**User's choice:** Option B
**Notes:** Keeps sent parent history secure, structured, and auditable under a separate channel.

---

## the agent's Discretion
- Visual theme, responsive styling adjustments, and confirmation toaster animations are left to the builder's styling discretion.

## Deferred Ideas
- None — discussion remained fully in scope.
