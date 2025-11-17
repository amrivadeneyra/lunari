/**
 * Tests para server actions de citas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  onBookNewAppointment,
  onGetAllCompanyBookings,
  onGetAvailableTimeSlotsForDay,
  onGetAllBookingsForCurrentUser,
  onCompanyCustomerResponses,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'
import { mockClerkClient } from '@/test/mocks/clerk'

// Mock de sendAppointmentConfirmation
vi.mock('@/action/mailer', () => ({
  sendAppointmentConfirmation: vi.fn(),
}))

describe('Appointment Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onBookNewAppointment', () => {
    it('debe crear una cita y enviar confirmación', async () => {
      const mockCustomer = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        Company: {
          name: 'Mi Empresa',
          User: {
            clerkId: 'clerk-123',
          },
        },
      }

      const mockBooking = {
        id: 'booking-123',
      }

      mockPrismaClient.customer.findUnique.mockResolvedValue(mockCustomer)
      mockPrismaClient.customer.update.mockResolvedValue(mockBooking)
      mockClerkClient.users.getUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: 'owner@example.com' }],
      })

      const { sendAppointmentConfirmation } = await import('@/action/mailer')
        ; (sendAppointmentConfirmation as any).mockResolvedValue({ success: true })

      const result = await onBookNewAppointment(
        'company-123',
        'customer-123',
        '10:00am',
        '2024-12-31T10:00:00Z',
        'juan@example.com'
      )

      expect(result?.status).toBe(200)
      expect(result?.message).toBe('Reunión reservada y confirmación enviada')
      expect(sendAppointmentConfirmation).toHaveBeenCalled()
    })

    it('debe retornar error si el cliente no existe', async () => {
      mockPrismaClient.customer.findUnique.mockResolvedValue(null)

      const result = await onBookNewAppointment(
        'company-123',
        'customer-123',
        '10:00am',
        '2024-12-31T10:00:00Z',
        'juan@example.com'
      )

      expect(result?.status).toBe(404)
      expect(result?.message).toBe('Cliente no encontrado')
    })

    it('debe manejar errores correctamente', async () => {
      mockPrismaClient.customer.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onBookNewAppointment(
        'company-123',
        'customer-123',
        '10:00am',
        '2024-12-31T10:00:00Z',
        'juan@example.com'
      )

      expect(result?.status).toBe(500)
    })
  })

  describe('onGetAllCompanyBookings', () => {
    it('debe obtener todas las citas de un dominio', async () => {
      const mockBookings = [
        {
          slot: '10:00am',
          date: new Date('2024-12-31'),
        },
        {
          slot: '11:00am',
          date: new Date('2024-12-31'),
        },
      ]

      mockPrismaClient.bookings.findMany.mockResolvedValue(mockBookings)

      const result = await onGetAllCompanyBookings('company-123')

      expect(result).toEqual(mockBookings)
      expect(mockPrismaClient.bookings.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-123' },
        select: {
          slot: true,
          date: true,
        },
      })
    })
  })

  describe('onGetAvailableTimeSlotsForDay', () => {
    it('debe obtener slots disponibles para un día', async () => {
      const mockSchedule = {
        timeSlots: ['9:00am', '9:30am', '10:00am'],
        isActive: true,
      }

      mockPrismaClient.availabilitySchedule.findUnique.mockResolvedValue(
        mockSchedule
      )

      const date = new Date('2024-12-31')
      const result = await onGetAvailableTimeSlotsForDay('company-123', date)

      expect(result?.status).toBe(200)
      expect(result?.timeSlots).toEqual(['9:00am', '9:30am', '10:00am'])
    })

    it('debe retornar array vacío si no hay horarios configurados', async () => {
      mockPrismaClient.availabilitySchedule.findUnique.mockResolvedValue(null)

      const date = new Date('2024-12-31')
      const result = await onGetAvailableTimeSlotsForDay('company-123', date)

      expect(result?.status).toBe(200)
      expect(result?.timeSlots).toEqual([])
    })

    it('debe retornar array vacío si el horario está inactivo', async () => {
      const mockSchedule = {
        timeSlots: ['9:00am'],
        isActive: false,
      }

      mockPrismaClient.availabilitySchedule.findUnique.mockResolvedValue(
        mockSchedule
      )

      const date = new Date('2024-12-31')
      const result = await onGetAvailableTimeSlotsForDay('company-123', date)

      expect(result?.status).toBe(200)
      expect(result?.timeSlots).toEqual([])
    })
  })

  describe('onGetAllBookingsForCurrentUser', () => {
    it('debe obtener todas las citas del usuario actual', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          slot: '10:00am',
          date: new Date('2024-12-31'),
          email: 'customer@example.com',
          companyId: 'company-123',
          createdAt: new Date(),
          Customer: {
            name: 'Cliente 1',
            email: 'customer@example.com',
            Company: {
              name: 'Mi Empresa',
            },
          },
        },
      ]

      mockPrismaClient.bookings.findMany.mockResolvedValue(mockBookings)

      const result = await onGetAllBookingsForCurrentUser('clerk-123')

      expect(result?.bookings).toEqual(mockBookings)
    })

    it('debe retornar array vacío si no hay citas', async () => {
      mockPrismaClient.bookings.findMany.mockResolvedValue([])

      const result = await onGetAllBookingsForCurrentUser('clerk-123')

      expect(result?.bookings).toEqual([])
    })

    it('debe retornar array vacío si hay error', async () => {
      mockPrismaClient.bookings.findMany.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetAllBookingsForCurrentUser('clerk-123')

      expect(result?.bookings).toEqual([])
    })
  })

  describe('onCompanyCustomerResponses', () => {
    it('debe obtener las respuestas del cliente', async () => {
      const mockCustomer = {
        email: 'customer@example.com',
        questions: [
          {
            id: 'q-1',
            question: '¿Qué tipo de producto buscas?',
            answered: 'Telas',
          },
        ],
      }

      mockPrismaClient.customer.findUnique.mockResolvedValue(mockCustomer)

      const result = await onCompanyCustomerResponses('customer-123')

      expect(result).toEqual(mockCustomer)
    })

    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.customer.findUnique.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onCompanyCustomerResponses('customer-123')

      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('debe retornar undefined si no encuentra el cliente', async () => {
      mockPrismaClient.customer.findUnique.mockResolvedValue(null)

      const result = await onCompanyCustomerResponses('customer-123')

      expect(result).toBeUndefined()
    })
  })

  describe('saveAnswers', () => {
    it('debe guardar respuestas correctamente', async () => {
      const { saveAnswers } = await import('./index')
      const questions = {
        'q-1': 'Respuesta 1',
        'q-2': 'Respuesta 2',
      }

      mockPrismaClient.customer.update.mockResolvedValue({
        id: 'customer-123',
      })

      const result = await saveAnswers(questions as any, 'customer-123')

      expect(result?.status).toBe(200)
      expect(result?.messege).toBe('Respuestas actualizadas')
    })

    it('debe manejar errores correctamente', async () => {
      const { saveAnswers } = await import('./index')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      const questions = {
        'q-1': 'Respuesta 1',
      }

      mockPrismaClient.customer.update.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await saveAnswers(questions as any, 'customer-123')

      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })
  })

  describe('onGetAllCompanyBookings', () => {
    it('debe manejar errores correctamente', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockPrismaClient.bookings.findMany.mockRejectedValue(
        new Error('Error de BD')
      )

      const result = await onGetAllCompanyBookings('company-123')

      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })
  })
})

