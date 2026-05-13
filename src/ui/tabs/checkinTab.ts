/**
 * Check-in tab - clock in/out, calendar, streak, rank
 */

import { clockIn, clockOut, getClockStatus, getStreak, getWeekDays, getCalendarDays } from "../../modules/checkin";
import { calculateXP, getTier } from "../../modules/rank";

let _interval: any = null;

export async function render(container: HTMLElement): Promise<void> {
  const status = await getClockStatus();
  const streak = await getStreak();
  const weekDays = await getWeekDays();
  const now = new Date();
  const calDays = await getCalendarDays(now.getFullYear(), now.getMonth());
  const xp = calculateXP({ checkinDays: streak.total, maxStreak: streak.longest, currentStreak: streak.current });
  const tierInfo = getTier(xp);

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-text-center rh-mb-12">
        <div class="rh-rank-badge" style="background:${tierInfo.tier.color}22;color:${tierInfo.tier.color}">
          ${tierInfo.tier.icon} ${tierInfo.tier.name}
        </div>
        <div class="rh-text-sm rh-mt-8">XP: ${xp}${tierInfo.nextTier ? ` / ${tierInfo.nextTier.minXP}` : ''}</div>
        ${tierInfo.nextTier ? `
          <div class="rh-progress rh-mt-8" style="max-width:200px;margin:8px auto 0">
            <div class="rh-progress-bar" style="width:${Math.round(tierInfo.progress * 100)}%;background:${tierInfo.tier.color}"></div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-text-center">
        <div id="rh-clock-status" style="font-size:18px;font-weight:600;margin-bottom:12px">
          ${status.clockedIn
            ? (status.clockedOut
              ? `已下班 · 工作 ${status.duration}`
              : `已上班 · ${status.clockInTime}`)
            : '尚未打卡'}
        </div>
        <div class="rh-flex" style="justify-content:center;gap:12px">
          <button class="rh-btn rh-btn-success" id="rh-clockin-btn" ${status.clockedIn ? 'disabled style="opacity:0.5"' : ''}>
            上班打卡
          </button>
          <button class="rh-btn rh-btn-danger" id="rh-clockout-btn" ${!status.clockedIn || status.clockedOut ? 'disabled style="opacity:0.5"' : ''}>
            下班打卡
          </button>
        </div>
        <div class="rh-text-sm rh-mt-8" id="rh-duration-display"></div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">本周打卡</div>
      <div class="rh-week-bar">
        ${weekDays.map(d => `
          <div class="rh-week-day ${d.hasCheckin ? 'has-checkin' : ''} ${d.isToday ? 'is-today' : ''}">
            <div style="font-weight:600">${d.label}</div>
            <div style="font-size:16px">${d.hasCheckin ? '✓' : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-flex" style="justify-content:space-between;margin-bottom:8px">
        <button class="rh-btn" id="rh-cal-prev">◀</button>
        <span style="font-weight:600">${now.getFullYear()}年${now.getMonth() + 1}月</span>
        <button class="rh-btn" id="rh-cal-next">▶</button>
      </div>
      <div class="rh-calendar">
        ${['日', '一', '二', '三', '四', '五', '六'].map(d => `<div class="rh-calendar-header">${d}</div>`).join('')}
        ${calDays.map(d => `
          <div class="rh-calendar-day ${d.hasCheckin ? 'has-checkin' : ''} ${d.isToday ? 'is-today' : ''} ${!d.isCurrentMonth ? 'other-month' : ''}">
            ${d.day}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-grid-3 rh-text-center">
        <div><div style="font-size:24px;font-weight:700;color:#22c55e">${streak.current}</div><div class="rh-text-sm">连续打卡</div></div>
        <div><div style="font-size:24px;font-weight:700;color:#f97316">${streak.longest}</div><div class="rh-text-sm">最长连续</div></div>
        <div><div style="font-size:24px;font-weight:700;color:#3b82f6">${streak.total}</div><div class="rh-text-sm">总打卡天数</div></div>
      </div>
    </div>
  `;

  // Event listeners
  container.querySelector('#rh-clockin-btn')?.addEventListener('click', async () => {
    const success = await clockIn();
    if (success) render(container);
  });

  container.querySelector('#rh-clockout-btn')?.addEventListener('click', async () => {
    const success = await clockOut();
    if (success) render(container);
  });

  // Live duration update
  if (status.clockedIn && !status.clockedOut) {
    const statusEl = container.querySelector('#rh-clock-status') as HTMLElement;
    _interval = setInterval(async () => {
      const s = await getClockStatus();
      if (s.clockedIn && !s.clockedOut) {
        statusEl.textContent = `已上班 · ${s.clockInTime}`;
      }
    }, 60000);
  }
}

export function destroy(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
