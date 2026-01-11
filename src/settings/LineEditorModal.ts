import { Modal, App, Setting, TextComponent } from "obsidian";
import { SwitchboardLine, PRESET_COLORS, generateId } from "../types";
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
        };
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
