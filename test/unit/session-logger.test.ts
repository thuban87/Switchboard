/**
 * Integration tests for SessionLogger (S13)
 * Tests file I/O, heading detection, write queue, history pruning, path validation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TFile } from "../__mocks__/obsidian";
import { createMockPlugin } from "../__mocks__/plugin";
import { SessionLogger, SessionInfo } from "../../src/services/SessionLogger";
import { SwitchboardLine } from "../../src/types";

function createMockLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "math-140",
        name: "Math 140",
        color: "#3498db",
        safePaths: ["Career/School/Math 140"],
        landingPage: "Career/School/Math 140/Dashboard.canvas",
        sessionLogFile: "Career/School/Math 140/Math 140 - Session Log.md",
        sessionLogHeading: "## Session Log",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
    return {
        line: createMockLine(),
        startTime: new Date(2026, 1, 10, 14, 0, 0),  // Feb 10, 2026 2:00 PM
        endTime: new Date(2026, 1, 10, 15, 30, 0),    // Feb 10, 2026 3:30 PM
        durationMinutes: 90,
        ...overrides,
    };
}

describe("SessionLogger", () => {
    let logger: SessionLogger;
    let plugin: ReturnType<typeof createMockPlugin>;

    beforeEach(() => {
        plugin = createMockPlugin();
        logger = new SessionLogger(plugin.app, plugin as any);
    });

    describe("endSession()", () => {
        it("returns null when no session is active", () => {
            expect(logger.endSession()).toBeNull();
        });

        it("returns null for sessions under 5 minutes", () => {
            const line = createMockLine();
            logger.startSession(line);

            // Immediately end — duration will be ~0 minutes
            const result = logger.endSession();
            expect(result).toBeNull();
        });
    });

    describe("logSession()", () => {
        it("inserts entry after heading when heading is found", async () => {
            const session = createSession();
            const existingContent = "# Math 140 - Session Notes\n\n## Session Log\n\nOld entry here\n";
            const logFile = new TFile();
            logFile.path = "Career/School/Math 140/Math 140 - Session Log.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(existingContent);
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Studied integration techniques");

            expect(plugin.app.vault.process).toHaveBeenCalled();
            expect(plugin.app.vault.modify).toHaveBeenCalled();
            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            // Entry should be inserted after the heading, before the old entry
            expect(modifiedContent).toContain("## Session Log");
            expect(modifiedContent).toContain("Studied integration techniques");
            // New entry should come before old entry
            const newEntryIdx = modifiedContent.indexOf("Studied integration techniques");
            const oldEntryIdx = modifiedContent.indexOf("Old entry here");
            expect(newEntryIdx).toBeLessThan(oldEntryIdx);
        });

        it("appends section at end when heading is not found", async () => {
            const session = createSession();
            const existingContent = "# Math 140 - Session Notes\n\nSome random content\n";
            const logFile = new TFile();
            logFile.path = "Career/School/Math 140/Math 140 - Session Log.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(existingContent);
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Review session");

            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            // Should append heading + entry at the end
            expect(modifiedContent).toContain("## Session Log");
            expect(modifiedContent).toContain("Review session");
            // Original content should still be there
            expect(modifiedContent).toContain("Some random content");
        });

        it("matches exact heading, not substring (S8 #24 regex fix)", async () => {
            const session = createSession({
                line: createMockLine({ sessionLogHeading: "## Session Log" }),
            });
            // Content has "## Session Log Entries" which is a superset — should NOT match
            const existingContent = "# Notes\n\n## Session Log Entries\n\nOld stuff\n";
            const logFile = new TFile();
            logFile.path = "test.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(existingContent);
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "New entry");

            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            // Since "## Session Log" (exact) was not found, it should append a new section
            // The entry should NOT be inserted under "## Session Log Entries"
            expect(modifiedContent).toMatch(/## Session Log\n/);
        });

        it("concurrent calls write sequentially via writeQueue (S8 #25)", async () => {
            const session = createSession();
            const existingContent = "# Notes\n\n## Session Log\n\n";
            const logFile = new TFile();
            logFile.path = "test.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            // Each read returns the latest content (simulate sequential writes)
            let currentContent = existingContent;
            plugin.app.vault.read = vi.fn().mockImplementation(() => Promise.resolve(currentContent));
            plugin.app.vault.modify = vi.fn().mockImplementation((_file: any, content: string) => {
                currentContent = content;
                return Promise.resolve();
            });

            // Fire two concurrent logSession calls
            const p1 = logger.logSession(session, "First entry");
            const p2 = logger.logSession(session, "Second entry");
            await Promise.all([p1, p2]);

            // Both entries should be in the final content
            expect(currentContent).toContain("First entry");
            expect(currentContent).toContain("Second entry");
        });
    });

    describe("saveToHistory()", () => {
        it("prunes to 1000 entries when limit exceeded (S8 #8)", async () => {
            // Pre-fill with 999 entries
            plugin.settings.sessionHistory = Array.from({ length: 999 }, (_, i) => ({
                lineId: "test",
                lineName: "Test",
                date: "2026-01-01",
                startTime: "09:00",
                endTime: "10:00",
                durationMinutes: 60,
                summary: `Entry ${i}`,
            }));

            const session = createSession();
            const logFile = new TFile();
            logFile.path = "test.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue("# Notes\n\n## Session Log\n\n");
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            // Add 2 more to push over 1000
            await logger.logSession(session, "Entry 1000");
            await logger.logSession(session, "Entry 1001");

            expect(plugin.settings.sessionHistory.length).toBeLessThanOrEqual(1000);
        });

        it("uses local date, not UTC (S8 #26)", async () => {
            const session = createSession({
                startTime: new Date(2026, 1, 10, 23, 30, 0), // Feb 10, 2026 11:30 PM local
            });
            const logFile = new TFile();
            logFile.path = "test.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue("# Notes\n\n## Session Log\n\n");
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Late night session");

            const record = plugin.settings.sessionHistory[plugin.settings.sessionHistory.length - 1];
            // Should use local date (Feb 10), not UTC which might be Feb 11
            expect(record.date).toBe("2026-02-10");
        });
    });

    describe("logToDailyNote()", () => {
        it("creates new file when daily note not found", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logToDailyNote("Math 140", 90, "Studied calculus");

            expect(plugin.app.vault.create).toHaveBeenCalled();
            const createArgs = plugin.app.vault.create.mock.calls[0];
            expect(createArgs[0]).toContain("Daily Notes/");
            expect(createArgs[1]).toContain("### Switchboard Logs");
            expect(createArgs[1]).toContain("Math 140");
        });

        it("appends to existing bullet list under heading", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";

            const existingFile = new TFile();
            existingFile.path = "Daily Notes/2026-02-10, Tuesday.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => existingFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(
                "# 2026-02-10, Tuesday\n\n### Switchboard Logs\n- **Writing**: 45m\n"
            );
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logToDailyNote("Math 140", 90, "Studied calculus");

            expect(plugin.app.vault.process).toHaveBeenCalled();
            expect(plugin.app.vault.modify).toHaveBeenCalled();
            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            expect(modifiedContent).toContain("**Math 140**");
            expect(modifiedContent).toContain("**Writing**"); // Original entry preserved
        });
    });

    describe("getOrCreateLogFile()", () => {
        it("rejects paths with '..' traversal (S5 #3)", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "../../../etc/evil.md",
                    landingPage: "Fallback/Dashboard.md",
                }),
            });

            // Should use default path, not the traversal path
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logSession(session, "Test");

            // The create call should use a safe path, not the traversal one
            if (plugin.app.vault.create.mock.calls.length > 0) {
                const createdPath = plugin.app.vault.create.mock.calls[0][0] as string;
                expect(createdPath).not.toContain("..");
            }
        });
    });

    describe("formatLogEntry()", () => {
        it("produces correct markdown with all fields", () => {
            const session = createSession({
                startTime: new Date(2026, 1, 10, 14, 0, 0),  // Feb 10, 2026 2:00 PM
                endTime: new Date(2026, 1, 10, 15, 30, 0),    // Feb 10, 2026 3:30 PM
                durationMinutes: 90,
            });
            const result = (logger as any).formatLogEntry(session, "Studied integration techniques");
            // Should contain the markdown header with date, time range, duration
            expect(result).toContain("### ");
            expect(result).toContain("(1h 30m)");
            expect(result).toContain("- Studied integration techniques");
        });

        it("includes summary text as bullet point", () => {
            const session = createSession();
            const result = (logger as any).formatLogEntry(session, "Completed chapter 5 review");
            expect(result).toContain("- Completed chapter 5 review");
        });

        it("handles empty string summary", () => {
            const session = createSession();
            const result = (logger as any).formatLogEntry(session, "");
            // Should still produce a valid entry with empty bullet
            expect(result).toContain("### ");
            expect(result).toContain("- ");
        });

        it("formats duration using formatDuration()", () => {
            const session = createSession({ durationMinutes: 45 });
            const result = (logger as any).formatLogEntry(session, "Quick session");
            expect(result).toContain("(45m)");
        });

        it("produces correct format for multi-hour sessions", () => {
            const session = createSession({
                startTime: new Date(2026, 1, 10, 8, 0, 0),
                endTime: new Date(2026, 1, 10, 11, 15, 0),
                durationMinutes: 195,
            });
            const result = (logger as any).formatLogEntry(session, "Long study block");
            expect(result).toContain("(3h 15m)");
            expect(result).toContain("- Long study block");
        });
    });

    describe("formatTime24()", () => {
        it("formats morning time correctly", () => {
            const date = new Date(2026, 1, 10, 9, 30, 0);
            const result = (logger as any).formatTime24(date);
            expect(result).toBe("09:30");
        });

        it("formats afternoon time correctly", () => {
            const date = new Date(2026, 1, 10, 14, 0, 0);
            const result = (logger as any).formatTime24(date);
            expect(result).toBe("14:00");
        });

        it("handles midnight (00:00)", () => {
            const date = new Date(2026, 1, 10, 0, 0, 0);
            const result = (logger as any).formatTime24(date);
            expect(result).toBe("00:00");
        });
    });

    describe("getCurrentDuration()", () => {
        it("returns 0 when no active session", () => {
            expect(logger.getCurrentDuration()).toBe(0);
        });

        it("calculates elapsed minutes correctly", () => {
            vi.useFakeTimers();
            try {
                const baseTime = new Date(2026, 1, 10, 14, 0, 0);
                vi.setSystemTime(baseTime);

                const line = createMockLine();
                logger.startSession(line);

                // Advance 45 minutes
                vi.setSystemTime(new Date(2026, 1, 10, 14, 45, 0));
                expect(logger.getCurrentDuration()).toBe(45);

                // Advance to 2 hours total
                vi.setSystemTime(new Date(2026, 1, 10, 16, 0, 0));
                expect(logger.getCurrentDuration()).toBe(120);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    // ──────────── Phase G: Edge Case Branches ────────────

    describe("endSession — positive path", () => {
        it("returns SessionInfo for sessions >= 5 minutes", () => {
            vi.useFakeTimers();
            try {
                const baseTime = new Date(2026, 1, 10, 14, 0, 0);
                vi.setSystemTime(baseTime);

                const line = createMockLine();
                logger.startSession(line);

                // Advance 10 minutes
                vi.setSystemTime(new Date(2026, 1, 10, 14, 10, 0));
                const result = logger.endSession();

                expect(result).not.toBeNull();
                expect(result!.line.id).toBe("math-140");
                expect(result!.durationMinutes).toBe(10);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("logSession — edge cases", () => {
        it("handles null logFile (getOrCreateLogFile returns null)", async () => {
            const session = createSession();

            // Make getOrCreateLogFile return null
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.create = vi.fn().mockRejectedValue(new Error("create failed"));

            // Should not throw, just log the error
            await expect(logger.logSession(session, "Test entry")).resolves.not.toThrow();
        });

        it("uses default heading '## Session Log' when line.sessionLogHeading is empty", async () => {
            const session = createSession({
                line: createMockLine({ sessionLogHeading: "" }),
            });
            const existingContent = "# Notes\n\n## Session Log\n\nOld stuff\n";
            const logFile = new TFile();
            logFile.path = "test.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(existingContent);
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Default heading entry");

            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            expect(modifiedContent).toContain("## Session Log");
            expect(modifiedContent).toContain("Default heading entry");
        });

        it("handles heading at end of file (no newline after heading)", async () => {
            const session = createSession();
            // Content ends with heading, no trailing newline
            const existingContent = "# Notes\n\n## Session Log";
            const logFile = new TFile();
            logFile.path = "test.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(existingContent);
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "End of file entry");

            expect(plugin.app.vault.modify).toHaveBeenCalled();
            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            expect(modifiedContent).toContain("End of file entry");
        });
    });

    describe("saveToHistory — edge cases", () => {
        it("initializes sessionHistory array when it's undefined/null", async () => {
            (plugin.settings as any).sessionHistory = undefined;

            const session = createSession();
            const logFile = new TFile();
            logFile.path = "test.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => logFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue("# Notes\n\n## Session Log\n\n");
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Init test");

            expect(Array.isArray(plugin.settings.sessionHistory)).toBe(true);
            expect(plugin.settings.sessionHistory.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("getOrCreateLogFile — edge cases", () => {
        it("warns when sessionLogFile path is unsafe (rejected by sanitizePath)", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "../../../etc/evil.md",
                    landingPage: "Fallback/Dashboard.md",
                }),
            });

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logSession(session, "Unsafe path test");

            // Should create file at fallback path, not the unsafe one
            if (plugin.app.vault.create.mock.calls.length > 0) {
                const createdPath = plugin.app.vault.create.mock.calls[0][0] as string;
                expect(createdPath).not.toContain("..");
            }
        });

        it("uses landing page folder for default path when landingPage is set", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "",
                    landingPage: "Career/School/Math 140/Dashboard.canvas",
                }),
            });

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logSession(session, "Landing page path test");

            if (plugin.app.vault.create.mock.calls.length > 0) {
                const createdPath = plugin.app.vault.create.mock.calls[0][0] as string;
                expect(createdPath).toContain("Career/School/Math 140");
            }
        });

        it("uses root folder when no landingPage", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "",
                    landingPage: "",
                }),
            });

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logSession(session, "Root folder test");

            if (plugin.app.vault.create.mock.calls.length > 0) {
                const createdPath = plugin.app.vault.create.mock.calls[0][0] as string;
                // Should be just "Math 140 - Session Log.md" without folder prefix
                expect(createdPath).not.toContain("/");
                expect(createdPath).toContain("Session Log.md");
            }
        });

        it("finds file via case-insensitive fallback match", async () => {
            const session = createSession();
            const existingFile = new TFile();
            existingFile.path = "Career/School/MATH 140/Math 140 - Session Log.md";

            // Direct lookup fails (case mismatch)
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            // But case-insensitive search finds it
            plugin.app.vault.getFiles = vi.fn(() => [existingFile]);
            plugin.app.vault.read = vi.fn().mockResolvedValue("# Notes\n\n## Session Log\n\n");
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logSession(session, "Case-insensitive match test");

            // Should have used process (read+modify), not create
            expect(plugin.app.vault.process).toHaveBeenCalled();
            expect(plugin.app.vault.create).not.toHaveBeenCalled();
        });

        it("creates parent folders when they don't exist", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "Deep/Nested/Folder/log.md",
                }),
            });

            // No file or folder exists
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.createFolder = vi.fn().mockResolvedValue(undefined);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logSession(session, "Nested folder test");

            expect(plugin.app.vault.createFolder).toHaveBeenCalledWith("Deep/Nested/Folder");
        });

        it("returns null when file creation fails", async () => {
            const session = createSession({
                line: createMockLine({
                    sessionLogFile: "nonexistent/path/log.md",
                }),
            });

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.getFiles = vi.fn(() => []);
            plugin.app.vault.createFolder = vi.fn().mockRejectedValue(new Error("folder error"));

            // Should handle gracefully without throwing
            await expect(logger.logSession(session, "Creation failure test")).resolves.not.toThrow();
        });
    });

    describe("logToDailyNote — edge cases", () => {
        it("skips when enableDailyNoteLogging is false", async () => {
            plugin.settings.enableDailyNoteLogging = false;
            plugin.settings.dailyNotesFolder = "Daily Notes";

            await logger.logToDailyNote("Math 140", 90, "Test");

            // Should not access vault at all
            expect(plugin.app.vault.getAbstractFileByPath).not.toHaveBeenCalled();
            expect(plugin.app.vault.create).not.toHaveBeenCalled();
        });

        it("skips when dailyNotesFolder is empty", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "";

            await logger.logToDailyNote("Math 140", 90, "Test");

            expect(plugin.app.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        });

        it("handles daily note path being a folder (not TFile)", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";

            // Return a non-TFile (e.g., TFolder)
            const folder = { path: "Daily Notes/2026-02-10, Tuesday.md" };
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => folder);

            // Should not throw, just log error and return
            await expect(logger.logToDailyNote("Math 140", 90, "Test")).resolves.not.toThrow();
            // Should NOT have called process (since it's not a TFile)
            expect(plugin.app.vault.process).not.toHaveBeenCalled();
        });

        it("uses default heading '### Switchboard Logs' when dailyNoteHeading is empty", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";
            (plugin.settings as any).dailyNoteHeading = "";

            // File doesn't exist, so it creates it
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.create = vi.fn().mockResolvedValue(new TFile());

            await logger.logToDailyNote("Math 140", 90, "Test");

            const createContent = plugin.app.vault.create.mock.calls[0][1] as string;
            expect(createContent).toContain("### Switchboard Logs");
        });

        it("inserts bullet at end of existing section (before next heading)", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";

            const existingFile = new TFile();
            existingFile.path = "Daily Notes/2026-02-13, Thursday.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => existingFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(
                "# 2026-02-13\n\n### Switchboard Logs\n- **Writing**: 45m\n\n### Other Section\nStuff here\n"
            );
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logToDailyNote("Math 140", 90, "Studied calculus");

            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            expect(modifiedContent).toContain("**Math 140**");
            expect(modifiedContent).toContain("**Writing**"); // Original preserved

            // New entry should be before "### Other Section"
            const mathIdx = modifiedContent.indexOf("**Math 140**");
            const otherIdx = modifiedContent.indexOf("### Other Section");
            expect(mathIdx).toBeLessThan(otherIdx);
        });

        it("appends heading + bullet when heading not found in existing file", async () => {
            plugin.settings.enableDailyNoteLogging = true;
            plugin.settings.dailyNotesFolder = "Daily Notes";

            const existingFile = new TFile();
            existingFile.path = "Daily Notes/2026-02-13, Thursday.md";
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => existingFile);
            plugin.app.vault.read = vi.fn().mockResolvedValue(
                "# 2026-02-13\n\nSome unrelated content\n"
            );
            plugin.app.vault.modify = vi.fn().mockResolvedValue(undefined);

            await logger.logToDailyNote("Math 140", 90, "Studied calculus");

            const modifiedContent = plugin.app.vault.modify.mock.calls[0][1] as string;
            // Should append the heading and bullet at the end
            expect(modifiedContent).toContain("### Switchboard Logs");
            expect(modifiedContent).toContain("**Math 140**");
        });
    });

    describe("hasActiveSession()", () => {
        it("returns true when session is active", () => {
            const line = createMockLine();
            logger.startSession(line);
            expect(logger.hasActiveSession()).toBe(true);
        });

        it("returns false when no session", () => {
            expect(logger.hasActiveSession()).toBe(false);
        });
    });
});
