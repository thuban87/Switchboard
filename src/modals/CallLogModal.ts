import { App, Modal, setIcon } from "obsidian";
import { SessionInfo } from "../services/SessionLogger";
import { formatDuration } from "../types";

/**
 * CallLogModal - Shows when disconnecting from a session (5+ min)
 * 
 * Prompts user for a brief summary of what they accomplished.
 */
export class CallLogModal extends Modal {
    private session: SessionInfo;
    private onSubmit: (summary: string | null) => void;
    private textArea!: HTMLTextAreaElement;
    private goal: string | null;

    constructor(
        app: App,
        session: SessionInfo,
        onSubmit: (summary: string | null) => void,
        goal: string | null = null
    ) {
        super(app);
        this.session = session;
        this.onSubmit = onSubmit;
        this.goal = goal;
    }

    /** Renders the session summary form with textarea, buttons, and keyboard shortcuts */
    onOpen() {
        const { contentEl, modalEl } = this;

        // Add custom class
        modalEl.addClass("switchboard-call-log-modal");
        modalEl.style.setProperty("--call-log-color", this.session.line.color);

        // Header
        const headerEl = contentEl.createDiv("switchboard-call-log-header");
        const iconEl = headerEl.createEl("span", { cls: "switchboard-call-log-icon" });
        setIcon(iconEl, "file-text");
        headerEl.createEl("h2", { text: "Call Ended" });

        // Session info
        const infoEl = contentEl.createDiv("switchboard-call-log-info");

        const lineEl = infoEl.createDiv("switchboard-call-log-line");
        const colorDot = lineEl.createSpan("switchboard-call-log-color-dot");
        lineEl.createEl("span", { text: this.session.line.name });

        const durationStr = formatDuration(this.session.durationMinutes);
        const timeRange = `${this.formatTime(this.session.startTime)} - ${this.formatTime(this.session.endTime)}`;
        infoEl.createEl("p", { text: `${durationStr} (${timeRange})`, cls: "switchboard-call-log-duration" });

        // Goal reflection if a goal was set
        if (this.goal) {
            const goalEl = contentEl.createDiv("switchboard-call-log-goal-reflection");
            goalEl.createEl("p", {
                text: `Your goal: "${this.goal}"`,
                cls: "switchboard-call-log-goal-text"
            });
            goalEl.createEl("p", {
                text: "Did you accomplish it?",
                cls: "switchboard-call-log-goal-question"
            });
        }

        // Summary prompt
        contentEl.createEl("p", {
            text: "What did you accomplish?",
            cls: "switchboard-call-log-prompt"
        });

        // Text area
        // Fix #47: Character limit prevents excessively long summaries
        this.textArea = contentEl.createEl("textarea", {
            cls: "switchboard-call-log-textarea",
            attr: {
                placeholder: "Brief summary of your session...",
                rows: "3",
                maxlength: "2000"
            }
        });

        // Character counter
        const counterEl = contentEl.createEl("div", {
            cls: "switchboard-call-log-char-counter",
            text: "0 / 2,000"
        });
        this.textArea.addEventListener("input", () => {
            counterEl.textContent = `${this.textArea.value.length.toLocaleString()} / 2,000`;
        });

        // Focus the textarea
        setTimeout(() => this.textArea.focus(), 50);

        // Buttons
        const buttonsEl = contentEl.createDiv("switchboard-call-log-buttons");

        const doneBtn = buttonsEl.createEl("button", {
            cls: "switchboard-call-log-btn switchboard-call-log-btn-done",
        });
        doneBtn.createEl("span", { text: "Done" });
        doneBtn.addEventListener("click", () => {
            const summary = this.textArea.value.trim();
            this.close();
            this.onSubmit(summary || "No summary provided");
        });

        const skipBtn = buttonsEl.createEl("button", {
            cls: "switchboard-call-log-btn switchboard-call-log-btn-skip",
        });
        skipBtn.createEl("span", { text: "Skip" });
        skipBtn.addEventListener("click", () => {
            this.close();
            this.onSubmit(null);
        });

        // Handle Enter key to submit (Fix #46: support Cmd+Enter on Mac)
        this.textArea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                const summary = this.textArea.value.trim();
                this.close();
                this.onSubmit(summary || "No summary provided");
            }
        });
    }

    /** Cleans up modal content */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }


}
