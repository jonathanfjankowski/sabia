import { useEffect, useRef, useState } from 'react'
import { Bot, Save, Play, Loader2, Sparkles, KeyRound, Sliders } from 'lucide-react'
import { api } from '@/lib/api'
import type { AiSettings } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { toast } from '@/stores/toast'

export function AISettings() {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testStream, setTestStream] = useState('')
  const [testing, setTesting] = useState(false)
  const [testingEmbed, setTestingEmbed] = useState(false)
  const [embedTestResult, setEmbedTestResult] = useState<
    { ok: boolean; dimensions: number; latency_ms: number } | null
  >(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    api.get<AiSettings>('/admin/settings/ai').then(setSettings).finally(() => setLoading(false))
  }, [])

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
     </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings/ai', settings)
      toast.success('Configurações de IA salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Testa o sidecar de embeddings (ou o endpoint configurado).
  const testEmbed = async () => {
    setTestingEmbed(true)
    setEmbedTestResult(null)
    try {
      const res = await api.post<{ ok: boolean; dimensions: number; latency_ms: number }>(
        '/admin/settings/ai/test-embed',
        {},
      )
      setEmbedTestResult(res)
    } catch {
      setEmbedTestResult({ ok: false, dimensions: 0, latency_ms: 0 })
    } finally {
      setTestingEmbed(false)
    }
  }

  const handleTestPrompt = async () => {
    if (!testMessage.trim()) {
      toast.warning('Digite uma mensagem de teste')
      return
    }
    setTesting(true)
    setTestStream('')
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      const res = await api.raw('/admin/settings/ai/test-prompt', {
        method: 'POST',
        body: JSON.stringify({ system_prompt: settings.system_prompt, test_message: testMessage }),
        signal: abortRef.current.signal,
      })
      if (!res.body) throw new Error('Sem stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload)
            if (typeof parsed.text === 'string') {
              acc += parsed.text
              setTestStream(acc)
            }
          } catch {
            /* ignore */
          }
        }
      }
      toast.success('Teste concluído')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro no teste')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações de IA"
        description="Endpoint OpenAI-compatível, API key e modelo"
        icon={<Bot className="h-5 w-5" />}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            Salvar
         </Button>
        }
      />

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection">Conexão</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="rag">RAG & Confiança</TabsTrigger>
       </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ai-endpoint">Endpoint</Label>
                <Input
                  id="ai-endpoint"
                  value={settings.endpoint}
                  onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-[11px] text-muted-foreground">
                  Base URL de qualquer API compatível com OpenAI (OpenAI, Groq, Together, Ollama,
                  llama.cpp, vLLM…).
               </p>
             </div>
              <div className="space-y-2">
                <Label htmlFor="ai-model">Modelo</Label>
                <Input
                  id="ai-model"
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  placeholder="gpt-4o"
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="ai-key" className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  API Key
               </Label>
                <Input
                  id="ai-key"
                  type="password"
                  value={settings.api_key}
                  onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                  placeholder="••••••••••••••••"
                />
                <p className="text-[11px] text-muted-foreground">
                  Criptografada em repouso (AES-256).
               </p>
             </div>
           </div>
         </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Parâmetros de geração</h3>
           </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ai-temp">Temperatura: {settings.temperature.toFixed(2)}</Label>
                <input
                  id="ai-temp"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) =>
                    setSettings({ ...settings, temperature: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tokens">Máx. tokens</Label>
                <Input
                  id="ai-tokens"
                  type="number"
                  value={settings.max_tokens}
                  onChange={(e) =>
                    setSettings({ ...settings, max_tokens: Number(e.target.value) })
                  }
                />
             </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={settings.language}
                  onValueChange={(v: AiSettings['language']) =>
                    setSettings({ ...settings, language: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                 </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (BR</SelectItem>
                    <SelectItem value="en-US">Inglês (US</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
         </Card>
       </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card className="space-y-3 p-5">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">System Prompt</Label>
              <Textarea
                id="ai-prompt"
                rows={10}
                value={settings.system_prompt}
                onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                O input do usuário nunca é concatenado ao system prompt. Contexto RAG é isolado
                entre delimitadores.
             </p>
           </div>
         </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Testar prompt ao vivo</h3>
           </div>
            <div className="space-y-2">
              <Label htmlFor="test-msg">Mensagem de teste</Label>
              <div className="flex gap-2">
                <Input
                  id="test-msg"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Ex.: Como emitir uma NF?"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleTestPrompt()
                    }
                  }}
                />
                <Button onClick={handleTestPrompt} disabled={testing}>
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Testar
               </Button>
             </div>
           </div>
            {(testStream || testing) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                {testStream ? (
                  <MarkdownRenderer content={testStream} />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce-dot" />
                 </div>
                )}
             </div>
            )}
         </Card>
       </TabsContent>

        <TabsContent value="rag" className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Provedor de embeddings</h3>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  settings.embedding_sidecar_connected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={settings.embedding_sidecar_connected ? 'Sidecar conectado' : 'Sidecar indisponível'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embed-provider">Provedor</Label>
              <select
                id="embed-provider"
                value={settings.embedding_provider ?? 'sidecar'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    embedding_provider: e.target.value as AiSettings['embedding_provider'],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="sidecar">Sidecar BAAI/bge-m3 (local)</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom (endpoint próprio)</option>
              </select>
              {settings.embedding_provider === 'sidecar' && (
                <p className="text-[11px] text-muted-foreground">
                  URL via env <code>EMBEDDING_URL</code>:{' '}
                  <code>{settings.embedding_sidecar_url ?? 'http://embedding-sidecar:8000'}</code>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testEmbed}
                disabled={testingEmbed}
              >
                {testingEmbed ? 'Testando…' : 'Testar embedding'}
              </Button>
              {embedTestResult && (
                <span className="text-xs text-muted-foreground">
                  {embedTestResult.ok
                    ? `OK · ${embedTestResult.dimensions} dims · ${embedTestResult.latency_ms}ms`
                    : 'falhou — verifique se o sidecar está no ar'}
                </span>
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Parâmetros RAG</h3>
           </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rag-topn">Top N (chunks retornados</Label>
                <Input
                  id="rag-topn"
                  type="number"
                  value={settings.rag_top_n}
                  onChange={(e) => setSettings({ ...settings, rag_top_n: Number(e.target.value) })}
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="rag-chunk">Tamanho do chunk</Label>
                <Input
                  id="rag-chunk"
                  type="number"
                  value={settings.chunk_size}
                  onChange={(e) => setSettings({ ...settings, chunk_size: Number(e.target.value) })}
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="rag-overlap">Overlap do chunk</Label>
                <Input
                  id="rag-overlap"
                  type="number"
                  value={settings.chunk_overlap}
                  onChange={(e) =>
                    setSettings({ ...settings, chunk_overlap: Number(e.target.value) })
                  }
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="rag-embed">Embedding model (opcional</Label>
                <Input
                  id="rag-embed"
                  value={settings.embedding_model ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, embedding_model: e.target.value })
                  }
                  placeholder="(usa o mesmo modelo de chat se vazio)"
                />
             </div>
           </div>
         </Card>

          {(settings.embedding_provider ?? 'sidecar') !== 'sidecar' && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Endpoint de embeddings</h3>
             </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Se vazio, o Sabia usa o mesmo endpoint e API key do chat. Preencha quando o
                provedor de chat não suporta embeddings (ex.: proxy LiteLLM sem rota de embed).
             </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="embed-endpoint">Endpoint de embeddings</Label>
                  <Input
                    id="embed-endpoint"
                    value={settings.embedding_endpoint ?? ''}
                    onChange={(e) =>
                      setSettings({ ...settings, embedding_endpoint: e.target.value })
                    }
                    placeholder="https://api.openai.com/v1"
                  />
               </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="embed-key" className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5" />
                    API Key de embeddings
                 </Label>
                  <Input
                    id="embed-key"
                    type="password"
                    value={settings.embedding_api_key ?? ''}
                    onChange={(e) =>
                      setSettings({ ...settings, embedding_api_key: e.target.value })
                    }
                    placeholder="••••••••••••••••"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Criptografada em repouso (AES-256). Deixada em branco para manter a chave atual.
                 </p>
               </div>
             </div>
            </Card>
          )}

          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="rag-threshold">
                Threshold de confiança: {settings.confidence_threshold.toFixed(3)}
             </Label>
              <input
                id="rag-threshold"
                type="range"
                min="0"
                max="1"
                step="0.025"
                value={settings.confidence_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, confidence_threshold: Number(e.target.value) })
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  Abaixo de {(settings.confidence_threshold * 0.6).toFixed(3)}: redireciona para
                  humano
               </span>
                <span>Acima de {settings.confidence_threshold.toFixed(3)}: alta confiança</span>
             </div>
           </div>
         </Card>
       </TabsContent>
     </Tabs>
   </div>
  )
}
