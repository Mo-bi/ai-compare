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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputHeight, setInputHeight] = useState(80)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const enabledPanels = panels.filter(p => p.enabled)
  const generatingPanels = panels.filter(p => p.generating)

  // 自动收起逻辑：当输入框为空且不在输入状态时，自动收起
  useEffect(() => {
    if (!inputText.trim() && !isSending && !isHovered) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [inputText, isSending, isHovered])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 或 Cmd+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isSending && inputText.trim()) {
        onSend()
      }
    }
  }, [isSending, inputText, onSend])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
    // 自动调整高度
    const ta = e.target
    ta.style.height = 'auto'
    const newHeight = Math.min(Math.max(ta.scrollHeight, 60), 200)
    ta.style.height = `${newHeight}px`
    setInputHeight(newHeight)
  }, [onInputChange])

  const handleExpand = () => {
    setIsExpanded(true)
    // 展开后聚焦到输入框
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  // 收起状态：显示简洁的工具栏
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
          transition: 'all 0.2s ease',
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
          {/* 快速综述按钮 */}
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
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {summaryLoading ? (
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            ) : (
              '📊'
            )}
            综述
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

  // 展开状态：显示完整输入框
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
        animation: 'slideInUp 0.2s ease',
      }}
    >
      {/* 状态栏：显示当前启用的模型和生成状态 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          minHeight: '22px',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
          发送至：
        </span>
        {enabledPanels.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>
            ⚠ 没有启用的模型
          </span>
        ) : (
          enabledPanels.map(p => (
            <span
              key={p.id}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: p.generating
                  ? `rgba(76, 175, 80, 0.15)`
                  : `${p.color}22`,
                color: p.generating ? '#4caf50' : p.color,
                border: `1px solid ${p.generating ? 'rgba(76,175,80,0.3)' : `${p.color}44`}`,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {p.generating && (
                <span style={{ animation: 'pulse 1s infinite' }}>●</span>
              )}
              {p.icon} {p.name}
            </span>
          ))
        )}
        
        {generatingPanels.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {generatingPanels.length} 个模型正在回复...
          </span>
        )}
        
        {/* 收起按钮 */}
        <button
          onClick={() => setIsExpanded(false)}
          title="收起输入框"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
          }}
        >
          ▼ 收起
        </button>
      </div>

      {/* 输入区域 */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        {/* 文本输入框 */}
        <div
          style={{
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)'
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`输入 Prompt，同时发送给 ${enabledPanels.length} 个 AI 模型... (Ctrl+Enter 发送)`}
            disabled={isSending}
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '200px',
              resize: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.6',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              display: 'block',
            }}
          />
        </div>

        {/* 右侧按钮组 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {/* 发送按钮 */}
          <button
            onClick={onSend}
            disabled={isSending || !inputText.trim() || enabledPanels.length === 0}
            style={{
              background: isSending || !inputText.trim() || enabledPanels.length === 0
                ? 'var(--bg-tertiary)'
                : 'var(--accent-blue)',
              color: isSending || !inputText.trim() || enabledPanels.length === 0
                ? 'var(--text-muted)'
                : 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '100px',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {isSending ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                发送中
              </>
            ) : (
              <>
                ➤ 发送
              </>
            )}
          </button>

          {/* 综述按钮 */}
          <button
            onClick={onSummarize}
            disabled={summaryLoading || panels.length === 0}
            title="读取所有模型的聊天历史，生成综合综述"
            style={{
              background: summaryLoading ? 'var(--bg-tertiary)' : 'rgba(156, 39, 176, 0.15)',
              color: summaryLoading ? 'var(--text-muted)' : '#ce93d8',
              border: `1px solid ${summaryLoading ? 'var(--border-color)' : 'rgba(156,39,176,0.3)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '100px',
              justifyContent: 'center',
            }}
          >
            {summaryLoading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                综述中
              </>
            ) : (
              <>
                📊 综述
              </>
            )}
          </button>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
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
