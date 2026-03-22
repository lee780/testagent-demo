<template>
  <div class="reports-view">
    <div class="page-header">
      <h2>测试报告</h2>
    </div>

    <div class="filter-bar">
      <el-select v-model="modeFilter" placeholder="全部模式" size="small" clearable @change="onFilterChange" style="width:130px">
        <el-option v-for="(label, key) in MODE_LABELS" :key="key" :label="label" :value="key" />
      </el-select>
      <span class="list-meta" v-if="total > 0">共 {{ total }} 条报告</span>
    </div>

    <div class="reports-content">
      <el-table :data="reports" v-loading="loading" empty-text="暂无报告" stripe>
        <el-table-column label="报告名称" prop="name" min-width="200">
          <template #default="{ row }">
            <router-link :to="`/reports/${row.id}`" class="report-name-link">{{ row.name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column label="关联对话" min-width="160">
          <template #default="{ row }">
            <span class="conv-title">{{ row.conversation?.title || row.conversationId }}</span>
          </template>
        </el-table-column>
        <el-table-column width="110">
          <template #header>
            <el-tooltip content="系统化：BVA边界值全量覆盖 | 回归：基于基线用例精准验证 | 探索：LLM自由假设挖掘非常规缺陷 | 混沌：双系统对比差异" placement="top">
              <span>执行模式 <span class="col-hint">ⓘ</span></span>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <el-tag :type="modeTagType(row.executionMode)" size="small">
              {{ modeLabel(row.executionMode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column width="110">
          <template #header>
            <el-tooltip content="绿色=100% | 蓝色≥80% | 橙色≥60% | 红色<60%" placement="top">
              <span>通过率 <span class="col-hint">ⓘ</span></span>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <span v-if="row.stats?.total" :class="passRateClass(row.stats.passRate)">
              {{ row.stats.passRate }}
            </span>
            <span v-else class="no-stat">-</span>
          </template>
        </el-table-column>
        <el-table-column label="用例数" width="90">
          <template #default="{ row }">
            <span v-if="row.stats?.total" class="stat-cell">
              {{ row.stats.total }}
              <span class="stat-detail">（✅{{ row.stats.passed }} ❌{{ row.stats.failed }}）</span>
            </span>
            <span v-else class="no-stat">-</span>
          </template>
        </el-table-column>
        <el-table-column width="80">
          <template #header>
            <el-tooltip content="将本次执行的测试用例以「草稿」状态写入用例库，经审核后可晋级为基线用例，供后续 AI 回归推荐使用" placement="top">
              <span>入库 <span class="col-hint">ⓘ</span></span>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <el-tag :type="row.casesImported ? 'success' : 'info'" size="small">
              {{ row.casesImported ? '已入库' : '未入库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="保存时间" width="155">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <router-link :to="`/reports/${row.id}`" class="op-link">查看详情</router-link>
            <el-button
              v-if="!row.casesImported"
              size="small"
              type="primary"
              @click="importCases(row)"
              style="margin-left:8px"
            >入库</el-button>
            <el-button
              size="small"
              type="danger"
              link
              @click="deleteReport(row)"
              style="margin-left:4px"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="total > pageSize" class="pagination-bar">
        <el-button size="small" :disabled="page === 1" @click="changePage(page - 1)">上一页</el-button>
        <span class="page-info">第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
        <el-button size="small" :disabled="page * pageSize >= total" @click="changePage(page + 1)">下一页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const reports = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 20
const modeFilter = ref('')

const MODE_LABELS = {
  systematic: '系统化',
  regression: '回归',
  exploratory: '探索',
  chaos: '混沌',
  agent: 'Agent',
}
const MODE_TAG_TYPES = {
  systematic: 'primary',
  regression: 'success',
  exploratory: 'warning',
  chaos: 'danger',
}

function modeLabel(mode) {
  return MODE_LABELS[mode] || mode || '-'
}
function modeTagType(mode) {
  return MODE_TAG_TYPES[mode] || 'info'
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function onFilterChange() { page.value = 1; fetchReports() }

async function fetchReports() {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams({ page: page.value, pageSize })
    if (modeFilter.value) params.set('mode', modeFilter.value)
    const res = await fetch(`/api/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) {
      reports.value = data.data.items ?? data.data ?? []
      total.value = data.data.total ?? reports.value.length
    }
  } catch {
    ElMessage.error('加载报告列表失败')
  } finally {
    loading.value = false
  }
}

function changePage(p) { page.value = p; fetchReports() }

async function deleteReport(row) {
  try {
    await ElMessageBox.confirm(`确定要删除报告「${row.name}」？此操作不可恢复。`, '删除报告', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch { return }
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/reports/${row.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) { ElMessage.success('报告已删除'); await fetchReports() }
    else ElMessage.error(data.error || '删除失败')
  } catch { ElMessage.error('删除请求失败') }
}

function passRateClass(rate) {
  const v = parseFloat(rate)
  if (isNaN(v)) return 'rate-na'
  if (v >= 100) return 'rate-full'
  if (v >= 80) return 'rate-good'
  if (v >= 60) return 'rate-warn'
  return 'rate-bad'
}

async function importCases(row) {
  try {
    await ElMessageBox.confirm(
      `将报告「${row.name}」中的测试用例以"草稿"状态导入用例库？`,
      '确认入库',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'info' }
    )
  } catch { return }

  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/reports/${row.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success(`已导入 ${data.data.imported} 条用例到用例库（草稿状态）`)
      await fetchReports()
    } else {
      ElMessage.error(data.error || '入库失败')
    }
  } catch {
    ElMessage.error('入库请求失败')
  }
}

onMounted(fetchReports)
</script>

<style scoped>
.reports-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: var(--main-bg);
  color: var(--text-primary);
  overflow-y: auto;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.reports-content {
  flex: 1;
  background: var(--sidebar-bg);
  border-radius: 8px;
  padding: 16px;
}

.report-name {
  font-weight: 500;
}

.report-name-link {
  color: #5b9bd5;
  text-decoration: none;
  font-weight: 500;
}
.report-name-link:hover { text-decoration: underline; }

.conv-title { color: var(--text-secondary); font-size: 13px; }

.stat-cell { font-size: 13px; }
.stat-detail { font-size: 11px; color: var(--text-secondary); }
.no-stat { color: var(--text-secondary); font-size: 12px; }

.rate-full { color: #2e7d32; font-weight: 600; }
.rate-good { color: #1565c0; font-weight: 600; }
.rate-warn { color: #e65100; font-weight: 600; }
.rate-bad  { color: #c62828; font-weight: 600; }
.rate-na   { color: var(--text-secondary); }

.op-link { color: #5b9bd5; text-decoration: none; font-size: 13px; }
.op-link:hover { text-decoration: underline; }

.list-meta { font-size: 13px; color: var(--text-secondary); }
.col-hint { font-size: 11px; color: #aaa; cursor: help; }

.pagination-bar { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 16px 0 4px; }
.page-info { font-size: 13px; color: var(--text-secondary); }
</style>
