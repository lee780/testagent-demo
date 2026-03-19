/**
 * IT 集成测试：验证 Agent 生成文件的格式与内容正确性
 *
 * 测试策略：
 * - 使用固定的18条用例 JSON（由 generateExpectedCases() 生成，代表 Agent 应该生成的内容）
 * - 调用文件生成函数，实际生成 SQL + YAML 文件
 * - 验证文件内容符合规范
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { generateSqlFile, generateYamlFile, generateAllFiles } from '../../src/agent-core/tools/test-case-gen.js';

const OUTPUT_DIR = '/tmp/testagent-it-test';
const SQL_DIR = join(OUTPUT_DIR, 'sql');
const YAML_DIR = join(OUTPUT_DIR, 'testcases');

// 标准18条用例数据（模拟 Agent 生成的 cases_summary.json）
const EXPECTED_CASES = generateExpectedCases();

function generateExpectedCases() {
  const cases: any[] = [];

  // 不准入场景（3条）
  cases.push({
    id: 'TC_MODEL001_001', name: '工资≤10000且无社保不准入', category: '正常流程',
    preconditions: { user_level: 1, avg_3m_balance: 0, social_security_flag: 0, monthly_salary: 8000 },
    expected: { admit_flag: '0', credit_limit: '0.00', coefficient: 0 },
    business_rules: ['工资≤10000', '无社保'],
  });
  cases.push({
    id: 'TC_MODEL001_002', name: '工资≤10000有社保不准入', category: '正常流程',
    preconditions: { user_level: 1, avg_3m_balance: 0, social_security_flag: 1, monthly_salary: 9000 },
    expected: { admit_flag: '0', credit_limit: '0.00', coefficient: 0 },
    business_rules: ['工资≤10000', '有社保'],
  });
  cases.push({
    id: 'TC_MODEL001_003', name: '工资>10000无社保不准入', category: '正常流程',
    preconditions: { user_level: 1, avg_3m_balance: 0, social_security_flag: 0, monthly_salary: 12000 },
    expected: { admit_flag: '0', credit_limit: '0.00', coefficient: 0 },
    business_rules: ['工资>10000', '无社保'],
  });

  // 准入-资产负（5条）
  for (let level = 1; level <= 5; level++) {
    cases.push({
      id: `TC_MODEL001_${String(3 + level).padStart(3, '0')}`,
      name: `准入资产负等级${level}额度归零`, category: '正常流程',
      preconditions: { user_level: level, avg_3m_balance: -1000, social_security_flag: 1, monthly_salary: 12000 },
      expected: { admit_flag: '1', credit_limit: '0.00', coefficient: 0.5 },
      business_rules: ['准入', '资产<0', `等级${level}`],
    });
  }

  // 准入-资产零（5条）
  for (let level = 1; level <= 5; level++) {
    cases.push({
      id: `TC_MODEL001_${String(8 + level).padStart(3, '0')}`,
      name: `准入资产零等级${level}额度零`, category: '正常流程',
      preconditions: { user_level: level, avg_3m_balance: 0, social_security_flag: 1, monthly_salary: 12000 },
      expected: { admit_flag: '1', credit_limit: '0.00', coefficient: 0.5 },
      business_rules: ['准入', '资产=0', `等级${level}`],
    });
  }

  // 准入-资产正（5条）
  const limits: Record<number, string> = { 1: '172500.00', 2: '345000.00', 3: '517500.00', 4: '690000.00', 5: '862500.00' };
  for (let level = 1; level <= 5; level++) {
    cases.push({
      id: `TC_MODEL001_${String(13 + level).padStart(3, '0')}`,
      name: `准入资产正等级${level}`, category: '正常流程',
      preconditions: { user_level: level, avg_3m_balance: 5000, social_security_flag: 1, monthly_salary: 15000 },
      expected: { admit_flag: '1', credit_limit: limits[level], coefficient: 2.3 },
      business_rules: ['准入', '资产>0', `等级${level}`],
    });
  }

  return cases;
}

beforeAll(() => {
  mkdirSync(SQL_DIR, { recursive: true });
  mkdirSync(YAML_DIR, { recursive: true });
  generateAllFiles(EXPECTED_CASES, SQL_DIR, YAML_DIR);
});

afterAll(() => {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
});

// ─── IT-002：SQL 文件验证 ────────────────────────────────────────────────────

describe('IT-002 SQL 文件验证', () => {
  it('IT-002-01: SQL 文件数量 = 18', () => {
    const files = readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    expect(files.length).toBe(18);
  });

  it('IT-002-02: 每个文件含4条 DELETE 语句', () => {
    const files = readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    for (const file of files) {
      const content = readFileSync(join(SQL_DIR, file), 'utf-8');
      const deletes = (content.match(/DELETE FROM/g) || []).length;
      expect(deletes, `${file} 应有4条DELETE`).toBe(4);
    }
  });

  it('IT-002-03: 每个文件含4条 INSERT 语句', () => {
    const files = readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    for (const file of files) {
      const content = readFileSync(join(SQL_DIR, file), 'utf-8');
      const inserts = (content.match(/INSERT INTO/g) || []).length;
      expect(inserts, `${file} 应有4条INSERT`).toBe(4);
    }
  });

  it('IT-002-04: user_id 全局唯一（18个不重复）', () => {
    const files = readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    const userIds = new Set<string>();
    for (const file of files) {
      const content = readFileSync(join(SQL_DIR, file), 'utf-8');
      const match = content.match(/WHERE user_id = '([^']+)'/);
      if (match) userIds.add(match[1]);
    }
    expect(userIds.size).toBe(18);
  });

  it('IT-002-05: DELETE 在 INSERT 之前（幂等保证）', () => {
    const files = readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    for (const file of files) {
      const content = readFileSync(join(SQL_DIR, file), 'utf-8');
      const deletePos = content.indexOf('DELETE FROM');
      const insertPos = content.indexOf('INSERT INTO');
      expect(deletePos, `${file} DELETE 应在 INSERT 之前`).toBeLessThan(insertPos);
    }
  });

  it('IT-002-06: TC_MODEL001_016 数据值正确（level=3,balance=5000,ss=1,salary=15000）', () => {
    const content = readFileSync(join(SQL_DIR, 'TC_MODEL001_016_setup.sql'), 'utf-8');
    expect(content).toContain('mock_user_info');
    expect(content).toContain('5000');
    expect(content).toContain('15000');
  });
});

// ─── IT-003：HTTPRunner YAML 文件验证 ────────────────────────────────────────

describe('IT-003 HTTPRunner YAML 文件验证', () => {
  it('IT-003-01: YAML 文件数量 = 18', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    expect(files.length).toBe(18);
  });

  it('IT-003-02: 每个 YAML 含 config.name', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} 应含 name:`).toContain('name:');
    }
  });

  it('IT-003-03: 每个 YAML 使用 ENV(BASE_URL)', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} 应含 ENV(BASE_URL)`).toContain('ENV(BASE_URL)');
    }
  });

  it('IT-003-04: 每个 YAML 含 result_code 断言', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} 应含 result_code`).toContain('result_code');
    }
  });

  it('IT-003-05: 每个 YAML 含 admit_flag 断言', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} 应含 admit_flag`).toContain('admit_flag');
    }
  });

  it('IT-003-06: 每个 YAML 含 credit_limit 断言', () => {
    const files = readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} 应含 credit_limit`).toContain('credit_limit');
    }
  });

  it('IT-003-07: 不准入用例(TC001-TC003) admit_flag 断言值=0', () => {
    for (let i = 1; i <= 3; i++) {
      const file = `TC_MODEL001_${String(i).padStart(3, '0')}_test.yaml`;
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} admit_flag 应为 0`).toContain('<admit_flag>0</admit_flag>');
    }
  });

  it('IT-003-08: 准入用例(TC004+) admit_flag 断言值=1', () => {
    for (let i = 4; i <= 18; i++) {
      const file = `TC_MODEL001_${String(i).padStart(3, '0')}_test.yaml`;
      const content = readFileSync(join(YAML_DIR, file), 'utf-8');
      expect(content, `${file} admit_flag 应为 1`).toContain('<admit_flag>1</admit_flag>');
    }
  });

  it('IT-003-09: TC016(等级3,资产5000) credit_limit 断言值=517500.00', () => {
    const content = readFileSync(join(YAML_DIR, 'TC_MODEL001_016_test.yaml'), 'utf-8');
    expect(content).toContain('<credit_limit>517500.00</credit_limit>');
  });
});
