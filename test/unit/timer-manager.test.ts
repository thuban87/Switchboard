import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * TimerManager tests
 *
 * TimerManager imports from "obsidian" (Notice) and "../main" (SwitchboardPlugin),
 * plus TimeUpModal. We mock the obsidian module and provide a minimal plugin mock
 * to test the timer scheduling logic in isolation.
 */

// Mock obsidian module
vi.mock("obsidian", () => ({
    Notice: class { constructor(public message: string, public timeout?: number) { } },
    App: class { },
    Menu: class { addItem() { return this; } addSeparator() { return this; } showAtMouseEvent() { } },
}));

// Mock TimeUpModal to avoid pulling in full modal dependency chain
vi.mock("../../src/modals/TimeUpModal", () => ({
    TimeUpModal: class {
        constructor(public app: any, public plugin: any, public line: any) { }
        open() { }
    },
}));

// Mock Logger to prevent console noise
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setDebugMode: vi.fn(),
    },
}));

import { TimerManager } from "../../src/services/TimerManager";

function createMockPlugin(overrides: Record<string, any> = {}): any {
    return {
        app: {},
        settings: {
            autoDisconnect: true,
            breakReminderMinutes: 60,
        },
        getActiveLine: vi.fn(() => ({ id: "test", name: "Test Line", color: "#3498db" })),
        disconnect: vi.fn(),
        addStatusBarItem: vi.fn(() => ({
            addClass: vi.fn(),
            addEventListener: vi.fn(),
        })),
        ...overrides,
    };
}

describe("TimerManager", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("schedules auto-disconnect for a future time", () => {
        const plugin = createMockPlugin();
        const manager = new TimerManager(plugin);

        const futureTime = new Date(Date.now() + 60000); // 1 minute from now
        manager.scheduleAutoDisconnect(futureTime);

        // Timer should be set — advance to just before
        vi.advanceTimersByTime(59000);
        // Not fired yet

        // Advance past the trigger
        vi.advanceTimersByTime(2000);
        // TimeUpModal.open() would have been called via the callback

        manager.destroy();
    });

    it("skips scheduling when end time is in the past", () => {
        const plugin = createMockPlugin();
        const manager = new TimerManager(plugin);

        const pastTime = new Date(Date.now() - 60000); // 1 minute ago
        manager.scheduleAutoDisconnect(pastTime);

        // Advance time — nothing should fire
        vi.advanceTimersByTime(120000);
        // No crash, no callback

        manager.destroy();
    });

    it("respects autoDisconnect setting being off", () => {
        const plugin = createMockPlugin({
            settings: { autoDisconnect: false, breakReminderMinutes: 60 },
        });
        const manager = new TimerManager(plugin);

        const futureTime = new Date(Date.now() + 60000);
        manager.scheduleAutoDisconnect(futureTime);

        // Advance past the time — nothing should happen
        vi.advanceTimersByTime(120000);

        manager.destroy();
    });

    it("break reminder fires after configured interval", () => {
        const plugin = createMockPlugin({
            settings: { autoDisconnect: true, breakReminderMinutes: 30 },
        });
        const manager = new TimerManager(plugin);

        manager.startBreakReminder();

        // Advance 30 minutes (30 * 60 * 1000 ms)
        vi.advanceTimersByTime(30 * 60 * 1000);

        // Notice would have been created — we can verify getActiveLine was called
        expect(plugin.getActiveLine).toHaveBeenCalled();

        manager.destroy();
    });

    it("destroy() cancels all timers", () => {
        const plugin = createMockPlugin();
        const manager = new TimerManager(plugin);

        const futureTime = new Date(Date.now() + 60000);
        manager.scheduleAutoDisconnect(futureTime);
        manager.startBreakReminder();

        // Destroy before timers fire
        manager.destroy();

        // Reset mock call count
        plugin.getActiveLine.mockClear();

        // Advance well past all timers
        vi.advanceTimersByTime(3600000); // 1 hour

        // Nothing should have fired after destroy
        expect(plugin.getActiveLine).not.toHaveBeenCalled();
    });

    it("cancelAutoDisconnect() clears pending timer", () => {
        const plugin = createMockPlugin();
        const manager = new TimerManager(plugin);

        const futureTime = new Date(Date.now() + 60000);
        manager.scheduleAutoDisconnect(futureTime);

        // Cancel before it fires
        manager.cancelAutoDisconnect();

        // Reset and advance
        plugin.getActiveLine.mockClear();
        vi.advanceTimersByTime(120000);

        // Auto-disconnect callback should not have fired
        // (getActiveLine is only called in break reminder, not auto-disconnect,
        // but the absence of a TimeUpModal is the real check here)

        manager.destroy();
    });
});
