import { LucideIcon } from 'lucide-react'
import {
  Receipt,
  Truck,
  Users,
  Plug,
  Folder,
  FileText,
  Settings,
  BookOpen,
  CircleHelp,
  type LucideProps,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  receipt: Receipt,
  truck: Truck,
  users: Users,
  plug: Plug,
  folder: Folder,
  file: FileText,
  settings: Settings,
  book: BookOpen,
  help: CircleHelp,
}

export function CategoryIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = iconMap[name] ?? Folder
  return <Icon {...props} />
}
