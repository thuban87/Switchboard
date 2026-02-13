import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App } from "../__mocks__/obsidian";
import { IncomingCallModal, IncomingCallData } from "../../src/modals/IncomingCallModal";

function createData(overrides: Partial<IncomingCallData> = {}): IncomingCallData {
    return {
        lineName: "Math 140",
        lineColor: "#e74c3c",
        taskTitle: "Study Chapter 5",
        taskTime: new Date(2026, 1, 13, 14, 30, 0), // Feb 13, 2:30 PM
        filePath: "School/Math/Chapter 5.md",
        ...overrides,
    };
}

describe("IncomingCallModal", () => {
    function createModal(
        data = createData(),
        defaultSnoozeMinutes = 15,
        onAction = vi.fn()
    ) {
        const modal = new IncomingCallModal(new App() as any, data, defaultSnoozeMinutes, onAction);
        return { modal, onAction, data };
    }

    describe("onOpen — rendering", () => {
        it("renders line name with color dot", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineName = modal.contentEl.querySelector(".switchboard-incoming-call-line-name");
            expect(lineName).not.toBeNull();
            expect(lineName!.textContent).toBe("Math 140");

            const colorDot = modal.contentEl.querySelector(".switchboard-incoming-call-color-dot");
            expect(colorDot).not.toBeNull();
        });

        it("renders task title and formatted time", () => {
            const { modal } = createModal();
            modal.onOpen();

            const title = modal.contentEl.querySelector(".switchboard-incoming-call-task-title");
            expect(title).not.toBeNull();
            expect(title!.textContent).toBe("Study Chapter 5");

            const time = modal.contentEl.querySelector(".switchboard-incoming-call-task-time");
            expect(time).not.toBeNull();
            // formatTime uses toLocaleTimeString — just verify it starts with the clock emoji
            expect(time!.textContent).toContain("⏰");
        });

        it("renders file path (basename only) when provided", () => {
            const { modal } = createModal(createData({ filePath: "School/Math/Chapter 5.md" }));
            modal.onOpen();

            const file = modal.contentEl.querySelector(".switchboard-incoming-call-task-file");
            expect(file).not.toBeNull();
            expect(file!.textContent).toContain("Chapter 5.md");
            // Should show basename, not full path
            expect(file!.textContent).not.toContain("School/Math/");
        });

        it("skips file path display when filePath is empty", () => {
            const { modal } = createModal(createData({ filePath: "" }));
            modal.onOpen();

            const file = modal.contentEl.querySelector(".switchboard-incoming-call-task-file");
            expect(file).toBeNull();
        });
    });

    describe("onOpen — connect action", () => {
        it("connect button fires onAction('connect')", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const connectBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-connect") as HTMLElement;
            connectBtn.click();

            expect(onAction).toHaveBeenCalledWith("connect");
            expect(modal.close).toHaveBeenCalled();
        });

        it("connect button sets actionTaken to prevent double-fire", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const connectBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-connect") as HTMLElement;
            connectBtn.click();
            connectBtn.click(); // second click should be ignored

            expect(onAction).toHaveBeenCalledTimes(1);
        });
    });

    describe("onOpen — hold action", () => {
        it("hold button fires onAction('hold', defaultSnoozeMinutes)", () => {
            const { modal, onAction } = createModal(createData(), 15);
            modal.onOpen();

            const holdBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-hold") as HTMLElement;
            holdBtn.click();

            expect(onAction).toHaveBeenCalledWith("hold", 15);
            expect(modal.close).toHaveBeenCalled();
        });

        it("changing snooze dropdown updates hold button text", () => {
            const { modal } = createModal(createData(), 15);
            modal.onOpen();

            const snoozeSelect = modal.contentEl.querySelector(".switchboard-incoming-call-snooze-select") as HTMLSelectElement;
            snoozeSelect.value = "30";
            snoozeSelect.dispatchEvent(new Event("change"));

            const holdBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-hold") as HTMLElement;
            expect(holdBtn.textContent).toContain("30m");
        });

        it("hold uses dropdown value, not default, after change", () => {
            const { modal, onAction } = createModal(createData(), 15);
            modal.onOpen();

            // Change dropdown to 30
            const snoozeSelect = modal.contentEl.querySelector(".switchboard-incoming-call-snooze-select") as HTMLSelectElement;
            snoozeSelect.value = "30";
            snoozeSelect.dispatchEvent(new Event("change"));

            // Click hold — should use dropdown value (30), not default (15)
            const holdBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-hold") as HTMLElement;
            holdBtn.click();

            expect(onAction).toHaveBeenCalledWith("hold", 30);
        });
    });

    describe("onOpen — decline action", () => {
        it("first click shows decline options, button changes to 'Just Dismiss'", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const declineBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-decline") as HTMLElement;
            expect(declineBtn.textContent).toContain("Decline");

            declineBtn.click();

            // Should not have fired onAction yet
            expect(onAction).not.toHaveBeenCalled();

            // Button text changes
            expect(declineBtn.textContent).toContain("Just Dismiss");

            // Decline options become visible
            const declineOptions = modal.contentEl.querySelector(".switchboard-incoming-call-decline-options");
            expect(declineOptions).not.toBeNull();
            expect((declineOptions as HTMLElement).classList.contains("is-visible")).toBe(true);
        });

        it("second click fires onAction('decline')", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const declineBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-decline") as HTMLElement;
            declineBtn.click(); // first click shows options
            declineBtn.click(); // second click dismisses

            expect(onAction).toHaveBeenCalledWith("decline");
            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("decline options", () => {
        it("'30 minutes' fires onAction('reschedule', 30)", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            // First show decline options
            const declineBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-decline") as HTMLElement;
            declineBtn.click();

            // Find the 30-minute button
            const buttons = modal.contentEl.querySelectorAll(".switchboard-incoming-call-btn-secondary");
            const thirtyMinBtn = Array.from(buttons).find(b => b.textContent!.includes("30 minutes")) as HTMLElement;
            expect(thirtyMinBtn).not.toBeUndefined();
            thirtyMinBtn.click();

            expect(onAction).toHaveBeenCalledWith("reschedule", 30);
        });

        it("'1 hour' fires onAction('reschedule', 60)", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const declineBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-decline") as HTMLElement;
            declineBtn.click();

            const buttons = modal.contentEl.querySelectorAll(".switchboard-incoming-call-btn-secondary");
            const oneHourBtn = Array.from(buttons).find(b => b.textContent!.includes("1 hour")) as HTMLElement;
            expect(oneHourBtn).not.toBeUndefined();
            oneHourBtn.click();

            expect(onAction).toHaveBeenCalledWith("reschedule", 60);
        });

        it("'tomorrow' calculates correct minutes until 9 AM next day", () => {
            // Set a known "now": Feb 13, 2026, 10:00 PM
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 1, 13, 22, 0, 0));

            const { modal, onAction } = createModal();
            modal.onOpen();

            const declineBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-decline") as HTMLElement;
            declineBtn.click();

            const buttons = modal.contentEl.querySelectorAll(".switchboard-incoming-call-btn-secondary");
            const tomorrowBtn = Array.from(buttons).find(b => b.textContent!.includes("tomorrow")) as HTMLElement;
            expect(tomorrowBtn).not.toBeUndefined();
            tomorrowBtn.click();

            // From 10:00 PM to 9:00 AM next day = 11 hours = 660 minutes
            expect(onAction).toHaveBeenCalledWith("reschedule", 660);

            vi.useRealTimers();
        });
    });

    describe("actionTaken guard", () => {
        it("only the first button click fires onAction — subsequent clicks are ignored", () => {
            const { modal, onAction } = createModal();
            modal.onOpen();

            const connectBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-connect") as HTMLElement;
            const holdBtn = modal.contentEl.querySelector(".switchboard-incoming-call-btn-hold") as HTMLElement;

            connectBtn.click(); // first click — should fire
            holdBtn.click();    // second click — should be ignored

            expect(onAction).toHaveBeenCalledTimes(1);
            expect(onAction).toHaveBeenCalledWith("connect");
        });
    });

    describe("formatTime", () => {
        it("formats Date to readable time string", () => {
            const { modal } = createModal();
            const result = (modal as any).formatTime(new Date(2026, 1, 13, 14, 30, 0));
            // toLocaleTimeString with hour + minute — exact format is locale-dependent
            // but it should contain the minutes
            expect(result).toBeTruthy();
            expect(typeof result).toBe("string");
        });
    });

    describe("onClose", () => {
        it("empties contentEl after open", () => {
            const { modal } = createModal();
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();
            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});
