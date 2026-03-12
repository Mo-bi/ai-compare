/// <reference types="electron" />

// 扩展 JSX 内置元素，支持 webview 标签
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      partition?: string
      allowpopups?: string
      preload?: string
      nodeintegration?: string
      webpreferences?: string
      useragent?: string
      disablewebsecurity?: string
      ref?: React.Ref<any>
    }
  }
}

// Electron API 暴露给渲染进程
interface Window {
  electronAPI?: {
    minimize: () => void
    maximize: () => void
    close: () => void
    getAppPath: () => Promise<string>
    openExternal: (url: string) => Promise<void>
    platform: string
  }
}

// Electron WebviewTag 类型
declare namespace Electron {
  interface WebviewTag extends HTMLElement {
    src: string
    partition: string
    allowpopups: boolean
    
    executeJavaScript(code: string): Promise<any>
    reload(): void
    openDevTools(): void
    closeDevTools(): void
    getURL(): string
    getTitle(): string
    isLoading(): boolean
    stop(): void
    goBack(): void
    goForward(): void
    
    addEventListener(event: 'did-start-loading', listener: () => void): void
    addEventListener(event: 'did-stop-loading', listener: () => void): void
    addEventListener(event: 'did-fail-load', listener: (e: any) => void): void
    addEventListener(event: 'page-title-updated', listener: (e: PageTitleUpdatedEvent) => void): void
    addEventListener(event: string, listener: (...args: any[]) => void): void
    removeEventListener(event: string, listener: (...args: any[]) => void): void
  }
  
  interface PageTitleUpdatedEvent extends Event {
    title: string
    explicitSet: boolean
  }
}
