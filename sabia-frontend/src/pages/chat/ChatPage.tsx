import { useState, useEffect, useRef } from 'react'
import { useChat } from '../../hooks/useChat'
import { MessageBubble } from '../../components/chat/MessageBubble'
import { ConversationList } from './ConversationList'

export function ChatPage() {
  const {
    messages,
    conversation,
    conversations,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    loadConversation,
    loadHistory,
    newConversation,
    closeConversation,
    cancelStream,
  } = useChat()

  const [input, setInput] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    await sendMessage(input.trim())
    setInput('')
  }

  function handleSelectConversation(id: number) {
    loadConversation(id)
    setSidebarOpen(false)
  }

  function handleNew() {
    newConversation()
    setShowRating(false)
    setRating(0)
    setFeedback('')
    inputRef.current?.focus()
  }

  async function handleCloseWithRating() {
    if (rating === 0) return
    try {
      await closeConversation(rating, feedback)
      setShowRating(false)
      newConversation()
    } catch {
      // Error already handled in hook
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'block' : 'hidden lg:block'
      } w-72 lg:w-80 bg-white border-r border-gray-200 flex-shrink-0`}>
        <ConversationList
          conversations={conversations}
          activeId={conversation?.id ?? null}
          onSelect={handleSelectConversation}
          onNew={handleNew}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {conversation?.title || 'Nova Conversa'}
            </h2>
            {conversation?.is_closed && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">Encerrada</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {conversation && !conversation.is_closed && (
              <button
                onClick={() => setShowRating(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Encerrar conversa"
              >
                Encerrar
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">🦜</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Olá! Como posso ajudar?
                </h3>
                <p className="text-gray-500">
                  Sou o Sabiá, assistente virtual da Bsoft TMS. 
                  Pergunte sobre notas fiscais, emissão, cadastros, relatórios e muito mais.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={isStreaming || conversation?.is_closed}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={cancelStream}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Parar
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Avalie seu atendimento
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Como você avalia a conversa com o Sabiá?
            </p>

            {/* Stars */}
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-all hover:scale-110 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Feedback */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Deixe seu feedback (opcional)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            />

            <div className="flex space-x-3">
              <button
                onClick={() => setShowRating(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseWithRating}
                disabled={rating === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {rating > 0 ? `Encerrar (${rating}/5)` : 'Selecione uma nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle sidebar for mobile */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed bottom-20 left-4 z-10 p-3 bg-white border border-gray-300 rounded-full shadow-lg text-gray-600 hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </div>
  )
}
