/**
 * Tests unitarios para funciones de sesión y JWT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  generateSessionToken,
  validateSessionToken,
  isTokenExpiringSoon,
  getEmailFromToken,
} from './session'
import { mockPrismaClient } from '@/test/mocks/prisma'

// Configurar variables de entorno para tests
process.env.JWT_SECRET = 'test-secret-key'

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSessionToken', () => {
    it('debe generar un token JWT válido', async () => {
      const mockCustomer = {
        id: 'customer-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '123456789',
      }

      mockPrismaClient.customer.findUnique.mockResolvedValue(mockCustomer)

      const result = await generateSessionToken(
        'customer-123',
        'test@example.com',
        'domain-123',
        'chatroom-123'
      )

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(result).toHaveProperty('sessionData')
      expect(result.sessionData.customerId).toBe('customer-123')
      expect(result.sessionData.email).toBe('test@example.com')
      expect(result.sessionData.domainId).toBe('domain-123')
      expect(result.sessionData.chatRoomId).toBe('chatroom-123')
    })

    it('debe lanzar error si el cliente no existe', async () => {
      mockPrismaClient.customer.findUnique.mockResolvedValue(null)

      await expect(
        generateSessionToken('customer-123', 'test@example.com', 'domain-123', 'chatroom-123')
      ).rejects.toThrow('Customer not found')
    })
  })

  describe('validateSessionToken', () => {
    it('debe validar un token válido', async () => {
      const mockCustomer = {
        id: 'customer-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '123456789',
        status: true,
      }

      const token = jwt.sign(
        {
          customerId: 'customer-123',
          email: 'test@example.com',
          domainId: 'domain-123',
          chatRoomId: 'chatroom-123',
        },
        'test-secret-key',
        {
          expiresIn: '30d',
          issuer: 'lunari-ai',
          subject: 'customer-123',
        }
      )

      mockPrismaClient.customer.findUnique.mockResolvedValue(mockCustomer)

      const result = await validateSessionToken(token)

      expect(result).not.toBeNull()
      expect(result?.customerId).toBe('customer-123')
      expect(result?.email).toBe('test@example.com')
    })

    it('debe retornar null para token inválido', async () => {
      const invalidToken = 'invalid-token'

      const result = await validateSessionToken(invalidToken)

      expect(result).toBeNull()
    })

    it('debe retornar null si el cliente no existe', async () => {
      const token = jwt.sign(
        {
          customerId: 'customer-123',
          email: 'test@example.com',
          domainId: 'domain-123',
          chatRoomId: 'chatroom-123',
        },
        'test-secret-key',
        {
          expiresIn: '30d',
          issuer: 'lunari-ai',
          subject: 'customer-123',
        }
      )

      mockPrismaClient.customer.findUnique.mockResolvedValue(null)

      const result = await validateSessionToken(token)

      expect(result).toBeNull()
    })

    it('debe retornar null si el cliente está inactivo', async () => {
      const mockCustomer = {
        id: 'customer-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '123456789',
        status: false, // Cliente inactivo
      }

      const token = jwt.sign(
        {
          customerId: 'customer-123',
          email: 'test@example.com',
          domainId: 'domain-123',
          chatRoomId: 'chatroom-123',
        },
        'test-secret-key',
        {
          expiresIn: '30d',
          issuer: 'lunari-ai',
          subject: 'customer-123',
        }
      )

      mockPrismaClient.customer.findUnique.mockResolvedValue(mockCustomer)

      const result = await validateSessionToken(token)

      expect(result).toBeNull()
    })
  })

  describe('isTokenExpiringSoon', () => {
    it('debe retornar true si el token expira pronto', () => {
      // Token que expira en 5 días (menos de 7 días)
      const token = jwt.sign(
        { customerId: 'customer-123', exp: Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60 },
        'test-secret-key'
      )

      const result = isTokenExpiringSoon(token)
      expect(result).toBe(true)
    })

    it('debe retornar false si el token no expira pronto', () => {
      // Token que expira en 10 días (más de 7 días)
      const token = jwt.sign(
        { customerId: 'customer-123', exp: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60 },
        'test-secret-key'
      )

      const result = isTokenExpiringSoon(token)
      expect(result).toBe(false)
    })

    it('debe retornar true si el token no tiene exp', () => {
      const token = jwt.sign({ customerId: 'customer-123' }, 'test-secret-key')

      const result = isTokenExpiringSoon(token)
      expect(result).toBe(true)
    })
  })

  describe('getEmailFromToken', () => {
    it('debe extraer el email del token', () => {
      const token = jwt.sign(
        {
          customerId: 'customer-123',
          email: 'test@example.com',
        },
        'test-secret-key'
      )

      const result = getEmailFromToken(token)
      expect(result).toBe('test@example.com')
    })

    it('debe retornar null si no hay email en el token', () => {
      const token = jwt.sign({ customerId: 'customer-123' }, 'test-secret-key')

      const result = getEmailFromToken(token)
      expect(result).toBeNull()
    })

    it('debe retornar null para token inválido', () => {
      const result = getEmailFromToken('invalid-token')
      expect(result).toBeNull()
    })
  })
})

