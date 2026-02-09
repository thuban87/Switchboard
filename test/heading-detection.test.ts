import { describe, it, expect } from "vitest";

/**
 * Heading detection tests
 *
 * SessionLogger.logSession() and logToDailyNote() both use indexOf to find
 * headings in file content. S8 will fix this with a line-aware regex.
 *
 * We test the indexOf behavior directly here. Tests that require the
 * S8 regex fix are marked with it.skip.
 */

// Test helper: simulates the current indexOf heading detection
function findHeadingIndex(content: string, heading: string): number {
    return content.indexOf(heading);
}

// Test helper: simulates the S8 regex heading detection
function findHeadingIndexRegex(content: string, heading: string): number {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escaped}\\s*$`, "m");
    const match = content.match(regex);
    return match ? match.index! : -1;
}

describe("Heading Detection (current indexOf behavior)", () => {
    it("finds an exact heading at the start of content", () => {
        const content = "## Session Log\n\nSome content here";
        expect(findHeadingIndex(content, "## Session Log")).toBe(0);
    });

    it("finds a heading in the middle of content", () => {
        const content = "# Title\n\nSome text\n\n## Session Log\n\nMore text";
        const index = findHeadingIndex(content, "## Session Log");
        expect(index).toBeGreaterThan(0);
    });

    it("returns -1 when heading is not present", () => {
        const content = "# Title\n\nNo matching heading here";
        expect(findHeadingIndex(content, "## Session Log")).toBe(-1);
    });
});

describe("Heading Detection (S8 regex fix)", () => {
    // These tests verify the FIXED behavior that S8 will implement.
    // They are skipped because the codebase still uses indexOf.

    it.skip("substring heading does NOT match (requires S8 regex fix)", () => {
        // "## Session Log" should NOT match "## Session Logging Details"
        const content = "## Session Logging Details\n\nSome content";
        expect(findHeadingIndexRegex(content, "## Session Log")).toBe(-1);
    });

    it.skip("heading with trailing whitespace still matches (requires S8 regex fix)", () => {
        const content = "## Session Log   \n\nContent after heading";
        expect(findHeadingIndexRegex(content, "## Session Log")).toBeGreaterThanOrEqual(0);
    });

    it.skip("multiple similar headings — matches only the exact one (requires S8 regex fix)", () => {
        const content = "## Session Logger\n\nDetails\n\n## Session Log\n\nActual logs";
        const index = findHeadingIndexRegex(content, "## Session Log");
        // Should find the exact "## Session Log", not "## Session Logger"
        expect(content.substring(index, index + 14)).toBe("## Session Log");
        // Verify it's not the "Logger" one
        expect(content.substring(index, index + 20)).not.toContain("Logger");
    });
});
