import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { createPasswordManager } from './passwordManager'
import { setupSummaryService } from './summaryService'

// 禁用沙盒以解决 macOS 沙盒权限问题
app.commandLine.appendSwitch('no-sandbox')

// 禁用 GPU 缓存以避免权限问题
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-gpu-disk-cache')

// 解决中文输入法问题
app.commandLine.appendSwitch('disable-input-ime-autocommit')

// 判断是否为开发模式：只有显式设置 NODE_ENV=development 时才使用开发服务器
const isDev = process.env.NODE_ENV === 'development'

// 确保应用数据目录存在且有写入权限
function ensureAppDataDirectory() {
  const userDataPath = app.getPath('userData')
  const partitionsPath = path.join(userDataPath, 'Partitions')
  
  try {
    // 创建主目录
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    
    // 创建 Partitions 目录
    if (!fs.existsSync(partitionsPath)) {
      fs.mkdirSync(partitionsPath, { recursive: true })
    }
    
    // 确保目录权限正确
    fs.chmodSync(userDataPath, 0o755)
    fs.chmodSync(partitionsPath, 0o755)
    
    console.log('[Main] App data directory ensured:', userDataPath)
  } catch (error) {
    console.error('[Main] Failed to create app data directory:', error)
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'AI Compare - 多模型对比',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // 启用 webview 标签
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
  })

  // 拦截所有响应头，移除 X-Frame-Options 和 CSP frame 限制
  // 这样 webview 就可以加载任何网站
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const headers = details.responseHeaders || {}
      
      // 删除阻止嵌入的响应头
      delete headers['X-Frame-Options']
      delete headers['x-frame-options']
      
      // 修改 CSP 中的 frame-ancestors 限制
      if (headers['Content-Security-Policy']) {
        headers['Content-Security-Policy'] = headers['Content-Security-Policy'].map(
          (csp: string) => csp.replace(/frame-ancestors[^;]*(;|$)/gi, '')
        )
      }
      if (headers['content-security-policy']) {
        headers['content-security-policy'] = headers['content-security-policy'].map(
          (csp: string) => csp.replace(/frame-ancestors[^;]*(;|$)/gi, '')
        )
      }

      callback({ cancel: false, responseHeaders: headers })
    }
  )

  // 加载渲染进程
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 处理：获取应用路径（用于 webview preload）
ipcMain.handle('get-app-path', () => {
  return app.getAppPath()
})

// IPC 处理：打开外部链接
ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})

// IPC 处理：窗口控制（Windows/Linux 自定义标题栏）
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())

app.whenReady().then(() => {
  // 确保应用数据目录存在
  ensureAppDataDirectory()
  
  // 初始化密码管理器
  const passwordManager = createPasswordManager()
  
  // 设置 IPC 处理：密码管理
  ipcMain.handle('password:get', async (_event, account: string) => {
    return await passwordManager.getPassword(account)
  })
  ipcMain.handle('password:set', async (_event, account: string, password: string) => {
    await passwordManager.setPassword(account, password)
  })
  ipcMain.handle('password:delete', async (_event, account: string) => {
    return await passwordManager.deletePassword(account)
  })

  // --- 【新增】Prompt 模板持久化存储 ---
  const PROMPTS_FILE = path.join(app.getPath('userData'), 'summary_prompts.json')
  
  ipcMain.handle('prompts:load', async () => {
    try {
      if (fs.existsSync(PROMPTS_FILE)) {
        const data = fs.readFileSync(PROMPTS_FILE, 'utf-8')
        return JSON.parse(data)
      }
    } catch (e) {
      console.error('[Main] Failed to load prompts:', e)
    }
    return []
  })

  ipcMain.handle('prompts:save', async (_event, prompts: any[]) => {
    try {
      fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2))
      return true
    } catch (e) {
      console.error('[Main] Failed to save prompts:', e)
      return false
    }
  })

  // --- 【新增】流式 API 请求代理 ---
  ipcMain.on('api:proxy-stream', async (event, { url, method, headers, body }) => {
    const webContents = event.sender
    try {
      console.log('[Main] Starting proxy stream for:', url)
      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ ...body, stream: true })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        webContents.send('api:proxy-error', `API ${response.status}: ${errorText}`)
        return
      }

      const reader = response.body!
      if ('getReader' in reader) {
        const streamReader = (reader as any).getReader()
        while (true) {
          const { done, value } = await streamReader.read()
          if (done) break
          const chunk = new TextDecoder().decode(value)
          // 直接通过 webContents 发送，更适合单向持续推送
          webContents.send('api:proxy-chunk', chunk)
        }
      } else {
        (reader as any).on('data', (chunk: Buffer) => {
          webContents.send('api:proxy-chunk', chunk.toString())
        })
        ;(reader as any).on('end', () => webContents.send('api:proxy-end'))
      }
      
      webContents.send('api:proxy-end')
    } catch (e: any) {
      console.error('[Main] Stream proxy error:', e)
      webContents.send('api:proxy-error', e.message)
    }
  })
  
  // 初始化综述服务
  setupSummaryService()
  
  createWindow()

  // --- 【新增】全局 WebAuthn (Passkey) 与 User-Agent 支持 ---
  const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

  app.on('web-contents-created', (_event, contents) => {
    // 识别是否为 webview
    if (contents.getType() === 'webview') {
      // 1. 强制设置现代浏览器 User-Agent，绕过网站的“非标浏览器”拦截
      contents.setUserAgent(CHROME_UA)

      // 2. 授权 WebAuthn 请求 (Passkeys)
      contents.session.setWebAuthnHandler((_details) => {
        // 自动允许使用平台认证器 (Touch ID)
        // 在正式打包并签名后，这里会触发 macOS 系统弹窗
        return { action: 'allow' }
      })
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 允许 webview 加载任何 URL（包括 http）
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (_event, _url) => {
    // 允许所有导航
  })
  
  // 为每个 webview 也设置响应头拦截
  if (contents.getType() === 'webview') {
    contents.session.webRequest.onHeadersReceived(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const headers = details.responseHeaders || {}
        delete headers['X-Frame-Options']
        delete headers['x-frame-options']
        callback({ cancel: false, responseHeaders: headers })
      }
    )
  }
})
