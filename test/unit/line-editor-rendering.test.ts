/**
 * LineEditorModal Rendering Tests — Phase I-2
 * Tests rendering and basic interactions for the Line editor modal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "obsidian";
import { LineEditorModal } from "../../src/settings/LineEditorModal";
import { PRESET_COLORS, SwitchboardLine } from "../../src/types";

/** Helper: create a fully-populated test line */
function makeTestLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "test-line",
        name: "Test Line",
        color: "#3498db",
        safePaths: ["Career/School"],
        landingPage: "Notes/Dashboard.md",
        sessionLogFile: "Logs/test.md",
        sessionLogHeading: "## Session Log",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

describe("LineEditorModal", () => {
    let app: App;
    let onSave: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        app = new App();
        onSave = vi.fn();
    });

    // ── Constructor — Deep Copy ─────────────────────────────────

    describe("constructor — deep copy", () => {
        it("editing an existing line creates a deep copy", () => {
            const original = makeTestLine({
                safePaths: ["Path/A", "Path/B"],
                scheduledBlocks: [{ id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3] }],
                customCommands: [{ name: "Cmd", icon: "📌", action: "insert", value: "text" }],
            });
            const modal = new LineEditorModal(app, original, onSave);
            modal.onOpen();

            // Mutating the modal's rendered data should NOT affect the original
            const content = modal.contentEl;
            expect(content).toBeDefined();

            // Verify safePaths are independent arrays
            expect(original.safePaths).not.toBe((modal as any).line.safePaths);
            // Verify scheduledBlocks are independent
            expect(original.scheduledBlocks[0]).not.toBe((modal as any).line.scheduledBlocks[0]);
            // Verify days array is independent
            expect(original.scheduledBlocks[0].days).not.toBe((modal as any).line.scheduledBlocks[0].days);
            // Verify customCommands are independent
            expect(original.customCommands[0]).not.toBe((modal as any).line.customCommands[0]);
        });

        it("new line creates default with first PRESET_COLOR", () => {
            const modal = new LineEditorModal(app, null, onSave);
            const line = (modal as any).line as SwitchboardLine;

            expect(line.name).toBe("");
            expect(line.color).toBe(PRESET_COLORS[0]);
            expect(line.safePaths).toEqual([""]);
            expect(line.scheduledBlocks).toEqual([]);
            expect(line.customCommands).toEqual([]);
            expect((modal as any).isNew).toBe(true);
        });
    });

    // ── onOpen — Basic Rendering ────────────────────────────────

    describe("onOpen — basic rendering", () => {
        it('renders heading "Add new line" for new line', () => {
            const modal = new LineEditorModal(app, null, onSave);
            modal.onOpen();

            const headings = modal.contentEl.querySelectorAll(".setting-item");
            // The first Setting uses setName + setHeading for heading text
            expect(modal.contentEl.textContent).toContain("Add new line");
        });

        it('renders heading "Edit line" for existing line', () => {
            const modal = new LineEditorModal(app, makeTestLine(), onSave);
            modal.onOpen();

            expect(modal.contentEl.textContent).toContain("Edit line");
        });

        it("renders Save and Cancel buttons", () => {
            const modal = new LineEditorModal(app, null, onSave);
            modal.onOpen();

            const buttons = modal.contentEl.querySelectorAll(".switchboard-modal-buttons button");
            expect(buttons).toHaveLength(2);
            expect(buttons[0].textContent).toBe("Cancel");
            expect(buttons[1].textContent).toBe("Save");
            expect(buttons[1].classList.contains("mod-cta")).toBe(true);
        });
    });

    // ── renderColorPicker ───────────────────────────────────────

    describe("renderColorPicker", () => {
        it("creates swatches for all PRESET_COLORS", () => {
            const modal = new LineEditorModal(app, null, onSave);
            modal.onOpen();

            const swatches = modal.contentEl.querySelectorAll(".switchboard-color-swatch");
            expect(swatches).toHaveLength(PRESET_COLORS.length);

            // Each swatch has its color stored in dataset
            PRESET_COLORS.forEach((color, i) => {
                expect((swatches[i] as HTMLElement).dataset.color).toBe(color);
            });
        });

        it("marks current color as selected", () => {
            const line = makeTestLine({ color: "#2ecc71" }); // Green
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const selected = modal.contentEl.querySelectorAll(".switchboard-color-swatch.is-selected");
            expect(selected).toHaveLength(1);
            expect((selected[0] as HTMLElement).dataset.color).toBe("#2ecc71");
        });
    });

    // ── renderSafePaths ─────────────────────────────────────────

    describe("renderSafePaths", () => {
        it("renders one input per safe path", () => {
            const line = makeTestLine({ safePaths: ["Path/A", "Path/B", "Path/C"] });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const pathInputs = modal.contentEl.querySelectorAll(".switchboard-path-input");
            expect(pathInputs).toHaveLength(3);
        });

        it("adds new empty path when '+ Add Path' clicked", () => {
            const line = makeTestLine({ safePaths: ["Path/A"] });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            // Find the "+ Add Path" button
            const buttons = modal.contentEl.querySelectorAll("button");
            const addPathBtn = Array.from(buttons).find((b) => b.textContent === "+ Add Path");
            expect(addPathBtn).toBeDefined();

            addPathBtn!.click();

            const internalLine = (modal as any).line as SwitchboardLine;
            expect(internalLine.safePaths).toHaveLength(2);
            expect(internalLine.safePaths[1]).toBe("");
        });
    });

    // ── renderScheduleBlocks ────────────────────────────────────

    describe("renderScheduleBlocks", () => {
        it("shows empty message when no blocks", () => {
            const modal = new LineEditorModal(app, null, onSave);
            modal.onOpen();

            const empty = modal.contentEl.querySelector(".switchboard-schedule-empty-message");
            expect(empty).toBeTruthy();
            expect(empty!.textContent).toContain("No scheduled blocks");
        });

        it("renders block with recurring summary (day names + times)", () => {
            const line = makeTestLine({
                scheduledBlocks: [
                    { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3, 5] },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const summary = modal.contentEl.querySelector(".switchboard-schedule-block-summary");
            expect(summary).toBeTruthy();
            expect(summary!.textContent).toContain("Mon");
            expect(summary!.textContent).toContain("Wed");
            expect(summary!.textContent).toContain("Fri");
            expect(summary!.textContent).toContain("9:00 AM");
            expect(summary!.textContent).toContain("10:00 AM");
        });

        it("renders block with one-time date + times", () => {
            const line = makeTestLine({
                scheduledBlocks: [
                    { id: "b2", startTime: "14:00", endTime: "15:30", recurring: false, date: "2026-03-15" },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const summary = modal.contentEl.querySelector(".switchboard-schedule-block-summary");
            expect(summary).toBeTruthy();
            // Should contain formatted date and times
            expect(summary!.textContent).toContain("2:00 PM");
            expect(summary!.textContent).toContain("3:30 PM");
        });

        it("delete button removes block from array", () => {
            const line = makeTestLine({
                scheduledBlocks: [
                    { id: "b1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3] },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const deleteBtn = modal.contentEl.querySelector(".switchboard-schedule-block-delete");
            expect(deleteBtn).toBeTruthy();
            (deleteBtn as HTMLElement).click();

            const internalLine = (modal as any).line as SwitchboardLine;
            expect(internalLine.scheduledBlocks).toHaveLength(0);
        });
    });

    // ── renderCustomCommands ────────────────────────────────────

    describe("renderCustomCommands", () => {
        it("renders command items with icon, name, action select, value input", () => {
            const line = makeTestLine({
                customCommands: [
                    { name: "Bold", icon: "📝", action: "command", value: "editor:toggle-bold" },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const cmdItem = modal.contentEl.querySelector(".switchboard-custom-command-item");
            expect(cmdItem).toBeTruthy();

            const iconInput = cmdItem!.querySelector(".switchboard-custom-command-icon") as HTMLInputElement;
            expect(iconInput.value).toBe("📝");

            const nameInput = cmdItem!.querySelector(".switchboard-custom-command-name") as HTMLInputElement;
            expect(nameInput.value).toBe("Bold");

            const actionSelect = cmdItem!.querySelector(".switchboard-custom-command-action") as HTMLSelectElement;
            expect(actionSelect.value).toBe("command");

            const valueInput = cmdItem!.querySelector(".switchboard-custom-command-value") as HTMLInputElement;
            expect(valueInput.value).toBe("editor:toggle-bold");
        });

        it("delete button removes command from array", () => {
            const line = makeTestLine({
                customCommands: [
                    { name: "Cmd1", icon: "📌", action: "insert", value: "text" },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const deleteBtn = modal.contentEl.querySelector(".switchboard-custom-command-delete");
            expect(deleteBtn).toBeTruthy();
            (deleteBtn as HTMLElement).click();

            const internalLine = (modal as any).line as SwitchboardLine;
            expect(internalLine.customCommands).toHaveLength(0);
        });

        it("action-specific placeholder text matches action type", () => {
            const line = makeTestLine({
                customCommands: [
                    { name: "Insert", icon: "📌", action: "insert", value: "" },
                    { name: "Run", icon: "🔧", action: "command", value: "" },
                    { name: "Open", icon: "📂", action: "open", value: "" },
                ],
            });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const valueInputs = modal.contentEl.querySelectorAll(".switchboard-custom-command-value") as NodeListOf<HTMLInputElement>;
            expect(valueInputs).toHaveLength(3);

            // Insert action
            expect(valueInputs[0].placeholder).toContain("Text to insert");
            // Command action
            expect(valueInputs[1].placeholder).toContain("editor:toggle-bold");
            // Open action
            expect(valueInputs[2].placeholder).toContain("Notes/Math/Formulas.md");
        });
    });

    // ── Save/Cancel flow ────────────────────────────────────────

    describe("save flow", () => {
        it("save button calls onSave when validation passes", () => {
            const line = makeTestLine({ name: "Valid Line", safePaths: ["Path/A"] });
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const saveBtn = modal.contentEl.querySelector(".switchboard-modal-buttons button.mod-cta") as HTMLElement;
            saveBtn.click();

            expect(onSave).toHaveBeenCalledTimes(1);
            expect(onSave.mock.calls[0][0].name).toBe("Valid Line");
        });

        it("cancel button closes modal without calling onSave", () => {
            const line = makeTestLine();
            const modal = new LineEditorModal(app, line, onSave);
            modal.onOpen();

            const buttons = modal.contentEl.querySelectorAll(".switchboard-modal-buttons button");
            const cancelBtn = buttons[0] as HTMLElement; // Cancel is first
            cancelBtn.click();

            expect(onSave).not.toHaveBeenCalled();
            expect(modal.close).toHaveBeenCalled();
        });
    });
});
