/**
 * Submission workflow module
 */

import { getJson, setJson } from "./storage";
import { recommendJournals, recommendJournalsDetailed } from "./ai";

export { recommendJournals, recommendJournalsDetailed };

export interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id">[] = [
  { text: "论文格式符合目标期刊要求", checked: false },
  { text: "所有作者已确认投稿", checked: false },
  { text: "Cover Letter 已准备", checked: false },
  { text: "Highlights 已准备", checked: false },
  { text: "Graphical Abstract 已准备", checked: false },
  { text: "补充材料已整理", checked: false },
  { text: "图片分辨率符合要求", checked: false },
  { text: "参考文献格式已检查", checked: false },
  { text: "查重/语言检查已完成", checked: false },
  { text: "伦理声明/利益冲突已声明", checked: false },
];

export async function getChecklist(): Promise<ChecklistItem[]> {
  const saved = await getJson<ChecklistItem[] | null>("submissionChecklist", null);
  if (saved) return saved;
  return DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: i + 1 }));
}

export async function updateChecklistItem(id: number, checked: boolean): Promise<void> {
  const list = await getChecklist();
  const item = list.find((i) => i.id === id);
  if (item) {
    item.checked = checked;
    await setJson("submissionChecklist", list);
  }
}

export async function resetChecklist(): Promise<void> {
  await setJson(
    "submissionChecklist",
    DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: i + 1 }))
  );
}
