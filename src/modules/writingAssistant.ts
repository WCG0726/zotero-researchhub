/**
 * Writing assistant - polish prompts management
 */

import { getJson, setJson } from "./storage";
import { POLISH_PROMPTS, POLISH_CATEGORIES } from "../data/polishPrompts";
import { callAI } from "./ai";

export { POLISH_PROMPTS, POLISH_CATEGORIES };

export interface CustomPrompt {
  id: number;
  cat: string;
  title: string;
  desc: string;
  text: string;
}

export async function getCustomPrompts(): Promise<CustomPrompt[]> {
  return getJson<CustomPrompt[]>("customPolishPrompts", []);
}

export async function addCustomPrompt(prompt: Omit<CustomPrompt, "id">): Promise<CustomPrompt> {
  const list = await getCustomPrompts();
  const record: CustomPrompt = { ...prompt, id: Date.now() };
  list.push(record);
  await setJson("customPolishPrompts", list);
  return record;
}

export async function removeCustomPrompt(id: number): Promise<void> {
  const list = await getCustomPrompts();
  await setJson(
    "customPolishPrompts",
    list.filter((p) => p.id !== id)
  );
}

export interface PolishHistoryItem {
  id: number;
  promptTitle: string;
  inputText: string;
  result: string;
  timestamp: string;
}

export async function addPolishHistory(item: Omit<PolishHistoryItem, "id" | "timestamp">): Promise<void> {
  const history = await getJson<PolishHistoryItem[]>("polishHistory", []);
  history.unshift({ ...item, id: Date.now(), timestamp: new Date().toISOString() });
  if (history.length > 20) history.length = 20;
  await setJson("polishHistory", history);
}

export async function getPolishHistory(): Promise<PolishHistoryItem[]> {
  return getJson<PolishHistoryItem[]>("polishHistory", []);
}

export async function polishWithPrompt(
  promptText: string,
  userInput: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const systemPrompt = promptText.replace(/\[Paste[^\]]*\]/g, "").replace(/\[粘贴[^\]]*\]/g, "");
  if (onChunk) {
    const { callAIStream } = await import("./ai");
    return callAIStream(systemPrompt, userInput, { temperature: 0.3, onChunk });
  }
  return callAI(systemPrompt, userInput, { temperature: 0.3 });
}
