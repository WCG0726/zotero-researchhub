/**
 * ResearchHub Zotero Plugin - Entry Point
 */

import { openDialog, closeDialog } from "./ui/mainDialog";

const plugin = {
  id: "zotero-researchhub@wcg0726.github.io",
  version: "1.0.0",
  rootURI: "",
  hooks: {
    onStartup() {
      Zotero.debug("[ResearchHub] Plugin starting...");
    },

    onMainWindowLoad(window: Window) {
      Zotero.debug("[ResearchHub] Main window loaded");

      const doc = window.document;

      // Add to Tools menu
      const toolsMenu = doc.getElementById("menu_ToolsPopup");
      if (toolsMenu) {
        const menuitem = doc.createXULElement
          ? doc.createXULElement("menuitem")
          : doc.createElement("menuitem");
        menuitem.id = "researchhub-menu-item";
        menuitem.setAttribute("label", "ResearchHub");
        menuitem.setAttribute("tooltiptext", "打开 ResearchHub 科研工具箱");
        menuitem.addEventListener("command", () => openDialog());
        toolsMenu.appendChild(menuitem);
      }

      // Add keyboard shortcut
      const keyset = doc.getElementById("mainKeyset") || doc.querySelector("keyset");
      if (keyset) {
        const key = doc.createXULElement
          ? doc.createXULElement("key")
          : doc.createElement("key");
        key.id = "researchhub-key";
        key.setAttribute("key", "R");
        key.setAttribute("modifiers", "accel,shift");
        key.setAttribute("oncommand", "");
        key.addEventListener("command", () => openDialog());
        keyset.appendChild(key);
      }

      Zotero.debug("[ResearchHub] Main window UI initialized");
    },

    onMainWindowUnload(window: Window) {
      Zotero.debug("[ResearchHub] Main window unloading");
      const doc = window.document;
      doc.getElementById("researchhub-menu-item")?.remove();
      doc.getElementById("researchhub-key")?.remove();
    },

    onShutdown() {
      Zotero.debug("[ResearchHub] Plugin shutting down...");
      closeDialog();

      // Clean up all windows
      const windows = Zotero.getMainWindows();
      for (const win of windows) {
        const doc = win.document;
        doc.getElementById("researchhub-menu-item")?.remove();
        doc.getElementById("researchhub-key")?.remove();
      }

      Zotero.__addonInstance__ = undefined;
      Zotero.debug("[ResearchHub] Plugin shut down complete");
    },
  },
};

// Register the plugin instance
(Zotero as any).__addonInstance__ = plugin;
