import type { ConversationData } from '../../hooks/useChat'

interface ConversationListProps {
  conversations: ConversationData[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: () => void
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: ConversationListProps) {
  return (
    <div className="h-full flex flex-col">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nova Conversa</span>
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhuma conversa ainda
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeId === conv.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <p className="font-medium truncate">
                  {conv.title || 'Sem título'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(conv.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                  {conv.messages_count && (
                    <span className="text-xs text-gray-400">
                      {conv.messages_count} msg
                    </span>
                  )}
                  {conv.is_closed && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                      Encerrada
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
