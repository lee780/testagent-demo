import { api } from './index.js'

// ── 业务规则库 ────────────────────────────────────────────
export const knowledgeDocs = {
  list: (params) => api.get('/knowledge/docs', { params }),
  get: (id) => api.get(`/knowledge/docs/${id}`),
  create: (data) => api.post('/knowledge/docs', data),
  update: (id, data) => api.put(`/knowledge/docs/${id}`, data),
  toggle: (id, isActive) => api.patch(`/knowledge/docs/${id}/toggle`, { isActive }),
  delete: (id) => api.delete(`/knowledge/docs/${id}`),
}

// ── 挡板场景库 ────────────────────────────────────────────
export const mockScenes = {
  list: (params) => api.get('/knowledge/scenes', { params }),
  get: (id) => api.get(`/knowledge/scenes/${id}`),
  create: (data) => api.post('/knowledge/scenes', data),
  update: (id, data) => api.put(`/knowledge/scenes/${id}`, data),
  delete: (id) => api.delete(`/knowledge/scenes/${id}`),
}

// ── 测试规范库 ────────────────────────────────────────────
export const testSpecs = {
  list: (params) => api.get('/knowledge/specs', { params }),
  get: (id) => api.get(`/knowledge/specs/${id}`),
  create: (data) => api.post('/knowledge/specs', data),
  update: (id, data) => api.put(`/knowledge/specs/${id}`, data),
  delete: (id) => api.delete(`/knowledge/specs/${id}`),
}

// ── 覆盖点标签库 ──────────────────────────────────────────
export const coverageTags = {
  list: (modelId) => api.get('/knowledge/coverage-tags', { params: { modelId } }),
  create: (data) => api.post('/knowledge/coverage-tags', data),
  batchReplace: (data) => api.post('/knowledge/coverage-tags/batch', data),
  delete: (id) => api.delete(`/knowledge/coverage-tags/${id}`),
}

// ── 测试数据模板库 ────────────────────────────────────────
export const dataTemplates = {
  list: (modelId) => api.get('/knowledge/data-templates', { params: { modelId } }),
  create: (data) => api.post('/knowledge/data-templates', data),
  update: (id, data) => api.put(`/knowledge/data-templates/${id}`, data),
  delete: (id) => api.delete(`/knowledge/data-templates/${id}`),
}
