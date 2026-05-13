/**
 * Data persistence layer using Zotero's file system
 * Stores JSON files in {profile}/researchhub/
 */

let _dataDir: string | null = null;

function getDataDir(): string {
  if (!_dataDir) {
    _dataDir = Zotero.DataDirectory.dir + "/researchhub";
  }
  return _dataDir;
}

async function ensureDir(): Promise<void> {
  const dir = getDataDir();
  const nsIFile = new (Components.classes as any)[
    "@mozilla.org/file/local;1"
  ].createInstance(Components.interfaces.nsIFile);
  nsIFile.initWithPath(dir);
  if (!nsIFile.exists()) {
    nsIFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o755);
  }
}

function getFilePath(key: string): string {
  return `${getDataDir()}/${key}.json`;
}

export async function getJson<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const path = getFilePath(key);
    const content = await Zotero.File.getContentsAsync(path);
    if (content) {
      return JSON.parse(content as string) as T;
    }
  } catch {
    // File doesn't exist or is invalid
  }
  return defaultValue;
}

export async function setJson<T>(key: string, data: T): Promise<void> {
  await ensureDir();
  const path = getFilePath(key);
  const content = JSON.stringify(data, null, 2);
  await Zotero.File.putContentsAsync(path, content);
}

export async function exportAll(): Promise<string> {
  const keys = [
    "checkins", "pomodoro", "water", "meals",
    "customSnippets", "customEmailTemplates", "customPolishPrompts",
    "customPlotNotes", "inspirations", "polishHistory",
  ];
  const result: Record<string, any> = {};
  for (const key of keys) {
    try {
      result[key] = await getJson(key, null);
    } catch {
      // skip
    }
  }
  return JSON.stringify(result, null, 2);
}

export async function importAll(jsonStr: string, mode: "merge" | "overwrite"): Promise<void> {
  const data = JSON.parse(jsonStr);
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (mode === "merge") {
      const existing = await getJson(key, Array.isArray(value) ? [] : {});
      if (Array.isArray(value) && Array.isArray(existing)) {
        const merged = [...existing, ...value];
        const seen = new Set();
        const deduped = merged.filter((item: any) => {
          const id = item.id || JSON.stringify(item);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        await setJson(key, deduped);
      } else if (typeof value === "object" && typeof existing === "object") {
        await setJson(key, { ...existing, ...value });
      } else {
        await setJson(key, value);
      }
    } else {
      await setJson(key, value);
    }
  }
}
