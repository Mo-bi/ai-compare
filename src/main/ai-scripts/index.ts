/**
 * AI 网站配置和 JS 注入脚本
 * 每个 AI 网站需要实现：
 * 1. sendMessage(text): 发送消息
 * 2. getHistory(): 获取聊天历史
 * 3. isReady(): 检查页面是否就绪
 * 4. isGenerating(): 检查是否正在生成回复
 */

export interface AIConfig {
  id: string
  name: string
  url: string
  icon: string
  color: string
  // 返回注入脚本的函数
  getSendScript: (text: string) => string
  getHistoryScript: () => string
  getStatusScript: () => string
}

// ============================================================
// ChatGPT
// ============================================================
const chatgptConfig: AIConfig = {
  id: 'chatgpt',
  name: 'ChatGPT',
  url: 'https://chat.openai.com',
  icon: '🤖',
  color: '#10a37f',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    // 找到输入框
    const editor = document.querySelector('#prompt-textarea') 
      || document.querySelector('[data-id="root"]')
      || document.querySelector('div[contenteditable="true"]');
    if (!editor) { console.error('[AICompare] ChatGPT: 找不到输入框'); return false; }
    
    editor.focus();
    
    // 对于 contenteditable div
    if (editor.getAttribute('contenteditable') === 'true') {
      // 清空并设置内容
      editor.innerHTML = '';
      document.execCommand('insertText', false, msg);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // textarea
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(editor, msg);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    // 点击发送按钮
    const sendBtn = document.querySelector('[data-testid="send-button"]')
      || document.querySelector('button[aria-label="Send message"]')
      || document.querySelector('button[aria-label="发送消息"]');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      return true;
    }
    
    // 备用：模拟 Enter 键
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] ChatGPT send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    const items = document.querySelectorAll('[data-message-author-role]');
    items.forEach(item => {
      const role = item.getAttribute('data-message-author-role');
      const content = item.innerText || item.textContent || '';
      if (content.trim()) {
        messages.push({ role: role === 'user' ? 'user' : 'assistant', content: content.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[aria-label="Stop streaming"]') 
      || document.querySelector('button[aria-label="停止生成"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// DeepSeek
// ============================================================
const deepseekConfig: AIConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  url: 'https://chat.deepseek.com',
  icon: '🔍',
  color: '#4d6bfe',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    // DeepSeek 使用 textarea
    const t = document.querySelector('textarea._27c9245')
      || document.querySelector('textarea[placeholder]')
      || document.querySelector('textarea');
    if (!t) { console.error('[AICompare] DeepSeek: 找不到输入框'); return false; }
    
    t.focus();
    
    // 使用 React 内部 setter 触发状态更新
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(t, msg);
    } else {
      t.value = msg;
    }
    t.dispatchEvent(new Event('input', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 300));
    
    // 模拟 Enter 发送
    t.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      which: 13, bubbles: true, cancelable: true
    }));
    return true;
  } catch(e) {
    console.error('[AICompare] DeepSeek send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    // 用户消息
    document.querySelectorAll('.fbb737a4, [class*="user-message"], [class*="userMessage"]').forEach(el => {
      const text = el.innerText || el.textContent || '';
      if (text.trim()) messages.push({ role: 'user', content: text.trim() });
    });
    // AI 回复
    document.querySelectorAll('.ds-markdown, [class*="assistant"], [class*="markdown"]').forEach(el => {
      const text = el.innerText || el.textContent || '';
      if (text.trim()) messages.push({ role: 'assistant', content: text.trim() });
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[aria-label="Stop"]') 
      || document.querySelector('.ds-icon-button[role="button"][aria-disabled="false"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// 豆包 (Doubao)
// ============================================================
const doubaoConfig: AIConfig = {
  id: 'doubao',
  name: '豆包',
  url: 'https://www.doubao.com/chat/',
  icon: '🫘',
  color: '#1664ff',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('[data-testid="chat_input_input"]')
      || document.querySelector('textarea[placeholder]')
      || document.querySelector('div[contenteditable="true"]')
      || document.querySelector('textarea');
    if (!t) { console.error('[AICompare] 豆包: 找不到输入框'); return false; }
    
    t.focus();
    
    if (t.tagName.toLowerCase() === 'textarea') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(t, msg);
      else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // contenteditable
      t.innerHTML = '';
      document.execCommand('insertText', false, msg);
      t.dispatchEvent(new InputEvent('input', { bubbles: true, data: msg }));
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    // 点击发送按钮
    const btn = document.querySelector('[data-testid="chat_input_send_button"]')
      || document.querySelector('button[aria-label*="发送"]')
      || document.querySelector('button[type="submit"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    // 备用 Enter
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] 豆包 send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('[class*="chat-message"], [class*="message-item"]').forEach(el => {
      const isUser = el.querySelector('[class*="user"]') || el.classList.toString().includes('user');
      const text = el.innerText || el.textContent || '';
      if (text.trim()) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[data-testid="chat_stop_button"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// Kimi
// ============================================================
const kimiConfig: AIConfig = {
  id: 'kimi',
  name: 'Kimi',
  url: 'https://kimi.moonshot.cn',
  icon: '🌙',
  color: '#ff6600',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('[data-testid="msh-chatinput-editor"]')
      || document.querySelector('div[contenteditable="true"]')
      || document.querySelector('textarea');
    if (!t) { console.error('[AICompare] Kimi: 找不到输入框'); return false; }
    
    t.focus();
    
    if (t.getAttribute('contenteditable') === 'true') {
      t.innerHTML = '';
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(t);
      sel && sel.removeAllRanges();
      sel && sel.addRange(range);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, msg);
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(t, msg);
      else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    const btn = document.querySelector('[data-testid="msh-chatinput-send-button"]')
      || document.querySelector('button[aria-label*="发送"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] Kimi send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('[class*="message"]').forEach(el => {
      const isUser = el.classList.toString().includes('user') || el.querySelector('[class*="user"]');
      const text = el.innerText || el.textContent || '';
      if (text.trim() && text.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[data-testid="msh-chatinput-stop-button"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// 通义千问 (Qwen)
// ============================================================
const qwenConfig: AIConfig = {
  id: 'qwen',
  name: '通义千问',
  url: 'https://tongyi.aliyun.com/qianwen/',
  icon: '🌊',
  color: '#ff6a00',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('textarea[placeholder]')
      || document.querySelector('div[contenteditable="true"]')
      || document.querySelector('textarea');
    if (!t) { console.error('[AICompare] 千问: 找不到输入框'); return false; }
    
    t.focus();
    
    if (t.tagName.toLowerCase() === 'textarea') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(t, msg);
      else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
      t.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      t.innerHTML = '';
      document.execCommand('insertText', false, msg);
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    const btn = document.querySelector('button[class*="send"]')
      || document.querySelector('button[aria-label*="发送"]')
      || document.querySelector('[class*="send-btn"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] 千问 send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('[class*="bubble"], [class*="message"]').forEach(el => {
      const isUser = el.classList.toString().includes('human') || el.classList.toString().includes('user');
      const text = el.innerText || el.textContent || '';
      if (text.trim() && text.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[class*="stop"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// 元宝 (Yuanbao / Tencent)
// ============================================================
const yuanbaoConfig: AIConfig = {
  id: 'yuanbao',
  name: '元宝',
  url: 'https://yuanbao.tencent.com/chat',
  icon: '💎',
  color: '#07c160',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('textarea')
      || document.querySelector('div[contenteditable="true"]');
    if (!t) { console.error('[AICompare] 元宝: 找不到输入框'); return false; }
    
    t.focus();
    
    if (t.tagName.toLowerCase() === 'textarea') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(t, msg);
      else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      t.innerHTML = '';
      document.execCommand('insertText', false, msg);
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    const btn = document.querySelector('button[aria-label*="发送"]')
      || document.querySelector('[class*="send"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] 元宝 send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('[class*="message"], [class*="chat-item"]').forEach(el => {
      const isUser = el.classList.toString().includes('user') || el.classList.toString().includes('human');
      const text = el.innerText || el.textContent || '';
      if (text.trim() && text.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('[class*="stop"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// Claude
// ============================================================
const claudeConfig: AIConfig = {
  id: 'claude',
  name: 'Claude',
  url: 'https://claude.ai/new',
  icon: '🧠',
  color: '#cc785c',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('[contenteditable="true"][data-placeholder]')
      || document.querySelector('div[contenteditable="true"]');
    if (!t) { console.error('[AICompare] Claude: 找不到输入框'); return false; }
    
    t.focus();
    t.innerHTML = '';
    
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(t);
    sel && sel.removeAllRanges();
    sel && sel.addRange(range);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, msg);
    t.dispatchEvent(new Event('input', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 400));
    
    const btn = document.querySelector('button[aria-label="Send Message"]')
      || document.querySelector('button[type="submit"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] Claude send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('[data-test-render-count], .human-turn, .ai-turn').forEach(el => {
      const isUser = el.classList.contains('human-turn');
      const text = el.innerText || el.textContent || '';
      if (text.trim() && text.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('button[aria-label="Stop Response"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// Gemini
// ============================================================
const geminiConfig: AIConfig = {
  id: 'gemini',
  name: 'Gemini',
  url: 'https://gemini.google.com/app',
  icon: '✨',
  color: '#4285f4',
  getSendScript: (text: string) => {
    const escaped = JSON.stringify(text)
    return `
(async () => {
  try {
    const msg = ${escaped};
    const t = document.querySelector('rich-textarea .ql-editor')
      || document.querySelector('[contenteditable="true"]')
      || document.querySelector('textarea');
    if (!t) { console.error('[AICompare] Gemini: 找不到输入框'); return false; }
    
    t.focus();
    
    if (t.getAttribute('contenteditable') === 'true') {
      t.innerHTML = '<p>' + msg + '</p>';
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(t, msg);
      else t.value = msg;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    const btn = document.querySelector('button.send-button')
      || document.querySelector('[aria-label="Send message"]')
      || document.querySelector('button[data-mat-icon-name="send"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  } catch(e) {
    console.error('[AICompare] Gemini send error:', e);
    return false;
  }
})()
`
  },
  getHistoryScript: () => `
(async () => {
  try {
    const messages = [];
    document.querySelectorAll('.conversation-container .query-text, .conversation-container .response-content').forEach(el => {
      const isUser = el.classList.contains('query-text');
      const text = el.innerText || el.textContent || '';
      if (text.trim() && text.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content: text.trim() });
      }
    });
    return JSON.stringify(messages);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`,
  getStatusScript: () => `
(async () => {
  try {
    const stopBtn = document.querySelector('button[aria-label="Stop response"]');
    return JSON.stringify({ generating: !!stopBtn });
  } catch(e) {
    return JSON.stringify({ generating: false });
  }
})()
`
}

// ============================================================
// 导出所有配置
// ============================================================
export const AI_CONFIGS: AIConfig[] = [
  chatgptConfig,
  deepseekConfig,
  doubaoConfig,
  kimiConfig,
  qwenConfig,
  yuanbaoConfig,
  claudeConfig,
  geminiConfig,
]

export const AI_CONFIG_MAP: Record<string, AIConfig> = Object.fromEntries(
  AI_CONFIGS.map(c => [c.id, c])
)
