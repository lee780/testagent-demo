<template>
  <div class="story-page">

    <!-- ── 导航锚点 ── -->
    <nav class="story-nav">
      <a href="#value" class="story-nav-link" @click.prevent="scrollTo('value')">领导价值</a>
      <a href="#userstory" class="story-nav-link" @click.prevent="scrollTo('userstory')">用户故事</a>
      <a href="#scenarios" class="story-nav-link" @click.prevent="scrollTo('scenarios')">使用场景</a>
      <a href="#roadmap" class="story-nav-link" @click.prevent="scrollTo('roadmap')">下一步计划</a>
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

        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         第三屏：使用场景
    ══════════════════════════════════════════ -->
    <section id="scenarios" class="section section-scenarios">
      <div class="section-inner">
        <h2 class="section-title">5 个真实使用场景</h2>
        <p class="section-sub">不同的工作情境，对应不同的使用路径</p>

        <div class="scenario-list">

          <div class="scenario-card">
            <div class="scenario-header">
              <span class="scenario-num">01</span>
              <div>
                <div class="scenario-title">接了个新接口，要从零建测试用例库</div>
                <div class="scenario-mode mode-systematic">系统化模式</div>
              </div>
            </div>
            <div class="scenario-body">
              <div class="scenario-situation">
                <strong>情境：</strong>产品刚上线一个新功能接口，要建立一套覆盖完整的基线测试用例，用于日后的回归验证。
              </div>
              <div class="scenario-steps">
                <div class="step"><span class="step-num">1</span><span>在知识库上传业务规范文档（或直接上传到对话）</span></div>
                <div class="step"><span class="step-num">2</span><span>新建对话，选「系统化」模式，输入：<em>"请对 MODEL_001 授信接口做全量系统化测试"</em></span></div>
                <div class="step"><span class="step-num">3</span><span>AI 自动运用边界值分析（BVA）和等价类划分，生成覆盖各准入条件边界的测试用例并执行</span></div>
                <div class="step"><span class="step-num">4</span><span>查看测试报告，将高质量用例入库，提交审核后晋级为「基线」</span></div>
              </div>
              <div class="scenario-result">✅ 产出：一套经过人工确认的基线用例库，下次回归可直接调用</div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-header">
              <span class="scenario-num">02</span>
              <div>
                <div class="scenario-title">业务规则刚改了，要验证没有破坏已有逻辑</div>
                <div class="scenario-mode mode-regression">AI 回归推荐</div>
              </div>
            </div>
            <div class="scenario-body">
              <div class="scenario-situation">
                <strong>情境：</strong>开发修改了授信系数的计算规则，需要在上线前确认改动没有引入回归 Bug。
              </div>
              <div class="scenario-steps">
                <div class="step"><span class="step-num">1</span><span>进入「用例库」，点击「AI 推荐回归用例」</span></div>
                <div class="step"><span class="step-num">2</span><span>输入变更描述：<em>"修改了余额系数档位，1000 以上从 2.0 调整为 2.3"</em></span></div>
                <div class="step"><span class="step-num">3</span><span>AI 综合语义、覆盖点、历史报告等多维数据，推荐最相关的基线用例并说明推荐理由</span></div>
                <div class="step"><span class="step-num">4</span><span>勾选用例，一键执行回归，生成回归验证报告</span></div>
              </div>
              <div class="scenario-result">✅ 产出：精准回归报告，明确变更是否引入问题，而不是靠感觉</div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-header">
              <span class="scenario-num">03</span>
              <div>
                <div class="scenario-title">怀疑接口有隐藏的 Bug，想深度探查</div>
                <div class="scenario-mode mode-exploratory">探索模式</div>
              </div>
            </div>
            <div class="scenario-body">
              <div class="scenario-situation">
                <strong>情境：</strong>线上出现了一个罕见的异常，怀疑是某个边界条件处理不当，想主动挖掘。
              </div>
              <div class="scenario-steps">
                <div class="step"><span class="step-num">1</span><span>新建对话，选「探索」模式</span></div>
                <div class="step"><span class="step-num">2</span><span>输入怀疑方向：<em>"重点探查浮点数精度边界和并发下的结果一致性"</em></span></div>
                <div class="step"><span class="step-num">3</span><span>AI 以假设驱动方式，自由设计非常规测试组合，主动寻找系统的弱点</span></div>
                <div class="step"><span class="step-num">4</span><span>发现问题后，直接从报告创建缺陷，关联到具体用例和执行日志</span></div>
              </div>
              <div class="scenario-result">✅ 产出：可复现的 Bug 记录，关联完整执行日志，便于开发定位</div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-header">
              <span class="scenario-num">04</span>
              <div>
                <div class="scenario-title">团队要统一测试标准，不想每次重复说明</div>
                <div class="scenario-mode mode-knowledge">知识库</div>
              </div>
            </div>
            <div class="scenario-body">
              <div class="scenario-situation">
                <strong>情境：</strong>团队有多人使用平台，但测试风格不统一，有人遗漏边界，有人 expected 写得不够精确。
              </div>
              <div class="scenario-steps">
                <div class="step"><span class="step-num">1</span><span>进入「知识库」→「业务规则库」，上传当前接口的业务规范文档，与模型 ID 绑定</span></div>
                <div class="step"><span class="step-num">2</span><span>在「测试规范库」，为不同模式写入质量标准（如"expected 必须给出精确数值"）</span></div>
                <div class="step"><span class="step-num">3</span><span>在「挡板场景库」，保存常用的外部依赖组合（如"黑名单用户"、"卡状态异常"），起名备用</span></div>
                <div class="step"><span class="step-num">4</span><span>之后任何人发起对话时，只需输入模型 ID，以上内容自动注入 AI 上下文</span></div>
              </div>
              <div class="scenario-result">✅ 产出：团队经验固化为系统资产，新成员开箱即用，无需口口相传</div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-header">
              <span class="scenario-num">05</span>
              <div>
                <div class="scenario-title">领导要看这个月的测试质量情况</div>
                <div class="scenario-mode mode-report">报告 + 缺陷管理</div>
              </div>
            </div>
            <div class="scenario-body">
              <div class="scenario-situation">
                <strong>情境：</strong>月末质量复盘会，需要展示本月测试覆盖情况、发现的问题数量和处理进度。
              </div>
              <div class="scenario-steps">
                <div class="step"><span class="step-num">1</span><span>「测试报告」页：查看本月各次执行报告，通过率一目了然（绿色≥100%、蓝色≥80%……）</span></div>
                <div class="step"><span class="step-num">2</span><span>每份报告可在线预览 HTML，查看每条用例的入参、预期、实际结果和执行日志</span></div>
                <div class="step"><span class="step-num">3</span><span>「缺陷管理」页：查看 P0/P1 缺陷数量和处理进度，筛选未关闭的高危缺陷</span></div>
                <div class="step"><span class="step-num">4</span><span>从任意缺陷可追溯：关联的测试用例 → 来源报告 → 原始对话 → 业务规范文档</span></div>
              </div>
              <div class="scenario-result">✅ 产出：完整的质量数据链，复盘有据可查，汇报素材随手可得</div>
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

  </div>
</template>

<script setup>
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
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

/* ── 第三屏：场景 ── */
.section-scenarios { background: var(--main-bg); }
.scenario-list { display: flex; flex-direction: column; gap: 16px; }
.scenario-card { background: var(--sidebar-bg); border: 1px solid var(--border-color, #e8e8e8); border-radius: 10px; padding: 24px; }
.scenario-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.scenario-num { font-size: 28px; font-weight: 800; color: rgba(91,155,213,0.3); line-height: 1; flex-shrink: 0; }
.scenario-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.scenario-mode { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
.mode-systematic { background: rgba(91,155,213,0.12); color: #3a7ec8; }
.mode-regression  { background: rgba(46,125,50,0.1);  color: #2e7d32; }
.mode-exploratory { background: rgba(230,81,0,0.1);   color: #e65100; }
.mode-knowledge   { background: rgba(123,31,162,0.1); color: #7b1fa2; }
.mode-report      { background: rgba(0,131,143,0.1);  color: #00838f; }
.scenario-body { padding-left: 44px; }
.scenario-situation { font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.6; }
.scenario-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.step { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--text-primary); line-height: 1.6; }
.step-num { background: #5b9bd5; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
.step em { color: #5b9bd5; font-style: normal; background: rgba(91,155,213,0.08); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
.scenario-result { font-size: 13px; font-weight: 500; color: #2e7d32; background: rgba(46,125,50,0.06); border-left: 3px solid #2e7d32; padding: 8px 12px; border-radius: 0 4px 4px 0; }

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

/* ── 响应式兜底 ── */
@media (max-width: 700px) {
  .value-cards, .cta-items { grid-template-columns: 1fr; }
  .phases { flex-direction: column; }
  .phase-arrow { transform: rotate(90deg); }
  .hero-title { font-size: 22px; }
  .comparison-bar { flex-direction: column; }
}
</style>
