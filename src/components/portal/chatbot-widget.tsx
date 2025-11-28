'use client'

import React from 'react'
import { useChatBot } from '@/hooks/chatbot/use-chatbot'
import { useCart } from '@/context/portal/cart-context'
import { BotWindow } from '@/components/chatbot/window'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { BotIcon } from '@/icons/bot-icon'

interface ChatbotWidgetProps {
  companyId: string
  className?: string
}

export function ChatbotWidget({ companyId, className }: ChatbotWidgetProps) {
  const { addItem } = useCart()

  const {
    onOpenChatBot,
    botOpened,
    onChats,
    register,
    onStartChatting,
    onAiTyping,
    messageWindowRef,
    currentBot,
    loading,
    onRealTime,
    setOnChats,
    errors,
    sessionData,
    isAuthenticated,
    clearSession,
    isHumanMode,
    onToggleHumanMode,
    isToggleDisabled,
  } = useChatBot(companyId) // Pasar companyId directamente

  // Función para agregar producto al carrito desde el chatbot
  const handleProductRecommended = (productId: string, productName: string) => {
    // Aquí podrías obtener el producto completo desde el contexto o hacer una búsqueda
    // Por ahora, esto es un placeholder que se puede mejorar
    console.log('Producto recomendado:', productId, productName)
    // TODO: Implementar lógica para obtener producto y agregarlo al carrito
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {botOpened && (
        <div className="absolute bottom-20 right-0">
          <BotWindow
            errors={errors}
            setChat={setOnChats}
            realtimeMode={onRealTime}
            helpdesk={currentBot?.helpdesk || []}
            companyName={currentBot?.name || ''}
            ref={messageWindowRef}
            help={currentBot?.chatBot?.helpdesk}
            theme={currentBot?.chatBot?.background}
            textColor={currentBot?.chatBot?.textColor}
            chats={onChats}
            register={register}
            onChat={onStartChatting}
            onResponding={onAiTyping}
            sessionData={sessionData}
            isAuthenticated={isAuthenticated}
            onClearSession={clearSession}
            isHumanMode={isHumanMode}
            onToggleHumanMode={onToggleHumanMode}
            isToggleDisabled={isToggleDisabled}
          />
        </div>
      )}
      <div
        className={cn(
          'rounded-full relative cursor-pointer shadow-lg w-16 h-16 flex items-center justify-center bg-grandis hover:bg-orange-400 transition-colors duration-200',
          loading ? 'invisible' : 'visible'
        )}
        onClick={onOpenChatBot}
      >
        {/* Badge de sesión activa */}
        {isAuthenticated && sessionData && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}

        {currentBot?.chatBot?.icon ? (
          <Image
            src={`https://ucarecdn.com/${currentBot.chatBot.icon}/`}
            alt="bot"
            fill
            className="p-2 rounded-full"
          />
        ) : (
          <BotIcon />
        )}
      </div>
    </div>
  )
}

