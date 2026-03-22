import { getPrisma } from '../../config/database.js';
import { getConfig } from '../../config/index.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NotFoundError, ConflictError } from '../../common/errors.js';

const prisma = getPrisma();

export interface CreateReportInput {
  name: string;
  conversationId: string;
  executionMode?: string;
  htmlFile?: string;
  uploadedDocs?: string[];
  createdBy: string;
}

// Create a report record (manual API path — auto-creation goes through test-runner tool)
export async function createReport(input: CreateReportInput) {
  const report = await prisma.testReport.create({
    data: {
      name: input.name,
      conversationId: input.conversationId,
      executionMode: input.executionMode,
      htmlFile: input.htmlFile,
      uploadedDocs: input.uploadedDocs ?? [],
      createdBy: input.createdBy,
    },
  });
  return report;
}

// Compute summary stats from raw executionResults JSON
function computeStats(executionResults: unknown): { total: number; passed: number; failed: number; passRate: string } {
  if (!Array.isArray(executionResults)) return { total: 0, passed: 0, failed: 0, passRate: '-' };
  const total = executionResults.length;
  const passed = executionResults.filter((r: any) => r.status === 'PASSED').length;
  const failed = total - passed;
  const passRate = total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '-';
  return { total, passed, failed, passRate };
}

// List reports for a user (paginated, optional mode filter)
export async function listReports(userId: string, page = 1, pageSize = 20, mode?: string) {
  const skip = (page - 1) * pageSize;
  const where = { createdBy: userId, ...(mode ? { executionMode: mode } : {}) };
  const [total, rows] = await Promise.all([
    prisma.testReport.count({ where }),
    prisma.testReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        conversationId: true,
        executionMode: true,
        htmlFile: true,
        casesImported: true,
        uploadedDocs: true,
        createdAt: true,
        executionResults: true,
        conversation: { select: { title: true } },
      },
    }),
  ]);
  const items = rows.map(r => ({
    ...r,
    stats: computeStats(r.executionResults),
    executionResults: undefined, // don't send raw data in list
  }));
  return { total, page, pageSize, items };
}

// Get a single report
export async function getReport(reportId: string, userId: string) {
  const report = await prisma.testReport.findFirst({
    where: { id: reportId, createdBy: userId },
    include: {
      conversation: { select: { title: true } },
      testCases: { select: { id: true, status: true, title: true, group: { select: { caseCode: true } } } },
    },
  });
  return report;
}

// Delete a report; null out reportId on related TestCases and Defects to avoid FK violation
export async function deleteReport(reportId: string, userId: string) {
  const report = await prisma.testReport.findFirst({ where: { id: reportId, createdBy: userId } });
  if (!report) throw new NotFoundError('报告');
  await prisma.$transaction([
    prisma.testCase.updateMany({ where: { reportId }, data: { reportId: null } }),
    prisma.defect.updateMany({ where: { reportId }, data: { reportId: null } }),
    prisma.testReport.delete({ where: { id: reportId } }),
  ]);
}

// Update report metadata (name, uploadedDocs)
export async function updateReport(reportId: string, userId: string, input: { name?: string; uploadedDocs?: string[] }) {
  const report = await prisma.testReport.findFirst({ where: { id: reportId, createdBy: userId } });
  if (!report) throw new NotFoundError('报告');
  return prisma.testReport.update({
    where: { id: reportId },
    data: { ...(input.name && { name: input.name }), ...(input.uploadedDocs !== undefined && { uploadedDocs: input.uploadedDocs }) },
  });
}

// Get HTML content of report
export async function getReportHtml(reportId: string, userId: string): Promise<string | null> {
  const config = getConfig();

  const report = await prisma.testReport.findFirst({
    where: { id: reportId, createdBy: userId },
    select: { htmlFile: true, conversationId: true },
  });
  if (!report || !report.htmlFile) return null;

  const htmlPath = resolve(config.agentOutputDir, userId, report.conversationId, report.htmlFile);
  if (!existsSync(htmlPath)) return null;

  return readFileSync(htmlPath, 'utf-8');
}

// Import test cases from report into TestCase library
export async function importTestCases(reportId: string, userId: string, caseIds?: string[]) {
  const report = await prisma.testReport.findFirst({
    where: { id: reportId, createdBy: userId },
  });
  if (!report) throw new NotFoundError('报告');
  if (report.casesImported) throw new ConflictError('测试用例已入库');
  if (!report.testCasesData) throw new NotFoundError('报告中无用例数据');

  const rawCases = report.testCasesData as Array<{
    id?: string;
    name?: string;
    coverage_point?: string;
    priority?: string;
    category?: string;
    request?: Record<string, unknown>;
    assertions?: unknown;
    preconditions?: unknown;
    notes?: string;
    tags?: string[];
  }>;

  // Filter to selected cases if caseIds provided
  const casesToImport = caseIds?.length
    ? rawCases.filter(tc => caseIds.includes(tc.id ?? ''))
    : rawCases;

  const created: string[] = [];
  const failed: Array<{ caseId: string; reason: string }> = [];

  for (const tc of casesToImport) {
    const caseCode = tc.id ?? `TC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const modelIdMatch = tc.id?.match(/TC_([A-Z0-9]+)_/);
      const modelId = modelIdMatch ? modelIdMatch[1] : 'UNKNOWN';

      // Each case's upsert+create+update runs atomically
      const testCase = await prisma.$transaction(async (tx) => {
        // Upsert TestCaseGroup
        let group = await tx.testCaseGroup.findUnique({
          where: { modelId_caseCode: { modelId, caseCode } },
        });
        if (!group) {
          group = await tx.testCaseGroup.create({ data: { modelId, caseCode } });
        }

        // Determine version
        const lastCase = await tx.testCase.findFirst({
          where: { groupId: group.id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const version = (lastCase?.version ?? 0) + 1;

        // Create TestCase as DRAFT
        const created = await tx.testCase.create({
          data: {
            groupId: group.id,
            version,
            status: 'DRAFT',
            title: tc.name ?? caseCode,
            coveragePoint: tc.coverage_point,
            priority: tc.priority ?? 'P2',
            inputParams: tc.request as any,
            expectedResult: tc.assertions as any,
            notes: tc.notes,
            tags: tc.tags ?? (tc.category ? [tc.category] : []),
            conversationId: report.conversationId,
            sourceMode: report.executionMode ?? 'agent',
            createdBy: userId,
            reportId: report.id,
            yamlContent: JSON.stringify(tc, null, 2),
          },
        });

        // Update group latestId
        await tx.testCaseGroup.update({
          where: { id: group.id },
          data: { latestId: created.id },
        });

        return created;
      });

      created.push(testCase.id);
    } catch (err: unknown) {
      failed.push({ caseId: caseCode, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  // 只有至少一条入库成功时才标记为已导入，否则保留可重试状态
  if (created.length > 0) {
    await prisma.testReport.update({
      where: { id: reportId },
      data: { casesImported: true },
    });
  }

  return { imported: created.length, ids: created, failed };
}
