import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BrandSettings } from '@/types'
import { hexToHsl } from '@/lib/utils'

const DEFAULT_BRAND: BrandSettings = {
  app_name: 'Sabiá',
  logo_url: '/sabialogo.png',
  favicon_url: '/sabialogo.png',
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

/** Converte HSL "h s% l%" para objeto {h, s, l} */
function parseHsl(hsl: string): { h: number; s: number; l: number } | null {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/)
  if (!m) return null
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) }
}

/** Gera escala Tailwind (50-900) a partir de HSL base */
function generatePrimaryScale(hsl: string): Record<string, string> {
  const base = parseHsl(hsl)
  if (!base) return {}

  // Luminosidade alvo para cada step (aproxima Tailwind laranja)
  const lightness = {
    50: 96, 100: 91, 200: 84, 300: 73, 400: 64,
    500: base.l, 600: Math.max(46, base.l - 7), 700: Math.max(39, base.l - 14),
    800: Math.max(32, base.l - 21), 900: Math.max(25, base.l - 28),
  } as const

  const scale: Record<string, string> = {}
  for (const [step, l] of Object.entries(lightness)) {
    scale[`--primary-${step}`] = `${base.h} ${base.s}% ${l}%`
  }
  return scale
}

/** Apply brand colors to CSS variables on :root */
export function applyBrand(brand: BrandSettings | null | undefined) {
  const root = document.documentElement
  if (!brand) return
  const primaryHsl = hexToHsl(brand.primary_color)
  const secondaryHsl = hexToHsl(brand.secondary_color)

  if (primaryHsl) {
    root.style.setProperty('--primary', primaryHsl)
    root.style.setProperty('--ring', primaryHsl)

    // Gera escala completa 50-900 para Tailwind (bg-primary, hover:bg-primary/90, etc)
    const scale = generatePrimaryScale(primaryHsl)
    for (const [key, value] of Object.entries(scale)) {
      root.style.setProperty(key, value)
    }
    // primary-foreground calculado automaticamente pelo Tailwind baseado no contraste
    // Mas podemos forçar branco para cores escuras
    const base = parseHsl(primaryHsl)
    if (base && base.l < 50) {
      root.style.setProperty('--primary-foreground', '0 0% 100%')
    }
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
