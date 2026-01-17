/**
 * API Key 认证中间件
 * 验证请求头中的 X-API-Key 或查询参数中的 apiKey
 */
export function authMiddleware(req, res, next) {
  const apiKey = process.env.API_KEY;

  // 如果没有配置 API_KEY，跳过认证（开发模式）
  if (!apiKey) {
    return next();
  }

  // 支持两种方式传递 API Key：
  // 1. 请求头 X-API-Key
  // 2. 查询参数 apiKey（用于图片 URL）
  const providedKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API Key is required. Please provide X-API-Key header or apiKey query parameter.'
    });
  }

  if (providedKey !== apiKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API Key.'
    });
  }

  next();
}
