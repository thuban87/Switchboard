/**
 * Integration tests for main.ts lifecycle & orchestration (Phase 1a)
 * Tests patchIn, disconnect, patchInWithGoal, onunload,
 * registerLineCommands, and executeOperatorCommand.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestLine } from "../helpers";
import { DEFAULT_SETTINGS } from "../../src/types";

// === Module Mocks ===

// Variables used inside vi.mock factories must be declared via vi.hoisted()
const { NoticeSpy, captureGoalCallback, captureCallLogCallback } = vi.hoisted(() => ({
    NoticeSpy: vi.fn(),
    captureGoalCallback: { current: null as ((goal: string | null) => void) | null },
    captureCallLogCallback: { current: null as ((summary: string) => Promise<void>) | null },
}));

// Partial mock obsidian — override Notice with a spy
vi.mock("obsidian", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as any), Notice: NoticeSpy };
});

// Services — use regular functions (not arrows) so they work with `new`
vi.mock("../../src/services/CircuitManager", () => ({
    CircuitManager: vi.fn().mockImplementation(function (this: any) {
        this.activate = vi.fn();
        this.deactivate = vi.fn();
    }),
}));

vi.mock("../../src/services/WireService", () => ({
    WireService: vi.fn().mockImplementation(function (this: any) {
        this.start = vi.fn();
        this.stop = vi.fn();
    }),
}));

vi.mock("../../src/services/SessionLogger", () => ({
    SessionLogger: vi.fn().mockImplementation(function (this: any) {
        this.startSession = vi.fn();
        this.endSession = vi.fn(() => null);
        this.getCurrentDuration = vi.fn(() => 0);
        this.logSession = vi.fn().mockResolvedValue(undefined);
        this.logToDailyNote = vi.fn().mockResolvedValue(undefined);
    }),
}));

vi.mock("../../src/services/AudioService", () => ({
    AudioService: vi.fn().mockImplementation(function (this: any) {
        this.playPatchIn = vi.fn();
        this.playDisconnect = vi.fn();
        this.destroy = vi.fn();
    }),
}));

vi.mock("../../src/services/StatusBarManager", () => ({
    StatusBarManager: vi.fn().mockImplementation(function (this: any) {
        this.init = vi.fn();
        this.startTimerUpdates = vi.fn();
        this.stopTimerUpdates = vi.fn();
        this.update = vi.fn();
        this.destroy = vi.fn();
    }),
}));

vi.mock("../../src/services/TimerManager", () => ({
    TimerManager: vi.fn().mockImplementation(function (this: any) {
        this.startBreakReminder = vi.fn();
        this.stopBreakReminder = vi.fn();
        this.cancelAutoDisconnect = vi.fn();
        this.scheduleAutoDisconnect = vi.fn();
        this.destroy = vi.fn();
    }),
}));

vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        setDebugMode: vi.fn(),
    },
}));

// Views
vi.mock("../../src/views/DashboardView", () => ({
    DashboardView: vi.fn(),
    DASHBOARD_VIEW_TYPE: "switchboard-dashboard",
}));

// Modals — auto-mock those not directly inspected
vi.mock("../../src/modals/PatchInModal");
vi.mock("../../src/modals/OperatorModal");
vi.mock("../../src/modals/StatisticsModal");
vi.mock("../../src/modals/SessionEditorModal");
vi.mock("../../src/modals/QuickSwitchModal");

// GoalPromptModal — capture callback for patchInWithGoal tests
vi.mock("../../src/modals/GoalPromptModal", () => ({
    GoalPromptModal: vi.fn().mockImplementation(function (this: any, _app: any, _name: string, _color: string, cb: (goal: string | null) => void) {
        captureGoalCallback.current = cb;
        this.open = vi.fn();
    }),
}));

// CallLogModal — capture callback for disconnect tests
vi.mock("../../src/modals/CallLogModal", () => ({
    CallLogModal: vi.fn().mockImplementation(function (this: any, _app: any, _info: any, cb: any, _goal: any) {
        captureCallLogCallback.current = cb;
        this.open = vi.fn();
    }),
}));

// Settings tab
vi.mock("../../src/settings/SwitchboardSettingTab", () => ({
    SwitchboardSettingTab: vi.fn().mockImplementation(function (this: any) { }),
}));

// === Imports (after mocks) ===

import SwitchboardPlugin from "../../src/main";
import { App, TFile, TFolder } from "obsidian";
import { GoalPromptModal } from "../../src/modals/GoalPromptModal";
import { CallLogModal } from "../../src/modals/CallLogModal";

// === Test Suite ===

describe("main.ts lifecycle", () => {
    let plugin: SwitchboardPlugin;
    const testLine = createTestLine({ id: "math-140", name: "Math 140" });

    beforeEach(async () => {
        vi.clearAllMocks();
        captureGoalCallback.current = null;
        captureCallLogCallback.current = null;

        plugin = new SwitchboardPlugin(new App(), { id: "switchboard" } as any);
        await plugin.onload();

        // Add a test line to settings
        plugin.settings.lines = [testLine];
    });

    // -------------------------------------------------------
    // patchIn
    // -------------------------------------------------------
    describe("patchIn", () => {
        it("sets activeLine in settings and saves", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.settings.activeLine).toBe("math-140");
            expect(plugin.saveData).toHaveBeenCalled();
        });

        it("activates CircuitManager with line", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.circuitManager.activate).toHaveBeenCalledWith(testLine);
        });

        it("starts session in SessionLogger", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.sessionLogger.startSession).toHaveBeenCalledWith(testLine);
        });

        it("triggers audio playPatchIn", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.audioService.playPatchIn).toHaveBeenCalled();
        });

        it("starts status bar timer updates", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.statusBarManager.startTimerUpdates).toHaveBeenCalled();
        });

        it("starts break reminder", async () => {
            await plugin.patchIn(testLine);

            expect(plugin.timerManager.startBreakReminder).toHaveBeenCalled();
        });

        it("opens landing page when set", async () => {
            const lineWithLanding = createTestLine({
                id: "math-140",
                name: "Math 140",
                landingPage: "School/Math/Dashboard.md",
            });
            const mockFile = new TFile();
            vi.mocked(plugin.app.vault.getAbstractFileByPath).mockReturnValue(mockFile);
            const mockLeaf = { openFile: vi.fn().mockResolvedValue(undefined) };
            vi.mocked(plugin.app.workspace.getLeaf).mockReturnValue(mockLeaf as any);

            await plugin.patchIn(lineWithLanding);

            expect(plugin.app.vault.getAbstractFileByPath).toHaveBeenCalledWith("School/Math/Dashboard.md");
            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile);
        });

        it("shows notice when landing page not found", async () => {
            const lineWithLanding = createTestLine({
                id: "math-140",
                name: "Math 140",
                landingPage: "nonexistent.md",
            });
            vi.mocked(plugin.app.vault.getAbstractFileByPath).mockReturnValue(null);

            await plugin.patchIn(lineWithLanding);

            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("Landing page not found")
            );
        });

        it("skips landing page when not set", async () => {
            await plugin.patchIn(testLine); // testLine has landingPage = ""

            expect(plugin.app.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        });

        it("refreshes dashboard", async () => {
            // refreshDashboard calls workspace.getLeavesOfType
            await plugin.patchIn(testLine);

            expect(plugin.app.workspace.getLeavesOfType).toHaveBeenCalledWith("switchboard-dashboard");
        });

        it("wraps errors in try/catch with notice", async () => {
            vi.mocked(plugin.circuitManager.activate).mockImplementation(() => {
                throw new Error("test error");
            });

            // Should not throw
            await plugin.patchIn(testLine);

            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("Error patching in")
            );
        });
    });

    // -------------------------------------------------------
    // patchInWithGoal
    // -------------------------------------------------------
    describe("patchInWithGoal", () => {
        it("shows GoalPromptModal when enableGoalPrompt is true", async () => {
            plugin.settings.enableGoalPrompt = true;

            await plugin.patchInWithGoal(testLine);

            expect(GoalPromptModal).toHaveBeenCalledWith(
                plugin.app,
                testLine.name,
                testLine.color,
                expect.any(Function)
            );
        });

        it("skips modal and calls patchIn directly when enableGoalPrompt is false", async () => {
            plugin.settings.enableGoalPrompt = false;

            await plugin.patchInWithGoal(testLine);

            expect(GoalPromptModal).not.toHaveBeenCalled();
            // patchIn should have been called — verify via side effects
            expect(plugin.settings.activeLine).toBe("math-140");
        });

        it("stores goal in currentGoal when user provides one", async () => {
            plugin.settings.enableGoalPrompt = true;

            await plugin.patchInWithGoal(testLine);

            // Invoke the captured callback with a goal
            expect(captureGoalCallback.current).not.toBeNull();
            captureGoalCallback.current!("Finish homework");

            expect(plugin.currentGoal).toBe("Finish homework");
        });
    });

    // -------------------------------------------------------
    // disconnect
    // -------------------------------------------------------
    describe("disconnect", () => {
        beforeEach(async () => {
            // Patch in first so there's an active line to disconnect from
            plugin.settings.activeLine = testLine.id;
        });

        it("clears activeLine and saves settings", async () => {
            await plugin.disconnect();

            expect(plugin.settings.activeLine).toBeNull();
            expect(plugin.saveData).toHaveBeenCalled();
        });

        it("deactivates CircuitManager", async () => {
            await plugin.disconnect();

            expect(plugin.circuitManager.deactivate).toHaveBeenCalled();
        });

        it("stops status bar timer updates", async () => {
            await plugin.disconnect();

            expect(plugin.statusBarManager.stopTimerUpdates).toHaveBeenCalled();
        });

        it("cancels auto-disconnect and break reminder", async () => {
            await plugin.disconnect();

            expect(plugin.timerManager.cancelAutoDisconnect).toHaveBeenCalled();
            expect(plugin.timerManager.stopBreakReminder).toHaveBeenCalled();
        });

        it("shows call log modal for sessions ≥ 5 minutes", async () => {
            const sessionInfo = { lineName: "Math 140", startTime: "09:00", endTime: "09:10", durationMinutes: 10 };
            vi.mocked(plugin.sessionLogger.endSession).mockReturnValue(sessionInfo as any);
            vi.mocked(plugin.sessionLogger.getCurrentDuration).mockReturnValue(10);

            await plugin.disconnect();

            expect(CallLogModal).toHaveBeenCalled();
        });

        it("skips call log for sessions < 5 minutes", async () => {
            vi.mocked(plugin.sessionLogger.endSession).mockReturnValue(null);
            vi.mocked(plugin.sessionLogger.getCurrentDuration).mockReturnValue(3);

            await plugin.disconnect();

            expect(CallLogModal).not.toHaveBeenCalled();
        });

        it("logs to daily note", async () => {
            vi.mocked(plugin.sessionLogger.endSession).mockReturnValue(null);
            vi.mocked(plugin.sessionLogger.getCurrentDuration).mockReturnValue(3);

            await plugin.disconnect();

            expect(plugin.sessionLogger.logToDailyNote).toHaveBeenCalledWith("Math 140", 3);
        });

        it("clears currentGoal", async () => {
            plugin.currentGoal = "Study calculus";

            await plugin.disconnect();

            expect(plugin.currentGoal).toBeNull();
        });

        it("shows notice when no active line", async () => {
            plugin.settings.activeLine = null;

            await plugin.disconnect();

            expect(NoticeSpy).toHaveBeenCalledWith("Switchboard: No active connection");
            // Verify no cleanup was attempted
            expect(plugin.circuitManager.deactivate).not.toHaveBeenCalled();
        });

        it("plays disconnect sound", async () => {
            await plugin.disconnect();

            expect(plugin.audioService.playDisconnect).toHaveBeenCalled();
        });

        it("refreshes dashboard", async () => {
            await plugin.disconnect();

            expect(plugin.app.workspace.getLeavesOfType).toHaveBeenCalledWith("switchboard-dashboard");
        });

        it("completes full cleanup even if sessionLogger throws", async () => {
            vi.mocked(plugin.sessionLogger.endSession).mockImplementation(() => {
                throw new Error("session error");
            });

            await plugin.disconnect();

            // These must still be called despite sessionLogger throwing
            expect(plugin.statusBarManager.stopTimerUpdates).toHaveBeenCalled();
            expect(plugin.timerManager.cancelAutoDisconnect).toHaveBeenCalled();
            expect(plugin.timerManager.stopBreakReminder).toHaveBeenCalled();
            expect(plugin.audioService.playDisconnect).toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------
    // onunload
    // -------------------------------------------------------
    describe("onunload", () => {
        it("calls destroy() on statusBarManager, timerManager, audioService", () => {
            plugin.onunload();

            expect(plugin.statusBarManager.destroy).toHaveBeenCalled();
            expect(plugin.timerManager.destroy).toHaveBeenCalled();
            expect(plugin.audioService.destroy).toHaveBeenCalled();
        });

        it("calls stop() on wireService", () => {
            plugin.onunload();

            expect(plugin.wireService.stop).toHaveBeenCalled();
        });

        it("calls deactivate() on circuitManager", () => {
            plugin.onunload();

            expect(plugin.circuitManager.deactivate).toHaveBeenCalled();
        });

        it("clears chronosStartupTimer if set", async () => {
            // Re-create plugin with Chronos enabled to get a startup timer
            const chronosPlugin = new SwitchboardPlugin(new App(), { id: "switchboard" } as any);
            // Mock loadData to return Chronos-enabled settings
            vi.mocked(chronosPlugin.loadData).mockResolvedValue({
                ...DEFAULT_SETTINGS,
                chronosIntegrationEnabled: true,
            });
            await chronosPlugin.onload();

            // The startup timer should have been set
            expect((chronosPlugin as any).chronosStartupTimer).not.toBeNull();

            chronosPlugin.onunload();

            expect((chronosPlugin as any).chronosStartupTimer).toBeNull();
        });
    });

    // -------------------------------------------------------
    // registerLineCommands
    // -------------------------------------------------------
    describe("registerLineCommands", () => {
        it("registers a command for each Line", () => {
            // Clear addCommand calls from onload
            vi.mocked(plugin.addCommand).mockClear();

            plugin.settings.lines = [
                createTestLine({ id: "math-140", name: "Math 140" }),
                createTestLine({ id: "writing", name: "Writing" }),
            ];
            // Clear registered IDs so they re-register
            (plugin as any).registeredCommandIds.clear();

            plugin.registerLineCommands();

            expect(plugin.addCommand).toHaveBeenCalledTimes(2);
            expect(plugin.addCommand).toHaveBeenCalledWith(
                expect.objectContaining({ id: "patch-in-math-140" })
            );
            expect(plugin.addCommand).toHaveBeenCalledWith(
                expect.objectContaining({ id: "patch-in-writing" })
            );
        });

        it("skips already-registered command IDs (Fix A2)", () => {
            vi.mocked(plugin.addCommand).mockClear();

            plugin.settings.lines = [testLine];
            (plugin as any).registeredCommandIds.clear();

            // Register once
            plugin.registerLineCommands();
            expect(plugin.addCommand).toHaveBeenCalledTimes(1);

            vi.mocked(plugin.addCommand).mockClear();

            // Register again — should skip
            plugin.registerLineCommands();
            expect(plugin.addCommand).not.toHaveBeenCalled();
        });

        it("newly added Lines get registered on re-call", () => {
            vi.mocked(plugin.addCommand).mockClear();

            plugin.settings.lines = [testLine];
            (plugin as any).registeredCommandIds.clear();

            plugin.registerLineCommands();
            expect(plugin.addCommand).toHaveBeenCalledTimes(1);

            vi.mocked(plugin.addCommand).mockClear();

            // Add a new line
            plugin.settings.lines.push(createTestLine({ id: "writing", name: "Writing" }));
            plugin.registerLineCommands();

            // Only the new line should be registered
            expect(plugin.addCommand).toHaveBeenCalledTimes(1);
            expect(plugin.addCommand).toHaveBeenCalledWith(
                expect.objectContaining({ id: "patch-in-writing" })
            );
        });
    });

    // -------------------------------------------------------
    // executeOperatorCommand
    // -------------------------------------------------------
    describe("executeOperatorCommand", () => {
        it('action "command" — executes via app.commands', () => {
            (plugin.app as any).commands.commands["editor:toggle-bold"] = { id: "editor:toggle-bold" };

            plugin.executeOperatorCommand({
                name: "Bold",
                icon: "bold",
                action: "command",
                value: "editor:toggle-bold",
            });

            expect((plugin.app as any).commands.executeCommandById).toHaveBeenCalledWith("editor:toggle-bold");
        });

        it('action "command" — shows notice when command not found', () => {
            plugin.executeOperatorCommand({
                name: "Missing",
                icon: "x",
                action: "command",
                value: "nonexistent:command",
            });

            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("Command not found")
            );
        });

        it('action "insert" — inserts text at cursor', () => {
            const mockEditor = {
                getCursor: vi.fn(() => ({ line: 5, ch: 10 })),
                replaceRange: vi.fn(),
                setCursor: vi.fn(),
            };
            (plugin.app.workspace as any).activeEditor = { editor: mockEditor };

            plugin.executeOperatorCommand({
                name: "Insert Hello",
                icon: "text",
                action: "insert",
                value: "Hello World",
            });

            expect(mockEditor.replaceRange).toHaveBeenCalledWith("Hello World", { line: 5, ch: 10 });
        });

        it('action "insert" — shows notice when no active editor', () => {
            (plugin.app.workspace as any).activeEditor = null;

            plugin.executeOperatorCommand({
                name: "Insert",
                icon: "text",
                action: "insert",
                value: "test",
            });

            expect(NoticeSpy).toHaveBeenCalledWith("No active editor - open a note first");
        });

        it('action "open" — opens file by path', () => {
            const mockFile = new TFile();
            vi.mocked(plugin.app.vault.getAbstractFileByPath).mockReturnValue(mockFile);
            const mockLeaf = { openFile: vi.fn() };
            vi.mocked(plugin.app.workspace.getLeaf).mockReturnValue(mockLeaf as any);

            plugin.executeOperatorCommand({
                name: "Open Notes",
                icon: "file",
                action: "open",
                value: "School/notes.md",
            });

            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile);
        });

        it('action "open" — shows notice when file not found', () => {
            vi.mocked(plugin.app.vault.getAbstractFileByPath).mockReturnValue(null);

            plugin.executeOperatorCommand({
                name: "Open Missing",
                icon: "file",
                action: "open",
                value: "nonexistent.md",
            });

            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("File not found")
            );
        });

        it('action "open" — shows notice for folder instead of file', () => {
            const mockFolder = new TFolder();
            vi.mocked(plugin.app.vault.getAbstractFileByPath).mockReturnValue(mockFolder as any);

            plugin.executeOperatorCommand({
                name: "Open Folder",
                icon: "folder",
                action: "open",
                value: "School/Math",
            });

            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cannot open folder")
            );
        });
    });

    // -------------------------------------------------------
    // lifecycle (round-trip + corrupted data)
    // -------------------------------------------------------
    describe("lifecycle", () => {
        it("patchIn → disconnect round-trip restores initial state", async () => {
            expect(plugin.settings.activeLine).toBeNull();
            expect(plugin.currentGoal).toBeNull();

            // Patch in
            plugin.currentGoal = "Test goal";
            await plugin.patchIn(testLine);
            expect(plugin.settings.activeLine).toBe("math-140");

            // Disconnect
            await plugin.disconnect();
            expect(plugin.settings.activeLine).toBeNull();
            expect(plugin.currentGoal).toBeNull();
        });

        it("loadSettings handles null/corrupted data", async () => {
            // Mock loadData to throw (simulating corrupted data.json)
            vi.mocked(plugin.loadData).mockRejectedValue(new Error("JSON parse error"));

            await (plugin as any).loadSettings();

            // Should fall back to defaults
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
            expect(NoticeSpy).toHaveBeenCalledWith(
                expect.stringContaining("Settings corrupted")
            );
        });
    });
});
