import { useState, useCallback, useEffect } from 'react'

export interface AIPanel {
  id: string
  aiId: string
  name: string
  url: string
  icon: string
  color: string
  width: number
  enabled: boolean
  loading: boolean
  generating: boolean
}

export interface Workspace {
  id: string
  name: string
  panels: AIPanel[]
  isFixed: boolean
  order: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  aiId: string
  timestamp: number
}

export const AI_PRESETS = [
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', icon: '✨', color: '#4285f4' },
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
let workspaceCounter = 0

function createPanelId(aiId: string) {
  return `${aiId}-${++panelCounter}`
}

function createWorkspaceId() {
  return `workspace-${++workspaceCounter}`
}

function createDefaultPanels(): AIPanel[] {
  return [
    { id: createPanelId('doubao'), aiId: 'doubao', name: '豆包', url: 'https://www.doubao.com/chat/', icon: '🫘', color: '#1664ff', width: DEFAULT_PANEL_WIDTH, enabled: true, loading: true, generating: false },
    { id: createPanelId('kimi'), aiId: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn', icon: '🌙', color: '#ff6600', width: DEFAULT_PANEL_WIDTH, enabled: true, loading: true, generating: false },
    { id: createPanelId('chatglm'), aiId: 'chatglm', name: '智谱清言', url: 'https://chatglm.cn/', icon: '🌸', color: '#de3a3a', width: DEFAULT_PANEL_WIDTH, enabled: true, loading: true, generating: false },
    { id: createPanelId('yuanbao'), aiId: 'yuanbao', name: '腾讯元宝', url: 'https://yuanbao.tencent.com/chat', icon: '💎', color: '#07c160', width: DEFAULT_PANEL_WIDTH, enabled: true, loading: true, generating: false },
  ]
}

function loadFromLocalStorage(): { workspaces: Workspace[], activeWorkspaceId: string, sidebarCollapsed: boolean } {
  try {
    const saved = localStorage.getItem('ai-compare-workspaces')
    if (saved) {
      const data = JSON.parse(saved)
      return {
        workspaces: data.workspaces || [],
        activeWorkspaceId: data.activeWorkspaceId || '',
        sidebarCollapsed: data.sidebarCollapsed || false
      }
    }
  } catch (e) {
    console.error('Failed to load workspaces from localStorage:', e)
  }
  return { workspaces: [], activeWorkspaceId: '', sidebarCollapsed: false }
}

function saveToLocalStorage(workspaces: Workspace[], activeWorkspaceId: string, sidebarCollapsed: boolean) {
  try {
    localStorage.setItem('ai-compare-workspaces', JSON.stringify({
      workspaces,
      activeWorkspaceId,
      sidebarCollapsed
    }))
  } catch (e) {
    console.error('Failed to save workspaces to localStorage:', e)
  }
}

export function useAppStore() {
  const savedData = loadFromLocalStorage()
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    if (savedData.workspaces.length > 0) {
      workspaceCounter = Math.max(...savedData.workspaces.map(w => {
        const match = w.id.match(/workspace-(\d+)/)
        return match ? parseInt(match[1]) : 0
      }))
      panelCounter = Math.max(...savedData.workspaces.flatMap(w => 
        w.panels.map(p => {
          const match = p.id.match(/-(\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
      ))
      return savedData.workspaces
    }
    const defaultWorkspace: Workspace = {
      id: createWorkspaceId(),
      name: '工作区 1',
      panels: createDefaultPanels(),
      isFixed: true,
      order: 0
    }
    return [defaultWorkspace]
  })
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    if (savedData.activeWorkspaceId && savedData.workspaces.find(w => w.id === savedData.activeWorkspaceId)) {
      return savedData.activeWorkspaceId
    }
    return workspaces[0]?.id || ''
  })
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(savedData.sidebarCollapsed)
  
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryContent, setSummaryContent] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '')
  const [summaryModel, setSummaryModel] = useState(() => localStorage.getItem('summary_model') || 'gpt-4o-mini')

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const panels = activeWorkspace?.panels || []

  useEffect(() => {
    saveToLocalStorage(workspaces, activeWorkspaceId, sidebarCollapsed)
  }, [workspaces, activeWorkspaceId, sidebarCollapsed])

  const updatePanelsInWorkspace = useCallback((workspaceId: string, updater: (panels: AIPanel[]) => AIPanel[]) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId ? { ...w, panels: updater(w.panels) } : w
    ))
  }, [])

  const addPanel = useCallback((aiId: string) => {
    if (!activeWorkspaceId) return
    const preset = AI_PRESETS.find(p => p.id === aiId)
    if (!preset) return
    
    updatePanelsInWorkspace(activeWorkspaceId, prev => [...prev, {
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
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const removePanel = useCallback((panelId: string) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, prev => prev.filter(p => p.id !== panelId))
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const togglePanel = useCallback((panelId: string) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, prev => prev.map(p => 
      p.id === panelId ? { ...p, enabled: !p.enabled } : p
    ))
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const updatePanelWidth = useCallback((panelId: string, width: number) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, prev => prev.map(p => 
      p.id === panelId ? { ...p, width } : p
    ))
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const updatePanelLoading = useCallback((panelId: string, loading: boolean) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, prev => prev.map(p => 
      p.id === panelId ? { ...p, loading } : p
    ))
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const updatePanelGenerating = useCallback((panelId: string, generating: boolean) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, prev => prev.map(p => 
      p.id === panelId ? { ...p, generating } : p
    ))
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  const addWorkspace = useCallback((name?: string) => {
    const newWorkspace: Workspace = {
      id: createWorkspaceId(),
      name: name || `工作区 ${workspaces.length + 1}`,
      panels: createDefaultPanels(),
      isFixed: false,
      order: workspaces.length
    }
    setWorkspaces(prev => [...prev, newWorkspace])
    setActiveWorkspaceId(newWorkspace.id)
  }, [workspaces.length])

  const removeWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces(prev => {
      const workspace = prev.find(w => w.id === workspaceId)
      if (workspace?.isFixed) return prev
      const filtered = prev.filter(w => w.id !== workspaceId)
      if (activeWorkspaceId === workspaceId && filtered.length > 0) {
        setActiveWorkspaceId(filtered[0].id)
      }
      return filtered
    })
  }, [activeWorkspaceId])

  const renameWorkspace = useCallback((workspaceId: string, name: string) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId ? { ...w, name } : w
    ))
  }, [])

  const toggleWorkspaceFixed = useCallback((workspaceId: string) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId ? { ...w, isFixed: !w.isFixed } : w
    ))
  }, [])

  const moveWorkspace = useCallback((workspaceId: string, direction: 'up' | 'down') => {
    setWorkspaces(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex(w => w.id === workspaceId)
      if (index === -1) return prev
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= sorted.length) return prev
      const temp = sorted[index].order
      sorted[index].order = sorted[newIndex].order
      sorted[newIndex].order = temp
      return sorted
    })
  }, [])

  const setPanels = useCallback((newPanels: AIPanel[]) => {
    if (!activeWorkspaceId) return
    updatePanelsInWorkspace(activeWorkspaceId, () => newPanels)
  }, [activeWorkspaceId, updatePanelsInWorkspace])

  return {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    panels,
    setPanels,
    inputText,
    setInputText,
    isSending,
    setIsSending,
    showSummary,
    setShowSummary,
    summaryContent,
    setSummaryContent,
    summaryLoading,
    setSummaryLoading,
    showAddModal,
    setShowAddModal,
    apiKey,
    setApiKey,
    summaryModel,
    setSummaryModel: useCallback((model: string) => {
      setSummaryModel(model)
      localStorage.setItem('summary_model', model)
    }, []),
    saveApiKey: useCallback((key: string) => {
      setApiKey(key)
      localStorage.setItem('openai_api_key', key)
    }, []),
    addPanel,
    removePanel,
    togglePanel,
    updatePanelWidth,
    updatePanelLoading,
    updatePanelGenerating,
    addWorkspace,
    removeWorkspace,
    renameWorkspace,
    toggleWorkspaceFixed,
    moveWorkspace,
    sidebarCollapsed,
    setSidebarCollapsed,
  }
}
