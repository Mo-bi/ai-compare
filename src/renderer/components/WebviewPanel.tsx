import React, { useRef, useEffect, useCallback, useState } from 'react'
import { AIPanel, Workspace } from '../store/appStore'

// 判断是否为海外模型
const OVERSEAS_MODELS = ['chatgpt', 'claude', 'gemini', 'grok', 'copilot']
function isOverseasModel(aiId: string): boolean {
  return OVERSEAS_MODELS.includes(aiId)
}

interface WebviewPanelProps {
  panel: AIPanel
  isMaximized: boolean
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onToggleMaximize: (id: string) => void
  onLoadingChange: (id: string, loading: boolean) => void
  onGeneratingChange: (id: string, generating: boolean) => void
  onResizeStart: (panelId: string, startX: number) => void
  isLast: boolean
}

export interface WebviewRef {
  sendMessage: (text: string) => Promise<boolean>
  getHistory: () => Promise<Array<{role: string, content: string}>>
  reload: () => void
}

const WebviewPanel = React.forwardRef<WebviewRef, WebviewPanelProps>(({
  panel,
  isMaximized,
  onRemove,
  onToggle,
  onToggleMaximize,
  onLoadingChange,
  onGeneratingChange,
  onResizeStart,
  isLast,
}, ref) => {
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [title, setTitle] = useState(panel.name)
  const statusCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  React.useImperativeHandle(ref, () => ({
    sendMessage: async (text: string) => {
      const wv = webviewRef.current
      if (!wv) return false
      try {
        const script = getSendScript(panel.aiId, text)
        const result = await wv.executeJavaScript(script)
        return !!result
      } catch (e) {
        console.error(`[WebviewPanel] ${panel.name} sendMessage error:`, e)
        return false
      }
    },
    getHistory: async () => {
      const wv = webviewRef.current
      if (!wv) return []
      try {
        const script = getHistoryScript(panel.aiId)
        const result = await wv.executeJavaScript(script)
        const parsed = JSON.parse(result || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (e) { return [] }
    },
    reload: () => { webviewRef.current?.reload() },
  }))

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const handleLoadStart = () => { setIsLoading(true); onLoadingChange(panel.id, true); }
    const handleLoadStop = () => { setIsLoading(false); onLoadingChange(panel.id, false); }
    wv.addEventListener('did-start-loading', handleLoadStart)
    wv.addEventListener('did-stop-loading', handleLoadStop)
    return () => {
      wv.removeEventListener('did-start-loading', handleLoadStart)
      wv.removeEventListener('did-stop-loading', handleLoadStop)
    }
  }, [panel.id, onLoadingChange])

  useEffect(() => {
    const checkStatus = async () => {
      const wv = webviewRef.current
      if (!wv || isLoading) return
      try {
        const script = getStatusScript(panel.aiId)
        const result = await wv.executeJavaScript(script)
        const status = JSON.parse(result || '{"generating":false}')
        onGeneratingChange(panel.id, !!status.generating)
      } catch {}
    }
    statusCheckRef.current = setInterval(checkStatus, 2000)
    return () => { if (statusCheckRef.current) clearInterval(statusCheckRef.current) }
  }, [panel.id, panel.aiId, isLoading, onGeneratingChange])

  return (
    <div className="webview-panel" style={{ flex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRight: isLast ? 'none' : '1px solid var(--border-color)', position: 'relative', opacity: panel.enabled ? 1 : 0.5, minWidth: 0 }}>
      <div className="panel-header" style={{ height: '40px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px', flexShrink: 0 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: panel.color, flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: panel.color }}>{panel.icon} {panel.name}</span>
        {panel.generating && <span style={{ fontSize: '11px', color: '#4caf50', marginLeft: '4px' }}> ● 生成中</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => onToggle(panel.id)} style={{ background: panel.enabled ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.05)', color: panel.enabled ? '#4caf50' : 'var(--text-muted)', border: `1px solid ${panel.enabled ? 'rgba(76,175,80,0.3)' : 'var(--border-color)'}`, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600 }}>{panel.enabled ? '✓ 启用' : '○ 禁用'}</button>
          <button onClick={() => onToggleMaximize(panel.id)} style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '3px 6px', fontSize: '13px' }}>{isMaximized ? '❐' : '⛶'}</button>
          <button onClick={() => webviewRef.current?.reload()} title="刷新" style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '3px 6px', fontSize: '13px' }}>↺</button>
          <button onClick={() => onRemove(panel.id)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '3px 6px', fontSize: '13px' }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <webview
          ref={webviewRef as React.RefObject<Electron.WebviewTag>}
          src={panel.url}
          style={{ width: '100%', height: '100%', display: 'flex' }}
          allowpopups="true"
          partition={`persist:${panel.aiId}`}
          webpreferences="contextIsolation=yes, spellcheck=yes" // 确保上下文隔离，模拟标准浏览器环境
        />
      </div>
      <div className="resize-handle" onMouseDown={(e) => { e.preventDefault(); onResizeStart(panel.id, e.clientX); }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 10 }} />
    </div>
  )
})

WebviewPanel.displayName = 'WebviewPanel'
export default WebviewPanel

function getSendScript(aiId: string, text: string): string {
  const escaped = JSON.stringify(text)
  return `
(function() {
  try {
    var msg = ${escaped};
    var id = '${aiId}';
    var selectors = ['[data-slate-editor="true"]', '[data-testid="msh-chatinput-editor"]', '[data-testid="chat-input"]', 'textarea._27c9245', '#prompt-textarea', '[data-testid="chat_input_input"]', 'rich-textarea .ql-editor', '[contenteditable="true"]', 'textarea'];
    var t = null;
    for (var i = 0; i < selectors.length; i++) { t = document.querySelector(selectors[i]); if (t) break; }
    if (!t) return "ERROR: NO_INPUT_FOUND";

    t.focus();
    
    // 输入逻辑
    if (id === 'yiyan' || id === 'yuanbao' || t.getAttribute('data-slate-editor') === 'true') {
      // --- 文心一言/元宝专项 (Slate.js 或 React 驱动) ---
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(t);
      selection.removeAllRanges();
      selection.addRange(range);
      t.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, msg);
      t.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: msg }));
    } 
    else if (id === 'kimi' || t.getAttribute('data-testid') === 'msh-chatinput-editor') {
      // --- Kimi 专项 (单纯的 insertText，禁用 Composition) ---
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(t);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, msg);
    }
    else {
      // --- 豆包/智谱/DeepSeek (标准 textarea) ---
      var nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) nativeSetter.set.call(t, msg); else t.value = msg;
    }
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));

    // 延迟点击 (元宝增加到 600ms)
    setTimeout(function() {
      var btnSelectors = ['[data-testid="chat_input_send_button"]', '[data-testid="chat-input-send-button"]', '[class*="send__slzHSuja"]', '[class*="btnContainer__sFTJytvZ"]', '[data-testid*="send"]', 'button[aria-label*="发送"]', '.send-button'];
      var clicked = false;
      for (var j = 0; j < btnSelectors.length; j++) {
        var btn = document.querySelector(btnSelectors[j]);
        if (btn) {
          btn.click();
          var inner = btn.querySelector('svg, path, span');
          if (inner) inner.click();
          clicked = true; break;
        }
      }
      
      if (!clicked || id === 'yuanbao' || id === 'chatglm' || id === 'doubao') {
        var opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
        t.dispatchEvent(new KeyboardEvent('keydown', opts));
        t.dispatchEvent(new KeyboardEvent('keypress', opts));
        t.dispatchEvent(new KeyboardEvent('keyup', opts));
      }
    }, 600);

    return "SUCCESS";
  } catch(e) { return "ERROR: " + e.message; }
})()`
}

function getHistoryScript(aiId: string): string {
  return `(async () => {
    try {
      const windowWidth = window.innerWidth;
      
      // 1. 地毯式搜索所有包含文字的底层节点
      // 选取 div, p, pre 以及常见的消息容器类名
      const elements = Array.from(document.querySelectorAll('div, p, pre, section, article, [class*="message"], [class*="content"]'));
      
      const candidates = [];
      elements.forEach(el => {
        // 过滤掉包含太多子节点的容器（我们只想要内容层）
        if (el.children.length > 5) return;
        
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || '').trim();
        
        // 基础过滤：排除侧边栏、隐藏元素、太短的碎词
        if (text.length < 5) return;
        if (rect.width < 20 || rect.height < 5) return;
        if (rect.left < 10 && rect.width < 100) return; // 侧边栏排除逻辑

        candidates.push({
          text,
          rect,
          top: rect.top + window.scrollY
        });
      });

      // 2. 智能去重：长文本优先，且位置接近的视为重复
      const unique = [];
      candidates.sort((a, b) => b.text.length - a.text.length);
      
      for (const cand of candidates) {
        const isDuplicate = unique.some(u => 
          (u.text.includes(cand.text) || cand.text.includes(u.text)) &&
          Math.abs(u.top - cand.top) < 30
        );
        if (!isDuplicate) unique.push(cand);
      }

      // 3. 按垂直位置恢复顺序
      unique.sort((a, b) => a.top - b.top);

      // 4. 生成结果并判定角色
      const results = unique.map(n => ({
        role: (n.rect.left + n.rect.width / 2 > windowWidth * 0.5) ? 'user' : 'assistant',
        content: n.text
      }));

      return JSON.stringify(results);
    } catch(e) { 
      return JSON.stringify([{ role: 'system', content: 'ERR_EXTRACT: ' + e.message }]); 
    }
  })()`
}

function getStatusScript(aiId: string): string {
  return `(async () => {
    const stopSelectors = ['[aria-label*="Stop"]', '[aria-label*="停止"]', '[data-testid*="stop"]'];
    for (const sel of stopSelectors) { if (document.querySelector(sel)) return JSON.stringify({ generating: true }); }
    return JSON.stringify({ generating: false });
  })()`
}
