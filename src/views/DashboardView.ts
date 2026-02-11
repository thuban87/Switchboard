import { ItemView, WorkspaceLeaf } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine, ScheduledBlock, formatDuration } from "../types";

export const DASHBOARD_VIEW_TYPE = "switchboard-dashboard";

/**
 * Operator Dashboard - Sidebar view showing current session, Lines, and schedule
 */
export class DashboardView extends ItemView {
    plugin: SwitchboardPlugin;


    constructor(leaf: WorkspaceLeaf, plugin: SwitchboardPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return DASHBOARD_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Switchboard";
    }

    getIcon(): string {
        return "plug";
    }

    async onOpen() {
        this.containerEl.addClass("switchboard-dashboard-view");
        this.render();

        // Refresh every 30 seconds to update timer
        // registerInterval() auto-cleans on view close AND plugin unload
        this.registerInterval(
            window.setInterval(() => {
                this.render();
            }, 30000)
        );
    }

    async onClose() {
        // Interval is auto-cleaned by registerInterval()
    }

    /**
     * Re-renders the dashboard (called by plugin when context changes)
     */
    refresh() {
        this.render();
    }

    private render() {
        // Fix #33: Use contentEl if available (Obsidian ItemView internal), fall back to children[1]
        // Internal Obsidian API — ItemView exposes contentEl but it's not in the public type definitions
        const container = ((this as any).contentEl || this.containerEl.children[1]) as HTMLElement;
        if (!container) return;
        container.empty();
        container.addClass("switchboard-dashboard-container");

        // Current Session Card
        this.renderCurrentSession(container);

        // Lines Grid
        this.renderLinesGrid(container);

        // Today's Schedule
        this.renderSchedule(container);

        // Recent Sessions
        this.renderRecentSessions(container);
    }

    private renderCurrentSession(container: HTMLElement) {
        const section = container.createDiv("switchboard-dashboard-section");
        section.createEl("h3", { text: "Current Session", cls: "switchboard-dashboard-section-title" });

        const card = section.createDiv("switchboard-dashboard-session-card");
        const activeLine = this.plugin.getActiveLine();

        if (activeLine) {
            // Color stripe
            const stripe = card.createDiv("switchboard-session-card-stripe");

            // Content
            const content = card.createDiv("switchboard-session-card-content");

            // Line name
            const nameRow = content.createDiv("switchboard-session-card-name-row");
            const dot = nameRow.createSpan("switchboard-session-card-dot");
            nameRow.createSpan({ text: activeLine.name, cls: "switchboard-session-card-name" });

            // Set --line-color on card so stripe + dot inherit it
            card.style.setProperty("--line-color", activeLine.color);

            // Timer
            const duration = this.plugin.sessionLogger.getCurrentDuration();
            const durationStr = formatDuration(duration);
            content.createDiv({ text: `⏱️ ${durationStr}`, cls: "switchboard-session-card-timer" });

            // Goal if set
            if (this.plugin.currentGoal) {
                content.createDiv({ text: `🎯 ${this.plugin.currentGoal}`, cls: "switchboard-session-card-goal" });
            }

            // Disconnect button
            const disconnectBtn = content.createEl("button", {
                text: "🔌 Disconnect",
                cls: "switchboard-session-card-disconnect",
            });
            disconnectBtn.addEventListener("click", () => {
                this.plugin.disconnect();
            });

            card.addClass("is-active");
        } else {
            card.createDiv({ text: "Not connected", cls: "switchboard-session-card-empty" });
            card.addClass("is-inactive");
        }
    }

    private renderLinesGrid(container: HTMLElement) {
        const section = container.createDiv("switchboard-dashboard-section");
        section.createEl("h3", { text: "Lines", cls: "switchboard-dashboard-section-title" });

        const grid = section.createDiv("switchboard-dashboard-lines-grid");
        const lines = this.plugin.settings.lines;
        const activeLine = this.plugin.settings.activeLine;

        if (lines.length === 0) {
            grid.createDiv({ text: "No lines configured", cls: "switchboard-dashboard-empty" });
            return;
        }

        for (const line of lines) {
            const isActive = line.id === activeLine;
            const lineEl = grid.createDiv("switchboard-dashboard-line-item");
            if (isActive) lineEl.addClass("is-active");

            // Color dot
            const dot = lineEl.createDiv("switchboard-dashboard-line-dot");
            lineEl.style.setProperty("--line-color", line.color);

            // Name
            lineEl.createSpan({ text: line.name, cls: "switchboard-dashboard-line-name" });

            // Action button
            if (!isActive) {
                const btn = lineEl.createEl("button", {
                    text: "→",
                    cls: "switchboard-dashboard-line-btn",
                });
                btn.setAttribute("aria-label", `Patch into ${line.name}`);
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.plugin.patchInWithGoal(line);
                });
            } else {
                lineEl.createSpan({ text: "●", cls: "switchboard-dashboard-line-active" });
            }
        }
    }

    private renderSchedule(container: HTMLElement) {
        const section = container.createDiv("switchboard-dashboard-section");
        section.createEl("h3", { text: "Today's Schedule", cls: "switchboard-dashboard-section-title" });

        const scheduleContainer = section.createDiv("switchboard-dashboard-schedule");
        const today = new Date();
        const dayOfWeek = today.getDay();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const todayBlocks: Array<{ line: SwitchboardLine; block: ScheduledBlock }> = [];

        for (const line of this.plugin.settings.lines) {
            for (const block of line.scheduledBlocks) {
                // Check recurring blocks
                if (block.recurring && block.days?.includes(dayOfWeek)) {
                    todayBlocks.push({ line, block });
                }
                // Check one-time blocks
                else if (block.date === todayStr) {
                    todayBlocks.push({ line, block });
                }
            }
        }

        // Sort by start time
        todayBlocks.sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));

        if (todayBlocks.length === 0) {
            scheduleContainer.createDiv({ text: "No scheduled blocks today", cls: "switchboard-dashboard-empty" });
            return;
        }

        for (const { line, block } of todayBlocks) {
            const blockEl = scheduleContainer.createDiv("switchboard-dashboard-schedule-block");

            const dot = blockEl.createSpan("switchboard-dashboard-schedule-dot");
            blockEl.style.setProperty("--line-color", line.color);

            blockEl.createSpan({
                text: `${block.startTime} - ${block.endTime}`,
                cls: "switchboard-dashboard-schedule-time"
            });
            blockEl.createSpan({ text: line.name, cls: "switchboard-dashboard-schedule-name" });
        }
    }

    private renderRecentSessions(container: HTMLElement) {
        const section = container.createDiv("switchboard-dashboard-section");
        section.createEl("h3", { text: "Recent Sessions", cls: "switchboard-dashboard-section-title" });

        const recentContainer = section.createDiv("switchboard-dashboard-recent");
        const history = this.plugin.settings.sessionHistory;

        if (history.length === 0) {
            recentContainer.createDiv({ text: "No sessions recorded", cls: "switchboard-dashboard-empty" });
            return;
        }

        // Get last 5 sessions
        const recentSessions = [...history].reverse().slice(0, 5);

        for (const session of recentSessions) {
            const sessionEl = recentContainer.createDiv("switchboard-dashboard-recent-item");

            // Find the line for color (may not exist if deleted)
            const line = this.plugin.settings.lines.find(l => l.id === session.lineId);
            const dot = sessionEl.createSpan("switchboard-dashboard-recent-dot");
            if (line?.color) {
                sessionEl.style.setProperty("--line-color", line.color);
            }

            sessionEl.createSpan({ text: session.lineName, cls: "switchboard-dashboard-recent-name" });
            sessionEl.createSpan({
                text: `${session.date} • ${formatDuration(session.durationMinutes)}`,
                cls: "switchboard-dashboard-recent-info"
            });
        }
    }


}
