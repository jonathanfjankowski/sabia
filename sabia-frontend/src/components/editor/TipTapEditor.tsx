import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Placeholder from '@tiptap/extension-placeholder'
import TurndownService from 'turndown'
import gfm from 'turndown-plugin-gfm'
import { createLowlight, common } from 'lowlight'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Heading1,
  Heading2,
  Heading3,
  Text as TextIcon,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Quote,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Link2,
  BookMarked,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast'

const lowlight = createLowlight(common)
const turndown = new (TurndownService as any)({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  hr: '---',
})
turndown.use(gfm)

// Manter sincronizado com MarkdownRenderer.tsx para que o editor e a
// visualização pública/interna do artigo analisem markdown identicamente (tabelas, listas de tarefas, quebras).
marked.setOptions({
  breaks: true,
  gfm: true,
})

function markdownToHtml(md: string): string {
  const raw = marked.parse(md ?? '', { async: false }) as string
  return DOMPurify.sanitize(raw)
}

const slashCommands: {
  title: string
  icon: LucideIcon
  description: string
  action: (editor: Editor) => void
  aliases?: string[]
}[] = [
  {
    title: 'Título 1',
    icon: Heading1,
    description: 'Título principal grande',
    aliases: ['h1', 'titulo', 'heading'],
    action: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: 'Título 2',
    icon: Heading2,
    description: 'Subtítulo de seção',
    aliases: ['h2', 'subtitulo'],
    action: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: 'Título 3',
    icon: Heading3,
    description: 'Seção terciária',
    aliases: ['h3'],
    action: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: 'Parágrafo',
    icon: TextIcon,
    description: 'Texto comum',
    aliases: ['p', 'texto', 'paragraph'],
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    title: 'Lista com marcadores',
    icon: List,
    description: 'Lista não ordenada',
    aliases: ['ul', 'lista', 'bullet'],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Lista numerada',
    icon: ListOrdered,
    description: 'Lista ordenada',
    aliases: ['ol', 'numerada'],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Checklist',
    icon: ListChecks,
    description: 'Lista com checkboxes',
    aliases: ['check', 'task', 'todo'],
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Bloco de código',
    icon: Code2,
    description: 'Código com syntax highlight',
    aliases: ['code', 'codigo', 'pre'],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Citação',
    icon: Quote,
    description: 'Bloco de citação',
    aliases: ['quote', 'citacao', 'blockquote'],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Tabela',
    icon: TableIcon,
    description: 'Tabela editável 2x2',
    aliases: ['table', 'tabela'],
    action: (e) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Imagem',
    icon: ImageIcon,
    description: 'Upload, URL ou colar (Ctrl+V)',
    aliases: ['image', 'img', 'foto'],
    action: () => pickImageFile(),
  },
  {
    title: 'Artigo',
    icon: BookMarked,
    description: 'Citar outro artigo da base',
    aliases: ['article', 'link-artigo', 'xref'],
    action: () => pickArticle(),
  },
  {
    title: 'Link',
    icon: Link2,
    description: 'Link no texto selecionado',
    aliases: ['link', 'href'],
    action: (e) => {
      const url = window.prompt('URL do link:')
      if (url) e.chain().focus().setLink({ href: url }).run()
    },
  },
  {
    title: 'Divisor',
    icon: Minus,
    description: 'Linha horizontal',
    aliases: ['hr', 'divider', 'divisor'],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

let activeEditor: Editor | null = null
let openArticlePicker: (() => void) | null = null

async function uploadImageFile(file: File): Promise<string | null> {
  if (!activeEditor) return null
  const form = new FormData()
  form.append('image', file)
  try {
    const res = await api.raw('/admin/articles/upload-image', { method: 'POST', body: form })
    if (!res.ok) {
      toast.error('Falha no upload da imagem')
      return null
    }
    const { url } = (await res.json()) as { url: string }
    return url
  } catch {
    toast.error('Erro de rede no upload')
    return null
  }
}

function pickImageFile() {
  if (!activeEditor) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/gif,image/webp'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !activeEditor) return
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await api.raw('/admin/articles/upload-image', { method: 'POST', body: form })
      if (!res.ok) {
        toast.error('Falha no upload da imagem')
        return
      }
      const { url } = (await res.json()) as { url: string }
      activeEditor.chain().focus().setImage({ src: url }).run()
    } catch {
      toast.error('Erro de rede no upload')
    }
  }
  input.click()
}

function pickArticle() {
  openArticlePicker?.()
}

interface TipTapEditorProps {
  value?: string
  onChange?: (markdown: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  minHeight?: number
}

export function TipTapEditor({
  value = '',
  onChange,
  placeholder = 'Escreva o conteúdo aqui... use "/" para comandos',
  editable = true,
  className,
  minHeight = 280,
}: TipTapEditorProps) {
  const lastEmitted = useRef<string>(value)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Blockquote,
      HorizontalRule,
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(value),
    editable,
    onUpdate: ({ editor }) => {
      const md = turndown.turndown(editor.getHTML())
      lastEmitted.current = md
      onChange?.(md)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}px`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) continue
            uploadImageFile(file).then((url) => {
              if (url) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                )
              }
            })
            return true
          }
        }
        return false
      },
      handleDrop: (view, event) => {
        const files = (event as DragEvent).dataTransfer?.files
        if (!files || files.length === 0) return false
        const file = files[0]
        if (!file.type.startsWith('image/')) return false
        event.preventDefault()
        uploadImageFile(file).then((url) => {
          if (url) {
            const coords = view.posAtCoords({
              left: (event as DragEvent).clientX,
              top: (event as DragEvent).clientY,
            })
            const insertPos = coords?.pos ?? view.state.selection.from
            view.dispatch(
              view.state.tr.insert(
                insertPos,
                view.state.schema.nodes.image.create({ src: url })
              )
            )
          }
        })
        return true
      },
    },
  })

  useEffect(() => {
    activeEditor = editor
    return () => {
      if (activeEditor === editor) activeEditor = null
    }
  }, [editor])

  // Sincroniza alterações de valor externo
  useEffect(() => {
    if (!editor || editor.isDestroyed || value === undefined) return
    const current = turndown.turndown(editor.getHTML())
    if (current !== value) {
      editor.commands.setContent(markdownToHtml(value || ''), { emitUpdate: false } as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Estado do menu slash
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPos, setSlashPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Estado do seletor de artigos
  const [articlePickerOpen, setArticlePickerOpen] = useState(false)
  const [articleQuery, setArticleQuery] = useState('')
  const [articles, setArticles] = useState<{ id: number; title: string; slug: string }[]>([])
  const [articleIdx, setArticleIdx] = useState(0)

  useEffect(() => {
    openArticlePicker = () => {
      setArticleQuery('')
      setArticleIdx(0)
      setArticlePickerOpen(true)
      api
        .get<{ id: number; title: string; slug: string }[]>('/articles')
        .then(setArticles)
        .catch(() => setArticles([]))
    }
    return () => {
      openArticlePicker = null
    }
  }, [])

  const insertArticleRef = useCallback((a: { title: string; slug: string }) => {
    activeEditor
      ?.chain()
      .focus()
      .insertContent(`[${a.title}](/kb/articles/${a.slug}) `)
      .run()
    setArticlePickerOpen(false)
  }, [])

  const hideSlashMenu = useCallback(() => {
    setSlashOpen(false)
    setSlashQuery('')
    setSelectedIndex(0)
  }, [])

  // Detecta digitação de "/"
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const { selection } = editor.state
      const $from = selection.$from
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
      const slashMatch = textBefore.match(/\/([a-zA-Z0-9]*)$/)
      if (slashMatch) {
        const coords = (editor.view as any).coordsAtPos?.(editor.state.selection.from) as DOMRect
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (coords && containerRect) {
          setSlashPos({
            top: coords.bottom - containerRect.top + 4,
            left: coords.left - containerRect.left,
          })
        }
        setSlashQuery(slashMatch[1])
        setSlashOpen(true)
        setSelectedIndex(0)
      } else if (slashOpen) {
        hideSlashMenu()
      }
    }
    editor.on('update', handler)
    editor.on('selectionUpdate', handler)
    return () => {
      editor.off('update', handler)
      editor.off('selectionUpdate', handler)
    }
  }, [editor, slashOpen, hideSlashMenu])

  const filteredCommands = slashCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(slashQuery.toLowerCase()) ||
      c.aliases?.some((a) => a.toLowerCase().includes(slashQuery.toLowerCase()))
  )

  const executeCommand = useCallback(
    (cmd: (typeof slashCommands)[number]) => {
      if (!editor) return
      const { selection } = editor.state
      const $from = selection.$from
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
      const slashIndex = textBefore.lastIndexOf('/')
      if (slashIndex >= 0) {
        const from = selection.from - (textBefore.length - slashIndex)
        editor.chain().focus().deleteRange({ from, to: selection.from }).run()
      }
      cmd.action(editor)
      hideSlashMenu()
      setTimeout(() => editor?.commands.focus(), 0)
    },
    [editor, hideSlashMenu]
  )

  const handleSlashKey = useCallback(
    (e: KeyboardEvent) => {
      if (!slashOpen || filteredCommands.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        executeCommand(filteredCommands[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        hideSlashMenu()
      }
    },
    [slashOpen, filteredCommands, selectedIndex, executeCommand, hideSlashMenu]
  )

  useEffect(() => {
    if (slashOpen) {
      window.addEventListener('keydown', handleSlashKey, true)
      return () => window.removeEventListener('keydown', handleSlashKey, true)
    }
  }, [slashOpen, handleSlashKey])

  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(articleQuery.toLowerCase())
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Toolbar editor={editor} />
      <div className="rounded-b-lg border border-t-0 border-input bg-background px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {slashOpen && filteredCommands.length > 0 && (
        <div
          className="absolute z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-elevated data-[state=open]:animate-scale-in"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            Blocos
          </div>
          <div className="p-1">
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.title}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => executeCommand(cmd)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
                  idx === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/60'
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background">
                  <cmd.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{cmd.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {articlePickerOpen && (
        <ArticlePicker
          query={articleQuery}
          setQuery={setArticleQuery}
          articles={filteredArticles}
          selectedIndex={articleIdx}
          setSelectedIndex={setArticleIdx}
          onPick={insertArticleRef}
          onClose={() => setArticlePickerOpen(false)}
        />
      )}
    </div>
  )
}

function ArticlePicker({
  query,
  setQuery,
  articles,
  selectedIndex,
  setSelectedIndex,
  onPick,
  onClose,
}: {
  query: string
  setQuery: (q: string) => void
  articles: { id: number; title: string; slug: string }[]
  selectedIndex: number
  setSelectedIndex: (i: number) => void
  onPick: (a: { title: string; slug: string }) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex + 1, articles.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const a = articles[selectedIndex]
        if (a) onPick(a)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [articles, selectedIndex, onPick, onClose, setSelectedIndex])

  return (
    <div className="absolute inset-x-0 top-12 z-50 mx-auto w-96 rounded-lg border border-border bg-popover shadow-elevated">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelectedIndex(0)
        }}
        placeholder="Buscar artigo…"
        className="w-full rounded-t-lg border-b border-border bg-transparent px-3 py-2 text-sm focus:outline-none"
      />
      <div className="max-h-72 overflow-y-auto p-1">
        {articles.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhum artigo encontrado
          </div>
        ) : (
          articles.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => onPick(a)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                i === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/60'
              )}
            >
              <BookMarked className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.title}</div>
                <div className="truncate text-xs text-muted-foreground">/{a.slug}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  const tools: {
    icon: LucideIcon
    label: string
    isActive?: boolean
    onClick: () => void
  }[] = [
    {
      icon: Heading1,
      label: 'Título 1',
      isActive: editor.isActive('heading', { level: 1 }),
      onClick: () => {
        console.log('doc antes:', JSON.stringify(editor.getJSON()))
        const ok = editor.chain().focus().toggleHeading({ level: 1 }).run()
        console.log('comando retornou:', ok)
        console.log('doc depois:', JSON.stringify(editor.getJSON()))
      },
    },
    {
      icon: Heading2,
      label: 'Título 2',
      isActive: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: 'Título 3',
      isActive: editor.isActive('heading', { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: List,
      label: 'Lista',
      isActive: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: 'Lista numerada',
      isActive: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: ListChecks,
      label: 'Checklist',
      isActive: editor.isActive('taskList'),
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      icon: Code2,
      label: 'Código',
      isActive: editor.isActive('codeBlock'),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      icon: Quote,
      label: 'Citação',
      isActive: editor.isActive('blockquote'),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ]
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-input bg-muted/40 px-2 py-1.5">
      {tools.map((t, i) => (
        <Button
          key={i}
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={t.onClick}
          title={t.label}
          className={t.isActive ? 'bg-accent text-accent-foreground' : ''}
        >
          <t.icon className="h-4 w-4" />
        </Button>
      ))}
      <div className="mx-1 h-5 w-px bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => pickImageFile()}
        title="Inserir imagem"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          const url = window.prompt('URL do link:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        title="Inserir link"
      >
        <Link2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divisor"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  )
}