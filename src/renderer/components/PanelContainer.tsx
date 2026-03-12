import React, { useRef, useEffect, useCallback, useState } from 'react'
import { AIPanel } from '../store/appStore'
import WebviewPanel, { WebviewRef } from './WebviewPanel'

interface PanelContainerProps {
  panels: AIPanel[]
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onLoadingChange: (id: string, loading: boolean) => void
  onGeneratingChange: (id: string, generating: boolean) => void
  onPanelWidthChange: (id: string, width: number) => void
  webviewRefs: React.MutableRefObject<Map<string, WebviewRef>>
}

interface ResizeState {
  panelId: string
  startX: number
  startWidth: number
}

const PanelContainer: React.FC<PanelContainerProps> = ({
  panels,
  onRemove,
  onToggle,
  onLoadingChange,
  onGeneratingChange,
  onPanelWidthChange,
  webviewRefs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef<ResizeState | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  // 处理拖拽开始
  const handleResizeStart = useCallback((panelId: string, startX: number) => {
    const panel = panels.find(p => p.id === panelId)
    if (!panel) return
    resizeStateRef.current = { panelId, startX, startWidth: panel.width }
    setIsResizing(true)
  }, [panels])

  // 全局鼠标移动处理 - 使用 requestAnimationFrame 优化性能
  useEffect(() => {
    let animationFrameId: number | null = null
    let lastMouseX = 0

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current) return
      lastMouseX = e.clientX
      
      // 使用 requestAnimationFrame 避免频繁更新
      if (animationFrameId) return
      
      animationFrameId = requestAnimationFrame(() => {
        if (!resizeStateRef.current) return
        const { panelId, startX, startWidth } = resizeStateRef.current
        const delta = lastMouseX - startX
        const newWidth = Math.max(320, startWidth + delta)
        onPanelWidthChange(panelId, newWidth)
        
        // 如果是最后一个面板，滚动到最右边以显示完整面板
        const panelIndex = panels.findIndex(p => p.id === panelId)
        if (panelIndex === panels.length - 1 && containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth
        }
        
        animationFrameId = null
      })
    }

    const handleMouseUp = () => {
      resizeStateRef.current = null
      setIsResizing(false)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isResizing, onPanelWidthChange, panels])

  // 注册 webview ref
  const setWebviewRef = useCallback((panelId: string, ref: WebviewRef | null) => {
    if (ref) {
      webviewRefs.current.set(panelId, ref)
    } else {
      webviewRefs.current.delete(panelId)
    }
  }, [webviewRefs])

  if (panels.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '48px', opacity: 0.3 }}>🤖</div>
        <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          还没有添加任何 AI 模型
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          点击顶部的「添加模型」按钮开始使用
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'auto',
        overflowY: 'hidden',
        // 拖拽时禁止文字选中
        userSelect: resizeStateRef.current ? 'none' : 'auto',
      }}
    >
      {panels.map((panel, index) => (
        <WebviewPanel
          key={panel.id}
          ref={(ref) => setWebviewRef(panel.id, ref)}
          panel={panel}
          onRemove={onRemove}
          onToggle={onToggle}
          onLoadingChange={onLoadingChange}
          onGeneratingChange={onGeneratingChange}
          onResizeStart={handleResizeStart}
          isLast={index === panels.length - 1}
        />
      ))}
    </div>
  )
}

export default PanelContainer
