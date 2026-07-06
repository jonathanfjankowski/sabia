import { useState, useEffect } from 'react'
import api from '../../services/api'

interface GapItem {
  id: number
  question: string
  context: string | null
  source: string
  resolved: boolean
  resolved_by: { id: number; name: string } | null
  resolved_at: string | null
  created_at: string
}

export function KnowledgeGapsList() {
  const [gaps, setGaps] = useState<GapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { load() }, [filter])

  async function load() {
    try {
      const params: any = {}
      if (filter === 'open') params.resolved = false
      if (filter === 'resolved') params.resolved = true
      const res = await api.get('/admin/knowledge-gaps', { params })
      setGaps(res.data.data || res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function resolve(id: number) {
    const notes = prompt('Notas sobre a resolução (opcional):')
    try {
      await api.put(`/admin/knowledge-gaps/${id}/resolve`, { resolution_notes: notes })
      load()
    } catch (err) { console.error(err) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lacunas de Conhecimento</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todas</option>
          <option value="open">Abertas</option>
          <option value="resolved">Resolvidas</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div>
        : gaps.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhuma lacuna encontrada.</div>
        : <table className="w-full">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pergunta</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fonte</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {gaps.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{g.question}</p>{g.context && <p className="text-xs text-gray-500 mt-0.5">{g.context}</p>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{g.source}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${g.resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {g.resolved ? 'Resolvida' : 'Aberta'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(g.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">
                    {!g.resolved && <button onClick={() => resolve(g.id)} className="px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded">Resolver</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  )
}
