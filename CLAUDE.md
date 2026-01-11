---
tags:
  - projects
  - active
  - switchboard
---
# CLAUDE.md - Switchboard

**Purpose:** Instructions for AI assistants working on the **Switchboard** project.
**Last Updated:** January 11, 2026

---

## ⚠️ CRITICAL: Git Protocol
**DO NOT perform git commands.**
*   The user will handle all git operations.
*   **Your Job:** Suggest commit messages/descriptions when a task is done.
*   **Remind:** When starting a new task, remind the user to check branches.

---

## Project Overview
**Switchboard** is a Context Manager plugin for Obsidian.
**Goal:** Reduce context-switching friction via "Signal Isolation" and a Switchboard Operator metaphor.

### Core Metaphors
*   **Line:** A Context (e.g., Math, Writing).
*   **Patch In:** Activating a context.
*   **Disconnect:** Deactivating a context.
*   **Circuit:** The visual state (Colors/Fading) of the vault.

---

## Architecture (Quick Reference)
*See `docs/ADR-001-Architecture.md` for full details.*

| Component | Tech | Responsibility |
|-----------|------|----------------|
| **The Panel** | TS | Settings UI to define Lines. |
| **The Circuit** | CSS | Dynamic stylesheet injection to fade folders. |
| **The Wire** | TS | Listener for Chronos tasks. |
| **The Operator** | TS | Command Palette filtering and Logging. |

### Line Schema (Settings)
```typescript
interface SwitchboardLine {
  id: string;          // "math-140"
  name: string;        // "Math 140"
  color: string;       // "#3498db"
  safePaths: string[]; // ["Career/School/Math 140"]
  landingPage: string; // "Career/School/Math 140/Dashboard.canvas"
}
```

---

## Development Environment
*   **Source:** `C:\Users\bwales\projects\obsidian-plugins\switchboard`
*   **Deploy:** `G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\switchboard`
*   **Build:** `npm run dev` (Watches and copies to deploy target).

---

## Workflow Guidelines

### 1. The "Brad Protocol"
*   **Micro-Steps:** Break complex coding tasks into atomic steps.
*   **Explain Why:** Briefly justify architectural choices.
*   **Celebrate:** Acknowledge when a feature works.

### 2. Session Handoff
At the end of a session:
1.  Update `docs/Feature Priority List.md` (Mark as Completed).
2.  Suggest a `git commit` message.
3.  List the *immediate* next step for the next session.

---

## Common Patterns & API Reference

### Dynamic CSS Injection
```typescript
// services/CircuitManager.ts
updateCircuit(line: SwitchboardLine) {
  const css = `
    body.switchboard-active-${line.id} {
      --interactive-accent: ${line.color} !important;
    }
    body.switchboard-active-${line.id} .nav-folder-title:not([data-path*="${line.safePaths[0]}"]) {
      opacity: 0.1;
    }
  `;
  // Inject into <style id="switchboard-style">
}
```

### Chronos Subscription (Conceptual)
```typescript
// services/Wire.ts
app.plugins.getPlugin("chronos").on("task-start", (task) => {
  if (task.tags.includes("#switchboard")) {
    this.triggerIncomingCall(task);
  }
});
```

---

## Checklist Before Coding
- [ ] Have we confirmed the "Feature Phase" in the Priority List?
- [ ] Is the user on the correct git branch?
- [ ] Do we understand the specific requirement (e.g., "Signal Isolation logic")?
