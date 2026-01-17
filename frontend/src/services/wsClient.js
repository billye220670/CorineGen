/**
 * WebSocket 客户端服务
 * 封装与后端的 WebSocket 通信
 */

import { API_CONFIG, getApiKey, isAuthRequired } from '../config/api.js';

class WsClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempt = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelays = [1000, 2000, 5000, 10000, 20000];
    this.reconnectTimer = null;
    this.isReconnecting = false;
    this.onReconnectCallback = null;
    this.onDisconnectCallback = null;
    this.lastClientId = null;
    this.pingInterval = null;
    this.pongTimeout = null;
    this.lastPongTime = null;
  }

  /**
   * 建立 WebSocket 连接
   * @param {string} clientId - 客户端 ID
   * @returns {Promise<void>}
   */
  connect(clientId) {
    return new Promise((resolve, reject) => {
      // 保存 clientId 用于重连
      this.lastClientId = clientId;

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
        console.log('WebSocket connected');
        this.reconnectAttempt = 0;
        this.isReconnecting = false;
        this.startPing();
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopPing();

        // 4001 是认证失败，不重连
        if (event.code === 4001) {
          this.emit('auth_error', { message: 'Authentication failed' });
          return;
        }

        // 1000 是正常关闭，不重连
        if (event.code === 1000) return;

        // 触发断开回调
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback({ code: event.code, reason: event.reason });
        }

        // 自动重连
        if (!this.isReconnecting && this.reconnectAttempt < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          // 处理 pong 消息
          if (type === 'pong') {
            clearTimeout(this.pongTimeout);
            this.lastPongTime = Date.now();
            return;
          }

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
   * 自动重连
   */
  reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempt++;

    const delay = this.reconnectDelays[this.reconnectAttempt - 1] || 20000;

    // 通知 UI
    this.emit('reconnecting', {
      attempt: this.reconnectAttempt,
      maxAttempts: this.maxReconnectAttempts,
      delay: delay
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        // 使用上次的 clientId 重连
        await this.connect(this.lastClientId);

        this.emit('reconnected', { clientId: this.lastClientId });

        if (this.onReconnectCallback) {
          this.onReconnectCallback({ clientId: this.lastClientId });
        }
      } catch (err) {
        console.error('Reconnect failed:', err);
        this.isReconnecting = false;

        if (this.reconnectAttempt < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          this.emit('reconnect_failed', { error: err.message });
        }
      }
    }, delay);
  }

  /**
   * 取消重连
   */
  cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempt = this.maxReconnectAttempts;
  }

  /**
   * 注册重连成功回调
   * @param {Function} callback - 回调函数
   */
  onReconnect(callback) {
    this.onReconnectCallback = callback;
  }

  /**
   * 注册断开连接回调
   * @param {Function} callback - 回调函数
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  /**
   * 启动 Ping/Pong 保活
   */
  startPing() {
    this.stopPing();  // 清除旧的定时器

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));

        // 设置 pong 超时（10 秒）
        this.pongTimeout = setTimeout(() => {
          console.warn('Pong timeout, connection may be dead');
          this.ws.close();  // 触发 onclose，进而触发重连
        }, 10000);
      }
    }, 20000);  // 每 20 秒 ping 一次
  }

  /**
   * 停止 Ping/Pong 保活
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.stopPing();
    this.cancelReconnect();
    if (this.ws) {
      this.ws.close(1000);  // 1000 表示正常关闭
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
