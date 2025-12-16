import { onGetCurrentCompanyInfo } from '@/action/settings'
import AvailabilityScheduleForm from '@/components/forms/settings/availability-schedule'
import { redirect } from 'next/navigation'
import React from 'react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { company: string } }

const SchedulePage = async ({ params }: Props) => {
  const companyData = await onGetCurrentCompanyInfo(params.company)
  if (!companyData || !companyData.company) redirect('/dashboard')

  const currentCompany = companyData.company

  return (
    <AvailabilityScheduleForm id={currentCompany.id} />
  )
}

export default SchedulePage
