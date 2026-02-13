/**
 * ConfirmModal Tests (Phase 3)
 * Verifies promise resolution on confirm vs cancel.
 */
import { describe, it, expect, vi } from "vitest";
import { ConfirmModal } from "../../src/modals/ConfirmModal";
import { App } from "../__mocks__/obsidian";

describe("ConfirmModal", () => {
    it("renders message text and two buttons", () => {
        const app = new App();
        const onConfirm = vi.fn();
        const modal = new ConfirmModal(app as any, "Are you sure you want to delete?", onConfirm);

        modal.onOpen();

        const text = modal.contentEl.textContent;
        expect(text).toContain("Are you sure you want to delete?");

        const buttons = modal.contentEl.querySelectorAll("button");
        expect(buttons).toHaveLength(2);
        // First button is Cancel, second is Delete
        expect(buttons[0].textContent).toBe("Cancel");
        expect(buttons[1].textContent).toBe("Delete");
    });

    it("clicking 'Delete' calls onConfirm callback and closes", () => {
        const app = new App();
        const onConfirm = vi.fn();
        const modal = new ConfirmModal(app as any, "Delete this session?", onConfirm);
        const closeSpy = vi.spyOn(modal, "close");

        modal.onOpen();

        const deleteBtn = modal.contentEl.querySelectorAll("button")[1];
        deleteBtn.click();

        expect(closeSpy).toHaveBeenCalled();
        expect(onConfirm).toHaveBeenCalled();
    });

    it("clicking 'Cancel' closes without calling onConfirm", () => {
        const app = new App();
        const onConfirm = vi.fn();
        const modal = new ConfirmModal(app as any, "Delete this session?", onConfirm);
        const closeSpy = vi.spyOn(modal, "close");

        modal.onOpen();

        const cancelBtn = modal.contentEl.querySelectorAll("button")[0];
        cancelBtn.click();

        expect(closeSpy).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    // === NEW (Addendum) ===

    describe("onOpen — rendering details", () => {
        it("Delete button has mod-warning class", () => {
            const app = new App();
            const modal = new ConfirmModal(app as any, "Delete?", vi.fn());

            modal.onOpen();

            const deleteBtn = modal.contentEl.querySelectorAll("button")[1];
            expect(deleteBtn.classList.contains("mod-warning")).toBe(true);
        });
    });

    describe("onClose", () => {
        it("onClose empties contentEl", () => {
            const app = new App();
            const modal = new ConfirmModal(app as any, "Delete?", vi.fn());

            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();
            expect(modal.contentEl.children.length).toBe(0);
        });

        it("onClose does not call onConfirm", () => {
            const app = new App();
            const onConfirm = vi.fn();
            const modal = new ConfirmModal(app as any, "Delete?", onConfirm);

            modal.onOpen();
            modal.onClose();

            expect(onConfirm).not.toHaveBeenCalled();
        });
    });
});
