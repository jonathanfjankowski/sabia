import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { MessageData } from '../../hooks/useChat'

interface MessageBubbleProps {
  message: MessageData
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  function renderMarkdown(content: string): string {
    if (!content) return ''
    const raw = marked.parse(content)
    if (raw instanceof Promise) return content
    return DOMPurify.sanitize(raw)
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isUser
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {isUser ? 'U' : 'S'}
        </div>

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm border border-gray-200'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              {message.content ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
              ) : isStreaming ? (
                <div className="flex items-center space-x-1.5 py-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : null}
            </div>
          )}

          {/* Citations */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Fontes:</p>
              <div className="flex flex-wrap gap-1">
                {message.citations.map((cite: any, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {cite.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {message.created_at && (
            <p className={`text-xs mt-1 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
              {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
