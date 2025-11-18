import { getCompanyInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { ReservationsPageClient } from '@/components/portal/reservations-page-client'

type Props = {
  params: { companyid: string }
}

const ReservationsPage = async ({ params }: Props) => {
  const companyInfo = await getCompanyInfo(params.companyid)

  if (!companyInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper companyId={params.companyid}>
      <ReservationsPageClient companyId={params.companyid} />
    </PortalClientWrapper>
  )
}

export default ReservationsPage
