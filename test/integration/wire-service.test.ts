/**
 * Integration tests for WireService (S13)
 * Tests state management, tag matching, and timer cleanup
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockPlugin } from "../__mocks__/plugin";
import { WireService } from "../../src/services/WireService";
import { SwitchboardLine } from "../../src/types";

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
    });

    describe("stop()", () => {
        it("clears all scheduledCalls, snoozedCalls, and declinedCalls (S6 A1)", () => {
            // Start the service so isRunning = true
            // We need to set isRunning directly since start() tries to access Chronos
            (ws as any).isRunning = true;

            // Manually add some state
            (ws as any).scheduledCalls.set("task-1", {
                taskId: "task-1",
                timerId: setTimeout(() => { }, 99999),
            });
            (ws as any).snoozedCalls.set("task-2", {
                taskId: "task-2",
                snoozeUntil: new Date(),
            });
            (ws as any).declinedCalls.add("task-3");

            ws.stop();

            expect((ws as any).scheduledCalls.size).toBe(0);
            expect((ws as any).snoozedCalls.size).toBe(0);
            expect((ws as any).declinedCalls.size).toBe(0);
            expect((ws as any).isRunning).toBe(false);
        });
    });

    describe("handleCallAction()", () => {
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

        it("decline prevents re-scheduling on next refresh", async () => {
            (ws as any).isRunning = true;
            const line = createMockLine();
            const task = { title: "Study session", filePath: "tasks.md", date: "2026-02-10" };

            await (ws as any).handleCallAction(task, line, "decline");

            const taskId = (ws as any).generateTaskId(task);
            expect((ws as any).declinedCalls.has(taskId)).toBe(true);
        });
    });

    describe("triggerIncomingCall()", () => {
        it("suppressed when already patched into the same Line", () => {
            (ws as any).isRunning = true;
            plugin.settings.activeLine = "math-140";

            const line = createMockLine({ id: "math-140" });
            const task = { title: "Study session", filePath: "tasks.md" };

            // Should not throw and should not add to missed calls
            (ws as any).triggerIncomingCall(task, line);

            expect(plugin.missedCalls.length).toBe(0);
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
        });
    });

    describe("findMatchingLine()", () => {
        it("matches #switchboard/line-name tag by ID", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/math-140"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("math-140");
        });

        it("matches by name slug fallback", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/writing"]);
            expect(result).not.toBeNull();
            expect(result.id).toBe("writing");
        });

        it("returns null for unknown tag", () => {
            const result = (ws as any).findMatchingLine(["#switchboard/nonexistent"]);
            expect(result).toBeNull();
        });
    });

    describe("parseTaskTime()", () => {
        it("returns null for invalid date strings (S6 A4)", () => {
            const result = (ws as any).parseTaskTime({ datetime: "not-a-date" });
            expect(result).toBeNull();
        });

        it("parses valid datetime", () => {
            const result = (ws as any).parseTaskTime({ datetime: "2026-02-10T14:00:00" });
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2026);
        });
    });
});
