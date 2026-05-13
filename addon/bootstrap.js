/* eslint-disable no-undef */
var chromeHandle;

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;

  // Register chrome
  const aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ]?.getService(Components.interfaces.amIAddonManagerStartup);
  const manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup?.registerChrome(manifestURI, [
    ["content", "researchhub", rootURI + "chrome/content/"],
    ["locale", "researchhub", "zh-CN", rootURI + "locale/zh-CN/"],
    ["locale", "researchhub", "en-US", rootURI + "locale/en-US/"],
  ]);

  // Load the main script
  Services.scriptloader.loadSubScript(
    rootURI + "chrome/content/scripts/index.js"
  );

  // Call the plugin startup
  Zotero.ResearchHub.onStartup({ id, version, rootURI });
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  Zotero.ResearchHub?.onShutdown();
  Zotero.ResearchHub = undefined;

  // Unregister chrome
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function uninstall(data, reason) {}
