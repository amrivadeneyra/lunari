'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { TrendingUp } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

type Props = {
  stats: Array<{
    date: string
    count: number
  }>
}

const ConversationChart = ({ stats }: Props) => {
  const totalConversations = stats.reduce((acc, curr) => acc + curr.count, 0)
  const average = stats.length > 0 ? (totalConversations / stats.length).toFixed(1) : 0

  const data = {
    labels: stats.map(stat => stat.date),
    datasets: [
      {
        label: 'Conversaciones',
        data: stats.map(stat => stat.count),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(37, 99, 235)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.y} ${context.parsed.y === 1 ? 'conversación' : 'conversaciones'}`
          }
        }
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
            size: 11
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
            size: 11
          },
          stepSize: 1
        }
      }
    }
  }

  return (
    <Card className="border border-gray-200 shadow-md bg-white">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">Conversaciones en el Tiempo</CardTitle>
              <p className="text-xs text-gray-500">Últimos 30 días</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalConversations}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {stats.length > 0 ? (
          <div className="space-y-4">
            <div style={{ height: '300px' }}>
              <Line data={data} options={options} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Promedio diario</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{average}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Días activos</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{stats.filter((s) => s.count > 0).length}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-blue-300" />
            </div>
            <p className="text-gravel font-medium mb-2">Sin datos disponibles</p>
            <p className="text-ironside text-xs">Los datos aparecerán cuando haya conversaciones</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConversationChart
