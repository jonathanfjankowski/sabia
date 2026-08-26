import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BrandSettings } from '@/types'
import { hexToHsl } from '@/lib/utils'

const DEFAULT_BRAND: BrandSettings = {
  app_name: 'Sabiá',
  logo_url: '',
  favicon_url: '',
  primary_color: '#FF6B35',
  secondary_color: '#EA580C',
  font: 'Inter',
}

interface BrandStore {
  brand: BrandSettings
  setBrand: (b: Partial<BrandSettings>) => void
  reset: () => void
}

export const useBrandStore = create<BrandStore>()(
  persist(
    (set) => ({
      brand: DEFAULT_BRAND,
      setBrand: (b) =>
        set((s) => ({ brand: { ...s.brand, ...b } })),
      reset: () => set({ brand: DEFAULT_BRAND }),
    }),
    { name: 'sabia-brand' }
  )
)

/** Apply brand colors to CSS variables on :root */
export function applyBrand(brand: BrandSettings | null | undefined) {
  const root = document.documentElement
  if (!brand) return
  const primaryHsl = hexToHsl(brand.primary_color)
  const secondaryHsl = hexToHsl(brand.secondary_color)
  if (primaryHsl) {
    root.style.setProperty('--primary', primaryHsl)
    root.style.setProperty('--ring', primaryHsl)
  }
  if (secondaryHsl) {
    root.style.setProperty('--secondary', secondaryHsl)
  }

  if (brand.favicon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = brand.favicon_url
  }

  if (brand.font && ['Inter', 'Roboto', 'Open Sans'].includes(brand.font)) {
    const id = 'brand-font-link'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.font)}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
      root.style.setProperty('--font-sans', brand.font)
    }
  }
}
