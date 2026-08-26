import { useNavigate, useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArticleForm } from '@/components/admin/ArticleForm'
import { api } from '@/lib/api'
import type { Category, ArticleSuggestion } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { toast } from '@/stores/toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { cn } from '@/lib/utils'
import { ArrowLeft, MessageSquare, CheckCircle, XCircle, Edit, FileText, RotateCcw } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejeitado', color: 'bg-destructive/10 text-destructive' },
  published: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', color: 'bg-muted/50 text-muted-foreground' },
}

export function ArticleSuggestionReview() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestion, setSuggestion] = useState<ArticleSuggestion | null>(null)
  const [showEditApprove, setShowEditApprove] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {})

    if (id) {
      api.get(`/article-suggestions/${id}`).then((s: any) => {
        setSuggestion(s)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!suggestion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sugestão não encontrada</p>
        <Link to="/admin/article-suggestions" className="text-primary hover:underline mt-4 inline-block">
          Voltar para sugestões
        </Link>
      </div>
    )
  }

  const handleApprove = async (extraData?: { review_notes?: string }) => {
    try {
      await api.post(`/admin/article-suggestions/${id}/approve`, extraData)
      toast.success('Sugestão aprovada e artigo publicado')
      navigate(`/article-suggestions/${id}`, { replace: true })
    } catch {
      toast.error('Erro ao aprovar')
    }
  }

  const handleApproveWithEdit = async (data: any) => {
    try {
      await api.post(`/admin/article-suggestions/${id}/approve-with-edit`, data)
      toast.success('Sugestão aprovada com edição e artigo publicado')
      navigate(`/article-suggestions/${id}`, { replace: true })
    } catch {
      toast.error('Erro ao aprovar com edição')
    }
  }

  const handleReject = async (reviewNotes: string) => {
    try {
      await api.post(`/admin/article-suggestions/${id}/reject`, { review_notes: reviewNotes })
      toast.success('Sugestão rejeitada')
      navigate(`/admin/article-suggestions`, { replace: true })
    } catch {
      toast.error('Erro ao rejeitar')
    }
  }

  const meta = STATUS_META[suggestion.status] || { label: suggestion.status, color: 'bg-muted' }
  const suggestedByName = suggestion.suggested_by_profile?.full_name ?? 'Desconhecido'

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/article-suggestions" className="text-muted-foreground hover:text-primary text-sm mb-2 inline-block">
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold">{suggestion.title}</h1>
          <p className="text-muted-foreground">Sugerido por {suggestedByName} em {new Date(suggestion.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs', meta.color)}>
            {meta.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Conteúdo da sugestão</h3>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={suggestion.content} />
              </div>
            </CardContent>
          </Card>

          {suggestion.review_notes && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-destructive mb-2">Observação do revisor anterior:</p>
                <p className="text-sm text-destructive/80 whitespace-pre-wrap">{suggestion.review_notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Categoria: {suggestion.category?.name || 'N/A'} · Acesso: {suggestion.access_level === 'public' ? 'Público' : 'Interno'}</p>
              {suggestion.article_id && (
                <div className="p-3 bg-emerald-50 border border-emerald/20 rounded-lg">
                  <p className="text-xs font-medium text-emerald-800">Artigo já publicado!</p>
                  <p className="mt-1 text-sm text-emerald-700">Esta sugestão foi convertida no artigo <Link to={`/admin/articles/${suggestion.article_id}/edit`} className="underline">#{suggestion.article_id}</Link>.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-24 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ações do revisor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestion.status === 'pending' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleApprove()}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar e publicar
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowEditApprove(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Aprovar com edição
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setShowRejectModal(true)
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </>
              )}

              {suggestion.status === 'rejected' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleApprove()}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reconsiderar e aprovar
                </Button>
              )}

              {suggestion.article_id && (
                <Link to={`/admin/articles/${suggestion.article_id}/edit`}>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Editar artigo publicado
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}