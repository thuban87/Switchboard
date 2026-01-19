import { App, TFile, TFolder } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine } from "../types";

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

        // Only return if session was 5+ minutes
        if (durationMinutes < 5) return null;

        return sessionInfo;
    }

    /**
     * Log a session summary to the configured file
     */
    async logSession(session: SessionInfo, summary: string): Promise<void> {
        // Save to session history for statistics
        await this.saveToHistory(session, summary);

        const logEntry = this.formatLogEntry(session, summary);
        const logFile = await this.getOrCreateLogFile(session.line);

        if (!logFile) {
            console.error("SessionLogger: Could not create or find log file");
            return;
        }

        // Read existing content
        let content = await this.app.vault.read(logFile);

        // Find the heading and append after it
        const heading = session.line.sessionLogHeading || "## Session Log";
        const headingIndex = content.indexOf(heading);

        if (headingIndex !== -1) {
            // Find end of the heading line
            let insertPoint = content.indexOf("\n", headingIndex);
            if (insertPoint === -1) {
                // No newline after heading, append at end
                insertPoint = content.length;
            } else {
                insertPoint += 1; // Move past the newline
            }

            // Insert the new entry after the heading (newest first)
            content = content.slice(0, insertPoint) + "\n" + logEntry + "\n" + content.slice(insertPoint);
        } else {
            // Heading not found, append at end with heading
            content += "\n\n" + heading + "\n\n" + logEntry + "\n";
        }

        await this.app.vault.modify(logFile, content);
        console.log("SessionLogger: Appended log entry to", logFile.path);
    }

    /**
     * Save session to history for statistics
     */
    private async saveToHistory(session: SessionInfo, summary: string): Promise<void> {
        const record = {
            lineId: session.line.id,
            lineName: session.line.name,
            date: session.startTime.toISOString().split("T")[0],
            startTime: this.formatTime24(session.startTime),
            endTime: this.formatTime24(session.endTime),
            durationMinutes: session.durationMinutes,
            summary,
        };

        console.log("Switchboard: Saving session to history", record);
        console.log("Switchboard: Current history length:", this.plugin.settings.sessionHistory?.length || 0);

        // Ensure sessionHistory array exists
        if (!this.plugin.settings.sessionHistory) {
            this.plugin.settings.sessionHistory = [];
        }

        this.plugin.settings.sessionHistory.push(record);
        console.log("Switchboard: New history length:", this.plugin.settings.sessionHistory.length);

        await this.plugin.saveSettings();
        console.log("Switchboard: Settings saved");
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
        const durationStr = this.formatDuration(session.durationMinutes);

        return `### 📞 ${dateStr} | ${startStr} - ${endStr} (${durationStr})\n- ${summary}`;
    }

    /**
     * Format time as "11:30 AM"
     */
    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    /**
     * Format duration as "1h 45m" or "45m"
     */
    private formatDuration(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Get or create the log file
     */
    private async getOrCreateLogFile(line: SwitchboardLine): Promise<TFile | null> {
        let logPath: string;

        // Use line's configured file if specified
        if (line.sessionLogFile) {
            logPath = line.sessionLogFile;
            console.log("SessionLogger: Using configured log file path:", logPath);
        } else {
            // Default: create in same folder as landing page
            let folderPath = "";
            if (line.landingPage) {
                const parts = line.landingPage.split("/");
                parts.pop(); // Remove filename
                folderPath = parts.join("/");
            }

            logPath = folderPath
                ? `${folderPath}/${line.name} - Session Log.md`
                : `${line.name} - Session Log.md`;
            console.log("SessionLogger: Using default log file path:", logPath);
        }

        // Try exact path match first
        let file = this.app.vault.getAbstractFileByPath(logPath);
        if (file instanceof TFile) {
            console.log("SessionLogger: Found file at exact path");
            return file;
        }

        // Try case-insensitive lookup
        const allFiles = this.app.vault.getFiles();
        const lowerLogPath = logPath.toLowerCase();
        const matchingFile = allFiles.find(f => f.path.toLowerCase() === lowerLogPath);
        if (matchingFile) {
            console.log("SessionLogger: Found file via case-insensitive match:", matchingFile.path);
            return matchingFile;
        }

        // File doesn't exist - try to create it
        console.log("SessionLogger: File not found, attempting to create:", logPath);
        try {
            // Ensure parent folders exist
            const parts = logPath.split("/");
            parts.pop(); // Remove filename
            const folderPath = parts.join("/");
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    console.log("SessionLogger: Creating folder:", folderPath);
                    await this.app.vault.createFolder(folderPath);
                }
            }

            return await this.app.vault.create(logPath, this.getDefaultLogContent(line));
        } catch (e) {
            console.error("SessionLogger: Failed to create log file:", e);
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
}
