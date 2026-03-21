<template>
  <div class="chat-container-root">
    <!-- 右侧聊天区域 -->
    <main class="chat-main">
      <div class="chat-container" :class="{ 'has-messages': hasMessages }">
        <!-- 无对话时的居中布局 -->
        <div v-if="!hasMessages" class="empty-state">
          <div class="platform-intro">
            <div class="platform-brand">
              <span class="platform-icon">✈</span>
              <div>
                <h1 class="platform-name">TestPilot <span class="platform-name-cn">测试领航</span></h1>
                <p class="platform-tagline">从文档到报告，全程无人驾驶</p>
              </div>
            </div>
            <p class="platform-desc">
              上传业务规则文档，AI 自动生成接口测试用例、执行测试、输出 HTML 测试报告，支持多系统对比缺陷识别，全程无需人工干预。
            </p>
            <div class="level-grid">
              <div class="level-card">
                <div class="level-badge">L1</div>
                <div class="level-body">
                  <div class="level-title">辅助测试</div>
                  <div class="level-desc">手动设计用例，Postman / JMeter 辅助执行</div>
                </div>
              </div>
              <div class="level-card">
                <div class="level-badge">L2</div>
                <div class="level-body">
                  <div class="level-title">半自动测试</div>
                  <div class="level-desc">工具生成框架，人工补全后执行，Robot Framework</div>
                </div>
              </div>
              <div class="level-card">
                <div class="level-badge">L3</div>
                <div class="level-body">
                  <div class="level-title">条件自动化</div>
                  <div class="level-desc">AI 生成用例，人工 Review 后一键执行</div>
                </div>
              </div>
              <div class="level-card level-current">
                <div class="level-badge current">L4 · 当前</div>
                <div class="level-body">
                  <div class="level-title">高度自动化</div>
                  <div class="level-desc">文档 → 用例 → 执行 → 报告，双系统对比缺陷识别，全自动</div>
                </div>
              </div>
              <div class="level-card level-future">
                <div class="level-badge future">L5 · 规划中</div>
                <div class="level-body">
                  <div class="level-title">完全自动化</div>
                  <div class="level-desc">持续回归 + 缺陷自动定位 + CI/CD 集成 + 智能分析</div>
                </div>
              </div>
            </div>
          </div>
          <h2 class="welcome-title">我现在能怎么帮您？</h2>
          
          <div class="prompt-input-container">
            <!-- 文件预览区 -->
            <div v-if="selectedFiles.length > 0" class="file-preview-list">
              <div
                v-for="(file, idx) in selectedFiles"
                :key="idx"
                class="file-preview-tab"
              >
                <div class="file-info">
                  <el-icon><Document /></el-icon>
                  <span class="file-name">{{ file.name }}</span>
                </div>
                <button class="cancel-file-btn" @click="cancelFile(idx)">
                  <el-icon><Close /></el-icon>
                </button>
              </div>
            </div>

            <div class="prompt-input-input-area">
              <textarea
                ref="inputTextarea"
                v-model="inputMessage"
                placeholder="有什么我能帮您的吗？"
                @input="adjustTextareaHeight"
                @keydown="handleKeydown"
                rows="1"
              ></textarea>
            </div>

            <div class="prompt-input-action-bar">
              <button
                class="action-btn upload-btn"
                @click="triggerFileInput"
                :disabled="loading"
                title="上传文件"
              >
                <el-icon><Paperclip /></el-icon>
              </button>
              <div class="mode-switcher">
                <button
                  v-for="m in testModes"
                  :key="m.value"
                  class="mode-btn"
                  :class="{ active: currentMode === m.value }"
                  :style="currentMode === m.value ? { borderColor: m.color, color: m.color, background: m.bg } : {}"
                  :title="m.desc"
                  @click="currentMode = m.value"
                >
                  {{ m.icon }} {{ m.label }}
                </button>
              </div>
              <div class="spacer"></div>
              <button
                class="action-btn send-btn"
                @click="sendMessage"
                :disabled="(!inputMessage.trim() && !selectedFiles.length) || loading"
                title="发送消息"
              >
                <el-icon><Top /></el-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- 有对话时的布局 -->
        <template v-else>
          <div class="chat-messages" ref="messagesContainer">
            <div 
              v-for="(msg, index) in messages" 
              :key="index" 
              :class="['message', msg.role]"
            >
              <div class="message-content">
                <div class="message-avatar">
                  {{ msg.role === 'user' ? 'U' : 'A' }}
                </div>
                <div class="message-text">
                  <template v-if="msg.role === 'user'">
                    <span class="user-msg-text">{{ msg.content.replace(/\n\n\[文件已上传:[^\]]*\]/g, '').replace(/\n\n\[文件上传失败:[^\]]*\]/g, '').trim() }}</span>
                    <div v-if="/\[文件已上传:/.test(msg.content)" class="user-msg-files">
                      <span
                        v-for="fname in msg.content.match(/\[文件已上传:\s*([^\]]+)\]/)?.[1]?.split(',').map(s => s.trim()) || []"
                        :key="fname"
                        class="user-file-tag"
                      >📄 {{ fname }}</span>
                    </div>
                    <button
                      v-if="!loading && index === messages.length - 1"
                      class="rerun-btn"
                      @click="rerunMessage(msg.content)"
                      title="重新执行"
                    >↺ 重新执行</button>
                  </template>
                  <template v-else-if="msg.role === 'assistant'">
                    <!-- 思考过程展示（灰色小号字体） -->
                    <div v-if="msg.thinking" class="thinking-block">
                      <div class="thinking-label">思考过程</div>
                      <div class="thinking-content">{{ msg.thinking }}</div>
                    </div>

                    <!-- 事件驱动渲染（新模型） -->
                    <template v-if="msg.events && msg.events.length > 0">
                      <template v-for="(event, eIdx) in msg.events">
                        <MarkdownViewer
                          v-if="event.type === 'text'"
                          :key="'text-' + eIdx"
                          :content="event.content"
                        />
                        <ToolCallCard
                          v-else-if="event.type === 'tool_call'"
                          :key="'tool-' + (event.id || eIdx)"
                          :tool="event"
                          :result="findToolResult(msg.events, event.id)"
                        />
                        <!-- tool_result events are rendered inside ToolCallCard -->
                      </template>
                    </template>
                    <!-- 兼容旧消息格式（无 events 字段） -->
                    <template v-else>
                      <MarkdownViewer
                        v-if="msg.content"
                        :content="msg.content"
                      />
                    </template>

                    <!-- 执行完成报告卡片 -->
                    <div v-if="msg.reportCard" class="report-ready-card">
                      <div class="rrc-icon">📋</div>
                      <div class="rrc-body">
                        <div class="rrc-title">测试执行完成</div>
                        <div class="rrc-desc">已生成 {{ msg.reportCard.files.length }} 个 HTML 文件，点击保存到报告库后可管理用例入库</div>
                      </div>
                      <router-link to="/reports" class="rrc-btn">报告库 →</router-link>
                    </div>

                    <!-- 实时测试进度块 -->
                    <div v-if="msg.testProgress && msg.testProgress.total > 0" class="test-progress-block">
                      <div class="tp-header">
                        <span class="tp-title">🧪 测试执行进度</span>
                        <span class="tp-stats">
                          {{ msg.testProgress.current }}/{{ msg.testProgress.total }}
                          &nbsp;·&nbsp;
                          <span class="tp-pass">✅ {{ msg.testProgress.passed }}</span>
                          &nbsp;
                          <span class="tp-fail">❌ {{ msg.testProgress.failed }}</span>
                          &nbsp;·&nbsp;
                          通过率 {{ msg.testProgress.total > 0 ? ((msg.testProgress.passed / msg.testProgress.total) * 100).toFixed(1) : 0 }}%
                        </span>
                      </div>
                      <div class="tp-bar-wrap">
                        <div class="tp-bar-bg">
                          <div class="tp-bar-pass" :style="{ width: (msg.testProgress.passed / msg.testProgress.total * 100) + '%' }"></div>
                          <div class="tp-bar-fail" :style="{ width: (msg.testProgress.failed / msg.testProgress.total * 100) + '%', left: (msg.testProgress.passed / msg.testProgress.total * 100) + '%' }"></div>
                        </div>
                      </div>
                      <div class="tp-dots">
                        <span
                          v-for="(c, i) in msg.testProgress.cases"
                          :key="i"
                          class="tp-dot"
                          :class="c.status === 'PASSED' ? 'tp-dot-pass' : c.status === 'FAILED' ? 'tp-dot-fail' : 'tp-dot-error'"
                          :title="c.id + ': ' + c.status"
                        ></span>
                      </div>
                    </div>

                    <!-- 测试用例展示 -->
                    <div v-if="msg.testcases && msg.testcases.length > 0" class="testcases-block">
                      <div class="testcases-header">
                        <el-icon><DocumentChecked /></el-icon>
                        <span>测试用例（共 {{ msg.testcases.length }} 个）</span>
                      </div>
                      <el-collapse class="testcases-list">
                        <el-collapse-item
                          v-for="(testcase, idx) in msg.testcases"
                          :key="testcase.id || idx"
                          :name="idx"
                        >
                          <template #title>
                            <div class="testcase-title">
                              <el-tag :type="testcase.tags?.includes('security') ? 'danger' : testcase.tags?.includes('negative') ? 'warning' : 'success'" size="small">
                                {{ testcase.tags?.[0] || 'test' }}
                              </el-tag>
                              <span>{{ testcase.interface_name || testcase.description || `测试用例 #${idx + 1}` }}</span>
                            </div>
                          </template>
                          <div class="testcase-details">
                            <div class="detail-row">
                              <strong>接口路径:</strong> {{ testcase.interface_path || testcase.request?.url }}
                            </div>
                            <div class="detail-row">
                              <strong>请求方法:</strong> {{ testcase.request?.method || 'POST' }}
                            </div>
                            <div v-if="testcase.request?.body" class="detail-row">
                              <strong>请求参数:</strong>
                              <pre>{{ JSON.stringify(testcase.request.body, null, 2) }}</pre>
                            </div>
                            <div v-if="testcase.assertions?.length" class="detail-row">
                              <strong>断言:</strong>
                              <ul>
                                <li v-for="(assertion, aIdx) in testcase.assertions" :key="aIdx">
                                  {{ assertion.description || `${assertion.type}: ${assertion.expected}` }}
                                </li>
                              </ul>
                            </div>
                            <div v-if="testcase.description" class="detail-row">
                              <strong>说明:</strong> {{ testcase.description }}
                            </div>
                          </div>
                        </el-collapse-item>
                      </el-collapse>
                    </div>
                    <div v-else-if="loading && index === messages.length - 1 && !msg.events?.length && !msg.content" class="loading-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </template>
                  <span v-if="loading && msg.role === 'assistant' && index === messages.length - 1 && (msg.content || msg.events?.length)" class="typing-cursor"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 计划步骤展示组件 -->
          <PlanStepBar :planData="currentPlanData" />

          <!-- 生成文件下载面板（嵌入式折叠） -->
          <FileDownloadPanel ref="downloadPanel" :conversation-id="currentConversationId" :execution-mode="currentMode" />

          <div class="bottom-input-wrapper">
            <div class="bottom-input-container">
              <!-- 文件预览区 -->
              <div v-if="selectedFiles.length > 0" class="file-preview-list">
                <div
                  v-for="(file, idx) in selectedFiles"
                  :key="idx"
                  class="file-preview-tab"
                >
                  <div class="file-info">
                    <el-icon><Document /></el-icon>
                    <span class="file-name">{{ file.name }}</span>
                  </div>
                  <button class="cancel-file-btn" @click="cancelFile(idx)">
                    <el-icon><Close /></el-icon>
                  </button>
                </div>
              </div>

              <div class="prompt-input-input-area">
                <textarea
                  ref="bottomInputTextarea"
                  v-model="inputMessage"
                  placeholder="输入消息..."
                  @input="adjustBottomTextareaHeight"
                  @keydown="handleKeydown"
                  rows="1"
                ></textarea>
              </div>

              <div class="prompt-input-action-bar">
                <button
                  class="action-btn upload-btn"
                  @click="triggerFileInput"
                  :disabled="loading"
                  title="上传文件"
                >
                  <el-icon><Paperclip /></el-icon>
                </button>
                <div class="mode-switcher">
                  <button
                    v-for="m in testModes"
                    :key="m.value"
                    class="mode-btn"
                    :class="{ active: currentMode === m.value }"
                    :style="currentMode === m.value ? { borderColor: m.color, color: m.color, background: m.bg } : {}"
                    :title="m.desc"
                    @click="currentMode = m.value"
                  >
                    {{ m.icon }} {{ m.label }}
                  </button>
                </div>
                <div class="spacer"></div>
                <!-- 发送/终止按钮 -->
                <button
                  v-if="!loading || !currentReplyId"
                  class="action-btn send-btn"
                  @click="sendMessage"
                  :disabled="(!inputMessage.trim() && !selectedFiles.length) || loading"
                  title="发送消息"
                >
                  <el-icon><Top /></el-icon>
                </button>
                <button
                  v-else
                  class="action-btn stop-btn"
                  @click="stopAgent"
                  title="终止生成"
                >
                  <el-icon><Close /></el-icon>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- 隐藏的文件上传 input -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      multiple
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import api from '@/api'
import { useChatStore } from '@/stores/chat'

import MarkdownViewer from '@/components/MarkdownViewer.vue'
import PlanStepBar from '@/components/PlanStepBar.vue'
import ToolCallCard from '@/components/ToolCallCard.vue'
import FileDownloadPanel from '@/components/FileDownloadPanel.vue'
import { SSEParser } from '@/utils/sse-parser.js'

const chatStore = useChatStore()
const {
  conversations,
  currentConversationId,
  messages,
  loading
} = storeToRefs(chatStore)
const { loadConversations, startNewChat, setConversationMode, getConversationMode } = chatStore

const inputMessage = ref('')

// 当前正在执行的 reply_id，用于终止
const currentReplyId = ref(null)

// 测试模式 — 绑定到当前对话，切换对话时保留各自的模式
const currentMode = computed({
  get: () => getConversationMode(currentConversationId.value),
  set: (val) => setConversationMode(currentConversationId.value, val)
})
const testModes = [
  {
    value: 'regression',
    icon: '🔒',
    label: '回归',
    desc: '回归模式：运行基线用例，结果可复现，CI/CD友好',
    color: '#5b9bd5',
    bg: 'rgba(91,155,213,0.10)',
  },
  {
    value: 'systematic',
    icon: '📐',
    label: '系统化',
    desc: '系统化模式：BVA等价类算法驱动，首次建设用例库',
    color: '#67c23a',
    bg: 'rgba(103,194,58,0.10)',
  },
  {
    value: 'exploratory',
    icon: '🔭',
    label: '探索',
    desc: '探索模式：LLM自由探索，挖掘非常规缺陷',
    color: '#e6a23c',
    bg: 'rgba(230,162,60,0.10)',
  },
  {
    value: 'chaos',
    icon: '🌪️',
    label: '混沌对比',
    desc: '混沌/对比模式：双系统同时运行，自动识别差异与回归',
    color: '#f56c6c',
    bg: 'rgba(245,108,108,0.10)',
  },
]

const selectedFiles = ref([])
const fileInput = ref(null)

const inputTextarea = ref(null)
const bottomInputTextarea = ref(null)
const messagesContainer = ref(null)

const currentPlanData = ref(null)

const downloadPanel = ref(null)

const hasMessages = computed(() => messages.value.length > 0)

// 标志位，防止发送消息时触发的 ID 变化导致重复加载
const isSending = ref(false)

// 加载预设（新对话时自动填充消息和参考文件）
const loadPresets = async () => {
  try {
    const resp = await fetch('/api/chat/presets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    })
    if (!resp.ok) return
    const data = await resp.json()
    if (!data.success) return

    if (data.data.message) {
      inputMessage.value = data.data.message
      await nextTick()
      adjustTextareaHeight()
    }

    if (data.data.files?.length) {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
      selectedFiles.value = data.data.files.map(f => {
        const dot = f.name.lastIndexOf('.')
        const base = dot >= 0 ? f.name.slice(0, dot) : f.name
        const ext  = dot >= 0 ? f.name.slice(dot) : ''
        return new File([f.content], `${base}_${timestamp}${ext}`, { type: 'text/plain' })
      })
    }
  } catch (e) {
    console.warn('加载预设失败:', e)
  }
}

// 监听当前对话变化，加载消息和计划
watch(currentConversationId, async (newId) => {
  if (!isSending.value) loading.value = false // 切换对话时清除非当前对话的 loading 状态
  if (isSending.value) return // 如果正在发送中，不触发自动加载，避免覆盖本地正在生成的流

  if (newId) {
    try {
      const messagesData = await api.listMessages(newId, { limit: 1000 })

      // 加载消息（从 metadata 恢复 events）
      messages.value = messagesData.map(msg => {
        const baseMsg = {
          role: msg.role,
          content: msg.content
        }
        if (msg.role === 'assistant' && msg.metadata?.events) {
          baseMsg.events = msg.metadata.events
        }
        return baseMsg
      })

      await nextTick()
      scrollToBottom(true)
    } catch (error) {
      console.error('加载对话消息失败:', error)
    }
  } else {
    messages.value = []
    if (!isSending.value) {
      // Check for pending regression from recommend panel
      const pending = sessionStorage.getItem('pendingRegression')
      if (pending) {
        sessionStorage.removeItem('pendingRegression')
        try {
          const { message, mode } = JSON.parse(pending)
          if (mode) setConversationMode(null, mode)
          inputMessage.value = message
          await nextTick()
          await sendMessage()
        } catch {}
      } else {
        loadPresets()
      }
    }
  }
}, { immediate: true })

/**
 * Find tool_result event matching a tool_call by id.
 * Used in template for ToolCallCard rendering.
 */
const findToolResult = (events, toolId) => {
  if (!events || !toolId) return null
  return events.find(e => e.type === 'tool_result' && e.id === toolId) || null
}

/**
 * Merge adjacent text events in the events array to reduce DOM nodes.
 * Modifies the array in-place for performance during streaming.
 */
const mergeAdjacentTextEvents = (events) => {
  if (events.length < 2) return
  const last = events[events.length - 1]
  const secondLast = events[events.length - 2]
  if (last.type === 'text' && secondLast.type === 'text') {
    events.splice(events.length - 2, 2, {
      type: 'text',
      content: secondLast.content + last.content,
    })
  }
}

// 发送消息
const sendMessage = async () => {
  if ((!inputMessage.value.trim() && !selectedFiles.value.length) || loading.value) return

  isSending.value = true
  let userMessage = inputMessage.value.trim()
  const currentFiles = [...selectedFiles.value]

  inputMessage.value = ''
  selectedFiles.value = []
  resetTextareaHeight()

  try {
    // 处理文件上传
    let fileInfoString = ''
    if (currentFiles.length > 0) {
      // 如果没有会话ID，先创建一个，否则上传会失败
      if (!currentConversationId.value) {
        try {
          const newConv = await api.createConversation({
            title: userMessage.substring(0, 50) || currentFiles[0].name
          })
          currentConversationId.value = newConv.conversation_id
          await loadConversations()
        } catch (err) {
          console.error('创建会话失败:', err)
          throw new Error('无法开始新对话并上传文件')
        }
      }

      const uploadedNames = []
      const failedNames = []
      for (const file of currentFiles) {
        try {
          const uploadRes = await api.uploadChatFile(currentConversationId.value, file)
          if (uploadRes.success) {
            uploadedNames.push(file.name)
          } else {
            failedNames.push(file.name)
          }
        } catch (err) {
          console.error(`文件上传失败: ${file.name}`, err)
          failedNames.push(file.name)
        }
      }
      if (uploadedNames.length > 0) {
        fileInfoString += `\n\n[文件已上传: ${uploadedNames.join(', ')}]`
      }
      if (failedNames.length > 0) {
        fileInfoString += `\n\n[文件上传失败: ${failedNames.join(', ')}]`
      }
    }

    const finalMessage = userMessage + fileInfoString

    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: finalMessage
    })

    await nextTick()
    scrollToBottom(true)
    // After first message, the bottom textarea replaces the top one — restore focus so Enter key keeps working
    bottomInputTextarea.value?.focus()

    loading.value = true

    const hangTimeout = setTimeout(() => {
      if (loading.value) {
        loading.value = false
        isSending.value = false
        currentReplyId.value = null
        const msg = messages.value[messages.value.length - 1]
        if (msg?.role === 'assistant' && !msg.content) {
          msg.content = 'Agent 响应超时（5分钟），请重试。'
          msg.events = []
        }
      }
    }, 5 * 60 * 1000)

    // 添加空的助手消息占位（使用 events 数组模型）
    const assistantMsgIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: '',
      thinking: '',
      events: [],
    })

    // 调用聊天接口(SSE流式)
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        message: finalMessage,
        conversation_id: currentConversationId.value || undefined,
        mode: currentMode.value,
      })
    })

    if (!response.ok) {
      throw new Error('请求失败')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let thinkingResponse = ''

    // 使用缓冲式 SSE 解析器，修复 chunk 边界切断问题
    const parser = new SSEParser(({ data: parsed }) => {
      try {
        if (typeof parsed !== 'object' || parsed === null) return
        const msg = messages.value[assistantMsgIndex]

        if (parsed.type === 'start') {
          if (!currentConversationId.value) {
            currentConversationId.value = parsed.conversation_id
            loadConversations()
          }
          if (parsed.reply_id) {
            currentReplyId.value = parsed.reply_id
          }
        } else if (parsed.type === 'plan_update' && parsed.data) {
          currentPlanData.value = parsed.data
        } else if (parsed.type === 'testcases' && parsed.data) {
          const testcasesData = parsed.data
          if (!msg.testcases) {
            msg.testcases = []
          }
          msg.testcases.push(...testcasesData.testcases)
        } else if (parsed.type === 'thinking' && parsed.content) {
          thinkingResponse += parsed.content
          msg.thinking = thinkingResponse
        } else if (parsed.type === 'chunk' && parsed.content) {
          // Text chunk — add as text event
          msg.events.push({ type: 'text', content: parsed.content })
          mergeAdjacentTextEvents(msg.events)
          // Also maintain flat content for DB compatibility
          msg.content = (msg.content || '') + parsed.content
        } else if (parsed.type === 'tool_call') {
          // 按 ID 去重，防止流式累积消息导致同一工具调用多次渲染
          if (!parsed.id || !msg.events.some(e => e.type === 'tool_call' && e.id === parsed.id)) {
            msg.events.push({
              type: 'tool_call',
              id: parsed.id,
              name: parsed.name,
              input: parsed.input,
            })
          }
        } else if (parsed.type === 'tool_result') {
          // 按 ID 去重
          if (!parsed.id || !msg.events.some(e => e.type === 'tool_result' && e.id === parsed.id)) {
            msg.events.push({
              type: 'tool_result',
              id: parsed.id,
              name: parsed.name,
              output: parsed.output,
              success: parsed.success,
            })
          }
        } else if (parsed.type === 'test_progress') {
          if (!msg.testProgress) {
            msg.testProgress = { current: 0, total: parsed.total, passed: 0, failed: 0, cases: [] }
          }
          msg.testProgress.current = parsed.current
          msg.testProgress.total = parsed.total
          msg.testProgress.passed = parsed.passed
          msg.testProgress.failed = parsed.failed
          msg.testProgress.cases.push({ id: parsed.case_id, status: parsed.status })
        } else if (parsed.type === 'title_generated') {
          chatStore.updateConversationTitle(parsed.conversation_id, parsed.title)
        } else if (parsed.type === 'error') {
          throw new Error(parsed.message || '流式输出错误')
        }
        // done, heartbeat, cancelled — no action needed for rendering
      } catch (e) {
        console.warn('处理SSE事件失败:', e)
      }
    })

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      parser.feed(chunk)

      await nextTick()
      scrollToBottom()
    }

    // Flush any remaining buffered data
    parser.flush()
    await nextTick()
    scrollToBottom()

  } catch (error) {
    console.error('发送消息失败:', error)
    if (messages.value.length > 0) {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg.role === 'assistant') {
        lastMsg.content = `抱歉,发送消息时出现错误: ${error.message}`
        // Clear events so it falls back to content rendering
        lastMsg.events = []
      }
    }
  } finally {
    clearTimeout(hangTimeout)
    loading.value = false
    isSending.value = false
    currentReplyId.value = null
    // Refresh download panel after every agent response
    downloadPanel.value?.refresh()
    // Show "report ready" card in chat if HTML files were generated
    try {
      const convId = currentConversationId.value
      if (convId) {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`/api/conversations/${convId}/outputs`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        const htmlFiles = (data.data || []).filter(f => f.name.toLowerCase().endsWith('.html'))
        if (htmlFiles.length > 0) {
          const lastMsg = messages.value[messages.value.length - 1]
          if (lastMsg?.role === 'assistant') {
            lastMsg.reportCard = { convId, files: htmlFiles }
          }
        }
      }
    } catch {}
  }
}

// 终止 Agent
const stopAgent = async () => {
  if (!currentReplyId.value) return

  try {
    const response = await fetch('/api/chat/interrupt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        reply_id: currentReplyId.value
      })
    })

    const result = await response.json()
    if (result.success) {
      console.log('Agent 已终止')
      // 添加终止提示
      if (messages.value.length > 0) {
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg.role === 'assistant') {
          lastMsg.content += '\n\n[用户终止了请求]'
        }
      }
    } else {
      console.error('终止失败:', result.message)
    }
  } catch (error) {
    console.error('终止 Agent 失败:', error)
  } finally {
    loading.value = false
    currentReplyId.value = null
  }
}

// 重新执行最后一条用户消息
const rerunMessage = (content) => {
  if (loading.value) return
  inputMessage.value = content
  sendMessage()
}

// 文本框高度调整
const adjustTextareaHeight = () => {
  const textarea = inputTextarea.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

const adjustBottomTextareaHeight = () => {
  const textarea = bottomInputTextarea.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
}

const resetTextareaHeight = () => {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }
  if (bottomInputTextarea.value) {
    bottomInputTextarea.value.style.height = 'auto'
  }
}

// 文件处理逻辑
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const onFileSelected = (e) => {
  const files = Array.from(e.target.files)
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_')
  const renamed = files.map(file => {
    const namePart = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
    const newFileName = `${namePart}_${timestamp}${extension}`
    return new File([file], newFileName, { type: file.type })
  })
  // 追加到已选文件列表（去重：同名文件以新选的为准）
  const existing = selectedFiles.value.filter(f => !renamed.some(r => r.name === f.name))
  selectedFiles.value = [...existing, ...renamed]
  // 清空 input 使得同一个文件可以重复触发 change
  e.target.value = ''
}

const cancelFile = (idx) => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== idx)
}

// 键盘事件处理
const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    sendMessage()
  }
}

// 滚动到底部（智能模式：用户上滚查看历史时不强制拉回）
const scrollToBottom = (force = false) => {
  if (!messagesContainer.value) return
  if (force) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    return
  }
  const el = messagesContainer.value
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  if (distanceFromBottom <= 80) {
    el.scrollTop = el.scrollHeight
  }
}

// 初始化
onMounted(async () => {
  loadConversations()
  await nextTick()
  inputTextarea.value?.focus()
})
</script>

<style scoped>
.chat-container-root {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--main-bg);
  overflow: hidden;
}

/* ==================== 右侧聊天区域 ==================== */
.chat-main {
  flex: 1;
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.chat-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--main-bg);
  overflow: hidden;
}

.chat-container.has-messages {
  justify-content: flex-start;
}

/* 空状态 */
.empty-state {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 0 24px;
}

.platform-intro {
  width: 100%;
  max-width: 760px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.platform-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.platform-icon {
  font-size: 36px;
  line-height: 1;
}

.platform-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.platform-name-cn {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 8px;
}

.platform-tagline {
  font-size: 13px;
  color: #5b9bd5;
  margin: 0;
  font-weight: 500;
}

.platform-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.level-card {
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s;
}

.level-card.level-current {
  border-color: #5b9bd5;
  background: rgba(91, 155, 213, 0.08);
}

.level-card.level-future {
  opacity: 0.6;
}

.level-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--border-color);
  border-radius: 6px;
  padding: 2px 8px;
  width: fit-content;
}

.level-badge.current {
  color: #fff;
  background: #5b9bd5;
}

.level-badge.future {
  color: var(--text-secondary);
  background: transparent;
  border: 1px dashed var(--border-color);
}

.level-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.level-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

/* 输入框样式 */
.prompt-input-container,
.bottom-input-container {
  width: 100%;
  max-width: 760px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-input-input-area {
  width: 100%;
}

.prompt-input-input-area textarea {
  width: 100%;
  min-height: 24px;
  max-height: 200px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.prompt-input-input-area textarea::placeholder {
  color: var(--text-secondary);
}

.prompt-input-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--border-color);
}

.send-btn {
  background: var(--send-btn);
  color: white;
}

.send-btn:hover:not(:disabled) {
  background: var(--send-btn-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  width: 100%;
  max-width: 800px;
  overflow-y: auto;
  padding: 24px;
  margin: 0 auto;
}

/* 大屏幕优化：2K/2.5K/4K 屏幕增大内容区宽度 */
@media (min-width: 1920px) {
  .chat-messages {
    max-width: 1000px;
  }
}

@media (min-width: 2560px) {
  .chat-messages {
    max-width: 1200px;
  }
}

@media (min-width: 3440px) {
  .chat-messages {
    max-width: 1400px;
  }
}

.message {
  margin-bottom: 24px;
}

.message-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--send-btn);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--border-color);
  color: var(--text-primary);
}

.message-text {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: anywhere;  /* 增强换行支持 */
}

.message.user .message-text {
  white-space: pre-wrap;
}

.user-msg-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.user-file-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(103, 194, 58, 0.12);
  border: 1px solid rgba(103, 194, 58, 0.3);
  color: var(--text-secondary, #888);
  font-size: 12px;
}

.rerun-btn {
  display: block;
  margin-top: 8px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary, #888);
  background: transparent;
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s, color 0.15s;
}
.rerun-btn:hover {
  opacity: 1;
  color: var(--accent-color, #67c23a);
  border-color: var(--accent-color, #67c23a);
}

/* 思考过程样式 - 灰色小号字体，黑白主题下均为灰色 */
.thinking-block {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 6px;
  border-left: 3px solid #888;
}

.thinking-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  font-weight: 500;
}

.thinking-content {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  white-space: pre-wrap;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--text-primary);
  margin-left: 2px;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 底部输入框 */
.bottom-input-wrapper {
  width: 100%;
  padding: 16px 24px;
  background: var(--main-bg);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
}

/* 下载面板无文件时不占空间 */
.download-panel-placeholder {
  display: none;
}

.bottom-input-container {
  max-width: 800px;
}

/* 大屏幕优化 */
@media (min-width: 1920px) {
  .bottom-input-container,
  .prompt-input-container {
    max-width: 1000px;
  }
}

@media (min-width: 2560px) {
  .bottom-input-container,
  .prompt-input-container {
    max-width: 1200px;
  }
}

@media (min-width: 3440px) {
  .bottom-input-container,
  .prompt-input-container {
    max-width: 1400px;
  }
}

/* 文件预览区：多文件换行布局 */
.file-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

/* 文件预览 Tab 样式：自适应宽度，超长文件名截断 */
.file-preview-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--main-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px 8px 4px 10px;
  max-width: 240px;
  min-width: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 13px;
  flex: 1;
  min-width: 0;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cancel-file-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background 0.2s;
}

.cancel-file-btn:hover {
  background: var(--border-color);
  color: #f56c6c;
}

.upload-btn {
  margin-right: auto;
}

.upload-btn:hover:not(:disabled) {
  background: var(--border-color);
  color: var(--send-btn);
}

/* 测试用例展示样式 */
.testcases-block {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.testcases-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.testcases-list {
  border: none;
}

.testcase-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  flex: 1;
}

.testcase-details {
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 4px;
  font-size: 13px;
}

.detail-row {
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row strong {
  color: var(--text-primary);
  margin-right: 8px;
}

.detail-row pre {
  margin-top: 4px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-row ul {
  margin-top: 4px;
  padding-left: 20px;
}

.detail-row li {
  margin-bottom: 4px;
  color: var(--text-secondary);
}

/* 模式切换器 */
.mode-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  line-height: 1.4;
}

.mode-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.mode-btn.active {
  font-weight: 600;
}

/* 终止按钮样式 */
.stop-btn {
  background: #f56c6c !important;
  color: white !important;
  transition: all 0.2s;
}

.stop-btn:hover:not(:disabled) {
  background: #f78989 !important;
  transform: scale(1.05);
}

.stop-btn:active {
  transform: scale(0.95);
}

/* ==================== 实时测试进度块 ==================== */
.test-progress-block {
  margin: 12px 0;
  padding: 12px 14px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.tp-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.tp-stats {
  font-size: 12px;
  color: var(--text-secondary);
}

.tp-pass { color: #2e7d32; font-weight: 600; }
.tp-fail { color: #c62828; font-weight: 600; }

.tp-bar-wrap { height: 6px; }

.tp-bar-bg {
  position: relative;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.tp-bar-pass {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: #2e7d32;
  border-radius: 3px;
  transition: width 0.3s;
}

.tp-bar-fail {
  position: absolute;
  top: 0;
  height: 100%;
  background: #c62828;
  transition: width 0.3s, left 0.3s;
}

.tp-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.tp-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tp-dot-pass  { background: #2e7d32; }
.tp-dot-fail  { background: #c62828; }
.tp-dot-error { background: #e65100; }

/* ==================== Coordinator 侧边栏布局适配 ==================== */
/*
 * 注意：侧边栏使用 fixed 定位浮动在右侧，不挤压主内容区
 * 主内容区(chat-messages)保持原有宽度和位置不变
 * 用户可以通过收起侧边栏来查看右侧内容
 */

/* ── 报告完成卡片 ── */
.report-ready-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(91,155,213,0.12), rgba(103,194,58,0.08));
  border: 1px solid rgba(91,155,213,0.3);
  border-radius: 10px;
  cursor: default;
}
.rrc-icon { font-size: 20px; flex-shrink: 0; }
.rrc-body { flex: 1; }
.rrc-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.rrc-desc { font-size: 12px; color: var(--text-secondary); }
.rrc-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  background: #5b9bd5;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.15s;
}
.rrc-btn:hover { background: #4a8bc4; }
</style>
