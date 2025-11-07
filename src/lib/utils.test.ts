/**
 * Tests unitarios para funciones de utilidades
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  extractUUIDFromString,
  extractURLfromString,
  extractEmailsFromString,
  getMonthName,
  validateImageUrl,
  getSocketClient,
  socketServer,
  socketClientUtils,
  postToParent,
} from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('debe combinar clases correctamente', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('debe manejar clases condicionales', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('debe fusionar clases de Tailwind correctamente', () => {
      expect(cn('p-2 p-4')).toBe('p-4') // p-4 debe sobrescribir p-2
    })
  })

  describe('extractUUIDFromString', () => {
    it('debe extraer UUID de una URL', () => {
      const url = 'https://example.com/users/123e4567-e89b-12d3-a456-426614174000'
      const result = extractUUIDFromString(url)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('debe extraer UUID con guiones', () => {
      const url = 'https://example.com/123e4567-e89b-12d3-a456-426614174000'
      const result = extractUUIDFromString(url)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('debe retornar null si no hay UUID', () => {
      const url = 'https://example.com/no-uuid-here'
      const result = extractUUIDFromString(url)
      expect(result).toBeNull()
    })
  })

  describe('extractURLfromString', () => {
    it('debe extraer URL HTTP de un string', () => {
      const text = 'Visita https://example.com para más info'
      const result = extractURLfromString(text)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('https://example.com')
    })

    it('debe extraer URL HTTP de un string', () => {
      const text = 'Visita http://example.com para más info'
      const result = extractURLfromString(text)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('http://example.com')
    })

    it('debe limpiar caracteres no deseados al final', () => {
      const text = 'Visita https://example.com) para más info'
      const result = extractURLfromString(text)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('https://example.com')
    })

    it('debe retornar null si no hay URL', () => {
      const text = 'No hay URL aquí'
      const result = extractURLfromString(text)
      expect(result).toBeNull()
    })
  })

  describe('extractEmailsFromString', () => {
    it('debe extraer emails de un string', () => {
      const text = 'Contacta a test@example.com o admin@test.com'
      const result = extractEmailsFromString(text)
      expect(result).not.toBeNull()
      expect(result).toContain('test@example.com')
      expect(result).toContain('admin@test.com')
    })

    it('debe extraer email con guiones y puntos', () => {
      const text = 'Email: user-name.test@example-domain.com'
      const result = extractEmailsFromString(text)
      expect(result).not.toBeNull()
      expect(result?.[0]).toBe('user-name.test@example-domain.com')
    })

    it('debe retornar null si no hay emails', () => {
      const text = 'No hay emails aquí'
      const result = extractEmailsFromString(text)
      expect(result).toBeNull()
    })
  })

  describe('getMonthName', () => {
    it('debe retornar el nombre correcto para cada mes', () => {
      expect(getMonthName(1)).toBe('Jan')
      expect(getMonthName(2)).toBe('Feb')
      expect(getMonthName(3)).toBe('Mar')
      expect(getMonthName(4)).toBe('Apr')
      expect(getMonthName(5)).toBe('May')
      expect(getMonthName(6)).toBe('Jun')
      expect(getMonthName(7)).toBe('Jul')
      expect(getMonthName(8)).toBe('Aug')
      expect(getMonthName(9)).toBe('Sep')
      expect(getMonthName(10)).toBe('Oct')
      expect(getMonthName(11)).toBe('Nov')
      expect(getMonthName(12)).toBe('Dec')
    })
  })

  describe('validateImageUrl', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('debe retornar true para URL válida', async () => {
      ; (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await validateImageUrl('https://example.com/image.jpg')
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
        method: 'HEAD',
      })
    })

    it('debe retornar false para URL inválida', async () => {
      ; (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await validateImageUrl('https://example.com/invalid.jpg')
      expect(result).toBe(false)
    })

    it('debe retornar false en caso de error', async () => {
      ; (global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await validateImageUrl('https://example.com/error.jpg')
      expect(result).toBe(false)
    })
  })

  describe('getSocketClient', () => {
    it('debe crear una instancia de socket', () => {
      // Esta función crea un socket real, así que solo verificamos que retorna algo
      // En un entorno real, esto crearía una conexión real a Socket.io
      const socket = getSocketClient()
      expect(socket).toBeDefined()
      expect(typeof socket).toBe('object')
    })
  })

  describe('socketServer', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
      process.env.NEXT_PUBLIC_SOCKET_URL = 'http://localhost:3001'
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('debe enviar mensaje exitosamente', async () => {
      ; (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await socketServer.trigger('room-123', 'event-name', { data: 'test' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Mensaje enviado via Socket.io')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/send-message',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: 'room-123',
            event: 'event-name',
            data: { data: 'test' },
          }),
        })
      )
    })

    it('debe retornar fallback si el servidor no está disponible', async () => {
      ; (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await socketServer.trigger('room-123', 'event-name', { data: 'test' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Mensaje logueado (servidor no disponible)')
    })

    it('debe retornar fallback en caso de error de red', async () => {
      ; (global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await socketServer.trigger('room-123', 'event-name', { data: 'test' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Mensaje logueado (error de conexión)')
    })

    it('debe usar URL por defecto si NEXT_PUBLIC_SOCKET_URL no está definido', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SOCKET_URL
      delete process.env.NEXT_PUBLIC_SOCKET_URL
        ; (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
        })

      await socketServer.trigger('room-123', 'event-name', { data: 'test' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/send-message',
        expect.any(Object)
      )

      // Restaurar
      if (originalUrl) {
        process.env.NEXT_PUBLIC_SOCKET_URL = originalUrl
      }
    })
  })

  describe('socketClientUtils', () => {
    it('debe tener método subscribe definido y ejecutable', () => {
      expect(typeof socketClientUtils.subscribe).toBe('function')
      // Ejecutar sin error (puede crear un socket real, pero no falla)
      expect(() => socketClientUtils.subscribe('room-123')).not.toThrow()
    })

    it('debe tener método unsubscribe definido y ejecutable', () => {
      expect(typeof socketClientUtils.unsubscribe).toBe('function')
      // Ejecutar sin error
      expect(() => socketClientUtils.unsubscribe('room-123')).not.toThrow()
    })

    it('debe tener método bind definido y ejecutable', () => {
      expect(typeof socketClientUtils.bind).toBe('function')
      const callback = vi.fn()
      // Ejecutar sin error
      expect(() => socketClientUtils.bind('event-name', callback)).not.toThrow()
    })

    it('debe tener método unbind definido y ejecutable', () => {
      expect(typeof socketClientUtils.unbind).toBe('function')
      // Ejecutar sin error
      expect(() => socketClientUtils.unbind('event-name')).not.toThrow()
    })
  })

  describe('postToParent', () => {
    beforeEach(() => {
      // Mock de window.parent.postMessage
      global.window = {
        parent: {
          postMessage: vi.fn(),
        },
      } as any
    })

    it('debe enviar mensaje al parent window', () => {
      postToParent('test message')
      expect(global.window.parent.postMessage).toHaveBeenCalledWith('test message', '*')
    })

    it('debe enviar mensajes JSON correctamente', () => {
      const message = JSON.stringify({ type: 'test', data: 'value' })
      postToParent(message)
      expect(global.window.parent.postMessage).toHaveBeenCalledWith(message, '*')
    })
  })
})
