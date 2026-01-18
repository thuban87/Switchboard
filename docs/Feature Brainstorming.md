# Switchboard Feature Brainstorming
*Updated: January 18, 2026*

This document outlines upcoming features for the Switchboard plugin, organized into development phases.

---

## Phase 6: Speed & Polish
*Low effort, high impact quick wins*

### 1. Speed Dial (Hotkeys) ⚡
**Theme:** *Productivity / Speed*

Bind specific Lines to command palette IDs, allowing hotkey assignment.
- **Implementation:** Register `switchboard:patch-in-{line-id}` commands for each Line on load
- **Re-registration:** Update commands when Lines are added/edited/deleted
- **User action:** Bind hotkeys via Obsidian's native hotkey settings

**Why:** Removes friction of opening ribbon or menu. Muscle memory for entering focus.

---

### 2. Busy Signal (Conflict Handling) ⛔
**Theme:** *Metaphor / Polish*

If a scheduled block triggers while already patched into *another* line:
- Show a discreet toast notification instead of full modal
- Message: *"Incoming call from [Line B] - Currently on [Line A]"*
- Optional: Play "busy signal" sound (if audio enabled)

**Why:** Prevents breaking flow when you went overtime on a previous task.

---

### 3. The Click (Audio Feedback) 🔊
**Theme:** *Fun / Immersion*

Add satisfying mechanical sound effects to plugin actions.
- **Patch In:** A heavy "clunk" or 1/4" jack plugging in
- **Disconnect:** A "plug-out" or "click" sound
- **Incoming Call:** Subtle vintage ringer (optional)
- **Settings:** "Mute sounds" toggle for quiet environments
- **Implementation:** Single bundled audio file, `Audio` object usage

**Why:** Makes context switching feel *physical* and deliberate. Small dopamine hit.

**Deferred:** Custom sounds per Line (file size concern)

---

## Phase 7: Smart Decline & Rescheduling
*Call Waiting with full reschedule capabilities*

### 4. Call Waiting (Smart Decline) 📼
**Theme:** *Productivity / Anxiety Reduction*

When you decline an incoming call, ensure the task isn't lost.
- **"Send to Call Waiting"** prompt on decline
- Saves task info to `Call Waiting.md` in vault root (or configurable location)
- Format: `- [ ] [Line Name] - [Task Title] (declined at HH:MM)`

**Quick Reschedule Options:**
- "Call back in 1 hour" → Creates snooze timer
- "Call back tomorrow" → Adds to tomorrow's queue
- "Pick time" → Date/time picker for custom reschedule

**View Queue Command:**
- `switchboard:view-call-waiting` opens the queue file
- Or: dedicated modal showing queued items with edit/delete

**Why:** Reduces fear of dismissing tasks. "I can't do this now, but it's safe."

---

## Phase 8: Session Goals & Break Reminders
*Wellbeing & focus features*

### 5. Session Goals (Long Distance) 🎯
**Theme:** *Focus / Productivity*

Optional goal input when patching in.
- **Patch-in prompt:** "What do you want to accomplish?" (skippable)
- **Status bar:** Shows goal subtly next to timer
- **Call Log Modal:** "Did you accomplish: [goal]?" reflection prompt
- **Session history:** Goal saved with session record

**Why:** Gives sessions direction. ADHD brains need "what am I doing here?"

---

### 6. Break Reminder ☕
**Theme:** *Wellbeing*

Gentle reminder after configurable duration.
- **Settings:** Enable/disable, duration (default: 90 minutes)
- **Notification:** "You've been on [Line] for 2 hours. Take a stretch break?"
- **Options:** "5 more minutes" (snooze) / "Take a break" (disconnects)
- **Implementation:** Simple timer alongside session timer

**Why:** ADHD hyperfocus is real. External cues to stop.

---

## Phase 9: Quick Switch & Dashboard
*Navigation & visibility improvements*

### 7. Party Line (Quick Switch) 🔀
**Theme:** *Speed / Navigation*

Instant Line switching via popup menu.
- **Hotkey:** `Ctrl+Shift+L` (customizable) opens small popup
- **UI:** List of all Lines with keyboard navigation
- **Action:** Select → Automatically disconnect current + patch into new
- **Implementation:** Similar to Command Palette fuzzy search

**Why:** Current flow (Disconnect → Patch In → Select) is 3 steps. This is 1.

---

### 8. Operator Dashboard (Switchboard View) 📊
**Theme:** *Visibility / Home Base*

Dedicated workspace view (like Graph View).
- **Line Cards:** All Lines displayed as clickable cards with colors
- **Upcoming Blocks:** Today's scheduled sessions
- **Current Session:** Timer, goal, quick disconnect button
- **Quick Stats:** Today's focus time, sessions count
- **Implementation:** Custom `ItemView` registered with workspace

**Why:** Settings is buried. Dashboard gives Switchboard a home in workspace.

---

## Phase 10: Daily Note Integration
*Operator's Log*

### 9. Operator's Log (Daily Note Logging) 📓
**Theme:** *Integration*

Append session summaries to Daily Note automatically.
- **Format:** `[14:00 - 15:30] 📞 Math 140 (90m) - Summary text`
- **Settings:** 
  - Enable/disable
  - Heading name (default: `## Session Log`)
  - Daily Note folder path
- **Implementation:** Find daily note, locate heading, append entry

**Why:** Creates master timeline in primary journal automatically.

---

## Deferred / Backlog

| Feature | Reason |
|---------|--------|
| Custom sounds per Line | File size concerns |
| Chronos Two-Way Sync | High complexity, moderate reward |
| Weekly Charts in Statistics | Nice-to-have visual |
| Log Rotation | Only needed if files get large |
