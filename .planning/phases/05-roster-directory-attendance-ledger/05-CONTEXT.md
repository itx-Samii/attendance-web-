# Phase 5 Context — Roster Directory & Attendance Ledger

## Core Goals
1. Provide a premium administrative screen to view all active classrooms and registered student registers.
2. Enable full CRUD (Create, Read, Update, Delete) capability for classrooms and student details at runtime.
3. Code an interactive Monthly Attendance Ledger grid to review history registers.

## Requirements
* **DIR-01**: Roster Directory interface `/dashboard/directory` featuring quick searches, class sections sidebars, and grid logs.
* **DIR-02**: Runtime Edit/Delete CRUD triggers for both classroom sections and enrolled students.
* **LEDG-01**: Monthly attendance matrix calendars plotting student dates logs dynamically from `attendance.json`.

## Architecture & Integration
* Standard Next.js route: `/dashboard/directory` (Dashboard directory subpage).
* API Routes:
  * `PUT /api/classes` and `DELETE /api/classes`
  * `PUT /api/students` and `DELETE /api/students`
* Storage: atomic JSON write updates to `/data/classes.json` and `/data/students.json`.
