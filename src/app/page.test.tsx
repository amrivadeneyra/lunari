import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from './page'

const mockRedirect = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (...args: Parameters<typeof mockRedirect>) => mockRedirect(...args),
}))

describe('Landing page', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('redirige a /auth/sign-in cuando no hay usuario', async () => {
    vi.doMock('@clerk/nextjs', () => ({
      currentUser: vi.fn().mockResolvedValue(null),
    }))

    const { default: Page } = await import('./page')
    await Page()

    expect(mockRedirect).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('redirige a /dashboard cuando hay sesión', async () => {
    vi.doMock('@clerk/nextjs', () => ({
      currentUser: vi.fn().mockResolvedValue({ id: 'usr_01' }),
    }))

    const { default: Page } = await import('./page')
    await Page()

    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })
})

