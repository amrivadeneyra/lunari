'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bot, Target } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

type Props = {
  metrics: {
    conversionRate: number
    aiEfficiency: number
    totalConversationsLastMonth: number
    customersWithBookings: number
  } | null
}

const BusinessMetrics = ({ metrics }: Props) => {
  if (!metrics) return null

  // Datos para el gráfico de conversión (Doughnut)
  const conversionData = {
    labels: ['Con citas', 'Sin citas'],
    datasets: [
      {
        data: [
          metrics.customersWithBookings,
          metrics.totalConversationsLastMonth - metrics.customersWithBookings
        ],
        backgroundColor: ['#10b981', '#f3f4f6'],
        borderWidth: 0,
        cutout: '75%'
      }
    ]
  }

  const conversionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        padding: 12,
        borderColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    }
  }

  // Datos para el gráfico de eficiencia (Bar horizontal)
  const efficiencyData = {
    labels: ['Resuelto por IA', 'Escalado a humano'],
    datasets: [
      {
        label: 'Porcentaje',
        data: [metrics.aiEfficiency, 100 - metrics.aiEfficiency],
        backgroundColor: ['#4f46e5', '#f59e0b'],
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  }

  const efficiencyOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        padding: 12,
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.x.toFixed(1)}%`
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          callback: function (value: any) {
            return value + '%'
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          }
        }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Tasa de Conversión */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">Tasa de Conversión</CardTitle>
                <p className="text-xs text-gray-500">Conversaciones → Citas</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{metrics.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div style={{ height: '200px' }}>
              <Doughnut data={conversionData} options={conversionOptions} />
            </div>

            <div className="space-y-2">
              <Progress value={metrics.conversionRate} className="h-3" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
                  {metrics.customersWithBookings} con citas
                </span>
                <span className="text-gray-900 font-semibold">
                  {metrics.totalConversationsLastMonth} conversaciones
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eficiencia del Asistente */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">Eficiencia del Asistente</CardTitle>
                <p className="text-xs text-gray-500">IA vs Escalado</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-indigo-600">{metrics.aiEfficiency.toFixed(1)}%</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div style={{ height: '200px' }}>
              <Bar data={efficiencyData} options={efficiencyOptions} />
            </div>

            <div className="space-y-2">
              <Progress value={metrics.aiEfficiency} className="h-3" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></span>
                  Resuelto por IA: {metrics.aiEfficiency.toFixed(1)}%
                </span>
                <span className="text-amber-600 font-medium">
                  Escalado: {(100 - metrics.aiEfficiency).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BusinessMetrics
