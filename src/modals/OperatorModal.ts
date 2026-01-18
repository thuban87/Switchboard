import { App, Modal, Notice } from "obsidian";
import type SwitchboardPlugin from "../main";
import { SwitchboardLine, OperatorCommand } from "../types";

/**
 * Default commands for academic Lines
 */
const DEFAULT_COMMANDS: Record<string, OperatorCommand[]> = {
    // Math-related commands
    math: [
        { name: "Equation Block", icon: "∑", action: "insert", value: "$$\n\n$$" },
        { name: "Inline Math", icon: "π", action: "insert", value: "$  $" },
        { name: "Open Excalidraw", icon: "✏️", action: "command", value: "excalidraw:new-drawing" },
        { name: "Insert Table", icon: "📊", action: "insert", value: "| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n|       |       |       |" },
    ],
    // Biology-related commands
    bio: [
        { name: "Diagram Note", icon: "🧬", action: "insert", value: "## Diagram\n\n```excalidraw\n```" },
        { name: "Process Steps", icon: "🔄", action: "insert", value: "1. **Step 1:**\n2. **Step 2:**\n3. **Step 3:**" },
        { name: "Definition", icon: "📖", action: "insert", value: "> [!note] Definition\n> **Term:** " },
        { name: "Lab Notes", icon: "🔬", action: "insert", value: "## Lab Notes\n\n**Date:** {{date}}\n**Objective:**\n**Materials:**\n**Procedure:**\n**Results:**\n**Conclusion:**" },
    ],
    // English-related commands
    eng: [
        { name: "Citation", icon: "📚", action: "insert", value: "(Author, Year, p. )" },
        { name: "Quote Block", icon: "💬", action: "insert", value: "> \"Quote here.\"\n> — Author, *Source*" },
        { name: "Thesis Statement", icon: "📝", action: "insert", value: "**Thesis:** " },
        { name: "Word Count", icon: "🔢", action: "command", value: "editor:focus" },
        { name: "Outline Template", icon: "📋", action: "insert", value: "## Outline\n\n### I. Introduction\n- Hook:\n- Context:\n- Thesis:\n\n### II. Body Paragraph 1\n- Topic:\n- Evidence:\n- Analysis:\n\n### III. Body Paragraph 2\n- Topic:\n- Evidence:\n- Analysis:\n\n### IV. Conclusion\n- Restate:\n- Implications:" },
    ],
    // Generic fallback
    default: [
        { name: "New Note", icon: "📄", action: "command", value: "file-explorer:new-file" },
        { name: "Daily Note", icon: "📅", action: "command", value: "daily-notes" },
        { name: "Quick Add", icon: "⚡", action: "command", value: "quickadd:runQuickAdd" },
        { name: "Search", icon: "🔍", action: "command", value: "global-search:open" },
    ],
};

/**
 * OperatorModal - Context-specific command menu
 * 
 * Shows relevant commands based on the active Line.
 */
export class OperatorModal extends Modal {
    private plugin: SwitchboardPlugin;
    private line: SwitchboardLine;

    constructor(app: App, plugin: SwitchboardPlugin, line: SwitchboardLine) {
        super(app);
        this.plugin = plugin;
        this.line = line;
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        // Add custom class
        modalEl.addClass("switchboard-operator-modal");
        modalEl.style.setProperty("--operator-color", this.line.color);

        // Header
        const headerEl = contentEl.createDiv("operator-header");
        headerEl.createEl("span", { text: "🎛️", cls: "operator-icon" });
        headerEl.createEl("h2", { text: "Operator Menu" });

        // Line indicator
        const lineEl = headerEl.createDiv("operator-line");
        const colorDot = lineEl.createSpan("operator-color-dot");
        colorDot.style.backgroundColor = this.line.color;
        lineEl.createEl("span", { text: this.line.name });

        // Get commands for this line
        const commands = this.getCommandsForLine();

        // Command grid
        const gridEl = contentEl.createDiv("operator-grid");

        for (const cmd of commands) {
            const btnEl = gridEl.createEl("button", {
                cls: "operator-cmd-btn",
            });
            btnEl.createEl("span", { text: cmd.icon, cls: "operator-cmd-icon" });
            btnEl.createEl("span", { text: cmd.name, cls: "operator-cmd-name" });

            btnEl.addEventListener("click", () => {
                this.executeCommand(cmd);
                this.close();
            });
        }

        // Close on Escape is handled by Modal base class
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Get commands for the current line
     */
    private getCommandsForLine(): OperatorCommand[] {
        // Use custom commands if defined
        if (this.line.customCommands && this.line.customCommands.length > 0) {
            return this.line.customCommands;
        }

        // Fallback to category-based defaults
        const lineId = this.line.id.toLowerCase();
        if (lineId.includes("math")) return DEFAULT_COMMANDS.math;
        if (lineId.includes("bio")) return DEFAULT_COMMANDS.bio;
        if (lineId.includes("eng")) return DEFAULT_COMMANDS.eng;

        // Fallback to generic defaults
        return DEFAULT_COMMANDS.default;
    }

    /**
     * Execute a command
     */
    private executeCommand(cmd: OperatorCommand): void {
        switch (cmd.action) {
            case "command":
                // Execute an Obsidian command
                const commands = (this.app as any).commands;
                if (commands.commands[cmd.value]) {
                    commands.executeCommandById(cmd.value);
                } else {
                    new Notice(`Command not found: ${cmd.value}\n\nTip: Use Command Palette (Ctrl+P) and copy the command ID`);
                }
                break;

            case "insert":
                // Insert text at cursor
                const editor = this.app.workspace.activeEditor?.editor;
                if (editor) {
                    const cursor = editor.getCursor();
                    const text = cmd.value
                        .replace("{{date}}", new Date().toLocaleDateString())
                        .replace("{{time}}", new Date().toLocaleTimeString());
                    editor.replaceRange(text, cursor);

                    // Position cursor in the middle of inline elements
                    if (text.includes("$  $")) {
                        editor.setCursor({ line: cursor.line, ch: cursor.ch + 2 });
                    }
                } else {
                    new Notice("No active editor - open a note first");
                }
                break;

            case "open":
                // Open a file
                if (!cmd.value) {
                    new Notice("No file path specified");
                    break;
                }
                const file = this.app.vault.getAbstractFileByPath(cmd.value);
                if (file) {
                    this.app.workspace.getLeaf().openFile(file as any);
                } else {
                    new Notice(`File not found: ${cmd.value}\n\nTip: Use the full path from vault root`);
                }
                break;
        }
    }
}
