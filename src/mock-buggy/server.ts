/**
 * MODEL_001 重构版备测系统（含缺陷）— 端口 8001
 *
 * 模拟人为重构引入的两个 Bug，用于对比测试：
 *
 * Bug-1 [准入门槛]：monthly_salary >= 10000（原始逻辑是严格大于 >10000）
 *   → 工资恰好等于 10000 时，错误地通过准入
 *
 * Bug-2 [额度公式]：忘记 avg_3m_balance ÷ 1000，直接使用原始元值参与计算
 *   → 所有正资产准入用例的 credit_limit 结果偏大 1000 倍
 */

import Fastify from 'fastify';
import { getPrisma } from '../server/config/database.js';
import { getLogger } from '../server/config/logger.js';

const PORT = 8001;
const app = Fastify({ logger: false });
const logger = getLogger();

// ── XML 解析 ──────────────────────────────────────────────
const xmlParser = (_req: any, body: string, done: any) => done(null, body);
app.addContentTypeParser('application/xml', { parseAs: 'string' }, xmlParser);
app.addContentTypeParser('text/xml',        { parseAs: 'string' }, xmlParser);

function extractXmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function buildXmlResponse(resultCode: string, resultMsg: string, admitFlag: string, creditLimit: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RESPONSE>
  <result_code>${resultCode}</result_code>
  <result_msg>${resultMsg}</result_msg>
  <admit_flag>${admitFlag}</admit_flag>
  <credit_limit>${creditLimit}</credit_limit>
</RESPONSE>`;
}

// ── 核心计算（含 Bug） ─────────────────────────────────────
async function calculateCreditScoreBuggy(userId: string) {
  const db = getPrisma();

  const [userInfo, accountBalance, socialSecurity, salarySummary] = await Promise.all([
    db.mockUserInfo.findUnique({ where: { userId } }),
    db.mockAccountBalance.findUnique({ where: { userId } }),
    db.mockSocialSecurity.findUnique({ where: { userId } }),
    db.mockSalarySummary.findUnique({ where: { userId } }),
  ]);

  if (!userInfo || !accountBalance || !socialSecurity || !salarySummary) {
    return { resultCode: '0001', resultMsg: '用户数据不存在', admitFlag: '0', creditLimit: '0.00' };
  }

  const userLevel        = userInfo.userLevel;
  const avg3mBalance     = Number(accountBalance.avg3mBalance);
  const socialSecurityFlag = socialSecurity.socialSecurityFlag;
  const monthlySalary    = Number(salarySummary.monthlySalary);

  // ❌ Bug-1: 准入条件用 >= 10000，正确逻辑应为 > 10000
  const admitted = monthlySalary >= 10000 && socialSecurityFlag === 1;

  if (!admitted) {
    return { resultCode: '0000', resultMsg: 'success', admitFlag: '0', creditLimit: '0.00' };
  }

  const coefficient = avg3mBalance > 0 ? 2.3 : 0.5;

  // ❌ Bug-2: 忘记将 avg3mBalance 除以 1000（公式要求以千元为单位）
  let creditLimit = userLevel * avg3mBalance * monthlySalary * coefficient;
  if (creditLimit < 0) creditLimit = 0;

  return {
    resultCode: '0000',
    resultMsg:  'success',
    admitFlag:  '1',
    creditLimit: creditLimit.toFixed(2),
  };
}

// ── 路由 ─────────────────────────────────────────────────
app.post('/mock/model/score', async (request, reply) => {
  const xml    = request.body as string;
  const userId = extractXmlTag(xml, 'user_id');

  logger.info({ userId }, '[BuggyMock] 收到授信测算请求');

  if (!userId) {
    return reply.status(400)
      .header('Content-Type', 'text/xml; charset=utf-8')
      .send(buildXmlResponse('9999', 'user_id 不能为空', '0', '0.00'));
  }

  const result = await calculateCreditScoreBuggy(userId);

  logger.info({ userId, admitFlag: result.admitFlag, creditLimit: result.creditLimit }, '[BuggyMock] 测算完成');

  return reply.status(200)
    .header('Content-Type', 'text/xml; charset=utf-8')
    .send(buildXmlResponse(result.resultCode, result.resultMsg, result.admitFlag, result.creditLimit));
});

app.get('/health', async () => ({ status: 'ok', server: 'buggy-mock', port: PORT }));

// ── 启动 ─────────────────────────────────────────────────
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { logger.error(err, 'BuggyMock server failed to start'); process.exit(1); }
  logger.info(`[BuggyMock] 重构版备测系统已启动 → http://localhost:${PORT}`);
  logger.info('[BuggyMock] 内置缺陷: Bug-1(准入>=10000) + Bug-2(额度公式缺少÷1000)');
});
