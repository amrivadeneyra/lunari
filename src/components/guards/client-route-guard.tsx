'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Guard que protege rutas no permitidas para clientes autenticados
 * Si el cliente tiene un token JWT válido, solo puede acceder a rutas que empiecen con /portal/
 */
export const ClientRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const [shouldBlock, setShouldBlock] = useState<boolean | null>(null)

  useEffect(() => {
    // Si estamos en una ruta permitida, no hacer nada
    if (pathname.startsWith('/portal/')) {
      setShouldBlock(false)
      return
    }

    // Verificar solo si existe token válido
    const clientToken = localStorage.getItem('lunari_session_token')
    const sessionDataStr = localStorage.getItem('lunari_session_data')

    if (!clientToken || !sessionDataStr) {
      setShouldBlock(false)
      return
    }

    try {
      const sessionData = JSON.parse(sessionDataStr)
      const expiresAt = new Date(sessionData.expiresAt)
      const now = new Date()

      // Si el token existe y no ha expirado, bloquear acceso
      if (expiresAt > now && sessionData.companyId) {
        setShouldBlock(true)
        window.location.href = `/portal/${sessionData.companyId}`
        return
      }
    } catch (error) {
      // Si hay error, permitir acceso
    }

    setShouldBlock(false)
  }, [pathname])

  // No renderizar nada si hay sesión activa y estamos en ruta no permitida
  if (shouldBlock === true) {
    return null
  }

  // No renderizar mientras se verifica
  if (shouldBlock === null) {
    return null
  }

  return <>{children}</>
}
