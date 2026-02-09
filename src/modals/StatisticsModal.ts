import { App, Modal, Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SessionRecord } from "../types";
import { Logger } from "../services/Logger";

/**
 * StatisticsModal - Dashboard showing session statistics
 */
export class StatisticsModal extends Modal {
    private plugin: SwitchboardPlugin;

    constructor(app: App, plugin: SwitchboardPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.addClass("switchboard-statistics-modal");

        // Header
        contentEl.createEl("div", { cls: "stats-header" }).createEl("h2", { text: "📊 Statistics" });

        const history = this.plugin.settings.sessionHistory || [];

        if (history.length === 0) {
            contentEl.createEl("p", {
                text: "No sessions recorded yet. Complete a 5+ minute session to start tracking!",
                cls: "stats-empty"
            });
            return;
        }

        // Summary cards
        this.renderSummaryCards(contentEl, history);

        // Per-line breakdown
        this.renderLineBreakdown(contentEl, history);

        // Recent sessions
        this.renderRecentSessions(contentEl, history);

        // Export button
        this.renderExportButton(contentEl, history);
    }

    private renderSummaryCards(containerEl: HTMLElement, history: SessionRecord[]) {
        const cardsEl = containerEl.createDiv("stats-cards");

        // This week stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split("T")[0];
        const weekSessions = history.filter(s => s.date >= weekStr);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

        const weekCard = cardsEl.createDiv("stats-card");
        weekCard.createEl("h3", { text: "This Week" });
        weekCard.createEl("div", { text: this.formatDuration(weekMinutes), cls: "stats-big-number" });
        weekCard.createEl("div", { text: `${weekSessions.length} sessions`, cls: "stats-subtitle" });
        if (weekSessions.length > 0) {
            weekCard.createEl("div", {
                text: `~${this.formatDuration(Math.round(weekMinutes / weekSessions.length))} avg`,
                cls: "stats-subtitle"
            });
        }

        // All time stats
        const totalMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0);
        const allCard = cardsEl.createDiv("stats-card");
        allCard.createEl("h3", { text: "All Time" });
        allCard.createEl("div", { text: this.formatDuration(totalMinutes), cls: "stats-big-number" });
        allCard.createEl("div", { text: `${history.length} sessions`, cls: "stats-subtitle" });
        if (history.length > 0) {
            allCard.createEl("div", {
                text: `~${this.formatDuration(Math.round(totalMinutes / history.length))} avg`,
                cls: "stats-subtitle"
            });
        }
    }

    private renderLineBreakdown(containerEl: HTMLElement, history: SessionRecord[]) {
        const sectionEl = containerEl.createDiv("stats-section");
        sectionEl.createEl("h3", { text: "By Line" });

        // Aggregate by line
        const byLine: Record<string, { name: string; minutes: number; color: string }> = {};
        for (const session of history) {
            if (!byLine[session.lineId]) {
                const line = this.plugin.settings.lines.find(l => l.id === session.lineId);
                byLine[session.lineId] = {
                    name: session.lineName,
                    minutes: 0,
                    color: line?.color || "#3498db",
                };
            }
            byLine[session.lineId].minutes += session.durationMinutes;
        }

        // Sort by minutes descending
        const sorted = Object.values(byLine).sort((a, b) => b.minutes - a.minutes);
        const maxMinutes = sorted[0]?.minutes || 1;

        const barsEl = sectionEl.createDiv("stats-bars");
        for (const line of sorted) {
            const barRow = barsEl.createDiv("stats-bar-row");

            const labelEl = barRow.createDiv("stats-bar-label");
            const dot = labelEl.createSpan("stats-bar-dot");
            dot.style.backgroundColor = line.color;
            labelEl.createSpan({ text: line.name });

            const barContainer = barRow.createDiv("stats-bar-container");
            const bar = barContainer.createDiv("stats-bar");
            bar.style.width = `${(line.minutes / maxMinutes) * 100}%`;
            bar.style.backgroundColor = line.color;

            barRow.createDiv({ text: this.formatDuration(line.minutes), cls: "stats-bar-value" });
        }
    }

    private renderRecentSessions(containerEl: HTMLElement, history: SessionRecord[]) {
        const sectionEl = containerEl.createDiv("stats-section");
        sectionEl.createEl("h3", { text: "Recent Sessions" });

        const listEl = sectionEl.createDiv("stats-sessions-list");

        // Show last 8 sessions, newest first
        const recent = [...history].reverse().slice(0, 8);
        for (const session of recent) {
            const itemEl = listEl.createDiv("stats-session-item");

            const line = this.plugin.settings.lines.find(l => l.id === session.lineId);
            const dot = itemEl.createSpan("stats-session-dot");
            dot.style.backgroundColor = line?.color || "#3498db";

            const infoEl = itemEl.createDiv("stats-session-info");
            infoEl.createEl("span", { text: session.lineName, cls: "stats-session-name" });
            infoEl.createEl("span", {
                text: ` • ${this.formatDate(session.date)} ${session.startTime}`,
                cls: "stats-session-date"
            });

            itemEl.createDiv({ text: this.formatDuration(session.durationMinutes), cls: "stats-session-duration" });
        }
    }

    private renderExportButton(containerEl: HTMLElement, history: SessionRecord[]) {
        const buttonEl = containerEl.createDiv("stats-export");
        const btn = buttonEl.createEl("button", { text: "📤 Export for AI Analysis", cls: "stats-export-btn" });
        btn.addEventListener("click", async () => {
            const markdown = this.generateExport(history);
            try {
                await navigator.clipboard.writeText(markdown);
                new Notice("📋 Statistics copied to clipboard!");
            } catch (e) {
                Logger.error("Statistics", "Failed to copy to clipboard:", e);
                new Notice("⚠️ Failed to copy to clipboard");
            }
        });
    }

    private generateExport(history: SessionRecord[]): string {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split("T")[0];
        const weekSessions = history.filter(s => s.date >= weekStr);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        const totalMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0);

        // By line
        const byLine: Record<string, number> = {};
        for (const s of weekSessions) {
            byLine[s.lineName] = (byLine[s.lineName] || 0) + s.durationMinutes;
        }
        const lineStats = Object.entries(byLine)
            .sort((a, b) => b[1] - a[1])
            .map(([name, mins]) => `- ${name}: ${this.formatDuration(mins)}`)
            .join("\n");

        // By day
        const byDay: Record<string, { minutes: number; lines: Set<string> }> = {};
        for (const s of weekSessions) {
            if (!byDay[s.date]) byDay[s.date] = { minutes: 0, lines: new Set() };
            byDay[s.date].minutes += s.durationMinutes;
            byDay[s.date].lines.add(s.lineName);
        }
        const dayStats = Object.entries(byDay)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, data]) => {
                const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                return `- ${dayName} (${date}): ${this.formatDuration(data.minutes)} - ${[...data.lines].join(", ")}`;
            })
            .join("\n");

        return `## Study Statistics Export
Generated: ${new Date().toLocaleDateString()}

### This Week Summary
- Total study time: ${this.formatDuration(weekMinutes)}
- Sessions: ${weekSessions.length}
- Average session: ${weekSessions.length > 0 ? this.formatDuration(Math.round(weekMinutes / weekSessions.length)) : "N/A"}

### By Subject
${lineStats || "No sessions this week"}

### Daily Breakdown
${dayStats || "No sessions this week"}

### All Time
- Total study time: ${this.formatDuration(totalMinutes)}
- Total sessions: ${history.length}

---
*Analyze my study habits. What patterns do you see? Suggestions for improvement?*`;
    }

    private formatDuration(minutes: number): string {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split("T")[0]) return "Today";
        if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
