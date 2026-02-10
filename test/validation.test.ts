import { describe, it, expect } from "vitest";
import { validatePath, isValidHexColor, isValidTime, isValidDate, generateId } from "../src/types";

describe("validatePath", () => {
    it("accepts a normal vault path", () => {
        expect(validatePath("Folder/Sub")).toBe(true);
    });

    it("accepts a path with backslashes (Windows)", () => {
        expect(validatePath("Folder\\Sub")).toBe(true);
    });

    it("rejects path traversal (..)", () => {
        expect(validatePath("../escape")).toBe(false);
    });

    it("rejects Windows absolute paths", () => {
        expect(validatePath("C:/Users/file")).toBe(false);
    });

    it("rejects Unix absolute paths", () => {
        expect(validatePath("/etc/passwd")).toBe(false);
    });

    it("rejects dot-prefixed paths (.obsidian)", () => {
        expect(validatePath(".obsidian/plugins/data.json")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(validatePath("")).toBe(false);
    });
});

describe("isValidHexColor", () => {
    it("accepts a valid 6-digit hex color", () => {
        expect(isValidHexColor("#3498db")).toBe(true);
    });

    it("rejects hex without # prefix", () => {
        expect(isValidHexColor("3498db")).toBe(false);
    });

    it("rejects invalid hex characters", () => {
        expect(isValidHexColor("#xyzxyz")).toBe(false);
    });

    it("rejects 3-digit shorthand", () => {
        expect(isValidHexColor("#fff")).toBe(false);
    });
});

describe("isValidTime", () => {
    it("accepts a valid time", () => {
        expect(isValidTime("09:30")).toBe(true);
    });

    it("accepts midnight", () => {
        expect(isValidTime("00:00")).toBe(true);
    });

    it("accepts 23:59", () => {
        expect(isValidTime("23:59")).toBe(true);
    });

    it("rejects invalid hour (25)", () => {
        expect(isValidTime("25:00")).toBe(false);
    });

    it("rejects single-digit hour", () => {
        expect(isValidTime("9:30")).toBe(false);
    });

    it("rejects invalid minute (60)", () => {
        expect(isValidTime("12:60")).toBe(false);
    });
});

describe("isValidDate", () => {
    it("accepts a valid date", () => {
        expect(isValidDate("2026-02-09")).toBe(true);
    });

    it("rejects a non-date string", () => {
        expect(isValidDate("not-a-date")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(isValidDate("")).toBe(false);
    });
});

describe("generateId (S5 fix #38)", () => {
    it("returns empty string for empty input", () => {
        expect(generateId("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
        expect(generateId("   ")).toBe("");
    });

    it("returns empty string for special-char-only input", () => {
        expect(generateId("!!!")).toBe("");
    });

    it("still generates slugs for valid names", () => {
        expect(generateId("Math 140")).toBe("math-140");
    });
});
