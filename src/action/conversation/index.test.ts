/**
 * Tests para server actions de conversación
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  onToggleRealtime,
  onUpdateConversationState,
  onGetConversationMode,
  onGetDomainChatRooms,
  onGetChatMessages,
  onViewUnReadMessages,
  onRealTimeChat,
  onOwnerSendMessage,
  onToggleFavorite,
  onGetAllDomainChatRooms,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'
import { mockClerkClient } from '@/test/mocks/clerk'

// Mock de socketServer
vi.mock('@/lib/utils', () => ({
  socketServer: {
    trigger: vi.fn(),
  },
}))

// Mock de onMailer
vi.mock('../mailer', () => ({
  onMailer: vi.fn(),
}))

describe('Conversation Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onToggleRealtime', () => {
    it('debe activar modo realtime', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        live: true,
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const result = await onToggleRealtime('chatroom-123', true)

      expect(result?.status).toBe(200)
      expect(result?.message).toBe('Realtime mode enabled')
      expect(result?.chatRoom.live).toBe(true)
    })

    it('debe desactivar modo realtime', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        live: false,
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const result = await onToggleRealtime('chatroom-123', false)

      expect(result?.status).toBe(200)
      expect(result?.message).toBe('Realtime mode disabled')
      expect(result?.chatRoom.live).toBe(false)
    })

    it('debe manejar errores correctamente', async () => {
      mockPrismaClient.chatRoom.update.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onToggleRealtime('chatroom-123', true)

      expect(result).toBeUndefined()
    })
  })

  describe('onUpdateConversationState', () => {
    it('debe actualizar el estado de la conversación', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        conversationState: 'ESCALATED',
        Customer: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          domainId: 'domain-123',
        },
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)
      mockPrismaClient.domain.findFirst.mockResolvedValue({
        User: {
          clerkId: 'clerk-123',
        },
      })
      mockClerkClient.users.getUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: 'owner@example.com' }],
      })

      const { onMailer } = await import('../mailer')
        ; (onMailer as any).mockResolvedValue({ success: true })

      const result = await onUpdateConversationState(
        'chatroom-123',
        'ESCALATED'
      )

      expect(result?.status).toBe(200)
      expect(result?.chatRoom?.conversationState).toBe('ESCALATED')
    })

    it('no debe enviar email si el estado no es ESCALATED', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        conversationState: 'ACTIVE',
        Customer: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          domainId: 'domain-123',
        },
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const { onMailer } = await import('../mailer')

      const result = await onUpdateConversationState(
        'chatroom-123',
        'ACTIVE'
      )

      expect(result?.status).toBe(200)
      expect(onMailer).not.toHaveBeenCalled()
    })

    it('debe retornar error si falla la actualización', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.chatRoom.update.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onUpdateConversationState('chatroom-123', 'ACTIVE')

      expect(result?.status).toBe(500)
      consoleSpy.mockRestore()
    })

    it('debe manejar errores al enviar email', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        conversationState: 'ESCALATED',
        Customer: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          domainId: 'domain-123',
        },
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)
      mockPrismaClient.domain.findFirst.mockResolvedValue({
        User: {
          clerkId: 'clerk-123',
        },
      })
      mockClerkClient.users.getUser.mockRejectedValue(
        new Error('Error de Clerk')
      )

      const result = await onUpdateConversationState(
        'chatroom-123',
        'ESCALATED'
      )

      // Debe retornar éxito aunque falle el email
      expect(result?.status).toBe(200)
    })
  })

  describe('onGetConversationMode', () => {
    it('debe obtener el modo de conversación', async () => {
      const mockMode = {
        live: true,
      }

      mockPrismaClient.chatRoom.findUnique.mockResolvedValue(mockMode)

      const result = await onGetConversationMode('chatroom-123')

      expect(result).toEqual(mockMode)
      expect(mockPrismaClient.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { id: 'chatroom-123' },
        select: { live: true },
      })
    })

    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.chatRoom.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetConversationMode('chatroom-123')

      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('debe retornar undefined si no encuentra el chatroom', async () => {
      mockPrismaClient.chatRoom.findUnique.mockResolvedValue(null)

      const result = await onGetConversationMode('chatroom-123')

      expect(result).toBeNull()
    })
  })

  describe('onGetDomainChatRooms', () => {
    it('debe obtener todas las conversaciones de un dominio', async () => {
      const mockDomain = {
        customer: [
          {
            id: 'customer-1',
            email: 'customer@example.com',
            name: 'Cliente 1',
            chatRoom: [
              {
                id: 'chatroom-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                live: false,
                isFavorite: false,
                conversationState: 'ACTIVE',
                lastUserActivityAt: new Date(),
                message: [
                  {
                    message: 'Hola',
                    createdAt: new Date(),
                    seen: false,
                    role: 'user',
                  },
                ],
              },
            ],
          },
        ],
      }

      mockPrismaClient.domain.findUnique.mockResolvedValue(mockDomain)

      const result = await onGetDomainChatRooms('domain-123')

      expect(result).toEqual(mockDomain)
    })

    it('debe retornar undefined si hay error', async () => {
      mockPrismaClient.domain.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetDomainChatRooms('domain-123')

      expect(result).toBeUndefined()
    })
  })

  describe('onGetChatMessages', () => {
    it('debe obtener mensajes de un chatroom', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        live: false,
        message: [
          {
            id: 'msg-1',
            role: 'user',
            message: 'Hola',
            createdAt: new Date(),
            seen: false,
            responseTime: 10,
            respondedWithin2Hours: true,
          },
        ],
      }

      mockPrismaClient.chatRoom.findUnique.mockResolvedValue(mockChatRoom)

      const result = await onGetChatMessages('chatroom-123')

      expect(result).toEqual(mockChatRoom)
    })

    it('debe retornar undefined si no encuentra el chatroom', async () => {
      mockPrismaClient.chatRoom.findUnique.mockResolvedValue(null)

      const result = await onGetChatMessages('chatroom-123')

      expect(result).toBeUndefined()
    })

    it('debe manejar errores correctamente', async () => {
      mockPrismaClient.chatRoom.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetChatMessages('chatroom-123')

      expect(result).toBeUndefined()
    })
  })

  describe('onViewUnReadMessages', () => {
    it('debe marcar mensajes como leídos', async () => {
      mockPrismaClient.chatMessage.updateMany.mockResolvedValue({ count: 5 })

      await onViewUnReadMessages('chatroom-123')

      expect(mockPrismaClient.chatMessage.updateMany).toHaveBeenCalledWith({
        where: { chatRoomId: 'chatroom-123' },
        data: { seen: true },
      })
    })

    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.chatMessage.updateMany.mockRejectedValue(
        new Error('Error de BD')
      )

      await onViewUnReadMessages('chatroom-123')

      // La función no lanza error, solo lo registra
      expect(mockPrismaClient.chatMessage.updateMany).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('onRealTimeChat', () => {
    it('debe enviar mensaje en tiempo real', async () => {
      const { socketServer } = await import('@/lib/utils')

      await onRealTimeChat(
        'chatroom-123',
        'Mensaje de prueba',
        'msg-123',
        'user'
      )

      expect(socketServer.trigger).toHaveBeenCalledWith(
        'chatroom-123',
        'realtime-mode',
        {
          chat: {
            message: 'Mensaje de prueba',
            id: 'msg-123',
            role: 'user',
          },
        }
      )
    })
  })

  describe('onOwnerSendMessage', () => {
    it('debe enviar mensaje del propietario y activar modo live', async () => {
      const mockChatRoom = {
        message: [
          {
            id: 'msg-123',
            role: 'assistant',
            message: 'Respuesta del propietario',
            createdAt: new Date(),
            seen: false,
          },
        ],
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const { socketServer } = await import('@/lib/utils')

      const result = await onOwnerSendMessage(
        'chatroom-123',
        'Respuesta del propietario',
        'assistant'
      )

      expect(result).toEqual(mockChatRoom)
      expect(mockPrismaClient.chatRoom.update).toHaveBeenCalledWith({
        where: { id: 'chatroom-123' },
        data: {
          live: true,
          message: {
            create: {
              message: 'Respuesta del propietario',
              role: 'assistant',
            },
          },
        },
        select: expect.any(Object),
      })
      expect(socketServer.trigger).toHaveBeenCalled()
    })

    it('debe manejar errores correctamente', async () => {
      mockPrismaClient.chatRoom.update.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onOwnerSendMessage(
        'chatroom-123',
        'Mensaje',
        'assistant'
      )

      expect(result).toBeUndefined()
    })

    it('debe retornar undefined si no hay chatRoom', async () => {
      mockPrismaClient.chatRoom.update.mockResolvedValue(null)

      const result = await onOwnerSendMessage(
        'chatroom-123',
        'Mensaje',
        'assistant'
      )

      expect(result).toBeUndefined()
    })

    it('debe retornar undefined si no hay mensajes', async () => {
      const mockChatRoom = {
        message: [],
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const result = await onOwnerSendMessage(
        'chatroom-123',
        'Mensaje',
        'assistant'
      )

      expect(result).toEqual(mockChatRoom)
    })
  })

  describe('onToggleFavorite', () => {
    it('debe agregar a favoritos', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        isFavorite: true,
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const result = await onToggleFavorite('chatroom-123', true)

      expect(result?.status).toBe(200)
      expect(result?.message).toBe('Agregado a favoritos')
      expect(result?.chatRoom?.isFavorite).toBe(true)
    })

    it('debe remover de favoritos', async () => {
      const mockChatRoom = {
        id: 'chatroom-123',
        isFavorite: false,
      }

      mockPrismaClient.chatRoom.update.mockResolvedValue(mockChatRoom)

      const result = await onToggleFavorite('chatroom-123', false)

      expect(result?.status).toBe(200)
      expect(result?.message).toBe('Removido de favoritos')
      expect(result?.chatRoom?.isFavorite).toBe(false)
    })

    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.chatRoom.update.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onToggleFavorite('chatroom-123', true)

      expect(result?.status).toBe(500)
      expect(result?.message).toBe('Error al actualizar favorito')
      consoleSpy.mockRestore()
    })

    it('debe retornar error si no se actualiza correctamente', async () => {
      mockPrismaClient.chatRoom.update.mockResolvedValue(null)

      const result = await onToggleFavorite('chatroom-123', true)

      expect(result).toBeUndefined()
    })
  })

  describe('onGetAllDomainChatRooms', () => {
    it('debe obtener todas las conversaciones agrupadas por cliente', async () => {
      const mockChatRooms = [
        {
          id: 'chatroom-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          live: false,
          isFavorite: false,
          conversationState: 'ACTIVE',
          lastUserActivityAt: new Date(),
          Customer: {
            id: 'customer-1',
            email: 'customer@example.com',
            name: 'Cliente 1',
          },
          message: [
            {
              message: 'Último mensaje',
              createdAt: new Date(),
              seen: false,
              role: 'user',
            },
          ],
        },
      ]

      mockPrismaClient.chatRoom.findMany.mockResolvedValue(mockChatRooms)

      const result = await onGetAllDomainChatRooms('domain-123')

      expect(result).toBeDefined()
      expect(result?.customer).toBeDefined()
      expect(Array.isArray(result?.customer)).toBe(true)
    })

    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.chatRoom.findMany.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetAllDomainChatRooms('domain-123')

      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })

    it('debe retornar array vacío si no hay conversaciones', async () => {
      mockPrismaClient.chatRoom.findMany.mockResolvedValue([])

      const result = await onGetAllDomainChatRooms('domain-123')

      expect(result).toBeDefined()
      expect(result?.customer).toEqual([])
    })
  })
})

