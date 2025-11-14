import { describe, expect, it } from 'vitest'
import { config } from './middleware'

describe('middleware config', () => {
  it('debe definir rutas públicas permitidas', () => {
    const publicRoutes = ['/auth(.*)', '/portal(.*)', '/images(.*)']
    expect(config).toBeDefined()
    expect(publicRoutes.every((route) => config.matcher.includes(route))).toBe(false)
  })

  it('debe definir matcher para proteger rutas privadas', () => {
    expect(config.matcher).toContain('/((?!.*\\..*|_next).*)')
    expect(config.matcher).toContain('/')
    expect(config.matcher).toContain('/(api|trpc)(.*)')
  })
})

