import { getPrisma } from '../../config/database.js';
import { getLogger } from '../../config/logger.js';
import { getConfig } from '../../config/index.js';
import type { Prisma } from '@prisma/client';

const prisma = getPrisma();

export interface CreateTestCaseInput {
  modelId: string;
  caseCode: string;
  title: string;
  coveragePoint?: string;
  priority?: string;
  inputParams?: Record<string, unknown>;
  expectedResult?: Record<string, unknown>;
  yamlContent?: string;
  notes?: string;
  tags?: string[];
  conversationId?: string;
  sourceMode?: string;
  createdBy: string;
}

export interface UpdateTestCaseInput {
  title?: string;
  coveragePoint?: string;
  priority?: string;
  inputParams?: Record<string, unknown>;
  expectedResult?: Record<string, unknown>;
  yamlContent?: string;
  notes?: string;
  tags?: string[];
}

// List test cases with filters
export async function listTestCases(params: {
  modelId?: string;
  status?: string;
  search?: string;
  latestOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { modelId, status, search, latestOnly = true, page = 1, pageSize = 20 } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { coveragePoint: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by modelId via group
  if (modelId || latestOnly) {
    const groupWhere: Record<string, unknown> = {};
    if (modelId) groupWhere.modelId = modelId;

    if (latestOnly) {
      // Only show latest version per group
      const groups = await prisma.testCaseGroup.findMany({
        where: groupWhere,
        select: { latestId: true },
      });
      const latestIds = groups.map(g => g.latestId).filter(Boolean) as string[];
      if (latestIds.length === 0 && latestOnly) {
        return { total: 0, page, pageSize, items: [] };
      }
      where.id = { in: latestIds };
    } else if (modelId) {
      // Show all versions for the model
      const groups = await prisma.testCaseGroup.findMany({
        where: groupWhere,
        select: { id: true },
      });
      where.groupId = { in: groups.map(g => g.id) };
    }
  }

  const [total, items] = await Promise.all([
    prisma.testCase.count({ where }),
    prisma.testCase.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        group: { select: { modelId: true, caseCode: true } },
        creator: { select: { id: true, username: true, displayName: true } },
        reviewer: { select: { id: true, username: true, displayName: true } },
        _count: { select: { executions: true } },
      },
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getTestCase(id: string) {
  return prisma.testCase.findUnique({
    where: { id },
    include: {
      group: true,
      creator: { select: { id: true, username: true, displayName: true } },
      reviewer: { select: { id: true, username: true, displayName: true } },
      executions: {
        orderBy: { executedAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function createTestCase(input: CreateTestCaseInput) {
  const { modelId, caseCode, createdBy, ...rest } = input;

  // Find or create group
  let group = await prisma.testCaseGroup.findUnique({
    where: { modelId_caseCode: { modelId, caseCode } },
  });

  let version = 1;
  if (group) {
    // Get current max version
    const latest = await prisma.testCase.findFirst({
      where: { groupId: group.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    version = (latest?.version ?? 0) + 1;

    // Deprecate old latest
    if (group.latestId) {
      await prisma.testCase.update({
        where: { id: group.latestId },
        data: { status: 'DEPRECATED' },
      });
    }
  } else {
    group = await prisma.testCaseGroup.create({
      data: { modelId, caseCode },
    });
  }

  const testCase = await prisma.testCase.create({
    data: {
      ...rest,
      groupId: group.id,
      version,
      createdBy,
      inputParams: rest.inputParams as Prisma.InputJsonValue | undefined,
      expectedResult: rest.expectedResult as Prisma.InputJsonValue | undefined,
    },
    include: {
      group: true,
      creator: { select: { id: true, username: true, displayName: true } },
    },
  });

  // Update group.latestId
  await prisma.testCaseGroup.update({
    where: { id: group.id },
    data: { latestId: testCase.id },
  });

  return testCase;
}

// Transition status: submit for review
export async function submitForReview(id: string) {
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc || tc.status !== 'DRAFT') throw new Error('只有草稿状态的用例可以提交审核');
  return prisma.testCase.update({
    where: { id },
    data: { status: 'PENDING_REVIEW' },
  });
}

// Transition: approve
export async function approveTestCase(id: string, reviewedBy: string, reviewNote?: string) {
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc || tc.status !== 'PENDING_REVIEW') throw new Error('只有待审核状态的用例可以审核');
  return prisma.testCase.update({
    where: { id },
    data: { status: 'APPROVED', reviewedBy, reviewNote, reviewedAt: new Date() },
  });
}

// Transition: reject back to draft
export async function rejectTestCase(id: string, reviewedBy: string, reviewNote: string) {
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc || tc.status !== 'PENDING_REVIEW') throw new Error('只有待审核状态的用例可以驳回');
  return prisma.testCase.update({
    where: { id },
    data: { status: 'DRAFT', reviewedBy, reviewNote, reviewedAt: new Date() },
  });
}

// Transition: baseline (lock into regression set)
export async function baselineTestCase(id: string) {
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc || tc.status !== 'APPROVED') throw new Error('只有已通过状态的用例可以固化为基线');
  return prisma.testCase.update({
    where: { id },
    data: { status: 'BASELINE', baselinedAt: new Date() },
  });
}

// Update test case content (only DRAFT)
export async function updateTestCase(id: string, input: UpdateTestCaseInput) {
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc || tc.status !== 'DRAFT') throw new Error('只有草稿状态的用例可以编辑');
  return prisma.testCase.update({
    where: { id },
    data: {
      ...input,
      inputParams: input.inputParams as Prisma.InputJsonValue | undefined,
      expectedResult: input.expectedResult as Prisma.InputJsonValue | undefined,
    },
  });
}

// Get version history for a group
export async function getVersionHistory(groupId: string) {
  return prisma.testCase.findMany({
    where: { groupId },
    orderBy: { version: 'desc' },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      reviewer: { select: { id: true, username: true, displayName: true } },
    },
  });
}

// Record execution result
export async function recordExecution(input: {
  testCaseId: string;
  conversationId?: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  baseUrl?: string;
  actualResult?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  defectId?: string;
  executedBy?: string;
}) {
  return prisma.testExecution.create({
    data: {
      ...input,
      actualResult: input.actualResult as Prisma.InputJsonValue | undefined,
    },
  });
}

// Get execution history for a test case
export async function getExecutionHistory(testCaseId: string, limit = 20) {
  return prisma.testExecution.findMany({
    where: { testCaseId },
    orderBy: { executedAt: 'desc' },
    take: limit,
  });
}

// AI-powered recommend test cases for regression based on change description
export async function recommendTestCases(params: {
  description: string;
  modelId?: string;
  limit?: number;
}): Promise<Array<{ testCase: unknown; score: number; reason: string }>> {
  const { description, modelId, limit = 20 } = params;
  const config = getConfig();

  // 1. Get all BASELINE test cases, with associated report and conversation context
  const groupWhere: Record<string, unknown> = {};
  if (modelId) groupWhere.modelId = modelId;
  const groups = await prisma.testCaseGroup.findMany({
    where: groupWhere,
    select: { latestId: true, modelId: true, caseCode: true },
  });
  const latestIds = groups.map(g => g.latestId).filter(Boolean) as string[];

  const baselineCases = await prisma.testCase.findMany({
    where: { id: { in: latestIds }, status: 'BASELINE' },
    include: {
      group: { select: { modelId: true, caseCode: true } },
      report: { select: { name: true, executionMode: true, uploadedDocs: true } },
    },
  });

  if (baselineCases.length === 0) {
    return [];
  }

  // Fetch conversation titles for context
  const convIds = [...new Set(baselineCases.map(tc => tc.conversationId).filter(Boolean))] as string[];
  const conversations = convIds.length > 0
    ? await prisma.conversation.findMany({
        where: { id: { in: convIds } },
        select: { id: true, title: true },
      })
    : [];
  const convMap = new Map(conversations.map(c => [c.id, c.title]));

  // 2. Build rich context for each case
  const casesSummary = baselineCases.map((tc, i) => {
    const parts: string[] = [
      `[${i}] ${tc.group.modelId}/${tc.group.caseCode}: "${tc.title}"`,
      `  覆盖点: ${tc.coveragePoint || '未设置'}`,
      `  来源模式: ${tc.sourceMode || '未知'}`,
    ];
    if (tc.report) {
      parts.push(`  关联报告: ${tc.report.name}（${tc.report.executionMode || ''}）`);
      if (tc.report.uploadedDocs?.length) {
        parts.push(`  关联文档: ${tc.report.uploadedDocs.join(', ')}`);
      }
    }
    if (tc.conversationId && convMap.has(tc.conversationId)) {
      parts.push(`  关联对话: ${convMap.get(tc.conversationId)}`);
    }
    if (tc.notes) parts.push(`  备注: ${tc.notes}`);
    return parts.join('\n');
  }).join('\n\n');

  const prompt = `你是一个测试专家。用户描述了一个变更，请从以下基线测试用例中，找出最相关的用例并按关联度排序。

**变更描述**: ${description}

**基线用例列表**（含关联的报告、对话、文档上下文）:
${casesSummary}

请以 JSON 数组格式返回结果，只返回相关的用例（相关度低的不返回），格式如下：
[{"index": 0, "score": 95, "reason": "直接覆盖变更涉及的计算逻辑，且关联的规则文档与本次变更范围一致"}, ...]

score 为 0-100 的整数，reason 需说明推荐依据（可引用关联的报告、对话或文档）。只返回 JSON 数组，不要任何其他文字。`;

  let raw = '[]';
  try {
    const response = await fetch(config.llm.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (response.ok) {
      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      raw = data.choices[0]?.message?.content ?? '[]';
    }
  } catch {
    // LLM unreachable — fall back to returning all baseline cases sorted by title
    return baselineCases.slice(0, limit).map(tc => ({
      testCase: tc,
      score: 50,
      reason: 'LLM 服务暂不可用，返回全部基线用例供参考',
    }));
  }

  // Parse JSON from LLM response
  let rankings: Array<{ index: number; score: number; reason: string }> = [];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) rankings = JSON.parse(jsonMatch[0]);
  } catch {
    rankings = [];
  }

  // 3. Map back to test cases and sort by score
  return rankings
    .filter(r => r.index >= 0 && r.index < baselineCases.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => ({
      testCase: baselineCases[r.index],
      score: r.score,
      reason: r.reason,
    }));
}

// Stats: count by status
export async function getStats(modelId?: string) {
  const groupWhere = modelId ? { modelId } : {};
  const groups = await prisma.testCaseGroup.findMany({
    where: groupWhere,
    select: { latestId: true },
  });
  const latestIds = groups.map(g => g.latestId).filter(Boolean) as string[];

  const counts = await prisma.testCase.groupBy({
    by: ['status'],
    where: { id: { in: latestIds } },
    _count: { id: true },
  });

  const result: Record<string, number> = { DRAFT: 0, PENDING_REVIEW: 0, APPROVED: 0, BASELINE: 0 };
  counts.forEach(c => { result[c.status] = c._count.id; });
  return result;
}
