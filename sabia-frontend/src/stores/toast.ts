import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({ toasts: [...s.toasts, { id, duration: 5000, variant: 'default', ...t }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = Object.assign(
  (t: Omit<ToastItem, 'id'>) => useToastStore.getState().push(t),
  {
    success: (title: string, description?: string) =>
      useToastStore.getState().push({ title, description, variant: 'success' }),
    warning: (title: string, description?: string) =>
      useToastStore.getState().push({ title, description, variant: 'warning' }),
    error: (title: string, description?: string) =>
      useToastStore.getState().push({ title, description, variant: 'destructive' }),
    info: (title: string, description?: string) =>
      useToastStore.getState().push({ title, description, variant: 'default' }),
  }
)
