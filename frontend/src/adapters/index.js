/**
 * 适配器注册表
 * 管理所有工作流适配器的注册和获取
 */

import { TextToImageAdapter } from './TextToImageAdapter.js';
import { Image2ImageAdapter } from './Image2ImageAdapter.js';
import { ControlNetAdapter } from './ControlNetAdapter.js';
import { UpscaleAdapter } from './UpscaleAdapter.js';

class AdapterRegistryClass {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * 注册适配器
   * @param {string} type - 适配器类型
   * @param {class} AdapterClass - 适配器类
   */
  register(type, AdapterClass) {
    this.adapters.set(type, AdapterClass);
  }

  /**
   * 获取适配器实例
   * @param {string} type - 适配器类型
   * @param {Object} apiClient - API 客户端
   * @param {class} WsClient - WebSocket 客户端类
   * @returns {BaseAdapter}
   */
  get(type, apiClient, WsClient) {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`Unknown adapter type: ${type}`);
    }
    return new AdapterClass(apiClient, WsClient);
  }

  /**
   * 检查适配器类型是否存在
   * @param {string} type - 适配器类型
   * @returns {boolean}
   */
  has(type) {
    return this.adapters.has(type);
  }

  /**
   * 获取所有注册的适配器类型
   * @returns {string[]}
   */
  getTypes() {
    return Array.from(this.adapters.keys());
  }

  /**
   * 获取所有适配器的信息
   * @param {Object} apiClient - API 客户端
   * @param {class} WsClient - WebSocket 客户端类
   * @returns {Array<{type: string, name: string}>}
   */
  getAdapterInfo(apiClient, WsClient) {
    return this.getTypes().map(type => {
      const adapter = this.get(type, apiClient, WsClient);
      return {
        type,
        name: adapter.getDisplayName()
      };
    });
  }
}

// 创建单例
export const AdapterRegistry = new AdapterRegistryClass();

// 注册内置适配器
AdapterRegistry.register('text-to-image', TextToImageAdapter);
AdapterRegistry.register('image-to-image', Image2ImageAdapter);
AdapterRegistry.register('controlnet', ControlNetAdapter);
AdapterRegistry.register('upscale', UpscaleAdapter);

// 导出所有适配器类
export {
  TextToImageAdapter,
  Image2ImageAdapter,
  ControlNetAdapter,
  UpscaleAdapter
};

// 导出基类
export { BaseAdapter } from './BaseAdapter.js';
