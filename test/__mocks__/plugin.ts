/**
 * Mock plugin factory for integration tests (S13).
 * Creates a minimal SwitchboardPlugin-shaped object.
 */
import { vi } from "vitest";
import { App } from "./obsidian";
import { DEFAULT_SETTINGS } from "../../src/types";

export function createMockPlugin(overrides: Record<string, any> = {}) {
    return {
        app: new App(),
        settings: { ...DEFAULT_SETTINGS, sessionHistory: [] },
        saveSettings: vi.fn().mockResolvedValue(undefined),
        missedCalls: [] as any[],
        getActiveLine: vi.fn(() => null),
        patchIn: vi.fn(),
        disconnect: vi.fn(),
        scheduleAutoDisconnect: vi.fn(),
        cancelAutoDisconnect: vi.fn(),
        refreshDashboard: vi.fn(),
        // Service stubs for integration tests
        circuitManager: {
            activate: vi.fn(),
            deactivate: vi.fn(),
            isActive: vi.fn(() => false),
        },
        sessionLogger: {
            startSession: vi.fn(),
            endSession: vi.fn(() => null),
            getCurrentDuration: vi.fn(() => 0),
            logSession: vi.fn().mockResolvedValue(undefined),
            logToDailyNote: vi.fn().mockResolvedValue(undefined),
            destroy: vi.fn(),
        },
        audioService: {
            playPatchIn: vi.fn(),
            playDisconnect: vi.fn(),
            destroy: vi.fn(),
        },
        statusBarManager: {
            startTimerUpdates: vi.fn(),
            stopTimerUpdates: vi.fn(),
            update: vi.fn(),
            destroy: vi.fn(),
        },
        timerManager: {
            startBreakReminder: vi.fn(),
            stopBreakReminder: vi.fn(),
            cancelAutoDisconnect: vi.fn(),
            destroy: vi.fn(),
        },
        wireService: {
            start: vi.fn(),
            stop: vi.fn(),
        },
        currentGoal: null as string | null,
        registeredCommandIds: new Set<string>(),
        ...overrides,
    };
}
