/**
 * Writing assistant tab - polish prompts + AI polish
 */

import { POLISH_PROMPTS, POLISH_CATEGORIES, polishWithPrompt, addPolishHistory, getCustomPrompts, addCustomPrompt, removeCustomPrompt } from "../../modules/writingAssistant";
import { isAIConfigured, polishText } from "../../modules/ai";

export function render(container: HTMLElement): void {
  const aiReady = isAIConfigured();

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">直接润色</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">请先在设置页面配置 API Key</div>' : ''}
      <div class="rh-flex-col">
        <select class="rh-select" id="rh-polish-style">
          <option value="academic">学术润色</option>
          <option value="deep">深度润色（含说明）</option>
          <option value="sci">SCI 级别润色</option>
        </select>
        <textarea class="rh-textarea" id="rh-polish-input" placeholder="粘贴需要润色的文本..." rows="4"></textarea>
        <button class="rh-btn rh-btn-primary" id="rh-polish-btn" ${!aiReady ? 'disabled' : ''}>润色</button>
        <textarea class="rh-textarea" id="rh-polish-result" placeholder="润色结果将显示在这里..." rows="6" readonly></textarea>
      </div>
    </div>

    <div class="rh-section-header">提示词模板</div>
    <div class="rh-cat-filters" id="rh-polish-cats">
      ${POLISH_CATEGORIES.map(c => `
        <button class="rh-cat-btn ${c.key === 'all' ? 'active' : ''}" data-cat="${c.key}">${c.label}</button>
      `).join('')}
    </div>

    <div class="rh-scroll-list" id="rh-polish-list"></div>

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-prompt-btn">+ 添加自定义提示词</button>
    </div>
    <div id="rh-custom-prompts"></div>
  `;

  // Render prompt list
  renderPromptList(container, 'all');

  // Category filter
  container.querySelector('#rh-polish-cats')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.rh-cat-btn') as HTMLElement;
    if (!btn) return;
    container.querySelectorAll('.rh-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPromptList(container, btn.dataset.cat || 'all');
  });

  // Direct polish button
  container.querySelector('#rh-polish-btn')?.addEventListener('click', async () => {
    const input = (container.querySelector('#rh-polish-input') as HTMLTextAreaElement).value;
    const result = container.querySelector('#rh-polish-result') as HTMLTextAreaElement;
    const style = (container.querySelector('#rh-polish-style') as HTMLSelectElement).value as any;
    if (!input.trim()) return;
    result.value = '润色中...';
    try {
      const text = await polishText(input, style);
      result.value = text;
      await addPolishHistory({ promptTitle: `直接润色(${style})`, inputText: input.slice(0, 100), result: text.slice(0, 200) });
    } catch (e: any) {
      result.value = `错误: ${e.message}`;
    }
  });

  // Add custom prompt
  container.querySelector('#rh-add-prompt-btn')?.addEventListener('click', async () => {
    const title = prompt('提示词标题:');
    if (!title) return;
    const text = prompt('提示词内容:');
    if (!text) return;
    await addCustomPrompt({ cat: 'custom', title, desc: '自定义提示词', text });
    renderCustomPrompts(container);
  });

  renderCustomPrompts(container);
}

function renderPromptList(container: HTMLElement, cat: string): void {
  const list = container.querySelector('#rh-polish-list')!;
  const filtered = cat === 'all' ? POLISH_PROMPTS : POLISH_PROMPTS.filter(p => p.cat === cat);
  list.innerHTML = filtered.map(p => `
    <div class="rh-prompt-card" data-id="${p.id}" data-text="${encodeURIComponent(p.text)}">
      <div class="rh-prompt-title">${p.title}</div>
      <div class="rh-prompt-desc">${p.desc}</div>
    </div>
  `).join('');

  list.querySelectorAll('.rh-prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const text = decodeURIComponent((card as HTMLElement).dataset.text || '');
      const input = prompt('输入要处理的文本:');
      if (!input) return;
      const result = container.querySelector('#rh-polish-result') as HTMLTextAreaElement;
      const inputEl = container.querySelector('#rh-polish-input') as HTMLTextAreaElement;
      inputEl.value = input;
      result.value = '处理中...';
      polishWithPrompt(text, input).then(r => {
        result.value = r;
      }).catch(e => {
        result.value = `错误: ${e.message}`;
      });
    });
  });
}

async function renderCustomPrompts(container: HTMLElement): Promise<void> {
  const el = container.querySelector('#rh-custom-prompts')!;
  const prompts = await getCustomPrompts();
  if (prompts.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="rh-mt-8">
      <div class="rh-text-sm rh-mb-8" style="font-weight:600">自定义提示词</div>
      ${prompts.map(p => `
        <div class="rh-prompt-card" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="rh-prompt-title">${p.title}</div>
            <div class="rh-prompt-desc">${p.desc}</div>
          </div>
          <button class="rh-btn rh-btn-danger" data-del="${p.id}" style="font-size:11px;padding:2px 6px">删除</button>
        </div>
      `).join('')}
    </div>
  `;

  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((btn as HTMLElement).dataset.del!);
      await removeCustomPrompt(id);
      renderCustomPrompts(container);
    });
  });
}

export function destroy(): void {}
