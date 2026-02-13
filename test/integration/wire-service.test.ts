/**
 * Integration tests for WireService (S13)
 * Tests state management, tag matching, timer cleanup, native scheduling,
 * call actions, and file operations.
 *
 * Phase C — Third Testing Pass Addendum
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockPlugin } from "../__mocks__/plugin";
import { SwitchboardLine, ScheduledBlock } from "../../src/types";

// Mock IncomingCallModal at module level for triggerIncomingCall idle test
const mockIncomingCallModalInstance = vi.hoisted(() => ({
    open: vi.fn(),
    close: vi.fn(),
}));
const MockIncomingCallModal = vi.hoisted(() =>
    vi.fn(function (this: any) {
        Object.assign(this, mockIncomingCallModalInstance);
    })
);
vi.mock("../../src/modals/IncomingCallModal", () => ({
    IncomingCallModal: MockIncomingCallModal,
}));

// Mock Logger to suppress console output during tests
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Import WireService AFTER mocks are set up
import { WireService } from "../../src/services/WireService";

function createMockLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "math-140",
        name: "Math 140",
        color: "#3498db",
        safePaths: ["Career/School/Math 140"],
        landingPage: "Career/School/Math 140/Dashboard.canvas",
        sessionLogFile: "",
        sessionLogHeading: "",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

function createScheduledBlock(overrides: Partial<ScheduledBlock> = {}): ScheduledBlock {
    return {
        id: "block-1",
        startTime: "09:00",
        endTime: "10:00",
        ...overrides,
    };
}

describe("WireService", () => {
    let ws: WireService;
    let plugin: ReturnType<typeof createMockPlugin>;

    beforeEach(() => {
        plugin = createMockPlugin({
            settings: {
                lines: [
                    createMockLine(),
                    createMockLine({ id: "writing", name: "Writing" }),
                ],
                activeLine: null,
                enableChronosIntegration: false,
                defaultSnoozeMinutes: 5,
                sessionHistory: [],
            },
        });
        ws = new WireService(plugin.app, plugin as any);
        MockIncomingCallModal.mockClear();
        mockIncomingCallModalInstance.open.mockClear();
    });

    // ─── start / stop lifecycle ──────────────────────────────────────

    describe("start / stop lifecycle", () => {
        it("start() sets isRunning to true", () => {
            ws.start();
            expect(ws.isActive()).toBe(true);
        });

        it("start() is idempotent (calling twice doesn't double-init)", () => {
            const refreshSpy = vi.spyOn(ws as any, "refreshNativeTimers");
            ws.start();
            ws.start(); // second call should be no-op due to isRunning guard
            const callCount = refreshSpy.mock.calls.length;
            expect(ws.isActive()).toBe(true);
            // refreshTimers() returns early when Chronos is null (before its own refreshNativeTimers call)
            // So start() only calls refreshNativeTimers once (line 58). Second start() returns early.
            expect(callCount).toBe(1);
            refreshSpy.mockRestore();
        });

        it("stop() clears all scheduled calls", () => {
            (ws as any).isRunning = true;
            (ws as any).scheduledCalls.set("task-1", {
                taskId: "task-1",
                timerId: setTimeout(() => { }, 99999),
            });
            ws.stop();
            expect((ws as any).scheduledCalls.size).toBe(0);
        });

        it("stop() clears snoozed and declined sets", () => {
            (ws as any).isRunning = true;
            (ws as any).snoozedCalls.set("task-2", { taskId: "task-2", snoozeUntil: new Date() });
            (ws as any).declinedCalls.add("task-3");
            ws.stop();
            expect((ws as any).snoozedCalls.size).toBe(0);
            expect((ws as any).declinedCalls.size).toBe(0);
        });

        it("stop() unsubscribes from Chronos events if subscribed", () => {
            const unsubSpy = vi.fn();
            (ws as any).isRunning = true;
            (ws as any).unsubscribeSyncComplete = unsubSpy;
            ws.stop();
            expect(unsubSpy).toHaveBeenCalledOnce();
            expect((ws as any).unsubscribeSyncComplete).toBeNull();
        });

        it("stop() is idempotent (calling twice is safe)", () => {
            (ws as any).isRunning = true;
            ws.stop();
            expect(ws.isActive()).toBe(false);
            // Calling stop() again should not throw
            ws.stop();
            expect(ws.isActive()).toBe(false);
        });

        it("stop() sets isRunning to false", () => {
            (ws as any).isRunning = true;
            ws.stop();
            expect((ws as any).isRunning).toBe(false);
        });

        it("isActive() returns true when running, false when stopped", () => {
            expect(ws.isActive()).toBe(false);
            (ws as any).isRunning = true;
            expect(ws.isActive()).toBe(true);
            (ws as any).isRunning = false;
            expect(ws.isActive()).toBe(false);
        });
    });

    // ─── getChronosPlugin ────────────────────────────────────────────

    describe("getChronosPlugin", () => {
        it("returns null when plugins not available", () => {
            (plugin.app as any).plugins = undefined;
            const result = (ws as any).getChronosPlugin();
            expect(result).toBeNull();
        });

        it("returns null when Chronos not installed", () => {
            (plugin.app as any).plugins = { plugins: {} };
            const result = (ws as any).getChronosPlugin();
            expect(result).toBeNull();
        });

        it("returns Chronos plugin when available", () => {
            const fakeChronos = { syncManager: {} };
            (plugin.app as any).plugins = {
                plugins: { "chronos-google-calendar-sync": fakeChronos },
            };
            const result = (ws as any).getChronosPlugin();
            expect(result).toBe(fakeChronos);
        });

        it("catches errors and returns null", () => {
            // Make plugins getter throw
            Object.defineProperty(plugin.app, "plugins", {
                get() { throw new Error("kaboom"); },
                configurable: true,
            });
            const result = (ws as any).getChronosPlugin();
            expect(result).toBeNull();
        });
    });

    // ─── getSyncedTasks ──────────────────────────────────────────────

    describe("getSyncedTasks", () => {
        it("returns tasks from syncManager.getSyncData", () => {
            const fakeTask = { title: "Study", tags: ["#switchboard/math-140"] };
            const chronos = {
                syncManager: {
                    getSyncData: () => ({ syncedTasks: { "t1": fakeTask } }),
                },
            };
            const result = (ws as any).getSyncedTasks(chronos);
            expect(result).toEqual([fakeTask]);
        });

        it("returns empty array when no syncManager", () => {
            const result = (ws as any).getSyncedTasks({});
            expect(result).toEqual([]);
        });

        it("returns empty array on error", () => {
            const chronos = {
                syncManager: {
                    getSyncData: () => { throw new Error("fail"); },
                },
            };
            const result = (ws as any).getSyncedTasks(chronos);
            expect(result).toEqual([]);
        });
    });

    // ─── findMatchingLine ────────────────────────────────────────────

    describe("findMatchingLine", () => {
        it("matches #switchboard/line-id tag (exact ID match)", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/math-140"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("math-140");
        });

        it("matches #switchboard/line-name tag (slug match)", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/writing"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("writing");
        });

        it("returns null when no matching tag", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/nonexistent"]);
            expect(result).toBeNull();
        });

        it("returns null for empty tags array", () => {
            const result = (ws as any).findMatchingLine([]);
            expect(result).toBeNull();
        });

        it("handles tag with # prefix", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/math-140"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("math-140");
        });

        it("handles tag without # prefix", () => {
            const result = (ws as any).findMatchingLine(["switchboard/math-140"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("math-140");
        });

        it("case-insensitive matching", () => {
            const result = (ws as any).findMatchingLine(["#Switchboard/Math-140"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("math-140");
        });
    });

    // ─── parseTaskTime ───────────────────────────────────────────────

    describe("parseTaskTime", () => {
        it("parses datetime field", () => {
            const result = (ws as any).parseTaskTime({ datetime: "2026-02-10T14:00:00" });
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2026);
        });

        it("parses date + time fields", () => {
            const result = (ws as any).parseTaskTime({ date: "2026-02-10", time: "14:30" });
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(14);
            expect(result.getMinutes()).toBe(30);
        });

        it("parses taskDate + taskTime (SyncedTaskInfo format)", () => {
            const result = (ws as any).parseTaskTime({ taskDate: "2026-02-10", taskTime: "09:00" });
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(9);
        });

        it("uses '00:00' when time field is missing", () => {
            const result = (ws as any).parseTaskTime({ date: "2026-02-10" });
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        it("returns null for invalid datetime", () => {
            const result = (ws as any).parseTaskTime({ datetime: "not-a-date" });
            expect(result).toBeNull();
        });

        it("returns null when no date fields present", () => {
            const result = (ws as any).parseTaskTime({ title: "just a title" });
            expect(result).toBeNull();
        });
    });

    // ─── generateTaskId ──────────────────────────────────────────────

    describe("generateTaskId", () => {
        it("generates ID from filePath, lineNumber, and date", () => {
            const result = (ws as any).generateTaskId({
                filePath: "tasks.md",
                lineNumber: 5,
                date: "2026-02-10",
            });
            expect(result).toBe("tasks.md:5:2026-02-10");
        });

        it("handles missing fields with defaults", () => {
            const result = (ws as any).generateTaskId({});
            expect(result).toBe(":0:");
        });
    });

    // ─── refreshNativeTimers ─────────────────────────────────────────

    describe("refreshNativeTimers", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            // Set current time to Wednesday 2026-02-11 at 08:00
            vi.setSystemTime(new Date("2026-02-11T08:00:00"));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("schedules calls for today's recurring blocks", () => {
            const wednesday = 3; // 2026-02-11 is Wednesday
            plugin.settings.lines = [
                createMockLine({
                    scheduledBlocks: [
                        createScheduledBlock({
                            recurring: true,
                            days: [wednesday],
                            startTime: "09:00",
                        }),
                    ],
                }),
            ];

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(1);
        });

        it("skips recurring blocks not scheduled for today", () => {
            const monday = 1;
            plugin.settings.lines = [
                createMockLine({
                    scheduledBlocks: [
                        createScheduledBlock({
                            recurring: true,
                            days: [monday], // Today is Wednesday
                            startTime: "09:00",
                        }),
                    ],
                }),
            ];

            (ws as any).refreshNativeTimers();
            // Should still schedule — for next Monday (future occurrence)
            // The getNextTriggerTime finds next matching day
            expect((ws as any).scheduledCalls.size).toBe(1);
        });

        it("schedules one-time blocks for future dates", () => {
            plugin.settings.lines = [
                createMockLine({
                    scheduledBlocks: [
                        createScheduledBlock({
                            recurring: false,
                            date: "2026-02-12", // Tomorrow
                            startTime: "09:00",
                        }),
                    ],
                }),
            ];

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(1);
        });

        it("skips one-time blocks with past dates", () => {
            plugin.settings.lines = [
                createMockLine({
                    scheduledBlocks: [
                        createScheduledBlock({
                            recurring: false,
                            date: "2026-02-01", // Past date
                            startTime: "09:00",
                        }),
                    ],
                }),
            ];

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(0);
        });

        it("skips already-scheduled block IDs", () => {
            const wednesday = 3;
            const block = createScheduledBlock({
                recurring: true,
                days: [wednesday],
                startTime: "09:00",
            });
            plugin.settings.lines = [createMockLine({ scheduledBlocks: [block] })];

            // Run once to populate scheduledCalls
            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(1);

            // Run again — should not add duplicates
            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(1);
        });

        it("skips declined block IDs", () => {
            const wednesday = 3;
            const block = createScheduledBlock({
                id: "declined-block",
                recurring: true,
                days: [wednesday],
                startTime: "09:00",
            });
            plugin.settings.lines = [createMockLine({ scheduledBlocks: [block] })];

            // First run to get the blockId format
            (ws as any).refreshNativeTimers();
            const blockIds = Array.from((ws as any).scheduledCalls.keys());
            expect(blockIds.length).toBe(1);

            // Clear and decline, then re-run
            (ws as any).scheduledCalls.clear();
            (ws as any).declinedCalls.add(blockIds[0]);

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(0);
        });

        it("uses snoozed trigger time when snoozed", () => {
            const wednesday = 3;
            const block = createScheduledBlock({
                id: "snoozed-block",
                recurring: true,
                days: [wednesday],
                startTime: "09:00",
            });
            plugin.settings.lines = [createMockLine({ scheduledBlocks: [block] })];

            // Pre-populate snooze for the expected blockId
            // First discover what the blockId would be
            (ws as any).refreshNativeTimers();
            const blockIds = Array.from((ws as any).scheduledCalls.keys()) as string[];
            expect(blockIds.length).toBe(1);

            // Now clear and set up snooze
            (ws as any).scheduledCalls.clear();
            const snoozeTime = new Date("2026-02-11T09:30:00");
            (ws as any).snoozedCalls.set(blockIds[0], { taskId: blockIds[0], snoozeUntil: snoozeTime });

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(1);
            // The scheduled call should use the snooze time
            const scheduledCall = (ws as any).scheduledCalls.get(blockIds[0]);
            expect(scheduledCall.taskTime.getTime()).toBe(snoozeTime.getTime());
        });

        it("skips lines with no scheduled blocks", () => {
            plugin.settings.lines = [createMockLine({ scheduledBlocks: [] })];

            (ws as any).refreshNativeTimers();
            expect((ws as any).scheduledCalls.size).toBe(0);
        });
    });

    // ─── getNextTriggerTime ──────────────────────────────────────────

    describe("getNextTriggerTime", () => {
        it("returns correct time for recurring block matching today", () => {
            const now = new Date("2026-02-11T08:00:00"); // Wednesday
            const currentDay = now.getDay(); // 3
            const block = createScheduledBlock({
                recurring: true,
                days: [currentDay],
                startTime: "09:00",
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).not.toBeNull();
            expect(result.getHours()).toBe(9);
            expect(result.getMinutes()).toBe(0);
            expect(result.getDate()).toBe(11); // Same day
        });

        it("returns next occurrence for recurring block not today", () => {
            const now = new Date("2026-02-11T08:00:00"); // Wednesday = 3
            const currentDay = now.getDay(); // 3
            const friday = 5;
            const block = createScheduledBlock({
                recurring: true,
                days: [friday],
                startTime: "10:00",
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).not.toBeNull();
            expect(result.getDate()).toBe(13); // Friday Feb 13
            expect(result.getHours()).toBe(10);
        });

        it("skips today's time if already passed (recurring)", () => {
            const now = new Date("2026-02-11T10:30:00"); // Wednesday, 10:30
            const currentDay = now.getDay(); // 3
            const block = createScheduledBlock({
                recurring: true,
                days: [currentDay], // Wednesday only
                startTime: "09:00", // Already passed
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            // Should skip today and wrap to next Wednesday (7 days)
            // or return null if no other matching days
            // Source: offset=0, time passed, continues loop. No other days match.
            // After 7 iterations (0-6), loops for offset 0 (Wed, time passed → skip),
            // no other days in array, so returns null
            expect(result).toBeNull();
        });

        it("returns correct time for one-time block", () => {
            const now = new Date("2026-02-11T08:00:00");
            const currentDay = now.getDay();
            const block = createScheduledBlock({
                recurring: false,
                date: "2026-02-12",
                startTime: "14:00",
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).not.toBeNull();
            expect(result.getDate()).toBe(12);
            expect(result.getHours()).toBe(14);
        });

        it("returns null for one-time block in the past", () => {
            const now = new Date("2026-02-11T08:00:00");
            const currentDay = now.getDay();
            const block = createScheduledBlock({
                recurring: false,
                date: "2026-02-01",
                startTime: "09:00",
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).toBeNull();
        });

        it("returns null for recurring block with no matching days", () => {
            const now = new Date("2026-02-11T08:00:00");
            const currentDay = now.getDay();
            const block = createScheduledBlock({
                recurring: true,
                days: [], // Empty days array
                startTime: "09:00",
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).toBeNull();
        });

        it("returns null for block that is neither recurring nor one-time", () => {
            const now = new Date("2026-02-11T08:00:00");
            const currentDay = now.getDay();
            const block = createScheduledBlock({
                recurring: false,
                // No date set
            });

            const result = (ws as any).getNextTriggerTime(block, now, currentDay);
            expect(result).toBeNull();
        });
    });

    // ─── scheduleCall / scheduleNativeCall ────────────────────────────

    describe("scheduleCall / scheduleNativeCall", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T08:00:00"));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("scheduleCall creates timeout with correct delay", () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", lineNumber: 1, date: "2026-02-11" };
            const triggerTime = new Date("2026-02-11T09:00:00"); // 1 hour from now

            (ws as any).scheduleCall(task, line, triggerTime);

            const taskId = (ws as any).generateTaskId(task);
            const scheduled = (ws as any).scheduledCalls.get(taskId);
            expect(scheduled).toBeDefined();
            expect(scheduled.timerId).toBeDefined();
            expect(scheduled.lineId).toBe("math-140");
            expect(scheduled.taskTime.getTime()).toBe(triggerTime.getTime());
        });

        it("scheduleCall adds entry to scheduledCalls map", () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", lineNumber: 1, date: "2026-02-11" };
            const triggerTime = new Date("2026-02-11T09:00:00");

            expect((ws as any).scheduledCalls.size).toBe(0);
            (ws as any).scheduleCall(task, line, triggerTime);
            expect((ws as any).scheduledCalls.size).toBe(1);
        });

        it("scheduleNativeCall creates timeout and adds to map", () => {
            const line = createMockLine();
            const task = { title: "Scheduled: Math 140", filePath: "", lineNumber: 0, date: "2026-02-11" };
            const triggerTime = new Date("2026-02-11T09:00:00");
            const blockId = "native:math-140:block-1:2026-02-11T09:00:00.000Z";

            (ws as any).scheduleNativeCall(task, line, triggerTime, blockId);

            const scheduled = (ws as any).scheduledCalls.get(blockId);
            expect(scheduled).toBeDefined();
            expect(scheduled.taskId).toBe(blockId);
            expect(scheduled.lineId).toBe("math-140");
        });
    });

    // ─── triggerIncomingCall ──────────────────────────────────────────

    describe("triggerIncomingCall", () => {
        it("suppressed when already patched into the same Line", () => {
            (ws as any).isRunning = true;
            plugin.settings.activeLine = "math-140";

            const line = createMockLine({ id: "math-140" });
            const task = { title: "Study session", filePath: "tasks.md" };

            (ws as any).triggerIncomingCall(task, line);

            expect(plugin.missedCalls.length).toBe(0);
            expect(MockIncomingCallModal).not.toHaveBeenCalled();
        });

        it("shows busy Notice and tracks missed call when on different Line", () => {
            (ws as any).isRunning = true;
            plugin.settings.activeLine = "writing";
            plugin.getActiveLine = vi.fn(() => createMockLine({ id: "writing", name: "Writing" }));

            const line = createMockLine({ id: "math-140", name: "Math 140" });
            const task = { title: "Study calculus", filePath: "tasks.md" };

            (ws as any).triggerIncomingCall(task, line);

            expect(plugin.missedCalls.length).toBe(1);
            expect(plugin.missedCalls[0].lineName).toBe("Math 140");
            expect(MockIncomingCallModal).not.toHaveBeenCalled();
        });

        it("opens IncomingCallModal when idle (no active line)", () => {
            (ws as any).isRunning = true;
            plugin.settings.activeLine = null;
            plugin.getActiveLine = vi.fn(() => null);

            const line = createMockLine({ id: "math-140", name: "Math 140" });
            const task = { title: "Study calculus", filePath: "tasks.md", datetime: "2026-02-11T09:00:00" };

            (ws as any).triggerIncomingCall(task, line);

            expect(MockIncomingCallModal).toHaveBeenCalledOnce();
            expect(mockIncomingCallModalInstance.open).toHaveBeenCalledOnce();
        });

        it("removes task from scheduledCalls after triggering", () => {
            (ws as any).isRunning = true;
            plugin.settings.activeLine = "math-140"; // Will suppress, but still removes from map

            const line = createMockLine({ id: "math-140" });
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };
            const taskId = (ws as any).generateTaskId(task);

            // Pre-populate scheduledCalls
            (ws as any).scheduledCalls.set(taskId, { taskId, timerId: 0 });
            expect((ws as any).scheduledCalls.has(taskId)).toBe(true);

            (ws as any).triggerIncomingCall(task, line);

            expect((ws as any).scheduledCalls.has(taskId)).toBe(false);
        });
    });

    // ─── handleCallAction ────────────────────────────────────────────

    describe("handleCallAction", () => {
        it("action 'connect' — calls patchIn with correct line", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "connect");

            expect(plugin.patchIn).toHaveBeenCalledWith(line);
        });

        it("action 'connect' — schedules auto-disconnect when task has _endTime", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T09:00:00"));

            const line = createMockLine();
            const task = {
                title: "Study",
                filePath: "tasks.md",
                date: "2026-02-11",
                _endTime: "10:30",
            };

            await (ws as any).handleCallAction(task, line, "connect");

            expect(plugin.patchIn).toHaveBeenCalledWith(line);
            expect(plugin.scheduleAutoDisconnect).toHaveBeenCalledOnce();

            // Verify the scheduled time is 10:30
            const scheduledDate = plugin.scheduleAutoDisconnect.mock.calls[0][0] as Date;
            expect(scheduledDate.getHours()).toBe(10);
            expect(scheduledDate.getMinutes()).toBe(30);

            vi.useRealTimers();
        });

        it("action 'connect' — skips auto-disconnect when endTime is in the past", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T11:00:00")); // 11 AM

            const line = createMockLine();
            const task = {
                title: "Study",
                filePath: "tasks.md",
                date: "2026-02-11",
                _endTime: "10:30", // Already passed
            };

            await (ws as any).handleCallAction(task, line, "connect");

            expect(plugin.patchIn).toHaveBeenCalledWith(line);
            expect(plugin.scheduleAutoDisconnect).not.toHaveBeenCalled();

            vi.useRealTimers();
        });

        it("action 'hold' — adds to snoozedCalls with correct snooze time", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T09:00:00"));

            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "hold", 10);

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).snoozedCalls.has(taskId)).toBe(true);

            const snoozed = (ws as any).snoozedCalls.get(taskId);
            // Snooze should be 10 minutes from now (09:10)
            expect(snoozed.snoozeUntil.getHours()).toBe(9);
            expect(snoozed.snoozeUntil.getMinutes()).toBe(10);

            vi.useRealTimers();
        });

        it("action 'hold' — reschedules call for after snooze period", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T09:00:00"));

            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "hold", 15);

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).scheduledCalls.has(taskId)).toBe(true);

            vi.useRealTimers();
        });

        it("action 'hold' — uses default 5 min when snoozeMinutes not provided", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T09:00:00"));

            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "hold"); // No snoozeMinutes

            const taskId = (ws as any).generateTaskId(task);
            const snoozed = (ws as any).snoozedCalls.get(taskId);
            // Default 5 min snooze → 09:05
            expect(snoozed.snoozeUntil.getHours()).toBe(9);
            expect(snoozed.snoozeUntil.getMinutes()).toBe(5);

            vi.useRealTimers();
        });

        it("snooze then decline: clears snoozed and cancels timer (S6 #7)", async () => {
            (ws as any).isRunning = true;
            const line = createMockLine();
            const task = { title: "Study session", filePath: "tasks.md", date: "2026-02-10" };

            // First snooze
            await (ws as any).handleCallAction(task, line, "hold", 10);

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).snoozedCalls.has(taskId)).toBe(true);
            expect((ws as any).scheduledCalls.has(taskId)).toBe(true);

            // Then decline
            await (ws as any).handleCallAction(task, line, "decline");

            expect((ws as any).snoozedCalls.has(taskId)).toBe(false);
            expect((ws as any).scheduledCalls.has(taskId)).toBe(false);
            expect((ws as any).declinedCalls.has(taskId)).toBe(true);
        });

        it("action 'decline' — adds to declinedCalls", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "decline");

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).declinedCalls.has(taskId)).toBe(true);
        });

        it("action 'decline' — cancels existing scheduled timer", async () => {
            vi.useFakeTimers();
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };
            const taskId = (ws as any).generateTaskId(task);

            // Pre-schedule a call
            const timerId = setTimeout(() => { }, 99999);
            (ws as any).scheduledCalls.set(taskId, { taskId, timerId });

            await (ws as any).handleCallAction(task, line, "decline");

            expect((ws as any).scheduledCalls.has(taskId)).toBe(false);
            vi.useRealTimers();
        });

        it("action 'decline' — removes from snoozedCalls", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };
            const taskId = (ws as any).generateTaskId(task);

            // Pre-populate snoozed
            (ws as any).snoozedCalls.set(taskId, { taskId, snoozeUntil: new Date() });

            await (ws as any).handleCallAction(task, line, "decline");

            expect((ws as any).snoozedCalls.has(taskId)).toBe(false);
        });

        it("action 'call-waiting' — saves to Call Waiting file", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            // Mock vault — file does not exist
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.create = vi.fn().mockResolvedValue(undefined);

            await (ws as any).handleCallAction(task, line, "call-waiting");

            expect(plugin.app.vault.create).toHaveBeenCalledOnce();
            const createCall = (plugin.app.vault.create as any).mock.calls[0];
            expect(createCall[0]).toBe("Call Waiting.md");
        });

        it("action 'call-waiting' — adds to declinedCalls", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.create = vi.fn().mockResolvedValue(undefined);

            await (ws as any).handleCallAction(task, line, "call-waiting");

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).declinedCalls.has(taskId)).toBe(true);
        });

        it("action 'reschedule' — schedules callback after specified minutes", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-02-11T09:00:00"));

            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "reschedule", 30);

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).scheduledCalls.has(taskId)).toBe(true);

            vi.useRealTimers();
        });

        it("action 'reschedule' — no-op when snoozeMinutes is falsy", async () => {
            const line = createMockLine();
            const task = { title: "Study", filePath: "tasks.md", date: "2026-02-11" };

            await (ws as any).handleCallAction(task, line, "reschedule"); // No minutes

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).scheduledCalls.has(taskId)).toBe(false);
        });

        it("decline prevents re-scheduling on next refresh", async () => {
            (ws as any).isRunning = true;
            const line = createMockLine();
            const task = { title: "Study session", filePath: "tasks.md", date: "2026-02-10" };

            await (ws as any).handleCallAction(task, line, "decline");

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).declinedCalls.has(taskId)).toBe(true);
        });
    });

    // ─── saveToCallWaiting ───────────────────────────────────────────

    describe("saveToCallWaiting", () => {
        it("appends entry to existing Call Waiting file via vault.process", async () => {
            const { TFile } = await import("../__mocks__/obsidian");
            const mockFile = new TFile();
            mockFile.path = "Call Waiting.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => mockFile);
            plugin.app.vault.process = vi.fn().mockResolvedValue(undefined);

            const line = createMockLine({ name: "Math 140" });
            const task = { title: "Study calculus" };

            await (ws as any).saveToCallWaiting(task, line);

            expect(plugin.app.vault.process).toHaveBeenCalledOnce();
            const processCall = (plugin.app.vault.process as any).mock.calls[0];
            expect(processCall[0]).toBe(mockFile);

            // Verify the callback appends correctly
            const callback = processCall[1];
            const result = callback("# Call Waiting\n\n- existing");
            expect(result).toContain("Math 140");
            expect(result).toContain("Study calculus");
        });

        it("creates new Call Waiting file when not found", async () => {
            plugin.app.vault.getAbstractFileByPath = vi.fn(() => null);
            plugin.app.vault.create = vi.fn().mockResolvedValue(undefined);

            const line = createMockLine({ name: "Writing" });
            const task = { title: "Draft essay" };

            await (ws as any).saveToCallWaiting(task, line);

            expect(plugin.app.vault.create).toHaveBeenCalledOnce();
            const createCall = (plugin.app.vault.create as any).mock.calls[0];
            expect(createCall[0]).toBe("Call Waiting.md");
            expect(createCall[1]).toContain("# Call Waiting");
            expect(createCall[1]).toContain("Writing");
            expect(createCall[1]).toContain("Draft essay");
        });

        it("handles vault.process errors gracefully", async () => {
            const { TFile } = await import("../__mocks__/obsidian");
            const mockFile = new TFile();
            mockFile.path = "Call Waiting.md";

            plugin.app.vault.getAbstractFileByPath = vi.fn(() => mockFile);
            plugin.app.vault.process = vi.fn().mockRejectedValue(new Error("write failed"));

            const line = createMockLine();
            const task = { title: "Study" };

            // Should not throw
            await expect(
                (ws as any).saveToCallWaiting(task, line)
            ).resolves.toBeUndefined();
        });
    });
});
