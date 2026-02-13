import { describe, it, expect, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { OperatorModal } from "../../src/modals/OperatorModal";
import { createTestLine } from "../helpers";
import { createMockPlugin } from "../__mocks__/plugin";
import { OperatorCommand } from "../../src/types";

describe("OperatorModal", () => {
    function createModal(
        lineOverrides: Record<string, any> = {},
        pluginOverrides: Record<string, any> = {}
    ) {
        const plugin = createMockPlugin({ executeOperatorCommand: vi.fn(), ...pluginOverrides });
        const line = createTestLine({ id: "test-line", name: "Test Line", color: "#3498db", ...lineOverrides });
        const modal = new OperatorModal(new App() as any, plugin as any, line);
        return { modal, plugin, line };
    }

    describe("onOpen — rendering", () => {
        it("renders header with Operator Menu title", () => {
            const { modal } = createModal();
            modal.onOpen();

            const h2 = modal.contentEl.querySelector("h2");
            expect(h2).not.toBeNull();
            expect(h2!.textContent).toBe("Operator Menu");
        });

        it("renders line name with color dot", () => {
            const { modal } = createModal({ name: "Bio 101" });
            modal.onOpen();

            const colorDot = modal.contentEl.querySelector(".switchboard-operator-color-dot");
            expect(colorDot).not.toBeNull();

            const lineEl = modal.contentEl.querySelector(".switchboard-operator-line");
            expect(lineEl!.textContent).toContain("Bio 101");
        });

        it("renders a button for each command with icon and name", () => {
            // Use a line that falls to default commands (4 commands)
            const { modal } = createModal({ id: "history-001" });
            modal.onOpen();

            const buttons = modal.contentEl.querySelectorAll(".switchboard-operator-cmd-btn");
            expect(buttons.length).toBe(4); // generic defaults have 4 commands

            const firstBtn = buttons[0] as HTMLElement;
            expect(firstBtn.querySelector(".switchboard-operator-cmd-icon")!.textContent).toBe("📄");
            expect(firstBtn.querySelector(".switchboard-operator-cmd-name")!.textContent).toBe("New Note");
        });

        it("sets line color as CSS variable on modalEl", () => {
            const { modal } = createModal({ color: "#e74c3c" });
            modal.onOpen();

            expect(modal.modalEl.style.getPropertyValue("--operator-color")).toBe("#e74c3c");
        });
    });

    describe("onOpen — interactions", () => {
        it("clicking a command button calls executeOperatorCommand(cmd)", () => {
            const customCmds: OperatorCommand[] = [
                { name: "Test Cmd", icon: "🧪", action: "command", value: "test:run" },
            ];
            const { modal, plugin } = createModal({ customCommands: customCmds });
            modal.onOpen();

            const btn = modal.contentEl.querySelector(".switchboard-operator-cmd-btn") as HTMLElement;
            btn.click();

            expect(plugin.executeOperatorCommand).toHaveBeenCalledWith(customCmds[0]);
        });

        it("clicking a command button closes the modal", () => {
            const customCmds: OperatorCommand[] = [
                { name: "Test Cmd", icon: "🧪", action: "command", value: "test:run" },
            ];
            const { modal } = createModal({ customCommands: customCmds });
            modal.onOpen();

            const btn = modal.contentEl.querySelector(".switchboard-operator-cmd-btn") as HTMLElement;
            btn.click();

            expect(modal.close).toHaveBeenCalled();
        });
    });

    describe("getCommandsForLine", () => {
        it("returns custom commands when Line has them", () => {
            const customCmds: OperatorCommand[] = [
                { name: "Custom One", icon: "⭐", action: "insert", value: "hello" },
                { name: "Custom Two", icon: "🌙", action: "command", value: "cmd:test" },
            ];
            const { modal } = createModal({ customCommands: customCmds });

            const result = (modal as any).getCommandsForLine();
            expect(result).toEqual(customCmds);
        });

        it("returns math defaults when Line ID contains \"math\" (use mixed-case \"Math-140\" to verify toLowerCase)", () => {
            const { modal } = createModal({ id: "Math-140", customCommands: [] });

            const result = (modal as any).getCommandsForLine();
            expect(result.length).toBe(4);
            expect(result[0].name).toBe("Equation Block");
        });

        it("returns bio defaults when Line ID contains \"bio\"", () => {
            const { modal } = createModal({ id: "bio-101", customCommands: [] });

            const result = (modal as any).getCommandsForLine();
            expect(result.length).toBe(4);
            expect(result[0].name).toBe("Diagram Note");
        });

        it("returns eng defaults when Line ID contains \"eng\"", () => {
            const { modal } = createModal({ id: "eng-200", customCommands: [] });

            const result = (modal as any).getCommandsForLine();
            expect(result.length).toBe(5);
            expect(result[0].name).toBe("Citation");
        });

        it("returns generic defaults when no category match", () => {
            const { modal } = createModal({ id: "history-001", customCommands: [] });

            const result = (modal as any).getCommandsForLine();
            expect(result.length).toBe(4);
            expect(result[0].name).toBe("New Note");
        });

        it("custom commands take priority over category defaults", () => {
            // Line ID contains "math" but has custom commands — custom should win
            const customCmds: OperatorCommand[] = [
                { name: "My Math Cmd", icon: "🧮", action: "insert", value: "custom" },
            ];
            const { modal } = createModal({ id: "math-140", customCommands: customCmds });

            const result = (modal as any).getCommandsForLine();
            expect(result).toEqual(customCmds);
            expect(result[0].name).toBe("My Math Cmd");
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
