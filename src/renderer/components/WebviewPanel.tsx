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
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: panel.color, flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: panel.color }}>{panel.icon} {panel.name}</span>
        
        {panel.generating && <span style={{ fontSize: '11px', color: '#4caf50', marginLeft: '4px' }}> ● 生成中</span>}
        {isLoading && !panel.generating && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}> 加载中...</span>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => onToggle(panel.id)}
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
          <button onClick={handleReload} title="刷新" style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '3px 6px', fontSize: '13px' }}>↺</button>
          <button onClick={() => onRemove(panel.id)} title="关闭" style={{ background: 'transparent', color: 'var(--text-muted)', padding: '3px 6px', fontSize: '13px' }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loadError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <p>页面加载失败</p>
            <button onClick={handleReload} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 16px' }}>重新加载</button>
          </div>
        ) : (
          <webview
            ref={webviewRef as React.RefObject<Electron.WebviewTag>}
            src={panel.url}
            style={{ width: '100%', height: '100%', display: 'flex' }}
            allowpopups="true"
            partition={`persist:${panel.aiId}`}
          />
        )}
      </div>

      <div
        className="resize-handle"
        onMouseDown={(e) => {
          e.preventDefault()
          onResizeStart(panel.id, e.clientX)
        }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 10 }}
      />
    </div>
  )
})

WebviewPanel.displayName = 'WebviewPanel'

export default WebviewPanel

function getSendScript(aiId: string, text: string): string {
  const escaped = JSON.stringify(text)
  return `
(async () => {
  try {
    const msg = ${escaped};
    const selectors = ['textarea._27c9245', '#prompt-textarea', '[data-testid="chat_input_input"]', '[data-testid="msh-chatinput-editor"]', 'rich-textarea .ql-editor', '[contenteditable="true"]', 'textarea'];
    let t = null;
    for (const sel of selectors) { t = document.querySelector(sel); if (t) break; }
    if (!t) return false;
    t.focus();
    await new Promise(r => setTimeout(r, 100));
    if (t.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) nativeSetter.set.call(t, msg); else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      t.textContent = msg;
      t.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 500));
    const btnSelectors = ['[data-testid="send-button"]', '[data-testid="chat_input_send_button"]', 'button[type="submit"]', 'button[aria-label*="发送"]'];
    for (const sel of btnSelectors) { const btn = document.querySelector(sel); if (btn && !btn.disabled) { btn.click(); return true; } }
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return true;
  } catch(e) { return false; }
})()`
}

function getHistoryScript(aiId: string): string {
  return `
(async () => {
  try {
    const windowWidth = window.innerWidth;
    
    // 1. 获取所有含有文本的潜在节点
    const all = Array.from(document.querySelectorAll('div, p, pre, section, article, .markdown-body, .ds-markdown, [class*="content"]'));
    
    // 2. 初步筛选有意义的块
    const candidates = all.filter(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || '').trim();
      if (text.length < 15) return false;
      if (rect.left < 50 && rect.width < 250) return false; // 排除侧边栏区域
      if (rect.height < 5) return false;
      return true;
    }).map(el => ({
      el,
      text: el.innerText.trim(),
      rect: el.getBoundingClientRect(),
      top: el.getBoundingClientRect().top + window.scrollY
    }));

    // 3. 【极致去重】排除所有父节点，只保留最末端的叶子内容节点
    // 如果节点 A 包含了节点 B，则丢弃 A，因为 B 肯定更精准
    const leafNodes = candidates.filter(a => {
      return !candidates.some(b => a.el !== b.el && a.el.contains(b.el));
    });

    // 4. 排序
    leafNodes.sort((a, b) => a.top - b.top);

    // 5. 生成结果
    const results = leafNodes.map(n => ({
      role: (n.rect.left + n.rect.width / 2 > windowWidth * 0.5) ? 'user' : 'assistant',
      content: n.text
    }));

    return JSON.stringify(results);
  } catch(e) { return JSON.stringify([]); }
})()`
}

function getStatusScript(aiId: string): string {
  return `(async () => {
    const stopSelectors = ['[aria-label*="Stop"]', '[aria-label*="停止"]', '[data-testid*="stop"]'];
    for (const sel of stopSelectors) { if (document.querySelector(sel)) return JSON.stringify({ generating: true }); }
    return JSON.stringify({ generating: false });
  })()`
}
