/**
 * Mock de OpenAI para tests
 */

// @ts-ignore - Los tipos de vitest se cargarán cuando se instalen las dependencias
import { vi } from 'vitest'

export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
}

vi.mock('openai', () => {
  return {
    default: vi.fn(() => mockOpenAI),
  }
})

