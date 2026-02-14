# Changelog

All notable changes to Switchboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.5.0] - 2026-02-10

First public release via BRAT.

### Added

- **Signal Isolation** — Patch into a Line to fade non-relevant folders and shift Obsidian's accent color
- **Session Tracking** — Automatic duration logging to dedicated log files and daily notes
- **Call Log** — Session summary prompt on disconnect (for sessions ≥5 minutes)
- **Operator Menu** — Context-specific command grid with support for file, command, and insert actions
- **Custom Operator Commands** — Define your own per-Line commands
- **Scheduled Blocks** — Recurring and one-time time blocks per Line with auto-disconnect and extend options
- **Line Switcher** — Keyboard-driven Line switcher for instant context switching
- **Session Goals** — Optional goal prompt on patch-in with reflection on disconnect
- **Statistics Dashboard** — Session history with summary cards, per-line breakdown, and CSV export
- **Session Editor** — Browse, edit, and delete past session records
- **Operator Dashboard** — Sidebar view with current session, Lines grid, schedule, and recent history
- **Speed Dial** — Per-Line hotkey commands (assign via Settings → Hotkeys)
- **Break Reminders** — Configurable timer notifications for long sessions
- **Audio Feedback** — Synthesized click sounds for patch-in/disconnect with mute toggle
- **Status Bar** — Live session timer with context menu for quick actions
- **Daily Note Integration** — Append session summaries to your daily note

### Security

- Path validation prevents traversal attacks on session log file paths
- Input validation on all user-configurable fields (colors, times, dates, IDs)
- Corrupted settings recovery with automatic fallback to defaults
- Session history capped at 1,000 entries to prevent unbounded growth

### Technical

- 93 unit tests covering core services and utilities
- TypeScript strict mode enabled
- Zero runtime dependencies (pure Obsidian plugin)
- Clean hub-and-spoke architecture with zero service-to-service coupling
- All timers and listeners properly cleaned up on plugin unload
- Keyboard accessible — `:focus-visible` outlines on all interactive elements
