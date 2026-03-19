import { getPrisma } from '../../config/database.js';

export interface ScoreResult {
  resultCode: string;
  resultMsg: string;
  admitFlag: string;
  creditLimit: string;
}

export async function calculateCreditScore(userId: string): Promise<ScoreResult> {
  const db = getPrisma();

  const [userInfo, accountBalance, socialSecurity, salarySummary] = await Promise.all([
    db.mockUserInfo.findUnique({ where: { userId } }),
    db.mockAccountBalance.findUnique({ where: { userId } }),
    db.mockSocialSecurity.findUnique({ where: { userId } }),
    db.mockSalarySummary.findUnique({ where: { userId } }),
  ]);

  if (!userInfo || !accountBalance || !socialSecurity || !salarySummary) {
    return {
      resultCode: '0001',
      resultMsg: '用户数据不存在',
      admitFlag: '0',
      creditLimit: '0.00',
    };
  }

  const userLevel = userInfo.userLevel;
  const avg3mBalance = Number(accountBalance.avg3mBalance);
  const socialSecurityFlag = socialSecurity.socialSecurityFlag;
  const monthlySalary = Number(salarySummary.monthlySalary);

  // 准入判断：工资 > 10000 且 有社保
  const admitted = monthlySalary > 10000 && socialSecurityFlag === 1;

  if (!admitted) {
    return { resultCode: '0000', resultMsg: 'success', admitFlag: '0', creditLimit: '0.00' };
  }

  // 系数取值
  const coefficient = avg3mBalance > 0 ? 2.3 : 0.5;

  // 额度计算，负数归零
  // 注：avg_3m_balance 存储单位为元，公式按千元计算，故除以 1000
  // 验证依据：user_level(3) × avg(5000)/1000 × salary(15000) × coeff(2.3) = 517500.00
  let creditLimit = userLevel * (avg3mBalance / 1000) * monthlySalary * coefficient;
  if (creditLimit < 0) creditLimit = 0;

  return {
    resultCode: '0000',
    resultMsg: 'success',
    admitFlag: '1',
    creditLimit: creditLimit.toFixed(2),
  };
}
