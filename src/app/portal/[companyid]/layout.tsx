import { getCompanyInfo } from '@/action/portal'
import { PortalNav } from '@/components/portal/portal-nav'
import { PortalProvider } from '@/components/portal/portal-provider'
import React from 'react'

type Props = {
  children: React.ReactNode
  params: { companyid: string }
}

const PortalLayout = async ({ children, params }: Props) => {
  const companyInfo = await getCompanyInfo(params.companyid)

  return (
    <PortalProvider>
      <div className="min-h-screen bg-cream overflow-x-hidden w-full">
        {companyInfo && (
          <PortalNav
            companyId={params.companyid}
            companyName={companyInfo.name}
            companyIcon={companyInfo.icon}
          />
        )}
        {children}
      </div>
    </PortalProvider>
  )
}

export default PortalLayout

