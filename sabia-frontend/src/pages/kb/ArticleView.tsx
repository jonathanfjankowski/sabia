import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, BookOpen, ChevronRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import type { Article, Category } from '@/types'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { toast } from '@/stores/toast'
import { formatRelativeTime } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function ArticleView() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<(Article & { category?: Category }) | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setArticle(null)
    setRelated([])
    setFeedback(null)
    api
      .get<Article & { category?: Category }>(`/articles/${slug}`)
      .then(async (a) => {
        setArticle(a)
        const rel = await api.get<Article[]>(`/articles/${a.id}/related`).catch(() => [])
        setRelated(rel)
      })
      .catch(() => {
        toast.error('Artigo não encontrado')
        navigate('/kb')
      })
      .finally(() => setLoading(false))
  }, [slug, navigate])

  const handleFeedback = async (helpful: boolean) => {
    if (!article || feedback) return
    setFeedback(helpful ? 'yes' : 'no')
    try {
      const res = await api.post<{ helpful_yes: number; helpful_no: number }>(
        `/articles/${article.id}/feedback`,
        { helpful }
      )
      setArticle({ ...article, helpful_yes: res.helpful_yes, helpful_no: res.helpful_no })
      toast.success(helpful ? 'Obrigado pelo feedback!' : 'Feedback registrado')
    } catch {
      toast.error('Erro ao enviar feedback')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/kb')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para KB
      </button>

      <article>
        <header className="space-y-3 border-b border-border pb-6">
          {article.category && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{
                  backgroundColor: `${article.category.color}20`,
                  color: article.category.color,
                }}
              >
                <CategoryIcon name={article.category.icon} className="h-3 w-3" />
              </div>
              <span className="font-medium" style={{ color: article.category.color }}>
                {article.category.name}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{article.title}</span>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          {article.summary && (
            <p className="text-lg text-muted-foreground">{article.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Atualizado {formatRelativeTime(article.updated_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {article.views_count} visualizações
            </span>
            <span className="inline-flex items-center gap-1">v{article.version}</span>
            <Badge variant={article.access_level === 'internal' ? 'default' : 'secondary'}>
              {article.access_level === 'internal' ? 'Interno' : 'Público'}
            </Badge>
          </div>
        </header>

        <div className="py-6">
          <MarkdownRenderer content={article.content} />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-medium">Este artigo foi útil?</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button
              variant={feedback === 'yes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(true)}
              disabled={feedback !== null}
            >
              <ThumbsUp className="h-4 w-4" />
              Sim ({article.helpful_yes})
            </Button>
            <Button
              variant={feedback === 'no' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(false)}
              disabled={feedback !== null}
            >
              <ThumbsDown className="h-4 w-4" />
              Não ({article.helpful_no})
            </Button>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Artigos relacionados
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.id} to={`/kb/${r.slug}`}>
                <Card className="group p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <h3 className="text-sm font-medium group-hover:text-primary">{r.title}</h3>
                  {r.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
