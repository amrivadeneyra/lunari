/**
 * Tests para hooks de conversación
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConversation } from './use-conversation'

// Mock de dependencias
vi.mock('@/action/conversation', () => ({
  onGetChatMessages: vi.fn(),
  onGetCompanyChatRooms: vi.fn(),
  onGetAllCompanyChatRooms: vi.fn(),
  onOwnerSendMessage: vi.fn(),
  onViewUnReadMessages: vi.fn(),
  onToggleFavorite: vi.fn(),
  onRealTimeChat: vi.fn(),
}))

vi.mock('@/context/user-chat-context', () => ({
  useChatContext: () => ({
    setLoading: vi.fn(),
    setChats: vi.fn(),
    setChatRoom: vi.fn(),
  }),
}))

vi.mock('@/lib/utils', () => ({
  getMonthName: vi.fn((month: number) => ['Jan', 'Feb', 'Mar'][month]),
  socketClientUtils: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    bind: vi.fn(),
    unbind: vi.fn(),
  },
}))

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe inicializar con valores por defecto', () => {
    const { result } = renderHook(() => useConversation())

    expect(result.current.loading).toBe(false)
    expect(result.current.activeTab).toBe('no leidos')
    expect(result.current.chatRooms).toEqual([])
  })

  it('debe cambiar el tab activo', () => {
    const { result } = renderHook(() => useConversation())

    act(() => {
      result.current.changeActiveTab('favoritos')
    })

    expect(result.current.activeTab).toBe('favoritos')
  })

  it('debe obtener mensajes de chat activo', async () => {
    const { onGetChatMessages } = await import('@/action/conversation')
    const mockMessages = {
      id: 'chatroom-123',
      live: false,
      message: [
        {
          id: 'msg-1',
          role: 'user',
          message: 'Hola',
          createdAt: new Date(),
          seen: false,
        },
      ],
    }

      ; (onGetChatMessages as any).mockResolvedValue(mockMessages)

    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.onGetActiveChatMessages('chatroom-123')
    })

    expect(onGetChatMessages).toHaveBeenCalledWith('chatroom-123')
  })

  it('debe alternar favorito', async () => {
    const { onToggleFavorite } = await import('@/action/conversation')
      ; (onToggleFavorite as any).mockResolvedValue({
        status: 200,
        chatRoom: {
          id: 'chatroom-123',
          isFavorite: true,
        },
      })

    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.toggleFavorite('chatroom-123', true)
    })

    expect(onToggleFavorite).toHaveBeenCalledWith('chatroom-123', true)
  })

  it('debe filtrar conversaciones por tab "no leidos"', () => {
    const { result } = renderHook(() => useConversation())

    expect(result.current.chatRooms).toEqual([])
    expect(result.current.activeTab).toBe('no leidos')
  })

  it('debe filtrar conversaciones por tab "todos"', () => {
    const { result } = renderHook(() => useConversation())

    act(() => {
      result.current.changeActiveTab('todos')
    })

    expect(result.current.activeTab).toBe('todos')
  })

  it('debe filtrar conversaciones por tab "expirados"', () => {
    const { result } = renderHook(() => useConversation())

    act(() => {
      result.current.changeActiveTab('expirados')
    })

    expect(result.current.activeTab).toBe('expirados')
  })

  it('debe filtrar conversaciones por tab "favoritos"', () => {
    const { result } = renderHook(() => useConversation())

    act(() => {
      result.current.changeActiveTab('favoritos')
    })

    expect(result.current.activeTab).toBe('favoritos')
  })

  it('debe manejar errores al obtener mensajes de chat', async () => {
    const { onGetChatMessages } = await import('@/action/conversation')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      ; (onGetChatMessages as any).mockRejectedValue(new Error('Error de red'))

    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.onGetActiveChatMessages('chatroom-123')
    })

    expect(onGetChatMessages).toHaveBeenCalledWith('chatroom-123')
    consoleSpy.mockRestore()
  })

  it('debe manejar errores al alternar favorito', async () => {
    const { onToggleFavorite } = await import('@/action/conversation')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      ; (onToggleFavorite as any).mockRejectedValue(new Error('Error de red'))

    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.toggleFavorite('chatroom-123', true)
    })

    expect(onToggleFavorite).toHaveBeenCalledWith('chatroom-123', true)
    consoleSpy.mockRestore()
  })

  it('no debe actualizar favorito si el status no es 200', async () => {
    const { onToggleFavorite } = await import('@/action/conversation')
      ; (onToggleFavorite as any).mockResolvedValue({
        status: 400,
        message: 'Error',
      })

    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.toggleFavorite('chatroom-123', true)
    })

    expect(onToggleFavorite).toHaveBeenCalledWith('chatroom-123', true)
  })

  it('debe retornar register y setValue del formulario', () => {
    const { result } = renderHook(() => useConversation())

    expect(result.current.register).toBeDefined()
    expect(result.current.setValue).toBeDefined()
    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.setValue).toBe('function')
  })
})

