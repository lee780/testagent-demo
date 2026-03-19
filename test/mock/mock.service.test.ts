import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateCreditScore } from '../../src/server/modules/mock/mock.service.js';
import { setupUser, cleanupUser } from './helpers.js';

// 测试用 userId 前缀，避免与其他数据冲突
const P = 'UT_';

afterEach(async () => {
  // 清理本轮测试数据
  for (let i = 1; i <= 30; i++) {
    await cleanupUser(`${P}${String(i).padStart(3, '0')}`).catch(() => {});
  }
});

// ─── UT-001：准入规则判断 ─────────────────────────────────────────────────────

describe('UT-001 准入规则判断', () => {
  it('UT-001-01: 工资=10000 无社保 → 不准入', async () => {
    await setupUser(`${P}001`, { userLevel: 1, balance: 0, ss: 0, salary: 10000 });
    const r = await calculateCreditScore(`${P}001`);
    expect(r.resultCode).toBe('0000');
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });

  it('UT-001-02: 工资=10000 有社保 → 不准入（非严格大于）', async () => {
    await setupUser(`${P}002`, { userLevel: 1, balance: 0, ss: 1, salary: 10000 });
    const r = await calculateCreditScore(`${P}002`);
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });

  it('UT-001-03: 工资=10001 有社保 → 准入（边界值）', async () => {
    await setupUser(`${P}003`, { userLevel: 1, balance: 1, ss: 1, salary: 10001 });
    const r = await calculateCreditScore(`${P}003`);
    expect(r.admitFlag).toBe('1');
  });

  it('UT-001-04: 工资=20000 无社保 → 不准入', async () => {
    await setupUser(`${P}004`, { userLevel: 1, balance: 5000, ss: 0, salary: 20000 });
    const r = await calculateCreditScore(`${P}004`);
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });

  it('UT-001-05: 工资=20000 有社保 → 准入', async () => {
    await setupUser(`${P}005`, { userLevel: 1, balance: 5000, ss: 1, salary: 20000 });
    const r = await calculateCreditScore(`${P}005`);
    expect(r.admitFlag).toBe('1');
  });
});

// ─── UT-002：系数取值规则 ─────────────────────────────────────────────────────

describe('UT-002 系数取值规则', () => {
  it('UT-002-01: 资产>0 → 系数2.3，额度=1×(10000/1000)×20000×2.3=460000', async () => {
    await setupUser(`${P}011`, { userLevel: 1, balance: 10000, ss: 1, salary: 20000 });
    const r = await calculateCreditScore(`${P}011`);
    expect(r.admitFlag).toBe('1');
    expect(r.creditLimit).toBe('460000.00');
  });

  it('UT-002-02: 资产=0 → 系数0.5，额度=0', async () => {
    await setupUser(`${P}012`, { userLevel: 3, balance: 0, ss: 1, salary: 20000 });
    const r = await calculateCreditScore(`${P}012`);
    expect(r.admitFlag).toBe('1');
    expect(r.creditLimit).toBe('0.00');
  });

  it('UT-002-03: 资产=-5000 → 系数0.5，额度归零（负数归零）', async () => {
    await setupUser(`${P}013`, { userLevel: 3, balance: -5000, ss: 1, salary: 20000 });
    const r = await calculateCreditScore(`${P}013`);
    expect(r.admitFlag).toBe('1');
    expect(r.creditLimit).toBe('0.00');
  });
});

// ─── UT-003：额度计算公式 ─────────────────────────────────────────────────────

describe('UT-003 额度计算公式', () => {
  it('UT-003-01: TC004标准验证 3×(5000/1000)×15000×2.3=517500.00', async () => {
    await setupUser(`${P}021`, { userLevel: 3, balance: 5000, ss: 1, salary: 15000 });
    const r = await calculateCreditScore(`${P}021`);
    expect(r.creditLimit).toBe('517500.00');
  });

  it('UT-003-02: 等级1，资产1元 1×(1/1000)×10001×2.3≈0.02', async () => {
    await setupUser(`${P}022`, { userLevel: 1, balance: 1, ss: 1, salary: 10001 });
    const r = await calculateCreditScore(`${P}022`);
    // 1 × 0.001 × 10001 × 2.3 = 23.0023 → 23.00
    expect(r.creditLimit).toBe('23.00');
  });

  it('UT-003-03: 等级5，高资产高工资 5×(100000/1000)×100000×2.3=115000000.00', async () => {
    await setupUser(`${P}023`, { userLevel: 5, balance: 100000, ss: 1, salary: 100000 });
    const r = await calculateCreditScore(`${P}023`);
    expect(r.creditLimit).toBe('115000000.00');
  });

  it('UT-003-04: 资产=0，系数0.5，额度=0', async () => {
    await setupUser(`${P}024`, { userLevel: 3, balance: 0, ss: 1, salary: 15000 });
    const r = await calculateCreditScore(`${P}024`);
    expect(r.creditLimit).toBe('0.00');
  });

  it('UT-003-05: 资产=-5000，结果应归零（不能为负）', async () => {
    await setupUser(`${P}025`, { userLevel: 3, balance: -5000, ss: 1, salary: 15000 });
    const r = await calculateCreditScore(`${P}025`);
    expect(parseFloat(r.creditLimit)).toBeGreaterThanOrEqual(0);
    expect(r.creditLimit).toBe('0.00');
  });
});

// ─── UT-004：数据缺失处理 ─────────────────────────────────────────────────────

describe('UT-004 数据缺失处理', () => {
  it('UT-004-01: userId不存在 → result_code=0001', async () => {
    const r = await calculateCreditScore('USER_NOT_EXIST_XYZABC');
    expect(r.resultCode).toBe('0001');
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });
});

// ─── E2E 用例预期值验证（18条）────────────────────────────────────────────────

describe('E2E 18条业务用例预期值', () => {
  // 不准入场景
  it('E2E-TC001: 工资8000无社保 → 不准入', async () => {
    await setupUser(`${P}TC01`, { userLevel: 1, balance: 0, ss: 0, salary: 8000 });
    const r = await calculateCreditScore(`${P}TC01`);
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });
  it('E2E-TC002: 工资9000有社保 → 不准入', async () => {
    await setupUser(`${P}TC02`, { userLevel: 1, balance: 0, ss: 1, salary: 9000 });
    const r = await calculateCreditScore(`${P}TC02`);
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });
  it('E2E-TC003: 工资12000无社保 → 不准入', async () => {
    await setupUser(`${P}TC03`, { userLevel: 1, balance: 0, ss: 0, salary: 12000 });
    const r = await calculateCreditScore(`${P}TC03`);
    expect(r.admitFlag).toBe('0');
    expect(r.creditLimit).toBe('0.00');
  });

  // 准入-资产负(5条) → 额度归零
  for (const level of [1, 2, 3, 4, 5]) {
    it(`E2E-TC00${3 + level}: 准入，资产-1000，等级${level} → 额度归零`, async () => {
      const uid = `${P}TCA${level}`;
      await setupUser(uid, { userLevel: level, balance: -1000, ss: 1, salary: 12000 });
      const r = await calculateCreditScore(uid);
      expect(r.admitFlag).toBe('1');
      expect(r.creditLimit).toBe('0.00');
    });
  }

  // 准入-资产0(5条) → 额度=0
  for (const level of [1, 2, 3, 4, 5]) {
    it(`E2E-TC0${8 + level}: 准入，资产=0，等级${level} → 额度0`, async () => {
      const uid = `${P}TCB${level}`;
      await setupUser(uid, { userLevel: level, balance: 0, ss: 1, salary: 12000 });
      const r = await calculateCreditScore(uid);
      expect(r.admitFlag).toBe('1');
      expect(r.creditLimit).toBe('0.00');
    });
  }

  // 准入-资产正(5条) → 额度=level×(5000/1000)×15000×2.3
  const expectedLimits: Record<number, string> = {
    1: '172500.00',
    2: '345000.00',
    3: '517500.00',
    4: '690000.00',
    5: '862500.00',
  };
  for (const level of [1, 2, 3, 4, 5]) {
    it(`E2E-TC01${3 + level}: 准入，资产5000，等级${level} → 额度${expectedLimits[level]}`, async () => {
      const uid = `${P}TCC${level}`;
      await setupUser(uid, { userLevel: level, balance: 5000, ss: 1, salary: 15000 });
      const r = await calculateCreditScore(uid);
      expect(r.admitFlag).toBe('1');
      expect(r.creditLimit).toBe(expectedLimits[level]);
    });
  }
});
