import { App, Modal } from "obsidian";

/**
 * Actions available in the Incoming Call modal
 */
export type IncomingCallAction = "connect" | "hold" | "decline" | "call-waiting" | "reschedule";

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
    private showingDeclineOptions: boolean = false;
    private actionTaken: boolean = false;

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

    /** Renders the incoming call UI with connect/hold/decline/reschedule actions */
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
        lineEl.createEl("span", { text: this.data.lineName, cls: "incoming-call-line-name" });

        // Task details
        const taskEl = contentEl.createDiv("incoming-call-task");
        taskEl.createEl("p", { text: this.data.taskTitle, cls: "incoming-call-task-title" });

        const timeStr = this.formatTime(this.data.taskTime);
        taskEl.createEl("p", { text: `⏰ ${timeStr}`, cls: "incoming-call-task-time" });

        if (this.data.filePath) {
            const fileName = this.data.filePath.split(/[\\/]/).pop() || this.data.filePath;
            taskEl.createEl("p", { text: `📄 ${fileName}`, cls: "incoming-call-task-file" });
        }

        // Action buttons container
        const actionsEl = contentEl.createDiv("incoming-call-actions");

        // Connect button (primary)
        const connectBtn = actionsEl.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-connect",
        });
        connectBtn.createEl("span", { text: "📞 Connect" });
        connectBtn.addEventListener("click", () => {
            if (this.actionTaken) return;
            this.actionTaken = true;
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
            if (this.actionTaken) return;
            this.actionTaken = true;
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

        // Decline button - now toggles options
        const declineBtn = actionsEl.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-decline",
        });
        declineBtn.createEl("span", { text: "❌ Decline" });

        // Decline options container (hidden initially via CSS)
        const declineOptionsEl = contentEl.createDiv("incoming-call-decline-options");

        declineBtn.addEventListener("click", () => {
            if (this.showingDeclineOptions) {
                // If already showing, just dismiss
                if (this.actionTaken) return;
                this.actionTaken = true;
                this.close();
                this.onAction("decline");
            } else {
                // Show decline options
                this.showingDeclineOptions = true;
                declineOptionsEl.addClass("is-visible");
                declineBtn.empty();
                declineBtn.createEl("span", { text: "❌ Just Dismiss" });
            }
        });

        // Create decline option buttons
        this.createDeclineOptions(declineOptionsEl, snoozeSelect);
    }

    /**
     * Create the decline options UI
     */
    private createDeclineOptions(container: HTMLElement, snoozeSelect: HTMLSelectElement): void {
        // Call back in 30 minutes
        const thirtyMinBtn = container.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-secondary",
        });
        thirtyMinBtn.createEl("span", { text: "⏰ Call back in 30 minutes" });
        thirtyMinBtn.addEventListener("click", () => {
            if (this.actionTaken) return;
            this.actionTaken = true;
            this.close();
            this.onAction("reschedule", 30);
        });

        // Call back in 1 hour
        const oneHourBtn = container.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-secondary",
        });
        oneHourBtn.createEl("span", { text: "⏰ Call back in 1 hour" });
        oneHourBtn.addEventListener("click", () => {
            if (this.actionTaken) return;
            this.actionTaken = true;
            this.close();
            this.onAction("reschedule", 60);
        });

        // Call back tomorrow (9 AM)
        const tomorrowBtn = container.createEl("button", {
            cls: "incoming-call-btn incoming-call-btn-secondary",
        });
        tomorrowBtn.createEl("span", { text: "📅 Call back tomorrow" });
        tomorrowBtn.addEventListener("click", () => {
            if (this.actionTaken) return;
            this.actionTaken = true;
            // Calculate minutes until 9 AM tomorrow
            const now = new Date();
            const tomorrow9AM = new Date(now);
            tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
            tomorrow9AM.setHours(9, 0, 0, 0);
            const minutesUntilTomorrow = Math.round((tomorrow9AM.getTime() - now.getTime()) / 60000);
            this.close();
            this.onAction("reschedule", minutesUntilTomorrow);
        });
    }

    /** Cleans up modal content */
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
