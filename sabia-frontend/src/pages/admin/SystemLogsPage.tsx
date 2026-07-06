import { useState, useEffect } from 'react'
import api from '../../services/api'

interface LogItem { id: number; level: string; context: string; message: string; payload: any; created_at: string }

export function SystemLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]); const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')

  useEffect(() => { load() }, [levelFilter])

  async function load() {
    try {
      const params: any = {}; if (levelFilter) params.level = levelFilter
      const res = await api.get('/admin/system-logs', { params })
      setLogs(res.data.data || res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const badge = (lvl: string) => {
    const m: Record<string, string> = { info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700', error: 'bg-red-100 text-red-700', critical: 'bg-red-200 text-red-800' }
    return `px-2 py-0.5 text-xs rounded-full ${m[lvl] || 'bg-gray-100'}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs do Sistema</h1>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todos</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div>
        : logs.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum log.</div>
        : <table className="w-full">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nível</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contexto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mensagem</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
            </tr></thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={badge(l.level)}>{l.level}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.context}</td>
                  <td className="px-4 py-3 text-sm">{l.message}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  )
}
