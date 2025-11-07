/**
 * Tests para schemas de conversación
 */

import { describe, it, expect } from 'vitest'
import {
  ConversationSearchSchema,
  ChatBotMessageSchema,
} from './conversation.schema'
import { MAX_UPLOAD_SIZE, ACCEPTED_FILE_TYPES } from './settings.schema'

describe('Conversation Schemas', () => {
  describe('ConversationSearchSchema', () => {
    it('debe validar búsqueda correcta', () => {
      const validData = {
        query: 'buscar conversación',
        domain: 'domain-123',
      }

      const result = ConversationSearchSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar query vacío', () => {
      const invalidData = {
        query: '',
        domain: 'domain-123',
      }

      const result = ConversationSearchSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar domain vacío', () => {
      const invalidData = {
        query: 'buscar conversación',
        domain: '',
      }

      const result = ConversationSearchSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ChatBotMessageSchema', () => {
    it('debe validar mensaje con contenido', () => {
      const validData = {
        content: 'Hola, ¿cómo estás?',
      }

      const result = ChatBotMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe validar mensaje con imagen válida', () => {
      const validData = {
        content: 'Hola',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024, // 1MB
          },
        ],
      }

      const result = ChatBotMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar imagen muy grande', () => {
      const invalidData = {
        content: 'Hola',
        image: [
          {
            type: 'image/png',
            size: MAX_UPLOAD_SIZE + 1, // Más del límite
          },
        ],
      }

      const result = ChatBotMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar tipo de archivo no permitido', () => {
      const invalidData = {
        content: 'Hola',
        image: [
          {
            type: 'image/gif',
            size: 1024 * 1024,
          },
        ],
      }

      const result = ChatBotMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe aceptar mensaje sin contenido si hay imagen', () => {
      const validData = {
        image: [
          {
            type: 'image/jpeg',
            size: 500 * 1024,
          },
        ],
      }

      const result = ChatBotMessageSchema.safeParse(validData)
      // El schema permite que content sea opcional
      expect(result.success).toBe(true)
    })

    it('debe aceptar todos los tipos de imagen permitidos', () => {
      ACCEPTED_FILE_TYPES.forEach((fileType) => {
        const validData = {
          content: 'Imagen',
          image: [
            {
              type: fileType,
              size: 500 * 1024,
            },
          ],
        }

        const result = ChatBotMessageSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })
    })
  })
})

