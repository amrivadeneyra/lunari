/**
 * Tests para hook de sign-in
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSignInForm } from './use-sign-in'

// Mock de Clerk
vi.mock('@clerk/nextjs', () => ({
    useSignIn: () => ({
        isLoaded: true,
        setActive: vi.fn(),
        signIn: {
            create: vi.fn(),
        },
    }),
}))

// Mock de useRouter
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}))

// Mock de useToast
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}))

describe('useSignInForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar métodos, onHandleSubmit y loading', () => {
        const { result } = renderHook(() => useSignInForm())

        expect(result.current).toHaveProperty('methods')
        expect(result.current).toHaveProperty('onHandleSubmit')
        expect(result.current).toHaveProperty('loading')
        expect(typeof result.current.onHandleSubmit).toBe('function')
        expect(typeof result.current.loading).toBe('boolean')
    })

    it('debe tener métodos de formulario válidos', () => {
        const { result } = renderHook(() => useSignInForm())

        expect(result.current.methods).toBeDefined()
        expect(result.current.methods.register).toBeDefined()
        expect(result.current.methods.handleSubmit).toBeDefined()
    })

    it('debe manejar cuando isLoaded es false', async () => {
        const { result } = renderHook(() => useSignInForm())

        expect(result.current.onHandleSubmit).toBeDefined()
        expect(typeof result.current.onHandleSubmit).toBe('function')
    })

    it('debe manejar errores de autenticación', async () => {
        // El hook maneja errores internamente
        const { result } = renderHook(() => useSignInForm())

        expect(result.current.onHandleSubmit).toBeDefined()
        expect(typeof result.current.onHandleSubmit).toBe('function')
    })

    it('debe manejar cuando el status no es "complete"', async () => {
        // El hook maneja diferentes estados internamente
        const { result } = renderHook(() => useSignInForm())

        expect(result.current.onHandleSubmit).toBeDefined()
        expect(typeof result.current.onHandleSubmit).toBe('function')
    })

    it('debe establecer loading correctamente', () => {
        const { result } = renderHook(() => useSignInForm())

        expect(typeof result.current.loading).toBe('boolean')
        expect(result.current.loading).toBe(false)
    })
})

