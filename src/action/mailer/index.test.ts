/**
 * Tests para server actions de email
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendEmail,
  sendAppointmentConfirmation,
  onMailer,
} from './index'

// Mock de nodemailer
const mockTransporter = {
  sendMail: vi.fn(),
}

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter),
  },
}))

describe('Mailer Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_MAILER_EMAIL = 'test@example.com'
    process.env.NODE_MAILER_GMAIL_APP_PASSWORD = 'test-password'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('sendEmail', () => {
    it('debe enviar email correctamente', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
        response: '250 OK',
      })

      const result = await sendEmail(
        'test@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
        'Test Text'
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')
      expect(mockTransporter.sendMail).toHaveBeenCalled()
    })

    it('debe enviar email a múltiples destinatarios', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
        response: '250 OK',
      })

      const result = await sendEmail(
        ['test1@example.com', 'test2@example.com'],
        'Test Subject',
        '<h1>Test HTML</h1>'
      )

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test1@example.com, test2@example.com',
        })
      )
    })

    it('debe manejar errores correctamente', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'))

      const result = await sendEmail(
        'test@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('debe generar texto plano desde HTML si no se proporciona', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
      })

      await sendEmail('test@example.com', 'Test', '<h1>Test</h1>')

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test',
        })
      )
    })
  })

  describe('sendAppointmentConfirmation', () => {
    it('debe enviar confirmación de cita al cliente', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
      })

      const result = await sendAppointmentConfirmation(
        'customer@example.com',
        'Juan Pérez',
        'lunes, 31 de diciembre de 2024',
        '10:00am',
        'Mi Empresa'
      )

      expect(result?.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: '📅 Cita Confirmada - Mi Empresa',
        })
      )
    })

    it('debe enviar notificación al propietario si se proporciona email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
      })

      await sendAppointmentConfirmation(
        'customer@example.com',
        'Juan Pérez',
        'lunes, 31 de diciembre de 2024',
        '10:00am',
        'Mi Empresa',
        'owner@example.com'
      )

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          subject: expect.stringContaining('Nueva Cita Reservada'),
        })
      )
    })
  })

  describe('onMailer', () => {
    it('debe enviar email de escalación correctamente', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
      })

      const result = await onMailer(
        'owner@example.com',
        'Juan Pérez',
        'customer@example.com'
      )

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          subject: '🚨 Cliente Solicita Atención Humana - Lunari AI',
        })
      )
    })

    it('debe manejar datos faltantes del cliente', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'msg-123',
      })

      const result = await onMailer('owner@example.com')

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalled()
    })

    it('debe manejar errores correctamente', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'))

      const result = await onMailer('owner@example.com', 'Juan', 'email@test.com')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

