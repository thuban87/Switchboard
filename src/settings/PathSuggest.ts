import { App, AbstractInputSuggest, TFolder, TAbstractFile, setIcon } from "obsidian";

/**
 * Folder suggester that provides autocomplete for folder paths
 * Case-insensitive matching
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    private inputEl: HTMLInputElement;
    /** Cached folder list to avoid re-scanning vault on every keystroke (Fix #28) */
    private cachedFolders: TFolder[] | null = null;
    private cacheTimestamp: number = 0;
    private static CACHE_TTL_MS = 5000; // 5 second TTL

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    /**
     * Get all folders that match the current input (case-insensitive).
     * Uses a TTL cache to avoid re-scanning the vault on every keystroke.
     * Returns empty array for empty input (Fix #55).
     */
    getSuggestions(inputStr: string): TFolder[] {
        // Fix #55: empty input returns nothing
        if (!inputStr) return [];

        const lowerInput = inputStr.toLowerCase();

        // Invalidate cache after TTL (Fix #28)
        if (!this.cachedFolders || Date.now() - this.cacheTimestamp > FolderSuggest.CACHE_TTL_MS) {
            this.cachedFolders = this.app.vault.getAllLoadedFiles()
                .filter((f): f is TFolder => f instanceof TFolder && f.path !== "/");
            this.cacheTimestamp = Date.now();
        }

        // Filter cached folders by query
        const folders = this.cachedFolders.filter(f =>
            f.path.toLowerCase().includes(lowerInput)
        );

        // Sort by path length (shorter paths first) then alphabetically
        folders.sort((a, b) => {
            if (a.path.length !== b.path.length) {
                return a.path.length - b.path.length;
            }
            return a.path.localeCompare(b.path);
        });

        // Limit results to prevent UI overload
        return folders.slice(0, 20);
    }

    /**
     * Render a suggestion in the dropdown
     */
    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.addClass("switchboard-folder-suggestion");

        // Show folder icon + path
        const iconEl = el.createSpan({ cls: "suggestion-icon" });
        setIcon(iconEl, "folder");
        el.createSpan({ cls: "suggestion-content", text: folder.path });
    }

    /**
     * Handle selection of a suggestion
     */
    selectSuggestion(folder: TFolder): void {
        this.inputEl.value = folder.path;
        this.inputEl.trigger("input");
        this.close();
    }
}

/**
 * File suggester for landing page paths (files only)
 * Case-insensitive matching
 */
export class FileSuggest extends AbstractInputSuggest<TAbstractFile> {
    private inputEl: HTMLInputElement;
    /** Cached file list to avoid re-scanning vault on every keystroke (Fix #28) */
    private cachedFiles: TAbstractFile[] | null = null;
    private cacheTimestamp: number = 0;
    private static CACHE_TTL_MS = 5000; // 5 second TTL

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    /**
     * Get all files that match the current input (case-insensitive).
     * Uses a TTL cache to avoid re-scanning the vault on every keystroke.
     * Returns empty array for empty input (Fix #55).
     */
    getSuggestions(inputStr: string): TAbstractFile[] {
        // Fix #55: empty input returns nothing
        if (!inputStr) return [];

        const lowerInput = inputStr.toLowerCase();

        // Invalidate cache after TTL (Fix #28)
        if (!this.cachedFiles || Date.now() - this.cacheTimestamp > FileSuggest.CACHE_TTL_MS) {
            this.cachedFiles = this.app.vault.getAllLoadedFiles()
                .filter(f => f.path !== "/");
            this.cacheTimestamp = Date.now();
        }

        // Filter cached files by query
        const files = this.cachedFiles.filter(f =>
            f.path.toLowerCase().includes(lowerInput)
        );

        // Sort: prioritize .md and .canvas files, then by length
        files.sort((a, b) => {
            const aIsPriority = a.path.endsWith(".md") || a.path.endsWith(".canvas");
            const bIsPriority = b.path.endsWith(".md") || b.path.endsWith(".canvas");

            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;

            if (a.path.length !== b.path.length) {
                return a.path.length - b.path.length;
            }
            return a.path.localeCompare(b.path);
        });

        return files.slice(0, 20);
    }

    /**
     * Render a suggestion in the dropdown
     */
    renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
        el.addClass("switchboard-file-suggestion");

        const iconEl = el.createSpan({ cls: "suggestion-icon" });
        setIcon(iconEl, file instanceof TFolder ? "folder" : "file");
        el.createSpan({ cls: "suggestion-content", text: file.path });
    }

    /**
     * Handle selection of a suggestion
     */
    selectSuggestion(file: TAbstractFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
