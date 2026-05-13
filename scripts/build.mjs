import { build, context } from "esbuild";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { platform } from "os";

const isPackage = process.argv.includes("--package");

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "addon/chrome/content/scripts/index.js",
  target: "firefox115",
  format: "iife",
  platform: "browser",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
};

async function main() {
  if (isPackage) {
    await build(buildOptions);
    if (!existsSync("build")) mkdirSync("build");
    if (platform() === "win32") {
      execSync(
        'powershell -Command "Compress-Archive -Path \'.\\addon\\*\' -DestinationPath \'.\\build\\zotero-researchhub.zip\' -Force"',
        { stdio: "inherit" }
      );
      execSync("move build\\zotero-researchhub.zip build\\zotero-researchhub.xpi", { stdio: "inherit" });
    } else {
      execSync(
        'cd addon && zip -r ../build/zotero-researchhub.xpi . -x ".*"',
        { stdio: "inherit" }
      );
    }
    console.log("Packaged: build/zotero-researchhub.xpi");
  } else {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  }
}

main().catch(console.error);
