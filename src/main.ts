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
import { CircuitManager } from "./services/CircuitManager";
import { WireService } from "./services/WireService";
import { SessionLogger } from "./services/SessionLogger";
import { AudioService } from "./services/AudioService";

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
        console.log("Switchboard: Loading plugin...");

        // Initialize circuit manager
        this.circuitManager = new CircuitManager(this.app);

        // Initialize wire service for Chronos integration
        this.wireService = new WireService(this.app, this);

        // Initialize session logger
        this.sessionLogger = new SessionLogger(this.app, this);

        // Initialize audio service
        this.audioService = new AudioService(this);

        await this.loadSettings();

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

        // Add operator menu ribbon icon
        this.addRibbonIcon("headphones", "Operator Menu", () => {
            this.openOperatorModal();
        });

        // Restore active line state on plugin load (don't refocus folders)
        const activeLine = this.getActiveLine();
        if (activeLine) {
            this.circuitManager.activate(activeLine, false);
            console.log(`Switchboard: Restored connection to "${activeLine.name}"`);
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

        console.log("Switchboard: Plugin loaded successfully.");
    }

    onunload() {
        // Stop timer updates
        this.stopTimerUpdates();

        // Stop wire service
        this.wireService.stop();

        // Clean up circuit when plugin is disabled
        this.circuitManager.deactivate();
        console.log("Switchboard: Unloading plugin...");
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
     * Patches into a line (activates context)
     */
    async patchIn(line: SwitchboardLine) {
        console.log(`Switchboard: Patching in to "${line.name}"...`);

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

        console.log(`Switchboard: ✅ Now connected to "${line.name}"`);
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

        console.log(`Switchboard: Disconnecting from "${activeLine.name}"...`);

        // Store goal for reflection before clearing
        const sessionGoal = this.currentGoal;

        // Clear active line and goal
        this.settings.activeLine = null;
        this.currentGoal = null;
        await this.saveSettings();

        // Deactivate the circuit (remove CSS)
        this.circuitManager.deactivate();

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
            }, sessionGoal).open();
        }

        // Show notice
        new Notice(`🔌 Disconnected from: ${activeLine.name}`);

        // Play disconnect sound
        this.audioService.playDisconnect();

        console.log("Switchboard: ✅ Disconnected");
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
        console.log(`Switchboard: Registered ${this.settings.lines.length} Speed Dial commands`);
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
