import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Snooze/Decline state transition tests
 *
 * WireService manages three state collections:
 * - scheduledCalls (Map): active timer IDs
 * - snoozedCalls (Map): calls that were snoozed
 * - declinedCalls (Set): calls that were declined
 *
 * Tests that require S6 fixes (#7, A1) are marked with it.skip.
 */

// Mock obsidian module
vi.mock("obsidian", () => ({
    Notice: class { constructor(public message: string, public timeout?: number) { } },
    App: class {
        plugins = { getPlugin: () => null };
    },
}));

// Mock IncomingCallModal
vi.mock("../../src/modals/IncomingCallModal", () => ({
    IncomingCallModal: class {
        constructor(...args: any[]) { }
        open() { }
    },
}));

// Mock Logger
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setDebugMode: vi.fn(),
    },
}));

import { WireService } from "../../src/services/WireService";

function createMockPlugin(): any {
    return {
        app: { plugins: { getPlugin: () => null } },
        settings: {
            chronosIntegrationEnabled: false,
            lines: [],
            defaultSnoozeMinutes: 5,
            activeLine: null,
        },
        patchIn: vi.fn(),
        disconnect: vi.fn(),
        scheduleAutoDisconnect: vi.fn(),
        missedCalls: [],
        getActiveLine: vi.fn(() => null),
    };
}

function createWireService(): { service: WireService; plugin: any } {
    const plugin = createMockPlugin();
    const service = new WireService(plugin.app, plugin);
    return { service, plugin };
}

const mockLine = {
    id: "math-140",
    name: "Math 140",
    color: "#3498db",
    safePaths: [],
    landingPage: "",
    sessionLogFile: "",
    sessionLogHeading: "",
    scheduledBlocks: [],
    customCommands: [],
};

const mockTask = {
    text: "Study calculus",
    datetime: "2026-02-09T14:00:00",
    filePath: "Tasks/math.md",
    lineNumber: 5,
    tags: ["#switchboard/math-140"],
};

describe("WireService snooze/decline state", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("decline adds taskId to declinedCalls", async () => {
        const { service } = createWireService();
        const declinedCalls = (service as any).declinedCalls as Set<string>;

        // Call handleCallAction with "decline"
        await (service as any).handleCallAction(mockTask, mockLine, "decline");

        const taskId = (service as any).generateTaskId(mockTask);
        expect(declinedCalls.has(taskId)).toBe(true);
    });

    it("hold (snooze) adds taskId to snoozedCalls", async () => {
        const { service } = createWireService();
        const snoozedCalls = (service as any).snoozedCalls as Map<string, any>;

        await (service as any).handleCallAction(mockTask, mockLine, "hold", 5);

        const taskId = (service as any).generateTaskId(mockTask);
        expect(snoozedCalls.has(taskId)).toBe(true);
    });

    it("declined task is tracked in declinedCalls set", async () => {
        const { service } = createWireService();
        const declinedCalls = (service as any).declinedCalls as Set<string>;

        await (service as any).handleCallAction(mockTask, mockLine, "decline");
        const taskId = (service as any).generateTaskId(mockTask);

        // Verify it's in the set
        expect(declinedCalls.size).toBe(1);
        expect(declinedCalls.has(taskId)).toBe(true);
    });

    // S6 Fix #7: Declining also removes from snoozedCalls (fixed)
    it("decline after snooze removes from snoozedCalls", async () => {
        const { service } = createWireService();
        const snoozedCalls = (service as any).snoozedCalls as Map<string, any>;

        // First snooze the call
        await (service as any).handleCallAction(mockTask, mockLine, "hold", 5);
        const taskId = (service as any).generateTaskId(mockTask);
        expect(snoozedCalls.has(taskId)).toBe(true);

        // Then decline it
        await (service as any).handleCallAction(mockTask, mockLine, "decline");

        // Should be removed from snoozed
        expect(snoozedCalls.has(taskId)).toBe(false);
    });

    // S6 Fix A1: stop() clears snoozedCalls and declinedCalls (fixed)
    it("stop() clears all state including snoozed and declined", async () => {
        const { service } = createWireService();

        // Add some state
        await (service as any).handleCallAction(mockTask, mockLine, "hold", 5);
        await (service as any).handleCallAction(
            { ...mockTask, text: "Another task" },
            mockLine,
            "decline",
        );

        // Set isRunning so stop() doesn't early-return
        (service as any).isRunning = true;

        // Stop should clear everything
        service.stop();

        const snoozedCalls = (service as any).snoozedCalls as Map<string, any>;
        const declinedCalls = (service as any).declinedCalls as Set<string>;

        expect(snoozedCalls.size).toBe(0);
        expect(declinedCalls.size).toBe(0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });
});
