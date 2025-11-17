'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { useRouter } from 'next/navigation'
import { getCustomerBookings } from '@/action/portal'
import { ReservationsList } from './reservations-list'
import { Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ReservationsPageClientProps {
    domainId: string
}

// Ref global para evitar múltiples peticiones simultáneas (persiste entre montajes)
const globalLoadingRef = new Map<string, boolean>()

export function ReservationsPageClient({ domainId }: ReservationsPageClientProps) {
    const { sessionData, isAuthenticated } = useChatSession()
    const router = useRouter()
    const [bookingsData, setBookingsData] = useState<{ bookings: any[], reservationsWithoutBooking: any[] }>({ bookings: [], reservationsWithoutBooking: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)
    const hasRedirected = useRef(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const hasLoadedData = useRef(false)
    const lastCustomerId = useRef<string | null>(null)
    const loadAttemptedRef = useRef<string | null>(null)
    const mountedRef = useRef(true)

    // Estabilizar el customerId para evitar ejecuciones innecesarias
    const customerId = useMemo(() => sessionData?.customerId || null, [sessionData?.customerId])

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            mountedRef.current = false
        }
    }, [])

    // Esperar a que la sesión se cargue antes de verificar autenticación
    useEffect(() => {
        // Pequeño delay para permitir que la sesión se cargue
        const checkTimer = setTimeout(() => {
            setIsCheckingAuth(false)
        }, 300)

        return () => clearTimeout(checkTimer)
    }, [])

    // Efecto separado para manejar redirección
    useEffect(() => {
        if (isCheckingAuth) {
            return
        }

        // Solo redirigir si no está autenticado y no hemos redirigido ya
        if ((!isAuthenticated || !customerId) && !hasRedirected.current) {
            hasRedirected.current = true
            const timer = setTimeout(() => {
                router.push(`/portal/${domainId}/login`)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isCheckingAuth, isAuthenticated, customerId, domainId, router])

    // Efecto separado para cargar datos (solo se ejecuta cuando es necesario)
    useEffect(() => {
        // No hacer nada mientras estamos verificando la autenticación
        if (isCheckingAuth) {
            return
        }

        // Si no está autenticado, no cargar reservas
        if (!isAuthenticated || !customerId) {
            return
        }

        // Verificar si ya se está cargando para este customerId (usando ref global)
        const loadingKey = `${customerId}-${refreshKey}`
        if (globalLoadingRef.has(loadingKey)) {
            console.log('🚫 Bloqueado: ya se está cargando para', loadingKey)
            return
        }

        // Verificar si ya intentamos cargar para este customerId (sin refresh)
        const needsRefresh = refreshKey > 0
        const customerIdChanged = lastCustomerId.current !== customerId

        // Si ya intentamos cargar para este customerId y no hay refresh ni cambio de usuario, no cargar
        if (loadAttemptedRef.current === customerId && !needsRefresh && !customerIdChanged) {
            console.log('🚫 Bloqueado: ya se cargó para este customerId sin refresh')
            return
        }

        // Marcar que estamos cargando ANTES de iniciar la petición (usando ref global)
        globalLoadingRef.set(loadingKey, true)
        loadAttemptedRef.current = customerId
        console.log('✅ Iniciando carga para', customerId, 'refreshKey:', refreshKey)

        const loadBookings = async () => {
            try {
                if (!mountedRef.current) {
                    console.log('⚠️ Componente desmontado, cancelando carga')
                    return
                }
                setIsLoading(true)
                const data = await getCustomerBookings(customerId)
                if (!mountedRef.current) {
                    console.log('⚠️ Componente desmontado después de petición')
                    return
                }
                setBookingsData(data)
                hasLoadedData.current = true
                lastCustomerId.current = customerId
                console.log('✅ Datos cargados exitosamente')
            } catch (error) {
                console.error('❌ Error loading bookings:', error)
                // En caso de error, permitir reintento
                hasLoadedData.current = false
                loadAttemptedRef.current = null
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false)
                }
                // Limpiar el flag global después de un delay
                setTimeout(() => {
                    globalLoadingRef.delete(loadingKey)
                    console.log('🧹 Limpiado flag para', loadingKey)
                }, 500)
            }
        }

        loadBookings()
    }, [isCheckingAuth, isAuthenticated, customerId, refreshKey])

    // Mostrar loading mientras verificamos la autenticación
    if (isCheckingAuth) {
        return (
            <main className="container mx-auto px-4 sm:px-6 py-8 max-w-full overflow-x-hidden">
                <div className="text-center py-16">
                    <p className="text-gravel text-base font-medium">Cargando...</p>
                </div>
            </main>
        )
    }

    // Si no está autenticado, no mostrar nada (ya se redirigió)
    if (!isAuthenticated || !sessionData) {
        return null
    }

    return (
        <main className="container mx-auto px-4 sm:px-6 py-8 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/portal/${domainId}`}
                    className="inline-flex items-center gap-2 text-gravel hover:text-orange transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Volver al catálogo</span>
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange/80 rounded-2xl flex items-center justify-center shadow-lg shadow-orange/20">
                        <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gravel mb-1">Mis Reservas</h1>
                        <p className="text-base text-ironside">
                            Gestiona tus reservas de productos
                        </p>
                    </div>
                </div>
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-orange/40 to-transparent"></div>
            </div>

            {/* Contenido */}
            {isLoading ? (
                <div className="text-center py-16">
                    <p className="text-gravel text-base font-medium">Cargando reservas...</p>
                </div>
            ) : (
                <ReservationsList
                    bookings={bookingsData.bookings}
                    reservationsWithoutBooking={bookingsData.reservationsWithoutBooking}
                    domainId={domainId}
                    onReservationDeleted={() => setRefreshKey(prev => prev + 1)}
                />
            )}
        </main>
    )
}

