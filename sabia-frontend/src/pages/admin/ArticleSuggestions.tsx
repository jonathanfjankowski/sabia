import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter, ChevronRight, Clock, Eye, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Circle, MessageSquare, X, ChevronLeft, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import type { ArticleSuggestion, Category } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/stores/toast'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rejeitado', color: 'bg-destructive/10 text-destructive', icon: <XCircle className="h-3 w-3" /> },
  published: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-muted/50 text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
}

export function ArticleSuggestions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const categoryFilter = searchParams.get('category_id') ?? ''

  const [search, setSearch] = useState(q)
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const perPage = 20

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    if (categoryFilter) params.set('category_id', categoryFilter)
    params.set('page', page.toString())
    params.set('per_page', perPage.toString())

    Promise.all([
      api.get<{ data: ArticleSuggestion[]; total: number }>(`/article-suggestions?${params}`),
      api.get<Category[]>('/categories'),
    ])
      .then(([resp, cats]) => {
        setSuggestions(Array.isArray(resp.data) ? resp.data : [])
        setTotal(resp.total ?? 0)
        setCategories(Array.isArray(cats) ? cats : [])
      })
      .catch(() => toast.error('Erro ao carregar sugestões'))
      .finally(() => setLoading(false))
  }, [q, statusFilter, categoryFilter, page])

  useEffect(() => {
    setSearch(q)
  }, [q])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (value.trim()) {
      setSearchParams({ q: value, page: '1' })
    } else {
      setSearchParams({ page: '1' })
    }
  }

  const handleStatusChange = (value: string) => {
    if (value) {
      setSearchParams({ status: value, page: '1' })
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('status')
      params.set('page', '1')
      setSearchParams(params)
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value) {
      setSearchParams({ category_id: value, page: '1' })
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('category_id')
      params.set('page', '1')
      setSearchParams(params)
    }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancelar esta sugestão?')) return
    try {
      await api.post(`/article-suggestions/${id}/cancel`)
      toast.success('Sugestão cancelada')
      setSuggestions((prev) => prev.filter((s) => s.id !== Number(id)))
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir permanentemente esta sugestão?')) return
    try {
      await api.post(`/article-suggestions/${id}/cancel`)
      toast.success('Sugestão cancelada')
      setSuggestions((prev) => prev.filter((s) => s.id !== Number(id)))
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const filteredSuggestions = suggestions

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Sugestões"
        description="Envie sugestões de artigos para revisão dos gestores"
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <Link to="/article-suggestions/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nova sugestão
            </Button>
          </Link>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou conteúdo..."
              className="h-10 pl-9 pr-10"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {q && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link to="/article-suggestions/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nova sugestão
            </Button>
          </Link>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="Nenhuma sugestão encontrada"
          description="Tente ajustar os filtros ou crie uma nova sugestão."
          action={
            <Link to="/article-suggestions/new">
              <Button>
                <Plus className="h-4 w-4" />
                Criar primeira sugestão
              </Button>
            </Link>
          }
        />
      ) : (
        <div>
          <div className="space-y-4">
            {filteredSuggestions.map((s) => {
              const meta = STATUS_META[s.status] || { label: s.status, color: 'bg-muted', icon: <Circle className="h-3 w-3" /> }
              const pendingActions = s.status === 'pending' ? (
                <div>
                  <Link to={`/article-suggestions/${s.id}/edit`} className="text-muted-foreground hover:text-primary p-1" title="Editar">
                    <Edit className="h-4 w-4" />
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleCancel(s.id.toString())} className="text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : null

              return (
                <Card key={s.id} className="group hover:shadow-md transition-shadow">
                  <Card.Content className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/article-suggestions/${s.id}`} className="font-semibold text-lg truncate hover:text-primary">
                            {s.title}
                          </Link>
                          <Badge className={cn('text-xs', meta.color)}>{meta.label}</Badge>
                        </div>
                        {s.summary && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{s.summary}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {s.category && (
                            <Badge variant="outline" className="border-0 px-0 py-0 text-[11px]" style={{ color: s.category.color }}>
                              {s.category.name}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <span className={s.access_level === 'public' ? 'text-emerald-600' : 'text-amber-600'}>
                              {s.access_level === 'public' ? 'Público' : 'Interno'}
                            </span>
                          </span>
                          <span>{formatRelativeTime(s.created_at)}</span>
                          {s.reviewed_by && s.reviewed_at && (
                            <span>Revisado por {s.reviewed_by} em {formatRelativeTime(s.reviewed_at)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link to={`/article-suggestions/${s.id}`} className="text-muted-foreground hover:text-primary p-1" title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Link>

                        {s.status === 'pending' && (
                          <div>
                            <Link to={`/article-suggestions/${s.id}/edit`} className="text-muted-foreground hover:text-primary p-1" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => handleCancel(s.id.toString())} className="text-destructive hover:text-destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {s.status === 'rejected' && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id.toString())} className="text-destructive hover:text-destructive" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {s.status === 'published' && s.article_id && (
                          <Link to={`/admin/articles/${s.article_id}/edit`} className="text-emerald-600 hover:text-emerald-700 p-1" title="Ver artigo publicado">
                            <FileText className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {s.review_notes && (
                      <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <p className="text-xs font-medium text-destructive">Observação do revisor:</p>
                        <p className="mt-1 text-sm text-destructive/80 whitespace-pre-wrap">{s.review_notes}</p>
                      </div>
                    )}

                    {s.article_id && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald/20 rounded-lg">
                        <p className="text-xs font-medium text-emerald-800">Artigo publicado!</p>
                        <p className="mt-1 text-sm text-emerald-700">A sugestão foi convertida no artigo #{s.article_id}.</p>
                      </div>
                    )}
                  </Card.Content>
                </Card>
              )
            })}
          </div>

          {total > perPage && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {Math.ceil(total / perPage)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))} disabled={page >= Math.ceil(total / perPage)}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}