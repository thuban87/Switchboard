import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App } from "obsidian";
import { StatisticsModal } from "../../src/modals/StatisticsModal";
import { createTestSession } from "../helpers";

/**
 * Phase 1b: Statistics Export Tests
 *
 * Tests StatisticsModal.generateExport() — a private method that takes
 * SessionRecord[] and returns a markdown string with week summary,
 * per-line breakdown, daily breakdown, and all-time totals.
 *
 * Uses vi.useFakeTimers() to control "now" for deterministic week boundaries.
 */

describe("generateExport", () => {
    let modal: StatisticsModal;

    beforeEach(() => {
        // Fix "now" to 2026-02-12 12:00:00 UTC for deterministic week calculations
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-12T12:00:00Z"));

        const app = new App();
        modal = new StatisticsModal(app, {} as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("empty history → \"No sessions this week\"", () => {
        const result = (modal as any).generateExport([]);

        expect(result).toContain("No sessions this week");
        // Both By Line and Daily Breakdown sections should show the fallback
        const matches = result.match(/No sessions this week/g);
        expect(matches).toHaveLength(2);
    });

    it("single session this week → correct totals", () => {
        const history = [
            createTestSession({
                lineName: "Math 140",
                date: "2026-02-11",
                durationMinutes: 60,
            }),
        ];

        const result = (modal as any).generateExport(history);

        expect(result).toContain("Total time: 1h");
        expect(result).toContain("Sessions: 1");
        expect(result).toContain("Average session: 1h");
        // All-time should match since there's only one session
        expect(result).toContain("Total sessions: 1");
    });

    it("multiple lines → grouped by line, sorted by duration", () => {
        const history = [
            createTestSession({ lineName: "Writing", date: "2026-02-10", durationMinutes: 30 }),
            createTestSession({ lineName: "Math 140", date: "2026-02-10", durationMinutes: 90 }),
            createTestSession({ lineName: "Writing", date: "2026-02-11", durationMinutes: 20 }),
        ];

        const result = (modal as any).generateExport(history);

        // Math 140 (90m) should appear before Writing (50m) in the By Line section
        const mathIndex = result.indexOf("- Math 140:");
        const writingIndex = result.indexOf("- Writing:");
        expect(mathIndex).toBeLessThan(writingIndex);
        expect(result).toContain("- Math 140: 1h 30m");
        expect(result).toContain("- Writing: 50m");
    });

    it("daily breakdown → sorted newest first", () => {
        const history = [
            createTestSession({ lineName: "Math 140", date: "2026-02-09", durationMinutes: 60 }),
            createTestSession({ lineName: "Writing", date: "2026-02-11", durationMinutes: 45 }),
            createTestSession({ lineName: "Math 140", date: "2026-02-10", durationMinutes: 30 }),
        ];

        const result = (modal as any).generateExport(history);

        // In the daily breakdown, 2026-02-11 should appear before 2026-02-10,
        // which should appear before 2026-02-09
        const idx11 = result.indexOf("2026-02-11");
        const idx10 = result.indexOf("2026-02-10");
        const idx09 = result.indexOf("2026-02-09");
        expect(idx11).toBeLessThan(idx10);
        expect(idx10).toBeLessThan(idx09);
    });

    it("average calculation → correct rounding", () => {
        const history = [
            createTestSession({ lineName: "Math 140", date: "2026-02-10", durationMinutes: 45 }),
            createTestSession({ lineName: "Math 140", date: "2026-02-11", durationMinutes: 50 }),
        ];

        const result = (modal as any).generateExport(history);

        // 95 / 2 = 47.5 → Math.round → 48m
        expect(result).toContain("Average session: 48m");
    });

    it("all-time totals include sessions older than 7 days", () => {
        const history = [
            // Old session — outside 7-day window (now is 2026-02-12, week starts at 2026-02-05)
            createTestSession({ lineName: "Writing", date: "2026-01-15", durationMinutes: 120 }),
            // Recent session — inside 7-day window
            createTestSession({ lineName: "Math 140", date: "2026-02-11", durationMinutes: 60 }),
        ];

        const result = (modal as any).generateExport(history);

        // Week stats should only count the recent session
        expect(result).toContain("Sessions: 1");
        expect(result).toMatch(/### This Week Summary[\s\S]*?Total time: 1h/);

        // All-time should include both sessions (120 + 60 = 180 = 3h)
        expect(result).toContain("Total sessions: 2");
        expect(result).toMatch(/### All Time[\s\S]*?Total time: 3h/);
    });

    it("week boundary uses exactly 7-day window", () => {
        // "Now" is 2026-02-12T12:00:00Z, so weekAgo = 2026-02-05
        // The filter is `s.date >= weekStr`, so 2026-02-05 IS included, 2026-02-04 is NOT
        const history = [
            createTestSession({ lineName: "Included", date: "2026-02-05", durationMinutes: 30 }),
            createTestSession({ lineName: "Excluded", date: "2026-02-04", durationMinutes: 60 }),
        ];

        const result = (modal as any).generateExport(history);

        // Week section should only have the "Included" session
        expect(result).toContain("Sessions: 1");
        expect(result).toContain("- Included:");
        expect(result).not.toMatch(/### By Line[\s\S]*?Excluded/);

        // All-time should have both
        expect(result).toContain("Total sessions: 2");
    });

    it("output contains expected markdown headers", () => {
        const result = (modal as any).generateExport([]);

        expect(result).toContain("## Switchboard Statistics Export");
        expect(result).toContain("### This Week Summary");
        expect(result).toContain("### By Line");
        expect(result).toContain("### Daily Breakdown");
        expect(result).toContain("### All Time");
    });

    it("line names with markdown special chars (|, *) handled", () => {
        const history = [
            createTestSession({ lineName: "Work | Projects", date: "2026-02-11", durationMinutes: 45 }),
            createTestSession({ lineName: "*Important*", date: "2026-02-11", durationMinutes: 30 }),
        ];

        const result = (modal as any).generateExport(history);

        // The pipe and asterisk should pass through without breaking the output
        expect(result).toContain("- Work | Projects: 45m");
        expect(result).toContain("- *Important*: 30m");
    });

    it("line names with CSV special chars (,) handled", () => {
        const history = [
            createTestSession({ lineName: "Work, Life, Balance", date: "2026-02-10", durationMinutes: 90 }),
        ];

        const result = (modal as any).generateExport(history);

        expect(result).toContain("- Work, Life, Balance: 1h 30m");
    });

    it("zero-duration sessions included in count", () => {
        const history = [
            createTestSession({ lineName: "Quick Check", date: "2026-02-11", durationMinutes: 0 }),
            createTestSession({ lineName: "Quick Check", date: "2026-02-11", durationMinutes: 60 }),
        ];

        const result = (modal as any).generateExport(history);

        // Both sessions should be counted
        expect(result).toContain("Sessions: 2");
        // Total should be 60m (0 + 60)
        expect(result).toMatch(/### This Week Summary[\s\S]*?Total time: 1h/);
    });
});
