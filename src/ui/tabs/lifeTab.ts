/**
 * Life tracker tab - water + meals
 */

import { getWaterData, addCup, removeCup, setWaterGoal, addMeal, getRecentMeals } from "../../modules/lifeTracker";
import { FOOD_DB } from "../../data/foods";

export async function render(container: HTMLElement): Promise<void> {
  const water = await getWaterData();
  const meals = await getRecentMeals(8);

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">今日喝水</div>
      <div class="rh-text-center">
        <div class="rh-water-cups" id="rh-water-cups">
          ${Array.from({ length: Math.max(water.goal, water.cups) }, (_, i) =>
            `<span class="rh-water-cup" data-idx="${i}">${i < water.cups ? '\u{1F964}' : '\u{1F95B}'}</span>`
          ).join('')}
        </div>
        <div class="rh-mt-8" style="font-size:14px;font-weight:600">${water.cups} / ${water.goal} 杯</div>
        <div class="rh-flex rh-mt-8" style="justify-content:center;gap:8px">
          <button class="rh-btn rh-btn-primary" id="rh-water-add">+ 一杯</button>
          <button class="rh-btn" id="rh-water-remove">- 一杯</button>
          <select class="rh-select" id="rh-water-goal">
            ${[6, 8, 10, 12].map(g => `<option value="${g}" ${g === water.goal ? 'selected' : ''}>目标: ${g}杯</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">今天吃什么？</div>
      <div class="rh-flex-col">
        <div class="rh-cat-filters" id="rh-food-cats">
          ${Object.entries(FOOD_DB).map(([cat, data]) =>
            `<button class="rh-cat-btn" data-cat="${cat}">${data.icon} ${cat}</button>`
          ).join('')}
          <button class="rh-cat-btn active" data-cat="random">随机推荐</button>
        </div>
        <div id="rh-food-result" class="rh-text-center" style="font-size:18px;padding:16px;min-height:60px">
          点击分类或随机推荐
        </div>
        <div class="rh-flex" style="justify-content:center">
          <button class="rh-btn rh-btn-primary" id="rh-food-pick">随机推荐</button>
          <button class="rh-btn" id="rh-food-record" style="display:none">记录这餐</button>
        </div>
      </div>
    </div>

    ${meals.length > 0 ? `
      <div class="rh-card">
        <div class="rh-card-title">最近饮食记录</div>
        ${meals.map(m => `
          <div style="padding:4px 0;font-size:12px;color:#666;border-bottom:1px solid #f0f0f0">
            ${new Date(m.date).toLocaleDateString('zh-CN')} ${m.mealType} - ${m.name}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  let lastPick = '';

  // Water buttons
  container.querySelector('#rh-water-add')?.addEventListener('click', async () => {
    await addCup();
    render(container);
  });

  container.querySelector('#rh-water-remove')?.addEventListener('click', async () => {
    await removeCup();
    render(container);
  });

  container.querySelector('#rh-water-goal')?.addEventListener('change', async (e) => {
    await setWaterGoal(parseInt((e.target as HTMLSelectElement).value));
    render(container);
  });

  // Food category buttons
  container.querySelector('#rh-food-cats')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.rh-cat-btn') as HTMLElement;
    if (!btn) return;
    container.querySelectorAll('#rh-food-cats .rh-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Random pick
  container.querySelector('#rh-food-pick')?.addEventListener('click', () => {
    const allItems = Object.values(FOOD_DB).flatMap(d => d.items);
    const pick = allItems[Math.floor(Math.random() * allItems.length)];
    lastPick = pick.name;
    const result = container.querySelector('#rh-food-result')!;
    result.innerHTML = `<span style="font-size:24px;font-weight:700">${pick.name}</span><div class="rh-text-sm rh-mt-8">${pick.type}</div>`;
    (container.querySelector('#rh-food-record') as HTMLElement).style.display = '';
  });

  // Record meal
  container.querySelector('#rh-food-record')?.addEventListener('click', async () => {
    if (!lastPick) return;
    const mealType = prompt('餐次 (早餐/午餐/晚餐/零食):', '午餐') || '午餐';
    await addMeal(lastPick, mealType);
    render(container);
  });
}

export function destroy(): void {}
