import { ChatBotMessageProps } from '@/schemas/conversation.schema'
import React, { forwardRef, useState } from 'react'
import { UseFormRegister } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import ChatModeToggle from './chat-mode-toggle'
import { Separator } from '../ui/separator'
import Bubble from './bubble'
import { Responding } from './responding'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Send, Home, MessageCircle, HelpCircle, ChevronRight, Search, CheckCircle2, Bot, ArrowRight, ChevronLeft, X, Maximize2 } from 'lucide-react'
import { CardDescription, CardTitle } from '../ui/card'
import Accordion from '../accordian'
import Image from 'next/image'

type Props = {
  errors: any
  register: UseFormRegister<ChatBotMessageProps>
  chats: { role: 'user' | 'assistant'; content: string; link?: string }[]
  onChat(): void
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
    },
    ref
  ) => {
    // Estado para navegación inferior (solo visual) - sincronizado con tabs
    const [activeTab, setActiveTab] = useState<'inicio' | 'asistente' | 'soporte'>('asistente')

    // Estado para FAQ seleccionada (pantalla completa)
    const [selectedFaq, setSelectedFaq] = useState<{
      id: string
      question: string
      answer: string
      companyId: string | null
    } | null>(null)

    // Función para sincronizar navegación inferior con tabs
    const handleTabChange = (value: string) => {
      setActiveTab(value as 'inicio' | 'asistente' | 'soporte')
    }

    // Función para cambiar desde navegación inferior
    const handleBottomNavClick = (nav: 'home' | 'messages' | 'help') => {
      const tabMap = {
        'home': 'inicio',
        'messages': 'asistente',
        'help': 'soporte'
      }
      setActiveTab(tabMap[nav] as 'inicio' | 'asistente' | 'soporte')
    }

    return (
      <div className="h-[500px] w-[380px] flex flex-col bg-white rounded-xl overflow-hidden shadow-lg">
        {/* HEADER */}
        {activeTab !== 'inicio' && (
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
                  chatRoomId={realtimeMode?.chatroom}
                  setChats={setChat}
                />
              )}
            </div>
          </div>
        )}

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

          {/* TAB: ASISTENTE/CHAT */}
          {activeTab === 'asistente' && (
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
          )}

          {/* TAB: SOPORTE/FAQs */}
          {activeTab === 'soporte' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-4 flex-1 scrollbar-custom">
                <div className="mb-3">
                  <CardTitle className="text-sm font-medium text-gravel">Ayuda</CardTitle>
                </div>

                {helpdesk.length > 0 ? (
                  <div className="space-y-0">
                    {helpdesk.map((desk) => (
                      <Accordion
                        key={desk.id}
                        trigger={desk.question}
                        content={desk.answer}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-xs text-ironside/60">
                      No hay preguntas frecuentes disponibles
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

        {/* NAVEGACIÓN INFERIOR */}
        {!selectedFaq && (
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
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${activeTab === 'asistente'
                  ? 'text-orange'
                  : 'text-ironside/50'
                  }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-medium">Chat</span>
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
