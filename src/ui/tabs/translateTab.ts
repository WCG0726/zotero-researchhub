/**
 * Translation tab
 */

import { translateText, isAIConfigured } from "../../modules/ai";

export function render(container: HTMLElement): void {
  const aiReady = isAIConfigured();

  container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">中英互译</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">请先在设置页面配置 API Key</div>' : ''}
      <div class="rh-flex rh-mb-8">
        <button class="rh-btn rh-cat-btn active" id="rh-dir-en2zh" data-dir="en2zh">英 → 中</button>
        <button class="rh-btn rh-cat-btn" id="rh-dir-zh2en" data-dir="zh2en">中 → 英</button>
        <select class="rh-select" id="rh-trans-style">
          <option value="academic">学术</option>
          <option value="natural">自然</option>
          <option value="formal">正式</option>
          <option value="simple">简洁</option>
        </select>
      </div>
      <div class="rh-grid-2">
        <textarea class="rh-textarea" id="rh-trans-input" placeholder="输入要翻译的文本..." rows="8"></textarea>
        <textarea class="rh-textarea" id="rh-trans-output" placeholder="翻译结果..." rows="8" readonly></textarea>
      </div>
      <div class="rh-mt-8">
        <button class="rh-btn rh-btn-primary" id="rh-trans-btn" ${!aiReady ? 'disabled' : ''}>翻译</button>
        <button class="rh-btn" id="rh-trans-copy" style="margin-left:6px">复制结果</button>
      </div>
    </div>
  `;

  let direction: "en2zh" | "zh2en" = "en2zh";

  container.querySelector('#rh-dir-en2zh')?.addEventListener('click', () => {
    direction = "en2zh";
    container.querySelector('#rh-dir-en2zh')?.classList.add('active');
    container.querySelector('#rh-dir-zh2en')?.classList.remove('active');
  });

  container.querySelector('#rh-dir-zh2en')?.addEventListener('click', () => {
    direction = "zh2en";
    container.querySelector('#rh-dir-zh2en')?.classList.add('active');
    container.querySelector('#rh-dir-en2zh')?.classList.remove('active');
  });

  container.querySelector('#rh-trans-btn')?.addEventListener('click', async () => {
    const input = (container.querySelector('#rh-trans-input') as HTMLTextAreaElement).value;
    const output = container.querySelector('#rh-trans-output') as HTMLTextAreaElement;
    const style = (container.querySelector('#rh-trans-style') as HTMLSelectElement).value as any;
    if (!input.trim()) return;
    output.value = '翻译中...';
    try {
      output.value = await translateText(input, direction, style);
    } catch (e: any) {
      output.value = `错误: ${e.message}`;
    }
  });

  container.querySelector('#rh-trans-copy')?.addEventListener('click', () => {
    const text = (container.querySelector('#rh-trans-output') as HTMLTextAreaElement).value;
    if (text) navigator.clipboard.writeText(text);
  });
}

export function destroy(): void {}
