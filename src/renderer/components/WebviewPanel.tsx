import React, { useRef, useEffect, useCallback, useState } from 'react'
import { AIPanel } from '../store/appStore'

// 判断是否为海外模型
const OVERSEAS_MODELS = ['chatgpt', 'claude', 'gemini', 'grok', 'copilot']
function isOverseasModel(aiId: string): boolean {
  return OVERSEAS_MODELS.includes(aiId)
}

interface WebviewPanelProps {
  panel: AIPanel
  onRemove: (id: string) => void
  onToggle: (id: string) => void
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
  onRemove,
  onToggle,
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

  // 暴露方法给父组件
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
      } catch (e) {
        console.error(`[WebviewPanel] ${panel.name} getHistory error:`, e)
        return []
      }
    },
    reload: () => {
      webviewRef.current?.reload()
    },
  }))

  // 监听 webview 事件
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const handleLoadStart = () => {
      setIsLoading(true)
      setLoadError(false)
      onLoadingChange(panel.id, true)
    }

    const handleLoadStop = () => {
      setIsLoading(false)
      onLoadingChange(panel.id, false)
    }

    const handleLoadFail = () => {
      setIsLoading(false)
      setLoadError(true)
      onLoadingChange(panel.id, false)
    }

    const handleTitleUpdate = (e: Electron.PageTitleUpdatedEvent) => {
      setTitle(e.title || panel.name)
    }

    wv.addEventListener('did-start-loading', handleLoadStart)
    wv.addEventListener('did-stop-loading', handleLoadStop)
    wv.addEventListener('did-fail-load', handleLoadFail)
    wv.addEventListener('page-title-updated', handleTitleUpdate)

    return () => {
      wv.removeEventListener('did-start-loading', handleLoadStart)
      wv.removeEventListener('did-stop-loading', handleLoadStop)
      wv.removeEventListener('did-fail-load', handleLoadFail)
      wv.removeEventListener('page-title-updated', handleTitleUpdate)
    }
  }, [panel.id, panel.name, onLoadingChange])

  // 定期检查生成状态
  useEffect(() => {
    const checkStatus = async () => {
      const wv = webviewRef.current
      if (!wv || isLoading) return
      try {
        const script = getStatusScript(panel.aiId)
        const result = await wv.executeJavaScript(script)
        const status = JSON.parse(result || '{"generating":false}')
        onGeneratingChange(panel.id, !!status.generating)
      } catch {
        // 忽略错误
      }
    }

    statusCheckRef.current = setInterval(checkStatus, 2000)
    return () => {
      if (statusCheckRef.current) clearInterval(statusCheckRef.current)
    }
  }, [panel.id, panel.aiId, isLoading, onGeneratingChange])

  const handleReload = useCallback(() => {
    webviewRef.current?.reload()
  }, [])

  const handleOpenDevTools = useCallback(() => {
    webviewRef.current?.openDevTools()
  }, [])

  return (
    <div
      className="webview-panel"
      style={{
        width: `${panel.width}px`,
        minWidth: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: isLast ? 'none' : '1px solid var(--border-color)',
        position: 'relative',
        opacity: panel.enabled ? 1 : 0.5,
      }}
    >
      {/* 面板标题栏 */}
      <div
        className="panel-header"
        style={{
          height: '40px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: '8px',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* AI 图标和名称 */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: panel.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: 600, color: panel.color }}>
          {panel.icon} {panel.name}
        </span>
        
        {/* 生成状态指示器 */}
        {panel.generating && (
          <span
            style={{
              fontSize: '11px',
              color: '#4caf50',
              animation: 'pulse 1s infinite',
              marginLeft: '4px',
            }}
          >
            ● 生成中
          </span>
        )}

        {/* 加载指示器 */}
        {isLoading && !panel.generating && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
            加载中...
          </span>
        )}

        {/* 右侧操作按钮 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* 启用/禁用切换 */}
          <button
            onClick={() => onToggle(panel.id)}
            title={panel.enabled ? '暂时排除此模型（不接收发送）' : '重新启用此模型'}
            style={{
              background: panel.enabled ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.05)',
              color: panel.enabled ? '#4caf50' : 'var(--text-muted)',
              border: `1px solid ${panel.enabled ? 'rgba(76,175,80,0.3)' : 'var(--border-color)'}`,
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {panel.enabled ? '✓ 启用' : '○ 禁用'}
          </button>

          {/* 刷新 */}
          <button
            onClick={handleReload}
            title="刷新页面"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            ↺
          </button>

          {/* 关闭 */}
          <button
            onClick={() => onRemove(panel.id)}
            title="关闭此面板"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* WebView 内容区 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loadError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <p>页面加载失败</p>
            <button
              onClick={handleReload}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '6px 16px',
              }}
            >
              重新加载
            </button>
          </div>
        ) : (
          <webview
            ref={webviewRef as React.RefObject<Electron.WebviewTag>}
            src={panel.url}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
            }}
            // 允许弹出窗口（某些 AI 网站需要）
            allowpopups="true"
            // 使用独立 partition 保持各自登录状态
            partition={`persist:${panel.aiId}`}
          />
        )}
      </div>

      {/* 右侧拖拽调整宽度的手柄 - 每个面板都有，最后一个也可以向右扩展 */}
      <div
        className="resize-handle"
        onMouseDown={(e) => {
          e.preventDefault()
          onResizeStart(panel.id, e.clientX)
        }}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'col-resize',
          background: 'transparent',
          zIndex: 10,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = 'rgba(77, 159, 255, 0.4)'
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = 'transparent'
        }}
      />
    </div>
  )
})

WebviewPanel.displayName = 'WebviewPanel'

export default WebviewPanel

// ============================================================
// JS 注入脚本（与主进程 ai-scripts 保持同步）
// ============================================================

function getSendScript(aiId: string, text: string): string {
  const escaped = JSON.stringify(text)
  
  // 针对特定 AI 网站的专用脚本
  const siteSpecificScripts: Record<string, string> = {
    // 豆包 - doubao.com
    doubao: `
(async () => {
  try {
    const msg = ${escaped};
    // 豆包输入框选择器
    const selectors = [
      '[data-testid="chat_input_input"]',
      'textarea[placeholder*="发消息"]',
      'textarea[placeholder*="输入"]',
      'div[contenteditable="true"]',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // 豆包发送按钮
    const btnSelectors = [
      '[data-testid="chat_input_send_button"]',
      'button[type="submit"]',
      'button svg[class*="send"]',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    // 备用：Enter 键
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] 豆包 send error:', e);
    return false;
  }
})()`,

    // 通义千问 - tongyi.aliyun.com
    qwen: `
(async () => {
  try {
    const msg = ${escaped};
    // 通义千问输入框选择器
    const selectors = [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // 通义千问发送按钮
    const btnSelectors = [
      'button[aria-label*="发送"]',
      'button[type="submit"]',
      'button svg[class*="send"]',
      '.send-btn',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] 通义千问 send error:', e);
    return false;
  }
})()`,

    // 文心一言 - yiyan.baidu.com
    yiyan: `
(async () => {
  try {
    const msg = ${escaped};
    // 文心一言输入框选择器
    const selectors = [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'div[contenteditable="true"]',
      '.yc-editor',
      'textarea',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // 文心一言发送按钮
    const btnSelectors = [
      'button[aria-label*="发送"]',
      'button[type="submit"]',
      '.send-btn',
      'button[class*="send"]',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] 文心一言 send error:', e);
    return false;
  }
})()`,

    // 智谱清言 - chatglm.cn
    chatglm: `
(async () => {
  try {
    const msg = ${escaped};
    // 智谱清言输入框选择器
    const selectors = [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'div[contenteditable="true"]',
      '.input-area textarea',
      'textarea',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // 智谱清言发送按钮
    const btnSelectors = [
      'button[aria-label*="发送"]',
      'button[type="submit"]',
      '.send-btn',
      'button[class*="send"]',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] 智谱清言 send error:', e);
    return false;
  }
})()`,

    // MiniMax - minimaxi.com
    minimax: `
(async () => {
  try {
    const msg = ${escaped};
    // MiniMax 输入框选择器
    const selectors = [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // MiniMax 发送按钮
    const btnSelectors = [
      'button[aria-label*="发送"]',
      'button[type="submit"]',
      '.send-btn',
      'button[class*="send"]',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] MiniMax send error:', e);
    return false;
  }
})()`,

    // 腾讯元宝 - yuanbao.tencent.com
    yuanbao: `
(async () => {
  try {
    const msg = ${escaped};
    // 元宝输入框选择器
    const selectors = [
      '[data-testid="chat-input"]',
      'textarea[placeholder*="输入"]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    let input = null;
    for (const sel of selectors) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return false;
    
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(input, msg);
      } else {
        input.value = msg;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = msg;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // 元宝发送按钮
    const btnSelectors = [
      '[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[type="submit"]',
    ];
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] 元宝 send error:', e);
    return false;
  }
})()`,
  };
  
  // 如果有特定网站的脚本，使用它
  if (siteSpecificScripts[aiId]) {
    return siteSpecificScripts[aiId];
  }
  
  // 通用发送脚本（适用于大多数 AI 网站）
  const universalScript = `
(async () => {
  try {
    const msg = ${escaped};
    
    // 尝试多种输入框选择器
    const selectors = [
      'textarea._27c9245',           // DeepSeek
      '#prompt-textarea',            // ChatGPT
      '[data-testid="chat_input_input"]',  // 豆包
      '[data-testid="msh-chatinput-editor"]', // Kimi
      'rich-textarea .ql-editor',    // Gemini
      '[contenteditable="true"][data-placeholder]', // Claude
      'div[contenteditable="true"]', // 通用 contenteditable
      'textarea[placeholder]',       // 通用 textarea
      'textarea',                    // 最后备选
    ];
    
    let t = null;
    for (const sel of selectors) {
      t = document.querySelector(sel);
      if (t) break;
    }
    
    if (!t) {
      console.error('[AICompare] 找不到输入框，aiId:', '${aiId}');
      return false;
    }
    
    t.focus();
    await new Promise(r => setTimeout(r, 100));
    
    if (t.tagName.toLowerCase() === 'textarea') {
      // textarea 处理
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(t, msg);
      } else {
        t.value = msg;
      }
      t.dispatchEvent(new Event('input', { bubbles: true }));
      t.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (t.getAttribute('contenteditable') === 'true') {
      // contenteditable 处理
      t.innerHTML = '';
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(t);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      try {
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, msg);
      } catch(_) {
        t.textContent = msg;
      }
      t.dispatchEvent(new InputEvent('input', { bubbles: true, data: msg }));
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    // 尝试点击发送按钮
    const btnSelectors = [
      '[data-testid="send-button"]',
      '[data-testid="chat_input_send_button"]',
      '[data-testid="msh-chatinput-send-button"]',
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]',
      'button[aria-label="发送消息"]',
      'button[aria-label*="发送"]',
      'button.send-button',
      'button[type="submit"]',
    ];
    
    for (const sel of btnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled && !btn.getAttribute('aria-disabled')) {
        btn.click();
        return true;
      }
    }
    
    // 备用：模拟 Enter 键
    t.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    
    return true;
  } catch(e) {
    console.error('[AICompare] send error:', e);
    return false;
  }
})()
`
  return universalScript
}

function getHistoryScript(aiId: string): string {
  // 针对特定 AI 网站的历史读取脚本
  const siteSpecificScripts: Record<string, string> = {
    // 豆包
    doubao: `
(async () => {
  try {
    const messages = [];
    // 豆包消息选择器
    const msgSelectors = [
      '[class*="message"][class*="user"]',
      '[class*="message"][class*="bot"]',
      '[class*="chat-message"]',
    ];
    const items = document.querySelectorAll(msgSelectors.join(', '));
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,

    // 通义千问
    qwen: `
(async () => {
  try {
    const messages = [];
    // 通义千问消息选择器
    const items = document.querySelectorAll('[class*="message"], [class*="chat-item"]');
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human') || className.includes('question');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,

    // 文心一言
    yiyan: `
(async () => {
  try {
    const messages = [];
    // 文心一言消息选择器
    const items = document.querySelectorAll('[class*="message"], .yc-dialog-item, [class*="chat-item"]');
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human') || className.includes('question');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,

    // 智谱清言
    chatglm: `
(async () => {
  try {
    const messages = [];
    // 智谱清言消息选择器
    const items = document.querySelectorAll('[class*="message"], .chat-item, [class*="bubble"]');
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human') || className.includes('right');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,

    // MiniMax
    minimax: `
(async () => {
  try {
    const messages = [];
    // MiniMax 消息选择器
    const items = document.querySelectorAll('[class*="message"], .chat-item');
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,

    // 腾讯元宝
    yuanbao: `
(async () => {
  try {
    const messages = [];
    // 元宝消息选择器
    const items = document.querySelectorAll('[class*="message"], [class*="chat-item"]');
    items.forEach(item => {
      const className = item.className || '';
      const isUser = className.includes('user') || className.includes('human');
      const text = item.innerText || item.textContent || '';
      if (text.trim() && text.trim().length > 5) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()`,
  };

  // 如果有特定网站的脚本，使用它
  if (siteSpecificScripts[aiId]) {
    return siteSpecificScripts[aiId];
  }

  // 通用历史读取脚本
  return `
(async () => {
  try {
    const messages = [];
    
    // 尝试多种聊天历史选择器
    const strategies = [
      // ChatGPT
      () => {
        const items = document.querySelectorAll('[data-message-author-role]');
        if (items.length === 0) return null;
        const msgs = [];
        items.forEach(item => {
          const role = item.getAttribute('data-message-author-role');
          const text = item.innerText || item.textContent || '';
          if (text.trim()) msgs.push({ role: role === 'user' ? 'user' : 'assistant', content: text.trim() });
        });
        return msgs.length > 0 ? msgs : null;
      },
      // DeepSeek
      () => {
        const userMsgs = document.querySelectorAll('.fbb737a4');
        const aiMsgs = document.querySelectorAll('.ds-markdown');
        if (userMsgs.length === 0 && aiMsgs.length === 0) return null;
        const msgs = [];
        userMsgs.forEach(el => {
          const text = el.innerText || '';
          if (text.trim()) msgs.push({ role: 'user', content: text.trim() });
        });
        aiMsgs.forEach(el => {
          const text = el.innerText || '';
          if (text.trim()) msgs.push({ role: 'assistant', content: text.trim() });
        });
        return msgs.length > 0 ? msgs : null;
      },
      // 通用 - 查找对话容器
      () => {
        const containers = document.querySelectorAll(
          '[class*="message-list"], [class*="chat-list"], [class*="conversation"]'
        );
        if (containers.length === 0) return null;
        const container = containers[0];
        const msgs = [];
        const children = container.querySelectorAll('[class*="message"], [class*="chat-item"]');
        children.forEach(el => {
          const classStr = el.className.toString().toLowerCase();
          const isUser = classStr.includes('user') || classStr.includes('human') || classStr.includes('question');
          const text = el.innerText || el.textContent || '';
          if (text.trim() && text.trim().length > 2) {
            msgs.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
          }
        });
        return msgs.length > 0 ? msgs : null;
      },
    ];
    
    for (const strategy of strategies) {
      const result = strategy();
      if (result && result.length > 0) {
        return JSON.stringify(result);
      }
    }
    
    return JSON.stringify([]);
  } catch(e) {
    console.error('[AICompare] getHistory error:', e);
    return JSON.stringify([]);
  }
})()
`
}

function getStatusScript(aiId: string): string {
  return `
(async () => {
  try {
    const stopSelectors = [
      '[aria-label="Stop streaming"]',
      '[aria-label="Stop response"]',
      '[aria-label="Stop Response"]',
      '[aria-label="停止生成"]',
      '[data-testid="chat_stop_button"]',
      '[data-testid="msh-chatinput-stop-button"]',
      '.ds-icon-button[aria-label="Stop"]',
    ];
    
    for (const sel of stopSelectors) {
      const btn = document.querySelector(sel);
      if (btn) return JSON.stringify({ generating: true });
    }
    
    return JSON.stringify({ generating: false });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}
