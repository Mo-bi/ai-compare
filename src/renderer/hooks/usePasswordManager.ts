import { useState, useCallback } from 'react'
import { AIPanel } from '../store/appStore'

interface UsePasswordManagerReturn {
  savedPasswords: Map<string, string>
  savePassword: (account: string, password: string) => Promise<void>
  getPassword: (account: string) => Promise<string | null>
  deletePassword: (account: string) => Promise<void>
}

export function usePasswordManager(): UsePasswordManagerReturn {
  const [savedPasswords] = useState(() => new Map<string, string>())

  const getPassword = useCallback(async (account: string): Promise<string | null> => {
    try {
      const result = await window.electronAPI.invoke('password:get', account)
      return result
    } catch (error) {
      console.error('Failed to get password:', error)
      return null
    }
  }, [])

  const savePassword = useCallback(async (account: string, password: string): Promise<void> => {
    try {
      await window.electronAPI.invoke('password:set', account, password)
      savedPasswords.set(account, password)
    } catch (error) {
      console.error('Failed to save password:', error)
      throw error
    }
  }, [savedPasswords])

  const deletePassword = useCallback(async (account: string): Promise<void> => {
    try {
      await window.electronAPI.invoke('password:delete', account)
      savedPasswords.delete(account)
    } catch (error) {
      console.error('Failed to delete password:', error)
      throw error
    }
  }, [savedPasswords])

  return {
    savedPasswords,
    getPassword,
    savePassword,
    deletePassword,
  }
}

interface UseSummaryReturn {
  collectHistories: () => Promise<Array<{panelId: string, panelName: string, history: Array<{role: string, content: string}>}>>
  generateSummaryText: (histories: Array<{panelName: string, messages: Array<{role: string, content: string}>}>) => Promise<string>
  generateSummaryWithApi: (params: {
    histories: Array<{panelName: string, messages: Array<{role: string, content: string}>}>
    apiKey: string
    apiUrl?: string
    model?: string
  }) => Promise<{success: boolean, summary?: string, error?: string}>
}

export function useSummary(panels: AIPanel[]): UseSummaryReturn {
  const collectHistories = useCallback(async () => {
    try {
      const histories = await window.electronAPI.invoke('collect-all-histories')
      
      return histories.map((item: {panelId: string, history: Array<{role: string, content: string}>}) => {
        const panel = panels.find(p => p.id === item.panelId)
        return {
          panelId: item.panelId,
          panelName: panel?.name || item.panelId,
          history: item.history,
        }
      })
    } catch (error) {
      console.error('Failed to collect histories:', error)
      return []
    }
  }, [panels])

  const generateSummaryText = useCallback(async (histories: Array<{panelName: string, messages: Array<{role: string, content: string}>}>) => {
    try {
      const text = await window.electronAPI.invoke('generate-summary-text', histories)
      return text
    } catch (error) {
      console.error('Failed to generate summary text:', error)
      return '生成综述失败'
    }
  }, [])

  const generateSummaryWithApi = useCallback(async (params: {
    histories: Array<{panelName: string, messages: Array<{role: string, content: string}>}>
    apiKey: string
    apiUrl?: string
    model?: string
  }) => {
    try {
      const result = await window.electronAPI.invoke('generate-summary-with-api', params)
      return result
    } catch (error) {
      console.error('Failed to generate summary with API:', error)
      return { success: false, error: String(error) }
    }
  }, [])

  return {
    collectHistories,
    generateSummaryText,
    generateSummaryWithApi,
  }
}
