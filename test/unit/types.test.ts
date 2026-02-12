import { describe, it, expect } from "vitest";
import { generateId } from "../../src/types";

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
