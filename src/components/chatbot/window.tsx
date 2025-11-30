import { ChatBotMessageProps } from '@/schemas/conversation.schema'
import React, { forwardRef, useState, useEffect } from 'react'
import { UseFormRegister } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import ChatModeToggle from './chat-mode-toggle'
import Bubble from './bubble'
import { Responding } from './responding'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Send, Home, MessageCircle, HelpCircle, ChevronRight, Search, ArrowRight, ChevronLeft, X, Maximize2, MoreVertical } from 'lucide-react'
import Image from 'next/image'
import { onGetCustomerConversations, onGetChatMessages } from '@/action/conversation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

type Props = {
  errors: any
  register: UseFormRegister<ChatBotMessageProps>
  chats: { role: 'user' | 'assistant'; content: string; link?: string }[]
  onChat(conversationId?: string): void
  onResponding: boolean
  companyName: string
  theme?: string | null
  textColor?: string | null
  help?: boolean
  realtimeMode:
  | {
    chatroom: string
    mode: boolean
  }
  | undefined
  helpdesk: {
    id: string
    question: string
    answer: string
    companyId: string | null
  }[]
  setChat: React.Dispatch<
    React.SetStateAction<
      {
        role: 'user' | 'assistant'
        content: string
        link?: string | undefined
      }[]
    >
  >
  // Nuevos props para el toggle de modo
  onToggleHumanMode: (isHumanMode: boolean) => void
  isHumanMode?: boolean
  isToggleDisabled?: boolean
  // Props de sesión
  sessionData?: {
    customerId: string
    email: string
    name?: string
    expiresAt: string
  } | null
  isAuthenticated?: boolean
  onClearSession?: () => void
  // Props para actualizar cuando se selecciona un chat (opcionales porque solo se usan cuando hay un chat seleccionado)
  setCurrentChatRoom?: (chatRoom: string | undefined) => void
  setSelectedConversationId?: (id: string | undefined) => void
}

export const BotWindow = forwardRef<HTMLDivElement, Props>(
  (
    {
      register,
      chats,
      onChat,
      onResponding,
      companyName,
      helpdesk,
      realtimeMode,
      setChat,
      textColor,
      theme,
      help,
      // Nuevos props
      sessionData,
      isAuthenticated,
      onClearSession,
      // Props del toggle
      onToggleHumanMode,
      isHumanMode = false,
      isToggleDisabled = false,
      // Prop para actualizar currentChatRoom
      setCurrentChatRoom,
      // Prop para actualizar el ref del conversationId seleccionado
      setSelectedConversationId,
    },
    ref
  ) => {
    // Estado para navegación inferior (solo visual) - sincronizado con tabs
    const [activeTab, setActiveTab] = useState<'inicio' | 'mensajes' | 'soporte'>('mensajes')

    // Estado para FAQ seleccionada (pantalla completa)
    const [selectedFaq, setSelectedFaq] = useState<{
      id: string
      question: string
      answer: string
      companyId: string | null
    } | null>(null)

    // Estado para conversación seleccionada (pantalla completa)
    const [selectedConversation, setSelectedConversation] = useState<{
      id: string
    } | null>(null)

    // Estado para búsqueda en soporte
    const [searchQuery, setSearchQuery] = useState('')

    // Estado para conversaciones del cliente
    const [customerConversations, setCustomerConversations] = useState<
      {
        id: string
        title: string | null
        createdAt: Date
        updatedAt: Date
        live: boolean
        conversationState: string
        messages: {
          message: string
          createdAt: Date
          role: string | null
          seen: boolean
        }[]
      }[]
    >([])
    const [loadingConversations, setLoadingConversations] = useState(false)

    // Filtrar FAQs basado en la búsqueda
    const filteredHelpdesk = helpdesk.filter((faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Función para formatear tiempo relativo (ej: "5h", "2d")
    const formatTimeAgo = (date: Date): string => {
      const now = new Date()
      const diffMs = now.getTime() - new Date(date).getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 60) {
        return diffMins <= 1 ? 'Ahora' : `${diffMins}m`
      } else if (diffHours < 24) {
        return `${diffHours}h`
      } else if (diffDays < 7) {
        return `${diffDays}d`
      } else {
        return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      }
    }

    // Cargar conversaciones cuando se active el tab de mensajes
    useEffect(() => {
      const loadConversations = async () => {
        if (activeTab === 'mensajes' && isAuthenticated && sessionData?.customerId) {
          setLoadingConversations(true)
          try {
            const conversations = await onGetCustomerConversations(sessionData.customerId)
            if (conversations) {
              setCustomerConversations(conversations)
            }
          } catch (error) {
            console.error('Error al cargar conversaciones:', error)
          } finally {
            setLoadingConversations(false)
          }
        }
      }

      loadConversations()
    }, [activeTab, isAuthenticated, sessionData?.customerId])

    // Cargar mensajes cuando se selecciona una conversación
    useEffect(() => {
      const loadConversationMessages = async () => {
        if (selectedConversation?.id) {
          try {
            // El conversationId ya se actualizó de forma síncrona en el onClick
            // Solo cargar los mensajes aquí
            const conversationData = await onGetChatMessages(selectedConversation.id)
            if (conversationData && conversationData.messages) {
              // Convertir los mensajes al formato esperado por el componente
              const formattedMessages = conversationData.messages.map((msg: any) => ({
                role: msg.role || 'assistant',
                content: msg.message || '',
                link: undefined
              }))

              // Actualizar los chats
              setChat(formattedMessages)
            }
          } catch (error) {
            console.error('Error al cargar mensajes de la conversación:', error)
          }
        }
      }

      loadConversationMessages()
    }, [selectedConversation?.id, setChat])

    // Función para resaltar palabras completas que contienen la búsqueda
    const highlightText = (text: string, query: string) => {
      if (!query.trim()) return text

      // Dividir el texto en palabras y espacios, preservando puntuación
      const parts = text.split(/(\s+)/)

      return parts.map((part, index) => {
        // Si es un espacio, devolverlo tal cual
        if (/^\s+$/.test(part)) return part

        // Separar palabra de puntuación
        const match = part.match(/^([^\w]*)(\w+)([^\w]*)$/)
        if (!match) return part

        const [, before, word, after] = match

        // Si la palabra contiene el query (case insensitive)
        if (word.toLowerCase().includes(query.toLowerCase())) {
          return (
            <span key={index}>
              {before}
              <span className="text-orange font-semibold">{word}</span>
              {after}
            </span>
          )
        }
        return part
      })
    }

    // Función para cambiar desde navegación inferior
    const handleBottomNavClick = (nav: 'home' | 'messages' | 'help') => {
      const tabMap = {
        'home': 'inicio',
        'messages': 'mensajes',
        'help': 'soporte'
      }
      setActiveTab(tabMap[nav] as 'inicio' | 'mensajes' | 'soporte')
      setSearchQuery('') // Limpiar búsqueda al cambiar de tab
    }

    return (
      <div className="h-[500px] w-[380px] flex flex-col bg-white rounded-xl overflow-hidden shadow-lg">
        {/* esto saldra unicamente cuando estes dentro de un chat en especifico */}
        {/* {activeTab === 'mensajes' && (
          <div className="bg-white border-b border-orange/10 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-8 h-8">
              <AvatarImage
                src="https://github.com/shadcn.png"
                alt="@shadcn"
              />
                  <AvatarFallback className="bg-orange/10 text-orange font-medium text-xs">
                    {companyName.charAt(0).toUpperCase()}
                  </AvatarFallback>
            </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gravel leading-tight truncate">
                {isHumanMode ? 'Agente Humano' : 'Asistente Virtual'}
              </h3>
                  <p className="text-[10px] text-ironside/60 truncate">
                    {isAuthenticated && sessionData ? (sessionData.name || sessionData.email) : 'El equipo también puede ayudar'}
                  </p>
                </div>
            </div>

              {isAuthenticated && (
                  <ChatModeToggle
                    isHumanMode={isHumanMode}
                    onToggle={onToggleHumanMode}
                    disabled={isToggleDisabled}
                  conversationId={realtimeMode?.chatroom}
                    setChats={setChat}
                  />
              )}
            </div>
          </div>
        )} */}

        {/* CONTENIDO PRINCIPAL - Ocupa espacio restante */}
        <div className="flex-1 min-h-0 flex flex-col relative">
          {/* TAB: INICIO/BIENVENIDA*/}
          {activeTab === 'inicio' && (
            <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-orange/15 via-peach/30 to-cream/50">
              <div className="overflow-y-auto overflow-x-hidden flex flex-col flex-1 scrollbar-custom">
                {/* Logo y nombre de la empresa*/}
                <div className="px-8 pt-5 pb-12 flex-shrink-0 flex items-center gap-3">
                  <div className="relative w-28 h-12 flex-shrink-0">
                    <Image
                      src="/images/corinna-ai-logo-mini.png"
                      alt="Lunari AI"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-ironside/60">{companyName}</p>
                  </div>
                </div>

                {/* Saludo */}
                <div className="px-8 pb-6 flex-shrink-0">
                  <h2 className="text-2xl font-semibold text-gravel mb-2">
                    ¡Hola{isAuthenticated && sessionData?.name ? `, ${sessionData.name}` : ''}!
                  </h2>
                  <p className="text-xl font-semibold text-ironside/60">
                    ¿En qué puedo ayudarte hoy?
                  </p>
                </div>

                {/* Cards y contenido */}
                <div className="px-5 flex flex-col gap-3 flex-1 pb-5">
                  {/* Recent message Card */}
                  {chats.length > 0 && (
                    <div className="bg-white rounded-lg border p-4 cursor-pointer border-orange/20 transition-colors shadow-sm">
                      <p className="text-xs font-medium text-ironside/70 mb-3">Mensaje reciente</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image
                              src="/images/lunari-avatar.png"
                              alt="Lunari"
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gravel font-normal line-clamp-1">
                              {chats[chats.length - 1]?.content || 'Mensaje reciente'}
                            </p>
                            <p className="text-[10px] text-ironside/60 mt-1">
                              Lunari • Ahora
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-ironside/40 flex-shrink-0 ml-3" />
                      </div>
                    </div>
                  )}

                  {/* Search for help */}
                  <div className="bg-white rounded-lg border p-4 cursor-pointer border-orange/20 transition-colors shadow-sm">
                    {/* Input de búsqueda - Click redirige a soporte */}
                    <div
                      className="mb-3 relative"
                      onClick={() => setActiveTab('soporte')}
                    >
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange" />
                      <div className="w-full border border-ironside/20 bg-ironside/5 hover:bg-orange/10 hover:border-orange/30 hover:text-orange rounded-lg px-3 py-2 text-xs text-ironside/70 cursor-pointer transition-colors">
                        Buscar ayuda
                      </div>
                    </div>

                    {/* Lista de temas de ayuda */}
                    {helpdesk.length > 0 && (
                      <div className="space-y-0">
                        {helpdesk.slice(0, 4).map((faq) => (
                          <button
                            key={faq.id}
                            onClick={() => setSelectedFaq(faq)}
                            className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-orange/10 rounded-lg transition-colors group"
                          >
                            <p className="text-xs text-gravel font-normal line-clamp-1 flex-1 px-3">
                              {faq.question}
                            </p>
                            <ChevronRight className="w-4 h-4 text-orange flex-shrink-0 mr-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ask a question */}
                  <div className="bg-white rounded-lg border p-4 cursor-pointer border-orange/20 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gravel">Hacer una pregunta</p>
                        <p className="text-[10px] text-ironside/60 mt-1">
                          El agente de IA y el equipo pueden ayudar
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0 ml-3">
                        <HelpCircle className="w-5 h-5 text-orange" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* esto saldra unicamente cuando estes dentro de un chat en especifico */}
          {/* {activeTab === 'mensajes' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex flex-col flex-1 min-h-0">
                <div
                  style={{
                    background: theme || 'transparent',
                    color: textColor || '',
                  }}
                  className="px-5 flex flex-col py-5 gap-4 chat-window overflow-y-auto overflow-x-hidden flex-1 min-h-0"
                  ref={ref}
                >
                  {chats.map((chat, key) => (
                    <Bubble
                      key={key}
                      message={chat}
                    />
                  ))}
                  {onResponding && <Responding />}
                </div>
                <form
                  onSubmit={onChat}
                  className="px-5 py-4 bg-white border-t border-orange/10 flex-shrink-0"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      {...register('content')}
                      placeholder="Escribe tu mensaje..."
                      className="focus-visible:ring-0 flex-1 px-4 py-2.5 focus-visible:ring-offset-0 bg-cream/50 rounded-lg outline-none border border-orange/10 text-xs text-gravel placeholder:text-ironside/50 focus:border-orange focus:bg-white transition-all"
                    />
                    <Button
                      type="submit"
                      className="p-2 h-9 w-9 rounded-lg bg-orange hover:bg-orange/90 text-white transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )} */}

          {activeTab === 'mensajes' && (
            <div className="absolute inset-0 flex flex-col bg-cream/20">
              {/* Header con título y botón cerrar */}
              <div className="px-4 py-3 bg-white border-b border-orange/10 flex-shrink-0 flex items-center justify-center relative">
                <h2 className="text-base font-semibold text-gravel">Mensajes</h2>
                <button
                  onClick={() => setActiveTab('inicio')}
                  className="absolute right-4 p-1 hover:bg-orange/10 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-ironside/60" />
                </button>
              </div>

              {/* Lista de conversaciones */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-custom">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-ironside/60">Cargando conversaciones...</p>
                  </div>
                ) : customerConversations.length > 0 ? (
                  <div className="space-y-0">
                    {customerConversations.map((conversation) => {
                      const title = conversation.title || 'Sin título'

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            // Actualizar el conversationId de forma síncrona ANTES de actualizar el estado
                            if (setSelectedConversationId) {
                              setSelectedConversationId(conversation.id)
                            }
                            if (setCurrentChatRoom) {
                              setCurrentChatRoom(conversation.id)
                            }
                            // Luego actualizar el estado para cargar los mensajes
                            setSelectedConversation({ id: conversation.id })
                          }}
                          className="w-full bg-white hover:bg-orange/5 border-b border-orange/10 px-4 py-4 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Icono */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden">
                              <div className="w-full h-full rounded-full flex items-center justify-center">
                                <Image
                                  src="/images/lunari-avatar.png"
                                  alt="Lunari"
                                  width={45}
                                  height={50}
                                  className="object-cover"
                                />
                              </div>
                            </div>

                            {/* Contenido del mensaje */}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs text-gravel font-normal line-clamp-2 mb-1">
                                {title}
                              </p>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] text-ironside/60">
                                  Lunari
                                </p>
                                <span className="text-[10px] text-ironside/40">•</span>
                                <p className="text-[10px] text-ironside/60">
                                  {formatTimeAgo(conversation.updatedAt)}
                                </p>
                              </div>
                            </div>

                            {/* Flecha */}
                            <ChevronRight className="w-4 h-4 text-orange flex-shrink-0 self-center" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 h-full">
                    <MessageCircle className="w-12 h-12 text-ironside/40 mb-4" />
                    <p className="text-sm font-semibold text-gravel mb-1">
                      No tienes conversaciones aún
                    </p>
                    <p className="text-xs text-ironside/60">
                      Los mensajes se mostrarán aquí
                    </p>
                  </div>
                )}
              </div>

              {/* Botón "Hacer una pregunta" */}
              <div className="px-4 py-4 bg-white flex-shrink-0">
                <button
                  onClick={() => setActiveTab('inicio')}
                  className="bg-orange hover:bg-orange/90 text-white rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors mx-auto"
                >
                  <span className="text-xs font-medium">Hacer una pregunta</span>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <HelpCircle className="w-3 h-3 text-white" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB: SOPORTE/FAQs */}
          {activeTab === 'soporte' && (
            <div className="absolute inset-0 flex flex-col bg-cream/20">
              {/* Header con título y botón cerrar */}
              <div className="px-4 py-3 bg-white border-b border-orange/10 flex-shrink-0 flex items-center justify-center relative">
                <h2 className="text-base font-semibold text-gravel">Ayuda</h2>
                <button
                  onClick={() => setActiveTab('mensajes')}
                  className="absolute right-4 p-1 hover:bg-orange/10 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-ironside/60" />
                </button>
              </div>

              {/* Search bar */}
              <div className="px-4 py-3 bg-white border-b border-orange/10 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange" />
                  <Input
                    placeholder="Buscar ayuda"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-ironside/20 bg-cream/10 rounded-lg px-3 py-2 pr-10 text-xs text-gravel placeholder:text-ironside/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-orange/30 h-auto transition-colors"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-custom">
                {/* Counter */}
                <div className="px-4 py-4">
                  <p className="text-xs font-medium text-gravel px-2">
                    {filteredHelpdesk.length} {filteredHelpdesk.length === 1 ? 'pregunta' : 'preguntas'}
                  </p>
                </div>

                {filteredHelpdesk.length > 0 ? (
                  <div className="space-y-1">
                    {filteredHelpdesk.map((desk) => (
                      <button
                        key={desk.id}
                        onClick={() => setSelectedFaq(desk)}
                        className="w-full bg-white hover:bg-orange/5 rounded-lg px-6 py-4 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium text-gravel mb-1">
                              {highlightText(desk.question, searchQuery)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-orange flex-shrink-0 ml-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-ironside/60">
                      {searchQuery ? 'No se encontraron resultados' : 'No hay preguntas frecuentes disponibles'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PANTALLA COMPLETA DE FAQ - Cubre todo el chat */}
        {selectedFaq && (
          <div className="absolute inset-0 flex flex-col bg-white z-50 rounded-xl">
            {/* Header con botones de retroceso y cerrar */}
            <div className="bg-white border-b border-orange/10 px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-t-xl">
              <button
                onClick={() => setSelectedFaq(null)}
                className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                aria-label="Volver"
              >
                <ChevronLeft className="w-5 h-5 text-ironside/60" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                  aria-label="Expandir"
                >
                  <Maximize2 className="w-4 h-4 text-ironside/60" />
                </button>
                <button
                  onClick={() => setSelectedFaq(null)}
                  className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4 text-ironside/60" />
                </button>
              </div>
            </div>

            {/* Contenido de la FAQ */}
            <div className="overflow-y-auto overflow-x-hidden px-6 py-6 flex flex-col flex-1 scrollbar-custom bg-white rounded-b-xl">
              {/* Título principal */}
              <h1 className="text-2xl font-bold text-gravel mb-4">
                {selectedFaq.question}
              </h1>

              {/* Contenido directo sin card */}
              <div className="text-sm text-ironside/70 leading-relaxed whitespace-pre-wrap">
                {selectedFaq.answer}
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA COMPLETA DE CONVERSACIÓN - Cubre todo el chat */}
        {selectedConversation && (
          <div className="absolute inset-0 flex flex-col bg-white z-50 rounded-xl">
            {/* Header con información del chat */}
            <div className="bg-white border-b border-orange/10 px-4 py-3 flex-shrink-0 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Botón retroceso */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-1 hover:bg-orange/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Volver"
                  >
                    <ChevronLeft className="w-5 h-5 text-ironside/60" />
                  </button>

                  {/* Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage
                      src="/images/lunari-avatar.png"
                      alt="Lunari"
                    />
                    <AvatarFallback className="bg-orange/10 text-orange font-medium text-xs">
                      {companyName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Información */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gravel leading-tight truncate">
                      Lunari
                    </h3>
                    <p className="text-[10px] text-ironside/60 truncate">
                      Un humano también puede ayudarte
                    </p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isAuthenticated && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                          aria-label="Opciones"
                        >
                          <MoreVertical className="w-4 h-4 text-ironside/60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-2">
                          <p className="text-xs font-semibold text-gravel mb-2">Modo de chat</p>
                          <ChatModeToggle
                            isHumanMode={isHumanMode}
                            onToggle={onToggleHumanMode}
                            disabled={isToggleDisabled}
                            conversationId={selectedConversation.id}
                            setChats={setChat}
                          />
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {!isAuthenticated && (
                    <button
                      className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                      aria-label="Opciones"
                    >
                      <MoreVertical className="w-4 h-4 text-ironside/60" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 hover:bg-orange/10 rounded-lg transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4 text-ironside/60" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido de la conversación */}
            <div className="flex flex-col flex-1 min-h-0">
              <div
                style={{
                  background: theme || 'transparent',
                  color: textColor || '',
                }}
                className="px-5 flex flex-col py-5 gap-4 chat-window overflow-y-auto overflow-x-hidden flex-1 min-h-0"
                ref={ref}
              >
                {chats.map((chat, key) => (
                  <Bubble
                    key={key}
                    message={chat}
                  />
                ))}
                {onResponding && <Responding />}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  // Pasar el conversationId directamente si hay una conversación seleccionada
                  if (selectedConversation?.id) {
                    onChat(selectedConversation.id)
                  } else {
                    console.warn('⚠️ No hay selectedConversation.id, llamando onChat sin parámetros')
                    // Si no hay conversación seleccionada, llamar sin parámetros (comportamiento anterior)
                    onChat()
                  }
                }}
                className="px-5 py-4 bg-white border-t border-orange/10 flex-shrink-0 rounded-b-xl"
              >
                <div className="flex items-center gap-2 w-full">
                  <Input
                    {...register('content')}
                    placeholder="Escribe tu mensaje..."
                    className="focus-visible:ring-0 flex-1 px-4 py-2.5 focus-visible:ring-offset-0 bg-cream/50 rounded-lg outline-none border border-orange/10 text-xs text-gravel placeholder:text-ironside/50 focus:border-orange focus:bg-white transition-all"
                  />
                  <Button
                    type="submit"
                    className="p-2 h-9 w-9 rounded-lg bg-orange hover:bg-orange/90 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* NAVEGACIÓN INFERIOR */}
        {!selectedFaq && !selectedConversation && (
          <div className="border-t border-orange/10 bg-white px-3 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-around">
              <button
                onClick={() => handleBottomNavClick('home')}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${activeTab === 'inicio'
                  ? 'text-orange'
                  : 'text-ironside/50'
                  }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-[10px] font-medium">Inicio</span>
              </button>
              <button
                onClick={() => handleBottomNavClick('messages')}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${activeTab === 'mensajes'
                  ? 'text-orange'
                  : 'text-ironside/50'
                  }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-medium">Mensajes</span>
              </button>
              <button
                onClick={() => handleBottomNavClick('help')}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${activeTab === 'soporte'
                  ? 'text-orange'
                  : 'text-ironside/50'
                  }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-[10px] font-medium">Ayuda</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

BotWindow.displayName = 'BotWindow'
