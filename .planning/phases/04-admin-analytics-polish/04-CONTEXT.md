# Phase 4 Context — Admin Analytics & Polish

This phase builds high-fidelity visual statistics, visual graphs, and general layout styling polish to bring Aura Attendance ERP to a premium, production-level, and highly polished state.

## Subsystem Architecture & Mapping

We will enrich the main landing dashboard view at `/dashboard` with dynamic, responsive SVG charts:
1. **Institutional Attendance Trends**: A beautiful area line chart visualizing daily rates across the week (Monday to Friday) styled with smooth color gradients, drop shadows, and neon line flows.
2. **Classroom Attendance Breakdown**: A responsive custom vertical bar chart displaying current attendance status levels per classroom segment, leveraging vanilla CSS flex structures and neon height animations.

### Source Files Affected:
* `src/app/dashboard/page.tsx`: Inject live and simulated visual analytics.
* `src/app/globals.css`: Enrich custom styling tokens with glassmorphic cards, graph grid gradients, and glowing drop-shadow filters.

---

## Technical Strategy

* **Visual SVG Components**: Instead of introducing heavy chart wrappers (which bloat the workspace bundle and can cause compilation warnings), we will build raw custom, ultra-optimized **SVG/CSS widgets**.
* **Zero Dependency Overhead**: Guarantees zero load latency, perfect SSR capability, seamless light/dark theme adaptation, and absolute compile safety.
* **Ambient Lighting Effects**: Leverage dynamic linear HSL gradient definitions (`<linearGradient>`), dropshadow filter definitions, and CSS hover transitions.

---

## Active Requirements

* **DASH-01**: Interactive overview charts showing daily attendance rates and trends.
* **DASH-02**: Key indicator cards showing total enrolled students, overall attendance rate, and today's absentees.
