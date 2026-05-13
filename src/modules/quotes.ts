/**
 * Quotes & inspiration board
 */

import { getJson, setJson } from "./storage";
import { QUOTES } from "../data/quotes";

export interface Inspiration {
  id: number;
  title: string;
  content: string;
  tags: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

export function getRandomQuote(): { text: string; author: string } {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export async function getInspirations(): Promise<Inspiration[]> {
  return getJson<Inspiration[]>("inspirations", []);
}

export async function addInspiration(item: {
  title: string;
  content: string;
  tags?: string;
  color?: string;
}): Promise<Inspiration> {
  const list = await getJson<Inspiration[]>("inspirations", []);
  const record: Inspiration = {
    id: Date.now(),
    title: item.title,
    content: item.content,
    tags: item.tags || "",
    color: item.color || "#3b82f6",
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  list.unshift(record);
  await setJson("inspirations", list);
  return record;
}

export async function updateInspiration(
  id: number,
  updates: Partial<Inspiration>
): Promise<void> {
  const list = await getJson<Inspiration[]>("inspirations", []);
  const idx = list.findIndex((i) => i.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    await setJson("inspirations", list);
  }
}

export async function removeInspiration(id: number): Promise<void> {
  const list = await getJson<Inspiration[]>("inspirations", []);
  await setJson(
    "inspirations",
    list.filter((i) => i.id !== id)
  );
}
