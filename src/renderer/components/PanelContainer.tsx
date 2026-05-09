import React, { useRef, useEffect, useCallback, useState } from 'react'
import { AIPanel, Workspace } from '../store/appStore'
import WebviewPanel, { WebviewRef } from './WebviewPanel'

interface PanelContainerProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onLoadingChange: (id: string, loading: boolean) => void
  onGeneratingChange: (id: string, generating: boolean) => void
  onPanelWidthChange: (id: string, width: number) => void
  webviewRefs: React.MutableRefObject<Map<string, WebviewRef>>
  maximizedPanelId: string | null
  onSetMaximized: (id: string | null) => void
}

interface ResizeState {
  panelId: string
  startX: number
  startWidth: number
}

const PanelContainer: React.FC<PanelContainerProps> = ({
  workspaces,
  activeWorkspaceId,
  onRemove,
  onToggle,
  onLoadingChange,
  onGeneratingChange,
  onPanelWidthChange,
  webviewRefs,
  maximizedPanelId,
  onSetMaximized
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef<ResizeState | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  // 获取当前工作区的面板，仅用于计算 resize 逻辑
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const activePanels = activeWorkspace?.panels || []

  const handleResizeStart = useCallback((panelId: string, startX: number) => {
    const panel = activePanels.find(p => p.id === panelId)
    if (!panel) return
    resizeStateRef.current = { panelId, startX, startWidth: panel.width }
    setIsResizing(true)
  }, [activePanels])

  useEffect(() => {
    let animationFrameId: number | null = null
    let lastMouseX = 0

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current) return
      lastMouseX = e.clientX
      
      if (animationFrameId) return
      
      animationFrameId = requestAnimationFrame(() => {
        if (!resizeStateRef.current) return
        const { panelId, startX, startWidth } = resizeStateRef.current
        const delta = lastMouseX - startX
        const newWidth = Math.max(320, startWidth + delta)
        onPanelWidthChange(panelId, newWidth)
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
  }, [isResizing, onPanelWidthChange])

  const setWebviewRef = useCallback((panelId: string, ref: WebviewRef | null) => {
    if (ref) {
      webviewRefs.current.set(panelId, ref)
    } else {
      webviewRefs.current.delete(panelId)
    }
  }, [webviewRefs])

  const handleToggleMaximize = useCallback((panelId: string) => {
    if (maximizedPanelId === panelId) {
      onSetMaximized(null)
    } else {
      onSetMaximized(panelId)
    }
  }, [maximizedPanelId, onSetMaximized])

  if (workspaces.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px' }}>
        <div style={{ fontSize: '48px', opacity: 0.3 }}>🤖</div>
        <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>还没有添加任何工作区</div>
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
        overflow: 'hidden', // 容器本身不滚动，由内部 active 工作区滚动
        userSelect: resizeStateRef.current ? 'none' : 'auto',
        background: 'var(--bg-tertiary)',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {workspaces.map(workspace => {
        const isActive = workspace.id === activeWorkspaceId
        const panels = workspace.panels

        return (
          <div
            key={workspace.id}
            style={{
              display: isActive ? 'flex' : 'none', // 【核心】隐藏而非卸载，保持状态
              flexDirection: 'row',
              width: '100%',
              height: '100%',
              overflowX: (maximizedPanelId && isActive) ? 'hidden' : 'auto',
              overflowY: 'hidden',
              position: 'absolute', // 重叠定位，通过 display 切换
              left: 0,
              top: 0,
            }}
          >
            {panels.map((panel, index) => {
              const isMaximized = maximizedPanelId === panel.id
              // 如果本工作区有放大，且当前面板不是放大的那个，则在 UI 上隐藏
              const isHiddenInWorkspace = maximizedPanelId && !isMaximized

              return (
                <div 
                  key={panel.id} 
                  style={{ 
                    width: isMaximized ? '100%' : `${panel.width}px`,
                    height: '100%',
                    flexShrink: 0,
                    flex: isMaximized ? '1 1 auto' : '0 0 auto', 
                    display: isHiddenInWorkspace ? 'none' : 'flex',
                    minWidth: isMaximized ? '100%' : '320px',
                    position: 'relative',
                  }}
                >
                  <WebviewPanel
                    ref={(ref) => setWebviewRef(panel.id, ref)}
                    panel={panel}
                    isMaximized={isMaximized}
                    onRemove={onRemove}
                    onToggle={onToggle}
                    onToggleMaximize={handleToggleMaximize}
                    onLoadingChange={onLoadingChange}
                    onGeneratingChange={onGeneratingChange}
                    onResizeStart={handleResizeStart}
                    isLast={index === panels.length - 1 || !!maximizedPanelId}
                  />

                  {/* 调整大小时显示透明遮罩层，防止 Webview 拦截鼠标事件 */}
                  {isResizing && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        zIndex: 100, 
                        background: 'transparent',
                        cursor: 'col-resize'
                      }} 
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default PanelContainer
