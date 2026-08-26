import { useState } from 'react'
import { FileText, Send, Eye, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/stores/toast'

export function ArticleImport() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [accessLevel, setAccessLevel] = useState('internal')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [chunks, setChunks] = useState<{ content: string; estimated_tokens: number }[]>([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [showChunks, setShowChunks] = useState(false)

  useState(() => {
    api.get<{ id: number; name: string }[]>('/categories').then(setCategories).catch(() => {})
  })

  const handlePreview = async () => {
    if (!content.trim()) {
      toast.warning('Cole o conteúdo antes de preview')
      return
    }
    setPreviewing(true)
    try {
      const res = await api.post<{ total_chunks: number; chunks: { content: string; estimated_tokens: number }[] }>(
        '/admin/articles/preview-import',
        { content, chunk_size: 500, chunk_overlap: 100 }
      )
      setChunks(res.chunks)
      setTotalChunks(res.total_chunks)
      setShowChunks(true)
    } catch {
      toast.error('Erro ao gerar preview')
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!title.trim() || !content.trim()) {
      toast.warning('Título e conteúdo são obrigatórios')
      return
    }
    setImporting(true)
    try {
      await api.post('/admin/articles/import', {
        title,
        content,
        summary: content.slice(0, 120),
        category_id: categoryId ? Number(categoryId) : null,
        access_level: accessLevel,
      })
      toast.success('Artigo importado com sucesso')
      setTitle('')
      setContent('')
      setCategoryId('')
      setChunks([])
      setShowChunks(false)
    } catch {
      toast.error('Erro ao importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar artigo"
        description="Cole o conteúdo em markdown para criar um novo artigo na base de conhecimento"
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Como emitir nota fiscal"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label>Conteúdo (Markdown)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Título do artigo&#10;&#10;Cole aqui o conteúdo em markdown..."
              rows={16}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={previewing || !content.trim()}>
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview chunks
            </Button>
            <Button onClick={handleImport} disabled={importing || !title.trim() || !content.trim()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Importar
            </Button>
          </div>
        </div>

        {showChunks && (
          <Card className="p-4">
            <button
              onClick={() => setShowChunks((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span>
                Preview: {totalChunks} chunks gerados (~
                {chunks.reduce((sum, c) => sum + c.estimated_tokens, 0)} tokens)
              </span>
              {showChunks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="mt-3 max-h-[500px] space-y-2 overflow-y-auto">
              {chunks.map((c, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Chunk {i + 1}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">~{c.estimated_tokens} tokens</span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{c.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
