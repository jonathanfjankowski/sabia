import { useState, useEffect } from 'react'
import api from '../../services/api'

export function WidgetConversationsPage() {
  const [convs, setConvs] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState<any>(null); const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { load() }, [statusFilter])

  async function load() {
    try {
      const params: any = {}; if (statusFilter) params.status = statusFilter
      const res = await api.get('/admin/widget-conversations', { params })
      setConvs(res.data.data || res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function viewConversation(id: number) {
    try {
      const res = await api.get(`/admin/widget-conversations/${id}`)
      setSelectedConv(res.data)
    } catch (err) { console.error(err) }
  }

  function downloadExport(id: number) {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/admin/widget-conversations/${id}/export`
    window.open(url, '_blank')
  }

  if (selectedConv) return (
    <div>
      <button onClick={() => setSelectedConv(null)} className="mb-4 text-sm text-indigo-600 hover:text-indigo-500">← Voltar</button>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{selectedConv.title || 'Conversa Widget'}</h2>
            <p className="text-sm text-gray-500">{new Date(selectedConv.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <button onClick={() => downloadExport(selectedConv.id)} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Exportar TXT</button>
        </div>
        <div className="space-y-3">
          {selectedConv.messages?.map((msg: any) => (
            <div key={msg.id} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-50 ml-8' : 'bg-gray-50 mr-8'}`}>
              <p className="text-xs font-medium text-gray-500 mb-1">{msg.role === 'user' ? 'Usuário' : 'Sabiá'}</p>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversas do Widget</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todas</option><option value="open">Abertas</option><option value="closed">Encerradas</option><option value="transferred">Transferidas</option>
        </select>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div>
        : convs.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhuma conversa.</div>
        : <table className="w-full">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Título</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mensagens</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Avaliação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {convs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{c.title || 'Widget'}</td>
                  <td className="px-4 py-3 text-center text-sm">{c.messages_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.is_closed ? 'bg-gray-100 text-gray-600' : c.transfer_status === 'transferred' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {c.is_closed ? 'Encerrada' : c.transfer_status === 'transferred' ? 'Transferida' : 'Ativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{c.rating ? '★'.repeat(c.rating) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => viewConversation(c.id)} className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded">Ver</button>
                    <button onClick={() => downloadExport(c.id)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">Exportar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  )
}
