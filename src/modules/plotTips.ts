/**
 * Plot tips module
 */

import { getJson, setJson } from "./storage";
import { PLOT_TIPS } from "../data/plotTips";

export { PLOT_TIPS };

export interface CustomPlotNote {
  id: number;
  title: string;
  content: string;
  category: string;
}

export async function getCustomNotes(): Promise<CustomPlotNote[]> {
  return getJson<CustomPlotNote[]>("customPlotNotes", []);
}

export async function addCustomNote(note: Omit<CustomPlotNote, "id">): Promise<CustomPlotNote> {
  const list = await getCustomNotes();
  const record: CustomPlotNote = { ...note, id: Date.now() };
  list.push(record);
  await setJson("customPlotNotes", list);
  return record;
}

export async function removeCustomNote(id: number): Promise<void> {
  const list = await getCustomNotes();
  await setJson(
    "customPlotNotes",
    list.filter((n) => n.id !== id)
  );
}

export function getPlotCategories(): string[] {
  const cats = new Set(PLOT_TIPS.map((t) => t.category));
  return Array.from(cats);
}
