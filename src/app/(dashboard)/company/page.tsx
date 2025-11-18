import { onGetCurrentCompanyInfo } from '@/action/settings'
import CompanySettings from '@/components/forms/settings/company-settings'
import { redirect } from 'next/navigation'
import React from 'react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { company: string } }

const CompanyPage = async ({ params }: Props) => {
  const companyData = await onGetCurrentCompanyInfo(params.company)
  if (!companyData || !companyData.company) redirect('/dashboard')

  const currentCompany = companyData.company

  return (
    <div className="overflow-y-auto w-full chat-window flex-1 h-0">
      <CompanySettings
        id={currentCompany.id}
        name={currentCompany.name}
      />
    </div>
  )
}

export default CompanyPage
