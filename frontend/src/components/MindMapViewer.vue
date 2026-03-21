<template>
  <div class="mindmap-overlay" @click.self="$emit('close')">
    <div class="mindmap-modal">
      <div class="modal-header">
        <span class="modal-title">
          <el-icon style="color:#5b9bd5;margin-right:6px"><Share /></el-icon>
          {{ title }}
        </span>
        <div class="header-actions">
          <button class="icon-btn" title="适配屏幕" @click="fitScreen">
            <el-icon><FullScreen /></el-icon>
          </button>
          <button class="icon-btn" title="关闭" @click="$emit('close')">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>
      <div class="modal-body">
        <div v-if="error" class="error-msg">{{ error }}</div>
        <svg ref="svgRef" class="mindmap-svg" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Share, FullScreen, Close } from '@element-plus/icons-vue'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

const props = defineProps({
  markdown: { type: String, required: true },
  title: { type: String, default: '思维导图' }
})
defineEmits(['close'])

const svgRef = ref(null)
const error = ref('')
let mm = null

const transformer = new Transformer()

function render(md) {
  if (!svgRef.value) return
  try {
    const { root } = transformer.transform(md)
    if (mm) {
      mm.setData(root)
      mm.fit()
    } else {
      mm = Markmap.create(svgRef.value, {
        autoFit: true,
        color: (node) => {
          const colors = ['#5b9bd5', '#70b77e', '#e8a838', '#e06c75', '#c678dd', '#56b6c2']
          return colors[node.depth % colors.length]
        },
        duration: 300,
        nodeMinHeight: 22,
        paddingX: 16,
        embedGlobalCSS: false,
      }, root)
    }
  } catch (e) {
    error.value = '思维导图解析失败：' + e.message
  }
}

function fitScreen() {
  mm?.fit()
}

onMounted(() => render(props.markdown))
watch(() => props.markdown, (md) => render(md))
</script>

<style scoped>
.mindmap-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mindmap-modal {
  width: 90vw;
  height: 85vh;
  background: var(--main-bg, #1e1e2e);
  border-radius: 12px;
  border: 1px solid var(--border-color, #3a3a4a);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color, #3a3a4a);
  flex-shrink: 0;
}

.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #888);
  padding: 5px 7px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  font-size: 16px;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: var(--border-color, #3a3a4a);
  color: var(--text-primary, #e0e0e0);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mindmap-svg {
  width: 100%;
  height: 100%;
}

.error-msg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #e06c75;
  font-size: 13px;
  text-align: center;
}
</style>

<!-- Global styles for markmap nodes (not scoped) -->
<style>
.mindmap-svg .markmap-node text {
  fill: var(--text-primary, #e0e0e0);
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.mindmap-svg .markmap-node circle {
  stroke-width: 1.5;
}

.mindmap-svg .markmap-link {
  stroke-opacity: 0.5;
  stroke-width: 1.5;
}
</style>
