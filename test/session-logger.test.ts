/**
 * Integration tests for SessionLogger (S13)
 * Tests file I/O, heading detection, write queue, history pruning, path validation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TFile } from "./__mocks__/obsidian";
import { createMockPlugin } from "./__mocks__/plugin";
import { SessionLogger, SessionInfo } from "../src/services/SessionLogger";
import { SwitchboardLine } from "../src/types";

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
});
