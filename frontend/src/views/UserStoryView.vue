<template>
  <div class="story-page">

    <!-- ── 导航锚点 ── -->
    <nav class="story-nav">
      <a href="#value" class="story-nav-link" @click.prevent="scrollTo('value')">领导价值</a>
      <a href="#userstory" class="story-nav-link" @click.prevent="scrollTo('userstory')">用户故事</a>
      <a href="#roadmap" class="story-nav-link" @click.prevent="scrollTo('roadmap')">下一步计划</a>
      <a href="#arch" class="story-nav-link" @click.prevent="scrollTo('arch')">测试架构组网图</a>
    </nav>

    <!-- ══════════════════════════════════════════
         第一屏：领导视角 · 价值主张
    ══════════════════════════════════════════ -->
    <section id="value" class="section section-hero">
      <div class="section-inner">
        <div class="hero-badge">TestPilot 测试领航 · v2.5</div>
        <h1 class="hero-title">让 1 个人做到<br><span class="highlight">原本需要整个测试团队</span>才能完成的事</h1>
        <p class="hero-sub">AI 驱动的接口测试平台 · 从对话到知识库，全程智能驾驶</p>

        <div class="value-cards">
          <div class="value-card">
            <div class="value-icon">⚡</div>
            <div class="value-metric">分钟级</div>
            <div class="value-label">覆盖全量边界场景的测试用例</div>
            <div class="value-desc">从上传业务规范到产出完整测试报告，原本需要测试工程师耗费数天的工作，现在一段对话即可完成。</div>
          </div>
          <div class="value-card">
            <div class="value-icon">🧠</div>
            <div class="value-metric">越用越聪明</div>
            <div class="value-label">知识持续沉淀，不依赖个人经验</div>
            <div class="value-desc">每次测试结果写入知识库：业务规则、挡板场景、测试规范……团队经验不再藏在个人脑子里，离职不带走。</div>
          </div>
          <div class="value-card">
            <div class="value-icon">🔍</div>
            <div class="value-metric">全链路可追溯</div>
            <div class="value-label">质量有据可查，汇报有理有据</div>
            <div class="value-desc">从业务规范文档 → 测试对话 → 执行报告 → 入库用例 → 关联缺陷，每一步都有完整记录，随时可以向上汇报。</div>
          </div>
        </div>

        <div class="comparison-bar">
          <div class="compare-item old">
            <div class="compare-label">传统方式</div>
            <div class="compare-points">
              <span>📄 手工阅读需求文档</span>
              <span>✍️ 逐条编写测试用例</span>
              <span>🖱️ 人工调用接口验证</span>
              <span>💾 结果散落在个人电脑</span>
              <span>🔁 换人重新来一遍</span>
            </div>
          </div>
          <div class="compare-arrow">→</div>
          <div class="compare-item new">
            <div class="compare-label">TestPilot</div>
            <div class="compare-points">
              <span>💬 一段对话描述测试需求</span>
              <span>🤖 AI 自动生成 + 执行 + 报告</span>
              <span>📚 结果自动写入团队知识库</span>
              <span>🎯 AI 推荐下次回归的用例</span>
              <span>♾️ 每次测试让系统更聪明</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         第二屏：用户故事（连贯工作流）
    ══════════════════════════════════════════ -->
    <section id="userstory" class="section section-userstory">
      <div class="section-inner">
        <h2 class="section-title">用户故事</h2>
        <p class="section-sub">从接到一个新接口，到建立可持续运转的质量体系——一个测试工程师的完整旅程</p>

        <div class="journey">

          <div class="journey-step">
            <div class="journey-step-header">
              <div class="journey-badge">场景一</div>
              <div class="journey-title">我有一个新接口，想快速出一套测试用例</div>
            </div>
            <div class="journey-body">
              <div class="journey-steps">
                <div class="jstep"><span class="jstep-dot"></span><span>把业务规范文档上传到「知识库 → 业务规则库」，绑定接口模型编号</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>打开聊天，选「系统化」模式，输入一句话：<em>"请对授信额度接口做全量系统化测试"</em></span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>Agent 自动读取业务规则、运用边界值分析生成用例、调接口执行、产出 HTML 报告，全程实时可见</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>进报告详情页，看完结果，点「用例入库」——用例以草稿状态写入用例库，等待审核</span></div>
              </div>
            </div>
          </div>

          <div class="journey-connector">
            <div class="journey-connector-line"></div>
            <div class="journey-connector-label">用例进入审核流程</div>
          </div>

          <div class="journey-step">
            <div class="journey-step-header">
              <div class="journey-badge">场景二</div>
              <div class="journey-title">用例写完了，怎么过审、固化为基线</div>
            </div>
            <div class="journey-body">
              <div class="journey-steps">
                <div class="jstep"><span class="jstep-dot"></span><span>在用例库找到草稿用例，点「提交审核」</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>审核人逐条查看，批准则变「已审批」，不合格打回并附意见，修改后重新提交</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>审批通过后，技术负责人点「晋级基线」，这条用例正式锁定</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>基线用例不能直接修改——后续要改，必须新建版本，老版本完整保留，历史可追溯</span></div>
              </div>
            </div>
          </div>

          <div class="journey-connector">
            <div class="journey-connector-line"></div>
            <div class="journey-connector-label">几周后，接口规则有变更</div>
          </div>

          <div class="journey-step">
            <div class="journey-step-header">
              <div class="journey-badge">场景三</div>
              <div class="journey-title">接口规则改了，我该跑哪些用例</div>
            </div>
            <div class="journey-body">
              <div class="journey-steps">
                <div class="jstep"><span class="jstep-dot"></span><span>进用例库，点「AI 回归推荐」，输入这次改动描述：<em>"月收入判断阈值从 10000 调整为 12000"</em></span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>大模型结合用例的覆盖点、历史报告、来源对话语义推理，按相关度排序，每条附推荐理由</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>勾选相关用例，切换「回归」模式发起测试，出回归验证报告</span></div>
              </div>
            </div>
          </div>

          <div class="journey-connector">
            <div class="journey-connector-line"></div>
            <div class="journey-connector-label">回归发现失败用例</div>
          </div>

          <div class="journey-step">
            <div class="journey-step-header">
              <div class="journey-badge">场景四</div>
              <div class="journey-title">测试发现 Bug，怎么记录和追溯</div>
            </div>
            <div class="journey-body">
              <div class="journey-steps">
                <div class="jstep"><span class="jstep-dot"></span><span>在报告里找到失败用例，点「创建缺陷」——执行日志自动带入，无需手填</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>缺陷详情可以一路向上追：缺陷 → 执行用例 → 测试报告 → 当时的对话 → 上传的业务文档</span></div>
                <div class="jstep"><span class="jstep-dot"></span><span>缺陷按状态流转：待处理 → 处理中 → 已解决，评论区随时跟进进展</span></div>
              </div>
              <div class="journey-result">整个流程走完，从接口接入到发现 Bug 全程有迹可查，下一轮迭代直接复用基线用例库</div>
            </div>
          </div>

          <div class="journey-connector">
            <div class="journey-connector-line"></div>
            <div class="journey-connector-label">其他常用场景</div>
          </div>

          <div class="journey-extras">
            <div class="extra-card">
              <div class="extra-header">
                <div class="journey-badge">探索模式</div>
                <div class="journey-title">怀疑接口有隐藏 Bug，想主动挖掘</div>
              </div>
              <div class="extra-desc">选「探索」模式，告诉 AI 怀疑方向（如 <em>"重点探查浮点数精度边界"</em>），Agent 以假设驱动方式自由设计非常规测试组合，主动寻找系统弱点，找到问题直接创建缺陷关联执行日志。</div>
            </div>
            <div class="extra-card">
              <div class="extra-header">
                <div class="journey-badge">知识库</div>
                <div class="journey-title">团队要统一测试标准，不想每次重复说明</div>
              </div>
              <div class="extra-desc">在「知识库」预置业务规范文档、测试规范（如"expected 必须给出精确数值"）和外部挡板场景（如"黑名单用户"）。之后任何人发起对话只需填写模型 ID，以上内容自动注入，经验固化为系统资产。</div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         第三屏：下一步战略计划
    ══════════════════════════════════════════ -->
    <section id="roadmap" class="section section-roadmap">
      <div class="section-inner">
        <h2 class="section-title">下一步计划</h2>
        <p class="section-sub">从 AI 测试助手，到研发体系的质量护城河</p>

        <div class="roadmap-vision">
          <div class="vision-text">
            <p>当前这个平台，是一个<strong>起点</strong>，而不是终点。</p>
            <p>它证明了一件事：<strong>AI 可以承担专业测试工程师的核心工作</strong>。下一步，我们要做的不是把它当工具用，而是把它建成一个<strong>虚拟的测试团队</strong>——这个团队不会离职、不会遗忘、每次测试都在变得更强。</p>
          </div>
        </div>

        <div class="phases">

          <div class="phase current">
            <div class="phase-tag">NOW · 当前阶段</div>
            <div class="phase-title">🛠️ AI 测试助手</div>
            <div class="phase-sub">单人可驾驭，效率大幅提升</div>
            <ul class="phase-items">
              <li>四种测试模式：系统化 / 回归 / 探索 / 混沌</li>
              <li>测试用例全生命周期管理（草稿 → 基线）</li>
              <li>AI 回归推荐 + 知识库沉淀</li>
              <li>测试报告 + 缺陷管理全闭环</li>
            </ul>
            <div class="phase-value">1 人的产出，超过过去整个团队手工测试的覆盖深度</div>
          </div>

          <div class="phase-arrow">→</div>

          <div class="phase next">
            <div class="phase-tag">NEXT · 近期目标</div>
            <div class="phase-title">👥 虚拟测试团队</div>
            <div class="phase-sub">知识共享，协作攻克复杂系统</div>
            <ul class="phase-items">
              <li>多模型、多接口的知识库体系，覆盖核心业务系统</li>
              <li>测试规范标准化，新人开箱即用</li>
              <li>AI 主动发现回归风险，而不是被动等待触发</li>
              <li>与研发流程对接：需求变更 → 自动推荐测试策略</li>
            </ul>
            <div class="phase-value">让每一次业务迭代，都有 AI 全程陪同质量把关</div>
          </div>

          <div class="phase-arrow">→</div>

          <div class="phase future">
            <div class="phase-tag">FUTURE · 战略目标</div>
            <div class="phase-title">🏰 研发质量护城河</div>
            <div class="phase-sub">AI 自主巡检，融入整个研发体系</div>
            <ul class="phase-items">
              <li>接入 CI/CD：每次代码合并自动触发精准回归</li>
              <li>AI 持续巡检生产接口，异常自动预警</li>
              <li>历史测试数据驱动质量趋势分析和风险预测</li>
              <li>成为研发、产品、测试共用的质量协作中台</li>
            </ul>
            <div class="phase-value">质量保证从"事后补救"变为"事前防控"，构建系统性竞争优势</div>
          </div>

        </div>

        <div class="roadmap-cta">
          <div class="cta-title">我们需要什么来实现这个目标？</div>
          <div class="cta-items">
            <div class="cta-item">
              <div class="cta-icon">🤝</div>
              <div class="cta-label">跨团队协作</div>
              <div class="cta-desc">与开发、产品团队共建知识库，让平台覆盖更多核心业务模型</div>
            </div>
            <div class="cta-item">
              <div class="cta-icon">📐</div>
              <div class="cta-label">规范共识</div>
              <div class="cta-desc">制定统一的测试规范和用例质量标准，让 AI 的产出对齐团队期望</div>
            </div>
            <div class="cta-item">
              <div class="cta-icon">🔗</div>
              <div class="cta-label">流程集成</div>
              <div class="cta-desc">将 AI 测试能力接入日常研发流程，让质量保证成为迭代的标配而非负担</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════
         第四屏：测试架构组网图
    ══════════════════════════════════════════ -->
    <section id="arch" class="section section-arch">
      <div class="section-inner section-inner-wide">
        <h2 class="section-title">08 — 测试架构组网图</h2>
        <p class="section-sub">授信 C 系统 · 挡板 · 测试 Agent · 数据库 · 真实外部渠道的部署位置、网络关系与调用流向</p>

        <div class="arch-block">
          <h3 class="arch-h3">1. 整体架构图</h3>
          <div class="mermaid-wrap" ref="el1"></div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">2. 测试流程时序图</h3>
          <div class="mermaid-wrap" ref="el2"></div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">3. 两类场景触发路径</h3>
          <div class="mermaid-wrap" ref="el3"></div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">4. 真实环境 vs 测试环境对比</h3>
          <div class="mermaid-wrap" ref="el4"></div>
          <p class="arch-note">切换点：C 系统配置文件中 <code>STUB_SERVER_URL</code> 指向挡板地址，<strong>C 系统代码零修改</strong>。</p>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">5. 部署位置一览</h3>
          <table class="arch-table">
            <thead><tr><th>组件</th><th>网络位置</th><th>端口</th></tr></thead>
            <tbody>
              <tr><td>测试 Agent</td><td>内网</td><td>—</td></tr>
              <tr><td>授信 C 系统</td><td>内网</td><td>8000</td></tr>
              <tr><td>本地数据库（PostgreSQL）</td><td>内网</td><td>5432</td></tr>
              <tr><td>挡板系统（Mock Server）</td><td>内网</td><td>8002</td></tr>
              <tr class="row-danger"><td>真实外部三方接口</td><td>外网</td><td>— （测试环境不可达）</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const el1 = ref(null)
const el2 = ref(null)
const el3 = ref(null)
const el4 = ref(null)

const DIAGRAMS = [
  {
    el: el1,
    code: `graph TB
    subgraph INTERNET ["🌐 外网（测试环境不可达）"]
        ALI["支付宝\\n真实接口"]
        WX["微信\\n真实接口"]
        GJJ["公积金\\n真实接口"]
        RE["房产\\n真实接口"]
    end
    subgraph INTRANET ["🔒 测试环境（内网隔离）"]
        direction TB
        AGENT["🤖 测试 Agent\\n────────────\\n· 生成测试用例\\n· 写入测试前置数据\\n· 发起被测请求\\n· 比对测试结果"]
        subgraph C_SYS ["授信 C 系统（被测对象）"]
            direction TB
            ENTRY["入口\\nPOST /credit/score"]
            STEP_A["Step A\\n查本地数据库\\n历史流水 / 沉淀指标 / 已有标签"]
            STEP_B["Step B\\n外呼第三方系统\\n支付宝 / 微信 / 公积金 / 房产"]
            STEP_C["Step C\\n汇总指标 → 规则计算\\n输出准入标志 + 信用额度"]
            ENTRY --> STEP_A --> STEP_C
            ENTRY --> STEP_B --> STEP_C
        end
        DB[("🗄️ 本地数据库\\nPostgreSQL\\n────────────\\n用户基础信息\\n近3月平均余额\\n社保缴纳状态\\n月收入流水")]
        STUB["🧱 挡板系统\\nMock Server\\n────────────\\n任意路径可注册\\n返回体完全可配置"]
    end
    AGENT -- "① 发起测试请求" --> ENTRY
    AGENT -- "② 写入本地指标\\nPOST /mock/setup" --> DB
    AGENT -- "③ 配置挡板返回值\\nPOST /_admin/routes" --> STUB
    STEP_A -- "④ 读取本地指标" --> DB
    STEP_B -- "⑤ 外呼（挡板拦截）" --> STUB
    STUB -. "❌ 测试环境不可达" .-> ALI
    STUB -. "❌ 测试环境不可达" .-> WX
    STUB -. "❌ 测试环境不可达" .-> GJJ
    STUB -. "❌ 测试环境不可达" .-> RE
    style INTERNET fill:#ffeaea,stroke:#e74c3c,color:#333
    style INTRANET fill:#eaf4ff,stroke:#2980b9,color:#333
    style C_SYS fill:#fff9e6,stroke:#f39c12,color:#333
    style AGENT fill:#e8f8e8,stroke:#27ae60
    style DB fill:#f0eaff,stroke:#8e44ad
    style STUB fill:#fff0e0,stroke:#e67e22`
  },
  {
    el: el2,
    code: `sequenceDiagram
    participant A as 🤖 测试 Agent
    participant C as 授信 C 系统
    participant DB as 🗄️ 本地数据库
    participant S as 🧱 挡板系统
    Note over A,S: 阶段一：准备测试前置条件
    A->>DB: ② 写入本地指标（月薪、余额、社保等）
    A->>S: ③ 配置挡板返回值（支付宝特征、公积金缴存等）
    Note over A,S: 阶段二：发起测试请求
    A->>C: ① POST /credit/score { userId }
    activate C
    C->>DB: ④ 查本地沉淀指标
    DB-->>C: 返回历史流水、余额、社保状态
    C->>S: ⑤ 外呼支付宝（挡板拦截）
    S-->>C: 返回配置好的支付宝特征
    C->>S: ⑤ 外呼公积金（挡板拦截）
    S-->>C: 返回配置好的公积金数据
    C->>C: 汇总本地指标 + 外呼指标，按规则计算 → 准入 + 额度
    C-->>A: 返回 { admit_flag, credit_limit }
    deactivate C
    Note over A,S: 阶段三：结果比对
    A->>A: 实际结果 vs 预期结果，判断用例通过 / 失败`
  },
  {
    el: el3,
    code: `flowchart LR
    subgraph SA ["场景 A：触发本地分支"]
        direction TB
        A1["Agent 写入\\n本地指标\\n月薪 / 余额 / 社保"] --> B1["C系统\\nStep A 读 DB\\n拿到不同值"] --> C1["命中不同\\n准入分支\\n或额度档位"]
    end
    subgraph SB ["场景 B：触发外呼分支"]
        direction TB
        A2["Agent 配置\\n挡板返回值\\n支付宝 / 公积金 / 房产"] --> B2["C系统\\nStep B 外呼\\n挡板返回不同数据"] --> C2["命中不同\\n外部特征分支"]
    end
    style SA fill:#e8f8e8,stroke:#27ae60
    style SB fill:#fff0e0,stroke:#e67e22`
  },
  {
    el: el4,
    code: `flowchart LR
    subgraph PROD ["生产环境"]
        direction LR
        C_PROD["授信 C 系统"] -- "HTTPS" --> EXT["api.alipay.com\\n公积金中心\\n房产局接口"]
    end
    subgraph TEST ["测试环境"]
        direction LR
        C_TEST["授信 C 系统\\n（代码不变）"] -- "HTTP\\n仅改 STUB_SERVER_URL" --> STUB_T["挡板系统\\n:8002\\n返回值可控"]
    end
    style PROD fill:#ffeaea,stroke:#e74c3c
    style TEST fill:#eaf4ff,stroke:#2980b9`
  },
]

async function renderMermaid() {
  const mermaid = (await import('mermaid')).default
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
  for (const [i, d] of DIAGRAMS.entries()) {
    if (!d.el.value) continue
    try {
      const id = `mermaid-diagram-${i}`
      const { svg } = await mermaid.render(id, d.code)
      d.el.value.innerHTML = svg
    } catch (e) {
      d.el.value.innerHTML = `<pre style="color:red;font-size:12px">${e.message}</pre>`
    }
  }
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(renderMermaid)
</script>

<style scoped>
/* ── 基础布局 ── */
.story-page {
  height: 100%;
  overflow-y: auto;
  background: var(--main-bg);
  color: var(--text-primary);
}

/* ── 导航锚点 ── */
.story-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 0;
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding: 0 32px;
}
.story-nav-link {
  padding: 12px 20px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.story-nav-link:hover {
  color: #5b9bd5;
  border-bottom-color: #5b9bd5;
}

/* ── 通用 section ── */
.section { padding: 60px 0; }
.section-inner { max-width: 900px; margin: 0 auto; padding: 0 32px; }
.section-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; color: var(--text-primary); }
.section-sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 36px; }

/* ── 第一屏：Hero ── */
.section-hero { background: linear-gradient(160deg, var(--sidebar-bg) 0%, var(--main-bg) 100%); }
.hero-badge { display: inline-block; background: rgba(91,155,213,0.12); color: #5b9bd5; border: 1px solid rgba(91,155,213,0.3); border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 500; margin-bottom: 20px; }
.hero-title { font-size: 32px; font-weight: 800; line-height: 1.3; margin: 0 0 14px; color: var(--text-primary); }
.hero-title .highlight { color: #5b9bd5; }
.hero-sub { font-size: 15px; color: var(--text-secondary); margin: 0 0 40px; }

/* ── 价值卡片 ── */
.value-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
.value-card { background: var(--sidebar-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 10px; padding: 24px 20px; }
.value-icon { font-size: 24px; margin-bottom: 10px; }
.value-metric { font-size: 20px; font-weight: 800; color: #5b9bd5; margin-bottom: 4px; }
.value-label { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
.value-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.7; }

/* ── 对比栏 ── */
.comparison-bar { display: flex; gap: 16px; align-items: stretch; background: var(--sidebar-bg); border-radius: 10px; padding: 24px; border: 1px solid var(--border-color, #e8e8e8); }
.compare-item { flex: 1; }
.compare-item.old .compare-label { color: #999; font-size: 12px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.compare-item.new .compare-label { color: #5b9bd5; font-size: 12px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.compare-points { display: flex; flex-direction: column; gap: 8px; }
.compare-points span { font-size: 13px; color: var(--text-secondary); }
.compare-item.new .compare-points span { color: var(--text-primary); }
.compare-arrow { font-size: 24px; color: #5b9bd5; display: flex; align-items: center; padding: 0 8px; }

/* ── 用户故事（连贯流程）── */
.section-userstory { background: var(--sidebar-bg); }

.journey { display: flex; flex-direction: column; }

.journey-step { background: var(--main-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 10px; padding: 24px 28px; }
.journey-step-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.journey-badge { background: rgba(91,155,213,0.12); color: #5b9bd5; border: 1px solid rgba(91,155,213,0.25); border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.journey-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }

.journey-body { padding-left: 4px; }
.journey-steps { display: flex; flex-direction: column; gap: 10px; }
.jstep { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; color: var(--text-primary); line-height: 1.7; }
.jstep-dot { width: 7px; height: 7px; border-radius: 50%; background: #5b9bd5; flex-shrink: 0; margin-top: 7px; }
.jstep em { color: #5b9bd5; font-style: normal; background: rgba(91,155,213,0.08); padding: 1px 6px; border-radius: 4px; font-size: 12px; }

.journey-result { margin-top: 16px; font-size: 13px; font-weight: 500; color: #2e7d32; background: rgba(46,125,50,0.06); border-left: 3px solid #2e7d32; padding: 8px 14px; border-radius: 0 4px 4px 0; }

.journey-connector { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 0; }
.journey-connector-line { width: 2px; height: 24px; background: linear-gradient(to bottom, rgba(91,155,213,0.3), rgba(91,155,213,0.6)); }
.journey-connector-label { font-size: 11px; color: var(--text-secondary); background: var(--sidebar-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 20px; padding: 2px 12px; }

/* ── 其他场景补充卡片 ── */
.journey-extras { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.extra-card { background: var(--main-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 10px; padding: 20px 22px; }
.extra-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.extra-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
.extra-desc em { color: #5b9bd5; font-style: normal; background: rgba(91,155,213,0.08); padding: 1px 6px; border-radius: 4px; font-size: 12px; }

/* ── 第三屏：Roadmap ── */
.section-roadmap { background: var(--sidebar-bg); }
.roadmap-vision { background: linear-gradient(135deg, rgba(91,155,213,0.08), rgba(91,155,213,0.03)); border: 1px solid rgba(91,155,213,0.2); border-radius: 10px; padding: 24px 28px; margin-bottom: 36px; }
.vision-text p { font-size: 14px; color: var(--text-primary); line-height: 1.8; margin: 0 0 8px; }
.vision-text p:last-child { margin: 0; }
.vision-text strong { color: #5b9bd5; }

.phases { display: flex; gap: 0; align-items: stretch; margin-bottom: 40px; }
.phase { flex: 1; border: 1px solid var(--border-color, #e8e8e8); border-radius: 10px; padding: 24px 20px; background: var(--main-bg); }
.phase.current { border-color: #5b9bd5; border-width: 2px; }
.phase.next { border-color: #e8e8e8; margin: 0 -1px; z-index: 1; }
.phase.future { border-color: rgba(123,31,162,0.3); }
.phase-arrow { display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 20px; padding: 0 8px; flex-shrink: 0; }
.phase-tag { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #aaa; margin-bottom: 10px; }
.phase.current .phase-tag { color: #5b9bd5; }
.phase.future .phase-tag { color: #7b1fa2; }
.phase-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.phase-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
.phase-items { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
.phase-items li { font-size: 12px; color: var(--text-secondary); padding-left: 14px; position: relative; line-height: 1.5; }
.phase-items li::before { content: '·'; position: absolute; left: 0; color: #5b9bd5; font-weight: 700; }
.phase-value { font-size: 12px; font-weight: 600; color: var(--text-primary); background: var(--sidebar-bg); border-radius: 6px; padding: 8px 12px; line-height: 1.5; }

/* ── CTA ── */
.roadmap-cta { border-top: 1px solid var(--border-color, #e8e8e8); padding-top: 32px; }
.cta-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.cta-items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.cta-item { text-align: center; }
.cta-icon { font-size: 28px; margin-bottom: 8px; }
.cta-label { font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.cta-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

/* ── 第四屏：架构组网图 ── */
.section-arch { background: var(--main-bg); }
.section-inner-wide { max-width: 1000px; }

.arch-block {
  margin-bottom: 40px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
}
.arch-h3 {
  font-size: 14px; font-weight: 700;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  margin: 0; color: var(--text-primary);
  background: var(--el-fill-color-light, #f5f7fa);
}
.mermaid-wrap {
  padding: 24px 20px;
  overflow-x: auto;
  text-align: center;
}
.mermaid-wrap svg { max-width: 100%; height: auto; }

.arch-note {
  padding: 10px 20px 16px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0;
}
.arch-note code {
  background: var(--el-fill-color, #f5f5f5);
  padding: 1px 6px; border-radius: 3px;
  font-family: monospace; font-size: 12px;
}

.arch-table {
  width: calc(100% - 40px); margin: 16px 20px;
  border-collapse: collapse; font-size: 13px;
}
.arch-table th, .arch-table td {
  padding: 9px 14px; text-align: left;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
}
.arch-table th {
  background: var(--el-fill-color-light, #f5f7fa);
  font-weight: 600; color: var(--text-primary);
}
.arch-table td { color: var(--text-secondary); }
.arch-table .row-danger td { color: #c0392b; }

/* ── 响应式兜底 ── */
@media (max-width: 700px) {
  .value-cards, .cta-items, .journey-extras { grid-template-columns: 1fr; }
  .phases { flex-direction: column; }
  .phase-arrow { transform: rotate(90deg); }
  .hero-title { font-size: 22px; }
  .comparison-bar { flex-direction: column; }
}
</style>
