/**
 * 图生图适配器
 * 处理基于参考图片的图像生成
 */

import { BaseAdapter } from './BaseAdapter.js';
import workflowTemplate from '../workflows/Image2Image.json';

export class Image2ImageAdapter extends BaseAdapter {
  getType() {
    return 'image-to-image';
  }

  getDisplayName() {
    return '图生图';
  }

  validateParams(params) {
    const errors = [];

    if (!params.prompt?.trim()) {
      errors.push('请输入提示词');
    }

    if (!params.imageFilename) {
      errors.push('请提供参考图片');
    }

    if (params.denoise < 0 || params.denoise > 1) {
      errors.push('降噪强度应在 0-1 之间');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  buildWorkflow(params) {
    const {
      prompt,
      imageFilename,
      steps,
      samplerName,
      scheduler,
      seedMode,
      fixedSeed,
      firstFixedSeed,
      firstSeedRef,
      denoise = 1,
      uniqueId
    } = params;

    // 深拷贝工作流模板
    const workflow = JSON.parse(JSON.stringify(workflowTemplate));

    // 获取种子
    const seed = this.getSeed(seedMode, fixedSeed, firstFixedSeed, firstSeedRef);

    // 处理提示词（图生图不使用 LoRA 触发词）
    let processedPrompt = prompt || '';

    // 添加缓存破坏符
    if (uniqueId) {
      const cacheBreaker = `\u200B${uniqueId}\u200B${Date.now()}`;
      processedPrompt = processedPrompt + cacheBreaker;
    }

    // 节点 52: LoadImage - 参考图片
    workflow['52'].inputs.image = imageFilename;

    // 节点 44: 提示词
    workflow['44'].inputs.text = processedPrompt;

    // 节点 4: KSampler
    workflow['4'].inputs.seed = seed;
    workflow['4'].inputs.steps = steps;
    workflow['4'].inputs.sampler_name = samplerName;
    workflow['4'].inputs.scheduler = scheduler;
    workflow['4'].inputs.denoise = denoise;

    // 节点 24: SaveImage
    if (uniqueId) {
      workflow['24'].inputs.filename_prefix = `Img2Img_${uniqueId}_`;
    }

    return {
      workflow,
      seed,
      metadata: {
        type: this.getType(),
        denoise,
        steps,
        imageFilename
      }
    };
  }
}
