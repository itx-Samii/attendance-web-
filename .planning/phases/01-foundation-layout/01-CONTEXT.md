# Phase 1: Foundation & Layout - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Initialize Next.js project structure, implement premium global layout (custom font, CSS variables, dark/light theme switcher), set up local JSON-file storage adapters, and configure teacher authentication mock logic.

</domain>

<decisions>
## Implementation Decisions

### Global Visual Aesthetic & Layout Style
- **D-01:** Implement a **clean enterprise light theme by default** with a soft white/gray background and elegant modern typography.
- **D-02:** Provide a highly visible, smooth dark/light mode toggle that switches the entire interface to a **high-contrast dark theme**.
- **D-03:** Set up a robust, semantic CSS custom variable tokens system for background gradients, borders, active accents, glassmorphic layout card panels, and interactive components.

### Local JSON Database Structure & File I/O Safety
- **D-04:** Adopt a **relational single-table approach** where data schemas are separated into three dedicated files: `classes.json`, `students.json`, and `attendance.json`.
- **D-05:** Reference related structures through unique primary/foreign identifiers (e.g. Roll Number for student, Class ID for class).
- **D-06:** Ensure all database helper utilities execute file operations atomically to prevent file corruption during multiple concurrent reads or writes.

### Teacher Authentication & Credentials Policy
- **D-07:** Implement a **simplified secure local session** utilizing encrypted cookie state storage.
- **D-08:** Match login details against single-account institutional administrator credentials loaded from a server-side configuration file.

### the agent's Discretion
- Loading spinner animations and skeleton frames design during route transitions.
- The exact secret key generation mechanism for cookie encryption.
- Design of layout menus, sidebar structures, and header widgets.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope & Developer Rules
- `GEMINI.md` — Project technical stack guidelines, styling rules, operational constraints.
- `.planning/PROJECT.md` — Project context, active requirements, out of scope items, constraints.
- `.planning/REQUIREMENTS.md` §Authentication & DASH-03 — Authentication and global dashboard layout/theme specs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Greenfield project. No reusable assets exist yet in the codebase. All structures are to be initialized.

### Established Patterns
- Greenfield project. The core global layout, styling rules, and database interfaces established in this phase will form the coding pattern library for subsequent phases.

### Integration Points
- Greenfield project. This phase serves as the absolute technical foundation.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-layout*
*Context gathered: 2026-05-24*
