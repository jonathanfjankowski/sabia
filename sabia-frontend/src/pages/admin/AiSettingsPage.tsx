import { useState, useEffect } from 'react'
import api from '../../services/api'

export function AiSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/admin/settings/ai')
      setSettings(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await api.put('/admin/settings/ai', settings)
      alert('Configurações salvas!')
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.message || 'Erro'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>
  if (!settings) return <div className="text-center py-12 text-gray-500">Erro ao carregar configurações.</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações de IA</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
            <select value={settings.provider} onChange={e => setSettings({...settings, provider: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
            <input value={settings.model} onChange={e => setSettings({...settings, model: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key {settings.api_key_mask && <span className="text-gray-400">({settings.api_key_mask})</span>}</label>
          <input value={settings.api_key || ''} onChange={e => setSettings({...settings, api_key: e.target.value})} type="password" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nova API key (deixe vazio para manter)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura</label>
            <input value={settings.temperature} onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})} type="range" min="0" max="1" step="0.1" className="w-full" />
            <span className="text-xs text-gray-500">{settings.temperature}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
            <input value={settings.max_tokens} onChange={e => setSettings({...settings, max_tokens: parseInt(e.target.value)})} type="number" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Threshold Confiança</label>
            <input value={settings.confidence_threshold} onChange={e => setSettings({...settings, confidence_threshold: parseFloat(e.target.value)})} type="range" min="0" max="1" step="0.05" className="w-full" />
            <span className="text-xs text-gray-500">{settings.confidence_threshold}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea value={settings.system_prompt || ''} onChange={e => setSettings({...settings, system_prompt: e.target.value})} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.enable_rag} onChange={e => setSettings({...settings, enable_rag: e.target.checked})} className="rounded" />
            <span>Habilitar RAG</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={settings.enable_citations} onChange={e => setSettings({...settings, enable_citations: e.target.checked})} className="rounded" />
            <span>Habilitar citações</span>
          </label>
        </div>

        <button onClick={save} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Test Prompt */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Testar System Prompt</h2>
        <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Digite uma mensagem de teste..." />
        <button onClick={async () => {
          setTestResult('Testando...')
          try {
            const res = await api.post('/admin/settings/ai/test-prompt', { system_prompt: settings.system_prompt, test_message: testMessage })
            setTestResult(JSON.stringify(res.data, null, 2))
          } catch (err: any) {
            setTestResult('Erro: ' + (err.response?.data?.message || err.message))
          }
        }} className="mt-2 px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Testar</button>
        {testResult && <pre className="mt-3 p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-40">{testResult}</pre>}
      </div>
    </div>
  )
}
