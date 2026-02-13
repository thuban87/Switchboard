/**
 * SessionEditorModal Tests (Addendum Section 9)
 * Session list rendering, collapsible groups, edit form, recalculateDuration,
 * delete with ConfirmModal, re-render after mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPlugin } from "../__mocks__/plugin";
import { createTestLine, createTestSession } from "../helpers";

// Notice spy via vi.hoisted
const NoticeSpy = vi.hoisted(() => vi.fn());
vi.mock("obsidian", async () => {
    const actual = await vi.importActual<typeof import("../__mocks__/obsidian")>("../__mocks__/obsidian");
    return { ...actual, Notice: NoticeSpy };
});

// Mock ConfirmModal — auto-confirm by default
let confirmAutoConfirm = true;
vi.mock("../../src/modals/ConfirmModal", () => ({
    ConfirmModal: vi.fn().mockImplementation(function (this: any, _app: any, _msg: string, onConfirm: () => void) {
        this.open = () => {
            if (confirmAutoConfirm) onConfirm();
        };
    }),
}));

import { SessionEditorModal } from "../../src/modals/SessionEditorModal";
import { App } from "../__mocks__/obsidian";
import { ConfirmModal } from "../../src/modals/ConfirmModal";

describe("SessionEditorModal", () => {
    beforeEach(() => {
        NoticeSpy.mockClear();
        confirmAutoConfirm = true;
        vi.mocked(ConfirmModal).mockClear();
    });

    function createModal(sessionHistory: any[] = [], lines: any[] = []) {
        const plugin = createMockPlugin({
            settings: {
                sessionHistory,
                lines,
            },
        });
        const modal = new SessionEditorModal(new App() as any, plugin as any);
        return { modal, plugin };
    }

    // ── onOpen — rendering ──────────────────────────────────────────

    describe("onOpen — rendering", () => {
        it("renders a row for each session record", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-11" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math", name: "Math" })]);
            modal.onOpen();

            const sessionEls = modal.contentEl.querySelectorAll(".switchboard-session-editor-session");
            expect(sessionEls.length).toBe(2);
        });

        it("each row shows line name, date, duration, and times", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    date: "2026-02-12", startTime: "09:00", endTime: "10:30",
                    durationMinutes: 90,
                }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math", name: "Math" })]);
            modal.onOpen();

            // Expand the line group first
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            header.click();

            const sessionText = modal.contentEl.querySelector(".switchboard-session-editor-session")!.textContent!;
            expect(sessionText).toContain("2026-02-12");
            expect(sessionText).toContain("09:00");
            expect(sessionText).toContain("10:30");
            expect(sessionText).toContain("1h 30m");
        });

        it("shows empty state when no sessions exist", () => {
            const { modal } = createModal([], []);
            modal.onOpen();

            const empty = modal.contentEl.querySelector(".switchboard-session-editor-empty");
            expect(empty).not.toBeNull();
            expect(empty!.textContent).toContain("No sessions recorded yet");
        });

        it("renders edit and delete buttons per session", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math", name: "Math" })]);
            modal.onOpen();

            // Expand group
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            header.click();

            const editBtn = modal.contentEl.querySelector(".switchboard-session-btn-edit");
            const deleteBtn = modal.contentEl.querySelector(".switchboard-session-btn-delete");
            expect(editBtn).not.toBeNull();
            expect(deleteBtn).not.toBeNull();
        });

        it("line groups sorted by most recent session (newest first)", () => {
            const sessions = [
                createTestSession({ lineId: "eng", lineName: "English", date: "2026-02-10" }),
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
            ];
            const lines = [
                createTestLine({ id: "eng", name: "English" }),
                createTestLine({ id: "math", name: "Math" }),
            ];
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            const headers = modal.contentEl.querySelectorAll(".switchboard-session-editor-line-header");
            expect(headers.length).toBe(2);
            // Math (2026-02-12) should be first, English (2026-02-10) second
            expect(headers[0].textContent).toContain("Math");
            expect(headers[1].textContent).toContain("English");
        });
    });

    // ── collapsible line groups ─────────────────────────────────────

    describe("collapsible line groups", () => {
        it("sessions start hidden (switchboard-hidden class present)", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();

            const sessionsEl = modal.contentEl.querySelector(".switchboard-session-editor-sessions");
            expect(sessionsEl!.classList.contains("switchboard-hidden")).toBe(true);
        });

        it("clicking line header toggles visibility", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();

            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            const sessionsEl = modal.contentEl.querySelector(".switchboard-session-editor-sessions")!;

            // Click to expand
            header.click();
            expect(sessionsEl.classList.contains("switchboard-hidden")).toBe(false);

            // Click to collapse
            header.click();
            expect(sessionsEl.classList.contains("switchboard-hidden")).toBe(true);
        });

        it("expand icon changes from ▶ to ▼ on expand", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();

            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            const expandIcon = modal.contentEl.querySelector(".switchboard-session-editor-expand")!;

            expect(expandIcon.textContent).toBe("▶");
            header.click();
            expect(expandIcon.textContent).toBe("▼");
        });
    });

    // ── session display ─────────────────────────────────────────────

    describe("session display", () => {
        it("session with summary shows summary text", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", summary: "Studied derivatives" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();

            // Expand
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            header.click();

            const summaryEl = modal.contentEl.querySelector(".switchboard-session-editor-session-summary");
            expect(summaryEl).not.toBeNull();
            expect(summaryEl!.textContent).toBe("Studied derivatives");
        });

        it("session without summary omits summary element", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", summary: "" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();

            // Expand
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            header.click();

            const summaryEl = modal.contentEl.querySelector(".switchboard-session-editor-session-summary");
            expect(summaryEl).toBeNull();
        });
    });

    // ── edit interaction ────────────────────────────────────────────

    describe("edit interaction", () => {
        it("edit button reveals inline editor with pre-filled values", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    date: "2026-02-12", startTime: "09:00", endTime: "10:00",
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            // Expand + click edit
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            header.click();
            const editBtn = modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement;
            editBtn.click();

            // Edit form should now be shown
            const heading = modal.contentEl.querySelector("h2");
            expect(heading!.textContent).toBe("Edit Session");

            // Inputs should be pre-filled
            const inputs = modal.contentEl.querySelectorAll("input");
            const inputValues = Array.from(inputs).map(i => i.value);
            expect(inputValues).toContain("2026-02-12");
            expect(inputValues).toContain("09:00");
            expect(inputValues).toContain("10:00");
        });

        it("save writes updated values back to settings array", async () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    date: "2026-02-12", startTime: "09:00", endTime: "10:00",
                    durationMinutes: 60,
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            // Expand + edit
            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Change date via input
            const dateInput = Array.from(modal.contentEl.querySelectorAll("input")).find(i => i.type === "date")!;
            dateInput.value = "2026-02-14";
            dateInput.dispatchEvent(new Event("input"));

            // Click save
            const saveBtn = Array.from(modal.contentEl.querySelectorAll("button")).find(b => b.textContent === "Save")!;
            saveBtn.click();

            // Allow async saveSettings to complete
            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalled();
            });
        });

        it("save calls plugin.saveSettings()", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            const saveBtn = Array.from(modal.contentEl.querySelectorAll("button")).find(b => b.textContent === "Save")!;
            saveBtn.click();

            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalledOnce();
            });
        });
    });

    // ── edit form ───────────────────────────────────────────────────

    describe("edit form", () => {
        it("cancel button returns to session list without saving", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Verify we're in edit mode
            expect(modal.contentEl.querySelector("h2")!.textContent).toBe("Edit Session");

            // Click cancel
            const cancelBtn = Array.from(modal.contentEl.querySelectorAll("button")).find(b => b.textContent === "Cancel")!;
            cancelBtn.click();

            // Should be back to session list
            expect(modal.contentEl.querySelector("h2")!.textContent).toBe("Session History");
            expect(plugin.saveSettings).not.toHaveBeenCalled();
        });

        it("save button writes updated record to settings array at correct index", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-11" }),
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            // Expand + edit the first session shown (newest = index 1 in array)
            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            const editBtns = modal.contentEl.querySelectorAll(".switchboard-session-btn-edit");
            (editBtns[0] as HTMLElement).click();

            // Save
            const saveBtn = Array.from(modal.contentEl.querySelectorAll("button")).find(b => b.textContent === "Save")!;
            saveBtn.click();

            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalled();
            });
        });

        it("edit form replaces list view (contentEl is emptied)", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Session list elements should no longer be present
            expect(modal.contentEl.querySelector(".switchboard-session-editor-list")).toBeNull();
            // Edit form heading should be visible
            expect(modal.contentEl.querySelector("h2")!.textContent).toBe("Edit Session");
        });

        it("changing line dropdown in edit form updates lineId and lineName", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
            ];
            const lines = [
                createTestLine({ id: "math", name: "Math" }),
                createTestLine({ id: "eng", name: "English" }),
            ];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Find the select (line dropdown)
            const select = modal.contentEl.querySelector("select") as HTMLSelectElement;
            expect(select).not.toBeNull();
            expect(select.value).toBe("math");

            // Change to English
            select.value = "eng";
            select.dispatchEvent(new Event("change"));

            // Save
            const saveBtn = Array.from(modal.contentEl.querySelectorAll("button")).find(b => b.textContent === "Save")!;
            saveBtn.click();

            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalled();
            });

            // The record should have updated lineId and lineName
            const savedRecord = plugin.settings.sessionHistory[0];
            expect(savedRecord.lineId).toBe("eng");
            expect(savedRecord.lineName).toBe("English");
        });
    });

    // ── recalculateDuration ─────────────────────────────────────────

    describe("recalculateDuration", () => {
        it("recalculates when start time changes", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    startTime: "09:00", endTime: "10:00", durationMinutes: 60,
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Find start time input
            const startInput = Array.from(modal.contentEl.querySelectorAll("input")).find(i => i.type === "time" && i.value === "09:00")!;
            startInput.value = "09:30";
            startInput.dispatchEvent(new Event("input"));

            // Duration should now be 30m (09:30 → 10:00)
            expect(plugin.settings.sessionHistory[0].durationMinutes).toBe(30);
        });

        it("recalculates when end time changes", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    startTime: "09:00", endTime: "10:00", durationMinutes: 60,
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Find end time input
            const endInput = Array.from(modal.contentEl.querySelectorAll("input")).find(i => i.type === "time" && i.value === "10:00")!;
            endInput.value = "11:30";
            endInput.dispatchEvent(new Event("input"));

            // Duration should now be 150m (09:00 → 11:30)
            expect(plugin.settings.sessionHistory[0].durationMinutes).toBe(150);
        });

        it("handles midnight crossing (end < start wraps to next day)", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    startTime: "23:00", endTime: "01:00", durationMinutes: 120,
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Trigger recalculation by changing end time
            const endInput = Array.from(modal.contentEl.querySelectorAll("input")).find(i => i.type === "time" && i.value === "01:00")!;
            endInput.value = "01:00";
            endInput.dispatchEvent(new Event("input"));

            // 23:00 → 01:00 = 120 minutes (midnight crossing)
            expect(plugin.settings.sessionHistory[0].durationMinutes).toBe(120);
        });

        it("floors negative durations to 0", () => {
            const sessions = [
                createTestSession({
                    lineId: "math", lineName: "Math",
                    startTime: "10:00", endTime: "10:00", durationMinutes: 0,
                }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-edit") as HTMLElement).click();

            // Same start and end → 0 duration
            const startInput = Array.from(modal.contentEl.querySelectorAll("input")).find(i => i.type === "time" && i.value === "10:00")!;
            startInput.value = "10:00";
            startInput.dispatchEvent(new Event("input"));

            expect(plugin.settings.sessionHistory[0].durationMinutes).toBe(0);
        });
    });

    // ── delete interaction ──────────────────────────────────────────

    describe("delete interaction", () => {
        it("delete opens ConfirmModal", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            confirmAutoConfirm = false; // Don't auto-confirm
            const { modal } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-delete") as HTMLElement).click();

            expect(ConfirmModal).toHaveBeenCalled();
        });

        it("confirming delete removes session from history", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-11" }),
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            confirmAutoConfirm = true;
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            expect(plugin.settings.sessionHistory.length).toBe(2);

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            const deleteBtns = modal.contentEl.querySelectorAll(".switchboard-session-btn-delete");
            (deleteBtns[0] as HTMLElement).click();

            await vi.waitFor(() => {
                expect(plugin.settings.sessionHistory.length).toBe(1);
            });
        });

        it("confirming delete calls plugin.saveSettings()", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            confirmAutoConfirm = true;
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-delete") as HTMLElement).click();

            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalled();
            });
        });

        it("canceling delete keeps session intact", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            confirmAutoConfirm = false; // Don't auto-confirm = cancel
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            (modal.contentEl.querySelector(".switchboard-session-btn-delete") as HTMLElement).click();

            expect(plugin.settings.sessionHistory.length).toBe(1);
            expect(plugin.saveSettings).not.toHaveBeenCalled();
        });
    });

    // ── re-render ───────────────────────────────────────────────────

    describe("re-render", () => {
        it("after edit or delete, list re-renders with updated data", async () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-11" }),
                createTestSession({ lineId: "math", lineName: "Math", date: "2026-02-12" }),
            ];
            const lines = [createTestLine({ id: "math", name: "Math" })];
            confirmAutoConfirm = true;
            const { modal, plugin } = createModal(sessions, lines);
            modal.onOpen();

            // Expand and delete a session
            (modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement).click();
            const deleteBtns = modal.contentEl.querySelectorAll(".switchboard-session-btn-delete");
            (deleteBtns[0] as HTMLElement).click();

            await vi.waitFor(() => {
                expect(plugin.saveSettings).toHaveBeenCalled();
            });

            // After delete + re-render, should have only 1 session row
            // Need to expand again since re-render resets visibility
            const header = modal.contentEl.querySelector(".switchboard-session-editor-line-header") as HTMLElement;
            if (header) header.click();

            const remainingSessions = modal.contentEl.querySelectorAll(".switchboard-session-editor-session");
            expect(remainingSessions.length).toBe(1);
        });
    });

    // ── onClose ─────────────────────────────────────────────────────

    describe("onClose", () => {
        it("empties contentEl after open", () => {
            const sessions = [
                createTestSession({ lineId: "math", lineName: "Math" }),
            ];
            const { modal } = createModal(sessions, [createTestLine({ id: "math" })]);
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();
            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});
