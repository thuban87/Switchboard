# Gemini Review Part 1
*Date: January 18, 2026*

This document outlines security and performance observations made during an initial review of the Switchboard plugin codebase, along with recommended fixes.

## 1. Security: CSS Injection Vulnerability
**Severity:** Medium
**Location:** `src/services/CircuitManager.ts`

### Issue
When generating CSS for "safe paths," the code directly injects the folder path string into a CSS attribute selector:
```typescript
selectors.push(`
/* Safe path: ${path} */
body.switchboard-active .nav-folder-title[data-path="${path}"],
...
`);
```
If a user configures a path that contains quotes (e.g., a folder named `My "Special" Folder`), it could break out of the attribute selector string. While the risk is primarily local (requires user config modification), it is bad practice and could potentially be exploited if config is shared or generated dynamically.

### Proposed Fix
Escape the path using the standard `CSS.escape()` method before injecting it into the template string.

```typescript
// Proposed change in CircuitManager.ts
const escapedPath = CSS.escape(path);
selectors.push(`
/* Safe path: ${path} */
body.switchboard-active .nav-folder-title[data-path="${escapedPath}"],
...
`);
```

## 2. Performance: File Explorer DOM Manipulation
**Severity:** Medium
**Location:** `src/services/CircuitManager.ts` -> `focusFolders`

### Issue
The `focusFolders` method iterates over `Object.entries(explorerView.fileItems)` to collapse folders.
```typescript
for (const [path, item] of Object.entries(explorerView.fileItems)) {
    if (item && (item as any).collapsed === false) {
        (item as any).setCollapsed?.(true);
    }
}
```
In vaults with thousands of files, `fileItems` becomes very large. Iterating over every single item synchronously on the main thread will cause a noticeable UI freeze ("jank") when switching contexts.

### Proposed Fix
Utilize Obsidian's internal command to collapse all folders, which is likely more optimized, or at the very least reduces the complexity of our own loop.

```typescript
// Proposed change
private focusFolders(safePaths: string[]): void {
    // 1. Collapse all using native command
    this.app.commands.executeCommandById("file-explorer:collapse-all");

    // 2. Expand only the specific safe paths
    // ... existing expansion logic ...
}
```

## 3. Robustness: Fragile Plugin Integration
**Severity:** Low
**Location:** `src/services/WireService.ts`

### Issue
The code accesses the "Chronos" plugin directly via the `app.plugins` property (which is internal API) without robust error handling.
```typescript
return (this.app as any).plugins?.plugins?.["chronos-google-calendar-sync"];
```
If the Chronos plugin changes its internal API structure or if the property access fails unexpectedly, it could cause the Switchboard plugin to throw errors.

### Proposed Fix
Wrap the integration logic in `try-catch` blocks and add strict null checks to ensure the plugin fails gracefully if the integration target is unavailable.

## 4. Performance: Large Log Files
**Severity:** Low
**Location:** `src/services/SessionLogger.ts`

### Issue
The logger reads the entire content of a log file into memory to append a session summary.
```typescript
let content = await this.app.vault.read(logFile);
// ... append ...
await this.app.vault.modify(logFile, content);
```
As the log file grows (e.g., over a year of usage), this operation becomes slower and consumes more memory.

### Proposed Fix
*Immediate:* Acceptable for typical text file sizes (<1MB).
*Long-term:* Consider implementing log rotation (e.g., `Session Log - 2026.md`) or checking file size before appending. Obsidian's API currently requires a read-write cycle for file modification, so architectural changes (like daily notes logging) would be the primary solution if this becomes a bottleneck.
