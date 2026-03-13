import React, { useRef, useCallback, useState, useEffect } from 'react'
import { AIPanel } from '../store/appStore'

interface GlobalInputProps {
  panels: AIPanel[]
  inputText: string
  isSending: boolean
  onInputChange: (text: string) => void
  onSend: () => void
  onSummarize: () => void
  summaryLoading: boolean
}

const GlobalInput: React.FC<GlobalInputProps> = ({
  panels,
  inputText,
  isSending,
  onInputChange,
  onSend,
  onSummarize,
  summaryLoading,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputHeight, setInputHeight] = useState(60)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const enabledPanels = panels.filter(p => p.enabled)
  const generatingPanels = panels.filter(p => p.generating)

  useEffect(() => {
    if (!inputText.trim() && !isSending && !isHovered) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [inputText, isSending, isHovered])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value)
  }, [onInputChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isSending && inputText.trim()) {
        onSend()
      }
    }
  }, [isSending, inputText, onSend])

  const handleExpand = () => {
    setIsExpanded(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  if (!isExpanded) {
    return (
      <div
        onClick={handleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            💬 点击展开输入框
          </span>
          {enabledPanels.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({enabledPanels.length} 个模型已启用)
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSummarize()
            }}
            disabled={summaryLoading || panels.length === 0}
            style={{
              background: summaryLoading ? 'var(--bg-tertiary)' : 'rgba(156, 39, 176, 0.15)',
              color: summaryLoading ? 'var(--text-muted)' : '#ce93d8',
              border: `1px solid ${summaryLoading ? 'var(--border-color)' : 'rgba(156,39,176,0.3)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            {summaryLoading ? '⟳' : '📊'} 综述
          </button>
          
          {generatingPanels.length > 0 && (
            <span style={{ fontSize: '11px', color: '#4caf50' }}>
              <span style={{ animation: 'pulse 1s infinite' }}>●</span>
              {generatingPanels.length} 个模型正在回复...
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>发送至：</span>
        {enabledPanels.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>⚠ 没有启用的模型</span>
        ) : (
          enabledPanels.map(p => (
            <span
              key={p.id}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: p.generating ? 'rgba(76, 175, 80, 0.15)' : `${p.color}22`,
                color: p.generating ? '#4caf50' : p.color,
                border: `1px solid ${p.generating ? 'rgba(76,175,80,0.3)' : `${p.color}44`}`,
                fontWeight: 600,
              }}
            >
              {p.generating && '● '}{p.icon} {p.name}
            </span>
          ))
        )}
        
        {generatingPanels.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {generatingPanels.length} 个模型正在回复...
          </span>
        )}
        
        <button
          onClick={() => setIsExpanded(false)}
          style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
        >
          ▼ 收起
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`输入 Prompt，同时发送给 ${enabledPanels.length} 个 AI 模型... (Ctrl+Enter 发送)`}
            disabled={isSending}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#333',
              fontSize: '14px',
              lineHeight: '1.5',
              border: 'none',
              outline: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
              display: 'block',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={onSend}
            disabled={isSending || enabledPanels.length === 0}
            style={{
              background: isSending || enabledPanels.length === 0 ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
              color: isSending || enabledPanels.length === 0 ? 'var(--text-muted)' : 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '100px',
            }}
          >
            {isSending ? '⟳ 发送中' : '➤ 发送'}
          </button>

          <button
            onClick={onSummarize}
            disabled={summaryLoading || panels.length === 0}
            style={{
              background: summaryLoading ? 'var(--bg-tertiary)' : 'rgba(156, 39, 176, 0.15)',
              color: summaryLoading ? 'var(--text-muted)' : '#ce93d8',
              border: `1px solid ${summaryLoading ? 'var(--border-color)' : 'rgba(156,39,176,0.3)'}`,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              minWidth: '100px',
            }}
          >
            {summaryLoading ? '⟳ 综述中' : '📊 综述'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Ctrl+Enter 发送</span>
        <span>·</span>
        <span>点击模型标签可启用/禁用</span>
        <span>·</span>
        <span>拖拽面板边缘调整宽度</span>
      </div>
    </div>
  )
}

export default GlobalInput
