---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard Handoff Log

**Last Updated:** January 11, 2026
**Current Phase:** Phase 0 - Planning
**Current Branch:** N/A (not yet created)
**Version:** 0.0.0 (Pre-Development)

---

## Session: January 11, 2026 - Project Inception & Planning

### Session Summary
Initial planning session for "Switchboard," a context manager for Obsidian. Moved away from the initial "Phantom/Ghost" metaphor to a tactile "Switchboard Operator" concept. Defined the core architecture, visual isolation mechanics, and integration with the Chronos plugin.

### What Was Done

| Item | Details |
|------|---------|
| Concept Pivot | Renamed "Phantom" to "Switchboard." Metaphor changed from "Haunting" to "Patching In." |
| Architecture Definition | Defined "Signal Isolation" (CSS fading) and "Line" schema. |
| Hybrid Trigger Logic | Established manual (Ribbon) + automated (Chronos task) triggers. |
| Project Docs Created | ADR-001, Feature Priority List, Project Summary, CLAUDE.md. |
| Handoff Log Framework | Created this log to track future progress. |

### Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Metaphor | Switchboard Operator | Tactile, intentional, user-as-operator. |
| Visuals | CSS Injection | Performance + granular control over opacity/color. |
| Automation | Chronos Hook | Reuses existing task parsing logic; efficient. |
| Ritual | Incoming Call Modal | Provides agency (Connect vs. Hold). |

---

## Next Session Prompt

```
Switchboard - v0.0.0 → Phase 1: The Panel

**Source Directory:** C:\Users\bwales\projects\obsidian-plugins\switchboard
**Deploy Target:** G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\switchboard
**Current branch:** N/A
**Version:** 0.0.0

**Docs:**
- docs/Handoff Log.md - (START HERE)
- docs/ADR-001-Architecture.md - Tech Blueprint
- docs/Feature Priority List.md - Feature roadmap
- CLAUDE.md - Instructions for the AI

**Last Session:** January 11, 2026
- Planning complete. Architecture and roadmap defined.
- Project structure created in Obsidian.

**PRIORITY: Phase 1 - The Panel (Configuration)**

| Task | Status |
|------|--------|
| Create project scaffold | Pending |
| Initialize Git repo | Pending |
| Set up TypeScript + esbuild | Pending |
| Implement Settings UI ("Lines") | Pending |
| Implement Manual Trigger (Ribbon) | Pending |

**Before Starting:**
1. Check GitHub and ensure we are on a fresh branch.
2. Initialize the local directory at C:\Users\bwales\projects\obsidian-plugins\switchboard.
```

---

## Quick Reference

### Development Commands
```bash
cd [project-directory]
npm run build                    # Production build
npm run dev                      # Watch mode
```

### Required Files in Deploy Directory
- `manifest.json`
- `main.js`
- `styles.css`

---

## Archived Sessions
*No archived sessions yet.*
