import { Modal, App } from "obsidian";
import { SwitchboardLine } from "../types";

/**
 * Modal shown when clicking the ribbon icon
 * Displays all configured Lines for quick patching
 */
export class PatchInModal extends Modal {
    private lines: SwitchboardLine[];
    private activeLine: string | null;
    private onSelect: (line: SwitchboardLine | null) => void;

    constructor(
        app: App,
        lines: SwitchboardLine[],
        activeLine: string | null,
        onSelect: (line: SwitchboardLine | null) => void
    ) {
        super(app);
        this.lines = lines;
        this.activeLine = activeLine;
        this.onSelect = onSelect;
    }

    /** Renders the Line selection grid with color-coded buttons and a disconnect option */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("switchboard-patch-modal");

        contentEl.createEl("h2", { text: "📞 Switchboard" });
        contentEl.createEl("p", {
            text: "Select a line to patch in",
            cls: "switchboard-patch-subtitle",
        });

        if (this.lines.length === 0) {
            contentEl.createEl("p", {
                text: "No lines configured. Go to Settings → Switchboard to add lines.",
                cls: "switchboard-empty-state",
            });
            return;
        }

        const linesContainer = contentEl.createDiv("switchboard-patch-lines");

        for (const line of this.lines) {
            const lineEl = linesContainer.createDiv("switchboard-patch-line");

            // Highlight if active
            if (line.id === this.activeLine) {
                lineEl.addClass("is-active");
            }

            // Color indicator
            const colorEl = lineEl.createDiv("switchboard-patch-line-color");
            lineEl.style.setProperty("--line-color", line.color);

            // Name
            lineEl.createEl("span", {
                text: line.name,
                cls: "switchboard-patch-line-name",
            });

            // Status indicator if active
            if (line.id === this.activeLine) {
                lineEl.createEl("span", {
                    text: "● Connected",
                    cls: "switchboard-patch-line-status",
                });
            }

            lineEl.addEventListener("click", () => {
                this.onSelect(line);
                this.close();
            });
        }

        // Disconnect button if there's an active line
        if (this.activeLine) {
            const disconnectBtn = contentEl.createEl("button", {
                text: "🔌 Disconnect",
                cls: "switchboard-disconnect-btn",
            });
            disconnectBtn.addEventListener("click", () => {
                this.onSelect(null);
                this.close();
            });
        }
    }

    /** Cleans up modal content */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
