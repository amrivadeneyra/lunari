'use client'

import { useEffect } from 'react'

/**
 * Hook que verifica si hay una sesión de cliente válida y redirige automáticamente
 * Si el usuario tiene un token JWT válido, lo redirige a su portal
 * Útil para páginas que no deberían ser accesibles si hay sesión activa
 */
export const useClientAuthRedirect = () => {
  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return

    try {
      const clientToken = localStorage.getItem('lunari_session_token')
      const sessionDataStr = localStorage.getItem('lunari_session_data')

      if (!clientToken || !sessionDataStr) return

      const sessionData = JSON.parse(sessionDataStr)
      const expiresAt = new Date(sessionData.expiresAt)
      const now = new Date()

      // Si el token existe y no ha expirado, redirigir
      if (expiresAt > now && sessionData.companyId) {
        window.location.href = `/portal/${sessionData.companyId}`
      }
    } catch (error) {
      console.log("error: ", error)
    }
  }, [])
}

/**
 * Función utilitaria que verifica si hay una sesión de cliente válida
 * Retorna información sobre la sesión sin hacer redirecciones
 */
export const checkClientSession = () => {
  // Verificar que estamos en el cliente
  if (typeof window === 'undefined') {
    return {
      hasValidSession: false,
      companyId: null
    }
  }

  try {
    const clientToken = localStorage.getItem('lunari_session_token')
    const sessionDataStr = localStorage.getItem('lunari_session_data')

    if (!clientToken || !sessionDataStr) {
      return {
        hasValidSession: false,
        companyId: null
      }
    }

    const sessionData = JSON.parse(sessionDataStr)
    const expiresAt = new Date(sessionData.expiresAt)
    const now = new Date()

    // Si el token existe y no ha expirado
    if (expiresAt > now && sessionData.companyId) {
      return {
        hasValidSession: true,
        companyId: sessionData.companyId
      }
    }
  } catch (error) {
    console.log("error: ", error)
  }

  return {
    hasValidSession: false,
    companyId: null
  }
}

