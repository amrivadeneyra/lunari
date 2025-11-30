import { onGetChatMessages, onGetAllCompanyChatRooms, onOwnerSendMessage, onViewUnReadMessages, onToggleFavorite } from '@/action/conversation'
import { useChatContext } from '@/context/user-chat-context'
import { getMonthName, socketClientUtils } from '@/lib/utils'
import { ChatBotMessageSchema, ConversationSearchSchema } from '@/schemas/conversation.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

/**
 * Hook para manejar las conversaciones
 * @returns - El hook para manejar las conversaciones
 */
export const useConversation = () => {
  const { register, watch, setValue } = useForm({
    resolver: zodResolver(ConversationSearchSchema),
    mode: 'onChange',
  })
  const { setLoading: loadMessages, setChats, setChatRoom } = useChatContext()
  const [chatRooms, setChatRooms] = useState<
    {
      id: string
      email: string | null
      name: string | null
      conversations: {
        id: string
        title: string | null
        createdAt: Date
        updatedAt: Date
        isFavorite: boolean
        conversationState: string
        lastUserActivityAt: Date
        hasUnreadMessages: boolean
        unreadCount: number
        message: {
          message: string
          createdAt: Date
          seen: boolean
          role: string
        }[]
      }[]
    }[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('no leidos')

  /**
   * Función para cargar las conversaciones (con loading)
   * @param companyId - ID de la empresa
   */
  const loadChatRooms = async (companyId: string) => {
    if (!companyId) return
    setLoading(true)
    try {
      const rooms = await onGetAllCompanyChatRooms(companyId)
      if (rooms) {
        setLoading(false)
        setChatRooms((rooms as any).customer || [])
      } else {
        setLoading(false)
        setChatRooms([])
      }
    } catch (error) {
      console.log('Error fetching chat rooms:', error)
      setLoading(false)
      setChatRooms([])
    }
  }

  /**
   * Función para refrescar las conversaciones SIN mostrar loading (actualización silenciosa)
   * @param companyId - ID de la empresa
   */
  const refreshChatRoomsSilently = async (companyId: string) => {
    if (!companyId) return
    try {
      const rooms = await onGetAllCompanyChatRooms(companyId)
      if (rooms) {
        setChatRooms((rooms as any).customer || [])
      }
    } catch (error) {
      console.log('Error refreshing chat rooms silently:', error)
      // No hacer nada en caso de error para no interrumpir la UI
    }
  }

  /**
   * Escuchar cambios en el campo company y cargar conversaciones
   * @param companyId - ID de la empresa
   */
  useEffect(() => {
    const subscription = watch(async (value) => {
      if (value.company) {
        await loadChatRooms(value.company)
      }
    })

    const currentValue = watch('company')
    if (currentValue) {
      loadChatRooms(currentValue)
    }

    return () => subscription.unsubscribe()
  }, [watch])

  /**
   * Función para obtener el chat activo
   * @param id - ID de la conversación
   */
  const onGetActiveChatMessages = async (id: string) => {
    try {
      loadMessages(true)

      // Marcar mensajes como leídos cuando se abre el chat
      await onViewUnReadMessages(id)

      // Actualizar el estado local inmediatamente para feedback visual instantáneo
      setChatRooms(prev =>
        prev.map(customerGroup => ({
          ...customerGroup,
          conversations: customerGroup.conversations.map(conversation => {
            if (conversation.id === id) {
              // Marcar como leído usando el campo calculado en el backend
              return {
                ...conversation,
                hasUnreadMessages: false,
                unreadCount: 0,
                message: conversation.message.map(msg => ({
                  ...msg,
                  seen: true
                }))
              }
            }
            return conversation
          })
        }))
      )

      const messages = await onGetChatMessages(id)
      if (messages) {
        setChatRoom(id)
        loadMessages(false)
        setChats(messages.messages)

        const currentCompany = watch('company')
        if (currentCompany) {
          setTimeout(() => {
            refreshChatRoomsSilently(currentCompany)
          }, 1000)
        }
      }
    } catch (error) {
      console.log(error)
      loadMessages(false)
    }
  }

  /**
   * Función para filtrar conversaciones según el tab activo
   * @returns - Las conversaciones filtradas
   */
  const getFilteredChatRooms = () => {
    if (!chatRooms.length) return []

    return chatRooms.filter((customerGroup) => {
      // Si no hay conversaciones, excluir el grupo
      if (!customerGroup.conversations || customerGroup.conversations.length === 0) {
        return false
      }

      const now = new Date()

      switch (activeTab) {
        case 'no leidos':
          // Mostrar cliente si tiene al menos una conversación no leída
          // Usar el campo calculado en el backend
          return customerGroup.conversations.some(
            (conv) => conv.hasUnreadMessages
          )
        case 'todos':
          // Mostrar todos los clientes
          return true
        case 'expirados':
          // Mostrar cliente si tiene al menos una conversación expirada
          return customerGroup.conversations.some((conv) => {
            const lastActivity = new Date(conv.lastUserActivityAt)
            const hoursSinceLastActivity =
              (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
            return hoursSinceLastActivity > 24 || conv.conversationState === 'ENDED'
          })
        case 'favoritos':
          // Mostrar cliente si tiene al menos una conversación favorita
          return customerGroup.conversations.some((conv) => conv.isFavorite)
        default:
          return true
      }
    })
  }

  /**
   * Función para cambiar el tab activo
   * @param tab - El tab activo
   */
  const changeActiveTab = (tab: string) => {
    setActiveTab(tab)
  }

  /**
   * Función para marcar/desmarcar como favorito
   * @param conversationId - ID de la conversación
   * @param isFavorite - true si se marca como favorito, false si se desmarca
   */
  const toggleFavorite = async (conversationId: string, isFavorite: boolean) => {
    try {
      const result = await onToggleFavorite(conversationId, isFavorite)
      if (result?.status === 200) {
        // Actualizar el estado local
        setChatRooms(prev =>
          prev.map(customerGroup => ({
            ...customerGroup,
            conversations: customerGroup.conversations.map(conversation =>
              conversation.id === conversationId
                ? { ...conversation, isFavorite }
                : conversation
            )
          }))
        )
      }
    } catch (error) {
      console.log('Error al actualizar favorito:', error)
    }
  }

  return {
    register,
    setValue,
    chatRooms: getFilteredChatRooms(),
    loading,
    activeTab,
    onGetActiveChatMessages,
    changeActiveTab,
    toggleFavorite,
  }
}

/**
 * Hook para calcular el tiempo de envío de un mensaje
 * @param createdAt - Fecha de creación del mensaje
 * @param roomId - ID de la conversación
 * @returns - El tiempo de envío del mensaje
 */
export const useChatTime = (createdAt: Date, roomId: string) => {
  const { chatRoom } = useChatContext()
  const [messageSentAt, setMessageSentAt] = useState<string>()
  const [urgent, setUrgent] = useState<boolean>(false)

  const onSetMessageRecievedDate = () => {
    const dt = new Date(createdAt)
    const current = new Date()
    const currentDate = current.getDate()
    const hr = dt.getHours()
    const min = dt.getMinutes()
    const date = dt.getDate()
    const month = dt.getMonth()
    const difference = currentDate - date

    if (difference <= 0) {
      setMessageSentAt(`${hr}:${min}${hr > 12 ? 'PM' : 'AM'}`)
      if (current.getHours() - dt.getHours() < 2) {
        setUrgent(true)
      }
    } else {
      setMessageSentAt(`${date} ${getMonthName(month)}`)
    }
  }

  const onSeenChat = async () => {
    if (chatRoom == roomId && urgent) {
      await onViewUnReadMessages(roomId)
      setUrgent(false)
    }
  }

  useEffect(() => {
    onSeenChat()
  }, [chatRoom])

  useEffect(() => {
    onSetMessageRecievedDate()
  }, [])

  return { messageSentAt, urgent, onSeenChat }
}

/**
 * Hook para manejar la ventana de chat
 * @returns - El tiempo de envío del mensaje, el estado de urgencia y la función para marcar como leído
 */
export const useChatWindow = () => {
  const { chats, loading, setChats, chatRoom } = useChatContext()
  const messageWindowRef = useRef<HTMLDivElement | null>(null)
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(ChatBotMessageSchema),
    mode: 'onChange',
  })
  const onScrollToBottom = () => {
    messageWindowRef.current?.scroll({
      top: messageWindowRef.current.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    onScrollToBottom()
  }, [chats, messageWindowRef])

  useEffect(() => {
    if (chatRoom) {

      try {
        socketClientUtils.subscribe(chatRoom)
        socketClientUtils.bind('realtime-mode', (data: any) => {
          try {
            if (data && data.chat) {
              const messageId = data.chat.id || Date.now().toString()

              setChats((prev) => {
                const messageExists = prev.some(msg => msg.id === messageId)
                if (messageExists) {
                  return prev
                }

                return [...prev, {
                  id: messageId,
                  role: data.chat.role || 'assistant',
                  message: data.chat.message,
                  createdAt: data.chat.createdAt ? new Date(data.chat.createdAt) : new Date(),
                  seen: data.chat.seen || false
                }]
              })
            }
          } catch (error) { }
        })
      } catch (error) { }

      return () => {
        try {
          socketClientUtils.unbind('realtime-mode')
          socketClientUtils.unsubscribe(chatRoom)
        } catch (error) { }
      }
    }
  }, [chatRoom, setChats])

  const onHandleSentMessage = handleSubmit(async (values) => {
    try {
      reset()

      await onOwnerSendMessage(
        chatRoom!,
        values.content,
        'assistant'
      )

    } catch (error) { }
  })

  return {
    messageWindowRef,
    register,
    onHandleSentMessage,
    chats,
    loading,
    chatRoom,
  }
}
