/**
 * Obsidian mock for unit + integration tests (S4 + S13).
 * Stubs out all classes and methods that Switchboard services use.
 */
import { vi } from "vitest";

// App — add commands registry for executeOperatorCommand tests
export class App {
    vault = new Vault();
    workspace = new Workspace();
    plugins = { getPlugin: vi.fn(() => null) };
    commands = {
        executeCommandById: vi.fn(),
        commands: {} as Record<string, any>,
    };
}

export class Vault {
    read = vi.fn();
    modify = vi.fn();
    process = vi.fn(async (file: any, fn: (content: string) => string) => {
        const content = await this.read(file);
        const newContent = fn(content);
        await this.modify(file, newContent);
    });
    create = vi.fn();
    createFolder = vi.fn();
    getAbstractFileByPath = vi.fn();
    getFiles = vi.fn(() => []);
    getAllLoadedFiles = vi.fn(() => []);
}

// Workspace — add getLeaf for landing page tests
export class Workspace {
    getLeavesOfType = vi.fn(() => []);
    getActiveViewOfType = vi.fn();
    getLeaf = vi.fn(() => ({
        openFile: vi.fn().mockResolvedValue(undefined),
    }));
    activeEditor = null;
}

export class Notice {
    constructor(public message: string, public timeout?: number) { }
}

export class TFile {
    path = "";
    basename = "";
}

export class TFolder {
    path = "";
}

// Modal — add contentEl for modal tests
export class Modal {
    app: App;
    contentEl = document.createElement("div");
    modalEl = document.createElement("div");
    constructor(app: App) { this.app = app; }
    open() { }
    close() { }
}

export class Menu {
    addItem(cb: any) { return this; }
    addSeparator() { return this; }
    showAtMouseEvent(e: any) { }
}

// Plugin base class — add lifecycle methods
export class Plugin {
    app: App;
    constructor(app: App) { this.app = app; }
    loadData = vi.fn().mockResolvedValue(null);
    saveData = vi.fn().mockResolvedValue(undefined);
    addCommand = vi.fn();
    addRibbonIcon = vi.fn(() => document.createElement("div"));
    addSettingTab = vi.fn();
    addStatusBarItem = vi.fn(() => document.createElement("div"));
    registerView = vi.fn();
    registerInterval = vi.fn((id: number) => id);
}

// Setting class — add builder methods
export class Setting {
    settingEl = document.createElement("div");
    constructor(containerEl: any) { }
    setName(name: string) { return this; }
    setDesc(desc: string) { return this; }
    setHeading() { return this; }
    addText(cb: any) { return this; }
    addToggle(cb: any) { return this; }
    addDropdown(cb: any) { return this; }
    addButton(cb: any) { return this; }
}

// PluginSettingTab — stub
export class PluginSettingTab {
    app: App;
    constructor(app: App, plugin: any) { this.app = app; }
    display() { }
    hide() { }
}

export function normalizePath(path: string): string {
    return path;
}
