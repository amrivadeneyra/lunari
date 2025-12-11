'use server'

import { client } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs"
import { getQualityMetricsSummary } from "@/action/metrics"

// Obtener información del usuario
export const onGetUserInfo = async () => {
    try {
        const user = await currentUser()
        if (!user) return null

        const userInfo = await client.user.findUnique({
            where: {
                clerkId: user.id
            },
            select: {
                fullname: true,
                type: true
            }
        })

        return userInfo
    } catch (error) {
        console.log('Error en onGetUserInfo:', error)
        return null
    }
}

// Obtener métricas generales del dashboard
export const onGetDashboardMetrics = async () => {
    try {
        const user = await currentUser()
        if (!user) return null

        // Obtener el dominio del usuario
        const userCompany = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true },
                }
            }
        })

        if (!userCompany?.company) return null

        const companyId = userCompany.company.id

        // Total de clientes
        const totalCustomers = await client.customer.count({
            where: { companyId }
        })

        // Conversaciones activas (chats con mensajes recientes)
        const activeConversations = await client.conversation.count({
            where: {
                Customer: { companyId },
                live: false,
                updatedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
                }
            }
        })

        // Citas de hoy
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayAppointments = await client.bookings.count({
            where: {
                companyId,
                date: {
                    gte: today,
                    lt: tomorrow
                }
            }
        })

        // Chats en tiempo real (urgentes)
        const urgentChats = await client.conversation.count({
            where: {
                Customer: { companyId },
                live: true
            }
        })

        // Nuevos clientes esta semana
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const newCustomersThisWeek = await client.customer.count({
            where: {
                companyId,
                createdAt: {
                    gte: oneWeekAgo
                }
            }
        })

        // Calcular tasa de conversión: conversaciones que resultaron en citas
        // Buscar clientes que tienen conversaciones Y citas agendadas
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const totalConversationsLastMonth = await client.conversation.count({
            where: {
                Customer: { companyId },
                createdAt: { gte: oneMonthAgo }
            }
        })

        const customersWithBookings = await client.customer.findMany({
            where: {
                companyId,
                booking: {
                    some: {
                        createdAt: { gte: oneMonthAgo }
                    }
                }
            },
            select: { id: true }
        })

        const conversionRate = totalConversationsLastMonth > 0
            ? (customersWithBookings.length / totalConversationsLastMonth) * 100
            : 0

        // Calcular eficiencia del asistente: % resuelto por IA vs escalado
        const totalResolvedByAI = await client.conversation.count({
            where: {
                Customer: { companyId },
                resolutionType: { in: ['FIRST_INTERACTION', 'FOLLOW_UP'] },
                createdAt: { gte: oneMonthAgo }
            }
        })

        const totalEscalated = await client.conversation.count({
            where: {
                Customer: { companyId },
                resolutionType: 'ESCALATED',
                createdAt: { gte: oneMonthAgo }
            }
        })

        const totalResolved = totalResolvedByAI + totalEscalated
        const aiEfficiency = totalResolved > 0
            ? (totalResolvedByAI / totalResolved) * 100
            : 0

        return {
            totalCustomers,
            activeConversations,
            todayAppointments,
            urgentChats,
            newCustomersThisWeek,
            conversionRate: Math.round(conversionRate * 100) / 100,
            aiEfficiency: Math.round(aiEfficiency * 100) / 100,
            totalConversationsLastMonth,
            customersWithBookings: customersWithBookings.length
        }
    } catch (error) {
        console.log('Error en onGetDashboardMetrics:', error)
        return null
    }
}

// Obtener datos para el gráfico de conversaciones
export const onGetConversationStats = async () => {
    try {
        const user = await currentUser()
        if (!user) return []

        const userCompany = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true },
                }
            }
        })

        if (!userCompany?.company) return []

        const companyId = userCompany.company.id

        // Últimos 30 días
        const stats: Array<{ date: string; count: number }> = []
        for (let i = 29; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)

            const count = await client.conversation.count({
                where: {
                    Customer: { companyId },
                    createdAt: {
                        gte: date,
                        lt: nextDate
                    }
                }
            })

            stats.push({
                date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                count
            })
        }

        return stats
    } catch (error) {
        console.log('Error en onGetConversationStats:', error)
        return []
    }
}

// Obtener estadísticas de la semana
export const onGetWeeklyStats = async () => {
    try {
        const user = await currentUser()
        if (!user) return null

        const userCompany = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true },
                }
            }
        })

        if (!userCompany?.company) return null

        const companyId = userCompany.company.id
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        // Nuevos clientes
        const newCustomers = await client.customer.count({
            where: {
                companyId,
                createdAt: { gte: oneWeekAgo }
            }
        })

        // Total de conversaciones
        const totalConversations = await client.conversation.count({
            where: {
                Customer: { companyId },
                createdAt: { gte: oneWeekAgo }
            }
        })

        // Citas agendadas
        const bookingsScheduled = await client.bookings.count({
            where: {
                companyId,
                createdAt: { gte: oneWeekAgo }
            }
        })

        // Total de mensajes
        const totalMessages = await client.chatMessage.count({
            where: {
                Conversation: {
                    Customer: { companyId }
                },
                createdAt: { gte: oneWeekAgo }
            }
        })

        return {
            newCustomers,
            totalConversations,
            bookingsScheduled,
            totalMessages
        }
    } catch (error) {
        console.log('Error en onGetWeeklyStats:', error)
        return null
    }
}

// Obtener métricas de calidad para la tesis (FR1, FR2, FR3, FR4)
export const onGetQualityMetrics = async () => {
    try {
        const metrics = await getQualityMetricsSummary()
        return metrics
    } catch (error) {
        console.log('Error en onGetQualityMetrics:', error)
        return null
    }
}

