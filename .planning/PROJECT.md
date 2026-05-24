# Aura Attendance Management System

## What This Is

A premium, highly interactive Next.js-based student attendance management ERP that enables teachers to mark, update, and manage student attendance daily. It bridges the communication gap between educational institutions and households by automatically sending real-time SMS/WhatsApp notifications to the parents of absent students using the Twilio API.

## Core Value

Empower teachers with a highly intuitive, responsive daily attendance marking dashboard and guarantee that parents are instantly and reliably notified when their child is absent.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] **ATT-01**: Select class and view a classic, clean table roster of students with roll numbers and status selectors.
- [ ] **ATT-02**: Mark daily student attendance status using four clear states: **Present**, **Absent**, **Late**, and **Leave**.
- [ ] **ATT-03**: Trigger real-time, personalized SMS or WhatsApp parent notifications via Twilio API when a student is marked Absent.
- [ ] **ATT-04**: Maintain a zero-config, ultra-fast **local JSON-file database** to store classes, students, daily rosters, and notification history.
- [ ] **ATT-05**: Interactive Admin Dashboard showcasing attendance analytics (e.g., daily/monthly rates, class-wise stats, and notification delivery statuses).
- [ ] **ATT-06**: Premium user interface featuring a gorgeous dark/light mode toggle, glassmorphic layout cards, custom fonts, smooth micro-animations, and full responsiveness.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Native Mobile Apps** — Deferred to future iterations; the web app will be fully responsive for all screen sizes (mobile, tablet, desktop).
- **RFID/Biometric Integration** — Out of scope for this phase; attendance will be entered manually by the teacher.
- **Automated Parent Voice Calls** — Excluded to keep parent notification light, cost-effective, and non-intrusive.

## Context

- **Environment**: Greenfield Next.js (App Router) web application built in the `d:\New folder (3)` workspace directory.
- **Background**: The user works on next-generation educational enterprise systems (such as the adjacent Fee Management ERP) and demands a matching, state-of-the-art UI/UX with smooth transitions and premium typography.
- **Storage**: Attendance data, student logs, and messaging history will reside in structured local JSON files, maintaining zero-cost and instant setup.

## Constraints

- **Tech Stack**: Next.js (App Router), Vanilla CSS for custom bespoke styling, Twilio SDK, Node.js.
- **External Dependencies**: Twilio accounts and credentials (Account SID, Auth Token, Sender Number) are required to enable real-world SMS/WhatsApp parent alerts.
- **Local Database**: All file operations must be atomic to ensure no data corruption occurs under concurrent access.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router | Delivers top-tier page performance, elegant routing structure, and ease of deployment. | — Pending |
| Local JSON Storage | Eliminates external DB connection overhead and provides a zero-setup local developer environment. | — Pending |
| Twilio API integration | Industry-leading standard for real-world SMS and WhatsApp notification delivery. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after initialization*
