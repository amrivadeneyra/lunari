'use client'

import React, { useState, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { User, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, extractUUIDFromString, getMonthName } from '@/lib/utils'

/**
 * Procesa texto en negrita (**texto**) y retorna elementos React
 */
const formatBoldText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let matchIndex = 0
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    // Texto antes de la negrita
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    // Texto en negrita
    parts.push(
      <strong key={`bold-${matchIndex}`} className="font-semibold">
        {match[1]}
      </strong>
    )
    lastIndex = match.index + match[0].length
    matchIndex++
  }

  // Texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * Componente para renderizar texto con formato inline (negritas)
 */
const InlineFormattedText: React.FC<{ text: string }> = ({ text }) => {
  const formattedParts = formatBoldText(text)
  return <>{formattedParts}</>
}

/**
 * Componente para renderizar una lista
 */
const MarkdownList: React.FC<{
  items: string[]
  ordered: boolean
  listKey: string
}> = ({ items, ordered, listKey }) => {
  const ListTag = ordered ? 'ol' : 'ul'
  const listItems = items.map((item, idx) => {
    const cleanedItem = item.replace(/^[-*]\s+|^\d+\.\s+/, '')
    return (
      <li key={`${listKey}-item-${idx}`} className="ml-4 mb-1">
        <InlineFormattedText text={cleanedItem} />
      </li>
    )
  })

  return (
    <ListTag key={listKey} className="mb-2 space-y-1">
      {listItems}
    </ListTag>
  )
}

/**
 * Convierte markdown básico a JSX siguiendo buenas prácticas de React
 */
const formatMarkdown = (text: string): React.ReactNode => {
  if (!text) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listCounter = 0
  let elementCounter = 0

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      elements.push(
        <MarkdownList
          key={`list-${listCounter}`}
          items={currentList}
          ordered={listType === 'ol'}
          listKey={`list-${listCounter}`}
        />
      )
      listCounter++
      currentList = []
      listType = null
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()

    // Detectar listas con guiones o asteriscos
    if (/^[-*]\s+/.test(trimmedLine)) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      currentList.push(trimmedLine)
      return
    }

    // Detectar listas numeradas
    if (/^\d+\.\s+/.test(trimmedLine)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      currentList.push(trimmedLine)
      return
    }

    // Procesar lista pendiente antes de continuar
    flushList()

    // Procesar líneas normales
    if (trimmedLine) {
      const isHeading = trimmedLine.startsWith('💡') || trimmedLine.startsWith('📋')
      elements.push(
        <div
          key={`line-${elementCounter}`}
          className={isHeading ? 'mb-2 font-semibold' : 'mb-1'}
        >
          <InlineFormattedText text={trimmedLine} />
        </div>
      )
      elementCounter++
    } else {
      // Línea vacía = separador de párrafo
      elements.push(<div key={`empty-${elementCounter}`} className="mb-2" />)
      elementCounter++
    }
  })

  // Procesar cualquier lista pendiente al final
  flushList()

  return <>{elements}</>
}

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

  // SIMPLIFICADO: Usar directamente la URL de imagen del mensaje
  const imageUrl = message.imageUrl

  // Memoizar el contenido formateado para evitar re-renderizados innecesarios
  const formattedContent = useMemo(() => {
    const cleanedContent = message.content.replace('(complete)', ' ')
    return formatMarkdown(cleanedContent)
  }, [message.content])

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
          'text-xs leading-relaxed',
          message.role == 'assistant' ? 'text-gravel' : 'text-white'
        )}>
          {/* Renderizar markdown formateado (memoizado) */}
          {formattedContent}
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
