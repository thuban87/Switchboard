---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard - Feature Priority List

**Goal:** Build a "Context Manager" for the ADHD brain.
**Version:** 1.5.0 (Phase 9 Complete)

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

## Phase 5: Deferred Features & Statistics ✅
**Goal:** Polish, statistics tracking, and session management.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 19 | **Session Timer** | Status bar shows Line + elapsed time, clickable menu. | ✅ |
| 20 | **Custom Operator Commands** | User-defined commands per Line (insert/command/file). | ✅ |
| 21 | **Auto-disconnect** | TimeUpModal at block end with extend options. | ✅ |
| 22 | **Statistics Dashboard** | Summary cards, per-line breakdown, AI export. | ✅ |
| 23 | **Session Editor** | Browse, edit (Line/date/times), delete sessions. | ✅ |
| 24 | **Log Format Fix** | Date/time instead of Line name in log entries. | ✅ |

---

## Phase 6: Speed & Polish ✅
**Goal:** Low effort, high impact quick wins.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 25 | **Speed Dial (Hotkeys)** | Register `patch-in-{line}` commands for each Line. | ✅ |
| 26 | **Busy Signal** | Toast notification when already on another Line. | ✅ |
| 27 | **The Click (Audio)** | Sound effects for patch-in/disconnect, mute toggle. | ✅ |
| 28 | **Delete Confirmation** | Confirm dialog before deleting a Line. | ✅ |

---

## Phase 7: Smart Decline & Rescheduling ✅
**Goal:** Reschedule options and missed call tracking.

| Order | Feature | Details | Status |
|-------|---------|--------|---------|
| 29 | **Quick Reschedule** | "30 min", "1 hour", "Tomorrow" options in decline. | ✅ |
| 30 | **Missed Calls in Menu** | Busy signal adds to status bar menu with blink. | ✅ |
| 31 | **Delete Confirmation** | Confirm dialog before deleting a Line. | ✅ |

---

## Phase 8: Session Goals & Break Reminders ✅
**Goal:** Wellbeing & focus features.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 32 | **Session Goals** | Optional goal on patch-in, shown in status bar. | ✅ |
| 33 | **Goal Reflection** | "Did you accomplish?" in disconnect modal. | ✅ |
| 34 | **Break Reminder** | Gentle notification after configurable duration. | ✅ |
| 35 | **Case-Insensitive Logging** | Log file lookup is now case-insensitive. | ✅ |

---

## Phase 9: Quick Switch & Dashboard ✅
**Goal:** Navigation & visibility improvements.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 34 | **Party Line (Quick Switch)** | Hotkey popup to instantly switch Lines. | ✅ |
| 35 | **Operator Dashboard** | Dedicated view with Lines, schedule, current session. | ✅ |

---

## Phase 10: Daily Note Integration ⏳
**Goal:** Operator's Log.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| 36 | **Daily Note Logging** | Append session summary to Daily Note. | ⏳ |
| 37 | **Logging Settings** | Configurable heading, folder path. | ⏳ |

---

## Pre-Launch Hardening ⏳
**Goal:** Documentation, build pipeline, and codebase analysis for BRAT release.

| Order | Feature | Details | Status |
|-------|---------|---------|--------|
| — | **CLAUDE.md Overhaul** | Expanded with file tree, layer responsibilities, architecture constraints | ✅ |
| — | **Codebase Stats** | Full stat sheet (19 files, ~4,500 LoC TS + ~1,600 LoC CSS) | ✅ |
| — | **Test Coverage Matrix** | Risk-ranked assessment of all services/modals | ✅ |
| — | **System Dependency Matrix** | Import map + Mermaid diagram | ✅ |
| — | **Pre-Launch Implementation Guide** | 4-session plan: Debug Logger, Error Handling, Decomposition, Tests | ✅ |
| — | **Build Pipeline** | Local-only build, `deploy:test`, `deploy:production` with confirmation | ✅ |
| — | **Debug Logger System** | Centralized logger with settings toggle | ✅ |
| — | **Error Handling Audit** | try-catch across all services | ✅ |
| — | **main.ts Decomposition** | Extract StatusBarManager + TimerManager (743 → 457 lines) | ✅ |
| — | **Targeted Unit Tests** | Vitest setup + tests for riskiest pure logic | ⏳ |

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
*   **Phase 4:** ~8 hours ✅
*   **Phase 5:** ~6 hours ✅
*   **Phase 6:** ~3-4 hours (estimated)
*   **Phase 7:** ~4-5 hours (estimated)
*   **Phase 8:** ~3-4 hours (estimated)
*   **Phase 9:** ~5-6 hours (estimated)
*   **Phase 10:** ~2-3 hours (estimated)
*   **Total:** ~29 hours completed, ~18-22 hours planned

---

## Post-Launch / Pre-Publish Checklist ⏳
**Goal:** Items from peer review — do before making the repo public, not blockers for BRAT launch.

| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| **README.md** | One-paragraph description, screenshot, setup steps, Chronos integration note | ~30 min | ⏳ |
| **CSS Class Namespacing** | Standardize all CSS classes to `switchboard-` prefix (currently mixed: `incoming-call-`, `operator-`, `timeup-`, `call-log-`, etc.). ~1,627 lines of CSS to audit. | ~2-3 hrs | ⏳ |

---

## Future Enhancements (Backlog)

| Feature | Description | Priority |
|---------|-------------|----------|
| Custom Sounds per Line | Different audio per Line (deferred: file size) | Low |
| Weekly Charts | Visual bar charts in Statistics | Low |
| Log Rotation | Yearly session log files to prevent large file sizes | Low |
| Command Picker | Autocomplete for Obsidian command IDs | Low |
