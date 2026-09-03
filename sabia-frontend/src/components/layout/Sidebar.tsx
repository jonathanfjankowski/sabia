import { NavLink, useLocation } from 'react-router-dom'
import {
  BookOpen,
  MessageSquare,
  Users,
  FileText,
  Folder,
  Star,
  MessagesSquare,
  CircleHelp,
  Shield,
  Activity,
  Settings,
  Bot,
  Type,
} from 'lucide-react'
// `MessageSquare` is still used by the main chat nav item.
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useBrandStore } from '@/stores/brand'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
  to: string
  label: string
  icon: typeof BookOpen
  roles?: ('gestor' | 'operador')[]
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/kb', label: 'Base de Conhecimento', icon: BookOpen, end: false },
  { to: '/chat', label: 'Chat com IA', icon: MessageSquare, end: false },
]

const adminNav: NavItem[] = [
  { to: '/admin/articles', label: 'Artigos', icon: FileText, roles: ['gestor'] },
  { to: '/admin/categories', label: 'Categorias', icon: Folder, roles: ['gestor'] },
  { to: '/admin/users', label: 'Usuários', icon: Users, roles: ['gestor'] },
]

const insightsNav: NavItem[] = [
  { to: '/admin/ratings', label: 'Avaliações', icon: Star, roles: ['gestor'] },
  { to: '/admin/widget-conversations', label: 'Chats do Widget', icon: MessagesSquare, roles: ['gestor'] },
  { to: '/admin/knowledge-gaps', label: 'Lacunas de Conhecimento', icon: CircleHelp, roles: ['gestor'] },
  { to: '/admin/audit-logs', label: 'Auditoria', icon: Shield, roles: ['gestor'] },
  { to: '/admin/system-logs', label: 'Logs do Sistema', icon: Activity, roles: ['gestor'] },
  { to: '/admin/health', label: 'Saúde do Sistema', icon: Activity, roles: ['gestor'] },
]

const settingsNav: NavItem[] = [
  { to: '/admin/settings/ai', label: 'IA', icon: Bot, roles: ['gestor'] },
  { to: '/admin/settings/widget', label: 'Widget', icon: Type, roles: ['gestor'] },
  { to: '/admin/settings/brand', label: 'White Label', icon: Settings, roles: ['gestor'] },
]

export function Sidebar({ collapsed }: { collapsed?: boolean }) {
  const user = useAuthStore((s) => s.user)
  const brand = useBrandStore((s) => s.brand)
  const location = useLocation()

  const isGestor = user?.role === 'gestor'

  const renderItem = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user?.role ?? 'operador')) return null
    const Icon = item.icon
    const isActive =
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
            : 'text-sidebar-foreground/70 hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))]'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-[hsl(var(--primary))]')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img src="/sabialogo.png" alt="Sabiá" className="h-9 w-auto object-contain" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{brand.app_name}</div>
            <div className="truncate text-[11px] text-muted-foreground">Suporte Inteligente</div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          <SectionLabel collapsed={collapsed}>Principal</SectionLabel>
          {mainNav.map(renderItem)}

          {isGestor && (
            <>
              <SectionLabel collapsed={collapsed}>Administração</SectionLabel>
              {adminNav.map(renderItem)}

              <SectionLabel collapsed={collapsed}>Insights</SectionLabel>
              {insightsNav.map(renderItem)}

              <SectionLabel collapsed={collapsed}>Configurações</SectionLabel>
              {settingsNav.map(renderItem)}
            </>
          )}
        </nav>
      </ScrollArea>

      </aside>
  )
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return <div className="my-2 h-px bg-sidebar-border" />
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  )
}
