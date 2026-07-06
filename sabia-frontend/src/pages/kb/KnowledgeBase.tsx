import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  articles_count: number
}

interface Article {
  id: number
  title: string
  slug: string
  summary: string | null
  category: { id: number; name: string }
  author: { id: number; name: string }
  tags: string[] | null
  is_published: boolean
  published_at: string | null
  views_count: number
  avg_rating: number
  created_at: string
}

export function KnowledgeBase() {
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  useEffect(() => {
    loadCategories()
    loadArticles()
  }, [])

  useEffect(() => {
    loadArticles()
  }, [selectedCategory])

  async function loadCategories() {
    try {
      const res = await api.get('/categories', { params: { active: true, per_page: 50 } })
      setCategories(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    }
  }

  async function loadArticles() {
    setLoading(true)
    try {
      const params: any = { status: 'published', per_page: 20 }
      if (selectedCategory) params.category_id = selectedCategory
      const res = await api.get('/articles', { params })
      setArticles(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar artigos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const params: any = { status: 'published', per_page: 20 }
      if (search) params.search = search
      if (selectedCategory) params.category_id = selectedCategory
      const res = await api.get('/articles', { params })
      setArticles(res.data.data || res.data)
    } catch (err) {
      console.error('Erro na busca:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 mt-1">Encontre artigos e documentações do sistema</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artigos..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>

      <div className="flex gap-6">
        {/* Categories sidebar */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Categorias</h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                !selectedCategory ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todas as categorias
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                  selectedCategory === cat.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.articles_count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Articles list */}
        <div className="flex-1">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Nenhum artigo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/kb/${article.slug}`}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{article.title}</h3>
                      {article.summary && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.summary}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full">{article.category?.name}</span>
                        <span>{article.views_count} visualizações</span>
                        {article.avg_rating > 0 && (
                          <span className="text-yellow-600">★ {article.avg_rating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
