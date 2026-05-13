import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

export default defineConfig({
  source: ["src", "addon"],
  dist: "build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL:
    "https://github.com/WCG0726/zotero-researchhub/releases/download/release/update.json",
  xpiDownloadLink:
    "https://github.com/WCG0726/zotero-researchhub/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        outfile: `build/addon/chrome/content/scripts/${pkg.config.addonRef}.js`,
        bundle: true,
        target: "firefox115",
      },
    ],
  },
});
