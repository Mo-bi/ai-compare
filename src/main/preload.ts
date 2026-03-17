import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 获取应用路径
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // 基础配置
  config: {
    getApiKey: () => ipcRenderer.invoke('config:get-api-key'),
    setApiKey: (key: string) => ipcRenderer.invoke('config:set-api-key', key),
  },
  
  // 打开外部链接
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // 平台信息
  platform: process.platform,
  
  // 通用 IPC 调用方法
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  
  // 综述服务
  summary: {
    collectHistories: () => ipcRenderer.invoke('collect-all-histories'),
    generateText: (histories: unknown) => ipcRenderer.invoke('generate-summary-text', histories),
    generateWithApi: (params: unknown) => ipcRenderer.invoke('generate-summary-with-api', params),
    loadPrompts: () => ipcRenderer.invoke('prompts:load'),
    savePrompts: (prompts: any[]) => ipcRenderer.invoke('prompts:save', prompts),
    proxyFetch: (data: { url: string, method: string, headers: any, body: any }) => ipcRenderer.invoke('api:proxy-fetch', data),
    startProxyStream: (data: any) => ipcRenderer.send('api:proxy-stream', data),
    onProxyChunk: (callback: (chunk: string) => void) => {
      const listener = (_: any, chunk: string) => callback(chunk)
      ipcRenderer.on('api:proxy-chunk', listener)
      return () => ipcRenderer.removeListener('api:proxy-chunk', listener)
    },
    onProxyEnd: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('api:proxy-end', listener)
      return () => ipcRenderer.removeListener('api:proxy-end', listener)
    },
    onProxyError: (callback: (err: string) => void) => {
      const listener = (_: any, err: string) => callback(err)
      ipcRenderer.on('api:proxy-error', listener)
      return () => ipcRenderer.removeListener('api:proxy-error', listener)
    },
  },
})
