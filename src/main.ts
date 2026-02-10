import { Plugin, Notice, Menu } from "obsidian";
import { SwitchboardSettings, DEFAULT_SETTINGS, SwitchboardLine } from "./types";
import { SwitchboardSettingTab } from "./settings/SwitchboardSettingTab";
import { PatchInModal } from "./modals/PatchInModal";
import { CallLogModal } from "./modals/CallLogModal";
import { OperatorModal } from "./modals/OperatorModal";
import { StatisticsModal } from "./modals/StatisticsModal";
import { SessionEditorModal } from "./modals/SessionEditorModal";
import { GoalPromptModal } from "./modals/GoalPromptModal";
import { QuickSwitchModal } from "./modals/QuickSwitchModal";
import { CircuitManager } from "./services/CircuitManager";
import { WireService } from "./services/WireService";
import { SessionLogger } from "./services/SessionLogger";
import { AudioService } from "./services/AudioService";
import { StatusBarManager } from "./services/StatusBarManager";
import { TimerManager } from "./services/TimerManager";
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
    statusBarManager: StatusBarManager;
    timerManager: TimerManager;
    missedCalls: Array<{ lineName: string; taskTitle: string; time: Date }> = [];
    currentGoal: string | null = null;
    private missedCallsAcknowledged: boolean = true;
    private chronosStartupTimer: ReturnType<typeof setTimeout> | null = null;

    async onload() {
        Logger.info("Plugin", "Loading plugin...");

        // Fix #35 / A3: Load settings BEFORE initializing services
        // so AudioService.loadAudioFile() has access to settings
        await this.loadSettings();
        Logger.setDebugMode(this.settings.debugMode);

        // Initialize services (settings are now available)
        this.circuitManager = new CircuitManager(this.app);
        this.wireService = new WireService(this.app, this);
        this.sessionLogger = new SessionLogger(this.app, this);
        this.audioService = new AudioService(this);
        this.statusBarManager = new StatusBarManager(this);
        this.timerManager = new TimerManager(this);

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
            // Partial fix #20: store handle so it can be cleared in onunload
            this.chronosStartupTimer = setTimeout(() => {
                this.wireService.start();
            }, 2000);
        }

        // Initialize status bar
        this.statusBarManager.init();

        // Register commands for each Line (Speed Dial)
        this.registerLineCommands();

        Logger.info("Plugin", "Plugin loaded successfully.");
    }

    onunload() {
        // Fix #1, #2: Properly clean up all resources
        this.statusBarManager.destroy();
        this.timerManager.destroy();        // breakReminder + autoDisconnect timers
        this.wireService.stop();
        this.circuitManager.deactivate();
        this.audioService.destroy();        // CRITICAL: was missing (audit #1)

        // Partial fix #20: clear Chronos startup timer
        if (this.chronosStartupTimer) {
            clearTimeout(this.chronosStartupTimer);
            this.chronosStartupTimer = null;
        }

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
        try {
            const filePath = "Call Waiting.md";
            let file = this.app.vault.getAbstractFileByPath(filePath);

            if (!file) {
                // Create the file if it doesn't exist
                const content = `# Call Waiting\n\nTasks that were declined but saved for later.\n`;
                await this.app.vault.create(filePath, content);
                file = this.app.vault.getAbstractFileByPath(filePath);
            }

            if (file) {
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(file as any);
            }
        } catch (e) {
            Logger.error("Plugin", "Error opening Call Waiting:", e);
            new Notice("⚠️ Error opening Call Waiting — see console");
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
        try {
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
            this.statusBarManager.startTimerUpdates();

            // Start break reminder timer if enabled
            this.timerManager.startBreakReminder();

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
        } catch (e) {
            Logger.error("Plugin", "Error during patch-in:", e);
            new Notice("⚠️ Error patching in — see console");
        }
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

        try {
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
            this.statusBarManager.stopTimerUpdates();
            this.statusBarManager.update();

            // Cancel any pending auto-disconnect and break reminder
            this.timerManager.cancelAutoDisconnect();
            this.timerManager.stopBreakReminder();

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
        } catch (e) {
            Logger.error("Plugin", "Error during disconnect:", e);
            new Notice("⚠️ Error disconnecting — see console");
        }
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
     * Fix #36: Schema version for future migrations
     * Fix A8: Corrupted data.json recovery
     */
    async loadSettings() {
        try {
            const data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
            // Future: if (data.schemaVersion < 2) migrateV1toV2(data);
            this.settings = data;
        } catch (e) {
            Logger.error("Plugin", "Failed to load settings, using defaults", e);
            new Notice("Switchboard: Settings corrupted, using defaults. Your Lines may need to be reconfigured.");
            this.settings = { ...DEFAULT_SETTINGS };
        }
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
     * Schedule auto-disconnect at a specific time.
     * Thin wrapper — delegates to TimerManager.
     * External callers (WireService, TimeUpModal) use this via plugin reference.
     */
    scheduleAutoDisconnect(endTime: Date): void {
        this.timerManager.scheduleAutoDisconnect(endTime);
    }

    /**
     * Cancel any pending auto-disconnect.
     * Thin wrapper — delegates to TimerManager.
     */
    cancelAutoDisconnect(): void {
        this.timerManager.cancelAutoDisconnect();
    }
}
