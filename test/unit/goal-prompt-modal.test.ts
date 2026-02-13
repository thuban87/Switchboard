import { describe, it, expect, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { GoalPromptModal } from "../../src/modals/GoalPromptModal";

describe("GoalPromptModal", () => {
    function createModal(
        lineName = "Math 140",
        lineColor = "#3498db",
        onSubmit = vi.fn()
    ) {
        const modal = new GoalPromptModal(new App() as any, lineName, lineColor, onSubmit);
        return { modal, onSubmit };
    }

    /** Helper: find the goal input created by Setting.addText */
    function getGoalInput(modal: GoalPromptModal): HTMLInputElement {
        return modal.contentEl.querySelector(".switchboard-goal-prompt-input") as HTMLInputElement;
    }

    /** Helper: simulate typing into the goal input (sets value + fires input event to trigger onChange) */
    function typeInInput(input: HTMLInputElement, value: string) {
        input.value = value;
        input.dispatchEvent(new Event("input"));
    }

    describe("onOpen — rendering", () => {
        it("renders line name in header", () => {
            const { modal } = createModal("Bio 101");
            modal.onOpen();

            const h2 = modal.contentEl.querySelector("h2");
            expect(h2).not.toBeNull();
            expect(h2!.textContent).toBe("Bio 101");
        });

        it("sets line color as CSS variable on modalEl", () => {
            const { modal } = createModal("Math 140", "#e74c3c");
            modal.onOpen();

            expect(modal.modalEl.style.getPropertyValue("--goal-prompt-color")).toBe("#e74c3c");
        });

        it("renders input with placeholder and maxlength 200", () => {
            const { modal } = createModal();
            modal.onOpen();

            const input = getGoalInput(modal);
            expect(input).not.toBeNull();
            expect(input.placeholder).toBe("e.g., Finish reading Chapter 3");
            expect(input.getAttribute("maxlength")).toBe("200");
        });

        it("renders character counter starting at \"0 / 200\"", () => {
            const { modal } = createModal();
            modal.onOpen();

            const counter = modal.contentEl.querySelector(".switchboard-goal-prompt-char-counter");
            expect(counter).not.toBeNull();
            expect(counter!.textContent).toBe("0 / 200");
        });
    });

    describe("onOpen — interactions", () => {
        it("Start Session fires onSubmit with entered goal", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const input = getGoalInput(modal);
            typeInInput(input, "Finish Chapter 3");

            const startBtn = modal.contentEl.querySelector(".switchboard-goal-prompt-btn-primary") as HTMLElement;
            startBtn.click();

            expect(onSubmit).toHaveBeenCalledWith("Finish Chapter 3");
            expect(modal.close).toHaveBeenCalled();
        });

        it("Start Session with empty input fires onSubmit(null)", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            // Don't type anything — goal stays ""
            const startBtn = modal.contentEl.querySelector(".switchboard-goal-prompt-btn-primary") as HTMLElement;
            startBtn.click();

            expect(onSubmit).toHaveBeenCalledWith(null);
        });

        it("Start Session with whitespace-only input fires onSubmit(null)", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const input = getGoalInput(modal);
            typeInInput(input, "   ");

            const startBtn = modal.contentEl.querySelector(".switchboard-goal-prompt-btn-primary") as HTMLElement;
            startBtn.click();

            expect(onSubmit).toHaveBeenCalledWith(null);
        });

        it("Skip fires onSubmit(null)", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const skipBtn = modal.contentEl.querySelector(".switchboard-goal-prompt-btn-secondary") as HTMLElement;
            skipBtn.click();

            expect(onSubmit).toHaveBeenCalledWith(null);
            expect(modal.close).toHaveBeenCalled();
        });

        it("Enter key in input fires onSubmit", () => {
            const { modal, onSubmit } = createModal();
            modal.onOpen();

            const input = getGoalInput(modal);
            typeInInput(input, "Review notes");

            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

            expect(onSubmit).toHaveBeenCalledWith("Review notes");
            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("character counter", () => {
        it("counter updates when user types in input", () => {
            const { modal } = createModal();
            modal.onOpen();

            const input = getGoalInput(modal);
            typeInInput(input, "Hello");

            const counter = modal.contentEl.querySelector(".switchboard-goal-prompt-char-counter");
            expect(counter!.textContent).toBe("5 / 200");
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
