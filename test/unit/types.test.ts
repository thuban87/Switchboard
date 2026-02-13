import { describe, it, expect } from "vitest";
import { generateId, formatTime12h, parseTime12h, isValidTime12h } from "../../src/types";

describe("generateId", () => {
    it("creates a basic slug from a name", () => {
        expect(generateId("Math 140")).toBe("math-140");
    });

    it("strips special characters", () => {
        expect(generateId("C++ & More!")).toBe("c-more");
    });

    it("strips leading and trailing hyphens", () => {
        expect(generateId("--hello--")).toBe("hello");
    });

    it("returns empty string for empty input", () => {
        expect(generateId("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
        // Current behavior: whitespace becomes hyphens, then stripped
        expect(generateId("   ")).toBe("");
    });

    it("handles non-ASCII characters", () => {
        // Non-ASCII letters are stripped, leaving only ASCII alphanumeric
        expect(generateId("café résumé")).toBe("caf-r-sum");
    });

    it("preserves numbers", () => {
        expect(generateId("Room 101")).toBe("room-101");
    });

    it("collapses multiple separators", () => {
        expect(generateId("one   two---three")).toBe("one-two-three");
    });
});

// -------------------------------------------------------
// formatTime12h
// -------------------------------------------------------
describe("formatTime12h", () => {
    it('formats midnight (00:00 → "12:00 AM")', () => {
        expect(formatTime12h("00:00")).toBe("12:00 AM");
    });

    it('formats 1 AM (01:00 → "1:00 AM")', () => {
        expect(formatTime12h("01:00")).toBe("1:00 AM");
    });

    it('formats noon (12:00 → "12:00 PM")', () => {
        expect(formatTime12h("12:00")).toBe("12:00 PM");
    });

    it('formats afternoon (14:30 → "2:30 PM")', () => {
        expect(formatTime12h("14:30")).toBe("2:30 PM");
    });

    it('formats 11 PM (23:00 → "11:00 PM")', () => {
        expect(formatTime12h("23:00")).toBe("11:00 PM");
    });
});

// -------------------------------------------------------
// parseTime12h
// -------------------------------------------------------
describe("parseTime12h", () => {
    it('parses "9:00 AM" → "09:00"', () => {
        expect(parseTime12h("9:00 AM")).toBe("09:00");
    });

    it('parses "12:00 PM" → "12:00"', () => {
        expect(parseTime12h("12:00 PM")).toBe("12:00");
    });

    it('parses "12:00 AM" → "00:00" (midnight boundary)', () => {
        expect(parseTime12h("12:00 AM")).toBe("00:00");
    });

    it('parses "2:30 PM" → "14:30"', () => {
        expect(parseTime12h("2:30 PM")).toBe("14:30");
    });

    it('parses "12:30 PM" → "12:30" (PM noon boundary — 12 stays as 12)', () => {
        expect(parseTime12h("12:30 PM")).toBe("12:30");
    });

    it('returns null for invalid format ("25:00 AM")', () => {
        expect(parseTime12h("25:00 AM")).toBeNull();
    });

    it("returns null for out-of-range hour (0:00 AM → null, since hours are 1-12)", () => {
        expect(parseTime12h("0:00 AM")).toBeNull();
    });

    it("returns null for garbage input", () => {
        expect(parseTime12h("abc")).toBeNull();
    });

    it("handles leading/trailing whitespace", () => {
        expect(parseTime12h(" 9:00 AM ")).toBe("09:00");
    });
});

// -------------------------------------------------------
// isValidTime12h
// -------------------------------------------------------
describe("isValidTime12h", () => {
    it('returns true for "9:00 AM"', () => {
        expect(isValidTime12h("9:00 AM")).toBe(true);
    });

    it('returns false for "13:00 PM"', () => {
        expect(isValidTime12h("13:00 PM")).toBe(false);
    });

    it('returns false for "abc"', () => {
        expect(isValidTime12h("abc")).toBe(false);
    });
});
