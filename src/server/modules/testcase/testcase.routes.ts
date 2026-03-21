import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import * as tcService from './testcase.service.js';

const createSchema = z.object({
  modelId: z.string().min(1),
  caseCode: z.string().min(1),
  title: z.string().min(1),
  coveragePoint: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  inputParams: z.record(z.unknown()).optional(),
  expectedResult: z.record(z.unknown()).optional(),
  yamlContent: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  conversationId: z.string().optional(),
  sourceMode: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  coveragePoint: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  inputParams: z.record(z.unknown()).optional(),
  expectedResult: z.record(z.unknown()).optional(),
  yamlContent: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional(),
});

export async function registerTestCaseRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/testcases — list
  app.get('/api/testcases', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const { modelId, status, search, latestOnly, page, pageSize } = request.query as Record<string, string>;
    const result = await tcService.listTestCases({
      modelId,
      status,
      search,
      latestOnly: latestOnly !== 'false',
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
    return { success: true, data: result };
  });

  // GET /api/testcases/stats
  app.get('/api/testcases/stats', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const { modelId } = request.query as Record<string, string>;
    const stats = await tcService.getStats(modelId);
    return { success: true, data: stats };
  });

  // POST /api/testcases — create
  app.post('/api/testcases', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.currentUser!.user_id;
    const body = createSchema.parse(request.body);
    const tc = await tcService.createTestCase({ ...body, createdBy: userId });
    return { success: true, data: tc };
  });

  // POST /api/testcases/recommend
  app.post('/api/testcases/recommend', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const body = z.object({
      description: z.string().min(1),
      modelId: z.string().optional(),
      limit: z.number().optional(),
    }).parse(request.body);
    const results = await tcService.recommendTestCases(body);
    return { success: true, data: results };
  });

  // GET /api/testcases/:id
  app.get('/api/testcases/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tc = await tcService.getTestCase(id);
    if (!tc) return reply.code(404).send({ success: false, message: '用例不存在' });
    return { success: true, data: tc };
  });

  // PUT /api/testcases/:id — update content (DRAFT only)
  app.put('/api/testcases/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    try {
      const tc = await tcService.updateTestCase(id, body);
      return { success: true, data: tc };
    } catch (err) {
      return reply.code(400).send({ success: false, message: (err as Error).message });
    }
  });

  // POST /api/testcases/:id/submit — submit for review
  app.post('/api/testcases/:id/submit', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const tc = await tcService.submitForReview(id);
      return { success: true, data: tc };
    } catch (err) {
      return reply.code(400).send({ success: false, message: (err as Error).message });
    }
  });

  // POST /api/testcases/:id/review — approve or reject
  app.post('/api/testcases/:id/review', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const { action, reviewNote } = reviewSchema.parse(request.body);
    try {
      const tc = action === 'approve'
        ? await tcService.approveTestCase(id, userId, reviewNote)
        : await tcService.rejectTestCase(id, userId, reviewNote ?? '');
      return { success: true, data: tc };
    } catch (err) {
      return reply.code(400).send({ success: false, message: (err as Error).message });
    }
  });

  // POST /api/testcases/:id/baseline — promote to baseline
  app.post('/api/testcases/:id/baseline', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const tc = await tcService.baselineTestCase(id);
      return { success: true, data: tc };
    } catch (err) {
      return reply.code(400).send({ success: false, message: (err as Error).message });
    }
  });

  // GET /api/testcases/:id/history — version history
  app.get('/api/testcases/:id/history', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tc = await tcService.getTestCase(id);
    if (!tc) return reply.code(404).send({ success: false, message: '用例不存在' });
    const history = await tcService.getVersionHistory(tc.groupId);
    return { success: true, data: history };
  });

  // GET /api/testcases/:id/executions — execution history
  app.get('/api/testcases/:id/executions', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as Record<string, string>;
    const executions = await tcService.getExecutionHistory(id, limit ? parseInt(limit) : 20);
    return { success: true, data: executions };
  });
}
