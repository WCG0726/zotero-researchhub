/**
 * LaTeX snippet library
 */

import { getJson, setJson } from "./storage";
import { LATEX_SNIPPETS } from "../data/latexSnippets";

export { LATEX_SNIPPETS };

export interface CustomSnippet {
  id: number;
  name: string;
  category: string;
  code: string;
}

export async function getCustomSnippets(): Promise<CustomSnippet[]> {
  return getJson<CustomSnippet[]>("customSnippets", []);
}

export async function addCustomSnippet(snippet: Omit<CustomSnippet, "id">): Promise<CustomSnippet> {
  const list = await getCustomSnippets();
  const record: CustomSnippet = { ...snippet, id: Date.now() };
  list.push(record);
  await setJson("customSnippets", list);
  return record;
}

export async function removeCustomSnippet(id: number): Promise<void> {
  const list = await getCustomSnippets();
  await setJson(
    "customSnippets",
    list.filter((s) => s.id !== id)
  );
}

export function getCategories(): string[] {
  const cats = new Set(LATEX_SNIPPETS.map((s) => s.category));
  return Array.from(cats);
}
