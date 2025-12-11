'use client'

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { User, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, extractUUIDFromString, getMonthName } from '@/lib/utils'

type Props = {
  message: {
    role: 'user' | 'assistant'
    content: string
    link?: string
    imageUrl?: string
  }
  createdAt?: Date | string
}

const Bubble = ({ message, createdAt }: Props) => {
  // Validación de seguridad para evitar errores
  if (!message || !message.content) {
    return null
  }

  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  let d = new Date()

  // SIMPLIFICADO: Usar directamente la URL de imagen del mensaje
  const imageUrl = message.imageUrl

  // Cerrar lightbox con Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false)
      }
    }

    if (isLightboxOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevenir scroll del body cuando el lightbox está abierto
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isLightboxOpen])

  return (
    <div
      className={cn(
        'flex items-start',
        message.role == 'assistant' ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1 min-w-[150px] max-w-[280px] p-3 rounded-2xl',
          message.role == 'assistant'
            ? 'bg-cream text-gravel'
            : 'bg-orange text-white'
        )}
      >
        <div className={cn(
          'text-xs leading-relaxed whitespace-pre-line',
          message.role == 'assistant' ? 'text-gravel' : 'text-white'
        )}>
          {/* SIEMPRE mostrar el texto del producto */}
          {message.content.replace('(complete)', ' ')}
          {message.link && (
            <Link
              className={cn(
                'underline font-medium pl-1',
                message.role == 'assistant' ? 'text-orange' : 'text-white/90'
              )}
              href={message.link}
              target="_blank"
            >
              Ver enlace
            </Link>
          )}
        </div>

        {/* Si hay imagen, mostrarla debajo del texto */}
        {imageUrl && (
          <>
            <div
              className="relative w-20 h-20 rounded-md overflow-hidden bg-gray-100 mt-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsLightboxOpen(true)}
            >
              <Image
                src={imageUrl}
                fill
                alt="Imagen del producto"
                className="object-cover"
                sizes="80px"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  const container = target.parentElement
                  if (container) {
                    container.innerHTML = `
                      <div class="flex items-center justify-center h-full text-xs text-gray-500">
                        <div class="text-center">
                          <div class="mb-1">🖼️</div>
                          <div>Imagen no disponible</div>
                        </div>
                      </div>
                    `
                  }
                }}
              />
            </div>

            {/* Lightbox */}
            {isLightboxOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in-0"
                onClick={() => setIsLightboxOpen(false)}
              >
                {/* Botón cerrar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsLightboxOpen(false)
                  }}
                  className="absolute top-4 right-4 z-[60] rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors"
                  aria-label="Cerrar imagen"
                >
                  <X className="h-6 w-6 text-white" />
                </button>

                {/* Imagen expandida */}
                <div
                  className="relative z-[55] w-auto max-w-[95vw] h-auto max-h-[90vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={imageUrl}
                      alt="Imagen del producto ampliada"
                      className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                      style={{ opacity: 1, display: 'block' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const container = target.parentElement
                        if (container) {
                          container.innerHTML = `
                            <div class="flex items-center justify-center h-full text-white">
                              <div class="text-center">
                                <div class="mb-2 text-4xl">🖼️</div>
                                <div class="text-lg">Imagen no disponible</div>
                              </div>
                            </div>
                          `
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Bubble
