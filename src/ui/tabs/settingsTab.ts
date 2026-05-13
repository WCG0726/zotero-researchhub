/**
 * Settings tab - AI config, data export/import
 */

import { getPref, setPref, PREF_KEYS } from "../../prefs";
import { isAIConfigured, callAI } from "../../modules/ai";
import { exportAll, importAll } from "../../modules/storage";

export async function render(container: HTMLElement): Promise<void> {
  const provider = getPref(PREF_KEYS.AI_PROVIDER) || "openai";
  const apiKey = getPref(PREF_KEYS.AI_API_KEY) || "";
  const baseUrl = getPref(PREF_KEYS.AI_BASE_URL) || "";
  const model = getPref(PREF_KEYS.AI_MODEL) || "gpt-4o-mini";

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI API 配置</div>
      <div class="rh-flex-col">
        <div>
          <label class="rh-text-sm">提供商</label>
          <select class="rh-select" id="rh-set-provider" style="width:100%">
            <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="custom" ${provider === 'custom' ? 'selected' : ''}>自定义 API</option>
          </select>
        </div>
        <div id="rh-base-url-row" style="display:${provider === 'custom' ? '' : 'none'}">
          <label class="rh-text-sm">Base URL</label>
          <input class="rh-input" id="rh-set-baseurl" value="${baseUrl}" placeholder="https://your-api.com/v1/chat/completions"/>
        </div>
        <div>
          <label class="rh-text-sm">API Key</label>
          <input class="rh-input" id="rh-set-apikey" type="password" value="${apiKey}" placeholder="sk-..."/>
        </div>
        <div>
          <label class="rh-text-sm">模型</label>
          <input class="rh-input" id="rh-set-model" value="${model}" placeholder="gpt-4o-mini"/>
        </div>
        <div class="rh-flex">
          <button class="rh-btn rh-btn-primary" id="rh-set-save">保存配置</button>
          <button class="rh-btn" id="rh-set-test" ${!isAIConfigured() ? 'disabled' : ''}>测试连接</button>
        </div>
        <div id="rh-set-status" class="rh-text-sm"></div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">数据管理</div>
      <div class="rh-flex-col">
        <div class="rh-flex">
          <button class="rh-btn" id="rh-export-btn">导出所有数据</button>
          <button class="rh-btn" id="rh-import-btn">导入数据</button>
        </div>
        <textarea class="rh-textarea" id="rh-data-area" placeholder="导出/导入数据将显示在这里..." rows="4" style="display:none"></textarea>
        <div class="rh-flex" id="rh-import-actions" style="display:none">
          <button class="rh-btn rh-btn-primary" id="rh-import-merge">合并导入</button>
          <button class="rh-btn rh-btn-danger" id="rh-import-overwrite">覆盖导入</button>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">关于</div>
      <div class="rh-text-sm" style="line-height:1.8">
        <strong>ResearchHub</strong> v1.0.0<br/>
        科研效率工具箱 — 打卡、番茄钟、AI 写作润色、翻译、邮件模板、LaTeX 片段等<br/>
        基于 Zotero 7 插件架构开发
      </div>
    </div>
  `;

  // Provider toggle
  container.querySelector('#rh-set-provider')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    (container.querySelector('#rh-base-url-row') as HTMLElement).style.display = val === 'custom' ? '' : 'none';
  });

  // Save config
  container.querySelector('#rh-set-save')?.addEventListener('click', () => {
    setPref(PREF_KEYS.AI_PROVIDER, (container.querySelector('#rh-set-provider') as HTMLSelectElement).value);
    setPref(PREF_KEYS.AI_BASE_URL, (container.querySelector('#rh-set-baseurl') as HTMLInputElement).value);
    setPref(PREF_KEYS.AI_API_KEY, (container.querySelector('#rh-set-apikey') as HTMLInputElement).value);
    setPref(PREF_KEYS.AI_MODEL, (container.querySelector('#rh-set-model') as HTMLInputElement).value);
    const status = container.querySelector('#rh-set-status')!;
    status.textContent = '配置已保存';
    status.style.color = '#22c55e';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });

  // Test connection
  container.querySelector('#rh-set-test')?.addEventListener('click', async () => {
    const status = container.querySelector('#rh-set-status')!;
    status.textContent = '测试中...';
    status.style.color = '#666';
    try {
      const result = await callAI('You are a test assistant.', 'Say "OK" in one word.', { maxTokens: 10, useCache: false });
      status.textContent = `连接成功: ${result}`;
      status.style.color = '#22c55e';
    } catch (e: any) {
      status.textContent = `连接失败: ${e.message}`;
      status.style.color = '#ef4444';
    }
  });

  // Export
  container.querySelector('#rh-export-btn')?.addEventListener('click', async () => {
    const data = await exportAll();
    const area = container.querySelector('#rh-data-area') as HTMLTextAreaElement;
    area.style.display = '';
    area.value = data;
    area.select();
    navigator.clipboard.writeText(data);
    const btn = container.querySelector('#rh-export-btn')!;
    btn.textContent = '已复制到剪贴板';
    setTimeout(() => btn.textContent = '导出所有数据', 2000);
  });

  // Import
  container.querySelector('#rh-import-btn')?.addEventListener('click', () => {
    const area = container.querySelector('#rh-data-area') as HTMLTextAreaElement;
    area.style.display = '';
    area.value = '';
    area.placeholder = '在此粘贴导出的 JSON 数据...';
    container.querySelector('#rh-import-actions')!.style.display = '';
  });

  container.querySelector('#rh-import-merge')?.addEventListener('click', async () => {
    const area = container.querySelector('#rh-data-area') as HTMLTextAreaElement;
    try {
      await importAll(area.value, 'merge');
      alert('数据合并导入成功！');
    } catch (e: any) {
      alert(`导入失败: ${e.message}`);
    }
  });

  container.querySelector('#rh-import-overwrite')?.addEventListener('click', async () => {
    if (!confirm('覆盖导入将替换所有现有数据，确定继续？')) return;
    const area = container.querySelector('#rh-data-area') as HTMLTextAreaElement;
    try {
      await importAll(area.value, 'overwrite');
      alert('数据覆盖导入成功！');
    } catch (e: any) {
      alert(`导入失败: ${e.message}`);
    }
  });
}

export function destroy(): void {}
