import React from 'react'
import { FieldErrors, FieldValues } from 'react-hook-form'
import { UseFormRegister } from 'react-hook-form'
import QuestionsForm from './questions'
import BookAppointmentDate from './booking-date'

type Props = {
    questions: {
        id: string
        question: string
        answered: string | null
    }[]
    type: 'Appointment'
    register: UseFormRegister<FieldValues>
    error: FieldErrors<FieldValues>
    onNext(): void
    step: number
    date: Date | undefined
    onBooking: React.Dispatch<React.SetStateAction<Date | undefined>>
    onBack(): void
    onSlot(slot: string): void
    slot?: string
    loading: boolean
    bookings?:
    | {
        date: Date
        slot: string
    }[]
    | undefined
    availableSlots?: string[]
    loadingSlots?: boolean
}

const PortalSteps = ({
    questions,
    type,
    register,
    error,
    onNext,
    step,
    onBooking,
    date,
    onBack,
    onSlot,
    loading,
    slot,
    bookings,
    availableSlots = [],
    loadingSlots = false,
}: Props) => {

    if (step == 1) {
        return (
            <div className="w-full flex justify-center items-center min-h-full">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                    <QuestionsForm
                        register={register}
                        error={error}
                        onNext={onNext}
                        questions={questions}
                    />
                </div>
            </div>
        )
    }

    if (step == 2 && type == 'Appointment') {
        return (
            <div className="w-full flex justify-center items-center min-h-full">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                    <BookAppointmentDate
                        date={date}
                        bookings={bookings}
                        currentSlot={slot}
                        register={register}
                        onBack={onBack}
                        onBooking={onBooking}
                        onSlot={onSlot}
                        loading={loading}
                        availableSlots={availableSlots}
                        loadingSlots={loadingSlots}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="w-full flex justify-center items-center min-h-full">
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <h2 className="font-bold text-gray-600 text-3xl sm:text-4xl">Gracias</h2>
                    <p className="text-sm sm:text-base">
                        Gracias por tomarse el tiempo para llenar este formulario. Nos encantaría
                        <br className="hidden sm:block" /> hablar contigo pronto.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default PortalSteps