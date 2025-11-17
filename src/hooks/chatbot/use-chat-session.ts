/**
 * Hook para gestionar sesiones de usuario en el chatbot
 * Maneja tokens JWT, localStorage y reconocimiento automático
 */

import { useState, useEffect, useRef } from 'react'

interface SessionData {
  customerId: string
  email: string
  name?: string
  companyId?: string
  expiresAt: string
}

interface ChatSession {
  token: string | null
  data: SessionData | null
  isAuthenticated: boolean
}

export const useChatSession = () => {
  const [session, setSession] = useState<ChatSession>({
    token: null,
    data: null,
    isAuthenticated: false
  })
  const isInitialLoadRef = useRef(true)

  // Cargar sesión desde localStorage al montar
  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return

    const loadSessionWrapper = () => {
      try {
        const token = localStorage.getItem('lunari_session_token')
        const dataStr = localStorage.getItem('lunari_session_data')

        if (token && dataStr) {
          const data = JSON.parse(dataStr) as SessionData

          // Verificar si no ha expirado
          const expiresAt = new Date(data.expiresAt)
          const now = new Date()

          if (expiresAt > now) {
            setSession({
              token,
              data,
              isAuthenticated: true
            })
            console.log('Sesión recuperada:', data.email)
            return true
          } else {
            console.log('Sesión expirada, limpiando...')
            // Limpiar directamente
            localStorage.removeItem('lunari_session_token')
            localStorage.removeItem('lunari_session_data')
            setSession({
              token: null,
              data: null,
              isAuthenticated: false
            })
            return false
          }
        }
      } catch (error) {
        console.error('❌ Error al cargar sesión:', error)
        // Limpiar directamente
        localStorage.removeItem('lunari_session_token')
        localStorage.removeItem('lunari_session_data')
        setSession({
          token: null,
          data: null,
          isAuthenticated: false
        })
      }
      return false
    }

    loadSessionWrapper()

    // Escuchar cambios en localStorage (cuando se guarda desde otro componente)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lunari_session_token' || e.key === 'lunari_session_data') {
        loadSessionWrapper()
      }
    }

    // Escuchar evento personalizado para cambios en la misma ventana
    const handleSessionUpdate = () => {
      // Evitar ejecutar en la carga inicial para prevenir loops
      if (!isInitialLoadRef.current) {
        loadSessionWrapper()
      }
    }

    // Escuchar evento de limpieza de sesión
    const handleSessionCleared = () => {
      // Usar setTimeout para evitar problemas durante el renderizado
      setTimeout(() => {
        setSession({
          token: null,
          data: null,
          isAuthenticated: false
        })
      }, 0)
    }

    // Marcar que la carga inicial terminó después de un pequeño delay
    const initialLoadTimer = setTimeout(() => {
      isInitialLoadRef.current = false
    }, 500)

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('lunari_session_updated', handleSessionUpdate)
    window.addEventListener('lunari_session_cleared', handleSessionCleared)

    return () => {
      clearTimeout(initialLoadTimer)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('lunari_session_updated', handleSessionUpdate)
      window.removeEventListener('lunari_session_cleared', handleSessionCleared)
    }
  }, [])

  /**
   * Carga la sesión desde localStorage si existe
   */
  const loadSession = () => {
    try {
      const token = localStorage.getItem('lunari_session_token')
      const dataStr = localStorage.getItem('lunari_session_data')

      if (token && dataStr) {
        const data = JSON.parse(dataStr) as SessionData

        // Verificar si no ha expirado
        const expiresAt = new Date(data.expiresAt)
        const now = new Date()

        if (expiresAt > now) {
          setSession({
            token,
            data,
            isAuthenticated: true
          })
          console.log('Sesión recuperada:', data.email)

          // Calcular días restantes
          const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          console.log(`Sesión expira en ${daysRemaining} días`)

          return true
        } else {
          console.log('Sesión expirada, limpiando...')
          clearSession()
          return false
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar sesión:', error)
      clearSession()
    }
    return false
  }

  /**
   * Guarda una nueva sesión en localStorage
   */
  const saveSession = (token: string, data: SessionData) => {
    try {
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') return

      localStorage.setItem('lunari_session_token', token)
      localStorage.setItem('lunari_session_data', JSON.stringify(data))

      setSession({
        token,
        data,
        isAuthenticated: true
      })

      console.log('Sesión guardada:', data.email)

      // Disparar evento de forma asíncrona para evitar problemas durante el renderizado
      setTimeout(() => {
        window.dispatchEvent(new Event('lunari_session_updated'))
      }, 0)
    } catch (error) {
      console.error('❌ Error al guardar sesión:', error)
    }
  }

  /**
   * Limpia la sesión actual
   */
  const clearSession = () => {
    try {
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') return

      localStorage.removeItem('lunari_session_token')
      localStorage.removeItem('lunari_session_data')

      setSession({
        token: null,
        data: null,
        isAuthenticated: false
      })

      // Disparar evento de forma asíncrona para evitar problemas durante el renderizado
      setTimeout(() => {
        window.dispatchEvent(new Event('lunari_session_updated'))
        window.dispatchEvent(new Event('lunari_session_cleared'))
      }, 0)

      console.log('Sesión limpiada')
    } catch (error) {
      console.error('❌ Error al limpiar sesión:', error)
    }
  }

  /**
   * Actualiza la sesión con un nuevo token (refresh)
   */
  const updateSession = (newToken: string) => {
    if (session.data) {
      saveSession(newToken, session.data)
      console.log('Token actualizado')
    }
  }

  return {
    // Estado
    session,
    token: session.token,
    sessionData: session.data,
    isAuthenticated: session.isAuthenticated,

    // Funciones
    saveSession,
    clearSession,
    updateSession,
    loadSession,
  }
}

