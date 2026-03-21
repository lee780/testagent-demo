import { getPrisma } from '../../config/database.js';

const prisma = getPrisma();

export interface CreateDefectInput {
  title: string;
  description?: string;
  severity?: string;
  reportId?: string;
  testCaseId?: string;
  conversationId?: string;
  createdBy: string;
}

export async function listDefects(params: {
  createdBy: string;
  status?: string;
  severity?: string;
  reportId?: string;
}) {
  const { createdBy, status, severity, reportId } = params;
  const where: Record<string, unknown> = { createdBy };
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (reportId) where.reportId = reportId;

  return prisma.defect.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      report: { select: { id: true, name: true } },
      testCase: { select: { id: true, title: true } },
      _count: { select: { comments: true } },
    },
  });
}

export async function getDefect(id: string, userId: string) {
  return prisma.defect.findFirst({
    where: { id, createdBy: userId },
    include: {
      report: { select: { id: true, name: true } },
      testCase: { select: { id: true, title: true } },
      creator: { select: { id: true, username: true, displayName: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          creator: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
  });
}

export async function createDefect(input: CreateDefectInput) {
  return prisma.defect.create({
    data: {
      title: input.title,
      description: input.description,
      severity: input.severity ?? 'P2',
      reportId: input.reportId,
      testCaseId: input.testCaseId,
      conversationId: input.conversationId,
      createdBy: input.createdBy,
    },
  });
}

export async function updateDefectStatus(id: string, userId: string, status: string) {
  const defect = await prisma.defect.findFirst({ where: { id, createdBy: userId } });
  if (!defect) throw new Error('缺陷不存在');

  const resolvedAt = status === '已解决' ? new Date() : undefined;
  return prisma.defect.update({
    where: { id },
    data: { status, ...(resolvedAt ? { resolvedAt } : {}) },
  });
}

export async function addComment(defectId: string, userId: string, content: string) {
  const defect = await prisma.defect.findFirst({ where: { id: defectId, createdBy: userId } });
  if (!defect) throw new Error('缺陷不存在');

  return prisma.defectComment.create({
    data: { defectId, content, createdBy: userId },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
    },
  });
}
