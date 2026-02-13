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
    HTMLElement.prototype.empty = function () {
        this.innerHTML = "";
    };
    HTMLElement.prototype.createSpan = function (options?: string | { text?: string; cls?: string }) {
        const span = document.createElement("span");
        if (typeof options === "string") {
            span.className = options;
        } else if (options) {
            if (options.text) span.textContent = options.text;
            if (options.cls) span.className = options.cls;
        }
        this.appendChild(span);
        return span;
    };
    HTMLElement.prototype.createDiv = function (clsOrOptions?: string | { text?: string; cls?: string }) {
        const div = document.createElement("div");
        if (typeof clsOrOptions === "string") {
            div.className = clsOrOptions;
        } else if (clsOrOptions) {
            if (clsOrOptions.text) div.textContent = clsOrOptions.text;
            if (clsOrOptions.cls) div.className = clsOrOptions.cls;
        }
        this.appendChild(div);
        return div;
    };
    HTMLElement.prototype.createEl = function (tag: string, options?: { text?: string; cls?: string }) {
        const el = document.createElement(tag);
        if (options) {
            if (options.text) el.textContent = options.text;
            if (options.cls) el.className = options.cls;
        }
        this.appendChild(el);
        return el;
    };
}
