import { useState, useEffect } from 'react'
import api from '../../services/api'

export function CompanySettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/admin/settings/company')
      setSettings(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await api.put('/admin/settings/company', settings)
      alert('Configurações salvas!')
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.message || 'Erro'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Empresa</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
            <input value={settings.company_name} onChange={e => setSettings({...settings, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL do Logo</label>
            <input value={settings.logo_url || ''} onChange={e => setSettings({...settings, logo_url: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
            <div className="flex items-center space-x-2">
              <input value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} type="color" className="w-10 h-10 rounded border cursor-pointer" />
              <span className="text-sm text-gray-500">{settings.primary_color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária</label>
            <div className="flex items-center space-x-2">
              <input value={settings.secondary_color} onChange={e => setSettings({...settings, secondary_color: e.target.value})} type="color" className="w-10 h-10 rounded border cursor-pointer" />
              <span className="text-sm text-gray-500">{settings.secondary_color}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de Boas-vindas</label>
          <textarea value={settings.welcome_message || ''} onChange={e => setSettings({...settings, welcome_message: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contato</label>
            <input value={settings.contact_info?.email || ''} onChange={e => setSettings({...settings, contact_info: { ...settings.contact_info, email: e.target.value }})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input value={settings.contact_info?.phone || ''} onChange={e => setSettings({...settings, contact_info: { ...settings.contact_info, phone: e.target.value }})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input value={settings.contact_info?.address || ''} onChange={e => setSettings({...settings, contact_info: { ...settings.contact_info, address: e.target.value }})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div className="flex items-center space-x-4 pt-3">
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.enable_evaluations} onChange={e => setSettings({...settings, enable_evaluations: e.target.checked})} className="rounded" />
            <span>Habilitar avaliações</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.enable_audit_logs} onChange={e => setSettings({...settings, enable_audit_logs: e.target.checked})} className="rounded" />
            <span>Habilitar logs de auditoria</span>
          </label>
        </div>

        <button onClick={save} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
