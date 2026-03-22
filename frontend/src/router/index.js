import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api'
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guest: true }
    },
    {
      path: '/',
      name: 'chat',
      component: ChatView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/testcases',
      name: 'testcases',
      component: () => import('../views/TestCasesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/testcases/:id',
      name: 'testcase-detail',
      component: () => import('../views/TestCaseDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('../views/ReportsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/defects',
      name: 'defects',
      component: () => import('../views/DefectsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/defects/:id',
      name: 'defect-detail',
      component: () => import('../views/DefectDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('../views/KnowledgeBaseView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/user-story',
      name: 'user-story',
      component: () => import('../views/UserStoryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/stub-server',
      name: 'stub-server',
      component: () => import('../views/StubServerView.vue'),
      meta: { requiresAuth: true }
    },
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = getToken()
  const isAuthenticated = !!token

  // 需要认证的页面
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 已登录用户访问登录/注册页面，重定向到首页
  if (to.meta.guest && isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router
