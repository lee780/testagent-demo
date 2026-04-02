<template>
  <div class="story-page">

    <!-- ── 标签导航 ── -->
    <nav class="story-nav">
      <a class="story-nav-link" :class="{ active: activeTab === 'strategy-report' }" @click.prevent="switchTab('strategy-report')">战略汇报</a>
      <a class="story-nav-link" :class="{ active: activeTab === 'project-report' }" @click.prevent="switchTab('project-report')">AI专项汇报</a>
      <a class="story-nav-link" :class="{ active: activeTab === 'arch' }" @click.prevent="switchTab('arch')">测试架构组网图</a>
      <a class="story-nav-link" :class="{ active: activeTab === 'modes' }" @click.prevent="switchTab('modes')">测试模式说明</a>
      <a class="story-nav-link" :class="{ active: activeTab === 'roadmap' }" @click.prevent="switchTab('roadmap')">下一步计划</a>
    </nav>

    <!-- ── 标签内容容器 ── -->
    <div class="tab-content">

    <!-- ══════════════════════════════════════════
         下一步计划
    ══════════════════════════════════════════ -->
    <section v-show="activeTab === 'roadmap'" id="roadmap" class="section section-roadmap">
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
              <li>两种测试模式：系统化 / 探索</li>
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
    <section v-show="activeTab === 'arch'" id="arch" class="section section-arch">
      <div class="section-inner section-inner-wide">
        <h2 class="section-title">08 — 测试架构组网图</h2>
        <p class="section-sub">TestPilot 测试平台 · 授信C系统 · 挡板 · 各自数据库 · 真实外部渠道的部署位置、网络关系与调用流向</p>

        <div class="arch-block">
          <h3 class="arch-h3">1. 整体架构图</h3>
          <div class="mermaid-wrap" ref="el1"></div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">2a. 场景 A — 生产正常场景（用户发起）</h3>
          <div class="mermaid-wrap" ref="elSceneA"></div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">2b. 场景 B — TestPilot 测试场景（Agent 接管，挡板替换外呼）</h3>
          <div class="mermaid-wrap" ref="elSceneB"></div>
          <p class="arch-note">★ 标注三处关键变化。<strong>授信C系统代码、接口、内部逻辑全程不变</strong>，TestPilot 仅替换"输入来源"。</p>
          <div style="padding: 0 20px 20px">
            <table class="arch-table" style="margin: 0; width: 100%">
              <thead>
                <tr><th>维度</th><th>场景 A（生产）</th><th>场景 B（TestPilot 测试）</th><th></th></tr>
              </thead>
              <tbody>
                <tr style="background:#fff7ed"><td>发起方</td><td>真实用户</td><td>TestPilot Agent</td><td><span style="color:#dc2626;font-weight:700">★ 变了</span></td></tr>
                <tr style="background:#fff7ed"><td>Step A 数据来源</td><td>客户真实历史数据</td><td>Agent 提前写入的测试数据</td><td><span style="color:#dc2626;font-weight:700">★ 变了</span></td></tr>
                <tr style="background:#fff7ed"><td>Step B 外呼目标</td><td>真实外部系统（外网）</td><td>TestPilot 挡板（内网，可控）</td><td><span style="color:#dc2626;font-weight:700">★ 变了</span></td></tr>
                <tr style="background:#f0fdf4"><td>授信C系统接口</td><td>POST /credit/score</td><td>POST /credit/score</td><td><span style="color:#059669;font-weight:700">不变</span></td></tr>
                <tr style="background:#f0fdf4"><td>授信C系统代码</td><td>原始代码</td><td>原始代码（零修改）</td><td><span style="color:#059669;font-weight:700">不变</span></td></tr>
                <tr style="background:#f0fdf4"><td>Step A / B / C 逻辑</td><td>原始业务规则</td><td>原始业务规则</td><td><span style="color:#059669;font-weight:700">不变</span></td></tr>
              </tbody>
            </table>
            <p class="arch-note" style="padding: 12px 0 0; margin: 0">
              💡 <strong>一句话总结：</strong>TestPilot 把「不可控的真实世界」替换成「完全可控的测试环境」，授信C系统本身感知不到任何差异。
            </p>
          </div>
        </div>

        <div class="arch-block">
          <h3 class="arch-h3">3. 部署位置一览</h3>
          <table class="arch-table">
            <thead><tr><th>组件</th><th>所属系统</th><th>网络位置</th><th>端口</th></tr></thead>
            <tbody>
              <tr><td>TestPilot 后端（含内置 mock）</td><td>TestPilot</td><td>内网</td><td>8000</td></tr>
              <tr><td>TestPilot DB（PostgreSQL）</td><td>TestPilot</td><td>内网</td><td>5432</td></tr>
              <tr><td>TestPilot 挡板系统</td><td>TestPilot</td><td>内网</td><td>8002</td></tr>
              <tr><td>授信C系统</td><td>授信C系统</td><td>内网</td><td>由被测方配置（独立部署）</td></tr>
              <tr><td>授信C系统 DB（MySQL）</td><td>授信C系统</td><td>内网</td><td>3306</td></tr>
              <tr class="row-danger"><td>真实外部三方接口</td><td>外网</td><td>外网</td><td>— （测试环境不可达）</td></tr>
            </tbody>
          </table>
          <p class="arch-note">
            <strong>两个系统，各自职责：</strong><br>
            · <strong>TestPilot</strong>：测试平台，包含后端服务（:8000）、TestPilot DB（PostgreSQL :5432）、挡板系统（:8002）三个组件。后端内置 mock 模块（路径 <code>/mock</code>）用于开发自测，模拟授信C系统行为。<br>
            · <strong>授信C系统</strong>：被测系统，独立部署，有自己的业务逻辑和 MySQL 数据库。测试时把 <code>STUB_SERVER_URL</code> 指向 TestPilot 挡板（:8002），<strong>代码零修改</strong>。
          </p>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════
         测试模式说明
    ══════════════════════════════════════════ -->
    <section v-show="activeTab === 'modes'" id="modes" class="section section-modes">
      <div class="section-inner">
        <h2 class="section-title">测试模式说明</h2>
        <p class="section-sub">TestPilot 支持两种测试模式，适用于不同阶段和目标</p>

        <!-- 对比表 -->
        <div class="modes-compare">
          <table class="arch-table modes-table">
            <thead>
              <tr>
                <th>维度</th>
                <th>📐 系统化模式</th>
                <th>🔭 探索模式</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>核心目标</td>
                <td>完整覆盖已知业务规则</td>
                <td>发现常规测试遗漏的隐藏缺陷</td>
              </tr>
              <tr>
                <td>用例来源</td>
                <td>BVA 边界值 + 等价类算法驱动，确定性生成</td>
                <td>LLM 假设驱动，自由设计非常规组合</td>
              </tr>
              <tr>
                <td>适用测试阶段</td>
                <td>SIT 首次建库、版本迭代前的基线覆盖</td>
                <td>任意阶段，重点针对可疑薄弱区域</td>
              </tr>
              <tr>
                <td>结果可重复性</td>
                <td>高——相同规则文档产出相同用例</td>
                <td>低——每次 LLM 自由探索，结果各异</td>
              </tr>
              <tr>
                <td>典型使用者</td>
                <td>建立用例库的测试工程师</td>
                <td>深度挖掘缺陷的资深测试 / QA</td>
              </tr>
              <tr>
                <td>产出形态</td>
                <td>标准化 YAML 用例，可入库、可复用</td>
                <td>探索性 YAML 用例，侧重记录发现思路</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 详细卡片 -->
        <div class="modes-cards">
          <div class="mode-detail-card systematic-card">
            <div class="mode-detail-header">
              <span class="mode-detail-icon">📐</span>
              <div>
                <div class="mode-detail-title">系统化模式</div>
                <div class="mode-detail-sub">算法驱动 · 全量覆盖 · 可重复</div>
              </div>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">应用场景</div>
              <ul class="mode-detail-list">
                <li>接口上线前，首次建立完整测试基线用例库</li>
                <li>业务规则文档变更后，重新生成覆盖新规则的用例</li>
                <li>SIT 验收阶段，需要向上汇报测试覆盖度</li>
              </ul>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">测试阶段</div>
              <p class="mode-detail-text">SIT（系统集成测试）阶段最常用。首次运行产出标准用例库，后续每轮迭代可直接复用基线用例做回归验证。</p>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">内部工具调用顺序</div>
              <div class="tool-call-flow">
                <div class="tool-call-step">
                  <span class="tool-call-num">1</span>
                  <div><strong>report_progress</strong> — 通知用户"分析文档"阶段开始</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">2</span>
                  <div><strong>read</strong> — 读取用户上传的业务规则文档，提取规则条目</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">3</span>
                  <div><strong>calculate_value</strong> — 对每条边界值/等价类预期结果进行精确数学计算，避免手工填错</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">4</span>
                  <div><strong>write</strong> — 将用例写入标准 YAML 文件（保存至 tc_systematic/ 目录）</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">5</span>
                  <div><strong>run_test_suite</strong> — 读取全部 YAML，自动写入前置数据、发起请求、断言结果、保存报告</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">6</span>
                  <div><strong>save_summary_report</strong> — 将执行摘要写入报告的「测试汇报」Tab</div>
                </div>
              </div>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">具体示例</div>
              <div class="mode-example">
                <div class="example-input">
                  <span class="example-tag">用户输入</span>
                  <em>"请对授信额度接口 MODEL001 做全量系统化测试，重点覆盖月收入边界和系数档位"</em>
                </div>
                <div class="example-steps">
                  <div>Agent 读取知识库中 MODEL001 的业务规则文档，识别出 3 个准入条件边界、3 个系数档位</div>
                  <div>调用 calculate_value 计算 6 个边界值用例的精确 credit_limit（如 2×(1500/1000)×15000×2.3 = 103500.00）</div>
                  <div>生成 24 条 YAML 用例，覆盖所有分支组合</div>
                  <div>run_test_suite 自动执行，全部通过 → 报告保存，通过率 100%</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mode-detail-card exploratory-card">
            <div class="mode-detail-header">
              <span class="mode-detail-icon">🔭</span>
              <div>
                <div class="mode-detail-title">探索模式</div>
                <div class="mode-detail-sub">假设驱动 · 自由探索 · 挖掘隐藏 Bug</div>
              </div>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">应用场景</div>
              <ul class="mode-detail-list">
                <li>怀疑某个功能区域存在隐藏缺陷，想主动挖掘</li>
                <li>多个业务规则交叉叠加时，系统化模式难以穷举的组合场景</li>
                <li>上线前的高风险区域深度探查（浮点精度、极端边界、并发副作用等）</li>
              </ul>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">测试阶段</div>
              <p class="mode-detail-text">任意阶段均可使用。系统化用例跑完后，切换探索模式针对可疑点深挖，是最常见的组合用法。也适合在 UAT 前对关键业务路径做最后一轮安全网测试。</p>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">内部工具调用顺序</div>
              <div class="tool-call-flow">
                <div class="tool-call-step">
                  <span class="tool-call-num">1</span>
                  <div><strong>report_progress</strong> — 通知用户"分析假设方向"阶段开始</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">2</span>
                  <div><strong>read</strong>（可选）— 读取已有系统化报告，了解哪些场景已覆盖，聚焦空白区</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">3</span>
                  <div><strong>calculate_value</strong> — 对每个探索性假设的预期结果进行精确计算</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">4</span>
                  <div><strong>write</strong> — 将探索用例写入 YAML（保存至 tc_exploratory/ 目录），每条用例含 hypothesis 字段说明探索意图</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">5</span>
                  <div><strong>run_test_suite</strong> — 执行探索用例，对失败用例自动记录至报告</div>
                </div>
                <div class="tool-call-step">
                  <span class="tool-call-num">6</span>
                  <div><strong>save_summary_report</strong> — 汇总探索发现，归纳缺陷规律</div>
                </div>
              </div>
            </div>

            <div class="mode-detail-section">
              <div class="mode-detail-label">具体示例</div>
              <div class="mode-example">
                <div class="example-input">
                  <span class="example-tag">用户输入</span>
                  <em>"重点探查授信额度接口在浮点数余额边界附近的精度问题，怀疑有四舍五入缺陷"</em>
                </div>
                <div class="example-steps">
                  <div>Agent 理解假设方向：浮点精度 → 设计 avg_3m_balance 在 999.999、1000.001、1000.005 等边界值附近的测试组合</div>
                  <div>调用 calculate_value 精确计算预期 credit_limit（避免测试本身计算错误掩盖真实 Bug）</div>
                  <div>生成 8 条非常规探索用例，覆盖四舍五入临界点</div>
                  <div>执行发现：avg_3m_balance=999.995 时系统返回错误系数档位 → 确认缺陷，创建 Defect 记录</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════
         AI专项汇报
    ══════════════════════════════════════════ -->
    <section v-show="activeTab === 'project-report'" id="project-report" class="section section-project-report">
      <div class="section-inner">
        <h2 class="section-title">AI 测试专项落地汇报</h2>
        <p class="section-sub">专项：准入系统 AI 接口测试专项 · 填报时间：2026-03-25 · 负责团队：测试质量保障组</p>

        <!-- 价值主张（来自领导价值页） -->
        <div class="value-intro-block">
          <div class="hero-badge" style="margin-bottom:16px">TestPilot 测试领航 · v2.5</div>
          <h3 class="report-h3" style="margin-bottom:12px">让 1 个人做到原本需要整个测试团队才能完成的事</h3>
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
          <div class="data-charts" style="margin-top:20px">
            <div class="chart-card">
              <div class="chart-title">单轮测试耗时对比</div>
              <div class="bar-chart">
                <div class="bar-row">
                  <div class="bar-label">传统方式</div>
                  <div class="bar-track"><div class="bar-fill bar-old" style="width:100%"><span class="bar-val">12 人天</span></div></div>
                </div>
                <div class="bar-row">
                  <div class="bar-label">TestPilot</div>
                  <div class="bar-track"><div class="bar-fill bar-new" style="width:0.7%"><span class="bar-val bar-val-new">1 小时</span></div></div>
                </div>
              </div>
              <div class="chart-note">效率提升 <strong>99%+</strong></div>
            </div>
            <div class="chart-card">
              <div class="chart-title">用例覆盖量对比</div>
              <div class="bar-chart">
                <div class="bar-row">
                  <div class="bar-label">传统方式</div>
                  <div class="bar-track"><div class="bar-fill bar-old" style="width:25%"><span class="bar-val">~50 条</span></div></div>
                </div>
                <div class="bar-row">
                  <div class="bar-label">TestPilot</div>
                  <div class="bar-track"><div class="bar-fill bar-new" style="width:100%"><span class="bar-val">200+ 条</span></div></div>
                </div>
              </div>
              <div class="chart-note">覆盖量提升 <strong>3 倍+</strong></div>
            </div>
            <div class="chart-card">
              <div class="chart-title">人力释放比例</div>
              <div class="donut-wrap">
                <svg viewBox="0 0 100 100" class="donut-svg">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-color,#e8e8e8)" stroke-width="16"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#5b9bd5" stroke-width="16"
                    stroke-dasharray="239 0" stroke-dashoffset="60" stroke-linecap="round"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e74c3c" stroke-width="16"
                    stroke-dasharray="24 215" stroke-dashoffset="-179" stroke-linecap="round"/>
                </svg>
                <div class="donut-center"><span class="donut-pct">90%</span><span class="donut-sub">释放</span></div>
              </div>
              <div class="donut-legend">
                <span class="legend-dot" style="background:#5b9bd5"></span>AI 接管 90%
                <span class="legend-dot" style="background:#e74c3c;margin-left:12px"></span>人工保留 10%
              </div>
            </div>
          </div>
          <div class="comparison-bar" style="margin-top:20px">
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

        <div class="report-block">
          <h3 class="report-h3">场景命题</h3>
          <p class="report-p">准入系统规则复杂、分支多，SIT 阶段每次手工梳理场景、逐条执行用例至少半天，规则组合多、容易漏测，版本迭代越快压力越大。</p>
          <p class="report-p">本专项聚焦<strong>接口级动态测试验证</strong>，区别于静态代码扫描，也不是端到端业务流测试——核心是针对准入各接口，由 AI 自动构造请求、实际调用、验证返回结果是否符合规则预期，在 SIT 阶段快速发现接口逻辑与规则不符的问题，让测试团队把精力集中在更高层次的业务验证上。</p>
        </div>

        <div class="report-block">
          <h3 class="report-h3">场景归属</h3>
          <p class="report-p">测试能力价值提升。隶属测试质量保障线，嵌入准入系统项目测试组，3 名测试工程师兼职推进，不新增编制。</p>
        </div>

        <div class="report-block">
          <h3 class="report-h3">实施步骤及时间点</h3>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-tag">第一阶段 04/01–04/30</div>
              <div class="timeline-title">把工具跑起来</div>
              <ul class="report-list">
                <li>协调开发搭建准入系统专用测试环境，去掉安全加密限制，让工具能直接调用接口</li>
                <li>打通测试机器与准入系统、数据库之间的网络连接</li>
                <li>协调开发明确外部交易请求的地址配置方式</li>
                <li>开发模拟外部系统响应的挡板服务，避免真实外部依赖干扰测试结果</li>
                <li>在云端完成 TestAgent 平台和挡板服务的部署上线</li>
              </ul>
              <div class="timeline-delivery">阶段交付：测试环境就绪，TestAgent 可正常调用准入系统接口</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-tag">第二阶段 05/01–05/31</div>
              <div class="timeline-title">跑通试点，把工具调准</div>
              <p class="report-p">挑几笔典型业务作为试点，整理对应的业务规则文档；人工同步写一套对照测试案例；让 TestAgent 跑同一批场景，把 AI 结果和人工结果逐一对比，找出差距针对性调优，顺带把准入系统的规则知识库搭起来。</p>
              <div class="timeline-delivery">阶段交付：试点验证报告（AI vs 人工对比）+ 工具调优完成 + 规则知识库初版</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-tag">第三阶段 06/01–06/30</div>
              <div class="timeline-title">正式参与 SIT 验收 <span class="timeline-note">（准入系统本月底投产）</span></div>
              <p class="report-p">工具调准后正式接入准入系统投产前的 SIT 验收，AI 替代人工完成接口场景验证并出具测试报告，针对发现的问题复盘改进，确保投产质量。</p>
              <div class="timeline-delivery">阶段交付：首份正式 AI SIT 验收测试报告 + 问题复盘记录</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-tag">第四阶段 07/01–07/31</div>
              <div class="timeline-title">稳定运行，总结收尾</div>
              <p class="report-p">准入系统投产后，持续用 TestAgent 跟进迭代版本的验收测试，记录实际提效数据；同步整理全程积累的规则知识库和测试模板，输出一份可供其他模块参考的样板总结报告。</p>
              <div class="timeline-delivery">阶段交付：多轮版本验收报告 + 实际提效数据 + 样板间总结报告</div>
            </div>
          </div>
        </div>

        <div class="report-block">
          <h3 class="report-h3">核心目标</h3>
          <ol class="report-list report-list-ordered">
            <li>将 TestAgent 工具落地准入系统 SIT 流程，实现 AI 辅助验收测试常态化运行</li>
            <li>大幅压缩每轮 SIT 验收测试耗时，降低高频迭代下的漏测风险，释放测试人力</li>
            <li>沉淀准入系统专属测试知识资产，解决经验依赖个人、随人员变动流失的问题</li>
          </ol>
        </div>

        <div class="report-block">
          <h3 class="report-h3">量化目标</h3>
          <p class="report-p">以下为针对<strong>单份业务规则文档</strong>（含对应接口测试场景），在 SIT 验收测试环节中，人工 vs AI 模式的全流程耗时对比：</p>
          <table class="arch-table" style="margin: 16px 0; width: 100%">
            <thead>
              <tr><th>环节</th><th>当前人工耗时</th><th>AI 模式耗时</th><th>提效幅度</th></tr>
            </thead>
            <tbody>
              <tr><td>业务场景设计</td><td>1 人天</td><td>约 5 分钟</td><td>99%+</td></tr>
              <tr><td>自动化脚本编写（一次性）</td><td>5 人天</td><td>接近于零</td><td>—</td></tr>
              <tr><td>脚本持久化改造（可复用）</td><td>5 人天</td><td>20 分钟以内</td><td>99%+</td></tr>
              <tr><td>测试执行 + 报告出具</td><td>1 人天</td><td>20 分钟以内</td><td>99%+</td></tr>
              <tr style="font-weight:700;background:rgba(91,155,213,0.08)"><td>全流程合计</td><td>约 12 人天</td><td>1 小时以内</td><td>99%+</td></tr>
              <tr><td>用例覆盖量</td><td>约 50 条</td><td>200 条以上</td><td>覆盖量提升 3 倍+</td></tr>
            </tbody>
          </table>
        </div>

        <div class="report-block">
          <h3 class="report-h3">资源需求</h3>
          <ul class="report-list">
            <li><strong>大模型 API</strong>：接入通义千问（QWEN3.5+480B 及以上）</li>
            <li><strong>测试环境</strong>：需准入系统独立自动化测试环境 + 接口及 Mock 权限</li>
          </ul>
        </div>

        <div class="report-block">
          <h3 class="report-h3">落地潜在风险</h3>
          <table class="arch-table" style="width: 100%">
            <thead><tr><th>风险</th><th>应对措施</th></tr></thead>
            <tbody>
              <tr><td>准入规则复杂，AI 理解不准确</td><td>初期设人工评审卡点，发现偏差及时补充规则知识库，逐步提升准确率</td></tr>
              <tr><td>上游业务规则文档不完整或不准确，影响工具有效性</td><td>明确规则文档输入标准，在第 1 个月对接阶段与业务方确认文档质量，以文档质量作为推进前提</td></tr>
              <tr><td>需要独立自动化测试环境，环境建设存在不确定性</td><td>第 1 个月首要任务打通环境，环境未就绪则不推进后续步骤，提前纳入项目整体排期跟进</td></tr>
              <tr><td>前期工具适配、版本联调阶段需要开发人员重点配合</td><td>提前与开发团队对齐配合计划，明确关键节点所需支持事项，纳入迭代排期</td></tr>
            </tbody>
          </table>
        </div>

        <div class="report-block">
          <h3 class="report-h3">预期成效</h3>
          <div class="outcome-cards">
            <div class="outcome-card">
              <div class="outcome-tag">短期（5 个月内）</div>
              <p>准入系统 AI 辅助验收测试样板落地，在 SIT 验收环节中，针对单份业务规则文档的测试工作从约 12 人天压缩到 1 小时以内；用例覆盖量从约 5 条提升至约 30 条；测试经验沉淀在平台，不随人员变动流失。</p>
            </div>
            <div class="outcome-card">
              <div class="outcome-tag">中期（项目结束后）</div>
              <p>准入模块 AI 测试流程成熟稳定，形成可直接复用的方法论与知识库模板，为后续其他模块推广 AI 测试打下基础。</p>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════
         战略汇报
    ══════════════════════════════════════════ -->
    <section v-show="activeTab === 'strategy-report'" id="strategy-report" class="section section-strategy-report">
      <div class="section-inner">
        <h2 class="section-title">AI 测试工具项目汇报</h2>
        <p class="section-sub">汇报日期：2026 年 3 月 30 日</p>

        <!-- 一 -->
        <div class="strategy-block highlight-block">
          <h3 class="strategy-h3">一、这件事对深圳公司意味着什么</h3>
          <p class="report-p">这不是一个测试工具项目，这是一个<strong>让深圳公司在集团内率先建立 AI 工程化优势的机会</strong>。</p>
          <p class="report-p">深圳公司如果在未来 4 个月内完成 TestAgent 的规模化落地，将在集团层面形成清晰的领先优势：</p>
          <ul class="report-list">
            <li>深圳公司成为集团 <strong>AI 应用 No.1</strong>，可复制的方法论由我们输出</li>
            <li>在 AI 战略落地上拥有<strong>可量化的业绩成果</strong>，向上汇报有底气、有数据</li>
          </ul>
        </div>

        <!-- 二 -->
        <div class="strategy-block">
          <h3 class="strategy-h3">二、规模化应用后，深圳公司能领先到什么程度</h3>

          <div class="advantage-grid">
            <div class="advantage-card">
              <div class="advantage-label">降本端</div>
              <ul class="report-list">
                <li>每个测试工程师释放 90%+ 的重复性工作量</li>
                <li>同等人力，产出是其他公司的数倍</li>
                <li>不需要扩编，现有团队即可承接更大的业务体量</li>
              </ul>
            </div>
            <div class="advantage-card">
              <div class="advantage-label">增效端</div>
              <ul class="report-list">
                <li>每次业务迭代，AI 自动推荐回归范围，测试不再是交付瓶颈</li>
                <li>测试报告、缺陷追踪完整留档，质量数据随时可查、随时可汇报</li>
                <li>知识库持续积累，新人上手快、老人离职不带走经验</li>
              </ul>
            </div>
          </div>

          <p class="report-p" style="padding: 0 20px; margin-top: 16px; font-weight: 600;">用数据说话</p>
          <table class="arch-table" style="width: calc(100% - 40px); margin: 8px 20px 0">
            <thead><tr><th>维度</th><th>兄弟公司（传统方式）</th><th>深圳公司（TestAgent）</th></tr></thead>
            <tbody>
              <tr><td>单轮测试耗时</td><td>约 <strong>12 人天</strong></td><td style="color:#059669;font-weight:700">1 小时以内</td></tr>
              <tr><td>用例覆盖量</td><td>约 50 条，人工编写</td><td style="color:#059669;font-weight:700">200+ 条，AI 生成，覆盖更全</td></tr>
              <tr><td>经验沉淀</td><td>靠个人记忆，人走经验走</td><td style="color:#059669;font-weight:700">持续写入知识库，团队永久共有</td></tr>
              <tr><td>下次复用</td><td>每次重新设计，重复劳动</td><td style="color:#059669;font-weight:700">基线用例直接复用，越用越快</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 三 -->
        <div class="strategy-block">
          <h3 class="strategy-h3">三、落地路线：4 个月，成为集团标杆</h3>

          <div class="gantt-wrap">
            <div class="gantt-row">
              <div class="gantt-phase" style="width:56px;line-height:1.3;text-align:right">
                <div>阶段1</div>
                <div style="font-size:10px;font-weight:400;color:var(--text-secondary)">4月30日</div>
              </div>
              <div class="gantt-bar-track"><div class="gantt-bar" style="width:100%;background:rgba(91,155,213,0.25)"><span>环境搭建 · 工具跑通 · 基础验证</span></div></div>
            </div>
            <div class="gantt-row">
              <div class="gantt-phase" style="width:56px;line-height:1.3;text-align:right">
                <div>阶段2</div>
                <div style="font-size:10px;font-weight:400;color:var(--text-secondary)">5月31日</div>
              </div>
              <div class="gantt-bar-track"><div class="gantt-bar" style="width:100%;background:rgba(91,155,213,0.45)"><span>试点业务 · AI vs 人工对比 · 出数据</span></div></div>
            </div>
            <div class="gantt-row">
              <div class="gantt-phase" style="width:56px;line-height:1.3;text-align:right">
                <div>阶段3</div>
                <div style="font-size:10px;font-weight:400;color:var(--text-secondary)">6月30日</div>
              </div>
              <div class="gantt-bar-track"><div class="gantt-bar" style="width:100%;background:rgba(91,155,213,0.65)"><span>正式替代人工 · 业务验收 · AI报告</span></div></div>
            </div>
            <div class="gantt-row">
              <div class="gantt-phase gantt-phase-star" style="width:56px;line-height:1.3;text-align:right">
                <div>阶段4</div>
                <div style="font-size:10px;font-weight:400;color:#5b9bd5">7月31日</div>
              </div>
              <div class="gantt-bar-track"><div class="gantt-bar" style="width:100%;background:#5b9bd5"><span style="color:#fff;font-weight:700">稳定运行 · 方法论输出 · 集团标杆</span></div></div>
            </div>
          </div>
        </div>

        <!-- 四 -->
        <div class="strategy-block">
          <h3 class="strategy-h3">四、需要的支持（4 件事）</h3>

          <div class="support-row">
            <div class="support-item">
              <div>
                <div class="support-title">① 测试环境与接口权限</div>
                <p class="report-p">准入系统独立测试环境支持，开发侧配合提供业务文档与接口对接。</p>
              </div>
            </div>
            <div class="support-item">
              <div>
                <div class="support-title">② AI Token 费用纳入公司报销</div>
                <p class="report-p">工具已运行约两个月，累计费用已达<strong>大几千元</strong>，随推广范围扩大持续增加，申请纳入公司报销。</p>
              </div>
            </div>
          </div>

          <div class="support-row">
            <div class="support-item">
              <div>
                <div class="support-title">③ 成立虚拟专项小组（自有人员，3～4 人，各占 30%～40% 工时）</div>
                <p class="report-p">跨部门协调与推进、知识库建设、工具验收与汇报。</p>
              </div>
            </div>
            <div class="support-item">
              <div>
                <div class="support-title">④ 工具开发与优化（小李开发主力 + 合作公司 4～5 人）</div>
                <p class="report-p">前端界面迭代、后端 / Agent / 提示词核心开发、集成与工具 SIT 测试。</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 五 -->
        <div class="strategy-block highlight-block">
          <h3 class="strategy-h3">五、总结</h3>
          <div class="highlight-quote">
            窗口期就在这 4 个月。各兄弟公司还没行动，我们已有可以落地的工具和方案。<br>
            <strong>这个机会，值得认真推一把。</strong>
          </div>
          <p class="report-p" style="margin-top:8px;font-size:12px;color:var(--text-secondary)">附：工具功能已完整验证，可随时安排 Demo 演示。</p>
        </div>

      </div>
    </section>

    </div><!-- end .tab-content -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const activeTab = ref('strategy-report')

function switchTab(tab) {
  activeTab.value = tab
  // 切换 Tab 后回到顶部
  document.querySelector('.tab-content')?.scrollTo(0, 0)
}

const el1 = ref(null)
const elSceneA = ref(null)
const elSceneB = ref(null)
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
        subgraph TP ["TestPilot（测试平台）"]
            direction TB
            AGENT["🤖 测试 Agent\\n────────────\\n· 生成测试用例\\n· 写入测试前置数据\\n· 发起被测请求\\n· 比对测试结果"]
            TPDB[("🗄️ TestPilot DB\\n────────────\\n对话 / 报告\\n用例 / 缺陷\\n知识库")]
            STUB["🧱 TestPilot 挡板系统\\n────────────\\n归属 TestPilot\\n任意路径可注册\\n返回体完全可配置"]
        end
        subgraph CSYS ["授信C系统"]
            direction TB
            ENTRY["入口\\nPOST /credit/score"]
            STEP_A["Step A\\n查自身数据库\\n历史流水 / 沉淀指标 / 已有标签"]
            STEP_B["Step B\\n外呼第三方系统\\n支付宝 / 微信 / 公积金 / 房产"]
            STEP_C["Step C\\n汇总指标 → 规则计算\\n输出准入标志 + 信用额度"]
            CDB[("🗄️ 授信C系统 DB\\n（MySQL）\\n────────────\\n客户存量数据\\n历史流水\\n已有指标")]
            ENTRY --> STEP_A --> STEP_C
            ENTRY --> STEP_B --> STEP_C
            STEP_A -- "读取" --> CDB
        end
    end
    AGENT -- "① 发起测试请求" --> ENTRY
    AGENT -- "② 写入测试前置数据\\nPOST /mock/setup" --> CDB
    AGENT -- "③ 配置挡板返回值\\nPOST /_admin/routes" --> STUB
    STEP_B -- "④ 外呼（TestPilot 挡板拦截）" --> STUB
    STUB -. "❌ 测试环境不可达" .-> ALI
    STUB -. "❌ 测试环境不可达" .-> WX
    STUB -. "❌ 测试环境不可达" .-> GJJ
    STUB -. "❌ 测试环境不可达" .-> RE
    style INTERNET fill:#ffeaea,stroke:#e74c3c,color:#333
    style INTRANET fill:#eaf4ff,stroke:#2980b9,color:#333
    style TP fill:#e8f8e8,stroke:#27ae60,color:#333
    style CSYS fill:#fff9e6,stroke:#f39c12,color:#333
    style TPDB fill:#d4edda,stroke:#27ae60
    style CDB fill:#f0eaff,stroke:#8e44ad
    style STUB fill:#d4edda,stroke:#27ae60`
  },
  {
    el: elSceneA,
    code: `sequenceDiagram
    actor User as 👤 真实用户
    participant C as 🏦 授信C系统
    participant CDB as 🗄️ C系统DB（MySQL）
    participant EXT as 🌐 真实外部系统

    User->>C: POST /credit/score { userId }
    activate C

    rect rgb(220, 235, 255)
        Note over C,CDB: Step A — 查询自身存量数据
        C->>CDB: 查历史流水 / 余额 / 社保状态 / 用户等级
        CDB-->>C: 返回客户存量数据
    end

    rect rgb(255, 240, 210)
        Note over C,EXT: Step B — 外呼真实三方渠道（需外网）
        C->>EXT: 外呼支付宝 → 获取消费流水特征
        EXT-->>C: 返回支付宝数据
        C->>EXT: 外呼公积金中心 → 获取缴存记录
        EXT-->>C: 返回公积金数据
        C->>EXT: 外呼房产局 → 获取房产登记信息
        EXT-->>C: 返回房产数据
    end

    rect rgb(220, 255, 220)
        Note over C: Step C — 汇总规则计算
        C->>C: 合并 Step A + B 全部指标<br/>→ 准入规则判断 + 信用额度档位计算
    end

    C-->>User: 返回 { admit_flag, credit_limit }
    deactivate C`
  },
  {
    el: elSceneB,
    code: `sequenceDiagram
    participant TP as 🤖 TestPilot Agent
    participant C as 🏦 授信C系统（代码零修改）
    participant CDB as 🗄️ C系统DB（MySQL）
    participant STUB as 🧱 TestPilot 挡板

    rect rgb(230, 255, 230)
        Note over TP,STUB: ① 准备阶段 — TestPilot 构造可控的测试环境
        TP->>CDB: ★ 写入测试前置数据（月薪/余额/社保）
        Note right of CDB: 精准控制 Step A 将读到的值
        TP->>STUB: ★ 配置挡板路由返回值（支付宝/公积金/房产）
        Note right of STUB: 精准控制 Step B 将收到的值
    end

    rect rgb(220, 235, 255)
        Note over TP,STUB: ② 执行阶段 — 与生产场景完全相同的调用路径

        TP->>C: ★ POST /credit/score { userId }
        activate C

        rect rgb(210, 228, 255)
            Note over C,CDB: Step A — 查询存量数据（逻辑同生产）
            C->>CDB: 查历史流水 / 余额 / 社保状态 / 用户等级
            CDB-->>C: 返回预置的存量数据
        end

        rect rgb(255, 238, 200)
            Note over C,STUB: Step B — 外呼三方渠道（被挡板无感拦截）
            C->>STUB: 外呼「支付宝」（STUB_SERVER_URL 指向挡板，C系统无感知）
            STUB-->>C: 返回预配置的支付宝数据
            C->>STUB: 外呼「公积金中心」
            STUB-->>C: 返回预配置的公积金数据
            C->>STUB: 外呼「房产局」
            STUB-->>C: 返回预配置的房产数据
        end

        rect rgb(215, 255, 215)
            Note over C: Step C — 汇总规则计算（逻辑同生产）
            C->>C: 合并 Step A + B 全部指标<br/>→ 准入规则判断 + 信用额度档位计算
        end

        C-->>TP: 返回 { admit_flag, credit_limit }
        deactivate C
    end

    rect rgb(255, 245, 220)
        Note over TP,STUB: ③ 验证阶段
        TP->>TP: 实际结果 vs 预期值<br/>→ 通过 / 失败 → 写入测试报告
    end`
  },
  {
    el: el3,
    code: `flowchart LR
    subgraph SA ["场景 A：触发本地分支"]
        direction TB
        A1["TestPilot Agent\\n写入授信C系统 DB\\n月薪 / 余额 / 社保"] --> B1["授信C系统\\nStep A 读自身DB\\n拿到不同值"] --> C1["命中不同\\n准入分支\\n或额度档位"]
    end
    subgraph SB ["场景 B：触发外呼分支"]
        direction TB
        A2["TestPilot Agent\\n配置挡板返回值\\n支付宝 / 公积金 / 房产"] --> B2["授信C系统\\nStep B 外呼\\nTestPilot 挡板返回不同数据"] --> C2["命中不同\\n外部特征分支"]
    end
    style SA fill:#e8f8e8,stroke:#27ae60
    style SB fill:#e8f8e8,stroke:#27ae60`
  },
  {
    el: el4,
    code: `flowchart LR
    subgraph PROD ["生产环境"]
        direction LR
        C_PROD["授信C系统"] -- "HTTPS" --> EXT["api.alipay.com\\n公积金中心\\n房产局接口"]
    end
    subgraph TEST ["测试环境"]
        direction LR
        C_TEST["授信C系统\\n（代码不变）"] -- "HTTP\\n仅改 STUB_SERVER_URL" --> STUB_T["TestPilot 挡板系统\\n:8002\\n返回值可控"]
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

onMounted(renderMermaid)
</script>

<style scoped>
/* ── 基础布局 ── */
.story-page {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--main-bg);
  color: var(--text-primary);
}

/* ── 标签导航 ── */
.story-nav {
  flex-shrink: 0;
  z-index: 10;
  display: flex;
  gap: 0;
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding: 0 32px;
  overflow-x: auto;
}
.story-nav-link {
  padding: 12px 20px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.story-nav-link:hover {
  color: #5b9bd5;
}
.story-nav-link.active {
  color: #5b9bd5;
  border-bottom-color: #5b9bd5;
  font-weight: 600;
}

/* ── 标签内容容器 ── */
.tab-content {
  flex: 1;
  overflow-y: auto;
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
  .modes-cards { flex-direction: column; }
  .advantage-grid { flex-direction: column; }
  .outcome-cards { flex-direction: column; }
}

/* ── 测试模式说明 ── */
.section-modes { background: var(--sidebar-bg); }

.modes-compare { margin-bottom: 32px; overflow-x: auto; }
.modes-table { width: 100%; }
.modes-table th:nth-child(2) { color: #67c23a; }
.modes-table th:nth-child(3) { color: #e6a23c; }

.modes-cards { display: flex; gap: 20px; align-items: flex-start; }

.mode-detail-card {
  flex: 1;
  background: var(--main-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
}
.systematic-card { border-top: 3px solid #67c23a; }
.exploratory-card { border-top: 3px solid #e6a23c; }

.mode-detail-header {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  background: var(--el-fill-color-light, #f8f9fa);
}
.mode-detail-icon { font-size: 28px; }
.mode-detail-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; }
.mode-detail-sub { font-size: 11px; color: var(--text-secondary); }

.mode-detail-section { padding: 16px 24px; border-bottom: 1px solid var(--border-color, #f0f0f0); }
.mode-detail-section:last-child { border-bottom: none; }
.mode-detail-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); margin-bottom: 10px; }
.mode-detail-text { font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin: 0; }
.mode-detail-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.mode-detail-list li { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

.tool-call-flow { display: flex; flex-direction: column; gap: 8px; }
.tool-call-step { display: flex; gap: 10px; align-items: flex-start; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.tool-call-num { width: 20px; height: 20px; border-radius: 50%; background: rgba(91,155,213,0.15); color: #5b9bd5; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }

.mode-example { background: var(--sidebar-bg); border-radius: 8px; padding: 16px; }
.example-input { margin-bottom: 14px; }
.example-tag { display: inline-block; background: rgba(91,155,213,0.1); color: #5b9bd5; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600; margin-bottom: 6px; }
.example-input em { display: block; font-size: 13px; color: var(--text-primary); font-style: normal; background: rgba(91,155,213,0.06); border-left: 3px solid #5b9bd5; padding: 8px 12px; border-radius: 0 4px 4px 0; }
.example-steps { display: flex; flex-direction: column; gap: 6px; counter-reset: step; }
.example-steps > div { font-size: 12px; color: var(--text-secondary); line-height: 1.6; padding-left: 20px; position: relative; }
.example-steps > div::before { content: counter(step); counter-increment: step; position: absolute; left: 0; top: 1px; font-size: 10px; font-weight: 700; color: #5b9bd5; background: rgba(91,155,213,0.1); width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }

/* ── AI专项汇报 ── */
.section-project-report { background: var(--main-bg); }

.report-block {
  margin-bottom: 32px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
}
.report-h3 {
  font-size: 14px; font-weight: 700;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  margin: 0; color: var(--text-primary);
  background: var(--el-fill-color-light, #f5f7fa);
}
.report-block > .report-p,
.report-block > .report-list,
.report-block > .report-list-ordered,
.report-block > table,
.report-block > .outcome-cards,
.report-block > .timeline { padding: 16px 20px; }
.report-p { font-size: 13px; color: var(--text-secondary); line-height: 1.8; margin: 0 0 10px; }
.report-p:last-child { margin-bottom: 0; }
.report-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
.report-list li { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.report-list-ordered { list-style: decimal; }

.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #f0f0f0); }
.timeline-item:last-child { border-bottom: none; }
.timeline-tag { display: inline-block; background: rgba(91,155,213,0.1); color: #5b9bd5; border-radius: 4px; padding: 2px 10px; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
.timeline-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.timeline-note { font-size: 12px; font-weight: 400; color: var(--text-secondary); }
.timeline-delivery { margin-top: 10px; font-size: 12px; font-weight: 600; color: #2e7d32; background: rgba(46,125,50,0.06); border-left: 3px solid #2e7d32; padding: 6px 12px; border-radius: 0 4px 4px 0; }
.timeline-item .report-p { padding: 0; margin-bottom: 0; }

.outcome-cards { display: flex; gap: 16px; }
.outcome-card { flex: 1; background: var(--main-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 8px; padding: 16px; }
.outcome-tag { font-size: 11px; font-weight: 700; color: #5b9bd5; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.outcome-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin: 0; }

/* ── 战略汇报 ── */
.section-strategy-report { background: var(--sidebar-bg); }

.strategy-block {
  margin-bottom: 24px;
  background: var(--main-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
}
.strategy-block.highlight-block { border-color: rgba(91,155,213,0.3); background: linear-gradient(135deg, rgba(91,155,213,0.04), var(--main-bg)); }
.strategy-h3 {
  font-size: 14px; font-weight: 700;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  margin: 0; color: var(--text-primary);
  background: var(--el-fill-color-light, #f5f7fa);
}
.strategy-block > .report-p,
.strategy-block > .report-list,
.strategy-block > table,
.strategy-block > .highlight-quote,
.strategy-block > .advantage-grid { padding: 16px 20px 0; }
.strategy-block > *:last-child { padding-bottom: 16px; }
.support-row { display: flex; gap: 12px; margin: 10px 20px 0; align-items: stretch; }
.strategy-block > .support-row:first-of-type { margin-top: 16px; }
.strategy-block > .support-row:last-of-type { margin-bottom: 16px; }
.support-row > .support-item { flex: 1; margin: 0; }

.highlight-quote {
  font-size: 14px; font-style: italic; line-height: 1.8;
  color: var(--text-primary);
  border-left: 4px solid #5b9bd5;
  padding: 12px 16px !important;
  margin: 12px 20px !important;
  background: rgba(91,155,213,0.06);
  border-radius: 0 6px 6px 0;
}

.advantage-grid { display: flex; gap: 16px; }
.advantage-card { flex: 1; background: var(--sidebar-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 8px; padding: 16px; }
.advantage-label { font-size: 12px; font-weight: 700; color: #5b9bd5; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

.support-item { display: flex; gap: 14px; align-items: flex-start; border: 1px solid var(--border-color, #e8e8e8); border-left: 3px solid #5b9bd5; border-radius: 8px; padding: 14px 16px; }
.support-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.support-item > div { flex: 1; }

/* ── 数据图表（领导价值页）── */
.data-charts {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}
.chart-card {
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  padding: 18px 16px;
}
.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}
.bar-chart { display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label { font-size: 11px; color: var(--text-secondary); width: 58px; flex-shrink: 0; text-align: right; }
.bar-track { flex: 1; height: 22px; background: var(--el-fill-color, #f0f0f0); border-radius: 4px; overflow: visible; position: relative; }
.bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; position: relative; min-width: 4px; }
.bar-old { background: #e0e0e0; }
.bar-new { background: linear-gradient(90deg, #5b9bd5, #3b82d5); }
.bar-val { font-size: 11px; font-weight: 700; color: #555; white-space: nowrap; margin-left: 6px; }
.bar-val-new { color: #fff; }
.chart-note { margin-top: 10px; font-size: 12px; color: var(--text-secondary); text-align: center; }
.chart-note strong { color: #5b9bd5; font-size: 14px; }

/* 甜甜圈图 */
.donut-wrap { position: relative; width: 90px; height: 90px; margin: 0 auto 8px; }
.donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.donut-pct { display: block; font-size: 18px; font-weight: 800; color: #5b9bd5; line-height: 1.1; }
.donut-sub { display: block; font-size: 10px; color: var(--text-secondary); }
.donut-legend { text-align: center; font-size: 11px; color: var(--text-secondary); }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; vertical-align: middle; margin-right: 3px; }

/* ── 战略汇报：VS 对比图 ── */
.vs-chart-wrap {
  display: flex;
  gap: 0;
  margin: 16px 20px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
}
.vs-metric { flex: 1; padding: 16px 20px; }
.vs-divider { width: 1px; background: var(--border-color, #e8e8e8); }
.vs-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
.vs-bars { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.vs-bar-track { height: 18px; background: var(--el-fill-color, #f0f0f0); border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.vs-bar-fill { height: 100%; border-radius: 4px; min-width: 4px; }
.vs-old { background: #d0d0d0; }
.vs-new { background: linear-gradient(90deg, #5b9bd5, #2563eb); }
.vs-bar-text { font-size: 11px; color: var(--text-secondary); }
.vs-new-text { color: #5b9bd5; }
.vs-badge {
  display: inline-block;
  background: rgba(231,76,60,0.1);
  color: #e74c3c;
  border: 1px solid rgba(231,76,60,0.2);
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
}
.vs-badge span { font-size: 15px; font-weight: 800; }
.vs-badge-green { background: rgba(39,174,96,0.1); color: #27ae60; border-color: rgba(39,174,96,0.2); }

/* ── 战略汇报：大数字 ── */
.big-stats {
  display: flex;
  align-items: stretch;
  margin: 16px 20px;
  background: linear-gradient(135deg, rgba(91,155,213,0.06), rgba(91,155,213,0.02));
  border: 1px solid rgba(91,155,213,0.2);
  border-radius: 10px;
  overflow: hidden;
}
.big-stat { flex: 1; text-align: center; padding: 20px 12px; }
.big-stat-divider { width: 1px; background: rgba(91,155,213,0.15); }
.big-num { font-size: 36px; font-weight: 900; color: #5b9bd5; line-height: 1; margin-bottom: 8px; }
.big-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

/* ── 战略汇报：甘特图 ── */
.gantt-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 20px;
}
.gantt-row { display: flex; align-items: center; gap: 12px; }
.gantt-phase {
  width: 42px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
  text-align: right;
}
.gantt-phase-star { color: #5b9bd5; }
.gantt-bar-track { flex: 1; height: 32px; background: var(--el-fill-color, #f0f0f0); border-radius: 6px; overflow: hidden; }
.gantt-bar {
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 12px;
  color: var(--text-primary);
}

/* ── 响应式补充 ── */
@media (max-width: 700px) {
  .data-charts { grid-template-columns: 1fr; }
  .vs-chart-wrap { flex-direction: column; }
  .vs-divider { width: 100%; height: 1px; }
  .big-stats { flex-wrap: wrap; }
  .big-stat { min-width: 45%; }
}
</style>
