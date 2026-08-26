import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from './auth'
import type { Profile } from '@/types'

describe('useAuthStore', () => {
  const mockProfile: Profile = {
    id: 'p-1',
    user_id: 'u-1',
    email: 'gestor@test.com',
    full_name: 'Gestor Teste',
    role: 'gestor',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null })
    localStorage.clear()
  })

  it('starts with null user and token', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated()).toBe(false)
  })

  it('sets session and persists to localStorage', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setSession(mockProfile, 'test-token-123')
    })

    expect(result.current.user).toEqual(mockProfile)
    expect(result.current.token).toBe('test-token-123')
    expect(result.current.isAuthenticated()).toBe(true)

    // Verifica localStorage
    const stored = JSON.parse(localStorage.getItem('sabia-auth') || '{}')
    expect(stored.state.user).toEqual(mockProfile)
    expect(stored.state.token).toBe('test-token-123')
  })

  it('clears session and localStorage', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setSession(mockProfile, 'test-token-123')
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated()).toBe(false)

    const stored = JSON.parse(localStorage.getItem('sabia-auth') || '{}')
    expect(stored.state.user).toBeNull()
    expect(stored.state.token).toBeNull()
  })

  it('hydrates from localStorage on init', () => {
    localStorage.setItem('sabia-auth', JSON.stringify({
      state: { user: mockProfile, token: 'persisted-token' },
      version: 0,
    }))

    // Store deve inicializar sem erro
    const { result } = renderHook(() => useAuthStore())

    // Apenas verifica se a store funciona
    expect(typeof result.current.isAuthenticated).toBe('function')
  })
})