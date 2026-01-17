/**
 * 高清化适配器
 * 处理图像超分辨率放大
 */

import { BaseAdapter } from './BaseAdapter.js';
import workflowTemplate from '../workflows/Upscale.json';

export class UpscaleAdapter extends BaseAdapter {
  getType() {
    return 'upscale';
  }

  getDisplayName() {
    return '高清化';
  }

  validateParams(params) {
    const errors = [];

    if (!params.imageFilename) {
      errors.push('请提供要高清化的图片');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  buildWorkflow(params) {
    const { imageFilename } = params;

    // 深拷贝工作流模板
    const workflow = JSON.parse(JSON.stringify(workflowTemplate));

    // 节点 1145: LoadImage - 要高清化的图片
    workflow['1145'].inputs.image = imageFilename;

    return {
      workflow,
      seed: null, // 高清化不需要种子
      metadata: {
        type: this.getType(),
        imageFilename,
        scaleFactor: 4 // SeedVR2 默认 4x 放大
      }
    };
  }

  /**
   * 高清化的执行流程略有不同，因为没有种子
   */
  async execute(params, callbacks) {
    // 验证参数
    const validation = this.validateParams(params);
    if (!validation.valid) {
      callbacks.onError?.(new Error(validation.errors.join(', ')));
      return;
    }

    // 构建工作流
    const { workflow, metadata } = this.buildWorkflow(params);
    const clientId = this.apiClient.generateClientId();

    // 创建新的 WebSocket 实例
    const wsClient = new this.WsClient();

    try {
      // 建立 WebSocket 连接
      await wsClient.connect(clientId);

      // 注册事件处理
      wsClient.on('execution_start', () => {
        callbacks.onLoading?.(true);
      });

      wsClient.on('progress', (data) => {
        callbacks.onLoading?.(false);
        callbacks.onProgress?.(data.value, data.max);
      });

      wsClient.on('executing', async (data) => {
        if (data.node === null && data.prompt_id) {
          try {
            const history = await this.apiClient.getHistory(data.prompt_id);
            const result = this.extractResults(history, data.prompt_id);
            callbacks.onComplete?.({
              ...result,
              metadata,
              promptId: data.prompt_id
            });
          } catch (err) {
            callbacks.onError?.(err);
          } finally {
            wsClient.close();
          }
        }
      });

      wsClient.on('execution_error', (data) => {
        callbacks.onError?.(new Error(data.exception_message || 'Upscale error'));
        wsClient.close();
      });

      wsClient.on('auth_error', () => {
        callbacks.onError?.(new Error('AUTH_REQUIRED'));
        wsClient.close();
      });

      // 提交工作流
      await this.apiClient.submitPrompt(workflow, clientId);
    } catch (err) {
      wsClient.close();
      callbacks.onError?.(err);
    }

    return { wsClient, clientId };
  }
}
