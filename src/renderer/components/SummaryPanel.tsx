import React, { useState, useEffect } from 'react'
import { SummaryState, SummaryPrompt, PanelSummaryStatus, SUMMARY_MODELS } from '../store/appStore'

interface SummaryPanelProps {
  summaryState: SummaryState
  summaryPrompts: SummaryPrompt[]
  onClose: () => void
  onUpdateStatus: (status: SummaryState['status']) => void
  onUpdatePanelStatus: (panelId: string, status: Partial<PanelSummaryStatus>) => void
  onSetSelectedPanels: (ids: string[]) => void
  onSetSelectedPrompt: (id: string) => void
  onSetCustomPrompt: (content: string) => void
  onSetGeneratedContent: (content: string) => void
  onSetSummaryModel: (model: string) => void
  onAddPrompt: (prompt: SummaryPrompt) => void
  onRemovePrompt: (id: string) => void
  onUpdatePrompt: (id: string, content: string) => void
  onRunAPI: () => void
  onCopy: () => void
  onClearUserQueries: () => void
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summaryState,
  summaryPrompts,
  onClose,
  onUpdateStatus,
  onUpdatePanelStatus,
  onSetSelectedPanels,
  onSetSelectedPrompt,
  onSetCustomPrompt,
  onSetGeneratedContent,
  onSetSummaryModel,
  onAddPrompt,
  onRemovePrompt,
  onUpdatePrompt,
  onRunAPI,
  onCopy,
  onClearUserQueries
}) => {
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [tempPromptContent, setTempPromptContent] = useState('')

  const activePrompt = summaryPrompts.find(p => p.id === summaryState.selectedPromptId) || summaryPrompts[0]

  useEffect(() => {
    if (activePrompt && !summaryState.customPromptContent) {
      onSetCustomPrompt(activePrompt.content)
    }
  }, [activePrompt, summaryState.customPromptContent])

  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    onSetSelectedPrompt(id)
    const prompt = summaryPrompts.find(p => p.id === id)
    if (prompt) {
      onSetCustomPrompt(prompt.content)
    }
  }

  const renderReadingStatus = () => {
    const panelIds = Object.keys(summaryState.panelStatuses)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>正在读取聊天历史...</h3>
        {panelIds.map(id => {
          const status = summaryState.panelStatuses[id]
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {status.status === 'reading' && <div className="spinner-small" />}
                {status.status === 'success' && <span style={{ color: '#4caf50' }}>✓</span>}
                {status.status === 'failed' && <span style={{ color: '#f44336' }}>✕</span>}
                {status.status === 'pending' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)' }} />}
              </div>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>{status.panelName}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {status.status === 'reading' ? '读取中...' : 
                 status.status === 'success' ? '已完成' : 
                 status.status === 'failed' ? '失败' : '等待中'}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSelection = () => {
    const successfulPanels = Object.entries(summaryState.panelStatuses)
      .filter(([_, s]) => s.status === 'success')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Queries History */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>1. 用户提问记录 ({summaryState.userQueries.length})</h3>
            {summaryState.userQueries.length > 0 && (
              <button
                onClick={onClearUserQueries}
                style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                清空记录
              </button>
            )}
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {summaryState.userQueries.length > 0 ? (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {summaryState.userQueries.map((q, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{q}</li>
                ))}
              </ol>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px' }}>暂无发送记录</div>
            )}
          </div>
        </section>

        {/* Panel Selection */}
        <section>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>2. 选择参与综述的窗口</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
            {successfulPanels.map(([id, status]) => (
              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={summaryState.selectedPanelIds.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSetSelectedPanels([...summaryState.selectedPanelIds, id])
                    } else {
                      onSetSelectedPanels(summaryState.selectedPanelIds.filter(pid => pid !== id))
                    }
                  }}
                />
                <span style={{ color: 'var(--text-primary)' }}>{status.panelName}</span>
              </label>
            ))}
            {successfulPanels.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>未找到读取成功的聊天历史</div>}
          </div>
        </section>

        {/* Prompt Selection */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>2. 综述 Prompt 模板</h3>
            <button 
              onClick={() => {
                const name = `新模板 ${summaryPrompts.length + 1}`
                onAddPrompt({ id: Date.now().toString(), name, content: summaryState.customPromptContent })
                alert(`已新增: ${name}`)
              }}
              style={{ fontSize: '12px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + 新增
            </button>
          </div>
          <select 
            value={summaryState.selectedPromptId} 
            onChange={handlePromptChange}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginBottom: '8px' }}
          >
            {summaryPrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea
            value={summaryState.customPromptContent}
            onChange={(e) => onSetCustomPrompt(e.target.value)}
            style={{ 
              width: '100%', 
              height: '150px', 
              padding: '8px', 
              borderRadius: '4px', 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)',
              fontSize: '12px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </section>

        {/* Execution Mode */}
        <section>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>3. 执行模式</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={summaryState.summaryModel}
                onChange={(e) => onSetSummaryModel(e.target.value)}
                style={{ flex: 1, padding: '6px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {SUMMARY_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={onRunAPI}
                disabled={summaryState.selectedPanelIds.length === 0}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  opacity: summaryState.selectedPanelIds.length === 0 ? 0.5 : 1
                }}
              >
                API 模式
              </button>
            </div>
            <button
              onClick={onCopy}
              disabled={summaryState.selectedPanelIds.length === 0}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                fontSize: '13px',
                opacity: summaryState.selectedPanelIds.length === 0 ? 0.5 : 1
              }}
            >
              一键复制 (Prompt + 内容)
            </button>
          </div>
        </section>
      </div>
    )
  }

  const renderGenerating = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div className="spinner-small" />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>正在生成综述...</span>
      </div>
      <div
        style={{
          flex: 1,
          background: 'var(--bg-tertiary)',
          borderRadius: '4px',
          padding: '12px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid var(--border-color)'
        }}
      >
        {summaryState.generatedContent}
      </div>
      <button
        onClick={() => onUpdateStatus('selecting')}
        style={{ marginTop: '12px', padding: '8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
      >
        返回修改
      </button>
    </div>
  )

  const renderCompleted = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#4caf50' }}>✓ 生成完成</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(summaryState.generatedContent)
            alert('已复制到剪贴板')
          }}
          style={{ padding: '4px 12px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
        >
          复制结果
        </button>
      </div>
      <div
        style={{
          flex: 1,
          background: 'var(--bg-tertiary)',
          borderRadius: '4px',
          padding: '12px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid var(--border-color)'
        }}
      >
        {summaryState.generatedContent}
      </div>
      <button
        onClick={() => onUpdateStatus('selecting')}
        style={{ marginTop: '12px', padding: '8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
      >
        重新生成
      </button>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '400px',
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
          多 AI 对话综述
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {summaryState.status === 'reading' && renderReadingStatus()}
        {summaryState.status === 'selecting' && renderSelection()}
        {summaryState.status === 'generating' && renderGenerating()}
        {summaryState.status === 'completed' && renderCompleted()}
        {summaryState.status === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            点击底部「综述」按钮开始
          </div>
        )}
      </div>

      <style>{`
        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default SummaryPanel
