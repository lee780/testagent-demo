<template>
  <div class="report-detail">
    <!-- Header -->
    <div class="page-header">
      <el-button size="small" @click="$router.push('/reports')">← 返回</el-button>
      <div class="header-info">
        <span class="report-name">{{ report?.name || '加载中...' }}</span>
        <el-tag v-if="report" :type="modeTagType(report.executionMode)" size="small" style="margin-left:10px">{{ modeLabel(report.executionMode) }}</el-tag>
        <el-tag v-if="report" :type="report.casesImported ? 'success' : 'info'" size="small" style="margin-left:6px">{{ report.casesImported ? '已入库' : '未入库' }}</el-tag>
      </div>
      <span class="header-meta">{{ report ? formatTime(report.createdAt) : '' }}</span>
    </div>

    <div v-if="loading" class="loading-tip">加载中...</div>

    <div v-else-if="report" class="dashboard">

      <!-- 1. Recommendation Banner -->
      <div class="recommendation-banner" :class="bannerClass">
        <div class="banner-icon">{{ bannerIcon }}</div>
        <div class="banner-content">
          <div class="banner-title">质量结论</div>
          <div class="banner-text">{{ report.recommendation || '暂无建议' }}</div>
        </div>
      </div>

      <!-- 2. Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-value">{{ execResults.length }}</div>
          <div class="metric-label">总用例数</div>
        </div>
        <div class="metric-card pass">
          <div class="metric-value">{{ passedCount }}</div>
          <div class="metric-label">通过</div>
        </div>
        <div class="metric-card fail">
          <div class="metric-value">{{ failedCount }}</div>
          <div class="metric-label">失败</div>
        </div>
        <div class="metric-card error">
          <div class="metric-value">{{ errorCount }}</div>
          <div class="metric-label">异常</div>
        </div>
        <div class="metric-card rate">
          <div class="metric-value">{{ passRate }}</div>
          <div class="metric-label">通过率</div>
        </div>
        <div class="metric-card dur">
          <div class="metric-value">{{ totalDuration }}</div>
          <div class="metric-label">总耗时</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: passRate }" :class="passRateClass"></div>
      </div>

      <!-- 3. Tabs -->
      <el-tabs v-model="activeTab" class="detail-tabs">

        <!-- Tab: 测试汇报 -->
        <el-tab-pane label="测试汇报" name="summary">
          <div v-if="report.summaryReport" class="summary-report-wrap">
            <MarkdownViewer :content="report.summaryReport" />
          </div>
          <div v-else class="empty-tip">Agent 尚未生成测试汇报。新执行的测试将自动生成。</div>
        </el-tab-pane>

        <!-- Tab: 执行结果 -->
        <el-tab-pane label="执行结果" name="results">
          <!-- Failed cases summary -->
          <div v-if="failedCases.length > 0" class="failed-summary">
            <div class="failed-summary-title">❌ 失败/异常用例（{{ failedCases.length }} 条）</div>
            <div v-for="r in failedCases" :key="r.id" class="failed-item">
              <span class="failed-badge" :class="r.status === 'FAILED' ? 'badge-fail' : 'badge-error'">{{ r.status }}</span>
              <span class="failed-id">{{ r.id }}</span>
              <span class="failed-name">{{ r.name }}</span>
              <span v-if="r.error" class="failed-error"> — {{ r.error }}</span>
              <div v-if="r.assertions" class="failed-assertions">
                <span v-for="a in r.assertions.filter(a => !a.passed)" :key="a.path" class="failed-assert-item">
                  {{ a.desc || a.path }}: 期望 {{ a.expected }} · 实际 {{ a.actual ?? 'null' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Table toolbar: import bar + filter toggle -->
          <div class="table-toolbar">
            <!-- Import controls (before import) -->
            <template v-if="!report.casesImported && execResults.length > 0">
              <span class="import-tip">
                共 {{ execResults.length }} 条 · 已选 <strong>{{ selectedCases.length || execResults.length }}</strong> 条（入库后状态为"草稿"）
              </span>
              <el-button type="success" size="small" @click="openImportConfirm" :loading="importing">
                {{ selectedCases.length > 0 && selectedCases.length < execResults.length ? `入库所选 ${selectedCases.length} 条用例` : '测试用例入库' }}
              </el-button>
            </template>
            <el-tag v-else-if="report.casesImported" type="success" size="small">✅ 已入库</el-tag>
            <div style="flex:1" />
            <el-switch v-model="showFailedOnly" active-text="只看失败" inactive-text="全部" />
          </div>

          <!-- Main results table -->
          <div class="cases-table-wrap">
            <el-table
              :data="filteredResults"
              size="small"
              stripe
              row-class-name="case-table-row"
              @selection-change="onSelectionChange"
            >
              <el-table-column v-if="!report.casesImported" type="selection" width="46" />
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <span class="status-badge" :class="statusBadgeClass(row.status)">{{ row.status }}</span>
                </template>
              </el-table-column>
              <el-table-column label="用例ID" prop="id" width="180" />
              <el-table-column label="名称" prop="name" min-width="160" />
              <el-table-column label="覆盖点" prop="coverage_point" min-width="180">
                <template #default="{ row }">{{ row.coverage_point || '—' }}</template>
              </el-table-column>
              <el-table-column label="优先级" width="80">
                <template #default="{ row }">
                  <span class="priority-badge" :class="`p-${row.priority?.toLowerCase()}`">{{ row.priority }}</span>
                </template>
              </el-table-column>
              <el-table-column label="HTTP" prop="http_status" width="70" />
              <el-table-column label="耗时" width="80">
                <template #default="{ row }">{{ row.duration_ms }}ms</template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" link @click="openCaseDetail(row)">详情</el-button>
                  <el-button v-if="row.status !== 'PASSED'" size="small" link type="danger" @click="openCreateDefect(row)">缺陷</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- Imported cases list (after import) -->
          <div v-if="report.testCases && report.testCases.length > 0" class="imported-list">
            <div class="import-section-title">已入库用例（{{ report.testCases.length }} 条）</div>
            <div v-for="tc in report.testCases" :key="tc.id" class="imported-case">
              <router-link :to="`/testcases/${tc.id}`" class="case-link">{{ tc.title }}</router-link>
              <el-tag size="small" :type="statusTagType(tc.status)">{{ statusLabel(tc.status) }}</el-tag>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab: 覆盖分析 -->
        <el-tab-pane label="覆盖分析" name="analysis">
          <div class="analysis-section-title">覆盖点分布（展开/折叠查看层级）</div>
          <el-table
            :data="coverageTree"
            size="small"
            row-key="_key"
            default-expand-all
            :tree-props="{ children: 'children' }"
          >
            <el-table-column label="覆盖点" prop="label" min-width="300" />
            <el-table-column label="用例数" prop="total" width="80" />
            <el-table-column label="通过" width="80">
              <template #default="{ row }">
                <span style="color:#2e7d32;font-weight:600">{{ row.passed }}</span>
              </template>
            </el-table-column>
            <el-table-column label="失败" width="80">
              <template #default="{ row }">
                <span :style="row.failed > 0 ? 'color:#c62828;font-weight:600' : ''">{{ row.failed }}</span>
              </template>
            </el-table-column>
            <el-table-column label="通过率" width="80">
              <template #default="{ row }">
                <span :style="row.failed > 0 ? 'color:#c62828' : 'color:#2e7d32'">{{ row.passRate }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Tab: 过程台账 -->
        <el-tab-pane label="过程台账" name="ledger">
          <div v-if="logLoading" class="loading-tip">加载中...</div>
          <div v-else-if="processLog.length === 0" class="empty-tip">暂无执行过程记录（对话消息中未找到工具事件）</div>
          <div v-else class="ledger-timeline">
            <div v-for="(item, idx) in processLog" :key="idx" class="ledger-item">

              <!-- 里程碑：来自 stage_update 事件 -->
              <div v-if="item.type === 'milestone'" class="ledger-milestone" :class="`ms-${item.status}`">
                <span class="ms-icon">{{ { started: '▶', done: '✅', failed: '❌' }[item.status] || '○' }}</span>
                <span class="ms-stage">{{ item.stage }}</span>
                <span class="ms-badge" :class="`msbadge-${item.status}`">{{ { started: '进行中', done: '完成', failed: '失败' }[item.status] || item.status }}</span>
                <span v-if="item.detail" class="ms-detail">{{ item.detail }}</span>
                <span class="ledger-basis">依据：stage_update 阶段标记</span>
              </div>

              <!-- AI 叙述：来自 chunk 文本输出 -->
              <div v-else-if="item.type === 'narrative'" class="ledger-narrative">
                <div class="narrative-text">{{ item.content }}</div>
                <span class="ledger-basis">依据：AI 文本输出</span>
              </div>

              <!-- 工具调用：来自 tool_call + tool_result -->
              <div v-else-if="item.type === 'tool'" class="ledger-tool" :class="item.success ? '' : 'tool-failed'">
                <div class="tool-header" @click="toggleTool(idx)">
                  <span class="tool-icon">{{ item.success ? '⚙' : '⚠' }}</span>
                  <code class="tool-name">{{ item.name }}</code>
                  <span class="tool-status-badge" :class="item.success ? 'tbadge-ok' : 'tbadge-fail'">{{ item.success ? 'OK' : 'FAILED' }}</span>
                  <span class="ledger-basis">依据：工具调用 · {{ item.name }}</span>
                  <span class="tool-toggle">{{ expandedTools.has(idx) ? '▲' : '▼' }}</span>
                </div>
                <div v-if="expandedTools.has(idx)" class="tool-body">
                  <div v-if="item.input" class="tool-section">
                    <div class="tool-section-label">输入参数</div>
                    <pre class="tool-pre">{{ formatJson(item.input) }}</pre>
                  </div>
                  <div v-if="item.output" class="tool-section">
                    <div class="tool-section-label">执行结果</div>
                    <pre class="tool-pre">{{ truncate(formatJson(item.output), 1200) }}</pre>
                  </div>
                </div>
              </div>

              <!-- 执行进度快照：来自 test_progress 事件聚合 -->
              <div v-else-if="item.type === 'progress'" class="ledger-progress">
                <span class="progress-icon">📊</span>
                <span class="progress-label">执行进度快照</span>
                <span class="progress-stat stat-total">共 {{ item.total }} 条</span>
                <span class="progress-stat stat-pass">通过 {{ item.passed }}</span>
                <span class="progress-stat stat-fail">失败 {{ item.failed }}</span>
                <span class="ledger-basis">依据：test_progress 事件聚合（最终状态）</span>
              </div>

            </div>
          </div>
        </el-tab-pane>

        <!-- Tab: 关联缺陷 -->
        <el-tab-pane label="关联缺陷" name="defects">
          <div v-if="defectsLoading" class="loading-tip">加载中...</div>
          <div v-else-if="reportDefects.length === 0" class="empty-tip">暂无关联缺陷</div>
          <el-table v-else :data="reportDefects" size="small" stripe>
            <el-table-column label="严重度" width="80">
              <template #default="{ row }">
                <el-tag :type="severityType(row.severity)" size="small">{{ row.severity }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="defectStatusType(row.status)" size="small">{{ defectStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="200">
              <template #default="{ row }">
                <router-link :to="`/defects/${row.id}`" class="defect-link">{{ row.title }}</router-link>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="155">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Tab: 关联信息 -->
        <el-tab-pane label="关联信息" name="meta">
          <div v-if="metaLoading" class="loading-tip">加载中...</div>
          <div v-else class="meta-form">
            <!-- 报告名称 -->
            <div class="meta-row">
              <label>报告名称</label>
              <el-input v-model="editName" size="small" style="width:300px" />
              <el-button size="small" type="primary" @click="saveName" :loading="saving">保存</el-button>
            </div>
            <!-- 关联对话 -->
            <div class="meta-row">
              <label>来源对话</label>
              <span class="meta-value">{{ report.conversation?.title || report.conversationId }}</span>
              <el-button size="small" link @click="goToConversation" style="margin-left:8px">查看对话 →</el-button>
            </div>
            <!-- 保存时间 -->
            <div class="meta-row">
              <label>保存时间</label>
              <span class="meta-value">{{ formatTime(report.createdAt) }}</span>
            </div>
            <!-- 首次对话输入 -->
            <div v-if="firstUserMessage" class="meta-section">
              <div class="meta-section-title">首次对话输入</div>
              <pre class="meta-message-preview">{{ firstUserMessage }}</pre>
            </div>
            <!-- 上传的业务文档 -->
            <div class="meta-section">
              <div class="meta-section-title">业务文档
                <span class="meta-section-hint">（对话中上传，影响用例生成）</span>
              </div>
              <div v-if="conversationUploads.length === 0" class="meta-empty">本对话暂无上传文档</div>
              <div v-else class="doc-chip-list">
                <el-tag v-for="f in conversationUploads" :key="f" type="info" size="small">{{ f }}</el-tag>
              </div>
            </div>
            <!-- 手动补充关联文档（供用户修改） -->
            <div class="meta-section">
              <div class="meta-section-title">补充关联文档
                <span class="meta-section-hint">（如需调整，在此修改并保存）</span>
              </div>
              <div class="doc-chip-list" style="margin-bottom:8px">
                <el-tag v-for="(doc, i) in editDocs" :key="i" closable @close="removeDoc(i)" size="small">{{ doc }}</el-tag>
              </div>
              <div class="doc-add-row">
                <el-input v-model="newDoc" size="small" placeholder="添加文档名..." style="width:220px" @keydown.enter="addDoc" />
                <el-button size="small" @click="addDoc">添加</el-button>
                <el-button size="small" type="primary" @click="saveDocs" :loading="saving">保存</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </div>

    <!-- Case Detail Drawer -->
    <el-drawer v-model="showCaseDrawer" title="用例执行详情" size="520px" direction="rtl">
      <div v-if="selectedCase" class="case-drawer">
        <div class="drawer-row">
          <span class="dr-label">状态</span>
          <span class="status-badge" :class="statusBadgeClass(selectedCase.status)">{{ selectedCase.status }}</span>
        </div>
        <div class="drawer-row"><span class="dr-label">用例ID</span><code>{{ selectedCase.id }}</code></div>
        <div class="drawer-row"><span class="dr-label">名称</span>{{ selectedCase.name }}</div>
        <div class="drawer-row"><span class="dr-label">分类</span>{{ selectedCase.category }}</div>
        <div class="drawer-row"><span class="dr-label">优先级</span>{{ selectedCase.priority }}</div>
        <div class="drawer-row"><span class="dr-label">覆盖点</span>{{ selectedCase.coverage_point || '—' }}</div>
        <div class="drawer-row"><span class="dr-label">HTTP状态</span>{{ selectedCase.http_status ?? '-' }}</div>
        <div class="drawer-row"><span class="dr-label">耗时</span>{{ selectedCase.duration_ms }}ms</div>
        <div v-if="selectedCase.error" class="drawer-error">⚠ {{ selectedCase.error }}</div>
        <div v-if="selectedCase.db_setup_summary" class="drawer-block">
          <div class="block-title">🗄 埋数（DB 前置）</div>
          <pre class="block-pre">{{ selectedCase.db_setup_summary }}</pre>
        </div>
        <div v-if="selectedCase.request_body" class="drawer-block">
          <div class="block-title">📤 请求报文 <span class="block-url">{{ selectedCase.request_url }}</span></div>
          <pre class="block-pre">{{ selectedCase.request_body }}</pre>
        </div>
        <div v-if="selectedCase.response_body" class="drawer-block">
          <div class="block-title">📥 应答报文</div>
          <pre class="block-pre">{{ selectedCase.response_body }}</pre>
        </div>
        <div v-if="selectedCase.assertions?.length" class="drawer-block">
          <div class="block-title">✔ 检查点断言</div>
          <div v-for="a in selectedCase.assertions" :key="a.path" class="assert-row" :class="a.passed ? 'assert-pass' : 'assert-fail'">
            <span class="assert-icon">{{ a.passed ? '✓' : '✗' }}</span>
            <span class="assert-desc">{{ a.desc || a.path }}</span>
            <span class="assert-detail">期望 <code>{{ a.expected }}</code> · 实际 <code>{{ a.actual ?? 'null' }}</code></span>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- Pre-import Confirmation Dialog -->
    <el-dialog v-model="showImportConfirm" title="确认入库" width="520px">
      <div class="import-confirm-body">
        <div class="confirm-hint">以下为本轮测试关联的对话上下文，请确认后再入库。</div>

        <div class="confirm-section-title">关联业务文档</div>
        <div v-if="conversationUploads.length > 0" class="doc-chip-list">
          <el-tag v-for="f in conversationUploads" :key="f" type="info" size="small">{{ f }}</el-tag>
        </div>
        <div v-else-if="editDocs.length > 0" class="doc-chip-list">
          <el-tag v-for="d in editDocs" :key="d" size="small">{{ d }}</el-tag>
        </div>
        <div v-else class="confirm-warn">⚠ 未检测到关联业务文档，建议前往「关联信息」补充后再入库。</div>

        <div class="confirm-section-title" style="margin-top:14px">首次对话输入</div>
        <pre v-if="firstUserMessage" class="confirm-message-preview">{{ firstUserMessage }}</pre>
        <div v-else class="confirm-empty">暂无记录</div>

        <div class="confirm-stats">将入库 <strong>{{ selectedCases.length || execResults.length }}</strong> 条用例（草稿状态）</div>
      </div>
      <template #footer>
        <el-button @click="showImportConfirm = false">取消</el-button>
        <el-button type="success" @click="confirmImport" :loading="importing">确认入库</el-button>
      </template>
    </el-dialog>

    <!-- Create Defect Dialog -->
    <el-dialog v-model="showDefectDialog" title="创建缺陷" width="560px">
      <el-form :model="defectForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="defectForm.title" />
        </el-form-item>
        <el-form-item label="严重级别">
          <el-select v-model="defectForm.severity" style="width:100%">
            <el-option v-for="s in ['P0','P1','P2','P3']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="defectForm.description" type="textarea" :rows="3" placeholder="补充问题描述..." />
        </el-form-item>
        <el-form-item v-if="execLogText" label="执行日志">
          <pre class="defect-exec-log">{{ execLogText }}</pre>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDefectDialog = false">取消</el-button>
        <el-button type="primary" @click="submitDefect" :loading="creatingDefect">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownViewer from '../components/MarkdownViewer.vue'

const route = useRoute()
const router = useRouter()

const report = ref(null)
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const editName = ref('')
const editDocs = ref([])
const newDoc = ref('')
const activeTab = ref('results')
const initialTabSet = ref(false)

const showCaseDrawer = ref(false)
const selectedCase = ref(null)
const selectedCases = ref([])
const showDefectDialog = ref(false)
const creatingDefect = ref(false)
const defectForm = ref({ title: '', severity: 'P2', description: '' })
const currentDefectRow = ref(null)
const showFailedOnly = ref(false)
const reportDefects = ref([])
const defectsLoading = ref(false)
const conversationUploads = ref([])   // files uploaded to the conversation (from disk)
const firstUserMessage = ref('')      // first user message text
const metaLoading = ref(false)
const showImportConfirm = ref(false)  // pre-import confirmation dialog

// 过程台账
const processLog = ref([])
const logLoading = ref(false)
const logFetched = ref(false)
const expandedTools = ref(new Set())

// ── Derived data ──────────────────────────────────────────

const execResults = computed(() => {
  const d = report.value?.executionResults
  return Array.isArray(d) ? d : []
})

const testCasesData = computed(() => {
  const d = report.value?.testCasesData
  return Array.isArray(d) ? d : []
})

const filteredResults = computed(() =>
  showFailedOnly.value ? execResults.value.filter(r => r.status !== 'PASSED') : execResults.value
)

const passedCount = computed(() => execResults.value.filter(r => r.status === 'PASSED').length)
const failedCount = computed(() => execResults.value.filter(r => r.status === 'FAILED').length)
const errorCount  = computed(() => execResults.value.filter(r => r.status === 'ERROR').length)
const failedCases = computed(() => execResults.value.filter(r => r.status !== 'PASSED'))

const passRate = computed(() => {
  const total = execResults.value.length
  if (!total) return '0%'
  return `${((passedCount.value / total) * 100).toFixed(1)}%`
})

const passRateClass = computed(() => {
  const v = parseFloat(passRate.value)
  if (v >= 100) return 'fill-green'
  if (v >= 80)  return 'fill-blue'
  if (v >= 60)  return 'fill-orange'
  return 'fill-red'
})

const totalDuration = computed(() => {
  const ms = execResults.value.reduce((s, r) => s + (r.duration_ms || 0), 0)
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
})

const bannerClass = computed(() => {
  const p0 = execResults.value.filter(r => r.status !== 'PASSED' && r.priority === 'P0').length
  const p1 = execResults.value.filter(r => r.status !== 'PASSED' && r.priority === 'P1').length
  if (p0 > 0) return 'banner-danger'
  if (p1 > 0) return 'banner-warning'
  if (failedCount.value > 0) return 'banner-info'
  return 'banner-success'
})

const bannerIcon = computed(() => {
  if (bannerClass.value === 'banner-danger') return '❌'
  if (bannerClass.value === 'banner-warning') return '⚠️'
  if (bannerClass.value === 'banner-info') return 'ℹ️'
  return '✅'
})

// Build a tree from coverage_point paths (split by '/')
// Each node aggregates counts from all its descendants
const coverageTree = computed(() => {
  // nodeMap: pathKey → { label, _key, total, passed, failed, _childMap }
  const rootMap = new Map()

  for (const r of execResults.value) {
    const raw = r.coverage_point?.trim() || '（未标注）'
    const parts = raw === '（未标注）' ? ['（未标注）'] : raw.split('/').map(s => s.trim()).filter(Boolean)

    let currentMap = rootMap
    let currentPath = ''
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      if (!currentMap.has(part)) {
        currentMap.set(part, { label: part, _key: currentPath, total: 0, passed: 0, failed: 0, _childMap: new Map() })
      }
      const node = currentMap.get(part)
      node.total++
      if (r.status === 'PASSED') node.passed++
      else node.failed++
      currentMap = node._childMap
    }
  }

  function toArray(map) {
    return [...map.values()]
      .sort((a, b) => b.failed - a.failed || b.total - a.total)
      .map(({ label, _key, total, passed, failed, _childMap }) => {
        const children = toArray(_childMap)
        return {
          label, _key, total, passed, failed,
          passRate: total ? `${((passed / total) * 100).toFixed(0)}%` : '0%',
          ...(children.length ? { children } : {}),
        }
      })
  }

  return toArray(rootMap)
})


// Build execution log text for the defect dialog
const execLogText = computed(() => {
  const r = currentDefectRow.value
  if (!r) return ''
  const lines = []
  if (r.request_url) lines.push(`请求: ${r.request_url}`)
  if (r.http_status) lines.push(`HTTP状态: ${r.http_status}  耗时: ${r.duration_ms}ms`)
  if (r.db_setup_summary) lines.push(`\n[埋数前置]\n${r.db_setup_summary}`)
  if (r.request_body) lines.push(`\n[请求体]\n${typeof r.request_body === 'string' ? r.request_body : JSON.stringify(r.request_body, null, 2)}`)
  if (r.response_body) lines.push(`\n[响应体]\n${typeof r.response_body === 'string' ? r.response_body : JSON.stringify(r.response_body, null, 2)}`)
  const failed = (r.assertions || []).filter(a => !a.passed)
  if (failed.length) {
    lines.push('\n[断言失败]')
    failed.forEach(a => lines.push(`✗ ${a.desc || a.path}: 期望 ${a.expected}，实际 ${a.actual ?? 'null'}`))
  }
  if (r.error) lines.push(`\n[错误]\n${r.error}`)
  return lines.join('\n')
})

// ── Labels / helpers ──────────────────────────────────────

const DEFECT_STATUS_LABELS = { open: '待处理', in_progress: '处理中', resolved: '已解决', closed: '已关闭', wontfix: '不修复' }
const DEFECT_STATUS_TYPES  = { open: 'danger', in_progress: 'warning', resolved: 'success', closed: 'info', wontfix: 'info' }
const SEVERITY_TYPES = { P0: 'danger', P1: 'warning', P2: '', P3: 'info' }

function defectStatusLabel(s) { return DEFECT_STATUS_LABELS[s] || s }
function defectStatusType(s) { return DEFECT_STATUS_TYPES[s] || 'info' }
function severityType(s) { return SEVERITY_TYPES[s] ?? '' }

const MODE_LABELS = { systematic: '系统化', regression: '回归', exploratory: '探索' }
const MODE_TYPES  = { systematic: 'primary', regression: 'success', exploratory: 'warning' }
const STATUS_LABELS = { DRAFT: '草稿', PENDING_REVIEW: '待审核', APPROVED: '已审批', BASELINE: '基线', DEPRECATED: '已废弃' }
const STATUS_TYPES  = { DRAFT: 'info', PENDING_REVIEW: 'warning', APPROVED: 'success', BASELINE: 'primary', DEPRECATED: 'danger' }

function modeLabel(m) { return MODE_LABELS[m] || m || '-' }
function modeTagType(m) { return MODE_TYPES[m] || 'info' }
function statusLabel(s) { return STATUS_LABELS[s] || s }
function statusTagType(s) { return STATUS_TYPES[s] || 'info' }
function formatTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-' }
function statusBadgeClass(s) { return s === 'PASSED' ? 'badge-pass' : s === 'FAILED' ? 'badge-fail' : 'badge-error' }

function token() { return localStorage.getItem('access_token') }

// ── API calls ─────────────────────────────────────────────

async function fetchReport() {
  loading.value = true
  try {
    const res = await fetch(`/api/reports/${route.params.id}`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) {
      report.value = data.data
      editName.value = data.data.name
      editDocs.value = [...(data.data.uploadedDocs || [])]
      if (!initialTabSet.value) {
        initialTabSet.value = true
        activeTab.value = data.data.summaryReport ? 'summary' : 'results'
      }
    }
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

async function saveName() {
  if (!editName.value.trim()) return
  saving.value = true
  try {
    const res = await fetch(`/api/reports/${route.params.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.value }),
    })
    const data = await res.json()
    if (data.success) { report.value.name = data.data.name; ElMessage.success('已保存') }
  } finally { saving.value = false }
}

async function saveDocs() {
  saving.value = true
  try {
    const res = await fetch(`/api/reports/${route.params.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadedDocs: editDocs.value }),
    })
    const data = await res.json()
    if (data.success) { report.value.uploadedDocs = data.data.uploadedDocs; ElMessage.success('关联已保存') }
  } finally { saving.value = false }
}

function addDoc() { if (newDoc.value.trim()) { editDocs.value.push(newDoc.value.trim()); newDoc.value = '' } }
function removeDoc(i) { editDocs.value.splice(i, 1) }

async function importCases() {
  const isPartial = selectedCases.value.length > 0 && selectedCases.value.length < execResults.value.length
  const count = isPartial ? selectedCases.value.length : execResults.value.length
  const label = isPartial ? `所选 ${count} 条` : `全部 ${count} 条`
  try {
    await ElMessageBox.confirm(`将「${report.value.name}」中的 ${label} 用例以草稿状态导入用例库？`, '确认入库', { type: 'info' })
  } catch { return }
  importing.value = true
  try {
    const body = isPartial ? { caseIds: selectedCases.value.map(c => c.id) } : {}
    const res = await fetch(`/api/reports/${route.params.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      const failed = data.data.failed?.length ?? 0
      ElMessage[failed > 0 ? 'warning' : 'success'](
        failed > 0 ? `已导入 ${data.data.imported} 条，${failed} 条失败` : `已导入 ${data.data.imported} 条用例`
      )
      selectedCases.value = []
      await fetchReport()
    } else { ElMessage.error(data.error || '入库失败') }
  } catch { ElMessage.error('请求失败') }
  finally { importing.value = false }
}

function onSelectionChange(rows) { selectedCases.value = rows }

function openCaseDetail(row) { selectedCase.value = row; showCaseDrawer.value = true }

function openCreateDefect(tc) {
  currentDefectRow.value = tc
  defectForm.value = {
    title: `[${tc.id}] ${tc.name || ''} 失败`,
    severity: 'P2',
    description: `测试用例 ${tc.id} 执行失败，覆盖点：${tc.coverage_point || '（未标注）'}`,
  }
  showDefectDialog.value = true
}

async function submitDefect() {
  if (!defectForm.value.title.trim()) { ElMessage.warning('请输入标题'); return }
  creatingDefect.value = true
  try {
    // Match testCaseId from imported test cases by caseCode (e.g. "TC_MODEL001_S01")
    const rowId = currentDefectRow.value?.id
    const matched = rowId
      ? (report.value?.testCases || []).find(tc => tc.group?.caseCode === rowId)
      : null

    // Combine user description + execution log with a separator
    const log = execLogText.value
    const fullDescription = log
      ? `${defectForm.value.description}\n\n## 执行日志\n${log}`
      : defectForm.value.description

    const res = await fetch('/api/defects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: defectForm.value.title,
        severity: defectForm.value.severity,
        description: fullDescription,
        reportId: route.params.id,
        conversationId: report.value?.conversationId,
        ...(matched ? { testCaseId: matched.id } : {}),
      }),
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('缺陷已创建')
      showDefectDialog.value = false
      fetchDefects()
    } else ElMessage.error(data.error || '创建失败')
  } catch { ElMessage.error('请求失败') }
  finally { creatingDefect.value = false }
}

// ── 过程台账 ──────────────────────────────────────────────

function toggleTool(idx) {
  const s = new Set(expandedTools.value)
  s.has(idx) ? s.delete(idx) : s.add(idx)
  expandedTools.value = s
}

function formatJson(val) {
  if (typeof val === 'string') {
    try { return JSON.stringify(JSON.parse(val), null, 2) } catch { return val }
  }
  return JSON.stringify(val, null, 2)
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '\n…（内容过长，已截断）' : str
}

function buildTimeline(messages) {
  const items = []
  let latestProgress = null

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue
    const events = msg.metadata?.events ?? []
    const pendingCalls = {}
    let chunkParts = []

    const flushChunk = () => {
      const text = chunkParts.join('').trim()
      if (text) items.push({ type: 'narrative', content: text })
      chunkParts = []
    }

    for (const evt of events) {
      if (evt.type === 'chunk') {
        chunkParts.push(evt.content ?? '')
        continue
      }
      flushChunk()

      if (evt.type === 'stage_update') {
        items.push({ type: 'milestone', stage: evt.stage, status: evt.status, detail: evt.detail })
      } else if (evt.type === 'tool_call') {
        pendingCalls[evt.id] = { name: evt.name, input: evt.input }
      } else if (evt.type === 'tool_result') {
        const call = pendingCalls[evt.id] ?? {}
        const item = {
          type: 'tool',
          name: evt.name ?? call.name,
          input: call.input,
          output: evt.output,
          success: evt.success !== false,
        }
        items.push(item)
        delete pendingCalls[evt.id]
      } else if (evt.type === 'test_progress') {
        latestProgress = evt
      }
    }
    flushChunk()
  }

  // Insert progress summary card after the last run_test_suite tool result
  if (latestProgress) {
    // Find last run_test_suite tool index and insert after it
    let insertIdx = items.length
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].type === 'tool' && items[i].name === 'run_test_suite') {
        insertIdx = i + 1
        break
      }
    }
    items.splice(insertIdx, 0, {
      type: 'progress',
      total: latestProgress.total,
      passed: latestProgress.passed,
      failed: latestProgress.failed,
    })
  }

  // Auto-expand failed tool calls
  const autoExpand = new Set()
  items.forEach((item, idx) => { if (item.type === 'tool' && !item.success) autoExpand.add(idx) })
  expandedTools.value = autoExpand

  return items
}

async function fetchProcessLog() {
  if (logFetched.value) return
  const convId = report.value?.conversationId
  if (!convId) return
  logLoading.value = true
  try {
    const res = await fetch(`/api/conversations/${convId}/messages?limit=20&offset=0`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    const messages = Array.isArray(data) ? data : (data.data ?? [])
    processLog.value = buildTimeline(messages)
    logFetched.value = true
  } catch { /* non-fatal */ }
  finally { logLoading.value = false }
}

watch(activeTab, (tab) => { if (tab === 'ledger') fetchProcessLog() })

// Fetch uploaded files + first user message for the linked conversation
async function fetchConversationMeta() {
  const convId = report.value?.conversationId
  if (!convId) return
  metaLoading.value = true
  try {
    const [uploadsRes, messagesRes] = await Promise.all([
      fetch(`/api/conversations/${convId}/uploads`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/conversations/${convId}/messages?limit=5&offset=0`, { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const uploadsData = await uploadsRes.json()
    if (uploadsData.success) conversationUploads.value = uploadsData.data ?? []

    const messagesData = await messagesRes.json()
    // listMessages returns the array directly (no success/data wrapper)
    const messages = Array.isArray(messagesData) ? messagesData : (messagesData.data ?? [])
    const firstUser = messages.find(m => m.role === 'user')
    if (firstUser) {
      const raw = typeof firstUser.content === 'string' ? firstUser.content : JSON.stringify(firstUser.content)
      // Strip [SYSTEM CONTEXT]...[/SYSTEM CONTEXT] injected by chat.service
      firstUserMessage.value = raw.replace(/\[SYSTEM CONTEXT\][\s\S]*?\[\/SYSTEM CONTEXT\]\s*/g, '').trim().slice(0, 500)
    }
  } catch { /* non-fatal */ }
  finally { metaLoading.value = false }
}

function goToConversation() {
  const convId = report.value?.conversationId
  if (convId) router.push({ path: '/', query: { conv: convId } })
}

function openImportConfirm() {
  showImportConfirm.value = true
}

async function confirmImport() {
  showImportConfirm.value = false
  await importCases()
}

async function fetchDefects() {
  defectsLoading.value = true
  try {
    const res = await fetch(`/api/defects?reportId=${route.params.id}&pageSize=100`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) reportDefects.value = data.data?.items ?? data.data ?? []
  } catch { /* non-fatal */ }
  finally { defectsLoading.value = false }
}

onMounted(async () => {
  await fetchReport()
  fetchDefects()
  fetchConversationMeta()
})
</script>

<style scoped>
.report-detail { height: 100%; display: flex; flex-direction: column; padding: 20px 24px; background: var(--main-bg); color: var(--text-primary); overflow-y: auto; }

/* Header */
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.header-info { display: flex; align-items: center; flex: 1; }
.report-name { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.header-meta { font-size: 12px; color: var(--text-secondary); margin-left: auto; }

/* Recommendation banner */
.recommendation-banner { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px; border-radius: 8px; margin-bottom: 18px; }
.banner-success { background: #e8f5e9; border-left: 4px solid #2e7d32; }
.banner-info    { background: #e3f2fd; border-left: 4px solid #1565c0; }
.banner-warning { background: #fff8e1; border-left: 4px solid #f57f17; }
.banner-danger  { background: #ffebee; border-left: 4px solid #c62828; }
.banner-icon { font-size: 22px; line-height: 1; }
.banner-title { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.banner-text { font-size: 14px; color: #333; white-space: pre-line; line-height: 1.6; }

/* Metrics */
.metrics-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 10px; }
.metric-card { background: var(--sidebar-bg); border-radius: 8px; padding: 16px; text-align: center; }
.metric-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.metric-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.metric-card.pass .metric-value { color: #2e7d32; }
.metric-card.fail .metric-value { color: #c62828; }
.metric-card.error .metric-value { color: #e65100; }
.metric-card.rate .metric-value { color: #1565c0; }
.metric-card.dur .metric-value { font-size: 20px; color: #555; }

.progress-bar { height: 6px; background: #e0e0e0; border-radius: 3px; margin-bottom: 20px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
.fill-green  { background: linear-gradient(90deg, #2e7d32, #66bb6a); }
.fill-blue   { background: linear-gradient(90deg, #1565c0, #42a5f5); }
.fill-orange { background: linear-gradient(90deg, #e65100, #ffa726); }
.fill-red    { background: linear-gradient(90deg, #c62828, #ef5350); }

/* Tabs */
.detail-tabs { flex: 1; }

/* Failed summary */
.failed-summary { background: #fff8f8; border: 1px solid #ffcdd2; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; }
.failed-summary-title { font-size: 13px; font-weight: 600; color: #c62828; margin-bottom: 10px; }
.failed-item { margin-bottom: 8px; font-size: 13px; }
.failed-id { font-family: monospace; font-size: 12px; color: #555; margin: 0 6px; }
.failed-name { color: #333; }
.failed-error { color: #c62828; font-size: 12px; }
.failed-assertions { margin-top: 4px; padding-left: 20px; }
.failed-assert-item { display: block; font-size: 12px; color: #c62828; margin-bottom: 2px; }

/* Badges */
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.badge-pass  { background: #e8f5e9; color: #2e7d32; }
.badge-fail  { background: #ffebee; color: #c62828; }
.badge-error { background: #fff3e0; color: #e65100; }
.priority-badge { display: inline-block; padding: 1px 7px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.p-p0 { background: #fce4ec; color: #c62828; }
.p-p1 { background: #fff3e0; color: #e65100; }
.p-p2 { background: #e3f2fd; color: #1565c0; }
.p-p3 { background: #f3e5f5; color: #7b1fa2; }

/* Case table */
.cases-table-wrap { overflow: hidden; }

/* Import section */
.import-section { display: flex; align-items: center; gap: 16px; padding: 14px 0 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; }
.import-tip { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.import-done-tip { font-size: 14px; color: #2e7d32; padding: 12px 0; }
.import-section-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
.imported-list { margin-top: 8px; }
.imported-case { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; border-bottom: 1px solid var(--border-color); }
.case-link { color: #5b9bd5; text-decoration: none; }
.case-link:hover { text-decoration: underline; }

/* Meta form */
.meta-form { padding: 8px 0; max-width: 680px; }
.meta-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 13px; }
.meta-row label { color: var(--text-secondary); width: 80px; flex-shrink: 0; }
.meta-value { color: var(--text-primary); font-size: 13px; }
.meta-section { margin-bottom: 20px; }
.meta-section-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; }
.meta-section-hint { font-weight: 400; font-size: 11px; color: #aaa; margin-left: 6px; text-transform: none; letter-spacing: 0; }
.meta-message-preview { background: #f5f6fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 12px; font-family: inherit; font-size: 13px; color: #444; white-space: pre-wrap; word-break: break-all; max-height: 140px; overflow-y: auto; margin: 0; }
.meta-empty { color: var(--text-secondary); font-size: 13px; font-style: italic; }
.doc-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.doc-add-row { display: flex; gap: 8px; align-items: center; }

/* Import confirm dialog */
.import-confirm-body { font-size: 13px; }
.confirm-hint { color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6; }
.confirm-section-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
.confirm-warn { color: #e65100; font-size: 13px; }
.confirm-empty { color: var(--text-secondary); font-size: 13px; font-style: italic; }
.confirm-message-preview { background: #f5f6fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px 12px; font-family: inherit; font-size: 12px; color: #444; white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; margin: 0; }
.confirm-stats { margin-top: 16px; padding: 10px 14px; background: #e8f5e9; border-radius: 6px; color: #2e7d32; font-size: 13px; }

/* Table toolbar */
.table-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }

/* Analysis section */
.analysis-section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }

/* Defect link */
.defect-link { color: #5b9bd5; text-decoration: none; }
.defect-link:hover { text-decoration: underline; }
.empty-tip { color: var(--text-secondary); text-align: center; padding: 48px; }
.summary-report-wrap { padding: 8px 4px; max-width: 860px; }

/* Loading */
.loading-tip { color: var(--text-secondary); text-align: center; padding: 48px; }

/* Case Drawer */
.case-drawer { padding: 4px; }
.drawer-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; }
.dr-label { color: var(--text-secondary); width: 70px; flex-shrink: 0; }
.drawer-error { color: #c62828; background: #ffebee; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; }
.drawer-block { margin-bottom: 14px; }
.block-title { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; }
.block-url { font-weight: 400; color: #888; font-family: monospace; font-size: 11px; margin-left: 6px; }
.block-pre { background: #f5f6fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 12px; font-family: monospace; font-size: 12px; color: #333; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 180px; overflow-y: auto; }

/* Assertions */
.assert-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; flex-wrap: wrap; }
.assert-row:last-child { border-bottom: none; }
.assert-pass .assert-icon { color: #2e7d32; font-weight: 700; }
.assert-fail .assert-icon { color: #c62828; font-weight: 700; }
.assert-desc { font-weight: 500; min-width: 120px; }
.assert-detail { color: #666; font-size: 12px; }
code { background: #f0f0f0; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 12px; }

/* ── 过程台账 ─────────────────────────── */
.ledger-timeline { display: flex; flex-direction: column; gap: 0; max-width: 800px; padding-bottom: 24px; }
.ledger-item { position: relative; padding-left: 20px; }
.ledger-item::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--border-color); }
.ledger-item:last-child::before { display: none; }

/* 依据标签 */
.ledger-basis { display: inline-block; font-size: 10px; color: #aaa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1px 7px; margin-left: 10px; white-space: nowrap; vertical-align: middle; }

/* 里程碑 */
.ledger-milestone { display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin: 6px 0; border-radius: 6px; font-size: 13px; font-weight: 600; background: var(--sidebar-bg); border-left: 3px solid #bbb; flex-wrap: wrap; }
.ledger-milestone.ms-done { border-left-color: #2e7d32; }
.ledger-milestone.ms-started { border-left-color: #1565c0; }
.ledger-milestone.ms-failed { border-left-color: #c62828; }
.ms-icon { font-size: 14px; }
.ms-stage { color: var(--text-primary); }
.ms-badge { font-size: 11px; font-weight: 400; padding: 1px 8px; border-radius: 10px; }
.msbadge-done { background: #e8f5e9; color: #2e7d32; }
.msbadge-started { background: #e3f2fd; color: #1565c0; }
.msbadge-failed { background: #ffebee; color: #c62828; }
.ms-detail { font-size: 12px; font-weight: 400; color: var(--text-secondary); }

/* AI 叙述 */
.ledger-narrative { padding: 8px 12px; margin: 4px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap; border-left: 2px solid transparent; }
.narrative-text { margin-bottom: 4px; }

/* 工具调用 */
.ledger-tool { margin: 6px 0; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; }
.ledger-tool.tool-failed { border-color: #ffcdd2; }
.tool-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; user-select: none; background: var(--sidebar-bg); font-size: 13px; flex-wrap: wrap; }
.tool-header:hover { background: var(--border-color); }
.tool-icon { font-size: 14px; }
.tool-name { font-family: monospace; font-size: 12px; color: #555; background: #f0f0f0; padding: 1px 6px; border-radius: 4px; }
.tool-status-badge { font-size: 11px; padding: 1px 8px; border-radius: 10px; }
.tbadge-ok { background: #e8f5e9; color: #2e7d32; }
.tbadge-fail { background: #ffebee; color: #c62828; }
.tool-toggle { margin-left: auto; font-size: 10px; color: #aaa; }
.tool-body { padding: 10px 12px; background: #fafafa; border-top: 1px solid var(--border-color); }
.tool-section { margin-bottom: 10px; }
.tool-section:last-child { margin-bottom: 0; }
.tool-section-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
.tool-pre { background: #f0f1f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px 10px; font-family: monospace; font-size: 11px; color: #333; white-space: pre-wrap; word-break: break-all; max-height: 220px; overflow-y: auto; margin: 0; }

/* 进度快照 */
.ledger-progress { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin: 6px 0; background: #e3f2fd; border-radius: 6px; font-size: 13px; flex-wrap: wrap; }
.progress-icon { font-size: 14px; }
.progress-label { font-weight: 600; color: #1565c0; }
.progress-stat { padding: 1px 10px; border-radius: 10px; font-size: 12px; }
.stat-total { background: #e0e0e0; color: #333; }
.stat-pass { background: #e8f5e9; color: #2e7d32; }
.stat-fail { background: #ffebee; color: #c62828; }

/* Defect dialog exec log */
.defect-exec-log { background: #f5f6fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 12px; font-family: monospace; font-size: 11px; color: #444; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; margin: 0; width: 100%; box-sizing: border-box; }
</style>
