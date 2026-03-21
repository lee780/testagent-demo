<template>
  <div class="defects-view">
    <div class="page-header">
      <h2>缺陷管理</h2>
      <el-button type="primary" size="small" @click="showCreate = true">新建缺陷</el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:120px">
        <el-option v-for="s in STATUSES" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="filterSeverity" placeholder="严重级别" clearable size="small" style="width:120px">
        <el-option v-for="s in SEVERITIES" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button size="small" @click="fetchDefects">筛选</el-button>
    </div>

    <div class="defects-content">
      <el-table :data="defects" v-loading="loading" empty-text="暂无缺陷" stripe>
        <el-table-column label="标题" prop="title" min-width="200">
          <template #default="{ row }">
            <router-link :to="`/defects/${row.id}`" class="defect-link">{{ row.title }}</router-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="严重级别" width="90">
          <template #default="{ row }">
            <el-tag :type="severityType(row.severity)" size="small">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联报告" min-width="140">
          <template #default="{ row }">
            <span class="secondary-text">{{ row.report?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="评论" width="70">
          <template #default="{ row }">
            <span class="secondary-text">{{ row._count?.comments || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const STATUSES = ['待处理', '处理中', '已解决', '已关闭', '不修复']
const SEVERITIES = ['P0', 'P1', 'P2', 'P3']

const defects = ref([])
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const filterStatus = ref('')
const filterSeverity = ref('')

const form = ref({ title: '', severity: 'P2', description: '' })

const STATUS_TYPES = { '待处理': 'danger', '处理中': 'warning', '已解决': 'success', '已关闭': 'info', '不修复': 'info' }
const SEVERITY_TYPES = { P0: 'danger', P1: 'warning', P2: '', P3: 'info' }

function statusType(s) { return STATUS_TYPES[s] || '' }
function severityType(s) { return SEVERITY_TYPES[s] || '' }
function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

async function fetchDefects() {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams()
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterSeverity.value) params.append('severity', filterSeverity.value)
    const res = await fetch(`/api/defects?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) defects.value = data.data
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
    } else {
      ElMessage.error(data.error || '创建失败')
    }
  } catch {
    ElMessage.error('请求失败')
  } finally {
    creating.value = false
  }
}

onMounted(fetchDefects)
</script>

<style scoped>
.defects-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: var(--main-bg);
  color: var(--text-primary);
  overflow-y: auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.defects-content {
  flex: 1;
  background: var(--sidebar-bg);
  border-radius: 8px;
  padding: 16px;
}
.defect-link {
  color: #5b9bd5;
  text-decoration: none;
  font-weight: 500;
}
.defect-link:hover { text-decoration: underline; }
.secondary-text {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
