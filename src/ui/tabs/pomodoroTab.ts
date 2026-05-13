/**
 * Pomodoro timer tab
 */

import { loadStats, addSession, getWorkMinutes, getBreakMinutes } from "../../modules/pomodoro";
import { getPref, setPref, PREF_KEYS } from "../../prefs";

let _interval: any = null;
let _remaining = 0;
let _isRunning = false;
let _isBreak = false;

export async function render(container: HTMLElement): Promise<void> {
  const stats = await loadStats();
  const workMin = getWorkMinutes();
  const breakMin = getBreakMinutes();

  if (!_isRunning) {
    _remaining = (_isBreak ? breakMin : workMin) * 60;
  }

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">番茄钟</div>
      <div class="rh-timer" id="rh-timer-display">${formatTime(_remaining)}</div>
      <div class="rh-text-center rh-text-sm rh-mb-12" id="rh-timer-label">${_isBreak ? '休息时间' : '专注时间'}</div>
      <div class="rh-flex" style="justify-content:center;gap:12px">
        <button class="rh-btn rh-btn-primary" id="rh-timer-start">${_isRunning ? '暂停' : '开始'}</button>
        <button class="rh-btn" id="rh-timer-reset">重置</button>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-grid-2">
        <div class="rh-text-center">
          <div style="font-size:28px;font-weight:700;color:#ef4444">${stats.today || 0}</div>
          <div class="rh-text-sm">今日番茄</div>
        </div>
        <div class="rh-text-center">
          <div style="font-size:28px;font-weight:700;color:#3b82f6">${stats.total}</div>
          <div class="rh-text-sm">总计番茄</div>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">设置</div>
      <div class="rh-grid-2">
        <div>
          <label class="rh-text-sm">专注 (分钟)</label>
          <input class="rh-input" type="number" id="rh-work-min" value="${workMin}" min="1" max="120"/>
        </div>
        <div>
          <label class="rh-text-sm">休息 (分钟)</label>
          <input class="rh-input" type="number" id="rh-break-min" value="${breakMin}" min="1" max="60"/>
        </div>
      </div>
    </div>

    ${stats.history.length > 0 ? `
      <div class="rh-card">
        <div class="rh-card-title">最近记录</div>
        <div class="rh-scroll-list">
          ${stats.history.slice(-10).reverse().map(h => `
            <div style="padding:4px 0;font-size:12px;color:#666">
              ${new Date(h.time).toLocaleDateString('zh-CN')} ${new Date(h.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${h.minutes}分钟
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  const display = container.querySelector('#rh-timer-display') as HTMLElement;
  const label = container.querySelector('#rh-timer-label') as HTMLElement;
  const startBtn = container.querySelector('#rh-timer-start') as HTMLButtonElement;

  startBtn?.addEventListener('click', () => {
    if (_isRunning) {
      stopTimer();
      startBtn.textContent = '继续';
    } else {
      startTimer(display, label, startBtn, container);
      startBtn.textContent = '暂停';
    }
  });

  container.querySelector('#rh-timer-reset')?.addEventListener('click', () => {
    stopTimer();
    _isBreak = false;
    _remaining = getWorkMinutes() * 60;
    display.textContent = formatTime(_remaining);
    label.textContent = '专注时间';
    startBtn.textContent = '开始';
  });

  container.querySelector('#rh-work-min')?.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (val > 0) setPref(PREF_KEYS.POMODORO_WORK, val);
    if (!_isRunning && !_isBreak) {
      _remaining = val * 60;
      display.textContent = formatTime(_remaining);
    }
  });

  container.querySelector('#rh-break-min')?.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (val > 0) setPref(PREF_KEYS.POMODORO_BREAK, val);
    if (!_isRunning && _isBreak) {
      _remaining = val * 60;
      display.textContent = formatTime(_remaining);
    }
  });
}

function startTimer(display: HTMLElement, label: HTMLElement, btn: HTMLButtonElement, container: HTMLElement): void {
  _isRunning = true;
  _interval = setInterval(async () => {
    _remaining--;
    display.textContent = formatTime(_remaining);
    if (_remaining <= 0) {
      stopTimer();
      if (!_isBreak) {
        await addSession(getWorkMinutes());
        _isBreak = true;
        _remaining = getBreakMinutes() * 60;
        label.textContent = '休息时间';
        display.textContent = formatTime(_remaining);
        btn.textContent = '开始';
        // Re-render to update stats
        render(container);
      } else {
        _isBreak = false;
        _remaining = getWorkMinutes() * 60;
        label.textContent = '专注时间';
        display.textContent = formatTime(_remaining);
        btn.textContent = '开始';
      }
    }
  }, 1000);
}

function stopTimer(): void {
  _isRunning = false;
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function destroy(): void {
  stopTimer();
}
