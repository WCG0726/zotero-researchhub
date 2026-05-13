/**
 * Plot tips tab
 */

import { PLOT_TIPS, getPlotCategories, getCustomNotes, addCustomNote, removeCustomNote } from "../../modules/plotTips";
import { generatePlotCode, isAIConfigured } from "../../modules/ai";

export async function render(container: HTMLElement): Promise<void> {
  const categories = getPlotCategories();
  const customNotes = await getCustomNotes();
  const aiReady = isAIConfigured();

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI 作图代码生成</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">请先在设置页面配置 API Key</div>' : ''}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-plot-desc" placeholder="描述你想要的图表..."/>
        <div class="rh-grid-2">
          <input class="rh-input" id="rh-plot-type" placeholder="图表类型（可选）"/>
          <select class="rh-select" id="rh-plot-lang">
            <option value="python">Python (matplotlib)</option>
            <option value="origin">Origin (LabTalk)</option>
          </select>
        </div>
        <button class="rh-btn rh-btn-primary" id="rh-plot-gen" ${!aiReady ? 'disabled' : ''}>生成代码</button>
        <div id="rh-plot-result"></div>
      </div>
    </div>

    ${categories.map(cat => `
      <div class="rh-accordion">
        <div class="rh-accordion-header">
          <span>${cat}</span>
          <span class="rh-accordion-arrow">▶</span>
        </div>
        <div class="rh-accordion-body">
          ${PLOT_TIPS.filter(t => t.category === cat).map(tip => `
            <div class="rh-prompt-card">
              <div class="rh-prompt-title">${tip.title}</div>
              ${tip.tools.length > 0 ? `<div class="rh-mt-8">${tip.tools.map(t => `<span class="rh-tag">${t}</span>`).join(' ')}</div>` : ''}
              <div class="rh-mt-8" style="font-size:12px;line-height:1.6">${tip.content}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}

    ${customNotes.length > 0 ? `
      <div class="rh-section-header rh-mt-12">自定义笔记</div>
      ${customNotes.map(n => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${n.title}</div>
            <button class="rh-btn rh-btn-danger" data-del="${n.id}" style="font-size:11px;padding:2px 6px">删除</button>
          </div>
          <div class="rh-mt-8" style="font-size:12px">${n.content}</div>
        </div>
      `).join('')}
    ` : ''}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-note-btn">+ 添加自定义笔记</button>
    </div>
  `;

  // Accordion toggle
  container.querySelectorAll('.rh-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      (header.parentElement as HTMLElement).classList.toggle('open');
    });
  });

  // AI code gen
  container.querySelector('#rh-plot-gen')?.addEventListener('click', async () => {
    const desc = (container.querySelector('#rh-plot-desc') as HTMLInputElement).value;
    const type = (container.querySelector('#rh-plot-type') as HTMLInputElement).value;
    const lang = (container.querySelector('#rh-plot-lang') as HTMLSelectElement).value as any;
    const result = container.querySelector('#rh-plot-result')!;
    if (!desc.trim()) return;
    result.textContent = '生成中...';
    try {
      const code = await generatePlotCode(desc, type, '', lang);
      const codeText = code.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
      result.innerHTML = `
        <div class="rh-code-block" style="position:relative">
          <button class="rh-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.textContent.replace('复制','').trim());this.textContent='已复制';setTimeout(()=>this.textContent='复制',1500)">复制</button>
          ${codeText.replace(/</g, '&lt;')}
        </div>
      `;
    } catch (e: any) {
      result.textContent = `错误: ${e.message}`;
    }
  });

  // Add custom note
  container.querySelector('#rh-add-note-btn')?.addEventListener('click', async () => {
    const title = prompt('笔记标题:');
    if (!title) return;
    const content = prompt('笔记内容:');
    if (!content) return;
    await addCustomNote({ title, content, category: '自定义' });
    render(container);
  });

  // Delete custom notes
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeCustomNote(parseInt((btn as HTMLElement).dataset.del!));
      render(container);
    });
  });
}

export function destroy(): void {}
