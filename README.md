# 🔀 AI Compare — 多模型 AI 聊天并排对比工具

**无需 API 费用，直接使用各大 AI 官网免费版本，同时对比多个模型的回复。**

![AI Compare Screenshot](assets/screenshot.png)

---

## ✨ 核心功能

### 1. 多工作区支持（Workspace）
- 支持创建 **多个独立工作区**，每个工作区包含多个 AI 模型
- 每个工作区独立保存 AI 聊天状态，切换时不会刷新
- 工作区可以 **固定**，固定后重启应用会自动加载
- 工作区支持 **重命名**、**上下排序**
- 左侧工作区导航栏支持 **自动收起/展开**

### 2. 多窗口并排显示
- 支持同时打开 **任意数量** 的 AI 模型窗口
- 每个窗口独立登录账号，保持各自的会话状态
- **横向排列**，支持鼠标滚轮横向滚动
- **拖拽调整宽度**：拖动面板边缘即可自由调整每个窗口的宽度
- 最后一个窗口也可以向右扩展，不会挤压其他窗口

### 2. 统一输入框同步发送
- 底部统一输入框，一次输入，**同时发送**给所有启用的 AI 模型
- 支持多行输入，自动调整高度
- **Ctrl+Enter**（Mac 用 Cmd+Enter）快捷键发送
- 可单独启用/禁用某个模型（不影响其他模型接收消息）
- 实时显示哪些模型正在生成回复
- **智能收起**：输入框空闲 3 秒后自动收起，点击可展开

### 3. 高级智能综述系统 (Smart Summary)
- **精准提问追踪**：系统 100% 准确记录用户在当前工作区的所有提问，不再依赖网页抓取，彻底杜绝角色混淆。
- **流式 API 输出**：采用主进程代理技术，支持 **流式 (Streaming)** 实时综述输出，像打字机一样丝滑，告别等待焦虑。
- **磁盘级持久化**：自定义 Prompt 模板保存于用户本地磁盘（`userData` 目录），即使 **卸载重装或版本更新，模板也永不丢失**。
- **智库专家级 Prompt**：内置“高级 AI 智库综述专家”模板，具备极强的“抗噪”能力，自动识别并忽略网页 UI 碎片，输出专业的对比报告。
- **工作区隔离**：每个 Tab 栏拥有独立的提问历史和综述状态，互不干扰。

### 4. 系统集成与安全
- **主进程 API 代理**：所有 API 请求经由 Electron 主进程转发，**彻底解决跨域 (CORS) 限制**，网络更稳定。
- **macOS 钥匙串集成**：API Key 安全存储在系统级钥匙串中，不以明文形式存在文件系统。

---

## 🚀 快速开始

### 方式一：直接运行

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start
```

### 方式二：打包为桌面应用

```bash
# 打包 macOS（需要在本地终端执行，不支持沙盒环境）
npm run dist:mac

# 打包 Windows
npm run dist:win

# 打包 Linux
npm run dist:linux
```

打包后的安装包在 `release/` 目录中。

**注意**：由于使用了 `keytar` 原生模块来访问 macOS 钥匙串，打包需要在本地终端执行，不支持沙盒环境。

---

## 📖 使用指南

### 第一次使用

1. **启动应用**后，默认会打开豆包、Kimi、智谱清言、腾讯元宝四个窗口
2. 在每个窗口中**登录对应的账号**（登录状态会持久保存）
3. 在底部输入框输入你的问题，点击「➤ 发送」或按 **Ctrl+Enter**
4. 所有启用的模型会同时收到你的消息并开始回复

### 支持的模型

| 模型 | 网址 | 备注 |
|------|------|------|
| 🫘 豆包 | doubao.com | 字节跳动，默认开启 |
| 🌙 Kimi | kimi.moonshot.cn | 月之暗面，默认开启 |
| 🌸 智谱清言 | chatglm.cn | 智谱AI，默认开启 |
| 💎 腾讯元宝 | yuanbao.tencent.com | 腾讯，默认开启 |
| 🌊 通义千问 | tongyi.aliyun.com | 阿里云 |
| 📖 文心一言 | yiyan.baidu.com | 百度 |
| 🔍 DeepSeek | chat.deepseek.com | DeepSeek |
| 🎯 MiniMax | minimaxi.com | MiniMax |
| ✨ Gemini | gemini.google.com | Google，需要代理 |

### 调整窗口布局

- **调整宽度**：将鼠标移到面板右边缘，出现蓝色高亮后拖拽
- **横向滚动**：鼠标滚轮在面板区域横向滚动
- **启用/禁用**：点击面板标题栏的「✓ 启用」按钮，可临时排除某个模型

### 综述功能

**方式一：使用 API（推荐）**
1. 点击顶部「⚙️ 设置」
2. 填入 OpenAI API Key（安全存储在 macOS 钥匙串）
3. 选择综述模型（推荐 GPT-4o Mini，便宜快速）
4. 对话完成后点击「📊 综述」

**方式二：不用 API**
1. 直接点击「📊 综述」
2. 应用会汇总展示各模型的最新回复
3. 你可以手动复制内容，粘贴到任意 AI 窗口中让其综述

---

## ⚙️ 技术实现

### 为什么能加载各大 AI 网站？

普通浏览器的 `<iframe>` 会被 `X-Frame-Options` 和 CSP 策略阻止加载第三方网站。本工具使用 **Electron 的 `<webview>` 标签**，并通过拦截响应头移除这些限制，因此可以加载任何网站。

### 如何同步发送消息？

通过 `webview.executeJavaScript()` 向每个 AI 网页注入 JavaScript 脚本：
1. 找到输入框（每个网站的 DOM 结构不同，有针对性的选择器）
2. 模拟 React/Vue 的合成事件，触发状态更新
3. 点击发送按钮或模拟 Enter 键

### 如何读取聊天历史？

同样通过 JS 注入，从 DOM 中提取对话内容：
- 针对每个网站的 DOM 结构，使用特定的 CSS 选择器
- 提取用户消息和 AI 回复，组织为结构化 JSON
- 传递给综述 API 或直接展示

### 登录状态如何保持？

每个 AI 网站使用独立的 `partition`（如 `persist:doubao`），Electron 会将 Cookie 和 localStorage 持久化保存，重启后无需重新登录。

### API Key 如何安全存储？

使用 macOS 原生钥匙串（Keychain）存储 API Key，通过 `keytar` 库访问。API Key 不会以明文形式存储在文件系统中。

---

## 🔧 常见问题

**Q: 发送消息后某个窗口没有反应？**
A: 可能是该网站的 DOM 结构已更新。可以手动在该窗口中操作，或等待工具适配更新。

**Q: 综述功能提示找不到聊天历史？**
A: 确保各窗口中已经有对话内容，且页面已完全加载。部分网站的历史读取可能需要适配。

**Q: 能添加其他模型吗？**
A: 点击「+ 添加模型」按钮，从预设列表中选择。如果网站不在列表中，可以手动输入 URL。

**Q: 数据安全吗？**
A: 所有数据（包括 API Key、登录 Cookie）都保存在本地，不经过任何第三方服务器。API Key 存储在 macOS 钥匙串中。

**Q: 海外模型加载失败？**
A: 海外模型（如 Gemini）需要开启代理/VPN。部分网站可能有严格的反嵌入检测。

---

## 📁 项目结构

```
ai-compare/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.ts              # 主进程入口
│   │   ├── preload.ts           # 预加载脚本
│   │   ├── passwordManager.ts   # macOS 钥匙串管理
│   │   └── summaryService.ts    # 综述服务
│   └── renderer/                # React 渲染进程
│       ├── App.tsx              # 主应用组件
│       ├── components/
│       │   ├── WebviewPanel.tsx  # 单个 webview 面板
│       │   ├── PanelContainer.tsx # 多面板容器
│       │   ├── GlobalInput.tsx   # 底部输入框
│       │   ├── SummaryPanel.tsx  # 综述侧边栏
│       │   ├── AddModelModal.tsx # 添加模型弹窗
│       │   ├── SettingsPanel.tsx # 设置弹窗
│       │   └── Toolbar.tsx      # 顶部工具栏
│       ├── hooks/
│       │   └── usePasswordManager.ts # 密码管理 Hook
│       └── store/
│           └── appStore.ts      # 应用状态管理
├── assets/                      # 图标等静态资源
├── package.json
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
└── tsconfig.main.json           # 主进程 TypeScript 配置
```

---

## 🛠️ 扩展开发

### 添加新的 AI 网站支持

在 `src/renderer/components/WebviewPanel.tsx` 的 `getSendScript` 函数中，按照现有模式添加新网站的输入框选择器和发送逻辑。

### 改进聊天历史读取

在 `getHistoryScript` 函数中，为新网站添加专门的 DOM 提取策略。

---

## 📄 License

MIT License — 自由使用、修改和分发。
