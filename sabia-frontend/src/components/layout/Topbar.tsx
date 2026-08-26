import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { initials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, clear } = useAuthStore()
  const { mode, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clear()
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
        aria-label="Menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
          <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Search */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar na base de conhecimento..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value
              if (value.trim()) navigate(`/kb?q=${encodeURIComponent(value)}`)
            }
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user ? initials(user.full_name) : '?'}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold leading-tight">{user?.full_name}</div>
                <div className="text-[10px] text-muted-foreground">{user?.email}</div>
              </div>
              <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <Badge
                  variant={user?.role === 'gestor' ? 'default' : 'secondary'}
                  className="mt-1.5 w-fit"
                >
                  {user?.role === 'gestor' ? 'Gestor' : 'Operador'}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
