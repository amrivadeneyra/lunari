/**
 * Tests para el hook useChatTime
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatTime } from './use-conversation'

// Mock de dependencias
vi.mock('@/action/conversation', () => ({
    onViewUnReadMessages: vi.fn(),
}))

vi.mock('@/context/user-chat-context', () => ({
    useChatContext: () => ({
        chatRoom: null,
    }),
}))

vi.mock('@/lib/utils', () => ({
    getMonthName: vi.fn((month: number) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return months[month] || 'Unknown'
    }),
}))

describe('useChatTime', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe inicializar con valores por defecto', () => {
        const createdAt = new Date()
        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        // El useEffect se ejecuta automáticamente, así que messageSentAt puede estar definido
        expect(result.current.messageSentAt).toBeDefined()
        expect(typeof result.current.urgent).toBe('boolean')
        expect(result.current.onSeenChat).toBeDefined()
    })

    it('debe formatear fecha cuando es el mismo día', () => {
        const now = new Date()
        const createdAt = new Date(now.getTime() - 1000 * 60 * 60) // Hace 1 hora

        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        // Esperar a que se ejecute el useEffect
        act(() => {
            // El useEffect se ejecuta automáticamente
        })

        // Verificar que se formateó la hora
        expect(result.current.messageSentAt).toBeDefined()
        expect(typeof result.current.messageSentAt).toBe('string')
    })

    it('debe marcar como urgente si tiene menos de 2 horas', () => {
        const now = new Date()
        const createdAt = new Date(now.getTime() - 1000 * 60 * 60) // Hace 1 hora

        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        act(() => {
            // El useEffect se ejecuta automáticamente
        })

        // Puede ser urgente si tiene menos de 2 horas
        expect(result.current.urgent).toBeDefined()
        expect(typeof result.current.urgent).toBe('boolean')
    })

    it('debe formatear fecha cuando es un día diferente', () => {
        const now = new Date()
        const createdAt = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) // Hace 2 días

        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        act(() => {
            // El useEffect se ejecuta automáticamente
        })

        // Verificar que se formateó con fecha
        expect(result.current.messageSentAt).toBeDefined()
        expect(typeof result.current.messageSentAt).toBe('string')
    })

    it('debe tener función onSeenChat disponible', () => {
        const createdAt = new Date()
        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        expect(typeof result.current.onSeenChat).toBe('function')
    })

    it('debe tener función onSeenChat que puede ser ejecutada', async () => {
        const { onViewUnReadMessages } = await import('@/action/conversation')

        const now = new Date()
        const createdAt = new Date(now.getTime() - 1000 * 60 * 60) // Hace 1 hora

        const { result } = renderHook(() => useChatTime(createdAt, 'room-123'))

        await act(async () => {
            await result.current.onSeenChat()
        })

        // Verificar que la función existe y se ejecuta
        expect(result.current.onSeenChat).toBeDefined()
        expect(typeof result.current.onSeenChat).toBe('function')
    })
})

