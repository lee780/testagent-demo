<template>
  <div v-if="files.length > 0" class="download-panel">
    <!-- 折叠标题栏 -->
    <button class="panel-header" @click="expanded = !expanded">
      <el-icon class="folder-icon"><FolderOpened /></el-icon>
      <span class="header-title">生成文件</span>
      <span class="file-count">{{ files.length }}</span>
      <button class="refresh-btn" @click.stop="refresh" title="刷新">
        <el-icon><RefreshRight /></el-icon>
      </button>
      <el-icon class="chevron" :class="{ rotated: expanded }"><ArrowDown /></el-icon>
    </button>

    <!-- 折叠内容区 -->
    <div class="panel-body" :class="{ expanded }">
      <ul class="file-list">
        <li v-for="file in files" :key="file.name" class="file-item">
          <el-icon class="file-icon" :style="isMindmap(file.name) ? 'color:#c678dd' : ''">
            <component :is="isMindmap(file.name) ? 'Share' : 'Document'" />
          </el-icon>
          <span
            class="file-name"
            :class="{ 'file-name-link': isHtml(file.name) || isMindmap(file.name) }"
            :title="isHtml(file.name) ? '点击在浏览器中查看' : isMindmap(file.name) ? '点击查看思维导图' : file.name"
            @click="isHtml(file.name) ? openInBrowser(file.name) : isMindmap(file.name) ? openMindmap(file.name) : null"
          >{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <button v-if="isHtml(file.name)" class="dl-btn" @click="openInBrowser(file.name)" title="在浏览器中查看">
            <el-icon><View /></el-icon>
          </button>
          <button v-if="isHtml(file.name)" class="dl-btn save-btn" @click="saveToReportLib(file.name)" title="保存到报告库">
            <el-icon><Upload /></el-icon>
          </button>
          <button v-if="isMindmap(file.name)" class="dl-btn mindmap-btn" @click="openMindmap(file.name)" title="查看思维导图">
            <el-icon><Share /></el-icon>
          </button>
          <button class="dl-btn" @click="download(file.name)" title="下载">
            <el-icon><Download /></el-icon>
          </button>
        </li>
      </ul>
    </div>
  </div>

</template>

<script setup>
import { ref, watch } from 'vue'
import { Document, Download, FolderOpened, RefreshRight, ArrowDown, View, Share, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Transformer } from 'markmap-lib'
import markmapViewSrc from 'markmap-view/dist/browser/index.js?raw'

const props = defineProps({
  conversationId: { type: String, default: null },
  executionMode: { type: String, default: null },
})

const files = ref([])
const expanded = ref(true)

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

function fetchBlob(filename) {
  const token = localStorage.getItem('access_token')
  const url = `/api/conversations/${props.conversationId}/outputs/${encodeURIComponent(filename)}`
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob())
}

function download(filename) {
  fetchBlob(filename).then(blob => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  })
}

function openInBrowser(filename) {
  // 服务端返回 application/octet-stream，必须重建为 text/html 才能在浏览器中渲染
  const token = localStorage.getItem('access_token')
  const url = `/api/conversations/${props.conversationId}/outputs/${encodeURIComponent(filename)}`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.text())
    .then(html => {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    })
}

function isHtml(filename) {
  return filename.toLowerCase().endsWith('.html')
}

function isMindmap(filename) {
  return filename.toLowerCase().endsWith('.mm.md')
}

const transformer = new Transformer()

async function openMindmap(filename) {
  const token = localStorage.getItem('access_token')
  const url = `/api/conversations/${props.conversationId}/outputs/${encodeURIComponent(filename)}`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const markdown = await res.text()
    const title = filename.replace(/\.mm\.md$/i, '')
    const { root } = transformer.transform(markdown)
    const html = buildMindmapHtml(root, title)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
  } catch (e) {
    alert('无法加载思维导图文件：' + e.message)
  }
}

function buildMindmapHtml(root, title) {
  const dataJson = JSON.stringify(root)
  const esc = (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1b2e;overflow:hidden}
#mindmap{width:100vw;height:100vh}
.toolbar{position:fixed;top:12px;right:16px;display:flex;gap:8px;z-index:100}
.toolbar button{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  color:#e0e0e0;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:13px;
  transition:background .15s}
.toolbar button:hover{background:rgba(255,255,255,.22)}
.page-title{position:fixed;top:14px;left:20px;color:rgba(255,255,255,.75);
  font-size:14px;font-weight:500;z-index:100;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.markmap-node text{fill:#e0e0e0!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;font-size:13px!important}
.markmap-link{stroke-opacity:.45!important}
</style>
</head>
<body>
<span class="page-title">🗂 ${esc(title)}</span>
<div class="toolbar">
  <button onclick="mm&&mm.fit()">适配屏幕</button>
  <button onclick="expandAll()">展开全部</button>
  <button onclick="collapseDeep()">折叠子节点</button>
</div>
<svg id="mindmap"></svg>
<script>
${markmapViewSrc}
(function(){
  var root=${dataJson};
  var colors=['#5b9bd5','#70b77e','#e8a838','#e06c75','#c678dd','#56b6c2'];
  var mm=window.markmap.Markmap.create('#mindmap',{
    color:function(n){return colors[n.depth%colors.length]},
    duration:300,nodeMinHeight:22,paddingX:16,autoFit:true
  },root);
  window.mm=mm;
  function walk(node,fn){fn(node);if(node.children)node.children.forEach(function(c){walk(c,fn)});}
  window.expandAll=function(){walk(root,function(n){if(n.payload)n.payload.fold=0;});mm.setData(root);mm.fit();};
  window.collapseDeep=function(){walk(root,function(n){if(n.depth>=2&&n.payload)n.payload.fold=1;});mm.setData(root);mm.fit();};
  window.addEventListener('load',function(){mm.fit();});
})();
<\/script>
</body>
</html>`
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

async function saveToReportLib(filename) {
  let reportName
  try {
    const { value } = await ElMessageBox.prompt('报告名称', '保存到报告库', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: filename.replace(/\.html$/i, ''),
      inputPlaceholder: '请输入报告名称',
    })
    reportName = value?.trim()
  } catch { return }
  if (!reportName) return

  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: reportName,
        conversationId: props.conversationId,
        executionMode: props.executionMode || undefined,
        htmlFile: filename,
      }),
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('已保存到报告库，可在"测试报告"页面查看并确认入库')
    } else {
      ElMessage.error(data.error || '保存失败')
    }
  } catch {
    ElMessage.error('保存请求失败')
  }
}

watch(() => props.conversationId, () => refresh(), { immediate: true })

defineExpose({ refresh })
</script>

<style scoped>
.download-panel {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-top: 1px solid var(--border-color);
  background: var(--main-bg);
  flex-shrink: 0;
}

/* 大屏同步跟随 chat-messages 宽度 */
@media (min-width: 1920px) { .download-panel { max-width: 1000px; } }
@media (min-width: 2560px) { .download-panel { max-width: 1200px; } }
@media (min-width: 3440px) { .download-panel { max-width: 1400px; } }

.panel-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  transition: background 0.15s;
  text-align: left;
}

.panel-header:hover {
  background: var(--sidebar-bg);
}

.folder-icon {
  color: #5b9bd5;
  flex-shrink: 0;
}

.header-title {
  font-weight: 600;
  color: var(--text-primary);
}

.file-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--border-color);
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.refresh-btn:hover {
  color: #5b9bd5;
  background: var(--border-color);
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  font-size: 12px;
}

.chevron.rotated {
  transform: rotate(-180deg);
}

/* 折叠动画 */
.panel-body {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.25s ease;
}

.panel-body.expanded {
  max-height: 260px;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 4px 0 8px;
  overflow-y: auto;
  max-height: 252px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 24px;
  font-size: 13px;
  color: var(--text-primary);
  transition: background 0.12s;
}

.file-item:hover {
  background: var(--sidebar-bg);
}

.file-icon {
  color: #5b9bd5;
  flex-shrink: 0;
  font-size: 14px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.file-name-link {
  cursor: pointer;
  color: #5b9bd5;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.file-name-link:hover {
  color: #3b82f6;
}

.file-size {
  color: var(--text-secondary);
  font-size: 11px;
  flex-shrink: 0;
}

.dl-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 3px 5px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 4px;
  transition: all 0.15s;
}

.dl-btn:hover {
  color: #5b9bd5;
  background: var(--border-color);
}
</style>
