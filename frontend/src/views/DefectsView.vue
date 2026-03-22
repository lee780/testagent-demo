<template>
  <div class="defects-view">
    <div class="page-header">
      <h2>缺陷管理</h2>
      <el-button type="primary" size="small" @click="showCreate = true">新建缺陷</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total || 0 }}</div>
        <div class="stat-label">总缺陷</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">{{ stats['status_待处理'] || 0 }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">{{ stats['status_处理中'] || 0 }}</div>
        <div class="stat-label">处理中</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">{{ (stats['status_已解决'] || 0) + (stats['status_已关闭'] || 0) }}</div>
        <div class="stat-label">已解决/关闭</div>
      </div>
      <div class="stat-card p0">
        <div class="stat-value">{{ stats['severity_P0'] || 0 }}</div>
        <div class="stat-label">P0</div>
      </div>
      <div class="stat-card p1">
        <div class="stat-value">{{ stats['severity_P1'] || 0 }}</div>
        <div class="stat-label">P1</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:120px" @change="() => { page.value = 1; fetchDefects() }">
        <el-option v-for="s in STATUSES" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="filterSeverity" placeholder="严重级别" clearable size="small" style="width:120px" @change="() => { page.value = 1; fetchDefects() }">
        <el-option v-for="s in SEVERITIES" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button size="small" @click="clearFilter" v-if="filterStatus || filterSeverity">清除筛选</el-button>
    </div>

    <div class="defects-content">
      <el-table :data="defects" v-loading="loading" empty-text="暂无缺陷" stripe>
        <el-table-column label="标题" prop="title" min-width="220">
          <template #default="{ row }">
            <router-link :to="`/defects/${row.id}`" class="defect-link">{{ row.title }}</router-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="级别" width="72">
          <template #default="{ row }">
            <el-tag :type="severityType(row.severity)" size="small">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联报告" min-width="140">
          <template #default="{ row }">
            <router-link v-if="row.report" :to="`/reports/${row.reportId}`" class="report-link">
              {{ row.report.name }}
            </router-link>
            <span v-else class="secondary-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="评论" width="60" align="center">
          <template #default="{ row }">
            <span class="secondary-text">{{ row._count?.comments || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="155">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="解决时间" width="155">
          <template #default="{ row }">
            <span v-if="row.resolvedAt" class="secondary-text">{{ formatTime(row.resolvedAt) }}</span>
            <span v-else class="secondary-text">-</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="total > pageSize" class="pagination-bar">
        <el-button size="small" :disabled="page === 1" @click="changePage(page - 1)">上一页</el-button>
        <span class="page-info">第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
        <el-button size="small" :disabled="page * pageSize >= total" @click="changePage(page + 1)">下一页</el-button>
      </div>
    </div>

    <!-- 新建缺陷弹窗 -->
    <el-dialog v-model="showCreate" title="新建缺陷" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="请输入缺陷标题" />
        </el-form-item>
        <el-form-item label="严重级别">
          <el-select v-model="form.severity" style="width:100%">
            <el-option v-for="s in SEVERITIES" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="缺陷描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="createDefect" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const STATUSES = ['待处理', '处理中', '已解决', '已关闭', '不修复']
const SEVERITIES = ['P0', 'P1', 'P2', 'P3']

const defects = ref([])
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const filterStatus = ref('')
const filterSeverity = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 20
const stats = ref({})
const form = ref({ title: '', severity: 'P2', description: '' })

const STATUS_TYPES = { '待处理': 'danger', '处理中': 'warning', '已解决': 'success', '已关闭': 'info', '不修复': 'info' }
const SEVERITY_TYPES = { P0: 'danger', P1: 'warning', P2: '', P3: 'info' }

function statusType(s) { return STATUS_TYPES[s] || '' }
function severityType(s) { return SEVERITY_TYPES[s] || '' }
function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function clearFilter() {
  filterStatus.value = ''
  filterSeverity.value = ''
  page.value = 1
  fetchDefects()
}

function changePage(p) { page.value = p; fetchDefects() }

async function fetchStats() {
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/defects/stats', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) stats.value = data.data
  } catch { /* non-fatal */ }
}

async function fetchDefects() {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams()
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterSeverity.value) params.append('severity', filterSeverity.value)
    params.append('page', page.value)
    params.append('pageSize', pageSize)
    const res = await fetch(`/api/defects?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) {
      defects.value = data.data.items ?? data.data ?? []
      total.value = data.data.total ?? defects.value.length
    }
  } catch {
    ElMessage.error('加载缺陷列表失败')
  } finally {
    loading.value = false
  }
}

async function createDefect() {
  if (!form.value.title.trim()) { ElMessage.warning('请输入标题'); return }
  creating.value = true
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/defects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('缺陷已创建')
      showCreate.value = false
      form.value = { title: '', severity: 'P2', description: '' }
      await fetchDefects()
      await fetchStats()
    } else {
      ElMessage.error(data.error || '创建失败')
    }
  } catch {
    ElMessage.error('请求失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => { fetchDefects(); fetchStats() })
</script>

<style scoped>
.defects-view {
  height: 100%; display: flex; flex-direction: column;
  padding: 24px; background: var(--main-bg); color: var(--text-primary); overflow-y: auto;
}
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 20px; font-weight: 600; color: var(--text-primary); }

/* Stat cards */
.stat-cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
.stat-card { background: var(--sidebar-bg); border-radius: 8px; padding: 12px 16px; text-align: center; }
.stat-value { font-size: 24px; font-weight: 700; line-height: 1.2; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.stat-card.danger .stat-value { color: #c62828; }
.stat-card.warning .stat-value { color: #e65100; }
.stat-card.success .stat-value { color: #2e7d32; }
.stat-card.p0 .stat-value { color: #c62828; }
.stat-card.p1 .stat-value { color: #e65100; }

.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }

.defects-content { flex: 1; background: var(--sidebar-bg); border-radius: 8px; padding: 16px; }

.defect-link { color: #5b9bd5; text-decoration: none; font-weight: 500; }
.defect-link:hover { text-decoration: underline; }
.report-link { color: #5b9bd5; text-decoration: none; font-size: 13px; }
.report-link:hover { text-decoration: underline; }
.secondary-text { color: var(--text-secondary); font-size: 13px; }

.pagination-bar { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 16px 0 4px; }
.page-info { font-size: 13px; color: var(--text-secondary); }
</style>
