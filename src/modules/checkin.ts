/**
 * Check-in / clock-in-out logic - ported from ResearchHub src/stores/checkins.js
 */

import { getJson, setJson } from "./storage";

export interface CheckinRecord {
  clockIn?: string;
  clockOut?: string;
}

export interface CheckinsData {
  [dateStr: string]: CheckinRecord;
}

export interface ClockStatus {
  clockedIn: boolean;
  clockedOut: boolean;
  clockInTime: string;
  clockOutTime: string;
  duration: string;
}

export interface Streak {
  current: number;
  longest: number;
  total: number;
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN");
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}小时${minutes}分钟`;
}

export async function loadCheckins(): Promise<CheckinsData> {
  return getJson<CheckinsData>("checkins", {});
}

export async function clockIn(): Promise<boolean> {
  const checkins = await loadCheckins();
  const today = todayDate();
  if (!checkins[today]) checkins[today] = {};
  if (checkins[today].clockIn) return false;
  checkins[today].clockIn = new Date().toISOString();
  await setJson("checkins", checkins);
  return true;
}

export async function clockOut(): Promise<boolean> {
  const checkins = await loadCheckins();
  const today = todayDate();
  if (!checkins[today]?.clockIn || checkins[today].clockOut) return false;
  checkins[today].clockOut = new Date().toISOString();
  await setJson("checkins", checkins);
  return true;
}

export async function getClockStatus(): Promise<ClockStatus> {
  const checkins = await loadCheckins();
  const today = todayDate();
  const record = checkins[today];
  if (!record) return { clockedIn: false, clockedOut: false, clockInTime: "", clockOutTime: "", duration: "" };
  return {
    clockedIn: !!record.clockIn,
    clockedOut: !!record.clockOut,
    clockInTime: record.clockIn ? formatTime(record.clockIn) : "",
    clockOutTime: record.clockOut ? formatTime(record.clockOut) : "",
    duration:
      record.clockIn && record.clockOut
        ? formatDuration(
            new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()
          )
        : "",
  };
}

export async function getStreak(): Promise<Streak> {
  const checkins = await loadCheckins();
  const today = new Date();
  let current = 0;
  let longest = 0;
  let tempStreak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    if (checkins[dateStr]) {
      tempStreak++;
      if (i === current) current = tempStreak;
    } else {
      longest = Math.max(longest, tempStreak);
      tempStreak = 0;
      if (i === current) break;
    }
  }
  longest = Math.max(longest, tempStreak);
  return { current, longest, total: Object.keys(checkins).length };
}

export interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  hasCheckin: boolean;
  isCurrentMonth: boolean;
}

export async function getCalendarDays(year: number, month: number): Promise<CalendarDay[]> {
  const checkins = await loadCheckins();
  const today = todayDate();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isToday: false, hasCheckin: !!checkins[dateStr], isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isToday: dateStr === today, hasCheckin: !!checkins[dateStr], isCurrentMonth: true });
  }

  // Next month padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isToday: false, hasCheckin: !!checkins[dateStr], isCurrentMonth: false });
  }

  return days;
}

export interface WeekDay {
  label: string;
  date: string;
  isToday: boolean;
  hasCheckin: boolean;
}

export async function getWeekDays(): Promise<WeekDay[]> {
  const checkins = await loadCheckins();
  const today = new Date();
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  const days: WeekDay[] = [];
  const dayOfWeek = today.getDay();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOfWeek + i);
    const dateStr = date.toISOString().split("T")[0];
    days.push({
      label: labels[i],
      date: dateStr,
      isToday: dateStr === todayDate(),
      hasCheckin: !!checkins[dateStr],
    });
  }
  return days;
}
