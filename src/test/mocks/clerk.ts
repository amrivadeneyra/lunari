/**
 * Mock de Clerk para tests
 */

// @ts-ignore - Los tipos de vitest se cargarán cuando se instalen las dependencias
import { vi } from 'vitest'

export const mockClerkClient = {
  users: {
    getUser: vi.fn(),
    getUserList: vi.fn(),
    updateUser: vi.fn(),
  },
}

export const mockCurrentUser = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  clerkClient: mockClerkClient,
  currentUser: mockCurrentUser,
  auth: vi.fn(() => ({
    userId: 'test-user-id',
  })),
}))

