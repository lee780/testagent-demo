import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../config/logger.js';
import { calculateCreditScore } from './mock.service.js';
import { getPrisma } from '../../config/database.js';

function extractXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
  return match ? match[1].trim() : '';
}

function buildXmlResponse(
  resultCode: string,
  resultMsg: string,
  admitFlag: string,
  creditLimit: string
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RESPONSE>
  <result_code>${resultCode}</result_code>
  <result_msg>${resultMsg}</result_msg>
  <admit_flag>${admitFlag}</admit_flag>
  <credit_limit>${creditLimit}</credit_limit>
</RESPONSE>`;
}

export async function registerMockRoutes(app: FastifyInstance): Promise<void> {
  const logger = getLogger();

  // 注册 XML content-type 解析器（同时支持 application/xml 和 text/xml）
  const xmlParser = (_req: any, body: string, done: any) => done(null, body);
  app.addContentTypeParser('application/xml', { parseAs: 'string' }, xmlParser);
  app.addContentTypeParser('text/xml', { parseAs: 'string' }, xmlParser);

  /**
   * POST /mock/model/score
   * MODEL_001 授信额度测算 - 被测接口
   */
  app.post('/mock/model/score', async (request: FastifyRequest, reply: FastifyReply) => {
    const xml = request.body as string;
    const userId = extractXmlTag(xml, 'user_id');

    logger.info({ userId }, '[Mock] 收到授信测算请求');

    if (!userId) {
      const resp = buildXmlResponse('9999', 'user_id 不能为空', '0', '0.00');
      return reply.status(400).header('Content-Type', 'text/xml; charset=utf-8').send(resp);
    }

    const result = await calculateCreditScore(userId);

    logger.info({ userId, admitFlag: result.admitFlag, creditLimit: result.creditLimit }, '[Mock] 测算完成');

    const resp = buildXmlResponse(
      result.resultCode,
      result.resultMsg,
      result.admitFlag,
      result.creditLimit
    );

    return reply.status(200).header('Content-Type', 'text/xml; charset=utf-8').send(resp);
  });

  /**
   * POST /mock/setup
   * 设置测试前置条件：
   *   - 写入本地数据库指标（userLevel / avg3mBalance / socialSecurityFlag / monthlySalary）
   *   - 可选 external_stubs：批量向挡板服务器注册外部服务路由，供 C 系统外呼
   *
   * external_stubs 格式：
   * [
   *   {
   *     name: "支付宝",               // 服务名（标注用）
   *     path: "/alipay/query",        // 挡板路径（C 系统将 POST 到此）
   *     method?: "POST",              // 默认 POST
   *     statusCode?: 200,             // 默认 200
   *     response: { ... }             // 任意 JSON，字段自由定义
   *   }
   * ]
   */
  app.post('/mock/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const logger = getLogger();
    const body = request.body as any;

    const { userId, userLevel, avg3mBalance, socialSecurityFlag, monthlySalary, external_setup, external_stubs } = body;

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId is required' });
    }

    try {
      const db = getPrisma();

      const ops: any[] = [
        db.mockUserInfo.upsert({
          where: { userId },
          update: { userLevel: Number(userLevel) },
          create: { userId, userLevel: Number(userLevel) },
        }),
        db.mockAccountBalance.upsert({
          where: { userId },
          update: { avg3mBalance: String(avg3mBalance) },
          create: { userId, avg3mBalance: String(avg3mBalance) },
        }),
        db.mockSocialSecurity.upsert({
          where: { userId },
          update: { socialSecurityFlag: Number(socialSecurityFlag) },
          create: { userId, socialSecurityFlag: Number(socialSecurityFlag) },
        }),
        db.mockSalarySummary.upsert({
          where: { userId },
          update: { monthlySalary: String(monthlySalary) },
          create: { userId, monthlySalary: String(monthlySalary) },
        }),
      ];

      if (external_setup) {
        ops.push(db.mockExternalIndicator.upsert({
          where: { userId },
          update: {
            cardStatus: String(external_setup.card_status ?? 'NORMAL'),
            recentTransAmount: String(external_setup.recent_trans_amount ?? 0),
            idCheckResult: String(external_setup.id_check_result ?? 'PASS'),
            isBlack: Boolean(external_setup.is_black ?? false),
          },
          create: {
            userId,
            cardStatus: String(external_setup.card_status ?? 'NORMAL'),
            recentTransAmount: String(external_setup.recent_trans_amount ?? 0),
            idCheckResult: String(external_setup.id_check_result ?? 'PASS'),
            isBlack: Boolean(external_setup.is_black ?? false),
          },
        }));
      }

      await db.$transaction(ops);

      // 向挡板服务器注册外部服务路由
      const stubResults: any[] = [];
      if (Array.isArray(external_stubs) && external_stubs.length > 0) {
        const STUB_URL = process.env.STUB_SERVER_URL ?? 'http://localhost:8002';

        for (const stub of external_stubs) {
          const { name, path, method = 'POST', statusCode = 200, response } = stub;
          if (!path || response === undefined) continue;

          try {
            // 注册挡板路由（任意 method + path → response）
            await fetch(`${STUB_URL}/_admin/routes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, method, path, statusCode, response }),
              signal: AbortSignal.timeout(3000),
            });

            // 同时注册为外部服务（告知 C 系统外呼此路径）
            await fetch(`${STUB_URL}/_admin/ext-services`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name ?? path, path, method }),
              signal: AbortSignal.timeout(3000),
            });

            stubResults.push({ path, ok: true });
            logger.info({ name, path }, '[Mock] 外部服务挡板已配置');
          } catch (err: any) {
            stubResults.push({ path, ok: false, error: err.message });
            logger.warn({ name, path, err: err.message }, '[Mock] 挡板服务器配置失败');
          }
        }
      }

      logger.info({ userId, userLevel, avg3mBalance, socialSecurityFlag, monthlySalary, stubs: stubResults.length }, '[Mock] 数据设置完成');

      return reply.send({
        success: true,
        userId,
        message: 'Test data configured successfully',
        stubs: stubResults,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '[Mock] 数据设置失败');
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
