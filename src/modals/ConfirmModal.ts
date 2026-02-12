import { Modal, App } from "obsidian";

/**
 * Generic confirmation dialog using Obsidian's Modal system.
 * Replaces native confirm() for consistent UI and mobile support.
 */
export class ConfirmModal extends Modal {
    private message: string;
    private onConfirm: () => void;

    constructor(app: App, message: string, onConfirm: () => void) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("switchboard-confirm-modal");
        contentEl.createEl("p", { text: this.message });

        const buttonRow = contentEl.createDiv("switchboard-confirm-buttons");

        const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
        cancelBtn.addEventListener("click", () => this.close());

        const confirmBtn = buttonRow.createEl("button", {
            text: "Delete",
            cls: "mod-warning",
        });
        confirmBtn.addEventListener("click", () => {
            this.close();
            this.onConfirm();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
