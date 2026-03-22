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
  page?: number;
  pageSize?: number;
}) {
  const { createdBy, status, severity, reportId, page = 1, pageSize = 20 } = params;
  const where: Record<string, unknown> = { createdBy };
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (reportId) where.reportId = reportId;

  const skip = (page - 1) * pageSize;
  const [total, items] = await Promise.all([
    prisma.defect.count({ where }),
    prisma.defect.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        report: { select: { id: true, name: true } },
        testCase: { select: { id: true, title: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);
  return { total, page, pageSize, items };
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

export async function getDefectStats(userId: string) {
  const rows = await prisma.defect.groupBy({
    by: ['status', 'severity'],
    where: { createdBy: userId },
    _count: { _all: true },
  });
  const stats: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    stats[`status_${r.status}`] = (stats[`status_${r.status}`] ?? 0) + r._count._all;
    stats[`severity_${r.severity}`] = (stats[`severity_${r.severity}`] ?? 0) + r._count._all;
    total += r._count._all;
  }
  return { total, ...stats };
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
