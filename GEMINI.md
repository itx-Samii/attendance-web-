# Aura Attendance ERP — Development Guide

Welcome to the development environment of the **Aura Attendance Management System**. This guide maintains workflow alignment and provides technical guidelines for this workspace.

## 1. Project Reference

- **Context**: [PROJECT.md](file:///.planning/PROJECT.md)
- **Requirements**: [REQUIREMENTS.md](file:///.planning/REQUIREMENTS.md)
- **Roadmap**: [ROADMAP.md](file:///.planning/ROADMAP.md)
- **Project State**: [STATE.md](file:///.planning/STATE.md)

---

## 2. GSD Workflow Integration

This project uses the **Get-Shit-Done (GSD)** methodology for precise, high-fidelity phase progression:

### Wave-Based Planning and Execution
1. **Plan Phase (`/gsd-plan-phase [N]`)**: Break the current phase down into atomic execution plans.
2. **Execute Phase (`/gsd-execute-phase [N]`)**: Implement the tasks systematically, checking them off as they complete.
3. **Verify Phase (`/gsd-verify-work`)**: Conduct robust automated and manual checks to ensure all success criteria are met.
4. **Phase Handoff (`/gsd-transition`)**: Wrap up commits, log decisions, and transition to the next phase.

---

## 3. Technology Stack & Rules

### frontend Core
- **Framework**: Next.js (App Router, React server & client components).
- **Styling**: Vanilla CSS with comprehensive CSS variables, custom fonts, glassmorphism gradients, and smooth state-change animations. No generic framework defaults.
- **Aesthetics**: Premium Dark/Light dashboard UI matching cloud-enterprise standard aesthetics.

### Backend & Storage
- **Database**: Ultra-fast local JSON storage under `data/` folder (`classes.json`, `students.json`, `attendance.json`, `notifications.json`).
- **File System Rules**: All file-based CRUD operations must be atomic and handle exceptions gracefully.
- **Alerts Client**: Twilio API SDK wrapper client for SMS alerts.

---

## 4. Operational Guidelines

1. **Keep Commits Clean**: Commit atomic changes with clear, descriptive conventional commit titles (e.g., `feat: setup Twilio client`, `docs: update state`).
2. **Never Add Placeholders**: Design and build every dashboard widget, visual graph, and list fully functional. Use mock generators when real data isn't active.
3. **Responsive first**: Guarantee every viewport (from a handheld phone to a wide screen monitor) displays premium aesthetics.

Let's build a beautiful school software system!
