import { getPrisma } from '../../src/server/config/database.js';

export interface UserSetup {
  userLevel: number;
  balance: number;
  ss: number;
  salary: number;
}

export async function setupUser(userId: string, data: UserSetup): Promise<void> {
  const db = getPrisma();
  await db.$transaction([
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
  ]);
}

export async function cleanupUser(userId: string): Promise<void> {
  const db = getPrisma();
  await db.$transaction([
    db.mockUserInfo.deleteMany({ where: { userId } }),
    db.mockAccountBalance.deleteMany({ where: { userId } }),
    db.mockSocialSecurity.deleteMany({ where: { userId } }),
    db.mockSalarySummary.deleteMany({ where: { userId } }),
  ]);
}
