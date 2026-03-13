import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useAppStore } from './store/appStore'
import PanelContainer from './components/PanelContainer'
import GlobalInput from './components/GlobalInput'
import SummaryPanel from './components/SummaryPanel'
import AddModelModal from './components/AddModelModal'
import SettingsPanel from './components/SettingsPanel'
import Toolbar from './components/Toolbar'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import { WebviewRef } from './components/WebviewPanel'

const electronAPI = (window as any).electronAPI

function App() {
  const store = useAppStore()
  const webviewRefs = useRef<Map<string, WebviewRef>>(new Map())
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (electronAPI?.password?.get) {
      electronAPI.password.get('openai-api-key').then((key: string | null) => {
        if (key) {
          store.setApiKey(key)
        }
      })
    }
  }, [])

  const saveApiKey = useCallback(async (key: string) => {
    store.setApiKey(key)
    if (electronAPI?.password?.set) {
      await electronAPI.password.set('openai-api-key', key)
    }
  }, [store])

  const handleSend = useCallback(async () => {
    if (!store.inputText.trim() || store.isSending) return

    const enabledPanels = store.panels.filter(p => p.enabled)
    if (enabledPanels.length === 0) {
      alert('请至少选择一个模型')
      return
    }

    store.setIsSending(true)
    store.setInputText('')

    for (const panel of enabledPanels) {
      const webviewRef = webviewRefs.current.get(panel.id)
      if (webviewRef?.sendMessage) {
        try {
          store.updatePanelGenerating(panel.id, true)
          await webviewRef.sendMessage(store.inputText)
        } catch (e) {
          console.error(`[App] Failed to send to ${panel.name}:`, e)
        }
      }
    }

    store.setIsSending(false)
  }, [store])

  const handleSummarize = useCallback(async () => {
    if (store.summaryLoading) return

    store.setShowSummary(true)
    store.setSummaryContent('正在收集聊天历史...')
    store.setSummaryLoading(true)

    try {
      const histories: Array<{panelName: string, messages: Array<{role: string, content: string}>}> = []

      for (const panel of store.panels) {
        const webviewRef = webviewRefs.current.get(panel.id)
        if (webviewRef?.getHistory) {
          try {
            const history = await webviewRef.getHistory()
            if (history && history.length > 0) {
              histories.push({
                panelName: panel.name,
                messages: history.map((m: any) => ({ role: m.role, content: m.content }))
              })
            }
          } catch (e) {
            console.error(`[App] Failed to get history from ${panel.name}:`, e)
          }
        }
      }

      if (histories.length === 0) {
        store.setSummaryContent('未找到任何聊天历史。\n\n请先在各个 AI 模型中进行对话，然后点击"综述"按钮。')
        return
      }

      if (store.apiKey) {
        store.setSummaryContent('正在调用 AI 生成综述...')
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.apiKey}`,
          },
          body: JSON.stringify({
            model: store.summaryModel,
            messages: [
              { role: 'system', content: '你是一个专业的 AI 回答分析助手，擅长对比和总结多个 AI 模型的回答。' },
              { role: 'user', content: `请对以下多个 AI 模型的回答进行综合分析，生成一份简洁的综述：\n\n${histories.map(h => `=== ${h.panelName} ===\n${h.messages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}`).join('\n\n')}` },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })

        const data = await response.json()
        const summary = data.choices?.[0]?.message?.content

        if (summary) {
          store.setSummaryContent(summary)
        } else {
          store.setSummaryContent(`❌ 综述生成失败\n\n错误信息：${JSON.stringify(data)}`)
        }
      } else {
        let text = '# AI 模型回答综述\n\n'
        text += `收集时间：${new Date().toLocaleString()}\n\n`
        text += `共收集 ${histories.length} 个模型的回答\n\n`
        text += '---\n\n'

        histories.forEach((h, i) => {
          text += `## ${i + 1}. ${h.panelName}\n\n`
          h.messages.forEach(m => {
            text += `**${m.role === 'user' ? '👤 用户' : '🤖 AI'}**：\n${m.content}\n\n`
          })
          text += '---\n\n'
        })

        text += '\n## 使用说明\n\n'
        text += '你可以将以上内容复制到任意 AI 模型中，让它帮你生成综合分析。\n\n'
        text += '建议提示词："请对以上多个 AI 模型的回答进行综合分析，总结共识和差异，并给出最佳建议。"'

        store.setSummaryContent(text)
      }
    } catch (e: any) {
      store.setSummaryContent(`❌ 综述生成失败\n\n错误信息：${e.message}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API 余额是否充足`)
    }

    store.setSummaryLoading(false)
  }, [store])

  const sortedWorkspaces = [...store.workspaces].sort((a, b) => a.order - b.order)

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* 顶部工具栏 */}
      <Toolbar
        panels={store.panels}
        onAddModel={() => store.setShowAddModal(true)}
        onSettings={() => setShowSettings(true)}
        onClearAll={() => {
          if (confirm('确定要清除所有面板吗？')) {
            store.setPanels([])
          }
        }}
        platform={electronAPI?.platform}
      />

      {/* 主内容区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* 左侧工作区导航 */}
        <WorkspaceSidebar
          workspaces={store.workspaces}
          activeWorkspaceId={store.activeWorkspaceId}
          onSelectWorkspace={store.setActiveWorkspaceId}
          onAddWorkspace={() => store.addWorkspace()}
          onRemoveWorkspace={store.removeWorkspace}
          onRenameWorkspace={store.renameWorkspace}
          onToggleFixed={store.toggleWorkspaceFixed}
          onMoveWorkspace={store.moveWorkspace}
          collapsed={store.sidebarCollapsed}
          onToggleCollapse={() => store.setSidebarCollapsed(!store.sidebarCollapsed)}
        />

        {/* 并排 WebView 面板 - 传递所有工作区的面板 */}
        <PanelContainer
          workspaces={store.workspaces}
          activeWorkspaceId={store.activeWorkspaceId}
          onRemove={store.removePanel}
          onToggle={store.togglePanel}
          onLoadingChange={store.updatePanelLoading}
          onGeneratingChange={store.updatePanelGenerating}
          onPanelWidthChange={store.updatePanelWidth}
          webviewRefs={webviewRefs}
        />

        {/* 综述侧边栏 */}
        {store.showSummary && (
          <SummaryPanel
            content={store.summaryContent}
            loading={store.summaryLoading}
            onClose={() => store.setShowSummary(false)}
            onCopy={() => {}}
          />
        )}
      </div>

      {/* 底部统一输入框 */}
      <GlobalInput
        panels={store.panels}
        inputText={store.inputText}
        isSending={store.isSending}
        onInputChange={store.setInputText}
        onSend={handleSend}
        onSummarize={handleSummarize}
        summaryLoading={store.summaryLoading}
      />

      {/* 添加模型弹窗 */}
      {store.showAddModal && (
        <AddModelModal
          existingPanels={store.panels}
          onAdd={store.addPanel}
          onClose={() => store.setShowAddModal(false)}
        />
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsPanel
          apiKey={store.apiKey}
          summaryModel={store.summaryModel}
          onSaveApiKey={saveApiKey}
          onSaveSummaryModel={store.setSummaryModel}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
