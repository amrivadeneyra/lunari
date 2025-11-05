/**
 * Tests para server actions de dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    onGetUserInfo,
    onGetDashboardMetrics,
    onGetUrgentChats,
    onGetUpcomingAppointments,
    onGetRecentActivity,
    onGetConversationStats,
    onGetWeeklyStats,
    onGetQualityMetrics,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'

import { mockCurrentUser } from '@/test/mocks/clerk'

// Mock de getQualityMetricsSummary
vi.mock('../metrics', () => ({
    getQualityMetricsSummary: vi.fn(),
}))

describe('Dashboard Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentUser.mockResolvedValue({
            id: 'clerk-123',
        })
        mockPrismaClient.user.findUnique.mockResolvedValue({
            domains: [{ id: 'domain-123' }],
        })
    })

    describe('onGetUserInfo', () => {
        it('debe obtener información del usuario', async () => {
            const mockUser = {
                fullname: 'Juan Pérez',
                type: 'business',
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)

            const result = await onGetUserInfo()

            expect(result).toEqual(mockUser)
        })

        it('debe retornar null si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onGetUserInfo()

            expect(result).toBeNull()
        })
    })

    describe('onGetDashboardMetrics', () => {
        it('debe obtener métricas del dashboard', async () => {
            mockPrismaClient.customer.count.mockResolvedValue(100)
            mockPrismaClient.chatRoom.count.mockResolvedValue(50)
            mockPrismaClient.bookings.count.mockResolvedValue(10)

            const result = await onGetDashboardMetrics()

            expect(result?.totalCustomers).toBe(100)
            expect(result?.activeConversations).toBe(50)
            expect(result?.todayAppointments).toBe(10)
        })

        it('debe retornar null si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onGetDashboardMetrics()

            expect(result).toBeNull()
        })
    })

    describe('onGetUrgentChats', () => {
        it('debe obtener chats urgentes', async () => {
            const mockChats = [
                {
                    id: 'chat-1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    Customer: {
                        id: 'customer-1',
                        name: 'Cliente 1',
                        email: 'customer@example.com',
                    },
                    message: [
                        {
                            message: 'Mensaje urgente',
                            createdAt: new Date(),
                            role: 'user',
                        },
                    ],
                },
            ]

            mockPrismaClient.chatRoom.findMany.mockResolvedValue(mockChats)

            const result = await onGetUrgentChats()

            expect(result).toEqual(mockChats)
            expect(mockPrismaClient.chatRoom.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        live: true,
                    }),
                })
            )
        })

        it('debe retornar array vacío si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onGetUrgentChats()

            expect(result).toEqual([])
        })
    })

    describe('onGetUpcomingAppointments', () => {
        it('debe obtener próximas citas', async () => {
            const mockAppointments = [
                {
                    id: 'booking-1',
                    date: new Date('2024-12-31'),
                    slot: '10:00am',
                    email: 'customer@example.com',
                    createdAt: new Date(),
                    Customer: {
                        name: 'Cliente 1',
                        email: 'customer@example.com',
                    },
                },
            ]

            mockPrismaClient.bookings.findMany.mockResolvedValue(mockAppointments)

            const result = await onGetUpcomingAppointments()

            expect(result).toEqual(mockAppointments)
        })

        it('debe filtrar solo citas futuras', async () => {
            mockPrismaClient.bookings.findMany.mockResolvedValue([])

            await onGetUpcomingAppointments()

            expect(mockPrismaClient.bookings.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: expect.any(Object),
                    }),
                })
            )
        })
    })

    describe('onGetRecentActivity', () => {
        it('debe obtener actividad reciente', async () => {
            const mockChats = [
                {
                    id: 'chat-1',
                    createdAt: new Date(),
                    Customer: {
                        name: 'Cliente 1',
                        email: 'customer@example.com',
                    },
                },
            ]

            const mockBookings = [
                {
                    id: 'booking-1',
                    createdAt: new Date(),
                    date: new Date(),
                    slot: '10:00am',
                    email: 'customer@example.com',
                    Customer: {
                        name: 'Cliente 1',
                        email: 'customer@example.com',
                    },
                },
            ]

            mockPrismaClient.chatRoom.findMany.mockResolvedValue(mockChats)
            mockPrismaClient.bookings.findMany.mockResolvedValue(mockBookings)

            const result = await onGetRecentActivity()

            expect(result.length).toBeGreaterThan(0)
            expect(result[0]).toHaveProperty('type')
            expect(result[0]).toHaveProperty('date')
        })
    })

    describe('onGetConversationStats', () => {
        it('debe obtener estadísticas de conversaciones', async () => {
            mockPrismaClient.chatRoom.count.mockResolvedValue(5)

            const result = await onGetConversationStats()

            expect(result).toHaveLength(7)
            expect(result[0]).toHaveProperty('date')
            expect(result[0]).toHaveProperty('count')
        })
    })

    describe('onGetWeeklyStats', () => {
        it('debe obtener estadísticas semanales', async () => {
            mockPrismaClient.customer.count.mockResolvedValue(10)
            mockPrismaClient.chatRoom.count.mockResolvedValue(20)
            mockPrismaClient.bookings.count.mockResolvedValue(5)
            mockPrismaClient.chatMessage.count.mockResolvedValue(100)

            const result = await onGetWeeklyStats()

            expect(result?.newCustomers).toBe(10)
            expect(result?.totalConversations).toBe(20)
            expect(result?.bookingsScheduled).toBe(5)
            expect(result?.totalMessages).toBe(100)
        })
    })

    describe('onGetQualityMetrics', () => {
        it('debe obtener métricas de calidad', async () => {
            const { getQualityMetricsSummary } = await import('../metrics')
            const mockMetrics = {
                fr1_averageResponseTime: { averageResponseTime: 30 },
                fr2_onTimePercentage: { percentage: 80 },
                fr3_firstInteractionRate: { firstInteractionRate: 70 },
                fr4_satisfactionAverage: { averageRating: 4.5 },
            }

                ; (getQualityMetricsSummary as any).mockResolvedValue(mockMetrics)

            const result = await onGetQualityMetrics()

            expect(result).toEqual(mockMetrics)
        })
    })
})

