import { describe, it, expect, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { QuickSwitchModal } from "../../src/modals/QuickSwitchModal";
import { createTestLine } from "../helpers";

describe("QuickSwitchModal", () => {
    function createModal(
        lines = [
            createTestLine({ id: "a", name: "Line A", color: "#ff0000" }),
            createTestLine({ id: "b", name: "Line B", color: "#00ff00" }),
            createTestLine({ id: "c", name: "Line C", color: "#0000ff" }),
        ],
        activeLine: string | null = null,
        currentGoal: string | null = null,
        onSelect = vi.fn()
    ) {
        const modal = new QuickSwitchModal(new App() as any, lines, activeLine, currentGoal, onSelect);
        return { modal, onSelect, lines };
    }

    describe("onOpen — rendering", () => {
        it("renders all Lines with names and colors", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect(lineEls.length).toBe(3);

            // Names
            expect(lineEls[0].querySelector(".switchboard-quick-switch-line-name")!.textContent).toBe("Line A");
            expect(lineEls[1].querySelector(".switchboard-quick-switch-line-name")!.textContent).toBe("Line B");
            expect(lineEls[2].querySelector(".switchboard-quick-switch-line-name")!.textContent).toBe("Line C");

            // CSS variable --line-color
            expect((lineEls[0] as HTMLElement).style.getPropertyValue("--line-color")).toBe("#ff0000");
            expect((lineEls[1] as HTMLElement).style.getPropertyValue("--line-color")).toBe("#00ff00");
            expect((lineEls[2] as HTMLElement).style.getPropertyValue("--line-color")).toBe("#0000ff");
        });

        it("shows current active session + goal at top", () => {
            const { modal } = createModal(undefined, "a", "Finish homework");
            modal.onOpen();

            const current = modal.contentEl.querySelector(".switchboard-quick-switch-current");
            expect(current).not.toBeNull();
            expect(current!.querySelector(".switchboard-quick-switch-current-name")!.textContent).toBe("Line A");
            expect(current!.querySelector(".switchboard-quick-switch-current-goal")!.textContent).toContain("Finish homework");
            expect((current as HTMLElement).style.getPropertyValue("--line-color")).toBe("#ff0000");
        });

        it("active Line has 'is-current' class", () => {
            const { modal } = createModal(undefined, "b");
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-current")).toBe(false);
            expect((lineEls[1] as HTMLElement).classList.contains("is-current")).toBe(true);
            expect((lineEls[2] as HTMLElement).classList.contains("is-current")).toBe(false);
        });

        it("first Line starts with 'is-selected' class", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-selected")).toBe(true);
            expect((lineEls[1] as HTMLElement).classList.contains("is-selected")).toBe(false);
        });

        it("shows empty state when no Lines configured", () => {
            const { modal } = createModal([]);
            modal.onOpen();

            const empty = modal.contentEl.querySelector(".switchboard-quick-switch-empty");
            expect(empty).not.toBeNull();
            expect(empty!.textContent).toContain("No lines configured");
        });

        it("shows disconnect button only when a Line is active", () => {
            const { modal: withActive } = createModal(undefined, "a");
            withActive.onOpen();
            expect(withActive.contentEl.querySelector(".switchboard-quick-switch-disconnect")).not.toBeNull();

            const { modal: noActive } = createModal(undefined, null);
            noActive.onOpen();
            expect(noActive.contentEl.querySelector(".switchboard-quick-switch-disconnect")).toBeNull();
        });

        it("renders keyboard hint bar", () => {
            const { modal } = createModal();
            modal.onOpen();

            const hint = modal.contentEl.querySelector(".switchboard-quick-switch-hint");
            expect(hint).not.toBeNull();
            expect(hint!.textContent).toContain("navigate");
            expect(hint!.textContent).toContain("select");
            expect(hint!.textContent).toContain("close");
        });
    });

    describe("onOpen — interactions", () => {
        it("clicking a non-active Line fires onSelect(line) and closes modal", () => {
            const lines = [
                createTestLine({ id: "a", name: "Line A" }),
                createTestLine({ id: "b", name: "Line B" }),
            ];
            const { modal, onSelect } = createModal(lines, null);
            modal.onOpen();

            const lineEl = modal.contentEl.querySelector(".switchboard-quick-switch-line") as HTMLElement;
            lineEl.click();

            expect(onSelect).toHaveBeenCalledWith(lines[0]);
            expect(modal.close).toHaveBeenCalled();
        });

        it("clicking the active Line closes without calling onSelect", () => {
            const { modal, onSelect } = createModal(undefined, "a");
            modal.onOpen();

            const lineEl = modal.contentEl.querySelector(".switchboard-quick-switch-line") as HTMLElement;
            lineEl.click();

            expect(onSelect).not.toHaveBeenCalled();
            expect(modal.close).toHaveBeenCalled();
        });

        it("clicking disconnect fires onSelect(null)", () => {
            const { modal, onSelect } = createModal(undefined, "a");
            modal.onOpen();

            const disconnectBtn = modal.contentEl.querySelector(".switchboard-quick-switch-disconnect") as HTMLElement;
            disconnectBtn.click();

            expect(onSelect).toHaveBeenCalledWith(null);
            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("keyboard navigation", () => {
        it("moveSelection(1) advances selected index", () => {
            const { modal } = createModal();
            modal.onOpen();

            (modal as any).moveSelection(1);

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-selected")).toBe(false);
            expect((lineEls[1] as HTMLElement).classList.contains("is-selected")).toBe(true);
        });

        it("moveSelection(-1) goes backward", () => {
            const { modal } = createModal();
            modal.onOpen();

            // Move forward then backward
            (modal as any).moveSelection(1);
            (modal as any).moveSelection(-1);

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-selected")).toBe(true);
        });

        it("selection wraps from last to first", () => {
            const { modal } = createModal();
            modal.onOpen();

            // Move to last, then one more
            (modal as any).moveSelection(1); // index 1
            (modal as any).moveSelection(1); // index 2 (last)
            (modal as any).moveSelection(1); // should wrap to 0

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-selected")).toBe(true);
        });

        it("selection wraps from first to last", () => {
            const { modal } = createModal();
            modal.onOpen();

            // From first, go backward
            (modal as any).moveSelection(-1);

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");
            expect((lineEls[2] as HTMLElement).classList.contains("is-selected")).toBe(true);
        });

        it("selectCurrent fires onSelect for the selected Line", () => {
            const lines = [
                createTestLine({ id: "a", name: "Line A" }),
                createTestLine({ id: "b", name: "Line B" }),
            ];
            const { modal, onSelect } = createModal(lines, null);
            modal.onOpen();

            // Select second line, then confirm
            (modal as any).moveSelection(1);
            (modal as any).selectCurrent();

            expect(onSelect).toHaveBeenCalledWith(lines[1]);
            expect(modal.close).toHaveBeenCalled();
        });

        it("selectCurrent on active line closes without calling onSelect", () => {
            const { modal, onSelect } = createModal(undefined, "a");
            modal.onOpen();

            // First line is "a" which is active, selected by default
            (modal as any).selectCurrent();

            expect(onSelect).not.toHaveBeenCalled();
            expect(modal.close).toHaveBeenCalled();
        });

        it("selectCurrent with no lines does nothing (no error, no onSelect call)", () => {
            const { modal, onSelect } = createModal([]);
            modal.onOpen();

            // Should return early without error
            (modal as any).selectCurrent();

            expect(onSelect).not.toHaveBeenCalled();
            expect(modal.close).not.toHaveBeenCalled();
        });
    });

    describe("hover", () => {
        it("mouseenter updates selection to hovered index", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-quick-switch-line");

            // Hover over the third line
            (lineEls[2] as HTMLElement).dispatchEvent(new Event("mouseenter"));

            expect((lineEls[0] as HTMLElement).classList.contains("is-selected")).toBe(false);
            expect((lineEls[2] as HTMLElement).classList.contains("is-selected")).toBe(true);
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
