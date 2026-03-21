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
   * 设置测试前置条件 - 为指定用户创建/更新 mock 数据
   */
  app.post('/mock/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const logger = getLogger();
    const body = request.body as any;
    
    const { userId, userLevel, avg3mBalance, socialSecurityFlag, monthlySalary } = body;

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId is required' });
    }

    try {
      const db = getPrisma();

      // 使用 upsert 确保四条记录同时存在或都不存在
      await db.$transaction([
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
      ]);

      logger.info({ userId, userLevel, avg3mBalance, socialSecurityFlag, monthlySalary }, '[Mock] 数据设置完成');

      return reply.send({ success: true, userId, message: 'Test data configured successfully' });
    } catch (error: any) {
      logger.error({ error: error.message }, '[Mock] 数据设置失败');
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
