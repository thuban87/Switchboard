import { defineConfig } from "vitest/config";
import path from "path";

// 1. Get current time in Chicago
// We use the 'sv-SE' (Sweden) locale trick because it formats as "YYYY-MM-DD HH:MM:SS"
// automatically, which is easy to sort.
const chicagoTime = new Date().toLocaleString("sv-SE", {
    timeZone: "America/Chicago",
});

// 2. Clean it up for Windows filenames
const timestamp = chicagoTime.replace(" ", "_").replace(/:/g, "-");

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./test/setup.ts"],

        coverage: {
            reportsDirectory: `C:\\Users\\bwales\\projects\\obsidian-plugins\\ViTest Coverage Reports\\switchboard\\${timestamp}`,
        },
    },
    resolve: {
        alias: {
            obsidian: path.resolve(__dirname, "test/__mocks__/obsidian.ts"),
        },
    },
});