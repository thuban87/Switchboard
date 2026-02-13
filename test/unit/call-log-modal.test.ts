import { describe, it, expect, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { CallLogModal } from "../../src/modals/CallLogModal";
import { SessionInfo } from "../../src/services/SessionLogger";
import { createTestLine } from "../helpers";

describe("CallLogModal", () => {
    function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
        return {
            line: createTestLine({ id: "math", name: "Math 140", color: "#3498db" }),
            startTime: new Date(2026, 1, 13, 9, 0, 0),   // 9:00 AM
            endTime: new Date(2026, 1, 13, 10, 30, 0),    // 10:30 AM
            durationMinutes: 90,
            ...overrides,
        };
    }

    function createModal(
        session = createSession(),
        onSubmit = vi.fn(),
        goal: string | null = null
    ) {
        const modal = new CallLogModal(new App() as any, session, onSubmit, goal);
        return { modal, onSubmit, session };
    }

    describe("onOpen — rendering", () => {
        it("renders session line name with color dot", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineName = modal.contentEl.querySelector(".switchboard-call-log-line");
            expect(lineName).not.toBeNull();
            expect(lineName!.textContent).toContain("Math 140");

            const colorDot = modal.contentEl.querySelector(".switchboard-call-log-color-dot");
            expect(colorDot).not.toBeNull();
        });

        it("renders formatted duration and time range", () => {
            const { modal } = createModal();
            modal.onOpen();

            const duration = modal.contentEl.querySelector(".switchboard-call-log-duration");
            expect(duration).not.toBeNull();
            // 90 minutes = "1h 30m" via formatDuration
            expect(duration!.textContent).toContain("1h 30m");
            expect(duration!.textContent).toContain("⏱️");
        });

        it("shows goal reflection section when goal was set", () => {
            const { modal } = createModal(createSession(), vi.fn(), "Finish Chapter 5");
            modal.onOpen();

            const goalReflection = modal.contentEl.querySelector(".switchboard-call-log-goal-reflection");
            expect(goalReflection).not.toBeNull();
            expect(goalReflection!.querySelector(".switchboard-call-log-goal-text")!.textContent).toContain("Finish Chapter 5");
            expect(goalReflection!.querySelector(".switchboard-call-log-goal-question")!.textContent).toContain("Did you accomplish it?");
        });

        it("hides goal reflection section when goal is null", () => {
            const { modal } = createModal(createSession(), vi.fn(), null);
            modal.onOpen();

            const goalReflection = modal.contentEl.querySelector(".switchboard-call-log-goal-reflection");
            expect(goalReflection).toBeNull();
        });

        it("renders textarea with placeholder and maxlength", () => {
            const { modal } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            expect(textarea).not.toBeNull();
            expect(textarea.getAttribute("placeholder")).toBe("Brief summary of your session...");
            expect(textarea.getAttribute("maxlength")).toBe("2000");
        });
    });

    describe("onOpen — interactions", () => {
        it("Done button fires onSubmit with textarea content", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            textarea.value = "Studied derivatives and integrals";

            const doneBtn = modal.contentEl.querySelector(".switchboard-call-log-btn-done") as HTMLElement;
            doneBtn.click();

            expect(onSubmit).toHaveBeenCalledWith("Studied derivatives and integrals");
            expect(modal.close).toHaveBeenCalled();
        });

        it("Done button fires onSubmit('No summary provided') when textarea is empty", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const doneBtn = modal.contentEl.querySelector(".switchboard-call-log-btn-done") as HTMLElement;
            doneBtn.click();

            expect(onSubmit).toHaveBeenCalledWith("No summary provided");
        });

        it("Done button with whitespace-only textarea fires onSubmit('No summary provided')", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            textarea.value = "   \n\t  ";

            const doneBtn = modal.contentEl.querySelector(".switchboard-call-log-btn-done") as HTMLElement;
            doneBtn.click();

            expect(onSubmit).toHaveBeenCalledWith("No summary provided");
        });

        it("Skip button fires onSubmit(null)", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const skipBtn = modal.contentEl.querySelector(".switchboard-call-log-btn-skip") as HTMLElement;
            skipBtn.click();

            expect(onSubmit).toHaveBeenCalledWith(null);
            expect(modal.close).toHaveBeenCalled();
        });

        it("Ctrl+Enter submits from textarea", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            textarea.value = "Quick summary";

            textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

            expect(onSubmit).toHaveBeenCalledWith("Quick summary");
            expect(modal.close).toHaveBeenCalled();
        });

        it("Meta+Enter (Mac) submits from textarea", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            textarea.value = "Mac summary";

            textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }));

            expect(onSubmit).toHaveBeenCalledWith("Mac summary");
            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("character counter", () => {
        it("counter starts at '0 / 2,000'", () => {
            const { modal } = createModal();
            modal.onOpen();

            const counter = modal.contentEl.querySelector(".switchboard-call-log-char-counter");
            expect(counter).not.toBeNull();
            expect(counter!.textContent).toBe("0 / 2,000");
        });

        it("counter updates on input", () => {
            const { modal } = createModal();
            modal.onOpen();

            const textarea = modal.contentEl.querySelector(".switchboard-call-log-textarea") as HTMLTextAreaElement;
            textarea.value = "Hello World"; // 11 characters
            textarea.dispatchEvent(new Event("input"));

            const counter = modal.contentEl.querySelector(".switchboard-call-log-char-counter");
            expect(counter!.textContent).toBe("11 / 2,000");
        });
    });

    describe("formatTime", () => {
        it("formats Date object to readable time string", () => {
            const { modal } = createModal();
            const result = (modal as any).formatTime(new Date(2026, 1, 13, 14, 30, 0));
            // toLocaleTimeString — exact format is locale-dependent
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
