import { PluginSettingTab, App, Setting } from "obsidian";
import type SwitchboardPlugin from "../main";
import { LineEditorModal } from "./LineEditorModal";
import { SwitchboardLine } from "../types";

/**
 * Settings tab for configuring Switchboard Lines
 */
export class SwitchboardSettingTab extends PluginSettingTab {
    plugin: SwitchboardPlugin;

    constructor(app: App, plugin: SwitchboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h1", { text: "Switchboard" });
        containerEl.createEl("p", {
            text: "Configure your Lines (focus contexts). Each Line represents a different area of work.",
            cls: "setting-item-description",
        });

        // Chronos Integration Section
        containerEl.createEl("h2", { text: "Chronos Google Calendar Sync Integration" });

        const chronosDesc = containerEl.createEl("p", {
            cls: "setting-item-description",
        });
        chronosDesc.createSpan({ text: "Integrates with the Chronos plugin for task-to-calendar sync. " });
        chronosDesc.createEl("a", {
            text: "GitHub",
            href: "https://github.com/thuban87/Chronos",
        });

        new Setting(containerEl)
            .setName("Enable Incoming Calls")
            .setDesc(
                "When enabled, Switchboard will show an \"Incoming Call\" modal when Chronos tasks with #switchboard tags start."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.chronosIntegrationEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.chronosIntegrationEnabled = value;
                        await this.plugin.saveSettings();
                        // Restart wire service if toggled
                        this.plugin.restartWireService();
                    })
            );

        new Setting(containerEl)
            .setName("Default Snooze Time")
            .setDesc("Default duration for the \"Hold\" action on incoming calls.")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("5", "5 minutes")
                    .addOption("10", "10 minutes")
                    .addOption("15", "15 minutes")
                    .addOption("30", "30 minutes")
                    .setValue(this.plugin.settings.defaultSnoozeMinutes.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.defaultSnoozeMinutes = parseInt(value);
                        await this.plugin.saveSettings();
                    })
            );

        // Lines Section
        containerEl.createEl("h2", { text: "Lines" });

        // Add new line button
        new Setting(containerEl)
            .setName("Configure Lines")
            .setDesc("Your focus contexts - each Line represents a different area of work.")
            .addButton((btn) =>
                btn
                    .setButtonText("+ Add Line")
                    .setCta()
                    .onClick(() => {
                        new LineEditorModal(this.app, null, (line) => {
                            this.plugin.settings.lines.push(line);
                            this.plugin.saveSettings();
                            this.display();
                        }).open();
                    })
            );

        // Lines list
        const linesContainer = containerEl.createDiv("switchboard-lines-list");

        if (this.plugin.settings.lines.length === 0) {
            linesContainer.createEl("p", {
                text: "No lines configured yet. Click '+ Add Line' to create your first context.",
                cls: "switchboard-empty-state",
            });
        }

        for (const line of this.plugin.settings.lines) {
            this.renderLineItem(linesContainer, line);
        }
    }

    private renderLineItem(containerEl: HTMLElement, line: SwitchboardLine) {
        const lineEl = containerEl.createDiv("switchboard-line-item");

        // Color indicator
        const colorIndicator = lineEl.createDiv("switchboard-line-color");
        colorIndicator.style.backgroundColor = line.color;

        // Line info
        const infoEl = lineEl.createDiv("switchboard-line-info");
        infoEl.createEl("span", { text: line.name, cls: "switchboard-line-name" });
        infoEl.createEl("span", {
            text: line.safePaths.filter((p) => p).join(", ") || "No paths",
            cls: "switchboard-line-paths",
        });

        // Actions
        const actionsEl = lineEl.createDiv("switchboard-line-actions");

        // Edit button
        const editBtn = actionsEl.createEl("button", {
            cls: "switchboard-line-btn",
        });
        editBtn.innerHTML = "✏️";
        editBtn.setAttribute("aria-label", "Edit");
        editBtn.addEventListener("click", () => {
            new LineEditorModal(this.app, { ...line }, (updatedLine) => {
                const index = this.plugin.settings.lines.findIndex(
                    (l: SwitchboardLine) => l.id === line.id
                );
                if (index !== -1) {
                    this.plugin.settings.lines[index] = updatedLine;
                    this.plugin.saveSettings();
                    this.display();
                }
            }).open();
        });

        // Delete button
        const deleteBtn = actionsEl.createEl("button", {
            cls: "switchboard-line-btn switchboard-line-btn-danger",
        });
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.setAttribute("aria-label", "Delete");
        deleteBtn.addEventListener("click", () => {
            this.plugin.settings.lines = this.plugin.settings.lines.filter(
                (l: SwitchboardLine) => l.id !== line.id
            );
            this.plugin.saveSettings();
            this.display();
        });
    }
}
