<template>
  <div class="stub-container">
    <div class="stub-header">
      <h2 class="stub-title">挡板管理</h2>
      <div class="stub-status">
        <span class="status-dot" :class="online ? 'dot-online' : 'dot-offline'"></span>
        <span class="status-text">{{ online ? '挡板服务在线' : '挡板服务离线' }}</span>
        <span class="status-url">localhost:{{ stubPort }}</span>
        <el-button size="small" text @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="stub-tabs">

      <!-- ── 已注册路由 ── -->
      <el-tab-pane label="已注册路由" name="routes">
        <div class="tab-desc">
          <span class="tab-desc-icon">🔀</span>
          <span>挡板拦截的外呼路径及返回体。每条路由对应一个 <code>method + path</code>，命中后返回配置的 JSON。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openRouteDialog()">+ 新建路由</el-button>
          <el-button size="small" type="danger" plain @click="clearRoutes" :disabled="routes.length === 0">清空全部</el-button>
        </div>
        <el-table :data="routes" stripe size="small" v-loading="routesLoading" empty-text="暂无已注册路由">
          <el-table-column label="服务名" prop="name" width="140">
            <template #default="{ row }">{{ row.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="Method" prop="method" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="methodColor(row.method)">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Path" prop="path" />
          <el-table-column label="状态码" prop="statusCode" width="80" />
          <el-table-column label="返回体预览">
            <template #default="{ row }">
              <code class="response-preview">{{ JSON.stringify(row.response).slice(0, 80) }}{{ JSON.stringify(row.response).length > 80 ? '…' : '' }}</code>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openRouteDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteRoute(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 外部服务 ── -->
      <el-tab-pane label="外部服务" name="services">
        <div class="tab-desc">
          <span class="tab-desc-icon">🔌</span>
          <span>授信C系统外呼清单。授信计算时会并行调用此列表中所有路径，合并返回字段作为外部指标。<strong>路由必须同时在「已注册路由」中配置返回体</strong>，否则返回 404。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openSvcDialog()">+ 新增外部服务</el-button>
          <el-button size="small" type="danger" plain @click="clearServices" :disabled="services.length === 0">清空全部</el-button>
        </div>
        <el-table :data="services" stripe size="small" v-loading="svcsLoading" empty-text="暂无已注册外部服务">
          <el-table-column label="服务名" prop="name" />
          <el-table-column label="外呼路径" prop="path" />
          <el-table-column label="Method" prop="method" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="methodColor(row.method)">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="路由状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="hasRoute(row) ? 'success' : 'warning'">
                {{ hasRoute(row) ? '已配置' : '缺路由' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="deleteService(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 说明 ── -->
      <el-tab-pane label="原理说明" name="guide">
        <div class="guide-wrap">

          <section class="guide-section">
            <h3 class="guide-h3">一、为什么需要挡板？</h3>
            <p>授信C系统在计算信用额度时，除了读取自身数据库，还需要向外部第三方系统发起实时外呼（如支付宝、微信、公积金、房产查询等），拿到外部特征指标后合并计算。</p>
            <p>但在测试环境中，这些外部系统<strong>不允许联调、不允许压测、无法随意调用</strong>。挡板服务器就是在这条链路上架设一个"假的对端"，授信C系统发出去的每一笔外呼都被挡板拦截，返回我们提前配置好的数据——真实外网永远不会被触碰。</p>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">二、整体流程</h3>
            <div class="flow-diagram">
              <div class="flow-box flow-agent">
                <div class="flow-label">测试 Agent</div>
                <div class="flow-sub">生成用例 / 发起请求</div>
              </div>
              <div class="flow-arrows-col">
                <div class="flow-arrow-item">
                  <span class="flow-arrow">①──────────────▶</span>
                  <span class="flow-arrow-note">POST /mock/setup<br>写本地指标 + 配置挡板返回值</span>
                </div>
                <div class="flow-arrow-item" style="margin-top:12px">
                  <span class="flow-arrow">②──────────────▶</span>
                  <span class="flow-arrow-note">POST /mock/model/score<br>发起授信测算请求</span>
                </div>
              </div>
              <div class="flow-col-right">
                <div class="flow-box flow-csys">
                  <div class="flow-label">授信C系统</div>
                  <div class="flow-sub">:8000</div>
                </div>
                <div class="flow-inner-arrows">
                  <div class="flow-inner-item">
                    <span class="flow-inner-arrow">③ 读本地 DB ──▶</span>
                    <div class="flow-box flow-db">
                      <div class="flow-label">授信C系统 DB</div>
                      <div class="flow-sub">存量指标</div>
                    </div>
                  </div>
                  <div class="flow-inner-item" style="margin-top:10px">
                    <span class="flow-inner-arrow">④ HTTP 外呼 ──▶</span>
                    <div class="flow-box flow-stub">
                      <div class="flow-label">挡板服务器</div>
                      <div class="flow-sub">:8002 可配置</div>
                    </div>
                  </div>
                </div>
                <div class="flow-box flow-calc" style="margin-top:10px">
                  <div class="flow-label">合并指标 → 规则计算 → 返回结果</div>
                </div>
              </div>
            </div>
            <div class="flow-note">
              挡板服务器与授信C系统同在内网。授信C系统的外呼目标地址通过环境变量 <code>STUB_SERVER_URL</code> 指向挡板，<strong>生产环境改回真实地址即可，授信C系统代码零修改</strong>。
            </div>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">三、两个核心概念</h3>
            <div class="concept-cards">
              <div class="concept-card">
                <div class="concept-title">🔀 已注册路由</div>
                <div class="concept-body">
                  <p>挡板拦截的"地址 → 返回体"映射。</p>
                  <p>授信C系统外呼某个路径时，挡板查找有没有匹配的路由：</p>
                  <ul>
                    <li>有 → 返回配置好的 JSON</li>
                    <li>没有 → 返回 404</li>
                  </ul>
                  <p>返回体字段可以任意定义，不限于固定格式。多个路由的字段会被授信C系统合并后统一参与计算。</p>
                  <div class="concept-example">
                    <div class="concept-example-title">示例</div>
                    <pre>路径：POST /alipay/query
返回：{
  "cardStatus": "NORMAL",
  "recentTransAmount": "5000",
  "aliScore": 750
}</pre>
                  </div>
                </div>
              </div>
              <div class="concept-card">
                <div class="concept-title">🔌 外部服务</div>
                <div class="concept-body">
                  <p>授信C系统外呼的"服务清单"。</p>
                  <p>授信C系统在计算前，先读取此列表，然后并行调用每一条路径，将所有返回字段合并成外部指标集合。</p>
                  <ul>
                    <li>列表为空 → 授信C系统无外部指标，只用本地指标计算</li>
                    <li>有服务但缺对应路由 → 该服务返回 404，该路径指标跳过</li>
                  </ul>
                  <p><strong>路由负责"返回什么"，外部服务负责"调哪里"，两者缺一不可。</strong></p>
                  <div class="concept-example">
                    <div class="concept-example-title">示例</div>
                    <pre>服务名：支付宝
路径：  /alipay/query
方式：  POST</pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">四、使用步骤</h3>
            <ol class="guide-steps">
              <li>
                <span class="step-num">1</span>
                <div class="step-body">
                  <strong>启动挡板服务器</strong>
                  <div class="step-cmd">npm run dev:stub</div>
                  <span class="step-tip">页面右上角状态指示变绿即为在线</span>
                </div>
              </li>
              <li>
                <span class="step-num">2</span>
                <div class="step-body">
                  <strong>新建路由</strong>（「已注册路由」Tab → 新建路由）
                  <div class="step-tip">填入服务名、路径、返回体 JSON；勾选"同时注册为外部服务"，一步搞定两件事</div>
                </div>
              </li>
              <li>
                <span class="step-num">3</span>
                <div class="step-body">
                  <strong>确认外部服务列表</strong>（「外部服务」Tab）
                  <div class="step-tip">路由状态显示"已配置"说明挡板可正常拦截；显示"缺路由"需要回第 2 步补上</div>
                </div>
              </li>
              <li>
                <span class="step-num">4</span>
                <div class="step-body">
                  <strong>执行测试</strong>
                  <div class="step-tip">通过聊天界面发起测试，Agent 自动调用 /mock/setup 写入本地指标和挡板配置，然后调用 /mock/model/score 触发完整计算链路</div>
                </div>
              </li>
              <li>
                <span class="step-num">5</span>
                <div class="step-body">
                  <strong>调整挡板返回体，测试不同分支</strong>
                  <div class="step-tip">修改某条路由的返回 JSON（如把 cardStatus 改为 FROZEN），重新触发测试，观察准入结果变化</div>
                </div>
              </li>
            </ol>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">五、挡板场景库（命名场景）</h3>
            <p>v2.5 起，挡板配置可以保存为"命名场景"存入知识库，供 Agent 在测试执行时自动应用，无需每次手动配置路由。</p>
            <div class="concept-cards" style="margin-top: 12px">
              <div class="concept-card">
                <div class="concept-title">📦 创建命名场景</div>
                <div class="concept-body">
                  <p>在<strong>知识库 → 挡板场景库</strong>中，将一组路由配置保存为有意义的名称，例如：</p>
                  <ul>
                    <li>「支付宝正常-公积金正常」</li>
                    <li>「银行卡冻结场景」</li>
                    <li>「黑名单命中场景」</li>
                  </ul>
                  <p>每个场景记录完整的外部指标返回值，与测试用例分开维护。</p>
                </div>
              </div>
              <div class="concept-card">
                <div class="concept-title">🤖 Agent 自动应用</div>
                <div class="concept-body">
                  <p>测试用例中指定 <code>external_setup_ref: "场景名"</code>，Agent 执行时自动从知识库查找并调用对应挡板配置，无需人工干预。</p>
                  <div class="concept-example">
                    <div class="concept-example-title">用例片段示例</div>
                    <pre>test_case:
  name: 银行卡冻结-不准入验证
  external_setup_ref: "银行卡冻结场景"
  # Agent 自动加载该场景的挡板配置</pre>
                  </div>
                </div>
              </div>
            </div>
            <div class="flow-note" style="margin-top: 14px">
              <strong>推荐用法：</strong>手动配置路由用于临时调试；命名场景用于回归测试——场景固化后，每次执行结果可复现，方便 CI/自动化集成。
            </div>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">六、注意事项</h3>
            <ul class="guide-notes">
              <li>挡板数据存在<strong>内存</strong>中，重启挡板服务后需重新配置路由和外部服务</li>
              <li>多条外部服务的返回体字段若重名，<strong>后注册的服务会覆盖前面的同名字段</strong></li>
              <li>外部服务列表是全局的，当前不区分用户 ID；并发测试不同用户时注意挡板配置的影响</li>
              <li>测试报告中的缺陷若涉及外部指标分支，需在缺陷描述中记录当时的挡板配置，便于复现</li>
              <li>命名场景只存储挡板返回值配置，<strong>不自动注册到挡板内存</strong>；Agent 执行 <code>external_setup_ref</code> 时才真正写入</li>
            </ul>
          </section>

          <section class="guide-section">
            <h3 class="guide-h3">七、两种场景时序图对比</h3>
            <p>帮助理解 TestPilot 在测试中替换了哪些环节，而<strong>授信C系统的代码、接口、内部逻辑始终不变</strong>。</p>

            <div class="seq-compare">

              <!-- ── 场景 A ── -->
              <div class="seq-panel">
                <div class="seq-panel-hd seq-hd-a">场景 A — 生产正常场景（用户发起）</div>
                <div class="seq-actors-row">
                  <span class="seq-act act-user">👤 用户</span>
                  <span class="seq-act act-csys">🏦 授信C系统</span>
                  <span class="seq-act act-db">🗄️ C系统DB</span>
                  <span class="seq-act act-ext">🌐 真实外部系统</span>
                </div>
                <div class="seq-body">

                  <div class="seq-msg">
                    <span class="seq-sndr">用户</span>
                    <span class="seq-arr">── POST /credit/score ──────▶</span>
                    <span class="seq-rcvr">授信C系统</span>
                  </div>

                  <div class="seq-phase phase-stepA">
                    <div class="seq-phase-hd">Step A — 查询自身存量数据</div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 查流水/余额/社保/等级 ──▶</span>
                      <span class="seq-rcvr">C系统DB</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">C系统DB</span>
                      <span class="seq-arr">◀── 返回客户存量数据 ────</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                  </div>

                  <div class="seq-phase phase-stepB">
                    <div class="seq-phase-hd">Step B — 外呼真实三方（需外网）</div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 外呼支付宝 ──────────▶</span>
                      <span class="seq-rcvr">真实外部系统</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">真实外部系统</span>
                      <span class="seq-arr">◀── 返回支付宝数据 ──────</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 外呼公积金 / 房产 ───▶</span>
                      <span class="seq-rcvr">真实外部系统</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">真实外部系统</span>
                      <span class="seq-arr">◀── 返回各项外部数据 ────</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                  </div>

                  <div class="seq-phase phase-stepC">
                    <div class="seq-phase-hd">Step C — 汇总规则计算</div>
                    <div class="seq-self">授信C系统 内部：合并 Step A + B 全部指标 → 准入判断 + 额度档位计算</div>
                  </div>

                  <div class="seq-msg seq-final">
                    <span class="seq-sndr">授信C系统</span>
                    <span class="seq-arr">◀── { admit_flag, credit_limit } ──</span>
                    <span class="seq-rcvr">用户</span>
                  </div>

                </div>
              </div>

              <!-- ── 场景 B ── -->
              <div class="seq-panel">
                <div class="seq-panel-hd seq-hd-b">场景 B — TestPilot 测试场景（Agent 接管）</div>
                <div class="seq-actors-row">
                  <span class="seq-act act-tp">🤖 TestPilot</span>
                  <span class="seq-act act-csys">🏦 授信C系统</span>
                  <span class="seq-act act-db">🗄️ C系统DB</span>
                  <span class="seq-act act-stub">🧱 TestPilot挡板</span>
                </div>
                <div class="seq-body">

                  <div class="seq-phase phase-prep">
                    <div class="seq-phase-hd">① 准备阶段 — 构造可控的测试环境</div>
                    <div class="seq-msg">
                      <span class="seq-sndr seq-star">★ TestPilot</span>
                      <span class="seq-arr">── 写入测试前置数据（控制StepA）──▶</span>
                      <span class="seq-rcvr">C系统DB</span>
                    </div>
                    <div class="seq-msg">
                      <span class="seq-sndr seq-star">★ TestPilot</span>
                      <span class="seq-arr">── 配置挡板路由返回值（控制StepB）▶</span>
                      <span class="seq-rcvr">TestPilot挡板</span>
                    </div>
                  </div>

                  <div class="seq-msg seq-msg-star">
                    <span class="seq-sndr seq-star">★ TestPilot</span>
                    <span class="seq-arr">── POST /credit/score ──────▶</span>
                    <span class="seq-rcvr">授信C系统</span>
                  </div>
                  <div class="seq-inline-note">↑ 发起方从真实用户变为 TestPilot</div>

                  <div class="seq-phase phase-stepA">
                    <div class="seq-phase-hd">Step A — 查询存量数据（逻辑同生产）</div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 查流水/余额/社保/等级 ──▶</span>
                      <span class="seq-rcvr">C系统DB</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">C系统DB</span>
                      <span class="seq-arr">◀── 返回【预置的】存量数据 ──</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                  </div>

                  <div class="seq-phase phase-stepB">
                    <div class="seq-phase-hd">★ Step B — 外呼被挡板无感拦截</div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 外呼「支付宝」（C系统无感知）▶</span>
                      <span class="seq-rcvr">TestPilot挡板</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">TestPilot挡板</span>
                      <span class="seq-arr">◀── 返回预配置的支付宝数据 ──</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                    <div class="seq-msg">
                      <span class="seq-sndr">授信C系统</span>
                      <span class="seq-arr">── 外呼「公积金」/「房产」 ───▶</span>
                      <span class="seq-rcvr">TestPilot挡板</span>
                    </div>
                    <div class="seq-msg seq-ret">
                      <span class="seq-sndr">TestPilot挡板</span>
                      <span class="seq-arr">◀── 返回各项预配置数据 ──────</span>
                      <span class="seq-rcvr">授信C系统</span>
                    </div>
                  </div>

                  <div class="seq-phase phase-stepC">
                    <div class="seq-phase-hd">Step C — 汇总规则计算（逻辑同生产）</div>
                    <div class="seq-self">授信C系统 内部：合并 Step A + B 全部指标 → 准入判断 + 额度档位计算</div>
                  </div>

                  <div class="seq-msg seq-final">
                    <span class="seq-sndr">授信C系统</span>
                    <span class="seq-arr">◀── { admit_flag, credit_limit } ──</span>
                    <span class="seq-rcvr">TestPilot</span>
                  </div>

                  <div class="seq-phase phase-verify">
                    <div class="seq-phase-hd">③ 验证阶段</div>
                    <div class="seq-self">TestPilot：实际结果 vs 预期值 → 通过 / 失败 → 写入测试报告</div>
                  </div>

                </div>
              </div>

            </div>

            <!-- 对比表 -->
            <table class="seq-table">
              <thead>
                <tr>
                  <th>维度</th>
                  <th>场景 A（生产）</th>
                  <th>场景 B（TestPilot 测试）</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr class="seq-tr-changed">
                  <td>发起方</td>
                  <td>真实用户</td>
                  <td>TestPilot Agent</td>
                  <td><span class="seq-badge-changed">★ 变了</span></td>
                </tr>
                <tr class="seq-tr-changed">
                  <td>Step A 数据来源</td>
                  <td>客户真实历史数据</td>
                  <td>Agent 提前写入的测试数据</td>
                  <td><span class="seq-badge-changed">★ 变了</span></td>
                </tr>
                <tr class="seq-tr-changed">
                  <td>Step B 外呼目标</td>
                  <td>真实外部系统（外网）</td>
                  <td>TestPilot 挡板（内网，可控）</td>
                  <td><span class="seq-badge-changed">★ 变了</span></td>
                </tr>
                <tr class="seq-tr-same">
                  <td>授信C系统接口</td>
                  <td>POST /credit/score</td>
                  <td>POST /credit/score</td>
                  <td><span class="seq-badge-same">不变</span></td>
                </tr>
                <tr class="seq-tr-same">
                  <td>授信C系统代码</td>
                  <td>原始代码</td>
                  <td>原始代码（零修改）</td>
                  <td><span class="seq-badge-same">不变</span></td>
                </tr>
                <tr class="seq-tr-same">
                  <td>Step A / B / C 逻辑</td>
                  <td>原始业务规则</td>
                  <td>原始业务规则</td>
                  <td><span class="seq-badge-same">不变</span></td>
                </tr>
              </tbody>
            </table>
            <div class="flow-note" style="margin-top: 12px">
              💡 <strong>一句话总结：</strong>TestPilot 把「不可控的真实世界」替换成「完全可控的测试环境」，授信C系统本身感知不到任何差异。
            </div>

          </section>

        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- ── 新建/编辑路由弹窗 ── -->
    <el-dialog v-model="routeDialogVisible" :title="editingRoute ? '编辑路由' : '新建路由'" width="560px">
      <el-form :model="routeForm" label-width="80px" size="small">
        <el-form-item label="服务名">
          <el-input v-model="routeForm.name" placeholder="如：支付宝（可选，方便识别）" />
        </el-form-item>
        <el-form-item label="Method">
          <el-select v-model="routeForm.method" style="width: 120px">
            <el-option label="POST" value="POST" />
            <el-option label="GET" value="GET" />
            <el-option label="* (通配)" value="*" />
          </el-select>
        </el-form-item>
        <el-form-item label="Path">
          <el-input v-model="routeForm.path" placeholder="/alipay/query" />
        </el-form-item>
        <el-form-item label="状态码">
          <el-input-number v-model="routeForm.statusCode" :min="100" :max="599" />
        </el-form-item>
        <el-form-item label="返回体">
          <el-input
            v-model="routeForm.responseText"
            type="textarea"
            :rows="6"
            placeholder='{ "cardStatus": "NORMAL", "recentTransAmount": "5000" }'
            :class="{ 'json-error': !!routeForm.jsonError }"
            @input="validateJson"
          />
          <div v-if="routeForm.jsonError" class="json-error-msg">{{ routeForm.jsonError }}</div>
        </el-form-item>
        <el-form-item label="同时注册">
          <el-checkbox v-model="routeForm.alsoRegisterSvc">将此路径加入外部服务列表（授信C系统外呼）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="routeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoute" :disabled="!!routeForm.jsonError">保存</el-button>
      </template>
    </el-dialog>

    <!-- ── 新增外部服务弹窗 ── -->
    <el-dialog v-model="svcDialogVisible" title="新增外部服务" width="440px">
      <el-form :model="svcForm" label-width="80px" size="small">
        <el-form-item label="服务名">
          <el-input v-model="svcForm.name" placeholder="如：公积金中心" />
        </el-form-item>
        <el-form-item label="外呼路径">
          <el-input v-model="svcForm.path" placeholder="/gjj/query" />
        </el-form-item>
        <el-form-item label="Method">
          <el-select v-model="svcForm.method" style="width: 120px">
            <el-option label="POST" value="POST" />
            <el-option label="GET" value="GET" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="svcDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSvc">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const STUB_URL = `http://localhost:${import.meta.env.VITE_STUB_PORT || 8002}`
const stubPort = import.meta.env.VITE_STUB_PORT || 8002

const online = ref(false)
const activeTab = ref('routes')

const routes = ref([])
const services = ref([])
const routesLoading = ref(false)
const svcsLoading = ref(false)

const routeDialogVisible = ref(false)
const svcDialogVisible = ref(false)
const editingRoute = ref(null)

const routeForm = reactive({
  name: '', method: 'POST', path: '', statusCode: 200,
  responseText: '{}', jsonError: '', alsoRegisterSvc: true,
})
const svcForm = reactive({ name: '', path: '', method: 'POST' })

// ── 工具 ──────────────────────────────────────────────────

function methodColor(m) {
  if (m === 'GET') return 'success'
  if (m === 'POST') return 'primary'
  return 'info'
}

function hasRoute(svc) {
  return routes.value.some(r =>
    r.path === svc.path && (r.method === svc.method || r.method === '*')
  )
}

function validateJson() {
  try { JSON.parse(routeForm.responseText); routeForm.jsonError = '' }
  catch (e) { routeForm.jsonError = e.message }
}

// ── API ───────────────────────────────────────────────────

async function checkOnline() {
  try {
    const r = await fetch(`${STUB_URL}/health`, { signal: AbortSignal.timeout(2000) })
    online.value = r.ok
  } catch { online.value = false }
}

async function loadRoutes() {
  routesLoading.value = true
  try {
    const r = await fetch(`${STUB_URL}/_admin/routes`)
    routes.value = await r.json()
  } catch { routes.value = [] }
  finally { routesLoading.value = false }
}

async function loadServices() {
  svcsLoading.value = true
  try {
    const r = await fetch(`${STUB_URL}/_admin/ext-services`)
    services.value = await r.json()
  } catch { services.value = [] }
  finally { svcsLoading.value = false }
}

async function loadAll() {
  await checkOnline()
  await Promise.all([loadRoutes(), loadServices()])
}

// ── 路由 CRUD ─────────────────────────────────────────────

function openRouteDialog(row = null) {
  editingRoute.value = row
  if (row) {
    routeForm.name = row.name || ''
    routeForm.method = row.method
    routeForm.path = row.path
    routeForm.statusCode = row.statusCode
    routeForm.responseText = JSON.stringify(row.response, null, 2)
    routeForm.jsonError = ''
    routeForm.alsoRegisterSvc = false
  } else {
    routeForm.name = ''; routeForm.method = 'POST'; routeForm.path = ''
    routeForm.statusCode = 200; routeForm.responseText = '{\n  \n}'
    routeForm.jsonError = ''; routeForm.alsoRegisterSvc = true
  }
  routeDialogVisible.value = true
}

async function saveRoute() {
  validateJson()
  if (routeForm.jsonError) return
  if (!routeForm.path) { ElMessage.warning('Path 不能为空'); return }

  const payload = {
    name: routeForm.name || undefined,
    method: routeForm.method,
    path: routeForm.path,
    statusCode: routeForm.statusCode,
    response: JSON.parse(routeForm.responseText),
  }

  await fetch(`${STUB_URL}/_admin/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (routeForm.alsoRegisterSvc && !editingRoute.value) {
    await fetch(`${STUB_URL}/_admin/ext-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: routeForm.name || routeForm.path, path: routeForm.path, method: routeForm.method }),
    })
  }

  ElMessage.success('路由已保存')
  routeDialogVisible.value = false
  await loadAll()
}

async function deleteRoute(row) {
  await ElMessageBox.confirm(`删除路由 ${row.method} ${row.path}？`, '确认删除', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/routes`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: row.method, path: row.path }),
  })
  ElMessage.success('已删除')
  await loadAll()
}

async function clearRoutes() {
  await ElMessageBox.confirm('清空所有已注册路由？', '确认清空', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/routes/clear`, { method: 'DELETE' })
  ElMessage.success('已清空')
  await loadAll()
}

// ── 外部服务 CRUD ─────────────────────────────────────────

function openSvcDialog() {
  svcForm.name = ''; svcForm.path = ''; svcForm.method = 'POST'
  svcDialogVisible.value = true
}

async function saveSvc() {
  if (!svcForm.name || !svcForm.path) { ElMessage.warning('服务名和路径不能为空'); return }
  await fetch(`${STUB_URL}/_admin/ext-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: svcForm.name, path: svcForm.path, method: svcForm.method }),
  })
  ElMessage.success('外部服务已注册')
  svcDialogVisible.value = false
  await loadServices()
}

async function deleteService(row) {
  await ElMessageBox.confirm(`移除外部服务「${row.name}」？授信C系统将不再外呼此路径。`, '确认移除', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/ext-services`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: row.path }),
  })
  ElMessage.success('已移除')
  await loadServices()
}

async function clearServices() {
  await ElMessageBox.confirm('清空所有外部服务？授信C系统将无外呼指标。', '确认清空', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/ext-services/clear`, { method: 'DELETE' })
  ElMessage.success('已清空')
  await loadServices()
}

onMounted(loadAll)
</script>

<style scoped>
.stub-container { padding: 24px; max-width: 1100px; }

.stub-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.stub-title { margin: 0; font-size: 20px; font-weight: 600; }

.stub-status {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--el-text-color-secondary);
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-online  { background: #67c23a; }
.dot-offline { background: #f56c6c; }
.status-url  { font-family: monospace; color: var(--el-text-color-placeholder); }

.stub-tabs { margin-top: 0; }

.tab-desc {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; margin-bottom: 14px;
  background: var(--el-fill-color-light); border-radius: 6px;
  font-size: 13px; color: var(--el-text-color-secondary); line-height: 1.6;
}
.tab-desc-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.tab-desc code {
  background: var(--el-fill-color); padding: 1px 5px; border-radius: 3px;
  font-family: monospace; font-size: 12px;
}

.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }

.response-preview {
  font-family: monospace; font-size: 11px;
  color: var(--el-text-color-secondary);
}

.json-error .el-textarea__inner { border-color: var(--el-color-danger); }
.json-error-msg { font-size: 12px; color: var(--el-color-danger); margin-top: 4px; }

/* ── 说明页 ── */
.guide-wrap { padding: 4px 0 24px; max-width: 860px; }
.guide-section { margin-bottom: 36px; }
.guide-h3 {
  font-size: 15px; font-weight: 600; margin: 0 0 14px;
  padding-bottom: 8px; border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
}
.guide-section p { font-size: 13px; line-height: 1.8; color: var(--el-text-color-regular); margin: 0 0 8px; }
.guide-section strong { color: var(--el-text-color-primary); }

/* 流程图 */
.flow-diagram {
  display: flex; align-items: flex-start; gap: 0;
  margin: 16px 0; padding: 20px;
  background: var(--el-fill-color-light); border-radius: 8px;
  overflow-x: auto;
}
.flow-box {
  border-radius: 6px; padding: 10px 16px; text-align: center;
  min-width: 110px; flex-shrink: 0;
}
.flow-label { font-size: 13px; font-weight: 600; }
.flow-sub   { font-size: 11px; margin-top: 3px; opacity: .7; }
.flow-agent { background: #ecfdf5; border: 1.5px solid #6ee7b7; color: #065f46; }
.flow-csys  { background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e; }
.flow-db    { background: #f5f3ff; border: 1.5px solid #c4b5fd; color: #4c1d95; min-width: 90px; }
.flow-stub  { background: #fff7ed; border: 1.5px solid #fdba74; color: #9a3412; min-width: 90px; }
.flow-calc  { background: var(--el-fill-color); border: 1px dashed var(--el-border-color); font-size: 12px; color: var(--el-text-color-secondary); }

.flow-arrows-col {
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 8px; gap: 4px;
}
.flow-arrow-item { display: flex; flex-direction: column; align-items: flex-start; }
.flow-arrow { font-family: monospace; font-size: 12px; color: var(--el-color-primary); white-space: nowrap; }
.flow-arrow-note { font-size: 11px; color: var(--el-text-color-secondary); margin-top: 2px; line-height: 1.4; }

.flow-col-right { display: flex; flex-direction: column; gap: 0; }
.flow-inner-arrows { display: flex; flex-direction: column; padding: 8px 0 0 12px; gap: 0; }
.flow-inner-item { display: flex; align-items: center; gap: 8px; }
.flow-inner-arrow { font-family: monospace; font-size: 11px; color: var(--el-text-color-secondary); white-space: nowrap; }

.flow-note {
  font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.7;
  margin-top: 10px; padding: 8px 12px;
  background: var(--el-color-info-light-9); border-radius: 5px;
}
.flow-note code {
  background: var(--el-fill-color); padding: 1px 5px; border-radius: 3px;
  font-family: monospace; font-size: 11px;
}

/* 概念卡片 */
.concept-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 4px; }
.concept-card {
  border: 1px solid var(--el-border-color-light); border-radius: 8px; overflow: hidden;
}
.concept-title {
  padding: 10px 16px; font-size: 14px; font-weight: 600;
  background: var(--el-fill-color-light); border-bottom: 1px solid var(--el-border-color-lighter);
}
.concept-body { padding: 14px 16px; font-size: 13px; line-height: 1.7; color: var(--el-text-color-regular); }
.concept-body p { margin: 0 0 8px; }
.concept-body ul { margin: 0 0 8px; padding-left: 18px; }
.concept-body li { margin-bottom: 2px; }
.concept-example {
  margin-top: 12px; border-radius: 5px;
  background: var(--el-fill-color); overflow: hidden;
}
.concept-example-title {
  font-size: 11px; color: var(--el-text-color-placeholder);
  padding: 4px 10px; border-bottom: 1px solid var(--el-border-color-lighter);
}
.concept-example pre {
  margin: 0; padding: 10px; font-size: 12px; line-height: 1.6;
  font-family: monospace; color: var(--el-text-color-secondary); white-space: pre-wrap;
}

/* 步骤 */
.guide-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.guide-steps li { display: flex; align-items: flex-start; gap: 14px; }
.step-num {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--el-color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; margin-top: 1px;
}
.step-body { font-size: 13px; line-height: 1.6; color: var(--el-text-color-regular); }
.step-body strong { color: var(--el-text-color-primary); display: block; margin-bottom: 4px; }
.step-cmd {
  display: inline-block; font-family: monospace; font-size: 12px;
  background: var(--el-fill-color); border: 1px solid var(--el-border-color-light);
  padding: 3px 10px; border-radius: 4px; margin: 4px 0; color: var(--el-text-color-primary);
}
.step-tip { font-size: 12px; color: var(--el-text-color-secondary); }

/* 注意事项 */
.guide-notes { padding-left: 20px; margin: 0; }
.guide-notes li { font-size: 13px; line-height: 1.8; color: var(--el-text-color-regular); margin-bottom: 4px; }
.guide-notes strong { color: var(--el-text-color-primary); }

/* ── 七、两种场景时序图对比 ── */
.seq-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 14px 0;
}
.seq-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}
.seq-panel-hd {
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.seq-hd-a { background: #2980b9; }
.seq-hd-b { background: #27ae60; }

.seq-actors-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 10px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.seq-act {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}
.act-user { background: #dbeafe; color: #1e40af; }
.act-csys { background: #fef3c7; color: #92400e; }
.act-db   { background: #ede9fe; color: #4c1d95; }
.act-ext  { background: #fee2e2; color: #991b1b; }
.act-tp   { background: #d1fae5; color: #065f46; }
.act-stub { background: #ffedd5; color: #9a3412; }

.seq-body { padding: 10px 12px; }

.seq-phase {
  border-left: 3px solid;
  padding: 5px 8px 5px 10px;
  margin: 6px 0;
  border-radius: 0 4px 4px 0;
}
.seq-phase-hd {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  margin-bottom: 5px;
}
.phase-prep  { border-color: #27ae60; background: #f0fdf4; }
.phase-stepA { border-color: #3b82f6; background: #eff6ff; }
.phase-stepB { border-color: #f59e0b; background: #fffbeb; }
.phase-stepC { border-color: #10b981; background: #ecfdf5; }
.phase-verify { border-color: #f59e0b; background: #fffbeb; }

.seq-msg {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 3px 0;
  font-size: 11px;
  line-height: 1.4;
}
.seq-sndr { color: #374151; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.seq-arr  { color: #9ca3af; flex: 1; text-align: center; font-family: monospace; font-size: 10px; }
.seq-rcvr { color: #374151; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.seq-ret .seq-sndr, .seq-ret .seq-rcvr { color: #9ca3af; }
.seq-final { margin-top: 8px; font-weight: 600; }
.seq-msg-star {
  background: #fef9c3;
  border-radius: 4px;
  padding: 2px 4px;
  margin: 4px 0;
}
.seq-self {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
  padding: 2px 0;
}
.seq-star { color: #dc2626 !important; font-weight: 700; }
.seq-inline-note {
  font-size: 10px;
  color: #9ca3af;
  font-style: italic;
  margin: 0 0 4px 6px;
}

/* 对比表 */
.seq-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 14px;
}
.seq-table th {
  background: var(--el-fill-color-light);
  padding: 7px 12px;
  text-align: left;
  border: 1px solid var(--el-border-color-light);
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.seq-table td {
  padding: 6px 12px;
  border: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-regular);
}
.seq-tr-changed { background: #fff7ed; }
.seq-tr-same    { background: #f0fdf4; }
.seq-badge-changed { color: #dc2626; font-weight: 700; white-space: nowrap; }
.seq-badge-same    { color: #059669; font-weight: 700; }
</style>
