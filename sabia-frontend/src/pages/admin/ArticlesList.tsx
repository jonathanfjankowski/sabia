import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

interface ArticleListItem {
  id: number
  title: string
  slug: string
  summary: string | null
  category: { id: number; name: string } | null
  author: { id: number; name: string } | null
  is_published: boolean
  published_at: string | null
  views_count: number
  avg_rating: number
  created_at: string
  deleted_at: string | null
}

export function ArticlesList() {
  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { loadArticles() }, [statusFilter])

  async function loadArticles() {
    setLoading(true)
    try {
      const params: any = { per_page: 50 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/admin/articles', { params })
      setArticles(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar artigos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadArticles()
  }

  async function togglePublish(article: ArticleListItem) {
    try {
      await api.put(`/admin/articles/${article.id}`, {
        is_published: !article.is_published,
      })
      loadArticles()
    } catch (err) {
      console.error('Erro ao publicar/arquivar:', err)
    }
  }

  async function archiveArticle(id: number) {
    if (!confirm('Tem certeza que deseja arquivar este artigo?')) return
    try {
      await api.delete(`/admin/articles/${id}`)
      loadArticles()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Artigos</h1>
        <Link
          to="/admin/articles/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Novo Artigo
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum artigo encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Autor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Views</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/articles/${article.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                      {article.title}
                    </Link>
                    {article.summary && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{article.summary}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {article.category?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {article.author?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {article.deleted_at ? (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Arquivado</span>
                    ) : article.is_published ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Publicado</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Rascunho</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{article.views_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/admin/articles/${article.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => togglePublish(article)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        {article.is_published ? 'Arquivar' : 'Publicar'}
                      </button>
                      <button
                        onClick={() => archiveArticle(article.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
