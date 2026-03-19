<template>
  <div v-if="files.length > 0" class="download-panel">
    <div class="download-panel-header">
      <el-icon><FolderOpened /></el-icon>
      <span>生成文件</span>
      <button class="refresh-btn" @click="refresh" title="刷新">
        <el-icon><RefreshRight /></el-icon>
      </button>
    </div>
    <ul class="download-file-list">
      <li v-for="file in files" :key="file.name" class="download-file-item">
        <el-icon class="file-icon"><Document /></el-icon>
        <span class="file-name" :title="file.name">{{ file.name }}</span>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <button class="dl-btn" @click="download(file.name)" title="下载">
          <el-icon><Download /></el-icon>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Document, Download, FolderOpened, RefreshRight } from '@element-plus/icons-vue'

const props = defineProps({
  conversationId: { type: String, default: null }
})

const files = ref([])

async function refresh() {
  if (!props.conversationId) { files.value = []; return }
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/conversations/${props.conversationId}/outputs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) {
      files.value = (data.data || []).sort((a, b) => b.mtime - a.mtime)
    }
  } catch {
    files.value = []
  }
}

function download(filename) {
  const token = localStorage.getItem('access_token')
  const url = `/api/conversations/${props.conversationId}/outputs/${encodeURIComponent(filename)}`
  // Use fetch + blob to trigger download with auth header
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    })
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

watch(() => props.conversationId, () => refresh(), { immediate: true })

// Expose refresh so parent can trigger after agent completes
defineExpose({ refresh })
</script>

<style scoped>
.download-panel {
  position: fixed;
  right: 16px;
  top: 80px;
  width: 240px;
  background: var(--el-bg-color, #1a1a2e);
  border: 1px solid var(--el-border-color, #333);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  z-index: 100;
  overflow: hidden;
}

.download-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--el-fill-color, #252540);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #e0e0e0);
  border-bottom: 1px solid var(--el-border-color, #333);
}

.download-panel-header .el-icon {
  color: #7c6ef7;
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-secondary, #888);
  padding: 2px;
  display: flex;
  align-items: center;
}

.refresh-btn:hover { color: #7c6ef7; }

.download-file-list {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  max-height: 400px;
  overflow-y: auto;
}

.download-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--el-text-color-regular, #ccc);
  transition: background 0.15s;
}

.download-file-item:hover {
  background: var(--el-fill-color-light, #2a2a45);
}

.file-icon { color: #7c6ef7; flex-shrink: 0; }

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--el-text-color-secondary, #888);
  font-size: 11px;
  flex-shrink: 0;
}

.dl-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-secondary, #888);
  padding: 2px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.dl-btn:hover { color: #7c6ef7; }
</style>
