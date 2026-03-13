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

export interface PanelSummaryStatus {
  status: 'pending' | 'reading' | 'success' | 'failed'
  error?: string
  panelName: string
  history?: Array<{ role: string, content: string }>
}

export interface SummaryPrompt {
  id: string
  name: string
  content: string
}

export interface SummaryState {
  show: boolean
  status: 'idle' | 'reading' | 'selecting' | 'generating' | 'completed'
  panelStatuses: Record<string, PanelSummaryStatus>
  selectedPanelIds: string[]
  selectedPromptId: string
  customPromptContent: string
  generatedContent: string
  summaryModel: string
  userQueries: string[] // 【新增】存储用户发送过的全局提问
  loading: boolean
}

export interface Workspace {
  id: string
  name: string
  panels: AIPanel[]
  isFixed: boolean
  order: number
  summaryState: SummaryState
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  aiId: string
  timestamp: number
}
const DEFAULT_SUMMARY_PROMPT = `# Role: 高级 AI 智库综述专家
# Task: 多模型对话深度整合与对比分析

## 核心目标
你将收到用户针对同一主题的历次提问记录，以及多个不同 AI 模型（如 DeepSeek, Kimi, Claude 等）给出的回答。你的任务是站在专家的视角，对这些信息进行去重、互补整合、冲突识别，并最终输出一份高价值的综合报告。

## 处理原则
1. **智能识别核心**：忽略内容中由于网页提取产生的 UI 碎片（如“复制”、“分享”等）。
2. **多维对比**：分析不同模型在回答深度、准确性、逻辑性上的差异。
3. **互补整合**：如果模型 A 侧重理论，模型 B 侧重代码，请将它们完美融合。
4. **保留独到见解**：对于某个模型提出的独特视角或罕见案例，必须重点保留。
5. **精简化处理**：删除各模型重复的背景介绍和客套话，直接进入干货。

## 输出结构 (Markdown)
### 📋 提问背景回顾
*(简要概括用户的核心需求)*

### ✅ 核心共识综述
*(提取所有模型都认可的重点，作为基础事实)*

### 🔍 差异化亮点与对比
- **模型 A (名称)**：其独特的见解或优势。
- **模型 B (名称)**：其提供的补充信息或不同维度的分析。
- **关键分歧**：若有矛盾点，请客观列出。

### 🚀 终极综合建议/方案
*(基于上述所有信息，提炼出一个最完整、最可执行的终结版答案)*

---
待处理的内容如下：`

export const INITIAL_PROMPTS: SummaryPrompt[] = [
  { id: 'default', name: '系统默认综述模板', content: DEFAULT_SUMMARY_PROMPT }
]

export const SUMMARY_MODELS = [
  { id: 'kimi', name: 'Kimi' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'doubao', name: '豆包' }
]

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

function createDefaultSummaryState(): SummaryState {
  return {
    show: false,
    status: 'idle',
    panelStatuses: {},
    selectedPanelIds: [],
    selectedPromptId: 'default',
    customPromptContent: '',
    generatedContent: '',
    summaryModel: 'deepseek',
    userQueries: [], // 初始化提问历史
    loading: false
  }
}

function createDefaultWorkspace(index: number): Workspace {
  return {
    id: createWorkspaceId(),
    name: `工作区 ${index}`,
    panels: createDefaultPanels(),
    isFixed: true,
    order: index - 1,
    summaryState: createDefaultSummaryState()
  }
}

function loadFromLocalStorage(): { workspaces: Workspace[], activeWorkspaceId: string, sidebarCollapsed: boolean, summaryPrompts: SummaryPrompt[] } {
  try {
    const saved = localStorage.getItem('ai-compare-workspaces')
    const savedPrompts = localStorage.getItem('ai-compare-summary-prompts')
    let summaryPrompts = INITIAL_PROMPTS
    if (savedPrompts) {
      const parsed = JSON.parse(savedPrompts)
      // 【强制更新】如果本地存储包含 default 模板，用最新的 INITIAL_PROMPTS 里的替换它
      summaryPrompts = parsed.map((p: SummaryPrompt) => 
        p.id === 'default' ? INITIAL_PROMPTS[0] : p
      )
      // 如果本地没有 default，补上它
      if (!summaryPrompts.some(p => p.id === 'default')) {
        summaryPrompts = [INITIAL_PROMPTS[0], ...summaryPrompts]
      }
    }

    if (saved) {
      const data = JSON.parse(saved)
      const workspaces = (data.workspaces || []).map((w: any) => ({
        ...w,
        summaryState: w.summaryState || createDefaultSummaryState()
      }))
      return {
        workspaces,
        activeWorkspaceId: data.activeWorkspaceId || '',
        sidebarCollapsed: data.sidebarCollapsed || false,
        summaryPrompts
      }
    }
  } catch (e) {
    console.error('Failed to load workspaces from localStorage:', e)
  }
  return { workspaces: [], activeWorkspaceId: '', sidebarCollapsed: false, summaryPrompts: INITIAL_PROMPTS }
}

function saveToLocalStorage(workspaces: Workspace[], activeWorkspaceId: string, sidebarCollapsed: boolean, summaryPrompts: SummaryPrompt[]) {
  try {
    localStorage.setItem('ai-compare-workspaces', JSON.stringify({
      workspaces,
      activeWorkspaceId,
      sidebarCollapsed
    }))
    localStorage.setItem('ai-compare-summary-prompts', JSON.stringify(summaryPrompts))
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
    return [createDefaultWorkspace(1)]
  })
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    if (savedData.activeWorkspaceId && savedData.workspaces.find(w => w.id === savedData.activeWorkspaceId)) {
      return savedData.activeWorkspaceId
    }
    return workspaces[0]?.id || ''
  })
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(savedData.sidebarCollapsed)
  const [summaryPrompts, setSummaryPrompts] = useState<SummaryPrompt[]>(INITIAL_PROMPTS)
  
  // 【新增】从磁盘加载持久化模板
  useEffect(() => {
    const loadDiskPrompts = async () => {
      try {
        const diskPrompts = await window.electronAPI?.summary.loadPrompts()
        if (diskPrompts && diskPrompts.length > 0) {
          // 合并：强制用 INITIAL_PROMPTS 更新 default，其余保留用户的
          const merged = diskPrompts.map((p: SummaryPrompt) => 
            p.id === 'default' ? INITIAL_PROMPTS[0] : p
          )
          if (!merged.find((p: SummaryPrompt) => p.id === 'default')) {
            merged.unshift(INITIAL_PROMPTS[0])
          }
          setSummaryPrompts(merged)
        }
      } catch (e) {
        console.error('Failed to load prompts from disk:', e)
      }
    }
    loadDiskPrompts()
  }, [])

  // 【新增】当模板变化时自动同步到磁盘
  useEffect(() => {
    if (summaryPrompts.length > 0) {
      window.electronAPI?.summary.savePrompts(summaryPrompts)
    }
  }, [summaryPrompts])
  
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '')

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const panels = activeWorkspace?.panels || []
  const summaryState = activeWorkspace?.summaryState || createDefaultSummaryState()

  useEffect(() => {
    saveToLocalStorage(workspaces, activeWorkspaceId, sidebarCollapsed, summaryPrompts)
  }, [workspaces, activeWorkspaceId, sidebarCollapsed, summaryPrompts])

  const updateWorkspace = useCallback((workspaceId: string, updater: (w: Workspace) => Workspace) => {
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? updater(w) : w))
  }, [])

  const updateSummaryState = useCallback((workspaceId: string, updater: (s: SummaryState) => Partial<SummaryState>) => {
    updateWorkspace(workspaceId, w => ({
      ...w,
      summaryState: { ...w.summaryState, ...updater(w.summaryState) }
    }))
  }, [updateWorkspace])

  const addPanel = useCallback((aiId: string) => {
    if (!activeWorkspaceId) return
    const preset = AI_PRESETS.find(p => p.id === aiId)
    if (!preset) return
    
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: [...w.panels, {
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
      }]
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const removePanel = useCallback((panelId: string) => {
    if (!activeWorkspaceId) return
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: w.panels.filter(p => p.id !== panelId)
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const togglePanel = useCallback((panelId: string) => {
    if (!activeWorkspaceId) return
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: w.panels.map(p => p.id === panelId ? { ...p, enabled: !p.enabled } : p)
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const updatePanelWidth = useCallback((panelId: string, width: number) => {
    if (!activeWorkspaceId) return
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: w.panels.map(p => p.id === panelId ? { ...p, width } : p)
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const updatePanelLoading = useCallback((panelId: string, loading: boolean) => {
    if (!activeWorkspaceId) return
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: w.panels.map(p => p.id === panelId ? { ...p, loading } : p)
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const updatePanelGenerating = useCallback((panelId: string, generating: boolean) => {
    if (!activeWorkspaceId) return
    updateWorkspace(activeWorkspaceId, w => ({
      ...w,
      panels: w.panels.map(p => p.id === panelId ? { ...p, generating } : p)
    }))
  }, [activeWorkspaceId, updateWorkspace])

  const addWorkspace = useCallback((name?: string) => {
    const newWorkspace = createDefaultWorkspace(workspaces.length + 1)
    if (name) newWorkspace.name = name
    newWorkspace.isFixed = false
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
    updateWorkspace(workspaceId, w => ({ ...w, name }))
  }, [updateWorkspace])

  const toggleWorkspaceFixed = useCallback((workspaceId: string) => {
    updateWorkspace(workspaceId, w => ({ ...w, isFixed: !w.isFixed }))
  }, [updateWorkspace])

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
    updateWorkspace(activeWorkspaceId, w => ({ ...w, panels: newPanels }))
  }, [activeWorkspaceId, updateWorkspace])

  // Summary related methods
  const setShowSummary = useCallback((show: boolean) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ show }))
  }, [activeWorkspaceId, updateSummaryState])

  const setSummaryStatus = useCallback((status: SummaryState['status']) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ status }))
  }, [activeWorkspaceId, updateSummaryState])

  const updatePanelSummaryStatus = useCallback((panelId: string, status: Partial<PanelSummaryStatus>) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, s => ({
      panelStatuses: {
        ...s.panelStatuses,
        [panelId]: { ...(s.panelStatuses[panelId] || { status: 'pending', panelName: '' }), ...status }
      }
    }))
  }, [activeWorkspaceId, updateSummaryState])

  const setSelectedPanelIds = useCallback((ids: string[]) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ selectedPanelIds: ids }))
  }, [activeWorkspaceId, updateSummaryState])

  const setSelectedPromptId = useCallback((id: string) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ selectedPromptId: id }))
  }, [activeWorkspaceId, updateSummaryState])

  const setCustomPromptContent = useCallback((content: string) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ customPromptContent: content }))
  }, [activeWorkspaceId, updateSummaryState])

  const setGeneratedContent = useCallback((content: string) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ generatedContent: content }))
  }, [activeWorkspaceId, updateSummaryState])

  const setSummaryModel = useCallback((model: string) => {
    if (!activeWorkspaceId) return
    updateSummaryState(activeWorkspaceId, () => ({ summaryModel: model }))
  }, [activeWorkspaceId, updateSummaryState])

  const addSummaryPrompt = useCallback((prompt: SummaryPrompt) => {
    setSummaryPrompts(prev => [...prev, prompt])
  }, [])

  const removeSummaryPrompt = useCallback((id: string) => {
    setSummaryPrompts(prev => prev.filter(p => p.id !== id))
  }, [])

  const updateSummaryPrompt = useCallback((id: string, content: string) => {
    setSummaryPrompts(prev => prev.map(p => p.id === id ? { ...p, content } : p))
  }, [])

  const addUserQuery = useCallback((workspaceId: string, query: string) => {
    updateSummaryState(workspaceId, (prev) => ({
      userQueries: [...(prev.userQueries || []), query]
    }))
  }, [updateSummaryState])

  const clearUserQueries = useCallback((workspaceId: string) => {
    updateSummaryState(workspaceId, () => ({ userQueries: [] }))
  }, [updateSummaryState])

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
    showAddModal,
    setShowAddModal,
    apiKey,
    setApiKey,
    addUserQuery,
    clearUserQueries,
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
    // Summary
    summaryState,
    summaryPrompts,
    setShowSummary,
    setSummaryStatus,
    updatePanelSummaryStatus,
    setSelectedPanelIds,
    setSelectedPromptId,
    setCustomPromptContent,
    setGeneratedContent,
    setSummaryModel,
    addSummaryPrompt,
    removeSummaryPrompt,
    updateSummaryPrompt,
  }
}
