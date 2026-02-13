/**
 * DashboardView Tests (Phase 3)
 * Verifies DOM output for each section of the Operator Dashboard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
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
