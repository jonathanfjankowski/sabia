import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TipTapEditor } from '../../components/editor/TipTapEditor'
import api from '../../services/api'

interface Category {
  id: number
  name: string
}

export function ArticleEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [tags, setTags] = useState('')
  const [changelog, setChangelog] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    loadCategories()
    if (!isNew) loadArticle()
  }, [id])

  async function loadCategories() {
    try {
      const res = await api.get('/categories', { params: { per_page: 100 } })
      setCategories(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    }
  }    async function loadArticle() {
    try {
      const res = await api.get(`/admin/articles/${id}`)
      const article = res.data
      setTitle(article.title)
      setSummary(article.summary || '')
      setContent(article.content)
      setCategoryId(article.category_id?.toString() || '')
      setIsPublished(article.is_published)
      setTags(article.tags?.join(', ') || '')
    } catch (err) {
      console.error('Erro ao carregar artigo:', err)
      navigate('/admin/articles')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const data: any = {
        title,
        summary,
        content,
        category_id: parseInt(categoryId),
        is_published: isPublished,
        tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      }

      if (!isNew) {
        data.changelog = changelog || 'Atualização via editor'
      }

      if (isNew) {
        await api.post('/admin/articles', data)
      } else {
        await api.put(`/admin/articles/${id}`, data)
      }

      navigate('/admin/articles')
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar artigo: ' + (err.response?.data?.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Novo Artigo' : `Editar: ${title}`}
        </h1>
        <button
          onClick={() => navigate('/admin/articles')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Voltar
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Title & Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Título do artigo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecione...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resumo</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Breve resumo do artigo (opcional)"
          />
        </div>

        {/* Content (TipTap Editor) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder="Digite ou cole o conteúdo do artigo aqui... Use / para comandos rápidos"
            minHeight="400px"
          />
        </div>

        {/* Tags & Publishing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400">(separadas por vírgula)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="tms, fiscal, notas"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Publicar artigo</span>
            </label>
          </div>
        </div>

        {/* Changelog (only for edits) */}
        {!isNew && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição da alteração <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Corrigido erro de digitação no parágrafo 3"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/articles')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : isNew ? 'Criar Artigo' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
