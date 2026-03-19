import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../config/logger.js';
import { calculateCreditScore } from './mock.service.js';

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

  // 注册 XML content-type 解析器
  app.addContentTypeParser(
    'application/xml',
    { parseAs: 'string' },
    (_req, body, done) => done(null, body)
  );

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
      return reply.status(400).header('Content-Type', 'application/xml').send(resp);
    }

    const result = await calculateCreditScore(userId);

    logger.info({ userId, admitFlag: result.admitFlag, creditLimit: result.creditLimit }, '[Mock] 测算完成');

    const resp = buildXmlResponse(
      result.resultCode,
      result.resultMsg,
      result.admitFlag,
      result.creditLimit
    );

    return reply.status(200).header('Content-Type', 'application/xml').send(resp);
  });
}
