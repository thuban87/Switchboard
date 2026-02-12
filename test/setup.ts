/**
 * Global test setup — polyfills Obsidian's DOM extensions.
 * Loaded via vitest.config.ts setupFiles.
 */

// Obsidian monkey-patches these onto HTMLElement at runtime
if (typeof HTMLElement.prototype.addClass !== "function") {
    HTMLElement.prototype.addClass = function (cls: string) {
        this.classList.add(cls);
    };
    HTMLElement.prototype.removeClass = function (cls: string) {
        this.classList.remove(cls);
    };
    HTMLElement.prototype.hasClass = function (cls: string) {
        return this.classList.contains(cls);
    };
}
