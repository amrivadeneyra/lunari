/**
 * Tests para server actions de autenticación
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  onCompleteUserRegistration,
  onLoginUser,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'

// Mock de currentUser de Clerk
vi.mock('@clerk/nextjs', async () => {
  const actual = await vi.importActual('@clerk/nextjs')
  return {
    ...actual,
    currentUser: vi.fn(),
    redirectToSignIn: vi.fn(),
  }
})

// Mock de onGetAllAccountDomains
vi.mock('../settings', () => ({
  onGetAllAccountDomains: vi.fn(),
}))

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onCompleteUserRegistration', () => {
    it('debe registrar un usuario correctamente', async () => {
      const mockUser = {
        id: 'user-123',
        fullname: 'Juan Pérez',
        type: 'business',
      }

      mockPrismaClient.user.create.mockResolvedValue(mockUser)

      const result = await onCompleteUserRegistration(
        'Juan Pérez',
        'clerk-123',
        'business'
      )

      expect(result?.status).toBe(200)
      expect(result?.user).toEqual(mockUser)
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          fullname: 'Juan Pérez',
          clerkId: 'clerk-123',
          type: 'business',
        },
        select: {
          fullname: true,
          id: true,
          type: true,
        },
      })
    })

    it('debe retornar error 400 si falla el registro', async () => {
      mockPrismaClient.user.create.mockRejectedValue(new Error('Error de BD'))

      const result = await onCompleteUserRegistration(
        'Juan Pérez',
        'clerk-123',
        'business'
      )

      expect(result?.status).toBe(400)
    })
  })

  describe('onLoginUser', () => {
    it('debe hacer login correctamente cuando el usuario existe', async () => {
      const { onGetAllAccountDomains } = await import('../settings')
      const mockUser = {
        id: 'user-123',
        fullname: 'Juan Pérez',
        type: 'business',
      }
      const mockDomains = {
        domains: [
          { id: 'domain-1', name: 'Empresa 1' },
          { id: 'domain-2', name: 'Empresa 2' },
        ],
      }

      const { currentUser } = await import('@clerk/nextjs')
        ; (currentUser as any).mockResolvedValue({
          id: 'clerk-123',
          emailAddresses: [{ emailAddress: 'juan@example.com' }],
        })

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)
        ; (onGetAllAccountDomains as any).mockResolvedValue(mockDomains)

      const result = await onLoginUser()

      expect(result?.status).toBe(200)
      expect(result?.user).toEqual(mockUser)
      expect(result?.domains).toEqual(mockDomains.domains)
    })

    it('debe retornar null si no hay usuario de Clerk', async () => {
      const { currentUser } = await import('@clerk/nextjs')
        ; (currentUser as any).mockResolvedValue(null)

      const result = await onLoginUser()

      expect(result).toBeNull()
    })

    it('debe retornar null si el usuario no existe en la BD', async () => {
      const { currentUser } = await import('@clerk/nextjs')
        ; (currentUser as any).mockResolvedValue({
          id: 'clerk-123',
        })

      mockPrismaClient.user.findUnique.mockResolvedValue(null)

      const result = await onLoginUser()

      expect(result).toBeNull()
    })

    it('debe retornar error 400 si hay un error en la consulta', async () => {
      const { currentUser } = await import('@clerk/nextjs')
        ; (currentUser as any).mockResolvedValue({
          id: 'clerk-123',
        })

      mockPrismaClient.user.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onLoginUser()

      expect(result?.status).toBe(400)
    })
  })
})

