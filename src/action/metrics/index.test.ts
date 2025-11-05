/**
 * Tests para server actions de métricas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAverageResponseTime,
  getOnTimeResponsePercentage,
  getFirstInteractionResolutionRate,
  getCustomerSatisfactionAverage,
  getQualityMetricsSummary,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'

import { mockCurrentUser } from '@/test/mocks/clerk'

describe('Metrics Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
    })
    mockPrismaClient.user.findUnique.mockResolvedValue({
      domains: [{ id: 'domain-123' }],
    })
  })

  describe('getAverageResponseTime', () => {
    it('debe calcular el tiempo promedio de respuesta', async () => {
      const mockMetrics = [
        {
          averageResponseTime: 30,
          messagesCount: 10,
          totalResponseTime: 300,
        },
        {
          averageResponseTime: 45,
          messagesCount: 5,
          totalResponseTime: 225,
        },
      ]

      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue(
        mockMetrics
      )

      const result = await getAverageResponseTime()

      expect(result).toBeDefined()
      expect(result?.averageResponseTime).toBeGreaterThan(0)
      expect(result?.totalMessages).toBe(15)
      expect(result?.formattedTime).toBeDefined()
    })

    it('debe retornar valores por defecto si no hay métricas', async () => {
      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue([])

      const result = await getAverageResponseTime()

      expect(result?.averageResponseTime).toBe(0)
      expect(result?.totalConversations).toBe(0)
      expect(result?.formattedTime).toBe('0 segundos')
    })

    it('debe formatear el tiempo correctamente', async () => {
      const mockMetrics = [
        {
          averageResponseTime: 90,
          messagesCount: 1,
          totalResponseTime: 90,
        },
      ]

      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue(
        mockMetrics
      )

      const result = await getAverageResponseTime()

      expect(result?.formattedTime).toContain('minutos')
    })

    it('debe filtrar por rango de fechas', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      }

      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue([])

      await getAverageResponseTime(dateRange)

      expect(mockPrismaClient.conversationMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      )
    })
  })

  describe('getOnTimeResponsePercentage', () => {
    it('debe calcular el porcentaje de respuestas oportunas', async () => {
      const mockMetrics = [
        {
          messagesRespondedOnTime: 8,
          totalMessagesReceived: 10,
        },
        {
          messagesRespondedOnTime: 5,
          totalMessagesReceived: 10,
        },
      ]

      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue(
        mockMetrics
      )

      const result = await getOnTimeResponsePercentage()

      expect(result?.percentage).toBe(65)
      expect(result?.respondedOnTime).toBe(13)
      expect(result?.totalMessages).toBe(20)
    })

    it('debe retornar 0 si no hay métricas', async () => {
      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue([])

      const result = await getOnTimeResponsePercentage()

      expect(result?.percentage).toBe(0)
      expect(result?.respondedOnTime).toBe(0)
    })
  })

  describe('getFirstInteractionResolutionRate', () => {
    it('debe calcular la tasa de resolución en primera interacción', async () => {
      const mockChatRooms = [
        { resolutionType: 'FIRST_INTERACTION', resolvedInFirstInteraction: true },
        { resolutionType: 'FIRST_INTERACTION', resolvedInFirstInteraction: true },
        { resolutionType: 'FOLLOW_UP', resolvedInFirstInteraction: false },
        { resolutionType: 'ESCALATED', resolvedInFirstInteraction: false },
        { resolutionType: 'UNRESOLVED', resolvedInFirstInteraction: false },
      ]

      mockPrismaClient.chatRoom.findMany.mockResolvedValue(mockChatRooms)

      const result = await getFirstInteractionResolutionRate()

      expect(result?.firstInteractionRate).toBe(40)
      expect(result?.firstInteractionCount).toBe(2)
      expect(result?.followUpCount).toBe(1)
      expect(result?.escalatedCount).toBe(1)
      expect(result?.unresolvedCount).toBe(1)
      expect(result?.totalConversations).toBe(5)
    })

    it('debe retornar 0 si no hay conversaciones', async () => {
      mockPrismaClient.chatRoom.findMany.mockResolvedValue([])

      const result = await getFirstInteractionResolutionRate()

      expect(result?.firstInteractionRate).toBe(0)
      expect(result?.totalConversations).toBe(0)
    })
  })

  describe('getCustomerSatisfactionAverage', () => {
    it('debe calcular el promedio de satisfacción', async () => {
      const mockRatings = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
        { rating: 4 },
      ]

      mockPrismaClient.customerSatisfaction.findMany.mockResolvedValue(
        mockRatings
      )

      const result = await getCustomerSatisfactionAverage()

      expect(result?.averageRating).toBe(4.2)
      expect(result?.totalRatings).toBe(5)
      expect(result?.distribution.rating5).toBe(2)
      expect(result?.distribution.rating4).toBe(2)
      expect(result?.distribution.rating3).toBe(1)
    })

    it('debe calcular la distribución correctamente', async () => {
      const mockRatings = [
        { rating: 1 },
        { rating: 2 },
        { rating: 3 },
        { rating: 4 },
        { rating: 5 },
      ]

      mockPrismaClient.customerSatisfaction.findMany.mockResolvedValue(
        mockRatings
      )

      const result = await getCustomerSatisfactionAverage()

      expect(result?.percentages.rating1).toBe(20)
      expect(result?.percentages.rating2).toBe(20)
      expect(result?.percentages.rating3).toBe(20)
      expect(result?.percentages.rating4).toBe(20)
      expect(result?.percentages.rating5).toBe(20)
    })

    it('debe retornar 0 si no hay calificaciones', async () => {
      mockPrismaClient.customerSatisfaction.findMany.mockResolvedValue([])

      const result = await getCustomerSatisfactionAverage()

      expect(result?.averageRating).toBe(0)
      expect(result?.totalRatings).toBe(0)
    })
  })

  describe('getQualityMetricsSummary', () => {
    it('debe obtener todas las métricas consolidadas', async () => {
      mockPrismaClient.conversationMetrics.findMany.mockResolvedValue([])
      mockPrismaClient.chatRoom.findMany.mockResolvedValue([])
      mockPrismaClient.customerSatisfaction.findMany.mockResolvedValue([])

      const result = await getQualityMetricsSummary()

      expect(result).toBeDefined()
      expect(result?.fr1_averageResponseTime).toBeDefined()
      expect(result?.fr2_onTimePercentage).toBeDefined()
      expect(result?.fr3_firstInteractionRate).toBeDefined()
      expect(result?.fr4_satisfactionAverage).toBeDefined()
    })
  })
})

