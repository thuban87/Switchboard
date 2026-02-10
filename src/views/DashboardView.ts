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
        container.addClass("dashboard-container");

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
        const section = container.createDiv("dashboard-section");
        section.createEl("h3", { text: "Current Session", cls: "dashboard-section-title" });

        const card = section.createDiv("dashboard-session-card");
        const activeLine = this.plugin.getActiveLine();

        if (activeLine) {
            // Color stripe
            const stripe = card.createDiv("session-card-stripe");
            stripe.style.backgroundColor = activeLine.color;

            // Content
            const content = card.createDiv("session-card-content");

            // Line name
            const nameRow = content.createDiv("session-card-name-row");
            const dot = nameRow.createSpan("session-card-dot");
            dot.style.backgroundColor = activeLine.color;
            nameRow.createSpan({ text: activeLine.name, cls: "session-card-name" });

            // Timer
            const duration = this.plugin.sessionLogger.getCurrentDuration();
            const durationStr = formatDuration(duration);
            content.createDiv({ text: `⏱️ ${durationStr}`, cls: "session-card-timer" });

            // Goal if set
            if (this.plugin.currentGoal) {
                content.createDiv({ text: `🎯 ${this.plugin.currentGoal}`, cls: "session-card-goal" });
            }

            // Disconnect button
            const disconnectBtn = content.createEl("button", {
                text: "🔌 Disconnect",
                cls: "session-card-disconnect",
            });
            disconnectBtn.addEventListener("click", () => {
                this.plugin.disconnect();
            });

            card.addClass("is-active");
        } else {
            card.createDiv({ text: "Not connected", cls: "session-card-empty" });
            card.addClass("is-inactive");
        }
    }

    private renderLinesGrid(container: HTMLElement) {
        const section = container.createDiv("dashboard-section");
        section.createEl("h3", { text: "Lines", cls: "dashboard-section-title" });

        const grid = section.createDiv("dashboard-lines-grid");
        const lines = this.plugin.settings.lines;
        const activeLine = this.plugin.settings.activeLine;

        if (lines.length === 0) {
            grid.createDiv({ text: "No lines configured", cls: "dashboard-empty" });
            return;
        }

        for (const line of lines) {
            const isActive = line.id === activeLine;
            const lineEl = grid.createDiv("dashboard-line-item");
            if (isActive) lineEl.addClass("is-active");

            // Color dot
            const dot = lineEl.createDiv("dashboard-line-dot");
            dot.style.backgroundColor = line.color;

            // Name
            lineEl.createSpan({ text: line.name, cls: "dashboard-line-name" });

            // Action button
            if (!isActive) {
                const btn = lineEl.createEl("button", {
                    text: "→",
                    cls: "dashboard-line-btn",
                });
                btn.setAttribute("aria-label", `Patch into ${line.name}`);
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.plugin.patchInWithGoal(line);
                });
            } else {
                lineEl.createSpan({ text: "●", cls: "dashboard-line-active" });
            }
        }
    }

    private renderSchedule(container: HTMLElement) {
        const section = container.createDiv("dashboard-section");
        section.createEl("h3", { text: "Today's Schedule", cls: "dashboard-section-title" });

        const scheduleContainer = section.createDiv("dashboard-schedule");
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
            scheduleContainer.createDiv({ text: "No scheduled blocks today", cls: "dashboard-empty" });
            return;
        }

        for (const { line, block } of todayBlocks) {
            const blockEl = scheduleContainer.createDiv("dashboard-schedule-block");

            const dot = blockEl.createSpan("dashboard-schedule-dot");
            dot.style.backgroundColor = line.color;

            blockEl.createSpan({
                text: `${block.startTime} - ${block.endTime}`,
                cls: "dashboard-schedule-time"
            });
            blockEl.createSpan({ text: line.name, cls: "dashboard-schedule-name" });
        }
    }

    private renderRecentSessions(container: HTMLElement) {
        const section = container.createDiv("dashboard-section");
        section.createEl("h3", { text: "Recent Sessions", cls: "dashboard-section-title" });

        const recentContainer = section.createDiv("dashboard-recent");
        const history = this.plugin.settings.sessionHistory;

        if (history.length === 0) {
            recentContainer.createDiv({ text: "No sessions recorded", cls: "dashboard-empty" });
            return;
        }

        // Get last 5 sessions
        const recentSessions = [...history].reverse().slice(0, 5);

        for (const session of recentSessions) {
            const sessionEl = recentContainer.createDiv("dashboard-recent-item");

            // Find the line for color (may not exist if deleted)
            const line = this.plugin.settings.lines.find(l => l.id === session.lineId);
            const color = line?.color ?? "#666";

            const dot = sessionEl.createSpan("dashboard-recent-dot");
            dot.style.backgroundColor = color;

            sessionEl.createSpan({ text: session.lineName, cls: "dashboard-recent-name" });
            sessionEl.createSpan({
                text: `${session.date} • ${formatDuration(session.durationMinutes)}`,
                cls: "dashboard-recent-info"
            });
        }
    }


}
