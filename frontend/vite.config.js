import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发模式配置：
// - 直连 ComfyUI: 设置 VITE_DIRECT_COMFYUI=true
// - 通过后端代理: 默认，需要先启动 backend 服务

const directComfyUI = process.env.VITE_DIRECT_COMFYUI === 'true';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许通过 IP 地址访问
    port: 5173,
    proxy: directComfyUI ? {
      // 直连 ComfyUI（开发调试用）
      '/api': {
        target: 'http://127.0.0.1:8188',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://127.0.0.1:8188',
        ws: true
      }
    } : {
      // 通过后端代理（推荐）
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true
      }
    }
  }
})
