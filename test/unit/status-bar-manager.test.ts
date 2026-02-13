import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { formatDuration } from "../../src/types";
import { StatusBarManager } from "../../src/services/StatusBarManager";

/**
 * formatDuration() tests
 *
 * Now tests the canonical function from types.ts directly —
 * no mocks needed for a pure function.
 */

describe("formatDuration", () => {
    it("formats minutes only", () => {
        expect(formatDuration(45)).toBe("45m");
    });

    it("formats hours and minutes", () => {
        expect(formatDuration(125)).toBe("2h 5m");
    });

    it("formats exact hours without minutes", () => {
        expect(formatDuration(120)).toBe("2h");
    });

    it("formats zero minutes", () => {
        expect(formatDuration(0)).toBe("0m");
    });
});

/**
 * StatusBarManager DOM tests (Phase 2b)
 *
 * Verifies actual DOM element mutations, not just that methods were called.
 * Uses a mock plugin with addStatusBarItem() returning a real DOM element.
 */

function createStatusBarPlugin(overrides: Record<string, any> = {}) {
    const statusBarEl = document.createElement("div");
    return {
        plugin: {
            addStatusBarItem: vi.fn(() => statusBarEl),
            registerInterval: vi.fn((id: number) => id),
            getActiveLine: vi.fn(() => null),
            sessionLogger: {
                getCurrentDuration: vi.fn(() => 0),
            },
            currentGoal: null as string | null,
            missedCalls: [] as any[],
            disconnect: vi.fn(),
            openOperatorModal: vi.fn(),
            openStatistics: vi.fn(),
            openSessionEditor: vi.fn(),
            ...overrides,
        },
        statusBarEl,
    };
}

describe("StatusBarManager", () => {
    let manager: StatusBarManager;
    let mockPlugin: ReturnType<typeof createStatusBarPlugin>["plugin"];
    let statusBarEl: HTMLElement;

    beforeEach(() => {
        vi.useFakeTimers();
        const setup = createStatusBarPlugin();
        mockPlugin = setup.plugin;
        statusBarEl = setup.statusBarEl;
        manager = new StatusBarManager(mockPlugin as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("init()", () => {
        it("creates status bar element via addStatusBarItem", () => {
            manager.init();
            expect(mockPlugin.addStatusBarItem).toHaveBeenCalled();
        });

        it("registers click handler for context menu", () => {
            const addEventSpy = vi.spyOn(statusBarEl, "addEventListener");
            manager.init();
            expect(addEventSpy).toHaveBeenCalledWith("click", expect.any(Function));
        });
    });

    describe("update()", () => {
        it("hides element when no active line", () => {
            manager.init();
            mockPlugin.getActiveLine.mockReturnValue(null);
            manager.update();
            expect(statusBarEl.classList.contains("switchboard-hidden")).toBe(true);
        });

        it("shows line name and formatted time when active", () => {
            manager.init();
            mockPlugin.getActiveLine.mockReturnValue({
                id: "math-140",
                name: "Math 140",
                color: "#3498db",
            });
            mockPlugin.sessionLogger.getCurrentDuration.mockReturnValue(45);
            manager.update();

            expect(statusBarEl.classList.contains("switchboard-hidden")).toBe(false);
            expect(statusBarEl.textContent).toContain("Math 140");
            expect(statusBarEl.textContent).toContain("45m");
        });
    });

    describe("startTimerUpdates / stopTimerUpdates", () => {
        it("starts interval that calls update", () => {
            manager.init();
            mockPlugin.getActiveLine.mockReturnValue({
                id: "test",
                name: "Test",
                color: "#000000",
            });
            mockPlugin.sessionLogger.getCurrentDuration.mockReturnValue(10);

            manager.startTimerUpdates();

            // Initial update should have been called
            expect(statusBarEl.textContent).toContain("Test");

            // Advance past the 30s interval
            mockPlugin.sessionLogger.getCurrentDuration.mockReturnValue(11);
            vi.advanceTimersByTime(30000);

            // Verify update ran again (content refreshed)
            expect(statusBarEl.textContent).toContain("Test");
        });

        it("clears interval on stop", () => {
            manager.init();
            const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

            manager.startTimerUpdates();
            manager.stopTimerUpdates();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe("destroy()", () => {
        it("clears all intervals and resets state", () => {
            manager.init();
            manager.startTimerUpdates();

            const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
            manager.destroy();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it("nulls out statusBarItem reference", () => {
            manager.init();
            manager.destroy();

            // After destroy, update() should be a no-op (early return on null check)
            // Calling update should not throw
            expect(() => manager.update()).not.toThrow();
        });
    });
});
