---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** February 9, 2026
**Status:** Pre-Launch Hardening — S1+S2+S3+S4 Complete
**Version:** 1.5.0

---

## Project Overview

**Switchboard** is a context-management plugin for Obsidian, designed for the ADHD brain. It uses a "telephone switchboard operator" metaphor where users "patch in" to different contexts (Lines), transforming their workspace visually and functionally.

---

## Phase 1: The Panel (Configuration)
**Date:** January 11, 2026

| Component | Description |
|-----------|-------------|
| Plugin Scaffold | TypeScript + esbuild setup with auto-deploy |
| Settings UI | Line creation/editing with color picker |
| Line Schema | id, name, color, safePaths[], landingPage |
| Manual Trigger | Ribbon icon + "Patch In" modal |

---

## Phase 2: The Circuit (Environment Control)
**Date:** January 11, 2026

| Component | Description |
|-----------|-------------|
| Body Injection | `body.switchboard-active-{id}` class |
| Signal Isolation | CSS fades non-safe folders |
| Accent Shift | Updates `--interactive-accent` to Line color |
| Landing Page | Auto-opens on patch-in |

---

## Phase 3: The Wire (Chronos Integration)
**Date:** January 11, 2026

| Component | Description |
|-----------|-------------|
| WireService | Monitors Chronos tasks for `#switchboard` tags |
| Incoming Call Modal | Connect, Snooze, Decline options |
| Timer System | Schedules calls at task start times |

---

## Phase 4: The Operator (Tools & Logging)
**Date:** January 11-12, 2026

| Component | Description |
|-----------|-------------|
| Session Logger | Tracks duration, writes logs to per-Line file |
| Call Log Modal | Prompts for summary after 5+ min sessions |
| Operator Menu | Context-specific command palette |
| Native Scheduling | Recurring/one-time blocks per Line |

---

## Phase 5: Deferred Features & Statistics
**Date:** January 18, 2026

### P1: Quick Wins ✅
| Feature | Description |
|---------|-------------|
| Edge Case Fix | Suppress Incoming Call if already on that Line |
| Session Timer | Status bar shows elapsed time, clickable menu |

### P2: Enhancements ✅
| Feature | Description |
|---------|-------------|
| Custom Commands | User-defined operator commands per Line |
| Auto-disconnect | TimeUpModal at block end (+15/30/60 min or hang up) |
| File Autocomplete | For "Open file" custom commands |

### P3: Statistics Dashboard ✅
| Feature | Description |
|---------|-------------|
| SessionRecord | Data type for tracking session history |
| StatisticsModal | Summary cards, per-line breakdown, recent sessions |
| AI Export | "Export for AI Analysis" copies summary to clipboard |
| Session Editor | Browse, edit (Line/date/times), delete sessions |
| Log Format | Date/time instead of Line name in log entries |

### Structural Fixes ✅
| Fix | Description |
|-----|-------------|
| CSS Security | Use CSS.escape() for path selectors |
| DOM Performance | Native collapse-all command instead of O(n) loop |
| Chronos Robustness | Try-catch wrapper for plugin access |

---

## Phase 6: Speed & Polish
**Date:** January 18, 2026

| Feature | Description |
|---------|-------------|
| Speed Dial | `patch-in-{line}` commands, hotkey-assignable |
| Busy Signal | Toast + tracks missed calls in status bar menu |
| Audio Feedback | Synthesized clicks or custom `click.mp3` from plugin folder |
| Delete Confirmation | Confirm dialog before deleting a Line |

---

## Phase 7: Smart Decline & Rescheduling
**Date:** January 18, 2026

| Feature | Description |
|---------|-------------|
| Quick Reschedule | "30 min", "1 hour", "Tomorrow" options when declining |
| Missed Calls Blink | Status bar blinks when unacknowledged missed calls |
| Acknowledge on Open | Blinking stops when status bar menu is opened |

---

## Phase 8: Session Goals & Break Reminders
**Date:** January 18, 2026

| Feature | Description |
|---------|-------------|
| Session Goals | Optional goal prompt on patch-in, displayed in status bar |
| Goal Reflection | "Did you accomplish?" shown in disconnect modal |
| Break Reminder | Gentle notification after configurable duration |
| Case-Insensitive Logging | Log file lookup now case-insensitive |

**New Settings:**
- `enableGoalPrompt` (toggle, default: true)
- `breakReminderMinutes` (number, default: 60, 0 = disabled)

---

## Phase 9: Quick Switch & Dashboard
**Date:** January 18, 2026

| Feature | Description |
|---------|-------------|
| Quick Switch Modal | Hotkey popup for fast Line switching with keyboard nav (↑/↓/Enter) |
| Operator Dashboard | Sidebar view with current session, Lines grid, schedule, recent sessions |

**New Commands:**
- `Quick Switch` - Open fast Line switching popup (hotkey-assignable)
- `Open Dashboard` - Open/reveal the Switchboard sidebar

**New Files:**
- `src/modals/QuickSwitchModal.ts` - Quick switch modal with keyboard navigation
- `src/views/DashboardView.ts` - Sidebar dashboard view

---

## Session: Pre-Launch Hardening
**Date:** February 8, 2026

### Documentation ✅
| Item | Description |
|------|-------------|
| CLAUDE.md Overhaul | Expanded from 116 → 250 lines with file tree, layer responsibilities, architecture constraints, feature status, data storage, pitfalls |
| Codebase Stats | Full stat sheet: 19 files, ~4,500 LoC TS + ~1,600 LoC CSS |
| Test Coverage Matrix | Risk-ranked assessment of all services and modals (0% automated coverage) |
| System Dependency Matrix | Import map + Mermaid diagram confirming zero service-to-service coupling |
| Pre-Launch Implementation Guide | 4-session hardening plan: Debug Logger, Error Handling, main.ts Decomposition, Targeted Tests |

### Build Pipeline ✅
| Item | Description |
|------|-------------|
| Local-only build | `npm run build` / `npm run dev` no longer auto-copy to production |
| Test deploy | `npm run deploy:test` → copies to test vault |
| Production deploy | `npm run deploy:production` → requires "yes" confirmation |

**New Files:**
- `scripts/deploy.mjs` - Deploy script with test/production targets
- `docs/launch-considerations/Codebase Stats.md`
- `docs/launch-considerations/Test Coverage Matrix.md`
- `docs/launch-considerations/System Dependency Matrix.md`
- `docs/launch-considerations/Pre-Launch Implementation Guide.md`

**Modified Files:**
- `esbuild.config.mjs` - Removed auto-copy to production
- `package.json` - Added `deploy:test` and `deploy:production` scripts
- `CLAUDE.md` - Major overhaul with architectural guidelines

---

## Session: Debug Logger System (S1) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| Logger.ts | New centralized `Logger` class with `debug()` (gated), `warn()`, `error()`, `info()` (always visible) |
| debugMode setting | Added `debugMode: boolean` to `SwitchboardSettings` (default: `false`) |
| Console replacement | Replaced 49 `console.log/warn/error` calls across 6 files with `Logger.*` calls |
| Settings UI | New "Advanced" section with debug mode toggle in `SwitchboardSettingTab.ts` |

**New Files:**
- `src/services/Logger.ts`

**Modified Files:**
- `src/types.ts`, `src/main.ts`, `src/settings/SwitchboardSettingTab.ts`
- `src/services/CircuitManager.ts`, `src/services/WireService.ts`, `src/services/AudioService.ts`, `src/services/SessionLogger.ts`

---

## Session: Error Handling Hardening (S2) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| main.ts | Wrapped `patchIn()`, `disconnect()`, `openCallWaiting()` in try-catch |
| CircuitManager.ts | Wrapped `activate()` and `focusFolders()` — internals fail silently |
| AudioService.ts | Wrapped `playPatchIn()` and `playDisconnect()` — audio never crashes |
| WireService.ts | Per-task try-catch in `refreshTimers()` loop; Fix #9: `await saveToCallWaiting()` |
| OperatorModal.ts | Fix #4: Per-case try-catch in `executeCommand()` |
| StatisticsModal.ts | Fix #12: `await navigator.clipboard.writeText()` with error Notice |

**Audit Items Resolved:** #4 (OperatorModal), #9 (saveToCallWaiting), #11 (already fixed), #12 (clipboard)

---

## Session: main.ts Decomposition (S3) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| StatusBarManager.ts | New service (178 lines): `update()`, `startTimerUpdates()`, `stopTimerUpdates()`, `showMenu()`, `formatDuration()`, `destroy()` |
| TimerManager.ts | New service (82 lines): `scheduleAutoDisconnect()`, `cancelAutoDisconnect()`, `startBreakReminder()`, `stopBreakReminder()`, `destroy()` |
| main.ts reduction | 743 → 457 lines (-286 lines). Thin wrapper methods preserved for external callers |
| Fix #35 / A3 | `loadSettings()` now runs BEFORE service construction |
| Fix #1, #2 | `onunload()` now calls `audioService.destroy()`, `timerManager.destroy()`, clears Chronos timer |
| Partial #20 | Chronos startup `setTimeout` handle stored and cleared in `onunload()` |

**New Files:**
- `src/services/StatusBarManager.ts`
- `src/services/TimerManager.ts`

**Modified Files:**
- `src/main.ts`

**Audit Items Resolved:** #1, #2, #35, #53, A3 (partial #20)

---

## Session: Targeted Unit Tests (S4) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| Vitest Setup | `npm install -D vitest`, config with `obsidian` module alias, `test`/`test:watch` scripts |
| Obsidian Mock | Minimal `test/__mocks__/obsidian.ts` (Notice, App, TFile, TFolder, Modal, Menu) |
| types.test.ts | 8 tests — `generateId()` slug generation, edge cases |
| logger.test.ts | 6 tests — Logger gating, output format, always-on methods |
| timer-manager.test.ts | 6 tests — Auto-disconnect, break reminder, `destroy()` |
| status-bar-manager.test.ts | 4 tests — `formatDuration()` pure function |
| wire-utils.test.ts | 5 tests (1 skip) — `parseTaskTime()` format parsing |
| heading-detection.test.ts | 6 tests (3 skip) — indexOf detection + S8 regex prep |
| snooze-state.test.ts | 5 tests (2 skip) — Decline/snooze state transitions |

**Totals:** 40 tests — 34 pass, 6 skipped (awaiting S6/S8 code fixes)

**New Files:**
- `vitest.config.ts`
- `test/__mocks__/obsidian.ts`
- `test/types.test.ts`, `test/logger.test.ts`, `test/timer-manager.test.ts`
- `test/status-bar-manager.test.ts`, `test/wire-utils.test.ts`
- `test/heading-detection.test.ts`, `test/snooze-state.test.ts`

**Modified Files:**
- `package.json` — Added `test` and `test:watch` scripts
- `.gitignore` — Added `.vitest/` cache directory

---

## Quick Reference

### Key Commands
| Command | Description |
|---------|-------------|
| Patch In | Open Line selection modal |
| Quick Switch | Fast Line switching popup |
| Disconnect | End current session |
| Open Dashboard | Open Switchboard sidebar |
| Open Operator Menu | Context commands for active Line |
| Open Statistics | View session statistics |
| Edit Session History | Edit/delete recorded sessions |

### Build & Deploy
| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode, local output only |
| `npm run build` | One-shot build, local output only |
| `npm run test` | Run all vitest tests once |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run deploy:test` | Build + copy to test vault |
| `npm run deploy:production` | Build + confirmation + copy to prod |

### Key Files
| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, commands, status bar |
| `src/types.ts` | Interfaces (Line, SessionRecord, etc.) |
| `src/modals/QuickSwitchModal.ts` | Fast Line switching |
| `src/views/DashboardView.ts` | Sidebar dashboard |
| `src/modals/StatisticsModal.ts` | Statistics dashboard |
| `src/modals/SessionEditorModal.ts` | Session history editor |
| `src/modals/TimeUpModal.ts` | Auto-disconnect prompt |
| `src/services/SessionLogger.ts` | Session tracking + history |
| `scripts/deploy.mjs` | Test/production deploy script |

---

## Known Issues

| Issue | Impact |
|-------|--------|
| tslib lint error | None - IDE spurious error |
| 6 skipped tests | Awaiting S6/S8 code fixes — will un-skip when those sessions are done |

---

## Next Session Prompt

> "Let's start Session 5 of the Master Pre-Launch Plan: Settings Validation. Add runtime validation to Line creation/editing (blank names, duplicate IDs, path traversal). See `docs/launch-considerations/Master Pre-Launch Plan.md` for full spec."
