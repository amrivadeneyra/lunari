'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ClientRouteGuard } from '@/components/guards/client-route-guard'
import { checkClientSession } from '@/hooks/portal/use-client-auth-redirect'

export default function Home() {
  const router = useRouter()
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isClerkLoaded) return

    // Verificar sesión de cliente usando la función centralizada
    const { hasValidSession, companyId } = checkClientSession()

    if (hasValidSession && companyId) {
      router.replace(`/portal/${companyId}`)
      return
    }

    // Si no hay sesión de cliente, verificar admin
    if (isSignedIn) {
      router.replace('/dashboard')
      return
    }

    // Si no hay ninguna sesión, ir a selección
    router.replace('/auth/select')
  }, [isClerkLoaded, isSignedIn, router])

  return (
    <ClientRouteGuard>
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    </ClientRouteGuard>
  )
}
