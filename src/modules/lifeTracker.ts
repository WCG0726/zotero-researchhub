/**
 * Life tracker - water intake + meal tracking
 */

import { getJson, setJson } from "./storage";

export interface WaterData {
  [dateStr: string]: { cups: number; goal: number };
}

export interface MealRecord {
  id: number;
  name: string;
  mealType: string;
  date: string;
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Water
export async function getWaterData(): Promise<{ cups: number; goal: number }> {
  const data = await getJson<WaterData>("water", {});
  return data[todayDate()] || { cups: 0, goal: 8 };
}

export async function addCup(): Promise<{ cups: number; goal: number }> {
  const data = await getJson<WaterData>("water", {});
  const today = todayDate();
  if (!data[today]) data[today] = { cups: 0, goal: 8 };
  data[today].cups++;
  await setJson("water", data);
  return data[today];
}

export async function removeCup(): Promise<{ cups: number; goal: number }> {
  const data = await getJson<WaterData>("water", {});
  const today = todayDate();
  if (data[today] && data[today].cups > 0) data[today].cups--;
  await setJson("water", data);
  return data[today] || { cups: 0, goal: 8 };
}

export async function setWaterGoal(goal: number): Promise<void> {
  const data = await getJson<WaterData>("water", {});
  const today = todayDate();
  if (!data[today]) data[today] = { cups: 0, goal: 8 };
  data[today].goal = goal;
  await setJson("water", data);
}

// Meals
export async function addMeal(name: string, mealType: string): Promise<MealRecord> {
  const meals = await getJson<MealRecord[]>("meals", []);
  const record: MealRecord = { id: Date.now(), name, mealType, date: new Date().toISOString() };
  meals.unshift(record);
  await setJson("meals", meals);
  return record;
}

export async function getRecentMeals(count = 10): Promise<MealRecord[]> {
  const meals = await getJson<MealRecord[]>("meals", []);
  return meals.slice(0, count);
}
