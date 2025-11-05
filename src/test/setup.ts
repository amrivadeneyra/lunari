/**
 * Configuración global para tests
 * Se ejecuta antes de cada archivo de test
 */

// @ts-ignore - Los tipos de vitest se cargarán cuando se instalen las dependencias
import '@testing-library/jest-dom'
// @ts-ignore
import { vi } from 'vitest'

// Importar mocks para que estén disponibles globalmente
import './mocks/prisma'
import './mocks/clerk'
import './mocks/openai'

// Mock de Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock de Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const React = require('react')
    return React.createElement('img', props)
  },
}))

// Mock de variables de entorno
process.env.JWT_SECRET = 'test-secret-key'
process.env.OPEN_AI_KEY = 'test-openai-key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key'
process.env.NODE_MAILER_EMAIL = 'test@example.com'
process.env.NODE_MAILER_GMAIL_APP_PASSWORD = 'test-password'

// Mock de console para reducir ruido en tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

