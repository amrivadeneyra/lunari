import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TrendingUp, Users, MessageSquare, Calendar, Zap } from 'lucide-react'

type Props = {
  stats: {
    newCustomers: number
    totalConversations: number
    bookingsScheduled: number
    totalMessages: number
  } | null
}

const WeeklyStats = ({ stats }: Props) => {
  if (!stats) return null

  const statsData = [
    {
      label: 'Nuevos Clientes',
      value: stats.newCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Conversaciones',
      value: stats.totalConversations,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Citas Agendadas',
      value: stats.bookingsScheduled,
      icon: Calendar,
      color: 'text-orange',
      bgColor: 'bg-peach'
    },
    {
      label: 'Mensajes Totales',
      value: stats.totalMessages,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <Card className="border border-gray-200 shadow-md bg-white">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Estadísticas de la Semana</h3>
            <p className="text-xs text-gray-500">Resumen de los últimos 7 días</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100 hover:shadow-md transition-all duration-200`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`${stat.bgColor} rounded-lg p-2.5`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="w-full">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyStats

