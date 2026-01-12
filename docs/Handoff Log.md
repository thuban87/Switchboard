---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** January 12, 2026
**Status:** All Phases Complete ✅
**Version:** 1.0.0

---

## Project Overview

**Switchboard** is a context-management plugin for Obsidian, designed for the ADHD brain. It uses a "telephone switchboard operator" metaphor where users "patch in" to different contexts (Lines), transforming their workspace visually and functionally.

---

## Phase 1: The Panel (Configuration)
**Branch:** `feat/phase-1-panel-config`
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Plugin Scaffold | TypeScript + esbuild setup with auto-deploy to vault |
| Settings UI | `SwitchboardSettingTab` for creating/editing Lines |
| Line Schema | Interface with `id`, `name`, `color`, `safePaths[]`, `landingPage` |
| Manual Trigger | Ribbon icon opens "Patch In" modal to select Line |

### Key Files
- `src/main.ts` - Plugin entry point
- `src/types.ts` - Core interfaces
- `src/settings/SwitchboardSettingTab.ts` - Settings UI
- `src/modals/PatchInModal.ts` - Line selection modal

---

## Phase 2: The Circuit (Environment Control)
**Branch:** `feat/phase-2-circuit`
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Body Injection | Adds `body.switchboard-active-{id}` class when patched in |
| Signal Isolation | Dynamic CSS fades non-safe folders in file explorer |
| Accent Shift | Updates `--interactive-accent` CSS variable to Line color |
| Landing Page | Auto-opens configured landing page on patch-in |
| Disconnect Command | Command palette + ribbon to end session |

### Key Decisions
- CSS injection uses specificity over `!important` where possible
- Folder fading applies to file-explorer tree items recursively

---

## Phase 3: The Wire (Chronos Integration)
**Branch:** `feat/phase-3-wire`
**Date:** January 11, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| WireService | Monitors Chronos tasks for `#switchboard/{line-id}` tags |
| Task Parsing | Extracts Line ID from tags or `/line-name` in title |
| Incoming Call Modal | "Math is calling" with Connect, Snooze, Decline options |
| Timer System | Schedules calls at task start times |
| Snooze Logic | Re-shows modal after configurable delay |

### Integration Points
- Plugin ID: `chronos-google-calendar-sync`
- Data access: `chronos.syncManager.getSyncData().syncedTasks`
- Event: `sync-complete` triggers timer refresh

---

## Phase 4: The Operator (Tools & Logging)
**Branch:** `feat/phase-4-tools-and-logging`
**Date:** January 11-12, 2026

### What Was Built
| Component | Description |
|-----------|-------------|
| Session Logger | Tracks session duration, writes logs to per-Line file |
| Call Log Modal | Prompts for summary after 5+ minute sessions |
| Operator Menu | Context-specific command palette (Math, Bio, ENG defaults) |
| Native Scheduling | `ScheduledBlock` interface for recurring/one-time blocks |
| Schedule Overview | Collapsible settings section showing all blocks |

### Session Logging
- Per-Line configuration: `sessionLogFile` and `sessionLogHeading`
- Default: Creates `{Line Name} - Session Log.md` in landing page folder
- Format: `### 📞 {Line} | {time range} ({duration})\n- {summary}`

### Native Scheduling
- Block types: Recurring (days of week) or One-time (specific date)
- Start time triggers Incoming Call modal
- End time is informational only (no auto-disconnect)
- `restartWireService()` called on Line add/edit/delete

### Schedule Overview Features
- Combines native blocks + Chronos tasks with `#switchboard` tags
- Clickable blocks navigate to source notes
- Past tasks filtered (today/future only)
- 🔁 emoji for recurring, 📆 for one-time

### Chronos Compatibility
- Fixed plugin ID from `chronos` to `chronos-google-calendar-sync`
- Tag parsing strips `#` prefix before matching
- Compatible with Chronos recurring task succession logic

---

## Quick Reference

### Development Commands
```bash
cd C:\Users\bwales\projects\obsidian-plugins\switchboard
npm run build                    # Production build
npm run dev                      # Watch mode
```

### Deploy Target
```
G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\switchboard
```

### Key Files Summary
| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, ribbon, commands |
| `src/types.ts` | Interfaces (Line, ScheduledBlock, OperatorCommand) |
| `src/services/WireService.ts` | Incoming calls, Chronos + native timers |
| `src/services/SessionLogger.ts` | Session tracking and log writing |
| `src/settings/SwitchboardSettingTab.ts` | Settings UI, Schedule Overview |
| `src/settings/LineEditorModal.ts` | Line editing, schedule blocks |
| `src/modals/IncomingCallModal.ts` | "Line is calling" prompt |
| `src/modals/CallLogModal.ts` | Post-session summary prompt |
| `src/modals/OperatorModal.ts` | Context command menu |
| `styles.css` | All plugin styling |

---

## Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| tslib lint error | None | IDE spurious error, doesn't affect build |

---

## Future Enhancements (Backlog)

| Feature | Description |
|---------|-------------|
| Custom Operator Commands | User-defined commands per Line |
| Auto-disconnect | End session at block end time |
| Statistics Dashboard | Track time spent per Line |
| Multi-Line Overlap | Handle when two Lines conflict |
