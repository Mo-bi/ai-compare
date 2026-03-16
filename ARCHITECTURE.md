# AI Compare - 技术架构设计

## 项目定位

多模型 AI 聊天并排对比工具，无需 API Key，直接使用各大 AI 官网免费版本。

## 核心技术选型

### 框架：Electron + React + TypeScript

- **全平台**：macOS / Windows / Linux
- **WebView 加载**：使用 Electron `<webview>` 标签加载各 AI 官网
- **绕过 X-Frame-Options**：通过 `session.webRequest.onHeadersReceived` 拦截并删除响应头
- **JS 注入**：使用 `webview.executeJavaScript()` 向各 AI 网站注入脚本

## 核心问题解决方案

### 1. 多工作区支持（Workspace）

- **数据模型**：每个工作区包含独立的 panels 数组，存储在 appStore 中
- **持久化**：工作区数据保存到 localStorage，包含固定状态、排序、面板配置
- **状态保持**：切换工作区时使用 `visibility: hidden` 隐藏而非卸载组件，webview 状态不丢失
- **左侧导航**：WorkspaceSidebar 组件，支持展开/收起、重命名、排序、固定

### 2. 多窗口并排加载 AI 网页

- 使用 Electron `<webview>` 标签（非 iframe，不受 CSP/X-Frame-Options 限制）
- 每个 webview 独立 session（通过 `partition` 属性），支持独立登录状态
- 横向排列，宽度可拖拽调整（CSS flex + resize handle）
- 横向滚动支持（overflow-x: auto）
- 最后一个窗口可以向右扩展，不会挤压其他窗口

### 2. 统一极简输入框

- 底部固定输入框（支持多行、快捷键 Ctrl+Enter 发送）
- **极简设计**：移除了输入框上方冗余的模型状态标签，更加专注输入。
- 点击发送后，遍历所有 webview，调用各自的 `sendMessage(text)` 方法
- 每个 AI 网站有独立的 JS 注入脚本（处理不同 DOM 结构）
- 输入框空闲 3 秒后自动收起，点击可展开

### 3. 各 AI 网站消息发送 JS 注入策略

每个 AI 网站的输入框 DOM 结构不同，特别针对富文本编辑器（如 Slate.js）进行了深度适配：

| AI 网站    | URL                 | 输入框特征 / 方案                           | 发送方式                     |
| -------- | ------------------- | -------------------------------------- | ------------------------ |
| 文心一言     | yiyan.baidu.com     | Slate.js 富文本编辑器                    | 模拟 `execCommand` 插入与事件派发 |
| 腾讯元宝     | yuanbao.tencent.com | Slate.js 富文本编辑器                    | 模拟 `execCommand` 插入与事件派发 |
| Kimi     | kimi.moonshot.cn    | `contenteditable` 输入框               | 模拟 `execCommand` 插入文本 |
| 豆包       | doubao.com          | 拦截 `HTMLTextAreaElement` 原型         | 拦截原型 `set` 方法触发更新 |
| 智谱清言     | chatglm.cn          | `textarea`                             | 模拟输入                     |
| DeepSeek | chat.deepseek.com   | `textarea`                             | 拦截原型 `set` + dispatchEvent |

### 4. 聊天历史读取（汇总综述核心）

**方案：全量底层节点探测 + 最末端节点去重 (Leaf-Node Strategy)**

- **更强的兼容性**：遍历网页中所有包含文本的底层节点（`div`, `p`, `pre` 及常见消息容器类名），无论网站如何改版，只要有文字就能抓到。
- **智能排重**：基于文本内容和坐标位置(`getBoundingClientRect`)，即使长文本被截断或存在嵌套，也能通过相似度和位置关系完美去重。
- **侧边栏与死区屏蔽**：基于坐标系统，自动过滤过短碎词和左侧导航栏等非对话区域。

### 5. 高级汇总综述系统

#### A. 精准提问记录
- 系统在 `handleSend` 阶段自动将用户输入的文字存入当前 Workspace 的 `userQueries` 状态。
- 综述时直接调用该清单，实现 100% 准确的用户输入还原。

#### B. 主进程流式 API 代理 (Streaming Proxy)
- **跨域解决**：由于浏览器渲染进程存在 CORS 限制，所有综述 API 请求转由 Electron **主进程**发起。
- **流式转发**：主进程使用 Node.js Stream 读取 API 响应，并通过 `webContents.send` 将 Data Chunk 实时推送给渲染进程。
- **SSE 解析**：前端采用缓冲区 (Buffer) 机制解析 SSE 格式消息，确保在网络分包情况下依然能平滑输出。

#### C. 磁盘实时持久化 (Real-time Disk Persistence)
- **存储路径**：自定义 Prompt 模板存储于 `app.getPath('userData')/summary_prompts.json`。
- **实时同步**：用户在综述面板对模板的任何新增、修改，都会 **实时覆盖更新到本地磁盘**。
- **重装不丢**：独立于浏览器缓存，支持跨版本升级和应用卸载重装后的数据自动恢复。

### 6. macOS 钥匙串集成

- 使用 `keytar` 库访问 macOS 原生钥匙串
- API Key 安全存储，不以明文形式保存
- 应用启动时自动加载，重启无需重新输入

## 项目结构

```
ai-compare/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.ts              # 主进程入口（窗口创建、响应头拦截）
│   │   ├── preload.ts           # 预加载脚本（安全 API 暴露）
│   │   ├── passwordManager.ts   # macOS 钥匙串管理
│   │   └── summaryService.ts    # 综述服务（收集历史、调用 API）
│   └── renderer/                # React 渲染进程
│       ├── App.tsx              # 主应用组件
│       ├── components/
│       │   ├── WebviewPanel.tsx  # 单个 webview 面板（含 JS 注入逻辑）
│       │   ├── PanelContainer.tsx # 多面板横向布局容器
│       │   ├── GlobalInput.tsx   # 底部统一输入框（自动收起/展开）
│       │   ├── SummaryPanel.tsx  # 综述侧边栏
│       │   ├── AddModelModal.tsx # 添加模型弹窗
│       │   ├── SettingsPanel.tsx # 设置弹窗（API Key 管理）
│       │   └── Toolbar.tsx      # 顶部工具栏
│       ├── hooks/
│       │   └── usePasswordManager.ts # 密码管理 Hook
│       └── store/
│           └── appStore.ts      # 应用状态管理（面板、输入、设置）
├── assets/                      # 图标等静态资源
├── dist/                        # 构建输出目录
├── release/                     # 打包输出目录
├── package.json
├── vite.config.ts               # Vite 配置（渲染进程构建）
├── tsconfig.json                # TypeScript 配置（渲染进程）
└── tsconfig.main.json           # TypeScript 配置（主进程）
```

## 数据流

### 发送消息流程

```
用户输入 → GlobalInput → App.handleSend() 
  → 遍历所有启用的面板 → WebviewPanel.sendMessage()
  → webview.executeJavaScript() → 注入脚本找到输入框并填充内容
  → 模拟点击发送按钮
```

### 综述流程

```
用户点击综述 → App.handleSummarize()
  → 遍历所有面板 → WebviewPanel.getHistory()
  → webview.executeJavaScript() → 注入脚本读取 DOM
  → 返回聊天历史 JSON → 调用 OpenAI API 生成综述
  → 显示在 SummaryPanel 中
```

### API Key 管理流程

```
用户输入 API Key → SettingsPanel → App.saveApiKey()
  → electronAPI.password.set() → IPC 通信
  → passwordManager.setPassword() → keytar 存储到钥匙串
  
应用启动 → App.useEffect() → electronAPI.password.get()
  → passwordManager.getPassword() → 从钥匙串读取
  → 自动填充到 store.apiKey
```

## UI 设计

- 顶部：工具栏（添加模型、设置、清除）
- 中部：横向并排 webview 区域（可拖拽调整宽度）
- 底部：统一输入框（自动收起/展开）+ 发送按钮 + 综述按钮
- 右侧：综述面板（滑入显示）

## 安全考虑

1. **API Key 存储**：使用 macOS 钥匙串，不以明文存储
2. **登录状态**：每个网站独立 partition，Cookie 隔离
3. **本地运行**：所有数据不经过第三方服务器
4. **JS 注入**：仅用于功能实现，不收集用户数据

## 性能优化
1. **窗口调整**：使用 `requestAnimationFrame` 优化拖拽性能
2. **懒加载**：webview 按需加载
3. **状态管理**：使用 React hooks，避免不必要的重渲染

## 打包说明

### 原生模块依赖
本项目使用 `keytar` 原生模块来访问 macOS 钥匙串，该模块需要编译原生代码。

### 打包要求
- **不支持沙盒环境**：由于原生模块编译需要系统权限，打包命令需要在本地终端执行
- **需要 Python 和编译工具**：确保系统已安装 Xcode Command Line Tools

### 打包命令
```bash
# 在本地终端执行（不是沙盒环境）
npm run dist:mac    # 打包 macOS
npm run dist:win    # 打包 Windows
npm run dist:linux  # 打包 Linux
```

### 打包输出
- `release/AI Compare-1.0.0-arm64.dmg` - Apple Silicon Mac (M1/M2/M3)
- `release/AI Compare-1.0.0.dmg` - Intel Mac
- `release/mac-arm64/AI Compare.app` - Apple Silicon 直接运行
- `release/mac/AI Compare.app` - Intel Mac 直接运行

