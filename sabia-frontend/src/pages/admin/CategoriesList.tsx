import { useState, useEffect } from 'react'
import api from '../../services/api'

interface CategoryItem {
  id: number
  name: string
  slug: string
  description: string | null
  parent_id: number | null
  order: number
  is_active: boolean
  articles_count: number
}

export function CategoriesList() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    try {
      const res = await api.get('/categories', { params: { per_page: 50 } })
      setCategories(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setEditingId(null)
    setFormData({ name: '', description: '' })
  }

  function startEdit(cat: CategoryItem) {
    setEditingId(cat.id)
    setFormData({ name: cat.name, description: cat.description || '' })
  }

  async function save() {
    try {
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, formData)
      } else {
        await api.post('/admin/categories', formData)
      }
      setEditingId(null)
      setFormData({ name: '', description: '' })
      loadCategories()
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.response?.data?.message || 'Erro desconhecido'))
    }
  }

  async function toggleActive(cat: CategoryItem) {
    try {
      await api.put(`/admin/categories/${cat.id}`, { is_active: !cat.is_active })
      loadCategories()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    try {
      await api.delete(`/admin/categories/${id}`)
      loadCategories()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nova Categoria
        </button>
      </div>

      {/* Create/Edit Form */}
      {(editingId !== null || formData.name) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">
            {editingId ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nome da categoria"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Descrição opcional"
              />
            </div>
            <button
              onClick={save}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              {editingId ? 'Salvar' : 'Criar'}
            </button>
            <button
              onClick={() => { setEditingId(null); setFormData({ name: '', description: '' }) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`bg-white rounded-lg border p-5 transition-all ${
                cat.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{cat.articles_count} artigos</p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cat.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              {cat.description && (
                <p className="text-sm text-gray-600 mb-3">{cat.description}</p>
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEdit(cat)}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(cat)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  {cat.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
