/**
 * WebSocket 客户端服务
 * 封装与后端的 WebSocket 通信
 */

import { API_CONFIG, getApiKey, isAuthRequired } from '../config/api.js';

class WsClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * 建立 WebSocket 连接
   * @param {string} clientId - 客户端 ID
   * @returns {Promise<void>}
   */
  connect(clientId) {
    return new Promise((resolve, reject) => {
      // 构建 WebSocket URL
      let url = `${API_CONFIG.wsUrl}/ws?clientId=${clientId}`;

      // 如果需要认证，添加 API Key
      if (isAuthRequired()) {
        const apiKey = getApiKey();
        if (apiKey) {
          url += `&apiKey=${encodeURIComponent(apiKey)}`;
        }
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        // 4001 是认证失败的自定义关闭码
        if (event.code === 4001) {
          this.emit('auth_error', { message: 'Authentication failed' });
        }
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          // 触发对应类型的监听器
          this.emit(type, data);

          // 同时触发通用消息监听器
          this.emit('message', message);
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };
    });
  }

  /**
   * 注册事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 处理函数
   */
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(handler);
  }

  /**
   * 移除事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 处理函数（可选，不传则移除所有）
   */
  off(eventType, handler) {
    if (!handler) {
      this.listeners.delete(eventType);
      return;
    }

    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} eventType - 事件类型
   * @param {*} data - 数据
   */
  emit(eventType, data) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in WebSocket handler for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * 发送消息
   * @param {*} data - 要发送的数据
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  /**
   * 检查连接状态
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// 导出单例实例
export const wsClient = new WsClient();

// 同时导出类，便于创建多个实例
export { WsClient };
