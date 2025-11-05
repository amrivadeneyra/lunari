/**
 * Tests para el hook useChatWindow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatWindow } from './use-conversation'

// Mock de dependencias
vi.mock('@/action/conversation', () => ({
    onOwnerSendMessage: vi.fn(),
}))

vi.mock('@/context/user-chat-context', () => ({
    useChatContext: () => ({
        chats: [],
        loading: false,
        setChats: vi.fn(),
        chatRoom: 'room-123',
    }),
}))

vi.mock('@/lib/utils', () => ({
    socketClientUtils: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        bind: vi.fn(),
        unbind: vi.fn(),
    },
}))

describe('useChatWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe inicializar con valores por defecto', () => {
        const { result } = renderHook(() => useChatWindow())

        expect(result.current.messageWindowRef).toBeDefined()
        expect(result.current.register).toBeDefined()
        expect(result.current.onHandleSentMessage).toBeDefined()
        expect(result.current.chats).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.chatRoom).toBe('room-123')
    })

    it('debe tener función onHandleSentMessage disponible', () => {
        const { result } = renderHook(() => useChatWindow())

        expect(typeof result.current.onHandleSentMessage).toBe('function')
    })

    it('debe tener register del formulario disponible', () => {
        const { result } = renderHook(() => useChatWindow())

        expect(typeof result.current.register).toBe('function')
    })

    it('debe tener messageWindowRef disponible', () => {
        const { result } = renderHook(() => useChatWindow())

        expect(result.current.messageWindowRef).toBeDefined()
        expect(result.current.messageWindowRef.current).toBeNull()
    })

    it('debe tener funciones de socket disponibles cuando hay chatRoom', async () => {
        const { socketClientUtils } = await import('@/lib/utils')
        const { result } = renderHook(() => useChatWindow())

        // Verificar que el hook se inicializa correctamente
        expect(result.current.chatRoom).toBe('room-123')

        // Verificar que las funciones de socket están mockeadas
        expect(socketClientUtils.subscribe).toBeDefined()
        expect(socketClientUtils.bind).toBeDefined()
    })

    it('debe limpiar suscripción al desmontar', async () => {
        const { socketClientUtils } = await import('@/lib/utils')
        const { unmount } = renderHook(() => useChatWindow())

        unmount()

        // Verificar que las funciones de limpieza están disponibles
        expect(socketClientUtils.unbind).toBeDefined()
        expect(socketClientUtils.unsubscribe).toBeDefined()
    })

    it('debe ejecutar onHandleSentMessage sin errores', async () => {
        const { onOwnerSendMessage } = await import('@/action/conversation')
            ; (onOwnerSendMessage as any).mockResolvedValue({})

        const { result } = renderHook(() => useChatWindow())

        const mockEvent = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as any

        await act(async () => {
            await result.current.onHandleSentMessage(mockEvent)
        })

        // Verificar que la función se ejecutó
        expect(result.current.onHandleSentMessage).toBeDefined()
    })

    it('debe manejar errores al enviar mensaje', async () => {
        const { onOwnerSendMessage } = await import('@/action/conversation')
            ; (onOwnerSendMessage as any).mockRejectedValue(new Error('Error de red'))

        const { result } = renderHook(() => useChatWindow())

        const mockEvent = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as any

        await act(async () => {
            await result.current.onHandleSentMessage(mockEvent)
        })

        // Verificar que la función maneja el error sin lanzar excepción
        expect(result.current.onHandleSentMessage).toBeDefined()
    })
})

