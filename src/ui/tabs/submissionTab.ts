/**
 * Submission workflow tab
 */

import { getChecklist, updateChecklistItem, resetChecklist, recommendJournals } from "../../modules/submission";
import { isAIConfigured } from "../../modules/ai";

export async function render(container: HTMLElement): Promise<void> {
  const checklist = await getChecklist();
  const aiReady = isAIConfigured();
  const checkedCount = checklist.filter(i => i.checked).length;

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">投稿清单 (${checkedCount}/${checklist.length})</div>
      <div class="rh-progress rh-mb-12">
        <div class="rh-progress-bar" style="width:${Math.round(checkedCount / checklist.length * 100)}%;background:#22c55e"></div>
      </div>
      <div id="rh-checklist">
        ${checklist.map(item => `
          <div class="rh-checklist-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}/>
            <label>${item.text}</label>
          </div>
        `).join('')}
      </div>
      <button class="rh-btn rh-mt-8" id="rh-reset-checklist">重置清单</button>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">AI 期刊推荐</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">请先在设置页面配置 API Key</div>' : ''}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-journal-title" placeholder="论文标题"/>
        <textarea class="rh-textarea" id="rh-journal-abstract" placeholder="摘要（可选）" rows="2"></textarea>
        <input class="rh-input" id="rh-journal-field" placeholder="研究领域（可选）"/>
        <button class="rh-btn rh-btn-primary" id="rh-journal-btn" ${!aiReady ? 'disabled' : ''}>推荐期刊</button>
        <div id="rh-journal-result" class="rh-mt-8" style="font-size:12px;line-height:1.6"></div>
      </div>
    </div>
  `;

  // Checklist events
  container.querySelectorAll('#rh-checklist input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = parseInt((cb as HTMLInputElement).dataset.id!);
      const checked = (cb as HTMLInputElement).checked;
      await updateChecklistItem(id, checked);
      render(container);
    });
  });

  container.querySelector('#rh-reset-checklist')?.addEventListener('click', async () => {
    await resetChecklist();
    render(container);
  });

  // Journal recommendation
  container.querySelector('#rh-journal-btn')?.addEventListener('click', async () => {
    const title = (container.querySelector('#rh-journal-title') as HTMLInputElement).value;
    const abstract = (container.querySelector('#rh-journal-abstract') as HTMLTextAreaElement).value;
    const field = (container.querySelector('#rh-journal-field') as HTMLInputElement).value;
    const result = container.querySelector('#rh-journal-result')!;
    if (!title.trim()) return;
    result.textContent = '推荐中...';
    try {
      const rec = await recommendJournals(title, abstract, field);
      result.innerHTML = `<div style="white-space:pre-wrap">${rec.replace(/</g, '&lt;')}</div>`;
    } catch (e: any) {
      result.textContent = `错误: ${e.message}`;
    }
  });
}

export function destroy(): void {}
