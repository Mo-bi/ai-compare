import React, { useState, useRef, useEffect } from 'react'
import { Workspace } from '../store/appStore'

interface WorkspaceSidebarProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  onSelectWorkspace: (id: string) => void
  onAddWorkspace: () => void
  onRemoveWorkspace: (id: string) => void
  onRenameWorkspace: (id: string, name: string) => void
  onToggleFixed: (id: string) => void
  onMoveWorkspace: (id: string, direction: 'up' | 'down') => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  onRenameWorkspace,
  onToggleFixed,
  onMoveWorkspace,
  collapsed,
  onToggleCollapse,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showMenuId, setShowMenuId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const handleStartRename = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(workspace.id)
    setEditName(workspace.name)
    setShowMenuId(null)
  }

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRenameWorkspace(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const sortedWorkspaces = [...workspaces].sort((a, b) => a.order - b.order)

  if (collapsed) {
    return (
      <div
        style={{
          width: '40px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 4px',
          gap: '4px',
        }}
      >
        <button
          onClick={onToggleCollapse}
          title="展开侧边栏"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          ▶
        </button>
        {sortedWorkspaces.map(workspace => (
          <button
            key={workspace.id}
            onClick={() => onSelectWorkspace(workspace.id)}
            title={workspace.name}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              background: workspace.id === activeWorkspaceId ? 'var(--accent-blue)' : 'transparent',
              color: workspace.id === activeWorkspaceId ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            {workspace.isFixed ? '📌' : '📄'}
          </button>
        ))}
        <button
          onClick={onAddWorkspace}
          title="新建工作区"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '200px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          工作区
        </span>
        <button
          onClick={onToggleCollapse}
          title="收起侧边栏"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ◀
        </button>
      </div>

      {/* 工作区列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {sortedWorkspaces.map(workspace => (
          <div
            key={workspace.id}
            style={{
              position: 'relative',
              marginBottom: '4px',
            }}
          >
            {editingId === workspace.id ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFinishRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--accent-blue)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            ) : (
              <div
                onClick={() => onSelectWorkspace(workspace.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: workspace.id === activeWorkspaceId ? 'rgba(77, 159, 255, 0.15)' : 'transparent',
                  border: workspace.id === activeWorkspaceId ? '1px solid rgba(77, 159, 255, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '14px' }}>
                  {workspace.isFixed ? '📌' : '📄'}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: workspace.id === activeWorkspaceId ? 'var(--accent-blue)' : 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {workspace.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {workspace.panels.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenuId(showMenuId === workspace.id ? null : workspace.id)
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⋮
                </button>
              </div>
            )}

            {/* 操作菜单 */}
            {showMenuId === workspace.id && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '36px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '4px',
                  zIndex: 100,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  minWidth: '120px',
                }}
              >
                <button
                  onClick={(e) => handleStartRename(workspace, e)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  ✏️ 重命名
                </button>
                <button
                  onClick={() => {
                    onToggleFixed(workspace.id)
                    setShowMenuId(null)
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  {workspace.isFixed ? '📌 取消固定' : '📌 固定'}
                </button>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    onMoveWorkspace(workspace.id, 'up')
                    setShowMenuId(null)
                  }}
                  disabled={sortedWorkspaces.findIndex(w => w.id === workspace.id) === 0}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: sortedWorkspaces.findIndex(w => w.id === workspace.id) === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: sortedWorkspaces.findIndex(w => w.id === workspace.id) === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  ⬆️ 上移
                </button>
                <button
                  onClick={() => {
                    onMoveWorkspace(workspace.id, 'down')
                    setShowMenuId(null)
                  }}
                  disabled={sortedWorkspaces.findIndex(w => w.id === workspace.id) === sortedWorkspaces.length - 1}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: sortedWorkspaces.findIndex(w => w.id === workspace.id) === sortedWorkspaces.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: sortedWorkspaces.findIndex(w => w.id === workspace.id) === sortedWorkspaces.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  ⬇️ 下移
                </button>
                {!workspace.isFixed && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        onRemoveWorkspace(workspace.id)
                        setShowMenuId(null)
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      🗑️ 删除
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部添加按钮 */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={onAddWorkspace}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px dashed var(--border-color)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          + 新建工作区
        </button>
      </div>
    </div>
  )
}

export default WorkspaceSidebar
