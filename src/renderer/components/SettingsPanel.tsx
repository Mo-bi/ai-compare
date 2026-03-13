import React, { useState } from 'react'

interface SettingsPanelProps {
  apiKey: string
  summaryModel: string
  onSaveApiKey: (key: string) => void
  onSaveSummaryModel: (model: string) => void
  onClose: () => void
}

import { SUMMARY_MODELS } from '../store/appStore'

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  apiKey,
  summaryModel,
  onSaveApiKey,
  onSaveSummaryModel,
  onClose,
}) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey)
  const [localModel, setLocalModel] = useState(summaryModel)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    onSaveApiKey(localApiKey)
    onSaveSummaryModel(localModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
          width: '480px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>⚙️ 设置</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '18px', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* 综述功能说明 */}
        <div
          style={{
            background: 'rgba(77, 159, 255, 0.08)',
            border: '1px solid rgba(77, 159, 255, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
          }}
        >
          <strong style={{ color: 'var(--accent-blue)' }}>📊 综述功能说明</strong>
          <br />
          综述功能会读取所有并排窗口的聊天历史，然后调用 AI API 生成综合分析。
          你需要提供一个 API Key 才能使用此功能。
          <br /><br />
          <strong>不想用 API？</strong> 可以手动复制各窗口内容，粘贴到另一个 AI 窗口中让其综述。
        </div>

        {/* API Key 设置 */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            OpenAI API Key（用于综述功能）
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                flex: 1,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            API Key 仅保存在本地，不会上传到任何服务器
          </p>
        </div>

        {/* 综述模型选择 */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            综述使用的模型
          </label>
          <select
            value={localModel}
            onChange={(e) => setLocalModel(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {SUMMARY_MODELS.map(m => (
              <option key={m.id} value={m.id} style={{ background: '#1a1a1a' }}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            background: saved ? 'rgba(76,175,80,0.2)' : 'var(--accent-blue)',
            color: saved ? '#4caf50' : 'white',
            border: saved ? '1px solid rgba(76,175,80,0.4)' : 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
