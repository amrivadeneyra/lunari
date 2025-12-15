'use client'

import React, { useMemo, useState } from 'react'
import { Package, Calendar, Trash2, Clock, ChevronDown, ChevronUp, ShoppingCart, Search, Filter, Tag, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { deleteReservation } from '@/action/portal'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { toast } from 'sonner'
import Link from 'next/link'
import { useCart } from '@/context/portal/cart-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface Booking {
  id: string
  date: Date | string
  slot: string
  appointmentType: string
  reservations: Reservation[]
}

interface Reservation {
  id: string
  Product?: {
    id: string
    name: string
    image: string
    price: number
    salePrice?: number | null
    unit?: string | null
  } | null
  product?: {
    id: string
    name: string
    image: string
    price: number
    salePrice?: number | null
    unit?: string | null
  } | null
  quantity: number
  createdAt: Date | string
  expiresAt?: Date | string | null
  status: string
  unitPrice?: number | null
  totalPrice?: number | null
}

interface ReservationsListProps {
  bookings: Booking[]
  reservationsWithoutBooking: Reservation[]
  companyId: string
  onReservationDeleted?: () => void
}

// Helper para obtener el estado badge
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    PENDING: {
      label: 'Pendiente',
      icon: <Clock className="w-3 h-3" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    },
    CONFIRMED: {
      label: 'Confirmada',
      icon: <CheckCircle2 className="w-3 h-3" />,
      className: 'bg-green-100 text-green-700 border-green-300'
    },
    COMPLETED: {
      label: 'Completada',
      icon: <CheckCircle2 className="w-3 h-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-300'
    },
  }
  return statusMap[status] || statusMap.PENDING
}

// Helper para calcular días hasta expiración
const getDaysUntilExpiration = (expiresAt: Date | string | null): number | null => {
  if (!expiresAt) return null
  const expDate = new Date(expiresAt)
  const now = new Date()
  const diffTime = expDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Helper para formatear ID corto
const formatShortId = (id: string): string => {
  return `#${id.slice(0, 8).toUpperCase()}`
}

export function ReservationsList({ bookings, reservationsWithoutBooking, companyId, onReservationDeleted }: ReservationsListProps) {
  const { sessionData } = useChatSession()
  const { addItem } = useCart()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())
  const [expandedExpiredBookings, setExpandedExpiredBookings] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all')

  // Helper para obtener el producto de una reserva
  const getProduct = (reservation: Reservation) => {
    return reservation.Product || reservation.product
  }

  // Organizar bookings y reservas sin booking en vencidas y futuras
  const { expiredBookings, futureBookings, expiredReservations, futureReservations } = useMemo(() => {
    const now = new Date()

    const expiredB: Booking[] = []
    const futureB: Booking[] = []
    const expiredR: Reservation[] = []
    const futureR: Reservation[] = []

    // Procesar bookings
    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.date)
      if (bookingDate < now) {
        expiredB.push(booking)
      } else {
        futureB.push(booking)
      }
    })

    // Ordenar bookings futuros: más próximos primero
    futureB.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    // Ordenar bookings vencidos: más recientes primero
    expiredB.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB.getTime() - dateA.getTime()
    })

    // Procesar reservas sin booking
    reservationsWithoutBooking.forEach((reservation) => {
      const product = getProduct(reservation)
      if (!product || !product.name || !product.image) return

      const expiresAt = reservation.expiresAt
        ? new Date(reservation.expiresAt)
        : null

      if (expiresAt && expiresAt < now) {
        expiredR.push(reservation)
      } else {
        futureR.push(reservation)
      }
    })

    // Ordenar reservas futuras: más próximas a más lejanas
    futureR.sort((a, b) => {
      const dateA = a.expiresAt ? new Date(a.expiresAt) : new Date(a.createdAt)
      const dateB = b.expiresAt ? new Date(b.expiresAt) : new Date(b.createdAt)
      return dateA.getTime() - dateB.getTime()
    })

    // Ordenar reservas vencidas: más recientes primero
    expiredR.sort((a, b) => {
      const dateA = a.expiresAt ? new Date(a.expiresAt) : new Date(a.createdAt)
      const dateB = b.expiresAt ? new Date(b.expiresAt) : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    return {
      expiredBookings: expiredB,
      futureBookings: futureB,
      expiredReservations: expiredR,
      futureReservations: futureR
    }
  }, [bookings, reservationsWithoutBooking])

  // Filtrar por búsqueda y estado
  const filteredFutureBookings = useMemo(() => {
    let filtered = futureBookings

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(booking => {
        return booking.reservations.some(res => {
          const product = getProduct(res)
          return product?.name.toLowerCase().includes(searchQuery.toLowerCase())
        })
      })
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => {
        return booking.reservations.some(res => res.status === filterStatus)
      })
    }

    return filtered
  }, [futureBookings, searchQuery, filterStatus])

  const filteredExpiredBookings = useMemo(() => {
    let filtered = expiredBookings

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(booking => {
        return booking.reservations.some(res => {
          const product = getProduct(res)
          return product?.name.toLowerCase().includes(searchQuery.toLowerCase())
        })
      })
    }

    return filtered
  }, [expiredBookings, searchQuery])

  const filteredFutureReservations = useMemo(() => {
    let filtered = futureReservations

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(reservation => {
        const product = getProduct(reservation)
        return product?.name.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === filterStatus)
    }

    return filtered
  }, [futureReservations, searchQuery, filterStatus])

  const toggleExpanded = (bookingId: string, isExpired: boolean) => {
    if (isExpired) {
      setExpandedExpiredBookings(prev => {
        const newSet = new Set(prev)
        if (newSet.has(bookingId)) {
          newSet.delete(bookingId)
        } else {
          newSet.add(bookingId)
        }
        return newSet
      })
    } else {
      setExpandedBookings(prev => {
        const newSet = new Set(prev)
        if (newSet.has(bookingId)) {
          newSet.delete(bookingId)
        } else {
          newSet.add(bookingId)
        }
        return newSet
      })
    }
  }

  const handleDeleteClick = (reservationId: string) => {
    setReservationToDelete(reservationId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reservationToDelete || !sessionData?.customerId) {
      toast.error('Error: No se pudo identificar tu sesión')
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteReservation(reservationToDelete, sessionData.customerId)
      if (result.success) {
        toast.success('Reserva eliminada correctamente')
        if (onReservationDeleted) {
          onReservationDeleted()
        }
      } else {
        toast.error(result.error || 'Error al eliminar la reserva')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la reserva')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReservationToDelete(null)
    }
  }

  const handleReOrder = (reservation: Reservation) => {
    const product = getProduct(reservation)
    if (!product) return

    addItem(
      {
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        salePrice: product.salePrice,
        unit: product.unit || null
      },
      reservation.quantity,
      {
        unit: reservation.unitPrice ? undefined : product.unit || undefined,
      }
    )
    toast.success(`${product.name} agregado al carrito`)
  }

  const handleReOrderAll = (booking: Booking) => {
    booking.reservations.forEach(reservation => {
      handleReOrder(reservation)
    })
    toast.success('Todos los productos agregados al carrito')
  }

  // Calcular totales
  const calculateBookingTotal = (booking: Booking): number => {
    return booking.reservations.reduce((sum, res) => {
      const product = getProduct(res)
      if (!product) return sum
      const price = res.totalPrice || (product.salePrice || product.price) * res.quantity
      return sum + price
    }, 0)
  }

  const totalItems = bookings.length + reservationsWithoutBooking.length

  if (totalItems === 0) {
    return (
      <div className="bg-white rounded-xl border border-orange/30 shadow-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange/10 rounded-full mb-6">
          <Package className="w-10 h-10 text-orange" />
        </div>
        <h3 className="text-2xl font-bold text-gravel mb-3">
          No tienes reservas aún
        </h3>
        <p className="text-ironside mb-2 max-w-md mx-auto">
          Cuando agregues productos a tu carrito y crees una reserva, aparecerán aquí
        </p>
        <p className="text-sm text-ironside/70 mb-8">
          También puedes usar nuestro asistente virtual para encontrar productos
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/portal/${companyId}`}>
            <Button className="bg-orange hover:bg-orange/90 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Explorar Productos
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Barra de búsqueda y filtros */}
      {(totalItems > 3 || searchQuery) && (
        <div className="bg-white rounded-xl border border-orange/30 shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ironside w-4 h-4" />
              <Input
                placeholder="Buscar por nombre de producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-orange hover:bg-orange/90 text-white' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Todos
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className={filterStatus === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
              >
                Pendiente
              </Button>
              <Button
                variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('confirmed')}
                className={filterStatus === 'confirmed' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              >
                Confirmada
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('completed')}
                className={filterStatus === 'completed' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
              >
                Completada
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Citas Futuras con Reservas */}
        {filteredFutureBookings.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange" />
              Citas Próximas
            </h2>
            <div className="space-y-4">
              {filteredFutureBookings.map((booking) => {
                const bookingDate = new Date(booking.date)
                const totalProducts = booking.reservations.length
                const totalQuantity = booking.reservations.reduce((sum, r) => sum + r.quantity, 0)
                const bookingTotal = calculateBookingTotal(booking)
                const isExpanded = expandedBookings.has(booking.id)
                const showExpand = booking.reservations.length > 3

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl border border-orange/30 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Header de la Cita */}
                    <div className="bg-gradient-to-r from-orange/10 via-peach/20 to-orange/10 border-b border-orange/20 px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-orange rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gravel text-lg">
                                Cita del {bookingDate.toLocaleDateString('es-PE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h3>
                              <span className="text-xs font-medium text-ironside/70 bg-white/80 px-2 py-1 rounded">
                                {formatShortId(booking.id)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-ironside mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {booking.slot}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {totalProducts} producto{totalProducts !== 1 ? 's' : ''} ({totalQuantity} unidades)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-ironside">Total</p>
                            <p className="text-lg font-bold text-gravel">S/ {bookingTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Productos de la Cita */}
                    <div className="p-6">
                      <div className="space-y-3">
                        {(showExpand && !isExpanded
                          ? booking.reservations.slice(0, 3)
                          : booking.reservations
                        ).map((reservation) => {
                          const product = getProduct(reservation)
                          if (!product) return null

                          const finalPrice = reservation.totalPrice || (product.salePrice || product.price) * reservation.quantity
                          const unitPrice = reservation.unitPrice || product.salePrice || product.price
                          const hasDiscount = product.salePrice && product.salePrice < product.price
                          const discountPercent = hasDiscount
                            ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
                            : 0

                          return (
                            <div
                              key={reservation.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-peach/20 rounded-lg border border-orange/10"
                            >
                              {/* Imagen */}
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-peach border border-orange/20 flex-shrink-0">
                                <Image
                                  src={`https://ucarecdn.com/${product.image}/`}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-gravel text-base">
                                    {product.name}
                                  </h4>
                                  {hasDiscount && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange text-white text-xs font-bold rounded-full flex-shrink-0">
                                      <Tag className="w-3 h-3" />
                                      {discountPercent}% OFF
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                                  <span className="text-ironside">Cantidad: {reservation.quantity}</span>
                                  <span className="font-semibold text-gravel">
                                    {hasDiscount && (
                                      <span className="line-through text-ironside/60 mr-2">
                                        S/ {product.price}
                                      </span>
                                    )}
                                    Precio: S/ {unitPrice}
                                  </span>
                                  <span className="font-bold text-orange text-base">
                                    Total: S/ {finalPrice}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-ironside/70">ID: {formatShortId(reservation.id)}</span>
                                  {reservation.status && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                      getStatusBadge(reservation.status).className
                                    )}>
                                      {getStatusBadge(reservation.status).icon}
                                      {getStatusBadge(reservation.status).label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Acción */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(reservation.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>

                      {/* Botón expandir/colapsar */}
                      {showExpand && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(booking.id, false)}
                          className="w-full mt-4 text-orange hover:text-orange hover:bg-orange/10"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Mostrar menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Ver {booking.reservations.length - 3} producto{booking.reservations.length - 3 !== 1 ? 's' : ''} más
                            </>
                          )}
                        </Button>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reservas sin Cita (Futuras) */}
        {filteredFutureReservations.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange" />
              Reservas sin Cita
            </h2>
            <div className="space-y-4">
              {filteredFutureReservations.map((reservation) => {
                const product = getProduct(reservation)
                if (!product) return null

                const expiresAt = reservation.expiresAt
                  ? new Date(reservation.expiresAt)
                  : null
                const finalPrice = reservation.totalPrice || (product.salePrice || product.price) * reservation.quantity
                const unitPrice = reservation.unitPrice || product.salePrice || product.price
                const hasDiscount = product.salePrice && product.salePrice < product.price
                const discountPercent = hasDiscount
                  ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
                  : 0
                const daysUntilExp = getDaysUntilExpiration(reservation.expiresAt || null)

                return (
                  <div
                    key={reservation.id}
                    className="bg-white rounded-xl border border-orange/30 shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-peach border border-orange/20 flex-shrink-0">
                        <Image
                          src={`https://ucarecdn.com/${product.image}/`}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gravel text-lg">
                            {product.name}
                          </h3>
                          {hasDiscount && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange text-white text-xs font-bold rounded-full flex-shrink-0">
                              <Tag className="w-3 h-3" />
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-ironside mb-3">
                          <span>Cantidad: {reservation.quantity}</span>
                          <span className="font-semibold text-gravel">
                            {hasDiscount && (
                              <span className="line-through text-ironside/60 mr-1">
                                S/ {product.price}
                              </span>
                            )}
                            Precio: S/ {unitPrice}
                          </span>
                          <span className="font-bold text-orange">
                            Total: S/ {finalPrice}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 text-xs text-ironside">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Reservado el {new Date(reservation.createdAt).toLocaleDateString('es-PE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {expiresAt && (
                            <div className={cn(
                              "flex items-center gap-2 font-medium",
                              daysUntilExp !== null && daysUntilExp <= 3
                                ? "text-red-600"
                                : daysUntilExp !== null && daysUntilExp <= 7
                                  ? "text-orange-600"
                                  : "text-orange"
                            )}>
                              <Calendar className="w-4 h-4" />
                              <span>
                                {daysUntilExp !== null && daysUntilExp > 0
                                  ? `Vence en ${daysUntilExp} día${daysUntilExp !== 1 ? 's' : ''} (${expiresAt.toLocaleDateString('es-PE', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })})`
                                  : `Vence el ${expiresAt.toLocaleDateString('es-PE', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}`
                                }
                              </span>
                              {daysUntilExp !== null && daysUntilExp <= 3 && (
                                <AlertCircle className="w-4 h-4" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-ironside/70">ID: {formatShortId(reservation.id)}</span>
                            {reservation.status && (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                getStatusBadge(reservation.status).className
                              )}>
                                {getStatusBadge(reservation.status).icon}
                                {getStatusBadge(reservation.status).label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(reservation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Citas Vencidas */}
        {filteredExpiredBookings.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              Citas Vencidas
            </h2>
            <div className="space-y-4">
              {filteredExpiredBookings.map((booking) => {
                const bookingDate = new Date(booking.date)
                const totalProducts = booking.reservations.length
                const bookingTotal = calculateBookingTotal(booking)
                const isExpanded = expandedExpiredBookings.has(booking.id)
                const showExpand = booking.reservations.length > 3

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl border border-red-200 shadow-md overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-200 px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gravel text-lg">
                                Cita del {bookingDate.toLocaleDateString('es-PE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h3>
                              <span className="text-xs font-medium text-ironside/70 bg-white/80 px-2 py-1 rounded">
                                {formatShortId(booking.id)}
                              </span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                              {totalProducts} producto{totalProducts !== 1 ? 's' : ''} reservado{totalProducts !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-ironside">Total</p>
                            <p className="text-lg font-bold text-gravel line-through">S/ {bookingTotal.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReOrderAll(booking)}
                            className="border-orange/40 text-orange hover:bg-orange hover:text-white"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Volver a reservar
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Productos expandibles */}
                    {(isExpanded || !showExpand) && (
                      <div className="p-6 bg-white/50">
                        <div className="space-y-3">
                          {booking.reservations.map((reservation) => {
                            const product = getProduct(reservation)
                            if (!product) return null

                            const finalPrice = reservation.totalPrice || (product.salePrice || product.price) * reservation.quantity
                            const unitPrice = reservation.unitPrice || product.salePrice || product.price
                            const hasDiscount = product.salePrice && product.salePrice < product.price

                            return (
                              <div
                                key={reservation.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-red-50/50 rounded-lg border border-red-100"
                              >
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-red-200 flex-shrink-0 opacity-75">
                                  <Image
                                    src={`https://ucarecdn.com/${product.image}/`}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gravel text-base mb-1">
                                    {product.name}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-ironside">
                                    <span>Cantidad: {reservation.quantity}</span>
                                    <span className="font-semibold text-gravel line-through">
                                      {hasDiscount && (
                                        <span className="line-through text-ironside/60 mr-2">
                                          S/ {product.price}
                                        </span>
                                      )}
                                      Precio: S/ {unitPrice}
                                    </span>
                                    <span className="font-bold text-gravel line-through">
                                      Total: S/ {finalPrice}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <span className="text-xs text-ironside/70">ID: {formatShortId(reservation.id)}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReOrder(reservation)}
                                  className="border-orange/40 text-orange hover:bg-orange hover:text-white flex-shrink-0"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Reservar
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {showExpand && (
                      <div className="px-6 pb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(booking.id, true)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Ocultar productos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Ver {booking.reservations.length} producto{booking.reservations.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reservas Vencidas sin Cita */}
        {expiredReservations.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Reservas Vencidas
            </h2>
            <div className="space-y-4">
              {expiredReservations.map((reservation) => {
                const product = getProduct(reservation)
                if (!product) return null

                const expiresAt = reservation.expiresAt
                  ? new Date(reservation.expiresAt)
                  : null
                const finalPrice = reservation.totalPrice || (product.salePrice || product.price) * reservation.quantity
                const unitPrice = reservation.unitPrice || product.salePrice || product.price

                return (
                  <div
                    key={reservation.id}
                    className="bg-white rounded-xl border border-red-200 shadow-md p-6"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-red-200 flex-shrink-0 opacity-75">
                        <Image
                          src={`https://ucarecdn.com/${product.image}/`}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gravel mb-2 text-lg line-through">
                          {product.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-ironside mb-3">
                          <span>Cantidad: {reservation.quantity}</span>
                          <span className="font-semibold text-gravel line-through">
                            Precio: S/ {unitPrice}
                          </span>
                          <span className="font-bold text-gravel line-through">
                            Total: S/ {finalPrice}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-red-600">
                          {expiresAt && (
                            <div className="flex items-center gap-2 font-medium">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Venció el {expiresAt.toLocaleDateString('es-PE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          <div className="mt-1">
                            <span className="text-ironside/70">ID: {formatShortId(reservation.id)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReOrder(reservation)}
                          className="border-orange/40 text-orange hover:bg-orange hover:text-white"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Reservar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(reservation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La reserva será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
