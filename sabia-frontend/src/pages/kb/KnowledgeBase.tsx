import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, BookOpen, Eye, ThumbsUp, ChevronRight, Filter, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Article, Category } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { formatRelativeTime, cn } from '@/lib/utils'

export function KnowledgeBase() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega artigos + categorias na montagem
  useEffect(() => {
    Promise.all([api.get<Article[]>('/articles'), api.get<Category[]>('/categories')])
      .then(([a, c]) => {
        setArticles(Array.isArray(a) ? a : [])
        setCategories(Array.isArray(c) ? c : [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Sincroniza busca da query param da URL
  useEffect(() => {
    setSearch(q)
  }, [q])

  // Busca via API com debounce quando há query
  useEffect(() => {
    if (!q.trim()) return // no API search for empty query

    setLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const results = await api.get<Article[]>('/search?q=' + encodeURIComponent(q))
        let filtered = Array.isArray(results) ? results : []
        if (activeCategory) {
          filtered = filtered.filter((a) => a.category_id === activeCategory)
        }
        setArticles(filtered)
      } catch {
        // keep existing articles on error
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [q, activeCategory])

  // Quando não há query, reseta para lista completa
  useEffect(() => {
    if (!q.trim() && articles.length > 0 && activeCategory === null) return
  }, [q])

  const filtered = useMemo(() => {
    if (q.trim()) return articles // already filtered by API
    return articles.filter((a) => {
      if (activeCategory && a.category_id !== activeCategory) return false
      return true
    })
  }, [articles, q, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<number, Article[]>()
    for (const a of filtered) {
      const key = a.category_id ?? 0
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [filtered])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (value.trim()) {
      setSearchParams({ q: value })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base de Conhecimento"
        description="Browse manual de artigos por categoria"
        icon={<BookOpen className="h-5 w-5" />}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Busque por título, conteúdo ou palavra-chave..."
          className="h-11 pl-9 pr-10"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {q && (
          <button
            onClick={() => {
              setSearch('')
              setSearchParams({})
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Categorias:
        </div>
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            activeCategory === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Todas ({articles.length})
        </button>
        {categories.map((c) => {
          const count = articles.filter((a) => a.category_id === c.id && a.status === 'active').length
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeCategory === c.id
                  ? 'text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
              style={activeCategory === c.id ? { backgroundColor: c.color } : undefined}
            >
              <CategoryIcon name={c.icon} className="h-3 w-3" />
              {c.name} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Nenhum artigo encontrado"
          description="Tente outra busca ou remova os filtros aplicados."
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([categoryId, items]) => {
            const category = categories.find((c) => c.id === categoryId)
            return (
              <section key={categoryId}>
                {category && (
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      <CategoryIcon name={category.icon} className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-semibold tracking-tight">{category.name}</h2>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} artigo{items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((a) => (
                    <ArticleCard key={a.id} article={a} category={category} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article, category }: { article: Article; category?: Category }) {
  return (
    <Link to={`/kb/${article.slug}`}>
      <Card className="group h-full p-4 transition-all hover:border-primary/40 hover:shadow-elevated">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">
            <HighlightText text={article.title} query={article.title} />
          </h3>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        {article.summary && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            <HighlightText text={article.summary} query={article.summary} />
          </p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          {category && (
            <Badge variant="outline" className="border-0 px-0 py-0 text-[11px]" style={{ color: category.color }}>
              {category.name}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {article.views_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" /> {article.helpful_yes}
          </span>
          <span className="ml-auto">{formatRelativeTime(article.updated_at)}</span>
        </div>
      </Card>
    </Link>
  )
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped.split(' ').filter(Boolean).join('|')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="rounded bg-primary/15 px-0.5 text-primary">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
