# CorineGen - LLM 提示词助理功能需求文档

> **版本**: v1.0
> **创建日期**: 2026-01-19
> **功能概述**: 新增 LLM 加持的提示词优化功能，支持变体生成、扩写润色、后续脑补、剧情生成四种模式

---

## 目录

1. [功能概述](#功能概述)
2. [前端需求](#前端需求)
3. [后端需求](#后端需求)
4. [API 接口规范](#api-接口规范)
5. [数据结构定义](#数据结构定义)
6. [系统提示词配置](#系统提示词配置)
7. [错误处理](#错误处理)
8. [性能优化](#性能优化)
9. [开发计划](#开发计划)

---

## 功能概述

### 业务目标
为用户提供 AI 增强的提示词优化工具，帮助用户快速生成、扩写、优化图像生成提示词，提升创作效率。

### 核心功能
- **创建变体**: 基于用户提示词生成多个变体版本，支持局部调整
- **扩写润色**: 智能扩充提示词描述，增加细节
- **脑补后续**: 根据当前分镜设计下一个镜头
- **生成剧本**: 根据故事大纲生成多个分镜提示词

### 技术架构
```
前端 (React) → 后端 (Express) → Grok API (JieKou AI)
     ↓                ↓                  ↓
  UI 交互      代理转发/参数处理    LLM 推理
```

---

## 前端需求

### 1. 入口按钮设计

**位置**: 左侧提示词输入框左下角
**图标**: 魔法棒图标 (Lucide React: `Wand2`)
**Tooltip**: "提示词助理"
**排列顺序**: 图片上传 → 粘贴剪贴板 → **提示词助理**

```javascript
// 按钮状态
disabled: !connected || isGenerating  // ComfyUI 未连接或正在生成时禁用
```

### 2. 提示词助理面板 (Modal)

#### 2.1 面板布局

```
┌─────────────────────────────────────────────────────────┐
│  提示词助理                                      [X 关闭] │
├─────────────────────────────────────────────────────────┤
│  [ 创建变体 ] [ 扩写润色 ] [ 脑补后续 ] [ 生成剧本 ]     │
├───────────────────────────┬─────────────────────────────┤
│ 输入区域                   │  结果预览区域                │
│ ┌───────────────────────┐ │ ┌─────────────────────────┐ │
│ │ 提示词输入框 (可编辑)   │ │ │ [√] 结果 1 (默认选中)    │ │
│ │                       │ │ │ [ ] 结果 2              │ │
│ │ (多行，min 3 行)       │ │ │ [ ] 结果 3              │ │
│ └───────────────────────┘ │ └─────────────────────────┘ │
│                           │                             │
│ [生成] [应用]              │  (空状态/加载状态/结果列表)  │
└───────────────────────────┴─────────────────────────────┘
```

#### 2.2 面板规格

| 属性 | 值 |
|------|-----|
| 宽度 | 800px |
| 高度 | 600px (可调整) |
| 位置 | 屏幕居中 |
| 背景 | 主题自适应 (使用 CSS 变量) |
| 层级 | z-index: 1000 |
| 动画 | 淡入淡出 (fade-in/out) |

#### 2.3 Tab 切换功能

```javascript
const PRESET_MODES = [
  { id: 'variation', label: '创建变体', tooltip: '为提示词创建不同的变体版本' },
  { id: 'polish', label: '扩写润色', tooltip: '扩充和优化提示词细节' },
  { id: 'continue', label: '脑补后续', tooltip: '设计下一个分镜场景' },
  { id: 'script', label: '生成剧本', tooltip: '生成完整的分镜剧本' }
];
```

**交互**:
- 点击 Tab 切换模式
- 切换时保留当前输入框内容
- 不同模式对应不同的占位符提示

#### 2.4 输入框设计

```javascript
// 占位符文本（根据模式动态变化）
placeholders = {
  variation: '输入提示词，使用 # 标记需要变化的部分，@ 后跟 0-1 的权重，() 内写特殊偏好\n例如: a girl, #wearing red dress@ 0.8 (prefer blue tones)',
  polish: '输入提示词，使用 [] 或 【】 标记需要扩写的部分，... 的数量表示扩写程度\n例如: a girl, [wearing dress......], standing in the garden',
  continue: '输入当前分镜的提示词，AI 将为你设计下一个分镜场景',
  script: '输入故事大纲或情节描述，AI 将生成完整的分镜提示词\n可选：指定需要的分镜数量'
};
```

**特性**:
- 自动填充主界面的提示词内容
- 多行输入，最小 3 行，自动扩展
- 支持手动编辑
- 显示字符计数 (可选)

#### 2.5 生成按钮

**状态管理**:
```javascript
isGenerating: false  // 默认
isGenerating: true   // 生成中，按钮禁用并显示加载动画
```

**文本**:
- 默认: "生成"
- 加载中: "生成中..." + 加载图标

**验证**:
- 输入框不能为空
- 创建变体模式：如果输入为空，显示特殊字符指南
- 扩写润色模式：如果输入为空，显示特殊字符指南

#### 2.6 结果预览区域

**空状态**:
```
┌─────────────────────────┐
│   点击"生成"按钮          │
│   获取 AI 优化建议        │
└─────────────────────────┘
```

**加载状态**:
```
┌─────────────────────────┐
│   [加载动画]             │
│   AI 正在思考中...       │
└─────────────────────────┘
```

**结果列表**:
- 单选模式（使用 Radio）
- 每个结果卡片显示完整提示词
- 选中状态：边框高亮 + 背景色变化
- 支持鼠标悬停预览
- 默认选中第一个结果
- **必须有一个选中项，不允许空选**

```javascript
// 结果卡片结构
<div className={`result-card ${selected ? 'selected' : ''}`}>
  <input type="radio" name="prompt-result" checked={selected} />
  <div className="result-content">{promptText}</div>
</div>
```

#### 2.7 应用按钮

**功能**: 将选中的提示词回填到主界面左侧提示词输入框
**交互**: 点击后自动关闭面板

#### 2.8 关闭逻辑

**关闭方式**:
- 点击右上角 X 按钮
- 点击遮罩层
- 按 ESC 键

**状态保留**:
- 关闭时**不清空**面板状态
- 保留当前 Tab、输入内容、生成结果
- 下次打开恢复上次状态

#### 2.9 主题适配

使用 CorineGen 的主题系统 CSS 变量:

```css
.prompt-assistant-modal {
  background: hsl(var(--theme-hue), calc(var(--theme-saturation) * 0.15), 18%);
  border: 1px solid hsl(var(--theme-hue), var(--theme-saturation), 30%);
}

.result-card.selected {
  background: hsl(var(--theme-hue), var(--theme-saturation), 25%);
  border-color: hsl(var(--theme-hue), var(--theme-saturation), 60%);
}
```

### 3. 状态管理

```javascript
// App.jsx 中新增的 state
const [promptAssistantOpen, setPromptAssistantOpen] = useState(false);
const [assistantMode, setAssistantMode] = useState('variation');
const [assistantInput, setAssistantInput] = useState('');
const [assistantResults, setAssistantResults] = useState([]);
const [selectedResultIndex, setSelectedResultIndex] = useState(0);
const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
```

### 4. localStorage 持久化

```javascript
// 保存的状态
localStorage.setItem('promptAssistantState', JSON.stringify({
  mode: assistantMode,
  input: assistantInput,
  results: assistantResults,
  selectedIndex: selectedResultIndex
}));

// 组件挂载时恢复
useEffect(() => {
  const saved = localStorage.getItem('promptAssistantState');
  if (saved) {
    const state = JSON.parse(saved);
    // 恢复状态...
  }
}, []);
```

---

## 后端需求

### 1. 环境配置

**新增环境变量** (backend/.env):
```bash
# Grok API 配置
GROK_API_KEY=<YOUR JIEKOU API Key>
GROK_API_BASE_URL=https://api.jiekou.ai/openai
GROK_MODEL=grok-4-1-fast-reasoning

# API 限流配置
GROK_RATE_LIMIT_PER_MINUTE=10
GROK_MAX_TOKENS=1000000
```

### 2. 依赖安装

```bash
cd backend
npm install openai --save
npm install express-rate-limit --save
```

> **注意**: 使用 OpenAI SDK，通过配置 `baseURL` 指向 JieKou AI

### 3. 后端文件结构

```
backend/
├── src/
│   ├── index.js                    # Express 主入口
│   ├── services/
│   │   └── grokClient.js           # Grok API 客户端（新增）
│   ├── controllers/
│   │   └── promptController.js     # 提示词助理控制器（新增）
│   ├── config/
│   │   ├── grokConfig.js           # Grok 配置（新增）
│   │   └── systemPrompts.js        # 系统提示词配置（新增）
│   ├── schemas/
│   │   ├── variationSchema.js      # 变体生成 JSON Schema（新增）
│   │   └── scriptSchema.js         # 剧本生成 JSON Schema（新增）
│   └── middleware/
│       └── rateLimiter.js          # API 限流中间件（新增）
```

### 4. 核心模块实现

#### 4.1 Grok API 客户端 (services/grokClient.js)

```javascript
import OpenAI from 'openai';
import { GROK_CONFIG } from '../config/grokConfig.js';

class GrokClient {
  constructor() {
    this.client = new OpenAI({
      baseURL: GROK_CONFIG.baseURL,
      apiKey: GROK_CONFIG.apiKey,
    });
    this.model = GROK_CONFIG.model;
  }

  /**
   * 调用 Grok API（非流式）
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户输入
   * @param {object} options - 可选参数
   * @returns {Promise<string>} - 生成的文本
   */
  async generate(systemPrompt, userPrompt, options = {}) {
    const {
      temperature = 1,
      max_tokens = 1000000,
      top_k = 50,
      min_p = 0,
      presence_penalty = 0,
      frequency_penalty = 0,
      response_format = { type: 'text' }
    } = options;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        temperature,
        max_tokens,
        top_k,
        min_p,
        presence_penalty,
        frequency_penalty,
        response_format
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('[Grok API Error]', error);
      throw new Error(`Grok API 调用失败: ${error.message}`);
    }
  }

  /**
   * 调用 Grok API（流式）
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户输入
   * @param {function} onChunk - 接收到 chunk 的回调
   * @param {object} options - 可选参数
   */
  async generateStream(systemPrompt, userPrompt, onChunk, options = {}) {
    const {
      temperature = 1,
      max_tokens = 1000000,
      top_k = 50,
      min_p = 0,
      presence_penalty = 0,
      frequency_penalty = 0
    } = options;

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature,
        max_tokens,
        top_k,
        min_p,
        presence_penalty,
        frequency_penalty
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
        if (chunk.choices[0]?.finish_reason) {
          onChunk(null, chunk.choices[0].finish_reason);
        }
      }
    } catch (error) {
      console.error('[Grok API Stream Error]', error);
      throw new Error(`Grok API 流式调用失败: ${error.message}`);
    }
  }
}

export default new GrokClient();
```

#### 4.2 系统提示词配置 (config/systemPrompts.js)

```javascript
export const SYSTEM_PROMPTS = {
  variation: `你是文生图提示词工程师，为用户的提示词创建 variation。

规则说明:
- 用户输入中跟在 # 后的描述是希望你改变的内容
- 每个 # 内容后会有一个 @，@ 后面的浮点数 0-1 是希望你发挥的程度
- 越接近 1 你的变体发挥越大，但主要针对用户 # 标记的内容
- @ 权重后面的 () 括号内是用户针对这个变体修改对象的特殊偏好说明

输出要求:
- 生成 3-5 个提示词变体
- 保持原提示词的基础结构
- 重点变化用户 # 标记的部分
- 每个变体应有明显差异`,

  polish: `你是文生图提示词工程师，为用户的提示词进行扩写。

规则说明:
- 用户用 [] 或 【】 括起来的元素需要你扩写
- 中括号内的句尾会有 ... (点号数量从 1 个到多个)
- 根据点号的数量判断需要扩写的程度:
  - . (1个): 轻微扩写，增加 1-2 个细节
  - .. (2个): 适度扩写，增加 3-5 个细节
  - ... (3个): 中等扩写，增加 5-8 个细节
  - .... (4个+): 深度扩写，增加 8+ 个细节

输出要求:
- 只扩写标记的部分，保持其他内容不变
- 扩写应自然、符合提示词语法
- 增加具体的视觉细节描述`,

  continue: `你是文生图提示词工程师，同时也是分镜设计师和编剧。

任务:
- 根据用户输入的当前分镜提示词
- 设计出下一个分镜的场景
- 符合故事脉络的发展流程
- 特别注意以下连贯性:
  - 人物外貌和服装的一致性
  - 场景的空间逻辑
  - 动作的连续性
  - 情绪的自然过渡

输出要求:
- 返回一个完整的下一个分镜提示词
- 保持与前一个分镜的连贯性
- 推动故事向前发展`,

  script: `你是文生图提示词工程师，同时也是分镜设计师和编剧。

任务:
- 根据用户输入的故事大纲或情节描述
- 创作出每个分镜的提示词
- 符合故事脉络的发展流程
- 特别注意全局一致性:
  - 人物、服装、场景、动作描述的一致性和连贯性
  - 情节的起承转合
  - 视觉节奏的把控

输出要求:
- 如果用户明确提出要几张，则严格跟随要求
- 如果没有指定，则你自己决定合适的分镜数量（建议 4-8 个）
- 每个分镜应该是独立完整的提示词
- 分镜之间要有逻辑关联`
};
```

#### 4.3 JSON Schema 定义 (schemas/)

**variationSchema.js**:
```javascript
export const VARIATION_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'prompt_variations_schema',
    schema: {
      type: 'object',
      properties: {
        variations: {
          type: 'array',
          description: '提示词变体列表',
          items: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: '完整的提示词文本'
              },
              changes: {
                type: 'string',
                description: '相对原提示词的主要变化说明'
              }
            },
            required: ['prompt']
          },
          minItems: 3,
          maxItems: 5
        }
      },
      required: ['variations']
    }
  }
};
```

**scriptSchema.js**:
```javascript
export const SCRIPT_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'script_schema',
    schema: {
      type: 'object',
      properties: {
        shots: {
          type: 'array',
          description: '分镜列表',
          items: {
            type: 'object',
            properties: {
              shot_number: {
                type: 'integer',
                description: '分镜编号'
              },
              prompt: {
                type: 'string',
                description: '该分镜的完整提示词'
              },
              description: {
                type: 'string',
                description: '分镜场景简要描述'
              }
            },
            required: ['shot_number', 'prompt']
          }
        },
        total_shots: {
          type: 'integer',
          description: '总分镜数'
        }
      },
      required: ['shots', 'total_shots']
    }
  }
};
```

#### 4.4 提示词控制器 (controllers/promptController.js)

```javascript
import grokClient from '../services/grokClient.js';
import { SYSTEM_PROMPTS } from '../config/systemPrompts.js';
import { VARIATION_SCHEMA } from '../schemas/variationSchema.js';
import { SCRIPT_SCHEMA } from '../schemas/scriptSchema.js';

class PromptController {
  /**
   * 生成提示词（统一处理入口）
   */
  async generate(req, res) {
    const { mode, input } = req.body;

    // 参数验证
    if (!mode || !input) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: mode 和 input'
      });
    }

    if (!['variation', 'polish', 'continue', 'script'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: '无效的 mode 值'
      });
    }

    try {
      let result;

      switch (mode) {
        case 'variation':
          result = await this.generateVariations(input);
          break;
        case 'polish':
          result = await this.polishPrompt(input);
          break;
        case 'continue':
          result = await this.continueStory(input);
          break;
        case 'script':
          result = await this.generateScript(input);
          break;
      }

      res.json({
        success: true,
        mode,
        data: result
      });
    } catch (error) {
      console.error('[PromptController Error]', error);
      res.status(500).json({
        success: false,
        error: error.message || 'API 调用失败'
      });
    }
  }

  /**
   * 生成变体（结构化输出）
   */
  async generateVariations(input) {
    const systemPrompt = SYSTEM_PROMPTS.variation;

    const response = await grokClient.generate(
      systemPrompt,
      input,
      {
        temperature: 1.2,  // 提高创造性
        response_format: VARIATION_SCHEMA
      }
    );

    const parsed = JSON.parse(response);
    return parsed.variations.map(v => v.prompt);
  }

  /**
   * 润色扩写（文本输出）
   */
  async polishPrompt(input) {
    const systemPrompt = SYSTEM_PROMPTS.polish;

    const response = await grokClient.generate(
      systemPrompt,
      input,
      {
        temperature: 0.8
      }
    );

    return [response.trim()];  // 返回数组格式保持一致
  }

  /**
   * 脑补后续（文本输出）
   */
  async continueStory(input) {
    const systemPrompt = SYSTEM_PROMPTS.continue;

    const response = await grokClient.generate(
      systemPrompt,
      input,
      {
        temperature: 1.0
      }
    );

    return [response.trim()];
  }

  /**
   * 生成剧本（结构化输出）
   */
  async generateScript(input) {
    const systemPrompt = SYSTEM_PROMPTS.script;

    const response = await grokClient.generate(
      systemPrompt,
      input,
      {
        temperature: 1.0,
        response_format: SCRIPT_SCHEMA
      }
    );

    const parsed = JSON.parse(response);
    return parsed.shots.map(shot => shot.prompt);
  }
}

export default new PromptController();
```

#### 4.5 限流中间件 (middleware/rateLimiter.js)

```javascript
import rateLimit from 'express-rate-limit';

// Grok API 限流器
export const grokRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 每分钟最多 10 次请求
  message: {
    success: false,
    error: 'API 调用过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

#### 4.6 Grok 配置 (config/grokConfig.js)

```javascript
export const GROK_CONFIG = {
  baseURL: process.env.GROK_API_BASE_URL || 'https://api.jiekou.ai/openai',
  apiKey: process.env.GROK_API_KEY,
  model: process.env.GROK_MODEL || 'grok-4-1-fast-reasoning',
  maxTokens: parseInt(process.env.GROK_MAX_TOKENS) || 1000000,
  rateLimitPerMinute: parseInt(process.env.GROK_RATE_LIMIT_PER_MINUTE) || 10
};

// 验证配置
if (!GROK_CONFIG.apiKey) {
  console.error('[Grok Config Error] GROK_API_KEY 未设置');
  process.exit(1);
}
```

### 5. 路由注册 (index.js)

```javascript
import express from 'express';
import promptController from './controllers/promptController.js';
import { grokRateLimiter } from './middleware/rateLimiter.js';

const app = express();

// ... 现有路由 ...

// 新增：提示词助理 API
app.post(
  '/api/prompt-assistant/generate',
  grokRateLimiter,
  (req, res) => promptController.generate(req, res)
);

// 健康检查（无需限流）
app.get('/api/prompt-assistant/health', (req, res) => {
  res.json({ success: true, service: 'prompt-assistant' });
});
```

---

## API 接口规范

### POST /api/prompt-assistant/generate

生成优化后的提示词

#### 请求

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "mode": "variation",  // variation | polish | continue | script
  "input": "a girl, #wearing red dress@0.8(prefer blue tones), standing in the garden"
}
```

#### 响应

**成功 (200)**:
```json
{
  "success": true,
  "mode": "variation",
  "data": [
    "a girl, wearing blue dress with floral patterns, standing in the garden",
    "a girl, wearing elegant blue evening gown, standing in the garden",
    "a girl, wearing casual blue denim dress, standing in the garden"
  ]
}
```

**失败 (400)**:
```json
{
  "success": false,
  "error": "缺少必要参数: mode 和 input"
}
```

**失败 (429)**:
```json
{
  "success": false,
  "error": "API 调用过于频繁，请稍后再试"
}
```

**失败 (500)**:
```json
{
  "success": false,
  "error": "Grok API 调用失败: timeout"
}
```

---

## 数据结构定义

### 前端 State

```typescript
interface PromptAssistantState {
  open: boolean;                    // 面板是否打开
  mode: 'variation' | 'polish' | 'continue' | 'script';
  input: string;                    // 输入框内容
  results: string[];                // 生成结果列表
  selectedIndex: number;            // 当前选中的结果索引
  isGenerating: boolean;            // 是否正在生成
  error: string | null;             // 错误信息
}
```

### API 请求

```typescript
interface GenerateRequest {
  mode: 'variation' | 'polish' | 'continue' | 'script';
  input: string;
}
```

### API 响应

```typescript
interface GenerateResponse {
  success: boolean;
  mode?: string;
  data?: string[];    // 生成的提示词数组
  error?: string;
}
```

---

## 系统提示词配置

### 1. 创建变体 (variation)

**特殊字符说明**:
- `#`: 标记需要变化的内容
- `@`: 后跟 0-1 的浮点数，表示变化程度
- `()`: 特殊偏好说明

**示例输入**:
```
a girl, #wearing red dress@0.8(prefer blue tones), #long hair@0.5, standing in the garden
```

**预期输出**: 3-5 个变体

### 2. 扩写润色 (polish)

**特殊字符说明**:
- `[]` 或 `【】`: 标记需要扩写的部分
- `...`: 扩写程度（点号越多扩写越详细）

**示例输入**:
```
a girl, [wearing dress......], standing in the [garden..]
```

**预期输出**: 1 个扩写后的提示词

### 3. 脑补后续 (continue)

**输入**: 当前分镜的提示词
**输出**: 下一个分镜的提示词
**注意**: 保持人物、服装、场景的连贯性

### 4. 生成剧本 (script)

**输入**: 故事大纲或情节描述
**输出**: 4-8 个分镜提示词
**注意**: 全局一致性，起承转合

---

## 错误处理

### 前端错误处理

```javascript
try {
  const response = await fetch('/api/prompt-assistant/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, input })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  // 处理成功...
} catch (error) {
  console.error('[Prompt Assistant Error]', error);

  // 用户友好的错误提示
  let userMessage = '生成失败，请稍后重试';

  if (error.message.includes('频繁')) {
    userMessage = 'API 调用过于频繁，请等待 1 分钟后重试';
  } else if (error.message.includes('timeout')) {
    userMessage = '请求超时，请检查网络连接';
  } else if (error.message.includes('参数')) {
    userMessage = '输入参数有误，请检查后重试';
  }

  setError(userMessage);

  // 3 秒后清除错误提示
  setTimeout(() => setError(null), 3000);
}
```

### 后端错误处理

```javascript
// 统一错误处理中间件
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});
```

---

## 性能优化

### 1. 前端优化

- **防抖**: 输入框使用 debounce，减少不必要的渲染
- **懒加载**: Modal 组件按需加载
- **缓存**: 将生成结果缓存到 localStorage
- **取消请求**: 组件卸载时取消未完成的请求

```javascript
// 防抖示例
const debouncedInput = useCallback(
  debounce((value) => setAssistantInput(value), 300),
  []
);
```

### 2. 后端优化

- **连接池**: 复用 HTTP 连接
- **超时控制**: 设置合理的请求超时时间
- **限流**: 防止 API 滥用
- **日志**: 记录关键操作，便于排查问题

```javascript
// 超时控制示例
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s 超时

try {
  const response = await fetch(url, {
    signal: controller.signal,
    ...options
  });
  // 处理响应...
} finally {
  clearTimeout(timeoutId);
}
```

### 3. Grok API 优化

- **参数调优**:
  - `temperature`: 根据模式调整（变体 1.2，润色 0.8）
  - `max_tokens`: 限制输出长度，防止超时
- **结构化输出**: 对于需要返回多个结果的模式，使用 JSON Schema 确保格式统一
- **错误重试**: 对于网络错误，进行有限次数的重试

---

## 开发计划

### Phase 1: 后端基础 (预计 2 天)

- [x] 阅读文档，理解需求
- [ ] 配置 Grok API 环境
- [ ] 实现 GrokClient 基础功能
- [ ] 编写系统提示词配置
- [ ] 创建 JSON Schema
- [ ] 实现 PromptController
- [ ] 添加 API 路由
- [ ] 测试 API 连通性

### Phase 2: 前端基础 (预计 3 天)

- [ ] 设计 UI 组件结构
- [ ] 实现魔法棒按钮
- [ ] 创建提示词助理 Modal
- [ ] 实现 Tab 切换
- [ ] 实现输入框和占位符
- [ ] 实现生成按钮和加载状态
- [ ] 实现结果预览区域
- [ ] 实现选择和应用功能

### Phase 3: 功能集成 (预计 2 天)

- [ ] 前后端联调
- [ ] 测试 4 种模式
- [ ] 优化错误处理
- [ ] 完善加载动画
- [ ] 主题适配测试
- [ ] localStorage 状态持久化

### Phase 4: 优化和测试 (预计 1 天)

- [ ] 性能优化
- [ ] 边界情况测试
- [ ] 用户体验优化
- [ ] 文档完善
- [ ] 部署到生产环境

---

## 附录

### A. 特殊字符指南 UI

当用户在特定模式下输入为空时，显示指南：

**创建变体模式**:
```
使用特殊字符增强控制:
• # 标记需要变化的内容
• @ 后跟 0-1 的数字表示变化程度
• () 内写特殊偏好

示例:
a girl, #wearing red dress@0.8(prefer blue tones), standing in the garden
```

**扩写润色模式**:
```
使用特殊字符控制扩写:
• [] 或 【】 标记需要扩写的部分
• ... 的数量表示扩写程度
  - . 轻微扩写
  - .. 适度扩写
  - ... 中等扩写
  - .... 深度扩写

示例:
a girl, [wearing dress......], standing in the [garden..]
```

### B. 依赖包版本

**前端**:
```json
{
  "lucide-react": "^0.562.0"
}
```

**后端**:
```json
{
  "openai": "^4.75.0",
  "express-rate-limit": "^7.5.0"
}
```

### C. 环境变量示例

**backend/.env**:
```bash
# 现有配置
COMFYUI_HOST=http://127.0.0.1:8188
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://corine-gen.vercel.app

# 新增：Grok API 配置
GROK_API_KEY=your_jiekou_api_key_here
GROK_API_BASE_URL=https://api.jiekou.ai/openai
GROK_MODEL=grok-4-1-fast-reasoning
GROK_RATE_LIMIT_PER_MINUTE=10
GROK_MAX_TOKENS=1000000
```

**frontend/.env** (可选):
```bash
# 如果需要在前端配置
VITE_ENABLE_PROMPT_ASSISTANT=true
```

---

**文档结束**
