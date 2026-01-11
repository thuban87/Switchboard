import { App, Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine, generateId } from "../types";
import { IncomingCallModal, IncomingCallAction } from "../modals/IncomingCallModal";

/**
 * Represents a scheduled incoming call
 */
interface ScheduledCall {
    taskId: string;
    lineId: string;
    lineName: string;
    taskTitle: string;
    taskTime: Date;
    filePath: string;
    lineNumber: number;
    timerId: ReturnType<typeof setTimeout>;
}

/**
 * Represents a snoozed call
 */
interface SnoozedCall {
    taskId: string;
    snoozeUntil: Date;
}

/**
 * WireService - Monitors Chronos tasks for "Incoming Calls"
 * 
 * Watches for tasks with #switchboard/{line-name} tags and triggers
 * the Incoming Call modal when the task's scheduled time arrives.
 */
export class WireService {
    private app: App;
    private plugin: SwitchboardPlugin;
    private scheduledCalls: Map<string, ScheduledCall> = new Map();
    private snoozedCalls: Map<string, SnoozedCall> = new Map();
    private declinedCalls: Set<string> = new Set();
    private unsubscribeSyncComplete: (() => void) | null = null;
    private isRunning = false;

    constructor(app: App, plugin: SwitchboardPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Start the wire service
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        // Initial scheduling
        this.refreshTimers();

        // Subscribe to Chronos sync-complete events
        const chronos = this.getChronosPlugin();
        if (chronos?.events) {
            this.unsubscribeSyncComplete = chronos.events.on("sync-complete", () => {
                this.refreshTimers();
            });
        }
    }

    /**
     * Stop the wire service
     */
    stop(): void {
        if (!this.isRunning) return;

        // Clear all scheduled timers
        for (const call of this.scheduledCalls.values()) {
            clearTimeout(call.timerId);
        }
        this.scheduledCalls.clear();

        // Unsubscribe from Chronos events
        if (this.unsubscribeSyncComplete) {
            this.unsubscribeSyncComplete();
            this.unsubscribeSyncComplete = null;
        }

        this.isRunning = false;
    }

    /**
     * Refresh all timers based on current Chronos tasks
     */
    refreshTimers(): void {
        // Clear existing timers
        for (const call of this.scheduledCalls.values()) {
            clearTimeout(call.timerId);
        }
        this.scheduledCalls.clear();

        const chronos = this.getChronosPlugin();
        if (!chronos) return;

        // Get synced tasks from Chronos
        const syncedTasks = this.getSyncedTasks(chronos);
        if (!syncedTasks || syncedTasks.length === 0) return;

        const now = new Date();

        for (const task of syncedTasks) {
            // Check for #switchboard/* tags (also checks title for /line-name pattern)
            const taskTitle = task.taskTitle || task.title || "";
            const lineMatch = this.findMatchingLine(task.tags || [], taskTitle);
            if (!lineMatch) continue;

            // Parse task datetime
            const taskTime = this.parseTaskTime(task);
            if (!taskTime) continue;

            // Skip past tasks (allow 1 min grace)
            if (taskTime.getTime() < now.getTime() - 60000) continue;

            // Skip declined tasks
            const taskId = this.generateTaskId(task);
            if (this.declinedCalls.has(taskId)) continue;

            // Check if snoozed
            const snoozed = this.snoozedCalls.get(taskId);
            if (snoozed && snoozed.snoozeUntil.getTime() > now.getTime()) {
                // Schedule for after snooze
                this.scheduleCall(task, lineMatch, snoozed.snoozeUntil);
            } else {
                // Schedule for task time
                this.scheduleCall(task, lineMatch, taskTime);
            }
        }
    }

    /**
     * Schedule a call for a specific time
     */
    private scheduleCall(task: any, line: SwitchboardLine, triggerTime: Date): void {
        const taskId = this.generateTaskId(task);
        const now = new Date();
        const delay = Math.max(0, triggerTime.getTime() - now.getTime());

        const timerId = setTimeout(() => {
            this.triggerIncomingCall(task, line);
        }, delay);

        this.scheduledCalls.set(taskId, {
            taskId,
            lineId: line.id,
            lineName: line.name,
            taskTitle: task.title || task.taskTitle || "Untitled Task",
            taskTime: triggerTime,
            filePath: task.filePath || task.sourceFile || "",
            lineNumber: task.lineNumber || 0,
            timerId,
        });
    }

    /**
     * Trigger the incoming call modal
     */
    private triggerIncomingCall(task: any, line: SwitchboardLine): void {
        const taskId = this.generateTaskId(task);

        // Remove from scheduled
        this.scheduledCalls.delete(taskId);

        // Show the incoming call modal
        new IncomingCallModal(
            this.app,
            {
                lineName: line.name,
                lineColor: line.color,
                taskTitle: task.title || task.taskTitle || "Untitled Task",
                taskTime: this.parseTaskTime(task) || new Date(),
                filePath: task.filePath || task.sourceFile || "",
            },
            this.plugin.settings.defaultSnoozeMinutes,
            (action: IncomingCallAction, snoozeMinutes?: number) => {
                this.handleCallAction(task, line, action, snoozeMinutes);
            }
        ).open();
    }

    /**
     * Handle the user's action on the incoming call
     */
    private handleCallAction(
        task: any,
        line: SwitchboardLine,
        action: IncomingCallAction,
        snoozeMinutes?: number
    ): void {
        const taskId = this.generateTaskId(task);

        switch (action) {
            case "connect":
                // Patch into the line
                this.plugin.patchIn(line);
                break;

            case "hold":
                // Snooze the call
                const snoozeUntil = new Date();
                snoozeUntil.setMinutes(snoozeUntil.getMinutes() + (snoozeMinutes || 5));
                this.snoozedCalls.set(taskId, { taskId, snoozeUntil });

                // Reschedule for after snooze
                this.scheduleCall(task, line, snoozeUntil);
                new Notice(`📞 Call on hold for ${snoozeMinutes || 5} minutes`);
                break;

            case "decline":
                // Mark as declined (won't trigger again this session)
                this.declinedCalls.add(taskId);
                new Notice(`📞 Call declined: ${line.name}`);
                break;
        }
    }

    /**
     * Find a matching Line based on #switchboard/* tags or title pattern
     */
    private findMatchingLine(tags: string[], taskTitle?: string): SwitchboardLine | null {
        // First check tags array
        for (const tag of tags) {
            // Match #switchboard/line-name or just #switchboard
            const match = tag.match(/^#?switchboard(?:\/(.+))?$/i);
            if (!match) continue;

            const tagLineName = match[1]?.toLowerCase();

            // If tag is just "#switchboard", check if title has the line name
            if (!tagLineName && taskTitle) {
                const titleMatch = taskTitle.match(/\/([a-z0-9-]+)/i);
                if (titleMatch) {
                    const lineFromTitle = titleMatch[1].toLowerCase();
                    const byId = this.plugin.settings.lines.find(
                        (l: SwitchboardLine) => l.id === lineFromTitle
                    );
                    if (byId) return byId;

                    const byName = this.plugin.settings.lines.find(
                        (l: SwitchboardLine) => generateId(l.name) === lineFromTitle
                    );
                    if (byName) return byName;
                }
                continue;
            }

            if (tagLineName) {
                // Try to match by ID first (exact match)
                const byId = this.plugin.settings.lines.find(
                    (l: SwitchboardLine) => l.id === tagLineName
                );
                if (byId) return byId;

                // Try to match by name (case-insensitive, slug-converted)
                const byName = this.plugin.settings.lines.find(
                    (l: SwitchboardLine) => generateId(l.name) === tagLineName
                );
                if (byName) return byName;
            }
        }
        return null;
    }

    /**
     * Get the Chronos plugin if available
     */
    private getChronosPlugin(): any {
        return (this.app as any).plugins?.plugins?.["chronos-google-calendar-sync"];
    }

    /**
     * Get synced tasks from Chronos
     */
    private getSyncedTasks(chronos: any): any[] {
        try {
            // Try the syncManager API
            if (chronos.syncManager?.getSyncData) {
                const syncData = chronos.syncManager.getSyncData();
                return Object.values(syncData.syncedTasks || {});
            }
            return [];
        } catch (error) {
            console.error("WireService: Error getting synced tasks:", error);
            return [];
        }
    }

    /**
     * Parse task datetime from various formats
     */
    private parseTaskTime(task: any): Date | null {
        // Try datetime field first
        if (task.datetime) {
            return new Date(task.datetime);
        }

        // Try date + time fields
        if (task.date) {
            const dateStr = task.date;
            const timeStr = task.time || "00:00";
            return new Date(`${dateStr}T${timeStr}:00`);
        }

        // Try taskDate + taskTime (SyncedTaskInfo format)
        if (task.taskDate) {
            const dateStr = task.taskDate;
            const timeStr = task.taskTime || "00:00";
            return new Date(`${dateStr}T${timeStr}:00`);
        }

        return null;
    }

    /**
     * Generate a unique ID for a task
     */
    private generateTaskId(task: any): string {
        const filePath = task.filePath || task.sourceFile || "";
        const lineNumber = task.lineNumber || 0;
        const date = task.date || task.taskDate || "";
        return `${filePath}:${lineNumber}:${date}`;
    }

    /**
     * Check if the service is currently running
     */
    isActive(): boolean {
        return this.isRunning;
    }
}
