import WebSocket from 'ws';

/**
 * 设置 WebSocket 代理
 * 将客户端的 WebSocket 连接代理到 ComfyUI
 */
export function setupWSProxy(wss, comfyuiHost) {
  // 将 HTTP URL 转换为 WebSocket URL
  const wsHost = comfyuiHost.replace('http://', 'ws://').replace('https://', 'wss://');

  wss.on('connection', (clientWs, req) => {
    // 从查询字符串提取参数
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientId = url.searchParams.get('clientId');

    console.log(`Client connected: ${clientId}`);

    // 连接到 ComfyUI WebSocket
    const comfyWs = new WebSocket(`${wsHost}/ws?clientId=${clientId}`);

    comfyWs.on('open', () => {
      console.log(`Connected to ComfyUI for client: ${clientId}`);

      // 对 ComfyUI 连接启用保活
      const comfyPingInterval = setInterval(() => {
        if (comfyWs.readyState === WebSocket.OPEN) {
          comfyWs.ping();  // ws 库的原生 ping
        }
      }, 20000);

      // 确保断开时清除定时器
      comfyWs.once('close', () => {
        clearInterval(comfyPingInterval);
      });
    });

    // 转发 ComfyUI 消息到客户端
    comfyWs.on('message', (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        // 将 Buffer 转换为字符串，确保浏览器能正确解析 JSON
        const message = isBinary ? data : data.toString();
        clientWs.send(message);
      }
    });

    // 转发客户端消息到 ComfyUI（包括 ping 处理）
    clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // 处理前端 ping
        if (message.type === 'ping') {
          clientWs.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // 其他消息转发到 ComfyUI
        if (comfyWs.readyState === WebSocket.OPEN) {
          comfyWs.send(data);
        }
      } catch (err) {
        // 非 JSON 消息直接转发
        if (comfyWs.readyState === WebSocket.OPEN) {
          comfyWs.send(data);
        }
      }
    });

    // 处理客户端断开连接
    clientWs.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      if (comfyWs.readyState === WebSocket.OPEN) {
        comfyWs.close();
      }
    });

    // 处理 ComfyUI 断开连接
    comfyWs.on('close', () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    // 处理客户端错误
    clientWs.on('error', (err) => {
      console.error('Client WebSocket error:', err);
      if (comfyWs.readyState === WebSocket.OPEN) {
        comfyWs.close();
      }
    });

    // 处理 ComfyUI 连接错误
    comfyWs.on('error', (err) => {
      console.error('ComfyUI WebSocket error:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(4502, 'ComfyUI connection error');
      }
    });
  });

  console.log('WebSocket proxy initialized');
}
