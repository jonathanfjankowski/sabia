import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import api from '../../services/api'

interface Article {
  id: number
  title: string
  slug: string
  summary: string | null
  content: string
  category: { id: number; name: string }
  author: { id: number; name: string }
  tags: string[] | null
  views_count: number
  avg_rating: number
  rating_count: number
  published_at: string
  helpful_yes: number
  helpful_no: number
}

export function ArticleView() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) loadArticle()
  }, [slug])

  async function loadArticle() {
    setLoading(true)
    try {
      const res = await api.get(`/articles/${slug}`)
      setArticle(res.data)

      // Load related articles
      try {
        const relRes = await api.get(`/articles/${res.data.id}/related`)
        setRelated(relRes.data)
      } catch {}
    } catch (err) {
      console.error('Erro ao carregar artigo:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sendFeedback(helpful: boolean) {
    if (!article) return
    try {
      await api.post(`/articles/${article.id}/feedback`, { helpful })
      if (helpful) {
        setArticle({ ...article, helpful_yes: article.helpful_yes + 1 })
      } else {
        setArticle({ ...article, helpful_no: article.helpful_no + 1 })
      }
    } catch (err) {
      console.error('Erro ao enviar feedback:', err)
    }
  }

  function renderMarkdown(content: string): string {
    const raw = marked.parse(content)
    if (raw instanceof Promise) {
      return content
    }
    return DOMPurify.sanitize(raw)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="mt-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500">Artigo não encontrado.</p>
        <Link to="/kb" className="text-indigo-600 hover:text-indigo-500 mt-2 inline-block">
          ← Voltar para Base de Conhecimento
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/kb" className="hover:text-indigo-600">Base de Conhecimento</Link>
        {article.category && (
          <>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{article.category.name}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-700">{article.title}</span>
      </nav>

      <article className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>
          {article.summary && (
            <p className="text-lg text-gray-600 mb-4">{article.summary}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {article.category && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium text-xs">
                {article.category.name}
              </span>
            )}
            {article.tags?.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                #{tag}
              </span>
            ))}
            <span>{article.views_count} visualizações</span>
            <span>Por {article.author?.name || 'Desconhecido'}</span>
            <span>{new Date(article.published_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Content (rendered markdown) */}
        <div
          className="px-8 py-6 prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />

        {/* Feedback */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">Este artigo foi útil?</p>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => sendFeedback(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
            >
              👍 Sim ({article.helpful_yes})
            </button>
            <button
              onClick={() => sendFeedback(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              👎 Não ({article.helpful_no})
            </button>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Artigos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map((relArticle) => (
              <Link
                key={relArticle.id}
                to={`/kb/${relArticle.slug}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-medium text-gray-900 mb-1">{relArticle.title}</h3>
                {relArticle.summary && (
                  <p className="text-sm text-gray-600 line-clamp-2">{relArticle.summary}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
