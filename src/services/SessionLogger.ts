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
            // Insert after the heading line
            const insertPoint = content.indexOf("\n", headingIndex) + 1;
            content = content.slice(0, insertPoint) + "\n" + logEntry + "\n" + content.slice(insertPoint);
        } else {
            // Heading not found, append at end
            content += "\n\n" + heading + "\n\n" + logEntry + "\n";
        }

        await this.app.vault.modify(logFile, content);
    }

    /**
     * Format a log entry
     */
    private formatLogEntry(session: SessionInfo, summary: string): string {
        const startStr = this.formatTime(session.startTime);
        const endStr = this.formatTime(session.endTime);
        const durationStr = this.formatDuration(session.durationMinutes);

        return `### 📞 ${session.line.name} | ${startStr} - ${endStr} (${durationStr})\n- ${summary}`;
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
        // Use line's configured file if specified
        if (line.sessionLogFile) {
            const file = this.app.vault.getAbstractFileByPath(line.sessionLogFile);
            if (file instanceof TFile) return file;

            // Create it if it doesn't exist
            try {
                return await this.app.vault.create(
                    line.sessionLogFile,
                    this.getDefaultLogContent(line)
                );
            } catch {
                return null;
            }
        }

        // Default: create in same folder as landing page
        let folderPath = "";
        if (line.landingPage) {
            const parts = line.landingPage.split("/");
            parts.pop(); // Remove filename
            folderPath = parts.join("/");
        }

        const logPath = folderPath
            ? `${folderPath}/${line.name} - Session Log.md`
            : `${line.name} - Session Log.md`;

        // Check if file exists
        const existingFile = this.app.vault.getAbstractFileByPath(logPath);
        if (existingFile instanceof TFile) return existingFile;

        // Create folder if needed
        if (folderPath) {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                await this.app.vault.createFolder(folderPath);
            }
        }

        // Create the file
        try {
            return await this.app.vault.create(logPath, this.getDefaultLogContent(line));
        } catch {
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
