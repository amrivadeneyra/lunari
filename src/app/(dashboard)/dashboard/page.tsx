import React from 'react'
import { currentUser } from '@clerk/nextjs'
import {
  onGetDashboardMetrics,
  onGetConversationStats,
  onGetWeeklyStats,
  onGetUserInfo,
  onGetQualityMetrics
} from '@/action/dashboard'
import KPICards from '@/components/dashboard/kpi-cards'
import ConversationChart from '@/components/dashboard/conversation-chart'
import WeeklyStats from '@/components/dashboard/weekly-stats'
import BusinessMetrics from '@/components/dashboard/business-metrics'
import ResearchMetricsChart from '@/components/dashboard/research-metrics-chart'
import { Sparkles, TrendingUp, BarChart3 } from 'lucide-react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {}

const DashboardPage = async (props: Props) => {
  const user = await currentUser()

  if (!user) return null

  // Obtener todos los datos en paralelo
  const [userInfo, metrics, conversationStats, weeklyStats, qualityMetrics] =
    await Promise.all([
      onGetUserInfo(),
      onGetDashboardMetrics(),
      onGetConversationStats(),
      onGetWeeklyStats(),
      onGetQualityMetrics()
    ])

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50 p-3 sm:p-4 md:p-6 ml-0 md:ml-0">
      {/* Header Compacto */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              {userInfo?.fullname || 'Usuario'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Métricas Clave de Negocio */}
      <section className="space-y-3 sm:space-y-4 py-4 sm:py-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Métricas de Negocio</h2>
        </div>
        <KPICards metrics={metrics} />
      </section>

      {/* SECCIÓN 2: Análisis y Tendencias */}
      <section className="space-y-3 sm:space-y-4 py-4 sm:py-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Análisis y Tendencias</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ConversationChart stats={conversationStats} />
          <BusinessMetrics metrics={metrics ? {
            conversionRate: metrics.conversionRate || 0,
            aiEfficiency: metrics.aiEfficiency || 0,
            totalConversationsLastMonth: metrics.totalConversationsLastMonth || 0,
            customersWithBookings: metrics.customersWithBookings || 0
          } : null} />
        </div>
      </section>

      {/* SECCIÓN 3: Resumen Semanal */}
      <section className="space-y-3 sm:space-y-4 py-4 sm:py-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Resumen Semanal</h2>
        </div>
        <WeeklyStats stats={weeklyStats} />
      </section>

      {/* SECCIÓN 4: Indicadores de Investigación (Solo gráficos) */}
      <section className="space-y-3 sm:space-y-4 py-4 sm:py-6 border-t-2 border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Indicadores de Investigación</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Datos para tesis</span>
        </div>
        <ResearchMetricsChart metrics={qualityMetrics} />
      </section>

    </div>
  )
}

export default DashboardPage
