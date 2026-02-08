# 📞 Switchboard — Codebase Stats

**Generated:** 2026-02-08 | **Version:** Pre-BRAT Launch

---

## Overall Size

| Metric | Value |
|--------|-------|
| **Total Source Files** | **19** (.ts) |
| **Total Lines of Code** | **4,549** |
| **Total Characters** | **~161K** |
| **Total File Size** | **~161 KB** of TypeScript |
| **CSS** | **1 file**, **1,627 lines**, ~35K characters |
| **Grand Total (code + CSS)** | **~6,176 lines** |

---

## Breakdown by Layer

| Layer | Files | Lines | % of Code |
|-------|------:|------:|----------:|
| **Plugin Core** (`main.ts`) | 1 | 724 | 15.9% |
| **Services** | 4 | 1,317 | 29.0% |
| **Modals** | 9 | 1,426 | 31.3% |
| **Settings** | 3 | 1,227 | 27.0% |% intentionally adds up to ~103% due to rounding
| **Views** | 1 | 250 | 5.5% |
| **Types / Data** | 1 | 158 | 3.5% |

> **Note:** Percentages exceed 100% due to rounding of individual layer values against the smaller total. The code-only total (excluding CSS) is 4,549 lines.

---

## File Size Distribution

| Metric | Value |
|--------|-------|
| **Average file** | 239 lines |
| **Median file** | 197 lines |
| **Smallest file** | 85 lines (`GoalPromptModal.ts`) |
| **Largest file** | 724 lines (`main.ts`) |
| **Files over 300 lines** | 5 (26% of codebase) |
| **Files over 500 lines** | 3 (16% of codebase) |

---

## 📊 Top 10 Largest Files

| # | File | Lines |
|---|------|------:|
| 1 | `main.ts` | 724 |
| 2 | `LineEditorModal.ts` | 565 |
| 3 | `WireService.ts` | 552 |
| 4 | `SwitchboardSettingTab.ts` | 524 |
| 5 | `SessionLogger.ts` | 359 |
| 6 | `DashboardView.ts` | 250 |
| 7 | `StatisticsModal.ts` | 235 |
| 8 | `SessionEditorModal.ts` | 230 |
| 9 | `CircuitManager.ts` | 213 |
| 10 | `IncomingCallModal.ts` | 197 |

---

## Testing

| Metric | Value |
|--------|-------|
| **Test files** | **0** |
| **Test lines** | **0** |
| **Test-to-source ratio** | **0%** — no automated tests exist |

---

## Exported Symbols

| Metric | Value |
|--------|-------|
| **Total exports** (classes, interfaces, types, consts, functions) | **31** |

### Export Breakdown

| Kind | Count | Examples |
|------|------:|---------|
| Classes | 16 | `SwitchboardPlugin`, `CircuitManager`, `WireService`, `SessionLogger`, `AudioService`, 9 modals, `FolderSuggest`, `FileSuggest` |
| Interfaces | 7 | `SwitchboardLine`, `SwitchboardSettings`, `ScheduledBlock`, `OperatorCommand`, `SessionRecord`, `SessionInfo`, `IncomingCallData` |
| Constants | 4 | `DEFAULT_SETTINGS`, `PRESET_COLORS`, `DASHBOARD_VIEW_TYPE`, ScheduledCall & SnoozedCall interfaces |
| Functions | 1 | `generateId` |
| Types | 1 | `IncomingCallAction` |

---

## Feature Count (by architectural components)

| Feature Area | Count |
|-------------|------:|
| Services | 4 |
| Modals / UI Dialogs | 9 |
| Views | 1 |
| Settings Screens | 3 (tab + line editor + path suggest) |
| Data Models / Types | 7 interfaces |
| Commands Registered | 8 (+ N per-Line "Speed Dial" commands) |

---

## Summary

~4,500 lines of TypeScript + ~1,600 lines of CSS = **~6,200 total lines** across **19 source files** and **1 stylesheet**. The heaviest areas are **modals** (31% of code) and **services** (29%). Three files exceed 500 lines — `main.ts`, `LineEditorModal.ts`, and `WireService.ts`. The codebase is compact and focused, typical of a well-scoped Obsidian plugin. There are currently **zero automated tests**.
