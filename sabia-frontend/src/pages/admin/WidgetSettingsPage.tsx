import { useState, useEffect } from 'react'
import api from '../../services/api'

export function WidgetSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/admin/settings/widget')
      setSettings(res.data)
    } catch { setSettings({}) }
    finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await api.put('/admin/settings/widget', settings)
      alert('Configurações do widget salvas!')
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.message || 'Erro'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações do Widget</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de Boas-vindas</label>
          <textarea value={settings.welcome_message || ''} onChange={e => setSettings({...settings, welcome_message: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link de Suporte Humano</label>
            <input value={settings.support_link || ''} onChange={e => setSettings({...settings, support_link: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Suporte</label>
            <input value={settings.support_phone || ''} onChange={e => setSettings({...settings, support_phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Início</label>
            <input value={settings.support_start_time || '08:00'} onChange={e => setSettings({...settings, support_start_time: e.target.value})} type="time" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Fim</label>
            <input value={settings.support_end_time || '18:00'} onChange={e => setSettings({...settings, support_end_time: e.target.value})} type="time" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem Fora do Horário</label>
          <textarea value={settings.out_of_hours_message || ''} onChange={e => setSettings({...settings, out_of_hours_message: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domínios Permitidos <span className="text-gray-400">(um por linha, * para qualquer)</span></label>
          <textarea value={(settings.allowed_domains || ['*']).join('\n')} onChange={e => setSettings({...settings, allowed_domains: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean)})} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="flex items-center space-x-6 pt-3">
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.maintenance_mode} onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})} className="rounded" />
            <span>Modo Manutenção</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.teams_notify_transfer} onChange={e => setSettings({...settings, teams_notify_transfer: e.target.checked})} className="rounded" />
            <span>Notificar transferências</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.teams_notify_gap} onChange={e => setSettings({...settings, teams_notify_gap: e.target.checked})} className="rounded" />
            <span>Notificar lacunas</span>
          </label>
        </div>

        <button onClick={save} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
