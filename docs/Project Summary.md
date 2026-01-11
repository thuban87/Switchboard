---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard - Project Summary

**Tagline:** Patch into your focus.
**Core Concept:** A Context Manager for Obsidian that solves "Context Switching" friction via a tactile "Switchboard Operator" metaphor.
**Version:** 0.0.0 (Pre-Development)

---

## The Problem: The Gear-Shift Friction

For the ADHD brain, the "Cost" of switching tasks is massive.
1.  **Vampire Drift:** You finish Math, need to start English, but get lost in your Inbox/Youtube/Reddit during the transition.
2.  **Visual Noise:** When doing Math, seeing your "Finance" folder creates background anxiety.
3.  **Tool Clutter:** Your Command Palette is full of plugins you don't need right now.

## The Solution: Switchboard

Switchboard treats your focus contexts (Math, Writing, Coding) as distinct "Telephone Lines." You are the Operator.

### Key Mechanics

#### 1. The Circuit (Signal Isolation)
*   **What:** When you "Patch In" to a Line (Context), the vault physically changes.
*   **Tech:** CSS Injection (`body.switchboard-active-math`).
*   **Effect:**
    *   **Accent Color:** Shifts to match the context (Blue for Math).
    *   **Ghosting:** Folders outside the "Safe Zone" fade to 10% opacity.
    *   **Landing:** Your Dashboard automatically opens.

#### 2. The Incoming Call (Chronos Integration)
*   **What:** Automation that respects your agency.
*   **Tech:** Hooks into **Chronos** (Task Plugin).
*   **Effect:** When a task tagged `#switchboard/math` is due, a modal rings: *"Incoming Call: Math 140."* You choose to **Answer** (Start) or **Hold** (Snooze).

#### 3. The Call Log (Closing the Loop)
*   **What:** A debriefing ritual.
*   **Effect:** When you "Disconnect," you're asked: *"Summary of call?"* Your answer is logged to the project note, creating a history of your work sessions.

---

## Technical Architecture

### Tech Stack
*   **Language:** TypeScript
*   **Build:** `esbuild`
*   **Styling:** Dynamic CSS Generation (Style Element injection)

### Dependencies
*   `obsidian`: Core API
*   `Chronos` (Optional): For automation triggers.

### Environment
*   **Development:** `C:\Users\bwales\projects\obsidian-plugins\switchboard`
*   **Deployment:** `G:\My Drive\IT\Obsidian Vault\My Notebooks\.obsidian\plugins\switchboard`

---

## Development Approach

1.  **Phase 1 (The Panel):** Build the Settings UI to define "Lines" (Paths, Colors).
2.  **Phase 2 (The Circuit):** Get the CSS Injection working. Prove we can "fade" folders.
3.  **Phase 3 (The Wire):** Connect to Chronos for triggers.
4.  **Phase 4 (The Operator):** Build the "Call Log" and contextual commands.

---

## Reference Material
*   **Sibling Project:** `Orbit` (for Architecture).
*   **Sibling Project:** `Chronos` (for Triggers).
*   **Inspiration:** 1950s Telephone Switchboards, "Modus Operandi," Focus/Zen Modes.
