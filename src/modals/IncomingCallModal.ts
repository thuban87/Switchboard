import { App, Modal } from "obsidian";

/**
 * Actions available in the Incoming Call modal
 */
export type IncomingCallAction = "connect" | "hold" | "decline";

/**
 * Data for displaying an incoming call
 */
export interface IncomingCallData {
    lineName: string;
    lineColor: string;
    taskTitle: string;
    taskTime: Date;
    filePath: string;
}

/**
 * IncomingCallModal - Shows when a Chronos task with #switchboard tag starts
 * 
 * Metaphor: An incoming phone call that you can answer, put on hold, or decline.
 */
export class IncomingCallModal extends Modal {
    private data: IncomingCallData;
    private defaultSnoozeMinutes: number;
    private onAction: (action: IncomingCallAction, snoozeMinutes?: number) => void;

    constructor(
        app: App,
        data: IncomingCallData,
        defaultSnoozeMinutes: number,
        onAction: (action: IncomingCallAction, snoozeMinutes?: number) => void
    ) {
        super(app);
        this.data = data;
        this.defaultSnoozeMinutes = defaultSnoozeMinutes;
        this.onAction = onAction;
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        // Add custom class for styling
        modalEl.addClass("switchboard-incoming-call-modal");

        // Apply line color as accent
        modalEl.style.setProperty("--incoming-call-color", this.data.lineColor);

        // Header with ringing icon
        const headerEl = contentEl.createDiv("incoming-call-header");
        headerEl.createEl("span", { text: "📞", cls: "incoming-call-icon ringing" });
        headerEl.createEl("h2", { text: "Incoming Call" });

        // Line info
        const lineEl = contentEl.createDiv("incoming-call-line");
        const colorDot = lineEl.createSpan("incoming-call-color-dot");
        colorDot.style.backgroundColor = this.data.lineColor;
        lineEl.createEl("span", { text: this.data.lineName, cls: "incoming-call-line-name" });

        // Task details
        const taskEl = contentEl.createDiv("incoming-call-task");
        taskEl.createEl("p", { text: this.data.taskTitle, cls: "incoming-call-task-title" });

        const timeStr = this.formatTime(this.data.taskTime);
        taskEl.createEl("p", { text: `⏰ ${timeStr}`, cls: "incoming-call-task-time" });

        if (this.data.filePath) {
            const fileName = this.data.filePath.split("/").pop() || this.data.filePath;
            taskEl.createEl("p", { text: `📄 ${fileName}`, cls: "incoming-call-task-file" });
        }

        // Action buttons
        const actionsEl = contentEl.createDiv("incoming-call-actions");

        // Connect button (primary)
        const connectBtn = actionsEl.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-connect",
        });
        connectBtn.style.backgroundColor = this.data.lineColor;
        connectBtn.createEl("span", { text: "📞 Connect" });
        connectBtn.addEventListener("click", () => {
            this.close();
            this.onAction("connect");
        });

        // Hold button with dropdown
        const holdContainer = actionsEl.createDiv("incoming-call-hold-container");

        const holdBtn = holdContainer.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-hold",
        });
        holdBtn.createEl("span", { text: `🕒 Hold (${this.defaultSnoozeMinutes}m)` });
        holdBtn.addEventListener("click", () => {
            this.close();
            this.onAction("hold", this.defaultSnoozeMinutes);
        });

        // Dropdown for snooze options
        const snoozeSelect = holdContainer.createEl("select", {
            cls: "incoming-call-snooze-select",
        });
        snoozeSelect.createEl("option", { text: "5m", value: "5" });
        snoozeSelect.createEl("option", { text: "10m", value: "10" });
        snoozeSelect.createEl("option", { text: "15m", value: "15" });
        snoozeSelect.createEl("option", { text: "30m", value: "30" });
        snoozeSelect.value = this.defaultSnoozeMinutes.toString();

        snoozeSelect.addEventListener("change", () => {
            const minutes = parseInt(snoozeSelect.value);
            holdBtn.empty();
            holdBtn.createEl("span", { text: `🕒 Hold (${minutes}m)` });
        });

        // Decline button
        const declineBtn = actionsEl.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-decline",
        });
        declineBtn.createEl("span", { text: "❌ Decline" });
        declineBtn.addEventListener("click", () => {
            this.close();
            this.onAction("decline");
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Format time for display
     */
    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
}
