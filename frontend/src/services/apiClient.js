/**
 * API 客户端服务
 * 封装所有与后端的 HTTP 通信
 */

import { API_CONFIG, getApiKey, isAuthRequired } from '../config/api.js';

class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  /**
   * 获取认证头
   */
  getAuthHeaders() {
    const headers = {};
    if (isAuthRequired()) {
      const apiKey = getApiKey();
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }
    }
    return headers;
  }

  /**
   * 通用 fetch 封装
   */
  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 检测 ComfyUI 连接状态
   */
  async checkConnection(timeout = 3000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      await this.fetch(API_CONFIG.endpoints.systemStats, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return { connected: true };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.message === 'AUTH_REQUIRED') {
        return { connected: false, authRequired: true };
      }
      return { connected: false, error: err.message };
    }
  }

  /**
   * 获取可用的 LoRA 列表
   */
  async getLoraList() {
    const data = await this.fetch(API_CONFIG.endpoints.loraList);
    return data.LoraLoader?.input?.required?.lora_name?.[0] || [];
  }

  /**
   * 上传图片
   * @param {File|Blob} file - 图片文件
   * @param {string} filename - 文件名
   */
  async uploadImage(file, filename) {
    const formData = new FormData();
    formData.append('image', file, filename);
    formData.append('overwrite', 'true');

    const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.uploadImage}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  /**
   * 提交生成任务
   * @param {Object} workflow - ComfyUI 工作流
   * @param {string} clientId - 客户端 ID
   */
  async submitPrompt(workflow, clientId) {
    return this.fetch(API_CONFIG.endpoints.prompt, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId
      })
    });
  }

  /**
   * 获取生成历史记录
   * @param {string} promptId - 提示词 ID
   */
  async getHistory(promptId) {
    return this.fetch(API_CONFIG.endpoints.history(promptId));
  }

  /**
   * 构建图片 URL
   * @param {string} filename - 文件名
   * @param {string} subfolder - 子文件夹
   * @param {string} type - 类型 (output/input)
   */
  getImageUrl(filename, subfolder = '', type = 'output') {
    const endpoint = API_CONFIG.endpoints.viewImage(filename, subfolder, type);
    const url = `${this.baseUrl}${endpoint}&t=${Date.now()}`;

    // 如果需要认证，添加 API Key 到 URL（用于图片加载）
    if (isAuthRequired()) {
      const apiKey = getApiKey();
      if (apiKey) {
        return `${url}&apiKey=${encodeURIComponent(apiKey)}`;
      }
    }

    return url;
  }

  /**
   * 中断当前正在运行的任务
   */
  async interruptCurrentTask() {
    try {
      const response = await this.fetch('/api/interrupt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.error('[API] 中断任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除队列中的指定任务
   * @param {string[]} promptIds - 要删除的 prompt_id 列表
   */
  async deleteQueueTasks(promptIds) {
    try {
      const response = await this.fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delete: promptIds
        })
      });
      return response;
    } catch (error) {
      console.error('[API] 删除队列任务失败:', error);
      throw error;
    }
  }

  /**
   * 生成唯一的客户端 ID
   */
  generateClientId() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
