/**
 * DashboardView Tests (Phase 3 + Phase H)
 * Verifies DOM output for each section of the Operator Dashboard.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DashboardView, DASHBOARD_VIEW_TYPE } from "../../src/views/DashboardView";
import { WorkspaceLeaf } from "../__mocks__/obsidian";
import { createTestLine, createTestSession } from "../helpers";

// Mock Logger to silence output
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

function createMockPlugin(overrides: Record<string, any> = {}) {
    return {
        settings: {
            lines: [],
            activeLine: null,
            sessionHistory: [],
            ...overrides,
        },
        getActiveLine: vi.fn(() => null),
        sessionLogger: {
            getCurrentDuration: vi.fn(() => 0),
        },
        currentGoal: null as string | null,
        disconnect: vi.fn(),
        patchInWithGoal: vi.fn(),
        ...overrides,
    };
}

describe("render — no active session", () => {
    it("shows 'Not connected' text in session card", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin();
        const view = new DashboardView(leaf as any, plugin as any);

        // Render into contentEl
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("Not connected");
    });

    it("shows 'No lines configured' when lines array is empty", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines: [] });
        const view = new DashboardView(leaf as any, plugin as any);

        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("No lines configured");
    });
});

describe("render — active session", () => {
    it("shows active line name and disconnect button", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140", color: "#3498db" });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            activeLine: "math",
        });
        plugin.getActiveLine = vi.fn(() => testLine);

        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("Math 140");
        expect(text).toContain("Disconnect");
    });

    it("shows goal text when currentGoal is set", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140" });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            activeLine: "math",
        });
        plugin.getActiveLine = vi.fn(() => testLine);
        plugin.currentGoal = "Finish chapter 5 homework";

        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("Finish chapter 5 homework");
    });
});

describe("render — recent sessions", () => {
    it("shows last 5 sessions from history, newest first", () => {
        const sessions = [
            createTestSession({ lineName: "Session A", date: "2026-02-06", durationMinutes: 30 }),
            createTestSession({ lineName: "Session B", date: "2026-02-07", durationMinutes: 45 }),
            createTestSession({ lineName: "Session C", date: "2026-02-08", durationMinutes: 60 }),
            createTestSession({ lineName: "Session D", date: "2026-02-09", durationMinutes: 20 }),
            createTestSession({ lineName: "Session E", date: "2026-02-10", durationMinutes: 90 }),
            createTestSession({ lineName: "Session F", date: "2026-02-11", durationMinutes: 15 }),
        ];

        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ sessionHistory: sessions });
        const view = new DashboardView(leaf as any, plugin as any);

        (view as any).render();

        const text = (view as any).contentEl.textContent;
        // Should contain the last 5 (B through F), not A
        expect(text).toContain("Session F");
        expect(text).toContain("Session E");
        expect(text).toContain("Session D");
        expect(text).toContain("Session C");
        expect(text).toContain("Session B");
        // Session A is the 6th oldest — should be excluded
        expect(text).not.toContain("Session A");
    });
});

// ──────────── Phase H: Lifecycle & Interactivity ────────────

describe("lifecycle", () => {
    it("getViewType returns DASHBOARD_VIEW_TYPE constant", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin();
        const view = new DashboardView(leaf as any, plugin as any);

        expect(view.getViewType()).toBe(DASHBOARD_VIEW_TYPE);
        expect(view.getViewType()).toBe("switchboard-dashboard");
    });

    it("getDisplayText returns 'Switchboard'", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin();
        const view = new DashboardView(leaf as any, plugin as any);

        expect(view.getDisplayText()).toBe("Switchboard");
    });

    it("getIcon returns 'plug'", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin();
        const view = new DashboardView(leaf as any, plugin as any);

        expect(view.getIcon()).toBe("plug");
    });

    it("refresh calls render", () => {
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin();
        const view = new DashboardView(leaf as any, plugin as any);

        const renderSpy = vi.spyOn(view as any, "render");
        view.refresh();

        expect(renderSpy).toHaveBeenCalledOnce();
    });
});

describe("renderLinesGrid — interactivity", () => {
    it("clicking patch-in button calls patchInWithGoal", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140", color: "#3498db" });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            activeLine: null, // Not active, so patch-in button should show
        });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        // Find the "→" button
        const btn = (view as any).contentEl.querySelector(".switchboard-dashboard-line-btn");
        expect(btn).not.toBeNull();

        btn.click();
        expect(plugin.patchInWithGoal).toHaveBeenCalledWith(testLine);
    });

    it("active line shows '●' instead of patch-in button", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140" });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            activeLine: "math",
        });
        plugin.getActiveLine = vi.fn(() => testLine);
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("●");

        // No patch-in button for active line
        const btn = (view as any).contentEl.querySelector(".switchboard-dashboard-line-btn");
        expect(btn).toBeNull();
    });

    it("renders all lines from settings", () => {
        const lines = [
            createTestLine({ id: "math", name: "Math 140", color: "#3498db" }),
            createTestLine({ id: "writing", name: "Writing", color: "#e74c3c" }),
            createTestLine({ id: "bio", name: "Bio 101", color: "#2ecc71" }),
        ];
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("Math 140");
        expect(text).toContain("Writing");
        expect(text).toContain("Bio 101");
    });
});

describe("renderSchedule", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows today's recurring blocks", () => {
        vi.useFakeTimers();
        // Set to a Thursday (dayOfWeek = 4)
        vi.setSystemTime(new Date(2026, 1, 12, 10, 0, 0)); // Feb 12, 2026 is a Thursday

        const testLine = createTestLine({
            id: "math",
            name: "Math 140",
            scheduledBlocks: [
                { id: "block-1", startTime: "09:00", endTime: "10:30", recurring: true, days: [4] }, // Thursday
            ],
        });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines: [testLine] });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("09:00 - 10:30");
        expect(text).toContain("Math 140");
    });

    it("shows today's one-time blocks", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 12, 10, 0, 0)); // Feb 12, 2026

        const testLine = createTestLine({
            id: "bio",
            name: "Bio 101",
            scheduledBlocks: [
                { id: "block-2", startTime: "14:00", endTime: "15:00", date: "2026-02-12" },
            ],
        });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines: [testLine] });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("14:00 - 15:00");
        expect(text).toContain("Bio 101");
    });

    it("shows 'No scheduled blocks today' when empty", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 12, 10, 0, 0));

        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines: [] });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        expect(text).toContain("No scheduled blocks today");
    });

    it("sorts blocks by start time", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 12, 10, 0, 0)); // Thursday

        const lines = [
            createTestLine({
                id: "writing",
                name: "Writing",
                scheduledBlocks: [
                    { id: "block-late", startTime: "14:00", endTime: "15:00", recurring: true, days: [4] },
                ],
            }),
            createTestLine({
                id: "math",
                name: "Math 140",
                scheduledBlocks: [
                    { id: "block-early", startTime: "08:00", endTime: "09:30", recurring: true, days: [4] },
                ],
            }),
        ];
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({ lines });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const text = (view as any).contentEl.textContent;
        // Math (08:00) should appear before Writing (14:00)
        const mathIdx = text.indexOf("08:00");
        const writingIdx = text.indexOf("14:00");
        expect(mathIdx).toBeLessThan(writingIdx);
    });
});

describe("renderCurrentSession — interactivity", () => {
    it("clicking disconnect button calls plugin.disconnect()", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140", color: "#3498db" });
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            activeLine: "math",
        });
        plugin.getActiveLine = vi.fn(() => testLine);
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        const btn = (view as any).contentEl.querySelector(".switchboard-session-card-disconnect");
        expect(btn).not.toBeNull();

        btn.click();
        expect(plugin.disconnect).toHaveBeenCalledOnce();
    });
});

describe("renderRecentSessions — edge cases", () => {
    it("shows color from matching line", () => {
        const testLine = createTestLine({ id: "math", name: "Math 140", color: "#3498db" });
        const sessions = [
            createTestSession({ lineId: "math", lineName: "Math 140", durationMinutes: 60 }),
        ];
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [testLine],
            sessionHistory: sessions,
        });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        // The recent session item should have --line-color set
        const recentItem = (view as any).contentEl.querySelector(".switchboard-dashboard-recent-item");
        expect(recentItem).not.toBeNull();
        expect(recentItem.style.getPropertyValue("--line-color")).toBe("#3498db");
    });

    it("handles deleted line (no color)", () => {
        const sessions = [
            createTestSession({ lineId: "deleted-line", lineName: "Old Course", durationMinutes: 45 }),
        ];
        const leaf = new WorkspaceLeaf();
        const plugin = createMockPlugin({
            lines: [], // No lines — the session's line has been deleted
            sessionHistory: sessions,
        });
        const view = new DashboardView(leaf as any, plugin as any);
        (view as any).render();

        // Should render without error
        const text = (view as any).contentEl.textContent;
        expect(text).toContain("Old Course");

        // --line-color should NOT be set (no matching line)
        const recentItem = (view as any).contentEl.querySelector(".switchboard-dashboard-recent-item");
        expect(recentItem.style.getPropertyValue("--line-color")).toBe("");
    });
});
