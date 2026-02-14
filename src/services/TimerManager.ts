import { Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { TimeUpModal } from "../modals/TimeUpModal";
import { Logger } from "./Logger";

/**
 * TimerManager - Manages auto-disconnect and break reminder timers
 *
 * Extracted from main.ts to reduce file size and centralize timer lifecycle.
 * The destroy() method ensures all timers are cleared on plugin unload,
 * fixing audit items #1 and #2.
 */
export class TimerManager {
    private plugin: SwitchboardPlugin;
    private autoDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private breakReminderTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(plugin: SwitchboardPlugin) {
        this.plugin = plugin;
    }

    /**
     * Schedule auto-disconnect at a specific time
     */
    scheduleAutoDisconnect(endTime: Date): void {
        this.cancelAutoDisconnect();

        if (!this.plugin.settings.autoDisconnect) return;

        const now = new Date();
        const delay = endTime.getTime() - now.getTime();

        if (delay <= 0) return;

        this.autoDisconnectTimer = setTimeout(() => {
            const activeLine = this.plugin.getActiveLine();
            if (activeLine) {
                new TimeUpModal(this.plugin.app, this.plugin, activeLine).open();
            } else {
                this.plugin.disconnect();
            }
        }, delay);
    }

    /**
     * Cancel any pending auto-disconnect
     */
    cancelAutoDisconnect(): void {
        if (this.autoDisconnectTimer) {
            clearTimeout(this.autoDisconnectTimer);
            this.autoDisconnectTimer = null;
        }
    }

    /**
     * Start break reminder timer
     */
    startBreakReminder(): void {
        this.stopBreakReminder();

        const minutes = this.plugin.settings.breakReminderMinutes;
        if (minutes <= 0) return;

        const ms = minutes * 60 * 1000;
        this.breakReminderTimer = setTimeout(() => {
            const activeLine = this.plugin.getActiveLine();
            if (activeLine) {
                new Notice(`You've been on ${activeLine.name} for ${minutes} minutes - consider a break!`, 10000);
                // Restart timer for another interval
                this.startBreakReminder();
            }
        }, ms);
    }

    /**
     * Stop break reminder timer
     */
    stopBreakReminder(): void {
        if (this.breakReminderTimer) {
            clearTimeout(this.breakReminderTimer);
            this.breakReminderTimer = null;
        }
    }

    /**
     * Clean up all timers.
     * Fixes audit #1 (breakReminderTimer) and #2 (autoDisconnectTimer)
     * not being cleared in onunload().
     */
    destroy(): void {
        this.cancelAutoDisconnect();
        this.stopBreakReminder();
        Logger.debug("Timer", "All timers destroyed");
    }
}
