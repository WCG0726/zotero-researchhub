/**
 * Email templates tab
 */

import { EMAIL_TEMPLATES, getEmailCategories, getCustomTemplates, addCustomTemplate, removeCustomTemplate } from "../../modules/emailTemplates";
import { generateEmail, isAIConfigured } from "../../modules/ai";

export async function render(container: HTMLElement): Promise<void> {
  const aiReady = isAIConfigured();
  const categories = getEmailCategories();
  const customTemplates = await getCustomTemplates();

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI 邮件生成</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">请先在设置页面配置 API Key</div>' : ''}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-email-scenario" placeholder="场景（如：投稿状态询问）"/>
        <textarea class="rh-textarea" id="rh-email-info" placeholder="关键信息（如：论文标题、期刊名、投稿日期）" rows="2"></textarea>
        <button class="rh-btn rh-btn-primary" id="rh-email-gen" ${!aiReady ? 'disabled' : ''}>AI 生成邮件</button>
        <textarea class="rh-textarea" id="rh-email-result" placeholder="生成结果..." rows="6" readonly></textarea>
      </div>
    </div>

    ${categories.map(cat => `
      <div class="rh-accordion open">
        <div class="rh-accordion-header">
          <span>${cat}</span>
          <span class="rh-accordion-arrow">▶</span>
        </div>
        <div class="rh-accordion-body">
          ${EMAIL_TEMPLATES.filter(t => t.category === cat).map(t => `
            <div class="rh-prompt-card">
              <div class="rh-prompt-title">${t.name}</div>
              <div style="margin-top:6px">
                <div class="rh-code-block" style="max-height:120px;overflow-y:auto;font-size:11px;white-space:pre-wrap">${t.content.replace(/</g, '&lt;')}</div>
                <button class="rh-btn rh-mt-8 rh-copy-template" data-content="${encodeURIComponent(t.content)}">复制</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}

    ${customTemplates.length > 0 ? `
      <div class="rh-section-header rh-mt-12">自定义模板</div>
      ${customTemplates.map(t => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${t.name}</div>
            <button class="rh-btn rh-btn-danger" data-del="${t.id}" style="font-size:11px;padding:2px 6px">删除</button>
          </div>
          <div class="rh-code-block rh-mt-8" style="max-height:120px;overflow-y:auto;font-size:11px;white-space:pre-wrap">${t.content.replace(/</g, '&lt;')}</div>
        </div>
      `).join('')}
    ` : ''}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-tpl-btn">+ 添加自定义模板</button>
    </div>
  `;

  // Accordion toggle
  container.querySelectorAll('.rh-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      (header.parentElement as HTMLElement).classList.toggle('open');
    });
  });

  // Copy buttons
  container.querySelectorAll('.rh-copy-template').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(decodeURIComponent((btn as HTMLElement).dataset.content || ''));
      btn.textContent = '已复制';
      setTimeout(() => btn.textContent = '复制', 1500);
    });
  });

  // AI generate
  container.querySelector('#rh-email-gen')?.addEventListener('click', async () => {
    const scenario = (container.querySelector('#rh-email-scenario') as HTMLInputElement).value;
    const info = (container.querySelector('#rh-email-info') as HTMLTextAreaElement).value;
    const result = container.querySelector('#rh-email-result') as HTMLTextAreaElement;
    if (!info.trim()) return;
    result.value = '生成中...';
    try {
      result.value = await generateEmail(scenario, info);
    } catch (e: any) {
      result.value = `错误: ${e.message}`;
    }
  });

  // Add custom template
  container.querySelector('#rh-add-tpl-btn')?.addEventListener('click', async () => {
    const name = prompt('模板名称:');
    if (!name) return;
    const content = prompt('模板内容:');
    if (!content) return;
    await addCustomTemplate({ name, category: '自定义', content });
    render(container);
  });

  // Delete custom templates
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeCustomTemplate(parseInt((btn as HTMLElement).dataset.del!));
      render(container);
    });
  });
}

export function destroy(): void {}
