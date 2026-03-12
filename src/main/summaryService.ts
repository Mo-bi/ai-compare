import { ipcMain, BrowserWindow } from 'electron'

// 简单的综述提示词模板
const SUMMARY_PROMPT = `请对以下多个 AI 模型的回答进行综合分析，生成一份简洁的综述：

{chatHistories}

请从以下几个方面进行综述：
1. 各模型的主要观点总结
2. 不同模型之间的共识和差异
3. 最全面/最准确的回答
4. 建议采纳的方案

请用中文输出，保持简洁明了。`

export interface ChatMessage {
  role: string
  content: string
}

export interface PanelHistory {
  panelName: string
  messages: ChatMessage[]
}

export function setupSummaryService() {
  // 收集所有面板的聊天历史
  ipcMain.handle('collect-all-histories', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow) return []

    try {
      // 通过 IPC 向渲染进程请求所有面板的历史记录
      const histories = await mainWindow.webContents.executeJavaScript(`
        (async () => {
          const results = []
          // 获取所有启用的面板历史
          const panels = window.__AI_COMPARE_WEBVIEW_REFS__ || new Map()
          for (const [panelId, ref] of panels.entries()) {
            try {
              const history = await ref.getHistory()
              if (history && history.length > 0) {
                results.push({
                  panelId,
                  history
                })
              }
            } catch (e) {
              console.error('Failed to get history for', panelId, e)
            }
          }
          return results
        })()
      `)
      return histories
    } catch (error) {
      console.error('[SummaryService] Failed to collect histories:', error)
      return []
    }
  })

  // 生成综述文本（本地拼接，不调用 API）
  ipcMain.handle('generate-summary-text', async (_event, histories: PanelHistory[]) => {
    if (!histories || histories.length === 0) {
      return '没有收集到任何聊天历史。'
    }

    let text = '# AI 模型回答综述\n\n'
    text += `收集时间：${new Date().toLocaleString()}\n\n`
    text += `共收集 ${histories.length} 个模型的回答\n\n`
    text += '---\n\n'

    histories.forEach((panel, index) => {
      text += `## ${index + 1}. ${panel.panelName}\n\n`
      
      if (!panel.messages || panel.messages.length === 0) {
        text += '*暂无聊天记录*\n\n'
      } else {
        panel.messages.forEach((msg, msgIndex) => {
          const role = msg.role === 'user' ? '👤 用户' : '🤖 AI'
          text += `**${role}**：\n${msg.content}\n\n`
        })
      }
      
      text += '---\n\n'
    })

    text += '\n## 使用说明\n\n'
    text += '你可以将以上内容复制到任意 AI 模型（如 ChatGPT、Claude 等）中，让它帮你生成综合分析。\n\n'
    text += '建议提示词："请对以上多个 AI 模型的回答进行综合分析，总结共识和差异，并给出最佳建议。"'

    return text
  })

  // 调用外部 API 生成综述（需要配置 API Key）
  ipcMain.handle('generate-summary-with-api', async (_event, params: {
    histories: PanelHistory[]
    apiKey: string
    apiUrl?: string
    model?: string
  }) => {
    const { histories, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-4o-mini' } = params

    if (!histories || histories.length === 0) {
      return { success: false, error: '没有收集到任何聊天历史' }
    }

    if (!apiKey) {
      return { success: false, error: '未配置 API Key' }
    }

    try {
      // 构建聊天历史文本
      let chatHistoriesText = ''
      histories.forEach((panel, index) => {
        chatHistoriesText += `\n=== ${panel.panelName} ===\n`
        if (panel.messages && panel.messages.length > 0) {
          panel.messages.forEach(msg => {
            const role = msg.role === 'user' ? '用户' : 'AI'
            chatHistoriesText += `${role}: ${msg.content}\n`
          })
        } else {
          chatHistoriesText += '(暂无聊天记录)\n'
        }
      })

      const prompt = SUMMARY_PROMPT.replace('{chatHistories}', chatHistoriesText)

      // 调用 API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: '你是一个专业的 AI 回答分析助手，擅长对比和总结多个 AI 模型的回答。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `API 调用失败: ${error}` }
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      const summary = data.choices?.[0]?.message?.content

      if (summary) {
        return { success: true, summary }
      } else {
        return { success: false, error: 'API 返回结果为空' }
      }
    } catch (error) {
      console.error('[SummaryService] API call failed:', error)
      return { success: false, error: String(error) }
    }
  })
}
