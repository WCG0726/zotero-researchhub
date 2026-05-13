/**
 * Main tabbed dialog window controller
 */

import { render as renderCheckinTab, destroy as destroyCheckinTab } from "./tabs/checkinTab";
import { render as renderPomodoroTab, destroy as destroyPomodoroTab } from "./tabs/pomodoroTab";
import { render as renderWritingTab, destroy as destroyWritingTab } from "./tabs/writingTab";
import { render as renderTranslateTab, destroy as destroyTranslateTab } from "./tabs/translateTab";
import { render as renderEmailTab, destroy as destroyEmailTab } from "./tabs/emailTab";
import { render as renderSubmissionTab, destroy as destroySubmissionTab } from "./tabs/submissionTab";
import { render as renderPlotTipsTab, destroy as destroyPlotTipsTab } from "./tabs/plotTipsTab";
import { render as renderLatexTab, destroy as destroyLatexTab } from "./tabs/latexTab";
import { render as renderLifeTab, destroy as destroyLifeTab } from "./tabs/lifeTab";
import { render as renderQuotesTab, destroy as destroyQuotesTab } from "./tabs/quotesTab";
import { render as renderSettingsTab, destroy as destroySettingsTab } from "./tabs/settingsTab";

interface TabDef {
  id: string;
  label: string;
  render: (container: HTMLElement) => void;
  destroy: () => void;
}

const TABS: TabDef[] = [
  { id: "checkin", label: "\u{1F4CB} 打卡", render: renderCheckinTab, destroy: destroyCheckinTab },
  { id: "pomodoro", label: "\u{1F345} 番茄钟", render: renderPomodoroTab, destroy: destroyPomodoroTab },
  { id: "writing", label: "✏️ 写作", render: renderWritingTab, destroy: destroyWritingTab },
  { id: "translate", label: "\u{1F30D} 翻译", render: renderTranslateTab, destroy: destroyTranslateTab },
  { id: "email", label: "\u{2709}️ 邮件", render: renderEmailTab, destroy: destroyEmailTab },
  { id: "submission", label: "\u{1F4E4} 投稿", render: renderSubmissionTab, destroy: destroySubmissionTab },
  { id: "plotTips", label: "\u{1F4CA} 作图", render: renderPlotTipsTab, destroy: destroyPlotTipsTab },
  { id: "latex", label: "\u{1F4DD} LaTeX", render: renderLatexTab, destroy: renderLatexTab },
  { id: "life", label: "\u{1F4A7} 生活", render: renderLifeTab, destroy: destroyLifeTab },
  { id: "quotes", label: "\u{1F4AD} 名言", render: renderQuotesTab, destroy: destroyQuotesTab },
  { id: "settings", label: "⚙️ 设置", render: renderSettingsTab, destroy: destroySettingsTab },
];

let _dialog: Window | null = null;
let _activeTab: string = "";
let _activeDestroy: (() => void) | null = null;

export function isDialogOpen(): boolean {
  return _dialog !== null && !_dialog.closed;
}

export function openDialog(): void {
  if (isDialogOpen()) {
    _dialog!.focus();
    return;
  }

  const win = Zotero.getMainWindow();
  _dialog = win.openDialog(
    "chrome://researchhub/content/mainWindow.xhtml",
    "researchhub-dialog",
    "chrome,centerscreen,resizable,width=900,height=650"
  );

  _dialog!.addEventListener("load", () => {
    initDialog(_dialog!);
  });
}

export function closeDialog(): void {
  if (_dialog && !_dialog.closed) {
    _dialog.close();
  }
}

function initDialog(win: Window): void {
  const doc = win.document;

  // Build tab bar
  const tabBar = doc.getElementById("rh-tabbar")!;
  tabBar.innerHTML = "";

  for (const tab of TABS) {
    const btn = doc.createElement("button");
    btn.className = "rh-tab";
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.addEventListener("click", () => switchTab(tab.id));
    tabBar.appendChild(btn);
  }

  // Close button
  const closeBtn = doc.getElementById("rh-close")!;
  closeBtn.addEventListener("click", () => closeDialog());

  // Default tab
  switchTab("checkin");

  win.addEventListener("unload", () => {
    if (_activeDestroy) _activeDestroy();
    _dialog = null;
    _activeTab = "";
  });
}

function switchTab(tabId: string): void {
  if (!_dialog || _dialog.closed) return;
  const doc = _dialog.document;
  const tab = TABS.find((t) => t.id === tabId);
  if (!tab) return;

  // Destroy previous tab
  if (_activeDestroy) {
    _activeDestroy();
    _activeDestroy = null;
  }

  // Update tab bar active state
  const buttons = doc.querySelectorAll(".rh-tab");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", (btn as HTMLElement).dataset.tab === tabId);
  });

  // Clear and render new tab
  const content = doc.getElementById("rh-content")!;
  content.innerHTML = "";
  tab.render(content);
  _activeDestroy = tab.destroy;
  _activeTab = tabId;
}
