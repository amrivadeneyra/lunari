import { getDomainInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { LoginForm } from '@/components/portal/login-form'
import { LoginPageWrapper } from '@/components/portal/login-page-wrapper'

type Props = {
  params: { domainid: string }
}

const LoginPage = async ({ params }: Props) => {
  const domainInfo = await getDomainInfo(params.domainid)

  if (!domainInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper domainId={params.domainid}>
      <LoginPageWrapper domainId={params.domainid}>
        <main className="container mx-auto px-4 sm:px-6 py-12 max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gravel mb-2">
                Accede a tu cuenta
              </h1>
              <p className="text-ironside">
                Ingresa tu email para ver tus reservas y gestionar tus pedidos
              </p>
            </div>

            <LoginForm domainId={params.domainid} />
          </div>
        </main>
      </LoginPageWrapper>
    </PortalClientWrapper>
  )
}

export default LoginPage

