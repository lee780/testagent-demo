import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.js';
import * as svc from './knowledge.service.js';

// ── Zod schemas ───────────────────────────────────────────

const docCreate = z.object({
  modelId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});
const docUpdate = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  version: z.number().int().min(1).optional(),
});

const sceneCreate = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  modelId: z.string().optional(),
  setupData: z.record(z.unknown()),
});
const sceneUpdate = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  setupData: z.record(z.unknown()).optional(),
});

const specCreate = z.object({
  modelId: z.string().min(1),
  mode: z.enum(['systematic', 'regression', 'exploratory']).optional(),
  name: z.string().min(1),
  customInstructions: z.string().min(1),
  description: z.string().optional(),
});
const specUpdate = z.object({
  name: z.string().min(1).optional(),
  customInstructions: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ── Routes ────────────────────────────────────────────────

export async function registerKnowledgeRoutes(app: FastifyInstance): Promise<void> {

  // ── 业务规则库 ──────────────────────────────────────────

  app.get('/api/knowledge/docs', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { modelId, includeInactive } = req.query as { modelId?: string; includeInactive?: string };
    const data = await svc.listDocs(modelId, includeInactive === 'true');
    return { success: true, data };
  });

  app.post('/api/knowledge/docs', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const body = docCreate.parse(req.body);
    const userId = req.currentUser!.user_id;
    const data = await svc.createDoc({ ...body, createdBy: userId });
    return { success: true, data };
  });

  app.get('/api/knowledge/docs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const data = await svc.getDoc(id);
    if (!data) return { success: false, error: 'Not found' };
    return { success: true, data };
  });

  app.put('/api/knowledge/docs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const body = docUpdate.parse(req.body);
    const data = await svc.updateDoc(id, body);
    return { success: true, data };
  });

  app.patch('/api/knowledge/docs/:id/toggle', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive: boolean };
    const data = await svc.toggleDoc(id, isActive);
    return { success: true, data };
  });

  app.delete('/api/knowledge/docs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    await svc.deleteDoc(id);
    return { success: true };
  });

  // ── 挡板场景库 ──────────────────────────────────────────

  app.get('/api/knowledge/scenes', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { modelId } = req.query as { modelId?: string };
    const data = await svc.listScenes(modelId);
    return { success: true, data };
  });

  app.post('/api/knowledge/scenes', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const body = sceneCreate.parse(req.body);
    const userId = req.currentUser!.user_id;
    const data = await svc.createScene({ ...body, createdBy: userId });
    return { success: true, data };
  });

  app.get('/api/knowledge/scenes/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const data = await svc.getScene(id);
    if (!data) return { success: false, error: 'Not found' };
    return { success: true, data };
  });

  app.put('/api/knowledge/scenes/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const body = sceneUpdate.parse(req.body);
    const data = await svc.updateScene(id, body);
    return { success: true, data };
  });

  app.delete('/api/knowledge/scenes/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    await svc.deleteScene(id);
    return { success: true };
  });

  // ── 测试规范库 ──────────────────────────────────────────

  app.get('/api/knowledge/specs', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { modelId, mode } = req.query as { modelId?: string; mode?: string };
    const data = await svc.listSpecs(modelId, mode);
    return { success: true, data };
  });

  app.post('/api/knowledge/specs', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const body = specCreate.parse(req.body);
    const userId = req.currentUser!.user_id;
    const data = await svc.createSpec({ ...body, createdBy: userId });
    return { success: true, data };
  });

  app.get('/api/knowledge/specs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const data = await svc.getSpec(id);
    if (!data) return { success: false, error: 'Not found' };
    return { success: true, data };
  });

  app.put('/api/knowledge/specs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const body = specUpdate.parse(req.body);
    const data = await svc.updateSpec(id, body);
    return { success: true, data };
  });

  app.delete('/api/knowledge/specs/:id', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    await svc.deleteSpec(id);
    return { success: true };
  });

}
