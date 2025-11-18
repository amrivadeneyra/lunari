import { onCompanyCustomerResponses, onGetAllCompanyBookings } from '@/action/appointment'
import PortalForm from '@/components/forms/portal/portal-form';
import React from 'react'

type Props = { params: { companyid: string; customerid: string } }

const CustomerSignUpForm = async ({ params }: Props) => {
  const questions = await onCompanyCustomerResponses(params.customerid)
  const bookings = await onGetAllCompanyBookings(params.companyid)

  if (!questions) return null

  return (
    <PortalForm
      bookings={bookings}
      email={questions.email!}
      companyid={params.companyid}
      customerId={params.customerid}
      questions={questions.questions}
      type="Appointment"
    />
  )
}

export default CustomerSignUpForm
