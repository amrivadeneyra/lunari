import { onBookNewAppointment, onGetAvailableTimeSlotsForDay, saveAnswers } from '@/action/appointment'
import { createMultipleReservations } from '@/action/portal'
import { useToast } from '@/components/ui/use-toast'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'

export const usePortal = (
  customerId: string,
  companyId: string,
  email: string
) => {
  const {
    register,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<number>(1)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false)

  // Verificar si viene del carrito
  const fromCart = searchParams.get('fromCart') === 'true'

  setValue('date', date)

  // Cargar horarios disponibles cuando cambia la fecha
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!date) return

      setLoadingSlots(true)
      const result = await onGetAvailableTimeSlotsForDay(companyId, date)
      if (result?.timeSlots) {
        setAvailableSlots(result.timeSlots)
      } else {
        setAvailableSlots([])
      }
      setLoadingSlots(false)
    }

    loadAvailableSlots()
  }, [date, companyId])

  const onNext = () => setStep((prev) => prev + 1)

  const onPrev = () => setStep((prev) => prev - 1)

  const onBookAppointment = handleSubmit(async (values) => {
    try {
      setLoading(true)
      const questions = Object.keys(values)
        .filter((key) => key.startsWith('question'))
        .reduce((obj: any, key) => {
          obj[key.split('question-')[1]] = values[key]
          return obj
        }, {})

      const savedAnswers = await saveAnswers(questions, customerId)

      if (savedAnswers) {
        const booked = await onBookNewAppointment(
          companyId,
          customerId,
          values.slot,
          values.date,
          email
        )
        if (booked && booked.status == 200) {
          // Si viene del carrito, crear las reservas asociadas a la cita
          if (fromCart && booked.bookingId) {
            try {
              // Obtener items del carrito desde localStorage
              const pendingItemsStr = localStorage.getItem('lunari_pending_cart_items')
              if (pendingItemsStr) {
                const pendingItems = JSON.parse(pendingItemsStr)

                // Crear las reservas asociadas a la cita
                const reservationResult = await createMultipleReservations(
                  pendingItems.map((item: any) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    details: {
                      unit: item.unit,
                      width: item.width,
                      weight: item.weight,
                      color: item.color,
                    }
                  })),
                  customerId,
                  booked.bookingId // Asociar a la cita creada
                )

                if (reservationResult.success) {
                  // Limpiar el carrito y localStorage
                  localStorage.removeItem('lunari_pending_cart_items')
                  localStorage.removeItem('portal-cart')

                  // Disparar evento para limpiar el carrito del contexto
                  window.dispatchEvent(new Event('lunari_cart_cleared'))

                  toast({
                    title: '¡Éxito!',
                    description: `Cita creada y ${pendingItems.length} reserva(s) asociada(s) exitosamente`,
                  })

                  // Redirigir a reservas después de un pequeño delay
                  setTimeout(() => {
                    router.push(`/portal/${companyId}/reservation`)
                  }, 1500)
                } else {
                  toast({
                    title: 'Cita creada',
                    description: 'La cita se creó pero hubo un error al crear las reservas',
                    variant: 'destructive'
                  })
                }
              }
            } catch (error: any) {
              console.error('Error creating reservations after booking:', error)
              toast({
                title: 'Cita creada',
                description: 'La cita se creó pero hubo un error al crear las reservas',
                variant: 'destructive'
              })
            }
          } else {
            toast({
              title: 'Éxito',
              description: booked.message,
            })
          }
          setStep(3)
        }

        setLoading(false)
      }
    } catch (error) { }
  })

  const onSelectedTimeSlot = (slot: string) => setSelectedSlot(slot)

  return {
    step,
    onNext,
    onPrev,
    register,
    errors,
    loading,
    onBookAppointment,
    date,
    setDate,
    onSelectedTimeSlot,
    selectedSlot,
    availableSlots,
    loadingSlots,
  }
}
