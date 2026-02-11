import { App, TFile, TFolder, normalizePath } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine, sanitizePath, sanitizeFileName, formatDuration } from "../types";
import { Logger } from "./Logger";

/**
 * Session information for logging
 */
export interface SessionInfo {
    line: SwitchboardLine;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
}

/**
 * SessionLogger - Tracks session duration and writes logs
 */
export class SessionLogger {
    private app: App;
    private plugin: SwitchboardPlugin;
    private currentSession: { line: SwitchboardLine; startTime: Date } | null = null;
    /** Fix #25: Promise queue to prevent concurrent write interleaving */
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(app: App, plugin: SwitchboardPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Start tracking a new session
     */
    startSession(line: SwitchboardLine): void {
        this.currentSession = {
            line,
            startTime: new Date(),
        };
    }

    /**
     * End the current session and return session info
     * Returns null if no session was active or duration < 5 minutes
     */
    endSession(): SessionInfo | null {
        if (!this.currentSession) return null;

        const endTime = new Date();
        const durationMs = endTime.getTime() - this.currentSession.startTime.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);

        const sessionInfo: SessionInfo = {
            line: this.currentSession.line,
            startTime: this.currentSession.startTime,
            endTime,
            durationMinutes,
        };

        this.currentSession = null;

        // Only return if session was 1+ minutes (lowered from 5 for testing)
        if (durationMinutes < 1) return null;

        return sessionInfo;
    }

    /**
     * Log a session summary to the configured file.
     * Fix #25: Chains through writeQueue to prevent concurrent write interleaving.
     */
    async logSession(session: SessionInfo, summary: string): Promise<void> {
        this.writeQueue = (async () => {
            await this.writeQueue;
            try {
                await this._doLogSession(session, summary);
            } catch (e) {
                Logger.error("Session", "Failed to log session", e);
            }
        })();
        return this.writeQueue;
    }

    /**
     * Internal: performs the actual session logging (called via writeQueue).
     */
    private async _doLogSession(session: SessionInfo, summary: string): Promise<void> {
        // Save to session history for statistics
        await this.saveToHistory(session, summary);

        const logEntry = this.formatLogEntry(session, summary);
        const logFile = await this.getOrCreateLogFile(session.line);

        if (!logFile) {
            Logger.error("Session", "Could not create or find log file");
            return;
        }

        // Atomic read-modify-write via vault.process() (Obsidian guidelines compliance)
        const heading = session.line.sessionLogHeading || "## Session Log";
        await this.app.vault.process(logFile, (content) => {
            // Fix #24: Use line-aware regex instead of indexOf to avoid substring matches
            const headingRegex = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
            const headingMatch = content.match(headingRegex);
            const headingIndex = headingMatch ? headingMatch.index! : -1;

            if (headingIndex !== -1) {
                let insertPoint = content.indexOf("\n", headingIndex);
                if (insertPoint === -1) {
                    insertPoint = content.length;
                } else {
                    insertPoint += 1;
                }
                return content.slice(0, insertPoint) + "\n" + logEntry + "\n" + content.slice(insertPoint);
            } else {
                return content + "\n\n" + heading + "\n\n" + logEntry + "\n";
            }
        });
        Logger.debug("Session", "Appended log entry to", logFile.path);
    }

    /**
     * Save session to history for statistics
     */
    private async saveToHistory(session: SessionInfo, summary: string): Promise<void> {
        // Fix #26: Use local date instead of UTC to match daily note behavior
        const year = session.startTime.getFullYear();
        const month = String(session.startTime.getMonth() + 1).padStart(2, "0");
        const day = String(session.startTime.getDate()).padStart(2, "0");

        const record = {
            lineId: session.line.id,
            lineName: session.line.name,
            date: `${year}-${month}-${day}`,
            startTime: this.formatTime24(session.startTime),
            endTime: this.formatTime24(session.endTime),
            durationMinutes: session.durationMinutes,
            summary,
        };

        Logger.debug("Session", "Saving session to history", record);
        Logger.debug("Session", "Current history length:", this.plugin.settings.sessionHistory?.length || 0);

        // Ensure sessionHistory array exists
        if (!this.plugin.settings.sessionHistory) {
            this.plugin.settings.sessionHistory = [];
        }

        this.plugin.settings.sessionHistory.push(record);

        // Fix #8: Prune to keep last 1000 sessions
        if (this.plugin.settings.sessionHistory.length > 1000) {
            this.plugin.settings.sessionHistory = this.plugin.settings.sessionHistory.slice(-1000);
        }

        Logger.debug("Session", "New history length:", this.plugin.settings.sessionHistory.length);

        await this.plugin.saveSettings();
        Logger.debug("Session", "Settings saved");
    }

    /**
     * Format time as 24h "HH:MM"
     */
    private formatTime24(date: Date): string {
        return date.toTimeString().slice(0, 5);
    }

    /**
     * Format a log entry
     */
    private formatLogEntry(session: SessionInfo, summary: string): string {
        const dateStr = session.startTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        const startStr = this.formatTime(session.startTime);
        const endStr = this.formatTime(session.endTime);
        const durationStr = formatDuration(session.durationMinutes);

        return `### 📞 ${dateStr} | ${startStr} - ${endStr} (${durationStr})\n- ${summary}`;
    }

    /**
     * Format time as "11:30 AM"
     */
    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }



    /**
     * Get or create the log file
     */
    private async getOrCreateLogFile(line: SwitchboardLine): Promise<TFile | null> {
        let logPath: string;

        // Use line's configured file if specified and safe
        const sanitized = sanitizePath(line.sessionLogFile);
        if (line.sessionLogFile && sanitized) {
            logPath = sanitized;
            Logger.debug("Session", "Using configured log file path:", logPath);
        } else {
            if (line.sessionLogFile && !sanitized) {
                Logger.warn("Session", "Session log file path rejected (unsafe):", line.sessionLogFile);
            }
            // Default: create in same folder as landing page
            let folderPath = "";
            if (line.landingPage) {
                const parts = line.landingPage.split("/");
                parts.pop(); // Remove filename
                folderPath = parts.join("/");
            }

            const safeName = sanitizeFileName(line.name);
            logPath = folderPath
                ? `${folderPath}/${safeName} - Session Log.md`
                : `${safeName} - Session Log.md`;
            Logger.debug("Session", "Using default log file path:", logPath);
        }

        // Normalize slashes/whitespace before lookup
        const normalizedPath = normalizePath(logPath);
        const existing = this.app.vault.getAbstractFileByPath(normalizedPath);
        if (existing instanceof TFile) {
            Logger.debug("Session", "Found file at exact path");
            return existing;
        }

        // Fallback: case-insensitive search for vaults with case-mismatched paths.
        // This iterates all files which is not ideal, but only runs when the
        // direct lookup fails (rare edge case).
        const allFiles = this.app.vault.getFiles();
        const lowerLogPath = normalizedPath.toLowerCase();
        const matchingFile = allFiles.find(f => f.path.toLowerCase() === lowerLogPath);
        if (matchingFile) {
            Logger.debug("Session", "Found file via case-insensitive match:", matchingFile.path);
            return matchingFile;
        }

        // File doesn't exist - try to create it
        Logger.debug("Session", "File not found, attempting to create:", normalizedPath);
        try {
            // Ensure parent folders exist
            const parts = normalizedPath.split("/");
            parts.pop(); // Remove filename
            const folderPath = parts.join("/");
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    Logger.debug("Session", "Creating folder:", folderPath);
                    await this.app.vault.createFolder(folderPath);
                }
            }

            return await this.app.vault.create(normalizedPath, this.getDefaultLogContent(line));
        } catch (e) {
            Logger.error("Session", "Failed to create log file:", e);
            return null;
        }
    }

    /**
     * Default content for new log files
     */
    private getDefaultLogContent(line: SwitchboardLine): string {
        const heading = line.sessionLogHeading || "## Session Log";
        return `# ${line.name} - Session Notes\n\n${heading}\n\n`;
    }

    /**
     * Check if a session is currently active
     */
    hasActiveSession(): boolean {
        return this.currentSession !== null;
    }

    /**
     * Get current session duration in minutes (for display)
     */
    getCurrentDuration(): number {
        if (!this.currentSession) return 0;
        const now = new Date();
        return Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 60000);
    }

    /**
     * Log session to daily note
     */
    async logToDailyNote(lineName: string, durationMinutes: number, summary?: string): Promise<void> {
        const settings = this.plugin.settings;

        if (!settings.enableDailyNoteLogging || !settings.dailyNotesFolder) {
            return;
        }

        // Build filename: YYYY-MM-DD, DayName.md (using local time, not UTC)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
        const filename = `${dateStr}, ${dayName}.md`;
        const filePath = normalizePath(`${settings.dailyNotesFolder}/${filename}`);

        // Format: LINE: DURATION - SUMMARY
        const durationStr = formatDuration(durationMinutes);
        const bulletEntry = summary
            ? `- **${lineName}**: ${durationStr} - ${summary}`
            : `- **${lineName}**: ${durationStr}`;

        // Get or create the file
        let file = this.app.vault.getAbstractFileByPath(filePath);

        if (!file) {
            // File doesn't exist, create it with the heading
            try {
                const heading = settings.dailyNoteHeading || "### Switchboard Logs";
                const content = `# ${dateStr}, ${dayName}\n\n${heading}\n${bulletEntry}\n`;
                await this.app.vault.create(filePath, content);
                Logger.debug("Session", "Created daily note with session log:", filePath);
                return;
            } catch (e) {
                Logger.error("Session", "Failed to create daily note:", e);
                return;
            }
        }

        if (!(file instanceof TFile)) {
            Logger.error("Session", "Daily note path is not a file:", filePath);
            return;
        }

        const heading = settings.dailyNoteHeading || "### Switchboard Logs";

        // Atomic read-modify-write via vault.process() (Obsidian guidelines compliance)
        await this.app.vault.process(file, (content) => {
            // Fix #24: Use line-aware regex instead of indexOf to avoid substring matches
            const headingRegex = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
            const headingMatch = content.match(headingRegex);
            const headingIndex = headingMatch ? headingMatch.index! : -1;

            if (headingIndex !== -1) {
                let insertPoint = content.indexOf("\n", headingIndex);
                if (insertPoint === -1) {
                    insertPoint = content.length;
                } else {
                    insertPoint += 1;
                }

                const restContent = content.slice(insertPoint);
                const nextHeadingMatch = restContent.match(/^#+\s/m);
                const listEndIndex = nextHeadingMatch
                    ? insertPoint + (nextHeadingMatch.index ?? restContent.length)
                    : content.length;

                const sectionContent = content.slice(insertPoint, listEndIndex);
                const trimmedSection = sectionContent.trimEnd();

                if (trimmedSection.length > 0) {
                    const actualInsertPoint = insertPoint + trimmedSection.length;
                    return content.slice(0, actualInsertPoint) + "\n" + bulletEntry + content.slice(actualInsertPoint);
                } else {
                    return content.slice(0, insertPoint) + bulletEntry + "\n" + content.slice(insertPoint);
                }
            } else {
                return content.trimEnd() + "\n\n" + heading + "\n" + bulletEntry + "\n";
            }
        });
        Logger.debug("Session", "Appended to daily note:", bulletEntry);
    }
}
