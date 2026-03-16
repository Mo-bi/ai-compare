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

    const queryText = store.inputText.trim()
    if (!queryText) return
    
    // 【记录提问】
    store.addUserQuery(store.activeWorkspaceId, queryText)

    store.setIsSending(true)
    store.setInputText('')

    for (const panel of enabledPanels) {
      const webviewRef = webviewRefs.current.get(panel.id)
      if (webviewRef?.sendMessage) {
        try {
          store.updatePanelGenerating(panel.id, true)
          await webviewRef.sendMessage(queryText)
        } catch (e) {
          console.error(`[App] Failed to send to ${panel.name}:`, e)
        }
      }
    }

    store.setIsSending(false)
  }, [store])

  const handleSummarize = useCallback(async () => {
    if (store.summaryState.status === 'reading' || store.summaryState.status === 'generating') return

    const enabledPanels = store.panels.filter(p => p.enabled)
    if (enabledPanels.length === 0) {
      store.setSummaryStatus('idle')
      alert('没有已启用的面板。')
      return
    }

    store.setShowSummary(true)
    store.setSummaryStatus('reading')
    store.setGeneratedContent('')

    // 【核心修复】重置面板状态，并确保 selectedPanelIds 为空（待读取成功后填充）
    store.setSelectedPanelIds([])
    
    // 初始化活跃面板的状态
    for (const panel of enabledPanels) {
      store.updatePanelSummaryStatus(panel.id, { status: 'pending', panelName: panel.name, history: [] })
    }

    const successfulIds: string[] = []

    // 并行读取历史
    await Promise.all(enabledPanels.map(async (panel) => {
      console.log(`[Summary] Attempting to read from panel: ${panel.name} (${panel.id})`)
      store.updatePanelSummaryStatus(panel.id, { status: 'reading' })
      
      const webviewRef = webviewRefs.current.get(panel.id)
      
      if (!webviewRef) {
        console.error(`[Summary] Ref not found for panel: ${panel.name} (${panel.id})`)
        store.updatePanelSummaryStatus(panel.id, { status: 'failed', error: '窗口引用丢失' })
        return
      }

      if (webviewRef.getHistory) {
        try {
          const history = await webviewRef.getHistory()
          
          // 检查是否包含系统级错误
          const firstMsg = history[0]
          if (firstMsg && firstMsg.role === 'system' && firstMsg.content.startsWith('ERR_EXTRACT')) {
            throw new Error(firstMsg.content)
          }

          if (history && history.length > 0) {
            store.updatePanelSummaryStatus(panel.id, { 
              status: 'success', 
              history: history.map((m: any) => ({ role: m.role, content: m.content })) 
            })
            successfulIds.push(panel.id)
          } else {
            store.updatePanelSummaryStatus(panel.id, { status: 'failed', error: '页面内未找到对话' })
          }
        } catch (e: any) {
          console.error(`[Summary] Script execution failed for ${panel.name}:`, e)
          store.updatePanelSummaryStatus(panel.id, { status: 'failed', error: '脚本执行异常' })
        }
      } else {
        console.error(`[Summary] getHistory method not found on ref for panel: ${panel.name}`)
        store.updatePanelSummaryStatus(panel.id, { status: 'failed', error: '接口未就绪' })
      }
    }))

    // 默认全选成功读取内容的活跃面板
    store.setSelectedPanelIds(successfulIds)
    store.setSummaryStatus('selecting')
  }, [store])

  const handleRunAPI = useCallback(async () => {
    const { summaryState, summaryPrompts, apiKey } = store
    const selectedPanels = store.panels.filter(p => summaryState.selectedPanelIds.includes(p.id))
    
    if (selectedPanels.length === 0) { alert('请先选择要综述的窗口'); return; }
    if (!apiKey) { alert('请先在设置中配置 API Key'); return; }

    store.setSummaryStatus('generating')
    store.setGeneratedContent('')

    let userQueriesText = ''
    if (summaryState.userQueries.length > 0) {
      userQueriesText = '【用户历次提问记录】\n' + 
        summaryState.userQueries.map((q, i) => `${i + 1}. ${q}`).join('\n') + '\n'
    }

    let chatHistoriesText = ''
    selectedPanels.forEach((panel) => {
      const status = summaryState.panelStatuses[panel.id]
      if (status && status.history && status.history.length > 0) {
        const validContent = status.history.map(m => m.content.trim()).filter(content => content.length >= 10).join('\n\n')
        if (validContent) {
          chatHistoriesText += `\n\n>>>>>>>>>> ${panel.name} 提取内容 <<<<<<<<<<\n`
          chatHistoriesText += validContent + '\n'
        }
      }
    })

    const fullPrompt = `${summaryState.customPromptContent}\n\n${userQueriesText}${chatHistoriesText}`
    
    const endpoints: Record<string, { url: string, model: string }> = {
      'deepseek': { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
      'kimi': { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
      'gemini': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-1.5-flash' },
      'doubao': { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'ep-xxx' },
      'minimax': { url: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'abab6.5-chat' }
    }

    const config = endpoints[summaryState.summaryModel] || endpoints['deepseek']
    let fullResult = ''
    let buffer = '' // 数据缓冲区

    // 监听流式块
    const removeChunkListener = window.electronAPI?.summary.onProxyChunk((rawChunk: string) => {
      buffer += rawChunk
      const lines = buffer.split('\n')

      // 最后一项可能是未完成的行，留回缓冲区
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const json = JSON.parse(data)
          const content = json.choices[0]?.delta?.content || ''
          if (content) {
            fullResult += content
            store.setGeneratedContent(fullResult)
          }
        } catch (e) {
          // 忽略单行解析错误
        }
      }
    })
    const removeErrorListener = window.electronAPI?.summary.onProxyError((err: string) => {
      store.setGeneratedContent(`❌ 生成失败: ${err}`)
      store.setSummaryStatus('completed')
      cleanup()
    })

    const removeEndListener = window.electronAPI?.summary.onProxyEnd(() => {
      store.setSummaryStatus('completed')
      cleanup()
    })

    const cleanup = () => {
      removeChunkListener?.()
      removeErrorListener?.()
      removeEndListener?.()
    }

    // 发起流式请求
    window.electronAPI?.summary.startProxyStream({
      url: config.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: {
        model: config.model,
        messages: [{ role: 'user', content: fullPrompt }],
      }
    })
  }, [store])

  const handleOneClickCopy = useCallback(() => {
    const { summaryState } = store
    const selectedPanels = store.panels.filter(p => summaryState.selectedPanelIds.includes(p.id))
    
    // 1. 构建用户提问部分（从系统记录中获取，100% 准确）
    let userQueriesText = ''
    if (summaryState.userQueries.length > 0) {
      userQueriesText = '【用户历次提问记录】\n' + 
        summaryState.userQueries.map((q, i) => `${i + 1}. ${q}`).join('\n') + '\n'
    }

    // 2. 构建各模型回答部分
    let chatHistoriesText = ''
    selectedPanels.forEach((panel) => {
      const status = summaryState.panelStatuses[panel.id]
      if (status && status.history && status.history.length > 0) {
        // 过滤并合并片段
        const validContent = status.history
          .map(m => m.content.trim())
          .filter(content => content.length >= 10) // 过滤掉太短的碎片
          .join('\n\n') // 用双换行连接段落

        if (validContent) {
          chatHistoriesText += `\n\n>>>>>>>>>> ${panel.name} 提取内容 <<<<<<<<<<\n`
          chatHistoriesText += validContent + '\n'
        }
      }
    })

    const fullContent = `${summaryState.customPromptContent}\n\n${userQueriesText}${chatHistoriesText}`
    console.log('[handleOneClickCopy] fullContent length:', fullContent.length);

    if (fullContent.trim() === '') {
      alert('没有可复制的内容。');
      return;
    }

    try {
      navigator.clipboard.writeText(fullContent).then(() => {
        alert('已复制到剪贴板，可直接粘贴到 AI 窗口。')
      }).catch(err => {
        console.error('Clipboard write error:', err);
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = fullContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        alert('已复制到剪贴板(Fallback)。')
      });
    } catch (e) {
        console.error('Clipboard api error:', e);
        alert('复制失败，请重试。')
    }
  }, [store])

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

        {/* 并排 WebView 面板 */}
        <PanelContainer
          workspaces={store.workspaces}
          activeWorkspaceId={store.activeWorkspaceId}
          onRemove={store.removePanel}
          onToggle={store.togglePanel}
          onLoadingChange={store.updatePanelLoading}
          onGeneratingChange={store.updatePanelGenerating}
          onPanelWidthChange={store.updatePanelWidth}
          webviewRefs={webviewRefs}
          maximizedPanelId={store.maximizedPanelId}
          onSetMaximized={store.setMaximizedPanelId}
        />

        {/* 综述侧边栏 */}
        {store.summaryState.show && (
          <SummaryPanel
            summaryState={store.summaryState}
            summaryPrompts={store.summaryPrompts}
            enabledPanelIds={store.panels.filter(p => p.enabled).map(p => p.id)}
            onClose={() => store.setShowSummary(false)}
            onUpdateStatus={store.setSummaryStatus}
            onUpdatePanelStatus={store.updatePanelSummaryStatus}
            onSetSelectedPanels={store.setSelectedPanelIds}
            onSetSelectedPrompt={store.setSelectedPromptId}
            onSetCustomPrompt={store.setCustomPromptContent}
            onSetGeneratedContent={store.setGeneratedContent}
            onSetSummaryModel={store.setSummaryModel}
            onAddPrompt={store.addSummaryPrompt}
            onRemovePrompt={store.removeSummaryPrompt}
            onUpdatePrompt={store.updateSummaryPrompt}
            onRunAPI={handleRunAPI}
            onCopy={handleOneClickCopy}
            onClearUserQueries={() => store.clearUserQueries(store.activeWorkspaceId)}
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
        summaryLoading={store.summaryState.status === 'reading' || store.summaryState.status === 'generating'}
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
          summaryModel={store.summaryState.summaryModel}
          onSaveApiKey={saveApiKey}
          onSaveSummaryModel={store.setSummaryModel}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
