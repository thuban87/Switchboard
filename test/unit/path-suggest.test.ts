/**
 * PathSuggest Tests — Phase I-1
 * Tests FolderSuggest and FileSuggest classes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App, TFolder, TAbstractFile } from "obsidian";
import { FolderSuggest, FileSuggest } from "../../src/settings/PathSuggest";

describe("FolderSuggest", () => {
    let app: App;
    let inputEl: HTMLInputElement;
    let suggest: FolderSuggest;

    const makeFolders = (paths: string[]): TFolder[] =>
        paths.map((p) => {
            const f = new TFolder();
            f.path = p;
            return f;
        });

    beforeEach(() => {
        vi.useFakeTimers();
        app = new App();
        inputEl = document.createElement("input");
        suggest = new FolderSuggest(app, inputEl);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("getSuggestions returns empty array for empty input", () => {
        const result = suggest.getSuggestions("");
        expect(result).toEqual([]);
        // vault.getAllLoadedFiles should NOT have been called
        expect(app.vault.getAllLoadedFiles).not.toHaveBeenCalled();
    });

    it("getSuggestions filters folders by case-insensitive match", () => {
        const folders = makeFolders(["Career/School", "Personal/Health", "Career/Work"]);
        (app.vault.getAllLoadedFiles as any).mockReturnValue(folders);

        const result = suggest.getSuggestions("career");
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.path)).toContain("Career/School");
        expect(result.map((f) => f.path)).toContain("Career/Work");
    });

    it("getSuggestions sorts by path length then alphabetically", () => {
        const folders = makeFolders(["Zzz", "Aaa/Bbb/Ccc", "Aaa/Bbb", "Aaa"]);
        (app.vault.getAllLoadedFiles as any).mockReturnValue(folders);

        const result = suggest.getSuggestions("a");
        // "Aaa" (3), then "Aaa/Bbb" (7), then "Aaa/Bbb/Ccc" (11)
        expect(result.map((f) => f.path)).toEqual(["Aaa", "Aaa/Bbb", "Aaa/Bbb/Ccc"]);
    });

    it("getSuggestions limits results to 20", () => {
        const folders = makeFolders(
            Array.from({ length: 30 }, (_, i) => `Folder${String(i).padStart(2, "0")}`)
        );
        (app.vault.getAllLoadedFiles as any).mockReturnValue(folders);

        const result = suggest.getSuggestions("folder");
        expect(result).toHaveLength(20);
    });

    it("getSuggestions caches folder list (second call doesn't re-scan)", () => {
        const folders = makeFolders(["Career/School"]);
        (app.vault.getAllLoadedFiles as any).mockReturnValue(folders);

        suggest.getSuggestions("career");
        suggest.getSuggestions("career");

        // Only called once — second call uses cache
        expect(app.vault.getAllLoadedFiles).toHaveBeenCalledTimes(1);
    });

    it("getSuggestions invalidates cache after TTL", () => {
        const folders = makeFolders(["Career/School"]);
        (app.vault.getAllLoadedFiles as any).mockReturnValue(folders);

        suggest.getSuggestions("career");
        expect(app.vault.getAllLoadedFiles).toHaveBeenCalledTimes(1);

        // Advance past the 5 second TTL
        vi.advanceTimersByTime(5001);

        suggest.getSuggestions("career");
        expect(app.vault.getAllLoadedFiles).toHaveBeenCalledTimes(2);
    });

    it("renderSuggestion creates span with folder icon and path", () => {
        const folder = new TFolder();
        folder.path = "Career/School";
        const el = document.createElement("div");

        suggest.renderSuggestion(folder, el);

        expect(el.classList.contains("switchboard-folder-suggestion")).toBe(true);
        const spans = el.querySelectorAll("span");
        expect(spans).toHaveLength(2);
        expect(spans[0].textContent).toBe("📁");
        expect(spans[0].className).toBe("suggestion-icon");
        expect(spans[1].textContent).toBe("Career/School");
        expect(spans[1].className).toBe("suggestion-content");
    });

    it("selectSuggestion sets input value and triggers input event", () => {
        const folder = new TFolder();
        folder.path = "Career/School";
        const listener = vi.fn();
        inputEl.addEventListener("input", listener);

        suggest.selectSuggestion(folder);

        expect(inputEl.value).toBe("Career/School");
        expect(listener).toHaveBeenCalled();
    });
});

describe("FileSuggest", () => {
    let app: App;
    let inputEl: HTMLInputElement;
    let suggest: FileSuggest;

    const makeFile = (path: string): TAbstractFile => {
        const f = new TAbstractFile();
        f.path = path;
        return f;
    };

    const makeFolder = (path: string): TFolder => {
        const f = new TFolder();
        f.path = path;
        return f;
    };

    beforeEach(() => {
        app = new App();
        inputEl = document.createElement("input");
        suggest = new FileSuggest(app, inputEl);
    });

    it("getSuggestions returns empty array for empty input", () => {
        const result = suggest.getSuggestions("");
        expect(result).toEqual([]);
        expect(app.vault.getAllLoadedFiles).not.toHaveBeenCalled();
    });

    it("getSuggestions filters files by case-insensitive match", () => {
        const files = [makeFile("Notes/Math.md"), makeFile("Notes/Bio.md"), makeFile("Config/settings.json")];
        (app.vault.getAllLoadedFiles as any).mockReturnValue(files);

        const result = suggest.getSuggestions("notes");
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.path)).toContain("Notes/Math.md");
        expect(result.map((f) => f.path)).toContain("Notes/Bio.md");
    });

    it("getSuggestions prioritizes .md and .canvas files", () => {
        const files = [
            makeFile("Notes/image.png"),
            makeFile("Notes/doc.md"),
            makeFile("Notes/board.canvas"),
            makeFile("Notes/data.json"),
        ];
        (app.vault.getAllLoadedFiles as any).mockReturnValue(files);

        const result = suggest.getSuggestions("notes");
        // .md and .canvas should come first
        expect(result[0].path).toBe("Notes/doc.md");
        expect(result[1].path).toBe("Notes/board.canvas");
        // Non-priority files: sorted by length then alphabetically
        expect(result[2].path).toBe("Notes/data.json");
        expect(result[3].path).toBe("Notes/image.png");
    });

    it("getSuggestions limits results to 20", () => {
        const files = Array.from({ length: 30 }, (_, i) => makeFile(`File${String(i).padStart(2, "0")}.md`));
        (app.vault.getAllLoadedFiles as any).mockReturnValue(files);

        const result = suggest.getSuggestions("file");
        expect(result).toHaveLength(20);
    });

    it("renderSuggestion shows folder icon for TFolder, file icon for others", () => {
        const file = makeFile("Notes/Math.md");
        const folder = makeFolder("Notes");

        const fileEl = document.createElement("div");
        suggest.renderSuggestion(file, fileEl);
        const fileSpans = fileEl.querySelectorAll("span");
        expect(fileSpans[0].textContent).toBe("📄");

        const folderEl = document.createElement("div");
        suggest.renderSuggestion(folder, folderEl);
        const folderSpans = folderEl.querySelectorAll("span");
        expect(folderSpans[0].textContent).toBe("📁");
    });

    it("selectSuggestion sets input value and triggers input event", () => {
        const file = makeFile("Notes/Math.md");
        const listener = vi.fn();
        inputEl.addEventListener("input", listener);

        suggest.selectSuggestion(file);

        expect(inputEl.value).toBe("Notes/Math.md");
        expect(listener).toHaveBeenCalled();
    });
});
