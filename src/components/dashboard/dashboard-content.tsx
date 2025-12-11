'use client'

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react'
import {
  onGetDashboardMetrics,
  onGetConversationStats,
  onGetWeeklyStats,
  onGetQualityMetrics
} from '@/action/dashboard'
import KPICards from '@/components/dashboard/kpi-cards'
import ConversationChart from '@/components/dashboard/conversation-chart'
import WeeklyStats from '@/components/dashboard/weekly-stats'
import BusinessMetrics from '@/components/dashboard/business-metrics'
import ResearchMetricsChart from '@/components/dashboard/research-metrics-chart'
import DateFilter, { DateRange } from '@/components/dashboard/date-filter'
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react'

type Props = {
  initialMetrics: Awaited<ReturnType<typeof onGetDashboardMetrics>>
  initialConversationStats: Awaited<ReturnType<typeof onGetConversationStats>>
  initialWeeklyStats: Awaited<ReturnType<typeof onGetWeeklyStats>>
  initialQualityMetrics: Awaited<ReturnType<typeof onGetQualityMetrics>>
}

// Función helper para comparar rangos de fechas
const areDateRangesEqual = (range1: DateRange | null, range2: DateRange | null): boolean => {
  if (!range1 && !range2) return true
  if (!range1 || !range2) return false
  return (
    range1.from.getTime() === range2.from.getTime() &&
    range1.to.getTime() === range2.to.getTime()
  )
}

const DashboardContent = ({
  initialMetrics,
  initialConversationStats,
  initialWeeklyStats,
  initialQualityMetrics
}: Props) => {
  const [isPending, startTransition] = useTransition()
  const [dateRange, setDateRange] = useState<DateRange>(null)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [conversationStats, setConversationStats] = useState(initialConversationStats)
  const [weeklyStats, setWeeklyStats] = useState(initialWeeklyStats)
  const [qualityMetrics, setQualityMetrics] = useState(initialQualityMetrics)

  // Cache de resultados para evitar peticiones duplicadas
  const cacheRef = useRef<Map<string, {
    metrics: typeof initialMetrics
    stats: typeof initialConversationStats
    weekly: typeof initialWeeklyStats
    quality: typeof initialQualityMetrics
  }>>(new Map())

  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Función para generar clave de caché
  const getCacheKey = useCallback((range: DateRange | null): string => {
    if (!range) return 'default'
    return `${range.from.getTime()}-${range.to.getTime()}`
  }, [])

  const handleDateChange = useCallback((range: DateRange, preset: string) => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Validar que el rango realmente cambió
    if (areDateRangesEqual(dateRange, range)) {
      return
    }

    setDateRange(range)

    // Generar clave de caché
    const cacheKey = getCacheKey(range)

    // Verificar si ya tenemos estos datos en caché
    const cachedData = cacheRef.current.get(cacheKey)
    if (cachedData) {
      setMetrics(cachedData.metrics)
      setConversationStats(cachedData.stats)
      setWeeklyStats(cachedData.weekly)
      setQualityMetrics(cachedData.quality)
      return
    }

    // Debounce: esperar 300ms antes de hacer la petición
    debounceTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const [newMetrics, newStats, newWeekly, newQuality] = await Promise.all([
            onGetDashboardMetrics(range || undefined),
            onGetConversationStats(range || undefined),
            onGetWeeklyStats(range || undefined),
            onGetQualityMetrics(range || undefined)
          ])

          // Guardar en caché
          if (newMetrics && newStats && newWeekly && newQuality) {
            cacheRef.current.set(cacheKey, {
              metrics: newMetrics,
              stats: newStats,
              weekly: newWeekly,
              quality: newQuality
            })

            // Limitar el tamaño del caché a 10 entradas
            if (cacheRef.current.size > 10) {
              const firstKey = cacheRef.current.keys().next().value
              cacheRef.current.delete(firstKey)
            }
          }

          setMetrics(newMetrics)
          setConversationStats(newStats)
          setWeeklyStats(newWeekly)
          setQualityMetrics(newQuality)
        } catch (error) {
          console.error('Error al cargar datos del dashboard:', error)
        }
      })
    }, 300)
  }, [dateRange, getCacheKey])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Memoizar los datos de negocio para evitar recálculos innecesarios
  const businessMetricsData = useMemo(() => {
    if (!metrics) return null
    return {
      conversionRate: metrics.conversionRate || 0,
      aiEfficiency: metrics.aiEfficiency || 0,
      totalConversationsLastMonth: metrics.totalConversationsLastMonth || 0,
      customersWithBookings: metrics.customersWithBookings || 0
    }
  }, [metrics])

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header con Filtro de Fechas */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {dateRange
                  ? `${dateRange.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - ${dateRange.to.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Últimos 30 días'
                }
              </p>
            </div>
          </div>

          {/* Filtro de Fechas */}
          <div className="w-full">
            <DateFilter onDateChange={handleDateChange} defaultPreset="last30" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-6">

        {/* Loading Overlay */}
        {isPending && (
          <div className="fixed inset-0 bg-black/5 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
              <span className="text-sm font-medium text-gray-900">Actualizando datos...</span>
            </div>
          </div>
        )}

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
            <BusinessMetrics metrics={businessMetricsData} />
          </div>
        </section>

        {/* SECCIÓN 3: Resumen Semanal */}
        <section className="space-y-3 sm:space-y-4 py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Resumen del Período</h2>
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
    </div>
  )
}

export default DashboardContent

