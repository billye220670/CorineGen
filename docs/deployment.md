# CorineGen 部署指南

本文档说明如何部署 CorineGen 前后端分离架构。

## 架构概览

```
远端用户 ──> Vercel (前端) ──> 花生壳 ──> 本机后端 ──> ComfyUI
```

---

## 一、本地开发

### 1. 安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd backend
npm install
```

### 2. 启动开发服务器

**方式 A: 通过后端代理（推荐）**

```bash
# 终端 1: 启动后端
cd backend
npm run dev

# 终端 2: 启动前端
cd frontend
npm run dev
```

**方式 B: 直连 ComfyUI（快速调试）**

```bash
# 设置环境变量直连 ComfyUI
cd frontend
VITE_DIRECT_COMFYUI=true npm run dev
```

### 3. 访问应用

- 前端: http://localhost:5173
- 后端: http://localhost:3001

---

## 二、后端部署（本机）

### 1. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```bash
COMFYUI_HOST=http://127.0.0.1:8188
PORT=3001
API_KEY=你的安全密钥-请修改
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
```

### 2. 启动后端服务

**开发模式（带热重载）：**

```bash
npm run dev
```

**生产模式（使用 PM2）：**

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/index.js --name corinegen-backend

# 设置开机自启
pm2 startup
pm2 save
```

### 3. 配置花生壳内网穿透

1. 登录花生壳管理平台
2. 添加映射：
   - 外网域名: `your-domain.oicp.net`
   - 内网地址: `127.0.0.1`
   - 内网端口: `3001`
3. 如果需要 HTTPS，开启 SSL 加密

---

## 三、前端部署（Vercel）

### 1. 准备代码仓库

确保代码已推送到 GitHub/GitLab/Bitbucket。

### 2. 在 Vercel 创建项目

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 导入你的代码仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_BACKEND_URL` | `https://your-domain.oicp.net` | 后端地址（花生壳域名） |
| `VITE_BACKEND_WS_URL` | `wss://your-domain.oicp.net` | WebSocket 地址 |

### 4. 部署

点击 "Deploy" 按钮，等待部署完成。

---

## 四、使用说明

### 首次访问

1. 打开 Vercel 部署的前端地址
2. 如果配置了 API Key，系统会提示输入
3. 输入后端 `.env` 中配置的 `API_KEY`
4. API Key 会保存在浏览器 localStorage 中

### 功能验证

1. 检查连接状态（右上角指示灯）
2. 测试文生图功能
3. 测试图生图功能
4. 测试高清化功能

---

## 五、故障排查

### 连接失败

1. 检查 ComfyUI 是否正在运行
2. 检查后端服务是否启动
3. 检查花生壳映射是否正常
4. 检查 Vercel 环境变量是否正确

### 认证失败

1. 检查 API Key 是否正确
2. 清除浏览器 localStorage 后重试
3. 检查后端 `.env` 中的 `API_KEY` 配置

### WebSocket 连接失败

1. 确保花生壳支持 WebSocket（需要 TCP 映射或 HTTPS）
2. 检查 `VITE_BACKEND_WS_URL` 协议是否正确（wss/ws）

### CORS 错误

1. 检查后端 `ALLOWED_ORIGINS` 是否包含前端域名
2. 确保域名格式正确（包含 https://）

---

## 六、安全建议

1. **API Key**: 使用强密码，定期更换
2. **HTTPS**: 生产环境务必使用 HTTPS
3. **限制访问**: 只添加必要的域名到 `ALLOWED_ORIGINS`
4. **防火墙**: 只开放必要的端口

---

## 七、常用命令

```bash
# 后端
cd backend
npm run dev          # 开发模式
npm start            # 生产模式
pm2 logs             # 查看日志
pm2 restart all      # 重启服务

# 前端
cd frontend
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
```
