import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 获取应用路径
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // 打开外部链接
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // 平台信息
  platform: process.platform,
  
  // 通用 IPC 调用方法
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  
  // 密码管理
  password: {
    get: (account: string) => ipcRenderer.invoke('password:get', account),
    set: (account: string, password: string) => ipcRenderer.invoke('password:set', account, password),
    delete: (account: string) => ipcRenderer.invoke('password:delete', account),
  },
  
  // 综述服务
  summary: {
    collectHistories: () => ipcRenderer.invoke('collect-all-histories'),
    generateText: (histories: unknown) => ipcRenderer.invoke('generate-summary-text', histories),
    generateWithApi: (params: unknown) => ipcRenderer.invoke('generate-summary-with-api', params),
  },
})
