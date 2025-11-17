'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { checkClientSession } from '@/hooks/portal/use-client-auth-redirect'

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

    // Verificar sesión usando la función centralizada
    const { hasValidSession, companyId } = checkClientSession()

    if (hasValidSession && companyId) {
      setShouldBlock(true)
      window.location.href = `/portal/${companyId}`
      return
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
