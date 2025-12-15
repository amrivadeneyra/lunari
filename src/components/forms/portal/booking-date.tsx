import { Loader } from '@/components/loader'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import React from 'react'
import { FieldValues, UseFormRegister } from 'react-hook-form'
import { Clock, Lightbulb, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react'

// Función para convertir slot de tiempo (ej: "3:30pm") a minutos desde medianoche
const timeSlotToMinutes = (slot: string): number => {
  const [time, period] = slot.split(/(am|pm)/i)
  const [hours, minutes] = time.split(':').map(Number)
  let totalHours = hours

  if (period.toLowerCase() === 'pm' && hours !== 12) {
    totalHours += 12
  } else if (period.toLowerCase() === 'am' && hours === 12) {
    totalHours = 0
  }

  return totalHours * 60 + (minutes || 0)
}

// Función para verificar si un slot ya pasó
const isSlotPast = (date: Date | undefined, slot: string): boolean => {
  if (!date) return false

  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (!isToday) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const slotMinutes = timeSlotToMinutes(slot)

  return currentMinutes >= slotMinutes
}

type Props = {
  date: Date | undefined
  onBooking: React.Dispatch<React.SetStateAction<Date | undefined>>
  onBack(): void
  register: UseFormRegister<FieldValues>
  onSlot(slot: string): void
  currentSlot?: string
  loading: boolean
  bookings:
  | {
    date: Date
    slot: string
  }[]
  | undefined
  availableSlots: string[]
  loadingSlots: boolean
}

const BookAppointmentDate = ({
  date,
  onBooking,
  onBack,
  register,
  onSlot,
  currentSlot,
  loading,
  bookings,
  availableSlots,
  loadingSlots,
}: Props) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Resetear horas para comparación solo de fecha

  return (
    <div className="flex flex-col gap-10 justify-center max-w-7xl mx-auto p-6">
      {/* Header mejorado con más espacio superior */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
          Reservar una cita
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Selecciona la fecha y horario que mejor se ajuste a tu disponibilidad
        </p>
      </div>

      {/* Contenedor principal con fondo limpio */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
          {/* Calendario mejorado */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-orange" />
              <h3 className="text-lg font-semibold text-gray-900">Selecciona una fecha</h3>
            </div>
            <Card className="p-4 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
              <Calendar
                mode="single"
                selected={date}
                onSelect={onBooking}
                className="rounded-lg w-full"
                classNames={{
                  months: "space-y-4 w-full",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-base font-semibold text-gray-900",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 hover:bg-orange/10 rounded-md transition-colors",
                  table: "w-full border-collapse",
                  head_row: "flex mb-2 w-full justify-between",
                  head_cell: "text-gray-600 rounded-md flex-1 font-medium text-xs uppercase tracking-wider text-center",
                  row: "flex w-full mt-1 justify-between gap-1",
                  cell: "flex-1 flex items-center justify-center h-12 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-orange/10 rounded-md",
                  day: "w-full h-12 flex items-center justify-center p-0 font-normal hover:bg-orange/20 rounded-md transition-colors aria-selected:opacity-100",
                  day_selected: "bg-orange text-white hover:bg-orange hover:text-white focus:bg-orange focus:text-white font-semibold",
                  day_today: "bg-peach text-gray-900 font-semibold",
                  day_disabled: "text-gray-300 opacity-40 cursor-not-allowed",
                }}
                disabled={(date) => {
                  const checkDate = new Date(date)
                  checkDate.setHours(0, 0, 0, 0)
                  return checkDate < today
                }}
              />
            </Card>
          </div>

          {/* Selector de horarios mejorado */}
          <div className="flex flex-col gap-6 w-full">
            {loadingSlots ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader loading={true}>
                    <span></span>
                  </Loader>
                  <p className="text-sm text-gray-600">Cargando horarios disponibles...</p>
                </div>
              </Card>
            ) : availableSlots.length === 0 ? (
              <Card className="p-12 border-2 border-dashed border-gray-300">
                <div className="text-center space-y-3">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-base font-medium text-gray-700">
                    No hay horarios disponibles
                  </p>
                  <p className="text-sm text-gray-500">
                    Por favor, selecciona otra fecha para ver los horarios disponibles.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-5">
                {/* Header de horarios mejorado */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange" />
                      Selecciona un horario
                    </h3>
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-orange/10 text-orange border border-orange/30 shadow-sm">
                      {availableSlots.length} {availableSlots.length === 1 ? 'horario disponible' : 'horarios disponibles'}
                    </span>
                  </div>
                </div>

                {/* Grid de horarios mejorado */}
                <div className="relative">
                  <div className="max-h-[450px] overflow-y-auto pr-2 scrollbar-custom">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                      {availableSlots.map((slot, key) => {
                        const isBooked = bookings &&
                          bookings.some(
                            (booking) =>
                              `${booking.date.getDate()}/${booking.date.getMonth()}` ===
                              `${date?.getDate()}/${date?.getMonth()}` &&
                              booking.slot == slot
                          )
                        const isPast = isSlotPast(date, slot)
                        const isDisabled = isBooked || isPast
                        const isSelected = currentSlot === slot

                        return (
                          <Label
                            htmlFor={`slot-${key}`}
                            key={key}
                            className="block cursor-pointer"
                          >
                            <Card
                              onClick={() => !isDisabled && onSlot(slot)}
                              className={cn(
                                'relative p-4 text-center transition-all duration-300 ease-in-out',
                                'border-2 rounded-lg',
                                isSelected
                                  ? 'bg-orange text-white shadow-xl scale-105 border-orange ring-4 ring-orange/20 z-10'
                                  : isDisabled
                                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200 opacity-60'
                                    : 'bg-white text-gray-900 border-gray-200 hover:border-orange hover:shadow-lg hover:scale-105 active:scale-100',
                                'transform hover:translate-y-[-2px]'
                              )}
                            >
                              <Input
                                disabled={isDisabled}
                                className="hidden"
                                type="radio"
                                value={slot}
                                {...register('slot')}
                                id={`slot-${key}`}
                              />
                              <div className="space-y-2">
                                <div className={cn(
                                  "text-sm sm:text-base font-semibold",
                                  isSelected ? "text-white" : isDisabled ? "text-gray-400" : "text-gray-900"
                                )}>
                                  {slot}
                                </div>
                                {isPast && !isBooked && (
                                  <div className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full inline-block">
                                    Pasado
                                  </div>
                                )}
                                {isBooked && (
                                  <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                                    Reservado
                                  </div>
                                )}
                              </div>

                              {/* Indicador de selección mejorado */}
                              {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <CheckCircle2 className="w-4 h-4 text-orange" fill="currentColor" />
                                </div>
                              )}
                            </Card>
                          </Label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Indicador de scroll mejorado */}
                  {availableSlots.length > 9 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-lg" />
                  )}
                </div>

                {/* Información adicional mejorada */}
                <div className="flex flex-col sm:flex-row gap-3 text-xs sm:text-sm text-gray-600 bg-gradient-to-r from-orange/5 to-peach/20 p-4 rounded-lg border border-orange/10">
                  <div className="flex items-start gap-2 flex-1">
                    <Lightbulb className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Los horarios se actualizan en tiempo real</span>
                  </div>
                  <div className="flex items-start gap-2 flex-1">
                    <Clock className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Selecciona el que mejor se ajuste a tu disponibilidad</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón de acción */}
      <div className="flex justify-center items-center pt-6">
        <Button
          type="submit"
          disabled={!date || !currentSlot || loading}
          className="w-full sm:w-auto min-w-[240px] h-12 text-base bg-orange hover:bg-orange/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-100"
        >
          <Loader loading={loading}>
            Reservar ahora
          </Loader>
        </Button>
      </div>
    </div>
  )
}

export default BookAppointmentDate
