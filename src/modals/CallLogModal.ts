import { App, Modal } from "obsidian";
import { SessionInfo } from "../services/SessionLogger";

/**
 * CallLogModal - Shows when disconnecting from a session (5+ min)
 * 
 * Prompts user for a brief summary of what they accomplished.
 */
export class CallLogModal extends Modal {
    private session: SessionInfo;
    private onSubmit: (summary: string | null) => void;
    private textArea: HTMLTextAreaElement;
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

    onOpen() {
        const { contentEl, modalEl } = this;

        // Add custom class
        modalEl.addClass("switchboard-call-log-modal");
        modalEl.style.setProperty("--call-log-color", this.session.line.color);

        // Header
        const headerEl = contentEl.createDiv("call-log-header");
        headerEl.createEl("span", { text: "📝", cls: "call-log-icon" });
        headerEl.createEl("h2", { text: "Call Ended" });

        // Session info
        const infoEl = contentEl.createDiv("call-log-info");

        const lineEl = infoEl.createDiv("call-log-line");
        const colorDot = lineEl.createSpan("call-log-color-dot");
        colorDot.style.backgroundColor = this.session.line.color;
        lineEl.createEl("span", { text: this.session.line.name });

        const durationStr = this.formatDuration(this.session.durationMinutes);
        const timeRange = `${this.formatTime(this.session.startTime)} - ${this.formatTime(this.session.endTime)}`;
        infoEl.createEl("p", { text: `⏱️ ${durationStr} (${timeRange})`, cls: "call-log-duration" });

        // Goal reflection if a goal was set
        if (this.goal) {
            const goalEl = contentEl.createDiv("call-log-goal-reflection");
            goalEl.createEl("p", {
                text: `🎯 Your goal: "${this.goal}"`,
                cls: "call-log-goal-text"
            });
            goalEl.createEl("p", {
                text: "Did you accomplish it?",
                cls: "call-log-goal-question"
            });
        }

        // Summary prompt
        contentEl.createEl("p", {
            text: "What did you accomplish?",
            cls: "call-log-prompt"
        });

        // Text area
        this.textArea = contentEl.createEl("textarea", {
            cls: "call-log-textarea",
            attr: {
                placeholder: "Brief summary of your session...",
                rows: "3"
            }
        });

        // Focus the textarea
        setTimeout(() => this.textArea.focus(), 50);

        // Buttons
        const buttonsEl = contentEl.createDiv("call-log-buttons");

        const doneBtn = buttonsEl.createEl("button", {
            cls: "call-log-btn call-log-btn-done",
        });
        doneBtn.style.backgroundColor = this.session.line.color;
        doneBtn.createEl("span", { text: "✓ Done" });
        doneBtn.addEventListener("click", () => {
            const summary = this.textArea.value.trim();
            this.close();
            this.onSubmit(summary || "No summary provided");
        });

        const skipBtn = buttonsEl.createEl("button", {
            cls: "call-log-btn call-log-btn-skip",
        });
        skipBtn.createEl("span", { text: "Skip" });
        skipBtn.addEventListener("click", () => {
            this.close();
            this.onSubmit(null);
        });

        // Handle Enter key to submit
        this.textArea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.ctrlKey) {
                const summary = this.textArea.value.trim();
                this.close();
                this.onSubmit(summary || "No summary provided");
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    private formatDuration(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
}
