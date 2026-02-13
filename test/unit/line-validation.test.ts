import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestLine } from "../helpers";
import { PRESET_COLORS } from "../../src/types";

/**
 * Phase 1c: Line Editor Validation Tests
 *
 * Tests LineEditorModal.validate() — a private method that validates
 * Line name, color, schedule blocks, and safe paths before saving.
 *
 * scheduleContainer is null by default (set in constructor), so the
 * DOM-sync portion is skipped — we test pure validation logic only.
 */

// === Module Mocks ===

// Notice spy must be declared via vi.hoisted() for use inside vi.mock factory
const { NoticeSpy } = vi.hoisted(() => ({
    NoticeSpy: vi.fn(),
}));

// Partial mock obsidian — override Notice with a spy
vi.mock("obsidian", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as any), Notice: NoticeSpy };
});

// === Imports (after mocks) ===

import { App } from "obsidian";
import { LineEditorModal } from "../../src/settings/LineEditorModal";

describe("validate", () => {
    const onSave = vi.fn();

    /** Create a modal for a NEW Line */
    function createNewModal(existingLines = [] as ReturnType<typeof createTestLine>[]) {
        return new LineEditorModal(new App(), null, onSave, existingLines);
    }

    /** Create a modal for EDITING an existing Line */
    function createEditModal(line: ReturnType<typeof createTestLine>) {
        return new LineEditorModal(new App(), line, onSave, []);
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects empty name", () => {
        const modal = createNewModal();
        (modal as any).line.name = "";

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("name cannot be empty")
        );
    });

    it("sanitizes illegal path characters in name", () => {
        const modal = createNewModal();
        (modal as any).line.name = 'Math: 140 / Fall "2026"';
        (modal as any).line.color = PRESET_COLORS[0];

        (modal as any).validate();

        // sanitizeFileName replaces \/:*?"<>| with "-"
        expect((modal as any).line.name).toBe("Math- 140 - Fall -2026-");
    });

    it("rejects duplicate ID on new Line", () => {
        const existingLine = createTestLine({ id: "math-140", name: "Math 140" });
        const modal = createNewModal([existingLine]);
        (modal as any).line.name = "Math 140"; // generates id "math-140"
        (modal as any).line.color = PRESET_COLORS[0];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("already exists")
        );
    });

    it("allows same ID on edit (self-collision)", () => {
        const existingLine = createTestLine({ id: "math-140", name: "Math 140" });
        const modal = createEditModal(existingLine);
        // isNew = false, so the duplicate ID check is skipped entirely

        const result = (modal as any).validate();

        expect(result).toBe(true);
    });

    it("rejects name with only special characters", () => {
        const modal = createNewModal();
        (modal as any).line.name = "***|||"; // sanitizeFileName → "------", generateId → ""
        (modal as any).line.color = PRESET_COLORS[0];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("at least one letter or number")
        );
    });

    it("rejects invalid hex color", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = "not-a-color";

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid color format")
        );
    });

    it("accepts valid hex color (#RRGGBB)", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Unique Test";
        (modal as any).line.color = "#3498db";

        const result = (modal as any).validate();

        expect(result).toBe(true);
    });

    it("rejects invalid start time", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "invalid", endTime: "10:00", recurring: true, days: [1] },
        ];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid start time")
        );
    });

    it("rejects invalid end time", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "09:00", endTime: "25:00", recurring: true, days: [1] },
        ];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid end time")
        );
    });

    it("rejects invalid date on non-recurring block", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "09:00", endTime: "10:00", recurring: false, date: "not-a-date" },
        ];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid date")
        );
    });

    it("skips date validation on recurring block", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3, 5] },
        ];

        const result = (modal as any).validate();

        // Should pass — no date validation on recurring blocks
        expect(result).toBe(true);
    });

    it("filters empty safe paths", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.safePaths = ["Career/School", "", "Projects", "  "];

        (modal as any).validate();

        expect((modal as any).line.safePaths).toEqual(["Career/School", "Projects"]);
    });

    it("adds default empty path when all filtered", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.safePaths = ["", "  ", ""];

        (modal as any).validate();

        expect((modal as any).line.safePaths).toEqual([""]);
    });

    it("validates all schedule blocks (not just first)", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Test Line";
        (modal as any).line.color = PRESET_COLORS[0];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1] },
            { id: "2", startTime: "14:00", endTime: "bad-time", recurring: true, days: [2] },
        ];

        const result = (modal as any).validate();

        expect(result).toBe(false);
        expect(NoticeSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid end time")
        );
    });

    it("full valid Line passes all checks", () => {
        const modal = createNewModal();
        (modal as any).line.name = "Math 140";
        (modal as any).line.color = "#3498db";
        (modal as any).line.safePaths = ["Career/School/Math 140"];
        (modal as any).line.scheduledBlocks = [
            { id: "1", startTime: "09:00", endTime: "10:00", recurring: true, days: [1, 3, 5] },
            { id: "2", startTime: "14:00", endTime: "15:30", recurring: false, date: "2026-03-15" },
        ];

        const result = (modal as any).validate();

        expect(result).toBe(true);
        expect(NoticeSpy).not.toHaveBeenCalled();
    });
});
