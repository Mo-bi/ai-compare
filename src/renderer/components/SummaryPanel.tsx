import React, { useState } from 'react'

interface SummaryPanelProps {
  content: string
  loading: boolean
  onClose: () => void
  onCopy: () => void
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  content,
  loading,
  onClose,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopy()
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '480px',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
        animation: 'slideInRight 0.25s ease',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          height: '52px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '16px' }}>📊</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
          综合综述
        </span>
        
        {!loading && content && (
          <button
            onClick={handleCopy}
            style={{
              background: copied ? 'rgba(76,175,80,0.15)' : 'var(--bg-hover)',
              color: copied ? '#4caf50' : 'var(--text-secondary)',
              border: `1px solid ${copied ? 'rgba(76,175,80,0.3)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              fontSize: '12px',
            }}
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
        )}
        
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '16px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--border-color)',
                borderTopColor: 'var(--accent-blue)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ fontSize: '14px' }}>正在读取聊天历史并生成综述...</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              这可能需要几十秒，请耐心等待
            </p>
          </div>
        ) : content ? (
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {/* 简单的 Markdown 渲染 */}
            {renderMarkdown(content)}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ fontSize: '32px', opacity: 0.3 }}>📊</span>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              点击底部「综述」按钮
            </p>
            <p style={{ fontSize: '12px' }}>
              将读取所有模型的聊天历史并生成综合分析
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// 简单的 Markdown 渲染（不依赖外部库）
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 12px' }}>
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key++} style={{ marginLeft: '16px', marginBottom: '4px', color: 'var(--text-primary)' }}>
          {renderInline(line.slice(2))}
        </li>
      )
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={key++} style={{ marginLeft: '16px', marginBottom: '4px', color: 'var(--text-primary)', listStyleType: 'decimal' }}>
          {renderInline(line.replace(/^\d+\. /, ''))}
        </li>
      )
    } else if (line === '') {
      elements.push(<br key={key++} />)
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={key++}
          style={{
            borderLeft: '3px solid var(--accent-blue)',
            paddingLeft: '12px',
            margin: '8px 0',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {renderInline(line.slice(2))}
        </blockquote>
      )
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />)
    } else {
      elements.push(
        <p key={key++} style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
          {renderInline(line)}
        </p>
      )
    }
  }

  return elements
}

function renderInline(text: string): React.ReactNode {
  // 处理 **bold** 和 *italic*
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/\*(.+?)\*/)
    const codeMatch = remaining.match(/`(.+?)`/)

    const matches = [
      boldMatch && { match: boldMatch, type: 'bold' },
      italicMatch && { match: italicMatch, type: 'italic' },
      codeMatch && { match: codeMatch, type: 'code' },
    ].filter(Boolean) as Array<{ match: RegExpMatchArray; type: string }>

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    // 找最早出现的匹配
    const earliest = matches.reduce((a, b) =>
      (a.match.index ?? Infinity) < (b.match.index ?? Infinity) ? a : b
    )

    const { match, type } = earliest
    const idx = match.index ?? 0

    if (idx > 0) {
      parts.push(remaining.slice(0, idx))
    }

    if (type === 'bold') {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[1]}</strong>)
    } else if (type === 'italic') {
      parts.push(<em key={key++} style={{ fontStyle: 'italic' }}>{match[1]}</em>)
    } else if (type === 'code') {
      parts.push(
        <code
          key={key++}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
            padding: '1px 5px',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {match[1]}
        </code>
      )
    }

    remaining = remaining.slice(idx + match[0].length)
  }

  return parts.length === 1 ? parts[0] : parts
}

export default SummaryPanel
