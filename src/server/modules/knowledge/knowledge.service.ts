import { getPrisma } from '../../config/database.js';

const db = () => getPrisma();

// ── 业务规则库 ────────────────────────────────────────────

export async function listDocs(modelId?: string, includeInactive = false) {
  return db().knowledgeDoc.findMany({
    where: {
      ...(modelId ? { modelId } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ modelId: 'asc' }, { version: 'desc' }],
    select: { id: true, modelId: true, title: true, version: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function getDoc(id: string) {
  return db().knowledgeDoc.findUnique({ where: { id } });
}

export async function createDoc(data: { modelId: string; title: string; content: string; createdBy: string }) {
  return db().knowledgeDoc.create({ data });
}

export async function updateDoc(id: string, data: { title?: string; content?: string; version?: number }) {
  return db().knowledgeDoc.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

export async function toggleDoc(id: string, isActive: boolean) {
  return db().knowledgeDoc.update({ where: { id }, data: { isActive } });
}

export async function deleteDoc(id: string) {
  return db().knowledgeDoc.delete({ where: { id } });
}

// ── 挡板场景库 ───────────────────────────────────────────

export async function listScenes(modelId?: string) {
  return db().mockScene.findMany({
    where: modelId ? { OR: [{ modelId }, { modelId: null }] } : {},
    orderBy: { createdAt: 'desc' },
  });
}

export async function getScene(id: string) {
  return db().mockScene.findUnique({ where: { id } });
}

export async function getSceneByName(name: string) {
  return db().mockScene.findUnique({ where: { name } });
}

export async function createScene(data: { name: string; description?: string; modelId?: string; setupData: object; createdBy: string }) {
  return db().mockScene.create({ data: { ...data, setupData: data.setupData as any } });
}

export async function updateScene(id: string, data: { name?: string; description?: string; setupData?: object }) {
  return db().mockScene.update({
    where: { id },
    data: { ...data, ...(data.setupData ? { setupData: data.setupData as any } : {}), updatedAt: new Date() },
  });
}

export async function deleteScene(id: string) {
  return db().mockScene.delete({ where: { id } });
}

// ── 测试规范库 ───────────────────────────────────────────

export async function listSpecs(modelId?: string, mode?: string) {
  return db().testSpec.findMany({
    where: {
      ...(modelId ? { modelId } : {}),
      ...(mode !== undefined ? { OR: [{ mode }, { mode: null }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, modelId: true, mode: true, name: true, description: true, isActive: true, createdAt: true },
  });
}

export async function getSpec(id: string) {
  return db().testSpec.findUnique({ where: { id } });
}

export async function createSpec(data: { modelId: string; mode?: string; name: string; customInstructions: string; description?: string; createdBy: string }) {
  return db().testSpec.create({ data });
}

export async function updateSpec(id: string, data: { name?: string; customInstructions?: string; description?: string; isActive?: boolean }) {
  return db().testSpec.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

export async function deleteSpec(id: string) {
  return db().testSpec.delete({ where: { id } });
}

// ── Agent 上下文加载（由 chat.service 调用）──────────────

export interface KnowledgeContext {
  businessRulesMd: string | null;    // 合并所有激活业务规则文档
  customInstructions: string | null; // 匹配 modelId+mode 的规范
}

export async function loadKnowledgeContext(modelId: string, mode?: string): Promise<KnowledgeContext> {
  const [docs, specs] = await Promise.all([
    db().knowledgeDoc.findMany({
      where: { modelId, isActive: true },
      orderBy: { version: 'desc' },
      select: { title: true, content: true, version: true },
    }),
    db().testSpec.findMany({
      where: { modelId, isActive: true },
      orderBy: [{ mode: 'asc' }], // null (通用) 排前
    }),
  ]);

  // 合并业务规则文档
  const businessRulesMd = docs.length > 0
    ? docs.map(d => `## ${d.title}（v${d.version}）\n\n${d.content}`).join('\n\n---\n\n')
    : null;

  // 匹配测试规范：精确 mode 优先，其次通用 (mode=null)
  let matchedSpec = specs.find(s => s.mode === (mode ?? null));
  if (!matchedSpec && mode) matchedSpec = specs.find(s => s.mode === null);
  const customInstructions = matchedSpec?.customInstructions ?? null;

  return { businessRulesMd, customInstructions };
}
