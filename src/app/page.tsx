'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ClientRouteGuard } from '@/components/guards/client-route-guard'

export default function Home() {
  const router = useRouter()
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isClerkLoaded) return

    // Verificar token JWT de cliente primero
    const clientToken = localStorage.getItem('lunari_session_token')
    const sessionDataStr = localStorage.getItem('lunari_session_data')

    if (clientToken && sessionDataStr) {
      try {
        const sessionData = JSON.parse(sessionDataStr)
        const expiresAt = new Date(sessionData.expiresAt)
        const now = new Date()

        if (expiresAt > now && sessionData.companyId) {
          router.replace(`/portal/${sessionData.companyId}`)
          return
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error)
      }
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
