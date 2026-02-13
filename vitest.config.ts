import { defineConfig } from "vitest/config";
import path from "path";

// 1. Generate the timestamp
const now = new Date();
// Format: YYYY-MM-DD_HH-mm-ss (Windows safe, no colons)
const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./test/setup.ts"],
        // 2. This must be inside a 'coverage' block, not 'config'
        coverage: {
            // 3. Use template literals `${}` to inject the date
            // 4. Use double backslashes \\ for Windows paths
            reportsDirectory: `C:\\Users\\bwales\\projects\\obsidian-plugins\\ViTest Coverage Reports\\switchboard\\${timestamp}`,
        },
    },
    resolve: {
        alias: {
            obsidian: path.resolve(__dirname, "test/__mocks__/obsidian.ts"),
        },
    },
});