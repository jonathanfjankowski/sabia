import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import { cn } from '@/lib/utils'

marked.setOptions({
  breaks: true,
  gfm: true,
})

// Configura highlight no renderer do marked
const renderer = new marked.Renderer()
renderer.code = (params: { text: string; lang?: string; escaped?: boolean }) => {
  const { text: code, lang } = params
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  try {
    const highlighted = hljs.highlight(code, { language }).value
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
  } catch {
    return `<pre><code class="hljs">${code}</code></pre>`
  }
}
marked.use({ renderer })

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const raw = marked.parse(content ?? '', { async: false }) as string
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['target', 'rel'],
    })
  }, [content])

  return (
    <div
      className={cn('md-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
