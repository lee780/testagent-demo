/**
 * Test Case Generator Tool
 * 将 cases_summary.json 中的用例数据生成：
 * - SQL 预埋文件（幂等，DELETE + INSERT）
 * - HTTPRunner v4 YAML 测试脚本
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestCasePreconditions {
  user_level: number;
  avg_3m_balance: number;
  social_security_flag: number;
  monthly_salary: number;
}

export interface TestCaseExpected {
  admit_flag: string;
  credit_limit: string;
  coefficient: number;
}

export interface TestCase {
  id: string;
  name: string;
  category: string;
  preconditions: TestCasePreconditions;
  expected: TestCaseExpected;
  business_rules: string[];
}

// ─── SQL 文件生成 ─────────────────────────────────────────────────────────────

export function generateSqlFile(tc: TestCase, outputDir: string): string {
  const { id, name, preconditions: p } = tc;
  const userId = id; // 用 TC ID 作为 user_id，保证唯一

  const sql = `-- 用例：${id} ${name}
-- 执行时机：测试前，清理旧数据并写入测试数据
-- 幂等：可重复执行

-- 清理旧数据
DELETE FROM mock_user_info WHERE user_id = '${userId}';
DELETE FROM mock_account_balance WHERE user_id = '${userId}';
DELETE FROM mock_social_security WHERE user_id = '${userId}';
DELETE FROM mock_salary_summary WHERE user_id = '${userId}';

-- 写入测试数据
INSERT INTO mock_user_info (user_id, user_level) VALUES ('${userId}', ${p.user_level});
INSERT INTO mock_account_balance (user_id, avg_3m_balance) VALUES ('${userId}', ${p.avg_3m_balance});
INSERT INTO mock_social_security (user_id, social_security_flag) VALUES ('${userId}', ${p.social_security_flag});
INSERT INTO mock_salary_summary (user_id, monthly_salary) VALUES ('${userId}', ${p.monthly_salary});
`;

  const filename = `${id}_setup.sql`;
  writeFileSync(join(outputDir, filename), sql, 'utf-8');
  return filename;
}

// ─── HTTPRunner YAML 文件生成 ─────────────────────────────────────────────────

export function generateYamlFile(tc: TestCase, outputDir: string): string {
  const { id, name, preconditions: p, expected: e } = tc;
  const userId = id;

  const yaml = `config:
  name: "${id} ${name}"
  base_url: "\${ENV(BASE_URL)}"

teststeps:
  - name: "调用授信测算接口"
    request:
      url: /mock/model/score
      method: POST
      headers:
        Content-Type: application/xml;charset=utf-8
      body: |
        <?xml version="1.0" encoding="utf-8"?>
        <REQUEST>
          <user_id>${userId}</user_id>
          <model_id>MODEL_001</model_id>
          <channel>131</channel>
          <business_params>
            <sx_trace_id>${userId}_TRACE</sx_trace_id>
            <corp_id></corp_id>
            <corp_xy_num></corp_xy_num>
            <person_idtype>1010</person_idtype>
            <person_id></person_id>
            <person_name></person_name>
            <bnk_no></bnk_no>
            <cp_code>8890</cp_code>
            <c_code>110110</c_code>
            <p_code>110000</p_code>
            <fr_psn_id></fr_psn_id>
            <fr_psn_name></fr_psn_name>
          </business_params>
        </REQUEST>
    validate:
      - eq: ["status_code", 200]
      - contains: ["body", "<result_code>0000</result_code>"]
      - contains: ["body", "<admit_flag>${e.admit_flag}</admit_flag>"]
      - contains: ["body", "<credit_limit>${e.credit_limit}</credit_limit>"]
`;

  const filename = `${id}_test.yaml`;
  writeFileSync(join(outputDir, filename), yaml, 'utf-8');
  return filename;
}

// ─── 批量生成所有文件 ──────────────────────────────────────────────────────────

export function generateAllFiles(
  cases: TestCase[],
  sqlDir: string,
  yamlDir: string
): { sqlFiles: string[]; yamlFiles: string[] } {
  mkdirSync(sqlDir, { recursive: true });
  mkdirSync(yamlDir, { recursive: true });

  const sqlFiles: string[] = [];
  const yamlFiles: string[] = [];

  for (const tc of cases) {
    sqlFiles.push(generateSqlFile(tc, sqlDir));
    yamlFiles.push(generateYamlFile(tc, yamlDir));
  }

  return { sqlFiles, yamlFiles };
}
