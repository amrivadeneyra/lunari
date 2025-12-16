import { onGetAccountCompany } from '@/action/settings'
import CompanySettings from '@/components/forms/settings/company-settings'
import { redirect } from 'next/navigation'
import React from 'react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {}

const CompanyPage = async (props: Props) => {
  const companyData = await onGetAccountCompany()
  
  if (!companyData || !companyData.company) {
    redirect('/dashboard')
    return null
  }

  const currentCompany = companyData.company

  if (!currentCompany.id || !currentCompany.name) {
    redirect('/dashboard')
    return null
  }

  return (
    <CompanySettings
      id={currentCompany.id}
      name={currentCompany.name}
    />
  )
}

export default CompanyPage
