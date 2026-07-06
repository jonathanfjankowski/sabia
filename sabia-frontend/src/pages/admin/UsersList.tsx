import { useState, useEffect } from 'react'
import api from '../../services/api'

interface UserItem {
  id: number
  name: string
  email: string
  profile: { id: number; full_name: string; role: string; is_active: boolean; phone: string | null }
  created_at: string
}

export function UsersList() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'operador', phone: '' })

  useEffect(() => { loadUsers() }, [])

  async function loadUsers(searchTerm?: string) {
    try {
      const params: any = {}
      if (searchTerm) params.search = searchTerm
      const res = await api.get('/admin/users', { params })
      setUsers(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadUsers(search)
  }

  function startCreate() {
    setEditingId(null)
    setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'operador', phone: '' })
    setShowForm(true)
  }

  function startEdit(user: UserItem) {
    setEditingId(user.id)
    setForm({ name: user.name, email: user.email, password: '', password_confirmation: '', role: user.profile?.role || 'operador', phone: user.profile?.phone || '' })
    setShowForm(true)
  }

  async function save() {
    try {
      const payload: any = { ...form }
      if (editingId) {
        if (!payload.password) delete payload.password
        delete payload.password_confirmation
        await api.put(`/admin/users/${editingId}`, payload)
      } else {
        await api.post('/admin/users', payload)
      }
      setShowForm(false)
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar')
    }
  }

  async function toggleActive(user: UserItem) {
    await api.put(`/admin/users/${user.id}`, { is_active: !user.profile?.is_active })
    loadUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearch} className="flex">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm hover:bg-gray-200">Buscar</button>
          </form>
          <button onClick={startCreate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">+ Novo</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome" className="px-3 py-2 border rounded-lg text-sm" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" type="email" className="px-3 py-2 border rounded-lg text-sm" />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="px-3 py-2 border rounded-lg text-sm">
              <option value="operador">Operador</option>
              <option value="gestor">Gestor</option>
            </select>
            {!editingId && (
              <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Senha" type="password" className="px-3 py-2 border rounded-lg text-sm" />
            )}
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Telefone" className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex space-x-2 mt-3">
            <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${u.profile?.role === 'gestor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.profile?.role === 'gestor' ? 'Gestor' : 'Operador'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${u.profile?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.profile?.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => startEdit(u)} className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded">Editar</button>
                  <button onClick={() => toggleActive(u)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">{u.profile?.is_active ? 'Desativar' : 'Ativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
