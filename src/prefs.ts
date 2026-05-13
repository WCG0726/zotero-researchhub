export const PREF_PREFIX = "extensions.zotero-researchhub";

export const PREF_KEYS = {
  AI_PROVIDER: `${PREF_PREFIX}.ai.provider`,
  AI_API_KEY: `${PREF_PREFIX}.ai.apiKey`,
  AI_BASE_URL: `${PREF_PREFIX}.ai.baseUrl`,
  AI_MODEL: `${PREF_PREFIX}.ai.model`,
  POMODORO_WORK: `${PREF_PREFIX}.pomodoro.workMin`,
  POMODORO_BREAK: `${PREF_PREFIX}.pomodoro.breakMin`,
  LOCALE: `${PREF_PREFIX}.locale`,
};

export function getPref(key: string): any {
  return Zotero.Prefs.get(key);
}

export function setPref(key: string, value: any): void {
  Zotero.Prefs.set(key, value);
}
