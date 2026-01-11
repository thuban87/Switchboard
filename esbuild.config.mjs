import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";
import path from "path";

const prod = process.argv[2] === "production";
const deployPath = "G:/My Drive/IT/Obsidian Vault/My Notebooks/.obsidian/plugins/switchboard";

// Files to copy after build
const filesToCopy = ["manifest.json", "styles.css"];

const copyPlugin = {
    name: "copy-files",
    setup(build) {
        build.onEnd(() => {
            // Ensure deploy directory exists
            if (!fs.existsSync(deployPath)) {
                fs.mkdirSync(deployPath, { recursive: true });
            }

            // Copy main.js
            const mainSrc = path.resolve("main.js");
            const mainDest = path.join(deployPath, "main.js");
            if (fs.existsSync(mainSrc)) {
                fs.copyFileSync(mainSrc, mainDest);
                console.log(`Copied main.js to ${deployPath}`);
            }

            // Copy other files
            for (const file of filesToCopy) {
                const src = path.resolve(file);
                const dest = path.join(deployPath, file);
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, dest);
                    console.log(`Copied ${file} to ${deployPath}`);
                }
            }
        });
    },
};

const context = await esbuild.context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins,
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    plugins: [copyPlugin],
});

if (prod) {
    await context.rebuild();
    process.exit(0);
} else {
    console.log("Watching for changes...");
    await context.watch();
}
