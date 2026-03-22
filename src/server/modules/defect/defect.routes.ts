import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import * as defectService from './defect.service.js';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  reportId: z.string().optional(),
  testCaseId: z.string().optional(),
  conversationId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['待处理', '处理中', '已解决', '已关闭', '不修复']),
});

const addCommentSchema = z.object({
  content: z.string().min(1),
});

export async function registerDefectRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/defects/stats', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.currentUser!.user_id;
    const stats = await defectService.getDefectStats(userId);
    return { success: true, data: stats };
  });

  app.get('/api/defects', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.currentUser!.user_id;
    const query = request.query as { status?: string; severity?: string; reportId?: string; page?: string; pageSize?: string };
    const defects = await defectService.listDefects({
      createdBy: userId,
      status: query.status,
      severity: query.severity,
      reportId: query.reportId,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    });
    return { success: true, data: defects };
  });

  app.post('/api/defects', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.currentUser!.user_id;
    const body = createSchema.parse(request.body);
    const defect = await defectService.createDefect({ ...body, createdBy: userId });
    return { success: true, data: defect };
  });

  app.get('/api/defects/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const defect = await defectService.getDefect(id, userId);
    if (!defect) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: defect };
  });

  app.patch('/api/defects/:id/status', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    try {
      const body = updateStatusSchema.parse(request.body);
      const defect = await defectService.updateDefectStatus(id, userId, body.status);
      return { success: true, data: defect };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  app.post('/api/defects/:id/comments', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    try {
      const body = addCommentSchema.parse(request.body);
      const comment = await defectService.addComment(id, userId, body.content);
      return { success: true, data: comment };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
}
