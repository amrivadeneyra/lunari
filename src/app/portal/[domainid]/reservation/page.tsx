import { getDomainInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { ReservationsPageClient } from '@/components/portal/reservations-page-client'

type Props = {
  params: { domainid: string }
}

const ReservationsPage = async ({ params }: Props) => {
  const domainInfo = await getDomainInfo(params.domainid)

  if (!domainInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper domainId={params.domainid}>
      <ReservationsPageClient domainId={params.domainid} />
    </PortalClientWrapper>
  )
}

export default ReservationsPage
