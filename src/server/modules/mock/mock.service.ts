import { getPrisma } from '../../config/database.js';
import { getLogger } from '../../config/logger.js';

const logger = getLogger();
const STUB_SERVER_URL = process.env.STUB_SERVER_URL ?? 'http://localhost:8002';

export interface ScoreResult {
  resultCode: string;
  resultMsg: string;
  admitFlag: string;
  creditLimit: string;
}

// ── 外部指标获取（HTTP 外呼挡板） ─────────────────────────

/**
 * 从挡板服务器获取所有已注册外部服务列表，并逐一外呼，合并返回体。
 *
 * C 系统不硬编码外部服务清单——调用哪些路径、返回哪些字段，
 * 全部由测试 Agent 在执行前通过 /_admin/ext-services 动态注册。
 */
async function fetchExternalIndicators(userId: string): Promise<Record<string, any>> {
  // 1. 拉取外部服务列表
  let services: Array<{ name: string; path: string; method: string }>;
  try {
    const res = await fetch(`${STUB_SERVER_URL}/_admin/ext-services`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    services = await res.json() as any;
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Mock] 挡板服务器不可达，外部指标为空');
    return {};
  }

  if (services.length === 0) {
    logger.warn('[Mock] 无已注册外部服务，外部指标为空');
    return {};
  }

  // 2. 并行外呼所有注册的外部服务
  const calls = services.map(async (svc) => {
    const res = await fetch(`${STUB_SERVER_URL}${svc.path}`, {
      method: svc.method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`${svc.name} returned HTTP ${res.status}`);
    return { name: svc.name, data: await res.json() as Record<string, any> };
  });

  const results = await Promise.allSettled(calls);

  // 3. 合并所有成功响应（同名字段后者覆盖前者）
  const merged: Record<string, any> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      Object.assign(merged, result.value.data);
    } else {
      logger.warn({ error: (result.reason as Error).message }, '[Mock] 外部服务外呼失败，跳过');
    }
  }

  logger.info({ userId, fields: Object.keys(merged) }, '[Mock] 外部指标合并完成');
  return merged;
}

// ── 核心计算 ──────────────────────────────────────────────

export async function calculateCreditScore(userId: string): Promise<ScoreResult> {
  const db = getPrisma();

  // 并行：本地 DB 指标 + 外部 HTTP 指标
  const [
    [userInfo, accountBalance, socialSecurity, salarySummary],
    stubInd,
    dbInd,
  ] = await Promise.all([
    Promise.all([
      db.mockUserInfo.findUnique({ where: { userId } }),
      db.mockAccountBalance.findUnique({ where: { userId } }),
      db.mockSocialSecurity.findUnique({ where: { userId } }),
      db.mockSalarySummary.findUnique({ where: { userId } }),
    ]),
    fetchExternalIndicators(userId),
    db.mockExternalIndicator.findUnique({ where: { userId } }),
  ]);

  if (!userInfo || !accountBalance || !socialSecurity || !salarySummary) {
    return {
      resultCode: '0001',
      resultMsg: '用户数据不存在',
      admitFlag: '0',
      creditLimit: '0.00',
    };
  }

  const userLevel          = userInfo.userLevel;
  const avg3mBalance       = Number(accountBalance.avg3mBalance);
  const socialSecurityFlag = socialSecurity.socialSecurityFlag;
  const monthlySalary      = Number(salarySummary.monthlySalary);

  // 外部指标：优先挡板服务器，其次 DB 预置数据，均无则跳过外部检查
  let externalInd: Record<string, any> = stubInd;
  if (Object.keys(externalInd).length === 0 && dbInd) {
    externalInd = {
      cardStatus:          dbInd.cardStatus,
      recentTransAmount:   dbInd.recentTransAmount,
      idCheckResult:       dbInd.idCheckResult,
      isBlack:             dbInd.isBlack,
    };
  }

  const hasExternalData = Object.keys(externalInd).length > 0;
  const cardStatus        = externalInd.cardStatus;
  const idCheckResult     = externalInd.idCheckResult;
  const isBlack           = externalInd.isBlack;
  const recentTransAmount = externalInd.recentTransAmount;

  // 准入判断：本地指标必须满足；有外部数据时外部指标也须全部通过
  const externalOk = !hasExternalData || (
    cardStatus === 'NORMAL' &&
    idCheckResult === 'PASS' &&
    isBlack === false &&
    Number(recentTransAmount) > 0
  );

  const admitted =
    monthlySalary > 10000 &&
    socialSecurityFlag === 1 &&
    externalOk;

  if (!admitted) {
    return { resultCode: '0000', resultMsg: 'success', admitFlag: '0', creditLimit: '0.00' };
  }

  // 系数：3 档
  const coefficient = avg3mBalance > 1000 ? 2.3 : avg3mBalance > 0 ? 0.5 : 0.2;

  let creditLimit = userLevel * (avg3mBalance / 1000) * monthlySalary * coefficient;
  if (creditLimit < 0) creditLimit = 0;

  return {
    resultCode: '0000',
    resultMsg: 'success',
    admitFlag: '1',
    creditLimit: creditLimit.toFixed(2),
  };
}
