'use client'

import React, { useMemo } from 'react'
import { Package, Calendar, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { deleteReservation } from '@/action/portal'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { toast } from 'sonner'
import Link from 'next/link'

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
    name: string
    image: string
    price: number
    salePrice?: number | null
  } | null
  product?: {
    name: string
    image: string
    price: number
    salePrice?: number | null
  } | null
  quantity: number
  createdAt: Date | string
  expiresAt?: Date | string | null
  status: string
}

interface ReservationsListProps {
  bookings: Booking[]
  reservationsWithoutBooking: Reservation[]
  companyId: string
  onReservationDeleted?: () => void
}

export function ReservationsList({ bookings, reservationsWithoutBooking, companyId, onReservationDeleted }: ReservationsListProps) {
  const { sessionData } = useChatSession()

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

  const handleDelete = async (reservationId: string) => {
    if (!sessionData?.customerId) {
      toast.error('Error: No se pudo identificar tu sesión')
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
      return
    }

    try {
      const result = await deleteReservation(reservationId, sessionData.customerId)
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
    }
  }

  const totalItems = bookings.length + reservationsWithoutBooking.length

  if (totalItems === 0) {
    return (
      <div className="bg-white rounded-xl border border-orange/30 shadow-md p-12 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gravel mb-2">
          No tienes reservas aún
        </h3>
        <p className="text-ironside mb-6">
          Cuando agregues productos a tu carrito y crees una reserva, aparecerán aquí
        </p>
        <Link href={`/portal/${companyId}`}>
          <Button className="bg-orange hover:bg-orange/90 text-white">
            Explorar Productos
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Citas Futuras con Reservas */}
      {futureBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange" />
            Citas Próximas
          </h2>
          <div className="space-y-4">
            {futureBookings.map((booking) => {
              const bookingDate = new Date(booking.date)
              const totalProducts = booking.reservations.length
              const totalQuantity = booking.reservations.reduce((sum, r) => sum + r.quantity, 0)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-orange/30 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Header de la Cita */}
                  <div className="bg-gradient-to-r from-orange/10 via-peach/20 to-orange/10 border-b border-orange/20 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gravel text-lg">
                            Cita del {bookingDate.toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-ironside mt-1">
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
                    </div>
                  </div>

                  {/* Productos de la Cita */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {booking.reservations.map((reservation) => {
                        const product = getProduct(reservation)
                        if (!product) return null

                        const finalPrice = product.salePrice || product.price
                        const hasDiscount = product.salePrice && product.salePrice < product.price

                        return (
                          <div
                            key={reservation.id}
                            className="flex items-center gap-4 p-3 bg-peach/20 rounded-lg border border-orange/10"
                          >
                            {/* Imagen */}
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-peach border border-orange/20 flex-shrink-0">
                              <Image
                                src={`https://ucarecdn.com/${product.image}/`}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gravel text-sm mb-1">
                                {product.name}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-ironside">
                                <span>Cantidad: {reservation.quantity}</span>
                                <span className="font-semibold text-gravel">
                                  {hasDiscount && (
                                    <span className="line-through text-ironside/60 mr-1">
                                      S/ {product.price}
                                    </span>
                                  )}
                                  S/ {finalPrice}
                                </span>
                              </div>
                            </div>

                            {/* Acción */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(reservation.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reservas sin Cita (Futuras) */}
      {futureReservations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange" />
            Reservas sin Cita
          </h2>
          <div className="space-y-4">
            {futureReservations.map((reservation) => {
              const product = getProduct(reservation)
              if (!product) return null

              const expiresAt = reservation.expiresAt
                ? new Date(reservation.expiresAt)
                : null
              const finalPrice = product.salePrice || product.price
              const hasDiscount = product.salePrice && product.salePrice < product.price

              return (
                <div
                  key={reservation.id}
                  className="bg-white rounded-xl border border-orange/30 shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-peach border border-orange/20 flex-shrink-0">
                      <Image
                        src={`https://ucarecdn.com/${product.image}/`}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gravel mb-2 text-lg">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-ironside mb-3">
                        <span>Cantidad: {reservation.quantity}</span>
                        <span className="font-semibold text-gravel">
                          {hasDiscount && (
                            <span className="line-through text-ironside/60 mr-1">
                              S/ {product.price}
                            </span>
                          )}
                          Precio: S/ {finalPrice}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-ironside">
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
                          <div className="flex items-center gap-2 text-orange font-medium">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Vence el {expiresAt.toLocaleDateString('es-PE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(reservation.id)}
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
      {expiredBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gravel mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            Citas Vencidas
          </h2>
          <div className="space-y-4">
            {expiredBookings.map((booking) => {
              const bookingDate = new Date(booking.date)
              const totalProducts = booking.reservations.length

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-red-200 shadow-md overflow-hidden opacity-75"
                >
                  <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gravel text-lg line-through">
                          Cita del {bookingDate.toLocaleDateString('es-PE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <p className="text-sm text-red-600 mt-1">
                          {totalProducts} producto{totalProducts !== 1 ? 's' : ''} reservado{totalProducts !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
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
              const finalPrice = product.salePrice || product.price

              return (
                <div
                  key={reservation.id}
                  className="bg-white rounded-xl border border-red-200 shadow-md p-6 opacity-75"
                >
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-red-200 flex-shrink-0">
                      <Image
                        src={`https://ucarecdn.com/${product.image}/`}
                        alt={product.name}
                        fill
                        className="object-cover opacity-60"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gravel mb-2 text-lg line-through">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-ironside mb-3">
                        <span>Cantidad: {reservation.quantity}</span>
                        <span className="font-semibold text-gravel">
                          Precio: S/ {finalPrice}
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(reservation.id)}
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
  )
}
