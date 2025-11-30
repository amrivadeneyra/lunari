import { onAiChatBotAssistant, onGetCurrentChatBot } from '@/action/bot'
import { onUpdateConversationState, onToggleRealtime } from '@/action/conversation'
import { postToParent, socketClientUtils } from '@/lib/utils'
import {
  ChatBotMessageProps,
  ChatBotMessageSchema,
} from '@/schemas/conversation.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConversationState } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import { UploadClient } from '@uploadcare/upload-client'
import { useForm } from 'react-hook-form'
import { useChatSession } from './use-chat-session'

const upload = new UploadClient({
  publicKey: process.env.NEXT_PUBLIC_UPLOAD_CARE_PUBLIC_KEY as string,
})

export const useChatBot = (companyId?: string) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatBotMessageProps>({
    resolver: zodResolver(ChatBotMessageSchema),
  })

  const {
    token: sessionToken,
    sessionData,
    isAuthenticated,
    saveSession,
    clearSession
  } = useChatSession()

  const [currentBot, setCurrentBot] = useState<
    | {
      name: string
      chatBot: {
        id: string
        icon: string | null
        welcomeMessage: string | null
        background: string | null
        textColor: string | null
        helpdesk: boolean
      } | null
      helpdesk: {
        id: string
        question: string
        answer: string
        companyId: string | null
      }[]
    }
    | undefined
  >()
  const messageWindowRef = useRef<HTMLDivElement | null>(null)
  const [botOpened, setBotOpened] = useState<boolean>(false)
  const onOpenChatBot = () => setBotOpened((prev) => !prev)
  const [loading, setLoading] = useState<boolean>(true)
  const [onChats, setOnChats] = useState<
    { role: 'user' | 'assistant'; content: string; link?: string }[]
  >([])
  const [onAiTyping, setOnAiTyping] = useState<boolean>(false)
  const [currentBotId, setCurrentBotId] = useState<string>()
  const [onRealTime, setOnRealTime] = useState<
    { chatroom: string; mode: boolean } | undefined
  >(undefined)

  // Estado para el toggle de modo humano
  const [isHumanMode, setIsHumanMode] = useState<boolean>(false)

  // Almacenar chatroom actual para el toggle
  const [currentChatRoom, setCurrentChatRoom] = useState<string | undefined>(undefined)

  const selectedConversationIdRef = useRef<string | undefined>(undefined)

  const onScrollToBottom = () => {
    messageWindowRef.current?.scroll({
      top: messageWindowRef.current.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    onScrollToBottom()
  }, [onChats, messageWindowRef])

  useEffect(() => {
    // Solo enviar postMessage si NO estamos en el portal (compatibilidad con iframe)
    if (!companyId) {
      postToParent(
        JSON.stringify({
          width: botOpened ? 550 : 80,
          height: botOpened ? 800 : 80,
        })
      )
    }
  }, [botOpened, companyId])

  let limitRequest = 0

  const onGetCompanyChatBot = async (idOrName: string) => {
    setCurrentBotId(idOrName)
    const chatbot = await onGetCurrentChatBot(idOrName)
    if (chatbot) {
      let welcomeMessage = chatbot.chatBot?.welcomeMessage!

      if (isAuthenticated && sessionData?.name) {
        welcomeMessage = `¡Hola de nuevo ${sessionData.name}! 👋\n${welcomeMessage}`
      }

      setOnChats((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: welcomeMessage,
        },
      ])
      setCurrentBot(chatbot)
      setLoading(false)
      if (chatbot.customer && chatbot.customer.length > 0) {
        const customer = chatbot.customer[0]
        if (customer.conversations && customer.conversations.length > 0) {
          const chatRoom = customer.conversations[0]

          // Determinar modo inicial basado en conversationState (solo para UI)
          // PERO NO establecer currentChatRoom - eso se hace cuando el usuario selecciona un chat
          const isInitiallyHumanMode = chatRoom.conversationState === 'ESCALATED'
          setIsHumanMode(isInitiallyHumanMode)

          // Configurar tiempo real si está en modo humano (solo para UI)
          if (isInitiallyHumanMode) {
            setOnRealTime({
              chatroom: chatRoom.id,
              mode: true
            })
          }
        }
      }
    } else {
      console.error('No se pudo encontrar el chatbot para:', idOrName)
    }
  }

  // Si companyId viene como prop, usarlo directamente
  useEffect(() => {
    if (companyId) {
      if (limitRequest < 1) {
        onGetCompanyChatBot(companyId)
        limitRequest++
      }
    } else {
      // Mantener compatibilidad con iframe (postMessage)
      window.addEventListener('message', (e) => {
        const botid = e.data
        if (limitRequest < 1 && typeof botid == 'string') {
          onGetCompanyChatBot(botid)
          limitRequest++
        }
      })
    }
  }, [companyId])

  const onStartChatting = handleSubmit(async (values) => {
    if (values.image && values.image.length) {
      const uploaded = await upload.uploadFile(values.image[0])
      const userImageId = `user-image-local-${Date.now()}`
      setOnChats((prev: any) => [
        ...prev,
        {
          id: userImageId,
          role: 'user',
          content: uploaded.uuid,
        },
      ])

      if (!onRealTime?.mode) {
        setOnAiTyping(true)
      }

      console.log('142')

      // Usar currentChatRoom o realtimeMode?.chatroom si está disponible
      const conversationId = currentChatRoom || onRealTime?.chatroom || undefined
      const response = await onAiChatBotAssistant(currentBotId!, onChats, 'user', uploaded.uuid, sessionToken || undefined, conversationId)

      // ENVIAR IMAGEN DEL CLIENTE A PUSHER SI ESTÁ EN MODO LIVE
      if (response && 'live' in response && response.live && 'chatRoom' in response && response.chatRoom) {
        try {
          const { onRealTimeChat } = await import('@/action/conversation')
          await onRealTimeChat(
            response.chatRoom,
            uploaded.uuid,
            `user-${Date.now()}`,
            'user'
          )
        } catch (error) {
          console.error(`❌ Chatbot: Error al enviar imagen a Pusher:`, error)
        }
      }

      if (response) {
        if (!onRealTime?.mode) {
          setOnAiTyping(false)
        }

        if ('sessionToken' in response && 'sessionData' in response && response.sessionToken && response.sessionData) {
          const sessionDataToSave = {
            ...response.sessionData,
            expiresAt: response.sessionData.expiresAt instanceof Date
              ? response.sessionData.expiresAt.toISOString()
              : response.sessionData.expiresAt
          }
          saveSession(response.sessionToken, sessionDataToSave as any)
        }

        if ('live' in response && response.live && 'chatRoom' in response && response.chatRoom) {
          setOnRealTime((prev) => ({
            ...prev,
            chatroom: response.chatRoom,
            mode: response.live,
          }))

          // ALMACENAR CHATROOM ACTUAL
          setCurrentChatRoom(response.chatRoom)

          // ACTUALIZAR MODO DEL TOGGLE CUANDO SE ESCALA A HUMANO
          setIsHumanMode(true)
        } else if ('response' in response && response.response) {
          setOnChats((prev: any) => [...prev, response.response])
        }
      }
    }
    reset()

    if (values.content) {
      const userMessageId = `user-local-${Date.now()}`
      setOnChats((prev: any) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: values.content,
        },
      ])

      if (!onRealTime?.mode) {
        setOnAiTyping(true)
      }

      console.log('187 - Enviando mensaje de texto')

      // Prioridad: selectedConversationIdRef (seleccionado explícitamente) > currentChatRoom > realtimeMode?.chatroom
      // selectedConversationIdRef se actualiza cuando el usuario hace click en una conversación desde window.tsx
      const conversationId = selectedConversationIdRef.current || currentChatRoom || onRealTime?.chatroom || undefined

      // Si no hay conversationId, esto es un error porque no sabemos a qué conversación guardar
      if (!conversationId) {
        console.error('❌ ERROR: No se pudo determinar conversationId. Se requiere seleccionar un chat antes de enviar un mensaje.')
        // No continuar si no hay conversationId - el usuario debe seleccionar un chat primero
        return
      }

      const response = await onAiChatBotAssistant(currentBotId!, onChats, 'user', values.content, sessionToken || undefined, conversationId)

      // ENVIAR MENSAJE DEL CLIENTE A PUSHER SI ESTÁ EN MODO LIVE
      if (response && 'live' in response && response.live && 'chatRoom' in response && response.chatRoom) {
        try {
          const { onRealTimeChat } = await import('@/action/conversation')
          await onRealTimeChat(
            response.chatRoom,
            values.content,
            `user-${Date.now()}`,
            'user'
          )
        } catch (error) {
          console.error(`❌ Chatbot: Error al enviar a Pusher:`, error)
        }
      }

      if (response) {
        if (!onRealTime?.mode) {
          setOnAiTyping(false)
        }

        if ('sessionToken' in response && 'sessionData' in response && response.sessionToken && response.sessionData) {
          const sessionDataToSave = {
            ...response.sessionData,
            expiresAt: response.sessionData.expiresAt instanceof Date
              ? response.sessionData.expiresAt.toISOString()
              : response.sessionData.expiresAt
          }
          saveSession(response.sessionToken, sessionDataToSave as any)
        }

        if ('live' in response && response.live && 'chatRoom' in response && response.chatRoom) {
          setOnRealTime((prev) => ({
            ...prev,
            chatroom: response.chatRoom,
            mode: response.live,
          }))

          // ALMACENAR CHATROOM ACTUAL
          setCurrentChatRoom(response.chatRoom)

          // ACTUALIZAR MODO DEL TOGGLE CUANDO SE ESCALA A HUMANO
          setIsHumanMode(true)
        } else if ('response' in response && response.response) {
          setOnChats((prev: any) => [...prev, response.response])
        }
      }
    }
  })

  const handleLogout = () => {
    clearSession()
    setOnChats([
      {
        role: 'assistant',
        content: currentBot?.chatBot?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?'
      },
      {
        role: 'assistant',
        content: `👋 Has cerrado sesión correctamente.
          📧      **Para volver a iniciar sesión:** Simplemente escribe tu correo electrónico y te reconoceremos automáticamente.
                  Ejemplo: "tunombre@email.com"`
      }
    ])
  }

  const handleToggleHumanMode = async (newIsHumanMode: boolean) => {
    setIsHumanMode(newIsHumanMode)

    // Usar el ref del conversationId seleccionado (síncrono) o currentChatRoom como fallback
    const conversationId = selectedConversationIdRef.current || currentChatRoom

    // Actualizar el estado de la conversación y el modo live en la base de datos
    if (conversationId) {
      try {
        const newState = newIsHumanMode ? ConversationState.ESCALATED : ConversationState.ACTIVE
        const newLiveMode = newIsHumanMode // true para humano, false para bot

        // Actualizar conversationState
        await onUpdateConversationState(conversationId, newState)

        // Actualizar live mode
        await onToggleRealtime(conversationId, newLiveMode)

        // Actualizar estado local para mantener sincronización
        setOnRealTime({
          chatroom: conversationId,
          mode: newIsHumanMode
        })

        // Actualizar currentChatRoom si no está actualizado
        if (!currentChatRoom) {
          setCurrentChatRoom(conversationId)
        }

      } catch (error) {
        console.error('❌ Error al actualizar el estado de la conversación:', error)
      }
    } else {
      console.error('❌ No hay chatroom disponible para el toggle')
    }
  }

  // Función wrapper para enviar mensaje con conversationId explícito
  const onStartChattingWithConversationId = (conversationId?: string) => {
    // Actualizar el ref antes de llamar a onStartChatting (síncrono)
    if (conversationId) {
      selectedConversationIdRef.current = conversationId
      setCurrentChatRoom(conversationId)
    } else {
      console.warn('⚠️ No se recibió conversationId en onStartChattingWithConversationId')
    }
    // Llamar a onStartChatting que usará el ref actualizado
    onStartChatting()
  }

  return {
    botOpened,
    onOpenChatBot,
    onStartChatting,
    onStartChattingWithConversationId, // Nueva función que acepta conversationId
    onChats,
    register,
    onAiTyping,
    messageWindowRef,
    currentBot,
    loading,
    setOnChats,
    onRealTime,
    errors,
    // Exportar datos de sesión
    sessionData,
    isAuthenticated,
    clearSession: handleLogout, // Usar versión que limpia el chat
    // Exportar props del toggle
    isHumanMode,
    onToggleHumanMode: handleToggleHumanMode,
    isToggleDisabled: loading, // Solo deshabilitar durante carga inicial
    // Exportar setCurrentChatRoom para actualizar cuando se selecciona una conversación
    setCurrentChatRoom,
    // Exportar función para actualizar el ref del conversationId seleccionado
    setSelectedConversationId: (id: string | undefined) => {
      selectedConversationIdRef.current = id
    }
  }
}

export const useRealTime = (
  chatRoom: string,
  setChats: React.Dispatch<
    React.SetStateAction<
      {
        role: 'user' | 'assistant'
        content: string
        link?: string | undefined
      }[]
    >
  >
) => {
  useEffect(() => {
    // Solo activar si hay chatRoom válido
    if (!chatRoom || chatRoom.trim() === '') {
      return
    }

    // NUEVO: Socket.io Client
    socketClientUtils.subscribe(chatRoom)
    socketClientUtils.bind('realtime-mode', (data: any) => {
      const messageId = data.chat.id || Date.now().toString()

      setChats((prev: any) => {
        const messageExists = prev.some((msg: any) => msg.id === messageId)
        if (messageExists) {
          return prev
        }

        if (data.chat.role === 'user') {
          const userMessageExists = prev.some((msg: any) =>
            msg.role === 'user' &&
            msg.content === data.chat.message &&
            msg.id?.startsWith('user-local')
          )
          if (userMessageExists) {
            return prev
          }
        }

        return [...prev, {
          id: messageId,
          role: data.chat.role,
          content: data.chat.message,
          createdAt: data.chat.createdAt ? new Date(data.chat.createdAt) : new Date(),
        }]
      })
    })

    return () => {
      // Socket.io Client
      socketClientUtils.unbind('realtime-mode')
      socketClientUtils.unsubscribe(chatRoom)
    }
  }, [chatRoom, setChats])
}

