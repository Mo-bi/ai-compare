import { useState, useCallback, useRef } from 'react'

export interface AIPanel {
  id: string           // 唯一 ID（如 'chatgpt-1'）
  aiId: string         // AI 类型 ID（如 'chatgpt'）
  name: string         // 显示名称
  url: string          // 加载的 URL
  icon: string         // 图标 emoji
  color: string        // 主题色
  width: number        // 面板宽度（px）
  enabled: boolean     // 是否启用（发送时是否包含）
  loading: boolean     // 是否正在加载
  generating: boolean  // 是否正在生成回复
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  aiId: string
  timestamp: number
}

export interface AppState {
  panels: AIPanel[]
  inputText: string
  isSending: boolean
  showSummary: boolean
  summaryContent: string
  summaryLoading: boolean
  showAddModal: boolean
  apiKey: string
  summaryModel: string
}

// AI 配置定义（与主进程共享，这里是渲染进程版本）
export const AI_PRESETS = [
  // 海外模型
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', icon: '✨', color: '#4285f4' },
  // 国内模型
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: '🔍', color: '#4d6bfe' },
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/chat/', icon: '🫘', color: '#1664ff' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn', icon: '🌙', color: '#ff6600' },
  { id: 'qwen', name: '通义千问', url: 'https://tongyi.aliyun.com/qianwen/', icon: '🌊', color: '#ff6a00' },
  { id: 'yuanbao', name: '腾讯元宝', url: 'https://yuanbao.tencent.com/chat', icon: '💎', color: '#07c160' },
  { id: 'yiyan', name: '文心一言', url: 'https://yiyan.baidu.com/', icon: '📖', color: '#2932e1' },
  { id: 'chatglm', name: '智谱清言', url: 'https://chatglm.cn/', icon: '🌸', color: '#de3a3a' },
  { id: 'minimax', name: 'MiniMax', url: 'https://www.minimaxi.com/', icon: '🎯', color: '#ff6b35' },
]

const DEFAULT_PANEL_WIDTH = 480

let panelCounter = 0
function createPanelId(aiId: string) {
  return `${aiId}-${++panelCounter}`
}

export function useAppStore() {
  const [panels, setPanels] = useState<AIPanel[]>([
    {
      id: createPanelId('doubao'),
      aiId: 'doubao',
      name: '豆包',
      url: 'https://www.doubao.com/chat/',
      icon: '🫘',
      color: '#1664ff',
      width: DEFAULT_PANEL_WIDTH,
      enabled: true,
      loading: true,
      generating: false,
    },
    {
      id: createPanelId('kimi'),
      aiId: 'kimi',
      name: 'Kimi',
      url: 'https://kimi.moonshot.cn',
      icon: '🌙',
      color: '#ff6600',
      width: DEFAULT_PANEL_WIDTH,
      enabled: true,
      loading: true,
      generating: false,
    },
    {
      id: createPanelId('chatglm'),
      aiId: 'chatglm',
      name: '智谱清言',
      url: 'https://chatglm.cn/',
      icon: '🌸',
      color: '#de3a3a',
      width: DEFAULT_PANEL_WIDTH,
      enabled: true,
      loading: true,
      generating: false,
    },
    {
      id: createPanelId('yuanbao'),
      aiId: 'yuanbao',
      name: '腾讯元宝',
      url: 'https://yuanbao.tencent.com/chat',
      icon: '💎',
      color: '#07c160',
      width: DEFAULT_PANEL_WIDTH,
      enabled: true,
      loading: true,
      generating: false,
    },
  ])

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryContent, setSummaryContent] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '')
  const [summaryModel, setSummaryModel] = useState(() => localStorage.getItem('summary_model') || 'gpt-4o-mini')

  // 添加面板
  const addPanel = useCallback((aiId: string) => {
    const preset = AI_PRESETS.find(p => p.id === aiId)
    if (!preset) return
    
    setPanels(prev => [...prev, {
      id: createPanelId(aiId),
      aiId,
      name: preset.name,
      url: preset.url,
      icon: preset.icon,
      color: preset.color,
      width: DEFAULT_PANEL_WIDTH,
      enabled: true,
      loading: true,
      generating: false,
    }])
  }, [])

  // 移除面板
  const removePanel = useCallback((panelId: string) => {
    setPanels(prev => prev.filter(p => p.id !== panelId))
  }, [])

  // 切换面板启用状态
  const togglePanel = useCallback((panelId: string) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, enabled: !p.enabled } : p
    ))
  }, [])

  // 更新面板宽度
  const updatePanelWidth = useCallback((panelId: string, width: number) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, width: Math.max(320, width) } : p
    ))
  }, [])

  // 更新面板加载状态
  const updatePanelLoading = useCallback((panelId: string, loading: boolean) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, loading } : p
    ))
  }, [])

  // 更新面板生成状态
  const updatePanelGenerating = useCallback((panelId: string, generating: boolean) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, generating } : p
    ))
  }, [])

  // 保存 API Key
  const saveApiKey = useCallback((key: string) => {
    setApiKey(key)
    localStorage.setItem('openai_api_key', key)
  }, [])

  // 保存综述模型
  const saveSummaryModel = useCallback((model: string) => {
    setSummaryModel(model)
    localStorage.setItem('summary_model', model)
  }, [])

  return {
    panels,
    inputText,
    isSending,
    showSummary,
    summaryContent,
    summaryLoading,
    showAddModal,
    apiKey,
    summaryModel,
    // Actions
    setPanels,
    setInputText,
    setIsSending,
    setShowSummary,
    setSummaryContent,
    setSummaryLoading,
    setShowAddModal,
    addPanel,
    removePanel,
    togglePanel,
    updatePanelWidth,
    updatePanelLoading,
    updatePanelGenerating,
    saveApiKey,
    saveSummaryModel,
  }
}
