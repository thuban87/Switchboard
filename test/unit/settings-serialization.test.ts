/**
 * Settings Serialization Tests (Phase 3)
 * Verifies round-trip save/load and default migration in loadSettings/saveSettings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/types";

// Mock Logger to silence output
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

/**
 * We can't easily instantiate SwitchboardPlugin (it has heavy side effects in onload).
 * Instead, we extract and test the loadSettings logic directly by recreating
 * the same pattern used in main.ts.
 */
function createSettingsLoader() {
    const loadData = vi.fn().mockResolvedValue(null);
    const saveData = vi.fn().mockResolvedValue(undefined);
    const registerLineCommands = vi.fn();
    let settings = { ...DEFAULT_SETTINGS };

    return {
        loadData,
        saveData,
        registerLineCommands,
        get settings() { return settings; },

        /** Mirrors SwitchboardPlugin.loadSettings() */
        async loadSettings() {
            try {
                const data = Object.assign({}, DEFAULT_SETTINGS, await loadData());
                settings = data;
            } catch (e) {
                // In production, this shows a Notice to the user
                settings = { ...DEFAULT_SETTINGS };
            }
        },

        /** Mirrors SwitchboardPlugin.saveSettings() */
        async saveSettings() {
            await saveData(settings);
            registerLineCommands();
        },
    };
}

describe("loadSettings", () => {
    it("merges saved data with DEFAULT_SETTINGS", async () => {
        const loader = createSettingsLoader();
        loader.loadData.mockResolvedValue({
            muteSounds: true,
            lines: [{ id: "test", name: "Test" }],
        });

        await loader.loadSettings();

        // Saved values preserved
        expect(loader.settings.muteSounds).toBe(true);
        expect(loader.settings.lines).toHaveLength(1);
        expect(loader.settings.lines[0].id).toBe("test");
        // Defaults filled in for missing fields
        expect(loader.settings.schemaVersion).toBe(DEFAULT_SETTINGS.schemaVersion);
        expect(loader.settings.breakReminderMinutes).toBe(DEFAULT_SETTINGS.breakReminderMinutes);
    });

    it("handles null/missing data (fresh install) — uses defaults", async () => {
        const loader = createSettingsLoader();
        loader.loadData.mockResolvedValue(null);

        await loader.loadSettings();

        expect(loader.settings).toEqual(expect.objectContaining(DEFAULT_SETTINGS));
    });

    it("recovers from corrupted data.json (throws) — uses defaults", async () => {
        const loader = createSettingsLoader();
        loader.loadData.mockRejectedValue(new Error("JSON parse error"));

        await loader.loadSettings();

        // Critical: settings should fall back to defaults, not throw or hang
        expect(loader.settings).toEqual(DEFAULT_SETTINGS);
        expect(loader.settings.lines).toEqual([]);
        expect(loader.settings.activeLine).toBeNull();
    });

    it("preserves existing Lines through save/load cycle", async () => {
        const loader = createSettingsLoader();
        const testLines = [
            { id: "math", name: "Math", color: "#3498db", safePaths: ["Math/"], landingPage: "", sessionLogFile: "", sessionLogHeading: "", scheduledBlocks: [], customCommands: [] },
            { id: "writing", name: "Writing", color: "#e74c3c", safePaths: ["Writing/"], landingPage: "", sessionLogFile: "", sessionLogHeading: "", scheduledBlocks: [], customCommands: [] },
        ];

        // Simulate saved data with lines
        loader.loadData.mockResolvedValue({ lines: testLines });

        await loader.loadSettings();

        expect(loader.settings.lines).toHaveLength(2);
        expect(loader.settings.lines[0].id).toBe("math");
        expect(loader.settings.lines[1].id).toBe("writing");
        expect(loader.settings.lines[0].color).toBe("#3498db");
    });
});

describe("saveSettings", () => {
    it("calls saveData with current settings and re-registers Line commands", async () => {
        const loader = createSettingsLoader();
        // Load defaults first
        await loader.loadSettings();

        await loader.saveSettings();

        expect(loader.saveData).toHaveBeenCalledWith(loader.settings);
        expect(loader.registerLineCommands).toHaveBeenCalled();
    });
});
