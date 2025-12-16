'use client'

import { usePortal } from '@/hooks/portal/use-portal'
import { cn } from '@/lib/utils'
import React, { useEffect } from 'react'
import PortalSteps from './portal-steps'

type PortalFormProps = {
  questions: {
    id: string
    question: string
    answered: string | null
  }[]
  type: 'Appointment'
  customerId: string
  companyid: string
  email: string
  bookings?:
  | {
    date: Date
    slot: string
  }[]
  | undefined
}

const PortalForm = ({
  questions,
  type,
  customerId,
  companyid,
  bookings,
  email,
}: PortalFormProps) => {
  const {
    step,
    onNext,
    onPrev,
    register,
    errors,
    date,
    setDate,
    onBookAppointment,
    onSelectedTimeSlot,
    selectedSlot,
    loading,
    availableSlots,
    loadingSlots,
  } = usePortal(customerId, companyid, email)

  useEffect(() => {
    if (questions.every((question) => question.answered)) {
      onNext()
    }
  }, [])
 
  return (
    <form
      className="h-full flex flex-col gap-10 justify-center"
      onSubmit={onBookAppointment}
    >
      <PortalSteps
        loading={loading}
        slot={selectedSlot}
        bookings={bookings}
        onSlot={onSelectedTimeSlot}
        date={date}
        onBooking={setDate}
        step={step}
        type={type}
        questions={questions}
        error={errors}
        register={register}
        onNext={onNext}
        onBack={onPrev}
        availableSlots={availableSlots}
        loadingSlots={loadingSlots}
      />
      {/* TODO: Add progress bar */}
      {/* {(step == 1 || step == 2) && (
        <div className="w-full flex justify-center">
          <div className="w-[400px] grid grid-cols-2 gap-3">
            <div
              className={cn(
                'rounded-full h-2 col-span-1',
                step == 1 ? 'bg-orange' : 'bg-platinum'
              )}
            ></div>
            <div
              className={cn(
                'rounded-full h-2 col-span-1',
                step == 2 ? 'bg-orange' : 'bg-platinum'
              )}
            ></div>
          </div>
        </div>
      )} */}
    </form>
  )
}

export default PortalForm
