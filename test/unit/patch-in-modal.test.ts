import { describe, it, expect, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { PatchInModal } from "../../src/modals/PatchInModal";
import { createTestLine } from "../helpers";

describe("PatchInModal", () => {
    function createModal(
        lines = [createTestLine({ id: "a", name: "Line A", color: "#ff0000" }), createTestLine({ id: "b", name: "Line B", color: "#00ff00" })],
        activeLine: string | null = null,
        onSelect = vi.fn()
    ) {
        const modal = new PatchInModal(new App() as any, lines, activeLine, onSelect);
        return { modal, onSelect };
    }

    describe("onOpen — rendering", () => {
        it("renders a button for each configured Line", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-patch-line");
            expect(lineEls.length).toBe(2);
        });

        it("each Line button shows name and color", () => {
            const { modal } = createModal();
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-patch-line");
            const firstLine = lineEls[0] as HTMLElement;
            const secondLine = lineEls[1] as HTMLElement;

            // Name text
            expect(firstLine.querySelector(".switchboard-patch-line-name")!.textContent).toBe("Line A");
            expect(secondLine.querySelector(".switchboard-patch-line-name")!.textContent).toBe("Line B");

            // Color via CSS variable
            expect(firstLine.style.getPropertyValue("--line-color")).toBe("#ff0000");
            expect(secondLine.style.getPropertyValue("--line-color")).toBe("#00ff00");
        });

        it("active Line has 'is-active' class", () => {
            const { modal } = createModal(undefined, "a");
            modal.onOpen();

            const lineEls = modal.contentEl.querySelectorAll(".switchboard-patch-line");
            expect((lineEls[0] as HTMLElement).classList.contains("is-active")).toBe(true);
            expect((lineEls[1] as HTMLElement).classList.contains("is-active")).toBe(false);
        });

        it("shows empty state message when no Lines configured", () => {
            const { modal } = createModal([]);
            modal.onOpen();

            const emptyState = modal.contentEl.querySelector(".switchboard-empty-state");
            expect(emptyState).not.toBeNull();
            expect(emptyState!.textContent).toContain("No lines configured");
        });

        it("shows disconnect button only when a Line is active", () => {
            const { modal } = createModal(undefined, "a");
            modal.onOpen();

            const disconnectBtn = modal.contentEl.querySelector(".switchboard-disconnect-btn");
            expect(disconnectBtn).not.toBeNull();
        });

        it("no disconnect button when no Line is active", () => {
            const { modal } = createModal(undefined, null);
            modal.onOpen();

            const disconnectBtn = modal.contentEl.querySelector(".switchboard-disconnect-btn");
            expect(disconnectBtn).toBeNull();
        });
    });

    describe("onOpen — interactions", () => {
        it("clicking a Line fires onSelect(line) and closes modal", () => {
            const lines = [createTestLine({ id: "a", name: "Line A" }), createTestLine({ id: "b", name: "Line B" })];
            const { modal, onSelect } = createModal(lines);
            modal.onOpen();

            const firstLine = modal.contentEl.querySelector(".switchboard-patch-line") as HTMLElement;
            firstLine.click();

            expect(onSelect).toHaveBeenCalledWith(lines[0]);
            expect(modal.close).toHaveBeenCalled();
        });

        it("clicking disconnect fires onSelect(null) and closes modal", () => {
            const { modal, onSelect } = createModal(undefined, "a");
            modal.onOpen();

            const disconnectBtn = modal.contentEl.querySelector(".switchboard-disconnect-btn") as HTMLElement;
            disconnectBtn.click();

            expect(onSelect).toHaveBeenCalledWith(null);
            expect(modal.close).toHaveBeenCalled();
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
