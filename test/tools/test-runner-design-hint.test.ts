/**
 * Unit tests for the design error hint detection logic in test-runner.
 *
 * These tests verify that when a test case's expected value doesn't match
 * the formula-derived correct result but the system's actual value does,
 * the detector flags it as a suspected case design error.
 */

import { describe, it, expect } from "vitest";

// ── Re-implement the pure detection logic for isolated testing ──────────────
// (mirrors detectCaseDesignHints in test-runner.ts without import side-effects)

interface AssertionResult {
  path: string;
  op: string;
  expected: string;
  actual: string | null;
  passed: boolean;
}

function detectCaseDesignHints(tc: any, assertionResults: AssertionResult[]): string | undefined {
  const dbSetup = tc.preconditions?.db_setup ?? {};
  const externalSetup: Record<string, unknown> = tc.preconditions?.external_setup ?? {};

  const userLevel     = dbSetup.user_info?.user_level;
  const avg3mBalance  = dbSetup.account_balance?.avg_3m_balance;
  const monthlySalary = dbSetup.salary_summary?.monthly_salary;

  if (userLevel == null || avg3mBalance == null || monthlySalary == null) return undefined;

  const ss          = dbSetup.cgs_social_security?.social_security_flag ?? 0;
  const cardStatus  = externalSetup.card_status  ?? "NORMAL";
  const idCheck     = externalSetup.id_check_result ?? "PASS";
  const isBlack     = externalSetup.is_black     ?? false;
  const recentTrans = Number(externalSetup.recent_trans_amount ?? 0);

  const admitted =
    monthlySalary > 10000 &&
    ss === 1 &&
    cardStatus === "NORMAL" &&
    idCheck === "PASS" &&
    isBlack === false &&
    recentTrans > 0;

  if (!admitted) return undefined;

  const coefficient = avg3mBalance > 1000 ? 2.3 : avg3mBalance > 0 ? 0.5 : 0.2;
  const correctLimit = Math.max(0, userLevel * (avg3mBalance / 1000) * monthlySalary * coefficient);
  const correctStr   = correctLimit.toFixed(2);

  const hints: string[] = [];
  for (const ar of assertionResults) {
    if (!ar.passed && ar.path === "//credit_limit" && ar.op === "eq") {
      if (ar.actual === correctStr && ar.expected !== correctStr) {
        hints.push(
          `⚠️ 疑似用例设计错误：系统返回 ${ar.actual} 符合公式计算结果` +
          `（${userLevel}×(${avg3mBalance}/1000)×${monthlySalary}×${coefficient}=${correctStr}），` +
          `期望值 ${ar.expected} 有误——请用 calculate_value 工具核查并更正`
        );
      }
    }
  }

  return hints.length > 0 ? hints.join("; ") : undefined;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeAdmittedTc(overrides: {
  userLevel?: number;
  avg3mBalance?: number;
  monthlySalary?: number;
} = {}) {
  const { userLevel = 2, avg3mBalance = 1200, monthlySalary = 10001 } = overrides;
  return {
    preconditions: {
      db_setup: {
        user_info:          { user_id: "TC_X", user_level: userLevel },
        account_balance:    { user_id: "TC_X", avg_3m_balance: avg3mBalance },
        cgs_social_security:{ user_id: "TC_X", social_security_flag: 1 },
        salary_summary:     { user_id: "TC_X", monthly_salary: monthlySalary },
      },
      external_setup: {
        card_status:          "NORMAL",
        recent_trans_amount:  3500,
        id_check_result:      "PASS",
        is_black:             false,
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("detectCaseDesignHints", () => {
  // ── TC_010 scenario: level=2, balance=1200, salary=10001 → coeff=2.3 → 55205.52 ──

  it("TC-010 scenario: flags when expected=6624.60 but correct=55205.52", () => {
    const tc = makeAdmittedTc({ userLevel: 2, avg3mBalance: 1200, monthlySalary: 10001 });
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "6624.60", actual: "55205.52", passed: false },
    ];
    const hint = detectCaseDesignHints(tc, assertions);
    expect(hint).toBeDefined();
    expect(hint).toContain("疑似用例设计错误");
    expect(hint).toContain("55205.52");
    expect(hint).toContain("6624.60");
  });

  // ── TC_015 scenario: level=5, balance=2500, salary=22000 → coeff=2.3 → 632500.00 ──

  it("TC-015 scenario: flags when expected=253000.00 but correct=632500.00", () => {
    const tc = makeAdmittedTc({ userLevel: 5, avg3mBalance: 2500, monthlySalary: 22000 });
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "253000.00", actual: "632500.00", passed: false },
    ];
    const hint = detectCaseDesignHints(tc, assertions);
    expect(hint).toBeDefined();
    expect(hint).toContain("疑似用例设计错误");
    expect(hint).toContain("632500.00");
  });

  // ── TC_017 scenario: level=4, balance=1.00, salary=12000 → coeff=0.5 (NOT 2.3) → 24.00 ──

  it("TC-017 scenario: flags when expected=110.40 (wrong coeff) but correct=24.00", () => {
    const tc = makeAdmittedTc({ userLevel: 4, avg3mBalance: 1, monthlySalary: 12000 });
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "110.40", actual: "24.00", passed: false },
    ];
    const hint = detectCaseDesignHints(tc, assertions);
    expect(hint).toBeDefined();
    expect(hint).toContain("疑似用例设计错误");
    expect(hint).toContain("24.00");
    expect(hint).toContain("110.40");
  });

  // ── No false positive: passes silently when assertion is actually correct ──

  it("no hint when assertion passes", () => {
    const tc = makeAdmittedTc({ userLevel: 2, avg3mBalance: 1200, monthlySalary: 10001 });
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "55205.52", actual: "55205.52", passed: true },
    ];
    expect(detectCaseDesignHints(tc, assertions)).toBeUndefined();
  });

  // ── No false positive: actual differs from formula → real system bug, no hint ──

  it("no hint when actual differs from formula (real system bug)", () => {
    const tc = makeAdmittedTc({ userLevel: 2, avg3mBalance: 1200, monthlySalary: 10001 });
    // Both expected and actual are wrong — actual doesn't match formula either
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "55205.52", actual: "99999.00", passed: false },
    ];
    expect(detectCaseDesignHints(tc, assertions)).toBeUndefined();
  });

  // ── No hint for rejection cases (admitted=false) ──

  it("no hint for rejection cases (salary ≤ 10000)", () => {
    const tc = {
      preconditions: {
        db_setup: {
          user_info:          { user_id: "TC_X", user_level: 2 },
          account_balance:    { user_id: "TC_X", avg_3m_balance: 1500 },
          cgs_social_security:{ user_id: "TC_X", social_security_flag: 1 },
          salary_summary:     { user_id: "TC_X", monthly_salary: 10000 },  // ≤ 10000 → reject
        },
        external_setup: { card_status: "NORMAL", recent_trans_amount: 1000, id_check_result: "PASS", is_black: false },
      },
    };
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "123.00", actual: "0.00", passed: false },
    ];
    expect(detectCaseDesignHints(tc, assertions)).toBeUndefined();
  });

  // ── No hint when db_setup is incomplete ──

  it("no hint when db_setup lacks required fields", () => {
    const tc = { preconditions: { db_setup: {} } };
    const assertions: AssertionResult[] = [
      { path: "//credit_limit", op: "eq", expected: "100.00", actual: "200.00", passed: false },
    ];
    expect(detectCaseDesignHints(tc, assertions)).toBeUndefined();
  });
});
