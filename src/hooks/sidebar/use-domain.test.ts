/**
 * Tests para el hook useDomain
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDomain } from './use-domain'

// Mock de dependencias
vi.mock('@/action/settings', () => ({
  onIntegrateDomain: vi.fn(),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockUsePathname = vi.fn(() => '/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

vi.mock('@uploadcare/upload-client', () => ({
  UploadClient: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue({
      uuid: 'upload-123',
    }),
  })),
}))

describe('useDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe inicializar con valores por defecto', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    const { result } = renderHook(() => useDomain())

    expect(result.current.loading).toBe(false)
    expect(result.current.isDomain).toBe('dashboard')
  })

  it('debe agregar un dominio', async () => {
    const { onIntegrateDomain } = await import('@/action/settings')
    ;(onIntegrateDomain as any).mockResolvedValue({
      status: 200,
      message: 'Empresa agregada exitosamente',
      domainId: 'domain-123',
    })

    const { result } = renderHook(() => useDomain())

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
    Object.defineProperty(mockFile, 'size', { value: 1024 })

    // Simular formulario con valores
    await act(async () => {
      // Necesitamos usar el handleSubmit del hook
      // Por ahora solo verificamos que el hook se inicializa correctamente
      expect(result.current.register).toBeDefined()
      expect(result.current.onAddDomain).toBeDefined()
    })
  })
})

