import { describe, it, expect, vi } from "vitest";

/**
 * WireService.parseTaskTime() tests
 *
 * parseTaskTime is private, so we access it via bracket notation
 * on a WireService instance with a mock plugin.
 */

// Mock obsidian module
vi.mock("obsidian", () => ({
    Notice: class { constructor(public message: string, public timeout?: number) { } },
    App: class {
        plugins = { getPlugin: () => null };
    },
}));

// Mock IncomingCallModal
vi.mock("../src/modals/IncomingCallModal", () => ({
    IncomingCallModal: class {
        constructor(...args: any[]) { }
        open() { }
    },
}));

// Mock Logger
vi.mock("../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setDebugMode: vi.fn(),
    },
}));

import { WireService } from "../src/services/WireService";

function createMockPlugin(): any {
    return {
        app: { plugins: { getPlugin: () => null } },
        settings: {
            chronosIntegrationEnabled: false,
            lines: [],
            defaultSnoozeMinutes: 5,
        },
        patchIn: vi.fn(),
        disconnect: vi.fn(),
        scheduleAutoDisconnect: vi.fn(),
        missedCalls: [],
    };
}

function createWireService(): WireService {
    const plugin = createMockPlugin();
    return new WireService(plugin.app, plugin);
}

describe("WireService.parseTaskTime", () => {
    it("parses a valid datetime field", () => {
        const service = createWireService();
        const result = (service as any).parseTaskTime({ datetime: "2026-02-09T14:30:00" });
        expect(result).toBeInstanceOf(Date);
        expect(result!.getFullYear()).toBe(2026);
        expect(result!.getMonth()).toBe(1); // February = 1
        expect(result!.getDate()).toBe(9);
    });

    it("parses date + time fields", () => {
        const service = createWireService();
        const result = (service as any).parseTaskTime({ date: "2026-02-09", time: "14:30" });
        expect(result).toBeInstanceOf(Date);
        expect(result!.getHours()).toBe(14);
        expect(result!.getMinutes()).toBe(30);
    });

    it("parses taskDate + taskTime (SyncedTaskInfo format)", () => {
        const service = createWireService();
        const result = (service as any).parseTaskTime({ taskDate: "2026-02-09", taskTime: "09:00" });
        expect(result).toBeInstanceOf(Date);
        expect(result!.getHours()).toBe(9);
    });

    it("returns null when no date fields are present", () => {
        const service = createWireService();
        const result = (service as any).parseTaskTime({});
        expect(result).toBeNull();
    });

    // S6 Fix #10/A4: parseTaskTime returns null for invalid date strings (isNaN check added)
    it("returns null for invalid date strings", () => {
        const service = createWireService();
        const result = (service as any).parseTaskTime({ datetime: "not-a-date" });
        expect(result).toBeNull();
    });
});
