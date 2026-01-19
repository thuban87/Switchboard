import { App, Modal, Setting } from "obsidian";

/**
 * GoalPromptModal - Shown on patch-in to set a session goal
 */
export class GoalPromptModal extends Modal {
    private goal: string = "";
    private onSubmit: (goal: string | null) => void;
    private lineName: string;
    private lineColor: string;

    constructor(
        app: App,
        lineName: string,
        lineColor: string,
        onSubmit: (goal: string | null) => void
    ) {
        super(app);
        this.lineName = lineName;
        this.lineColor = lineColor;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        modalEl.addClass("switchboard-goal-prompt-modal");
        modalEl.style.setProperty("--goal-prompt-color", this.lineColor);

        // Header
        const headerEl = contentEl.createDiv("goal-prompt-header");
        headerEl.createEl("h2", { text: `📎 ${this.lineName}` });
        headerEl.createEl("p", {
            text: "What's your goal for this session?",
            cls: "goal-prompt-subtitle"
        });

        // Goal input
        new Setting(contentEl)
            .setClass("goal-prompt-input-container")
            .addText((text) => {
                text.setPlaceholder("e.g., Finish reading Chapter 3")
                    .onChange((value) => {
                        this.goal = value;
                    });
                text.inputEl.addClass("goal-prompt-input");
                text.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        this.close();
                        this.onSubmit(this.goal.trim() || null);
                    }
                });
                // Auto-focus
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // Buttons
        const actionsEl = contentEl.createDiv("goal-prompt-actions");

        const startBtn = actionsEl.createEl("button", {
            cls: "goal-prompt-btn goal-prompt-btn-primary",
        });
        startBtn.style.backgroundColor = this.lineColor;
        startBtn.createEl("span", { text: "🎯 Start Session" });
        startBtn.addEventListener("click", () => {
            this.close();
            this.onSubmit(this.goal.trim() || null);
        });

        const skipBtn = actionsEl.createEl("button", {
            cls: "goal-prompt-btn goal-prompt-btn-secondary",
        });
        skipBtn.createEl("span", { text: "Skip" });
        skipBtn.addEventListener("click", () => {
            this.close();
            this.onSubmit(null);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
