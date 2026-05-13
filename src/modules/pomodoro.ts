/**
 * Pomodoro timer stats - ported from ResearchHub src/stores/pomodoro.js
 */

import { getJson, setJson } from "./storage";
import { getPref, PREF_KEYS } from "../prefs";

export interface PomodoroSession {
  date: string;
  minutes: number;
  time: string;
}

export interface PomodoroData {
  total: number;
  today: number;
  todayDate: string;
  history: PomodoroSession[];
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function loadStats(): Promise<PomodoroData> {
  return getJson<PomodoroData>("pomodoro", {
    total: 0,
    today: 0,
    todayDate: "",
    history: [],
  });
}

export async function addSession(minutes: number): Promise<PomodoroData> {
  const stats = await loadStats();
  const today = todayDate();
  if (stats.todayDate !== today) {
    stats.todayDate = today;
    stats.today = 0;
  }
  stats.total++;
  stats.today++;
  stats.history.push({ date: today, minutes, time: new Date().toISOString() });
  if (stats.history.length > 500) stats.history = stats.history.slice(-500);
  await setJson("pomodoro", stats);
  return stats;
}

export function getWorkMinutes(): number {
  return getPref(PREF_KEYS.POMODORO_WORK) || 25;
}

export function getBreakMinutes(): number {
  return getPref(PREF_KEYS.POMODORO_BREAK) || 5;
}
