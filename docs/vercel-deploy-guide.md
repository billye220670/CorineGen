# CorineGen Vercel 快速部署指南

本指南帮助你将 CorineGen 前端部署到 Vercel，并配置与本地后端的连接。

## 架构说明

```
互联网用户 ──> Vercel (前端) ──> 花生壳/内网穿透 ──> 本机后端 ──> ComfyUI
```

## 前置条件

1. GitHub/GitLab/Bitbucket 账号（用于代码托管）
2. Vercel 账号（免费注册：https://vercel.com）
3. 本机已配置好后端服务和内网穿透

---

## 第一步：推送代码到 GitHub

```bash
# 如果还没有远程仓库，先在 GitHub 创建一个新仓库
# 然后添加远程地址并推送
git remote add origin https://github.com/你的用户名/CorineGen.git
git branch -M main
git push -u origin main
```

---

## 第二步：在 Vercel 创建项目

1. 访问 https://vercel.com 并登录
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 找到并选择你的 `CorineGen` 仓库
5. 点击 **"Import"**

---

## 第三步：配置项目设置

在 **"Configure Project"** 页面：

| 设置项 | 值 |
|--------|-----|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> **重要**: Root Directory 必须设置为 `frontend`，因为前端代码在子目录中。

---

## 第四步：配置环境变量

在 **"Environment Variables"** 部分添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_BACKEND_URL` | `https://你的域名.oicp.net` | 后端 HTTP 地址（花生壳域名） |
| `VITE_BACKEND_WS_URL` | `wss://你的域名.oicp.net` | 后端 WebSocket 地址 |

### 示例

如果你的花生壳域名是 `myserver.oicp.net`：

```
VITE_BACKEND_URL = https://myserver.oicp.net
VITE_BACKEND_WS_URL = wss://myserver.oicp.net
```

> **注意**:
> - 生产环境必须使用 HTTPS/WSS
> - 如果花生壳不支持 HTTPS，需要开启 SSL 加密功能

---

## 第五步：部署

1. 确认所有配置无误
2. 点击 **"Deploy"** 按钮
3. 等待部署完成（通常 1-2 分钟）
4. 部署成功后会获得一个 Vercel 域名，如：`corinegen-xxx.vercel.app`

---

## 第六步：配置后端 CORS

部署完成后，需要将 Vercel 域名添加到后端的允许列表。

编辑后端的 `.env` 文件：

```bash
# backend/.env
COMFYUI_HOST=http://127.0.0.1:8188
PORT=3001
API_KEY=你的安全密钥
ALLOWED_ORIGINS=https://corinegen-xxx.vercel.app,http://localhost:5173
```

然后重启后端服务：

```bash
# 如果使用 PM2
pm2 restart corinegen-backend

# 如果使用开发模式
# 重新运行 npm run dev
```

---

## 第七步：验证部署

1. 访问 Vercel 分配的域名
2. 如果配置了 API Key，输入后端 `.env` 中的 `API_KEY`
3. 检查右上角连接状态是否为绿色
4. 测试图像生成功能

---

## 环境变量说明

### 前端环境变量（Vercel）

| 变量 | 必需 | 说明 |
|------|------|------|
| `VITE_BACKEND_URL` | 是 | 后端 API 地址 |
| `VITE_BACKEND_WS_URL` | 是 | 后端 WebSocket 地址 |

### 后端环境变量（本机 .env）

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `COMFYUI_HOST` | 否 | `http://127.0.0.1:8188` | ComfyUI 地址 |
| `PORT` | 否 | `3001` | 后端端口 |
| `API_KEY` | 否 | 无 | API 认证密钥（不设置则跳过认证） |
| `ALLOWED_ORIGINS` | 否 | `http://localhost:5173` | 允许的前端域名（逗号分隔） |

---

## 常见问题

### Q: 部署后显示"连接失败"

检查以下几点：
1. 后端服务是否正在运行
2. 花生壳内网穿透是否正常
3. Vercel 环境变量是否正确配置
4. 后端 `ALLOWED_ORIGINS` 是否包含 Vercel 域名

### Q: 提示"API Key 错误"

1. 检查后端 `.env` 中的 `API_KEY` 设置
2. 在前端输入正确的 API Key
3. 清除浏览器 localStorage 后重试

### Q: WebSocket 连接失败

1. 确保 `VITE_BACKEND_WS_URL` 使用 `wss://`（而非 `ws://`）
2. 确保花生壳支持 WebSocket（需要 HTTPS/TCP 映射）

### Q: 如何更新部署？

推送代码到 GitHub 后，Vercel 会自动重新部署：

```bash
git add .
git commit -m "更新内容"
git push
```

### Q: 如何使用自定义域名？

1. 在 Vercel 项目设置中选择 **"Domains"**
2. 添加你的自定义域名
3. 按照指引配置 DNS 记录
4. 记得更新后端 `ALLOWED_ORIGINS`

---

## 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] Vercel 项目 Root Directory 设置为 `frontend`
- [ ] 已配置 `VITE_BACKEND_URL` 环境变量
- [ ] 已配置 `VITE_BACKEND_WS_URL` 环境变量
- [ ] 后端 `ALLOWED_ORIGINS` 包含 Vercel 域名
- [ ] 后端服务正在运行
- [ ] 内网穿透正常工作
- [ ] ComfyUI 正在运行

---

## 快速命令参考

```bash
# 本地测试生产构建
cd frontend
npm run build
npm run preview

# 后端开发模式
cd backend
npm run dev

# 后端生产模式（PM2）
pm2 start src/index.js --name corinegen-backend
pm2 logs
pm2 restart all
```

---

最后更新: 2026-01-17
