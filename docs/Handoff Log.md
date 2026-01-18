---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** January 18, 2026
**Status:** Phase 5 In Progress
**Version:** 1.1.0

---

## Project Overview

**Switchboard** is a context-management plugin for Obsidian, designed for the ADHD brain. It uses a "telephone switchboard operator" metaphor where users "patch in" to different contexts (Lines), transforming their workspace visually and functionally.

---

## Phase 1: The Panel (Configuration)
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Plugin Scaffold | TypeScript + esbuild setup with auto-deploy to vault |
| Settings UI | `SwitchboardSettingTab` for creating/editing Lines |
| Line Schema | Interface with `id`, `name`, `color`, `safePaths[]`, `landingPage` |
| Manual Trigger | Ribbon icon opens "Patch In" modal to select Line |

---

## Phase 2: The Circuit (Environment Control)
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Body Injection | Adds `body.switchboard-active-{id}` class when patched in |
| Signal Isolation | Dynamic CSS fades non-safe folders in file explorer |
| Accent Shift | Updates `--interactive-accent` CSS variable to Line color |
| Landing Page | Auto-opens configured landing page on patch-in |
| Disconnect Command | Command palette + ribbon to end session |

---

## Phase 3: The Wire (Chronos Integration)
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| WireService | Monitors Chronos tasks for `#switchboard/{line-id}` tags |
| Task Parsing | Extracts Line ID from tags or `/line-name` in title |
| Incoming Call Modal | "Math is calling" with Connect, Snooze, Decline options |
| Timer System | Schedules calls at task start times |
| Snooze Logic | Re-shows modal after configurable delay |

---

## Phase 4: The Operator (Tools & Logging)
**Date:** January 11-12, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Session Logger | Tracks session duration, writes logs to per-Line file |
| Call Log Modal | Prompts for summary after 5+ minute sessions |
| Operator Menu | Context-specific command palette |
| Native Scheduling | `ScheduledBlock` interface for recurring/one-time blocks |
| Schedule Overview | Settings section showing all native + Chronos blocks |

---

## Phase 5: Deferred Features
**Date:** January 18, 2026

### P1: Quick Wins ✅
| Feature | Description |
|---------|-------------|
| Edge Case Fix | Suppress Incoming Call if already on that Line |
| Session Timer | Status bar shows elapsed time, clickable for quick menu |

### P2: Enhancements ✅
| Feature | Description |
|---------|-------------|
| Custom Commands | User-defined operator commands per Line with file autocomplete |
| Auto-disconnect | TimeUpModal at block end with extend (+15/30/60 min) or hang up |

### P3: Statistics Dashboard 🔄
*In Progress*

---

## Quick Reference

### Development Commands
```bash
cd C:\Users\bwales\projects\obsidian-plugins\switchboard
npm run build                    # Production build
npm run dev                      # Watch mode
```

### Key Files Summary
| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, ribbon, commands, status bar |
| `src/types.ts` | Interfaces (Line, ScheduledBlock, OperatorCommand) |
| `src/services/WireService.ts` | Incoming calls, Chronos + native timers |
| `src/services/SessionLogger.ts` | Session tracking and log writing |
| `src/modals/TimeUpModal.ts` | Auto-disconnect prompt with extend options |
| `src/modals/OperatorModal.ts` | Context command menu |

---

## Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| tslib lint error | None | IDE spurious error, doesn't affect build |
