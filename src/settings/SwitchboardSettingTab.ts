import { PluginSettingTab, App, Setting } from "obsidian";
import type SwitchboardPlugin from "../main";
import { LineEditorModal } from "./LineEditorModal";
import { SwitchboardLine } from "../types";
import { Logger } from "../services/Logger";

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

        new Setting(containerEl)
            .setName("Auto-disconnect")
            .setDesc(
                "Automatically disconnect when a scheduled block ends."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoDisconnect)
                    .onChange(async (value) => {
                        this.plugin.settings.autoDisconnect = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Sound Settings
        containerEl.createEl("h3", { text: "Sound Effects" });

        new Setting(containerEl)
            .setName("Mute sounds")
            .setDesc("Disable all audio feedback.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.muteSounds)
                    .onChange(async (value) => {
                        this.plugin.settings.muteSounds = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Sound type")
            .setDesc("Choose between synthesized beeps or realistic cable sounds.")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("synthesized", "Synthesized (Web Audio)")
                    .addOption("realistic", "Realistic (Sample)")
                    .setValue(this.plugin.settings.soundType)
                    .onChange(async (value: "synthesized" | "realistic") => {
                        this.plugin.settings.soundType = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Session Goals Section
        containerEl.createEl("h3", { text: "Session Goals" });

        new Setting(containerEl)
            .setName("Enable goal prompt")
            .setDesc("Ask for a session goal when patching in.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableGoalPrompt)
                    .onChange(async (value) => {
                        this.plugin.settings.enableGoalPrompt = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Break reminder (minutes)")
            .setDesc("Get a gentle reminder after this many minutes. Set to 0 to disable.")
            .addText((text) =>
                text
                    .setValue(this.plugin.settings.breakReminderMinutes.toString())
                    .onChange(async (value) => {
                        const mins = parseInt(value) || 0;
                        this.plugin.settings.breakReminderMinutes = Math.max(0, mins);
                        await this.plugin.saveSettings();
                    })
            );

        // Daily Note Logging Section
        containerEl.createEl("h3", { text: "Daily Note Logging" });

        new Setting(containerEl)
            .setName("Log sessions to daily notes")
            .setDesc("Append session summaries to your daily note when disconnecting.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableDailyNoteLogging)
                    .onChange(async (value) => {
                        this.plugin.settings.enableDailyNoteLogging = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide folder settings
                    })
            );

        // Only show folder/heading settings if logging is enabled
        if (this.plugin.settings.enableDailyNoteLogging) {
            new Setting(containerEl)
                .setName("Daily notes folder")
                .setDesc("Path to your daily notes folder.")
                .addSearch((search) => {
                    search
                        .setPlaceholder("e.g., Journal/Daily")
                        .setValue(this.plugin.settings.dailyNotesFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.dailyNotesFolder = value;
                            await this.plugin.saveSettings();
                        });

                    // Add folder suggestions
                    const inputEl = search.inputEl;
                    inputEl.addEventListener("input", () => {
                        const value = inputEl.value;
                        const folders = this.app.vault.getAllLoadedFiles()
                            .filter((f) => (f as any).children !== undefined)
                            .map((f) => f.path)
                            .filter((p) => p.toLowerCase().includes(value.toLowerCase()))
                            .slice(0, 10);

                        // Clear existing suggestions
                        const existingPopover = containerEl.querySelector(".daily-note-folder-suggestions");
                        if (existingPopover) existingPopover.remove();

                        if (folders.length > 0 && value.length > 0) {
                            const popover = containerEl.createDiv("daily-note-folder-suggestions suggestion-container");
                            popover.style.position = "absolute";
                            popover.style.zIndex = "1000";

                            for (const folder of folders) {
                                const item = popover.createDiv("suggestion-item");
                                item.setText(folder);
                                item.addEventListener("click", async () => {
                                    inputEl.value = folder;
                                    this.plugin.settings.dailyNotesFolder = folder;
                                    await this.plugin.saveSettings();
                                    popover.remove();
                                });
                            }

                            // Position popover
                            const rect = inputEl.getBoundingClientRect();
                            popover.style.top = `${inputEl.offsetTop + inputEl.offsetHeight}px`;
                            popover.style.left = `${inputEl.offsetLeft}px`;
                            popover.style.width = `${inputEl.offsetWidth}px`;
                        }
                    });

                    // Hide suggestions on blur (with delay to allow click)
                    inputEl.addEventListener("blur", () => {
                        setTimeout(() => {
                            const popover = containerEl.querySelector(".daily-note-folder-suggestions");
                            if (popover) popover.remove();
                        }, 200);
                    });
                });

            new Setting(containerEl)
                .setName("Heading to log under")
                .setDesc("The heading in your daily note to append sessions under.")
                .addText((text) =>
                    text
                        .setPlaceholder("### Switchboard Logs")
                        .setValue(this.plugin.settings.dailyNoteHeading)
                        .onChange(async (value) => {
                            this.plugin.settings.dailyNoteHeading = value || "### Switchboard Logs";
                            await this.plugin.saveSettings();
                        })
                );
        }

        // Schedule Overview Section
        containerEl.createEl("h2", { text: "Schedule Overview" });
        this.renderScheduleOverview(containerEl);

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
                            this.plugin.restartWireService();
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

        // Advanced Section
        containerEl.createEl("h2", { text: "Advanced" });

        new Setting(containerEl)
            .setName("Debug mode")
            .setDesc("Log detailed debug information to the developer console. Useful for troubleshooting.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.debugMode)
                    .onChange(async (value) => {
                        this.plugin.settings.debugMode = value;
                        Logger.setDebugMode(value);
                        await this.plugin.saveSettings();
                    })
            );
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
                    this.plugin.restartWireService();
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
            // Confirm before deleting
            const confirmed = confirm(`Delete "${line.name}"? This cannot be undone.`);
            if (!confirmed) return;

            this.plugin.settings.lines = this.plugin.settings.lines.filter(
                (l: SwitchboardLine) => l.id !== line.id
            );
            this.plugin.saveSettings();
            this.plugin.restartWireService();
            this.display();
        });
    }

    private renderScheduleOverview(containerEl: HTMLElement) {
        const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const overviewEl = containerEl.createDiv("schedule-overview");

        // Create collapsible container
        const detailsEl = overviewEl.createEl("details", { cls: "schedule-overview-details" });
        const summaryEl = detailsEl.createEl("summary", { cls: "schedule-overview-summary" });

        // Count total native blocks
        let nativeBlocks = 0;
        for (const line of this.plugin.settings.lines) {
            nativeBlocks += line.scheduledBlocks?.length || 0;
        }

        // Get Chronos tasks with #switchboard tags
        const chronosTasks = this.getChronosSwitchboardTasks();
        const chronosCount = chronosTasks.length;

        summaryEl.textContent = `📅 View All Scheduled Blocks (${nativeBlocks} native, ${chronosCount} Chronos)`;

        const contentEl = detailsEl.createDiv("schedule-overview-content");

        // Native blocks by Line
        if (nativeBlocks > 0) {
            contentEl.createEl("h4", { text: "Native Blocks", cls: "schedule-overview-section-title" });

            for (const line of this.plugin.settings.lines) {
                if (!line.scheduledBlocks || line.scheduledBlocks.length === 0) continue;

                const lineSection = contentEl.createDiv("schedule-overview-line");
                const lineHeader = lineSection.createDiv("schedule-overview-line-header");

                const colorDot = lineHeader.createSpan("schedule-overview-color-dot");
                colorDot.style.backgroundColor = line.color;
                lineHeader.createSpan({ text: line.name });

                for (const block of line.scheduledBlocks) {
                    const blockEl = lineSection.createDiv("schedule-overview-block");

                    const icon = block.recurring ? "🔁" : "📅";
                    blockEl.createSpan({ text: icon, cls: "schedule-overview-type" });

                    let desc = "";
                    if (block.recurring && block.days) {
                        desc = block.days.map(d => DAYS[d]).join(", ");
                    } else if (block.date) {
                        const date = new Date(block.date + "T00:00:00");
                        desc = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    }

                    const timeStart = this.formatTime12h(block.startTime);
                    const timeEnd = this.formatTime12h(block.endTime);
                    desc += ` ${timeStart} - ${timeEnd}`;

                    blockEl.createSpan({ text: desc, cls: "schedule-overview-desc" });
                }
            }
        }

        // Chronos tasks
        if (chronosCount > 0) {
            contentEl.createEl("h4", { text: "Chronos Tasks", cls: "schedule-overview-section-title" });

            for (const task of chronosTasks) {
                const taskEl = contentEl.createDiv("schedule-overview-block schedule-overview-chronos-task schedule-overview-clickable");
                // Show 🔁 for recurring tasks, 📆 for one-time
                const icon = task.isRecurring ? "🔁" : "📆";
                taskEl.createSpan({ text: icon, cls: "schedule-overview-type" });

                // Format task info
                const dateStr = task.date ? new Date(task.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
                const timeStr = task.time ? this.formatTime12h(task.time) : "All day";
                const desc = `${dateStr} ${timeStr} - ${task.title}`;

                taskEl.createSpan({ text: desc, cls: "schedule-overview-desc" });

                // Show which line it targets
                if (task.targetLine) {
                    taskEl.createSpan({ text: task.targetLine, cls: "schedule-overview-line-tag" });
                }

                // Make clickable to open the source note
                if (task.filePath) {
                    taskEl.addEventListener("click", () => {
                        const file = this.app.vault.getAbstractFileByPath(task.filePath);
                        if (file) {
                            this.app.workspace.openLinkText(task.filePath, "", false);
                        }
                    });
                }
            }
        }

        if (nativeBlocks === 0 && chronosCount === 0) {
            contentEl.createEl("p", {
                text: "No scheduled blocks configured. Add them in Line settings or use Chronos tasks with #switchboard tags.",
                cls: "schedule-overview-empty",
            });
        }
    }

    /**
     * Get Chronos tasks that have #switchboard tags
     */
    private getChronosSwitchboardTasks(): { title: string; date: string; time: string | null; targetLine: string; filePath: string; isRecurring: boolean }[] {
        const chronos = (this.app as any).plugins?.plugins?.["chronos-google-calendar-sync"];
        if (!chronos || !this.plugin.settings.chronosIntegrationEnabled) return [];

        try {
            // Get synced tasks from Chronos
            let syncedTasks: any[] = [];
            if (chronos.syncManager?.getSyncData) {
                const syncData = chronos.syncManager.getSyncData();
                syncedTasks = Object.values(syncData?.syncedTasks || {});
            }

            const result: { title: string; date: string; time: string | null; targetLine: string; filePath: string; isRecurring: boolean }[] = [];

            // Get today's date string for filtering past tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split("T")[0];

            // Filter to only tasks that have switchboard-related tags (optimization)
            const switchboardTasks = syncedTasks.filter((task: any) => {
                const tags = task.tags || [];
                return tags.some((tag: string) => {
                    // Strip # prefix if present
                    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
                    return cleanTag.toLowerCase().startsWith("switchboard");
                });
            });

            Logger.debug("Settings", "Filtered to", switchboardTasks.length, "tasks with switchboard tags");

            for (const task of switchboardTasks) {
                const tags = task.tags || [];
                const title = task.taskTitle || task.title || "";
                const taskDate = task.date || "";

                // Filter out past tasks (keep today and future only)
                if (taskDate && taskDate < todayStr) {
                    continue;
                }

                // Check for #switchboard tags - normalize by stripping # prefix
                let targetLine = "";
                for (const rawTag of tags) {
                    const tag = rawTag.startsWith("#") ? rawTag.slice(1) : rawTag;

                    if (tag.toLowerCase().startsWith("switchboard/")) {
                        // Format: #switchboard/line-name
                        targetLine = tag.split("/")[1] || "";
                        Logger.debug("Settings", "Found switchboard/ tag, targetLine:", targetLine);
                        break;
                    } else if (tag.toLowerCase() === "switchboard") {
                        // Format: #switchboard with /line-name in title
                        const match = title.match(/\/([a-z0-9-]+)/i);
                        if (match) targetLine = match[1];
                        Logger.debug("Settings", "Found switchboard tag, checking title for /line-name, targetLine:", targetLine);
                        break;
                    }
                }

                if (targetLine) {
                    result.push({
                        title: title.replace(/\s*\/[a-z0-9-]+/i, "").trim(),
                        date: task.date || "",
                        time: task.time || null,
                        targetLine,
                        filePath: task.filePath || "",
                        isRecurring: task.isRecurring || false,
                    });
                }
            }

            return result;
        } catch (e) {
            Logger.error("Settings", "Error getting Chronos tasks:", e);
            return [];
        }
    }

    /**
     * Format 24h time to 12h format
     */
    private formatTime12h(time24: string): string {
        const [hours, minutes] = time24.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
    }
}
