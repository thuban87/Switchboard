import { App, Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine, ScheduledBlock, generateId } from "../types";
import { IncomingCallModal, IncomingCallAction } from "../modals/IncomingCallModal";
import { Logger } from "./Logger";

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

        // Initial scheduling (both Chronos and native)
        this.refreshTimers();
        this.refreshNativeTimers();

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
        this.snoozedCalls.clear();
        this.declinedCalls.clear();

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
            try {
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
            } catch (e) {
                Logger.error("Wire", "Error processing task during timer refresh:", e);
            }
        }

        // Also refresh native scheduled blocks
        this.refreshNativeTimers();
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

        // EDGE CASE: If already patched into this exact Line, suppress completely
        if (this.plugin.settings.activeLine === line.id) {
            return;
        }

        // BUSY SIGNAL: If already patched into a DIFFERENT Line, show toast and track as missed call
        const activeLine = this.plugin.getActiveLine();
        if (activeLine) {
            const taskTitle = task.title || task.taskTitle || "Incoming Call";
            // Add to missed calls list for display in status bar menu
            this.plugin.missedCalls.push({
                lineName: line.name,
                taskTitle: taskTitle,
                time: new Date()
            });
            // Mark as unacknowledged so status bar blinks
            (this.plugin as any).missedCallsAcknowledged = false;
            new Notice(`📞 ${line.name} is calling - Busy on ${activeLine.name}`);
            return;
        }

        // Not on any line - show the incoming call modal
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
    private async handleCallAction(
        task: any,
        line: SwitchboardLine,
        action: IncomingCallAction,
        snoozeMinutes?: number
    ): Promise<void> {
        const taskId = this.generateTaskId(task);

        switch (action) {
            case "connect":
                // Patch into the line
                this.plugin.patchIn(line);

                // Schedule auto-disconnect if this is a native block with endTime
                if (task._endTime && task.date) {
                    const [endHours, endMinutes] = task._endTime.split(":").map(Number);
                    // Use the task's date, not today's date
                    const endTime = new Date(task.date + "T00:00:00");
                    endTime.setHours(endHours, endMinutes, 0, 0);

                    const now = new Date();
                    Logger.debug("Wire", "Auto-disconnect scheduled for", endTime.toLocaleString(), "now is", now.toLocaleString());

                    // If end time is in the future, schedule auto-disconnect
                    if (endTime.getTime() > now.getTime()) {
                        this.plugin.scheduleAutoDisconnect(endTime);
                    } else {
                        Logger.debug("Wire", "End time already passed, not scheduling auto-disconnect");
                    }
                }
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

            case "decline": {
                // Remove from snoozed to prevent re-trigger
                this.snoozedCalls.delete(taskId);
                // Cancel any scheduled timer for this task
                const scheduled = this.scheduledCalls.get(taskId);
                if (scheduled) {
                    clearTimeout(scheduled.timerId);
                    this.scheduledCalls.delete(taskId);
                }
                // Mark as declined (won't trigger again this session)
                this.declinedCalls.add(taskId);
                new Notice(`📞 Call declined: ${line.name}`);
                break;
            }

            case "call-waiting":
                // Save to Call Waiting file (Fix #9: properly await async operation)
                await this.saveToCallWaiting(task, line);
                this.declinedCalls.add(taskId);
                new Notice(`📼 Saved to Call Waiting: ${line.name}`);
                break;

            case "reschedule":
                // Schedule callback after specified minutes
                if (snoozeMinutes) {
                    const callbackTime = new Date();
                    callbackTime.setMinutes(callbackTime.getMinutes() + snoozeMinutes);
                    this.scheduleCall(task, line, callbackTime);

                    // Format the time for display
                    const timeStr = callbackTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const dateStr = callbackTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
                    new Notice(`⏰ Will call back at ${timeStr} on ${dateStr}`);
                }
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
     * Save a declined task to the Call Waiting file
     */
    private async saveToCallWaiting(task: any, line: SwitchboardLine): Promise<void> {
        const filePath = "Call Waiting.md";
        const taskTitle = task.title || task.taskTitle || "Untitled Task";
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = now.toLocaleDateString([], { month: "2-digit", day: "2-digit" });

        const entry = `- [ ] ${line.name} - ${taskTitle} (declined at ${timeStr} on ${dateStr})`;

        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);

            if (file) {
                // Append to existing file
                const content = await this.app.vault.read(file as any);
                await this.app.vault.modify(file as any, content + "\n" + entry);
            } else {
                // Create new file with header
                const content = `# Call Waiting

Tasks that were declined but saved for later.

${entry}`;
                await this.app.vault.create(filePath, content);
            }

            Logger.debug("Wire", "Saved to Call Waiting:", entry);
        } catch (error) {
            Logger.error("Wire", "Failed to save to Call Waiting:", error);
            new Notice("Failed to save to Call Waiting file");
        }
    }

    /**
     * Get the Chronos plugin if available
     * Wrapped in try-catch for robustness if plugin structure changes
     */
    private getChronosPlugin(): any {
        try {
            const plugins = (this.app as any).plugins?.plugins;
            if (!plugins) return null;
            return plugins["chronos-google-calendar-sync"] || null;
        } catch (error) {
            Logger.warn("Wire", "Error accessing Chronos plugin:", error);
            return null;
        }
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
            Logger.error("Wire", "Error getting synced tasks:", error);
            return [];
        }
    }

    /**
     * Parse task datetime from various formats
     */
    private parseTaskTime(task: any): Date | null {
        // Try datetime field first
        if (task.datetime) {
            const d = new Date(task.datetime);
            return isNaN(d.getTime()) ? null : d;
        }

        // Try date + time fields
        if (task.date) {
            const dateStr = task.date;
            const timeStr = task.time || "00:00";
            const d = new Date(`${dateStr}T${timeStr}:00`);
            return isNaN(d.getTime()) ? null : d;
        }

        // Try taskDate + taskTime (SyncedTaskInfo format)
        if (task.taskDate) {
            const dateStr = task.taskDate;
            const timeStr = task.taskTime || "00:00";
            const d = new Date(`${dateStr}T${timeStr}:00`);
            return isNaN(d.getTime()) ? null : d;
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
     * Refresh timers for native scheduled blocks (not from Chronos)
     */
    private refreshNativeTimers(): void {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday

        for (const line of this.plugin.settings.lines) {
            if (!line.scheduledBlocks || line.scheduledBlocks.length === 0) continue;

            for (const block of line.scheduledBlocks) {
                const nextTrigger = this.getNextTriggerTime(block, now, currentDay);
                if (!nextTrigger) continue;

                // Generate unique ID for this block occurrence
                const blockId = `native:${line.id}:${block.id}:${nextTrigger.toISOString()}`;

                // Skip if already scheduled or declined
                if (this.scheduledCalls.has(blockId)) continue;
                if (this.declinedCalls.has(blockId)) continue;

                // Check if snoozed
                const snoozed = this.snoozedCalls.get(blockId);
                const triggerTime = snoozed && snoozed.snoozeUntil.getTime() > now.getTime()
                    ? snoozed.snoozeUntil
                    : nextTrigger;

                // Create a fake task object for the scheduled block
                const fakeTask = {
                    title: `Scheduled: ${line.name}`,
                    taskTitle: `Scheduled: ${line.name}`,
                    filePath: "",
                    lineNumber: 0,
                    date: triggerTime.toISOString().split("T")[0],
                    time: block.startTime,
                    _blockId: blockId,
                    _endTime: block.endTime,
                };

                this.scheduleNativeCall(fakeTask, line, triggerTime, blockId);
            }
        }
    }

    /**
     * Get the next trigger time for a scheduled block
     */
    private getNextTriggerTime(block: ScheduledBlock, now: Date, currentDay: number): Date | null {
        // Check if this is a recurring block
        if (block.recurring && block.days && block.days.length > 0) {
            // Find the next day that matches
            for (let offset = 0; offset < 7; offset++) {
                const checkDay = (currentDay + offset) % 7;
                if (block.days.includes(checkDay)) {
                    const trigger = new Date(now);
                    trigger.setDate(trigger.getDate() + offset);
                    const [hours, minutes] = block.startTime.split(":").map(Number);
                    trigger.setHours(hours, minutes, 0, 0);

                    // If it's today but the time has passed, try next occurrence
                    if (offset === 0 && trigger.getTime() < now.getTime() - 60000) {
                        continue;
                    }
                    return trigger;
                }
            }
            return null;
        }

        // One-time block (not recurring, has a date)
        if (!block.recurring && block.date) {
            const [hours, minutes] = block.startTime.split(":").map(Number);
            const trigger = new Date(block.date + "T00:00:00");
            trigger.setHours(hours, minutes, 0, 0);

            // Skip if in the past
            if (trigger.getTime() < now.getTime() - 60000) return null;
            return trigger;
        }

        return null;
    }

    /**
     * Schedule a native call (from scheduled blocks, not Chronos)
     */
    private scheduleNativeCall(task: any, line: SwitchboardLine, triggerTime: Date, blockId: string): void {
        const now = new Date();
        const delay = Math.max(0, triggerTime.getTime() - now.getTime());

        const timerId = setTimeout(() => {
            this.triggerIncomingCall(task, line);
            // Remove from scheduled after triggering
            this.scheduledCalls.delete(blockId);
        }, delay);

        this.scheduledCalls.set(blockId, {
            taskId: blockId,
            lineId: line.id,
            lineName: line.name,
            taskTitle: task.taskTitle || task.title || "Scheduled Block",
            taskTime: triggerTime,
            filePath: "",
            lineNumber: 0,
            timerId,
        });
    }

    /**
     * Check if the service is currently running
     */
    isActive(): boolean {
        return this.isRunning;
    }
}
