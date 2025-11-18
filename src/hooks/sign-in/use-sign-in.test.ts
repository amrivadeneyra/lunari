/**
 * Tests para hook de sign-in
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSignInForm } from './use-sign-in'

// Mock de Clerk
const mockSetActive = vi.fn()
const mockSignInCreate = vi.fn()
let isLoadedValue = true

vi.mock('@clerk/nextjs', () => ({
    useSignIn: () => ({
        isLoaded: isLoadedValue,
        setActive: mockSetActive,
        signIn: {
            create: mockSignInCreate,
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
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}))

describe('useSignInForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSignInCreate.mockReset()
        mockSetActive.mockReset()
        mockToast.mockReset()
        mockPush.mockReset()
        mockRefresh.mockReset()
        isLoadedValue = true
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

    it('debe establecer loading correctamente', () => {
        const { result } = renderHook(() => useSignInForm())

        expect(typeof result.current.loading).toBe('boolean')
        expect(result.current.loading).toBe(false)
    })

    it('debe iniciar sesión correctamente y redirigir al dashboard', async () => {
        mockSignInCreate.mockResolvedValue({
            status: 'complete',
            createdSessionId: 'sess-123',
        })

        const { result } = renderHook(() => useSignInForm())

        await act(async () => {
            result.current.methods.setValue('email', 'test@example.com')
            result.current.methods.setValue('password', 'password123')
            await result.current.onHandleSubmit({
                preventDefault: () => { },
                stopPropagation: () => { },
            } as any)
        })

        expect(mockSignInCreate).toHaveBeenCalledWith({
            identifier: 'test@example.com',
            password: 'password123',
        })
        expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess-123' })
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Éxito',
            description: 'Bienvenido de nuevo!',
        })
    })

    it('debe manejar credenciales incorrectas mostrando error', async () => {
        mockSignInCreate.mockRejectedValue({
            errors: [{ code: 'form_password_incorrect' }],
        })

        const { result } = renderHook(() => useSignInForm())

        await act(async () => {
            result.current.methods.setValue('email', 'wrong@example.com')
            result.current.methods.setValue('password', 'wrongpass')
            await result.current.onHandleSubmit({
                preventDefault: () => { },
                stopPropagation: () => { },
            } as any)
        })

        expect(mockSignInCreate).toHaveBeenCalled()
        expect(mockSetActive).not.toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Error',
            description: 'email/password es incorrecto, intenta nuevamente',
        })
    })

    it('no debe intentar autenticación cuando Clerk no está cargado', async () => {
        isLoadedValue = false
        const { result } = renderHook(() => useSignInForm())

        await act(async () => {
            result.current.methods.setValue('email', 'test@example.com')
            result.current.methods.setValue('password', 'password123')
            await result.current.onHandleSubmit({
                preventDefault: () => { },
                stopPropagation: () => { },
            } as any)
        })

        expect(mockSignInCreate).not.toHaveBeenCalled()
        expect(mockSetActive).not.toHaveBeenCalled()
        expect(mockPush).not.toHaveBeenCalled()
    })
})

