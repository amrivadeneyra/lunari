import { onGetAccountCompany } from '@/action/settings'
import UsersTable from '@/components/users'
import { redirect } from 'next/navigation'
import React from 'react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UsersPage = async () => {
  const companyData = await onGetAccountCompany()

  if (!companyData || !companyData.company) {
    redirect('/dashboard')
  }

  const currentCompany = companyData.company

  return (
    <div className="overflow-y-auto w-full chat-window flex-1 h-0">
      <UsersTable companyId={currentCompany.id} />
    </div>
  )
}

export default UsersPage

