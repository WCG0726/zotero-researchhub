/**
 * ResearchHub Zotero Plugin - Entry Point
 */

import { openDialog, closeDialog } from "./ui/mainDialog";

// Global namespace for bootstrap.js to call
(Zotero as any).ResearchHub = {
  onStartup({ id, version, rootURI }: { id: string; version: string; rootURI: string }) {
    Zotero.debug("[ResearchHub] Plugin starting...");

    // Register toolbar button
    const doc = Zotero.getMainWindow().document;

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

    Zotero.debug("[ResearchHub] Plugin started successfully");
  },

  onShutdown() {
    Zotero.debug("[ResearchHub] Plugin shutting down...");
    closeDialog();

    // Remove menu item
    const doc = Zotero.getMainWindow()?.document;
    if (doc) {
      doc.getElementById("researchhub-menu-item")?.remove();
      doc.getElementById("researchhub-key")?.remove();
    }
  },
};
