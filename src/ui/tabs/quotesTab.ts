/**
 * Quotes & inspiration board tab
 */

import { getRandomQuote, getInspirations, addInspiration, updateInspiration, removeInspiration, Inspiration } from "../../modules/quotes";

export async function render(container: HTMLElement): Promise<void> {
  const quote = getRandomQuote();
  const inspirations = await getInspirations();

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-quote" id="rh-quote-text">"${quote.text}"</div>
      <div class="rh-quote-author">—— ${quote.author}</div>
      <div class="rh-text-center rh-mt-8">
        <button class="rh-btn" id="rh-quote-refresh">换一条</button>
      </div>
    </div>

    <div class="rh-section-header">灵感板</div>
    <div class="rh-mb-12">
      <button class="rh-btn rh-btn-primary" id="rh-add-insp">+ 记录灵感</button>
    </div>

    <div id="rh-insp-list">
      ${inspirations.length === 0 ? '<div class="rh-text-sm rh-text-center" style="padding:20px;color:#999">暂无灵感记录</div>' : ''}
      ${sortInspirations(inspirations).map(insp => `
        <div class="rh-card" style="border-left:4px solid ${insp.color}">
          <div class="rh-flex" style="justify-content:space-between">
            <div style="font-weight:600;font-size:14px">${insp.pinned ? '📌 ' : ''}${insp.title}</div>
            <div class="rh-flex" style="gap:4px">
              <button class="rh-btn" data-pin="${insp.id}" style="font-size:11px;padding:2px 6px">${insp.pinned ? '取消置顶' : '置顶'}</button>
              <button class="rh-btn rh-btn-danger" data-del="${insp.id}" style="font-size:11px;padding:2px 6px">删除</button>
            </div>
          </div>
          ${insp.tags ? `<div class="rh-mt-8">${insp.tags.split(',').map(t => `<span class="rh-tag">${t.trim()}</span>`).join(' ')}</div>` : ''}
          <div class="rh-mt-8" style="font-size:12px;color:#555;line-height:1.6">${insp.content}</div>
          <div class="rh-text-sm rh-mt-8">${new Date(insp.createdAt).toLocaleString('zh-CN')}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Refresh quote
  container.querySelector('#rh-quote-refresh')?.addEventListener('click', () => {
    const q = getRandomQuote();
    (container.querySelector('#rh-quote-text') as HTMLElement).textContent = `"${q.text}"`;
    (container.querySelector('.rh-quote-author') as HTMLElement).textContent = `—— ${q.author}`;
  });

  // Add inspiration
  container.querySelector('#rh-add-insp')?.addEventListener('click', async () => {
    const title = prompt('灵感标题:');
    if (!title) return;
    const content = prompt('灵感内容:');
    if (!content) return;
    const tags = prompt('标签（逗号分隔，可选）:') || '';
    const colors = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#a855f7', '#eab308'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await addInspiration({ title, content, tags, color });
    render(container);
  });

  // Pin/unpin
  container.querySelectorAll('[data-pin]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.pin!);
      const insp = inspirations.find(i => i.id === id);
      if (insp) {
        await updateInspiration(id, { pinned: !insp.pinned });
        render(container);
      }
    });
  });

  // Delete
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeInspiration(parseInt((btn as HTMLElement).dataset.del!));
      render(container);
    });
  });
}

function sortInspirations(list: Inspiration[]): Inspiration[] {
  return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function destroy(): void {}
