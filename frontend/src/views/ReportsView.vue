<template>
  <div class="reports-view">
    <div class="page-header">
      <h2>测试报告</h2>
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
        <el-table-column label="执行模式" width="110">
          <template #default="{ row }">
            <el-tag :type="modeTagType(row.executionMode)" size="small">
              {{ modeLabel(row.executionMode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用例入库" width="100">
          <template #default="{ row }">
            <el-tag :type="row.casesImported ? 'success' : 'info'" size="small">
              {{ row.casesImported ? '已入库' : '未入库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="保存时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="previewReport(row)">预览</el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="row.casesImported"
              @click="importCases(row)"
            >
              {{ row.casesImported ? '已入库' : '确认入库' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const reports = ref([])
const loading = ref(false)

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

async function fetchReports() {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) reports.value = data.data
  } catch {
    ElMessage.error('加载报告列表失败')
  } finally {
    loading.value = false
  }
}

async function previewReport(row) {
  const token = localStorage.getItem('access_token')
  try {
    const res = await fetch(`/api/reports/${row.id}/html`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { ElMessage.error('HTML 文件不存在'); return }
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch {
    ElMessage.error('预览失败')
  }
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

.conv-title {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
