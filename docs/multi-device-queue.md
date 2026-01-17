# CorineGen 多设备队列机制说明

## 概述

你观察到的现象是正确的：**多设备同时发起批量任务时，确实会按照"一个设备一张"的方式排队执行**。

## 工作原理

### 1. 架构层次

```
设备A (浏览器1) ──┐
                  ├──> 后端代理 (Express + WS) ──> ComfyUI (单线程)
设备B (浏览器2) ──┘
```

### 2. 队列机制

#### 前端队列（每个设备独立）

**位置**: `frontend/src/App.jsx`

- 每个浏览器维护自己的生成队列 (`queueRef`)
- 使用 `processQueue()` 逐个处理占位符
- 状态: `queue` → `generating` → `completed`

**关键代码** (App.jsx:972-1042):
```javascript
const processQueue = async () => {
  if (processingRef.current) return;  // 防止并发处理
  processingRef.current = true;

  while (queueRef.current.length > 0) {
    const task = queueRef.current.shift();
    await generateSingleBatch(task.promptId, task.batchSize, task.batchId);
  }

  processingRef.current = false;
};
```

#### WebSocket 层（设备间隔离）

**位置**: `backend/src/proxy/wsProxy.js`

- 每个设备使用唯一的 `clientId`
- 后端为每个 clientId 创建独立的 WebSocket 代理连接
- 前端 → 后端 → ComfyUI 的消息完全隔离

**关键代码** (wsProxy.js:11-19):
```javascript
wss.on('connection', (clientWs, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientId = url.searchParams.get('clientId');

  console.log(`Client connected: ${clientId}`);

  // 为每个 clientId 创建独立的 ComfyUI 连接
  const comfyWs = new WebSocket(`${wsHost}/ws?clientId=${clientId}`);
  // ...
});
```

#### ComfyUI 队列（所有设备共享）

**ComfyUI 的队列特性**:
- **单线程执行**: ComfyUI 一次只能处理一个任务
- **FIFO 队列**: 按照接收到的 prompt 提交时间顺序执行
- **全局队列**: 所有客户端的请求进入同一个队列

### 3. 排队行为

#### 场景：两台设备同时生成

**设备 A**: 提交 5 张图片的批次
**设备 B**: 提交 3 张图片的批次

**执行顺序**（假设设备 A 先提交第一个 prompt）:
```
时间线：
t1: 设备A提交prompt-1 → ComfyUI开始处理A-1
t2: 设备B提交prompt-1 → 进入ComfyUI队列
t3: 设备A提交prompt-2 → 进入ComfyUI队列
t4: ComfyUI完成A-1 → 开始处理B-1（因为B-1先进入队列）
t5: 设备B提交prompt-2 → 进入ComfyUI队列
t6: 设备A提交prompt-3 → 进入ComfyUI队列
t7: ComfyUI完成B-1 → 开始处理A-2
t8: ComfyUI完成A-2 → 开始处理B-2
...以此类推
```

**结果**: 看起来像"交替执行"，但实际上是**提交时间决定的 FIFO 顺序**。

### 4. 为什么会"一个设备一张"？

**循环模式 (`batchMethod: 'loop'`) 的行为**:

```javascript
// 每次循环只提交一个 prompt
for (let i = 0; i < batchSize; i++) {
  const { workflow, seed } = buildWorkflow(promptText, 1);  // batchSize=1
  await apiClient.queuePrompt(workflow);  // 提交到 ComfyUI
  await waitForCompletion();  // 等待完成
}
```

**时间交错**:
1. 设备 A 提交任务 A-1，开始等待
2. 设备 B 提交任务 B-1，开始等待（此时 A-1 在 ComfyUI 执行中）
3. ComfyUI 完成 A-1 → 通知设备 A
4. 设备 A 提交任务 A-2（但此时 B-1 已经在队列中了）
5. ComfyUI 开始执行 B-1...

**网络延迟影响**:
- 每个任务完成后，前端需要：
  1. 接收 WebSocket 消息
  2. 获取图片历史
  3. 更新 UI 状态
  4. 提交下一个任务
- 在这个过程中，其他设备有机会提交任务到 ComfyUI 队列

### 5. 批次模式的区别

**如果使用批次模式 (`batchMethod: 'batch'`)**:

```javascript
// 一次性提交整个批次
const { workflow } = buildWorkflow(promptText, batchSize);  // batchSize=5
await apiClient.queuePrompt(workflow);
```

**结果**: 每个设备的批次会整体执行，不会交错：
```
设备A: A-1, A-2, A-3, A-4, A-5
设备B: B-1, B-2, B-3
```

但是：
- 批次模式无法提供逐张进度反馈
- 占用更多 GPU 内存
- 用户体验较差

## 总结

### 这是巧合吗？

**不是巧合**，而是以下因素共同作用的结果：

1. ✅ **ComfyUI 的 FIFO 队列机制**（全局共享）
2. ✅ **循环模式的逐张提交**（每次提交间隔）
3. ✅ **网络延迟和 UI 更新时间**（给其他设备插队机会）
4. ✅ **多设备并发提交**（竞争同一个队列）

### 优点

- 公平分配资源：没有设备独占 GPU
- 用户体验平衡：所有用户都能看到渐进式进度
- 避免长时间等待：没有设备被完全阻塞

### 缺点

- 单个批次耗时更长：穿插执行导致总时间增加
- 预测困难：用户无法准确预知完成时间

### 改进建议（可选）

如果希望优先处理某个设备的所有任务：

**方案 1: 使用批次模式**
- 设置 `batchMethod: 'batch'`
- 缺点：失去逐张进度反馈

**方案 2: 前端队列优先级**（需要改造）
- 在后端维护一个优先级队列
- 为特定用户设置更高优先级
- 复杂度较高，不推荐

**方案 3: 使用多个 ComfyUI 实例**
- 部署多个 ComfyUI 服务器
- 负载均衡分发请求
- 成本较高，适合生产环境

## 当前架构的优势

目前的实现是**"去中心化队列"**：
- 前端自主管理本地队列
- 后端仅作为透明代理
- ComfyUI 自然形成全局 FIFO

这种架构简单、健壮，适合小规模多用户场景。

---

**最后更新**: 2026-01-17
**相关文件**:
- `frontend/src/App.jsx` (前端队列逻辑)
- `backend/src/proxy/wsProxy.js` (WebSocket 代理)
- `README.md` (用户文档)
