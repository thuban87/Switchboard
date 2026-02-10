/**
 * Logger - Centralized debug logging for Switchboard
 *
 * Gates `debug()` output behind a `debugMode` setting toggle.
 * `warn()`, `error()`, and `info()` always output regardless of mode.
 * All messages use a consistent `[Switchboard:Prefix]` format.
 */
export class Logger {
    private static debugEnabled = false;

    /**
     * Set whether debug-level messages are visible in the console.
     * Called once during plugin initialization and when the setting changes.
     */
    static setDebugMode(enabled: boolean): void {
        Logger.debugEnabled = enabled;
    }

    /**
     * Debug-level log — only outputs when debugMode is on.
     * Use for routine lifecycle events, state dumps, etc.
     */
    static debug(prefix: string, ...args: unknown[]): void {
        if (!Logger.debugEnabled) return;
        console.log(`[Switchboard:${prefix}]`, ...args);
    }

    /**
     * Info-level log — always visible.
     * Use for significant lifecycle events (load, unload).
     */
    static info(prefix: string, ...args: unknown[]): void {
        console.log(`[Switchboard:${prefix}]`, ...args);
    }

    /**
     * Warning-level log — always visible.
     * Use for recoverable issues (missing optional resources, fallbacks).
     */
    static warn(prefix: string, ...args: unknown[]): void {
        console.warn(`[Switchboard:${prefix}]`, ...args);
    }

    /**
     * Error-level log — always visible.
     * Use for failures that affect functionality.
     */
    static error(prefix: string, ...args: unknown[]): void {
        console.error(`[Switchboard:${prefix}]`, ...args);
    }
}
