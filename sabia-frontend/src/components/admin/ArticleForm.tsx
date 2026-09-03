import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Eye,
  Globe,
  Lock,
  Loader2,
  RotateCcw,
  Send,
  X,
  Clock,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Article, Category, ArticleVersion, AccessLevel, ArticleStatus } from '@/types'
import { TipTapEditor } from '@/components/editor/TipTapEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/stores/toast'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'saved'
type ArticleFormMode = 'create' | 'edit' | 'suggestion-create' | 'suggestion-review'

interface ArticleFormProps {
  mode: ArticleFormMode
  id?: string
  initialSuggestion?: {
    id: string
    title: string
    summary: string
    content: string
    category_id: number | null
    access_level: 'public' | 'internal'
    status: string
    suggested_by: { full_name: string }
    review_notes: string | null
  }
  onSaved?: (articleId: string) => void
  onCancel?: () => void
  title?: string
  readOnly?: boolean
  showPublishButton?: boolean
  actionButtonText?: string
  secondaryButtonText?: string
  onSubmit?: (data: ArticleFormData) => Promise<void>
  categories?: Category[]
}

interface ArticleFormData {
  title: string
  summary: string
  content: string
  category_id: number | null
  access_level: AccessLevel
  status?: ArticleStatus
  review_notes?: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  draft:    { label: 'Rascunho', variant: 'outline',    className: 'text-muted-foreground border-muted-foreground/30' },
  pending:  { label: 'Pendente', variant: 'secondary',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
  active:   { label: 'Ativo',    variant: 'default',    className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  archived: { label: 'Arquivado',variant: 'secondary',  className: 'text-muted-foreground bg-muted' },
}

export function ArticleForm({
  mode,
  id: paramId,
  initialSuggestion,
  onSaved,
  onCancel,
  title,
  readOnly,
  showPublishButton,
  actionButtonText,
  onSubmit,
  categories: initialCategories,
}: ArticleFormProps) {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const effectiveId = id ?? paramId
  const isEditing = Boolean(effectiveId) && mode !== 'suggestion-create'
  const isSuggestionMode = mode.startsWith('suggestion-')
  const isReviewMode = mode === 'suggestion-review'

  const [formTitle, setFormTitle] = useState(() => searchParams.get('title') ?? '')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('internal')
  const [status, setStatus] = useState<ArticleStatus>('draft')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>(initialCategories || [])
  const [versions, setVersions] = useState<ArticleVersion[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [revertTarget, setRevertTarget] = useState<ArticleVersion | null>(null)
  const [reverting, setReverting] = useState(false)

  const snapshotRef = useRef<string>('')
  const currentSnapshot = useMemo(
    () => JSON.stringify({ title: formTitle, summary, content, categoryId, accessLevel, status }),
    [formTitle, summary, content, categoryId, accessLevel, status],
  )
  const isDirty = !loading && currentSnapshot !== snapshotRef.current

  useEffect(() => {
    if (!initialCategories || initialCategories.length === 0) {
      api.get<Category[]>('/categories').then(setCategories).catch(() => {})
    }
    if (isReviewMode && initialSuggestion) {
      setFormTitle(initialSuggestion.title)
      setSummary(initialSuggestion.summary ?? '')
      setContent(initialSuggestion.content)
      setCategoryId(initialSuggestion.category_id)
      setAccessLevel(initialSuggestion.access_level as AccessLevel)
      setLoading(false)
    } else if (isEditing) {
      api
        .get<Article & { category?: Category }>(
          isSuggestionMode ? `/article-suggestions/${effectiveId}` : `/admin/articles/${effectiveId}`,
        )
        .then((a: any) => {
          setFormTitle(a.title)
          setSummary(a.summary ?? '')
          setContent(a.content)
          setCategoryId(a.category_id)
          setAccessLevel(a.access_level)
          setStatus(a.status)
          if (a.updated_at) setUpdatedAt(a.updated_at)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
      if (!isSuggestionMode) {
        api.get<ArticleVersion[]>(`/admin/articles/${effectiveId}/versions`).then(setVersions).catch(() => {})
      }
    } else {
      const urlTitle = searchParams.get('title')
      if (urlTitle) setFormTitle(urlTitle)
      setLoading(false)
    }
  }, [effectiveId, isEditing, isSuggestionMode, isReviewMode, initialSuggestion, searchParams])

  useEffect(() => {
    if (!loading) snapshotRef.current = currentSnapshot
  }, [loading])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = useCallback(
    async (customStatus?: ArticleStatus, extraData?: Partial<ArticleFormData>) => {
      if (!formTitle.trim()) {
        toast.warning('Título é obrigatório')
        return
      }
      setSaveState('saving')
      try {
        const payload: ArticleFormData = {
          title: formTitle,
          summary,
          content,
          category_id: categoryId,
          access_level: accessLevel,
          status: customStatus ?? status,
          ...extraData,
        }
        if (onSubmit) {
          await onSubmit(payload)
        } else if (isSuggestionMode) {
          if (mode === 'suggestion-create') {
            const created = await api.post<{ id: string }>('/article-suggestions', payload)
            toast.success('Sugestão enviada para revisão')
            onSaved?.(created.id)
          } else {
            await api.put(`/article-suggestions/${effectiveId}`, payload)
            toast.success('Sugestão atualizada')
          }
        } else if (isEditing) {
          const updated = await api.put<Article>(`/admin/articles/${effectiveId}`, payload)
          toast.success('Artigo atualizado')
          navigate(`/kb/${updated.slug}`, { replace: true })
        } else {
          const created = await api.post<Article>('/admin/articles', payload)
          toast.success('Artigo criado')
          navigate(`/kb/${created.slug}`, { replace: true })
        }
        if (customStatus) setStatus(customStatus)
        snapshotRef.current = JSON.stringify({ title: formTitle, summary, content, categoryId, accessLevel, status: customStatus ?? status })
        setSaveState('saved')
        setLastSavedAt(new Date())
      } catch {
        toast.error('Erro ao salvar')
        setSaveState('idle')
      }
    },
    [formTitle, summary, content, categoryId, accessLevel, status, mode, effectiveId, navigate, onSubmit, isEditing, isSuggestionMode],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (loading) {
    return (
      <div className="space-y-4 p-6 animate-pulse">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="h-px bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="h-10 rounded-md bg-muted" />
            <div className="h-24 rounded-md bg-muted" />
            <div className="h-80 rounded-md bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="h-10 rounded-md bg-muted" />
            <div className="h-10 rounded-md bg-muted" />
            <div className="h-20 rounded-md bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const readingMinutes = Math.max(1, Math.round(words / 200))
  const statusKey = isSuggestionMode ? (status || 'pending') : status
  const statusConfig = STATUS_CONFIG[statusKey] ?? { label: statusKey, variant: 'outline' as const, className: '' }
  const isSubmitting = saveState === 'saving'

  const handleCancelClick = () => {
    if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair mesmo assim?')) return
    onCancel?.()
    navigate(isSuggestionMode ? '/article-suggestions' : '/admin/articles')
  }

  const pageTitle = title ?? (
    isEditing
      ? (isSuggestionMode ? 'Editar sugestão' : 'Editar artigo')
      : (isSuggestionMode ? 'Nova sugestão' : 'Novo artigo')
  )

  const backPath = isSuggestionMode ? '/article-suggestions' : '/admin/articles'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-16 px-6 lg:px-8 gap-6">
          {/* Left: back + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={backPath}
              className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-muted-foreground hidden sm:inline truncate">
                {isSuggestionMode ? 'Sugestões' : 'Artigos'}
              </span>
              <span className="text-muted-foreground/40 hidden sm:inline">/</span>
              <span className="text-sm font-medium truncate">{pageTitle}</span>
            </div>
          </div>

          {/* Center: status + save indicator */}
          <div className="flex items-center gap-4">
            <Badge
              variant={statusConfig.variant}
              className={cn('text-xs font-medium border', statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
            {lastSavedAt && saveState !== 'saving' && (
              <span className="text-xs text-muted-foreground hidden md:inline">
                Salvo {formatDateTime(lastSavedAt)}
              </span>
            )}
            {isDirty && saveState !== 'saving' && (
              <span className="text-xs text-amber-600 hidden md:inline">Alterações não salvas</span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>

            {isSuggestionMode ? (
              <Button
                size="sm"
                onClick={() => handleSave('draft')}
                disabled={isSubmitting || !formTitle.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">Salvar rascunho</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave('draft')}
                  disabled={isSubmitting || !formTitle.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                  ) : (
                    <Save className="h-4 w-4 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Rascunho</span>
                </Button>
                {showPublishButton && (
                  <Button
                    size="sm"
                    onClick={() => handleSave('active')}
                    disabled={isSubmitting || !formTitle.trim()}
                  >
                    <Send className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{actionButtonText ?? 'Publicar'}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 lg:px-8 py-10 max-w-screen-xl mx-auto w-full">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">

          {/* Main content */}
          <div className="space-y-7">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Digite o título do artigo"
                disabled={readOnly || isSubmitting}
                className="h-12 text-base font-medium placeholder:font-normal px-4"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="summary" className="text-sm font-medium">Resumo</Label>
                <span className="text-xs text-muted-foreground">Opcional</span>
              </div>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve descrição exibida em listagens e resultados de busca"
                rows={3}
                disabled={readOnly || isSubmitting}
                className="resize-none text-sm leading-relaxed px-4 py-3"
              />
            </div>

            {/* Content editor */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">Conteúdo</Label>
              <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                <TipTapEditor
                  value={content}
                  onChange={setContent}
                  editable={!(readOnly || isSubmitting)}
                  placeholder="Escreva o conteúdo do artigo..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">

            {/* Properties card */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Propriedades</p>
              </div>
              <div className="divide-y divide-border">

              {/* Category */}
              <div className="px-5 py-4 space-y-2">
                <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">Categoria</Label>
                <Select
                  value={categoryId?.toString() ?? ''}
                  onValueChange={(v) => setCategoryId(v ? Number(v) : null)}
                  disabled={readOnly || isSubmitting}
                >
                  <SelectTrigger id="category" className="h-9 text-sm">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Access level */}
              <div className="px-5 py-4 space-y-2">
                <Label htmlFor="access_level" className="text-xs font-medium text-muted-foreground">Acesso</Label>
                <Select
                  value={accessLevel}
                  onValueChange={(v) => setAccessLevel(v as AccessLevel)}
                  disabled={readOnly || isSubmitting}
                >
                  <SelectTrigger id="access_level" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Público
                      </span>
                    </SelectItem>
                    <SelectItem value="internal">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Interno
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {accessLevel === 'public'
                    ? 'Visível para todos, inclusive no widget público.'
                    : 'Visível apenas para usuários autenticados.'}
                </p>
              </div>

              {/* Status (admin only, edit mode) */}
              {!isSuggestionMode && isEditing && (
                <div className="px-5 py-4 space-y-2">
                  <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ArticleStatus)}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger id="status" className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
             </div>
           </div>

            {/* Stats card */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estatísticas</p>
              </div>
              <div className="divide-y divide-border">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Palavras
                </span>
                <span className="text-sm font-medium tabular-nums">{words.toLocaleString('pt-BR')}</span>
              </div>
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Leitura
                </span>
                <span className="text-sm font-medium">{readingMinutes} min</span>
              </div>
              {isEditing && updatedAt && (
                <div className="px-5 py-3.5">
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {formatDateTime(updatedAt)}
                  </p>
                </div>
              )}
             </div>
            </div>

            {/* Versions card */}
            {!isSuggestionMode && isEditing && versions.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors bg-muted/30"
                  onClick={() => setShowVersions((v) => !v)}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Histórico ({versions.length})
                  </p>
                  <ChevronDown
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', showVersions && 'rotate-180')}
                  />
                </button>

                {showVersions && (
                  <div className="border-t border-border divide-y divide-border">
                    <div className="max-h-60 overflow-y-auto divide-y divide-border">
                      {versions.map((v) => (
                        <div key={v.id} className="flex items-center justify-between px-5 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">v{v.version}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatDateTime(v.created_at)} · {v.edited_by ?? 'Desconhecido'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs shrink-0"
                            onClick={() => setRevertTarget(v)}
                            disabled={reverting}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurar
                          </Button>
                        </div>
                      ))}
                    </div>

                    {revertTarget && (
                      <div className="px-5 py-4 bg-amber-50 border-t border-amber-100">
                        <p className="text-sm font-medium text-amber-800">
                          Restaurar versão {revertTarget.version}?
                        </p>
                        <p className="text-xs text-amber-700 mt-1 mb-3">
                          Uma nova versão será criada com este conteúdo.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSave(revertTarget.content as any)}
                            disabled={reverting}
                          >
                            {reverting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Confirmar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setRevertTarget(null)}
                            disabled={reverting}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}