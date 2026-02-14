import { App, Modal, Notice, Setting, setIcon } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine } from "../types";

/**
 * TimeUpModal - Shown when a scheduled block ends (auto-disconnect)
 * 
 * Gives the user a choice to extend their session or disconnect.
 */
export class TimeUpModal extends Modal {
    private plugin: SwitchboardPlugin;
    private line: SwitchboardLine;

    constructor(app: App, plugin: SwitchboardPlugin, line: SwitchboardLine) {
        super(app);
        this.plugin = plugin;
        this.line = line;
    }

    /** Renders the time-up notification with extend/disconnect options */
    onOpen() {
        const { contentEl, modalEl } = this;

        modalEl.addClass("switchboard-timeup-modal");

        // Header
        const headerEl = contentEl.createDiv("switchboard-timeup-header");
        const iconEl = headerEl.createEl("span", { cls: "switchboard-timeup-icon" });
        setIcon(iconEl, "clock");
        headerEl.createEl("h2", { text: "Time's Up!" });

        // Message
        const messageEl = contentEl.createDiv("switchboard-timeup-message");
        messageEl.createEl("p", {
            text: `Your scheduled time for ${this.line.name} has ended.`
        });
        messageEl.createEl("p", {
            text: "Would you like to extend your session or hang up?",
            cls: "switchboard-timeup-subtitle"
        });

        // Buttons
        const buttonsEl = contentEl.createDiv("switchboard-timeup-buttons");

        // Extend options
        const extendRow = buttonsEl.createDiv("switchboard-timeup-extend-row");

        const extend15Btn = extendRow.createEl("button", {
            text: "+15 min",
            cls: "switchboard-timeup-btn switchboard-timeup-extend",
        });
        extend15Btn.addEventListener("click", () => {
            this.extendSession(15);
        });

        const extend30Btn = extendRow.createEl("button", {
            text: "+30 min",
            cls: "switchboard-timeup-btn switchboard-timeup-extend",
        });
        extend30Btn.addEventListener("click", () => {
            this.extendSession(30);
        });

        const extend60Btn = extendRow.createEl("button", {
            text: "+1 hour",
            cls: "switchboard-timeup-btn switchboard-timeup-extend",
        });
        extend60Btn.addEventListener("click", () => {
            this.extendSession(60);
        });

        // Disconnect button
        const disconnectBtn = buttonsEl.createEl("button", {
            text: "Hang Up",
            cls: "switchboard-timeup-btn switchboard-timeup-disconnect",
        });
        disconnectBtn.addEventListener("click", () => {
            this.close();
            this.plugin.disconnect();
        });
    }

    private extendSession(minutes: number) {
        const extendUntil = new Date();
        extendUntil.setMinutes(extendUntil.getMinutes() + minutes);

        this.plugin.scheduleAutoDisconnect(extendUntil);
        new Notice(`Session extended by ${minutes} minutes`);
        this.close();
    }

    /** Cleans up modal content */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
