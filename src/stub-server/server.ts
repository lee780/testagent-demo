/**
 * 挡板服务器 — 端口 8002
 *
 * 通用 HTTP Stub，所有路由和返回值均可动态配置。
 * 测试 Agent 通过 /_admin API 注册挡板路由，授信 C 系统的外呼请求命中注册路由后返回配置好的响应。
 *
 * 管理 API（供 Agent 调用）：
 *   POST   /_admin/routes           注册 / 更新一条挡板路由
 *   DELETE /_admin/routes           删除一条挡板路由
 *   GET    /_admin/routes           列出所有已注册路由
 *   DELETE /_admin/routes/clear     清空所有路由
 *   POST   /_admin/ext-services     注册一条"外部服务"（告知 C 系统应调用哪些路径）
 *   GET    /_admin/ext-services     列出所有外部服务
 *   DELETE /_admin/ext-services/clear  清空外部服务列表
 *   GET    /health                  健康检查
 *
 * 业务路由（供 C 系统外呼）：
 *   ANY *  — 命中注册路由则返回配置响应，否则 404
 */

import 'dotenv/config';
import Fastify from 'fastify';
import { getLogger } from '../server/config/logger.js';

const PORT = parseInt(process.env.STUB_SERVER_PORT ?? '8002');
const app = Fastify({ logger: false });
const logger = getLogger();

// ── 数据结构 ───────────────────────────────────────────────

interface StubRoute {
  name?: string;       // 可选标注，方便阅读
  method: string;      // 'GET' | 'POST' | '*'（通配）
  path: string;        // e.g. '/alipay/query'
  statusCode: number;  // 默认 200
  response: any;       // 任意 JSON
}

interface ExtService {
  name: string;        // 服务名，如"支付宝"
  path: string;        // 挡板路径，C 系统将 POST 到此路径
  method: string;      // 默认 'POST'
}

// key = "METHOD:path"
const routeStore = new Map<string, StubRoute>();
const extServices: ExtService[] = [];

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}

// ── 管理 API ──────────────────────────────────────────────

/** 注册 / 更新一条挡板路由 */
app.post('/_admin/routes', async (request, reply) => {
  const body = request.body as any;
  const { name, method = 'POST', path, statusCode = 200, response } = body;

  if (!path) return reply.status(400).send({ error: 'path is required' });
  if (response === undefined) return reply.status(400).send({ error: 'response is required' });

  routeStore.set(routeKey(method, path), { name, method, path, statusCode, response });
  logger.info({ method, path, name }, '[Stub] Route registered');
  return { ok: true, key: routeKey(method, path) };
});

/** 删除一条挡板路由 */
app.delete('/_admin/routes', async (request, reply) => {
  const { method = 'POST', path } = request.body as any ?? {};
  if (!path) return reply.status(400).send({ error: 'path is required' });
  routeStore.delete(routeKey(method, path));
  return { ok: true };
});

/** 列出所有挡板路由 */
app.get('/_admin/routes', async () => Array.from(routeStore.values()));

/** 清空所有路由（测试用例结束后重置） */
app.delete('/_admin/routes/clear', async () => {
  routeStore.clear();
  logger.info('[Stub] All routes cleared');
  return { ok: true };
});

/** 注册外部服务（告知 C 系统需外呼哪些路径） */
app.post('/_admin/ext-services', async (request, reply) => {
  const { name, path, method = 'POST' } = request.body as any ?? {};
  if (!name || !path) return reply.status(400).send({ error: 'name and path are required' });

  const idx = extServices.findIndex(s => s.path === path);
  if (idx >= 0) extServices[idx] = { name, path, method };
  else extServices.push({ name, path, method });

  logger.info({ name, path }, '[Stub] External service registered');
  return { ok: true };
});

/** 列出所有外部服务 */
app.get('/_admin/ext-services', async () => extServices);

/** 清空外部服务列表 */
app.delete('/_admin/ext-services/clear', async () => {
  extServices.length = 0;
  return { ok: true };
});

/** 健康检查 */
app.get('/health', async () => ({
  status: 'ok',
  server: 'stub',
  port: PORT,
  registeredRoutes: routeStore.size,
  extServices: extServices.length,
}));

// ── 动态路由：匹配已注册的挡板 ────────────────────────────

app.addHook('onRequest', async (request, reply) => {
  // 跳过管理接口 & 健康检查
  if (request.url.startsWith('/_admin') || request.url === '/health') return;

  const method = request.method.toUpperCase();
  const path = request.url.split('?')[0];

  // 优先精确匹配 method，其次匹配通配符 *
  const entry =
    routeStore.get(routeKey(method, path)) ??
    routeStore.get(routeKey('*', path));

  if (!entry) {
    logger.warn({ method, path }, '[Stub] No route configured');
    await reply.status(404).send({
      error: `No stub configured for ${method} ${path}`,
      hint: `POST /_admin/routes { method, path, response } to register`,
    });
    return;
  }

  logger.info({ method, path, name: entry.name, statusCode: entry.statusCode }, '[Stub] Serving stub response');
  await reply.status(entry.statusCode).send(entry.response);
});

// ── 启动 ───────────────────────────────────────────────────

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    logger.error(err, '[Stub] Failed to start');
    process.exit(1);
  }
  logger.info(`[Stub] 挡板服务器已启动 → http://localhost:${PORT}`);
  logger.info('[Stub] 管理接口: POST /_admin/routes | GET /_admin/ext-services');
});
