/**
 * Tests para el hook useChatSession
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatSession } from './use-chat-session'

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useChatSession', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('debe inicializar con sesión vacía', () => {
    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBeNull()
    expect(result.current.sessionData).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debe cargar sesión válida desde localStorage', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBe('token-123')
    expect(result.current.sessionData).toEqual(sessionData)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('debe limpiar sesión expirada', () => {
    const expiredData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expirado
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(expiredData))

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lunari_session_token')).toBeNull()
  })

  it('debe guardar una nueva sesión', () => {
    const { result } = renderHook(() => useChatSession())

    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    act(() => {
      result.current.saveSession('new-token-123', sessionData)
    })

    expect(result.current.token).toBe('new-token-123')
    expect(result.current.sessionData).toEqual(sessionData)
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lunari_session_token')).toBe('new-token-123')
  })

  it('debe limpiar la sesión', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    act(() => {
      result.current.clearSession()
    })

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lunari_session_token')).toBeNull()
  })

  it('debe actualizar la sesión con nuevo token', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_token', 'old-token')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    act(() => {
      result.current.updateSession('new-token-456')
    })

    expect(result.current.token).toBe('new-token-456')
    expect(localStorage.getItem('lunari_session_token')).toBe('new-token-456')
  })

  it('debe manejar errores al cargar sesión inválida', () => {
    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', 'invalid-json')

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debe manejar cuando solo hay token pero no hay data', () => {
    localStorage.setItem('lunari_session_token', 'token-123')
    // No hay data

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debe manejar cuando solo hay data pero no hay token', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))
    // No hay token

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debe manejar cuando el JSON es válido pero falta expiresAt', () => {
    const invalidData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      // Falta expiresAt
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(invalidData))

    const { result } = renderHook(() => useChatSession())

    // Debe manejar el error y limpiar la sesión
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debe manejar errores al guardar sesión (localStorage falla)', () => {
    const { result } = renderHook(() => useChatSession())

    // Simular error en localStorage.setItem
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded')
    })

    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    act(() => {
      result.current.saveSession('token-123', sessionData)
    })

    // Restaurar localStorage
    localStorage.setItem = originalSetItem

    // El hook debe manejar el error sin lanzar excepción
    expect(result.current.saveSession).toBeDefined()
  })

  it('debe manejar errores al limpiar sesión (localStorage falla)', () => {
    const { result } = renderHook(() => useChatSession())

    // Primero guardar una sesión
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    act(() => {
      result.current.saveSession('token-123', sessionData)
    })

    // Simular error en localStorage.removeItem
    const originalRemoveItem = localStorage.removeItem
    localStorage.removeItem = vi.fn(() => {
      throw new Error('Storage error')
    })

    act(() => {
      result.current.clearSession()
    })

    // Restaurar localStorage
    localStorage.removeItem = originalRemoveItem

    // El hook debe manejar el error sin lanzar excepción
    expect(result.current.clearSession).toBeDefined()
  })

  it('no debe actualizar sesión cuando no hay sesión activa', () => {
    const { result } = renderHook(() => useChatSession())

    // No hay sesión guardada
    expect(result.current.token).toBeNull()

    act(() => {
      result.current.updateSession('new-token-456')
    })

    // No debe actualizar nada si no hay sesión
    expect(result.current.token).toBeNull()
    expect(localStorage.getItem('lunari_session_token')).toBeNull()
  })

  it('debe retornar el objeto session correctamente', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    expect(result.current.session).toEqual({
      token: 'token-123',
      data: sessionData,
      isAuthenticated: true,
    })
  })

  it('debe cargar sesión automáticamente al montar (useEffect)', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    // Verificar que la sesión se cargó automáticamente (useEffect se ejecuta al montar)
    expect(result.current.token).toBe('token-123')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('debe cargar sesión cuando expira en el futuro cercano', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 1000).toISOString(), // Expira en 1 segundo
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    // Debe cargar la sesión porque aún no ha expirado
    expect(result.current.token).toBe('token-123')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('debe cargar sesión con name opcional', () => {
    const sessionData = {
      customerId: 'customer-123',
      email: 'test@example.com',
      // name es opcional
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    localStorage.setItem('lunari_session_token', 'token-123')
    localStorage.setItem('lunari_session_data', JSON.stringify(sessionData))

    const { result } = renderHook(() => useChatSession())

    expect(result.current.token).toBe('token-123')
    expect(result.current.sessionData).toEqual(sessionData)
    expect(result.current.isAuthenticated).toBe(true)
  })
})

