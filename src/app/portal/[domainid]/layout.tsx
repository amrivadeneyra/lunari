import { getDomainInfo } from '@/action/portal'
import { PortalNav } from '@/components/portal/portal-nav'
import { PortalProvider } from '@/components/portal/portal-provider'
import React from 'react'

type Props = {
  children: React.ReactNode
  params: { domainid: string }
}

const PortalLayout = async ({ children, params }: Props) => {
  const domainInfo = await getDomainInfo(params.domainid)

  return (
    <PortalProvider>
      <div className="min-h-screen bg-cream overflow-x-hidden w-full">
        {domainInfo && (
          <PortalNav
            domainId={params.domainid}
            domainName={domainInfo.name}
            domainIcon={domainInfo.icon}
          />
        )}
        {children}
      </div>
    </PortalProvider>
  )
}

export default PortalLayout

