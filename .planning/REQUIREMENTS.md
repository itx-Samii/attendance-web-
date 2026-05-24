# Requirements: Aura Attendance Management System

**Defined:** 2026-05-24
**Core Value:** Empower teachers with an intuitive daily attendance dashboard and guarantee that parents are instantly and reliably notified when their child is absent.

## v1 Requirements

### Authentication & Setup

- [x] **AUTH-01**: Secure teacher login screen using local credential matching.
- [x] **AUTH-02**: Persist teacher session securely across page refreshes.

### Class & Student Rosters

- [ ] **ROST-01**: View list of all active classes and sections in the institution.
- [ ] **ROST-02**: Add a new class with class name, section, and standard subjects.
- [ ] **ROST-03**: View the complete student roster for any selected class.
- [ ] **ROST-04**: Add a new student to a class with their Name, Roll Number, and Parent Contact Number.

### Daily Attendance Marking

- [ ] **ATT-01**: Select a class/date and view all students in a clean, scrollable roster table.
- [ ] **ATT-02**: Select individual student status from four states: **Present**, **Absent**, **Late**, and **Leave** using drop-down selectors.
- [ ] **ATT-03**: Bulk-mark option to set all unmarked students to "Present" to speed up entry.
- [ ] **ATT-04**: Save attendance records securely to a local file-based JSON store, keyed by date and class ID.

### Notification Services

- [ ] **NOTF-01**: Display a personalized, clear draft/preview of parent alert messages prior to sending.
- [ ] **NOTF-02**: Securely integrate Twilio API to dispatch real-time SMS parent alerts for students marked "Absent".
- [ ] **NOTF-03**: Maintain a robust local history log of all parent notification delivery attempts (timestamp, recipient, status).

### Admin Dashboard & Analytics

- [ ] **DASH-01**: Interactive overview charts showing daily attendance rates and trends.
- [ ] **DASH-02**: Key indicator cards showing total enrolled students, overall attendance rate, and today's absentees.
- [x] **DASH-03**: Modern premium theme controller with custom Dark/Light modes, glassmorphism card panels, and smooth micro-animations.

## v2 Requirements

### Advanced Notifications

- **NOTF-04**: Secure WhatsApp Business API integration for multi-channel support.
- **NOTF-05**: Interactive parent replies to allow parents to respond with "Reason for Absence" directly via SMS/WhatsApp.

### Institution Controls

- **ROST-05**: Bulk student import via Excel or CSV upload.
- **DASH-04**: Automated PDF report exports for monthly institutional audits.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native Mobile App | Deferring to focus on a premium, ultra-responsive web portal (mobile, tablet, desktop). |
| RFID & Biometric Scanners | Excluded for software-only standalone scope; teacher marks attendance manually. |
| Automated Parent Voice Calls | Deferring to keep parent alerts simple, non-intrusive, and cost-effective. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| ROST-01 | Phase 2 | Pending |
| ROST-02 | Phase 2 | Pending |
| ROST-03 | Phase 2 | Pending |
| ROST-04 | Phase 2 | Pending |
| ATT-01  | Phase 2 | Pending |
| ATT-02  | Phase 2 | Pending |
| ATT-03  | Phase 2 | Pending |
| ATT-04  | Phase 2 | Pending |
| NOTF-01 | Phase 3 | Pending |
| NOTF-02 | Phase 3 | Pending |
| NOTF-03 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after initial definition*
