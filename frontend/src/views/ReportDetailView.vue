<template>
  <div class="report-detail">
    <div class="page-header">
      <el-button size="small" @click="$router.push('/reports')">← 返回</el-button>
      <h2>报告详情</h2>
    </div>

    <div v-if="report" class="detail-layout">
      <!-- 左侧主内容 -->
      <div class="main-content">
        <!-- 基本信息 -->
        <div class="section">
          <div class="section-title">基本信息</div>
          <div class="info-row">
            <label>报告名称</label>
            <el-input v-model="editName" size="small" style="width:300px" />
            <el-button size="small" type="primary" @click="saveName" :loading="saving">保存</el-button>
          </div>
          <div class="info-row">
            <label>关联对话</label>
            <span class="info-value">{{ report.conversation?.title || report.conversationId }}</span>
          </div>
          <div class="info-row">
            <label>执行模式</label>
            <el-tag :type="modeTagType(report.executionMode)" size="small">{{ modeLabel(report.executionMode) }}</el-tag>
          </div>
          <div class="info-row">
            <label>入库状态</label>
            <el-tag :type="report.casesImported ? 'success' : 'info'" size="small">{{ report.casesImported ? '已入库' : '未入库' }}</el-tag>
          </div>
        </div>

        <!-- 关联文档 -->
        <div class="section">
          <div class="section-title">关联文档</div>
          <div class="doc-list">
            <el-tag v-for="(doc, i) in editDocs" :key="i" closable @close="removeDoc(i)" style="margin:2px">{{ doc }}</el-tag>
          </div>
          <div class="doc-add-row">
            <el-input v-model="newDoc" size="small" placeholder="手动添加文档名称..." style="width:250px" @keydown.enter="addDoc" />
            <el-button size="small" @click="addDoc">添加</el-button>
            <el-button size="small" @click="saveDocs" :loading="saving">保存关联</el-button>
          </div>
        </div>

        <!-- HTML 预览 -->
        <div class="section">
          <div class="section-title">HTML 报告</div>
          <el-button size="small" @click="previewHtml">在浏览器中预览</el-button>
        </div>

        <!-- 测试用例列表 -->
        <div v-if="testCasesData && testCasesData.length > 0" class="section">
          <div class="section-title-row">
            <span class="section-title">测试用例（{{ testCasesData.length }} 条）</span>
            <el-button v-if="!report.casesImported" size="small" type="success" @click="importCases" :loading="importing">确认入库</el-button>
          </div>
          <el-table :data="testCasesData" size="small" stripe max-height="400">
            <el-table-column label="用例ID" prop="id" width="180" />
            <el-table-column label="标题" prop="name" min-width="200" />
            <el-table-column label="覆盖点" prop="coverage_point" min-width="150">
              <template #default="{ row }">{{ row.coverage_point || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openCreateDefect(row)">创建缺陷</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 已入库用例 -->
        <div v-if="report.testCases && report.testCases.length > 0" class="section">
          <div class="section-title">已入库用例（{{ report.testCases.length }} 条）</div>
          <div v-for="tc in report.testCases" :key="tc.id" class="imported-case">
            <router-link :to="`/testcases/${tc.id}`" class="case-link">{{ tc.title }}</router-link>
            <el-tag size="small" :type="statusTagType(tc.status)">{{ statusLabel(tc.status) }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="sidebar-panel">
        <div class="prop-group">
          <div class="prop-label">保存时间</div>
          <span class="prop-value">{{ formatTime(report.createdAt) }}</span>
        </div>
        <div class="prop-group">
          <div class="prop-label">HTML 文件</div>
          <span class="prop-value small">{{ report.htmlFile }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading-tip">加载中...</div>

    <!-- 创建缺陷弹窗 -->
    <el-dialog v-model="showDefectDialog" title="创建缺陷" width="480px">
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
          <el-input v-model="defectForm.description" type="textarea" :rows="3" />
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()

const report = ref(null)
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const editName = ref('')
const editDocs = ref([])
const newDoc = ref('')
const showDefectDialog = ref(false)
const creatingDefect = ref(false)
const defectForm = ref({ title: '', severity: 'P2', description: '' })
const pendingDefectCase = ref(null)

const testCasesData = computed(() => {
  if (!report.value?.testCasesData) return []
  const d = report.value.testCasesData
  return Array.isArray(d) ? d : []
})

const MODE_LABELS = { systematic: '系统化', regression: '回归', exploratory: '探索', chaos: '混沌', agent: 'Agent' }
const MODE_TAG_TYPES = { systematic: 'primary', regression: 'success', exploratory: 'warning', chaos: 'danger' }
const STATUS_LABELS = { DRAFT: '草稿', PENDING_REVIEW: '待审核', APPROVED: '已审批', BASELINE: '基线', DEPRECATED: '已废弃' }
const STATUS_TAG_TYPES = { DRAFT: 'info', PENDING_REVIEW: 'warning', APPROVED: 'success', BASELINE: 'primary', DEPRECATED: 'danger' }

function modeLabel(m) { return MODE_LABELS[m] || m || '-' }
function modeTagType(m) { return MODE_TAG_TYPES[m] || 'info' }
function statusLabel(s) { return STATUS_LABELS[s] || s }
function statusTagType(s) { return STATUS_TAG_TYPES[s] || 'info' }
function formatTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-' }

function token() { return localStorage.getItem('access_token') }

async function fetchReport() {
  loading.value = true
  try {
    const res = await fetch(`/api/reports/${route.params.id}`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) {
      report.value = data.data
      editName.value = data.data.name
      editDocs.value = [...(data.data.uploadedDocs || [])]
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
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
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
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

function addDoc() {
  if (!newDoc.value.trim()) return
  editDocs.value.push(newDoc.value.trim())
  newDoc.value = ''
}
function removeDoc(i) { editDocs.value.splice(i, 1) }

async function previewHtml() {
  try {
    const res = await fetch(`/api/reports/${route.params.id}/html`, { headers: { Authorization: `Bearer ${token()}` } })
    if (!res.ok) { ElMessage.error('HTML 文件不存在'); return }
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch { ElMessage.error('预览失败') }
}

async function importCases() {
  try {
    await ElMessageBox.confirm(`将报告「${report.value.name}」中的测试用例以"草稿"状态导入用例库？`, '确认入库', { type: 'info' })
  } catch { return }
  importing.value = true
  try {
    const res = await fetch(`/api/reports/${route.params.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success(`已导入 ${data.data.imported} 条用例（草稿状态）`)
      await fetchReport()
    } else {
      ElMessage.error(data.error || '入库失败')
    }
  } catch { ElMessage.error('请求失败') }
  finally { importing.value = false }
}

function openCreateDefect(tc) {
  pendingDefectCase.value = tc
  defectForm.value = { title: `[${tc.id}] ${tc.name || ''} 失败`, severity: 'P2', description: `测试用例 ${tc.id} 执行失败\n覆盖点：${tc.coverage_point || ''}` }
  showDefectDialog.value = true
}

async function submitDefect() {
  if (!defectForm.value.title.trim()) { ElMessage.warning('请输入标题'); return }
  creatingDefect.value = true
  try {
    const res = await fetch('/api/defects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...defectForm.value,
        reportId: route.params.id,
      }),
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('缺陷已创建')
      showDefectDialog.value = false
    } else {
      ElMessage.error(data.error || '创建失败')
    }
  } catch { ElMessage.error('请求失败') }
  finally { creatingDefect.value = false }
}

onMounted(fetchReport)
</script>

<style scoped>
.report-detail { height: 100%; display: flex; flex-direction: column; padding: 24px; background: var(--main-bg); color: var(--text-primary); overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.page-header h2 { font-size: 20px; font-weight: 600; color: var(--text-primary); }
.detail-layout { display: flex; gap: 24px; flex: 1; }
.main-content { flex: 1; min-width: 0; }
.section { background: var(--sidebar-bg); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.info-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 13px; }
.info-row label { color: var(--text-secondary); width: 80px; flex-shrink: 0; }
.info-value { color: var(--text-primary); }
.doc-list { margin-bottom: 8px; }
.doc-add-row { display: flex; gap: 8px; align-items: center; }
.imported-case { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.case-link { color: #5b9bd5; text-decoration: none; }
.case-link:hover { text-decoration: underline; }
.sidebar-panel { width: 220px; flex-shrink: 0; background: var(--sidebar-bg); border-radius: 8px; padding: 16px; height: fit-content; }
.prop-group { margin-bottom: 16px; }
.prop-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.prop-value { font-size: 13px; color: var(--text-primary); }
.prop-value.small { font-size: 11px; font-family: monospace; }
.loading-tip { color: var(--text-secondary); text-align: center; padding: 48px; }
</style>
