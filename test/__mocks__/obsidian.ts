/**
 * Obsidian mock for unit + integration tests (S4 + S13).
 * Stubs out all classes and methods that Switchboard services use.
 */
import { vi } from "vitest";

export class App {
    vault = new Vault();
    workspace = new Workspace();
    plugins = { getPlugin: vi.fn(() => null) };
}

export class Vault {
    read = vi.fn();
    modify = vi.fn();
    create = vi.fn();
    createFolder = vi.fn();
    getAbstractFileByPath = vi.fn();
    getFiles = vi.fn(() => []);
    getAllLoadedFiles = vi.fn(() => []);
}

export class Workspace {
    getLeavesOfType = vi.fn(() => []);
    getActiveViewOfType = vi.fn();
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

export class Modal {
    app: App;
    constructor(app: App) { this.app = app; }
    open() { }
    close() { }
}

export class Menu {
    addItem(cb: any) { return this; }
    addSeparator() { return this; }
    showAtMouseEvent(e: any) { }
}

export function normalizePath(path: string): string {
    return path;
}
