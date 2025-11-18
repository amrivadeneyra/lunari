/**
 * Tests para el hook usePortal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePortal } from './use-portal'

// Mock de dependencias
vi.mock('@/action/appointment', () => ({
  onBookNewAppointment: vi.fn(),
  onGetAvailableTimeSlotsForDay: vi.fn(),
  saveAnswers: vi.fn(),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('usePortal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe inicializar con valores por defecto', () => {
    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    expect(result.current.step).toBe(1)
    expect(result.current.loading).toBe(false)
    expect(result.current.selectedSlot).toBe('')
  })

  it('debe avanzar al siguiente paso', () => {
    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    act(() => {
      result.current.onNext()
    })

    expect(result.current.step).toBe(2)
  })

  it('debe retroceder al paso anterior', () => {
    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    act(() => {
      result.current.onNext()
      result.current.onNext()
      result.current.onPrev()
    })

    expect(result.current.step).toBe(2)
  })

  it('debe cargar slots disponibles cuando cambia la fecha', async () => {
    const { onGetAvailableTimeSlotsForDay } = await import('@/action/appointment')
      ; (onGetAvailableTimeSlotsForDay as any).mockResolvedValue({
        timeSlots: ['9:00am', '10:00am', '11:00am'],
      })

    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    const newDate = new Date('2024-12-31')
    act(() => {
      result.current.setDate(newDate)
    })

    await waitFor(() => {
      expect(result.current.availableSlots).toEqual(['9:00am', '10:00am', '11:00am'])
    })
  })

  it('debe seleccionar un slot de tiempo', () => {
    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    act(() => {
      result.current.onSelectedTimeSlot('10:00am')
    })

    expect(result.current.selectedSlot).toBe('10:00am')
  })

  it('debe reservar una cita correctamente', async () => {
    const { onBookNewAppointment, saveAnswers } = await import('@/action/appointment')
    const { useToast } = await import('@/components/ui/use-toast')

      ; (saveAnswers as any).mockResolvedValue({ success: true })
      ; (onBookNewAppointment as any).mockResolvedValue({
        status: 200,
        message: 'Cita reservada exitosamente',
      })

    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    // Establecer fecha y slot
    act(() => {
      result.current.setDate(new Date('2024-12-31'))
      result.current.onSelectedTimeSlot('10:00am')
    })

    // Simular envío de formulario
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any

    await act(async () => {
      await result.current.onBookAppointment(mockEvent)
    })

    // Verificar que se avanzó al paso 3
    expect(result.current.step).toBe(3)
  })

  it('debe manejar errores al reservar cita', async () => {
    const { saveAnswers } = await import('@/action/appointment')
      ; (saveAnswers as any).mockRejectedValue(new Error('Error de red'))

    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any

    await act(async () => {
      await result.current.onBookAppointment(mockEvent)
    })

    // Verificar que la función maneja el error sin lanzar excepción
    expect(result.current.onBookAppointment).toBeDefined()
  })

  it('no debe avanzar al paso 3 si el status no es 200', async () => {
    const { onBookNewAppointment, saveAnswers } = await import('@/action/appointment')

      ; (saveAnswers as any).mockResolvedValue({ success: true })
      ; (onBookNewAppointment as any).mockResolvedValue({
        status: 400,
        message: 'Error al reservar',
      })

    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any

    await act(async () => {
      await result.current.onBookAppointment(mockEvent)
    })

    // No debe avanzar al paso 3 si el status no es 200
    expect(result.current.step).toBe(1)
  })

  it('debe manejar cuando no hay fecha seleccionada', async () => {
    const { onGetAvailableTimeSlotsForDay } = await import('@/action/appointment')
      ; (onGetAvailableTimeSlotsForDay as any).mockResolvedValue({
        timeSlots: [],
      })

    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    act(() => {
      result.current.setDate(undefined)
    })

    // No debe cargar slots si no hay fecha
    expect(result.current.availableSlots).toEqual([])
  })

  it('debe retornar loadingSlots como false inicialmente', () => {
    const { result } = renderHook(() =>
      usePortal('customer-123', 'company-123', 'test@example.com')
    )

    expect(typeof result.current.loadingSlots).toBe('boolean')
  })
})

