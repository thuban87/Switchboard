import { Menu, Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { formatDuration } from "../types";
import { Logger } from "./Logger";

/**
 * StatusBarManager - Manages the status bar display for Switchboard
 *
 * Handles the session timer, line name display, goal abbreviation,
 * missed calls indicator, and the status bar context menu.
 */
export class StatusBarManager {
    private plugin: SwitchboardPlugin;
    private statusBarItem: HTMLElement | null = null;
    private timerInterval: ReturnType<typeof setInterval> | null = null;

    constructor(plugin: SwitchboardPlugin) {
        this.plugin = plugin;
    }

    /**
     * Initialize the status bar element.
     * Must be called after plugin.addStatusBarItem() is available (i.e. inside onload).
     */
    init(): void {
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.statusBarItem.addClass("switchboard-status-bar");
        this.statusBarItem.addEventListener("click", (event) => {
            this.showMenu(event);
        });
        this.update();
    }

    /**
     * Update the status bar with current session info
     */
    update(): void {
        if (!this.statusBarItem) return;

        const activeLine = this.plugin.getActiveLine();
        if (!activeLine) {
            this.statusBarItem.empty();
            this.statusBarItem.addClass("switchboard-hidden");
            return;
        }

        this.statusBarItem.removeClass("switchboard-hidden");
        this.statusBarItem.empty();

        // Color dot
        const dot = this.statusBarItem.createSpan("switchboard-status-dot");
        this.statusBarItem.style.setProperty("--line-color", activeLine.color);

        // Line name, timer, and optional goal
        const duration = this.plugin.sessionLogger.getCurrentDuration();
        const durationStr = formatDuration(duration);

        let statusText = `${activeLine.name} • ${durationStr}`;
        if (this.plugin.currentGoal) {
            // Abbreviate goal to 20 chars
            const goalAbbrev = this.plugin.currentGoal.length > 20
                ? this.plugin.currentGoal.substring(0, 20) + "..."
                : this.plugin.currentGoal;
            statusText += ` • 🎯 ${goalAbbrev}`;
        }
        this.statusBarItem.createSpan({ text: statusText });

        // as any: missedCallsAcknowledged is private on SwitchboardPlugin but needed here for UI coordination
        if (this.plugin.missedCalls.length > 0 && !(this.plugin as any).missedCallsAcknowledged) {
            this.statusBarItem.addClass("switchboard-status-blink");
        } else {
            this.statusBarItem.removeClass("switchboard-status-blink");
        }
    }

    /**
     * Start the timer update interval
     */
    startTimerUpdates(): void {
        this.stopTimerUpdates();
        this.update();
        // Update every 30 seconds
        this.timerInterval = setInterval(() => {
            this.update();
        }, 30000);
    }

    /**
     * Stop the timer update interval
     */
    stopTimerUpdates(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }



    /**
     * Show status bar context menu
     */
    showMenu(event: MouseEvent): void {
        const activeLine = this.plugin.getActiveLine();
        if (!activeLine) return;

        const menu = new Menu();

        // When menu is opened, acknowledge missed calls (stop blinking)
        if (this.plugin.missedCalls.length > 0) {
            // as any: missedCallsAcknowledged is private on SwitchboardPlugin
            (this.plugin as any).missedCallsAcknowledged = true;
            this.update();
        }

        menu.addItem((item) =>
            item
                .setTitle(`🔌 Disconnect from ${activeLine.name}`)
                .setIcon("unplug")
                .onClick(() => {
                    this.plugin.disconnect();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("🏛️ Open Operator Menu")
                .setIcon("headphones")
                .onClick(() => {
                    this.plugin.openOperatorModal();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("📊 Statistics")
                .setIcon("bar-chart-2")
                .onClick(() => {
                    this.plugin.openStatistics();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("📝 Edit Sessions")
                .setIcon("pencil")
                .onClick(() => {
                    this.plugin.openSessionEditor();
                })
        );

        // Show missed calls if any
        if (this.plugin.missedCalls.length > 0) {
            menu.addSeparator();
            menu.addItem((item) =>
                item
                    .setTitle(`📞 Missed Calls (${this.plugin.missedCalls.length})`)
                    .setIcon("phone-missed")
                    .setDisabled(true)
            );

            for (const call of this.plugin.missedCalls) {
                const timeStr = call.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                menu.addItem((item) =>
                    item
                        .setTitle(`  ${call.lineName} - ${timeStr}`)
                        .onClick(() => {
                            // Clear this missed call
                            this.plugin.missedCalls = this.plugin.missedCalls.filter(c => c !== call);
                        })
                );
            }

            menu.addItem((item) =>
                item
                    .setTitle("Clear all missed calls")
                    .setIcon("x")
                    .onClick(() => {
                        this.plugin.missedCalls = [];
                        new Notice("Cleared missed calls");
                    })
            );
        }

        menu.showAtMouseEvent(event);
    }

    /**
     * Clean up all resources
     */
    destroy(): void {
        this.stopTimerUpdates();
        this.statusBarItem = null;
    }
}
