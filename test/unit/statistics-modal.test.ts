/**
 * StatisticsModal Tests (Addendum Section 8)
 * Rendering, summary card math, line breakdown, recent sessions, export, formatDate.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockPlugin } from "../__mocks__/plugin";
import { createTestLine, createTestSession } from "../helpers";

// Notice spy via vi.hoisted — same pattern as time-up-modal.test.ts
const NoticeSpy = vi.hoisted(() => vi.fn());
vi.mock("obsidian", async () => {
    const actual = await vi.importActual<typeof import("../__mocks__/obsidian")>("../__mocks__/obsidian");
    return { ...actual, Notice: NoticeSpy };
});

import { StatisticsModal } from "../../src/modals/StatisticsModal";
import { App } from "../__mocks__/obsidian";

describe("StatisticsModal", () => {
    let clipboardWriteText: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        clipboardWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText: clipboardWriteText },
            writable: true,
            configurable: true,
        });
        NoticeSpy.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function createModal(sessionHistory: any[] = [], lines: any[] = []) {
        const plugin = createMockPlugin({
            settings: {
                sessionHistory,
                lines,
            },
        });
        const modal = new StatisticsModal(new App() as any, plugin as any);
        return { modal, plugin };
    }

    // ── onOpen — rendering ──────────────────────────────────────────

    describe("onOpen — rendering", () => {
        it("shows empty state when history is empty", () => {
            const { modal } = createModal([], []);
            modal.onOpen();

            const empty = modal.contentEl.querySelector(".switchboard-stats-empty");
            expect(empty).not.toBeNull();
            expect(empty!.textContent).toContain("No sessions recorded yet");
        });

        it("renders This Week and All Time summary cards", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0)); // Feb 13, 2026

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const cards = modal.contentEl.querySelectorAll(".switchboard-stats-card");
            expect(cards.length).toBe(2);

            const headings = Array.from(cards).map(c => c.querySelector("h3")!.textContent);
            expect(headings).toContain("This Week");
            expect(headings).toContain("All Time");
        });

        it("renders line breakdown section", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const sectionHeadings = Array.from(modal.contentEl.querySelectorAll("h3")).map(h => h.textContent);
            expect(sectionHeadings).toContain("By Line");
        });

        it("renders recent sessions section", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const sectionHeadings = Array.from(modal.contentEl.querySelectorAll("h3")).map(h => h.textContent);
            expect(sectionHeadings).toContain("Recent Sessions");
        });

        it("renders export button", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const exportBtn = modal.contentEl.querySelector(".switchboard-stats-export-btn");
            expect(exportBtn).not.toBeNull();
            expect(exportBtn!.textContent).toContain("Export");
        });
    });

    // ── summary cards — This Week ───────────────────────────────────

    describe("summary cards — This Week", () => {
        it("total time sums sessions within 7-day window", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0)); // Feb 13

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 45 }),
                createTestSession({ date: "2026-02-10", durationMinutes: 30 }),
                createTestSession({ date: "2026-01-01", durationMinutes: 120 }), // outside week
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const weekCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[0];
            const bigNum = weekCard.querySelector(".switchboard-stats-big-number");
            // 45 + 30 = 75 minutes = "1h 15m"
            expect(bigNum!.textContent).toBe("1h 15m");
        });

        it("session count correct for week", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 30 }),
                createTestSession({ date: "2026-02-11", durationMinutes: 30 }),
                createTestSession({ date: "2026-01-01", durationMinutes: 30 }), // outside week
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const weekCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[0];
            const subtitles = weekCard.querySelectorAll(".switchboard-stats-subtitle");
            expect(subtitles[0].textContent).toBe("2 sessions");
        });

        it("average calculates correctly with rounding", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            // 45 + 30 = 75, avg = 37.5, rounds to 38
            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 45 }),
                createTestSession({ date: "2026-02-11", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const weekCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[0];
            const subtitles = weekCard.querySelectorAll(".switchboard-stats-subtitle");
            // Second subtitle is the average
            expect(subtitles[1].textContent).toBe("~38m avg");
        });

        it("omits average element when no sessions this week", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            // All sessions outside 7-day window
            const sessions = [
                createTestSession({ date: "2026-01-01", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const weekCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[0];
            const subtitles = weekCard.querySelectorAll(".switchboard-stats-subtitle");
            // Only 1 subtitle (session count), no average
            expect(subtitles.length).toBe(1);
            expect(subtitles[0].textContent).toBe("0 sessions");
        });
    });

    // ── summary cards — All Time ────────────────────────────────────

    describe("summary cards — All Time", () => {
        it("total time sums all sessions", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 45 }),
                createTestSession({ date: "2026-01-01", durationMinutes: 120 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const allCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[1];
            const bigNum = allCard.querySelector(".switchboard-stats-big-number");
            // 45 + 120 = 165 = "2h 45m"
            expect(bigNum!.textContent).toBe("2h 45m");
        });

        it("session count is total history length", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 30 }),
                createTestSession({ date: "2026-01-15", durationMinutes: 60 }),
                createTestSession({ date: "2026-01-01", durationMinutes: 90 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const allCard = modal.contentEl.querySelectorAll(".switchboard-stats-card")[1];
            const subtitles = allCard.querySelectorAll(".switchboard-stats-subtitle");
            expect(subtitles[0].textContent).toBe("3 sessions");
        });
    });

    // ── line breakdown ──────────────────────────────────────────────

    describe("line breakdown", () => {
        it("lines sorted by total time descending", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12", durationMinutes: 30 }),
                createTestSession({ lineId: "eng", lineName: "English", date: "2026-02-12", durationMinutes: 90 }),
            ];
            const lines = [
                createTestLine({ id: "math", name: "Math", color: "#ff0000" }),
                createTestLine({ id: "eng", name: "English", color: "#00ff00" }),
            ];
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            const barRows = modal.contentEl.querySelectorAll(".switchboard-stats-bar-row");
            expect(barRows.length).toBe(2);
            // English (90m) should be first, Math (30m) second
            const names = Array.from(barRows).map(r => r.querySelector(".switchboard-stats-bar-label")!.textContent);
            expect(names[0]).toContain("English");
            expect(names[1]).toContain("Math");
        });

        it("bar widths proportional to max (highest = 100%)", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12", durationMinutes: 50 }),
                createTestSession({ lineId: "eng", lineName: "English", date: "2026-02-12", durationMinutes: 100 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const bars = modal.contentEl.querySelectorAll(".switchboard-stats-bar");
            // English (100m) = 100%, Math (50m) = 50%
            expect((bars[0] as HTMLElement).style.width).toBe("100%");
            expect((bars[1] as HTMLElement).style.width).toBe("50%");
        });

        it("uses line color from plugin.settings.lines", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12", durationMinutes: 60 }),
            ];
            const lines = [
                createTestLine({ id: "math", name: "Math", color: "#e74c3c" }),
            ];
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            const barRow = modal.contentEl.querySelector(".switchboard-stats-bar-row") as HTMLElement;
            expect(barRow.style.getPropertyValue("--line-color")).toBe("#e74c3c");
        });

        it("handles deleted line (color falls back to empty)", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ lineId: "deleted-line", lineName: "Old Line", date: "2026-02-12", durationMinutes: 60 }),
            ];
            // No matching line in settings — simulates deleted line
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const barRow = modal.contentEl.querySelector(".switchboard-stats-bar-row") as HTMLElement;
            expect(barRow.style.getPropertyValue("--line-color")).toBe("");
        });
    });

    // ── recent sessions ─────────────────────────────────────────────

    describe("recent sessions", () => {
        it("shows last 8 sessions, newest first", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            // Create 10 sessions
            const sessions = Array.from({ length: 10 }, (_, i) =>
                createTestSession({
                    date: `2026-02-${String(i + 1).padStart(2, "0")}`,
                    durationMinutes: 30,
                    lineName: `Session ${i + 1}`,
                })
            );
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const items = modal.contentEl.querySelectorAll(".switchboard-stats-session-item");
            expect(items.length).toBe(8);

            // First item should be the newest (session 10, date 2026-02-10)
            const firstName = items[0].querySelector(".switchboard-stats-session-name");
            expect(firstName!.textContent).toBe("Session 10");
        });

        it("formats 'Today' for today's date", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-13", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const dateEl = modal.contentEl.querySelector(".switchboard-stats-session-date");
            expect(dateEl!.textContent).toContain("Today");
        });

        it("formats 'Yesterday' for yesterday's date", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const dateEl = modal.contentEl.querySelector(".switchboard-stats-session-date");
            expect(dateEl!.textContent).toContain("Yesterday");
        });

        it("formats short date style for older dates", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-09", durationMinutes: 30 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const dateEl = modal.contentEl.querySelector(".switchboard-stats-session-date");
            // toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) → "Feb 9"
            expect(dateEl!.textContent).toContain("Feb");
            expect(dateEl!.textContent).toContain("9");
        });
    });

    // ── export ──────────────────────────────────────────────────────

    describe("export", () => {
        it("export button copies generateExport output to clipboard", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const exportBtn = modal.contentEl.querySelector(".switchboard-stats-export-btn") as HTMLElement;
            exportBtn.click();
            await vi.advanceTimersByTimeAsync(0);

            expect(clipboardWriteText).toHaveBeenCalledOnce();
            const copied = clipboardWriteText.mock.calls[0][0] as string;
            expect(copied).toContain("Switchboard Statistics Export");
        });

        it("shows success Notice on clipboard copy", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const exportBtn = modal.contentEl.querySelector(".switchboard-stats-export-btn") as HTMLElement;
            exportBtn.click();
            await vi.advanceTimersByTimeAsync(0);

            expect(NoticeSpy).toHaveBeenCalledWith(expect.stringContaining("copied to clipboard"));
        });

        it("shows error Notice when clipboard write fails", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            clipboardWriteText.mockRejectedValueOnce(new Error("Clipboard denied"));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();

            const exportBtn = modal.contentEl.querySelector(".switchboard-stats-export-btn") as HTMLElement;
            exportBtn.click();
            await vi.advanceTimersByTimeAsync(0);

            expect(NoticeSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to copy"));
        });
    });

    // ── onClose ─────────────────────────────────────────────────────

    describe("onClose", () => {
        it("empties contentEl after open", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 12, 0, 0));

            const sessions = [
                createTestSession({ date: "2026-02-12", durationMinutes: 60 }),
            ];
            const { modal } = createModal(sessions, []);
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();
            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});
