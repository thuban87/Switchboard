import { App, AbstractInputSuggest, TFolder, TAbstractFile } from "obsidian";

/**
 * Folder suggester that provides autocomplete for folder paths
 * Case-insensitive matching
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    /**
     * Get all folders that match the current input (case-insensitive)
     */
    getSuggestions(inputStr: string): TFolder[] {
        const lowerInput = inputStr.toLowerCase();
        const folders: TFolder[] = [];

        // Get all folders from the vault
        const allFiles = this.app.vault.getAllLoadedFiles();

        for (const file of allFiles) {
            if (file instanceof TFolder) {
                // Skip root folder
                if (file.path === "/") continue;

                // Case-insensitive match
                if (file.path.toLowerCase().includes(lowerInput)) {
                    folders.push(file);
                }
            }
        }

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
        el.createSpan({ cls: "suggestion-icon", text: "📁" });
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

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    /**
     * Get all files that match the current input (case-insensitive)
     */
    getSuggestions(inputStr: string): TAbstractFile[] {
        const lowerInput = inputStr.toLowerCase();
        const files: TAbstractFile[] = [];

        const allFiles = this.app.vault.getAllLoadedFiles();

        for (const file of allFiles) {
            // Include both files and folders (user might want to specify a folder)
            if (file.path === "/") continue;

            // Case-insensitive match
            if (file.path.toLowerCase().includes(lowerInput)) {
                files.push(file);
            }
        }

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

        const icon = file instanceof TFolder ? "📁" : "📄";
        el.createSpan({ cls: "suggestion-icon", text: icon });
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
