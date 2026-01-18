---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** January 18, 2026
**Status:** Phase 7 Complete ✅
**Version:** 1.3.0

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

## Quick Reference

### Key Commands
| Command | Description |
|---------|-------------|
| Patch In | Open Line selection modal |
| Disconnect | End current session |
| Open Operator Menu | Context commands for active Line |
| Open Statistics | View session statistics |
| Edit Session History | Edit/delete recorded sessions |

### Key Files
| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, commands, status bar |
| `src/types.ts` | Interfaces (Line, SessionRecord, etc.) |
| `src/modals/StatisticsModal.ts` | Statistics dashboard |
| `src/modals/SessionEditorModal.ts` | Session history editor |
| `src/modals/TimeUpModal.ts` | Auto-disconnect prompt |
| `src/services/SessionLogger.ts` | Session tracking + history |

---

## Known Issues

| Issue | Impact |
|-------|--------|
| tslib lint error | None - IDE spurious error |
