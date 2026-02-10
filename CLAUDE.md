# Switchboard — Development Guidelines

Instructions for AI assistants working on this project.

**Version:** 1.0.0  
**Last Updated:** 2026-02-08

---

## Project Context

**Developer:** Brad Wales (ADHD, visual learner, prefers vibe coding)  
**Purpose:** Context Manager plugin for Obsidian — reduces context-switching friction via "Signal Isolation"  
**Tech Stack:** TypeScript, Obsidian API, esbuild  
**Release:** Personal use via BRAT (potential public release later)

**Environments:**
- **Dev:** `C:\Users\bwales\projects\obsidian-plugins\switchboard`
- **Test:** `C:\Quest-Board-Test-Vault\.obsidian\plugins\switchboard`
- **Production:** `G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\switchboard`

---

## Git Workflow (CRITICAL)

**Brad handles ALL git commands.** AI assistants should:
- ✅ Read: `git status`, `git log`, `git diff`
- ❌ **NEVER run:** `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`
- ✅ Provide commit messages at session wrap-up for Brad to copy/paste

---

## Known Tooling Issues (CRITICAL — Read Before Searching)

The **`grep_search` tool does NOT work** in this repository. It returns zero results for any query on any file — this is a tool-level issue, not an encoding problem. The files are standard UTF-8 with CRLF line endings.

**What does NOT work:**
- ❌ `grep_search` — Returns "No results found" for every query, every file
- ❌ Any tool that relies on ripgrep internally with the same configuration

**What DOES work (use these instead):**
- ✅ `Select-String -Path "path\to\file" -Pattern "search term"` via `run_command` — PowerShell's built-in grep equivalent, fully reliable
- ✅ `rg "search term" "path\to\file"` via `run_command` — Direct ripgrep invocation works fine
- ✅ `view_file` tool — Reading file contents works perfectly
- ✅ `view_file_outline` tool — File structure exploration works
- ✅ `find_by_name` tool — File/directory discovery works
- ✅ `view_code_item` tool — Symbol lookup works

**Example — searching for all `!important` in styles.css:**
```powershell
# ✅ DO THIS:
Select-String -Path "styles.css" -Pattern "!important" | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }

# ❌ NOT THIS (will return nothing):
# grep_search with Query="!important" SearchPath="styles.css"
```

---

## Core Metaphors

| Term | Meaning |
|------|---------|
| **Line** | A context (e.g., Math, Writing, Work) |
| **Patch In** | Activate a context |
| **Disconnect** | Deactivate a context |
| **Circuit** | The visual state — CSS colors/fading applied to the vault |
| **Operator** | Context-specific command menu |
| **Wire** | Connection to Chronos for scheduled task triggers |
| **Call Log** | Session summary written at disconnect |
| **Incoming Call** | A Chronos task triggering a context switch |

---

## Development Session Workflow

1. **Review & Discuss** — Clarify requirements, check Feature Priority List
2. **Do the Work** — Write code in dev environment only
3. **Test** — `npm run dev` (watches + copies to deploy target), fix errors, rebuild until passing
4. **Deploy** - `npm run deploy:test` deploy to test vault for initial testing
5. **Wait for Confirmation** — Brad tests in Obsidian vault
6. **Wrap Up** — Update Handoff Log, Feature Priority List, provide commit message

### The "Brad Protocol"
- **Micro-Steps:** Break complex coding tasks into atomic steps
- **Explain Why:** Briefly justify architectural choices
- **Celebrate:** Acknowledge when a feature works

### Session Handoff Protocol
At the end of each session:
1. Perform and confirm testing before updating any documentation
2. Update `docs/Handoff Log.md` with what was done
3. Update `docs/Feature Priority List.md` (mark as Completed)
4. Suggest a `git commit` message
5. Leave a "Next Session Prompt" in the Handoff Log
6. Note any bugs or issues discovered

---

## Architecture

*See `docs/ADR-001-Architecture.md` for full architectural decisions.*

### File Structure

```
switchboard/
├── main.ts                          # THIN entry point — DO NOT add business logic here
├── manifest.json
├── styles.css                       # Hand-edited — safe to modify directly
├── src/
│   ├── main.ts                      # Plugin class (724 lines — orchestrator)
│   ├── types.ts                     # Interfaces, defaults, constants
│   │
│   ├── services/                    # Business logic (4 files)
│   │   ├── CircuitManager.ts            # CSS injection, folder fading, accent color
│   │   ├── WireService.ts               # Chronos integration, scheduled calls, snooze
│   │   ├── SessionLogger.ts             # Session tracking, file/daily note logging
│   │   └── AudioService.ts              # Sound effects (synthesized + audio files)
│   │
│   ├── modals/                      # Obsidian modals (9 files)
│   │   ├── PatchInModal.ts              # Line selection (ribbon icon entry point)
│   │   ├── QuickSwitchModal.ts          # Keyboard-driven line switcher
│   │   ├── IncomingCallModal.ts         # Chronos task trigger (connect/hold/decline)
│   │   ├── CallLogModal.ts              # Session summary prompt at disconnect
│   │   ├── GoalPromptModal.ts           # Session goal prompt at patch-in
│   │   ├── OperatorModal.ts             # Context-specific command grid
│   │   ├── StatisticsModal.ts           # Session stats dashboard + CSV export
│   │   ├── SessionEditorModal.ts        # Edit/delete session history
│   │   └── TimeUpModal.ts               # Scheduled block expiry (extend/hang up)
│   │
│   ├── settings/                    # Settings UI (3 files)
│   │   ├── SwitchboardSettingTab.ts     # Main settings tab + schedule overview
│   │   ├── LineEditorModal.ts           # Create/edit Line configuration
│   │   └── PathSuggest.ts              # Folder/file autocomplete for safe paths
│   │
│   └── views/                       # Sidebar views (1 file)
│       └── DashboardView.ts             # Operator Dashboard sidebar
│
└── docs/
    ├── ADR-001-Architecture.md          # Architecture decisions
    ├── Feature Priority List.md         # Current priorities
    ├── Handoff Log.md                   # Session-by-session log
    └── launch-considerations/           # Pre-launch analysis docs
```

### Layer Responsibilities

| Layer | Should | Should NOT |
|-------|--------|------------|
| **main.ts** | Register commands, initialize services, handle lifecycle | Contain business logic, grow beyond orchestration |
| **Services** | Business logic, file I/O, state coordination | Render UI, manipulate DOM, depend on each other |
| **Modals** | Present UI, handle user interactions, call back to plugin | Contain complex business logic, do file I/O directly |
| **Settings** | Configure Lines and plugin options | Contain business logic |
| **Views** | Render dashboard UI, display state | Modify state directly |
| **Types** | Define interfaces, constants, pure utility functions | Import from other project files |

### Architecture Strengths (Preserve These!)
- **Zero service-to-service coupling** — Services are fully independent
- **Hub-and-spoke** — `main.ts` is the sole coordinator, no spaghetti imports
- **Soft external coupling** — Chronos integration is wrapped in try-catch, gracefully degrades

---

## Line Schema

```typescript
interface SwitchboardLine {
  id: string;                    // "math-140"
  name: string;                  // "Math 140"
  color: string;                 // "#3498db"
  safePaths: string[];           // ["Career/School/Math 140"]
  landingPage: string;           // "Career/School/Math 140/Dashboard.canvas"
  sessionLogFile: string;        // Optional — dedicated log file path
  sessionLogHeading: string;     // Optional — heading in log file
  scheduledBlocks: ScheduledBlock[];  // Native time blocks
  customCommands: OperatorCommand[];  // Context-specific commands
}
```

---

## Data Storage

| Data Type | Storage | Why |
|-----------|---------|-----|
| **Lines, settings, session history** | `loadData()`/`saveData()` → `data.json` | Syncs with plugin lifecycle, safe from user deletion |
| **Session logs** | Markdown files (per-Line log files + daily notes) | User-readable, searchable in vault |
| **Call Waiting** | `Call Waiting.md` | User-editable declined tasks list |

---

## Current Feature Status

### Completed ✅
- **Context Switching:** Patch In/Disconnect with CSS signal isolation
- **Session Tracking:** Duration logging, call log summaries, daily note integration
- **Chronos Integration:** #switchboard tag monitoring, incoming calls, snooze/reschedule
- **Operator Menu:** Context-specific command grid with custom commands per Line
- **Quick Switch:** Keyboard-driven line switching
- **Dashboard:** Sidebar view with session info, lines grid, schedule, recent sessions
- **Statistics:** Session history dashboard with CSV export
- **Session Editor:** Browse/edit/delete past sessions
- **Scheduled Blocks:** Native time blocks with auto-disconnect + extend
- **Goal Prompts:** Optional goal setting at patch-in, reflected in call log
- **Break Reminders:** Configurable timer notifications
- **Audio Feedback:** Synthesized + optional audio file sounds
- **Speed Dial:** Per-Line hotkey commands
- **Status Bar:** Live session timer with context menu

### Planned 🔮
- See `docs/Feature Priority List.md` for current roadmap

---

## Common Patterns & API Reference

### Dynamic CSS Injection
```typescript
// services/CircuitManager.ts
// Generates CSS to fade non-safe folders and override accent color
const css = `
  body.switchboard-active-${line.id} {
    --interactive-accent: ${line.color} !important;
  }
  body.switchboard-active-${line.id} .nav-folder-title:not([data-path*="${safePath}"]) {
    opacity: 0.1;
  }
`;
// Injected into <style id="switchboard-style">
```

### Chronos Integration
```typescript
// services/WireService.ts
// Polls Chronos for tasks with #switchboard tags
// Parses task times and triggers IncomingCallModal at scheduled time
// Gracefully handles Chronos not being installed
const chronos = this.app.plugins.getPlugin("chronos");
if (!chronos) return; // Soft dependency
```

### Session Lifecycle
```
Patch In → [Goal Prompt?] → Session Starts → Timer Running
  → [Break Reminder?] → [Scheduled Block Expires?] → [TimeUpModal?]
  → Disconnect → [Call Log if ≥5min?] → Session Logged → Daily Note Updated
```

---

## Common Pitfalls

### Don't:
- ❌ Put business logic in `main.ts` — it's already 724 lines
- ❌ Create dependencies between services — they must stay independent
- ❌ Use synchronous file I/O — always `await` vault operations
- ❌ Run git commands
- ❌ Skip testing before session wrap-up
- ❌ Hardcode paths or line IDs

### Do:
- ✅ Keep files under 300 lines where possible
- ✅ Use TypeScript strict mode
- ✅ JSDoc all public methods
- ✅ Test in dev before confirming done
- ✅ Follow session handoff protocol
- ✅ Wrap external plugin access in try-catch

---

## Checklist Before Coding
- [ ] Have we checked `docs/Feature Priority List.md` for current priorities?
- [ ] Is the user on the correct git branch?
- [ ] Do we understand the specific requirement?
- [ ] Have we reviewed relevant source files before making changes?

---

## Key Documentation

- **[[ADR-001-Architecture]]** — Architectural decisions
- **[[Feature Priority List]]** — Current phase/priority tracking
- **[[Handoff Log]]** — Session-by-session development log
- **[[launch-considerations/Codebase Stats]]** — Codebase size & metrics
- **[[launch-considerations/Test Coverage Matrix]]** — Test coverage status
- **[[launch-considerations/System Dependency Matrix]]** — Dependency map
