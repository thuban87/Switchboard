import { App, TFolder } from "obsidian";
import { SwitchboardLine } from "../types";

/**
 * CircuitManager - Handles CSS injection for Signal Isolation
 * 
 * Responsibilities:
 * - Injects/removes body class for active line
 * - Generates dynamic CSS for folder fading
 * - Manages accent color override
 * - Collapses/expands folders for focus
 */
export class CircuitManager {
    private app: App;
    private styleEl: HTMLStyleElement | null = null;
    private readonly STYLE_ID = "switchboard-circuit-style";

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Activates the circuit for a line
     * - Adds body class
     * - Injects dynamic CSS
     * - Collapses all folders, expands safe paths
     */
    activate(line: SwitchboardLine, focusFolders: boolean = true): void {
        // Remove any existing circuit first
        this.deactivate();

        // Add body class
        document.body.addClass(`switchboard-active`);
        document.body.addClass(`switchboard-active-${line.id}`);

        // Create and inject style element
        this.styleEl = document.createElement("style");
        this.styleEl.id = this.STYLE_ID;
        this.styleEl.textContent = this.generateCSS(line);
        document.head.appendChild(this.styleEl);

        // Collapse all folders, then expand safe paths
        if (focusFolders) {
            this.focusFolders(line.safePaths);
        }

        console.log(`CircuitManager: Activated circuit for "${line.name}"`);
    }

    /**
     * Deactivates the circuit
     * - Removes body classes
     * - Removes injected CSS
     */
    deactivate(): void {
        // Remove all switchboard body classes
        const classes = Array.from(document.body.classList);
        for (const cls of classes) {
            if (cls.startsWith("switchboard-active")) {
                document.body.removeClass(cls);
            }
        }

        // Remove style element
        if (this.styleEl) {
            this.styleEl.remove();
            this.styleEl = null;
        }

        // Also try to find by ID in case of reload
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }

        console.log("CircuitManager: Deactivated circuit");
    }

    /**
     * Collapses all folders, then expands the safe paths
     */
    private focusFolders(safePaths: string[]): void {
        // Use native collapse-all command for performance (optimized for large vaults)
        (this.app as any).commands?.executeCommandById?.("file-explorer:collapse-all");

        const fileExplorer = this.app.workspace.getLeavesOfType("file-explorer")[0];
        if (!fileExplorer) {
            console.log("CircuitManager: File explorer not found");
            return;
        }

        const explorerView = fileExplorer.view as any;
        if (!explorerView?.fileItems) {
            console.log("CircuitManager: File items not accessible");
            return;
        }

        // Expand the safe paths (and their parent folders)
        for (const safePath of safePaths) {
            if (!safePath) continue;

            // Expand each segment of the path
            const segments = safePath.split("/");
            let currentPath = "";

            for (const segment of segments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                const item = explorerView.fileItems[currentPath];
                if (item && (item as any).setCollapsed) {
                    (item as any).setCollapsed(false);
                }
            }
        }

        console.log("CircuitManager: Focused folders on safe paths");
    }

    /**
     * Generates the dynamic CSS for Signal Isolation
     */
    private generateCSS(line: SwitchboardLine): string {
        const safePathSelectors = this.generateSafePathSelectors(line.safePaths);

        return `
/* Switchboard Circuit - ${line.name} */

/* Accent Color Override */
body.switchboard-active-${line.id} {
	--interactive-accent: ${line.color} !important;
	--interactive-accent-hover: ${this.adjustBrightness(line.color, -10)} !important;
}

/* Signal Isolation - Fade non-safe folders */
body.switchboard-active-${line.id} .nav-folder-title,
body.switchboard-active-${line.id} .nav-file-title {
	opacity: 0.15;
	filter: grayscale(80%);
	transition: opacity 0.2s ease, filter 0.2s ease;
}

/* Keep safe paths visible */
${safePathSelectors}

/* Fade effect for folder children */
body.switchboard-active-${line.id} .nav-folder-title:hover,
body.switchboard-active-${line.id} .nav-file-title:hover {
	opacity: 0.6;
	filter: grayscale(40%);
}

/* Active file should always be visible */
body.switchboard-active-${line.id} .nav-file-title.is-active,
body.switchboard-active-${line.id} .nav-folder-title.is-active {
	opacity: 1;
	filter: none;
}
`;
    }

    /**
     * Generates CSS selectors for safe paths
     * Uses data-path attribute which contains the folder path
     */
    private generateSafePathSelectors(safePaths: string[]): string {
        if (safePaths.length === 0 || (safePaths.length === 1 && !safePaths[0])) {
            return "/* No safe paths defined */";
        }

        const selectors: string[] = [];

        for (const path of safePaths) {
            if (!path) continue;

            // Escape path for CSS attribute selector to prevent injection
            const escapedPath = CSS.escape(path);

            // Match the folder itself and all children (using *= for contains)
            // Obsidian uses data-path attribute on nav-folder-title and nav-file-title
            selectors.push(`
/* Safe path: ${path} */
body.switchboard-active .nav-folder-title[data-path="${escapedPath}"],
body.switchboard-active .nav-folder-title[data-path^="${escapedPath}/"],
body.switchboard-active .nav-file-title[data-path^="${escapedPath}/"],
body.switchboard-active .nav-folder-title[data-path="${escapedPath}"] ~ .nav-folder-children .nav-folder-title,
body.switchboard-active .nav-folder-title[data-path="${escapedPath}"] ~ .nav-folder-children .nav-file-title {
	opacity: 1 !important;
	filter: none !important;
}`);
        }

        return selectors.join("\n");
    }

    /**
     * Adjusts color brightness for hover states
     */
    private adjustBrightness(hex: string, percent: number): string {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Check if circuit is currently active
     */
    isActive(): boolean {
        return document.body.hasClass("switchboard-active");
    }
}
