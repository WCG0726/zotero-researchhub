/**
 * LaTeX snippets tab
 */

import { LATEX_SNIPPETS, getCategories, getCustomSnippets, addCustomSnippet, removeCustomSnippet } from "../../modules/latexSnippets";

export async function render(container: HTMLElement): Promise<void> {
  const categories = getCategories();
  const customSnippets = await getCustomSnippets();

  container.innerHTML = `
    <div class="rh-card">
      <input class="rh-input" id="rh-latex-search" placeholder="搜索 LaTeX 片段..."/>
    </div>

    <div id="rh-latex-list">
      ${categories.map(cat => `
        <div class="rh-accordion open">
          <div class="rh-accordion-header">
            <span>${cat}</span>
            <span class="rh-accordion-arrow">▶</span>
          </div>
          <div class="rh-accordion-body">
            ${LATEX_SNIPPETS.filter(s => s.category === cat).map(s => `
              <div class="rh-prompt-card">
                <div class="rh-prompt-title">${s.name}</div>
                <div class="rh-code-block rh-mt-8" style="position:relative">
                  <button class="rh-copy-btn" data-copy="${encodeURIComponent(s.code)}">复制</button>
                  ${s.code.replace(/</g, '&lt;')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    ${customSnippets.length > 0 ? `
      <div class="rh-section-header rh-mt-12">自定义片段</div>
      ${customSnippets.map(s => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${s.name} <span class="rh-tag">${s.category}</span></div>
            <button class="rh-btn rh-btn-danger" data-del="${s.id}" style="font-size:11px;padding:2px 6px">删除</button>
          </div>
          <div class="rh-code-block rh-mt-8" style="position:relative">
            <button class="rh-copy-btn" data-copy="${encodeURIComponent(s.code)}">复制</button>
            ${s.code.replace(/</g, '&lt;')}
          </div>
        </div>
      `).join('')}
    ` : ''}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-snippet-btn">+ 添加自定义片段</button>
    </div>
  `;

  // Accordion toggle
  container.querySelectorAll('.rh-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      (header.parentElement as HTMLElement).classList.toggle('open');
    });
  });

  // Copy buttons
  container.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(decodeURIComponent((btn as HTMLElement).dataset.copy!));
      btn.textContent = '已复制';
      setTimeout(() => btn.textContent = '复制', 1500);
    });
  });

  // Search
  container.querySelector('#rh-latex-search')?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    container.querySelectorAll('.rh-prompt-card').forEach(card => {
      const text = card.textContent?.toLowerCase() || '';
      (card as HTMLElement).style.display = text.includes(query) ? '' : 'none';
    });
  });

  // Add custom snippet
  container.querySelector('#rh-add-snippet-btn')?.addEventListener('click', async () => {
    const name = prompt('片段名称:');
    if (!name) return;
    const category = prompt('分类:', '自定义') || '自定义';
    const code = prompt('LaTeX 代码:');
    if (!code) return;
    await addCustomSnippet({ name, category, code });
    render(container);
  });

  // Delete custom snippets
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeCustomSnippet(parseInt((btn as HTMLElement).dataset.del!));
      render(container);
    });
  });
}

export function destroy(): void {}
