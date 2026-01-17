/**
 * API 配置文件
 * 根据环境自动选择正确的后端地址
 */

const isDevelopment = import.meta.env.DEV;

// 开发环境使用 Vite 代理，生产环境使用环境变量配置的后端地址
const baseUrl = isDevelopment
  ? ''
  : (import.meta.env.VITE_BACKEND_URL || '');

// WebSocket URL
// 开发环境: 通过 Vite 代理 (ws://localhost:5173/ws)
// 生产环境: 使用环境变量配置的后端地址
const wsBaseUrl = isDevelopment
  ? `ws://${window.location.host}`
  : (import.meta.env.VITE_BACKEND_WS_URL || `wss://${window.location.host}`);

export const API_CONFIG = {
  baseUrl,
  wsUrl: wsBaseUrl,

  endpoints: {
    // 系统状态（连接检测）
    systemStats: '/api/system_stats',

    // LoRA 列表
    loraList: '/api/object_info/LoraLoader',

    // 图片上传
    uploadImage: '/api/upload/image',

    // 提交生成任务
    prompt: '/api/prompt',

    // 获取历史记录
    history: (promptId) => `/api/history/${promptId}`,

    // 获取图片 URL
    viewImage: (filename, subfolder = '', type = 'output') =>
      `/api/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`
  }
};

/**
 * 获取存储的 API Key
 */
export function getApiKey() {
  return localStorage.getItem('corineGen_apiKey') || '';
}

/**
 * 保存 API Key
 */
export function setApiKey(key) {
  localStorage.setItem('corineGen_apiKey', key);
}

/**
 * 检查是否需要认证
 * 已禁用认证功能
 */
export function isAuthRequired() {
  return false;
}
