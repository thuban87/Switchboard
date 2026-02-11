import { App, Modal, Notice, Setting } from "obsidian";
import type SwitchboardPlugin from "../main";
import { ConfirmModal } from "./ConfirmModal";
import { SessionRecord, SwitchboardLine, formatDuration } from "../types";

/**
 * SessionEditorModal - Browse and edit session history
 */
export class SessionEditorModal extends Modal {
    private plugin: SwitchboardPlugin;
    private selectedSession: SessionRecord | null = null;
    private selectedIndex: number = -1;

    constructor(app: App, plugin: SwitchboardPlugin) {
        super(app);
        this.plugin = plugin;
    }

    /** Renders the session history list with edit/delete actions per session */
    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.addClass("switchboard-session-editor-modal");

        this.renderSessionList();
    }

    private renderSessionList() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl("h2", { text: "Session History" });

        const history = this.plugin.settings.sessionHistory || [];

        if (history.length === 0) {
            contentEl.createEl("p", {
                text: "No sessions recorded yet.",
                cls: "switchboard-session-editor-empty"
            });
            return;
        }

        // Group by line
        const byLine: Record<string, { line: SwitchboardLine | null; sessions: { record: SessionRecord; index: number }[] }> = {};

        history.forEach((session, index) => {
            if (!byLine[session.lineId]) {
                const line = this.plugin.settings.lines.find(l => l.id === session.lineId) || null;
                byLine[session.lineId] = { line, sessions: [] };
            }
            byLine[session.lineId].sessions.push({ record: session, index });
        });

        // Sort lines by most recent session
        const sortedLines = Object.entries(byLine).sort((a, b) => {
            const aLatest = a[1].sessions[a[1].sessions.length - 1].record.date;
            const bLatest = b[1].sessions[b[1].sessions.length - 1].record.date;
            return bLatest.localeCompare(aLatest);
        });

        const listEl = contentEl.createDiv("switchboard-session-editor-list");

        for (const [lineId, data] of sortedLines) {
            const lineEl = listEl.createDiv("switchboard-session-editor-line");

            // Line header (collapsible)
            const headerEl = lineEl.createDiv("switchboard-session-editor-line-header");
            const dot = headerEl.createSpan("switchboard-session-editor-dot");
            if (data.line?.color) {
                lineEl.style.setProperty("--line-color", data.line.color);
            }

            const lineName = data.line?.name || data.sessions[0].record.lineName;
            const totalMins = data.sessions.reduce((sum, s) => sum + s.record.durationMinutes, 0);
            headerEl.createSpan({ text: `${lineName} (${data.sessions.length} sessions, ${formatDuration(totalMins)})` });

            const expandIcon = headerEl.createSpan({ text: "▶", cls: "switchboard-session-editor-expand" });

            // Sessions container (hidden by default)
            const sessionsEl = lineEl.createDiv("switchboard-session-editor-sessions");
            sessionsEl.addClass("switchboard-hidden");

            headerEl.addEventListener("click", () => {
                const isHidden = sessionsEl.hasClass("switchboard-hidden");
                if (isHidden) {
                    sessionsEl.removeClass("switchboard-hidden");
                } else {
                    sessionsEl.addClass("switchboard-hidden");
                }
                expandIcon.textContent = isHidden ? "▼" : "▶";
            });

            // Render sessions (newest first)
            const sortedSessions = [...data.sessions].reverse();
            for (const { record, index } of sortedSessions) {
                const sessionEl = sessionsEl.createDiv("switchboard-session-editor-session");

                const infoEl = sessionEl.createDiv("switchboard-session-editor-session-info");
                infoEl.createEl("span", {
                    text: `${record.date} • ${record.startTime} - ${record.endTime}`,
                    cls: "switchboard-session-editor-session-date"
                });
                infoEl.createEl("span", {
                    text: formatDuration(record.durationMinutes),
                    cls: "switchboard-session-editor-session-duration"
                });

                if (record.summary) {
                    infoEl.createEl("div", {
                        text: record.summary,
                        cls: "switchboard-session-editor-session-summary"
                    });
                }

                const actionsEl = sessionEl.createDiv("switchboard-session-editor-session-actions");

                const editBtn = actionsEl.createEl("button", { text: "✏️", cls: "switchboard-session-btn-edit" });
                editBtn.title = "Edit session";
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.showEditForm(record, index);
                });

                const deleteBtn = actionsEl.createEl("button", { text: "🗑️", cls: "switchboard-session-btn-delete" });
                deleteBtn.title = "Delete session";
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.deleteSession(index);
                });
            }
        }
    }

    private showEditForm(record: SessionRecord, index: number) {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Edit Session" });

        // Line selector
        new Setting(contentEl)
            .setName("Line")
            .addDropdown((dropdown) => {
                for (const line of this.plugin.settings.lines) {
                    dropdown.addOption(line.id, line.name);
                }
                dropdown.setValue(record.lineId);
                dropdown.onChange((value) => {
                    record.lineId = value;
                    const line = this.plugin.settings.lines.find(l => l.id === value);
                    record.lineName = line?.name || record.lineName;
                });
            });

        // Date
        new Setting(contentEl)
            .setName("Date")
            .addText((text) => {
                text.setValue(record.date);
                text.inputEl.type = "date";
                text.onChange((value) => {
                    record.date = value;
                });
            });

        // Start time
        new Setting(contentEl)
            .setName("Start Time")
            .addText((text) => {
                text.setValue(record.startTime);
                text.inputEl.type = "time";
                text.onChange((value) => {
                    record.startTime = value;
                    this.recalculateDuration(record);
                });
            });

        // End time
        new Setting(contentEl)
            .setName("End Time")
            .addText((text) => {
                text.setValue(record.endTime);
                text.inputEl.type = "time";
                text.onChange((value) => {
                    record.endTime = value;
                    this.recalculateDuration(record);
                });
            });

        // Buttons
        const buttonEl = contentEl.createDiv("switchboard-session-editor-buttons");

        const cancelBtn = buttonEl.createEl("button", { text: "Cancel" });
        cancelBtn.addEventListener("click", () => {
            this.renderSessionList();
        });

        const saveBtn = buttonEl.createEl("button", { text: "Save", cls: "mod-cta" });
        saveBtn.addEventListener("click", async () => {
            this.plugin.settings.sessionHistory[index] = record;
            await this.plugin.saveSettings();
            new Notice("✅ Session updated");
            this.renderSessionList();
        });
    }

    private recalculateDuration(record: SessionRecord) {
        const [startH, startM] = record.startTime.split(":").map(Number);
        const [endH, endM] = record.endTime.split(":").map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60; // midnight crossing
        record.durationMinutes = Math.max(0, Math.round(duration));
    }

    private deleteSession(index: number) {
        new ConfirmModal(
            this.app,
            "Delete this session? This cannot be undone.",
            async () => {
                this.plugin.settings.sessionHistory.splice(index, 1);
                await this.plugin.saveSettings();
                new Notice("🗑️ Session deleted");
                this.renderSessionList();
            }
        ).open();
    }



    /** Cleans up modal content */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
