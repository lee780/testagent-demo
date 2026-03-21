# 07 - 测试驱动开发（TDD）说明

> 版本：v2.0
> 日期：2026-03-20
> 适用范围：TestPilot 项目全生命周期

---

## 一、为什么用 TDD

TestPilot 本身是一个**测试管理平台**，它的开发模式必须和它所倡导的工程实践保持一致。用 TDD 开发一个测试平台，既是对工具本身的验证，也是对整个开发流程的示范。

具体动因：

1. **业务规则精确**：MODEL_001 的计算逻辑（准入条件、系数、公式）有精确的数值预期，非常适合先写断言
2. **状态机明确**：用例生命周期（DRAFT→BASELINE）和缺陷状态流转（OPEN→CLOSED）是有限状态机，边界清晰，便于穷举测试
3. **AI 输出不可预测**：LLM 驱动的功能（测试用例生成、模式切换、根因分析）必须有明确的验收标准，否则很难说"实现了"
4. **重构频繁**：项目处于快速迭代期（已有多次大范围重构），测试套件是重构的安全网
5. **多人协作基础**：测试用例是功能意图的机器可验证版本，优于注释和文档

---

## 二、TDD 在本项目中的实践形态

本项目采用**宽泛的 TDD 精神**，不强求严格的 Red-Green-Refactor 循环，根据不同层次使用不同的验证方式：

```
┌─────────────────────────────────────────────────────────────────┐
│  L4：产品验收测试（人工 + AI Agent 辅助）                         │
│  ✓ 多轮对话验证功能是否符合用户预期                               │
│  ✓ 生成完整测试报告，覆盖多个维度（见验收报告）                   │
├─────────────────────────────────────────────────────────────────┤
│  L3：HTTP 接口集成测试（curl + 自动化脚本）                        │
│  ✓ 验证四种测试模式的 API 响应                                   │
│  ✓ 验证 Zod schema 对非法 mode 的拒绝                            │
│  ✓ 验证用例生命周期 API                                          │
│  ✓ 验证缺陷管理 API（CRUD + 状态流转）                           │
├─────────────────────────────────────────────────────────────────┤
│  L2：组件单元测试（Vitest）                                       │
│  ✓ Mock Service 业务逻辑（calculateCreditScore）                  │
│  ✓ System Prompt 输出内容验证（关键词/约束）                      │
│  ✓ TestCase 生命周期 service 方法                                 │
│  ✓ Defect 状态流转 service 方法                                  │
├─────────────────────────────────────────────────────────────────┤
│  L1：静态类型检查（TypeScript）                                   │
│  ✓ 每次修改后运行 tsc --noEmit                                   │
│  ✓ mode 类型在全链路保持一致（TestMode 导出类型）                 │
│  ✓ TestCaseStatus / DefectStatus 枚举与 Prisma schema 同步       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、典型 TDD 案例：Mock Service 业务逻辑

### 3.1 先写测试（test/mock/mock.service.test.ts）

在实现 `calculateCreditScore()` 之前，先写出所有业务规则的验收断言：

```typescript
// 准入边界：monthly_salary = 10000 不准入（严格大于）
it('UT-001-01: 工资=10000 不准入', async () => {
  await setupUser('UT001', { userLevel: 1, balance: 0, ss: 0, salary: 10000 })
  const r = await calculateCreditScore('UT001')
  expect(r.admitFlag).toBe('0')
  expect(r.creditLimit).toBe('0.00')
})

// 准入边界：monthly_salary = 10001 准入
it('UT-001-03: 工资=10001 准入', async () => {
  await setupUser('UT003', { userLevel: 1, balance: 1, ss: 1, salary: 10001 })
  const r = await calculateCreditScore('UT003')
  expect(r.admitFlag).toBe('1')
})

// 系数 2.3：资产 > 0
it('UT-002-01: 资产>0 系数2.3，额度=460000.00', async () => {
  await setupUser('UT201', { userLevel: 1, balance: 10000, ss: 1, salary: 20000 })
  const r = await calculateCreditScore('UT201')
  // 1 × (10000/1000) × 20000 × 2.3 = 460000.00
  expect(r.creditLimit).toBe('460000.00')
})

// 额度归零：负资产
it('UT-002-03: 资产<0 系数0.5，额度归零', async () => {
  await setupUser('UT203', { userLevel: 3, balance: -5000, ss: 1, salary: 20000 })
  const r = await calculateCreditScore('UT203')
  expect(r.creditLimit).toBe('0.00')
})
```

这些测试在实现前全部是红色（Red），推动实现精确的业务逻辑。

### 3.2 关键实现（src/server/modules/mock/mock.service.ts）

```typescript
export async function calculateCreditScore(userId: string): Promise<ScoreResult> {
  const [userInfo, balance, ss, salary] = await Promise.all([...])

  const admitted = salary > 10000 && ss === 1
  if (!admitted) return { admitFlag: '0', creditLimit: '0.00', resultCode: '0000' }

  const coefficient = balance > 0 ? 2.3 : 0.5
  let creditLimit = userLevel * (balance / 1000) * salary * coefficient
  creditLimit = Math.max(0, creditLimit)

  return { admitFlag: '1', creditLimit: creditLimit.toFixed(2), resultCode: '0000' }
}
```

### 3.3 验证通过（Green）

所有断言通过，确保实现与规格严格对齐。

---

## 四、典型 TDD 案例：测试用例生命周期

### 4.1 先定义状态机的边界条件

```typescript
// 只有 DRAFT 可以提交
it('非 DRAFT 状态不能 submit', async () => {
  const tc = await createTestCase({ status: 'PENDING_REVIEW' })
  await expect(submitForReview(tc.id)).rejects.toThrow()
})

// APPROVED 才能晋级 BASELINE
it('只有 APPROVED 可以 baseline', async () => {
  const tc = await createTestCase({ status: 'DRAFT' })
  await expect(baselineTestCase(tc.id)).rejects.toThrow()
})

// 修改 BASELINE 用例产生新版本
it('修改 BASELINE 用例产生 version+1 的新 DRAFT', async () => {
  const tc = await createAndBaselineTestCase()
  const updated = await updateTestCase(tc.id, { title: '修改后的标题' })
  expect(updated.version).toBe(tc.version + 1)
  expect(updated.status).toBe('DRAFT')
  // 旧版本保留
  const old = await getTestCase(tc.id)
  expect(old.status).toBe('BASELINE')
})
```

### 4.2 先定义缺陷状态流转约束

```typescript
// CLOSED 是终态，不可再流转
it('CLOSED 缺陷不能再改状态', async () => {
  const defect = await createAndCloseDefect()
  await expect(updateDefect(defect.id, { status: 'OPEN' })).rejects.toThrow()
})

// AI 分析结果写入数据库
it('AI 分析后 aiAnalysis 字段不为空', async () => {
  const defect = await createDefect()
  await analyzeDefectWithAI(defect.id)
  const updated = await getDefect(defect.id)
  expect(updated.aiAnalysis).toBeTruthy()
  expect(updated.aiAnalysis!.length).toBeGreaterThan(0)
})
```

---

## 五、典型 TDD 案例：四种测试模式

### 5.1 验收标准先行

在实现四种模式之前，先定义每种模式的可验证约束：

| 模式 | 必须包含 | 必须不包含 |
|------|---------|----------|
| regression | "REGRESSION MODE"、"FORBIDDEN"、"NEVER generate" | 任何生成指令 |
| systematic | "SYSTEMATIC MODE"、"BVA"、"NEVER use random values" | 随机 ID 生成 |
| exploratory | "EXPLORATORY MODE"、"Hypothesis-Driven" | 固定用例清单 |
| chaos | "CHAOS"、"localhost:8000"、"localhost:8001" | 单系统运行 |

### 5.2 实现完成后立即执行多轮测试

不是等"感觉差不多"再测，而是**每次功能完成后立刻进入测试阶段**，通过多个维度系统验证：

1. 静态代码审计（链路完整性、Prompt 关键词）
2. TypeScript 编译（tsc --noEmit）
3. Zod Schema 验证（合法/非法 mode 值）
4. System Prompt 单元测试（关键词/约束/路径插值）
5. HTTP API 端到端测试（curl + JWT）
6. 前端代码深度审计（UI 绑定、数据流）
7. 边界/异常场景分析

### 5.3 测试发现并修复 P0 缺陷

测试发现服务器运行旧版 schema（BUG-004），四种模式 API 完全不可用。如果没有系统性测试，这个问题可能在生产中才暴露。

---

## 六、TDD 节奏

```
编写功能需求（用户故事 / 验收标准）
          ↓
写测试/定义验收条件（明确"完成"的标准）
          ↓
实现功能代码
          ↓
运行测试（L1 类型检查 → L2 单元 → L3 接口 → L4 验收）
          ↓
修复失败 → 再运行 → 全部通过
          ↓
记录测试结果，更新文档（验收报告 / 详细设计）
```

本项目的每个主要功能模块都遵循这个节奏。

---

## 七、测试文件组织

```
TestPilot/
├── test/
│   ├── mock/
│   │   ├── mock.service.test.ts    # 业务逻辑单元测试（L2）— 32 个用例
│   │   ├── mock.routes.test.ts     # HTTP 接口测试（L3）
│   │   └── helpers.ts              # setupUser / cleanupUser 辅助函数
│   ├── testcase/
│   │   └── testcase.service.test.ts # 用例生命周期+版本控制（L2）— 15 个用例
│   ├── defect/
│   │   └── defect.service.test.ts   # 缺陷状态流转+AI分析（L2）— 12 个用例
│   └── tools/
│       └── test-runner.test.ts      # 工具层文件格式验证（L2）
├── docs/
│   ├── 02-产品设计文档.md           # 用户故事和验收标准
│   ├── 04-概要设计文档.md           # 架构和 API 规格
│   ├── 05-详细设计文档.md           # 状态机和算法设计
│   └── 06-测试验收报告.md           # 验收测试结果（每轮更新）
```

---

## 八、运行测试

```bash
# 单次运行所有测试
PATH="/usr/local/Cellar/node/25.8.1_1/bin:$PATH" npm test

# 监听模式（开发中推荐）
PATH="/usr/local/Cellar/node/25.8.1_1/bin:$PATH" npm run test:watch

# TypeScript 类型检查（L1 验证）
PATH="/usr/local/Cellar/node/25.8.1_1/bin:$PATH" npx tsc --noEmit
```

---

## 九、关键原则

1. **测试是规格，不是附属品**：每个功能的测试用例就是它的机器可验证规格说明
2. **P0 必须当场修复**：发现阻断级缺陷（如 BUG-004 进程未重启）立即修复，不积压
3. **多维度验证**：一个功能从类型检查、Schema 验证、单元测试到 HTTP 端到端，至少经过 3 个层次验证
4. **状态机必须穷举边界**：有限状态机（用例生命周期、缺陷状态）的非法状态转换必须有对应测试
5. **LLM 功能必须有静态约束**：AI 生成的内容（Prompt 输出、测试用例格式、根因分析结果）必须有关键词检查，不能只依赖人眼 Review
6. **测试结果文档化**：每轮测试的结论保存到验收报告，形成可追溯的质量记录
