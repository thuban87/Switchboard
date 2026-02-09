import { describe, it, expect, vi } from "vitest";

/**
 * StatusBarManager.formatDuration() tests
 *
 * We test the pure formatting function in isolation by constructing
 * a StatusBarManager with a minimal mock plugin.
 */

// Mock obsidian module
vi.mock("obsidian", () => ({
    Notice: class { constructor(public message: string) { } },
    Menu: class { addItem() { return this; } addSeparator() { return this; } showAtMouseEvent() { } },
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

import { StatusBarManager } from "../src/services/StatusBarManager";

function createMockPlugin(): any {
    return {
        app: {},
        settings: {},
        addStatusBarItem: vi.fn(() => ({
            addClass: vi.fn(),
            addEventListener: vi.fn(),
            empty: vi.fn(),
            createSpan: vi.fn(() => ({ style: {} })),
            style: {},
        })),
        getActiveLine: vi.fn(() => null),
        sessionLogger: { getCurrentDuration: vi.fn(() => 0) },
        currentGoal: null,
        missedCalls: [],
    };
}

describe("StatusBarManager.formatDuration", () => {
    it("formats minutes only", () => {
        const manager = new StatusBarManager(createMockPlugin());
        expect(manager.formatDuration(45)).toBe("45m");
    });

    it("formats hours and minutes", () => {
        const manager = new StatusBarManager(createMockPlugin());
        expect(manager.formatDuration(125)).toBe("2h 5m");
    });

    it("formats exact hours without minutes", () => {
        const manager = new StatusBarManager(createMockPlugin());
        expect(manager.formatDuration(120)).toBe("2h");
    });

    it("formats zero minutes", () => {
        const manager = new StatusBarManager(createMockPlugin());
        expect(manager.formatDuration(0)).toBe("0m");
    });
});
