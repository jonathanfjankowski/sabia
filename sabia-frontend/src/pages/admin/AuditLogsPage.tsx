import { useState, useEffect } from 'react'
import api from '../../services/api'

interface AuditItem {
  id: number
  user: { id: number; name: string } | null
  action: string
  entity_type: string
  entity_id?: number
  old_values: any
  new_values: any
  ip_address: string | null
  created_at: string
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => { load() }, [actionFilter])

  async function load() {
    try {
      const params: any = {}
      if (actionFilter) params.action = actionFilter
      const res = await api.get('/admin/audit-logs', { params })
      setLogs(res.data.data || res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function actionLabel(action: string): string {
    const labels: Record<string, string> = {
      'create': 'Criação', 'update': 'Atualização', 'delete': 'Exclusão',
      'login': 'Login', 'logout': 'Logout',
    }
    return labels[action] || action
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todas as ações</option>
          <option value="create">Criação</option>
          <option value="update">Atualização</option>
          <option value="delete">Exclusão</option>
          <option value="login">Login</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div>
        : logs.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum log encontrado.</div>
        : <table className="w-full">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entidade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
            </tr></thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{log.user?.name || 'Sistema'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      log.action === 'create' ? 'bg-green-100 text-green-700' :
                      log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                      log.action === 'delete' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{actionLabel(log.action)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.entity_type}#{log.entity_id}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ip_address || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  )
}
