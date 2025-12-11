'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, Target, Star, TrendingUp, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

type QualityMetrics = {
    fr1_averageResponseTime: {
        averageResponseTime: number
        totalResponseTime: number
        totalMessages: number
        totalConversations: number
        formattedTime: string
    } | null
    fr2_onTimePercentage: {
        percentage: number
        respondedOnTime: number
        totalMessages: number
        notRespondedOnTime: number
    } | null
    fr3_firstInteractionRate: {
        firstInteractionRate: number
        firstInteractionCount: number
        followUpCount: number
        escalatedCount: number
        unresolvedCount: number
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
        percentages: {
            rating1: number
            rating2: number
            rating3: number
            rating4: number
            rating5: number
        }
    } | null
} | null

type Props = {
    metrics: QualityMetrics
}

const ResearchMetrics = ({ metrics }: Props) => {
    if (!metrics) {
        return (
            <Card className="border-porcelain shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gravel">
                        Indicadores de Investigación
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-ironside">
                        <p>No hay datos disponibles para mostrar los indicadores de investigación.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // INDICADOR 1: Tiempo Promedio de Respuesta al Cliente
    const indicator1 = metrics.fr1_averageResponseTime
    const STR = indicator1?.totalResponseTime || 0 // Sumatoria de Tiempo respuesta por interacción
    const TMR = indicator1?.totalMessages || 0 // Número total de mensajes recibidos
    const TPR = indicator1?.averageResponseTime || 0 // Tiempo promedio de respuesta (en segundos)
    const TPRFormatted = indicator1?.formattedTime || '0 segundos'

    // INDICADOR 2: Porcentaje de Mensajes Respondidos
    const indicator2 = metrics.fr2_onTimePercentage
    const NMR = indicator2?.respondedOnTime || 0 // Número de mensajes respondidos (< 2 horas)
    const TMR2 = indicator2?.totalMessages || 0 // Número total de mensajes recibidos
    const PMR = indicator2?.percentage || 0 // Porcentaje de mensajes respondidos

    // INDICADOR 3: Tasa de Resolución en la Primera Interacción
    const indicator3 = metrics.fr3_firstInteractionRate
    const TCA = indicator3?.totalConversations || 0 // Número total de casos atendidos
    const CRPI = indicator3?.firstInteractionCount || 0 // Número de casos resueltos en la primera interacción
    const TRPI = indicator3?.firstInteractionRate || 0 // Tasa de resolución en la primera interacción

    // INDICADOR 4: Nivel de Satisfacción del Cliente
    const indicator4 = metrics.fr4_satisfactionAverage
    const NTR = indicator4?.totalRatings || 0 // Número total de respuestas
    const NRP = indicator4?.positiveResponses || 0 // Número de respuestas positivas (4 y 5)
    const NSC = indicator4?.satisfactionLevel || 0 // Nivel de satisfacción del cliente
    const averageRating = indicator4?.averageRating || 0
    const distribution = indicator4?.distribution || {
        rating1: 0,
        rating2: 0,
        rating3: 0,
        rating4: 0,
        rating5: 0
    }

    // Función para obtener el color según el valor
    const getColorForPercentage = (value: number) => {
        if (value >= 80) return 'text-green-600'
        if (value >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getBgColorForPercentage = (value: number) => {
        if (value >= 80) return 'bg-green-50'
        if (value >= 60) return 'bg-yellow-50'
        return 'bg-red-50'
    }

    const getColorForRating = (rating: number) => {
        if (rating >= 4) return 'text-green-600'
        if (rating >= 3) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <Card className="border-porcelain shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange to-orange/70 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-gravel">
                            Indicadores de Investigación
                        </CardTitle>
                        <p className="text-xs text-ironside mt-1">
                            Métricas del proceso de atención al cliente
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* INDICADOR 1: Tiempo Promedio de Respuesta al Cliente */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gravel text-sm">
                                    Indicador 1: Tiempo Promedio de Respuesta al Cliente
                                </h4>
                                <p className="text-xs text-ironside">Fórmula: TPR = STR / TMR</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {TPRFormatted}
                        </Badge>
                    </div>
                    <div className="pl-10 space-y-2 bg-blue-50/30 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                                <span className="text-ironside font-medium">STR:</span>
                                <span className="ml-2 font-semibold text-gravel">{STR.toLocaleString()}</span>
                                <p className="text-xs text-ironside mt-0.5">Sumatoria de Tiempo respuesta</p>
                            </div>
                            <div>
                                <span className="text-ironside font-medium">TMR:</span>
                                <span className="ml-2 font-semibold text-gravel">{TMR}</span>
                                <p className="text-xs text-ironside mt-0.5">Total mensajes recibidos</p>
                            </div>
                            <div>
                                <span className="text-ironside font-medium">TPR:</span>
                                <span className="ml-2 font-semibold text-gravel">{TPRFormatted}</span>
                                <p className="text-xs text-ironside mt-0.5">Tiempo promedio</p>
                            </div>
                        </div>
                        {TMR === 0 && (
                            <div className="flex items-center gap-2 text-xs text-yellow-600 mt-2">
                                <AlertCircle className="w-3 h-3" />
                                <span>No hay suficientes datos para calcular este indicador</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-porcelain to-transparent" />

                {/* INDICADOR 2: Porcentaje de Mensajes Respondidos */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gravel text-sm">
                                    Indicador 2: Porcentaje de Mensajes Respondidos
                                </h4>
                                <p className="text-xs text-ironside">Fórmula: PMR = (NMR / TMR) × 100</p>
                            </div>
                        </div>
                        <Badge
                            variant="outline"
                            className={`${getBgColorForPercentage(PMR)} ${getColorForPercentage(PMR)} border-current`}
                        >
                            {PMR.toFixed(2)}%
                        </Badge>
                    </div>
                    <div className="pl-10 space-y-2">
                        <Progress value={PMR} className="h-2" />
                        <div className="bg-green-50/30 rounded-lg p-3">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-ironside font-medium">NMR:</span>
                                    <span className="ml-2 font-semibold text-green-600">{NMR}</span>
                                    <p className="text-xs text-ironside mt-0.5">Mensajes respondidos (&lt;2h)</p>
                                </div>
                                <div>
                                    <span className="text-ironside font-medium">TMR:</span>
                                    <span className="ml-2 font-semibold text-gravel">{TMR2}</span>
                                    <p className="text-xs text-ironside mt-0.5">Total mensajes recibidos</p>
                                </div>
                                <div>
                                    <span className="text-ironside font-medium">PMR:</span>
                                    <span className="ml-2 font-semibold text-gravel">{PMR.toFixed(2)}%</span>
                                    <p className="text-xs text-ironside mt-0.5">Porcentaje</p>
                                </div>
                            </div>
                        </div>
                        {TMR2 === 0 && (
                            <div className="flex items-center gap-2 text-xs text-yellow-600 mt-2">
                                <AlertCircle className="w-3 h-3" />
                                <span>No hay suficientes datos para calcular este indicador</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-porcelain to-transparent" />

                {/* INDICADOR 3: Tasa de Resolución en la Primera Interacción */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                <Target className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gravel text-sm">
                                    Indicador 3: Tasa de Resolución en la Primera Interacción
                                </h4>
                                <p className="text-xs text-ironside">Fórmula: TRPI = (CRPI / TCA) × 100</p>
                            </div>
                        </div>
                        <Badge
                            variant="outline"
                            className={`${getBgColorForPercentage(TRPI)} ${getColorForPercentage(TRPI)} border-current`}
                        >
                            {TRPI.toFixed(2)}%
                        </Badge>
                    </div>
                    <div className="pl-10 space-y-2">
                        <Progress value={TRPI} className="h-2" />
                        <div className="bg-purple-50/30 rounded-lg p-3">
                            <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                                <div>
                                    <span className="text-ironside font-medium">TCA:</span>
                                    <span className="ml-2 font-semibold text-gravel">{TCA}</span>
                                    <p className="text-xs text-ironside mt-0.5">Total casos atendidos</p>
                                </div>
                                <div>
                                    <span className="text-ironside font-medium">CRPI:</span>
                                    <span className="ml-2 font-semibold text-green-600">{CRPI}</span>
                                    <p className="text-xs text-ironside mt-0.5">Resueltos en 1ra interacción</p>
                                </div>
                                <div>
                                    <span className="text-ironside font-medium">TRPI:</span>
                                    <span className="ml-2 font-semibold text-gravel">{TRPI.toFixed(2)}%</span>
                                    <p className="text-xs text-ironside mt-0.5">Tasa de resolución</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-ironside">Con seguimiento:</span>
                                    <span className="font-semibold text-yellow-600">{indicator3?.followUpCount || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-ironside">Escaladas a humano:</span>
                                    <span className="font-semibold text-orange">{indicator3?.escalatedCount || 0}</span>
                                </div>
                            </div>
                        </div>
                        {TCA === 0 && (
                            <div className="flex items-center gap-2 text-xs text-yellow-600 mt-2">
                                <AlertCircle className="w-3 h-3" />
                                <span>No hay suficientes datos para calcular este indicador</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-porcelain to-transparent" />

                {/* INDICADOR 4: Nivel de Satisfacción del Cliente */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                                <Star className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gravel text-sm">
                                    Indicador 4: Nivel de Satisfacción del Cliente
                                </h4>
                                <p className="text-xs text-ironside">Fórmula: NSC = (NRP / NTR) × 100</p>
                            </div>
                        </div>
                        <Badge
                            variant="outline"
                            className={`${getBgColorForPercentage(NSC)} ${getColorForRating(averageRating)} border-current`}
                        >
                            {NSC.toFixed(2)}%
                        </Badge>
                    </div>
                    <div className="pl-10 space-y-3">
                        {/* Barra de progreso de satisfacción */}
                        <div className="space-y-2">
                            <Progress value={NSC} className="h-2" />
                            <div className="bg-yellow-50/30 rounded-lg p-3">
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <span className="text-ironside font-medium">NTR:</span>
                                        <span className="ml-2 font-semibold text-gravel">{NTR}</span>
                                        <p className="text-xs text-ironside mt-0.5">Total respuestas</p>
                                    </div>
                                    <div>
                                        <span className="text-ironside font-medium">NRP:</span>
                                        <span className="ml-2 font-semibold text-green-600">{NRP}</span>
                                        <p className="text-xs text-ironside mt-0.5">Respuestas positivas (4-5)</p>
                                    </div>
                                    <div>
                                        <span className="text-ironside font-medium">NSC:</span>
                                        <span className="ml-2 font-semibold text-gravel">{NSC.toFixed(2)}%</span>
                                        <p className="text-xs text-ironside mt-0.5">Nivel de satisfacción</p>
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-yellow-200">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-ironside">Calificación promedio:</span>
                                        <span className="font-semibold text-gravel">{averageRating.toFixed(2)} / 5.0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Distribución de calificaciones */}
                        {NTR > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gravel">Distribución de calificaciones:</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((rating) => {
                                        const count = distribution[`rating${rating}` as keyof typeof distribution] || 0
                                        const percentage = NTR > 0 ? (count / NTR) * 100 : 0
                                        return (
                                            <div key={rating} className="text-center bg-gray-50 rounded-lg p-2">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Star className={`w-3 h-3 ${rating >= 4 ? 'text-yellow-500 fill-yellow-500' : rating === 3 ? 'text-yellow-300' : 'text-gray-300'}`} />
                                                    <span className="text-xs font-semibold text-gravel">{rating}</span>
                                                </div>
                                                <div className="text-xs font-semibold text-ironside">{count}</div>
                                                <div className="text-xs text-ironside">({percentage.toFixed(0)}%)</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {NTR === 0 && (
                            <div className="flex items-center gap-2 text-xs text-yellow-600 mt-2">
                                <AlertCircle className="w-3 h-3" />
                                <span>No hay calificaciones disponibles aún</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default ResearchMetrics
