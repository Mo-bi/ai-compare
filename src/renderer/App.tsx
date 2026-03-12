import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useAppStore } from './store/appStore'
import PanelContainer from './components/PanelContainer'
import GlobalInput from './components/GlobalInput'
import SummaryPanel from './components/SummaryPanel'
import AddModelModal from './components/AddModelModal'
import SettingsPanel from './components/SettingsPanel'
import Toolbar from './components/Toolbar'
import { WebviewRef } from './components/WebviewPanel'

// 获取 Electron API（如果在 Electron 环境中）
const electronAPI = (window as any).electronAPI

function App() {
  const store = useAppStore()
  const webviewRefs = useRef<Map<string, WebviewRef>>(new Map())
  const [showSettings, setShowSettings] = useState(false)

  // 从 macOS 钥匙串加载 API Key
  useEffect(() => {
    if (electronAPI?.password?.get) {
      electronAPI.password.get('openai-api-key').then((key: string | null) => {
        if (key) {
          store.setApiKey(key)
        }
      })
    }
  }, [])

  // 保存 API Key 到 macOS 钥匙串
  const saveApiKey = useCallback(async (key: string) => {
    store.setApiKey(key)
    if (electronAPI?.password?.set) {
      await electronAPI.password.set('openai-api-key', key)
    }
  }, [store])

  // ============================================================
  // 同步发送消息到所有启用的面板
  // ============================================================
  const handleSend = useCallback(async () => {
    if (!store.inputText.trim() || store.isSending) return
    
    const enabledPanels = store.panels.filter(p => p.enabled)
    if (enabledPanels.length === 0) return

    const text = store.inputText.trim()
    store.setIsSending(true)

    // 并行发送到所有启用的面板
    const sendPromises = enabledPanels.map(async (panel) => {
      const ref = webviewRefs.current.get(panel.id)
      if (!ref) {
        console.warn(`[App] 找不到面板 ${panel.id} 的 webview ref`)
        return
      }
      try {
        const success = await ref.sendMessage(text)
        if (!success) {
          console.warn(`[App] 发送到 ${panel.name} 失败`)
        }
      } catch (e) {
        console.error(`[App] 发送到 ${panel.name} 出错:`, e)
      }
    })

    await Promise.all(sendPromises)
    
    store.setInputText('')
    store.setIsSending(false)
  }, [store])

  // ============================================================
  // 综述功能：读取所有面板聊天历史 + 调用 API 生成综述
  // ============================================================
  const handleSummarize = useCallback(async () => {
    if (store.summaryLoading || store.panels.length === 0) return
    
    store.setSummaryLoading(true)
    store.setShowSummary(true)
    store.setSummaryContent('')

    try {
      // 1. 从所有面板读取聊天历史
      const allHistories: Array<{
        panelName: string
        aiId: string
        messages: Array<{role: string, content: string}>
      }> = []

      for (const panel of store.panels) {
        const ref = webviewRefs.current.get(panel.id)
        if (!ref) continue
        
        try {
          const messages = await ref.getHistory()
          if (messages && messages.length > 0) {
            allHistories.push({
              panelName: panel.name,
              aiId: panel.aiId,
              messages,
            })
          }
        } catch (e) {
          console.error(`[App] 读取 ${panel.name} 历史失败:`, e)
        }
      }

      if (allHistories.length === 0) {
        store.setSummaryContent('⚠️ 未能读取到任何聊天历史。\n\n可能的原因：\n1. 各 AI 窗口还没有进行对话\n2. 页面结构已更新，需要适配新的 DOM 选择器\n\n建议手动复制各窗口的回复内容，粘贴到另一个 AI 窗口中进行综述。')
        store.setSummaryLoading(false)
        return
      }

      // 2. 构建综述 Prompt
      let prompt = `你是一个专业的 AI 回复分析师。以下是我向多个 AI 模型提问后，各模型的回复内容。请对这些回复进行综合分析和综述。\n\n`
      
      for (const history of allHistories) {
        prompt += `## ${history.panelName} 的回复\n\n`
        const lastUserMsg = [...history.messages].reverse().find(m => m.role === 'user')
        const lastAiMsg = [...history.messages].reverse().find(m => m.role === 'assistant')
        
        if (lastUserMsg) {
          prompt += `**问题：** ${lastUserMsg.content.slice(0, 500)}\n\n`
        }
        if (lastAiMsg) {
          prompt += `**${history.panelName} 回复：**\n${lastAiMsg.content.slice(0, 2000)}\n\n`
        }
        prompt += '---\n\n'
      }

      prompt += `\n请从以下几个维度进行综合分析：\n`
      prompt += `1. **共同观点**：各模型都认同的核心内容\n`
      prompt += `2. **差异与亮点**：各模型独特的见解或不同的侧重点\n`
      prompt += `3. **质量评估**：哪个回复最全面、最准确、最实用\n`
      prompt += `4. **综合结论**：综合所有回复，给出最终的综合答案\n`

      // 3. 调用 API 生成综述
      if (!store.apiKey) {
        // 没有 API Key，直接展示整理后的历史
        let content = '# 各模型回复汇总\n\n'
        content += '> ⚠️ 未设置 API Key，无法自动生成综述。以下是各模型的最新回复汇总。\n\n'
        content += '> 请在设置中配置 API Key 以启用自动综述功能。\n\n'
        
        for (const history of allHistories) {
          content += `## ${history.panelName}\n\n`
          const lastAiMsg = [...history.messages].reverse().find(m => m.role === 'assistant')
          if (lastAiMsg) {
            content += lastAiMsg.content.slice(0, 3000)
          } else {
            content += '*（未找到回复内容）*'
          }
          content += '\n\n---\n\n'
        }
        
        store.setSummaryContent(content)
        store.setSummaryLoading(false)
        return
      }

      // 调用 OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${store.apiKey}`,
        },
        body: JSON.stringify({
          model: store.summaryModel,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的 AI 回复分析师，擅长对比和综述多个 AI 模型的回复。请用中文回复，格式清晰，使用 Markdown。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${response.status} ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const summaryText = data.choices?.[0]?.message?.content || '综述生成失败'
      
      // 添加来源信息
      const header = `# AI 综合综述\n\n> 基于 ${allHistories.map(h => h.panelName).join('、')} 的回复生成\n\n---\n\n`
      store.setSummaryContent(header + summaryText)

    } catch (e: any) {
      console.error('[App] 综述失败:', e)
      store.setSummaryContent(`❌ 综述生成失败\n\n错误信息：${e.message}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API 余额是否充足`)
    }

    store.setSummaryLoading(false)
  }, [store])

  // ============================================================
  // 渲染
  // ============================================================
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

      {/* 主内容区：并排 WebView 面板 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <PanelContainer
          panels={store.panels}
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
          onSaveSummaryModel={store.saveSummaryModel}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
