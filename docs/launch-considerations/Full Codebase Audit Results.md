# Full Codebase Audit Results

> **Generated:** 2026-02-08 | **Version:** 1.5.0 (Pre-BRAT Launch) | **Scope:** Deep audit across services, modals, settings, views, types, build config, CSS, and manifest. Covers findings from 4 parallel investigation agents plus targeted pattern analysis.

---

## Table of Contents

1. [Service Layer Audit](#1-service-layer-audit)
2. [Modal Layer Audit](#2-modal-layer-audit)
3. [Settings & Views Audit](#3-settings--views-audit)
4. [Security & Error Handling Audit](#4-security--error-handling-audit)
5. [Build Configuration & Infrastructure Audit](#5-build-configuration--infrastructure-audit)
6. [Code Quality & Consistency Audit](#6-code-quality--consistency-audit)
7. [Consolidated Priority Rankings](#7-consolidated-priority-rankings)

---

## 1. Service Layer Audit

4 service files, 1,317 total lines, 0% test coverage.

### 1.1 CircuitManager.ts (213 lines)

#### Public Methods

| Method | Lines | Complexity | Description |
|--------|-------|------------|-------------|
| `activate()` | 28-48 | Medium (4) | Adds body classes, injects CSS, optionally collapses/expands folders |
| `deactivate()` | 55-77 | Low (2) | Removes all switchboard body classes, removes injected `<style>` |
| `isActive()` | 209-211 | Trivial (1) | Checks if `switchboard-active` body class exists |

#### CSS Injection Risk (Line 34)

`line.id` interpolated directly into body class names and CSS selectors without escaping:
```typescript
document.body.addClass(`switchboard-active-${line.id}`);
```
If `line.id` contains special characters, this could break CSS or pollute the body class list. The `generateCSS()` method (lines 121-157) similarly uses `line.id` in selector construction. Safe paths *are* properly escaped via `CSS.escape()` at line 174 — but `line.id` is not.

**Risk:** Medium. IDs come from `generateId()` in `types.ts` which strips non-alphanumeric characters, providing indirect protection. However, corrupted `data.json` or hand-edited settings could bypass this.

#### Unsafe Type Casts

- **Line 84:** `(this.app as any).commands?.executeCommandById?.("file-explorer:collapse-all")` — accesses internal Obsidian API
- **Line 92:** `const explorerView = fileExplorer.view as any` — accesses undocumented view internals
- **Lines 109-110:** `(item as any).setCollapsed` — calls undocumented API on folder items

These are necessary for the folder-collapse feature but rely on Obsidian internals that could change without notice.

#### Input Validation Gaps

- `activate()` never validates: Is `line.id` empty? Is `line.color` a valid hex? Are `safePaths` well-formed?
- Empty safePaths handled (line 165) but allows arrays with empty strings — generates wasteful comment-only CSS

#### Edge Cases

1. Rapid `activate()` calls could create duplicate `<style>` elements (narrow race window at lines 30-35)
2. `focusFolders()` silently fails if file explorer plugin isn't loaded (line 87)
3. `adjustBrightness()` handles overflow with `Math.min(255, ...)` correctly (line 200)

#### Hardcoded Values

| Value | Location | Concern |
|-------|----------|---------|
| `"switchboard-active"` class prefix | Lines 33, 60, 66 | Should be a constant |
| `"switchboard-style"` style element ID | Lines 35, 65, 71 | Should be a constant |
| `"file-explorer:collapse-all"` command | Line 84 | Undocumented internal command |
| `0.15` opacity for faded folders | CSS generation | Hardcoded in CircuitManager, not configurable |

---

### 1.2 WireService.ts (552 lines)

#### Public Methods

| Method | Lines | Complexity | Description |
|--------|-------|------------|-------------|
| `start()` | 51-66 | Low (3) | Starts polling timer, subscribes to Chronos events |
| `stop()` | 71-87 | Low (2) | Clears all timers, unsubscribes from events |
| `refreshTimers()` | 92-138 | High (8) | Polls Chronos, parses tasks, schedules incoming calls |
| `isActive()` | 548-550 | Trivial (1) | Returns running flag |

#### Timer Memory Leak (Lines 37, 148-160)

`scheduledCalls` map stores setTimeout references indefinitely. When `triggerIncomingCall()` fires, the entry is deleted (line 171), but if the modal is closed or the plugin unloads mid-timeout, timers persist. Over long sessions with many Chronos tasks, this map could grow unbounded.

**Fix:** Clear all scheduled timers on `stop()` — currently done at line 75, so the leak only occurs if `stop()` is never called (e.g., crash).

#### Snooze/Decline Race Condition (Lines 246-266)

When a user clicks "Hold" (snooze), the task is added to `snoozedCalls` map (line 250). If the user then clicks "Decline" before the snooze timer fires, the task exists in both maps. The decline handler (line 266) does **not** remove from `snoozedCalls` — the snoozed timer will still fire and re-trigger the incoming call modal even though the user declined.

#### Task Time Parsing Fragility (Lines 404-425)

`parseTaskTime()` constructs dates via string interpolation:
```typescript
return new Date(`${dateStr}T${timeStr}:00`);
```
No validation that the resulting Date is valid (no `isNaN(date.getTime())` check). An invalid date causes `triggerTime.getTime() - now.getTime()` to return `NaN`, leading to `setTimeout(callback, NaN)` which fires immediately.

#### generateTaskId() Collision Risk (Lines 430-435)

ID format: `${filePath}:${lineNumber}:${date}`. If a task is moved to a different file or line number but retains the same date, the old snoozed/declined state persists under the wrong key.

#### saveToCallWaiting() Not Awaited (Line 265)

`saveToCallWaiting()` is async but called without `await` in `handleCallAction()`. The success Notice appears before the file write completes. If the write fails, the user sees "Saved to Call Waiting" but the file is unchanged.

#### Unsafe Type Casts

- **Line 189:** `(this.plugin as any).missedCallsAcknowledged = false` — bypasses type system to access private field
- **Lines 350-351:** `file as any` — vault read/modify on untyped file reference
- **Line 375:** `(this.app as any).plugins?.plugins` — internal Obsidian API access

#### Hardcoded Values

| Value | Location | Concern |
|-------|----------|---------|
| `60000` ms grace period | Line 119 | Should be named constant |
| `"Call Waiting.md"` file path | Line 337 | Should be configurable setting |
| `2000` ms Chronos startup delay | `main.ts:154` | Magic number, no explanation |

---

### 1.3 SessionLogger.ts (359 lines)

#### Public Methods

| Method | Lines | Complexity | Description |
|--------|-------|------------|-------------|
| `startSession()` | 31-36 | Low (1) | Creates session object with start time |
| `endSession()` | 42-62 | Low (3) | Calculates duration, returns info if >= 5 min |
| `logSession()` | 67-105 | Medium (5) | Writes to per-Line log file, saves to history |
| `logToDailyNote()` | 268-357 | High (8) | Complex heading/section detection and insertion |
| `getCurrentDuration()` | 259-263 | Low (1) | Calculates elapsed minutes |

#### Path Traversal Vulnerability (Line 186)

`sessionLogFile` is used directly from line configuration without validation:
```typescript
if (line.sessionLogFile) {
    logPath = line.sessionLogFile;  // UNVALIDATED
}
```
If `sessionLogFile` contains `../../`, it could write outside the vault. Obsidian's vault API provides some protection, but explicit validation is missing.

#### Heading Detection Fragility (Lines 82-101, 317-349)

Uses `content.indexOf(heading)` for heading detection — substring match, not line-aware:
```
This mentions Session Log in body text.
## Session Log  ← intended target
```
`indexOf()` would find the first occurrence (in body text), inserting log entries in the wrong location.

#### Session History Unbounded Growth (Lines 124-129)

`sessionHistory` array grows indefinitely with no pruning. At 1,000+ sessions, `data.json` becomes unwieldy and plugin startup degrades.

#### Daily Note Heading Insertion Bug (Line 334)

```typescript
const nextHeadingMatch = restContent.match(/^#+\s/m);
```
If `nextHeadingMatch` is null (no next heading found), line 334 accesses `.index` on null — potential runtime error. Should use optional chaining: `nextHeadingMatch?.index`.

#### Timezone Inconsistency

- `saveToHistory()` (line 114) uses `.toISOString().split("T")[0]` — **UTC date**
- `logToDailyNote()` (lines 277-282) uses `new Date().getDate()` — **local date**

A session ending at 11:30 PM local (UTC-5) would log as the next day's date in history but the current day in daily notes.

#### Concurrent Logging Race Condition (Lines 79-103)

Read-modify-write pattern with no locking:
1. Log A reads file → content v1
2. Log B reads file → content v1
3. Log A writes → content v1 + entry A
4. Log B writes → content v1 + entry B → **Entry A lost**

#### Hardcoded Values

| Value | Location | Concern |
|-------|----------|---------|
| `5` minute minimum for call log | Line 57 | Not configurable |
| Date format `toTimeString().slice(0, 5)` | Line 140 | Locale-dependent |

---

### 1.4 AudioService.ts (193 lines)

#### Public Methods

| Method | Lines | Complexity | Description |
|--------|-------|------------|-------------|
| `playPatchIn()` | 53-61 | Low (2) | Routes to realistic or synthesized sound |
| `playDisconnect()` | 66-74 | Low (2) | Routes to realistic or synthesized sound |
| `destroy()` | 182-191 | Low (2) | Cleans up blob URL and AudioContext |

#### HTMLAudioElement Memory Leak (Line 152)

Each call to `playRealisticClick()` creates a new `Audio()` element:
```typescript
const audio = new Audio(this.clickAudioUrl);
audio.play().catch(() => { ... });
```
Elements are never cleaned up. Frequent patch-in/disconnect cycles accumulate orphaned Audio elements in memory.

#### AudioService.destroy() Not Called on Plugin Unload

`main.ts:onunload()` calls `wireService.stop()` and `circuitManager.deactivate()` but does **not** call `audioService.destroy()`. The AudioContext and blob URL persist in memory after plugin unload.

#### Async Load Without Await (Line 18)

`loadAudioFile()` called in constructor but not awaited. If `playPatchIn()` is called immediately after construction, the audio file may not be ready — falls back to synthesized sound gracefully.

#### Error Handling

Audio failures are handled well — all paths have try-catch with fallback to synthesized sounds. The `.catch()` on line 154 suppresses play errors and falls back correctly.

---

### 1.5 Cross-Service Issues

#### Plugin Unload Cleanup Gap

```
onunload() calls:
  ✅ this.stopTimerUpdates()
  ✅ this.wireService.stop()
  ✅ this.circuitManager.deactivate()
  ❌ this.audioService.destroy()     ← MISSING
  ❌ this.cancelAutoDisconnect()     ← MISSING
  ❌ this.stopBreakReminderTimer()   ← MISSING
```

The Chronos startup `setTimeout` (line 154) is also untracked — if the plugin unloads within 2 seconds of loading, the timer fires on a dead plugin instance.

#### Settings Mutation Pattern

`SessionLogger` directly mutates `plugin.settings.sessionHistory` (line 129) then calls `saveSettings()`. No defensive copy, no rollback on save failure.

---

## 2. Modal Layer Audit

9 modal files, 1,426 total lines, 0% test coverage.

### 2.1 PatchInModal.ts (96 lines)

**Status:** Clean. Uses `.createEl()` API throughout (safe from XSS). Minor issues:
- No debounce on line selection clicks — double-click fires callback twice
- Color not validated before `style.backgroundColor` assignment (line 56)

### 2.2 QuickSwitchModal.ts (186 lines)

#### Memory Leak: lineElements Array (Line 14)

`lineElements` array stores DOM references. Set in `onOpen()` (line 56) but never cleared in `onClose()`. Modal is opened frequently (quick-switch shortcut), accumulating stale DOM references.

#### Unvalidated Array Access (Line 174)

`selectCurrent()` accesses `this.lines[this.selectedIndex]` without bounds checking. If `lines` is empty, `selectedIndex` defaults to 0 and `this.lines[0]` returns `undefined`.

#### Goal Display Overflow (Line 49)

`this.currentGoal` rendered without truncation. Very long goals break layout. Status bar truncates to 20 chars (main.ts:526) but QuickSwitchModal does not.

### 2.3 IncomingCallModal.ts (197 lines)

#### State Machine Bug: showingDeclineOptions Not Reset (Line 28)

`showingDeclineOptions` is an instance variable set to `true` when decline options are shown (line 132). Never reset in `onClose()`. While new modals create new instances (so this is safe in practice), it's a fragile pattern.

#### File Path Parsing Assumes Unix Separator (Line 70)

```typescript
const fileName = this.data.filePath.split("/").pop() || this.data.filePath;
```
Windows uses `\` as separator. Should use `/[\\\/]/` to split on both.

#### Double-Click Race on Action Buttons (Lines 84, 96, 126)

No processing guard. User can click "Connect" then immediately "Hold" — both callbacks fire before the modal closes.

#### Hardcoded Snooze Options (Lines 104-107)

Only 4 options: 5m, 10m, 15m, 30m. No custom input. User's `defaultSnoozeMinutes` may not match any option.

### 2.4 CallLogModal.ts (133 lines)

**Status:** Mostly clean. Minor issues:
- `Ctrl+Enter` shortcut doesn't also check `e.metaKey` (Cmd on Mac) — line 107
- No `maxlength` on textarea — unlimited input length
- `setTimeout(() => this.textArea.focus(), 50)` at line 80 should use optional chaining

### 2.5 GoalPromptModal.ts (85 lines)

**Status:** Clean. Minor issues:
- No max length on goal input (line 42)
- CSS variable injection via `this.lineColor` (line 28) — low risk since user-controlled

### 2.6 OperatorModal.ts (169 lines) — HIGHEST RISK MODAL

#### Missing Error Handling on Command Execution (Lines 122-167)

The `executeCommand()` method has three action types, all with issues:

**"command" action (line 126):**
```typescript
const commands = (this.app as any).commands;
if (commands.commands[cmd.value]) {
    commands.executeCommandById(cmd.value);
}
```
- `as any` cast bypasses type safety
- No try-catch around `executeCommandById()` — could throw
- No validation that `cmd.value` is a non-empty string

**"insert" action (line 136):**
- `cmd.value` not validated before `.replace()` — null/undefined would throw
- Cursor positioning hardcoded for `$  $` pattern (line 145) — fragile

**"open" action (line 153):**
```typescript
this.app.workspace.getLeaf().openFile(file as any);
```
- `as any` cast — file could be a TFolder, not TFile
- No try-catch around `openFile()`

#### Business Logic in Modal Layer (Lines 122-167)

All command execution logic lives in the modal. Per architecture guidelines, this should be in a service. If the modal is closed mid-execution, state could be inconsistent.

#### Default Commands Reference Non-Existent Plugins (Lines 8-38)

`DEFAULT_COMMANDS` includes commands like `"excalidraw:new-drawing"` (line 13) which require external plugins. No validation that these commands exist — user sees "Command not found" at runtime.

### 2.7 StatisticsModal.ts (235 lines)

#### Clipboard Copy Not Awaited (Line 152)

```typescript
navigator.clipboard.writeText(markdown);
new Notice("📋 Statistics copied to clipboard!");
```
`writeText()` returns a Promise but is not awaited. If it fails, success Notice still shows.

#### Date Filtering Fragility (Lines 50-54)

Week calculation uses `toISOString().split("T")[0]` (UTC date) but session dates are stored in local time. Near midnight in negative UTC offsets, week boundaries shift.

#### Hardcoded English Locale (Line 185)

```typescript
const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
```
Should respect user's locale.

### 2.8 SessionEditorModal.ts (230 lines)

#### Missing Bounds Check on Session Index (Lines 193, 212)

```typescript
this.plugin.settings.sessionHistory[index] = record;  // Line 193
this.plugin.settings.sessionHistory.splice(index, 1);  // Line 212
```
If another process deletes sessions between render and action, `index` is stale.

#### Time Input Not Validated (Lines 160-180)

`record.startTime` and `record.endTime` accept any string. Invalid values like "99:99" pass through to `recalculateDuration()` where they produce `NaN`.

#### recalculateDuration() Doesn't Handle Midnight Crossing (Lines 200-206)

If end time < start time (session spans midnight), duration becomes negative. `Math.max(0, ...)` clamps to 0, losing the actual duration.

### 2.9 TimeUpModal.ts (95 lines)

**Status:** Mostly clean. Minor issues:
- No validation on `minutes` parameter in `extendSession()` (line 81) — negative/NaN would break scheduling
- No error handling around `scheduleAutoDisconnect()` (line 85)
- Only 3 fixed extension options (15/30/60 min) — no custom input

---

## 3. Settings & Views Audit

4 files, 1,382 total lines, 0% test coverage.

### 3.1 SwitchboardSettingTab.ts (524 lines)

#### Event Listener Memory Leak (Lines 174-216)

`input` and `blur` event listeners added to daily notes folder search input are never removed. Each call to `display()` (triggered by any toggle/edit) adds duplicate listeners.

#### innerHTML Usage (Lines 295, 315)

```typescript
editBtn.innerHTML = "✏️";
deleteBtn.innerHTML = "🗑️";
```
While these are emoji-only (safe), `innerHTML` sets a dangerous precedent. Should use `textContent`.

#### Chronos Integration Fragility (Lines 436-512)

- `(this.app as any).plugins?.plugins?.["chronos-google-calendar-sync"]` — deeply chained internal API access
- Entire method wrapped in generic try-catch, returns empty array on any error (line 509)
- No distinction between "Chronos not installed" (expected) and actual parse error (unexpected)

#### Break Reminder No Upper Bound (Lines 129-140)

Input accepts any integer. User could enter `999999` — setTimeout with huge delay wastes resources. No validation beyond `Math.max(0, ...)`.

#### Full Re-render on Every Change (Line 154)

`this.display()` called on toggle changes, causing full settings tab rebuild including Chronos task fetch. Expensive for frequent toggling.

#### Hardcoded Suggestion Limit

- Folder suggestions sliced to 10 (line 180) — good
- But schedule overview shows all blocks without limit — large schedules could slow the UI

### 3.2 LineEditorModal.ts (565 lines)

#### Array Index Closure Bug (Lines 242, 318, 554)

Delete buttons use loop index `i` in closures:
```typescript
for (let i = 0; i < this.line.safePaths.length; i++) {
    // ...
    .onClick(() => {
        this.line.safePaths.splice(i, 1);  // i captured by closure
    })
}
```
If user rapidly deletes multiple items, indices shift and wrong items are deleted. Same pattern for schedule blocks (line 318) and custom commands (line 554).

#### No Time Format Validation (Lines 388-405)

`block.startTime` and `block.endTime` accept any string:
```typescript
.onChange((value) => {
    block.startTime = value;  // "99:99", "abc", "" all accepted
})
```
Invalid times break `formatTime12h()` and downstream scheduling logic.

#### No Date Validation (Lines 373-378)

`block.date` accepts any string. "2026-13-45" or "not-a-date" stored without validation.

#### Duplicate Line ID Not Detected (Line 61)

When editing a new line's name, `generateId(value)` is called but the result is not checked for collisions with existing lines. Two lines named "Math" would get the same ID `"math"`, causing data corruption.

#### Validate Function Shows No Error (Lines 426-437)

`validate()` returns `false` for invalid names but does not display any error message. User clicks Save and nothing happens — no feedback.

#### FileSuggest Instances Not Cleaned Up (Lines 84, 100, 545)

`new FileSuggest(...)` called without storing the reference. On repeated modal opens, instances accumulate without cleanup.

### 3.3 PathSuggest.ts (138 lines)

#### Performance: Full Vault Scan Per Keystroke (Lines 23, 89)

`getAllLoadedFiles()` iterates every file in the vault on each keystroke:
```typescript
const allFiles = this.app.vault.getAllLoadedFiles();
for (const file of allFiles) { ... }
```
In large vaults (10k+ files), this causes noticeable input lag. Results are sliced to 20 (line 46), but the full iteration still runs.

#### Empty Input Returns All Matches (Line 31)

Empty string `""` matches everything via `.includes("")`. All folders show as suggestions on focus even with no input.

#### Type Safety (Line 91)

```typescript
if (file.path === "/") continue;
```
No `instanceof` check — relies on all items having `.path` property. Should use `file instanceof TFile`.

### 3.4 DashboardView.ts (250 lines)

#### Timer Cleanup Dependency (Lines 36-45)

`setInterval(30000)` created in `onOpen()`, cleared in `onClose()`. If the view is never explicitly closed (workspace destroyed, plugin crash), the interval persists. Should also be cleared in plugin's `onunload()`.

#### Container Element Hard-Indexed (Line 56)

```typescript
const container = this.containerEl.children[1] as HTMLElement;
```
Assumes Obsidian ItemView structure: children[0] = header, children[1] = content. If Obsidian changes this layout, the dashboard silently breaks.

#### No Error Handling on Plugin Calls (Lines 110, 154)

```typescript
disconnectBtn.addEventListener("click", () => {
    this.plugin.disconnect();  // No try-catch
});
```
If `disconnect()` throws, the event handler crashes and the dashboard becomes unresponsive.

#### Timezone Bug in Schedule Display (Line 169)

```typescript
const todayStr = today.toISOString().split("T")[0];
```
UTC date — in negative UTC offsets, shows tomorrow's schedule after local evening.

---

## 4. Security & Error Handling Audit

### 4.1 Input Sanitization

**No sanitizer exists.** Unlike the Quest Board plugin (which has DOMPurify), Switchboard has no input sanitization utility. All user inputs are stored and rendered as-is.

**Mitigating factor:** Switchboard uses `.createEl()` and `.setText()` APIs throughout, which safely escape text content. The risk is lower than it would be with `innerHTML`.

### 4.2 innerHTML Usage

| File | Lines | Risk |
|------|-------|------|
| `SwitchboardSettingTab.ts` | 295, 315 | **Low** — Emoji-only strings, but bad pattern |

No `dangerouslySetInnerHTML`, `eval()`, or `new Function()` found. No dynamic script injection patterns.

### 4.3 `as any` Type Escapes

**16 instances across 7 files:**

| File | Lines | Purpose |
|------|-------|---------|
| `CircuitManager.ts` | 84, 92, 109, 110 | Internal Obsidian APIs (commands, file explorer) |
| `WireService.ts` | 189, 350, 351, 375 | Private field access, vault operations, Chronos API |
| `AudioService.ts` | 26, 170 | Vault adapter, webkitAudioContext |
| `main.ts` | 259, 352 | `openFile()` on abstractFile |
| `SwitchboardSettingTab.ts` | 177, 436 | Folder detection, Chronos API |
| `OperatorModal.ts` | 126, 161 | Commands API, openFile |

Most are necessary for accessing undocumented Obsidian internals. Should document each with a comment explaining why the cast is needed.

### 4.4 Path Validation

**No path validation utility exists.** Paths are used directly from user settings:

| Path Source | Used In | Validated? |
|-------------|---------|-----------|
| `line.safePaths[]` | CircuitManager CSS generation | ❌ No (CSS.escape used for selectors, but path itself not checked) |
| `line.landingPage` | main.ts `patchIn()` | ❌ No — used directly in `getAbstractFileByPath()` |
| `line.sessionLogFile` | SessionLogger `logSession()` | ❌ No — **path traversal risk** |
| `settings.dailyNotesFolder` | SessionLogger `logToDailyNote()` | ❌ No |
| `"Call Waiting.md"` | WireService, main.ts | N/A — hardcoded |
| `OperatorCommand.value` (open) | OperatorModal `executeCommand()` | ❌ No |

**Recommendation:** Create `validatePath()` utility in `types.ts` that rejects `..` traversal, absolute paths, and paths starting with `.`.

### 4.5 Silently Swallowed Errors

**Console-only errors (user never informed):**

| File | Lines | Impact |
|------|-------|--------|
| `SessionLogger.ts` | 75, 236, 303, 309 | Log file creation/write failures silent |
| `WireService.ts` | 364, 379, 396 | Call Waiting save, Chronos access failures silent |
| `AudioService.ts` | 46, 109, 137, 155, 159, 172 | Audio failures (graceful fallback) |
| `SwitchboardSettingTab.ts` | 509 | Chronos task parse error silent |

**Empty catch blocks:**

| File | Line | Context |
|------|------|---------|
| `AudioService.ts` | 154 | `.catch(() => { ... })` on audio.play — has fallback, acceptable |

**Async without try-catch:**

| File | Line | Issue |
|------|------|-------|
| `StatisticsModal.ts` | 152 | `navigator.clipboard.writeText()` not awaited |
| `WireService.ts` | 265 | `saveToCallWaiting()` not awaited |
| `main.ts` | 154 | Chronos startup setTimeout untracked |

### 4.6 Settings Migration

- All interface fields have defaults in `DEFAULT_SETTINGS` (types.ts:117-131)
- **Shallow merge only:** `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` (main.ts:467)
- No nested object migration needed (current schema is flat)
- **No schema version field** — no way to detect if upgrading user needs migration
- **No migration infrastructure** — unlike Quest Board which has a v1-v5 chain

### 4.7 First-Run Experience

- **No Lines defined:** Handled in PatchInModal (shows "No lines configured" message with guidance)
- **No sessions:** Handled in StatisticsModal and DashboardView (empty state messages)
- **No settings:** Handled via `DEFAULT_SETTINGS` merge
- **Chronos not installed:** Handled gracefully (soft dependency with try-catch)

### 4.8 Timer/Interval Audit

**Active timers that need cleanup:**

| Timer | File | Created | Cleared | Cleared on Unload? |
|-------|------|---------|---------|---------------------|
| `timerInterval` (30s) | main.ts:547 | `startTimerUpdates()` | `stopTimerUpdates()` | ✅ Yes |
| `breakReminderTimer` | main.ts:572 | `startBreakReminderTimer()` | `stopBreakReminderTimer()` | ❌ **No** |
| `autoDisconnectTimer` | main.ts:704 | `scheduleAutoDisconnect()` | `cancelAutoDisconnect()` | ❌ **No** |
| `refreshInterval` (30s) | DashboardView.ts:36 | `onOpen()` | `onClose()` | ⚠️ Only if view closed |
| `scheduledCalls` map (N timers) | WireService.ts:148 | `scheduleCall()` | `stop()` | ✅ Yes |
| `snoozedCalls` map (N timers) | WireService.ts:527 | `handleCallAction()` | `stop()` | ✅ Yes |
| Chronos startup delay (2s) | main.ts:154 | `onload()` | — | ❌ **Never cleared** |

---

## 5. Build Configuration & Infrastructure Audit

### 5.1 esbuild.config.mjs

**Hardcoded Deploy Path (Line 8):**
```javascript
const deployPath = "G:/My Drive/IT/Obsidian Vault/My Notebooks/.obsidian/plugins/switchboard";
```
This absolute path only works on Brad's machine. For BRAT distribution, this is fine (users install via BRAT, not via build), but should be environment-variable-based for any CI/CD or contributor workflow.

**Build Configuration:**

| Setting | Value | Status |
|---------|-------|--------|
| Entry point | `src/main.ts` | ✅ Correct |
| External dependencies | obsidian, electron, codemirror, lezer, builtins | ✅ Complete |
| Format | CommonJS | ✅ Required by Obsidian |
| Target | ES2018 | ✅ Good |
| Sourcemap | inline (dev), none (prod) | ✅ Good |
| Tree-shaking | true | ✅ Good |

### 5.2 tsconfig.json

| Setting | Value | Issue |
|---------|-------|-------|
| `target` | ES6 | ⚠️ Mismatch with esbuild ES2018 — should align |
| `inlineSourceMap` | true | ⚠️ Redundant — esbuild handles sourcemaps |
| `inlineSources` | true | ⚠️ Increases bundle size unnecessarily |
| `allowJs` | true | ⚠️ No .js files in src/ — unnecessary |
| `noImplicitAny` | true | ✅ Good |
| `strictNullChecks` | true | ✅ Good |
| `strict` | *not set* | ❌ Missing — should enable full strict mode |
| `noImplicitReturns` | *not set* | ❌ Missing |
| `noFallthroughCasesInSwitch` | *not set* | ❌ Missing |
| `noUnusedLocals` | *not set* | ❌ Missing |

### 5.3 manifest.json

| Field | Value | Issue |
|-------|-------|-------|
| `version` | 1.5.0 | ✅ Matches package.json |
| `minAppVersion` | 1.0.0 | ⚠️ Too old — should be minimum tested version (1.5.0+) |
| `authorUrl` | "" (empty) | ❌ Missing — should point to GitHub profile or repo |
| `isDesktopOnly` | false | ⚠️ Has this been tested on mobile? AudioContext, file explorer collapse, and CSS injection may not work on mobile Obsidian |

**Missing fields for public release:**
- No `fundingUrl` (optional)
- No `versions.json` file for BRAT version tracking

### 5.4 package.json

| Issue | Severity |
|-------|----------|
| `"obsidian": "latest"` — unpinned dependency | **HIGH** — different machines get different versions, breaking type checks |
| No `repository` field | **MEDIUM** — needed for package metadata |
| No `engines` field | **LOW** — should specify Node.js version requirement |

### 5.5 CSS Audit (styles.css — 1,627 lines)

**Strengths:**
- ✅ Well-organized with clear section comments
- ✅ Uses Obsidian CSS variables (`--background-secondary`, `--text-normal`, etc.)
- ✅ Animations use GPU-accelerated properties (opacity, transform)
- ✅ Flexbox layouts are responsive

**Issues:**

| Issue | Lines | Severity |
|-------|-------|----------|
| `!important` overuse | 901-904, 1397, 1421-1426, 1430 | **Medium** — 12 instances, could cause specificity wars |
| CSS variable naming not fully namespaced | 851 (`--operator-color`) | **Low** — could conflict with Obsidian/theme variables |
| Focus outline removed without replacement | Multiple textarea/input focus rules | **Medium** — accessibility concern |
| Hover state inconsistency | Some use `brightness()`, others use `opacity`, others use `background` | **Low** — visual inconsistency |
| Grayscale filter on large vaults | Dynamic CSS from CircuitManager | **Medium** — `filter: grayscale()` + transitions on 100+ folder items could cause jank |

### 5.6 Test Infrastructure

| Metric | Value |
|--------|-------|
| Test files | 0 |
| Test framework | None configured |
| Test coverage | 0% |

**No test infrastructure exists.** No test framework, no mocks, no CI/CD pipeline. For BRAT launch (personal use with potential public release), this is a known gap documented in `Codebase Stats.md`.

---

## 6. Code Quality & Consistency Audit

### 6.1 Duplicated Code

#### formatDuration() — Duplicated 6 Times

| File | Lines | Signature |
|------|-------|-----------|
| `main.ts` | 595-602 | `formatDuration(minutes: number): string` |
| `SessionLogger.ts` | 169-176 | `formatDuration(minutes: number): string` |
| `DashboardView.ts` | 241-248 | `formatDuration(minutes: number): string` |
| `StatisticsModal.ts` | 212-217 | `formatDuration(minutes: number): string` |
| `SessionEditorModal.ts` | 218-223 | `formatDuration(minutes: number): string` |
| `CallLogModal.ts` | 124-131 | `formatDuration(minutes: number): string` |

All implementations are identical. Should be a single export from `types.ts`.

#### formatTime12h() — Duplicated 2 Times

| File | Lines |
|------|-------|
| `SwitchboardSettingTab.ts` | 517-522 |
| `LineEditorModal.ts` | 419-424 |

Identical implementations. Should be shared.

#### Color Validation Pattern — Missing Everywhere

Line colors assigned to `style.backgroundColor` in **9 files** without validation. Should have a shared `isValidHexColor()` utility.

### 6.2 File Sizes vs Guideline

CLAUDE.md guideline: "Keep files under 300 lines where possible."

| File | Lines | Over Limit | Notes |
|------|-------|------------|-------|
| `main.ts` | 724 | ⚠️ 2.4x | Orchestrator — some growth expected |
| `LineEditorModal.ts` | 565 | ⚠️ 1.9x | Complex form — could split render methods |
| `WireService.ts` | 552 | ⚠️ 1.8x | Chronos integration — complex by nature |
| `SwitchboardSettingTab.ts` | 524 | ⚠️ 1.7x | Settings UI — linear construction |
| `SessionLogger.ts` | 359 | ⚠️ 1.2x | Slightly over — acceptable |

### 6.3 Architecture Compliance

| Principle | Status | Evidence |
|-----------|--------|----------|
| **Zero service-to-service coupling** | ✅ Maintained | Services don't import each other |
| **Hub-and-spoke coordination** | ✅ Maintained | main.ts orchestrates all services |
| **Soft external coupling** | ✅ Maintained | Chronos wrapped in try-catch |
| **No business logic in main.ts** | ⚠️ Minor violations | `formatDuration()`, `showStatusBarMenu()` are borderline |
| **No business logic in modals** | ❌ Violated | `OperatorModal.executeCommand()` (lines 122-167) contains full command execution logic |
| **Modals don't do file I/O** | ✅ Maintained | All file ops go through services |

### 6.4 JSDoc Coverage

| Layer | Methods with JSDoc | Methods without | Coverage |
|-------|-------------------|-----------------|----------|
| main.ts | 17 | 3 | ~85% |
| Services | ~15 | ~10 | ~60% |
| Modals | ~5 | ~30 | ~15% |
| Settings | ~2 | ~15 | ~12% |
| Views | ~3 | ~5 | ~37% |

Modals and settings have poor JSDoc coverage. Public methods should all have JSDoc for maintainability.

### 6.5 generateId() Edge Cases (types.ts:152-157)

```typescript
export function generateId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
```

- `generateId("")` returns `""` — empty ID
- `generateId("---")` returns `""` — empty ID
- `generateId("数学 140")` returns `"140"` — non-ASCII stripped
- `generateId("Math")` and `generateId("math")` both return `"math"` — collision

No uniqueness check exists in `LineEditorModal.ts` when generating IDs for new lines.

---

## 7. Consolidated Priority Rankings

### CRITICAL — Must Fix Before Launch

| # | Issue | Location |
|---|-------|----------|
| 1 | `audioService.destroy()` not called in `onunload()` — AudioContext memory leak | `main.ts:173` |
| 2 | `breakReminderTimer` and `autoDisconnectTimer` not cleared in `onunload()` — orphaned timers | `main.ts:173` |
| 3 | `sessionLogFile` path traversal — no validation on user-provided paths | `SessionLogger.ts:186` |
| 4 | `OperatorModal.executeCommand()` — no try-catch, `as any` casts, null access risks | `OperatorModal.ts:122-167` |
| 5 | `obsidian` dependency set to `"latest"` — non-deterministic builds | `package.json:23` |
| 6 | Array index closure bug in delete buttons — wrong items deleted on rapid clicks | `LineEditorModal.ts:242, 318, 554` |

### HIGH — Should Fix Before Launch

| # | Issue | Location |
|---|-------|----------|
| 7 | Snooze/Decline race condition — snoozed call re-triggers after decline | `WireService.ts:246-266` |
| 8 | Session history unbounded growth — `data.json` grows indefinitely | `SessionLogger.ts:124-129` |
| 9 | `saveToCallWaiting()` not awaited — success Notice before file write | `WireService.ts:265` |
| 10 | `parseTaskTime()` no validation — invalid dates cause immediate setTimeout fire | `WireService.ts:404-425` |
| 11 | Daily note heading insertion null access — `nextHeadingMatch?.index` needed | `SessionLogger.ts:334` |
| 12 | `navigator.clipboard.writeText()` not awaited, no error handling | `StatisticsModal.ts:152` |
| 13 | No time/date validation on scheduled block inputs | `LineEditorModal.ts:373-405` |
| 14 | No duplicate Line ID detection on creation | `LineEditorModal.ts:61` |
| 15 | `validate()` shows no error feedback when validation fails | `LineEditorModal.ts:426-437` |
| 16 | HTMLAudioElement memory leak — new `Audio()` per play, never cleaned | `AudioService.ts:152` |
| 17 | `isDesktopOnly: false` in manifest — mobile untested | `manifest.json:9` |
| 18 | `minAppVersion: "1.0.0"` — should reflect minimum tested version | `manifest.json:5` |
| 19 | Empty `authorUrl` in manifest | `manifest.json:8` |
| 20 | Chronos startup `setTimeout(2000)` untracked — fires on dead plugin instance | `main.ts:154` |

### MEDIUM — Should Address

| # | Issue | Location |
|---|-------|----------|
| 21 | `formatDuration()` duplicated in 6 files | Multiple files |
| 22 | `formatTime12h()` duplicated in 2 files | `SwitchboardSettingTab.ts`, `LineEditorModal.ts` |
| 23 | No color validation utility — 9 files assign unvalidated hex to CSS | Multiple files |
| 24 | Heading detection uses `indexOf()` — substring not line-aware | `SessionLogger.ts:82-101` |
| 25 | Concurrent session logging race condition (read-modify-write) | `SessionLogger.ts:79-103` |
| 26 | Timezone inconsistency — UTC in history, local in daily notes | `SessionLogger.ts:114, 277-282` |
| 27 | IncomingCallModal double-click race on action buttons | `IncomingCallModal.ts:84-126` |
| 28 | PathSuggest full vault scan per keystroke — no debounce | `PathSuggest.ts:23, 89` |
| 29 | tsconfig target ES6 mismatches esbuild target ES2018 | `tsconfig.json:7` |
| 30 | `!important` overuse in CSS (12 instances) | `styles.css` |
| 31 | SwitchboardSettingTab event listener leak on re-render | `SwitchboardSettingTab.ts:174-216` |
| 32 | `QuickSwitchModal.lineElements` not cleared in `onClose()` | `QuickSwitchModal.ts:181` |
| 33 | Dashboard `containerEl.children[1]` hard-indexed — fragile | `DashboardView.ts:56` |
| 34 | File path splitting assumes Unix separator `/` | `IncomingCallModal.ts:70` |
| 35 | Services initialized before settings loaded | `main.ts:40-51` |
| 36 | No schema version in settings — no migration path for future changes | `types.ts` |
| 37 | Business logic in `OperatorModal.executeCommand()` | `OperatorModal.ts:122-167` |
| 38 | `generateId()` returns empty string for empty/special-char-only names | `types.ts:152` |
| 39 | `recalculateDuration()` doesn't handle midnight-crossing sessions | `SessionEditorModal.ts:200-206` |
| 40 | DashboardView refresh interval not cleared on plugin unload | `DashboardView.ts:36` |

### LOW — Nice to Have

| # | Issue | Location |
|---|-------|----------|
| 41 | Missing JSDoc on modal and settings methods (~75% uncovered) | Multiple files |
| 42 | Hardcoded "Call Waiting.md" path — not configurable | `WireService.ts:337`, `main.ts:244` |
| 43 | Hardcoded snooze options (5/10/15/30 min) — no custom input | `IncomingCallModal.ts:104-107` |
| 44 | Hardcoded extend options (15/30/60 min) — no custom input | `TimeUpModal.ts:46-68` |
| 45 | CSS focus outline removed without accessible replacement | `styles.css` |
| 46 | `CallLogModal` Ctrl+Enter doesn't check `metaKey` for Mac | `CallLogModal.ts:107` |
| 47 | No max length on goal input or call log textarea | `GoalPromptModal.ts`, `CallLogModal.ts` |
| 48 | Default operator commands reference plugins that may not exist | `OperatorModal.ts:8-38` |
| 49 | `strict: true` not set in tsconfig (only individual checks) | `tsconfig.json` |
| 50 | `tsconfig` has `inlineSourceMap`/`inlineSources` redundant with esbuild | `tsconfig.json:4-5` |
| 51 | `allowJs: true` with no .js files in src/ | `tsconfig.json:8` |
| 52 | 16 `as any` casts across 7 files | Various (see Section 4.3) |
| 53 | 5 files exceed 300-line guideline | `main.ts`, `LineEditorModal.ts`, `WireService.ts`, `SwitchboardSettingTab.ts`, `SessionLogger.ts` |
| 54 | Hover state inconsistency in CSS (brightness vs opacity vs background) | `styles.css` |
| 55 | Empty input in PathSuggest returns all folders as suggestions | `PathSuggest.ts:31` |
| 56 | Hardcoded esbuild deploy path (personal machine only) | `esbuild.config.mjs:8` |
