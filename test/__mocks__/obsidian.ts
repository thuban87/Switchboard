/**
 * Minimal Obsidian mock for unit tests (S4).
 * S13 will expand this into a full mock with Vault, Workspace, etc.
 */

export class Notice {
    constructor(public message: string, public timeout?: number) { }
}

export class App {
    vault = {};
    workspace = {};
    plugins = { getPlugin: () => null };
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
