'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doughnut, Bar, Pie } from 'react-chartjs-2'
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
import { CheckCircle2, Target, Star, Clock } from 'lucide-react'

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
        fr1_averageResponseTime: {
            averageResponseTime: number
            totalResponseTime: number
            totalMessages: number
            formattedTime: string
        } | null
        fr2_onTimePercentage: {
            percentage: number
            respondedOnTime: number
            totalMessages: number
        } | null
        fr3_firstInteractionRate: {
            firstInteractionRate: number
            firstInteractionCount: number
            followUpCount: number
            escalatedCount: number
            totalConversations: number
        } | null
        fr4_satisfactionAverage: {
            averageRating: number
            totalRatings: number
            positiveResponses: number
            satisfactionLevel: number
            distribution: {
                rating1: number
                rating2: number
                rating3: number
                rating4: number
                rating5: number
            }
        } | null
    } | null
}

const ResearchMetricsChart = ({ metrics }: Props) => {
    if (!metrics) return null

    const fr1 = metrics.fr1_averageResponseTime
    const fr2 = metrics.fr2_onTimePercentage
    const fr3 = metrics.fr3_firstInteractionRate
    const fr4 = metrics.fr4_satisfactionAverage

  // Datos para gráfico de mensajes respondidos (FR2)
  const messagesData = {
    labels: ['Respondidos', 'No respondidos'],
    datasets: [
      {
        data: [
          fr2?.respondedOnTime || 0,
          (fr2?.totalMessages || 0) - (fr2?.respondedOnTime || 0)
        ],
        backgroundColor: ['#10b981', '#f3f4f6'],
        borderWidth: 0
      }
    ]
  }

    const messagesOptions = {
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
                cornerRadius: 8
            }
        }
    }

  // Datos para gráfico de resolución (FR3)
  const resolutionData = {
    labels: ['1ra Interacción', 'Con Seguimiento', 'Escaladas'],
    datasets: [
      {
        label: 'Casos',
        data: [
          fr3?.firstInteractionCount || 0,
          fr3?.followUpCount || 0,
          fr3?.escalatedCount || 0
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderRadius: 5,
        borderSkipped: false
      }
    ]
  }

    const resolutionOptions = {
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
                borderColor: 'rgba(16, 185, 129, 0.5)',
                borderWidth: 1,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    display: false
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 10
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
                        size: 10
                    }
                }
            }
        }
    }

    // Datos para gráfico de satisfacción (FR4)
    const satisfactionData = {
        labels: ['⭐ 1', '⭐ 2', '⭐ 3', '⭐ 4', '⭐ 5'],
        datasets: [
            {
                label: 'Calificaciones',
                data: [
                    fr4?.distribution.rating1 || 0,
                    fr4?.distribution.rating2 || 0,
                    fr4?.distribution.rating3 || 0,
                    fr4?.distribution.rating4 || 0,
                    fr4?.distribution.rating5 || 0
                ],
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
                borderRadius: 4,
                borderSkipped: false
            }
        ]
    }

    const satisfactionOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                padding: 12,
                borderColor: 'rgba(234, 179, 8, 0.5)',
                borderWidth: 1,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(229, 231, 235, 0.5)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 10
                    },
                    stepSize: 1
                }
            }
        }
    }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* FR1: Tiempo Promedio de Respuesta */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900">Tiempo Promedio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{fr1?.formattedTime || '0 segundos'}</p>
              <p className="text-xs text-gray-500">Tiempo de respuesta</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-600">Total mensajes</p>
                <p className="text-lg font-bold text-gray-900">{fr1?.totalMessages || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FR2: Mensajes Respondidos */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900">Mensajes Respondidos</CardTitle>
          </div>
        </CardHeader>
                <CardContent>
                    <div className="space-y-4">
            <div className="text-center">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{fr2?.percentage.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">En menos de 2 horas</p>
            </div>
                        <div style={{ height: '150px' }}>
                            <Doughnut data={messagesData} options={messagesOptions} />
                        </div>
            <div className="text-center text-xs text-gray-600">
              {fr2?.respondedOnTime || 0} de {fr2?.totalMessages || 0} mensajes
            </div>
                    </div>
                </CardContent>
            </Card>

      {/* FR3: Resolución en Primera Interacción */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900">Resolución por Tipo</CardTitle>
          </div>
        </CardHeader>
                <CardContent>
                    <div className="space-y-4">
            <div className="text-center">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{fr3?.firstInteractionRate.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">En 1ra interacción</p>
            </div>
                        <div style={{ height: '150px' }}>
                            <Bar data={resolutionData} options={resolutionOptions} />
                        </div>
            <div className="text-center text-xs text-gray-600">
              Total: {fr3?.totalConversations || 0} casos
            </div>
                    </div>
                </CardContent>
            </Card>

      {/* FR4: Satisfacción del Cliente */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900">Distribución de Calificaciones</CardTitle>
          </div>
        </CardHeader>
                <CardContent>
                    <div className="space-y-4">
            <div className="text-center">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{fr4?.averageRating.toFixed(2) || 0}</p>
              <p className="text-xs text-gray-500">Promedio / 5.0</p>
            </div>
                        <div style={{ height: '150px' }}>
                            <Bar data={satisfactionData} options={satisfactionOptions} />
                        </div>
            <div className="text-center text-xs text-gray-600">
              {fr4?.totalRatings || 0} calificaciones recibidas
            </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default ResearchMetricsChart
