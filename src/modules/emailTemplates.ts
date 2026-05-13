/**
 * Email templates module
 */

import { getJson, setJson } from "./storage";
import { EMAIL_TEMPLATES } from "../data/emailTemplates";

export { EMAIL_TEMPLATES };

export interface CustomEmailTemplate {
  id: number;
  name: string;
  category: string;
  content: string;
}

export async function getCustomTemplates(): Promise<CustomEmailTemplate[]> {
  return getJson<CustomEmailTemplate[]>("customEmailTemplates", []);
}

export async function addCustomTemplate(tpl: Omit<CustomEmailTemplate, "id">): Promise<CustomEmailTemplate> {
  const list = await getCustomTemplates();
  const record: CustomEmailTemplate = { ...tpl, id: Date.now() };
  list.push(record);
  await setJson("customEmailTemplates", list);
  return record;
}

export async function removeCustomTemplate(id: number): Promise<void> {
  const list = await getCustomTemplates();
  await setJson(
    "customEmailTemplates",
    list.filter((t) => t.id !== id)
  );
}

export function getEmailCategories(): string[] {
  const cats = new Set(EMAIL_TEMPLATES.map((t) => t.category));
  return Array.from(cats);
}
