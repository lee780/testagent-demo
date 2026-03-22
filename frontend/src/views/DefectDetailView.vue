<template>
  <div class="defect-detail">
    <div class="page-header">
      <el-button size="small" @click="$router.back()">← 返回</el-button>
      <h2>缺陷详情</h2>
    </div>

    <div v-if="defect" class="detail-layout">
      <!-- 左侧主内容 -->
      <div class="main-content">
        <div class="defect-title">{{ defect.title }}</div>
        <div class="defect-desc">{{ userDescription || '暂无描述' }}</div>
        <div v-if="execLog" class="exec-log-section">
          <div class="exec-log-title">执行日志</div>
          <pre class="exec-log-pre">{{ execLog }}</pre>
        </div>

        <!-- 评论区 -->
        <div class="comments-section">
          <div class="section-title">评论（{{ defect.comments?.length || 0 }}）</div>
          <div class="comment-list">
            <div v-for="c in defect.comments" :key="c.id" class="comment-item">
              <div class="comment-author">{{ c.creator?.displayName || c.creator?.username }}</div>
              <div class="comment-time">{{ formatTime(c.createdAt) }}</div>
              <div class="comment-content">{{ c.content }}</div>
            </div>
            <div v-if="!defect.comments?.length" class="empty-tip">暂无评论</div>
          </div>
          <div class="comment-input">
            <el-input v-model="commentText" type="textarea" :rows="2" placeholder="添加评论..." />
            <el-button type="primary" size="small" style="margin-top:8px" @click="addComment" :loading="commenting">提交</el-button>
          </div>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="sidebar-panel">
        <div class="prop-group">
          <div class="prop-label">状态</div>
          <el-select v-model="defect.status" size="small" @change="updateStatus">
            <el-option v-for="s in STATUSES" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">严重级别</div>
          <el-tag :type="severityType(defect.severity)">{{ defect.severity }}</el-tag>
        </div>
        <div class="prop-group">
          <div class="prop-label">创建时间</div>
          <span class="prop-value">{{ formatTime(defect.createdAt) }}</span>
        </div>
        <div v-if="defect.resolvedAt" class="prop-group">
          <div class="prop-label">解决时间</div>
          <span class="prop-value">{{ formatTime(defect.resolvedAt) }}</span>
        </div>
        <div v-if="defect.report" class="prop-group">
          <div class="prop-label">关联报告</div>
          <router-link :to="`/reports/${defect.reportId}`" class="prop-link">{{ defect.report.name }}</router-link>
        </div>
        <div v-if="defect.testCase" class="prop-group">
          <div class="prop-label">关联用例</div>
          <router-link :to="`/testcases/${defect.testCase.id}`" class="prop-link">{{ defect.testCase.title }}</router-link>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading-tip">加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const STATUSES = ['待处理', '处理中', '已解决', '已关闭', '不修复']
const SEVERITY_TYPES = { P0: 'danger', P1: 'warning', P2: '', P3: 'info' }

const route = useRoute()
const defect = ref(null)
const loading = ref(false)
const commentText = ref('')
const commenting = ref(false)

const LOG_SEPARATOR = '\n\n## 执行日志\n'
const userDescription = computed(() => {
  const desc = defect.value?.description || ''
  const idx = desc.indexOf(LOG_SEPARATOR)
  return idx >= 0 ? desc.slice(0, idx) : desc
})
const execLog = computed(() => {
  const desc = defect.value?.description || ''
  const idx = desc.indexOf(LOG_SEPARATOR)
  return idx >= 0 ? desc.slice(idx + LOG_SEPARATOR.length) : ''
})

function severityType(s) { return SEVERITY_TYPES[s] || '' }
function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

async function fetchDefect() {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/defects/${route.params.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) defect.value = data.data
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function updateStatus(status) {
  try {
    const token = localStorage.getItem('access_token')
    await fetch(`/api/defects/${route.params.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    ElMessage.success('状态已更新')
  } catch {
    ElMessage.error('更新失败')
  }
}

async function addComment() {
  if (!commentText.value.trim()) return
  commenting.value = true
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/defects/${route.params.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.value }),
    })
    const data = await res.json()
    if (data.success) {
      commentText.value = ''
      await fetchDefect()
    }
  } catch {
    ElMessage.error('提交失败')
  } finally {
    commenting.value = false
  }
}

onMounted(fetchDefect)
</script>

<style scoped>
.defect-detail {
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
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
.detail-layout {
  display: flex;
  gap: 24px;
  flex: 1;
}
.main-content {
  flex: 1;
  min-width: 0;
}
.defect-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.defect-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.exec-log-section {
  margin-bottom: 24px;
}
.exec-log-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.exec-log-pre {
  background: #f5f6fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12px;
  color: #444;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.comment-item {
  border-left: 2px solid var(--border-color);
  padding: 8px 12px;
  margin-bottom: 12px;
}
.comment-author {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}
.comment-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.comment-content {
  font-size: 13px;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.empty-tip {
  color: var(--text-secondary);
  font-size: 13px;
  padding: 8px 0;
}
.comment-input { margin-top: 16px; }
.sidebar-panel {
  width: 220px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-radius: 8px;
  padding: 16px;
  height: fit-content;
}
.prop-group {
  margin-bottom: 16px;
}
.prop-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.prop-value {
  font-size: 13px;
  color: var(--text-primary);
}
.prop-link {
  font-size: 13px;
  color: #5b9bd5;
  text-decoration: none;
}
.prop-link:hover { text-decoration: underline; }
</style>
