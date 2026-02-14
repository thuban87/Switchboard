import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App } from "../__mocks__/obsidian";
import { TimeUpModal } from "../../src/modals/TimeUpModal";
import { createTestLine } from "../helpers";
import { createMockPlugin } from "../__mocks__/plugin";

// Notice spy must be declared via vi.hoisted() for use inside vi.mock factory
const { NoticeSpy } = vi.hoisted(() => ({
    NoticeSpy: vi.fn(),
}));

// Partial mock obsidian — override Notice with a spy
vi.mock("obsidian", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as any), Notice: NoticeSpy };
});

describe("TimeUpModal", () => {
    let plugin: ReturnType<typeof createMockPlugin>;
    let line: ReturnType<typeof createTestLine>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-13T10:00:00"));
        plugin = createMockPlugin();
        line = createTestLine({ id: "math-140", name: "Math 140" });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function createModal() {
        return new TimeUpModal(new App() as any, plugin as any, line);
    }

    /** Helper: find all extend buttons */
    function getExtendButtons(modal: TimeUpModal): HTMLElement[] {
        return Array.from(modal.contentEl.querySelectorAll(".switchboard-timeup-extend")) as HTMLElement[];
    }

    /** Helper: find Hang Up button */
    function getHangUpButton(modal: TimeUpModal): HTMLElement {
        return modal.contentEl.querySelector(".switchboard-timeup-disconnect") as HTMLElement;
    }

    describe("onOpen — rendering", () => {
        it("renders line name in message", () => {
            const modal = createModal();
            modal.onOpen();

            const message = modal.contentEl.querySelector(".switchboard-timeup-message p");
            expect(message).not.toBeNull();
            expect(message!.textContent).toContain("Math 140");
        });

        it("renders three extend buttons (\"+15 min\", \"+30 min\", \"+1 hour\")", () => {
            const modal = createModal();
            modal.onOpen();

            const buttons = getExtendButtons(modal);
            expect(buttons.length).toBe(3);
            expect(buttons[0].textContent).toBe("+15 min");
            expect(buttons[1].textContent).toBe("+30 min");
            expect(buttons[2].textContent).toBe("+1 hour");
        });

        it("renders Hang Up button", () => {
            const modal = createModal();
            modal.onOpen();

            const hangUp = getHangUpButton(modal);
            expect(hangUp).not.toBeNull();
            expect(hangUp.textContent).toBe("Hang Up");
        });
    });

    describe("onOpen — extend actions", () => {
        it("+15 min calls scheduleAutoDisconnect with time 15 min from now", () => {
            const modal = createModal();
            modal.onOpen();

            getExtendButtons(modal)[0].click();

            expect(plugin.scheduleAutoDisconnect).toHaveBeenCalledTimes(1);
            const arg = plugin.scheduleAutoDisconnect.mock.calls[0][0] as Date;
            expect(arg.getTime()).toBe(new Date("2026-02-13T10:15:00").getTime());
        });

        it("+30 min calls scheduleAutoDisconnect with time 30 min from now", () => {
            const modal = createModal();
            modal.onOpen();

            getExtendButtons(modal)[1].click();

            expect(plugin.scheduleAutoDisconnect).toHaveBeenCalledTimes(1);
            const arg = plugin.scheduleAutoDisconnect.mock.calls[0][0] as Date;
            expect(arg.getTime()).toBe(new Date("2026-02-13T10:30:00").getTime());
        });

        it("+1 hour calls scheduleAutoDisconnect with time 60 min from now", () => {
            const modal = createModal();
            modal.onOpen();

            getExtendButtons(modal)[2].click();

            expect(plugin.scheduleAutoDisconnect).toHaveBeenCalledTimes(1);
            const arg = plugin.scheduleAutoDisconnect.mock.calls[0][0] as Date;
            expect(arg.getTime()).toBe(new Date("2026-02-13T11:00:00").getTime());
        });

        it("extend shows Notice with correct duration text", () => {
            const modal = createModal();
            modal.onOpen();

            getExtendButtons(modal)[1].click();

            expect(NoticeSpy).toHaveBeenCalledWith(expect.stringContaining("30 minutes"));
        });
    });

    describe("onOpen — disconnect", () => {
        it("Hang Up button calls plugin.disconnect()", () => {
            const modal = createModal();
            modal.onOpen();

            getHangUpButton(modal).click();

            expect(plugin.disconnect).toHaveBeenCalledTimes(1);
        });

        it("Hang Up button closes modal", () => {
            const modal = createModal();
            modal.onOpen();

            getHangUpButton(modal).click();

            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("onClose", () => {
        it("empties contentEl", () => {
            const modal = createModal();
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();
            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});
