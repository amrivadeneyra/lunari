import { Card, CardContent } from '@/components/ui/card'
import { Users, MessageSquare, Calendar, AlertCircle, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Props = {
  metrics: {
    totalCustomers: number
    activeConversations: number
    todayAppointments: number
    urgentChats: number
    newCustomersThisWeek: number
    conversionRate?: number
    aiEfficiency?: number
  } | null
}

const KPICards = ({ metrics }: Props) => {
  if (!metrics) return null

  const cards = [
    {
      title: 'Total Clientes',
      value: metrics.totalCustomers,
      icon: Users,
      color: 'bg-blue-500',
      iconBg: 'bg-blue-50',
      subtitle: `+${metrics.newCustomersThisWeek} esta semana`,
      trendUp: true
    },
    {
      title: 'Conversaciones',
      value: metrics.activeConversations,
      icon: MessageSquare,
      color: 'bg-green-500',
      iconBg: 'bg-green-50',
      subtitle: 'Activas',
      trendUp: true
    },
    {
      title: 'Citas Hoy',
      value: metrics.todayAppointments,
      icon: Calendar,
      color: 'bg-orange',
      iconBg: 'bg-peach',
      subtitle: new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
      trendUp: false
    },
    {
      title: 'Urgentes',
      value: metrics.urgentChats,
      icon: AlertCircle,
      color: 'bg-red-500',
      iconBg: 'bg-red-50',
      subtitle: 'Requieren atención',
      urgent: metrics.urgentChats > 0,
      trendUp: false
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`relative overflow-hidden border shadow-md hover:shadow-lg transition-all duration-200 bg-white ${card.urgent
            ? 'border-red-300 ring-2 ring-red-200'
            : 'border-gray-200'
            }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  {card.title}
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {card.value}
                </h3>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 font-medium">{card.subtitle}</p>
                )}
              </div>
              <div className={`${card.iconBg} rounded-lg p-2.5 flex-shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </CardContent>

          {/* Borde inferior sutil */}
          <div className={`h-1 ${card.color} opacity-80`} />
        </Card>
      ))}
    </div>
  )
}

export default KPICards

