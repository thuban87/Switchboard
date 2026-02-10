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
        scheduleAutoDisconnect: vi.fn(),
        ...overrides,
    };
}
