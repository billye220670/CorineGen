/**
 * 适配器基类
 * 所有工作流适配器的抽象基类
 */

export class BaseAdapter {
  constructor(apiClient, wsClientClass) {
    this.apiClient = apiClient;
    this.WsClient = wsClientClass;
  }

  /**
   * 获取适配器类型标识
   * @returns {string}
   */
  getType() {
    throw new Error('getType must be implemented by subclass');
  }

  /**
   * 获取适配器显示名称
   * @returns {string}
   */
  getDisplayName() {
    throw new Error('getDisplayName must be implemented by subclass');
  }

  /**
   * 验证参数
   * @param {Object} params - 生成参数
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateParams(params) {
    throw new Error('validateParams must be implemented by subclass');
  }

  /**
   * 构建工作流
   * @param {Object} params - 生成参数
   * @returns {{ workflow: Object, seed: number, metadata: Object }}
   */
  buildWorkflow(params) {
    throw new Error('buildWorkflow must be implemented by subclass');
  }

  /**
   * 执行生成任务
   * @param {Object} params - 生成参数
   * @param {Object} callbacks - 回调函数
   * @param {Function} callbacks.onProgress - 进度回调 (progress: number, max: number)
   * @param {Function} callbacks.onComplete - 完成回调 (result: Object)
   * @param {Function} callbacks.onError - 错误回调 (error: Error)
   * @param {Function} callbacks.onLoading - 加载状态回调 (isLoading: boolean)
   */
  async execute(params, { onProgress, onComplete, onError, onLoading }) {
    // 验证参数
    const validation = this.validateParams(params);
    if (!validation.valid) {
      onError(new Error(validation.errors.join(', ')));
      return;
    }

    // 构建工作流
    const { workflow, seed, metadata } = this.buildWorkflow(params);
    const clientId = this.apiClient.generateClientId();

    // 创建新的 WebSocket 实例
    const wsClient = new this.WsClient();

    try {
      // 建立 WebSocket 连接
      await wsClient.connect(clientId);

      // 注册事件处理
      wsClient.on('execution_start', () => {
        onLoading?.(true);
      });

      wsClient.on('progress', (data) => {
        onLoading?.(false);
        onProgress?.(data.value, data.max);
      });

      wsClient.on('executing', async (data) => {
        if (data.node === null && data.prompt_id) {
          // 任务完成，获取结果
          try {
            const history = await this.apiClient.getHistory(data.prompt_id);
            const result = this.extractResults(history, data.prompt_id);
            onComplete?.({
              ...result,
              seed,
              metadata,
              promptId: data.prompt_id
            });
          } catch (err) {
            onError?.(err);
          } finally {
            wsClient.close();
          }
        }
      });

      wsClient.on('execution_error', (data) => {
        onError?.(new Error(data.exception_message || 'Execution error'));
        wsClient.close();
      });

      wsClient.on('auth_error', () => {
        onError?.(new Error('AUTH_REQUIRED'));
        wsClient.close();
      });

      // 提交工作流
      await this.apiClient.submitPrompt(workflow, clientId);
    } catch (err) {
      wsClient.close();
      onError?.(err);
    }

    // 返回 WebSocket 实例以便外部可以关闭连接
    return { wsClient, clientId };
  }

  /**
   * 从历史记录中提取结果
   * @param {Object} history - 历史记录
   * @param {string} promptId - 提示词 ID
   * @returns {Object}
   */
  extractResults(history, promptId) {
    const promptHistory = history[promptId];
    if (!promptHistory || !promptHistory.outputs) {
      throw new Error('No output found in history');
    }

    // 查找包含图片的输出节点
    const images = [];
    for (const nodeId in promptHistory.outputs) {
      const output = promptHistory.outputs[nodeId];
      if (output.images && output.images.length > 0) {
        for (const img of output.images) {
          images.push({
            filename: img.filename,
            subfolder: img.subfolder || '',
            type: img.type || 'output',
            url: this.apiClient.getImageUrl(img.filename, img.subfolder, img.type)
          });
        }
      }
    }

    return { images };
  }

  /**
   * 生成唯一 ID
   * @returns {string}
   */
  generateUniqueId() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * 计算图片尺寸
   * @param {string} aspectRatio - 宽高比
   * @param {number} scale - 缩放比例
   * @returns {{ width: number, height: number }}
   */
  calculateDimensions(aspectRatio, scale = 1) {
    const dimensions = {
      'portrait': { width: 720, height: 1280 },
      'landscape': { width: 1280, height: 720 },
      '4:3': { width: 1152, height: 864 },
      '3:4': { width: 864, height: 1152 },
      '2.35:1': { width: 1536, height: 656 },
      'square': { width: 1024, height: 1024 }
    };

    const base = dimensions[aspectRatio] || dimensions['square'];
    return {
      width: Math.round(base.width * scale),
      height: Math.round(base.height * scale)
    };
  }

  /**
   * 获取种子值
   * @param {string} seedMode - 种子模式 ('random', 'fixed', 'first-fixed')
   * @param {number|string} fixedSeed - 固定种子
   * @param {number|string} firstFixedSeed - 首次固定种子
   * @param {React.MutableRefObject} firstSeedRef - 首次种子引用
   * @returns {number}
   */
  getSeed(seedMode, fixedSeed, firstFixedSeed, firstSeedRef) {
    if (seedMode === 'fixed') {
      return parseInt(fixedSeed) || Math.floor(Math.random() * 1e15);
    } else if (seedMode === 'first-fixed') {
      if (firstSeedRef && firstSeedRef.current === null) {
        firstSeedRef.current = parseInt(firstFixedSeed) || Math.floor(Math.random() * 1e15);
      }
      return firstSeedRef?.current || Math.floor(Math.random() * 1e15);
    }
    return Math.floor(Math.random() * 1e15);
  }
}
