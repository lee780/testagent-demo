import { getPrisma } from '../../config/database.js';
import { getConfig } from '../../config/index.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const prisma = getPrisma();

export interface CreateReportInput {
  name: string;
  conversationId: string;
  executionMode?: string;
  htmlFile: string;
  uploadedDocs?: string[];
  createdBy: string;
}

// Create a report record — raw case data is read from test_cases_raw.json in the output dir
export async function createReport(input: CreateReportInput) {
  const config = getConfig();

  // Try to read raw test case data from the output dir
  const outputDir = resolve(config.agentOutputDir, input.createdBy, input.conversationId);
  const rawPath = join(outputDir, 'test_cases_raw.json');
  let testCasesData: unknown = null;
  if (existsSync(rawPath)) {
    try {
      testCasesData = JSON.parse(readFileSync(rawPath, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  const report = await prisma.testReport.create({
    data: {
      name: input.name,
      conversationId: input.conversationId,
      executionMode: input.executionMode,
      htmlFile: input.htmlFile,
      testCasesData: testCasesData as any,
      uploadedDocs: input.uploadedDocs ?? [],
      createdBy: input.createdBy,
    },
  });

  return report;
}

// List reports for a user
export async function listReports(userId: string) {
  const reports = await prisma.testReport.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      conversationId: true,
      executionMode: true,
      htmlFile: true,
      casesImported: true,
      uploadedDocs: true,
      createdAt: true,
      conversation: { select: { title: true } },
    },
  });
  return reports;
}

// Get a single report
export async function getReport(reportId: string, userId: string) {
  const report = await prisma.testReport.findFirst({
    where: { id: reportId, createdBy: userId },
    include: {
      conversation: { select: { title: true } },
      testCases: { select: { id: true, status: true, title: true } },
    },
  });
  return report;
}

// Update report metadata (name, uploadedDocs)
export async function updateReport(reportId: string, userId: string, input: { name?: string; uploadedDocs?: string[] }) {
  const report = await prisma.testReport.findFirst({ where: { id: reportId, createdBy: userId } });
  if (!report) throw new Error('Report not found');
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
  if (!report) return null;

  const htmlPath = resolve(config.agentOutputDir, userId, report.conversationId, report.htmlFile);
  if (!existsSync(htmlPath)) return null;

  return readFileSync(htmlPath, 'utf-8');
}

// Import test cases from report into TestCase library
export async function importTestCases(reportId: string, userId: string) {
  const report = await prisma.testReport.findFirst({
    where: { id: reportId, createdBy: userId },
  });
  if (!report) throw new Error('Report not found');
  if (report.casesImported) throw new Error('Test cases already imported');
  if (!report.testCasesData) throw new Error('No test case data in this report');

  const rawCases = report.testCasesData as Array<{
    id?: string;
    name?: string;
    coverage_point?: string;
    priority?: string;
    category?: string;
    request?: Record<string, unknown>;
    assertions?: unknown;
    preconditions?: unknown;
  }>;

  const created: string[] = [];

  for (const tc of rawCases) {
    try {
      const modelIdMatch = tc.id?.match(/TC_([A-Z0-9]+)_/);
      const modelId = modelIdMatch ? modelIdMatch[1] : 'UNKNOWN';
      const caseCode = tc.id ?? `TC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Upsert TestCaseGroup
      let group = await prisma.testCaseGroup.findUnique({
        where: { modelId_caseCode: { modelId, caseCode } },
      });

      if (!group) {
        group = await prisma.testCaseGroup.create({
          data: { modelId, caseCode },
        });
      }

      // Determine version
      const lastCase = await prisma.testCase.findFirst({
        where: { groupId: group.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = (lastCase?.version ?? 0) + 1;

      // Create TestCase as DRAFT
      const testCase = await prisma.testCase.create({
        data: {
          groupId: group.id,
          version,
          status: 'DRAFT',
          title: tc.name ?? caseCode,
          coveragePoint: tc.coverage_point,
          priority: tc.priority ?? 'P2',
          inputParams: tc.request as any,
          expectedResult: tc.assertions as any,
          conversationId: report.conversationId,
          sourceMode: report.executionMode ?? 'agent',
          createdBy: userId,
          reportId: report.id,
          yamlContent: JSON.stringify(tc),  // Store full raw JSON for YAML reconstruction
        },
      });

      // Update group latestId
      await prisma.testCaseGroup.update({
        where: { id: group.id },
        data: { latestId: testCase.id },
      });

      created.push(testCase.id);
    } catch {
      // Skip individual failures
    }
  }

  // Mark report as imported
  await prisma.testReport.update({
    where: { id: reportId },
    data: { casesImported: true },
  });

  return { imported: created.length, ids: created };
}
