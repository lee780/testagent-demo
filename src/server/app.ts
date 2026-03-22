import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { getLogger } from './config/logger.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerConversationRoutes } from './modules/conversation/conversation.routes.js';
import { registerChatRoutes } from './modules/chat/chat.routes.js';
import { registerMockRoutes } from './modules/mock/mock.routes.js';
import { registerTestCaseRoutes } from './modules/testcase/testcase.routes.js';
import { registerReportRoutes } from './modules/report/report.routes.js';
import { registerDefectRoutes } from './modules/defect/defect.routes.js';
import { registerKnowledgeRoutes } from './modules/knowledge/knowledge.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const logger = getLogger();

  const app = Fastify({
    logger: false,
  });

  // Core plugins
  await registerCors(app);
  await registerErrorHandler(app);
  await registerRateLimit(app);
  await registerAuthPlugin(app);

  // Multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'testpilot',
    timestamp: new Date().toISOString(),
  }));

  app.get('/', async () => ({
    service: 'TestPilot',
    version: '1.0.0',
    status: 'running',
  }));

  // Register route modules
  await registerAuthRoutes(app);
  await registerConversationRoutes(app);
  await registerChatRoutes(app);
  await registerMockRoutes(app);
  await registerTestCaseRoutes(app);
  await registerReportRoutes(app);
  await registerDefectRoutes(app);
  await registerKnowledgeRoutes(app);

  logger.info('Fastify app built successfully');

  return app;
}
