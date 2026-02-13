import { describe, it, expect, vi } from "vitest";
import { validatePath, isValidHexColor, isValidTime, isValidDate, generateId, sanitizePath, sanitizeFileName } from "../../src/types";

// Mock obsidian's normalizePath — mimics slash normalization and leading/trailing slash stripping
vi.mock("obsidian", () => ({
    normalizePath: (path: string) => {
        return path
            .replace(new RegExp("\\\\", "g"), "/")
            .replace(/^\/+/, "")
            .replace(/\/+$/, "")
            .replace(/\/+/g, "/");
    },
}));

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

describe("sanitizePath", () => {
    it("returns normalized path for valid input", () => {
        expect(sanitizePath("Folder/Sub")).toBe("Folder/Sub");
    });

    it("normalizes backslashes to forward slashes", () => {
        expect(sanitizePath("Folder\\Sub\\File.md")).toBe("Folder/Sub/File.md");
    });

    it("strips trailing slashes", () => {
        expect(sanitizePath("Folder/Sub/")).toBe("Folder/Sub");
    });

    it("returns null for empty string", () => {
        expect(sanitizePath("")).toBeNull();
    });

    it("returns null for traversal paths", () => {
        expect(sanitizePath("../escape")).toBeNull();
    });

    it("returns null for Windows absolute paths", () => {
        expect(sanitizePath("C:/Users/file")).toBeNull();
    });

    it("returns null for Unix absolute paths", () => {
        expect(sanitizePath("/etc/passwd")).toBeNull();
    });

    it("returns null for dot-prefixed paths", () => {
        expect(sanitizePath(".obsidian/plugins/data.json")).toBeNull();
    });
});

describe("sanitizeFileName", () => {
    it("passes through a clean name", () => {
        expect(sanitizeFileName("Math 140")).toBe("Math 140");
    });

    it("replaces forward slash", () => {
        expect(sanitizeFileName("Work/Project")).toBe("Work-Project");
    });

    it("replaces backslash", () => {
        expect(sanitizeFileName("Work\\Project")).toBe("Work-Project");
    });

    it("replaces colon", () => {
        expect(sanitizeFileName("Task: Important")).toBe("Task- Important");
    });

    it("replaces all illegal characters", () => {
        expect(sanitizeFileName('a\\b/c:d*e?f"g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j");
    });

    it("trims whitespace", () => {
        expect(sanitizeFileName("  hello  ")).toBe("hello");
    });

    it("handles name with only illegal chars", () => {
        expect(sanitizeFileName("///")).toBe("---");
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
