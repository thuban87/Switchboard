---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** February 9, 2026
**Status:** Pre-Launch Hardening — S1+S2+S3+S4+S5+S6+S7+S8+S9+S10+S12 Complete
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

## Session: Input Validation & Path Safety (S5) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| types.ts | 4 new validation utilities: `validatePath()`, `isValidHexColor()`, `isValidTime()`, `isValidDate()` |
| Fix #38 | `generateId()` guards empty/whitespace/special-char-only input |
| Fix #3 (CRITICAL) | `SessionLogger.getOrCreateLogFile()` validates paths, rejects traversal |
| Fix #6 (CRITICAL) | Value-captured closures replace loop-index closures in 3 delete handlers |
| Fix #13 | Time/date validation on schedule block inputs with red border feedback |
| Fix #14 | Duplicate Line ID detection on creation |
| Fix #15 | `validate()` shows error Notices for all failure cases |
| Fix #23 | Hex color validation before save |
| Deep copy fix | Constructor deep-copies arrays to prevent modal edits leaking to settings |
| DOM sync | `validate()` reads schedule inputs from DOM, preventing onChange race |
| validation.test.ts | 18 new tests covering all validation utilities |

**New Files:**
- `test/validation.test.ts`

**Modified Files:**
- `src/types.ts`, `src/services/SessionLogger.ts`
- `src/settings/LineEditorModal.ts`, `src/settings/SwitchboardSettingTab.ts`

**Audit Items Resolved:** #3, #6, #13, #14, #15, #23, #38

---

## Session: Timer & Race Condition Fixes (S6) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| WireService Fix A1 | `stop()` now clears `snoozedCalls` and `declinedCalls` in addition to `scheduledCalls` |
| WireService Fix #7 | Decline handler removes from snoozed + cancels scheduled timer |
| WireService Fix #10/A4 | `parseTaskTime()` validates all 3 return sites with `isNaN` guard |
| IncomingCallModal Fix #27 | `actionTaken` double-click guard on all 6 action buttons |
| IncomingCallModal Fix #34 | File path split uses `/[\\/]/` regex for Windows compatibility |
| Fix #20 | Already done in S3 — no additional work needed |
| Test un-skips | 3 S6-dependent tests un-skipped and passing |

**Modified Files:**
- `src/services/WireService.ts`
- `src/modals/IncomingCallModal.ts`
- `test/wire-utils.test.ts`
- `test/snooze-state.test.ts`

**Audit Items Resolved:** #7, #10, #20, #27, #34, A1, A4

---

## Session: Memory Leak Fixes (S7) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| AudioService Fix #16 | Reuse single `Audio` element + embed click.mp3 as base64 data URI |
| audio-data.ts | New file with embedded click.mp3 (~21KB base64) — eliminates external file dependency |
| SwitchboardSettingTab Fix #31 | `isConnected` guard on setTimeout callback + fixed autocomplete positioning |
| QuickSwitchModal Fix #32 | Clear `lineElements` array in `onClose()` |
| DashboardView Fix #40 | `registerInterval()` for automatic cleanup on view close + plugin unload |

**New Files:**
- `src/services/audio-data.ts`

**Modified Files:**
- `src/services/AudioService.ts`
- `src/settings/SwitchboardSettingTab.ts`
- `src/modals/QuickSwitchModal.ts`
- `src/views/DashboardView.ts`

**Audit Items Resolved:** #16, #31, #32, #40

---

## Session: Data Integrity & Session History (S8) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| types.ts Fix #36 | Added `schemaVersion: number` to settings interface and defaults |
| main.ts Fix A8 | Corrupted `data.json` recovery with try-catch → fallback to defaults + Notice |
| SessionLogger Fix #25 | Promise-based write queue to serialize concurrent session logging |
| SessionLogger Fix #24 | Line-aware regex replaces `indexOf` for heading detection in `logSession()` and `logToDailyNote()` |
| SessionLogger Fix #8 | Session history pruned to 1,000 entries max |
| SessionLogger Fix #26 | `saveToHistory()` uses local date instead of UTC |
| DashboardView Fix A6 | `renderSchedule()` uses local date instead of UTC |
| SessionEditorModal Fix #39 | `recalculateDuration()` handles midnight crossing |
| UTC cleanup (bonus) | Fixed 6 additional `toISOString` date sites in StatisticsModal, SwitchboardSettingTab, LineEditorModal |
| Dashboard CSS | Section headings increased from 0.8rem → 1.1rem |
| Tests un-skipped | 3 S8-dependent heading detection tests now pass (64 total, 0 skipped) |

**Modified Files:**
- `src/types.ts`, `src/main.ts`
- `src/services/SessionLogger.ts`
- `src/views/DashboardView.ts`
- `src/modals/SessionEditorModal.ts`, `src/modals/StatisticsModal.ts`
- `src/settings/SwitchboardSettingTab.ts`, `src/settings/LineEditorModal.ts`
- `styles.css`
- `test/heading-detection.test.ts`

**Audit Items Resolved:** #8, #24, #25, #26, #36, #39, A6, A8

---

## Session: Build & Manifest Hardening (S9) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| package.json Fix #5 | Pinned `obsidian` from `"latest"` to `"^1.7.2"`, added `repository` + `engines` fields |
| manifest.json Fix #17 | Set `"isDesktopOnly": true` (mobile untested) |
| manifest.json Fix #18 | Updated `"minAppVersion"` from `"1.0.0"` to `"1.10.0"` |
| manifest.json Fix #19 | Filled in `"authorUrl"` with GitHub repo URL |
| versions.json Fix A5 | Created BRAT version tracking: `{ "1.5.0": "1.10.0" }` |
| tsconfig Fix #29 | Aligned target `"ES6"` → `"ES2018"` (matches esbuild) |
| tsconfig Fix #49 | Enabled `"strict": true`, removed individual flags |
| tsconfig Fix #50 | Removed redundant `inlineSourceMap` + `inlineSources` |
| tsconfig Fix #51 | Removed `allowJs: true` (no .js files) |
| Fix #56 | Already done — deploy path in `scripts/deploy.mjs` |
| Strict mode fixes | 9 type errors fixed (7 `!` assertions in main.ts, 1 in CallLogModal.ts, 1 cast in SwitchboardSettingTab.ts) |

**New Files:**
- `versions.json`

**Modified Files:**
- `package.json`, `manifest.json`, `tsconfig.json`
- `src/main.ts`, `src/modals/CallLogModal.ts`, `src/settings/SwitchboardSettingTab.ts`

**Audit Items Resolved:** #5, #17, #18, #19, #29, #49, #50, #51, #56, A5

## Session: Code Deduplication & Refactoring (S10) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| types.ts Fix #21 | Canonical `formatDuration()` — removed duplicates from 6 files (19 call sites) |
| types.ts Fix #22 | Canonical `formatTime12h()` — removed duplicates from 2 files (5 call sites) |
| types.ts (new) | `parseTime12h()` + `isValidTime12h()` — 12h input parsing and validation |
| OperatorModal Fix #37 | Business logic extracted to `SwitchboardPlugin.executeOperatorCommand()` — modal is now pure UI |
| main.ts Fix A2 | `registeredCommandIds: Set<string>` prevents duplicate command registration |
| LineEditorModal | Schedule block time inputs switched to 12h format with `parseTime12h()` conversion |
| status-bar-manager.test.ts | Simplified to test canonical function directly (no mocks needed) |

**Modified Files:**
- `src/types.ts`, `src/main.ts`, `src/modals/OperatorModal.ts`
- `src/services/StatusBarManager.ts`, `src/services/SessionLogger.ts`
- `src/views/DashboardView.ts`
- `src/modals/StatisticsModal.ts`, `src/modals/SessionEditorModal.ts`, `src/modals/CallLogModal.ts`
- `src/settings/SwitchboardSettingTab.ts`, `src/settings/LineEditorModal.ts`
- `test/status-bar-manager.test.ts`

**Audit Items Resolved:** #21, #22, #37, A2

## Session: UX Polish & Documentation (S12) ✅
**Date:** February 9, 2026

| Item | Description |
|------|-------------|
| PathSuggest Fix #28/#55 | TTL cache (5s) + empty query guard for folder/file suggesters |
| DashboardView Fix #33 | `contentEl` guard with fallback to `containerEl.children[1]` |
| CallLogModal Fix #46 | Added `metaKey` for Cmd+Enter on Mac |
| Fix #47 | Maxlength on CallLogModal (2000) and GoalPromptModal (200) |
| Fix #48/#43/#44 | JSDoc on default commands + configurability TODO comments |
| Fix #52 | JSDoc on all 19 `as any` casts across 7 files |
| Fix #42 | Configurability comment on hardcoded "Call Waiting.md" |
| Fix #41 | JSDoc on 28 public methods across 11 files |
| Statistics export | Generalized "study" verbiage to context-neutral language |
| Character counters | Live `X / max` counters on CallLogModal textarea and GoalPromptModal input |

**Modified Files:**
- `src/settings/PathSuggest.ts`, `src/views/DashboardView.ts`
- `src/modals/CallLogModal.ts`, `src/modals/GoalPromptModal.ts`
- `src/modals/OperatorModal.ts`, `src/modals/StatisticsModal.ts`
- `src/modals/PatchInModal.ts`, `src/modals/QuickSwitchModal.ts`
- `src/modals/IncomingCallModal.ts`, `src/modals/TimeUpModal.ts`
- `src/modals/SessionEditorModal.ts`
- `src/services/CircuitManager.ts`, `src/services/WireService.ts`
- `src/services/StatusBarManager.ts`, `src/services/AudioService.ts`
- `src/main.ts`, `src/settings/LineEditorModal.ts`
- `src/settings/SwitchboardSettingTab.ts`
- `styles.css`

**Audit Items Resolved:** #28, #33, #41, #42, #43, #44, #46, #47, #48, #52, #55

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

---

## Next Session Prompt

> "Let's start Session 11 of the Master Pre-Launch Plan: CSS & Accessibility Polish. Audit `!important` usage (12 instances), add `:focus-visible` outlines to interactive elements, and standardize hover states. See `docs/launch-considerations/Master Pre-Launch Plan.md` for full spec."
