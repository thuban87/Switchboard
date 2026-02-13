/**
 * Deploy script for Switchboard plugin
 * 
 * Usage:
 *   node scripts/deploy.mjs test        — Deploy to test vault
 *   node scripts/deploy.mjs staging     — Deploy to staging vault
 *   node scripts/deploy.mjs production  — Deploy to production (requires confirmation)
 */

import fs from "fs";
import path from "path";
import readline from "readline";

const targets = {
    test: "C:/Quest-Board-Test-Vault/.obsidian/plugins/switchboard",
    staging: "C:/Quest-Board-Staging-Vault/Staging Vault/.obsidian/plugins/switchboard",
    production: "G:/My Drive/IT/Obsidian Vault/My Notebooks/.obsidian/plugins/switchboard",
};

const filesToCopy = ["main.js", "manifest.json", "styles.css"];

const target = process.argv[2];

if (!target || !targets[target]) {
    console.error("❌ Usage: node scripts/deploy.mjs [test|staging|production]");
    process.exit(1);
}

const deployPath = targets[target];

/**
 * Copy plugin files to the target directory
 */
function deploy() {
    // Ensure deploy directory exists
    if (!fs.existsSync(deployPath)) {
        fs.mkdirSync(deployPath, { recursive: true });
    }

    let copied = 0;
    for (const file of filesToCopy) {
        const src = path.resolve(file);
        if (!fs.existsSync(src)) {
            console.warn(`⚠️  ${file} not found — skipping (run 'npm run build' first?)`);
            continue;
        }
        const dest = path.join(deployPath, file);
        fs.copyFileSync(src, dest);
        console.log(`  ✅ ${file}`);
        copied++;
    }

    console.log(`\n📞 Deployed ${copied} files to ${target}: ${deployPath}`);
}

/**
 * Prompt user for yes/no confirmation
 */
function confirm(message) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(message, (answer) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith("y"));
        });
    });
}

// Main
if (target === "production") {
    console.log(`\n⚠️  PRODUCTION DEPLOYMENT`);
    console.log(`Target: ${deployPath}\n`);
    const confirmed = await confirm("Are you sure you want to deploy to PRODUCTION? (yes/no): ");
    if (!confirmed) {
        console.log("❌ Deployment cancelled.");
        process.exit(0);
    }
    console.log("\nDeploying to production...");
    deploy();
} else {
    console.log(`\nDeploying to ${target}...`);
    deploy();
}
