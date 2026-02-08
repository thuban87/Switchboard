# Test Coverage Matrix

> **Last Updated:** 2026-02-08 | **Purpose:** At-a-glance view of which systems have automated tests and which are untested

> [!CAUTION]
> **There are zero automated tests in the Switchboard codebase.** No test framework is configured, no test files exist.

---

## Coverage Overview

| Metric | Value |
|---|---|
| **Total Test Files** | 0 |
| **Total Services** | 4 |
| **Services With Tests** | 0 (0%) |
| **Services Without Tests** | 4 (100%) |
| **Modals With Tests** | 0 |
| **Views With Tests** | 0 |
| **Settings With Tests** | 0 |

---

## Service Test Coverage

### ❌ No Automated Tests — All Services

Sorted by **risk level** (how impactful a bug would be):

| Service | Lines | Risk | Reason |
|---|---:|---|---|
| **WireService** | 552 | 🔴 Critical | Chronos integration, scheduled calls, snooze/reschedule — timer logic, external plugin API, complex state. Bugs here mean silent missed calls or phantom triggers. |
| **SessionLogger** | 359 | 🟠 High | File I/O (log files + daily notes), session history persistence, duration calculations. Data integrity — bad logs are hard to notice and retroactively fix. |
| **CircuitManager** | 213 | 🟡 Medium | CSS generation, safe-path selectors, DOM manipulation. Bugs cause visual glitches (wrong folders faded, accent color wrong) but no data loss. |
| **AudioService** | 193 | 🟢 Low | Sound playback via Web Audio API. Failures are non-critical (muted is a valid fallback) and hard to unit-test without browser environment. |

---

## Modal Test Coverage

### ❌ No Automated Tests — All Modals

| Modal | Lines | Risk | Testability Notes |
|---|---:|---|---|
| **LineEditorModal** | 565 | 🟠 High | Creates/edits Lines — validation logic, color picker, schedule blocks, custom commands. Validation function is testable. |
| **StatisticsModal** | 235 | 🟡 Medium | Session stats aggregation, export generation. `generateExport()` is pure logic — very testable. |
| **SessionEditorModal** | 230 | 🟡 Medium | Edit/delete session history. Duration recalculation is testable. |
| **IncomingCallModal** | 197 | 🟡 Medium | Incoming call actions (connect/hold/decline/reschedule). Action routing logic is testable. |
| **QuickSwitchModal** | 186 | 🟢 Low | Keyboard navigation, selection state. UI-heavy, low data risk. |
| **OperatorModal** | 169 | 🟢 Low | Command execution dispatch. `executeCommand()` switch logic is testable. |
| **CallLogModal** | 133 | 🟢 Low | Session summary prompt. Minimal logic. |
| **PatchInModal** | 96 | 🟢 Low | Line selection UI. No business logic. |
| **TimeUpModal** | 95 | 🟢 Low | Extend/disconnect UI. Minimal logic. |
| **GoalPromptModal** | 85 | 🟢 Low | Goal prompt UI. Minimal logic. |

---

## Other Layers

| Layer | Total | Tested | Notes |
|---|---|---|---|
| **Plugin Core** (`main.ts`) | 1 | 0 | 724 lines; orchestrates all services. Integration-heavy. |
| **Views** (`DashboardView`) | 1 | 0 | Sidebar rendering — DOM-heavy, low pure-logic. |
| **Settings** | 3 | 0 | `SwitchboardSettingTab` (524 lines) has Chronos task scanning logic that's testable. |
| **Types** | 1 | 0 | `generateId()` is a pure function — trivially testable. |

---

## Coverage by Feature Area

| Feature Area | Components | Tested | Coverage |
|---|---|---|---|
| **Context Switching** (Patch In/Disconnect) | main.ts, CircuitManager, PatchInModal, QuickSwitchModal | 0/4 | ⬜⬜⬜⬜ 0% |
| **Session Tracking** | SessionLogger, CallLogModal, StatisticsModal, SessionEditorModal | 0/4 | ⬜⬜⬜⬜ 0% |
| **Chronos Integration** | WireService, IncomingCallModal, TimeUpModal | 0/3 | ⬜⬜⬜ 0% |
| **Operator Menu** | OperatorModal | 0/1 | ⬜ 0% |
| **Settings & Config** | SwitchboardSettingTab, LineEditorModal, PathSuggest | 0/3 | ⬜⬜⬜ 0% |
| **Dashboard** | DashboardView | 0/1 | ⬜ 0% |
| **Audio** | AudioService | 0/1 | ⬜ 0% |
| **Types** | types.ts | 0/1 | ⬜ 0% |

---

## Recommended Test Priorities

### Tier 1 — High Impact, Moderate Effort

| Target | Why |
|---|---|
| **WireService** (timer logic, tag matching) | `findMatchingLine()`, `parseTaskTime()`, `getNextTriggerTime()` are pure logic. Bug here = silent missed calls. |
| **SessionLogger** (duration calc, formatting) | `formatLogEntry()`, `formatDuration()`, `formatTime24()`, `endSession()` duration math. Bug = wrong session data. |
| **`generateId()`** (types.ts) | One-liner pure function — trivial to test, validates Line ID generation. |
| **LineEditorModal.validate()** | Validates Line names — bug means invalid Lines saved to settings. |

### Tier 2 — Good Coverage Gaps

| Target | Why |
|---|---|
| **StatisticsModal.generateExport()** | Pure aggregation logic — easy to test, ensures export accuracy. |
| **CircuitManager.generateCSS()** | CSS template generation — snapshot-testable, catches selector bugs. |
| **CircuitManager.adjustBrightness()** | Pure color math — trivial to test. |
| **SessionEditorModal.recalculateDuration()** | Duration math — easy to test. |

### Tier 3 — Nice to Have

| Target | Why |
|---|---|
| **OperatorModal.getCommandsForLine()** | Command matching logic based on Line ID. |
| **SwitchboardSettingTab.getChronosSwitchboardTasks()** | Chronos task parsing — complex but depends on external plugin state. |
| **PathSuggest** (`FolderSuggest`, `FileSuggest`) | Sorting and filtering logic — depends on vault state. |
