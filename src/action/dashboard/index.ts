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
export const onGetDashboardMetrics = async (dateRange?: { from: Date; to: Date }) => {
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
        const activeConversationsWhere: any = {
            Customer: { companyId },
            live: false,
        }

        if (dateRange) {
            activeConversationsWhere.updatedAt = {
                gte: dateRange.from,
                lte: dateRange.to
            }
        } else {
            activeConversationsWhere.updatedAt = {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas por defecto
            }
        }

        const activeConversations = await client.conversation.count({
            where: activeConversationsWhere
        })

        // Citas (filtradas por fecha si se proporciona)
        let appointmentsWhere: any = { companyId }

        if (dateRange) {
            appointmentsWhere.date = {
                gte: dateRange.from,
                lte: dateRange.to
            }
        } else {
            // Por defecto: citas de hoy
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            appointmentsWhere.date = {
                gte: today,
                lt: tomorrow
            }
        }

        const todayAppointments = await client.bookings.count({
            where: appointmentsWhere
        })

        // Chats en tiempo real (urgentes)
        const urgentChats = await client.conversation.count({
            where: {
                Customer: { companyId },
                live: true
            }
        })

        // Nuevos clientes (filtrados por fecha si se proporciona)
        let newCustomersWhere: any = { companyId }

        if (dateRange) {
            newCustomersWhere.createdAt = {
                gte: dateRange.from,
                lte: dateRange.to
            }
        } else {
            // Por defecto: esta semana
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            newCustomersWhere.createdAt = {
                gte: oneWeekAgo
            }
        }

        const newCustomersThisWeek = await client.customer.count({
            where: newCustomersWhere
        })

        // Calcular tasa de conversión: conversaciones que resultaron en citas
        // Buscar clientes que tienen conversaciones Y citas agendadas
        const rangeStart = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const rangeEnd = dateRange?.to || new Date()

        const totalConversationsLastMonth = await client.conversation.count({
            where: {
                Customer: { companyId },
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
            }
        })

        const customersWithBookings = await client.customer.findMany({
            where: {
                companyId,
                booking: {
                    some: {
                        createdAt: {
                            gte: rangeStart,
                            lte: rangeEnd
                        }
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
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
            }
        })

        const totalEscalated = await client.conversation.count({
            where: {
                Customer: { companyId },
                resolutionType: 'ESCALATED',
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
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
export const onGetConversationStats = async (dateRange?: { from: Date; to: Date }) => {
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

        // Calcular rango de fechas
        const startDate = dateRange?.from || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        const endDate = dateRange?.to || new Date()

        // Calcular días entre fechas (máximo 90 días para no sobrecargar)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysToShow = Math.min(daysDiff, 90)

        const stats: Array<{ date: string; count: number }> = []

        // Si el rango es muy grande, agrupar por semanas o meses
        const interval = daysToShow > 60 ? 7 : daysToShow > 30 ? 3 : 1

        for (let i = daysToShow; i >= 0; i -= interval) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + (daysToShow - i))
            date.setHours(0, 0, 0, 0)
            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + interval)

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
export const onGetWeeklyStats = async (dateRange?: { from: Date; to: Date }) => {
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

        const rangeStart = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const rangeEnd = dateRange?.to || new Date()

        // Nuevos clientes
        const newCustomers = await client.customer.count({
            where: {
                companyId,
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
            }
        })

        // Total de conversaciones
        const totalConversations = await client.conversation.count({
            where: {
                Customer: { companyId },
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
            }
        })

        // Citas agendadas
        const bookingsScheduled = await client.bookings.count({
            where: {
                companyId,
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
            }
        })

        // Total de mensajes
        const totalMessages = await client.chatMessage.count({
            where: {
                Conversation: {
                    Customer: { companyId }
                },
                createdAt: {
                    gte: rangeStart,
                    lte: rangeEnd
                }
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
export const onGetQualityMetrics = async (dateRange?: { from: Date; to: Date }) => {
    try {
        const metrics = await getQualityMetricsSummary(dateRange)
        return metrics
    } catch (error) {
        console.log('Error en onGetQualityMetrics:', error)
        return null
    }
}

