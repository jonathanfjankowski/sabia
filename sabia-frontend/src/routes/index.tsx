import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const KnowledgeBase = lazy(() => import('@/pages/kb/KnowledgeBase').then((m) => ({ default: m.KnowledgeBase })))
const ArticleView = lazy(() => import('@/pages/kb/ArticleView').then((m) => ({ default: m.ArticleView })))
const Chat = lazy(() => import('@/pages/chat/Chat').then((m) => ({ default: m.Chat })))
const AdminArticles = lazy(() => import('@/pages/admin/Articles').then((m) => ({ default: m.AdminArticles })))
const ArticleEditor = lazy(() => import('@/pages/admin/ArticleEditor').then((m) => ({ default: m.ArticleEditor })))
const ArticleImport = lazy(() => import('@/pages/admin/ArticleImport').then((m) => ({ default: m.ArticleImport })))
const Categories = lazy(() => import('@/pages/admin/Categories').then((m) => ({ default: m.Categories })))
const Users = lazy(() => import('@/pages/admin/Users').then((m) => ({ default: m.Users })))
const Ratings = lazy(() => import('@/pages/admin/Ratings').then((m) => ({ default: m.Ratings })))
const WidgetConversations = lazy(() => import('@/pages/admin/WidgetConversations').then((m) => ({ default: m.WidgetConversations })))
const KnowledgeGaps = lazy(() => import('@/pages/admin/KnowledgeGaps').then((m) => ({ default: m.KnowledgeGaps })))
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs').then((m) => ({ default: m.AuditLogs })))
const SystemLogs = lazy(() => import('@/pages/admin/SystemLogs').then((m) => ({ default: m.SystemLogs })))
const Health = lazy(() => import('@/pages/admin/Health').then((m) => ({ default: m.Health })))
const AISettings = lazy(() => import('@/pages/admin/settings/AISettings').then((m) => ({ default: m.AISettings })))
const WidgetSettingsPage = lazy(() => import('@/pages/admin/settings/WidgetSettings').then((m) => ({ default: m.WidgetSettingsPage })))
const BrandSettings = lazy(() => import('@/pages/admin/settings/BrandSettings').then((m) => ({ default: m.BrandSettings })))
const PublicWidget = lazy(() => import('@/pages/widget/PublicWidget').then((m) => ({ default: m.PublicWidget })))
const ArticleSuggestions = lazy(() => import('@/pages/admin/ArticleSuggestions').then((m) => ({ default: m.ArticleSuggestions })))
const ArticleSuggestionEditor = lazy(() => import('@/pages/admin/ArticleSuggestionEditor').then((m) => ({ default: m.ArticleSuggestionEditor })))
const ArticleSuggestionReview = lazy(() => import('@/pages/admin/ArticleSuggestionReview').then((m) => ({ default: m.ArticleSuggestionReview })))

function Protected({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (role && user?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function SuspenseBoundary({ children }: { children: React.ReactNode }) {
  const fallback = (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-muted-foreground text-sm">Carregando...</div>
    </div>
  )
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <SuspenseBoundary><Login /></SuspenseBoundary> },
{
    element: (
      <Protected>
        <AppShell />
      </Protected>
    ),
    children: [
      { path: '/', element: <Navigate to="/kb" replace /> },
      { path: '/kb', element: <SuspenseBoundary><KnowledgeBase /></SuspenseBoundary> },
      { path: '/kb/:slug', element: <SuspenseBoundary><ArticleView /></SuspenseBoundary> },
      { path: '/chat', element: <SuspenseBoundary><Chat /></SuspenseBoundary> },
      // Admin
      {
        path: '/admin/articles',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><AdminArticles /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/articles/new',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><ArticleEditor /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/articles/:id/edit',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><ArticleEditor /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/categories',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><Categories /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><Users /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/ratings',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><Ratings /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/widget-conversations',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><WidgetConversations /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/knowledge-gaps',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><KnowledgeGaps /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/audit-logs',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><AuditLogs /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/system-logs',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><SystemLogs /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/health',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><Health /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/settings/ai',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><AISettings /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/settings/widget',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><WidgetSettingsPage /></SuspenseBoundary>
          </Protected>
        ),
      },
      {
        path: '/admin/settings/brand',
        element: (
          <Protected role="gestor">
            <SuspenseBoundary><BrandSettings /></SuspenseBoundary>
          </Protected>
        ),
      },
      { path: '/admin/articles/import', element: ( <Protected role="gestor"> <SuspenseBoundary><ArticleImport /></SuspenseBoundary> </Protected> ) },

      // Sugestões de Artigos
      { path: '/article-suggestions', element: <SuspenseBoundary><ArticleSuggestions /></SuspenseBoundary> },
      { path: '/article-suggestions/new', element: <SuspenseBoundary><ArticleSuggestionEditor /></SuspenseBoundary> },
      { path: '/article-suggestions/:id', element: <SuspenseBoundary><ArticleSuggestionEditor /></SuspenseBoundary> },
      { path: '/article-suggestions/:id/edit', element: <SuspenseBoundary><ArticleSuggestionEditor /></SuspenseBoundary> },
      { path: '/admin/article-suggestions/:id', element: <Protected role="gestor"><SuspenseBoundary><ArticleSuggestionReview /></SuspenseBoundary></Protected> },

  { path: '/widget', element: <SuspenseBoundary><PublicWidget /></SuspenseBoundary> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
