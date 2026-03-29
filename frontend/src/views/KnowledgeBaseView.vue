<template>
  <div class="knowledge-container">
    <div class="knowledge-header">
      <h2 class="knowledge-title">知识库</h2>
      <div class="model-filter">
        <span class="filter-label">模型 ID：</span>
        <el-input
          v-model="activeModelId"
          placeholder="如 MODEL_001"
          clearable
          style="width: 180px"
          @change="onModelChange"
        />
      </div>
    </div>

    <el-tabs v-model="activeTab" class="knowledge-tabs">
      <!-- 业务规则库 -->
      <el-tab-pane label="业务规则库" name="docs">
        <div class="tab-desc">
          <span class="tab-desc-icon">📋</span>
          <span>将业务规范文档（如授信规则、计算公式）按模型 ID 持久化存储。对话时输入模型 ID，Agent 自动读取最新规则——无需每次手动上传文件。<strong>适合</strong>：业务规则频繁变更、多人共用同一套规范的场景。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openDocDialog()">+ 新建文档</el-button>
        </div>
        <el-table :data="docs" stripe size="small" v-loading="docsLoading">
          <el-table-column prop="modelId" label="模型 ID" width="120" />
          <el-table-column prop="title" label="文档名称" />
          <el-table-column prop="version" label="版本" width="70" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                {{ row.isActive ? '激活' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="160">
            <template #default="{ row }">{{ fmtDate(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDocDialog(row)">编辑</el-button>
              <el-button link size="small" @click="toggleDoc(row)">{{ row.isActive ? '停用' : '激活' }}</el-button>
              <el-button link type="danger" size="small" @click="deleteDoc(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 挡板场景库 -->
      <el-tab-pane label="挡板场景库" name="scenes">
        <div class="tab-desc">
          <span class="tab-desc-icon">🎭</span>
          <span>将常用的外部接口挡板参数组合命名保存（如"黑名单用户"、"卡状态异常"）。测试 YAML 中通过 <code>external_setup_ref: "场景名"</code> 引用，避免每条用例重复写挡板配置。<strong>适合</strong>：外部依赖多、测试场景固定的接口测试。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openSceneDialog()">+ 新建场景</el-button>
        </div>
        <el-table :data="scenes" stripe size="small" v-loading="scenesLoading">
          <el-table-column prop="name" label="场景名称" width="200" />
          <el-table-column prop="modelId" label="模型 ID" width="120">
            <template #default="{ row }">{{ row.modelId || '通用' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openSceneDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteScene(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 测试规范库 -->
      <el-tab-pane label="测试规范库" name="specs">
        <div class="tab-desc">
          <span class="tab-desc-icon">📐</span>
          <span>为每个模型/测试模式预设 AI 测试指令（如"优先覆盖拒绝边界"、"每条用例必须给出精确预期值"）。团队成员无需每次在对话中重复说明，保证测试风格和质量标准统一。<strong>适合</strong>：多人协作或有固定测试标准的团队。</span>
        </div>
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="openSpecDialog()">+ 新建规范</el-button>
        </div>
        <el-table :data="specs" stripe size="small" v-loading="specsLoading">
          <el-table-column prop="modelId" label="模型 ID" width="120" />
          <el-table-column label="适用模式" width="120">
            <template #default="{ row }">{{ row.mode || '全模式' }}</template>
          </el-table-column>
          <el-table-column prop="name" label="规范名称" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                {{ row.isActive ? '激活' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openSpecDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteSpec(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

    </el-tabs>

    <!-- 业务规则文档 Dialog -->
    <el-dialog v-model="docDialogVisible" :title="docForm.id ? '编辑文档' : '新建业务规则文档'" width="780px" top="5vh">
      <el-form :model="docForm" label-width="90px">
        <el-form-item label="模型 ID" required>
          <el-input v-model="docForm.modelId" placeholder="如 MODEL_001" />
        </el-form-item>
        <el-form-item label="文档名称" required>
          <el-input v-model="docForm.title" />
        </el-form-item>
        <el-form-item label="版本号">
          <el-input-number v-model="docForm.version" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="内容（MD）" required>
          <el-input
            v-model="docForm.content"
            type="textarea"
            :rows="18"
            placeholder="Markdown 格式，支持标题、表格、代码块等"
            style="font-family: monospace; font-size: 13px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="docDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDoc" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 挡板场景 Dialog -->
    <el-dialog v-model="sceneDialogVisible" :title="sceneForm.id ? '编辑场景' : '新建挡板场景'" width="620px">
      <el-form :model="sceneForm" label-width="90px">
        <el-form-item label="场景名称" required>
          <el-input v-model="sceneForm.name" placeholder="全局唯一，YAML 中按此名引用" />
        </el-form-item>
        <el-form-item label="模型 ID">
          <el-input v-model="sceneForm.modelId" placeholder="留空=通用场景" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="sceneForm.description" />
        </el-form-item>
        <el-form-item label="挡板数据" required>
          <el-input
            v-model="sceneForm.setupDataStr"
            type="textarea"
            :rows="8"
            placeholder='{"card_status":"NORMAL","recent_trans_amount":5800.5,"id_check_result":"PASS","is_black":false}'
            style="font-family: monospace; font-size: 13px"
          />
          <div class="field-tip">JSON 格式，对应 YAML 中 external_setup 的内容</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sceneDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveScene" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试规范 Dialog -->
    <el-dialog v-model="specDialogVisible" :title="specForm.id ? '编辑规范' : '新建测试规范'" width="700px" top="5vh">
      <el-form :model="specForm" label-width="90px">
        <el-form-item label="模型 ID" required>
          <el-input v-model="specForm.modelId" placeholder="如 MODEL_001" />
        </el-form-item>
        <el-form-item label="适用模式">
          <el-select v-model="specForm.mode" placeholder="留空=全模式" clearable>
            <el-option label="系统化（systematic）" value="systematic" />
            <el-option label="回归（regression）" value="regression" />
            <el-option label="探索（exploratory）" value="exploratory" />
          </el-select>
        </el-form-item>
        <el-form-item label="规范名称" required>
          <el-input v-model="specForm.name" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="specForm.description" placeholder="给团队看的背景说明" />
        </el-form-item>
        <el-form-item label="规范内容" required>
          <el-input
            v-model="specForm.customInstructions"
            type="textarea"
            :rows="12"
            placeholder="用自然语言描述测试要求，Agent 执行时会自动遵守"
            style="font-family: monospace; font-size: 13px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="specForm.isActive" active-text="激活" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="specDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSpec" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knowledgeDocs, mockScenes, testSpecs } from '../api/knowledge.js'

// ── 状态 ─────────────────────────────────────────────────
const activeTab = ref('docs')
const activeModelId = ref('')
const saving = ref(false)

// 业务规则库
const docs = ref([])
const docsLoading = ref(false)
const docDialogVisible = ref(false)
const docForm = ref({ id: '', modelId: '', title: '', content: '', version: 1 })

// 挡板场景库
const scenes = ref([])
const scenesLoading = ref(false)
const sceneDialogVisible = ref(false)
const sceneForm = ref({ id: '', name: '', modelId: '', description: '', setupDataStr: '' })

// 测试规范库
const specs = ref([])
const specsLoading = ref(false)
const specDialogVisible = ref(false)
const specForm = ref({ id: '', modelId: '', mode: '', name: '', description: '', customInstructions: '', isActive: true })

// ── 加载数据 ──────────────────────────────────────────────
async function loadDocs() {
  docsLoading.value = true
  try {
    const res = await knowledgeDocs.list({ modelId: activeModelId.value || undefined, includeInactive: true })
    docs.value = res.data ?? []
  } catch { ElMessage.error('加载业务规则文档失败') } finally { docsLoading.value = false }
}

async function loadScenes() {
  scenesLoading.value = true
  try {
    const res = await mockScenes.list({ modelId: activeModelId.value || undefined })
    scenes.value = res.data ?? []
  } catch { ElMessage.error('加载挡板场景失败') } finally { scenesLoading.value = false }
}

async function loadSpecs() {
  specsLoading.value = true
  try {
    const res = await testSpecs.list({ modelId: activeModelId.value || undefined })
    specs.value = res.data ?? []
  } catch { ElMessage.error('加载测试规范失败') } finally { specsLoading.value = false }
}

function onModelChange() {
  loadAll()
}

function loadAll() {
  loadDocs()
  loadScenes()
  loadSpecs()
}

onMounted(loadAll)

// ── 业务规则文档 CRUD ─────────────────────────────────────
function openDocDialog(row) {
  if (row) {
    docForm.value = { id: row.id, modelId: row.modelId, title: row.title, content: '', version: row.version }
    // 异步加载 content
    knowledgeDocs.get(row.id).then(res => { docForm.value.content = res.data?.content ?? '' })
  } else {
    docForm.value = { id: '', modelId: activeModelId.value, title: '', content: '', version: 1 }
  }
  docDialogVisible.value = true
}

async function saveDoc() {
  if (!docForm.value.modelId || !docForm.value.title || !docForm.value.content) {
    return ElMessage.warning('请填写必填字段')
  }
  saving.value = true
  try {
    if (docForm.value.id) {
      await knowledgeDocs.update(docForm.value.id, {
        title: docForm.value.title, content: docForm.value.content, version: docForm.value.version
      })
    } else {
      await knowledgeDocs.create({ modelId: docForm.value.modelId, title: docForm.value.title, content: docForm.value.content })
    }
    ElMessage.success('保存成功')
    docDialogVisible.value = false
    loadDocs()
  } catch (e) { ElMessage.error('保存失败：' + (e?.response?.data?.message ?? e.message)) } finally { saving.value = false }
}

async function toggleDoc(row) {
  await knowledgeDocs.toggle(row.id, !row.isActive)
  loadDocs()
}

async function deleteDoc(id) {
  await ElMessageBox.confirm('确认删除此文档？', '提示', { type: 'warning' })
  await knowledgeDocs.delete(id)
  ElMessage.success('已删除')
  loadDocs()
}

// ── 挡板场景 CRUD ─────────────────────────────────────────
function openSceneDialog(row) {
  if (row) {
    sceneForm.value = {
      id: row.id, name: row.name, modelId: row.modelId ?? '', description: row.description ?? '',
      setupDataStr: JSON.stringify(row.setupData, null, 2)
    }
  } else {
    sceneForm.value = { id: '', name: '', modelId: activeModelId.value, description: '', setupDataStr: '' }
  }
  sceneDialogVisible.value = true
}

async function saveScene() {
  if (!sceneForm.value.name || !sceneForm.value.setupDataStr) return ElMessage.warning('场景名称和挡板数据必填')
  let setupData
  try { setupData = JSON.parse(sceneForm.value.setupDataStr) } catch { return ElMessage.error('挡板数据不是合法 JSON') }
  saving.value = true
  try {
    const payload = { name: sceneForm.value.name, modelId: sceneForm.value.modelId || undefined, description: sceneForm.value.description, setupData }
    if (sceneForm.value.id) await mockScenes.update(sceneForm.value.id, payload)
    else await mockScenes.create(payload)
    ElMessage.success('保存成功')
    sceneDialogVisible.value = false
    loadScenes()
  } catch (e) { ElMessage.error('保存失败：' + (e?.response?.data?.message ?? e.message)) } finally { saving.value = false }
}

async function deleteScene(id) {
  await ElMessageBox.confirm('确认删除此场景？', '提示', { type: 'warning' })
  await mockScenes.delete(id)
  ElMessage.success('已删除')
  loadScenes()
}

// ── 测试规范 CRUD ─────────────────────────────────────────
function openSpecDialog(row) {
  if (row) {
    knowledgeDocs  // 使用 row 直接编辑，通过 get 获取 customInstructions
    specForm.value = { id: row.id, modelId: row.modelId, mode: row.mode ?? '', name: row.name, description: row.description ?? '', customInstructions: '', isActive: row.isActive }
    testSpecs.get(row.id).then(res => { specForm.value.customInstructions = res.data?.customInstructions ?? '' })
  } else {
    specForm.value = { id: '', modelId: activeModelId.value, mode: '', name: '', description: '', customInstructions: '', isActive: true }
  }
  specDialogVisible.value = true
}

async function saveSpec() {
  if (!specForm.value.modelId || !specForm.value.name || !specForm.value.customInstructions) return ElMessage.warning('必填字段不能为空')
  saving.value = true
  try {
    const payload = { modelId: specForm.value.modelId, mode: specForm.value.mode || undefined, name: specForm.value.name, description: specForm.value.description, customInstructions: specForm.value.customInstructions, isActive: specForm.value.isActive }
    if (specForm.value.id) await testSpecs.update(specForm.value.id, payload)
    else await testSpecs.create(payload)
    ElMessage.success('保存成功')
    specDialogVisible.value = false
    loadSpecs()
  } catch (e) { ElMessage.error('保存失败：' + (e?.response?.data?.message ?? e.message)) } finally { saving.value = false }
}

async function deleteSpec(id) {
  await ElMessageBox.confirm('确认删除此规范？', '提示', { type: 'warning' })
  await testSpecs.delete(id)
  ElMessage.success('已删除')
  loadSpecs()
}

// ── 工具 ──────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.knowledge-container { padding: 20px; height: 100%; overflow-y: auto; }
.knowledge-header { display: flex; align-items: center; gap: 24px; margin-bottom: 16px; }
.knowledge-title { margin: 0; font-size: 18px; font-weight: 600; }
.filter-label { font-size: 13px; color: #666; }
.model-filter { display: flex; align-items: center; gap: 8px; }
.knowledge-tabs { flex: 1; }
.tab-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.toolbar-tip { font-size: 12px; color: #aaa; margin-left: 8px; }
.empty-hint { color: #aaa; font-size: 13px; padding: 32px 0; text-align: center; }
.field-tip { font-size: 12px; color: #aaa; margin-top: 4px; }
.tab-desc { display: flex; align-items: flex-start; gap: 8px; background: var(--sidebar-bg, #f5f7fa); border-left: 3px solid #5b9bd5; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: var(--text-secondary, #666); line-height: 1.6; }
.tab-desc code { background: rgba(91,155,213,0.12); padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #3a7ec8; }
.tab-desc strong { color: var(--text-primary, #333); }
.tab-desc-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
</style>
