import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import * as reportService from './report.service.js';
import { AppError } from '../../common/errors.js';

const createSchema = z.object({
  name: z.string().min(1),
  conversationId: z.string().min(1),
  executionMode: z.string().optional(),
  htmlFile: z.string().optional(),
  uploadedDocs: z.array(z.string()).optional(),
});

export async function registerReportRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/reports — save report
  app.post('/api/reports', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const body = createSchema.parse(request.body);
    const report = await reportService.createReport({ ...body, createdBy: userId });
    return reply.status(201).send({ success: true, data: report });
  });

  // GET /api/reports — list (paginated, optional mode filter)
  app.get('/api/reports', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.currentUser!.user_id;
    const { page, pageSize, mode } = request.query as { page?: string; pageSize?: string; mode?: string };
    const reports = await reportService.listReports(
      userId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
      mode,
    );
    return { success: true, data: reports };
  });

  // GET /api/reports/:id — detail
  app.get('/api/reports/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const report = await reportService.getReport(id, userId);
    if (!report) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: report };
  });

  // GET /api/reports/:id/html — serve HTML for preview
  app.get('/api/reports/:id/html', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const html = await reportService.getReportHtml(id, userId);
    if (!html) return reply.status(404).send({ success: false, error: 'HTML file not found' });
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(html);
  });

  // POST /api/reports/:id/import — import test cases to library
  app.post('/api/reports/:id/import', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const body = request.body as { caseIds?: string[] } | undefined;
    try {
      const result = await reportService.importTestCases(id, userId, body?.caseIds);
      return { success: true, data: result };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // DELETE /api/reports/:id
  app.delete('/api/reports/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    try {
      await reportService.deleteReport(id, userId);
      return { success: true };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // PUT /api/reports/:id — update name/docs
  app.put('/api/reports/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.user_id;
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; uploadedDocs?: string[] };
    try {
      const report = await reportService.updateReport(id, userId, body);
      return { success: true, data: report };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
}
