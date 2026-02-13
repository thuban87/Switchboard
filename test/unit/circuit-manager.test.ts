/**
 * Integration tests for CircuitManager (S13)
 * Tests DOM manipulation: style injection, body class management, CSS generation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "../__mocks__/obsidian";
import { CircuitManager } from "../../src/services/CircuitManager";
import { SwitchboardLine } from "../../src/types";

function createMockLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "math-140",
        name: "Math 140",
        color: "#3498db",
        safePaths: ["Career/School/Math 140"],
        landingPage: "Career/School/Math 140/Dashboard.canvas",
        sessionLogFile: "",
        sessionLogHeading: "",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

describe("CircuitManager", () => {
    let cm: CircuitManager;
    let app: App;

    beforeEach(() => {
        app = new App();
        cm = new CircuitManager(app);

        // Clean up DOM between tests
        document.body.className = "";
        document.head.querySelectorAll("style").forEach(el => el.remove());
    });

    describe("activate()", () => {
        it("injects a <style> element into document.head", () => {
            const line = createMockLine();
            cm.activate(line, false);

            const styleEl = document.getElementById("switchboard-circuit-style");
            expect(styleEl).not.toBeNull();
            expect(styleEl?.tagName).toBe("STYLE");
        });

        it("adds correct body classes", () => {
            const line = createMockLine();
            cm.activate(line, false);

            expect(document.body.classList.contains("switchboard-active")).toBe(true);
            expect(document.body.classList.contains("switchboard-active-math-140")).toBe(true);
        });

        it("handles empty line ID gracefully", () => {
            const line = createMockLine({ id: "" });
            // Should not throw
            expect(() => cm.activate(line, false)).not.toThrow();

            const styleEl = document.getElementById("switchboard-circuit-style");
            expect(styleEl).not.toBeNull();
        });

        it("CSS contains accent color override", () => {
            const line = createMockLine({ color: "#e74c3c" });
            cm.activate(line, false);

            const styleEl = document.getElementById("switchboard-circuit-style");
            expect(styleEl?.textContent).toContain("--interactive-accent: #e74c3c");
        });

        it("CSS contains safe path opacity rules", () => {
            const line = createMockLine({ safePaths: ["Projects/MyProject"] });
            cm.activate(line, false);

            const styleEl = document.getElementById("switchboard-circuit-style");
            const css = styleEl?.textContent || "";
            expect(css).toContain("data-path");
            expect(css).toContain("opacity: 1");
        });
    });

    describe("deactivate()", () => {
        it("removes style element and body classes", () => {
            const line = createMockLine();
            cm.activate(line, false);
            cm.deactivate();

            expect(document.getElementById("switchboard-circuit-style")).toBeNull();
            expect(document.body.classList.contains("switchboard-active")).toBe(false);
            expect(document.body.classList.contains("switchboard-active-math-140")).toBe(false);
        });
    });

    describe("activate() then deactivate() round-trip", () => {
        it("DOM returns to initial state after full cycle", () => {
            const initialClassCount = document.body.classList.length;
            const initialStyleCount = document.head.querySelectorAll("style").length;

            const line = createMockLine();
            cm.activate(line, false);
            cm.deactivate();

            expect(document.body.classList.length).toBe(initialClassCount);
            expect(document.head.querySelectorAll("style").length).toBe(initialStyleCount);
        });
    });

    describe("focusFolders()", () => {
        it("fails silently when file explorer is not available (S2 try-catch)", () => {
            // getLeavesOfType returns empty array — no explorer
            app.workspace.getLeavesOfType = vi.fn(() => []);
            const line = createMockLine();

            // Should not throw even though explorer isn't found
            expect(() => cm.activate(line, true)).not.toThrow();
        });
    });

    describe("generateCSS snapshots", () => {
        it("basic line → snapshot matches", () => {
            const line = createMockLine({ id: "math-140", color: "#3498db" });
            cm.activate(line, false);
            const styleEl = document.getElementById("switchboard-circuit-style");
            expect(styleEl?.textContent).toMatchSnapshot();
        });

        it("line with multiple safe paths → snapshot matches", () => {
            const line = createMockLine({
                id: "work",
                name: "Work",
                color: "#e74c3c",
                safePaths: ["Projects/Alpha", "Projects/Beta", "Shared/Resources"],
            });
            cm.activate(line, false);
            const styleEl = document.getElementById("switchboard-circuit-style");
            expect(styleEl?.textContent).toMatchSnapshot();
        });

        it("line with special characters in path → CSS.escape applied", () => {
            const line = createMockLine({
                id: "special",
                name: "Special",
                safePaths: ["Path (with parens)/Sub [brackets]"],
            });
            cm.activate(line, false);
            const styleEl = document.getElementById("switchboard-circuit-style");
            const css = styleEl?.textContent || "";
            // CSS.escape should escape the special characters
            expect(css).not.toContain('data-path="Path (with parens)');
            expect(css).toContain("data-path");
            expect(css).toMatchSnapshot();
        });

        it("accent color override → snapshot matches", () => {
            const line = createMockLine({
                id: "writing",
                name: "Writing",
                color: "#9b59b6",
                safePaths: ["Creative/Writing"],
            });
            cm.activate(line, false);
            const styleEl = document.getElementById("switchboard-circuit-style");
            const css = styleEl?.textContent || "";
            expect(css).toContain("--interactive-accent: #9b59b6");
            expect(css).toMatchSnapshot();
        });
    });

    describe("adjustBrightness()", () => {
        it("darkens a color by percentage", () => {
            // adjustBrightness is private — access via (cm as any)
            const result = (cm as any).adjustBrightness("#ffffff", -10);
            // Math.round(2.55 * -10) = -25 (JS rounds half-up), 255 - 25 = 230 = 0xe6
            expect(result).toBe("#e6e6e6");
        });

        it("lightens a color by percentage", () => {
            const result = (cm as any).adjustBrightness("#000000", 10);
            // Math.round(2.55 * 10) = 26, 0 + 26 = 26 = 0x1a
            expect(result).toBe("#1a1a1a");
        });
    });

    describe("activate cleanup", () => {
        it("activate() calls deactivate() first (prevents stale styles on rapid switch)", () => {
            const line1 = createMockLine({ id: "line-a", name: "Line A", color: "#111111" });
            const line2 = createMockLine({ id: "line-b", name: "Line B", color: "#222222" });

            cm.activate(line1, false);
            expect(document.body.classList.contains("switchboard-active-line-a")).toBe(true);

            // Activate a different line — should remove line-a classes first
            cm.activate(line2, false);
            expect(document.body.classList.contains("switchboard-active-line-a")).toBe(false);
            expect(document.body.classList.contains("switchboard-active-line-b")).toBe(true);

            // Should only have one style element
            const styleEls = document.head.querySelectorAll("#switchboard-circuit-style");
            expect(styleEls.length).toBe(1);
        });
    });

    /**
     * Phase F: Remaining branch coverage tests
     */
    describe("isActive()", () => {
        it("returns true when switchboard-active class is on body", () => {
            document.body.addClass("switchboard-active");
            expect(cm.isActive()).toBe(true);
        });

        it("returns false when no switchboard-active class", () => {
            // body is cleaned in beforeEach
            expect(cm.isActive()).toBe(false);
        });
    });

    describe("deactivate — cleanup edge cases", () => {
        it("removes orphaned style element found by ID (reload scenario)", () => {
            // Simulate a reload scenario: style element exists in DOM but not tracked by styleEl
            const orphanedStyle = document.createElement("style");
            orphanedStyle.id = "switchboard-circuit-style";
            orphanedStyle.textContent = "/* orphaned */";
            document.head.appendChild(orphanedStyle);

            // Verify it's there
            expect(document.getElementById("switchboard-circuit-style")).not.toBeNull();

            // deactivate without prior activate — should still find and remove by ID
            cm.deactivate();

            expect(document.getElementById("switchboard-circuit-style")).toBeNull();
        });

        it("handles missing styleEl gracefully (already removed)", () => {
            // No activate() called — styleEl is null
            // Should not throw
            expect(() => cm.deactivate()).not.toThrow();
        });
    });

    describe("generateSafePathSelectors — edge cases", () => {
        it("returns comment when safePaths is empty array", () => {
            const result = (cm as any).generateSafePathSelectors([], "test-id");
            expect(result).toBe("/* No safe paths defined */");
        });

        it("returns comment when safePaths has single empty string", () => {
            const result = (cm as any).generateSafePathSelectors([""], "test-id");
            expect(result).toBe("/* No safe paths defined */");
        });

        it("skips empty strings in mixed paths array", () => {
            const result = (cm as any).generateSafePathSelectors(
                ["Projects/Alpha", "", "Projects/Beta"],
                "test-id"
            );
            expect(result).toContain("Projects/Alpha");
            expect(result).toContain("Projects/Beta");
            // Should not produce a selector for the empty string
            expect(result).not.toContain('data-path=""');
        });
    });

    describe("activate — focusFolders parameter", () => {
        it("calls focusFolders when focusFolders=true (default)", () => {
            const spy = vi.spyOn(cm as any, "focusFolders");
            const line = createMockLine();

            cm.activate(line); // default is true

            expect(spy).toHaveBeenCalledWith(line.safePaths);
        });

        it("skips focusFolders when focusFolders=false", () => {
            const spy = vi.spyOn(cm as any, "focusFolders");
            const line = createMockLine();

            cm.activate(line, false);

            expect(spy).not.toHaveBeenCalled();
        });
    });
});
