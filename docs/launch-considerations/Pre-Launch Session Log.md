# Pre-Launch Implementation Session Log

**Purpose:** Track progress through the 13-session Master Pre-Launch Plan.
**Reference:** [[Master Pre-Launch Plan]]

---

## Session 1: Debug Logger System ✅

**Date:** February 9, 2026
**Effort:** ~30 min | **Planned:** ~45 min
**Audit Items:** Partial #41

### What Was Done

1. **Created `src/services/Logger.ts`** — Static logger class with 4 methods:
   - `debug(prefix, ...args)` — Gated by `debugMode` setting
   - `info(prefix, ...args)` — Always visible
   - `warn(prefix, ...args)` — Always visible
   - `error(prefix, ...args)` — Always visible
   - All output formatted as `[Switchboard:Prefix] message`

2. **Added `debugMode` to settings** — New `debugMode: boolean` field in `SwitchboardSettings` interface and `DEFAULT_SETTINGS` (defaults to `false`).

3. **Replaced 49 console calls across 6 files:**

   | File | Calls Replaced | Logger Prefix |
   |------|---------------|---------------|
   | `SessionLogger.ts` | 17 | `"Session"` |
   | `main.ts` | 9 | `"Plugin"` |
   | `AudioService.ts` | 8 | `"Audio"` |
   | `WireService.ts` | 6 | `"Wire"` |
   | `CircuitManager.ts` | 5 | `"Circuit"` |
   | `SwitchboardSettingTab.ts` | 4 | `"Settings"` |

4. **Added debug toggle UI** — New "Advanced" section in Settings with a debug mode toggle that calls `Logger.setDebugMode()` on change.

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npm run deploy:test` — deployed
- ✅ Manual: Debug toggle exists in Settings → Advanced
- ✅ Manual: Patch in with debug off → no console output
- ✅ Manual: Debug on → `[Switchboard:*]` messages appear

### Notes
- Master Pre-Launch Plan estimated 18 calls in SessionLogger.ts — actual count was 17 (off by 1)
- Master Pre-Launch Plan estimated 3 calls in SwitchboardSettingTab.ts — actual count was 4 (off by 1)
- Net total still 49 — the errors cancelled out

---

## Session 2: Error Handling Hardening ✅

**Date:** February 9, 2026
**Effort:** ~30 min | **Planned:** ~1 hour
**Audit Items:** #4, #9, #11, #12

### What Was Done

1. **`main.ts` — 3 functions wrapped:**
   - `patchIn()` → try-catch with `Logger.error("Plugin", ...)` + Notice
   - `disconnect()` → try-catch with `Logger.error("Plugin", ...)` + Notice
   - `openCallWaiting()` → try-catch with `Logger.error("Plugin", ...)` + Notice

2. **`CircuitManager.ts` — 2 functions wrapped:**
   - `activate()` → try-catch with `Logger.error("Circuit", ...)`
   - `focusFolders()` → try-catch with `Logger.warn("Circuit", ...)` (uses undocumented internals — fails silently)

3. **`AudioService.ts` — 2 functions wrapped:**
   - `playPatchIn()` → try-catch with `Logger.warn("Audio", ...)`
   - `playDisconnect()` → try-catch with `Logger.warn("Audio", ...)` (audio should never surface errors)

4. **`WireService.ts` — 2 changes:**
   - Per-task try-catch in `refreshTimers()` loop — one bad task won't kill the entire wire
   - **Fix #9:** Changed `this.saveToCallWaiting(task, line)` to `await this.saveToCallWaiting(task, line)` and made `handleCallAction()` async

5. **`OperatorModal.ts` — Fix #4:**
   - Wrapped each case in `executeCommand()` switch (`"command"`, `"insert"`, `"open"`) with individual try-catch blocks
   - Each shows `⚠️ Error` Notice + `Logger.error("Operator", ...)`

6. **`StatisticsModal.ts` — Fix #12:**
   - Wrapped `navigator.clipboard.writeText(markdown)` with `await` in async handler
   - try-catch with fallback `⚠️ Failed to copy` Notice

7. **Fix #11 — Already resolved:**
   - `SessionLogger.ts` line 335 already had `nextHeadingMatch.index ?? restContent.length` — no change needed

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npm run deploy:test` — deployed
- ⚠️ Non-existent landing page — no crash, but Notice didn't appear (likely empty landing page field vs. bad path)
- ✅ Operator Menu with missing plugin command — ⚠️ Notice shown, no crash
- ✅ Statistics export — clipboard copy works with ✅ Notice
- ✅ General patch-in/disconnect flow — normal operation confirmed

### Bug Found
- **Landing page Notice:** When landing page field is empty, the branch is skipped entirely (expected). Notice only fires when the field has a value pointing to a non-existent file. This is pre-existing behavior, not a regression.

---

## Session 3: main.ts Decomposition + Cleanup ✅

**Date:** February 9, 2026
**Effort:** ~30 min | **Planned:** ~1 hour
**Audit Items:** #1, #2, #35, #53, A3 (partial #20)

### What Was Done

1. **Created `src/services/StatusBarManager.ts` (178 lines):**
   - `update()` — Renders status bar with color dot, line name, timer, goal abbreviation, missed calls blink
   - `startTimerUpdates()` / `stopTimerUpdates()` — 30-second interval for timer display
   - `showMenu(event)` — Full context menu (Disconnect, Operator, Stats, Edit Sessions, Missed Calls)
   - `formatDuration(minutes)` — Public utility for `"Xh Ym"` / `"Xm"` formatting
   - `init()` — Creates status bar element and binds click handler
   - `destroy()` — Clears interval, nulls references

2. **Created `src/services/TimerManager.ts` (82 lines):**
   - `scheduleAutoDisconnect(endTime)` — Opens `TimeUpModal` at scheduled block end
   - `cancelAutoDisconnect()` — Cancels pending auto-disconnect
   - `startBreakReminder()` / `stopBreakReminder()` — Recurring break notifications
   - `destroy()` — **Fixes #1 + #2:** Cancels both timers on plugin unload

3. **Rewrote `src/main.ts` (743 → 457 lines, -286 lines):**
   - Removed all extracted methods and fields
   - Replaced internal calls with delegation to new services
   - Thin public wrapper methods (`scheduleAutoDisconnect`, `cancelAutoDisconnect`) preserved for external callers (`WireService`, `TimeUpModal`)
   - **Fix #35 / A3:** `loadSettings()` now runs BEFORE service construction, so `AudioService.loadAudioFile()` has settings available
   - **Fix #1, #2:** `onunload()` expanded to call `audioService.destroy()`, `timerManager.destroy()`, `statusBarManager.destroy()`
   - **Partial #20:** Chronos startup `setTimeout` handle stored in `chronosStartupTimer` field and cleared in `onunload()`

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npm run deploy:test` — deployed
- ✅ Full patch-in/disconnect cycle — CSS, landing page, status bar, call log all work
- ✅ Status bar context menu — all menu items functional
- ✅ Plugin disable/re-enable — no console errors (onunload cleanup confirmed)

### Notes
- Plan estimated reduction to ~500 lines — actual result was 457 lines (even better)
- No changes needed to `WireService.ts` or `TimeUpModal.ts` — thin wrappers on plugin class preserve the external API

## Session 4: Targeted Unit Tests ✅

**Date:** February 9, 2026
**Effort:** ~45 min | **Planned:** ~1.5 hours
**Audit Items:** (Infrastructure — no direct audit fixes; tests scaffold for S6, S8)

### What Was Done

1. **Installed Vitest** — `npm install -D vitest` (40 packages added)

2. **Created `vitest.config.ts`:**
   - Globals enabled (no imports needed for `describe`/`it`/`expect`)
   - `resolve.alias` maps `obsidian` → `test/__mocks__/obsidian.ts` (real package has no Node entry point)

3. **Added npm scripts:**
   - `"test": "vitest run"` — single pass
   - `"test:watch": "vitest"` — watch mode

4. **Created `test/__mocks__/obsidian.ts`:**
   - Minimal stubs: `Notice`, `App`, `TFile`, `TFolder`, `Modal`, `Menu`
   - S13 will expand into full mock with Vault, Workspace, etc.

5. **Created 7 test files (40 tests total, 34 active + 6 skipped):**

   | File | Tests | Skip | What's Tested |
   |------|------:|-----:|---------------|
   | `types.test.ts` | 8 | 0 | `generateId()` slug generation, edge cases |
   | `logger.test.ts` | 6 | 0 | Logger gating, output format, always-on methods |
   | `timer-manager.test.ts` | 6 | 0 | Auto-disconnect, break reminder, `destroy()` |
   | `status-bar-manager.test.ts` | 4 | 0 | `formatDuration()` pure function |
   | `wire-utils.test.ts` | 5 | 1 | `parseTaskTime()` various formats |
   | `heading-detection.test.ts` | 6 | 3 | `indexOf` heading detection + S8 regex prep |
   | `snooze-state.test.ts` | 5 | 2 | Decline/snooze state transitions |

6. **Updated `.gitignore`** — Added `.vitest/` cache directory

### Skipped Tests (by design — awaiting S6/S8 code fixes)

| Test | Depends On | Reason |
|------|-----------|--------|
| `wire-utils: invalid date → null` | S6 #10/A4 | `parseTaskTime` has no `isNaN` guard yet |
| `heading: substring non-match` | S8 #24 | Still uses `indexOf`, not regex |
| `heading: trailing whitespace match` | S8 #24 | Same |
| `heading: multiple similar headings` | S8 #24 | Same |
| `snooze: decline clears snoozed` | S6 #7 | `snoozedCalls.delete` not in decline handler yet |
| `snooze: stop() clears all state` | S6 A1 | `stop()` doesn't clear snoozed/declined yet |

### Testing Results
- ✅ `npx vitest run` — 34 pass, 6 skipped, 0 fail
- ✅ `npm run build` — clean (vitest is devDependency only)

### Notes
- Master Pre-Launch Plan listed S4 dependencies as S3+S6+S8. Proceeded with Option 1: write all tests now, `test.skip()` the 6 that need S6/S8, un-skip when those sessions are done.
- The `obsidian` module alias in vitest config was the key insight — the `obsidian` npm package has no Node-compatible entry point, so tests can't resolve it without aliasing.

---

## Session 5: Input Validation & Path Safety ✅

**Date:** February 9, 2026
**Effort:** ~1.5 hours | **Planned:** ~1.5 hours
**Audit Items:** #3, #6, #13, #14, #15, #23, #38

### What Was Done

1. **`src/types.ts` — 4 new validation utilities + 1 fix:**
   - `validatePath(path)` — Rejects `..` traversal, absolute paths, dot-prefix (#3 support)
   - `isValidHexColor(color)` — Validates `#RRGGBB` format (#23)
   - `isValidTime(time)` — Validates `HH:MM` 24h format (#13)
   - `isValidDate(date)` — Validates `YYYY-MM-DD` format (#13)
   - **Fix #38:** `generateId()` now returns `""` for empty/whitespace-only/special-char-only input

2. **`src/services/SessionLogger.ts` — Fix #3 (CRITICAL):**
   - `getOrCreateLogFile()` validates `sessionLogFile` with `validatePath()` before use
   - Rejected paths fall through to default path with a `Logger.warn` message

3. **`src/settings/LineEditorModal.ts` — 5 fixes + 1 bonus bug:**
   - **Fix #6:** Replaced loop-index closures with value-captured closures in 3 delete handlers (safe paths, schedule blocks, custom commands)
   - **Fix #13:** Added `isValidTime()`/`isValidDate()` validation on schedule block inputs with red border visual feedback
   - **Fix #14:** Duplicate Line ID detection on creation — generates ID from name and checks against existing lines
   - **Fix #15:** `validate()` now shows `Notice` for each failure case (empty name, duplicate ID, invalid color, invalid time/date)
   - **Fix #23:** Hex color validation with `isValidHexColor()` before save
   - **Constructor deep copy:** Fixed shallow copy bug where modal edits leaked into original settings data through shared array references (`scheduledBlocks`, `safePaths`, `customCommands`)
   - **DOM sync in validate():** Reads schedule block text input values directly from DOM before validating, preventing race condition with `onChange` timing

4. **`src/settings/SwitchboardSettingTab.ts`:**
   - Updated both `LineEditorModal` constructor calls to pass `this.plugin.settings.lines` for duplicate ID detection

5. **`test/validation.test.ts` — 18 new tests:**

   | Suite | Tests | What's Tested |
   |-------|------:|---------------|
   | `validatePath` | 7 | Normal paths, backslash normalization, traversal, absolute, dot-prefix, empty |
   | `isValidHexColor` | 4 | Valid hex, missing #, invalid chars, shorthand |
   | `isValidTime` | 6 | Valid, midnight, 23:59, invalid hour/minute, single-digit |
   | `isValidDate` | 3 | Valid, non-date string, empty |
   | `generateId (S5)` | 4 | Empty, whitespace, special-char-only, valid name |

### Bug Found During Testing
- **Shallow copy mutation:** When editing existing Lines, the modal received `{ ...line }` (shallow copy) but arrays like `scheduledBlocks` were shared references. Adding a schedule block in the modal mutated the original settings immediately, bypassing `validate()` and `onSave()`. Fixed by deep-copying all arrays in the constructor.

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npx vitest run` — 58 pass, 6 skipped, 0 fail (18 new validation tests)
- ✅ Manual: Empty name → "Line name cannot be empty" Notice
- ✅ Manual: Duplicate ID → collision Notice
- ✅ Manual: Invalid time "99:99" → red border + Notice, save blocked
- ✅ Manual: Invalid color → "Invalid color format" Notice
- ✅ Manual: Path traversal (debug mode) → warning in console, default path used

---

## Session 6: Timer & Race Condition Fixes ✅

**Date:** February 9, 2026
**Effort:** ~20 min | **Planned:** ~45 min
**Audit Items:** #7, #10, #20, #27, #34, A1, A4

### What Was Done

1. **`src/services/WireService.ts` — 3 fixes:**
   - **Fix A1:** `stop()` now clears `snoozedCalls` and `declinedCalls` maps in addition to `scheduledCalls`
   - **Fix #7:** Decline handler removes taskId from `snoozedCalls`, cancels any pending `scheduledCalls` timer, then marks as declined
   - **Fix #10 / A4:** `parseTaskTime()` validates all 3 return sites with `isNaN(d.getTime())` — invalid dates now return `null` instead of invalid `Date` objects

2. **`src/modals/IncomingCallModal.ts` — 2 fixes:**
   - **Fix #27:** Added `actionTaken` boolean guard on all 6 action button click handlers (Connect, Hold, Decline/Just Dismiss, Call back 30m, Call back 1h, Call back tomorrow) — prevents double-click race
   - **Fix #34:** File path split changed from `.split("/")` to `.split(/[\\/]/)` for Windows compatibility

3. **Fix #20 — No changes needed:** Already addressed in S3 (Chronos startup `setTimeout` stored and cleared in `onunload`)

4. **Un-skipped 3 tests from S4:**
   - `wire-utils.test.ts`: "returns null for invalid date strings" (was awaiting #10/A4)
   - `snooze-state.test.ts`: "decline after snooze removes from snoozedCalls" (was awaiting #7)
   - `snooze-state.test.ts`: "stop() clears all state including snoozed and declined" (was awaiting A1)
   - Fixed stop() test to set `isRunning = true` before calling `stop()` (early-return guard)

### Testing Results
- ✅ `npx vitest run` — 61 pass, 3 skipped (S8 heading tests only)
- ✅ `npm run build` — clean
- ✅ `npm run deploy:test` — deployed

### Notes
- Session came in well under the 45min estimate — all changes were surgical and well-specified in the Master Pre-Launch Plan
- S6 un-skipped the last 3 S6-dependent tests. Only 3 S8-dependent heading detection tests remain skipped.

---

## Session 7: Memory Leak Fixes ✅

**Date:** February 9, 2026
**Effort:** ~20 min | **Planned:** ~30 min
**Audit Items:** #16, #31, #32, #40

### What Was Done

1. **`src/services/AudioService.ts` — Fix #16 + base64 embedding:**
   - Replaced `playRealisticClick()` to reuse a single `HTMLAudioElement` instead of creating new ones per click
   - Embedded `click.mp3` as base64 data URI in new `src/services/audio-data.ts` (~21KB)
   - Removed `loadAudioFile()` method, vault adapter dependency, and blob URL creation entirely
   - Cleaned up `destroy()` to nullify audio element reference

2. **`src/settings/SwitchboardSettingTab.ts` — Fix #31 + positioning fix:**
   - Added `isConnected` guard on the `setTimeout` callback in blur handler — prevents operations on detached DOM after tab close
   - Fixed autocomplete popover positioning: switched from `position: absolute` with `offsetTop`/`offsetLeft` to `position: fixed` with `getBoundingClientRect()` viewport coordinates

3. **`src/modals/QuickSwitchModal.ts` — Fix #32:**
   - Added `this.lineElements = []` in `onClose()` to release references to detached DOM nodes

4. **`src/views/DashboardView.ts` — Fix #40:**
   - Replaced raw `setInterval()` with Obsidian's `registerInterval(window.setInterval(...))` for automatic cleanup on view close AND plugin unload
   - Removed manual `clearInterval` in `onClose()` and the `refreshInterval` field

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npx vitest run` — 61 pass, 3 skipped (S8 heading tests only)
- ✅ `npm run deploy:test` — deployed
- ✅ Manual: Quick Switch modal open/close — no issues
- ✅ Manual: Realistic sound plays correctly via embedded base64
- ✅ Manual: Settings autocomplete popover positions correctly below input
- ✅ Manual: Dashboard + plugin disable/re-enable — no console errors

### Bonus Changes (discovered during testing)
- **Audio architecture overhaul:** Scrapped file-based audio loading entirely. Obsidian doesn't sync `.mp3` files in the plugin folder, making the original approach non-portable. Base64 embedding eliminates this limitation — the sound travels with the code.
- **Autocomplete positioning bug:** Pre-existing issue where the daily notes folder autocomplete appeared in the wrong location. Fixed with viewport-relative positioning.

---

## Session 8: Data Integrity & Session History ✅

**Date:** February 9, 2026
**Effort:** ~45 min | **Planned:** ~1 hour
**Audit Items:** #8, #24, #25, #26, #36, #39, A6, A8

### What Was Done

1. **`src/types.ts` — Fix #36:**
   - Added `schemaVersion: number` to `SwitchboardSettings` interface and `DEFAULT_SETTINGS` (value: `1`)

2. **`src/main.ts` — Fix A8:**
   - Wrapped `loadSettings()` in try-catch: corrupted `data.json` falls back to `DEFAULT_SETTINGS` with a Notice
   - Added migration stub comment for future schema versioning

3. **`src/services/SessionLogger.ts` — 4 fixes:**
   - **Fix #25:** Implemented promise-based write queue (`writeQueue`) to serialize concurrent session logging
   - **Fix #24:** Replaced `indexOf` with line-aware regex for heading detection in both `logSession()` and `logToDailyNote()` — prevents substring matches
   - **Fix #8:** Added pruning to `saveToHistory()` — caps session history at 1,000 entries
   - **Fix #26:** Changed `toISOString()` to local date (`getFullYear`/`getMonth`/`getDate`) in `saveToHistory()`

4. **`src/views/DashboardView.ts` — Fix A6:**
   - Changed `renderSchedule()` date calculation from UTC (`toISOString`) to local time

5. **`src/modals/SessionEditorModal.ts` — Fix #39:**
   - `recalculateDuration()` now adds 24 hours when duration is negative (midnight crossing)

6. **Un-skipped 3 tests from S4:**
   - `heading-detection.test.ts`: substring non-match, trailing whitespace match, multiple similar headings
   - All 3 now pass with the new regex-based heading detection

7. **Bonus: Comprehensive UTC→Local Date Cleanup:**
   - Fixed 6 additional `toISOString().split("T")[0]` sites across 3 files:
     - `StatisticsModal.ts` — "This Week" filter (2 sites), "Today"/"Yesterday" labels
     - `SwitchboardSettingTab.ts` — Chronos task date filtering
     - `LineEditorModal.ts` — Default date for new one-time schedule blocks

### Testing Results
- ✅ `npm run build` — clean
- ✅ `npx vitest run` — 64 pass, 0 skipped, 0 fail (all S8 heading tests un-skipped)
- ✅ `npm run deploy:test` — deployed
- ✅ Manual: Dashboard headings visually larger (CSS 0.8rem → 1.1rem)
- ✅ Manual: Session date displays correctly in local time
- ✅ Manual: Heading detection works correctly with regex

### Dashboard Heading CSS
- Increased `.dashboard-section-title` font-size from `0.8rem` to `1.1rem` and added `margin-bottom: 4px` — requested by Brad during testing

### Notes
- The UTC date bug Brad initially observed was caused by stale code in Obsidian's memory — plugin reload was required after deploy
- All `toISOString().split("T")[0]` date sites in `src/` are now eliminated except 2 internal-only uses in `WireService.ts` (cache key + fake task object, not user-facing)
- The `tslib` lint errors are pre-existing IDE spurious errors — they don't affect build

---

## Session 9: Build & Manifest Hardening ✅

**Date:** February 9, 2026
**Effort:** ~15 min | **Planned:** ~45 min
**Audit Items:** #5, #17, #18, #19, #29, #49, #50, #51, #56, A5

### What Was Done

1. **`package.json` — Fix #5 + extras:**
   - Pinned `obsidian` dependency from `"latest"` to `"^1.7.2"` (installed version is `1.11.4`)
   - Added `"repository"` field pointing to GitHub repo
   - Added `"engines": { "node": ">=18" }`

2. **`manifest.json` — 3 fixes:**
   - **Fix #17:** Set `"isDesktopOnly": true` (mobile untested)
   - **Fix #18:** Updated `"minAppVersion"` from `"1.0.0"` to `"1.10.0"` (Brad's choice — reasonable minimum from ~1 year ago)
   - **Fix #19:** Filled in `"authorUrl"` with GitHub repo URL

3. **`versions.json` — Fix A5:**
   - Created BRAT-required version tracking file: `{ "1.5.0": "1.10.0" }`

4. **`tsconfig.json` — 4 fixes:**
   - **Fix #29:** Aligned target `"ES6"` → `"ES2018"` (matches esbuild's `es2018`)
   - **Fix #49:** Enabled `"strict": true`, removed individual `"noImplicitAny"` and `"strictNullChecks"` flags (strict includes both + more)
   - **Fix #50:** Removed redundant `"inlineSourceMap"` and `"inlineSources"` (esbuild handles sourcemaps)
   - **Fix #51:** Removed `"allowJs": true` (no `.js` source files in project)

5. **Strict mode type error fixes (9 total):**
   - `src/main.ts` — 7 `!` definite assignment assertions on lifecycle fields (standard Obsidian plugin pattern)
   - `src/modals/CallLogModal.ts` — 1 `!` assertion on `textArea` (initialized in `onOpen()`)
   - `src/settings/SwitchboardSettingTab.ts` — 1 `as` cast for dropdown `onChange` value (Obsidian API types it as `string`, we narrow to union)

6. **Fix #56 — Already done:** Deploy path was moved to `scripts/deploy.mjs` in a prior session

### Testing Results
- ✅ `npx tsc --noEmit` — 0 errors (strict mode clean)
- ✅ `npm run build` — clean
- ✅ `npx vitest run` — 64 pass, 0 skipped, 0 fail
- ✅ `npm ls obsidian` — confirms `^1.7.2` pin
- ✅ `versions.json` — valid JSON
- ✅ `npm run deploy:test` — deployed
- ✅ Manual: Plugin loads correctly after reload in test vault

### Notes
- Strict mode only produced 9 errors vs the Master Plan's estimate of 15–30 — all were the expected `strictPropertyInitialization` pattern plus one `strictFunctionTypes` cast
- `minAppVersion` changed from plan's suggested `1.5.0` to `1.10.0` per Brad's preference

---

## Session 10–13

**Status:** Not started — see [[Master Pre-Launch Plan]] for full specs


