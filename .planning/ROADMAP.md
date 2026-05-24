# Roadmap: Aura Attendance Management System

## Overview

Aura Attendance Management System is a premium, user-centric daily attendance platform designed to optimize school roster management and eliminate parent communication gaps. The project is decomposed into 4 highly cohesive phases, building a comprehensive Next.js web portal with a gorgeous aesthetic, localized JSON database storage, and a real-world Twilio SMS notification engine.

## Phases

- [x] **Phase 1: Foundation & Layout** - Initialize the premium dark/light layout and JSON file-based database adapters. (completed 2026-05-24)
- [x] **Phase 2: Roster & Daily Marking** - Develop student rosters and interactive daily attendance marking tables. (completed 2026-05-24)
- [x] **Phase 3: Twilio SMS Notifications** - Integrate the Twilio messaging API and real-time parent alert verification. (completed 2026-05-24)
- [ ] **Phase 4: Admin Analytics & Polish** - Construct analytics graphs, key metric widgets, and finalize visual transitions.

## Phase Details

### Phase 1: Foundation & Layout
**Goal:** Initialize Next.js project structure, implement premium bespoke CSS styling system (with light/dark theme switcher), set up the file-based JSON storage adapters, and configure credential login logic.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** [AUTH-01, AUTH-02, DASH-03]
**Success Criteria**:
  1. The Next.js application is initialized and renders a premium responsive layout.
  2. The custom light/dark theme switch is functional and persists selection.
  3. Secure credential login and session persistence are operational.
  4. Local file database helper reads and writes JSON datasets reliably.
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01: Initialize Next.js app structure, core theme provider, global layout, and custom vanilla CSS variables.
- [x] 01-02: Develop the local JSON file database manager, teacher login routes, and session authentication logic.

### Phase 2: Roster & Daily Marking
**Goal:** Build student/class registration dashboards, dynamic rosters, and the interactive daily attendance table.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** [ROST-01, ROST-02, ROST-03, ROST-04, ATT-01, ATT-02, ATT-03, ATT-04]
**Success Criteria**:
  1. Teachers can create classes and sections.
  2. Teachers can register students with name, roll number, and parent phone number.
  3. Interactive attendance table renders a scrollable list of students with Present/Absent/Late/Leave selectors.
  4. Bulk-marking sets all unmarked records to "Present" immediately.
  5. Mark logs are successfully saved to local JSON storage keyed by Date and Class ID.
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01: Develop class and student registration views with dynamic listing rosters.
- [x] 02-02: Implement the interactive daily attendance table, bulk-actions, and date-keyed saving controllers.

### Phase 3: Twilio SMS Notifications
**Goal:** Set up Twilio API credentials, generate parent alerts, preview customized notifications, and trigger real-time delivery logs.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** [NOTF-01, NOTF-02, NOTF-03]
**Success Criteria**:
  1. Teachers can preview draft SMS parent notification lists prior to sending.
  2. Absentees' parent contacts receive real-time, customized SMS alerts via Twilio.
  3. Delivery histories (timestamp, target, status) are recorded in the local JSON storage and displayable.
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01: Integrate Twilio Node SDK and build the personalized parent alert draft/preview modal.
- [x] 03-02: Develop active SMS dispatching logic and notification log auditor views.

### Phase 4: Admin Analytics & Polish
**Goal:** Build visual analytics dashboard components, overall statistical cards, check security edges, and polish visual polish.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** [DASH-01, DASH-02]
**Success Criteria**:
  1. Attendance dashboard charts display daily/weekly student attendance percentages and trend rates.
  2. Quick stat indicator cards show total enrollment, overall institutional rates, and today's absent count.
  3. The interface features responsive designs, premium glassmorphism accents, and responsive styles on all viewports.
**Plans:** 1 plan

Plans:
- [ ] 04-01: Build analytics charts, dashboard statistic cards, and polish layout visual styling.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Layout | 2/2 | Complete    | 2026-05-24 |
| 2. Roster & Daily Marking | 2/2 | Complete    | 2026-05-24 |
| 3. Twilio SMS Notifications | 2/2 | Complete    | 2026-05-24 |
| 4. Admin Analytics & Polish | 0/1 | Not started | - |
