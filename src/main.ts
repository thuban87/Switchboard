import { Plugin, Notice, Menu } from "obsidian";
import { SwitchboardSettings, DEFAULT_SETTINGS, SwitchboardLine } from "./types";
import { SwitchboardSettingTab } from "./settings/SwitchboardSettingTab";
import { PatchInModal } from "./modals/PatchInModal";
import { CallLogModal } from "./modals/CallLogModal";
import { OperatorModal } from "./modals/OperatorModal";
import { TimeUpModal } from "./modals/TimeUpModal";
import { StatisticsModal } from "./modals/StatisticsModal";
import { SessionEditorModal } from "./modals/SessionEditorModal";
import { GoalPromptModal } from "./modals/GoalPromptModal";
import { QuickSwitchModal } from "./modals/QuickSwitchModal";
import { CircuitManager } from "./services/CircuitManager";
import { WireService } from "./services/WireService";
import { SessionLogger } from "./services/SessionLogger";
import { AudioService } from "./services/AudioService";
import { Logger } from "./services/Logger";
import { DashboardView, DASHBOARD_VIEW_TYPE } from "./views/DashboardView";

/**
 * Switchboard - Context Manager for Obsidian
 * "Patch into your focus."
 */
export default class SwitchboardPlugin extends Plugin {
    settings: SwitchboardSettings;
    circuitManager: CircuitManager;
    wireService: WireService;
    sessionLogger: SessionLogger;
    audioService: AudioService;
    missedCalls: Array<{ lineName: string; taskTitle: string; time: Date }> = [];
    currentGoal: string | null = null;
    private missedCallsAcknowledged: boolean = true;
    private statusBarItem: HTMLElement | null = null;
    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private autoDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private breakReminderTimer: ReturnType<typeof setTimeout> | null = null;

    async onload() {
        Logger.info("Plugin", "Loading plugin...");

        // Initialize circuit manager
        this.circuitManager = new CircuitManager(this.app);

        // Initialize wire service for Chronos integration
        this.wireService = new WireService(this.app, this);

        // Initialize session logger
        this.sessionLogger = new SessionLogger(this.app, this);

        // Initialize audio service
        this.audioService = new AudioService(this);

        await this.loadSettings();

        // Initialize logger with debug mode setting
        Logger.setDebugMode(this.settings.debugMode);

        // Add ribbon icon
        this.addRibbonIcon("plug", "Switchboard", () => {
            this.openPatchInModal();
        });

        // Add settings tab
        this.addSettingTab(new SwitchboardSettingTab(this.app, this));

        // Register disconnect command
        this.addCommand({
            id: "disconnect",
            name: "Disconnect",
            callback: () => {
                this.disconnect();
            },
        });

        // Register patch-in command for command palette
        this.addCommand({
            id: "patch-in",
            name: "Patch In",
            callback: () => {
                this.openPatchInModal();
            },
        });

        // Register operator menu command
        this.addCommand({
            id: "operator-menu",
            name: "Open Operator Menu",
            callback: () => {
                this.openOperatorModal();
            },
        });

        // Register statistics command
        this.addCommand({
            id: "statistics",
            name: "Open Statistics",
            callback: () => {
                this.openStatistics();
            },
        });

        // Register session editor command
        this.addCommand({
            id: "session-editor",
            name: "Edit Session History",
            callback: () => {
                this.openSessionEditor();
            },
        });

        // Register view call waiting command
        this.addCommand({
            id: "view-call-waiting",
            name: "View Call Waiting",
            callback: () => {
                this.openCallWaiting();
            },
        });

        // Register quick switch command
        this.addCommand({
            id: "quick-switch",
            name: "Quick Switch",
            callback: () => {
                this.openQuickSwitchModal();
            },
        });

        // Register dashboard view
        this.registerView(
            DASHBOARD_VIEW_TYPE,
            (leaf) => new DashboardView(leaf, this)
        );

        // Register open dashboard command
        this.addCommand({
            id: "open-dashboard",
            name: "Open Dashboard",
            callback: () => {
                this.activateDashboard();
            },
        });

        // Add operator menu ribbon icon
        this.addRibbonIcon("headphones", "Operator Menu", () => {
            this.openOperatorModal();
        });

        // Restore active line state on plugin load (don't refocus folders)
        const activeLine = this.getActiveLine();
        if (activeLine) {
            this.circuitManager.activate(activeLine, false);
            Logger.debug("Plugin", `Restored connection to "${activeLine.name}"`);
        }

        // Start wire service if Chronos integration is enabled
        if (this.settings.chronosIntegrationEnabled) {
            // Delay to allow Chronos to load first
            setTimeout(() => {
                this.wireService.start();
            }, 2000);
        }

        // Add status bar item for session timer
        this.statusBarItem = this.addStatusBarItem();
        this.statusBarItem.addClass("switchboard-status-bar");
        this.statusBarItem.addEventListener("click", (event) => {
            this.showStatusBarMenu(event);
        });
        this.updateStatusBar();

        // Register commands for each Line (Speed Dial)
        this.registerLineCommands();

        Logger.info("Plugin", "Plugin loaded successfully.");
    }

    onunload() {
        // Stop timer updates
        this.stopTimerUpdates();

        // Stop wire service
        this.wireService.stop();

        // Clean up circuit when plugin is disabled
        this.circuitManager.deactivate();
        Logger.info("Plugin", "Unloading plugin...");
    }

    /**
     * Restart the wire service (called when settings change)
     */
    restartWireService(): void {
        this.wireService.stop();
        if (this.settings.chronosIntegrationEnabled) {
            this.wireService.start();
        }
    }

    /**
     * Opens the Patch In modal to select a line
     */
    openPatchInModal() {
        new PatchInModal(
            this.app,
            this.settings.lines,
            this.settings.activeLine,
            (line) => {
                if (line === null) {
                    this.disconnect();
                } else {
                    // Use patchInWithGoal for user-initiated patching (shows goal prompt)
                    this.patchInWithGoal(line);
                }
            }
        ).open();
    }

    /**
     * Opens the Operator Menu modal
     */
    openOperatorModal() {
        const activeLine = this.getActiveLine();
        if (!activeLine) {
            new Notice("Switchboard: Patch into a line first");
            return;
        }
        new OperatorModal(this.app, this, activeLine).open();
    }

    /**
     * Opens the Statistics modal
     */
    openStatistics() {
        new StatisticsModal(this.app, this).open();
    }

    /**
     * Opens the Session Editor modal
     */
    openSessionEditor() {
        new SessionEditorModal(this.app, this).open();
    }

    /**
     * Opens the Call Waiting file
     */
    async openCallWaiting() {
        const filePath = "Call Waiting.md";
        let file = this.app.vault.getAbstractFileByPath(filePath);

        if (!file) {
            // Create the file if it doesn't exist
            const content = `# Call Waiting

Tasks that were declined but saved for later.
`;
            await this.app.vault.create(filePath, content);
            file = this.app.vault.getAbstractFileByPath(filePath);
        }

        if (file) {
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(file as any);
        }
    }

    /**
     * Opens the Quick Switch modal (Party Line)
     */
    openQuickSwitchModal() {
        new QuickSwitchModal(
            this.app,
            this.settings.lines,
            this.settings.activeLine,
            this.currentGoal,
            (line) => {
                if (line === null) {
                    this.disconnect();
                } else {
                    this.patchInWithGoal(line);
                }
            }
        ).open();
    }

    /**
     * Activates/reveals the Dashboard sidebar view
     */
    async activateDashboard() {
        const { workspace } = this.app;

        // Check if dashboard is already open
        const existing = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }

        // Open in right sidebar
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: DASHBOARD_VIEW_TYPE,
                active: true,
            });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Refresh the dashboard view (if open)
     */
    private refreshDashboard() {
        const leaves = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (view instanceof DashboardView) {
                view.refresh();
            }
        }
    }

    /**
     * Patches into a line (activates context)
     */
    async patchIn(line: SwitchboardLine) {
        Logger.debug("Plugin", `Patching in to "${line.name}"...`);

        // Set active line
        this.settings.activeLine = line.id;
        await this.saveSettings();

        // Activate the circuit (CSS injection)
        this.circuitManager.activate(line);

        // Start session tracking
        this.sessionLogger.startSession(line);

        // Play patch-in sound
        this.audioService.playPatchIn();

        // Start status bar timer updates
        this.startTimerUpdates();

        // Start break reminder timer if enabled
        this.startBreakReminderTimer();

        // Show notice
        new Notice(`📞 Patched in: ${line.name}`);

        // Open landing page if specified
        if (line.landingPage) {
            const file = this.app.vault.getAbstractFileByPath(line.landingPage);
            if (file) {
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(file as any);
            } else {
                new Notice(`Landing page not found: ${line.landingPage}`);
            }
        }

        Logger.debug("Plugin", `Now connected to "${line.name}"`);

        // Refresh dashboard if open
        this.refreshDashboard();
    }

    /**
     * Patch in with goal prompt (call this instead of patchIn directly for user-initiated)
     */
    async patchInWithGoal(line: SwitchboardLine) {
        if (this.settings.enableGoalPrompt) {
            new GoalPromptModal(
                this.app,
                line.name,
                line.color,
                (goal) => {
                    this.currentGoal = goal;
                    this.patchIn(line);
                }
            ).open();
        } else {
            this.currentGoal = null;
            this.patchIn(line);
        }
    }

    /**
     * Disconnects from the current line
     */
    async disconnect() {
        const activeLine = this.getActiveLine();

        if (!activeLine) {
            new Notice("Switchboard: No active connection");
            return;
        }

        Logger.debug("Plugin", `Disconnecting from "${activeLine.name}"...`);

        // Store goal for reflection before clearing
        const sessionGoal = this.currentGoal;

        // Clear active line and goal
        this.settings.activeLine = null;
        this.currentGoal = null;
        await this.saveSettings();

        // Deactivate the circuit (remove CSS)
        this.circuitManager.deactivate();

        // Get duration before ending session (endSession clears it)
        const sessionDuration = this.sessionLogger.getCurrentDuration();

        // End session and check for call log
        const sessionInfo = this.sessionLogger.endSession();

        // Stop status bar timer updates
        this.stopTimerUpdates();
        this.updateStatusBar();

        // Cancel any pending auto-disconnect and break reminder
        this.cancelAutoDisconnect();
        this.stopBreakReminderTimer();

        if (sessionInfo) {
            // Session was 5+ minutes, show call log modal with goal reflection
            new CallLogModal(this.app, sessionInfo, async (summary) => {
                if (summary) {
                    // Include goal in summary if it was set
                    const fullSummary = sessionGoal
                        ? `Goal: ${sessionGoal}\n${summary}`
                        : summary;
                    await this.sessionLogger.logSession(sessionInfo, fullSummary);
                    new Notice("📝 Session logged");
                }
                // Log to daily note with summary (after modal)
                await this.sessionLogger.logToDailyNote(activeLine.name, sessionDuration, summary || undefined);
            }, sessionGoal).open();
        } else {
            // Session was < 5 minutes, log to daily note without summary
            await this.sessionLogger.logToDailyNote(activeLine.name, sessionDuration);
        }

        // Show notice
        new Notice(`🔌 Disconnected from: ${activeLine.name}`);

        // Play disconnect sound
        this.audioService.playDisconnect();

        Logger.debug("Plugin", "Disconnected");

        // Refresh dashboard if open
        this.refreshDashboard();
    }

    /**
     * Gets the currently active line, if any
     */
    getActiveLine(): SwitchboardLine | null {
        if (!this.settings.activeLine) return null;
        return (
            this.settings.lines.find((l) => l.id === this.settings.activeLine) ?? null
        );
    }

    /**
     * Loads settings from data.json
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Saves settings to data.json
     */
    async saveSettings() {
        await this.saveData(this.settings);
        // Re-register Line commands when settings change
        this.registerLineCommands();
    }

    /**
     * Register commands for each Line (Speed Dial)
     * Allows users to bind hotkeys to specific Lines
     */
    registerLineCommands(): void {
        // Register patch-in command for each line
        for (const line of this.settings.lines) {
            const commandId = `patch-in-${line.id}`;
            this.addCommand({
                id: commandId,
                name: `Patch In: ${line.name}`,
                callback: () => {
                    this.patchIn(line);
                },
            });
        }
        Logger.debug("Plugin", `Registered ${this.settings.lines.length} Speed Dial commands`);
    }

    /**
     * Update the status bar with current session info
     */
    private updateStatusBar(): void {
        if (!this.statusBarItem) return;

        const activeLine = this.getActiveLine();
        if (!activeLine) {
            this.statusBarItem.empty();
            this.statusBarItem.style.display = "none";
            return;
        }

        this.statusBarItem.style.display = "flex";
        this.statusBarItem.empty();

        // Color dot
        const dot = this.statusBarItem.createSpan("switchboard-status-dot");
        dot.style.backgroundColor = activeLine.color;

        // Line name, timer, and optional goal
        const duration = this.sessionLogger.getCurrentDuration();
        const durationStr = this.formatDuration(duration);

        let statusText = `${activeLine.name} • ${durationStr}`;
        if (this.currentGoal) {
            // Abbreviate goal to 20 chars
            const goalAbbrev = this.currentGoal.length > 20
                ? this.currentGoal.substring(0, 20) + "..."
                : this.currentGoal;
            statusText += ` • 🎯 ${goalAbbrev}`;
        }
        this.statusBarItem.createSpan({ text: statusText });

        // Add missed calls indicator if there are unacknowledged missed calls
        if (this.missedCalls.length > 0 && !this.missedCallsAcknowledged) {
            this.statusBarItem.addClass("switchboard-status-blink");
        } else {
            this.statusBarItem.removeClass("switchboard-status-blink");
        }
    }

    /**
     * Start the timer update interval
     */
    private startTimerUpdates(): void {
        this.stopTimerUpdates();
        this.updateStatusBar();
        // Update every 30 seconds
        this.timerInterval = setInterval(() => {
            this.updateStatusBar();
        }, 30000);
    }

    /**
     * Stop the timer update interval
     */
    private stopTimerUpdates(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Start break reminder timer
     */
    private startBreakReminderTimer(): void {
        this.stopBreakReminderTimer();

        const minutes = this.settings.breakReminderMinutes;
        if (minutes <= 0) return;

        const ms = minutes * 60 * 1000;
        this.breakReminderTimer = setTimeout(() => {
            const activeLine = this.getActiveLine();
            if (activeLine) {
                new Notice(`☕ You've been on ${activeLine.name} for ${minutes} minutes - consider a break!`, 10000);
                // Restart timer for another interval
                this.startBreakReminderTimer();
            }
        }, ms);
    }

    /**
     * Stop break reminder timer
     */
    private stopBreakReminderTimer(): void {
        if (this.breakReminderTimer) {
            clearTimeout(this.breakReminderTimer);
            this.breakReminderTimer = null;
        }
    }

    /**
     * Format duration as "Xh Ym" or "Xm"
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
     * Show status bar context menu
     */
    private showStatusBarMenu(event: MouseEvent): void {
        const activeLine = this.getActiveLine();
        if (!activeLine) return;

        const menu = new Menu();

        // When menu is opened, acknowledge missed calls (stop blinking)
        if (this.missedCalls.length > 0) {
            this.missedCallsAcknowledged = true;
            this.updateStatusBar();
        }

        menu.addItem((item) =>
            item
                .setTitle(`🔌 Disconnect from ${activeLine.name}`)
                .setIcon("unplug")
                .onClick(() => {
                    this.disconnect();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("🏛️ Open Operator Menu")
                .setIcon("headphones")
                .onClick(() => {
                    this.openOperatorModal();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("📊 Statistics")
                .setIcon("bar-chart-2")
                .onClick(() => {
                    this.openStatistics();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("📝 Edit Sessions")
                .setIcon("pencil")
                .onClick(() => {
                    this.openSessionEditor();
                })
        );

        // Show missed calls if any
        if (this.missedCalls.length > 0) {
            menu.addSeparator();
            menu.addItem((item) =>
                item
                    .setTitle(`📞 Missed Calls (${this.missedCalls.length})`)
                    .setIcon("phone-missed")
                    .setDisabled(true)
            );

            for (const call of this.missedCalls) {
                const timeStr = call.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                menu.addItem((item) =>
                    item
                        .setTitle(`  ${call.lineName} - ${timeStr}`)
                        .onClick(() => {
                            // Clear this missed call
                            this.missedCalls = this.missedCalls.filter(c => c !== call);
                        })
                );
            }

            menu.addItem((item) =>
                item
                    .setTitle("Clear all missed calls")
                    .setIcon("x")
                    .onClick(() => {
                        this.missedCalls = [];
                        new Notice("Cleared missed calls");
                    })
            );
        }

        menu.showAtMouseEvent(event);
    }

    /**
     * Schedule auto-disconnect at a specific time
     */
    scheduleAutoDisconnect(endTime: Date): void {
        this.cancelAutoDisconnect();

        if (!this.settings.autoDisconnect) return;

        const now = new Date();
        const delay = endTime.getTime() - now.getTime();

        if (delay <= 0) return;

        this.autoDisconnectTimer = setTimeout(() => {
            const activeLine = this.getActiveLine();
            if (activeLine) {
                new TimeUpModal(this.app, this, activeLine).open();
            } else {
                this.disconnect();
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
}
