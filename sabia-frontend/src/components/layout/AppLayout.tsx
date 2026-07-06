import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface SidebarItem {
  label: string
  path: string
  icon: string
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Base de Conhecimento', path: '/kb', icon: '📚' },
  { label: 'Conversas', path: '/conversations', icon: '💬' },
  { label: 'Documentos', path: '/documents', icon: '📝' },
]

const adminItems: SidebarItem[] = [
  { label: 'Artigos', path: '/admin/articles', icon: '📄' },
  { label: 'Categorias', path: '/admin/categories', icon: '🏷️' },
  { label: 'Usuários', path: '/admin/users', icon: '👥' },
  { label: 'Config. IA', path: '/admin/settings/ai', icon: '🤖' },
  { label: 'Config. Empresa', path: '/admin/settings/company', icon: '⚙️' },
  { label: 'Widget', path: '/admin/settings/widget', icon: '💬' },
  { label: 'Lacunas', path: '/admin/knowledge-gaps', icon: '🔍' },
  { label: 'Logs Sistema', path: '/admin/system-logs', icon: '📋' },
  { label: 'Avaliações', path: '/admin/ratings', icon: '⭐' },
  { label: 'Chats Widget', path: '/admin/widget-conversations', icon: '💬' },
  { label: 'Saúde', path: '/admin/health', icon: '❤️' },
  { label: 'Auditoria', path: '/admin/audit-logs', icon: '📋' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isGestor = user && 'profile' in user && (user as any).profile?.role === 'gestor'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link to="/dashboard" className="flex items-center space-x-2">
                <span className="text-2xl">🦜</span>
                <span className="text-xl font-bold text-gray-900">Sabiá</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name}
                {isGestor && <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Gestor</span>}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-20 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 overflow-y-auto`}>
        <div className="p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navegação</h2>
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {isGestor && (
            <>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">Administração</h2>
              <nav className="space-y-1">
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
