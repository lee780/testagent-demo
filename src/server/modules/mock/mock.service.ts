import { getPrisma } from '../../config/database.js';

export interface ScoreResult {
  resultCode: string;
  resultMsg: string;
  admitFlag: string;
  creditLimit: string;
}

export async function calculateCreditScore(userId: string): Promise<ScoreResult> {
  const db = getPrisma();

  const [userInfo, accountBalance, socialSecurity, salarySummary, externalInd] = await Promise.all([
    db.mockUserInfo.findUnique({ where: { userId } }),
    db.mockAccountBalance.findUnique({ where: { userId } }),
    db.mockSocialSecurity.findUnique({ where: { userId } }),
    db.mockSalarySummary.findUnique({ where: { userId } }),
    db.mockExternalIndicator.findUnique({ where: { userId } }),
  ]);

  if (!userInfo || !accountBalance || !socialSecurity || !salarySummary || !externalInd) {
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

  // 准入判断（v2.0）：6条全满足才准入
  const admitted =
    monthlySalary > 10000 &&
    socialSecurityFlag === 1 &&
    externalInd.cardStatus === 'NORMAL' &&
    externalInd.idCheckResult === 'PASS' &&
    externalInd.isBlack === false &&
    Number(externalInd.recentTransAmount) > 0;

  if (!admitted) {
    return { resultCode: '0000', resultMsg: 'success', admitFlag: '0', creditLimit: '0.00' };
  }

  // 系数取值（v2.0）：3档
  const coefficient = avg3mBalance > 1000 ? 2.3 : avg3mBalance > 0 ? 0.5 : 0.2;

  // 额度计算（v2.0）：去掉 ÷1000，负数归零
  let creditLimit = userLevel * avg3mBalance * monthlySalary * coefficient;
  if (creditLimit < 0) creditLimit = 0;

  return {
    resultCode: '0000',
    resultMsg: 'success',
    admitFlag: '1',
    creditLimit: creditLimit.toFixed(2),
  };
}
