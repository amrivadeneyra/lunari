import React from 'react'
import { currentUser } from '@clerk/nextjs'
import {
  onGetDashboardMetrics,
  onGetConversationStats,
  onGetWeeklyStats,
  onGetQualityMetrics
} from '@/action/dashboard'
import DashboardContent from '@/components/dashboard/dashboard-content'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {}

const DashboardPage = async (props: Props) => {
  const user = await currentUser()

  if (!user) return null

  // Obtener todos los datos en paralelo (datos iniciales con último mes por defecto)
  const defaultDateRange = {
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    to: new Date()
  }

  const [metrics, conversationStats, weeklyStats, qualityMetrics] =
    await Promise.all([
      onGetDashboardMetrics(defaultDateRange),
      onGetConversationStats(defaultDateRange),
      onGetWeeklyStats(defaultDateRange),
      onGetQualityMetrics(defaultDateRange)
    ])

  return (
    <DashboardContent
      initialMetrics={metrics}
      initialConversationStats={conversationStats}
      initialWeeklyStats={weeklyStats}
      initialQualityMetrics={qualityMetrics}
    />
  )
}

export default DashboardPage
