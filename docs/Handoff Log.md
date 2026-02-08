---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** February 8, 2026
**Status:** Pre-Launch Hardening In Progress
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
| Zero automated tests | See Pre-Launch Implementation Guide for plan |

---

## Next Session Prompt

> "Let's start Session 1 of the Pre-Launch Implementation Guide: Debug Logger System. Create a centralized Logger utility with a settings toggle, replace all 35 console.log calls, and add the debug mode toggle to settings. See `docs/launch-considerations/Pre-Launch Implementation Guide.md` for full spec."
