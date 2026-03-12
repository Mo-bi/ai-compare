import React, { useState } from 'react'
import { AI_PRESETS, AIPanel } from '../store/appStore'

interface AddModelModalProps {
  existingPanels: AIPanel[]
  onAdd: (aiId: string) => void
  onClose: () => void
}

const AddModelModal: React.FC<AddModelModalProps> = ({ existingPanels, onAdd, onClose }) => {
  const [customUrl, setCustomUrl] = useState('')
  const [customName, setCustomName] = useState('')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '520px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            添加 AI 模型
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '18px',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 预设模型列表 */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            预设模型
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {AI_PRESETS.map(preset => {
              const alreadyAdded = existingPanels.some(p => p.aiId === preset.id)
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onAdd(preset.id)
                    onClose()
                  }}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${alreadyAdded ? 'var(--border-color)' : `${preset.color}44`}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    color: alreadyAdded ? 'var(--text-muted)' : 'var(--text-primary)',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!alreadyAdded) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = preset.color
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = alreadyAdded ? 'var(--border-color)' : `${preset.color}44`
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{preset.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: alreadyAdded ? 'var(--text-muted)' : preset.color }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {alreadyAdded ? '已添加（可重复添加）' : preset.url.replace('https://', '').split('/')[0]}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 自定义 URL */}
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            自定义网站
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="显示名称（如：文心一言）"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '100%',
              }}
            />
            <input
              type="text"
              placeholder="网站 URL（如：https://yiyan.baidu.com）"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '100%',
              }}
            />
            <button
              onClick={() => {
                if (customUrl.trim() && customName.trim()) {
                  // 自定义 URL 暂时通过特殊 ID 处理
                  // TODO: 实现自定义 URL 添加
                  alert('自定义 URL 功能即将支持！')
                }
              }}
              disabled={!customUrl.trim() || !customName.trim()}
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
                opacity: !customUrl.trim() || !customName.trim() ? 0.5 : 1,
              }}
            >
              添加自定义网站
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '16px',
            lineHeight: '1.6',
          }}
        >
          💡 提示：添加后需要在对应窗口中登录账号才能使用。同一模型可以添加多个窗口（如同时对比同一模型的不同对话）。
        </p>
      </div>
    </div>
  )
}

export default AddModelModal
