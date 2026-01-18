import { App, Modal, Notice, Setting } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SessionRecord, SwitchboardLine } from "../types";

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

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.addClass("switchboard-session-editor-modal");

        this.renderSessionList();
    }

    private renderSessionList() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl("h2", { text: "📋 Session History" });

        const history = this.plugin.settings.sessionHistory || [];

        if (history.length === 0) {
            contentEl.createEl("p", {
                text: "No sessions recorded yet.",
                cls: "session-editor-empty"
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

        const listEl = contentEl.createDiv("session-editor-list");

        for (const [lineId, data] of sortedLines) {
            const lineEl = listEl.createDiv("session-editor-line");

            // Line header (collapsible)
            const headerEl = lineEl.createDiv("session-editor-line-header");
            const dot = headerEl.createSpan("session-editor-dot");
            dot.style.backgroundColor = data.line?.color || "#888";

            const lineName = data.line?.name || data.sessions[0].record.lineName;
            const totalMins = data.sessions.reduce((sum, s) => sum + s.record.durationMinutes, 0);
            headerEl.createSpan({ text: `${lineName} (${data.sessions.length} sessions, ${this.formatDuration(totalMins)})` });

            const expandIcon = headerEl.createSpan({ text: "▶", cls: "session-editor-expand" });

            // Sessions container (hidden by default)
            const sessionsEl = lineEl.createDiv("session-editor-sessions");
            sessionsEl.style.display = "none";

            headerEl.addEventListener("click", () => {
                const isHidden = sessionsEl.style.display === "none";
                sessionsEl.style.display = isHidden ? "block" : "none";
                expandIcon.textContent = isHidden ? "▼" : "▶";
            });

            // Render sessions (newest first)
            const sortedSessions = [...data.sessions].reverse();
            for (const { record, index } of sortedSessions) {
                const sessionEl = sessionsEl.createDiv("session-editor-session");

                const infoEl = sessionEl.createDiv("session-editor-session-info");
                infoEl.createEl("span", {
                    text: `${record.date} • ${record.startTime} - ${record.endTime}`,
                    cls: "session-editor-session-date"
                });
                infoEl.createEl("span", {
                    text: this.formatDuration(record.durationMinutes),
                    cls: "session-editor-session-duration"
                });

                if (record.summary) {
                    infoEl.createEl("div", {
                        text: record.summary,
                        cls: "session-editor-session-summary"
                    });
                }

                const actionsEl = sessionEl.createDiv("session-editor-session-actions");

                const editBtn = actionsEl.createEl("button", { text: "✏️", cls: "session-btn-edit" });
                editBtn.title = "Edit session";
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.showEditForm(record, index);
                });

                const deleteBtn = actionsEl.createEl("button", { text: "🗑️", cls: "session-btn-delete" });
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

        contentEl.createEl("h2", { text: "✏️ Edit Session" });

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
        const buttonEl = contentEl.createDiv("session-editor-buttons");

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
        record.durationMinutes = Math.max(0, endMins - startMins);
    }

    private async deleteSession(index: number) {
        const confirmed = confirm("Delete this session? This cannot be undone.");
        if (!confirmed) return;

        this.plugin.settings.sessionHistory.splice(index, 1);
        await this.plugin.saveSettings();
        new Notice("🗑️ Session deleted");
        this.renderSessionList();
    }

    private formatDuration(minutes: number): string {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
