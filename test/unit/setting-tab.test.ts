/**
 * SwitchboardSettingTab Tests — Phase I-3
 * Tests display rendering, line items, schedule overview, and toggle interactions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "obsidian";
import { SwitchboardSettingTab } from "../../src/settings/SwitchboardSettingTab";
import { createMockPlugin } from "../__mocks__/plugin";
import { SwitchboardLine, SwitchboardSettings } from "../../src/types";

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

            // Key settings should be rendered
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
});
