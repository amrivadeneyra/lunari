import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { User } from 'lucide-react'
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

  let d = new Date()

  // SIMPLIFICADO: Usar directamente la URL de imagen del mensaje
  const imageUrl = message.imageUrl

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
          <div className="relative aspect-square rounded-md overflow-hidden bg-gray-100 mt-2">
            <Image
              src={imageUrl}
              fill
              alt="Imagen del producto"
              className="object-cover"
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
        )}
      </div>
    </div>
  )
}

export default Bubble
