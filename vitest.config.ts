import { defineConfig } from "vitest/config";
import path from "path";

// 1. Determine if we are running on GitHub Actions (CI) or Local
const isCI = process.env.CI === 'true';

// 2. Define the path logic
let outputDir;

if (isCI) {
    // On GitHub, keep it simple. Standard folder, no timestamps.
    outputDir = "coverage";
} else {
    // On Local, do the fancy timestamp stuff
    const chicagoTime = new Date().toLocaleString("sv-SE", { timeZone: "America/Chicago" });
    const timestamp = chicagoTime.replace(" ", "_").replace(/:/g, "-");
    outputDir = `C:\\Users\\bwales\\projects\\obsidian-plugins\\ViTest Coverage Reports\\switchboard\\${timestamp}`;
}

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./test/setup.ts"],
        coverage: {
            // Use the dynamic variable we just created
            reportsDirectory: outputDir,
            // IMPORTANT: We need the 'json-summary' for the GitHub Action to read the math
            reporter: ['text', 'json-summary', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            obsidian: path.resolve(__dirname, "test/__mocks__/obsidian.ts"),
        },
    },
});