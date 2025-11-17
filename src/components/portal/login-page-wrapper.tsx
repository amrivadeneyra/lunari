'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'

interface LoginPageWrapperProps {
    domainId: string
    children: React.ReactNode
}

export function LoginPageWrapper({ domainId, children }: LoginPageWrapperProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated } = useChatSession()
    const hasRedirected = useRef(false)

    useEffect(() => {
        // Solo redirigir si está autenticado y no hemos redirigido ya
        if (isAuthenticated && !hasRedirected.current) {
            hasRedirected.current = true
            // Pequeño delay para evitar loops
            const timer = setTimeout(() => {
                router.push(`/portal/${domainId}/profile`)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isAuthenticated, domainId, router])

    // Si está autenticado, no mostrar el contenido (mientras redirige)
    if (isAuthenticated) {
        return null
    }

    return <>{children}</>
}

