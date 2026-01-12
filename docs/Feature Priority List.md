---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard - Feature Priority List

**Goal:** Build a "Context Manager" for the ADHD brain.
**Version:** 1.0.0 (All Phases Complete)

---

## Phase 1: The Panel (Configuration) ✅
**Goal:** Define "Lines" (Contexts) and their properties.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 1 | **Plugin Scaffold** | TypeScript, esbuild, styles.css. | ✅ |
| 2 | **Settings UI** | Interface to create/edit "Lines". | ✅ |
| 3 | **Line Schema** | `id`, `name`, `color`, `safePaths[]`, `landingPage`. | ✅ |
| 4 | **Manual Trigger** | Ribbon icon -> List of Lines -> Click to Activate. | ✅ |

---

## Phase 2: The Circuit (Environment Control) ✅
**Goal:** Physically transform the workspace.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 5 | **Body Injection** | Add/Remove `body.switchboard-active-{id}` class. | ✅ |
| 6 | **Dynamic CSS** | Generate CSS rules for "Signal Isolation" (fading folders). | ✅ |
| 7 | **Accent Shift** | Update `--interactive-accent` variable. | ✅ |
| 8 | **Landing Page** | Logic to open the defined `landingPage` file. | ✅ |

---

## Phase 3: The Wire (Chronos Integration) ✅
**Goal:** Automate the "Incoming Call."

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 9 | **Chronos Hook** | Subscribe to Chronos index (if available). | ✅ |
| 10 | **Tag Listener** | Watch for `#switchboard/{id}` tags on active tasks. | ✅ |
| 11 | **Incoming Call Modal** | "Math is calling." [Connect] [Hold] [Decline]. | ✅ |
| 12 | **Snooze Logic** | Hide modal, re-show after X minutes. | ✅ |

---

## Phase 4: The Operator (Tools & Logging) ✅
**Goal:** Contextual tools, scheduling, and closing the loop.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 13 | **Call Log Modal** | "Call Ended. Summary?" input on disconnect. | ✅ |
| 14 | **Session Logger** | Per-Line log file/heading. Appends after 5+ min sessions. | ✅ |
| 15 | **Operator Menu** | Context-specific commands (Math, Bio, ENG defaults). | ✅ |
| 16 | **Native Scheduling** | Time blocks per Line (recurring/one-time). | ✅ |
| 17 | **Schedule Overview** | Settings section showing all native + Chronos blocks. | ✅ |
| 18 | **Recurring Support** | Compatible with Chronos recurring task succession. | ✅ |

---

## Technical Debt / Risks

*   ~~**Theme Conflicts:** Custom themes might override "Signal Isolation" CSS.~~ Handled with specificity.
*   ~~**Performance:** Generating dynamic CSS on the fly needs to be efficient.~~ Optimized.
*   **tslib Lint Error:** IDE shows spurious `tslib` import error - doesn't affect build.

---

## Development Totals
*   **Phase 1:** ~4.5 hours ✅
*   **Phase 2:** ~4.5 hours ✅
*   **Phase 3:** ~6 hours ✅
*   **Phase 4:** ~8 hours ✅ (exceeded estimate due to scheduling features)
*   **Total:** ~23 hours

---

## Future Enhancements (Backlog)

| Feature | Description | Priority |
|---------|-------------|----------|
| Custom Operator Commands | User-defined commands per Line | Low |
| Auto-disconnect | End session at block end time | Low |
| Statistics Dashboard | Track time spent per Line | Low |
| Multi-Line Overlap | Handle when two Lines conflict | Low |
