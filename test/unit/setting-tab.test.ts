/**
 * SwitchboardSettingTab Tests
 * Tests display rendering, toggle callbacks, button click handlers,
 * folder suggestions, schedule overview, and Chronos task parsing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App, TFolder, Setting } from "obsidian";
import { SwitchboardSettingTab } from "../../src/settings/SwitchboardSettingTab";
import { createMockPlugin } from "../__mocks__/plugin";
import { SwitchboardLine, SwitchboardSettings } from "../../src/types";

// Mock Logger so we can verify setDebugMode calls
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setDebugMode: vi.fn(),
    },
}));

// Mock LineEditorModal to capture constructor args and onSave callback
const mockLineEditorOpen = vi.fn();
let capturedLineEditorOnSave: ((line: SwitchboardLine) => void) | null = null;
let capturedLineEditorLine: SwitchboardLine | null = null;

vi.mock("../../src/settings/LineEditorModal", () => ({
    LineEditorModal: class {
        constructor(_app: any, line: any, onSave: any, _lines: any) {
            capturedLineEditorLine = line;
            capturedLineEditorOnSave = onSave;
        }
        open = mockLineEditorOpen;
    },
}));

// Mock ConfirmModal to capture constructor args and onConfirm callback
const mockConfirmOpen = vi.fn();
let capturedConfirmCallback: (() => void) | null = null;

vi.mock("../../src/modals/ConfirmModal", () => ({
    ConfirmModal: class {
        constructor(_app: any, _msg: string, onConfirm: () => void) {
            capturedConfirmCallback = onConfirm;
        }
        open = mockConfirmOpen;
    },
}));

import { Logger } from "../../src/services/Logger";

/** Helper: create a test line */
function makeTestLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "test-line",
        name: "Test Line",
        color: "#3498db",
        safePaths: ["Career/School"],
        landingPage: "",
        sessionLogFile: "",
        sessionLogHeading: "## Session Log",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

/**
 * Helper: extract toggle components from the rendered settings.
 * Toggles are created via Setting.addToggle — our mock stores _onChange on each toggle.
 * We find them by matching the setting name text that precedes each toggle.
 */
function findToggleBySettingName(containerEl: HTMLElement, name: string): any {
    // Each Setting creates a settingEl with a name div. The toggle is stored
    // on the Setting mock's addToggle call. We need a different approach:
    // Walk all setting-item-name elements, find the one matching, then
    // get its parent settingEl.
    // However, the toggle object isn't attached to DOM — it's created in addToggle.
    // We'll use a different strategy: collect toggles during render.
    return null; // This won't work — see the actual approach below
}

describe("SwitchboardSettingTab", () => {
    let app: App;
    let plugin: ReturnType<typeof createMockPlugin>;
    let tab: SwitchboardSettingTab;

    beforeEach(() => {
        app = new App();
        plugin = createMockPlugin({
            app,
            restartWireService: vi.fn(),
        });
        tab = new SwitchboardSettingTab(app, plugin as any);

        // Reset modal capture vars
        capturedLineEditorOnSave = null;
        capturedLineEditorLine = null;
        capturedConfirmCallback = null;
        mockLineEditorOpen.mockClear();
        mockConfirmOpen.mockClear();
    });

    // ── display() — Section rendering ───────────────────────────

    describe("display — section rendering", () => {
        it("renders section headings", () => {
            plugin.settings.lines = [];
            tab.display();

            const el = tab.containerEl;
            const text = el.textContent || "";

            expect(text).toContain("Configure Lines");
            expect(text).toContain("Schedule overview");
            expect(text).toContain("Session goals");
            expect(text).toContain("Daily note logging");
            expect(text).toContain("Sound effects");
            expect(text).toContain("Advanced");
        });

        it("renders settings controls for goals, breaks, and sounds", () => {
            plugin.settings.lines = [];
            tab.display();

            const el = tab.containerEl;
            const text = el.textContent || "";

            expect(text).toContain("Enable goal prompt");
            expect(text).toContain("Break reminder");
            expect(text).toContain("Mute sounds");
            expect(text).toContain("Sound type");
            expect(text).toContain("Debug mode");
        });

        it("shows empty state when no lines configured", () => {
            plugin.settings.lines = [];
            tab.display();

            const emptyState = tab.containerEl.querySelector(".switchboard-empty-state");
            expect(emptyState).toBeTruthy();
            expect(emptyState!.textContent).toContain("No lines configured yet");
        });
    });

    // ── renderLineItem ──────────────────────────────────────────

    describe("renderLineItem", () => {
        it("renders line item with name and color", () => {
            plugin.settings.lines = [makeTestLine({ name: "Math 140", color: "#e74c3c" })];
            tab.display();

            const lineItem = tab.containerEl.querySelector(".switchboard-line-item");
            expect(lineItem).toBeTruthy();

            const name = lineItem!.querySelector(".switchboard-line-name");
            expect(name).toBeTruthy();
            expect(name!.textContent).toBe("Math 140");

            // Check color CSS variable
            expect((lineItem as HTMLElement).style.getPropertyValue("--line-color")).toBe("#e74c3c");
        });

        it("displays safe paths joined by comma", () => {
            plugin.settings.lines = [makeTestLine({ safePaths: ["Career/School", "Notes/Math"] })];
            tab.display();

            const paths = tab.containerEl.querySelector(".switchboard-line-paths");
            expect(paths).toBeTruthy();
            expect(paths!.textContent).toBe("Career/School, Notes/Math");
        });

        it("displays 'No paths' when safePaths are empty", () => {
            plugin.settings.lines = [makeTestLine({ safePaths: [""] })];
            tab.display();

            const paths = tab.containerEl.querySelector(".switchboard-line-paths");
            expect(paths).toBeTruthy();
            expect(paths!.textContent).toBe("No paths");
        });

        it("renders edit and delete buttons with correct icons", () => {
            plugin.settings.lines = [makeTestLine()];
            tab.display();

            const lineItem = tab.containerEl.querySelector(".switchboard-line-item");
            const actions = lineItem!.querySelector(".switchboard-line-actions");
            expect(actions).toBeTruthy();

            const buttons = actions!.querySelectorAll("button");
            expect(buttons).toHaveLength(2);

            // Edit button
            expect(buttons[0].getAttribute("aria-label")).toBe("Edit");
            // Delete button
            expect(buttons[1].getAttribute("aria-label")).toBe("Delete");
        });

        it("renders multiple lines", () => {
            plugin.settings.lines = [
                makeTestLine({ id: "math", name: "Math" }),
                makeTestLine({ id: "bio", name: "Bio" }),
                makeTestLine({ id: "eng", name: "English" }),
            ];
            tab.display();

            const lineItems = tab.containerEl.querySelectorAll(".switchboard-line-item");
            expect(lineItems).toHaveLength(3);
        });
    });

    // ── renderScheduleOverview ───────────────────────────────────

    describe("renderScheduleOverview", () => {
        it("shows summary with block count", () => {
            plugin.settings.lines = [
                makeTestLine({
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3, 5] },
                    ],
                }),
            ];
            tab.display();

            const summary = tab.containerEl.querySelector(".switchboard-schedule-overview-summary");
            expect(summary).toBeTruthy();
            expect(summary!.textContent).toContain("1 scheduled");
        });

        it("counts blocks across multiple lines", () => {
            plugin.settings.lines = [
                makeTestLine({
                    id: "math",
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3] },
                        { id: "b2", startTime: "14:00", endTime: "15:00", recurring: true, days: [2] },
                    ],
                }),
                makeTestLine({
                    id: "bio",
                    scheduledBlocks: [
                        { id: "b3", startTime: "11:00", endTime: "12:00", recurring: false, date: "2026-03-15" },
                    ],
                }),
            ];
            tab.display();

            const summary = tab.containerEl.querySelector(".switchboard-schedule-overview-summary");
            expect(summary!.textContent).toContain("3 scheduled");
        });

        it("shows empty message when no blocks configured", () => {
            plugin.settings.lines = [makeTestLine({ scheduledBlocks: [] })];
            tab.display();

            const emptyMsg = tab.containerEl.querySelector(".switchboard-schedule-overview-empty");
            expect(emptyMsg).toBeTruthy();
            expect(emptyMsg!.textContent).toContain("No scheduled blocks configured");
        });

        it("renders block details with day names and times", () => {
            plugin.settings.lines = [
                makeTestLine({
                    name: "Math",
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3, 5] },
                    ],
                }),
            ];
            tab.display();

            const blockDesc = tab.containerEl.querySelector(".switchboard-schedule-overview-desc");
            expect(blockDesc).toBeTruthy();
            expect(blockDesc!.textContent).toContain("Mon");
            expect(blockDesc!.textContent).toContain("Wed");
            expect(blockDesc!.textContent).toContain("Fri");
            expect(blockDesc!.textContent).toContain("9:00 AM");
            expect(blockDesc!.textContent).toContain("10:00 AM");
        });

        it("renders line name header with color", () => {
            plugin.settings.lines = [
                makeTestLine({
                    name: "Math",
                    color: "#e74c3c",
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1] },
                    ],
                }),
            ];
            tab.display();

            const lineSection = tab.containerEl.querySelector(".switchboard-schedule-overview-line");
            expect(lineSection).toBeTruthy();
            expect((lineSection as HTMLElement).style.getPropertyValue("--line-color")).toBe("#e74c3c");

            const lineName = lineSection!.querySelector(".switchboard-schedule-overview-line-header span:last-child");
            expect(lineName).toBeTruthy();
            expect(lineName!.textContent).toBe("Math");
        });

        it("renders non-recurring block with date formatting", () => {
            plugin.settings.lines = [
                makeTestLine({
                    name: "Bio",
                    scheduledBlocks: [
                        { id: "b1", startTime: "14:00", endTime: "15:30", recurring: false, date: "2026-03-15" },
                    ],
                }),
            ];
            tab.display();

            const blockDesc = tab.containerEl.querySelector(".switchboard-schedule-overview-desc");
            expect(blockDesc).toBeTruthy();
            // Should contain formatted date (Mar 15) and times
            expect(blockDesc!.textContent).toContain("Mar");
            expect(blockDesc!.textContent).toContain("15");
            expect(blockDesc!.textContent).toContain("2:00 PM");
            expect(blockDesc!.textContent).toContain("3:30 PM");
        });

        it("skips lines with no scheduled blocks in overview", () => {
            plugin.settings.lines = [
                makeTestLine({ id: "empty", name: "Empty", scheduledBlocks: [] }),
                makeTestLine({
                    id: "math",
                    name: "Math",
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1] },
                    ],
                }),
            ];
            tab.display();

            // Only one line section should be rendered (Math, not Empty)
            const lineSections = tab.containerEl.querySelectorAll(".switchboard-schedule-overview-line");
            expect(lineSections).toHaveLength(1);
            const header = lineSections[0].querySelector(".switchboard-schedule-overview-line-header span:last-child");
            expect(header!.textContent).toBe("Math");
        });

        it("handles blocks without days array (recurring with missing days)", () => {
            plugin.settings.lines = [
                makeTestLine({
                    scheduledBlocks: [
                        { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true },
                    ],
                }),
            ];
            tab.display();

            // Should render without crashing - recurring but no days means the
            // `block.recurring && block.days` branch is false, falls to else-if
            const blockDesc = tab.containerEl.querySelector(".switchboard-schedule-overview-desc");
            expect(blockDesc).toBeTruthy();
        });
    });

    // ── Daily note logging — conditional rendering ───────────

    describe("daily note logging — conditional rendering", () => {
        it("hides folder/heading settings when logging disabled", () => {
            plugin.settings.enableDailyNoteLogging = false;
            tab.display();

            const text = tab.containerEl.textContent || "";
            expect(text).not.toContain("Daily notes folder");
            expect(text).not.toContain("Heading to log under");
        });

        it("shows folder/heading settings when logging enabled", () => {
            plugin.settings.enableDailyNoteLogging = true;
            tab.display();

            const text = tab.containerEl.textContent || "";
            expect(text).toContain("Daily notes folder");
            expect(text).toContain("Heading to log under");
        });
    });

    // ── + Add Line button ────────────────────────────────────

    describe("+ Add Line button", () => {
        it("renders the Add Line button with CTA style", () => {
            plugin.settings.lines = [];
            tab.display();

            const text = tab.containerEl.textContent || "";
            expect(text).toContain("+ Add Line");
        });
    });

    // ── Group A: Toggle onChange callbacks ────────────────────

    describe("toggle onChange callbacks", () => {
        /**
         * Collect all toggles created during display() by spying on Setting.addToggle.
         * Returns a map of setting-name → toggle object (with _onChange callback).
         */
        function collectToggles(): Map<string, any> {
            const map = new Map<string, any>();
            const origAddToggle = Setting.prototype.addToggle;

            Setting.prototype.addToggle = function (this: any, cb: any) {
                const nameEl = this.settingEl.querySelector(".setting-item-name");
                const settingName = nameEl?.textContent || "";

                const toggle = {
                    toggleEl: document.createElement("div"),
                    _value: false,
                    _onChange: null as any,
                    setValue: vi.fn(function (this: any, v: boolean) { this._value = v; return this; }),
                    onChange: vi.fn(function (this: any, fn: any) { this._onChange = fn; return this; }),
                };
                cb(toggle);

                if (settingName) {
                    map.set(settingName, toggle);
                }
                return this;
            };

            tab.display();

            // Restore original
            Setting.prototype.addToggle = origAddToggle;

            return map;
        }

        it("enableGoalPrompt toggle saves setting", async () => {
            const toggles = collectToggles();
            const toggle = toggles.get("Enable goal prompt");
            expect(toggle).toBeTruthy();
            expect(toggle._onChange).toBeTypeOf("function");

            await toggle._onChange(true);
            expect(plugin.settings.enableGoalPrompt).toBe(true);
            expect(plugin.saveSettings).toHaveBeenCalled();
        });

        it("autoDisconnect toggle saves setting", async () => {
            const toggles = collectToggles();
            const toggle = toggles.get("Auto-disconnect on block end");
            expect(toggle).toBeTruthy();

            await toggle._onChange(true);
            expect(plugin.settings.autoDisconnect).toBe(true);
            expect(plugin.saveSettings).toHaveBeenCalled();
        });

        it("daily note logging toggle saves and refreshes display", async () => {
            const toggles = collectToggles();
            const toggle = toggles.get("Log sessions to daily notes");
            expect(toggle).toBeTruthy();

            // Spy on display to verify it's called for re-render
            const displaySpy = vi.spyOn(tab, "display");

            await toggle._onChange(true);
            expect(plugin.settings.enableDailyNoteLogging).toBe(true);
            expect(plugin.saveSettings).toHaveBeenCalled();
            expect(displaySpy).toHaveBeenCalled();
        });

        it("muteSounds toggle saves setting", async () => {
            const toggles = collectToggles();
            const toggle = toggles.get("Mute sounds");
            expect(toggle).toBeTruthy();

            await toggle._onChange(true);
            expect(plugin.settings.muteSounds).toBe(true);
            expect(plugin.saveSettings).toHaveBeenCalled();
        });

        it("debugMode toggle ON calls Logger.setDebugMode and saves", async () => {
            const toggles = collectToggles();
            const toggle = toggles.get("Debug mode");
            expect(toggle).toBeTruthy();

            await toggle._onChange(true);
            expect(plugin.settings.debugMode).toBe(true);
            expect(Logger.setDebugMode).toHaveBeenCalledWith(true);
            expect(plugin.saveSettings).toHaveBeenCalled();
        });

        it("debugMode toggle OFF calls Logger.setDebugMode(false)", async () => {
            plugin.settings.debugMode = true;
            const toggles = collectToggles();
            const toggle = toggles.get("Debug mode");

            await toggle._onChange(false);
            expect(plugin.settings.debugMode).toBe(false);
            expect(Logger.setDebugMode).toHaveBeenCalledWith(false);
        });

        it("enableGoalPrompt toggle OFF saves false", async () => {
            plugin.settings.enableGoalPrompt = true;
            const toggles = collectToggles();
            const toggle = toggles.get("Enable goal prompt");

            await toggle._onChange(false);
            expect(plugin.settings.enableGoalPrompt).toBe(false);
            expect(plugin.saveSettings).toHaveBeenCalled();
        });
    });

    // ── Group B: Text/Dropdown onChange ──────────────────────

    describe("text and dropdown onChange callbacks", () => {
        it("breakReminderMinutes — valid number saves correctly", () => {
            tab.display();

            // Find the break reminder input — it's a text input whose initial value
            // matches the current breakReminderMinutes setting
            const inputs = tab.containerEl.querySelectorAll<HTMLInputElement>("input[type='text']");
            // Break reminder is the first text input
            let breakInput: HTMLInputElement | null = null;
            for (const input of inputs) {
                if (input.value === plugin.settings.breakReminderMinutes.toString()) {
                    breakInput = input;
                    break;
                }
            }
            expect(breakInput).toBeTruthy();

            // Simulate input change
            breakInput!.value = "45";
            breakInput!.dispatchEvent(new Event("input"));

            expect(plugin.settings.breakReminderMinutes).toBe(45);
        });

        it("breakReminderMinutes — non-numeric input defaults to 0", () => {
            tab.display();

            const inputs = tab.containerEl.querySelectorAll<HTMLInputElement>("input[type='text']");
            let breakInput: HTMLInputElement | null = null;
            for (const input of inputs) {
                if (input.value === plugin.settings.breakReminderMinutes.toString()) {
                    breakInput = input;
                    break;
                }
            }

            breakInput!.value = "abc";
            breakInput!.dispatchEvent(new Event("input"));

            expect(plugin.settings.breakReminderMinutes).toBe(0);
        });

        it("breakReminderMinutes — negative value clamped to 0", () => {
            tab.display();

            const inputs = tab.containerEl.querySelectorAll<HTMLInputElement>("input[type='text']");
            let breakInput: HTMLInputElement | null = null;
            for (const input of inputs) {
                if (input.value === plugin.settings.breakReminderMinutes.toString()) {
                    breakInput = input;
                    break;
                }
            }

            breakInput!.value = "-10";
            breakInput!.dispatchEvent(new Event("input"));

            expect(plugin.settings.breakReminderMinutes).toBe(0);
        });

        it("dailyNoteHeading — empty string falls back to default", () => {
            plugin.settings.enableDailyNoteLogging = true;
            tab.display();

            // Daily note heading is a text input with placeholder "### Switchboard Logs"
            const inputs = tab.containerEl.querySelectorAll<HTMLInputElement>("input[type='text']");
            let headingInput: HTMLInputElement | null = null;
            for (const input of inputs) {
                if (input.placeholder === "### Switchboard Logs") {
                    headingInput = input;
                    break;
                }
            }
            expect(headingInput).toBeTruthy();

            headingInput!.value = "";
            headingInput!.dispatchEvent(new Event("input"));

            expect(plugin.settings.dailyNoteHeading).toBe("### Switchboard Logs");
        });

        it("soundType dropdown — change saves correctly", () => {
            tab.display();

            const selects = tab.containerEl.querySelectorAll<HTMLSelectElement>("select");
            expect(selects.length).toBeGreaterThan(0);
            const soundSelect = selects[0]; // Only dropdown in settings

            soundSelect.value = "realistic";
            soundSelect.dispatchEvent(new Event("change"));

            expect(plugin.settings.soundType).toBe("realistic");
        });
    });

    // ── Group C: Button click handlers ──────────────────────

    describe("button click handlers", () => {
        it("Add Line button opens LineEditorModal and callback pushes new line", async () => {
            plugin.settings.lines = [];
            tab.display();

            // Find the CTA button (+ Add Line)
            const ctaBtn = tab.containerEl.querySelector("button.mod-cta") as HTMLButtonElement;
            expect(ctaBtn).toBeTruthy();
            ctaBtn.click();

            // LineEditorModal should have been opened with null (new line)
            expect(mockLineEditorOpen).toHaveBeenCalled();
            expect(capturedLineEditorLine).toBeNull();

            // Simulate saving a new line via the callback (now async)
            const newLine = makeTestLine({ id: "new", name: "New Line" });
            await capturedLineEditorOnSave!(newLine);

            expect(plugin.settings.lines).toHaveLength(1);
            expect(plugin.settings.lines[0].id).toBe("new");
            expect(plugin.saveSettings).toHaveBeenCalled();
            expect(plugin.restartWireService).toHaveBeenCalled();
        });

        it("Edit button opens LineEditorModal with line copy and updates on save", async () => {
            const line = makeTestLine({ id: "math", name: "Math" });
            plugin.settings.lines = [line];
            tab.display();

            // Find edit button (first button with aria-label "Edit")
            const editBtn = tab.containerEl.querySelector("button[aria-label='Edit']") as HTMLButtonElement;
            expect(editBtn).toBeTruthy();
            editBtn.click();

            expect(mockLineEditorOpen).toHaveBeenCalled();
            // Should pass a copy of the line (spread), not the original
            expect(capturedLineEditorLine).toEqual(line);
            expect(capturedLineEditorLine).not.toBe(line); // It's a copy

            // Simulate saving the edited line (now async)
            const updatedLine = makeTestLine({ id: "math", name: "Math 140" });
            await capturedLineEditorOnSave!(updatedLine);

            expect(plugin.settings.lines[0].name).toBe("Math 140");
            expect(plugin.saveSettings).toHaveBeenCalled();
            expect(plugin.restartWireService).toHaveBeenCalled();
        });

        it("Edit callback with stale line (id not found) is a no-op", () => {
            const line = makeTestLine({ id: "math", name: "Math" });
            plugin.settings.lines = [line];
            tab.display();

            const editBtn = tab.containerEl.querySelector("button[aria-label='Edit']") as HTMLButtonElement;
            editBtn.click();

            // Manually remove the line before the callback fires (simulates race condition)
            plugin.settings.lines = [];
            plugin.saveSettings.mockClear();

            const updatedLine = makeTestLine({ id: "math", name: "Math 140" });
            capturedLineEditorOnSave!(updatedLine);

            // Should not have saved because findIndex returned -1
            expect(plugin.saveSettings).not.toHaveBeenCalled();
        });

        it("Delete button opens ConfirmModal and confirmation removes line", async () => {
            const line = makeTestLine({ id: "math", name: "Math" });
            plugin.settings.lines = [line];
            tab.display();

            const deleteBtn = tab.containerEl.querySelector("button[aria-label='Delete']") as HTMLButtonElement;
            expect(deleteBtn).toBeTruthy();
            deleteBtn.click();

            expect(mockConfirmOpen).toHaveBeenCalled();

            // Simulate confirmation (now async)
            await capturedConfirmCallback!();

            expect(plugin.settings.lines).toHaveLength(0);
            expect(plugin.saveSettings).toHaveBeenCalled();
            expect(plugin.restartWireService).toHaveBeenCalled();
        });

        it("Delete confirmation calls restartWireService for re-sync", async () => {
            plugin.settings.lines = [
                makeTestLine({ id: "math", name: "Math" }),
                makeTestLine({ id: "bio", name: "Bio" }),
            ];
            tab.display();

            // Delete first line
            const deleteBtn = tab.containerEl.querySelector("button[aria-label='Delete']") as HTMLButtonElement;
            deleteBtn.click();
            await capturedConfirmCallback!();

            expect(plugin.settings.lines).toHaveLength(1);
            expect(plugin.settings.lines[0].id).toBe("bio");
            expect(plugin.restartWireService).toHaveBeenCalled();
        });
    });

    // ── Group D: Daily note folder suggestions ──────────────

    describe("daily note folder suggestions", () => {
        beforeEach(() => {
            plugin.settings.enableDailyNoteLogging = true;
        });

        it("input event creates suggestion popover with matching folders", () => {
            // Setup vault to return some folders
            const folder1 = Object.assign(new TFolder(), { path: "Journal/Daily" });
            const folder2 = Object.assign(new TFolder(), { path: "Journal/Weekly" });
            (app.vault.getAllLoadedFiles as any).mockReturnValue([folder1, folder2]);

            tab.display();

            const searchInput = tab.containerEl.querySelector<HTMLInputElement>("input[type='search']");
            expect(searchInput).toBeTruthy();

            searchInput!.value = "Journal";
            searchInput!.dispatchEvent(new Event("input"));

            const popover = tab.containerEl.querySelector(".switchboard-daily-note-folder-suggestions");
            expect(popover).toBeTruthy();

            const items = popover!.querySelectorAll(".suggestion-item");
            expect(items).toHaveLength(2);
        });

        it("input event with no matches creates no popover", () => {
            (app.vault.getAllLoadedFiles as any).mockReturnValue([]);

            tab.display();

            const searchInput = tab.containerEl.querySelector<HTMLInputElement>("input[type='search']");
            searchInput!.value = "nonexistent";
            searchInput!.dispatchEvent(new Event("input"));

            const popover = tab.containerEl.querySelector(".switchboard-daily-note-folder-suggestions");
            expect(popover).toBeFalsy();
        });

        it("empty input creates no popover", () => {
            const folder1 = Object.assign(new TFolder(), { path: "Journal/Daily" });
            (app.vault.getAllLoadedFiles as any).mockReturnValue([folder1]);

            tab.display();

            const searchInput = tab.containerEl.querySelector<HTMLInputElement>("input[type='search']");
            searchInput!.value = "";
            searchInput!.dispatchEvent(new Event("input"));

            const popover = tab.containerEl.querySelector(".switchboard-daily-note-folder-suggestions");
            expect(popover).toBeFalsy();
        });

        it("clicking suggestion sets value and saves", () => {
            const folder1 = Object.assign(new TFolder(), { path: "Journal/Daily" });
            (app.vault.getAllLoadedFiles as any).mockReturnValue([folder1]);

            tab.display();

            const searchInput = tab.containerEl.querySelector<HTMLInputElement>("input[type='search']");
            searchInput!.value = "Journal";
            searchInput!.dispatchEvent(new Event("input"));

            const item = tab.containerEl.querySelector(".suggestion-item") as HTMLElement;
            expect(item).toBeTruthy();
            item.click();

            expect(searchInput!.value).toBe("Journal/Daily");
            expect(plugin.settings.dailyNotesFolder).toBe("Journal/Daily");
        });

        it("subsequent input clears existing popover first", () => {
            const folder1 = Object.assign(new TFolder(), { path: "Journal/Daily" });
            (app.vault.getAllLoadedFiles as any).mockReturnValue([folder1]);

            tab.display();

            const searchInput = tab.containerEl.querySelector<HTMLInputElement>("input[type='search']");

            // First input
            searchInput!.value = "Journal";
            searchInput!.dispatchEvent(new Event("input"));

            // Second input — should replace the popover, not create two
            searchInput!.value = "Jour";
            searchInput!.dispatchEvent(new Event("input"));

            const popovers = tab.containerEl.querySelectorAll(".switchboard-daily-note-folder-suggestions");
            expect(popovers).toHaveLength(1);
        });
    });

    // ── Group E: getChronosSwitchboardTasks ──────────────────

    describe("getChronosSwitchboardTasks", () => {
        function callGetTasks(): any[] {
            return (tab as any).getChronosSwitchboardTasks();
        }

        it("returns [] when Chronos plugin not available", () => {
            (app as any).plugins = { plugins: {} };
            plugin.settings.chronosIntegrationEnabled = true;

            expect(callGetTasks()).toEqual([]);
        });

        it("returns [] when chronosIntegrationEnabled is false", () => {
            (app as any).plugins = {
                plugins: { "chronos-google-calendar-sync": { syncManager: {} } },
            };
            plugin.settings.chronosIntegrationEnabled = false;

            expect(callGetTasks()).toEqual([]);
        });

        it("parses #switchboard/line-name tag format", () => {
            const futureDate = "2099-01-01";
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "Study algebra",
                                        date: futureDate,
                                        time: "09:00",
                                        tags: ["#switchboard/math"],
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            const tasks = callGetTasks();
            expect(tasks).toHaveLength(1);
            expect(tasks[0].targetLine).toBe("math");
            expect(tasks[0].title).toBe("Study algebra");
        });

        it("parses plain #switchboard tag with /line-name in title", () => {
            const futureDate = "2099-01-01";
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "Study algebra /math",
                                        date: futureDate,
                                        tags: ["#switchboard"],
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            const tasks = callGetTasks();
            expect(tasks).toHaveLength(1);
            expect(tasks[0].targetLine).toBe("math");
            // Title should have /math stripped
            expect(tasks[0].title).toBe("Study algebra");
        });

        it("strips # prefix from tags before matching", () => {
            const futureDate = "2099-01-01";
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "Task",
                                        date: futureDate,
                                        tags: ["switchboard/writing"], // No # prefix
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            const tasks = callGetTasks();
            expect(tasks).toHaveLength(1);
            expect(tasks[0].targetLine).toBe("writing");
        });

        it("filters out past tasks", () => {
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "Old task /math",
                                        date: "2020-01-01",
                                        tags: ["#switchboard"],
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            expect(callGetTasks()).toHaveLength(0);
        });

        it("keeps today's and future tasks", () => {
            // Use a far-future date to ensure it's always "today or future"
            const futureDate = "2099-12-31";
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "Future task",
                                        date: futureDate,
                                        tags: ["#switchboard/math"],
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            expect(callGetTasks()).toHaveLength(1);
        });

        it("handles missing syncManager gracefully", () => {
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        // No syncManager
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            // Should not throw — syncedTasks defaults to empty
            expect(callGetTasks()).toHaveLength(0);
        });

        it("returns [] on error (try-catch path)", () => {
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => { throw new Error("Chronos error"); },
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            expect(callGetTasks()).toEqual([]);
            expect(Logger.error).toHaveBeenCalled();
        });

        it("skips tasks with no matching targetLine", () => {
            const futureDate = "2099-01-01";
            (app as any).plugins = {
                plugins: {
                    "chronos-google-calendar-sync": {
                        syncManager: {
                            getSyncData: () => ({
                                syncedTasks: {
                                    t1: {
                                        taskTitle: "No switchboard tag",
                                        date: futureDate,
                                        tags: ["#other-tag"],
                                        filePath: "tasks.md",
                                    },
                                },
                            }),
                        },
                    },
                },
            };
            plugin.settings.chronosIntegrationEnabled = true;

            // Task has no switchboard tag so it gets filtered by the outer filter
            expect(callGetTasks()).toHaveLength(0);
        });
    });
});
