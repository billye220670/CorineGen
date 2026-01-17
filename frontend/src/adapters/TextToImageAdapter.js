/**
 * 文生图适配器
 * 处理基础的文本到图像生成
 */

import { BaseAdapter } from './BaseAdapter.js';
import workflowTemplate from '../workflows/TextToImage.json';

export class TextToImageAdapter extends BaseAdapter {
  getType() {
    return 'text-to-image';
  }

  getDisplayName() {
    return '文生图';
  }

  validateParams(params) {
    const errors = [];

    if (!params.prompt?.trim()) {
      errors.push('请输入提示词');
    }

    if (params.steps < 1 || params.steps > 50) {
      errors.push('采样步数应在 1-50 之间');
    }

    if (params.batchSize < 1 || params.batchSize > 10) {
      errors.push('批次数量应在 1-10 之间');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  buildWorkflow(params) {
    const {
      prompt,
      steps,
      aspectRatio,
      resolutionScale,
      samplerName,
      scheduler,
      loraEnabled,
      loraName,
      loraStrengthModel,
      loraStrengthClip,
      enabledLoras,
      seedMode,
      fixedSeed,
      firstFixedSeed,
      firstSeedRef,
      batchSize,
      batchMethod,
      uniqueId
    } = params;

    // 深拷贝工作流模板
    const workflow = JSON.parse(JSON.stringify(workflowTemplate));

    // 计算尺寸
    const dimensions = this.calculateDimensions(aspectRatio, resolutionScale);

    // 获取种子
    const seed = this.getSeed(seedMode, fixedSeed, firstFixedSeed, firstSeedRef);

    // 处理提示词
    let processedPrompt = prompt || '';

    // 如果启用了 LoRA，添加触发词
    if (loraEnabled && loraName) {
      const currentLoraConfig = enabledLoras?.find(l => l.name === loraName);
      if (currentLoraConfig?.triggerWord) {
        processedPrompt = `${currentLoraConfig.triggerWord}, ${processedPrompt}`;
      }
    }

    // 添加缓存破坏符（固定种子模式）
    if (uniqueId) {
      const cacheBreaker = `\u200B${uniqueId}\u200B${Date.now()}`;
      processedPrompt = processedPrompt + cacheBreaker;
    }

    // 更新工作流节点
    // 节点 5: 正向提示词
    workflow['5'].inputs.text = processedPrompt;

    // 节点 4: KSampler
    workflow['4'].inputs.seed = seed;
    workflow['4'].inputs.steps = steps;
    workflow['4'].inputs.sampler_name = samplerName;
    workflow['4'].inputs.scheduler = scheduler;

    // 节点 7: EmptyLatentImage
    workflow['7'].inputs.width = dimensions.width;
    workflow['7'].inputs.height = dimensions.height;

    // 批次设置：循环模式每次 1 张，批次模式使用用户设置
    const batchCount = batchMethod === 'loop' ? 1 : batchSize;
    workflow['7'].inputs.batch_size = batchCount;

    // 节点 44: RepeatLatentBatch
    workflow['44'].inputs.amount = 1;

    // 节点 24: SaveImage
    if (uniqueId) {
      workflow['24'].inputs.filename_prefix = `Corine_${uniqueId}_`;
    }

    // 节点 36: LoRA
    if (loraEnabled && loraName) {
      workflow['36'].inputs.lora_name = loraName;
      workflow['36'].inputs.strength_model = loraStrengthModel;
      workflow['36'].inputs.strength_clip = loraStrengthClip;
    } else {
      // 禁用 LoRA
      workflow['36'].inputs.strength_model = 0;
      workflow['36'].inputs.strength_clip = 0;
    }

    return {
      workflow,
      seed,
      metadata: {
        type: this.getType(),
        dimensions,
        aspectRatio,
        steps,
        loraEnabled,
        loraName: loraEnabled ? loraName : null
      }
    };
  }
}
