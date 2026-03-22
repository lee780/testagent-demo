# CLAUDE.md — TestPilot 测试领航

本文件为 Claude Code 在此仓库工作时的上下文指南。

---

## 项目概述

**TestPilot（测试领航）** 是一个 AI 驱动的接口自动化测试平台。用户在聊天界面描述测试需求，后端 AI Agent 自动生成测试用例、执行测试、生成报告，输出文件通过下载面板提供给用户。

---

## 架构总览

```
前端 (Vue3, :3000)  ──HTTP/SSE──▶  后端 (Fastify, :8000)
                                       ├── auth/         # JWT 认证
                                       ├── chat/         # SSE 流式对话
                                       ├── conversation/ # 对话持久化
                                       ├── testcase/     # 用例库生命周期
                                       ├── report/       # 测试报告管理
                                       ├── defect/       # 缺陷跟踪
                                       └── mock/         # 被测 Mock 系统

后端  ──runTestAgent()──▶  agent-core/runner.ts
                               └── pi-mono SDK (Anthropic/OpenAI)
                                   ├── tools/        # 测试工具集
                                   └── orchestrator/ # 多 Worker 协调
```

---

## 目录结构

```
TestAgent-PI-main/
├── src/
│   ├── server/              # Fastify 后端
│   │   ├── app.ts           # 应用入口，注册插件和路由
│   │   ├── index.ts         # 启动入口，初始化 DB/Redis
│   │   ├── config/          # env 配置、DB、Redis、Logger
│   │   ├── modules/
│   │   │   ├── auth/        # 注册/登录/JWT/Session
│   │   │   ├── chat/        # SSE 流、文件上传下载、中断
│   │   │   ├── conversation/# 对话和消息 CRUD
│   │   │   ├── mock/        # Mock 业务系统（被测对象）
│   │   │   ├── report/      # 测试报告 CRUD、用例入库
│   │   │   ├── defect/      # 缺陷 CRUD、状态流转、评论
│   │   │   └── plan/        # 执行计划管理
│   │   └── plugins/         # CORS、限流、错误处理、认证中间件
│   ├── agent-core/          # AI Agent 核心
│   │   ├── runner.ts        # Agent 执行入口（pi-mono SDK）
│   │   ├── system-prompt.ts # 系统提示词（按测试模式动态生成）
│   │   ├── workspace.ts     # 工作区目录管理
│   │   ├── subscribe.ts     # pi-mono 事件 → SSE 事件桥接
│   │   ├── tools/           # 自定义工具（测试生成、执行、输出文件等）
│   │   └── orchestrator/    # 多任务协调器
│   └── mock-buggy/          # 有 Bug 的 Mock 服务（用于测试验证）
├── frontend/                # Vue 3 前端
│   └── src/
│       ├── App.vue          # 根组件（侧边栏布局）
│       ├── views/ChatView.vue # 主聊天界面
│       ├── stores/          # Pinia 状态（chat.js / user.js / theme.js）
│       ├── views/           # ChatView、TestCasesView、TestCaseDetailView
│       │                    # ReportsView、ReportDetailView
│       │                    # DefectsView、DefectDetailView
│       ├── components/      # FileDownloadPanel、ToolCallCard、MarkdownViewer 等
│       └── api/             # Axios HTTP 客户端
├── prisma/                  # 数据库 Schema（PostgreSQL）
├── test/                    # Vitest 测试
├── .testagent/workspace/    # Agent 运行时工作区（scratch、outputs、sessions）
└── storage/                 # 用户上传文件
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3.5 + Vite + Pinia + Element Plus + Axios |
| 后端 | Fastify 5 + TypeScript + tsx |
| 数据库 | PostgreSQL 16 + Prisma ORM |
| 缓存/Session | Redis 6+ (ioredis) |
| 认证 | JWT (jsonwebtoken) + bcryptjs + Redis Session |
| AI Agent | pi-mono SDK (@mariozechner/pi-ai) + Anthropic/OpenAI |
| 测试 | Vitest |

---

## 开发环境启动

### 前置条件
- Node.js 22+（路径：`/usr/local/Cellar/node/25.8.1_1/bin/`）
- PostgreSQL（`:5432`，DB：`testagent`）
- Redis（`:6379`）

### 启动命令

```bash
# 后端（根目录，端口 8000）
PATH="/usr/local/Cellar/node/25.8.1_1/bin:$PATH" npm run dev

# 前端（frontend/ 目录，端口 3000）
cd frontend && PATH="/usr/local/Cellar/node/25.8.1_1/bin:$PATH" npm run dev
```

> **重要**：系统 PATH 中没有 npm/node，必须显式指定路径 `/usr/local/Cellar/node/25.8.1_1/bin`。

### 检查服务状态
```bash
curl -s http://localhost:8000/health    # 后端
lsof -iTCP:3000 -sTCP:LISTEN -P        # 前端 Vite
lsof -iTCP:8000 -sTCP:LISTEN -P        # 后端 Fastify
```

### 数据库操作
```bash
npm run prisma:push      # 同步 schema 到数据库（开发）
npm run prisma:migrate   # 创建并运行迁移
npm run prisma:generate  # 重新生成 Prisma Client
```

---

## 环境变量（.env）

```env
PORT=8000
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/testagent?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<随机字符串，生产环境必须更换>

LLM_PROVIDER=openai           # anthropic | openai | intranet
LLM_MODEL_NAME=qwen3.5-35b-a3b
LLM_API_KEY=<API Key>
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1  # OpenAI 兼容接口

STORAGE_ROOT=./storage
WORKSPACE_DIR=.testagent/workspace
AGENT_OUTPUT_DIR=.testagent/workspace/outputs
```

---

## 关键代码路径

### SSE 流式对话完整链路
```
前端 ChatView.vue
  └── fetch POST /api/chat/stream
      └── chat.routes.ts → chatService.sendMessageStreaming()
          └── agent-core/runner.ts → runTestAgent()
              └── pi-mono SDK → onEvent() 回调
                  └── AsyncQueue → SSE events
                      └── 前端 SSEParser → 渲染
```

### 认证中间件
- `src/server/plugins/auth.ts` — `authenticate()` 验证 JWT + Redis Session
- **注**：`if (sessionData)` 条件曾导致注销后 token 仍有效（BUG-001），已在 v2.0 测试中验证修复

### Agent 工作区隔离
- `src/agent-core/workspace.ts` — `getScratchDir(conversationId)` 按对话 ID 隔离工作目录
- 每个对话的输出文件路径：
```
{AGENT_OUTPUT_DIR}/{userId}/{conversationId}/
├── {ModelId}_测试用例.html    # 测试用例 HTML
├── {ModelId}_测试报告.html    # 测试报告 HTML
└── test_cases_raw.json        # 原始用例 JSON（用于手动入库）
```

### 测试报告自动创建
- `run_test_suite` 执行完成后，自动在 DB 创建 `TestReport` 记录（无需用户手动保存）
- 报告名称格式：`{suiteName} [模式中文名] MM-DD`，例如 `信用评分接口测试 [系统化] 03-22`
- `executionResults`（每条用例执行结果）和 `testCasesData`（原始用例 YAML）直接存入 DB
- `casesImported` 初始为 `false`，用户在报告详情页手动确认入库后变为 `true`

### 文件下载/预览
- 下载接口：`GET /api/conversations/:id/outputs/:filename`
- 服务端固定返回 `Content-Type: application/octet-stream`
- 前端预览 HTML：需用 `new Blob([html], { type: 'text/html' })` 重建 MIME 类型再 `window.open`

---

## 主要 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册（密码 ≥8 位，用户名字母开头） |
| POST | `/auth/login` | 登录，返回 JWT |
| POST | `/auth/logout` | 注销（无需 body，不要加 Content-Type: application/json）|
| GET | `/auth/me` | 当前用户信息 |
| PUT | `/auth/password` | 修改密码 |
| POST | `/api/chat/stream` | SSE 流式对话 |
| POST | `/api/chat/interrupt` | 中断 Agent |
| POST | `/api/chat/upload` | 上传文件到对话 |
| GET | `/api/conversations` | 对话列表 |
| PUT | `/api/conversations/:id` | 更新对话标题 |
| GET | `/api/conversations/:id/uploads` | 列出用户上传的业务文档（从磁盘读，重启安全） |
| GET | `/api/conversations/:id/outputs` | 列出 Agent 产出文件 |
| GET | `/api/conversations/:id/outputs/:filename` | 下载文件 |
| POST | `/api/reports` | 手动保存报告（Agent 执行完成后自动创建，此接口用于补录） |
| GET | `/api/reports` | 报告列表（支持 `mode` 过滤、分页） |
| GET | `/api/reports/:id` | 报告详情（含 executionResults、testCasesData、testCases） |
| PUT | `/api/reports/:id` | 更新报告名称/关联文档 |
| DELETE | `/api/reports/:id` | 删除报告（自动 null 关联的 TestCase.reportId 和 Defect.reportId） |
| GET | `/api/reports/:id/html` | 获取 HTML 内容 |
| POST | `/api/reports/:id/import` | 确认用例入库（body 可选 `{ caseIds: string[] }` 用于部分入库） |
| GET | `/api/defects` | 缺陷列表（支持 status/severity/reportId 过滤、分页） |
| GET | `/api/defects/stats` | 缺陷全局统计（按 status/severity 分组，不受分页限制） |
| POST | `/api/defects` | 创建缺陷 |
| GET | `/api/defects/:id` | 缺陷详情（含评论） |
| PATCH | `/api/defects/:id/status` | 更新缺陷状态（待处理/处理中/已解决/已关闭/不修复） |
| POST | `/api/defects/:id/comments` | 添加评论 |

---

## 数据库 Schema 要点

```prisma
model User {
  role   UserRole   // USER | ADMIN
  status UserStatus // ACTIVE | INACTIVE | BANNED
}

model Conversation {
  userId    String
  title     String
  messages  Message[]
}

model Message {
  role     String  // user | assistant
  content  String
  metadata Json?   // { events: [...] } 保存流式事件用于回放
}
```

测试报告表：`TestReport`（name, conversationId, htmlFile, testCasesData, casesImported）
缺陷表：`Defect`（title, status, severity, reportId?, testCaseId?）+ `DefectComment`

Mock 业务表（被测系统数据）：`MockUserInfo`、`MockAccountBalance`、`MockSocialSecurity`、`MockSalarySummary`

---

## 测试模式

Agent 支持 4 种测试模式（通过 `mode` 参数传入）：

| 模式 | 说明 |
|------|------|
| `systematic` | 系统化模式：BVA/等价类算法，首次建设用例库 |
| `regression` | 回归模式：运行基线用例，结果可复现 |
| `exploratory` | 探索模式：LLM 自由探索，挖掘非常规缺陷 |
| `chaos` | 混沌/对比模式：双系统同时运行，自动识别差异 |

---

## 已知 Bug

| 编号 | 严重度 | 描述 | 状态 |
|------|-------|------|------|
| BUG-001 | 高危 | 注销后 Token 仍有效（`auth.ts` `if (sessionData)` 跳过 JTI 校验） | **已修复**（v2.0 测试验证） |
| BUG-002 | 高危 | 修改密码后旧 Token 是否仍有效 — 同上根因，未专项测试 | 待验证 |
| BUG-003 | 中 | 注销接口携带空 JSON body 返回 500 | **已修复**（v2.0 测试验证） |

## 可靠性与安全加固（v2.3）

- **SSE 启动检查**：若 `SSE_HEARTBEAT_INTERVAL_MS ≥ SSE_IDLE_TIMEOUT_MS`，服务启动时抛出异常（fail-fast）
- **路径安全**：文件下载接口改用 `path.relative()` 检测路径穿越，替代 `startsWith()` 判断
- **消息历史限制**：对话消息加载上限 200 条（原 1000 条），防止大型对话内存溢出
- **复合索引**：`Conversation` 表新增 `@@index([userId, updatedAt])` 支持高效排序查询
- **入库事务**：`importTestCases()` 每条用例包裹在 `prisma.$transaction()` 中，group+case+latestId 原子完成

---

## 开发注意事项

- **前端热更新**：Vite HMR 自动生效，改 `.vue` 文件后刷新浏览器即可，一般不需重启
- **后端热更新**：`tsx` 不支持热重载路由变更，改 `.ts` 文件后需重启后端进程
- **输出文件格式**：Agent 输出文件应为 HTML（用户要求），便于下载面板预览
- **并发对话**：后端已按 `conversationId` 隔离工作目录，支持并发；前端单 Tab 共享 `loading` 状态，真正并发需多标签页
- **用户创建**：注册 API 密码最少 8 位；创建测试用户（如 `admin/admin`）需直接写库并 bcrypt hash 密码

---

## 运行测试

```bash
npm test             # 单次运行
npm run test:watch   # 监听模式
```

测试文件位于 `test/`，使用 Vitest。

---

## 代码风格

- 后端：TypeScript，严格类型，Zod 做入参校验
- 前端：JavaScript（无 TS），Vue 3 Composition API，`<script setup>`
- 错误处理：自定义错误类（`ValidationError`、`UnauthorizedError`、`ConflictError`、`ForbiddenError`）
- 日志：pino logger，通过 `getLogger()` 获取
