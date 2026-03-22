<template>
  <div class="stub-container">
    <div class="stub-header">
      <h2 class="stub-title">挡板管理</h2>
      <div class="stub-status">
        <span class="status-dot" :class="online ? 'dot-online' : 'dot-offline'"></span>
        <span class="status-text">{{ online ? '挡板服务在线' : '挡板服务离线' }}</span>
        <span class="status-url">localhost:{{ stubPort }}</span>
        <el-button size="small" text @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="stub-tabs">

      <!-- ── 已注册路由 ── -->
      <el-tab-pane label="已注册路由" name="routes">
        <div class="tab-desc">
          <span class="tab-desc-icon">🔀</span>
          <span>挡板拦截的外呼路径及返回体。每条路由对应一个 <code>method + path</code>，命中后返回配置的 JSON。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openRouteDialog()">+ 新建路由</el-button>
          <el-button size="small" type="danger" plain @click="clearRoutes" :disabled="routes.length === 0">清空全部</el-button>
        </div>
        <el-table :data="routes" stripe size="small" v-loading="routesLoading" empty-text="暂无已注册路由">
          <el-table-column label="服务名" prop="name" width="140">
            <template #default="{ row }">{{ row.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="Method" prop="method" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="methodColor(row.method)">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Path" prop="path" />
          <el-table-column label="状态码" prop="statusCode" width="80" />
          <el-table-column label="返回体预览">
            <template #default="{ row }">
              <code class="response-preview">{{ JSON.stringify(row.response).slice(0, 80) }}{{ JSON.stringify(row.response).length > 80 ? '…' : '' }}</code>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openRouteDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteRoute(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 外部服务 ── -->
      <el-tab-pane label="外部服务" name="services">
        <div class="tab-desc">
          <span class="tab-desc-icon">🔌</span>
          <span>C 系统外呼清单。授信计算时会并行调用此列表中所有路径，合并返回字段作为外部指标。<strong>路由必须同时在「已注册路由」中配置返回体</strong>，否则返回 404。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openSvcDialog()">+ 新增外部服务</el-button>
          <el-button size="small" type="danger" plain @click="clearServices" :disabled="services.length === 0">清空全部</el-button>
        </div>
        <el-table :data="services" stripe size="small" v-loading="svcsLoading" empty-text="暂无已注册外部服务">
          <el-table-column label="服务名" prop="name" />
          <el-table-column label="外呼路径" prop="path" />
          <el-table-column label="Method" prop="method" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="methodColor(row.method)">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="路由状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="hasRoute(row) ? 'success' : 'warning'">
                {{ hasRoute(row) ? '已配置' : '缺路由' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="deleteService(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

    </el-tabs>

    <!-- ── 新建/编辑路由弹窗 ── -->
    <el-dialog v-model="routeDialogVisible" :title="editingRoute ? '编辑路由' : '新建路由'" width="560px">
      <el-form :model="routeForm" label-width="80px" size="small">
        <el-form-item label="服务名">
          <el-input v-model="routeForm.name" placeholder="如：支付宝（可选，方便识别）" />
        </el-form-item>
        <el-form-item label="Method">
          <el-select v-model="routeForm.method" style="width: 120px">
            <el-option label="POST" value="POST" />
            <el-option label="GET" value="GET" />
            <el-option label="* (通配)" value="*" />
          </el-select>
        </el-form-item>
        <el-form-item label="Path">
          <el-input v-model="routeForm.path" placeholder="/alipay/query" />
        </el-form-item>
        <el-form-item label="状态码">
          <el-input-number v-model="routeForm.statusCode" :min="100" :max="599" />
        </el-form-item>
        <el-form-item label="返回体">
          <el-input
            v-model="routeForm.responseText"
            type="textarea"
            :rows="6"
            placeholder='{ "cardStatus": "NORMAL", "recentTransAmount": "5000" }'
            :class="{ 'json-error': !!routeForm.jsonError }"
            @input="validateJson"
          />
          <div v-if="routeForm.jsonError" class="json-error-msg">{{ routeForm.jsonError }}</div>
        </el-form-item>
        <el-form-item label="同时注册">
          <el-checkbox v-model="routeForm.alsoRegisterSvc">将此路径加入外部服务列表（C 系统外呼）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="routeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoute" :disabled="!!routeForm.jsonError">保存</el-button>
      </template>
    </el-dialog>

    <!-- ── 新增外部服务弹窗 ── -->
    <el-dialog v-model="svcDialogVisible" title="新增外部服务" width="440px">
      <el-form :model="svcForm" label-width="80px" size="small">
        <el-form-item label="服务名">
          <el-input v-model="svcForm.name" placeholder="如：公积金中心" />
        </el-form-item>
        <el-form-item label="外呼路径">
          <el-input v-model="svcForm.path" placeholder="/gjj/query" />
        </el-form-item>
        <el-form-item label="Method">
          <el-select v-model="svcForm.method" style="width: 120px">
            <el-option label="POST" value="POST" />
            <el-option label="GET" value="GET" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="svcDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSvc">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const STUB_URL = `http://localhost:${import.meta.env.VITE_STUB_PORT || 8002}`
const stubPort = import.meta.env.VITE_STUB_PORT || 8002

const online = ref(false)
const activeTab = ref('routes')

const routes = ref([])
const services = ref([])
const routesLoading = ref(false)
const svcsLoading = ref(false)

const routeDialogVisible = ref(false)
const svcDialogVisible = ref(false)
const editingRoute = ref(null)

const routeForm = reactive({
  name: '', method: 'POST', path: '', statusCode: 200,
  responseText: '{}', jsonError: '', alsoRegisterSvc: true,
})
const svcForm = reactive({ name: '', path: '', method: 'POST' })

// ── 工具 ──────────────────────────────────────────────────

function methodColor(m) {
  if (m === 'GET') return 'success'
  if (m === 'POST') return 'primary'
  return 'info'
}

function hasRoute(svc) {
  return routes.value.some(r =>
    r.path === svc.path && (r.method === svc.method || r.method === '*')
  )
}

function validateJson() {
  try { JSON.parse(routeForm.responseText); routeForm.jsonError = '' }
  catch (e) { routeForm.jsonError = e.message }
}

// ── API ───────────────────────────────────────────────────

async function checkOnline() {
  try {
    const r = await fetch(`${STUB_URL}/health`, { signal: AbortSignal.timeout(2000) })
    online.value = r.ok
  } catch { online.value = false }
}

async function loadRoutes() {
  routesLoading.value = true
  try {
    const r = await fetch(`${STUB_URL}/_admin/routes`)
    routes.value = await r.json()
  } catch { routes.value = [] }
  finally { routesLoading.value = false }
}

async function loadServices() {
  svcsLoading.value = true
  try {
    const r = await fetch(`${STUB_URL}/_admin/ext-services`)
    services.value = await r.json()
  } catch { services.value = [] }
  finally { svcsLoading.value = false }
}

async function loadAll() {
  await checkOnline()
  await Promise.all([loadRoutes(), loadServices()])
}

// ── 路由 CRUD ─────────────────────────────────────────────

function openRouteDialog(row = null) {
  editingRoute.value = row
  if (row) {
    routeForm.name = row.name || ''
    routeForm.method = row.method
    routeForm.path = row.path
    routeForm.statusCode = row.statusCode
    routeForm.responseText = JSON.stringify(row.response, null, 2)
    routeForm.jsonError = ''
    routeForm.alsoRegisterSvc = false
  } else {
    routeForm.name = ''; routeForm.method = 'POST'; routeForm.path = ''
    routeForm.statusCode = 200; routeForm.responseText = '{\n  \n}'
    routeForm.jsonError = ''; routeForm.alsoRegisterSvc = true
  }
  routeDialogVisible.value = true
}

async function saveRoute() {
  validateJson()
  if (routeForm.jsonError) return
  if (!routeForm.path) { ElMessage.warning('Path 不能为空'); return }

  const payload = {
    name: routeForm.name || undefined,
    method: routeForm.method,
    path: routeForm.path,
    statusCode: routeForm.statusCode,
    response: JSON.parse(routeForm.responseText),
  }

  await fetch(`${STUB_URL}/_admin/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (routeForm.alsoRegisterSvc && !editingRoute.value) {
    await fetch(`${STUB_URL}/_admin/ext-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: routeForm.name || routeForm.path, path: routeForm.path, method: routeForm.method }),
    })
  }

  ElMessage.success('路由已保存')
  routeDialogVisible.value = false
  await loadAll()
}

async function deleteRoute(row) {
  await ElMessageBox.confirm(`删除路由 ${row.method} ${row.path}？`, '确认删除', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/routes`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: row.method, path: row.path }),
  })
  ElMessage.success('已删除')
  await loadAll()
}

async function clearRoutes() {
  await ElMessageBox.confirm('清空所有已注册路由？', '确认清空', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/routes/clear`, { method: 'DELETE' })
  ElMessage.success('已清空')
  await loadAll()
}

// ── 外部服务 CRUD ─────────────────────────────────────────

function openSvcDialog() {
  svcForm.name = ''; svcForm.path = ''; svcForm.method = 'POST'
  svcDialogVisible.value = true
}

async function saveSvc() {
  if (!svcForm.name || !svcForm.path) { ElMessage.warning('服务名和路径不能为空'); return }
  await fetch(`${STUB_URL}/_admin/ext-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: svcForm.name, path: svcForm.path, method: svcForm.method }),
  })
  ElMessage.success('外部服务已注册')
  svcDialogVisible.value = false
  await loadServices()
}

async function deleteService(row) {
  await ElMessageBox.confirm(`移除外部服务「${row.name}」？C 系统将不再外呼此路径。`, '确认移除', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/ext-services`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: row.path }),
  })
  ElMessage.success('已移除')
  await loadServices()
}

async function clearServices() {
  await ElMessageBox.confirm('清空所有外部服务？C 系统将无外呼指标。', '确认清空', { type: 'warning' })
  await fetch(`${STUB_URL}/_admin/ext-services/clear`, { method: 'DELETE' })
  ElMessage.success('已清空')
  await loadServices()
}

onMounted(loadAll)
</script>

<style scoped>
.stub-container { padding: 24px; max-width: 1100px; }

.stub-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.stub-title { margin: 0; font-size: 20px; font-weight: 600; }

.stub-status {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--el-text-color-secondary);
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-online  { background: #67c23a; }
.dot-offline { background: #f56c6c; }
.status-url  { font-family: monospace; color: var(--el-text-color-placeholder); }

.stub-tabs { margin-top: 0; }

.tab-desc {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; margin-bottom: 14px;
  background: var(--el-fill-color-light); border-radius: 6px;
  font-size: 13px; color: var(--el-text-color-secondary); line-height: 1.6;
}
.tab-desc-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.tab-desc code {
  background: var(--el-fill-color); padding: 1px 5px; border-radius: 3px;
  font-family: monospace; font-size: 12px;
}

.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }

.response-preview {
  font-family: monospace; font-size: 11px;
  color: var(--el-text-color-secondary);
}

.json-error .el-textarea__inner { border-color: var(--el-color-danger); }
.json-error-msg { font-size: 12px; color: var(--el-color-danger); margin-top: 4px; }
</style>
