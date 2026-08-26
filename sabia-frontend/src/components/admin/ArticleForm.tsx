import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  History,
  Eye,
  FileText,
  Clock,
  Globe,
  Lock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Send,
  X,
  MessageSquare,
  Plus,
  Circle,
  ChevronLeft,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Article, Category, ArticleVersion, AccessLevel, ArticleStatus } from '@/types'
import { TipTapEditor } from '@/components/editor/TipTapEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/stores/toast'
import { formatDateTime } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'saved'

type ArticleFormMode = 'create' | 'edit' | 'suggestion-create' | 'suggestion-review'

interface ArticleFormProps {
  mode: ArticleFormMode
  /** ID do artigo/sugestão existente (para modo edit/review) */
  id?: string
  /** Sugestão pré-carregada (para modo review) */
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
  /** Callback ao salvar com sucesso */
  onSaved?: (articleId: string) => void
  /** Callback ao cancelar/voltar */
  onCancel?: () => void
  /** Título customizado para a barra de ações */
  title?: string
  /** Desabilita campos (para visualização somente leitura) */
  readOnly?: boolean
  /** Mostra botão "Publicar" vs "Enviar para revisão" */
  showPublishButton?: boolean
  /** Texto do botão de ação principal */
  actionButtonText?: string
  /** Texto do botão secundário */
  secondaryButtonText?: string
  /** Callback customizado no submit */
  onSubmit?: (data: ArticleFormData) => Promise<void>
  /** Categorias pré-carregadas */
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

const STATUS_META: Record<string, { label: string; dot: string }> = {
  draft: { label: 'Rascunho', dot: 'bg-muted-foreground' },
  pending: { label: 'Pendente', dot: 'bg-amber-500' },
  active: { label: 'Ativo', dot: 'bg-emerald-500' },
  archived: { label: 'Arquivado', dot: 'bg-amber-500' },
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
  secondaryButtonText,
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

  // Estados do formulário
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

  // Snapshot para detectar alterações não salvas
  const snapshotRef = useRef<string>('')

  const currentSnapshot = useMemo(
    () => JSON.stringify({ title: formTitle, summary, content, categoryId, accessLevel, status }),
    [formTitle, summary, content, categoryId, accessLevel, status],
  )
  const isDirty = !loading && currentSnapshot !== snapshotRef.current

  // Carrega dados iniciais
  useEffect(() => {
    if (!initialCategories || initialCategories.length === 0) {
      api.get<Category[]>('/categories').then(setCategories).catch(() => {})
    } else {
      setCategories(initialCategories)
    }

    if (isReviewMode && initialSuggestion) {
      // Modo review: carrega sugestão
      setFormTitle(initialSuggestion.title)
      setSummary(initialSuggestion.summary ?? '')
      setContent(initialSuggestion.content)
      setCategoryId(initialSuggestion.category_id)
      setAccessLevel(initialSuggestion.access_level as AccessLevel)
      setLoading(false)
    } else if (isEditing) {
      api
        .get<Article & { category?: Category }>(isSuggestionMode ? `/article-suggestions/${effectiveId}` : `/articles/${effectiveId}`)
        .then((a: any) => {
          setFormTitle(a.title)
          setSummary(a.summary ?? '')
          setContent(a.content)
          setCategoryId(a.category_id)
          setAccessLevel(a.access_level)
          setStatus(a.status)
        })
        .catch(() => {})
        .finally(() => setLoading(false))

      // Carrega versões se for artigo
      if (!isSuggestionMode) {
        api.get<ArticleVersion[]>(`/admin/articles/${effectiveId}/versions`).then(setVersions).catch(() => {})
      }
    } else {
      // Novo artigo/sugestão - preenche título da query param
      const urlTitle = searchParams.get('title')
      if (urlTitle) setFormTitle(urlTitle)
      setLoading(false)
    }
  }, [effectiveId, isEditing, isSuggestionMode, isReviewMode, initialSuggestion, searchParams])

  // Snapshot após carregar
  useEffect(() => {
    if (!loading) snapshotRef.current = currentSnapshot
  }, [loading, currentSnapshot])

  // Alerta antes de sair com alterações não salvas
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
          await api.put(`/admin/articles/${effectiveId}`, payload)
          toast.success('Artigo atualizado')
        } else {
          const created = await api.post<{ id: string }>('/admin/articles', payload)
          toast.success('Artigo criado')
          navigate(`/admin/articles/${created.id}`, { replace: true })
        }

        if (customStatus) setStatus(customStatus)
        const newSnapshot = JSON.stringify({
          title: formTitle,
          summary,
          content,
          categoryId,
          accessLevel,
          status: customStatus ?? status,
        })
        snapshotRef.current = newSnapshot
        setSaveState('saved')
        setLastSavedAt(new Date())
      } catch (err) {
        toast.error('Erro ao salvar')
        setSaveState('idle')
      }
    },
    [formTitle, summary, content, categoryId, accessLevel, status, mode, effectiveId, navigate, onSubmit, isEditing, isSuggestionMode],
  )

  // Ctrl/Cmd + S
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

  // Snapshot após carregar
  useEffect(() => {
    if (!loading) snapshotRef.current = currentSnapshot
  }, [loading, currentSnapshot])

  // Alerta antes de sair
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const readingMinutes = Math.max(1, Math.round(words / 200))

  const statusKey = isSuggestionMode ? (status || 'pending') : status
  const statusMeta = STATUS_META[statusKey] || { label: statusKey, dot: 'bg-muted-foreground' }

  const isSubmitting = saveState === 'saving'

  const handleCancelClick = useCallback(() => {
    if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair mesmo assim?')) return
    onCancel?.()
    navigate('/admin/articles')
  }, [isDirty, onCancel, navigate])

  const handleSaveDraft = () => handleSave('draft')
  const handleSaveAndPublish = () => handleSave('active')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isSuggestionMode ? '/article-suggestions' : '/admin/articles'} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{title ?? (isEditing ? (isSuggestionMode ? 'Editar sugestão' : 'Editar artigo') : (isSuggestionMode ? 'Nova sugestão' : 'Novo artigo'))}</h1>
            <p className="text-muted-foreground">{isSuggestionMode ? 'Envie sugestões de artigos para revisão dos gestores' : 'Crie e gerencie artigos da base de conhecimento'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancelClick} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          {isSuggestionMode ? (
            <Button onClick={handleSaveDraft} disabled={isSubmitting || !formTitle.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Salvar rascunho
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting || !formTitle.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Salvar rascunho
              </Button>
              {showPublishButton && (
                <Button onClick={handleSaveAndPublish} disabled={isSubmitting || !formTitle.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {actionButtonText ?? 'Publicar'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Card>
        <Card.Header className="pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.dot.includes('emerald') ? 'default' : statusMeta.dot.includes('amber') ? 'secondary' : 'outline'} className={statusMeta.dot}>
              <span className={`h-2 w-2 rounded-full mr-2 ${statusMeta.dot}`} />
              {statusMeta.label}
            </Badge>
            {isEditing && updatedAt && (
              <span className="text-xs text-muted-foreground">Atualizado em {formatDateTime(updatedAt)}</span>
            )}
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Digite o título do artigo"
                  disabled={readOnly || isSubmitting}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumo</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Breve descrição do conteúdo (opcional)"
                  rows={3}
                  disabled={readOnly || isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Opcional. Será usado em listagens e resultados de busca.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <TipTapEditor
                  value={content}
                  onChange={setContent}
                  editable={!(readOnly || isSubmitting)}
                  placeholder="Escreva o conteúdo do artigo..."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryId?.toString() ?? ''} onValueChange={(v) => setCategoryId(v ? Number(v) : null)} disabled={readOnly || isSubmitting}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span style={{ color: c.color }}>{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_level">Nível de acesso</Label>
                <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as AccessLevel)} disabled={readOnly || isSubmitting}>
                  <SelectTrigger id="access_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Público
                      </div>
                    </SelectItem>
                    <SelectItem value="internal">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Interno
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {accessLevel === 'public'
                    ? 'Visível para todos, inclusive no widget público.'
                    : 'Visível apenas para usuários autenticados (gestores/operadores).'}
                </p>
              </div>

              {!isSuggestionMode && isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)} disabled={readOnly || isSubmitting}>
                    <SelectTrigger id="status">
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

              <div className="p-4 rounded-lg bg-muted/30 border border-muted">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tempo de leitura estimado</span>
                  <span className="font-medium">{readingMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Palavras</span>
                  <span className="font-medium">{words}</span>
                </div>
              </div>

              {showVersions && versions.length > 0 && (
                <div className="space-y-2">
                  <Label>Histórico de versões</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-muted">
                        <div>
                          <p className="text-sm font-medium">v{v.version} - {formatDateTime(v.created_at)}</p>
                          <p className="text-xs text-muted-foreground">{v.edited_by ?? 'Desconhecido'}</p>
                        </div>
                        {!reverting && (
                          <Button variant="ghost" size="sm" onClick={() => setRevertTarget(v)}>
                            Restaurar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {revertTarget && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm font-medium text-amber-800">Restaurar versão {revertTarget.version}?</p>
                      <p className="text-xs text-amber-700 mt-1">Esta ação criará uma nova versão com o conteúdo selecionado.</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleSave(revertTarget.content as any)} disabled={reverting}>
                          {reverting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar restauração'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRevertTarget(null)} disabled={reverting}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}


