import React from 'react'
import { AIPanel } from '../store/appStore'

interface ToolbarProps {
  panels: AIPanel[]
  onAddModel: () => void
  onSettings: () => void
  onClearAll: () => void
  platform?: string
}

const Toolbar: React.FC<ToolbarProps> = ({
  panels,
  onAddModel,
  onSettings,
  onClearAll,
  platform,
}) => {
  const isMac = platform === 'darwin'
  
  return (
    <div
      style={{
        height: 'var(--toolbar-height)',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: isMac ? '0 16px 0 80px' : '0 16px',
        gap: '8px',
        flexShrink: 0,
        // macOS 拖动区域
        WebkitAppRegion: isMac ? 'drag' : 'no-drag',
      } as React.CSSProperties}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginRight: '8px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <span style={{ fontSize: '18px' }}>🔀</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4d9fff, #9c27b0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
          }}
        >
          AI Compare
        </span>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

      {/* 面板计数 */}
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {panels.length} 个模型
        {panels.filter(p => p.enabled).length < panels.length && (
          <span style={{ color: 'var(--accent-orange)' }}>
            {' '}（{panels.filter(p => p.enabled).length} 启用）
          </span>
        )}
      </span>

      {/* 弹性空间 */}
      <div style={{ flex: 1 }} />

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* 添加模型 */}
        <button
          onClick={onAddModel}
          style={{
            background: 'rgba(77, 159, 255, 0.12)',
            color: 'var(--accent-blue)',
            border: '1px solid rgba(77, 159, 255, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          + 添加模型
        </button>

        {/* 全部刷新 */}
        {panels.length > 0 && (
          <button
            onClick={onClearAll}
            title="清除所有面板"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            清除全部
          </button>
        )}

        {/* 设置 */}
        <button
          onClick={onSettings}
          title="设置（API Key、综述模型等）"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            fontSize: '14px',
          }}
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}

export default Toolbar
