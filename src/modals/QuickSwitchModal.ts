import { Modal, App } from "obsidian";
import { SwitchboardLine } from "../types";

/**
 * Quick Switch Modal (Party Line)
 * Lightweight modal for fast Line switching with keyboard navigation
 */
export class QuickSwitchModal extends Modal {
    private lines: SwitchboardLine[];
    private activeLine: string | null;
    private currentGoal: string | null;
    private onSelect: (line: SwitchboardLine | null) => void;
    private selectedIndex: number = 0;
    private lineElements: HTMLElement[] = [];

    constructor(
        app: App,
        lines: SwitchboardLine[],
        activeLine: string | null,
        currentGoal: string | null,
        onSelect: (line: SwitchboardLine | null) => void
    ) {
        super(app);
        this.lines = lines;
        this.activeLine = activeLine;
        this.currentGoal = currentGoal;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        modalEl.addClass("switchboard-quick-switch-modal");

        // Header
        const header = contentEl.createDiv("quick-switch-header");
        header.createEl("span", { text: "📞", cls: "quick-switch-icon" });
        header.createEl("span", { text: "Quick Switch", cls: "quick-switch-title" });

        // Show current session if active
        if (this.activeLine) {
            const activeLine = this.lines.find(l => l.id === this.activeLine);
            if (activeLine) {
                const current = contentEl.createDiv("quick-switch-current");
                const dot = current.createSpan("quick-switch-current-dot");
                dot.style.backgroundColor = activeLine.color;
                current.createSpan({ text: activeLine.name, cls: "quick-switch-current-name" });
                if (this.currentGoal) {
                    current.createSpan({ text: `• ${this.currentGoal}`, cls: "quick-switch-current-goal" });
                }
            }
        }

        // Lines list
        const linesContainer = contentEl.createDiv("quick-switch-lines");
        this.lineElements = [];

        if (this.lines.length === 0) {
            linesContainer.createEl("p", {
                text: "No lines configured",
                cls: "quick-switch-empty",
            });
            return;
        }

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            const isActive = line.id === this.activeLine;

            const lineEl = linesContainer.createDiv("quick-switch-line");
            if (isActive) {
                lineEl.addClass("is-current");
            }
            if (i === this.selectedIndex) {
                lineEl.addClass("is-selected");
            }

            // Color indicator
            const colorEl = lineEl.createDiv("quick-switch-line-color");
            colorEl.style.backgroundColor = line.color;

            // Name
            lineEl.createEl("span", {
                text: line.name,
                cls: "quick-switch-line-name",
            });

            // Status for active line
            if (isActive) {
                lineEl.createEl("span", {
                    text: "●",
                    cls: "quick-switch-line-active",
                });
            }

            // Click handler
            lineEl.addEventListener("click", () => {
                if (!isActive) {
                    this.onSelect(line);
                }
                this.close();
            });

            // Hover to update selection
            lineEl.addEventListener("mouseenter", () => {
                this.updateSelection(i);
            });

            this.lineElements.push(lineEl);
        }

        // Disconnect button if active
        if (this.activeLine) {
            const disconnectBtn = contentEl.createEl("button", {
                text: "🔌 Disconnect",
                cls: "quick-switch-disconnect",
            });
            disconnectBtn.addEventListener("click", () => {
                this.onSelect(null);
                this.close();
            });
        }

        // Keyboard navigation hint
        const hint = contentEl.createDiv("quick-switch-hint");
        hint.createEl("span", { text: "↑↓" });
        hint.createEl("span", { text: "navigate" });
        hint.createEl("span", { text: "↵" });
        hint.createEl("span", { text: "select" });
        hint.createEl("span", { text: "esc" });
        hint.createEl("span", { text: "close" });

        // Set up keyboard navigation
        this.scope.register([], "ArrowDown", (e) => {
            e.preventDefault();
            this.moveSelection(1);
        });

        this.scope.register([], "ArrowUp", (e) => {
            e.preventDefault();
            this.moveSelection(-1);
        });

        this.scope.register([], "Enter", (e) => {
            e.preventDefault();
            this.selectCurrent();
        });
    }

    private updateSelection(index: number) {
        // Remove previous selection
        this.lineElements.forEach(el => el.removeClass("is-selected"));

        // Update index and add selection
        this.selectedIndex = index;
        if (this.lineElements[index]) {
            this.lineElements[index].addClass("is-selected");
        }
    }

    private moveSelection(delta: number) {
        if (this.lines.length === 0) return;

        let newIndex = this.selectedIndex + delta;
        if (newIndex < 0) newIndex = this.lines.length - 1;
        if (newIndex >= this.lines.length) newIndex = 0;

        this.updateSelection(newIndex);
    }

    private selectCurrent() {
        if (this.lines.length === 0) return;

        const line = this.lines[this.selectedIndex];
        if (line.id !== this.activeLine) {
            this.onSelect(line);
        }
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
