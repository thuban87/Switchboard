import { Plugin, Notice } from "obsidian";
import { SwitchboardSettings, DEFAULT_SETTINGS, SwitchboardLine } from "./types";
import { SwitchboardSettingTab } from "./settings/SwitchboardSettingTab";
import { PatchInModal } from "./modals/PatchInModal";
import { CircuitManager } from "./services/CircuitManager";
import { WireService } from "./services/WireService";

/**
 * Switchboard - Context Manager for Obsidian
 * "Patch into your focus."
 */
export default class SwitchboardPlugin extends Plugin {
    settings: SwitchboardSettings;
    circuitManager: CircuitManager;
    wireService: WireService;

    async onload() {
        console.log("Switchboard: Loading plugin...");

        // Initialize circuit manager
        this.circuitManager = new CircuitManager(this.app);

        // Initialize wire service for Chronos integration
        this.wireService = new WireService(this.app, this);

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

        console.log("Switchboard: Plugin loaded successfully.");
    }

    onunload() {
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
                    this.patchIn(line);
                }
            }
        ).open();
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
     * Disconnects from the current line
     */
    async disconnect() {
        const activeLine = this.getActiveLine();

        if (!activeLine) {
            new Notice("Switchboard: No active connection");
            return;
        }

        console.log(`Switchboard: Disconnecting from "${activeLine.name}"...`);

        // Clear active line
        this.settings.activeLine = null;
        await this.saveSettings();

        // Deactivate the circuit (remove CSS)
        this.circuitManager.deactivate();

        // Show notice
        new Notice(`🔌 Disconnected from: ${activeLine.name}`);

        // TODO (Phase 4): Show call log modal
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
    }
}
