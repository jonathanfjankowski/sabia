import { useState, useEffect } from 'react'
import api from '../../services/api'

export function HealthPage() {
  const [health, setHealth] = useState<any>(null); const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/admin/health')
      setHealth(res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>
  if (!health) return <div className="text-center py-12 text-gray-500">Erro ao carregar saúde do sistema.</div>

  const statusColor = (s: string) => s === 'connected' || s === 'ok' ? 'text-green-600 bg-green-50 border-green-200'
    : s === 'error' || s === 'invalid' ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-yellow-600 bg-yellow-50 border-yellow-200'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Saúde do Sistema</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* AI Status */}
        <div className={`rounded-lg border p-5 ${statusColor(health.ai?.status)}`}>
          <h3 className="font-semibold text-sm mb-2">Provedor de IA</h3>
          <p className="text-lg font-bold capitalize">{health.ai?.status === 'connected' ? 'Conectado' : health.ai?.status === 'not_configured' ? 'Não configurado' : health.ai?.status === 'invalid' ? 'Inválido' : 'Erro'}</p>
          <p className="text-xs mt-1">{health.ai?.provider} / {health.ai?.model}</p>
          {health.ai?.error && <p className="text-xs mt-1 text-red-500">{health.ai.error}</p>}
        </div>

        {/* Requests */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Requisições (24h)</h3>
          <p className="text-3xl font-bold text-gray-900">{health.requests_24h || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Conversas totais: {health.total_conversations || 0}</p>
        </div>

        {/* Database */}
        <div className={`rounded-lg border p-5 ${statusColor(health.database?.status)}`}>
          <h3 className="font-semibold text-sm mb-2">Banco de Dados</h3>
          <p className="text-lg font-bold">{health.database?.status === 'connected' ? 'Conectado' : 'Erro'}</p>
          {health.database?.message && <p className="text-xs mt-1 text-red-500">{health.database.message}</p>}
        </div>
      </div>

      {/* Critical Errors */}
      <div className="bg-white rounded-lg border">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Últimos Erros Críticos</h3>
        </div>
        <div className="p-5">
          {health.critical_errors?.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum erro crítico registrado.</p>
          ) : (
            <div className="space-y-2">
              {health.critical_errors?.map((err: any) => (
                <div key={err.id} className="p-3 bg-red-50 rounded-lg text-sm">
                  <p className="font-medium text-red-800">{err.context}</p>
                  <p className="text-red-600 mt-0.5">{err.message}</p>
                  <p className="text-xs text-red-400 mt-1">{new Date(err.created_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
