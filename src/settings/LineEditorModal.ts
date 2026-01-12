import { Modal, App, Setting, TextComponent } from "obsidian";
import { SwitchboardLine, ScheduledBlock, PRESET_COLORS, generateId } from "../types";
import { FolderSuggest, FileSuggest } from "./PathSuggest";

/**
 * Modal for creating or editing a Line
 */
export class LineEditorModal extends Modal {
    private line: SwitchboardLine;
    private onSave: (line: SwitchboardLine) => void;
    private isNew: boolean;

    constructor(
        app: App,
        line: SwitchboardLine | null,
        onSave: (line: SwitchboardLine) => void
    ) {
        super(app);
        this.onSave = onSave;
        this.isNew = line === null;
        this.line = line ?? {
            id: "",
            name: "",
            color: PRESET_COLORS[0],
            safePaths: [""],
            landingPage: "",
            sessionLogFile: "",
            sessionLogHeading: "## Session Log",
            scheduledBlocks: [],
        };
        // Ensure scheduledBlocks exists for older saved lines
        if (!this.line.scheduledBlocks) {
            this.line.scheduledBlocks = [];
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("switchboard-line-editor");

        contentEl.createEl("h2", {
            text: this.isNew ? "Add New Line" : "Edit Line",
        });

        // Name input
        new Setting(contentEl)
            .setName("Name")
            .setDesc("Display name for this context (e.g., 'Math 140')")
            .addText((text) =>
                text
                    .setPlaceholder("Enter name...")
                    .setValue(this.line.name)
                    .onChange((value) => {
                        this.line.name = value;
                        if (this.isNew) {
                            this.line.id = generateId(value);
                        }
                    })
            );

        // Color picker
        this.renderColorPicker(contentEl);

        // Safe paths
        this.renderSafePaths(contentEl);

        // Landing page
        new Setting(contentEl)
            .setName("Landing Page")
            .setDesc("File or canvas to open when patching in (optional)")
            .addText((text) => {
                text
                    .setPlaceholder("Path/To/Dashboard.canvas")
                    .setValue(this.line.landingPage)
                    .onChange((value) => {
                        this.line.landingPage = value;
                    });
                // Add file autocomplete
                new FileSuggest(this.app, text.inputEl);
            });

        // Session logging section
        contentEl.createEl("h3", { text: "Session Logging" });

        new Setting(contentEl)
            .setName("Log File")
            .setDesc("File to append session summaries (leave empty for auto-created file)")
            .addText((text) => {
                text
                    .setPlaceholder("Path/To/Session-Log.md")
                    .setValue(this.line.sessionLogFile || "")
                    .onChange((value) => {
                        this.line.sessionLogFile = value;
                    });
                new FileSuggest(this.app, text.inputEl);
            });

        new Setting(contentEl)
            .setName("Log Heading")
            .setDesc("Heading to append entries under")
            .addText((text) =>
                text
                    .setPlaceholder("## Session Log")
                    .setValue(this.line.sessionLogHeading || "## Session Log")
                    .onChange((value) => {
                        this.line.sessionLogHeading = value;
                    })
            );

        // Schedule section
        this.renderScheduleSection(contentEl);

        // Buttons
        const buttonContainer = contentEl.createDiv("switchboard-modal-buttons");

        const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
        cancelBtn.addEventListener("click", () => this.close());

        const saveBtn = buttonContainer.createEl("button", {
            text: "Save",
            cls: "mod-cta",
        });
        saveBtn.addEventListener("click", () => {
            if (this.validate()) {
                this.onSave(this.line);
                this.close();
            }
        });
    }

    private renderColorPicker(containerEl: HTMLElement) {
        const setting = new Setting(containerEl)
            .setName("Color")
            .setDesc("Accent color when this line is active");

        // Create color swatches container
        const swatchContainer = setting.controlEl.createDiv(
            "switchboard-color-swatches"
        );

        for (const color of PRESET_COLORS) {
            const swatch = swatchContainer.createDiv("switchboard-color-swatch");
            swatch.style.backgroundColor = color;

            if (color === this.line.color) {
                swatch.addClass("is-selected");
            }

            swatch.addEventListener("click", () => {
                // Remove selection from all swatches
                swatchContainer
                    .querySelectorAll(".switchboard-color-swatch")
                    .forEach((el) => el.removeClass("is-selected"));
                swatch.addClass("is-selected");
                this.line.color = color;

                // Update hex input
                const hexInput = setting.controlEl.querySelector(
                    "input[type='text']"
                ) as HTMLInputElement;
                if (hexInput) hexInput.value = color;
            });
        }

        // Hex input
        setting.addText((text) =>
            text
                .setPlaceholder("#ffffff")
                .setValue(this.line.color)
                .onChange((value) => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                        this.line.color = value;
                        // Update swatch selection
                        swatchContainer
                            .querySelectorAll(".switchboard-color-swatch")
                            .forEach((el) => {
                                if (
                                    (el as HTMLElement).style.backgroundColor ===
                                    this.hexToRgb(value)
                                ) {
                                    el.addClass("is-selected");
                                } else {
                                    el.removeClass("is-selected");
                                }
                            });
                    }
                })
        );
    }

    private hexToRgb(hex: string): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    }

    private renderSafePaths(containerEl: HTMLElement) {
        const pathsContainer = containerEl.createDiv("switchboard-paths-container");

        const header = new Setting(pathsContainer)
            .setName("Safe Paths")
            .setDesc("Folders that stay visible (includes child folders)");

        header.addButton((btn) =>
            btn.setButtonText("+ Add Path").onClick(() => {
                this.line.safePaths.push("");
                this.renderPathInputs(pathsContainer);
            })
        );

        this.renderPathInputs(pathsContainer);
    }

    private renderPathInputs(containerEl: HTMLElement) {
        // Remove existing path inputs
        containerEl.querySelectorAll(".switchboard-path-input").forEach((el) => el.remove());

        for (let i = 0; i < this.line.safePaths.length; i++) {
            const pathSetting = new Setting(containerEl)
                .setClass("switchboard-path-input")
                .addText((text) => {
                    text
                        .setPlaceholder("Folder/Path")
                        .setValue(this.line.safePaths[i])
                        .onChange((value) => {
                            this.line.safePaths[i] = value;
                        });
                    // Add folder autocomplete
                    new FolderSuggest(this.app, text.inputEl);
                })
                .addExtraButton((btn) =>
                    btn.setIcon("x").setTooltip("Remove").onClick(() => {
                        this.line.safePaths.splice(i, 1);
                        if (this.line.safePaths.length === 0) {
                            this.line.safePaths.push("");
                        }
                        this.renderPathInputs(containerEl);
                    })
                );
        }
    }

    /**
     * Render the schedule section for time blocks
     */
    private renderScheduleSection(containerEl: HTMLElement) {
        // Create section header
        containerEl.createEl("h3", { text: "Schedule" });
        containerEl.createEl("p", {
            text: "Set times when this Line should trigger an \"Incoming Call\".",
            cls: "setting-item-description",
        });

        // Container for schedule blocks
        const scheduleContainer = containerEl.createDiv("schedule-blocks-container");
        this.renderScheduleBlocks(scheduleContainer);

        // Add block button
        new Setting(containerEl)
            .addButton((btn) =>
                btn.setButtonText("+ Add Time Block").onClick(() => {
                    const newBlock: ScheduledBlock = {
                        id: Date.now().toString(),
                        startTime: "09:00",
                        endTime: "10:00",
                        recurring: true,
                        days: [1, 3, 5], // Mon, Wed, Fri default
                    };
                    this.line.scheduledBlocks.push(newBlock);
                    this.renderScheduleBlocks(scheduleContainer);
                })
            );
    }

    /**
     * Render the list of schedule blocks
     */
    private renderScheduleBlocks(containerEl: HTMLElement) {
        containerEl.empty();

        const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let i = 0; i < this.line.scheduledBlocks.length; i++) {
            const block = this.line.scheduledBlocks[i];
            const blockEl = containerEl.createDiv("schedule-block");

            // Block header with summary and delete
            const headerEl = blockEl.createDiv("schedule-block-header");

            // Icon based on type
            const icon = block.recurring ? "🔁" : "📅";
            headerEl.createSpan({ text: icon, cls: "schedule-block-icon" });

            // Summary text
            let summary = "";
            if (block.recurring && block.days) {
                summary = block.days.map(d => DAYS[d]).join(", ");
            } else if (block.date) {
                const date = new Date(block.date + "T00:00:00");
                summary = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            }
            summary += ` ${this.formatTime12h(block.startTime)} - ${this.formatTime12h(block.endTime)}`;
            headerEl.createSpan({ text: summary, cls: "schedule-block-summary" });

            // Delete button
            const deleteBtn = headerEl.createEl("button", { cls: "schedule-block-delete" });
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener("click", () => {
                this.line.scheduledBlocks.splice(i, 1);
                this.renderScheduleBlocks(containerEl);
            });

            // Editable fields
            const fieldsEl = blockEl.createDiv("schedule-block-fields");

            // Type toggle (recurring vs one-time)
            new Setting(fieldsEl)
                .setName("Type")
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption("recurring", "Recurring")
                        .addOption("one-time", "One-time")
                        .setValue(block.recurring ? "recurring" : "one-time")
                        .onChange((value) => {
                            block.recurring = value === "recurring";
                            if (block.recurring) {
                                block.date = undefined;
                                if (!block.days) block.days = [1, 3, 5];
                            } else {
                                block.days = undefined;
                                if (!block.date) block.date = new Date().toISOString().split("T")[0];
                            }
                            this.renderScheduleBlocks(containerEl);
                        })
                );

            // Recurring: day checkboxes
            if (block.recurring) {
                const daysEl = fieldsEl.createDiv("schedule-days");
                daysEl.createSpan({ text: "Days:", cls: "schedule-days-label" });
                const checkboxesEl = daysEl.createDiv("schedule-days-checkboxes");

                DAYS.forEach((dayName, dayIndex) => {
                    const label = checkboxesEl.createEl("label", { cls: "schedule-day-label" });
                    const checkbox = label.createEl("input", { type: "checkbox" });
                    checkbox.checked = block.days?.includes(dayIndex) ?? false;
                    checkbox.addEventListener("change", () => {
                        if (!block.days) block.days = [];
                        if (checkbox.checked) {
                            if (!block.days.includes(dayIndex)) block.days.push(dayIndex);
                        } else {
                            block.days = block.days.filter(d => d !== dayIndex);
                        }
                        block.days.sort((a, b) => a - b);
                        this.renderScheduleBlocks(containerEl);
                    });
                    label.createSpan({ text: dayName.slice(0, 2) });
                });
            } else {
                // One-time: date picker
                new Setting(fieldsEl)
                    .setName("Date")
                    .addText((text) =>
                        text
                            .setValue(block.date || "")
                            .setPlaceholder("YYYY-MM-DD")
                            .onChange((value) => {
                                block.date = value;
                            })
                    );
            }

            // Time inputs
            const timeEl = fieldsEl.createDiv("schedule-times");

            new Setting(timeEl)
                .setName("Start")
                .addText((text) =>
                    text
                        .setValue(block.startTime)
                        .setPlaceholder("09:00")
                        .onChange((value) => {
                            block.startTime = value;
                        })
                );

            new Setting(timeEl)
                .setName("End")
                .addText((text) =>
                    text
                        .setValue(block.endTime)
                        .setPlaceholder("10:00")
                        .onChange((value) => {
                            block.endTime = value;
                        })
                );
        }

        if (this.line.scheduledBlocks.length === 0) {
            containerEl.createEl("p", {
                text: "No scheduled blocks. Add one to receive automatic reminders.",
                cls: "schedule-empty-message",
            });
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

    private validate(): boolean {
        if (!this.line.name.trim()) {
            // Show error
            return false;
        }
        // Filter out empty paths
        this.line.safePaths = this.line.safePaths.filter((p) => p.trim() !== "");
        if (this.line.safePaths.length === 0) {
            this.line.safePaths.push("");
        }
        return true;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
