---
tags:
  - projects
  - active
  - switchboard
  - docs
---
# Switchboard - Feature Priority List

**Goal:** Build a "Context Manager" for the ADHD brain.
**Version:** 0.0.0 (Pre-Development)

---

## Phase 1: The Panel (Configuration)
**Goal:** Define "Lines" (Contexts) and their properties.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 1 | **Plugin Scaffold** | TypeScript, esbuild, styles.css. | 1h |
| 2 | **Settings UI** | Interface to create/edit "Lines". | 2h |
| 3 | **Line Schema** | `id`, `name`, `color`, `safePaths[]`, `landingPage`. | 0.5h |
| 4 | **Manual Trigger** | Ribbon icon -> List of Lines -> Click to Activate. | 1h |

**Deliverable:** You can click "Math" in a menu, and the plugin logs "Math Active."

---

## Phase 2: The Circuit (Environment Control)
**Goal:** Physically transform the workspace.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 5 | **Body Injection** | Add/Remove `body.switchboard-active-{id}` class. | 1h |
| 6 | **Dynamic CSS** | Generate CSS rules for "Signal Isolation" (fading folders). | 2h |
| 7 | **Accent Shift** | Update `--interactive-accent` variable. | 0.5h |
| 8 | **Landing Page** | Logic to open the defined `landingPage` file. | 1h |

**Deliverable:** Clicking "Math" turns the UI Blue and fades out non-Math folders.

---

## Phase 3: The Wire (Chronos Integration)
**Goal:** Automate the "Incoming Call."

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 9 | **Chronos Hook** | Subscribe to Chronos index (if available). | 2h |
| 10 | **Tag Listener** | Watch for `#switchboard/{id}` tags on active tasks. | 1h |
| 11 | **Incoming Call Modal** | "Math is calling." [Connect] [Hold] [Decline]. | 2h |
| 12 | **Snooze Logic** | Hide modal, re-show after X minutes. | 1h |

**Deliverable:** A Chronos task triggers the "Incoming Call" modal.

---

## Phase 4: The Operator (Tools & Logging)
**Goal:** Contextual tools and closing the loop.

| Order | Feature | Details | Est. Time |
|-------|---------|---------|-----------|
| 13 | **Call Log Modal** | "Call Ended. Summary?" input on disconnect. | 1h |
| 14 | **Log Writer** | Append summary to Daily Note or Landing Page. | 1h |
| 15 | **Context Commands** | "Operator Menu" showing specific commands (e.g., LaTeX). | 3h |

**Deliverable:** Ending a session prompts for a log, which is saved to your notes.

---

## Technical Debt / Risks

*   **Theme Conflicts:** Custom themes might override our "Signal Isolation" CSS. Need `!important` flags.
*   **Performance:** Generating dynamic CSS on the fly needs to be efficient.

---

## Development Totals
*   **Phase 1:** ~4.5 hours
*   **Phase 2:** ~4.5 hours
*   **Phase 3:** ~6 hours
*   **Phase 4:** ~5 hours
*   **Total MVP:** ~20 hours
