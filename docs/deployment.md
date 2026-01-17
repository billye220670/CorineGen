# CorineGen 部署指南

本文档说明如何部署 CorineGen 前后端分离架构。

## 架构概览

```
远端用户 ──> Vercel (前端) ──> 花生壳 ──> 本机后端 ──> ComfyUI
```

**特点**:
- ✅ 前端静态部署 (Vercel)
- ✅ 后端本机运行 (Express)
- ✅ 无需认证 (已移除 API Key)
- ✅ 花生壳内网穿透
- ✅ CORS 跨域支持

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
- 后端健康检查: http://localhost:3001/health

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
ALLOWED_ORIGINS=https://corine-gen.vercel.app,http://localhost:5173
```

**重要**:
- `ALLOWED_ORIGINS` 必须包含你的 Vercel 域名
- **不要**在域名末尾加斜杠
- 多个域名用逗号分隔，不要有空格

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

# 查看日志
pm2 logs corinegen-backend

# 重启服务
pm2 restart corinegen-backend

# 设置开机自启
pm2 startup
pm2 save
```

### 3. 配置花生壳内网穿透

**准备工作**:
1. 注册花生壳账号
2. 下载并登录花生壳客户端

**配置映射**:
1. 登录花生壳管理平台
2. 添加映射：
   - **外网域名**: 你的花生壳域名（如 `6802gd0yf444.vicp.fun`）
   - **内网地址**: `127.0.0.1`
   - **内网端口**: `3001` ⚠️ **必须是 3001，不是 5173**
   - **协议**: HTTP/HTTPS（推荐 HTTPS）

**验证配置**:
```bash
# 访问花生壳域名的健康检查端点
curl https://your-domain.vicp.fun/health
```

应该返回:
```json
{
  "status": "ok",
  "comfyui": "http://127.0.0.1:8188",
  "timestamp": "2026-01-17T..."
}
```

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

**Settings → Environment Variables**

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `VITE_BACKEND_URL` | `https://your-domain.vicp.fun` | Production, Preview, Development |
| `VITE_BACKEND_WS_URL` | `wss://your-domain.vicp.fun` | Production, Preview, Development |

**注意**:
- 使用你的实际花生壳域名
- HTTP 对应 `https://`，WebSocket 对应 `wss://`
- **不要**在 URL 末尾加斜杠

### 4. 部署

点击 "Deploy" 按钮，等待部署完成（约 1-2 分钟）。

### 5. 测试部署

访问 Vercel 给你的域名（如 `https://corine-gen.vercel.app`），应该能看到应用正常运行。

---

## 四、使用说明

### 首次访问

1. 打开 Vercel 部署的前端地址
2. 检查连接状态（右上角应显示 "Connected"）
3. 测试生成功能

### 功能验证

1. **连接测试**: 右上角连接指示灯应为绿色
2. **文生图**: 输入提示词点击生成
3. **图生图**: 上传参考图片进行生成
4. **高清化**: 点击图片右下角 HQ 按钮

---

## 五、故障排查

### 问题 1: 连接失败

**症状**: 页面显示 "Disconnected" 或无法生成图片

**排查步骤**:
1. 检查 ComfyUI 是否正在运行
2. 检查后端服务是否启动
   ```bash
   # Windows
   netstat -ano | findstr :3001

   # Linux/Mac
   lsof -i :3001
   ```
3. 检查花生壳映射是否正常
   ```bash
   curl https://your-domain.vicp.fun/health
   ```
4. 检查 Vercel 环境变量是否正确配置

### 问题 2: CORS 错误

**症状**: 浏览器控制台显示 "No 'Access-Control-Allow-Origin' header"

**解决方法**:
1. 检查后端 `.env` 中的 `ALLOWED_ORIGINS` 是否包含前端域名
2. 确保域名格式正确（无斜杠）：
   ```bash
   # ✅ 正确
   ALLOWED_ORIGINS=https://corine-gen.vercel.app

   # ❌ 错误
   ALLOWED_ORIGINS=https://corine-gen.vercel.app/
   ```
3. 重启后端服务

### 问题 3: WebSocket 连接失败

**症状**: 图像生成进度不显示

**解决方法**:
1. 确保花生壳支持 WebSocket（使用 HTTPS/TCP 映射）
2. 检查 `VITE_BACKEND_WS_URL` 协议是否正确（wss/ws）
3. 查看浏览器 Network 面板 → WS 标签查看 WebSocket 连接状态

### 问题 4: 花生壳返回 Vite 错误

**症状**: 访问花生壳域名看到 "This host is not allowed"

**原因**: 花生壳映射到了前端端口 5173 而不是后端端口 3001

**解决方法**: 修改花生壳映射配置，内网端口改为 `3001`

### 问题 5: Vercel 部署后代码未更新

**症状**: 推送了新代码但 Vercel 上还是旧版本

**解决方法**:
1. 前往 Vercel 控制台
2. Deployments → 找到最新部署 → Redeploy
3. 清除浏览器缓存后刷新

---

## 六、安全建议

### 1. 网络安全

- ✅ 只添加必要的域名到 `ALLOWED_ORIGINS`
- ✅ 使用 HTTPS（花生壳支持免费 SSL）
- ⚠️ 不要将 `.env` 文件提交到 Git
- ⚠️ 定期检查花生壳访问日志

### 2. 访问控制

当前版本**已移除认证功能**，任何人访问 Vercel 网站都可以使用。

如果需要添加访问控制：
- 方案 A: Vercel 自带的密码保护（Settings → Password Protection）
- 方案 B: 自己实现 API Key 认证（参考 Git 历史记录 `8290f42` 之前的版本）

### 3. 资源保护

- 限制 ComfyUI 只监听 `127.0.0.1`（不要监听 `0.0.0.0`）
- 使用防火墙规则限制端口访问
- 定期检查后端日志

---

## 七、常用命令

```bash
# 后端
cd backend
npm run dev          # 开发模式
npm start            # 生产模式
pm2 start src/index.js --name corinegen-backend  # PM2 启动
pm2 logs             # 查看日志
pm2 restart all      # 重启服务
pm2 stop all         # 停止服务

# 前端
cd frontend
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产构建

# Git
git pull             # 拉取最新代码
git status           # 查看状态
git log --oneline -5 # 查看最近提交

# 测试
curl http://localhost:3001/health              # 测试本地后端
curl https://your-domain.vicp.fun/health       # 测试花生壳
```

---

## 八、更新部署

### 更新后端

```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖（如果 package.json 有变化）
cd backend
npm install

# 3. 重启服务
pm2 restart corinegen-backend
```

### 更新前端

```bash
# 1. 拉取最新代码
git pull

# 2. 推送到 GitHub
git push

# 3. Vercel 会自动部署
# 或手动触发: Vercel 控制台 → Deployments → Redeploy
```

---

## 九、环境变量完整参考

### 后端 (backend/.env)

```bash
# ComfyUI 地址
COMFYUI_HOST=http://127.0.0.1:8188

# 后端端口
PORT=3001

# 允许的前端域名（CORS）
# 多个域名用逗号分隔，不要有空格
# 不要在域名末尾加斜杠
ALLOWED_ORIGINS=https://corine-gen.vercel.app,http://localhost:5173
```

### 前端 (Vercel 环境变量)

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `VITE_BACKEND_URL` | `https://6802gd0yf444.vicp.fun` | 后端 HTTP 地址 |
| `VITE_BACKEND_WS_URL` | `wss://6802gd0yf444.vicp.fun` | 后端 WebSocket 地址 |

---

## 十、架构图

```
┌─────────────────┐
│   远端用户      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Vercel (前端)  │  ← React 静态文件
│  corine-gen     │  ← 环境变量配置
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│     花生壳      │  ← 内网穿透
│  6802gd0yf444   │  ← 端口映射 3001
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  本机后端服务   │  ← Express 代理
│  127.0.0.1:3001 │  ← CORS 处理
└────────┬────────┘
         │ HTTP/WS
         ▼
┌─────────────────┐
│    ComfyUI      │  ← 图像生成
│  127.0.0.1:8188 │  ← API + WebSocket
└─────────────────┘
```

---

## 附录

### A. 完整的 .env 示例

**backend/.env**:
```bash
COMFYUI_HOST=http://127.0.0.1:8188
PORT=3001
ALLOWED_ORIGINS=https://corine-gen.vercel.app,http://localhost:5173
```

### B. Vercel 配置文件

**frontend/vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### C. 花生壳配置示例

- **映射名称**: CorineGen Backend
- **外网域名**: 6802gd0yf444.vicp.fun
- **内网地址**: 127.0.0.1
- **内网端口**: 3001
- **协议**: HTTPS
- **SSL**: 开启

---

**最后更新**: 2026-01-17
**当前版本**: 前后端分离 + 无认证
