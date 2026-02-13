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

// Workspace — add getLeaf for landing page tests, revealLeaf + getRightLeaf for dashboard tests
export class Workspace {
    getLeavesOfType = vi.fn(() => []);
    getActiveViewOfType = vi.fn();
    getLeaf = vi.fn(() => ({
        openFile: vi.fn().mockResolvedValue(undefined),
    }));
    revealLeaf = vi.fn();
    getRightLeaf = vi.fn(() => ({
        setViewState: vi.fn().mockResolvedValue(undefined),
        view: null,
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

export class Scope {
    register = vi.fn();
}

// Modal — add contentEl, modalEl, scope for modal tests
export class Modal {
    app: App;
    contentEl = document.createElement("div");
    modalEl = document.createElement("div");
    scope = new Scope();
    constructor(app: App) { this.app = app; }
    open = vi.fn();
    close = vi.fn();
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

// Setting class — DOM tree: settingEl > controlEl, functional addText/addDropdown
export class Setting {
    settingEl = document.createElement("div");
    controlEl = document.createElement("div");
    constructor(containerEl: HTMLElement) {
        this.settingEl.appendChild(this.controlEl);
        containerEl.appendChild(this.settingEl);
    }
    setName(name: string) { return this; }
    setDesc(desc: string) { return this; }
    setHeading() { return this; }
    setClass(cls: string) { this.settingEl.className = cls; return this; }
    addText(cb: (text: any) => any) {
        const input = document.createElement("input");
        input.type = "text";
        const textComponent = {
            inputEl: input,
            setPlaceholder: (p: string) => { input.placeholder = p; return textComponent; },
            onChange: (fn: (v: string) => void) => {
                input.addEventListener("input", () => fn(input.value));
                return textComponent;
            },
            setValue: (v: string) => { input.value = v; return textComponent; },
        };
        this.controlEl.appendChild(input);
        cb(textComponent);
        return this;
    }
    addDropdown(cb: (dropdown: any) => any) {
        const select = document.createElement("select");
        const dropdown = {
            selectEl: select,
            addOption: (value: string, display: string) => {
                const opt = document.createElement("option");
                opt.value = value;
                opt.textContent = display;
                select.appendChild(opt);
                return dropdown;
            },
            setValue: (v: string) => { select.value = v; return dropdown; },
            onChange: (fn: (v: string) => void) => {
                select.addEventListener("change", () => fn(select.value));
                return dropdown;
            },
        };
        this.controlEl.appendChild(select);
        cb(dropdown);
        return this;
    }
    addToggle(cb: any) { return this; }
    addButton(cb: any) { return this; }
}

// PluginSettingTab — stub
export class PluginSettingTab {
    app: App;
    constructor(app: App, plugin: any) { this.app = app; }
    display() { }
    hide() { }
}

export class TAbstractFile {
    path = "";
}

export class AbstractInputSuggest<T> {
    app: App;
    constructor(app: App, inputEl: HTMLInputElement) { this.app = app; }
    close() { }
    getSuggestions(query: string): T[] { return []; }
    renderSuggestion(value: T, el: HTMLElement): void { }
    selectSuggestion(value: T): void { }
}

export class TextComponent {
    inputEl = document.createElement("input");
    setValue(val: string) { this.inputEl.value = val; return this; }
    setPlaceholder(ph: string) { return this; }
    onChange(cb: (value: string) => void) { return this; }
}

export class WorkspaceLeaf {
    view: any;
}

export class ItemView {
    containerEl = document.createElement("div");
    contentEl = document.createElement("div");
    leaf: WorkspaceLeaf;
    constructor(leaf: WorkspaceLeaf) {
        this.leaf = leaf;
        this.containerEl.appendChild(this.contentEl);
    }
    registerInterval(id: number) { return id; }
}

export function normalizePath(path: string): string {
    return path;
}
