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
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef<ResizeState | null>(null)
  const [isResizing, setIsResizing] = useState(false)

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
        
        const panelIndex = activePanels.findIndex(p => p.id === panelId)
        if (panelIndex === activePanels.length - 1 && containerRef.current) {
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
  }, [isResizing, onPanelWidthChange, activePanels])

  const setWebviewRef = useCallback((panelId: string, ref: WebviewRef | null) => {
    if (ref) {
      webviewRefs.current.set(panelId, ref)
    } else {
      webviewRefs.current.delete(panelId)
    }
  }, [webviewRefs])

  const handleRemove = useCallback((panelId: string) => {
    const workspace = workspaces.find(w => {
      return w.panels.some(p => p.id === panelId)
    })
    if (workspace) {
      onRemove(panelId)
    }
  }, [workspaces, onRemove])

  const handleToggle = useCallback((panelId: string) => {
    const workspace = workspaces.find(w => {
      return w.panels.some(p => p.id === panelId)
    })
    if (workspace) {
      onToggle(panelId)
    }
  }, [workspaces, onToggle])

  const handleLoadingChange = useCallback((panelId: string, loading: boolean) => {
    const workspace = workspaces.find(w => {
      return w.panels.some(p => p.id === panelId)
    })
    if (workspace) {
      onLoadingChange(panelId, loading)
    }
  }, [workspaces, onLoadingChange])

  const handleGeneratingChange = useCallback((panelId: string, generating: boolean) => {
    const workspace = workspaces.find(w => {
      return w.panels.some(p => p.id === panelId)
    })
    if (workspace) {
      onGeneratingChange(panelId, generating)
    }
  }, [workspaces, onGeneratingChange])

  const handleResizeStartWrapper = useCallback((panelId: string, startX: number) => {
    const workspace = workspaces.find(w => {
      return w.panels.some(p => p.id === panelId)
    })
    if (workspace && workspace.id === activeWorkspaceId) {
      handleResizeStart(panelId, startX)
    }
  }, [workspaces, activeWorkspaceId, handleResizeStart])

  if (workspaces.length === 0) {
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
          还没有添加任何工作区
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
        userSelect: resizeStateRef.current ? 'none' : 'auto',
      }}
    >
      {workspaces.map(workspace => {
        const isActive = workspace.id === activeWorkspaceId
        const panels = workspace.panels

        if (panels.length === 0) {
          return null
        }

        return (
          <div
            key={workspace.id}
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexShrink: 0,
              visibility: isActive ? 'visible' : 'hidden',
              width: isActive ? 'auto' : 0,
              overflow: 'hidden',
            }}
          >
            {panels.map((panel, index) => (
              <WebviewPanel
                key={panel.id}
                ref={(ref) => setWebviewRef(panel.id, ref)}
                panel={panel}
                onRemove={handleRemove}
                onToggle={handleToggle}
                onLoadingChange={handleLoadingChange}
                onGeneratingChange={handleGeneratingChange}
                onResizeStart={handleResizeStartWrapper}
                isLast={index === panels.length - 1}
              />
            ))}
          </div>
        )})}
    </div>
  )
}

export default PanelContainer
