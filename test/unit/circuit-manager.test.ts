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
});
