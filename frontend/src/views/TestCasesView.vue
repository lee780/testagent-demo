<template>
  <div class="tc-view">
    <!-- 顶部 -->
    <div class="tc-header">
      <h1 class="page-title">用例库</h1>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" @click="showRecommend = !showRecommend" title="基于大模型语义理解，输入变更描述后自动从基线用例库中找出最相关的用例，用于精准回归验证">🤖 AI 推荐回归用例</button>
        <button class="btn-primary" @click="showCreateDialog = true">+ 新建用例</button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div v-for="s in statCards" :key="s.key" class="stat-card" @click="filterStatus = s.key; loadCases()">
        <div class="stat-num" :style="{ color: s.color }">{{ stats[s.key] || 0 }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- AI 推荐面板 -->
    <div v-if="showRecommend" class="recommend-panel">
      <div class="recommend-header">
        <h3 class="recommend-title">🤖 AI 推荐回归用例</h3>
        <button class="btn-close" @click="showRecommend = false">✕</button>
      </div>
      <div class="recommend-how">
        <span class="recommend-how-icon">✦</span>
        <span>大模型语义推荐，而非关键字检索 —— 综合分析<strong>变更描述语义</strong>、用例的<strong>覆盖点</strong>、<strong>来源对话</strong>及<strong>历史报告</strong>等多维关联数据，理解"影响了哪些业务场景"，再从基线用例库中找出最相关的回归候选用例，并给出推荐理由。</span>
      </div>
      <div class="recommend-input-row">
        <textarea v-model="recommendDesc" class="recommend-textarea" rows="2" placeholder="描述本次变更内容，例如：修改了用户等级3的授信额度计算系数..."></textarea>
        <button class="btn-primary" :disabled="!recommendDesc.trim() || recommending" @click="doRecommend">
          {{ recommending ? '分析中...' : '推荐' }}
        </button>
      </div>
      <div v-if="recommendResults.length > 0" class="recommend-results">
        <div class="recommend-results-header">
          <span class="recommend-results-title">推荐结果（按关联度排序）：</span>
          <button class="btn-primary" :disabled="selectedCaseCodes.length === 0" @click="runRegression" style="font-size:13px;padding:5px 14px">
            🔒 一键执行回归（已选 {{ selectedCaseCodes.length }} 条）
          </button>
        </div>
        <div v-for="r in recommendResults" :key="r.testCase.id" class="recommend-item" @click="openDetail(r.testCase.id)">
          <input type="checkbox" :value="r.testCase.group?.caseCode" v-model="selectedCaseCodes" @click.stop style="flex-shrink:0;cursor:pointer" />
          <div class="recommend-item-left">
            <span class="recommend-score" :style="{ color: scoreColor(r.score) }">{{ r.score }}%</span>
            <div>
              <div class="recommend-item-title">{{ r.testCase.title }}</div>
              <div class="recommend-item-reason"><span class="reason-label">推荐理由：</span>{{ r.reason }}</div>
            </div>
          </div>
          <span class="recommend-item-code">{{ r.testCase.group?.caseCode }}</span>
        </div>
      </div>
      <div v-else-if="recommendDone" class="recommend-empty">未找到相关基线用例</div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <input v-model="searchQuery" class="search-input" placeholder="搜索用例标题/覆盖点..." @keydown.enter="loadCases" />
      <input v-model="filterModel" class="search-input model-input" placeholder="业务模型 ID（如 MODEL001）" @keydown.enter="loadCases" />
      <select v-model="filterStatus" class="filter-select" @change="loadCases">
        <option value="">全部状态</option>
        <option value="DRAFT">草稿</option>
        <option value="PENDING_REVIEW">待审核</option>
        <option value="APPROVED">已审批</option>
        <option value="BASELINE">基线</option>
        <option value="DEPRECATED">已废弃</option>
      </select>
      <button class="btn-secondary" @click="loadCases">刷新</button>
    </div>

    <!-- 表格 -->
    <div class="tc-table-wrap">
      <div v-if="loading" class="empty-state">加载中...</div>
      <div v-else-if="cases.length === 0" class="empty-state">暂无用例</div>
      <table v-else class="tc-table">
        <thead>
          <tr>
            <th>用例编号</th>
            <th>标题</th>
            <th>覆盖点</th>
            <th>优先级</th>
            <th>状态</th>
            <th>版本</th>
            <th>创建人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tc in cases" :key="tc.id" class="tc-row" @click="openDetail(tc.id)">
            <td class="code-cell">{{ tc.group?.caseCode }}</td>
            <td class="title-cell">{{ tc.title }}</td>
            <td class="secondary-cell">{{ tc.coveragePoint || '—' }}</td>
            <td><span :class="['pri-badge', 'pri-' + tc.priority.toLowerCase()]">{{ tc.priority }}</span></td>
            <td><span :class="['status-badge', statusClass(tc.status)]">{{ statusLabel(tc.status) }}</span></td>
            <td class="secondary-cell">v{{ tc.version }}</td>
            <td class="secondary-cell">{{ tc.creator?.displayName || tc.creator?.username }}</td>
            <td @click.stop>
              <div class="action-btns">
                <button v-if="tc.status === 'DRAFT'" class="btn-action btn-submit" @click="submitForReview(tc.id)">提交审核</button>
                <button v-if="tc.status === 'PENDING_REVIEW'" class="btn-action btn-approve" @click="reviewCase(tc.id, 'approve')">通过</button>
                <button v-if="tc.status === 'PENDING_REVIEW'" class="btn-action btn-reject" @click="rejectCase(tc.id)">驳回</button>
                <button v-if="tc.status === 'APPROVED'" class="btn-action btn-baseline" @click="baselineCase(tc.id)">固化基线</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page === 1" @click="changePage(page - 1)" class="page-btn">上一页</button>
      <span class="page-info">第 {{ page }} 页 · 共 {{ total }} 条</span>
      <button :disabled="page * pageSize >= total" @click="changePage(page + 1)" class="page-btn">下一页</button>
    </div>

    <!-- 新建对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog">
        <h2 class="dialog-title">新建用例</h2>
        <form @submit.prevent="submitCreate">
          <div class="form-row">
            <div class="form-group">
              <label>业务模型 ID *</label>
              <input v-model="form.modelId" class="form-input" placeholder="如 MODEL001" required />
            </div>
            <div class="form-group">
              <label>用例编号 *</label>
              <input v-model="form.caseCode" class="form-input" placeholder="如 TC_MODEL001_S01" required />
            </div>
          </div>
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="form.title" class="form-input" placeholder="用例标题" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>覆盖点</label>
              <input v-model="form.coveragePoint" class="form-input" placeholder="等价类/用户等级/有效类/等级1" />
            </div>
            <div class="form-group">
              <label>优先级</label>
              <select v-model="form.priority" class="form-input">
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="form.notes" class="form-textarea" rows="2" placeholder="用例说明..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateDialog = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? '创建中...' : '创建' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 驳回意见对话框 -->
    <div v-if="rejectTarget" class="dialog-overlay" @click.self="rejectTarget = null">
      <div class="dialog-small">
        <h3>驳回意见</h3>
        <div class="form-group">
          <label>审核意见 *</label>
          <textarea v-model="rejectNote" class="form-textarea" rows="3" placeholder="请填写驳回原因..." required></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" @click="rejectTarget = null">取消</button>
          <button class="btn-primary" :disabled="!rejectNote.trim()" @click="confirmReject">确认驳回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()

const cases = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchQuery = ref('')
const filterModel = ref('')
const filterStatus = ref('')
const stats = ref({})
const showCreateDialog = ref(false)
const submitting = ref(false)
const rejectTarget = ref(null)
const rejectNote = ref('')

const form = ref({ modelId: '', caseCode: '', title: '', coveragePoint: '', priority: 'P2', notes: '' })

const showRecommend = ref(false)
const selectedCaseCodes = ref([])
const recommendDesc = ref('')
const recommending = ref(false)
const recommendResults = ref([])
const recommendDone = ref(false)

async function doRecommend() {
  recommending.value = true
  recommendDone.value = false
  recommendResults.value = []
  try {
    const body = { description: recommendDesc.value }
    if (filterModel.value) body.modelId = filterModel.value
    const res = await api.post('/testcases/recommend', body)
    recommendResults.value = res.data
    selectedCaseCodes.value = []
    recommendDone.value = true
  } catch (e) {
    console.error(e)
    alert('推荐失败：' + (e.response?.data?.message || e.message))
  } finally {
    recommending.value = false
  }
}

function runRegression() {
  if (selectedCaseCodes.value.length === 0) return
  const codeList = selectedCaseCodes.value.join(', ')
  sessionStorage.setItem('pendingRegression', JSON.stringify({
    message: `请对以下基线用例执行回归测试：\n用例编号：${codeList}\n\n系统已将基线 YAML 预加载到工作区 baseline/ 目录，请直接使用 run_test_suite 执行。`,
    mode: 'regression',
  }))
  router.push('/')
}

function scoreColor(score) {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#d97706'
  return '#6b7280'
}

const statCards = [
  { key: 'DRAFT', label: '草稿', color: '#6b7280' },
  { key: 'PENDING_REVIEW', label: '待审核', color: '#d97706' },
  { key: 'APPROVED', label: '已审批', color: '#2563eb' },
  { key: 'BASELINE', label: '基线', color: '#059669' },
]

async function loadStats() {
  try {
    const res = await api.get('/testcases/stats', { params: filterModel.value ? { modelId: filterModel.value } : {} })
    stats.value = res.data
  } catch (e) { console.error(e) }
}

async function loadCases() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterModel.value) params.modelId = filterModel.value
    if (filterStatus.value) params.status = filterStatus.value
    else params.latestOnly = 'true'
    const res = await api.get('/testcases', { params })
    cases.value = res.data.items
    total.value = res.data.total
  } catch (e) { console.error(e) } finally { loading.value = false }
}

function openDetail(id) { router.push(`/testcases/${id}`) }

async function submitForReview(id) {
  await api.post(`/testcases/${id}/submit`)
  loadCases(); loadStats()
}

async function reviewCase(id, action) {
  await api.post(`/testcases/${id}/review`, { action })
  loadCases(); loadStats()
}

function rejectCase(id) { rejectTarget.value = id; rejectNote.value = '' }

async function confirmReject() {
  await api.post(`/testcases/${rejectTarget.value}/review`, { action: 'reject', reviewNote: rejectNote.value })
  rejectTarget.value = null
  loadCases(); loadStats()
}

async function baselineCase(id) {
  if (!confirm('确认将此用例固化为基线？固化后将纳入回归集。')) return
  await api.post(`/testcases/${id}/baseline`)
  loadCases(); loadStats()
}

async function submitCreate() {
  submitting.value = true
  try {
    const body = { ...form.value }
    if (!body.coveragePoint) delete body.coveragePoint
    if (!body.notes) delete body.notes
    await api.post('/testcases', body)
    showCreateDialog.value = false
    form.value = { modelId: '', caseCode: '', title: '', coveragePoint: '', priority: 'P2', notes: '' }
    loadCases(); loadStats()
  } catch (e) {
    alert('创建失败：' + (e.response?.data?.message || e.message))
  } finally { submitting.value = false }
}

function changePage(p) { page.value = p; loadCases() }

function statusLabel(s) {
  return { DRAFT: '草稿', PENDING_REVIEW: '待审核', APPROVED: '已审批', BASELINE: '基线', DEPRECATED: '已废弃' }[s] || s
}
function statusClass(s) {
  return { DRAFT: 'st-draft', PENDING_REVIEW: 'st-pending', APPROVED: 'st-approved', BASELINE: 'st-baseline', DEPRECATED: 'st-deprecated' }[s] || ''
}

onMounted(() => { loadStats(); loadCases() })
</script>

<style scoped>
.tc-view { height: 100%; overflow-y: auto; padding: 24px; background: var(--main-bg); color: var(--text-primary); }
.tc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
.stat-card {
  flex: 1; padding: 16px; border: 1px solid var(--border-color);
  border-radius: 10px; background: var(--sidebar-bg); cursor: pointer; transition: all 0.15s; text-align: center;
}
.stat-card:hover { border-color: var(--send-btn); }
.stat-num { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 160px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; }
.model-input { max-width: 220px; flex: none; }
.filter-select { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; }
.tc-table-wrap { border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
.tc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.tc-table th { padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); background: var(--sidebar-bg); }
.tc-row { cursor: pointer; transition: background 0.15s; }
.tc-row:hover { background: var(--border-color); }
.tc-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-color); }
.tc-row:last-child td { border-bottom: none; }
.code-cell { font-family: monospace; font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.title-cell { font-weight: 500; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.secondary-cell { color: var(--text-secondary); font-size: 13px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pri-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.pri-p0 { background: #fee2e2; color: #dc2626; }
.pri-p1 { background: #fef3c7; color: #d97706; }
.pri-p2 { background: #dbeafe; color: #2563eb; }
.pri-p3 { background: #f3f4f6; color: #6b7280; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.st-draft { background: #f3f4f6; color: #6b7280; }
.st-pending { background: #fef3c7; color: #d97706; }
.st-approved { background: #dbeafe; color: #2563eb; }
.st-baseline { background: #d1fae5; color: #059669; }
.st-deprecated { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.action-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-action { padding: 3px 8px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500; white-space: nowrap; }
.btn-submit { background: #dbeafe; color: #2563eb; }
.btn-approve { background: #d1fae5; color: #059669; }
.btn-reject { background: #fee2e2; color: #dc2626; }
.btn-baseline { background: #d1fae5; color: #059669; }
.pagination { display: flex; align-items: center; gap: 12px; margin-top: 16px; justify-content: center; }
.page-info { font-size: 13px; color: var(--text-secondary); }
.page-btn { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-primary); cursor: pointer; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.empty-state { padding: 48px; text-align: center; color: var(--text-secondary); }
.btn-primary { padding: 8px 16px; background: var(--send-btn); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-primary:hover { background: var(--send-btn-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { padding: 8px 16px; background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog { background: var(--sidebar-bg); border-radius: 12px; padding: 24px; width: 560px; max-height: 80vh; overflow-y: auto; border: 1px solid var(--border-color); }
.dialog-small { background: var(--sidebar-bg); border-radius: 12px; padding: 24px; width: 400px; border: 1px solid var(--border-color); }
.dialog-title { font-size: 18px; font-weight: 600; margin: 0 0 20px; }
.dialog-small h3 { margin: 0 0 16px; }
.form-row { display: flex; gap: 12px; }
.form-group { margin-bottom: 14px; flex: 1; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.form-input, .form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; box-sizing: border-box; font-family: inherit; }
.form-textarea { resize: vertical; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.recommend-panel {
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.recommend-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.recommend-title { margin: 0; font-size: 15px; font-weight: 600; }
.btn-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
.recommend-input-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
.recommend-textarea { flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; font-family: inherit; resize: none; }
.recommend-results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.recommend-results-title { font-size: 13px; color: var(--text-secondary); }
.recommend-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 6px; cursor: pointer; transition: background 0.15s; }
.recommend-item:hover { background: var(--border-color); }
.recommend-item-left { display: flex; align-items: flex-start; gap: 12px; }
.recommend-score { font-size: 18px; font-weight: 700; min-width: 44px; }
.recommend-item-title { font-size: 14px; font-weight: 500; }
.recommend-item-reason { font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5; }
.reason-label { color: #5b9bd5; font-weight: 500; margin-right: 2px; }
.recommend-how { display: flex; align-items: flex-start; gap: 8px; background: linear-gradient(135deg, rgba(91,155,213,0.08), rgba(91,155,213,0.04)); border: 1px solid rgba(91,155,213,0.25); border-radius: 6px; padding: 9px 13px; margin-bottom: 12px; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.recommend-how strong { color: var(--text-primary); }
.recommend-how-icon { color: #5b9bd5; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.recommend-item-code { font-size: 12px; font-family: monospace; color: var(--text-secondary); }
.recommend-empty { text-align: center; color: var(--text-secondary); padding: 20px; font-size: 14px; }
</style>
