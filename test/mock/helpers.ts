import { getPrisma } from '../../src/server/config/database.js';

export interface ExternalSetup {
  cardStatus?: string;
  idCheckResult?: string;
  isBlack?: boolean;
  recentTransAmount?: number;
}

export interface UserSetup {
  userLevel: number;
  balance: number;
  ss: number;
  salary: number;
  external?: ExternalSetup;
}

export async function setupUser(userId: string, data: UserSetup): Promise<void> {
  const db = getPrisma();
  const ops: any[] = [
    db.mockUserInfo.upsert({
      where: { userId },
      create: { userId, userLevel: data.userLevel },
      update: { userLevel: data.userLevel },
    }),
    db.mockAccountBalance.upsert({
      where: { userId },
      create: { userId, avg3mBalance: data.balance },
      update: { avg3mBalance: data.balance },
    }),
    db.mockSocialSecurity.upsert({
      where: { userId },
      create: { userId, socialSecurityFlag: data.ss },
      update: { socialSecurityFlag: data.ss },
    }),
    db.mockSalarySummary.upsert({
      where: { userId },
      create: { userId, monthlySalary: data.salary },
      update: { monthlySalary: data.salary },
    }),
  ];

  if (data.external) {
    const ext = data.external;
    ops.push(db.mockExternalIndicator.upsert({
      where: { userId },
      create: {
        userId,
        cardStatus:        ext.cardStatus        ?? 'NORMAL',
        idCheckResult:     ext.idCheckResult     ?? 'PASS',
        isBlack:           ext.isBlack           ?? false,
        recentTransAmount: String(ext.recentTransAmount ?? 0),
      },
      update: {
        cardStatus:        ext.cardStatus        ?? 'NORMAL',
        idCheckResult:     ext.idCheckResult     ?? 'PASS',
        isBlack:           ext.isBlack           ?? false,
        recentTransAmount: String(ext.recentTransAmount ?? 0),
      },
    }));
  }

  await db.$transaction(ops);
}

export async function cleanupUser(userId: string): Promise<void> {
  const db = getPrisma();
  await db.$transaction([
    db.mockUserInfo.deleteMany({ where: { userId } }),
    db.mockAccountBalance.deleteMany({ where: { userId } }),
    db.mockSocialSecurity.deleteMany({ where: { userId } }),
    db.mockSalarySummary.deleteMany({ where: { userId } }),
    db.mockExternalIndicator.deleteMany({ where: { userId } }),
  ]);
}
