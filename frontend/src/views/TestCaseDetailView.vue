<template>
  <div class="tc-detail-view">
    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="!tc" class="error-state">用例不存在</div>
    <template v-else>
      <div class="detail-nav">
        <button class="btn-back" @click="router.push('/testcases')">← 返回列表</button>
        <div class="nav-actions">
          <button v-if="tc.status === 'DRAFT'" class="btn-secondary" @click="submitForReview">提交审核</button>
          <button v-if="tc.status === 'PENDING_REVIEW'" class="btn-approve" @click="doReview('approve')">审核通过</button>
          <button v-if="tc.status === 'PENDING_REVIEW'" class="btn-reject" @click="showReject = true">驳回</button>
          <button v-if="tc.status === 'APPROVED'" class="btn-baseline" @click="doBaseline">固化基线</button>
          <button class="btn-secondary" @click="showHistory = !showHistory">{{ showHistory ? '隐藏版本历史' : '版本历史' }}</button>
        </div>
      </div>

      <div class="detail-header">
        <div class="meta-row">
          <span :class="['status-badge', statusClass(tc.status)]">{{ statusLabel(tc.status) }}</span>
          <span :class="['pri-badge', 'pri-' + tc.priority.toLowerCase()]">{{ tc.priority }}</span>
          <span class="meta-text">v{{ tc.version }}</span>
          <span class="meta-text">{{ tc.group?.modelId }} / {{ tc.group?.caseCode }}</span>
        </div>
        <h1 class="detail-title">{{ tc.title }}</h1>
        <div v-if="tc.coveragePoint" class="coverage-path">覆盖点：{{ tc.coveragePoint }}</div>
      </div>

      <div class="detail-body">
        <div class="detail-main">
          <!-- 审核意见 -->
          <section v-if="tc.reviewNote" class="detail-section review-note-section" :class="tc.status === 'DRAFT' ? 'note-rejected' : 'note-approved'">
            <h3 class="section-title">审核意见</h3>
            <p>{{ tc.reviewNote }}</p>
            <div class="note-meta" v-if="tc.reviewer">{{ tc.reviewer.displayName || tc.reviewer.username }} · {{ formatDate(tc.reviewedAt) }}</div>
          </section>

          <!-- 输入参数 -->
          <section v-if="tc.inputParams" class="detail-section">
            <h3 class="section-title">输入参数</h3>
            <pre class="code-block">{{ JSON.stringify(tc.inputParams, null, 2) }}</pre>
          </section>

          <!-- 预期结果 -->
          <section v-if="tc.expectedResult" class="detail-section">
            <h3 class="section-title">预期结果</h3>
            <pre class="code-block">{{ JSON.stringify(tc.expectedResult, null, 2) }}</pre>
          </section>

          <!-- YAML 原文 -->
          <section v-if="tc.yamlContent" class="detail-section">
            <h3 class="section-title">YAML 原文</h3>
            <pre class="code-block yaml-block">{{ tc.yamlContent }}</pre>
          </section>

          <!-- 备注 -->
          <section v-if="tc.notes" class="detail-section">
            <h3 class="section-title">备注</h3>
            <p class="section-content">{{ tc.notes }}</p>
          </section>

          <!-- 执行历史 -->
          <section class="detail-section">
            <h3 class="section-title">执行历史（最近10次）</h3>
            <div v-if="tc.executions?.length === 0" class="secondary-text">暂无执行记录</div>
            <table v-else class="exec-table">
              <thead><tr><th>状态</th><th>系统</th><th>耗时</th><th>时间</th></tr></thead>
              <tbody>
                <tr v-for="e in tc.executions" :key="e.id">
                  <td><span :class="['exec-status', 'es-' + e.status.toLowerCase()]">{{ e.status }}</span></td>
                  <td class="secondary-cell">{{ e.baseUrl || '—' }}</td>
                  <td class="secondary-cell">{{ e.durationMs ? e.durationMs + 'ms' : '—' }}</td>
                  <td class="secondary-cell">{{ formatDate(e.executedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <!-- 右侧信息 -->
        <aside class="detail-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-item"><span class="sidebar-label">状态</span><span :class="['status-badge', statusClass(tc.status)]">{{ statusLabel(tc.status) }}</span></div>
            <div class="sidebar-item"><span class="sidebar-label">优先级</span><span :class="['pri-badge', 'pri-' + tc.priority.toLowerCase()]">{{ tc.priority }}</span></div>
            <div class="sidebar-item"><span class="sidebar-label">创建人</span><span class="sidebar-value">{{ tc.creator?.displayName || tc.creator?.username }}</span></div>
            <div class="sidebar-item"><span class="sidebar-label">创建时间</span><span class="sidebar-value">{{ formatDate(tc.createdAt) }}</span></div>
            <div v-if="tc.baselinedAt" class="sidebar-item"><span class="sidebar-label">固化时间</span><span class="sidebar-value">{{ formatDate(tc.baselinedAt) }}</span></div>
            <div v-if="tc.sourceMode" class="sidebar-item"><span class="sidebar-label">生成模式</span><span class="sidebar-value">{{ tc.sourceMode }}</span></div>
            <div v-if="tc.tags?.length" class="sidebar-item">
              <span class="sidebar-label">标签</span>
              <div class="tags-row">
                <span v-for="t in tc.tags" :key="t" class="tag">{{ t }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- 版本历史面板 -->
      <div v-if="showHistory" class="history-panel">
        <h3 class="history-title">版本历史</h3>
        <div v-if="historyLoading" class="secondary-text">加载中...</div>
        <table v-else class="exec-table">
          <thead><tr><th>版本</th><th>状态</th><th>创建人</th><th>审核人</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="h in history" :key="h.id" :class="{ 'current-row': h.id === tc.id }">
              <td class="code-cell">v{{ h.version }}</td>
              <td><span :class="['status-badge', statusClass(h.status)]">{{ statusLabel(h.status) }}</span></td>
              <td class="secondary-cell">{{ h.creator?.displayName || h.creator?.username }}</td>
              <td class="secondary-cell">{{ h.reviewer?.displayName || h.reviewer?.username || '—' }}</td>
              <td class="secondary-cell">{{ formatDate(h.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 驳回对话框 -->
      <div v-if="showReject" class="dialog-overlay" @click.self="showReject = false">
        <div class="dialog-small">
          <h3>驳回意见</h3>
          <div class="form-group">
            <textarea v-model="rejectNote" class="form-textarea" rows="3" placeholder="请填写驳回原因..." required></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" @click="showReject = false">取消</button>
            <button class="btn-primary" :disabled="!rejectNote.trim()" @click="confirmReject">确认驳回</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'

const route = useRoute()
const router = useRouter()

const tc = ref(null)
const loading = ref(true)
const showHistory = ref(false)
const historyLoading = ref(false)
const history = ref([])
const showReject = ref(false)
const rejectNote = ref('')

async function loadTC() {
  loading.value = true
  try {
    const res = await api.get(`/testcases/${route.params.id}`)
    tc.value = res.data
  } catch (e) { console.error(e) } finally { loading.value = false }
}

async function loadHistory() {
  if (!tc.value) return
  historyLoading.value = true
  try {
    const res = await api.get(`/testcases/${tc.value.id}/history`)
    history.value = res.data
  } catch (e) { console.error(e) } finally { historyLoading.value = false }
}

watch(showHistory, (v) => { if (v && history.value.length === 0) loadHistory() })

async function submitForReview() {
  await api.post(`/testcases/${tc.value.id}/submit`)
  loadTC()
}

async function doReview(action) {
  await api.post(`/testcases/${tc.value.id}/review`, { action })
  loadTC()
}

async function confirmReject() {
  await api.post(`/testcases/${tc.value.id}/review`, { action: 'reject', reviewNote: rejectNote.value })
  showReject.value = false
  loadTC()
}

async function doBaseline() {
  if (!confirm('确认固化为基线？')) return
  await api.post(`/testcases/${tc.value.id}/baseline`)
  loadTC()
}

function statusLabel(s) {
  return { DRAFT: '草稿', PENDING_REVIEW: '待审核', APPROVED: '已审批', BASELINE: '基线', DEPRECATED: '已废弃' }[s] || s
}
function statusClass(s) {
  return { DRAFT: 'st-draft', PENDING_REVIEW: 'st-pending', APPROVED: 'st-approved', BASELINE: 'st-baseline', DEPRECATED: 'st-deprecated' }[s] || ''
}
function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadTC)
</script>

<style scoped>
.tc-detail-view { height: 100%; overflow-y: auto; padding: 24px; background: var(--main-bg); color: var(--text-primary); }
.loading-state, .error-state { padding: 48px; text-align: center; color: var(--text-secondary); }
.detail-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.btn-back { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
.btn-back:hover { color: var(--text-primary); }
.nav-actions { display: flex; gap: 8px; }
.detail-header { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.meta-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.meta-text { font-size: 13px; color: var(--text-secondary); }
.detail-title { font-size: 22px; font-weight: 600; margin: 0 0 6px; }
.coverage-path { font-size: 13px; color: var(--text-secondary); }
.detail-body { display: flex; gap: 24px; align-items: flex-start; }
.detail-main { flex: 1; min-width: 0; }
.detail-sidebar { width: 200px; flex-shrink: 0; }
.detail-section { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.detail-section:last-child { border-bottom: none; }
.section-title { font-size: 15px; font-weight: 600; margin: 0 0 10px; }
.section-content { color: var(--text-secondary); font-size: 14px; margin: 0; }
.secondary-text { color: var(--text-secondary); font-size: 13px; }
.code-block { background: var(--sidebar-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; font-size: 13px; overflow-x: auto; white-space: pre; font-family: monospace; color: var(--text-primary); margin: 0; }
.yaml-block { font-size: 12px; }
.review-note-section { border-radius: 8px; padding: 14px; border: 1px solid; }
.note-rejected { background: rgba(254,226,226,0.1); border-color: #fee2e2; }
.note-approved { background: rgba(209,250,229,0.1); border-color: #d1fae5; }
.note-meta { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }
.review-note-section p { margin: 0 0 4px; font-size: 14px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.exec-table th { padding: 8px 12px; text-align: left; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); }
.exec-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-color); }
.exec-table tr:last-child td { border-bottom: none; }
.code-cell { font-family: monospace; font-size: 12px; color: var(--text-secondary); }
.secondary-cell { color: var(--text-secondary); }
.current-row { background: var(--border-color); }
.exec-status { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.es-pass { background: #d1fae5; color: #059669; }
.es-fail { background: #fee2e2; color: #dc2626; }
.es-error { background: #fef3c7; color: #d97706; }
.es-skip { background: #f3f4f6; color: #6b7280; }
.sidebar-card { background: var(--sidebar-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.sidebar-item { display: flex; flex-direction: column; gap: 4px; }
.sidebar-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600; }
.sidebar-value { font-size: 13px; }
.tags-row { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { padding: 2px 7px; background: var(--border-color); border-radius: 10px; font-size: 11px; }
.history-panel { margin-top: 24px; padding: 20px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--sidebar-bg); }
.history-title { font-size: 16px; font-weight: 600; margin: 0 0 14px; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.st-draft { background: #f3f4f6; color: #6b7280; }
.st-pending { background: #fef3c7; color: #d97706; }
.st-approved { background: #dbeafe; color: #2563eb; }
.st-baseline { background: #d1fae5; color: #059669; }
.st-deprecated { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.pri-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.pri-p0 { background: #fee2e2; color: #dc2626; }
.pri-p1 { background: #fef3c7; color: #d97706; }
.pri-p2 { background: #dbeafe; color: #2563eb; }
.pri-p3 { background: #f3f4f6; color: #6b7280; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog-small { background: var(--sidebar-bg); border-radius: 12px; padding: 24px; width: 400px; border: 1px solid var(--border-color); }
.dialog-small h3 { margin: 0 0 16px; }
.form-group { margin-bottom: 12px; }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; box-sizing: border-box; font-family: inherit; resize: vertical; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-primary { padding: 8px 16px; background: var(--send-btn); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-secondary { padding: 8px 14px; background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-approve { padding: 8px 14px; background: #d1fae5; color: #059669; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-reject { padding: 8px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-baseline { padding: 8px 14px; background: var(--send-btn); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
</style>
