---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# ADR-001: Switchboard Core Architecture

**Status:** Accepted
**Date:** January 11, 2026
**Last Updated:** January 11, 2026

---

## Context

Building an Obsidian plugin ("Switchboard") to manage "Time Blindness" and "Context Switching" for ADHD brains.
**Problem:** Moving between different types of work (e.g., Math vs. English) requires a mental "gear shift." The friction of re-orienting leads to procrastination.
**Goal:** A "Context Manager" that acts as an operator, physically "patching" the user into the correct environment for their task.

---

## Decisions

### 1. The Core Metaphor: The Switchboard Operator

**Decision:** The UI/UX will mimic a Switchboard.
*   **Contexts** are "Lines."
*   **Activating** a context is "Patching In."
*   **Deactivating** is "Disconnecting."

**Rationale:**
*   **Tangible:** It feels mechanical and intentional.
*   **Operator Control:** The user is the Operator, deciding which line to connect.

---

### 2. Trigger System: The "Incoming Call"

**Decision:** Switchboard uses a hybrid trigger system.
1.  **Manual:** User opens the "Switchboard Panel" (Command Palette or Ribbon) and clicks a Line to patch in.
2.  **Automated (Chronos Integration):** Switchboard subscribes to the **Chronos** index. If a task tagged `#switchboard/math` starts, Switchboard triggers an "Incoming Call" modal.

**The "Incoming Call" Modal:**
*   "Incoming Call: Math 140"
*   [📞 Connect] (Start Context)
*   [🕒 Hold 5m] (Snooze)
*   [❌ Decline] (Skip)

---

### 3. Environment Control: The "Circuit" (CSS Injection)

**Decision:** When a Line is active, Switchboard injects a scoped CSS class to the body: `body.switchboard-active-math`.

**Effects:**
1.  **Visual Feedback:** Changes `--interactive-accent` to the Line's color.
2.  **Signal Isolation:** Hides/Fades folder paths not defined in the Line's "Safe Zone" using CSS selectors.
    ```css
    body.switchboard-active-math .nav-folder-title:not([data-path*="School/Math"]) {
        opacity: 0.1;
        filter: grayscale(100%);
    }
    ```

---

### 4. Application Logic: The "Patch Cable" (Workspace Switching)

**Decision:** Patching In automatically loads a specific Obsidian Workspace or Canvas.
*   **Logic:** If the Line has a `landing_page` defined (e.g., `Math Dashboard.canvas`), Switchboard closes irrelevant tabs and opens that file.

---

### 5. Contextual Commands: The "Operator Panel"

**Decision:** Prioritize specific commands in the Command Palette when a Line is active.
*   **Implementation:** Use `app.commands.listCommands()` to filter, and potentially a custom "Operator Menu" modal that shows *only* the commands relevant to the current context (e.g., "Insert Equation" for Math).

---

### 6. Session Logging: The "Call Log"

**Decision:** Upon Disconnect, prompt for a "Call Summary."
*   **Storage:** Append the summary to the Daily Note or the Course Note (configurable).

---

## Consequences

### Positive
*   **Friction Reduction:** One click sets up the entire environment.
*   **Focus:** "Signal Isolation" reduces visual noise from other projects.
*   **Intentionality:** The "Incoming Call" metaphor forces a conscious decision to start work.

### Negative
*   **Setup:** Requires defining "Lines" (Paths, Colors, Landing Pages) in settings.
*   **Rigidity:** If the user needs a random file while "Patched In," they must navigate through the faded folders.

---

## Open Questions

1.  **Desmos Integration:** Can we embed a Desmos calculator in the "Operator Panel"?
2.  **Sound Effects:** Should "Patching In" have a satisfying *click* sound?
