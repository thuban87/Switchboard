import { describe, it, expect } from "vitest";
import { formatDuration } from "../../src/types";

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
