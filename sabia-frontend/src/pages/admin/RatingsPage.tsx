import { useState, useEffect } from 'react'
import api from '../../services/api'

export function RatingsPage() {
  const [data, setData] = useState<any>({ data: [], stats: { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/admin/ratings')
      setData(res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const { stats } = data

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Avaliações</h1>

      {loading ? <div className="text-center py-12 text-gray-500">Carregando...</div> : <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{stats.average?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-gray-500 mt-1">Média</p>
          </div>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="bg-white rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.distribution?.[star] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{'★'.repeat(star)}{'☆'.repeat(5-star)}</p>
            </div>
          ))}
        </div>

        {/* Distribution Bar */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const pct = stats.total > 0 ? ((stats.distribution?.[star] || 0) / stats.total * 100) : 0
              return (
                <div key={star} className="flex items-center space-x-2">
                  <span className="text-sm w-6 text-right">{star}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </>}
    </div>
  )
}
