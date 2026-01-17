/**
 * ControlNet 适配器
 * 处理基于参考图片控制的图像生成（线稿/深度/姿势）
 */

import { BaseAdapter } from './BaseAdapter.js';
import workflowTemplate from '../workflows/ControlNet.json';

export class ControlNetAdapter extends BaseAdapter {
  // 控制模式映射
  static CONTROL_MODES = {
    'lineart': { index: 0, name: '线稿' },
    'depth': { index: 1, name: '深度' },
    'pose': { index: 2, name: '姿势' }
  };

  getType() {
    return 'controlnet';
  }

  getDisplayName() {
    return 'ControlNet';
  }

  validateParams(params) {
    const errors = [];

    if (!params.prompt?.trim()) {
      errors.push('请输入提示词');
    }

    if (!params.imageFilename) {
      errors.push('请提供参考图片');
    }

    if (!params.controlMode || !ControlNetAdapter.CONTROL_MODES[params.controlMode]) {
      errors.push('请选择有效的控制模式（线稿/深度/姿势）');
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
      controlMode,
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

    // 处理提示词（ControlNet 不使用 LoRA 触发词）
    let processedPrompt = prompt || '';

    // 添加缓存破坏符
    if (uniqueId) {
      const cacheBreaker = `\u200B${uniqueId}\u200B${Date.now()}`;
      processedPrompt = processedPrompt + cacheBreaker;
    }

    // 节点 11: LoadImage - 参考图片
    workflow['11'].inputs.image = imageFilename;

    // 节点 5: 提示词
    workflow['5'].inputs.text = processedPrompt;

    // 节点 28: 控制模式选择 (0=线稿, 1=深度, 2=姿势)
    const modeConfig = ControlNetAdapter.CONTROL_MODES[controlMode];
    workflow['28'].inputs.index = modeConfig.index;

    // 节点 4: KSampler
    workflow['4'].inputs.seed = seed;
    workflow['4'].inputs.steps = steps;
    workflow['4'].inputs.sampler_name = samplerName;
    workflow['4'].inputs.scheduler = scheduler;
    workflow['4'].inputs.denoise = denoise;

    // 节点 48: SaveImage
    if (uniqueId) {
      workflow['48'].inputs.filename_prefix = `CNN_${uniqueId}_`;
    }

    return {
      workflow,
      seed,
      metadata: {
        type: this.getType(),
        controlMode,
        controlModeName: modeConfig.name,
        denoise,
        steps,
        imageFilename
      }
    };
  }
}
