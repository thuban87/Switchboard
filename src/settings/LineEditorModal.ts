import { Modal, App, Setting, TextComponent, Notice } from "obsidian";
import { SwitchboardLine, ScheduledBlock, OperatorCommand, PRESET_COLORS, generateId, isValidHexColor, isValidTime, isValidDate, formatTime12h, parseTime12h, isValidTime12h, sanitizeFileName } from "../types";
import { FolderSuggest, FileSuggest } from "./PathSuggest";

/**
 * Modal for creating or editing a Line
 */
export class LineEditorModal extends Modal {
    private line: SwitchboardLine;
    private onSave: (line: SwitchboardLine) => void;
    private isNew: boolean;
    private existingLines: SwitchboardLine[];
    private scheduleContainer: HTMLElement | null = null;

    constructor(
        app: App,
        line: SwitchboardLine | null,
        onSave: (line: SwitchboardLine) => void,
        existingLines: SwitchboardLine[] = []
    ) {
        super(app);
        this.onSave = onSave;
        this.existingLines = existingLines;
        this.isNew = line === null;
        if (line) {
            // Deep copy to prevent modal edits from mutating the original settings
            this.line = {
                ...line,
                safePaths: [...line.safePaths],
                scheduledBlocks: (line.scheduledBlocks || []).map(b => ({
                    ...b,
                    days: b.days ? [...b.days] : undefined,
                })),
                customCommands: (line.customCommands || []).map(c => ({ ...c })),
            };
        } else {
            this.line = {
                id: "",
                name: "",
                color: PRESET_COLORS[0],
                safePaths: [""],
                landingPage: "",
                sessionLogFile: "",
                sessionLogHeading: "## Session Log",
                scheduledBlocks: [],
                customCommands: [],
            };
        }
    }

    /** Renders the Line configuration form with all editable fields */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("switchboard-line-editor");

        new Setting(contentEl)
            .setName(this.isNew ? "Add new line" : "Edit line")
            .setHeading();

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
        new Setting(contentEl).setName("Session logging").setHeading();

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

        // Custom commands section
        this.renderCustomCommandsSection(contentEl);

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
            swatch.style.setProperty("--swatch-color", color);
            swatch.dataset.color = color;

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
                                    (el as HTMLElement).dataset.color === value
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

        for (const [i, path] of this.line.safePaths.entries()) {
            const currentPath = path;
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
                        const idx = this.line.safePaths.indexOf(currentPath);
                        if (idx >= 0) this.line.safePaths.splice(idx, 1);
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
        new Setting(containerEl).setName("Schedule").setHeading();
        containerEl.createEl("p", {
            text: "Set times when this Line should trigger an \"Incoming Call\".",
            cls: "setting-item-description",
        });

        // Container for schedule blocks
        const scheduleContainer = containerEl.createDiv("switchboard-schedule-blocks-container");
        this.scheduleContainer = scheduleContainer;
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
            const blockEl = containerEl.createDiv("switchboard-schedule-block");

            // Block header with summary and delete
            const headerEl = blockEl.createDiv("switchboard-schedule-block-header");

            // Icon based on type
            const icon = block.recurring ? "🔁" : "📅";
            headerEl.createSpan({ text: icon, cls: "switchboard-schedule-block-icon" });

            // Summary text
            let summary = "";
            if (block.recurring && block.days) {
                summary = block.days.map(d => DAYS[d]).join(", ");
            } else if (block.date) {
                const date = new Date(block.date + "T00:00:00");
                summary = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            }
            summary += ` ${formatTime12h(block.startTime)} - ${formatTime12h(block.endTime)}`;
            headerEl.createSpan({ text: summary, cls: "switchboard-schedule-block-summary" });

            // Delete button
            const deleteBtn = headerEl.createEl("button", { cls: "switchboard-schedule-block-delete" });
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener("click", () => {
                const idx = this.line.scheduledBlocks.findIndex(b => b.id === block.id);
                if (idx >= 0) this.line.scheduledBlocks.splice(idx, 1);
                this.renderScheduleBlocks(containerEl);
            });

            // Editable fields
            const fieldsEl = blockEl.createDiv("switchboard-schedule-block-fields");

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
                                if (!block.date) {
                                    const now = new Date();
                                    block.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                                }
                            }
                            this.renderScheduleBlocks(containerEl);
                        })
                );

            // Recurring: day checkboxes
            if (block.recurring) {
                const daysEl = fieldsEl.createDiv("switchboard-schedule-days");
                daysEl.createSpan({ text: "Days:", cls: "switchboard-schedule-days-label" });
                const checkboxesEl = daysEl.createDiv("switchboard-schedule-days-checkboxes");

                DAYS.forEach((dayName, dayIndex) => {
                    const label = checkboxesEl.createEl("label", { cls: "switchboard-schedule-day-label" });
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
                                if (value && !isValidDate(value)) {
                                    text.inputEl.addClass("switchboard-input-error");
                                } else {
                                    text.inputEl.removeClass("switchboard-input-error");
                                }
                            })
                    );
            }

            // Time inputs (12h format)
            const timeEl = fieldsEl.createDiv("switchboard-schedule-times");

            new Setting(timeEl)
                .setName("Start")
                .addText((text) => {
                    text
                        .setValue(formatTime12h(block.startTime))
                        .setPlaceholder("9:00 AM")
                        .onChange((value) => {
                            const parsed = parseTime12h(value);
                            if (parsed) {
                                block.startTime = parsed;
                                text.inputEl.removeClass("switchboard-input-error");
                            } else {
                                text.inputEl.addClass("switchboard-input-error");
                            }
                        });
                    text.inputEl.setAttribute("data-block-id", block.id);
                    text.inputEl.setAttribute("data-field", "startTime");
                });

            new Setting(timeEl)
                .setName("End")
                .addText((text) => {
                    text
                        .setValue(formatTime12h(block.endTime))
                        .setPlaceholder("10:00 AM")
                        .onChange((value) => {
                            const parsed = parseTime12h(value);
                            if (parsed) {
                                block.endTime = parsed;
                                text.inputEl.removeClass("switchboard-input-error");
                            } else {
                                text.inputEl.addClass("switchboard-input-error");
                            }
                        });
                    text.inputEl.setAttribute("data-block-id", block.id);
                    text.inputEl.setAttribute("data-field", "endTime");
                });
        }

        if (this.line.scheduledBlocks.length === 0) {
            containerEl.createEl("p", {
                text: "No scheduled blocks. Add one to receive automatic reminders.",
                cls: "switchboard-schedule-empty-message",
            });
        }
    }



    private validate(): boolean {
        // Sync schedule block values from DOM inputs before validating
        // (guards against onChange not having fired yet on fast clicks)
        if (this.scheduleContainer) {
            const inputs = this.scheduleContainer.querySelectorAll("input[data-block-id]") as NodeListOf<HTMLInputElement>;
            for (const input of Array.from(inputs)) {
                const blockId = input.getAttribute("data-block-id");
                const field = input.getAttribute("data-field");
                const block = this.line.scheduledBlocks.find(b => b.id === blockId);
                if (block && field && (field === "startTime" || field === "endTime")) {
                    // Convert 12h display value back to 24h for storage
                    const parsed = parseTime12h(input.value);
                    if (parsed) {
                        // as any: dynamically assigning to startTime/endTime via computed field name
                        (block as any)[field] = parsed;
                    } else {
                        // as any: same pattern — keeping raw value for validation error display
                        (block as any)[field] = input.value; // Keep raw for validation error message
                    }
                }
            }
        }

        if (!this.line.name.trim()) {
            new Notice("Switchboard: Line name cannot be empty");
            return false;
        }

        // Sanitize Line name: strip characters illegal in file paths
        this.line.name = sanitizeFileName(this.line.name);

        // Fix #14: Check for duplicate Line ID on creation
        if (this.isNew) {
            const newId = generateId(this.line.name);
            if (!newId) {
                new Notice("Switchboard: Line name must contain at least one letter or number");
                return false;
            }
            const collision = this.existingLines.find(l => l.id === newId);
            if (collision) {
                new Notice(`Switchboard: A Line with ID \"${newId}\" already exists (\"${collision.name}\")`);
                return false;
            }
        }

        // Fix #23: Validate hex color
        if (!isValidHexColor(this.line.color)) {
            new Notice("Switchboard: Invalid color format — use #RRGGBB hex");
            return false;
        }

        // Fix #13: Validate schedule block times/dates
        for (const block of this.line.scheduledBlocks) {
            if (!isValidTime(block.startTime)) {
                new Notice(`Switchboard: Invalid start time \"${block.startTime}\" — use format like 9:00 AM`);
                return false;
            }
            if (!isValidTime(block.endTime)) {
                new Notice(`Switchboard: Invalid end time \"${block.endTime}\" — use format like 10:00 AM`);
                return false;
            }
            if (!block.recurring && block.date && !isValidDate(block.date)) {
                new Notice(`Switchboard: Invalid date \"${block.date}\" — use YYYY-MM-DD format`);
                return false;
            }
        }

        // Filter out empty paths
        this.line.safePaths = this.line.safePaths.filter((p) => p.trim() !== "");
        if (this.line.safePaths.length === 0) {
            this.line.safePaths.push("");
        }
        return true;
    }

    /**
     * Render the custom commands section
     */
    private renderCustomCommandsSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName("Operator commands").setHeading();
        containerEl.createEl("p", {
            text: "Quick actions shown in the Operator Menu (click status bar timer or use command palette). Insert text snippets, run Obsidian commands, or open specific files.",
            cls: "setting-item-description",
        });

        const commandsContainer = containerEl.createDiv("switchboard-custom-commands-container");
        this.renderCustomCommands(commandsContainer);

        new Setting(containerEl)
            .addButton((btn) =>
                btn.setButtonText("+ Add Command").onClick(() => {
                    const newCmd: OperatorCommand = {
                        name: "New Command",
                        icon: "📌",
                        action: "insert",
                        value: "",
                    };
                    this.line.customCommands.push(newCmd);
                    this.renderCustomCommands(commandsContainer);
                })
            );
    }

    /**
     * Render the list of custom commands
     */
    private renderCustomCommands(containerEl: HTMLElement) {
        containerEl.empty();

        for (let i = 0; i < this.line.customCommands.length; i++) {
            const cmd = this.line.customCommands[i];
            const cmdEl = containerEl.createDiv("switchboard-custom-command-item");

            // Icon input
            const iconInput = cmdEl.createEl("input", {
                type: "text",
                cls: "switchboard-custom-command-icon",
                value: cmd.icon,
            });
            iconInput.maxLength = 4;
            iconInput.addEventListener("change", () => {
                cmd.icon = iconInput.value;
            });

            // Name input
            const nameInput = cmdEl.createEl("input", {
                type: "text",
                cls: "switchboard-custom-command-name",
                placeholder: "Command name",
                value: cmd.name,
            });
            nameInput.addEventListener("change", () => {
                cmd.name = nameInput.value;
            });

            // Action type select
            const actionSelect = cmdEl.createEl("select", {
                cls: "switchboard-custom-command-action",
            });
            const actions = [
                { value: "insert", label: "Insert text" },
                { value: "command", label: "Run command" },
                { value: "open", label: "Open file" },
            ];
            for (const act of actions) {
                const opt = actionSelect.createEl("option", {
                    value: act.value,
                    text: act.label,
                });
                if (act.value === cmd.action) {
                    opt.selected = true;
                }
            }
            actionSelect.addEventListener("change", () => {
                cmd.action = actionSelect.value as "insert" | "command" | "open";
                // Re-render to update placeholder
                this.renderCustomCommands(containerEl);
            });

            // Value input with action-specific placeholder
            const getPlaceholder = (action: string) => {
                switch (action) {
                    case "insert": return "Text to insert (use {{date}}, {{time}})...";
                    case "command": return "e.g. editor:toggle-bold";
                    case "open": return "e.g. Notes/Math/Formulas.md";
                    default: return "";
                }
            };

            const valueInput = cmdEl.createEl("input", {
                type: "text",
                cls: "switchboard-custom-command-value",
                placeholder: getPlaceholder(cmd.action),
                value: cmd.value,
            });
            valueInput.addEventListener("change", () => {
                cmd.value = valueInput.value;
            });

            // Add file autocomplete when action is "open"
            if (cmd.action === "open") {
                new FileSuggest(this.app, valueInput);
            }

            // Delete button
            const deleteBtn = cmdEl.createEl("button", {
                cls: "switchboard-custom-command-delete",
                text: "×",
            });
            deleteBtn.addEventListener("click", () => {
                const idx = this.line.customCommands.indexOf(cmd);
                if (idx >= 0) this.line.customCommands.splice(idx, 1);
                this.renderCustomCommands(containerEl);
            });
        }
    }

    /** Cleans up modal content */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
