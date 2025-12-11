'use server'

import { client } from '@/lib/prisma'
import { onRealTimeChat } from '../conversation'
import { clerkClient } from '@clerk/nextjs'
import { extractEmailsFromString, extractURLfromString } from '@/lib/utils'
import { onMailer } from '../mailer'
import OpenAi from 'openai'
import { TEXTILE_MESSAGES } from '@/constants/services'
import {
  generateSessionToken,
  getCustomerFromToken
} from '@/lib/session'
import { onBookNewAppointment, onGetAvailableTimeSlotsForDay, onGetAllCompanyBookings } from '../appointment'

const openai = new OpenAi({
  apiKey: process.env.OPEN_AI_KEY,
})

// ============================================
// HELPERS: Utilidades para buenas prácticas
// ============================================
/**
 * Parsea JSON de forma segura con manejo de errores
 */
const safeJsonParse = <T>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString) {
    return fallback
  }
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.error('Error parsing JSON:', error, 'String:', jsonString)
    return fallback
  }
}

/**
 * Valida y extrae el contenido de la respuesta de OpenAI de forma segura
 */
const safeExtractOpenAIResponse = (
  chatCompletion: any
): string | null => {
  if (!chatCompletion?.choices || chatCompletion.choices.length === 0) {
    return null
  }
  return chatCompletion.choices[0]?.message?.content || null
}

/**
 * Valida que companyId no esté vacío antes de hacer queries
 */
const validateCompanyId = (companyId: string | null | undefined): boolean => {
  return !!companyId && companyId.trim().length > 0
}

// ============================================
// OPTIMIZACIÓN: Limitar contexto para reducir tokens
// ============================================
/**
 * Obtiene solo los mensajes relevantes del historial
 * Reduce consumo de tokens en 70-90%
 */
const getRelevantChatHistory = (
  chat: { role: 'user' | 'assistant'; content: string }[],
  maxMessages: number = 10 // Solo últimos 10 mensajes
) => {
  if (chat.length <= maxMessages) {
    return chat
  }

  // Tomar primer mensaje (contexto inicial) + últimos N mensajes
  const firstMessage = chat[0]
  const recentMessages = chat.slice(-maxMessages)

  return [firstMessage, ...recentMessages]
}

/**
 * Helper function para obtener y validar el conversationId correcto
 * Prioridad: conversationId proporcionado > realtimeMode.chatroom > conversación única
 * 
 * IMPORTANTE: NO usa conversations[0].id como fallback si hay múltiples conversaciones
 * para evitar guardar mensajes en la conversación incorrecta.
 * 
 * @param conversationId - ID de conversación proporcionado explícitamente
 * @param customerInfo - Información del cliente con sus conversaciones
 * @param realtimeMode - Modo tiempo real con chatroom
 * @returns El conversationId válido o null si no se puede determinar
 * @throws Error si hay múltiples conversaciones y no se proporciona conversationId
 */
const getValidConversationId = (
  conversationId: string | undefined | null,
  customerInfo: any,
  realtimeMode?: { chatroom: string; mode: boolean } | undefined
): string | null => {
  const conversations = customerInfo?.conversations || []
  const hasMultipleConversations = conversations.length > 1

  // 1. Si se proporciona conversationId explícitamente, validar que pertenezca al customer
  if (conversationId) {
    const isValid = conversations.some(
      (conv: any) => conv.id === conversationId
    )
    if (isValid) {
      return conversationId
    }
    console.warn(`⚠️ ConversationId ${conversationId} no pertenece al customer`)
    // Si el conversationId no es válido, no usar fallback - lanzar error
    if (hasMultipleConversations) {
      throw new Error(
        `ConversationId ${conversationId} no pertenece al customer. ` +
        `Hay ${conversations.length} conversaciones disponibles. ` +
        `Se requiere un conversationId válido cuando hay múltiples conversaciones.`
      )
    }
  }

  // 2. Si hay realtimeMode con chatroom, validar que pertenezca al customer
  if (realtimeMode?.chatroom) {
    const isValid = conversations.some(
      (conv: any) => conv.id === realtimeMode.chatroom
    )
    if (isValid) {
      return realtimeMode.chatroom
    }
    console.warn(`⚠️ RealtimeMode chatroom ${realtimeMode.chatroom} no pertenece al customer`)
    // Si el chatroom no es válido y hay múltiples conversaciones, lanzar error
    if (hasMultipleConversations) {
      throw new Error(
        `RealtimeMode chatroom ${realtimeMode.chatroom} no pertenece al customer. ` +
        `Hay ${conversations.length} conversaciones disponibles. ` +
        `Se requiere un conversationId válido cuando hay múltiples conversaciones.`
      )
    }
  }

  // 3. Fallback SEGURO: Solo usar si hay UNA sola conversación
  // Esto es seguro porque no hay ambigüedad sobre qué conversación usar
  if (conversations.length === 1) {
    return conversations[0].id
  }

  // 4. Si hay múltiples conversaciones y no se proporcionó conversationId válido, lanzar error
  if (hasMultipleConversations) {
    throw new Error(
      `No se puede determinar el conversationId. ` +
      `El customer tiene ${conversations.length} conversaciones y no se proporcionó un conversationId explícito. ` +
      `Se requiere especificar el conversationId cuando hay múltiples conversaciones para evitar guardar mensajes en la conversación incorrecta.`
    )
  }

  // 5. Si no hay conversaciones, retornar null
  return null
}

export const onStoreConversations = async (
  id: string,
  message: string,
  role: 'user' | 'assistant',
  userMessage?: string
) => {
  // Si es una respuesta del asistente, calcular métricas de tiempo
  if (role === 'assistant') {
    // Obtener el último mensaje del usuario
    const lastUserMessage = await client.chatMessage.findFirst({
      where: {
        conversationId: id,
        role: 'user',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        message: true,
      },
    })

    if (lastUserMessage) {
      const now = new Date()
      const responseTimeInSeconds = Math.floor(
        (now.getTime() - lastUserMessage.createdAt.getTime()) / 1000
      )

      // FR2: Evaluar efectividad de la respuesta
      const isEffective = await isResponseEffective(
        id,
        userMessage || lastUserMessage.message,
        message
      )

      await client.conversation.update({
        where: { id },
        data: {
          messages: {
            create: {
              message,
              role,
              responseTime: responseTimeInSeconds,
              respondedWithin2Hours: isEffective, // FR2: Ahora significa "respondido efectivamente"
            },
          },
        },
      })

      // Actualizar métricas con efectividad en lugar de solo tiempo
      await updateConversationMetrics(id, responseTimeInSeconds, isEffective)

      return
    }
  }

  // Para mensajes del usuario o si no hay mensaje previo
  await client.conversation.update({
    where: { id },
    data: {
      messages: {
        create: {
          message,
          role,
        },
      },
    },
  })
}

export const onGetCurrentChatBot = async (idOrName: string) => {
  try {
    // Verificar si es un UUID (ID) o un nombre
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName)

    const chatbot = await client.company.findFirst({
      where: isUUID ? {
        id: idOrName,
      } : {
        name: idOrName,
      },
      select: {
        id: true,
        helpdesk: true,
        name: true,
        chatBot: {
          select: {
            id: true,
            welcomeMessage: true,
            icon: true,
            textColor: true,
            background: true,
            helpdesk: true,
          },
        },
        customer: {
          select: {
            conversations: {
              select: {
                id: true,
                conversationState: true,
                live: true,
              },
              orderBy: {
                updatedAt: 'desc' // Ordenar por última actualización para mostrar las más recientes primero
              }
            }
          }
        }
      },
    })

    if (chatbot) {
      return chatbot
    }
  } catch (error) {
    console.log('Error en onGetCurrentChatBot:', error)
  }
}

// ===== TIPOS Y INTERFACES =====
interface CustomerData {
  email?: string
  name?: string
  phone?: string
}

interface ChatBotCompany {
  name: string
  helpdesk: Array<{ question: string; answer: string }>
  products: Array<{
    name: string
    price: number
    image: string
    salePrice?: number | null
    description?: string | null
    color?: string | null
    width?: string | null
    weight?: string | null
    stock: number
    material?: { name: string } | null
    texture?: { name: string } | null
    category?: { name: string } | null
    season?: { name: string } | null
    uses: Array<{ use: { name: string } }>
    features: Array<{ feature: { name: string } }>
  }>
  filterQuestions: Array<{ question: string }>
  categories: Array<{ name: string }>
  materials: Array<{ name: string }>
  textures: Array<{ name: string }>
  seasons: Array<{ name: string }>
  uses: Array<{ name: string }>
  features: Array<{ name: string }>
}

interface CustomerInfo {
  id: string
  email: string
  questions: any[]
  conversations: Array<{ id: string; live?: boolean; mailed?: boolean }>
}

// ============================================
// DETECCIÓN DE ESCALACIÓN A HUMANO
// ============================================
/**
 * Detecta automáticamente cuando el cliente quiere hablar con un humano
 */
const detectHumanTransferRequest = (message: string): boolean => {
  const humanKeywords = [
    'humano', 'persona', 'agente', 'operador', 'representante',
    'hablar con alguien', 'hablar con una persona', 'hablar con un humano',
    'quiero hablar con', 'necesito hablar con', 'puedo hablar con',
    'pásame con', 'pasame con', 'pásame a', 'pasame a',
    'conectame con', 'conéctame con', 'conecta con', 'conecta me',
    'escalar', 'transferir', 'no me ayuda', 'no entiendo',
    'problema', 'queja', 'reclamo', 'urgente', 'emergencia',
    'supervisor', 'gerente', 'jefe', 'ayuda humana'
  ]

  const lowerMessage = message.toLowerCase()
  return humanKeywords.some(keyword => lowerMessage.includes(keyword))
}

// ============================================
// OPTIMIZACIÓN: Respuestas rápidas sin OpenAI
// ============================================
/**
 * SIMPLIFICADO: Genera respuestas instantáneas para casos comunes
 * Reduce latencia de 2-5s a 50ms y ahorra tokens
 */
const getQuickResponse = (
  message: string,
  customerInfo: any,
  companyId: string
): { content: string; link?: string } | null => {
  const lowerMsg = message.toLowerCase().trim()

  // 1. Saludos simples
  if (/^(hola|hi|hey|buenos días|buenas tardes|buenas noches|qué tal)\.?$/i.test(lowerMsg)) {
    return {
      content: `¡Hola ${customerInfo.name || ''}! Soy Lunari AI. 😊`
    }
  }

  // 4. Ubicación
  if (/\b(dónde están|ubicación|dirección|cómo llego)\b/.test(lowerMsg)) {
    return {
      content: 'Nos ubicamos en [Dirección].'
    }
  }

  // No hay respuesta rápida
  return null
}

// ============================================
// GESTIÓN DE SESIONES AUTENTICADAS
// ============================================

/**
 * Maneja la conversación de un usuario con sesión válida
 * Este usuario ya está identificado, no necesita proporcionar datos
 */
const handleAuthenticatedUser = async (
  customerInfo: any,
  message: string,
  author: 'user',
  chat: { role: 'user' | 'assistant'; content: string }[],
  companyId: string,
  chatBotCompany: any,
  sessionToken: string,
  conversationId?: string | null
) => {
  console.log("🚀 ~ conversationId:", conversationId)
  // Obtener el conversationId válido usando la función helper
  const validConversationId = getValidConversationId(
    conversationId,
    customerInfo,
    undefined // realtimeMode se puede pasar si es necesario
  )

  if (!validConversationId) {
    throw new Error('No se pudo determinar un conversationId válido')
  }

  // Encontrar la conversación específica
  const currentConversation = customerInfo.conversations.find(
    (conv: any) => conv.id === validConversationId
  ) || customerInfo.conversations[0]

  // SOLO PROCESAR TERMINACIÓN SI NO ESTÁ EN MODO HUMANO
  console.log("Usando conversationId: ", validConversationId)
  if (!currentConversation.live) {
    // NUEVA LÓGICA: Usar IA para detectar si el usuario quiere terminar
    const shouldEndConversation = await detectConversationEndingWithAI(message, chat)

    if (shouldEndConversation) {
      // Guardar mensaje del usuario
      await onStoreConversations(validConversationId, message, 'user')

      // Solicitar calificación de forma simple
      const ratingMessage = `¡Perfecto! Me alegra haberte ayudado. 😊

Antes de que te vayas, ¿podrías calificar tu experiencia del 1 al 5?

⭐ 1 = Muy insatisfecho
⭐ 5 = Muy satisfecho

Tu opinión nos ayuda a mejorar.`

      // Guardar solicitud de feedback
      await onStoreConversations(validConversationId, ratingMessage, 'assistant', message)

      // Marcar como esperando calificación
      await client.conversation.update({
        where: { id: validConversationId },
        data: {
          conversationState: 'AWAITING_RATING',
          resolved: true
        }
      })

      return {
        response: {
          role: 'assistant',
          content: ratingMessage
        },
        sessionToken
      }
    }
  }

  // 0.1 Actualizar última actividad del usuario
  await updateUserActivity(validConversationId)

  // 0.2 Verificar estado de la conversación (SIN crear nuevas conversaciones)
  const conversationState = await handleConversationState(
    validConversationId,
    customerInfo.id,
    chatBotCompany.chatBot?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?'
  )

  // NUEVA LÓGICA: NO crear nuevas conversaciones, mantener la misma
  // Si la conversación está ENDED, simplemente reactivarla
  if (conversationState.shouldStartNew) {
    // Reactivar la conversación existente en lugar de crear una nueva
    await client.conversation.update({
      where: { id: validConversationId },
      data: {
        conversationState: 'ACTIVE',
        lastUserActivityAt: new Date(),
        resolved: false
      }
    })

    // Si hay mensaje de bienvenida, mostrarlo
    if (conversationState.message) {
      return {
        response: {
          role: 'assistant',
          content: conversationState.message
        },
        sessionToken
      }
    }
  }

  // 1. FR4: Detectar si el usuario está calificando (1-5)
  const satisfactionRating = detectSatisfactionRating(message)
  if (satisfactionRating) {
    // Guardar mensaje de calificación del usuario
    await onStoreConversations(validConversationId, message, 'user')

    // ENVIAR MENSAJE DEL USUARIO INMEDIATAMENTE (ANTES DEL PROCESAMIENTO)
    if (currentConversation.live) {
      await onRealTimeChat(
        validConversationId,
        message,
        `user-${Date.now()}`,
        'user'
      )
    }

    await saveSatisfactionRating(
      validConversationId,
      customerInfo.id,
      companyId,
      satisfactionRating,
      message
    )

    // VERIFICAR SI ESTABA ESPERANDO CALIFICACIÓN PARA ESCALAR
    const chatRoom = await client.conversation.findUnique({
      where: { id: validConversationId },
      select: { conversationState: true }
    })

    if (chatRoom?.conversationState === 'AWAITING_RATING') {
      // ESCALAR A HUMANO DESPUÉS DE LA CALIFICACIÓN
      await client.conversation.update({
        where: { id: validConversationId },
        data: {
          live: true,
          conversationState: 'ESCALATED' as any
        }
      })

      // ENVIAR EMAIL AL DUEÑO CUANDO SE ESCALA A HUMANO
      try {
        const companyOwner = await client.company.findFirst({
          where: { id: companyId }, // Usar el companyId del parámetro
          select: {
            User: {
              select: {
                clerkId: true
              }
            }
          }
        })

        if (companyOwner?.User?.clerkId) {
          const user = await clerkClient.users.getUser(companyOwner.User.clerkId)
          await onMailer(
            user.emailAddresses[0].emailAddress,
            customerInfo.name || 'Cliente',
            customerInfo.email
          )
        }
      } catch (error) {
        console.error('Error enviando email de escalación:', error)
      }

      const transferMessage = `¡Muchas gracias por tu calificación de ${satisfactionRating}/5! 😊

Ahora te estoy conectando con uno de nuestros agentes humanos. Un miembro de nuestro equipo se pondrá en contacto contigo en breve. 👨‍💼`

      await onStoreConversations(validConversationId, transferMessage, 'assistant', message)

      return {
        response: {
          role: 'assistant',
          content: transferMessage
        },
        live: true,
        chatRoom: validConversationId,
        sessionToken
      }
    } else {
      // CALIFICACIÓN NORMAL (terminar conversación)
      await markConversationAsEnded(validConversationId)

      const thankYouMessage = `¡Muchas gracias por tu calificación de ${satisfactionRating}/5! Tu opinión es muy importante para nosotros y nos ayuda a mejorar nuestro servicio. 😊

¿Tienes alguna otra consulta o necesitas ayuda con algo más?`

      await onStoreConversations(validConversationId, thankYouMessage, 'assistant', message)

      return {
        response: {
          role: 'assistant',
          content: thankYouMessage
        },
        sessionToken
      }
    }
  }

  // 2. Manejar modo tiempo real si está activo
  if (currentConversation.live) {
    await onStoreConversations(validConversationId, message, author)

    return {
      live: true,
      chatRoom: validConversationId,
      sessionToken // Mantener token
    }
  }

  // 3. NUEVO: Preparar mensajes para guardar chat completo
  const messagesToSave: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string;
    responseTime?: number;
    respondedWithin2Hours?: boolean
  }[] = [
      {
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
        responseTime: undefined,
        respondedWithin2Hours: undefined
      }
    ]

  // 4. DETECCIÓN DE TRANSFERENCIA A HUMANO
  if (detectHumanTransferRequest(message)) {
    console.log(`🚨 Solicitud de transferencia detectada: "${message}"`)

    // Guardar mensaje del usuario
    await client.chatMessage.create({
      data: {
        message,
        role: 'user',
        conversationId: validConversationId,
        responseTime: 0,
        respondedWithin2Hours: true
      }
    })

    // SOLICITAR CALIFICACIÓN ANTES DE ESCALAR
    const transferMessage = `Te comunicarás con un humano en breve. 😊

Antes de transferirte, ¿podrías calificar mi ayuda del 1 al 5?

⭐ 1 = Muy insatisfecho
⭐ 5 = Muy satisfecho

Tu opinión me ayuda a mejorar.`

    // Guardar mensaje de transferencia
    await client.chatMessage.create({
      data: {
        message: transferMessage,
        role: 'assistant',
        conversationId: validConversationId,
        responseTime: 0,
        respondedWithin2Hours: true
      }
    })

    // ENVIAR EMAIL AL DUEÑO INMEDIATAMENTE CUANDO CLIENTE PIDE HUMANO
    try {
      const companyOwner = await client.company.findFirst({
        where: { id: companyId }, // Usar el companyId del parámetro
        select: {
          User: {
            select: {
              clerkId: true
            }
          }
        }
      })
      console.log("🚀 ~ companyOwner:", companyOwner)

      if (companyOwner?.User?.clerkId) {
        const user = await clerkClient.users.getUser(companyOwner.User.clerkId)
        console.log("🚀 ~ user:", user)
        await onMailer(
          user.emailAddresses[0].emailAddress,
          customerInfo.name || 'Cliente',
          customerInfo.email
        )
      }
    } catch (error) {
      console.error('Error enviando email de solicitud de humano:', error)
    }

    // Marcar como esperando calificación antes de escalar
    await client.conversation.update({
      where: { id: validConversationId },
      data: {
        conversationState: 'AWAITING_RATING' as any // Esperar calificación antes de escalar
      }
    })

    console.log(`🚨 SOLICITUD DE CALIFICACIÓN ANTES DE ESCALAR: Chat ${validConversationId} - Cliente: ${customerInfo.email}`)

    return {
      response: {
        role: 'assistant' as const,
        content: transferMessage
      },
      sessionToken
    }
  }

  // 5. DETECCIÓN DE SOLICITUD DE CITA
  const isAppointment = await isAppointmentRequest(message, chat)
  if (isAppointment) {
    const appointmentResult = await handleAppointmentBooking(
      message,
      customerInfo,
      companyId,
      validConversationId,
      chat
    )

    if (appointmentResult) {
      return {
        response: appointmentResult.response,
        sessionToken
      }
    }
  }

  // 6. OPTIMIZACIÓN: Intentar respuesta rápida primero (sin OpenAI)
  const quickResponse = getQuickResponse(message, customerInfo, companyId)

  if (quickResponse) {
    console.log('Respuesta rápida utilizada (sin OpenAI)')

    // SIMPLIFICADO: Agregar pregunta de ayuda
    const finalQuickContent = addHelpOffer(quickResponse.content)

    // Agregar respuesta rápida a los mensajes
    messagesToSave.push({
      role: 'assistant' as const,
      content: finalQuickContent,
      timestamp: new Date(),
      responseTime: 0, // Respuesta instantánea
      respondedWithin2Hours: true // Siempre efectiva
    })

    // NUEVO: Guardar chat completo
    await saveCompleteChatSession(
      customerInfo.id,
      validConversationId,
      companyId,
      messagesToSave
    )

    await updateResolutionType(validConversationId, false)

    return {
      response: {
        role: 'assistant' as const,
        content: finalQuickContent,
        link: quickResponse.link
      },
      sessionToken // Mantener token
    }
  }

  // 7. Generar contexto para OpenAI
  const contextSpecificPrompt = await getContextSpecificPrompt(message, companyId, customerInfo.id, chat)

  const customerDataForContext = {
    email: customerInfo.email,
    name: customerInfo.name,
    phone: customerInfo.phone
  }

  const systemPromptData = await generateOpenAIContext(
    chatBotCompany,
    customerDataForContext,
    contextSpecificPrompt,
    companyId,
    customerInfo,
    message
  )

  const systemPrompt = systemPromptData.content

  // 6. Usar solo historial relevante (últimos 10 mensajes)
  const relevantHistory = getRelevantChatHistory(chat, 10)

  // 7. Obtener respuesta de OpenAI
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...relevantHistory,
      { role: 'user', content: message }
    ],
    model: 'gpt-4o-mini', // Modelo más reciente y económico con mejor calidad conversacional
    temperature: 0.85, // Temperatura más alta para respuestas más naturales y cálidas
    max_tokens: 300
  })

  // 8. Manejar respuesta
  const response = safeExtractOpenAIResponse(chatCompletion)

  // Validar que la respuesta no sea null
  if (!response) {
    throw new Error('OpenAI no retornó una respuesta válida')
  }

  const result = await handleOpenAIResponse(response, customerInfo, chat, message, validConversationId)

  // SIMPLIFICADO: Agregar "¿Hay algo más en que te pueda ayudar?" a todas las respuestas
  const finalContent = addHelpOffer(result.response.content)

  // 9. NUEVO: Agregar respuesta de OpenAI a los mensajes
  messagesToSave.push({
    role: 'assistant' as const,
    content: finalContent,
    timestamp: new Date(),
    responseTime: Math.floor((Date.now() - messagesToSave[0].timestamp.getTime()) / 1000),
    respondedWithin2Hours: true, // Respuesta inmediata
    imageUrl: systemPromptData.imageUrl
  })

  // 10. NUEVO: Guardar chat completo con respuesta de OpenAI
  await saveCompleteChatSession(
    customerInfo.id,
    validConversationId,
    companyId,
    messagesToSave
  )

  // 10. Actualizar tipo de resolución
  await updateResolutionType(validConversationId, false)

  return {
    ...result,
    response: {
      ...result.response,
      content: finalContent,
      imageUrl: systemPromptData.imageUrl
    },
    sessionToken // Mantener token
  }
}

// ============================================
// GESTIÓN DE CICLO DE VIDA DE CONVERSACIONES
// ============================================


/**
 * Finaliza la conversación actual y solicita calificación
 */
const endConversation = async (conversationId: string, customerId: string): Promise<string | null> => {
  try {
    // Actualizar estado a AWAITING_RATING
    await client.conversation.update({
      where: { id: conversationId },
      data: {
        conversationState: 'AWAITING_RATING',
        resolved: true,
      }
    })


    return '¿Cómo calificarías la atención que recibiste del 1 al 5? (1 = Muy insatisfecho, 5 = Muy satisfecho)'
  } catch (error) {
    return null
  }
}

/**
 * Marca la conversación como temporalmente inactiva (NO como ENDED permanente)
 * Esto permite que se reactive cuando el usuario vuelva a escribir
 */
const markConversationAsEnded = async (conversationId: string): Promise<void> => {
  try {
    await client.conversation.update({
      where: { id: conversationId },
      data: {
        conversationState: 'IDLE', // Cambiar a IDLE en lugar de ENDED
        conversationEndedAt: new Date(),
        resolved: true
      }
    })
  } catch (error) {
    console.log('Error al marcar conversación como inactiva:', error)
  }
}

/**
 * Actualiza la última actividad del usuario
 */
const updateUserActivity = async (conversationId: string): Promise<void> => {
  try {
    await client.conversation.update({
      where: { id: conversationId },
      data: {
        lastUserActivityAt: new Date()
      }
    })
  } catch (error) {
    console.log('Error al actualizar actividad:', error)
  }
}

/**
 * Verifica el estado de la conversación y decide qué hacer
 */
const handleConversationState = async (
  conversationId: string,
  customerId: string,
  welcomeMessage: string
): Promise<{ shouldStartNew: boolean; newConversationId?: string; message?: string }> => {
  try {
    const chatRoom = await client.conversation.findUnique({
      where: { id: conversationId },
      select: {
        conversationState: true,
        lastUserActivityAt: true,
        satisfactionCollected: true,
      }
    })

    if (!chatRoom) {
      return { shouldStartNew: false }
    }

    // NUEVA LÓGICA: Si la conversación está ENDED, reactivarla (NO crear nueva)
    if (chatRoom.conversationState === 'ENDED') {
      return {
        shouldStartNew: true,
        message: `¡Hola de nuevo! 👋 ${welcomeMessage}`
      }
    }

    // Si está IDLE y no ha calificado, solicitar calificación
    if (chatRoom.conversationState === 'IDLE' && !chatRoom.satisfactionCollected) {
      const ratingMessage = await endConversation(conversationId, customerId)
      return {
        shouldStartNew: false,
        message: ratingMessage || undefined
      }
    }

    return { shouldStartNew: false }
  } catch (error) {
    console.log('Error al manejar estado de conversación:', error)
    return { shouldStartNew: false }
  }
}

// ===== FUNCIONES AUXILIARES =====

/**
 * NUEVA FUNCIÓN: Guardar chat completo por sesión de cliente
 * Reemplaza el guardado fragmentado por uno completo y organizado
 */
const saveCompleteChatSession = async (
  customerId: string,
  conversationId: string,
  companyId: string,
  newMessages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    responseTime?: number;
    respondedWithin2Hours?: boolean;
    imageUrl?: string;
  }[]
) => {
  try {
    // 1. Obtener mensajes existentes del chat
    const existingMessages = await client.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        message: true,
        role: true,
        createdAt: true,
        responseTime: true,
        respondedWithin2Hours: true,
        imageUrl: true
      }
    })

    // 2. Combinar mensajes existentes con los nuevos
    const allMessages = [
      ...existingMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.message,
        timestamp: msg.createdAt,
        responseTime: msg.responseTime,
        respondedWithin2Hours: msg.respondedWithin2Hours,
        imageUrl: msg.imageUrl || undefined
      })),
      ...newMessages
    ]

    // 3. Eliminar mensajes duplicados (por si se guardó parcialmente)
    const uniqueMessages = allMessages.filter((msg, index, self) =>
      index === self.findIndex(m =>
        m.content === msg.content &&
        m.role === msg.role &&
        Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 1000 // 1 segundo de tolerancia
      )
    )

    // 4. Actualizar la conversación con el estado completo
    await client.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        // Marcar como activo si hay mensajes recientes
        live: uniqueMessages.length > 0 ? false : false // No activar automáticamente
      }
    })

    // 5. Guardar mensajes nuevos (evitar duplicados)
    for (const newMsg of newMessages) {
      // Verificar si ya existe
      const exists = await client.chatMessage.findFirst({
        where: {
          conversationId,
          message: newMsg.content,
          role: newMsg.role,
          createdAt: {
            gte: new Date(newMsg.timestamp.getTime() - 5000), // 5 segundos de tolerancia
            lte: new Date(newMsg.timestamp.getTime() + 5000)
          }
        }
      })

      if (!exists) {
        await client.chatMessage.create({
          data: {
            conversationId,
            message: newMsg.content,
            role: newMsg.role,
            responseTime: newMsg.responseTime,
            respondedWithin2Hours: newMsg.respondedWithin2Hours,
            createdAt: newMsg.timestamp,
            imageUrl: newMsg.imageUrl || null
          }
        })
      }
    }

    return uniqueMessages

  } catch (error) {
    console.error('Error al guardar chat completo:', error)
    throw error
  }
}

/**
 * FR1 y FR2: Actualizar o crear métricas de conversación
 */
const updateConversationMetrics = async (
  conversationId: string,
  responseTime: number,
  respondedWithin2Hours: boolean
) => {
  try {
    // Obtener el companyId de la conversación
    const chatRoom = await client.conversation.findUnique({
      where: { id: conversationId },
      select: {
        Customer: {
          select: { companyId: true }
        }
      }
    })

    if (!chatRoom?.Customer?.companyId) return

    const companyId = chatRoom.Customer.companyId

    // Buscar si ya existe un registro de métricas para este chatRoom
    const existingMetrics = await client.conversationMetrics.findFirst({
      where: { conversationId }
    })

    if (existingMetrics) {
      // Actualizar métricas existentes
      const newMessagesCount = existingMetrics.messagesCount + 1
      const newTotalResponseTime = existingMetrics.totalResponseTime + responseTime
      const newAverageResponseTime = Math.floor(newTotalResponseTime / newMessagesCount)
      const newMessagesRespondedOnTime = respondedWithin2Hours
        ? existingMetrics.messagesRespondedOnTime + 1
        : existingMetrics.messagesRespondedOnTime
      const newTotalMessagesReceived = existingMetrics.totalMessagesReceived + 1
      const newPercentageOnTime = (newMessagesRespondedOnTime / newTotalMessagesReceived) * 100

      await client.conversationMetrics.update({
        where: { id: existingMetrics.id },
        data: {
          averageResponseTime: newAverageResponseTime,
          totalResponseTime: newTotalResponseTime,
          messagesCount: newMessagesCount,
          messagesRespondedOnTime: newMessagesRespondedOnTime,
          totalMessagesReceived: newTotalMessagesReceived,
          percentageOnTime: newPercentageOnTime,
        }
      })
    } else {
      // Crear nuevo registro de métricas
      const percentageOnTime = respondedWithin2Hours ? 100 : 0

      await client.conversationMetrics.create({
        data: {
          conversationId,
          companyId,
          averageResponseTime: responseTime,
          totalResponseTime: responseTime,
          messagesCount: 1,
          messagesRespondedOnTime: respondedWithin2Hours ? 1 : 0,
          totalMessagesReceived: 1,
          percentageOnTime,
        }
      })
    }
  } catch (error) {
    console.log('Error al actualizar métricas de conversación:', error)
  }
}

/**
 * FR3: Detectar y marcar el tipo de resolución de la conversación
 */
const updateResolutionType = async (conversationId: string, isNewConversation: boolean) => {
  try {
    // Contar los mensajes del usuario en esta conversación
    const userMessagesCount = await client.chatMessage.count({
      where: {
        conversationId,
        role: 'user'
      }
    })

    // Verificar si el chat pasó a modo live (escalado a humano)
    const chatRoom = await client.conversation.findUnique({
      where: { id: conversationId },
      select: { live: true }
    })

    let resolutionType: 'FIRST_INTERACTION' | 'FOLLOW_UP' | 'ESCALATED' | 'UNRESOLVED' = 'UNRESOLVED'
    let resolvedInFirstInteraction: boolean | null = null

    if (chatRoom?.live) {
      // Si está en modo live, fue escalado
      resolutionType = 'ESCALATED'
      resolvedInFirstInteraction = false
    } else if (userMessagesCount === 1) {
      // Si solo hay un mensaje del usuario, puede ser resolución en primera interacción
      resolutionType = 'FIRST_INTERACTION'
      resolvedInFirstInteraction = true
    } else if (userMessagesCount > 1) {
      // Si hay más de un mensaje, es seguimiento
      resolutionType = 'FOLLOW_UP'
      resolvedInFirstInteraction = false
    }

    await client.conversation.update({
      where: { id: conversationId },
      data: {
        resolutionType,
        resolvedInFirstInteraction,
      }
    })
  } catch (error) {
    console.log('Error al actualizar tipo de resolución:', error)
  }
}

/**
 * FR2: Detectar si una respuesta fue efectiva (oportuna) - no dio vueltas
 * Una respuesta es efectiva si:
 * 1. Es directa (no pide información redundante)
 * 2. Resuelve en ≤2 turnos
 * 3. No hace preguntas cuando ya tiene la información
 */
const isResponseEffective = async (
  conversationId: string,
  userMessage: string,
  botResponse: string
): Promise<boolean> => {
  try {
    // Contar turnos de conversación (pares user-assistant)
    const messagesCount = await client.chatMessage.count({
      where: { conversationId }
    })
    const turnsCount = Math.ceil(messagesCount / 2)

    // Criterio 1: Si es el primer o segundo turno y el bot no pide info redundante → Efectivo
    if (turnsCount <= 2) {
      // Verificar que el bot no esté pidiendo información que ya tiene
      const redundantPatterns = [
        /cuál es tu (correo|email|nombre)/i,
        /podrías darme tu (correo|email|nombre)/i,
        /necesito tu (correo|email|nombre)/i,
      ]

      const isRedundant = redundantPatterns.some(pattern => pattern.test(botResponse))

      if (!isRedundant) {
        return true // Respuesta efectiva
      }
    }

    // Criterio 2: Si el usuario pide una acción específica y el bot la ejecuta → Efectivo
    const actionRequests = [
      /(?:quiero|deseo|necesito|puedo)\s+(?:agendar|reservar)/i,
      /(?:dame|muestra|enséñame)\s+(?:productos|servicios|precios)/i,
    ]

    const requestsAction = actionRequests.some(pattern => pattern.test(userMessage))
    const providesLink = /http/.test(botResponse)

    if (requestsAction && providesLink) {
      return true // Respondió directamente con enlace
    }

    // Criterio 3: Si es más de 3 turnos → Probablemente dio vueltas
    if (turnsCount > 3) {
      return false
    }

    // Por defecto, considerar efectivo si cumple condiciones básicas
    return turnsCount <= 2

  } catch (error) {
    console.log('Error al evaluar efectividad de respuesta:', error)
    return false
  }
}

/**
 * NUEVA FUNCIÓN: Usa IA para detectar si el usuario quiere terminar la conversación
 */
const detectConversationEndingWithAI = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<boolean> => {
  try {
    const systemPrompt = `Eres un analizador de conversaciones. Tu trabajo es determinar si el usuario quiere TERMINAR la conversación.

ANALIZA el mensaje del usuario y el contexto de la conversación para determinar si:
1. El usuario está diciendo EXPLÍCITAMENTE que NO necesita más ayuda
2. El usuario se está DESPIDIENDO claramente
3. El usuario está SATISFECHO y quiere terminar EXPLÍCITAMENTE
4. El usuario está AGRADECIENDO y cerrando la conversación EXPLÍCITAMENTE

IMPORTANTE: Solo marca como terminación si hay señales CLARAS de despedida o satisfacción. 
Las respuestas a preguntas específicas (materiales, productos, etc.) NO son terminación.

RESPUESTA SOLO: "SI" si el usuario quiere terminar, "NO" si quiere continuar.

EJEMPLOS DE TERMINACIÓN:
- "no, gracias" → SI  
- "ya está, gracias" → SI
- "perfecto, eso es todo" → SI
- "adiós" → SI
- "hasta luego" → SI
- "gracias, ya no necesito más" → SI
- "eso es todo" → SI
- "listo, gracias" → SI

EJEMPLOS DE NO TERMINACIÓN:
- "lino" → NO (respuesta a pregunta sobre material)
- "algodón" → NO (respuesta a pregunta sobre material)
- "quiero más información" → NO
- "tengo otra pregunta" → NO
- "necesito ayuda con..." → NO
- "sí" → NO (respuesta afirmativa)
- "no" → NO (respuesta negativa a pregunta específica)`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-5), // Últimos 5 mensajes para contexto
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini', // Modelo más reciente para mejor comprensión
      temperature: 0.1, // Baja temperatura para respuestas consistentes (OK para detección)
      max_tokens: 10 // Solo necesitamos "SI" o "NO"
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    return response?.trim().toUpperCase() === 'SI'

  } catch (error) {
    console.log('Error en detectConversationEndingWithAI:', error)
    return false // Retornar false en caso de error
  }
}

/**
 * NUEVA FUNCIÓN: Agrega "¿Hay algo más en que te pueda ayudar?" a las respuestas
 */
const addHelpOffer = (content: string): string => {
  // No agregar si ya tiene la pregunta o si es una solicitud de calificación
  if (content.includes('algo más en que') ||
    content.includes('califica') ||
    content.includes('⭐') ||
    content.includes('calificación') ||
    content.includes('calificar') ||
    content.includes('estrella') ||
    content.includes('rating') ||
    content.includes('Muchas gracias por tu calificación')) {
    return content
  }

  return `${content}\n\n¿Hay algo más en que te pueda ayudar?`
}

/**
 * FR4: Detectar si el cliente está calificando la atención (1-5)
 */
const detectSatisfactionRating = (message: string): number | null => {
  // Patrones para detectar calificación
  const ratingPatterns = [
    /(?:califico|calificar|puntuación|nota|rating|estrella).*?([1-5])/i,
    /^([1-5])$/,
    /([1-5])\s*(?:estrella|star)/i,
  ]

  for (const pattern of ratingPatterns) {
    const match = message.match(pattern)
    if (match) {
      const rating = parseInt(match[1])
      if (rating >= 1 && rating <= 5) {
        return rating
      }
    }
  }

  return null
}

/**
 * FR4: Guardar la calificación de satisfacción del cliente
 */
const saveSatisfactionRating = async (
  conversationId: string,
  customerId: string,
  companyId: string,
  rating: number,
  comment?: string
) => {
  try {
    // Guardar en CustomerSatisfaction
    await client.customerSatisfaction.create({
      data: {
        conversationId,
        customerId,
        companyId,
        rating,
        comment,
      }
    })

    // Actualizar ChatRoom
    await client.conversation.update({
      where: { id: conversationId },
      data: {
        satisfactionRating: rating,
        satisfactionCollected: true,
        resolved: true,
        conversationEndedAt: new Date(),
      }
    })

  } catch (error) {
    console.log('Error al guardar satisfacción:', error)
  }
}

/**
 * Extrae información del cliente (email, nombre y teléfono) del mensaje
 * OPTIMIZADO: Maneja nombres compuestos correctamente
 */
const extractCustomerData = (message: string): CustomerData => {
  const email = extractEmailsFromString(message)?.[0]

  // Extraer nombre - MEJORADO para nombres compuestos
  let name: string | undefined

  // Patrón 1: Capturar nombres después de "me llamo", "soy", etc.
  const namePatterns = [
    // "Me llamo Juan Pérez" - captura hasta coma, punto, o palabras clave
    /(?:me llamo|soy|mi nombre es|llámame)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,5})(?=\s*[,.]|\s+(?:mi|y|correo|email|cel|teléfono|telefono)|$)/i,

    // "Soy María García López, mi correo..."
    /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,5})(?=\s*,)/i,

    // Nombre al inicio del mensaje: "Juan Pérez, correo..."
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,5})(?=\s*[,.]|\s+(?:mi|correo|email))/i
  ]

  for (const pattern of namePatterns) {
    const match = message.match(pattern)
    if (match) {
      name = match[1].trim()

      // Validar que sea un nombre válido (no una palabra clave)
      const invalidNames = ['correo', 'email', 'celular', 'telefono', 'teléfono', 'cita', 'hola']
      if (!invalidNames.some(invalid => name?.toLowerCase().includes(invalid))) {
        // Limpiar y validar
        name = name.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, '').trim()

        // Debe tener al menos 2 caracteres y máximo 60
        if (name.length >= 2 && name.length <= 60) {
          break // Nombre válido encontrado
        }
      }
      name = undefined // Resetear si no es válido
    }
  }

  // Fallback: Si no se encontró con patrones, buscar nombre entre comillas
  if (!name) {
    const quotedName = message.match(/["']([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)["']/i)
    if (quotedName && quotedName[1].length >= 2 && quotedName[1].length <= 60) {
      name = quotedName[1].trim()
    }
  }

  // Extraer teléfono/celular (patrones peruanos)
  let phone: string | undefined
  // Buscar específicamente después de palabras clave de teléfono
  const phoneKeywordsPattern = /(?:celular|teléfono|teléfono|phone|móvil)\s*(?:es\s*)?(?:es\s*)?(?:\+?51\s?)?(9\d{8})/i
  const phoneKeywordsMatch = message.match(phoneKeywordsPattern)

  if (phoneKeywordsMatch) {
    phone = phoneKeywordsMatch[1]
  } else {
    // Patrón general para números de celular peruanos
    const phonePattern = /(?:\+?51\s?)?(9\d{8})/g
    const phoneMatch = message.match(phonePattern)
    if (phoneMatch) {
      phone = phoneMatch[0].replace(/\s/g, '').replace(/\+51/, '')
    }
  }

  return { email, name, phone }
}

/**
 * Busca o crea un cliente en la base de datos
 * CORREGIDO: Retorna estructura correcta
 */
const findOrCreateCustomer = async (companyId: string, customerData: CustomerData, filterQuestions: any[]) => {
  const existingCustomer = await client.company.findUnique({
    where: { id: companyId },
    select: {
      User: { select: { clerkId: true } },
      name: true,
      customer: {
        where: { email: { startsWith: customerData.email } },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          questions: true,
          conversations: {
            select: {
              id: true,
              live: true,
              mailed: true,
              satisfactionCollected: true,
              conversationState: true,
              lastUserActivityAt: true
            }
          }
        }
      }
    }
  })

  if (!existingCustomer?.customer.length) {
    // Crear nuevo cliente
    await client.company.update({
      where: { id: companyId },
      data: {
        customer: {
          create: {
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
            status: true,
            totalInteractions: 1,
            lastActiveAt: new Date(),
            questions: { create: filterQuestions },
            conversations: { create: {} }
          }
        }
      }
    })

    // CORREGIDO: Buscar el cliente recién creado con la estructura correcta
    const createdCustomer = await client.company.findUnique({
      where: { id: companyId },
      select: {
        User: { select: { clerkId: true } },
        name: true,
        customer: {
          where: { email: { startsWith: customerData.email } },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            questions: true,
            conversations: {
              select: {
                id: true,
                live: true,
                mailed: true,
                satisfactionCollected: true,
                conversationState: true,
                lastUserActivityAt: true,
                // conversationNumber: true // Campo removido
              }
            }
          }
        }
      }
    })

    return { customer: createdCustomer, isNew: true }
  }

  return { customer: existingCustomer, isNew: false }
}

/**
 * Actualiza los datos del cliente existente si se detecta información nueva
 */
const updateCustomerData = async (customerId: string, customerData: CustomerData) => {
  const updateData: any = {
    lastActiveAt: new Date(),
    totalInteractions: { increment: 1 }
  }

  // Solo actualizar si hay datos nuevos
  if (customerData.name) updateData.name = customerData.name
  if (customerData.phone) updateData.phone = customerData.phone

  await client.customer.update({
    where: { id: customerId },
    data: updateData
  })
}

// ============================================
// SISTEMA INTELIGENTE DE PRODUCTOS
// ============================================

/**
 * Detecta las preferencias del cliente en su mensaje
 * Busca menciones de materiales, categorías, texturas, temporadas, usos y características
 */
const detectProductPreferences = (
  message: string,
  chatBotCompany: ChatBotCompany
): {
  materials: string[]
  categories: string[]
  textures: string[]
  seasons: string[]
  uses: string[]
  features: string[]
  colors: string[]
  hasPreferences: boolean
} => {
  const lowerMsg = message.toLowerCase()

  const preferences = {
    materials: [] as string[],
    categories: [] as string[],
    textures: [] as string[],
    seasons: [] as string[],
    uses: [] as string[],
    features: [] as string[],
    colors: [] as string[],
    hasPreferences: false
  }

  // Detectar materiales mencionados
  chatBotCompany.materials.forEach(mat => {
    if (lowerMsg.includes(mat.name.toLowerCase())) {
      preferences.materials.push(mat.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar categorías mencionadas
  chatBotCompany.categories.forEach(cat => {
    if (lowerMsg.includes(cat.name.toLowerCase())) {
      preferences.categories.push(cat.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar texturas mencionadas
  chatBotCompany.textures.forEach(tex => {
    if (lowerMsg.includes(tex.name.toLowerCase())) {
      preferences.textures.push(tex.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar temporadas mencionadas
  chatBotCompany.seasons.forEach(season => {
    if (lowerMsg.includes(season.name.toLowerCase())) {
      preferences.seasons.push(season.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar usos mencionados
  chatBotCompany.uses.forEach(use => {
    if (lowerMsg.includes(use.name.toLowerCase())) {
      preferences.uses.push(use.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar características mencionadas
  chatBotCompany.features.forEach(feat => {
    if (lowerMsg.includes(feat.name.toLowerCase())) {
      preferences.features.push(feat.name)
      preferences.hasPreferences = true
    }
  })

  // Detectar colores comunes mencionados
  const commonColors = [
    'rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco', 'gris', 'rosa',
    'morado', 'naranja', 'marrón', 'beige', 'celeste', 'turquesa', 'violeta'
  ]

  commonColors.forEach(color => {
    if (lowerMsg.includes(color)) {
      preferences.colors.push(color)
      preferences.hasPreferences = true
    }
  })

  return preferences
}

/**
 * Filtra productos según las preferencias detectadas
 */
const filterProductsByPreferences = (
  products: ChatBotCompany['products'],
  preferences: ReturnType<typeof detectProductPreferences>
): ChatBotCompany['products'] => {
  if (!preferences.hasPreferences) {
    return products // Si no hay preferencias, devolver todos
  }

  return products.filter(product => {
    let matches = false

    // Filtrar por material
    if (preferences.materials.length > 0 && product.material) {
      if (preferences.materials.some(mat =>
        product.material?.name.toLowerCase().includes(mat.toLowerCase())
      )) {
        matches = true
      }
    }

    // Filtrar por categoría
    if (preferences.categories.length > 0 && product.category) {
      if (preferences.categories.some(cat =>
        product.category?.name.toLowerCase().includes(cat.toLowerCase())
      )) {
        matches = true
      }
    }

    // Filtrar por textura
    if (preferences.textures.length > 0 && product.texture) {
      if (preferences.textures.some(tex =>
        product.texture?.name.toLowerCase().includes(tex.toLowerCase())
      )) {
        matches = true
      }
    }

    // Filtrar por temporada
    if (preferences.seasons.length > 0 && product.season) {
      if (preferences.seasons.some(season =>
        product.season?.name.toLowerCase().includes(season.toLowerCase())
      )) {
        matches = true
      }
    }

    // Filtrar por uso
    if (preferences.uses.length > 0 && product.uses.length > 0) {
      if (preferences.uses.some(use =>
        product.uses.some(pUse =>
          pUse.use.name.toLowerCase().includes(use.toLowerCase())
        )
      )) {
        matches = true
      }
    }

    // Filtrar por características
    if (preferences.features.length > 0 && product.features.length > 0) {
      if (preferences.features.some(feat =>
        product.features.some(pFeat =>
          pFeat.feature.name.toLowerCase().includes(feat.toLowerCase())
        )
      )) {
        matches = true
      }
    }

    // Filtrar por color
    if (preferences.colors.length > 0 && product.color) {
      if (preferences.colors.some(color =>
        product.color?.toLowerCase().includes(color.toLowerCase())
      )) {
        matches = true
      }
    }

    return matches
  })
}

/**
 * Genera contexto inteligente de productos:
 * - Si el cliente menciona preferencias específicas, filtra y muestra solo productos relevantes
 * - Si no hay preferencias, sugiere hacer preguntas antes de mostrar todos los productos
 */
const generateProductsContext = async (
  chatBotCompany: ChatBotCompany,
  message: string
): Promise<{ content: string; imageUrl?: string }> => {
  if (chatBotCompany.products.length === 0) {
    return { content: '\n⚠️ NO hay productos disponibles en este momento.' }
  }

  // Detectar si el cliente pregunta por productos
  const lowerMsg = message.toLowerCase()
  const asksForProducts = /\b(productos?|telas?|textiles?|catálogo|que\s+tienen|que\s+venden|muestrame|muéstrame|ver\s+productos)\b/i.test(lowerMsg)

  // Detectar preferencias en el mensaje
  const preferences = detectProductPreferences(message, chatBotCompany)

  // Si hay preferencias detectadas, filtrar productos
  if (preferences.hasPreferences) {
    const filteredProducts = filterProductsByPreferences(chatBotCompany.products, preferences)

    if (filteredProducts.length === 0) {
      return {
        content: `\nNo encontramos productos que coincidan exactamente con: ${[...preferences.materials, ...preferences.categories, ...preferences.textures,
        ...preferences.seasons, ...preferences.uses, ...preferences.features,
        ...preferences.colors].join(', ')
          }. Tenemos ${chatBotCompany.products.length} productos disponibles en total.`
      }
    }

    // Mostrar productos filtrados con información detallada
    let firstProductImageUrl: string | undefined = undefined

    const productDetails = await Promise.all(filteredProducts.slice(0, 5).map(async (p) => {
      const details: string[] = [`${p.name} - S/${p.salePrice || p.price}`]

      // AGREGAR IMAGEN DEL PRODUCTO - Construir URL completa con validación
      if (p.image && p.image.trim() !== '') {

        // Validar que el UUID tenga el formato correcto
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isValidUUID = uuidRegex.test(p.image)

        if (isValidUUID) {
          const imageUrl = `https://ucarecdn.com/${p.image}/`

          // VALIDAR QUE LA IMAGEN EXISTA ANTES DE INCLUIRLA
          try {
            const response = await fetch(imageUrl, { method: 'HEAD' })
            if (response.ok) {
              // Capturar la primera imagen válida para retornarla por separado
              if (!firstProductImageUrl) {
                firstProductImageUrl = imageUrl
              }
            }
          } catch (error) {
            console.warn("🚀 ~ Error checking image existence:", imageUrl, error)
          }
        }
      }

      if (p.material) details.push(`Material: ${p.material.name}`)
      if (p.texture) details.push(`Textura: ${p.texture.name}`)
      if (p.category) details.push(`Categoría: ${p.category.name}`)
      if (p.color) details.push(`Color: ${p.color}`)
      if (p.width) details.push(`Ancho: ${p.width}`)
      if (p.weight) details.push(`Gramaje: ${p.weight}`)
      if (p.description) details.push(`${p.description}`)

      const uses = p.uses.map(u => u.use.name).join(', ')
      if (uses) details.push(`Usos: ${uses}`)

      const features = p.features.map(f => f.feature.name).join(', ')
      if (features) details.push(`Características: ${features}`)

      return details.join(' | ')
    }))

    const productDetailsString = productDetails.join('\n')

    return {
      content: `\nProductos que coinciden con tu búsqueda (${filteredProducts.length} encontrados):\n${productDetailsString}${filteredProducts.length > 5 ? `\n... y ${filteredProducts.length - 5} productos más` : ''
        }`,
      imageUrl: firstProductImageUrl
    }
  }

  // Si pregunta por productos pero no da preferencias, sugerir hacer preguntas
  if (asksForProducts) {
    const suggestions: string[] = []

    if (chatBotCompany.materials.length > 0) {
      suggestions.push(`Materiales disponibles: ${chatBotCompany.materials.map(m => m.name).join(', ')}`)
    }
    if (chatBotCompany.categories.length > 0) {
      suggestions.push(`Categorías: ${chatBotCompany.categories.map(c => c.name).join(', ')}`)
    }
    if (chatBotCompany.textures.length > 0) {
      suggestions.push(`Texturas: ${chatBotCompany.textures.map(t => t.name).join(', ')}`)
    }
    if (chatBotCompany.uses.length > 0) {
      suggestions.push(`Usos: ${chatBotCompany.uses.map(u => u.name).join(', ')}`)
    }

    return {
      content: `\n📋 Tenemos ${chatBotCompany.products.length} productos textiles disponibles.

IMPORTANTE: Para ayudarte mejor, pregunta al cliente sobre sus preferencias:
${suggestions.length > 0 ? suggestions.join('\n') : ''}

Ejemplo: "¿Qué tipo de material/tela estás buscando?" o "¿Para qué uso necesitas la tela?"`
    }
  }

  // Si no pregunta por productos, solo dar contexto básico
  return {
    content: `\n📦 Tenemos ${chatBotCompany.products.length} productos textiles. Pregunta al cliente qué busca antes de listarlos todos.`
  }
}

/**
 * OPTIMIZACIÓN: Prompt compacto para reducir tokens
 * Reducción de ~800 tokens a ~300 tokens (62% ahorro)
 */
const generateOpenAIContext = async (
  chatBotCompany: ChatBotCompany,
  customerData: CustomerData,
  contextSpecificPrompt: string,
  companyId: string,
  customerInfo: any,
  message: string
): Promise<{ content: string; imageUrl?: string }> => {
  // Contextos compactos
  const helpdeskContext = chatBotCompany.helpdesk.length > 0
    ? `\nFAQs: ${chatBotCompany.helpdesk.map(h => h.question).join(', ')}`
    : ''

  // NUEVO: Usar sistema inteligente de productos
  const productsContext = await generateProductsContext(chatBotCompany, message)

  return {
    content: `Eres Lunari AI, un asistente virtual especializado en textiles para ${chatBotCompany.name}. Tu personalidad es cálida, empática, entusiasta y genuinamente amigable. Hablas como un amigo cercano que realmente se preocupa por ayudar.

👤 CLIENTE: ${customerData.name || 'Usuario'} | ${customerData.email} | ${customerData.phone || 'Sin teléfono'}

💬 TONO Y ESTILO DE COMUNICACIÓN (MUY IMPORTANTE):
- Sé CÁLIDO y EMPÁTICO: Muestra interés genuino en ayudar, como si fueras un amigo cercano
- Usa un lenguaje NATURAL y CONVERSACIONAL: Evita sonar robótico o demasiado formal
- Sé ENTHUSIASTA pero no exagerado: Muestra entusiasmo cuando ayudas, pero mantén la naturalidad
- Usa el nombre del cliente cuando sea apropiado: Crea una conexión personal
- Empatiza con las necesidades: "Entiendo perfectamente lo que buscas", "Me encantaría ayudarte con eso"
- Sé POSITIVO y ALENTADOR: Usa frases como "¡Perfecto!", "¡Excelente elección!", "Me alegra ayudarte"
- Evita frases robóticas como "De acuerdo", "Entendido", "Procesando". En su lugar, di "¡Claro!", "¡Por supuesto!", "¡Con gusto!"
- Usa emojis con moderación (😊, ✨, 🎉) para dar calidez, pero no exageres
- Haz preguntas de forma natural: "¿Qué tipo de proyecto tienes en mente?" en lugar de "Especifique el tipo de proyecto"

⚠️ REGLAS CRÍTICAS - PROHIBIDO INVENTAR INFORMACIÓN:
1. SOLO usa los productos y datos proporcionados arriba en el contexto
2. NUNCA inventes productos, materiales, características o servicios que no están en el contexto
3. Si no tienes la información exacta, di de forma amigable: "No tengo esa información específica en este momento, pero puedo ayudarte con otras opciones"
4. NO pidas datos del cliente que ya aparecen arriba (nombre, email, teléfono)
5. Si dice "agendar/reservar/cita" → El sistema manejará el agendamiento automáticamente. Solo confirma que estás listo para ayudar.
6. PROHIBIDO crear enlaces de compra, tiendas online, o cualquier enlace
8. PROHIBIDO mencionar pagos online, transferencias bancarias, o cualquier forma de pago digital
9. Si la consulta es fuera de contexto textil, no puedes ayudar, o el cliente solicita hablar con un humano → Responde con "(realtime)" para escalar a humano
   Palabras clave para escalación: "humano", "persona", "agente", "operador", "hablar con alguien", "no me ayuda", "quiero hablar con", "escalar"
${helpdeskContext}${productsContext.content}
10. NO preguntes "¿Hay algo más en que pueda ayudarte?" - esto se agrega automáticamente

🎯 ESTRATEGIA PARA RECOMENDAR PRODUCTOS (CON CALIDEZ):
- Si el cliente pregunta por productos SIN especificar qué busca, NO le des una lista completa
- En su lugar, haz preguntas inteligentes y amigables para conocer sus necesidades:
  * "¡Me encantaría ayudarte a encontrar lo perfecto! ¿Qué tipo de material o tela tienes en mente?" (si hay materiales disponibles)
  * "Para recomendarte lo mejor, ¿me cuentas para qué proyecto necesitas la tela?" (si hay usos disponibles)
  * "¡Genial! ¿Tienes alguna preferencia de textura?" (si hay texturas disponibles)
  * "¿Hay alguna categoría específica que te interese?" (si hay categorías disponibles)
- Una vez que el cliente mencione sus preferencias, muestra SOLO los productos del contexto que coincidan con entusiasmo
- Si el cliente menciona algo que NO está en tu contexto, indícale de forma amigable qué opciones SÍ tienes disponibles

🛒 MANEJO DE SOLICITUDES DE COMPRA Y RESERVA (100% PRESENCIAL):
- IMPORTANTE: NO realizamos ventas online ni pagos en línea. TODAS las compras son presenciales en nuestra tienda.
- Si el cliente quiere comprar o pregunta por precios, NO generes enlaces de compra online
- Si el cliente dice "quiero comprar", "deseo comprar", "deseo poder comprar", etc. SIN mencionar productos específicos:
  * Explica el proceso de compra presencial
  * Pregunta QUÉ PRODUCTOS le interesan (material, color, tipo)
  * NO preguntes directamente si quiere agendar, primero identifica los productos
- Si el cliente dice "quiero reservar", "reservar", "me interesa", "quiero ese producto", responde con "(reserve)" seguido del nombre del producto
- Si el cliente dice "quiero visitar", "visitar la tienda", "ver productos", responde con "(visit)" para sugerir una visita
- Si el cliente menciona productos específicos al querer comprar, el sistema manejará el flujo automáticamente
- SIEMPRE explica que las compras se realizan presencialmente en la tienda durante la cita, de forma amigable
- FLUJO CORRECTO: Identificar productos → Mostrar productos → Preguntar fecha → Agendar cita con reservas

EJEMPLOS DE RESPUESTAS CÁLIDAS:
Evita: "De acuerdo. Procesando tu solicitud. Aquí está la información."
✅ Mejor: "¡Perfecto! Me encanta ayudarte con eso. Aquí tienes toda la información que necesitas 😊"

Evita: "Entendido. Especifica tus preferencias."
✅ Mejor: "¡Claro! Para recomendarte lo mejor, ¿me cuentas qué tipo de proyecto tienes en mente?"

Evita: "Información del producto: [datos]"
✅ Mejor: "¡Excelente elección! Este producto es perfecto para lo que buscas. Te cuento los detalles: [datos con entusiasmo]"

Responde en español, de forma natural, cálida y genuinamente amigable. Usa el nombre del cliente cuando sea apropiado. Sé útil, empático y NUNCA inventes información.`,
    imageUrl: productsContext.imageUrl
  }
}

/**
 * NUEVA FUNCIÓN: Usa IA para detectar si el usuario quiere agendar una cita
 * Reemplaza la detección hardcodeada por una basada en IA para mayor precisión
 */
const isAppointmentRequest = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<boolean> => {
  try {
    const systemPrompt = `Eres un analizador de conversaciones. Tu trabajo es determinar si el usuario quiere AGENDAR UNA CITA, CONSULTA o REUNIÓN.

ANALIZA el mensaje del usuario y el contexto de la conversación para determinar si:
1. El usuario está solicitando EXPLÍCITAMENTE agendar una cita, consulta o reunión
2. El usuario quiere programar una visita o encuentro
3. El usuario necesita reservar un horario o fecha para atención

IMPORTANTE: Solo marca como solicitud de cita si hay intención CLARA de agendar algo.
Las preguntas sobre productos, precios, información general NO son solicitudes de cita.

RESPUESTA SOLO: "SI" si el usuario quiere agendar una cita, "NO" si no.

EJEMPLOS DE SOLICITUD DE CITA:
- "quiero agendar una cita" → SI
- "necesito una consulta" → SI
- "puedo reservar un horario" → SI
- "quiero programar una visita" → SI
- "necesito una reunión" → SI
- "me gustaría agendar" → SI
- "quiero ver el producto en persona" → SI (implica visita)
- "puedo ir a verlos" → SI (implica visita)

EJEMPLOS DE NO SOLICITUD DE CITA:
- "quiero información sobre productos" → NO
- "cuánto cuesta" → NO
- "qué materiales tienen" → NO
- "necesito ayuda" → NO (muy genérico)
- "tengo una pregunta" → NO
- "cita" (solo la palabra sin contexto) → NO
- "consulta" (solo la palabra sin contexto) → NO`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3), // Últimos 3 mensajes para contexto
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1, // Baja temperatura para respuestas consistentes
      max_tokens: 10 // Solo necesitamos "SI" o "NO"
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    return response?.trim().toUpperCase() === 'SI'

  } catch (error) {
    console.error('Error en isAppointmentRequest:', error)
    // Si falla la IA, retornar false (no usar fallback hardcodeado)
    return false
  }
}

/**
 * Determina el contexto específico basado en el tipo de solicitud
 */
const getContextSpecificPrompt = async (
  message: string,
  companyId: string,
  customerId: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> => {
  const isAppointment = await isAppointmentRequest(message, chatHistory)
  const isGeneralQuery = /ayuda|información|consulta|pregunta/i.test(message)

  if (isAppointment) {
    return `
CONTEXTO ACTUAL: El cliente está solicitando agendar una cita o consulta.
RESPUESTA ESPERADA: El sistema manejará el agendamiento automáticamente. Solo confirma que estás listo para ayudar con el proceso.
NO pidas email nuevamente, ya lo tienes.`
  } else if (isGeneralQuery) {
    return `
CONTEXTO ACTUAL: El cliente está haciendo una consulta general.
RESPUESTA ESPERADA: Responde su consulta de manera útil y ofrece ayuda adicional.
NO pidas email nuevamente, ya lo tienes.`
  }

  return ''
}

/**
 * Maneja la respuesta de OpenAI y ejecuta acciones específicas
 */
const handleOpenAIResponse = async (
  response: string,
  customerInfo: CustomerInfo,
  chatHistory: any[],
  userMessage?: string,
  conversationId?: string | null
) => {
  // Obtener el conversationId válido
  const validConversationId = conversationId || (customerInfo.conversations?.[0]?.id || null)

  if (!validConversationId) {
    throw new Error('No se pudo determinar un conversationId válido en handleOpenAIResponse')
  }
  // Manejar solicitudes iniciales de compra usando IA
  const purchaseIntent = await detectPurchaseIntent(userMessage || '', chatHistory)
  if (purchaseIntent.wantsToPurchase) {
    try {
      // Buscar productos que coincidan con el material mencionado
      const chatRoom = await client.conversation.findUnique({
        where: { id: validConversationId },
        select: {
          Customer: {
            select: { companyId: true }
          }
        }
      })
      const companyId = chatRoom?.Customer?.companyId || ''

      let products: any[] = []

      // Si hay producto mencionado, buscarlo usando IA
      if (purchaseIntent.productMentioned) {
        products = await findProductsByCharacteristics(purchaseIntent.productMentioned, companyId)
      }

      // Si se encontraron productos, analizar necesidades y mostrar información completa
      if (products.length > 0) {
        // Obtener información completa de los productos para análisis inteligente
        const productIds = products.map(p => p.id)
        const productsWithDetails = await client.product.findMany({
          where: {
            companyId,
            active: true,
            id: { in: productIds }
          },
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            stock: true,
            unit: true,
            width: true,
            weight: true,
            color: true,
            colors: true,
            description: true,
            material: { select: { name: true } },
            category: { select: { name: true } },
            texture: { select: { name: true } }
          }
        })

        // Usar IA para generar preguntas inteligentes basadas en el contexto
        const intelligentQuestions = await generateIntelligentQuestions(
          userMessage || '',
          productsWithDetails,
          chatHistory
        )

        // Construir lista de productos con más detalles y mejor formato
        const productsList = productsWithDetails
          .slice(0, 8) // Mostrar más productos
          .map((p, idx) => {
            const details: string[] = []
            if (p.material) details.push(p.material.name)
            if (p.color) details.push(p.color)
            if (p.width) details.push(`ancho: ${p.width}`)
            if (p.weight) details.push(`gramaje: ${p.weight}`)
            const stockInfo = p.stock > 0 ? `✅ Stock: ${p.stock} ${p.unit || 'metros'}` : '⚠️ Stock limitado'
            return `${idx + 1}. **${p.name}**
   ${details.length > 0 ? `   - ${details.join(' | ')}` : ''}
   - Precio: S/${p.salePrice || p.price} por ${p.unit || 'metro'}
   - ${stockInfo}`
          })
          .join('\n\n')

        // Construir mensaje con análisis inteligente
        let responseContent = `¡Excelente! Encontré ${productsWithDetails.length} productos de ${purchaseIntent.productMentioned || 'algodón'} disponibles: 😊\n\n${productsList}`

        if (productsWithDetails.length > 8) {
          responseContent += `\n\n... y ${productsWithDetails.length - 8} productos más disponibles.`
        }

        // Agregar análisis y preguntas inteligentes generadas por IA
        if (intelligentQuestions) {
          responseContent += `\n\n💡 **Para ayudarte mejor:**\n${intelligentQuestions}`
        } else {
          // Preguntas por defecto si IA no genera preguntas específicas
          responseContent += `\n\n💡 **Para ayudarte mejor, me gustaría conocer:**
- ¿Para qué proyecto necesitas el ${purchaseIntent.productMentioned || 'producto'}? (ropa, decoración, manualidades, etc.)
- ¿Qué cantidad aproximada necesitas?
- ¿Tienes alguna preferencia de color específica?
- ¿Necesitas alguna característica especial? (ancho, gramaje, textura)`
        }

        responseContent += `\n\n🛒 **Proceso de compra:**
Todas nuestras compras son presenciales en nuestra tienda. Una vez que elijas los productos, te ayudaré a agendar una cita para que puedas verlos, pagar y recogerlos.`

        return {
          response: {
            role: 'assistant' as const,
            content: responseContent
          }
        }
      } else {
        // Si no hay producto específico mencionado, explicar proceso y preguntar por productos
        return {
          response: {
            role: 'assistant' as const,
            content: `¡Me encanta que estés interesado en comprar! 😊

💡 **Proceso de compra:**
Todas nuestras compras se realizan de manera presencial en nuestra tienda. El proceso es simple:

1. **Seleccionar productos** que deseas reservar
2. **Agendar fecha y horario** que más te convenga
3. **Visitar nuestra tienda** en la fecha acordada para ver, pagar y recoger tus productos

Para ayudarte mejor, **¿qué productos te interesan?** Puedes mencionar:
- El tipo de material (ej: "lino", "algodón", "gabardina")
- El color que buscas (ej: "azul", "blanco")
- O simplemente decir "quiero ver productos" y te mostraré opciones

Por ejemplo: "quiero productos de lino azul" o "me interesa algodón"`

          }
        }
      }
    } catch (error) {
      console.error('Error handling purchase intent:', error)
      return {
        response: {
          role: 'assistant' as const,
          content: 'Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo o contacta con nuestro equipo.'
        }
      }
    }
  }

  // Detectar si el usuario está mencionando productos específicos después de una solicitud de compra
  // Esto maneja el caso: "quiero comprar" -> "deseo algodón verde"
  const lastAssistantMessage = chatHistory
    .filter(msg => msg.role === 'assistant')
    .slice(-1)[0]?.content || ''

  // Verificar si el asistente preguntó por productos usando IA (sin hardcodeo)
  const assistantAskedForProducts = await isAssistantAskingForProducts(lastAssistantMessage, chatHistory)

  if (assistantAskedForProducts) {
    try {
      // Buscar productos mencionados en el mensaje actual
      const chatRoom = await client.conversation.findUnique({
        where: { id: validConversationId },
        select: {
          Customer: {
            select: { companyId: true }
          }
        }
      })
      const companyId = chatRoom?.Customer?.companyId || ''

      // Validar companyId antes de continuar
      if (!validateCompanyId(companyId)) {
        return {
          response: {
            role: 'assistant' as const,
            content: 'Lo siento, hubo un problema al identificar la empresa. Por favor, intenta de nuevo o contacta con nuestro equipo.'
          }
        }
      }

      // Extraer productos usando IA
      const productsInfo = await extractProductsFromMessage(userMessage || '', companyId, chatHistory)

      if (productsInfo.hasProducts && productsInfo.productNames && productsInfo.productNames.length > 0) {
        // Buscar productos en la base de datos
        const foundProducts: any[] = []
        const notFoundProducts: string[] = []

        for (const productName of productsInfo.productNames) {
          const products = await findProductsByCharacteristics(productName, companyId, productsInfo.characteristics)
          if (products.length > 0) {
            foundProducts.push(...products)
          } else {
            notFoundProducts.push(productName)
          }
        }

        // Si encontramos productos exactos
        if (foundProducts.length > 0) {
          // Eliminar duplicados por ID
          const uniqueProducts = foundProducts.filter((product, index, self) =>
            index === self.findIndex((p) => p.id === product.id)
          )

          const productsList = uniqueProducts
            .slice(0, 5)
            .map((p, idx) => {
              const details: string[] = []
              if (p.material) details.push(p.material.name)
              if (p.color) details.push(p.color)
              return `${idx + 1}. **${p.name}**${details.length > 0 ? ` (${details.join(', ')})` : ''} - S/${p.salePrice || p.price} por ${p.unit || 'metro'}`
            })
            .join('\n')

          return {
            response: {
              role: 'assistant' as const,
              content: `¡Perfecto! Encontré estos productos que coinciden con lo que buscas: 😊

${productsList}
${uniqueProducts.length > 5 ? `\n... y ${uniqueProducts.length - 5} productos más disponibles` : ''}

💡 **Siguiente paso:**
Para reservar estos productos y agendar tu cita, solo dime "sí" o "quiero agendar mi cita" y te guiaré paso a paso.`
            }
          }
        }

        // Si no encontramos productos exactos, buscar similares
        if (notFoundProducts.length > 0 || foundProducts.length === 0) {
          const similarProducts = await findSimilarProducts(
            productsInfo.characteristics || {},
            companyId,
            5
          )

          if (similarProducts.length > 0) {
            const recommendationsList = similarProducts
              .slice(0, 3)
              .map((p, idx) => {
                const details: string[] = []
                if (p.material) details.push(p.material.name)
                if (p.color) details.push(p.color)
                return `${idx + 1}. **${p.name}**${details.length > 0 ? ` (${details.join(', ')})` : ''} - S/${p.salePrice || p.price} por ${p.unit || 'metro'}`
              })
              .join('\n')

            return {
              response: {
                role: 'assistant' as const,
                content: `Entiendo que buscas ${productsInfo.productNames?.join(' y ') || 'productos específicos'}. 😊

No encontré exactamente lo que mencionaste, pero tengo estas opciones que podrían interesarte:

${recommendationsList}

¿Te gustaría ver más opciones o agendar una cita para ver estos productos en persona?`
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error buscando productos mencionados:', error)
      // Continuar con el flujo normal si hay error
    }
  }

  // Manejar respuestas a preguntas de compra usando IA
  const purchaseResponse = await detectPurchaseResponse(userMessage || '', chatHistory)
  if (purchaseResponse.isPurchaseResponse && purchaseResponse.productName) {
    try {
      // Buscar el producto por nombre
      const chatRoom = await client.conversation.findUnique({
        where: { id: validConversationId },
        select: {
          Customer: {
            select: { companyId: true }
          }
        }
      })
      const companyId = chatRoom?.Customer?.companyId || ''
      const products = await findProductsByCharacteristics(purchaseResponse.productName, companyId)

      if (products.length > 0) {
        const product = products[0]
        const purchaseDetails = await extractPurchaseDetails(userMessage || '', chatHistory)

        if (purchaseDetails.hasDetails) {
          // El cliente proporcionó detalles específicos
          const quantity = purchaseDetails.quantity || 1
          const unitPrice = product.salePrice || product.price
          const totalPrice = calculateTotalPrice(product, quantity, purchaseDetails)

          // Verificar stock disponible
          if (product.stock < quantity) {
            return {
              response: {
                role: 'assistant' as const,
                content: `Lo siento, solo tenemos ${product.stock} ${product.unit || 'metros'} disponibles de "${product.name}". ¿Te gustaría reservar la cantidad disponible o elegir otro producto?`
              }
            }
          }

          // Crear la reserva con detalles específicos
          const reservation = await createProductReservation(
            product.id,
            customerInfo.id,
            quantity,
            `Reserva con detalles específicos - ${product.name}`,
            {
              unitPrice,
              totalPrice,
              unit: purchaseDetails.unit || product.unit || undefined,
              width: purchaseDetails.width || product.width || undefined,
              weight: purchaseDetails.weight || product.weight || undefined,
              color: purchaseDetails.color || product.color || undefined,
              category: product.category?.name
            }
          )

          // Actualizar stock
          const stockUpdated = await updateProductStock(product.id, quantity)

          console.log(`RESERVA DETALLADA CREADA: ${reservation.id} - Cliente: ${customerInfo.email} - Producto: ${product.name} - Cantidad: ${quantity}`)

          return {
            response: {
              role: 'assistant' as const,
              content: `¡Perfecto! He reservado "${product.name}" con los siguientes detalles:

📋 **Detalles de tu reserva:**
- Producto: ${product.name}
- Cantidad: ${quantity} ${purchaseDetails.unit || product.unit || 'metros'}
- Precio unitario: S/${unitPrice}
- Precio total: S/${totalPrice}
${purchaseDetails.width ? `- Ancho: ${purchaseDetails.width}` : ''}
${purchaseDetails.weight ? `- Gramaje: ${purchaseDetails.weight}` : ''}
${purchaseDetails.color ? `- Color: ${purchaseDetails.color}` : ''}
- Estado: Pendiente de confirmación
- Válida por: 7 días

💳 **IMPORTANTE:** El pago se realiza presencialmente en nuestra tienda durante la cita. NO aceptamos pagos online.

Para completar tu compra y recoger el producto, necesitas agendar una cita. Te guiaré paso a paso:

1. **Primero, confirma los productos que deseas reservar** (ya tenemos "${product.name}" en tu lista)
2. **Luego, elige la fecha y horario** que más te convenga

¿Te gustaría proceder con el agendamiento ahora? Solo dime "sí" o "quiero agendar mi cita".`
            }
          }
        } else {
          // El cliente no proporcionó suficientes detalles, preguntar por los faltantes
          const questions = generatePurchaseQuestions(product, {})

          return {
            response: {
              role: 'assistant' as const,
              content: `Entiendo que quieres "${product.name}". Para completar tu reserva, necesito algunos detalles más:

${questions}

Por favor, proporciona esta información para poder calcular el precio exacto y crear tu reserva.`
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling purchase response:', error)
      return {
        response: {
          role: 'assistant' as const,
          content: 'Lo siento, hubo un problema al procesar tu respuesta. Por favor, intenta de nuevo o contacta con nuestro equipo.'
        }
      }
    }
  }

  // Manejar modo tiempo real (escalado a humano)
  if (response.includes('(realtime)')) {
    await client.conversation.update({
      where: { id: validConversationId },
      data: {
        live: true,
        conversationState: 'ESCALATED' as any // Marcar como escalado as any // Marcar como escalado
      }
    })

    // Notificar al equipo humano sobre la escalación
    console.log(`🚨 ESCALACIÓN A HUMANO: Chat ${validConversationId} - Cliente: ${customerInfo.email}`)

    return {
      response: {
        role: 'assistant' as const,
        content: response.replace('(realtime)', '')
      },
      live: true, // Indicar que está en modo live
      chatRoom: validConversationId // ID del chatRoom para Pusher
    }
  }

  // Manejar reservas de productos con detalles específicos
  if (response.includes('(reserve)')) {
    const reservationMatch = response.match(/\(reserve\)\s*(.+)/i)
    if (reservationMatch) {
      const productName = reservationMatch[1].trim()

      try {
        // Buscar el producto por nombre - obtener companyId del chatRoom
        const chatRoom = await client.conversation.findUnique({
          where: { id: validConversationId },
          select: {
            Customer: {
              select: { companyId: true }
            }
          }
        })
        const companyId = chatRoom?.Customer?.companyId || ''
        const products = await findProductsByCharacteristics(productName, companyId)

        if (products.length > 0) {
          const product = products[0] // Tomar el primer producto encontrado

          // Detectar detalles específicos en el mensaje del cliente usando IA
          const purchaseDetails = await extractPurchaseDetails(userMessage || '', chatHistory)

          if (purchaseDetails.hasDetails) {
            // El cliente ya proporcionó detalles específicos
            const quantity = purchaseDetails.quantity || 1
            const unitPrice = product.salePrice || product.price
            const totalPrice = calculateTotalPrice(product, quantity, purchaseDetails)

            // Verificar stock disponible
            if (product.stock < quantity) {
              return {
                response: {
                  role: 'assistant' as const,
                  content: `Lo siento, solo tenemos ${product.stock} ${product.unit || 'metros'} disponibles de "${product.name}". ¿Te gustaría reservar la cantidad disponible o elegir otro producto?`
                }
              }
            }

            // Crear la reserva con detalles específicos
            const reservation = await createProductReservation(
              product.id,
              customerInfo.id,
              quantity,
              `Reserva con detalles específicos - ${product.name}`,
              {
                unitPrice,
                totalPrice,
                unit: purchaseDetails.unit || product.unit || undefined,
                width: purchaseDetails.width || product.width || undefined,
                weight: purchaseDetails.weight || product.weight || undefined,
                color: purchaseDetails.color || product.color || undefined,
                category: product.category?.name
              }
            )

            // Actualizar stock
            const stockUpdated = await updateProductStock(product.id, quantity)

            console.log(`RESERVA DETALLADA CREADA: ${reservation.id} - Cliente: ${customerInfo.email} - Producto: ${product.name} - Cantidad: ${quantity}`)

            return {
              response: {
                role: 'assistant' as const,
                content: `¡Perfecto! He reservado "${product.name}" con los siguientes detalles:

📋 **Detalles de tu reserva:**
- Producto: ${product.name}
- Cantidad: ${quantity} ${purchaseDetails.unit || product.unit || 'metros'}
- Precio unitario: S/${unitPrice}
- Precio total: S/${totalPrice}
${purchaseDetails.width ? `- Ancho: ${purchaseDetails.width}` : ''}
${purchaseDetails.weight ? `- Gramaje: ${purchaseDetails.weight}` : ''}
${purchaseDetails.color ? `- Color: ${purchaseDetails.color}` : ''}
- Estado: Pendiente de confirmación
- Válida por: 7 días

💳 **IMPORTANTE:** El pago se realiza presencialmente en nuestra tienda durante la cita. NO aceptamos pagos online.

Para completar tu compra y recoger el producto, necesitas agendar una cita para venir a nuestra tienda y pagar presencialmente. ¿Te gustaría agendar una cita ahora?`
              }
            }
          } else {
            // El cliente no proporcionó detalles específicos, preguntar por ellos
            const questions = generatePurchaseQuestions(product, {})

            return {
              response: {
                role: 'assistant' as const,
                content: `¡Excelente elección! "${product.name}" es un gran producto.

📋 **Información del producto:**
- Precio: S/${product.salePrice || product.price} por ${product.unit || 'metro'}
- Stock disponible: ${product.stock} ${product.unit || 'metros'}
${product.width ? `- Ancho disponible: ${product.width}` : ''}
${product.weight ? `- Gramaje: ${product.weight}` : ''}
${product.colors && product.colors.length > 0 ? `- Colores disponibles: ${product.colors.join(', ')}` : ''}

Para proceder con tu reserva, necesito algunos detalles específicos:

${questions}

Por favor, proporciona esta información para poder calcular el precio exacto y crear tu reserva.`
              }
            }
          }
        } else {
          return {
            response: {
              role: 'assistant' as const,
              content: `No pude encontrar el producto "${productName}" en nuestro catálogo. ¿Podrías ser más específico sobre el producto que te interesa?`
            }
          }
        }
      } catch (error) {
        console.error('Error creating reservation:', error)
        return {
          response: {
            role: 'assistant' as const,
            content: 'Lo siento, hubo un problema al procesar tu reserva. Por favor, intenta de nuevo o contacta con nuestro equipo.'
          }
        }
      }
    }
  }

  // Manejar solicitudes de visita a la tienda
  if (response.includes('(visit)')) {
    return {
      response: {
        role: 'assistant' as const,
        content: `¡Excelente idea! Te invito a visitar nuestra tienda para que puedas ver todos nuestros productos textiles en persona.

🏪 **¿Por qué visitar nuestra tienda?**
- Ver y tocar las telas antes de comprar
- Recibir asesoría personalizada
- Conocer nuestra amplia variedad de productos
- Resolver todas tus dudas directamente

💳 **IMPORTANTE:** Todas nuestras ventas son presenciales. NO realizamos ventas online.

¿Te gustaría agendar una cita para visitar nuestra tienda? Puedo ayudarte a coordinar una visita en el horario que más te convenga.`
      }
    }
  }

  // Manejar solicitudes de compra directa con preguntas específicas
  if (response.includes('(purchase)')) {
    const purchaseMatch = response.match(/\(purchase\)\s*(.+)/i)
    if (purchaseMatch) {
      const productName = purchaseMatch[1].trim()

      try {
        // Buscar el producto por nombre
        const chatRoom = await client.conversation.findUnique({
          where: { id: validConversationId },
          select: {
            Customer: {
              select: { companyId: true }
            }
          }
        })
        const companyId = chatRoom?.Customer?.companyId || ''
        const products = await findProductsByCharacteristics(productName, companyId)

        if (products.length > 0) {
          const product = products[0]

          return {
            response: {
              role: 'assistant' as const,
              content: `¡Excelente elección! "${product.name}" es un gran producto.

📋 **Información del producto:**
- Precio: S/${product.salePrice || product.price} por ${product.unit || 'metro'}
- Stock disponible: ${product.stock} ${product.unit || 'metros'}
${product.width ? `- Ancho disponible: ${product.width}` : ''}
${product.weight ? `- Gramaje: ${product.weight}` : ''}
${product.colors && product.colors.length > 0 ? `- Colores disponibles: ${product.colors.join(', ')}` : ''}

Para proceder con tu compra, necesito algunos detalles específicos:

${generatePurchaseQuestions(product, {})}

Por favor, proporciona esta información para poder calcular el precio exacto y crear tu reserva.`
            }
          }
        } else {
          return {
            response: {
              role: 'assistant' as const,
              content: `No pude encontrar el producto "${productName}" en nuestro catálogo. ¿Podrías ser más específico sobre el producto que te interesa?`
            }
          }
        }
      } catch (error) {
        console.error('Error handling purchase request:', error)
        return {
          response: {
            role: 'assistant' as const,
            content: 'Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo o contacta con nuestro equipo.'
          }
        }
      }
    }
  }

  // Manejar preguntas completadas
  if (chatHistory[chatHistory.length - 1]?.content.includes('(complete)')) {
    const firstUnansweredQuestion = await client.customerResponses.findFirst({
      where: {
        customerId: customerInfo.id,
        answered: null
      },
      select: { id: true },
      orderBy: { question: 'asc' }
    })

    if (firstUnansweredQuestion) {
      await client.customerResponses.update({
        where: { id: firstUnansweredQuestion.id },
        data: { answered: chatHistory[chatHistory.length - 1].content }
      })
    }
  }

  // Manejar enlaces generados - CORREGIDO: Mantener contenido original
  const generatedLink = extractURLfromString(response)
  if (generatedLink) {
    const cleanLink = generatedLink[0].replace(/[()]+$/, '').trim()
    return {
      response: {
        role: 'assistant' as const,
        content: response, // CORREGIDO: Mantener el contenido completo original
        link: cleanLink
      }
    }
  }

  // Respuesta normal
  return {
    response: {
      role: 'assistant' as const,
      content: response
    }
  }
}

/**
 * Maneja el flujo cuando no hay email del cliente
 */
const handleNoEmailFlow = async (message: string, chatHistory: any[]) => {
  // Extraer datos disponibles del mensaje actual
  const extractedData = extractCustomerData(message)

  // Determinar qué información ya tenemos
  const hasName = !!extractedData.name
  const hasEmail = !!extractedData.email
  const hasPhone = !!extractedData.phone

  // Crear prompt dinámico basado en lo que ya sabemos
  let systemPrompt = `Eres **Lunari AI**, un asistente virtual cálido, empático y genuinamente amigable. Tu personalidad es entusiasta, cercana y natural. Hablas como un amigo que realmente quiere ayudar.

## INFORMACIÓN ACTUAL DEL CLIENTE:
${hasName ? `- Nombre: ${extractedData.name}` : '- Nombre: No disponible'}
${hasEmail ? `- Email: ${extractedData.email}` : '- Email: No disponible'}
${hasPhone ? `- Teléfono: ${extractedData.phone}` : '- Teléfono: No disponible'}

## TONO Y ESTILO (MUY IMPORTANTE):
- Sé CÁLIDO y ENTHUSIASTA: Muestra emoción genuina al conocer al cliente
- Usa lenguaje NATURAL y CONVERSACIONAL: Evita sonar robótico o demasiado formal
- Si ya tienes el nombre, úsalo con cariño: "¡Hola ${extractedData.name}! 😊" o "¡Perfecto ${extractedData.name}!"
- Muestra EMPATÍA: "Me encantaría conocerte mejor para ayudarte de la mejor manera"
- Sé POSITIVO: Usa frases como "¡Genial!", "¡Perfecto!", "Me alegra conocerte"
- Evita frases robóticas: En lugar de "Procesando información", di "¡Con gusto te ayudo!"

## INSTRUCCIONES CRÍTICAS PARA EL FORMATO:
- Da una bienvenida cálida y entusiasta: "¡Hola! Soy Lunari AI, tu asistente virtual. 😊"
- SIEMPRE da un salto de línea después del saludo
- Luego escribe de forma amigable: "Para brindarte la mejor atención personalizada, me encantaría conocerte un poco más:"
- SIEMPRE da otro salto de línea después de esta frase
- Enumera SOLO los datos que faltan, numerados del 1 al 3 máximo
- CADA PREGUNTA debe estar en una línea separada
- Los únicos datos a pedir son: nombre, correo electrónico, número de celular
- Si ya tienes el nombre, úsalo en la conversación con cariño
- Mantén un tono cálido, amigable y natural (no robótico)
- No pidas otros datos, solo estos 3 específicos

## FORMATO OBLIGATORIO:
Debes responder EXACTAMENTE en este formato:

         ${TEXTILE_MESSAGES.WELCOME}

         Para brindarte la mejor atención especializada en textiles, necesito algunos datos:

         1. ¿Cómo te llamas?
         2. ¿Cuál es tu correo electrónico?
         3. ¿Tu número de celular?

         Cada número debe estar en una línea separada. NO pongas todo en una sola línea.

## FLUJO DE INFORMACIÓN:
1. **Si no tienes nombre**: Pide el nombre primero
2. **Si no tienes email**: Solicita el email explicando que es para brindar mejor servicio
3. **Si no tienes teléfono**: Puedes solicitar el teléfono para contacto adicional (opcional)

## EJEMPLOS DE RESPUESTAS CÁLIDAS:

### Si no tienes nada:
"¡Hola! Soy Lunari AI, tu asistente virtual. 😊

Me encantaría conocerte mejor para brindarte la mejor atención personalizada:

1. ¿Cómo te llamas?
2. ¿Cuál es tu correo electrónico?  
3. ¿Tu número de celular?"

### Si ya tienes nombre pero no email:
"¡Hola ${extractedData.name}! 😊 Me alegra conocerte.

Para brindarte la mejor atención personalizada, me encantaría conocer:

1. ¿Cuál es tu correo electrónico?
2. ¿Tu número de celular?"

### Si ya tienes nombre y email pero no teléfono:
"¡Perfecto ${extractedData.name}! 😊 Ya tengo tu email (${extractedData.email}).

Para completar tu perfil y poder ayudarte mejor:

1. ¿Tu número de celular?"

## TONO:
- Cálido, empático y genuinamente amigable
- Entusiasta pero natural (no exagerado)
- Conversacional como un amigo cercano
- Personalizado usando la información disponible con cariño
- Positivo y alentador

RECUERDA: Sé natural, cálido y genuinamente amigable. Muestra interés real en ayudar. Solo pide la información que realmente necesitas.

         IMPORTANTE: Cuando pidas los datos, usa EXACTAMENTE este formato con saltos de línea:
         ${TEXTILE_MESSAGES.WELCOME}

         Para brindarte la mejor atención especializada en textiles, necesito algunos datos:

         1. ¿Cómo te llamas?
         2. ¿Cuál es tu correo electrónico?
         3. ¿Tu número de celular?

         NO pongas todo en una sola línea. Cada pregunta debe estar en su propia línea.`

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message }
    ],
    model: 'gpt-4o-mini', // Modelo más reciente y económico con mejor calidad conversacional
    temperature: 0.85, // Temperatura más alta para respuestas más naturales y cálidas
    max_tokens: 300
  })

  const content = safeExtractOpenAIResponse(chatCompletion) || 'Lo siento, no pude generar una respuesta. Por favor, intenta de nuevo.'

  return {
    response: {
      role: 'assistant' as const,
      content
    }
  }
}

// ===== FUNCIÓN PRINCIPAL REFACTORIZADA =====
// ============================================
// SISTEMA DE RESERVAS DE PRODUCTOS
// ============================================


/**
 * Crea una reserva de producto con detalles específicos de compra
 */
const createProductReservation = async (
  productId: string,
  customerId: string,
  quantity: number = 1,
  notes?: string,
  purchaseDetails?: {
    unitPrice?: number
    totalPrice?: number
    unit?: string
    width?: string
    weight?: string
    color?: string
    category?: string
  }
) => {
  try {
    const reservation = await client.productReservation.create({
      data: {
        productId,
        customerId,
        quantity,
        notes,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 días
        // NUEVOS CAMPOS: Detalles específicos de compra
        unitPrice: purchaseDetails?.unitPrice,
        totalPrice: purchaseDetails?.totalPrice,
        unit: purchaseDetails?.unit,
        width: purchaseDetails?.width,
        weight: purchaseDetails?.weight,
        color: purchaseDetails?.color,
        category: purchaseDetails?.category
      },
      include: {
        Product: {
          select: {
            name: true,
            price: true,
            salePrice: true,
            stock: true,
            unit: true,
            width: true,
            weight: true,
            color: true,
            colors: true,
            category: {
              select: { name: true }
            }
          }
        }
      }
    })

    return reservation
  } catch (error) {
    console.error('Error creating product reservation:', error)
    throw error
  }
}

/**
 * Genera preguntas inteligentes basadas en el contexto y productos disponibles
 */
const generateIntelligentQuestions = async (
  userMessage: string,
  products: any[],
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string | null> => {
  try {
    // Analizar qué información falta para hacer mejores recomendaciones
    const productsContext = products
      .slice(0, 10)
      .map(p => {
        const details: string[] = []
        if (p.material) details.push(`material: ${p.material.name}`)
        if (p.color) details.push(`color: ${p.color}`)
        if (p.category) details.push(`categoría: ${p.category.name}`)
        if (p.width) details.push(`ancho: ${p.width}`)
        if (p.weight) details.push(`gramaje: ${p.weight}`)
        return `${p.name} (${details.join(', ')})`
      })
      .join('\n')

    const systemPrompt = `Eres un asistente experto en textiles. Analiza el mensaje del usuario y los productos disponibles para generar preguntas INTELIGENTES y RELEVANTES que ayuden a entender mejor sus necesidades.

PRODUCTOS DISPONIBLES:
${productsContext}

MENSAJE DEL USUARIO:
"${userMessage}"

ANALIZA:
1. ¿Qué información falta para hacer una mejor recomendación?
2. ¿Para qué podría necesitar estos productos? (uso, proyecto, aplicación)
3. ¿Qué características específicas podrían ser importantes? (cantidad, color, ancho, textura)
4. ¿Hay algún contexto en la conversación que indique necesidades específicas?

GENERA 2-3 preguntas INTELIGENTES, NATURALES y ESPECÍFICAS que:
- Ayuden a entender mejor las necesidades del usuario
- Sean relevantes para los productos disponibles
- Suenen naturales y conversacionales
- No sean genéricas ni obvias

RESPONDE SOLO CON LAS PREGUNTAS (sin explicaciones adicionales), en formato conversacional y amigable.

EJEMPLOS DE BUENAS PREGUNTAS:
- "¿Para qué proyecto necesitas el algodón? Esto me ayudará a recomendarte el tipo y gramaje más adecuado."
- "¿Tienes alguna preferencia de color? Veo que tenemos varias opciones disponibles."
- "¿Qué cantidad aproximada necesitas? Esto me permitirá verificar disponibilidad y calcular mejor el precio."

EJEMPLOS DE MALAS PREGUNTAS (evitar):
- "¿Qué necesitas?" (muy genérico)
- "¿Quieres comprar?" (ya sabemos que sí)
- "¿Tienes alguna pregunta?" (no es útil)`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-2),
        { role: 'user', content: userMessage }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7, // Más creativo para preguntas naturales
      max_tokens: 150
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    return response || null
  } catch (error) {
    console.error('Error generando preguntas inteligentes:', error)
    return null
  }
}

/**
 * Detecta si el cliente quiere comprar usando IA (sin hardcodeo)
 */
const detectPurchaseIntent = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{
  wantsToPurchase: boolean
  productMentioned?: string
}> => {
  try {
    const systemPrompt = `Eres un analizador de conversaciones. Tu trabajo es determinar si el usuario quiere COMPRAR o ADQUIRIR productos.

ANALIZA el mensaje del usuario y el contexto de la conversación para determinar si:
1. El usuario está expresando intención de COMPRAR productos
2. El usuario quiere ADQUIRIR algo
3. El usuario está interesado en REALIZAR UNA COMPRA

IMPORTANTE: 
- Solo marca como intención de compra si hay CLARA intención de adquirir/comprar
- Las preguntas sobre productos, precios, información NO son intención de compra directa
- Si el usuario dice "quiero ver productos" o "quiero información", NO es compra directa

RESPONDE SOLO EN FORMATO JSON:
{
  "wantsToPurchase": true/false,
  "productMentioned": "nombre del producto mencionado" o null
}

EJEMPLOS DE INTENCIÓN DE COMPRA:
- "quiero comprar" → {"wantsToPurchase": true, "productMentioned": null}
- "deseo poder comprar algún producto" → {"wantsToPurchase": true, "productMentioned": null}
- "necesito comprar lino" → {"wantsToPurchase": true, "productMentioned": "lino"}
- "quiero adquirir algodón" → {"wantsToPurchase": true, "productMentioned": "algodón"}
- "deseo realizar una compra" → {"wantsToPurchase": true, "productMentioned": null}

EJEMPLOS DE NO INTENCIÓN DE COMPRA:
- "quiero información sobre productos" → {"wantsToPurchase": false, "productMentioned": null}
- "cuánto cuesta" → {"wantsToPurchase": false, "productMentioned": null}
- "qué productos tienen" → {"wantsToPurchase": false, "productMentioned": null}
- "quiero ver productos" → {"wantsToPurchase": false, "productMentioned": null}`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3),
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 100
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      return { wantsToPurchase: false }
    }

    const parsed = safeJsonParse<{ wantsToPurchase?: boolean; productMentioned?: string | null }>(
      response,
      { wantsToPurchase: false }
    )
    return {
      wantsToPurchase: parsed.wantsToPurchase || false,
      productMentioned: parsed.productMentioned || undefined
    }
  } catch (error) {
    console.error('Error en detectPurchaseIntent:', error)
    return { wantsToPurchase: false }
  }
}

/**
 * Detecta si el asistente está preguntando por productos usando IA
 */
const isAssistantAskingForProducts = async (
  assistantMessage: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<boolean> => {
  try {
    const systemPrompt = `Eres un analizador de conversaciones. Determina si el mensaje del asistente está PREGUNTANDO al usuario QUÉ PRODUCTOS le interesan o desea comprar.

ANALIZA el mensaje del asistente y determina si:
1. Está preguntando qué productos le interesan al usuario
2. Está pidiendo que el usuario mencione productos específicos
3. Está explicando el proceso de compra y preguntando por productos
4. Está guiando al usuario para que mencione sus preferencias de productos

IMPORTANTE: Solo marca como "preguntando por productos" si hay una PREGUNTA o INVITACIÓN clara para que el usuario mencione productos.

RESPUESTA SOLO: "SI" si el asistente está preguntando por productos, "NO" si no.

EJEMPLOS DE PREGUNTAS POR PRODUCTOS:
- "¿qué productos te interesan?" → SI
- "Para ayudarte mejor, ¿qué productos te interesan?" → SI
- "¿qué tipo de material buscas?" → SI
- "Puedes mencionar el tipo de material" → SI
- "¿qué color buscas?" → SI
- "Menciona qué productos deseas" → SI
- "El proceso es simple: 1. Seleccionar productos..." → SI (si incluye pregunta)

EJEMPLOS DE NO PREGUNTAS POR PRODUCTOS:
- "¡Me encanta que estés interesado!" → NO
- "Aquí está la información" → NO
- "El producto cuesta S/50" → NO
- "Gracias por tu consulta" → NO`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-2),
        { role: 'assistant', content: assistantMessage }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 10
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    return response?.trim().toUpperCase() === 'SI'
  } catch (error) {
    console.error('Error en isAssistantAskingForProducts:', error)
    return false
  }
}

/**
 * Detecta si el cliente está respondiendo a preguntas de compra usando IA
 */
const detectPurchaseResponse = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<{
  isPurchaseResponse: boolean
  productName?: string
}> => {
  try {
    const lastAssistantMessage = chatHistory
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0]?.content || ''

    const systemPrompt = `Eres un analizador de conversaciones. Determina si el usuario está respondiendo a preguntas sobre detalles de compra.

MENSAJE ANTERIOR DEL ASISTENTE:
${lastAssistantMessage}

ANALIZA si:
1. El asistente hizo preguntas sobre detalles de compra (cantidad, ancho, color, etc.)
2. El usuario está respondiendo con información específica (números, medidas, colores, etc.)
3. El usuario mencionó un nombre de producto en el contexto

RESPONDE SOLO EN FORMATO JSON:
{
  "isPurchaseResponse": true/false,
  "productName": "nombre del producto mencionado" o null
}

EJEMPLOS:
- Asistente pregunta "¿Cuántos metros?" y usuario dice "5 metros" → {"isPurchaseResponse": true, "productName": null}
- Asistente pregunta sobre producto "lino" y usuario dice "quiero 3 metros" → {"isPurchaseResponse": true, "productName": "lino"}
- Usuario dice "hola" → {"isPurchaseResponse": false, "productName": null}`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3),
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 100
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      return { isPurchaseResponse: false }
    }

    const parsed = safeJsonParse<{ isPurchaseResponse?: boolean; productName?: string | null }>(
      response,
      { isPurchaseResponse: false }
    )
    return {
      isPurchaseResponse: parsed.isPurchaseResponse || false,
      productName: parsed.productName || undefined
    }
  } catch (error) {
    console.error('Error en detectPurchaseResponse:', error)
    return { isPurchaseResponse: false }
  }
}

/**
 * Extrae detalles específicos de compra usando IA (cantidad, ancho, color, etc.)
 */
const extractPurchaseDetails = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{
  hasDetails: boolean
  quantity?: number
  unit?: string
  width?: string
  weight?: string
  color?: string
  category?: string
}> => {
  try {
    const systemPrompt = `Eres un analizador experto. Extrae detalles específicos de compra del mensaje del usuario.

ANALIZA el mensaje y extrae:
1. **Cantidad**: Números que representen cantidad (ej: "5", "10 metros", "3 rollos")
2. **Unidad**: Tipo de unidad mencionada (metros, rollos, kg, etc.)
3. **Ancho**: Medidas de ancho (ej: "1.5m", "2 metros de ancho")
4. **Gramaje/Peso**: Peso o gramaje (ej: "150 gr/m²", "200 gramos")
5. **Color**: Colores mencionados (ej: "azul", "blanco", "rojo")
6. **Categoría**: Tipo de categoría si se menciona

RESPONDE SOLO EN FORMATO JSON:
{
  "hasDetails": true/false,
  "quantity": número o null,
  "unit": "metros" o "rollos" o "kg" o null,
  "width": "1.5m" o null,
  "weight": "150 gr/m²" o null,
  "color": "azul" o null,
  "category": null
}

EJEMPLOS:
- "quiero 5 metros de lino azul" → {"hasDetails": true, "quantity": 5, "unit": "metros", "color": "azul"}
- "necesito 3 rollos de 1.5m de ancho" → {"hasDetails": true, "quantity": 3, "unit": "rollos", "width": "1.5m"}
- "quiero algodón" → {"hasDetails": false}
- "5 metros, color azul, ancho 2m" → {"hasDetails": true, "quantity": 5, "unit": "metros", "color": "azul", "width": "2m"}`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-2),
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 200
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      return { hasDetails: false }
    }

    const parsed = safeJsonParse<{
      hasDetails?: boolean
      quantity?: number
      unit?: string
      width?: string
      weight?: string
      color?: string
      category?: string
    }>(response, { hasDetails: false })

    return {
      hasDetails: parsed.hasDetails || false,
      quantity: parsed.quantity || undefined,
      unit: parsed.unit || undefined,
      width: parsed.width || undefined,
      weight: parsed.weight || undefined,
      color: parsed.color || undefined,
      category: parsed.category || undefined
    }
  } catch (error) {
    console.error('Error en extractPurchaseDetails:', error)
    return { hasDetails: false }
  }
}


/**
 * Genera preguntas específicas para completar los detalles de compra
 */
const generatePurchaseQuestions = (product: any, currentDetails: any): string => {
  const questions: string[] = []

  // Preguntar por cantidad si no se especificó
  if (!currentDetails.quantity) {
    questions.push(`1. ¿Cuántos ${product.unit || 'metros'} necesitas?`)
  }

  // Preguntar por ancho si el producto tiene opciones
  if (!currentDetails.width && product.width) {
    questions.push(`2. ¿Qué ancho prefieres? (Disponible: ${product.width})`)
  }

  // Preguntar por gramaje si el producto tiene opciones
  if (!currentDetails.weight && product.weight) {
    questions.push(`3. ¿Qué gramaje necesitas? (Disponible: ${product.weight})`)
  }

  // Preguntar por color si hay opciones
  if (!currentDetails.color && product.colors && product.colors.length > 0) {
    questions.push(`4. ¿Qué color prefieres? (Disponibles: ${product.colors.join(', ')})`)
  } else if (!currentDetails.color && product.color) {
    questions.push(`4. ¿Te gusta el color ${product.color} o prefieres otro?`)
  }

  // Si no hay preguntas específicas, preguntar por cantidad básica
  if (questions.length === 0) {
    questions.push(`1. ¿Cuántos ${product.unit || 'metros'} necesitas?`)
  }

  return questions.join('\n')
}

/**
 * Calcula el precio total basado en los detalles
 */
const calculateTotalPrice = (product: any, quantity: number, details: any): number => {
  const unitPrice = product.salePrice || product.price
  return unitPrice * quantity
}

/**
 * Actualiza el stock del producto después de una reserva
 */
const updateProductStock = async (productId: string, quantity: number): Promise<boolean> => {
  try {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { stock: true }
    })

    if (!product) return false

    const newStock = product.stock - quantity
    if (newStock < 0) return false // No hay suficiente stock

    await client.product.update({
      where: { id: productId },
      data: { stock: newStock }
    })

    return true
  } catch (error) {
    console.error('Error updating product stock:', error)
    return false
  }
}
/**
 * Busca productos de forma inteligente usando TODAS las características disponibles
 * Busca por: nombre, material, categoría, tipo, color, textura, uso, etc.
 */
const findProductsByCharacteristics = async (
  searchTerm: string,
  companyId: string,
  characteristics?: {
    material?: string
    color?: string
    category?: string
    texture?: string
  }
): Promise<any[]> => {
  try {
    // Obtener TODOS los productos activos con TODAS sus características
    const allProducts = await client.product.findMany({
      where: {
        companyId,
        active: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        stock: true,
        unit: true,
        width: true,
        weight: true,
        color: true,
        colors: true,
        description: true,
        material: { select: { name: true } },
        category: { select: { name: true } },
        texture: { select: { name: true } },
        uses: {
          select: {
            use: { select: { name: true } }
          }
        },
        features: {
          select: {
            feature: { select: { name: true } }
          }
        }
      }
    })

    if (allProducts.length === 0) return []

    // Usar IA para encontrar productos relevantes basándose en TODAS las características
    const productsContext = allProducts.map(p => {
      const details: string[] = []
      details.push(`nombre: ${p.name}`)
      if (p.material) details.push(`material: ${p.material.name}`)
      if (p.category) details.push(`categoría: ${p.category.name}`)
      if (p.color) details.push(`color: ${p.color}`)
      if (p.colors && p.colors.length > 0) details.push(`colores: ${p.colors.join(', ')}`)
      if (p.texture) details.push(`textura: ${p.texture.name}`)
      if (p.uses && p.uses.length > 0) {
        details.push(`usos: ${p.uses.map((u: any) => u.use.name).join(', ')}`)
      }
      if (p.features && p.features.length > 0) {
        details.push(`características: ${p.features.map((f: any) => f.feature.name).join(', ')}`)
      }
      return `${p.id} | ${details.join(' | ')}`
    }).join('\n')

    const systemPrompt = `Eres un experto en búsqueda de productos textiles. Tu trabajo es encontrar productos que coincidan con lo que el usuario busca, considerando TODAS las características disponibles.

PRODUCTOS DISPONIBLES (con TODAS sus características):
${productsContext}

BÚSQUEDA DEL USUARIO:
"${searchTerm}"

CARACTERÍSTICAS ESPECÍFICAS MENCIONADAS:
${characteristics ? JSON.stringify(characteristics, null, 2) : 'Ninguna específica'}

INSTRUCCIONES CRÍTICAS:
1. Busca productos que coincidan con el término de búsqueda en CUALQUIERA de sus características:
   - Nombre del producto
   - Material (ej: si busca "algodón", encuentra productos con material algodón aunque el nombre no lo mencione)
   - Categoría (ej: si busca "mantel", encuentra productos de categoría mantel)
   - Tipo
   - Color
   - Textura
   - Uso
   - Características

2. Si el usuario busca "algodón", encuentra TODOS los productos que tengan algodón como material, aunque el nombre del producto sea diferente (ej: "Mantel Jacquard Elegante" con material algodón)

3. Si el usuario busca un material, categoría o tipo, encuentra productos que tengan esa característica en CUALQUIER campo relevante

4. Prioriza coincidencias exactas, luego parciales

5. Devuelve los IDs de los productos más relevantes (máximo 20)

RESPONDE SOLO EN FORMATO JSON:
{
  "productIds": ["id1", "id2", "id3", ...]
}

Ordena los IDs por relevancia (más relevantes primero).`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Encuentra productos que coincidan con: "${searchTerm}"` }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 300
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      // Fallback: búsqueda básica por nombre y material
      return allProducts.filter((p: any) => {
        const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
        const materialMatch = p.material?.name.toLowerCase().includes(searchTerm.toLowerCase())
        const categoryMatch = p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
        return nameMatch || materialMatch || categoryMatch
      })
    }

    const parsed = safeJsonParse<{ productIds?: string[] }>(response, { productIds: [] })
    const productIds = parsed.productIds || []

    // Buscar los productos por IDs
    const foundProducts = allProducts.filter(p => productIds.includes(p.id))

    // Si no hay resultados de IA, hacer búsqueda básica como fallback
    if (foundProducts.length === 0) {
      return allProducts.filter((p: any) => {
        const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
        const materialMatch = p.material?.name.toLowerCase().includes(searchTerm.toLowerCase())
        const categoryMatch = p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
        const colorMatch = p.color?.toLowerCase().includes(searchTerm.toLowerCase())
        return nameMatch || materialMatch || categoryMatch || colorMatch
      })
    }

    // Ordenar por el orden de los IDs devueltos por IA
    return foundProducts.sort((a: any, b: any) => {
      const indexA = productIds.indexOf(a.id)
      const indexB = productIds.indexOf(b.id)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  } catch (error) {
    console.error('Error en findProductsByCharacteristics:', error)
    // Fallback: búsqueda básica
    try {
      const products = await client.product.findMany({
        where: {
          companyId,
          active: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { material: { name: { contains: searchTerm, mode: 'insensitive' } } },
            { category: { name: { contains: searchTerm, mode: 'insensitive' } } }
          ]
        },
        select: {
          id: true,
          name: true,
          price: true,
          salePrice: true,
          stock: true,
          unit: true,
          width: true,
          weight: true,
          color: true,
          colors: true,
          material: { select: { name: true } },
          category: { select: { name: true } }
        }
      })
      return products
    } catch (fallbackError) {
      console.error('Error en fallback de búsqueda:', fallbackError)
      return []
    }
  }
}

// ============================================
// SISTEMA DE AGENDAMIENTO CONVERSACIONAL
// ============================================

/**
 * Extrae información de cita del mensaje del usuario usando IA
 */
const extractAppointmentInfo = async (
  message: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{
  hasAppointmentInfo: boolean
  date?: string // Formato: YYYY-MM-DD
  time?: string // Formato: "9:00am", "2:30pm", etc.
  appointmentType?: 'STORE_VISIT' | 'PURCHASE'
  purpose?: string
}> => {
  try {
    const systemPrompt = `Eres un analizador de mensajes. Extrae información sobre solicitudes de citas.

ANALIZA el mensaje del usuario y extrae:
1. FECHA: Si menciona una fecha específica (ej: "mañana", "el 15 de marzo", "lunes", "próxima semana")
2. HORA: Si menciona una hora específica (ej: "a las 3pm", "9:00am", "por la tarde")
3. TIPO: Si es visita a tienda (STORE_VISIT) o compra (PURCHASE)
4. PROPÓSITO: Razón de la cita si se menciona

RESPONDE SOLO EN FORMATO JSON:
{
  "hasAppointmentInfo": true/false,
  "date": "YYYY-MM-DD" o null,
  "time": "H:MMam/pm" o null,
  "appointmentType": "STORE_VISIT" o "PURCHASE" o null,
  "purpose": "texto" o null
}

Si no hay información suficiente, hasAppointmentInfo debe ser false.

EJEMPLOS:
- "quiero agendar una cita para mañana a las 3pm" → {"hasAppointmentInfo": true, "date": "2024-03-16", "time": "3:00pm", "appointmentType": "STORE_VISIT", "purpose": null}
- "necesito una consulta el lunes" → {"hasAppointmentInfo": true, "date": "2024-03-18", "time": null, "appointmentType": "STORE_VISIT", "purpose": "consulta"}
- "quiero agendar" → {"hasAppointmentInfo": false, "date": null, "time": null, "appointmentType": null, "purpose": null}`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3),
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 200
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      return { hasAppointmentInfo: false }
    }

    const parsed = safeJsonParse<{
      hasAppointmentInfo?: boolean
      date?: string | null
      time?: string | null
      appointmentType?: string | null
      purpose?: string | null
    }>(response, { hasAppointmentInfo: false })

    // Validar appointmentType para que sea uno de los valores permitidos
    const validAppointmentType = parsed.appointmentType === 'STORE_VISIT' || parsed.appointmentType === 'PURCHASE'
      ? parsed.appointmentType
      : undefined

    return {
      hasAppointmentInfo: parsed.hasAppointmentInfo || false,
      date: parsed.date || undefined,
      time: parsed.time || undefined,
      appointmentType: validAppointmentType,
      purpose: parsed.purpose || undefined
    }
  } catch (error) {
    console.error('Error en extractAppointmentInfo:', error)
    return { hasAppointmentInfo: false }
  }
}

/**
 * Obtiene horarios disponibles para una fecha y filtra los ocupados
 */
const getAvailableSlotsForDate = async (
  companyId: string,
  date: Date
): Promise<string[]> => {
  try {
    // Obtener horarios configurados para ese día
    const slotsResult = await onGetAvailableTimeSlotsForDay(companyId, date)
    if (slotsResult.status !== 200 || !slotsResult.timeSlots) {
      return []
    }

    // Obtener citas ya reservadas para esa fecha
    const existingBookings = await onGetAllCompanyBookings(companyId)
    const bookedSlots = existingBookings
      ?.filter((booking: any) => {
        const bookingDate = new Date(booking.date)
        return (
          bookingDate.getDate() === date.getDate() &&
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getFullYear() === date.getFullYear()
        )
      })
      .map((booking: any) => booking.slot) || []

    // Filtrar horarios ocupados
    const availableSlots = slotsResult.timeSlots.filter(
      (slot: string) => !bookedSlots.includes(slot)
    )

    // Si es hoy, filtrar horarios pasados
    const now = new Date()
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      return availableSlots.filter((slot: string) => {
        const [time, period] = slot.split(/(am|pm)/i)
        const [hours, minutes] = time.split(':').map(Number)
        let totalHours = hours
        if (period?.toLowerCase() === 'pm' && hours !== 12) {
          totalHours += 12
        } else if (period?.toLowerCase() === 'am' && hours === 12) {
          totalHours = 0
        }
        const slotMinutes = totalHours * 60 + (minutes || 0)
        return slotMinutes > currentMinutes
      })
    }

    return availableSlots
  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error)
    return []
  }
}

/**
 * Detecta productos y características mencionadas en el mensaje usando IA
 * Mejorado para entender características como color, material, etc.
 */
const extractProductsFromMessage = async (
  message: string,
  companyId: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{
  hasProducts: boolean
  productNames?: string[]
  quantities?: { [productName: string]: number }
  characteristics?: {
    material?: string
    color?: string
    category?: string
    texture?: string
  }
}> => {
  try {
    // Obtener información completa de productos para contexto
    const allProducts = await client.product.findMany({
      where: {
        companyId,
        active: true
      },
      select: {
        name: true,
        material: { select: { name: true } },
        color: true,
        colors: true,
        category: { select: { name: true } },
        texture: { select: { name: true } }
      },
      take: 100 // Aumentar para mejor contexto
    })

    // Crear contexto estructurado de productos
    const productsContext = allProducts.map(p => {
      const details = [p.name]
      if (p.material) details.push(`material: ${p.material.name}`)
      if (p.color) details.push(`color: ${p.color}`)
      if (p.colors && p.colors.length > 0) details.push(`colores: ${p.colors.join(', ')}`)
      if (p.category) details.push(`categoría: ${p.category.name}`)
      if (p.texture) details.push(`textura: ${p.texture.name}`)
      return details.join(' | ')
    }).join('\n')

    const systemPrompt = `Eres un analizador experto de mensajes sobre productos textiles. Tu trabajo es EXTRAER TODAS las características mencionadas por el usuario para poder buscar productos de forma INTELIGENTE.

PRODUCTOS DISPONIBLES (con TODAS sus características):
${productsContext || 'No hay productos disponibles'}

INSTRUCCIONES CRÍTICAS:
1. **Extrae TODAS las características mencionadas**, no solo el nombre:
   - **Material**: Si menciona "algodón", "lino", "seda", etc. → extrae como material
   - **Categoría/Tipo**: Si menciona "mantel", "cortina", "tela", "textil", etc. → extrae como categoría
   - **Color**: Si menciona "azul", "blanco", "rojo", etc. → extrae como color
   - **Textura**: Si menciona "jacquard", "liso", "estampado", etc. → extrae como textura
   - **Uso**: Si menciona "para cocina", "decoración", etc. → puede indicar categoría

2. **IMPORTANTE**: Si el usuario dice "algodón", extrae:
   - productNames: ["algodón"] (para buscar por nombre)
   - characteristics.material: "algodón" (para buscar productos con material algodón, aunque el nombre no lo mencione)
   
   Esto permitirá encontrar productos como "Mantel Jacquard Elegante" que tiene material algodón, aunque el nombre no contenga "algodón".

3. **Si menciona múltiples características**, extrae todas:
   - "algodón azul" → material="algodón", color="azul"
   - "mantel de algodón" → categoría="mantel", material="algodón"
   - "lino para cocina" → material="lino", categoría="cocina" (o uso relacionado)

4. **Para productNames**: Incluye el término principal de búsqueda (material, categoría, o nombre mencionado)

RESPONDE SOLO EN FORMATO JSON:
{
  "hasProducts": true/false,
  "productNames": ["algodón", "lino"] o null,
  "quantities": {"algodón": 5} o null,
  "characteristics": {
    "material": "algodón" o null,
    "color": "azul" o null,
    "category": "mantel" o null,
    "texture": "jacquard" o null
  }
}

EJEMPLOS DETALLADOS:
- "quiero comprar algodón" → {
    "hasProducts": true,
    "productNames": ["algodón"],
    "characteristics": {"material": "algodón"}
  }
  NOTA: Esto encontrará TODOS los productos con material algodón, incluso "Mantel Jacquard Elegante" si tiene material algodón.

- "necesito mantel de algodón" → {
    "hasProducts": true,
    "productNames": ["mantel", "algodón"],
    "characteristics": {"material": "algodón", "category": "mantel"}
  }

- "quiero productos de lino azul" → {
    "hasProducts": true,
    "productNames": ["lino"],
    "characteristics": {"material": "lino", "color": "azul"}
  }

- "necesito 5 metros de algodón blanco" → {
    "hasProducts": true,
    "productNames": ["algodón"],
    "quantities": {"algodón": 5},
    "characteristics": {"material": "algodón", "color": "blanco"}
  }

- "quiero agendar una cita" → {"hasProducts": false}`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3),
        { role: 'user', content: message }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 400
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      return { hasProducts: false }
    }

    const parsed = safeJsonParse<{
      hasProducts?: boolean
      productNames?: string[]
      quantities?: { [key: string]: number }
      characteristics?: {
        material?: string
        color?: string
        category?: string
        texture?: string
      }
    }>(response, { hasProducts: false })

    return {
      hasProducts: parsed.hasProducts || false,
      productNames: parsed.productNames || undefined,
      quantities: parsed.quantities || undefined,
      characteristics: parsed.characteristics || undefined
    }
  } catch (error) {
    console.error('Error en extractProductsFromMessage:', error)
    return { hasProducts: false }
  }
}

/**
 * Busca productos similares basándose en características (material, color, etc.)
 * Usa IA para encontrar los mejores matches cuando no hay coincidencia exacta
 */
const findSimilarProducts = async (
  characteristics: {
    material?: string
    color?: string
    category?: string
    texture?: string
  },
  companyId: string,
  limit: number = 5
): Promise<any[]> => {
  try {
    // Obtener todos los productos con sus características
    const allProducts = await client.product.findMany({
      where: {
        companyId,
        active: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        stock: true,
        unit: true,
        width: true,
        weight: true,
        color: true,
        colors: true,
        material: { select: { name: true } },
        category: { select: { name: true } },
        texture: { select: { name: true } }
      }
    })

    if (allProducts.length === 0) return []

    // Crear contexto para IA
    const productsContext = allProducts.map(p => {
      const details = [p.name]
      if (p.material) details.push(`material: ${p.material.name}`)
      if (p.color) details.push(`color: ${p.color}`)
      if (p.colors && p.colors.length > 0) details.push(`colores: ${p.colors.join(', ')}`)
      if (p.category) details.push(`categoría: ${p.category.name}`)
      if (p.texture) details.push(`textura: ${p.texture.name}`)
      return details.join(' | ')
    }).join('\n')

    const systemPrompt = `Eres un experto en productos textiles. Encuentra los productos MÁS SIMILARES a las características solicitadas.

PRODUCTOS DISPONIBLES:
${productsContext}

CARACTERÍSTICAS SOLICITADAS:
${JSON.stringify(characteristics, null, 2)}

INSTRUCCIONES:
1. Busca productos que coincidan con las características solicitadas
2. Prioriza coincidencias exactas, luego similares
3. Si hay material solicitado, busca productos con ese material
4. Si hay color solicitado, busca productos con ese color (o colores similares)
5. Si no hay coincidencia exacta, busca productos relacionados

RESPONDE SOLO EN FORMATO JSON con un array de nombres de productos ordenados por relevancia:
{
  "products": ["nombre1", "nombre2", "nombre3", ...]
}

Máximo ${limit} productos.`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Encuentra productos similares a: ${JSON.stringify(characteristics)}` }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 200
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    if (!response) {
      // Fallback: búsqueda básica por material o color
      return allProducts.filter(p => {
        if (characteristics.material && p.material?.name.toLowerCase().includes(characteristics.material.toLowerCase())) {
          return true
        }
        if (characteristics.color) {
          const productColors = [p.color, ...(p.colors || [])].filter(Boolean)
          return productColors.some(c => c?.toLowerCase().includes(characteristics.color!.toLowerCase()))
        }
        return false
      }).slice(0, limit)
    }

    const parsed = safeJsonParse<{ products?: string[] }>(response, { products: [] })
    const recommendedNames = parsed.products || []

    // Buscar los productos por nombre
    const similarProducts = allProducts.filter(p =>
      recommendedNames.some((name: string) =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
      )
    )

    return similarProducts.slice(0, limit)
  } catch (error) {
    console.error('Error en findSimilarProducts:', error)
    // Fallback: búsqueda básica
    return []
  }
}

/**
 * Detecta el estado del flujo de agendamiento basado en el historial usando IA
 */
const detectAppointmentFlowState = async (
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<'ASKING_PRODUCTS' | 'ASKING_DATE' | 'NONE'> => {
  try {
    const lastAssistantMessage = chatHistory
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0]?.content || ''

    if (!lastAssistantMessage) {
      return 'NONE'
    }

    const systemPrompt = `Eres un analizador de conversaciones. Determina en qué etapa del flujo de agendamiento de citas se encuentra la conversación.

ANALIZA el último mensaje del asistente y determina si está:
1. **ASKING_PRODUCTS**: Preguntando qué productos desea el usuario o qué productos le interesan
2. **ASKING_DATE**: Preguntando qué fecha u horario prefiere el usuario para agendar
3. **NONE**: No está en ninguna etapa específica del flujo de agendamiento

RESPONDE SOLO: "ASKING_PRODUCTS", "ASKING_DATE" o "NONE"

EJEMPLOS DE ASKING_PRODUCTS:
- "¿Qué productos te interesan?" → ASKING_PRODUCTS
- "¿Qué productos deseas reservar?" → ASKING_PRODUCTS
- "Para ayudarte mejor, ¿qué productos te interesan?" → ASKING_PRODUCTS
- "Menciona los productos que deseas" → ASKING_PRODUCTS
- "Primero necesito saber qué productos te interesan" → ASKING_PRODUCTS

EJEMPLOS DE ASKING_DATE:
- "¿Qué fecha te gustaría agendar?" → ASKING_DATE
- "¿Qué horario prefieres?" → ASKING_DATE
- "¿Cuándo te gustaría venir?" → ASKING_DATE
- "Elige una fecha para tu cita" → ASKING_DATE
- "¿Qué día te conviene?" → ASKING_DATE

EJEMPLOS DE NONE:
- "¡Perfecto! He reservado tu producto" → NONE
- "Gracias por tu consulta" → NONE
- "El producto cuesta S/50" → NONE
- "Aquí está la información" → NONE`

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-3),
        { role: 'assistant', content: lastAssistantMessage }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 20
    })

    const response = safeExtractOpenAIResponse(chatCompletion)
    const upperResponse = response?.trim().toUpperCase()

    if (upperResponse === 'ASKING_PRODUCTS') return 'ASKING_PRODUCTS'
    if (upperResponse === 'ASKING_DATE') return 'ASKING_DATE'
    return 'NONE'
  } catch (error) {
    console.error('Error en detectAppointmentFlowState:', error)
    return 'NONE'
  }
}

/**
 * Maneja el flujo conversacional de agendamiento de citas CON reserva de productos
 */
const handleAppointmentBooking = async (
  message: string,
  customerInfo: any,
  companyId: string,
  conversationId: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<{
  response?: { role: 'assistant'; content: string }
  appointmentBooked?: boolean
} | null> => {
  try {
    // Detectar el estado actual del flujo usando IA
    const flowState = await detectAppointmentFlowState(chatHistory)

    // ETAPA 1: Si estamos preguntando por productos o es el inicio, detectar productos
    if (flowState === 'ASKING_PRODUCTS' || flowState === 'NONE') {
      const productsInfo = await extractProductsFromMessage(message, companyId, chatHistory)

      // Si no hay productos mencionados y estamos en el inicio, preguntar por productos
      if (!productsInfo.hasProducts && flowState === 'NONE') {
        const response = `¡Perfecto! Me encantaría ayudarte a agendar tu cita. 😊

Para brindarte el mejor servicio, primero necesito saber:

**¿Qué productos te interesan o deseas reservar?**

Puedes mencionar uno o varios productos. Por ejemplo:
- "Quiero reservar lino y algodón"
- "Me interesa ver productos de algodón"
- "Quiero agendar para ver telas"

Si no tienes productos específicos en mente, puedes decir "solo quiero ver productos" o "quiero una asesoría".`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }

      // Si hay productos mencionados, buscar y confirmar
      if (productsInfo.hasProducts) {
        const foundProducts: any[] = []
        const notFoundCharacteristics = productsInfo.characteristics

        // Buscar productos por nombre
        if (productsInfo.productNames && productsInfo.productNames.length > 0) {
          for (const productName of productsInfo.productNames) {
            const products = await findProductsByCharacteristics(productName, companyId, productsInfo.characteristics)
            if (products.length > 0) {
              foundProducts.push(...products) // Agregar TODOS los productos encontrados
            }
          }
        }

        // Si no se encontraron productos exactos pero hay características, buscar similares
        if (foundProducts.length === 0 && notFoundCharacteristics) {
          const similarProducts = await findSimilarProducts(
            notFoundCharacteristics,
            companyId,
            5
          )
          foundProducts.push(...similarProducts)
        }

        // Si aún no hay productos, dar recomendaciones empáticas
        if (foundProducts.length === 0) {
          // Obtener algunos productos destacados para recomendar
          const featuredProducts = await client.product.findMany({
            where: {
              companyId,
              active: true,
              stock: { gt: 0 }
            },
            select: {
              id: true,
              name: true,
              price: true,
              salePrice: true,
              unit: true,
              material: { select: { name: true } },
              color: true
            },
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          })

          let response = `Entiendo que buscas ${productsInfo.productNames?.join(' y ') || 'productos específicos'}. 😊

Aunque no encontré exactamente lo que mencionaste, tengo estas opciones que podrían interesarte:`

          if (featuredProducts.length > 0) {
            const recommendations = featuredProducts
              .map((p, idx) => {
                const details: string[] = []
                if (p.material) details.push(p.material.name)
                if (p.color) details.push(p.color)
                return `${idx + 1}. **${p.name}**${details.length > 0 ? ` (${details.join(', ')})` : ''} - S/${p.salePrice || p.price} por ${p.unit || 'metro'}`
              })
              .join('\n')

            response += `\n\n${recommendations}\n\n¿Te gustaría ver alguno de estos productos o prefieres que te muestre más opciones? También puedes decirme "quiero ver todos los productos" y te mostraré nuestro catálogo completo.`
          } else {
            response += `\n\nPor el momento no tengo productos disponibles con esas características exactas. ¿Te gustaría que te ayude a encontrar alternativas o prefieres agendar una cita para ver nuestros productos en persona?`
          }

          await onStoreConversations(conversationId, message, 'user')
          await onStoreConversations(conversationId, response, 'assistant', message)

          return {
            response: {
              role: 'assistant',
              content: response
            },
            appointmentBooked: false
          }
        }

        // Eliminar duplicados por ID
        const uniqueProducts = foundProducts.filter((p, index, self) =>
          index === self.findIndex(prod => prod.id === p.id)
        )

        // Mostrar TODOS los productos encontrados y preguntar por fecha
        const productsList = uniqueProducts
          .slice(0, 8) // Mostrar hasta 8 productos
          .map((p, idx) => {
            const details: string[] = []
            if (p.material) details.push(p.material.name)
            if (p.color) details.push(p.color)
            return `${idx + 1}. **${p.name}**${details.length > 0 ? ` (${details.join(', ')})` : ''} - S/${p.salePrice || p.price} por ${p.unit || 'metro'}`
          })
          .join('\n')

        let response = `¡Excelente! Encontré estos productos que te pueden interesar: 😊

${productsList}
${uniqueProducts.length > 8 ? `\n... y ${uniqueProducts.length - 8} productos más disponibles` : ''}

Todos estos productos estarán disponibles para ti durante tu visita. 

Ahora, para agendar tu cita, necesito:

**¿Qué fecha te gustaría?** (puedes decir "mañana", "el lunes", "15 de marzo", etc.)
**¿Qué horario prefieres?** (mañana, tarde, o un horario específico)

Por ejemplo: "mañana a las 3pm" o "el lunes por la tarde"`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }
    }

    // ETAPA 2: Si estamos preguntando por fecha o el usuario respondió con fecha
    if (flowState === 'ASKING_DATE' || flowState === 'NONE') {
      // Extraer información del mensaje
      const appointmentInfo = await extractAppointmentInfo(message, chatHistory)

      if (!appointmentInfo.hasAppointmentInfo) {
        // No hay información suficiente, preguntar por fecha
        const response = `¡Perfecto! Me encantaría ayudarte a agendar tu cita. 😊

Para continuar, necesito algunos detalles:

1. **¿Qué fecha te gustaría?** (puedes decir "mañana", "el lunes", "15 de marzo", etc.)
2. **¿Qué horario prefieres?** (mañana, tarde, o un horario específico)
3. **¿Cuál es el propósito de tu visita?** (ver productos, asesoría, compra, etc.)

Por ejemplo, puedes decir: "mañana a las 3pm para ver productos"`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }

      // Procesar fecha
      let appointmentDate: Date
      if (appointmentInfo.date) {
        appointmentDate = new Date(appointmentInfo.date)
      } else {
        // Si no hay fecha, usar mañana por defecto
        appointmentDate = new Date()
        appointmentDate.setDate(appointmentDate.getDate() + 1)
      }

      // Validar que la fecha no sea en el pasado
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (appointmentDate < today) {
        const response = `Lo siento, no puedo agendar citas en el pasado. 😅

¿Podrías indicarme una fecha futura? Por ejemplo: "mañana", "el lunes", o "15 de marzo"`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }

      // Obtener horarios disponibles
      const availableSlots = await getAvailableSlotsForDate(companyId, appointmentDate)

      if (availableSlots.length === 0) {
        const response = `Lo siento, no hay horarios disponibles para ${appointmentDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}. 😔

¿Te gustaría elegir otra fecha?`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }

      // Si hay hora especificada, validarla
      let selectedSlot: string | undefined = appointmentInfo.time

      if (selectedSlot) {
        // Normalizar formato de hora
        selectedSlot = selectedSlot.toLowerCase().replace(/\s/g, '')
        if (!selectedSlot.includes('am') && !selectedSlot.includes('pm')) {
          // Si no tiene am/pm, intentar inferir
          const hour = parseInt(selectedSlot.split(':')[0])
          if (hour < 12) {
            selectedSlot = selectedSlot + 'am'
          } else {
            selectedSlot = selectedSlot + 'pm'
          }
        }

        // Verificar si el slot está disponible
        const slotAvailable = availableSlots.some(
          (slot: string) => slot.toLowerCase().replace(/\s/g, '') === selectedSlot
        )

        if (!slotAvailable) {
          // Hora no disponible, ofrecer alternativas
          const response = `Lo siento, el horario ${appointmentInfo.time} no está disponible para esa fecha. 😔

Horarios disponibles:
${availableSlots.slice(0, 5).map((slot: string) => `• ${slot}`).join('\n')}
${availableSlots.length > 5 ? `\n... y ${availableSlots.length - 5} horarios más` : ''}

¿Cuál prefieres?`

          await onStoreConversations(conversationId, message, 'user')
          await onStoreConversations(conversationId, response, 'assistant', message)

          return {
            response: {
              role: 'assistant',
              content: response
            },
            appointmentBooked: false
          }
        }
      } else {
        // No hay hora especificada, ofrecer opciones
        const response = `¡Perfecto! Para ${appointmentDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}, tengo estos horarios disponibles:

${availableSlots.slice(0, 8).map((slot: string, idx: number) => `${idx + 1}. ${slot}`).join('\n')}
${availableSlots.length > 8 ? `\n... y ${availableSlots.length - 8} horarios más` : ''}

¿Cuál prefieres? Puedes decir el número o el horario directamente.`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }

      // Si llegamos aquí, tenemos fecha y hora válidas
      // Buscar productos mencionados en el historial reciente
      const recentMessages = chatHistory.slice(-10) // Últimos 10 mensajes
      const allProductNames: string[] = []
      const allCharacteristics: {
        material?: string
        color?: string
        category?: string
        texture?: string
      } = {}

      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          const productsInfo = await extractProductsFromMessage(msg.content, companyId, [])
          if (productsInfo.hasProducts && productsInfo.productNames) {
            allProductNames.push(...productsInfo.productNames)
            // Acumular características
            if (productsInfo.characteristics) {
              if (productsInfo.characteristics.material) allCharacteristics.material = productsInfo.characteristics.material
              if (productsInfo.characteristics.color) allCharacteristics.color = productsInfo.characteristics.color
              if (productsInfo.characteristics.category) allCharacteristics.category = productsInfo.characteristics.category
              if (productsInfo.characteristics.texture) allCharacteristics.texture = productsInfo.characteristics.texture
            }
          }
        }
      }

      // Eliminar duplicados
      const uniqueProductNames = Array.from(new Set(allProductNames))

      // Buscar productos y crear reservas
      const reservationIds: string[] = []
      const reservedProducts: string[] = []

      if (uniqueProductNames.length > 0) {
        // Buscar TODOS los productos mencionados y crear reservas para TODOS
        const allFoundProducts: any[] = []

        for (const productName of uniqueProductNames) {
          const products = await findProductsByCharacteristics(productName, companyId, allCharacteristics)
          if (products.length > 0) {
            allFoundProducts.push(...products) // Agregar TODOS los productos encontrados, no solo el primero
          }
        }

        // Eliminar duplicados por ID
        const uniqueFoundProducts = allFoundProducts.filter((p, index, self) =>
          index === self.findIndex(prod => prod.id === p.id)
        )

        // Crear reserva para CADA producto encontrado
        for (const product of uniqueFoundProducts) {
          const quantity = 1 // Por defecto, se puede mejorar extrayendo cantidades del historial

          try {
            const reservation = await createProductReservation(
              product.id,
              customerInfo.id,
              quantity,
              `Reserva asociada a cita - ${product.name}`,
              {
                unitPrice: product.salePrice || product.price,
                totalPrice: (product.salePrice || product.price) * quantity,
                unit: product.unit || undefined,
                width: product.width || undefined,
                weight: product.weight || undefined,
                color: product.color || undefined,
                category: product.category?.name || undefined
              }
            )

            reservationIds.push(reservation.id)
            reservedProducts.push(product.name)
          } catch (error) {
            console.error(`Error creando reserva para ${product.name}:`, error)
          }
        }
      }

      // Crear la cita
      const bookingResult = await onBookNewAppointment(
        companyId,
        customerInfo.id,
        selectedSlot!,
        appointmentDate.toISOString(),
        customerInfo.email || ''
      )

      if (bookingResult && bookingResult.status === 200 && bookingResult.bookingId) {
        // Asociar reservas a la cita
        if (reservationIds.length > 0) {
          await client.productReservation.updateMany({
            where: {
              id: { in: reservationIds }
            },
            data: {
              bookingId: bookingResult.bookingId,
              status: 'CONFIRMED'
            }
          })
        }

        const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        let response = `¡Excelente! ✅ Tu cita ha sido agendada exitosamente:

📅 **Fecha:** ${formattedDate}
⏰ **Hora:** ${selectedSlot}
${appointmentInfo.purpose ? `📝 **Propósito:** ${appointmentInfo.purpose}` : ''}`

        if (reservedProducts.length > 0) {
          response += `\n\n🛍️ **Productos reservados:**
${reservedProducts.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

Estos productos estarán disponibles para ti durante tu visita.`
        }

        response += `\n\nTe hemos enviado un correo de confirmación a ${customerInfo.email}. 

¡Te esperamos! 😊`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)
        await updateResolutionType(conversationId, false)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: true
        }
      } else {
        // Si falló la creación de la cita, cancelar las reservas creadas
        if (reservationIds.length > 0) {
          await client.productReservation.updateMany({
            where: {
              id: { in: reservationIds }
            },
            data: {
              status: 'CANCELLED'
            }
          })
        }

        const response = `Lo siento, hubo un problema al agendar tu cita. Por favor, intenta de nuevo o contáctanos directamente.`

        await onStoreConversations(conversationId, message, 'user')
        await onStoreConversations(conversationId, response, 'assistant', message)

        return {
          response: {
            role: 'assistant',
            content: response
          },
          appointmentBooked: false
        }
      }
    } // Cerrar el if de ETAPA 2

    // Si llegamos aquí sin retornar, retornar null
    return null
  } catch (error) {
    console.error('Error en handleAppointmentBooking:', error)
    return null
  }
}


export const onAiChatBotAssistant = async (
  id: string,
  chat: { role: 'user' | 'assistant'; content: string }[],
  author: 'user',
  message: string,
  sessionToken?: string,
  conversationId?: string | null
) => {
  try {
    const chatBotCompany = await client.company.findUnique({
      where: { id },
      select: {
        name: true,
        helpdesk: { select: { question: true, answer: true } },
        products: {
          where: { active: true }, // Solo productos activos
          select: {
            name: true,
            price: true,
            image: true,
            salePrice: true,
            description: true,
            color: true,
            width: true,
            weight: true,
            stock: true,
            material: { select: { name: true } },
            texture: { select: { name: true } },
            category: { select: { name: true } },
            season: { select: { name: true } },
            uses: {
              select: {
                use: { select: { name: true } }
              }
            },
            features: {
              select: {
                feature: { select: { name: true } }
              }
            }
          }
        },
        filterQuestions: {
          where: { answered: null },
          select: { question: true }
        },
        // Obtener catálogos disponibles para hacer preguntas inteligentes
        categories: {
          where: { active: true },
          select: { name: true }
        },
        materials: {
          where: { active: true },
          select: { name: true }
        },
        textures: {
          where: { active: true },
          select: { name: true }
        },
        seasons: {
          where: { active: true },
          select: { name: true }
        },
        uses: {
          where: { active: true },
          select: { name: true }
        },
        features: {
          where: { active: true },
          select: { name: true }
        }
      }
    })

    if (!chatBotCompany) {
      throw new Error('Chatbot company not found')
    }

    // NUEVA LÓGICA: Usar IA para detectar si el usuario quiere terminar
    const shouldEndConversation = await detectConversationEndingWithAI(message, chat)

    if (sessionToken) {
      const customerFromToken = await getCustomerFromToken(sessionToken, id)

      if (customerFromToken && customerFromToken.conversations && customerFromToken.conversations.length > 0) {
        const customerInfo = {
          ...customerFromToken,
          conversations: customerFromToken.conversations
        }

        return await handleAuthenticatedUser(
          customerInfo,
          message,
          author,
          chat,
          id, // Pasar el companyId
          chatBotCompany,
          sessionToken,
          conversationId // Pasar el conversationId si está disponible
        )
      }
    }

    let existingEmail: string | null = null
    for (const msg of chat) {
      const emailInHistory = extractEmailsFromString(msg.content)?.[0]
      if (emailInHistory) {
        existingEmail = emailInHistory
        break
      }
    }

    const customerDataFromCurrentMessage = extractCustomerData(message)
    const emailFromCurrentMessage = customerDataFromCurrentMessage.email
    const finalEmail = emailFromCurrentMessage || existingEmail

    if (finalEmail) {
      const existingCustomer = await client.company.findUnique({
        where: { id },
        select: {
          name: true,
          customer: {
            where: {
              email: {
                contains: finalEmail,
                mode: 'insensitive'
              }
            },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              questions: true,
              conversations: {
                select: {
                  id: true,
                  live: true,
                  mailed: true,
                  satisfactionCollected: true
                }
              }
            }
          }
        }
      })

      let customerInfo: any = null
      let isNewCustomer = false

      if (existingCustomer?.customer && existingCustomer.customer.length > 0) {
        customerInfo = existingCustomer.customer[0]
        isNewCustomer = false

        const onlyProvidedEmail = finalEmail && !customerDataFromCurrentMessage.name && !customerDataFromCurrentMessage.phone

        if (onlyProvidedEmail) {
          const sessionData = await generateSessionToken(
            customerInfo.id,
            customerInfo.email || finalEmail,
            id,
            customerInfo.conversations[0].id
          )

          await onStoreConversations(customerInfo.conversations[0].id, message, 'user')

          // ENVIAR MENSAJE DEL USUARIO INMEDIATAMENTE (ANTES DEL PROCESAMIENTO)
          if (customerInfo.conversations[0].live) {
            await onRealTimeChat(
              customerInfo.conversations[0].id,
              message,
              `user-${Date.now()}`,
              'user'
            )
          }

          const welcomeBackMessage = customerInfo.name
            ? `¡Hola de nuevo ${customerInfo.name}! 😊 Me alegra verte otra vez. ¿En qué puedo ayudarte hoy?`
            : `¡Hola de nuevo! 😊 Reconozco tu correo ${customerInfo.email}. ¿En qué puedo ayudarte?`

          await onStoreConversations(customerInfo.conversations[0].id, welcomeBackMessage, 'assistant', message)

          return {
            response: {
              role: 'assistant',
              content: welcomeBackMessage
            },
            sessionToken: sessionData.token,
            sessionData: {
              customerId: customerInfo.id,
              email: customerInfo.email,
              name: customerInfo.name,
              expiresAt: sessionData.expiresAt
            }
          }
        }

        if (customerDataFromCurrentMessage.name || customerDataFromCurrentMessage.phone) {
          await updateCustomerData(customerInfo.id, customerDataFromCurrentMessage)
        }
      } else {
        const fullCustomerData = {
          email: finalEmail,
          name: customerDataFromCurrentMessage.name,
          phone: customerDataFromCurrentMessage.phone
        }

        const newCustomerResult = await findOrCreateCustomer(
          id,
          fullCustomerData,
          chatBotCompany.filterQuestions
        )

        const customerResultData = newCustomerResult.customer as any
        customerInfo = customerResultData.customer[0]
        isNewCustomer = true

        const sessionData = await generateSessionToken(
          customerInfo.id,
          customerInfo.email,
          id,
          customerInfo.conversations[0].id
        )

        return {
          response: {
            role: 'assistant',
            content: `¡Bienvenido ${fullCustomerData.name || 'a Lunari AI'}! ${TEXTILE_MESSAGES.WELCOME} ${TEXTILE_MESSAGES.SERVICES_DESCRIPTION} ¿En qué puedo ayudarte hoy?`
          },
          sessionToken: sessionData.token,
          sessionData: {
            customerId: customerInfo.id,
            email: customerInfo.email,
            name: customerInfo.name,
            expiresAt: sessionData.expiresAt
          }
        }
      }

      if (!sessionToken && customerInfo) {
        await generateSessionToken(
          customerInfo.id,
          customerInfo.email || finalEmail,
          id,
          customerInfo.conversations[0].id
        )
      }

      // PRIORIDAD: Detectar si el usuario quiere terminar usando IA
      if (customerInfo && customerInfo.conversations && customerInfo.conversations[0]) {
        if (shouldEndConversation) {
          await onStoreConversations(customerInfo.conversations[0].id, message, author)

          const ratingMessage = `¡Perfecto! Me alegra haberte ayudado. 😊

                                  Antes de que te vayas, ¿podrías calificar tu experiencia del 1 al 5?

                                  ⭐ 1 = Muy insatisfecho
                                  ⭐ 5 = Muy satisfecho

                                  Tu opinión nos ayuda a mejorar.`

          await onStoreConversations(customerInfo.conversations[0].id, ratingMessage, 'assistant', message)

          await client.conversation.update({
            where: { id: customerInfo.conversations[0].id },
            data: {
              conversationState: 'AWAITING_RATING',
              resolved: true
            }
          })

          return {
            response: {
              role: 'assistant',
              content: ratingMessage
            }
          }
        }
      }

      const isAppointment = await isAppointmentRequest(message, chat)
      if (isAppointment) {
        const appointmentResult = await handleAppointmentBooking(
          message,
          customerInfo,
          id,
          customerInfo.conversations[0].id,
          chat
        )

        if (appointmentResult) {
          return {
            response: appointmentResult.response
          }
        }
      }

      const satisfactionRating = detectSatisfactionRating(message)
      if (satisfactionRating) {
        await saveSatisfactionRating(
          customerInfo.conversations[0].id,
          customerInfo.id,
          id,
          satisfactionRating,
          message
        )

        return {
          response: {
            role: 'assistant',
            content: `¡Muchas gracias por tu calificación de ${satisfactionRating}/5! Tu opinión es muy importante para nosotros y nos ayuda a mejorar nuestro servicio. 😊

¿Tienes alguna otra consulta o necesitas ayuda con algo más?`
          }
        }
      }

      if (customerInfo.conversations[0].live) {
        await onStoreConversations(customerInfo.conversations[0].id, message, author)

        // ENVIAR MENSAJE DEL USUARIO INMEDIATAMENTE (ANTES DEL PROCESAMIENTO)
        await onRealTimeChat(
          customerInfo.conversations[0].id,
          message,
          `user-${Date.now()}`, // ID temporal para el mensaje del usuario
          'user'
        )

        if (!customerInfo.conversations[0].mailed) {
          const companyOwner = await client.company.findUnique({
            where: { id },
            select: {
              User: {
                select: {
                  clerkId: true
                }
              }
            }
          })

          if (companyOwner?.User?.clerkId) {
            const user = await clerkClient.users.getUser(companyOwner.User.clerkId)
            await onMailer(
              user.emailAddresses[0].emailAddress,
              customerInfo.name || 'Cliente',
              customerInfo.email
            )

            await client.conversation.update({
              where: { id: customerInfo.conversations[0].id },
              data: { mailed: true }
            })
          }
        }

        return {
          live: true,
          chatRoom: customerInfo.conversations[0].id
        }
      }

      await onStoreConversations(customerInfo.conversations[0].id, message, author)

      const quickResponse = getQuickResponse(message, customerInfo, id)
      if (quickResponse) {
        const finalQuickContentMain = addHelpOffer(quickResponse.content)

        await onStoreConversations(
          customerInfo.conversations[0].id,
          finalQuickContentMain,
          'assistant',
          message
        )

        await updateResolutionType(customerInfo.conversations[0].id, false)

        return {
          response: {
            role: 'assistant' as const,
            content: finalQuickContentMain,
            link: quickResponse.link
          }
        }
      }

      const contextSpecificPrompt = await getContextSpecificPrompt(message, id, customerInfo.id, chat)
      const customerDataForContext = {
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone
      }

      const systemPromptData = await generateOpenAIContext(
        chatBotCompany,
        customerDataForContext,
        contextSpecificPrompt,
        id,
        customerInfo,
        message
      )

      const systemPrompt = systemPromptData.content

      const relevantHistory = getRelevantChatHistory(chat, 10)

      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...relevantHistory,
          { role: 'user', content: message }
        ],
        model: 'gpt-4o-mini', // Modelo más reciente y económico con mejor calidad conversacional
        temperature: 0.85, // Temperatura más alta para respuestas más naturales y cálidas
        max_tokens: 800
      })

      const response = safeExtractOpenAIResponse(chatCompletion)

      // Validar que la respuesta no sea null
      if (!response) {
        throw new Error('OpenAI no retornó una respuesta válida')
      }

      // Para usuarios no autenticados, usar la primera conversación
      const conversationIdForUnauthenticated = customerInfo?.conversations?.[0]?.id || null
      const result = await handleOpenAIResponse(response, customerInfo, chat, message, conversationIdForUnauthenticated)
      const finalContentMain = addHelpOffer(result.response.content)

      const messagesToSave = [
        {
          role: 'user' as const,
          content: message,
          timestamp: new Date()
        },
        {
          role: 'assistant' as const,
          content: finalContentMain,
          timestamp: new Date(),
          responseTime: 0,
          respondedWithin2Hours: true,
          imageUrl: (result.response as any).imageUrl || undefined
        }
      ]

      await saveCompleteChatSession(
        customerInfo.id,
        customerInfo.conversations[0].id,
        id,
        messagesToSave
      )

      await updateResolutionType(customerInfo.conversations[0].id, false)

      return {
        ...result,
        response: {
          ...result.response,
          content: finalContentMain,
          imageUrl: systemPromptData.imageUrl
        }
      }
    }

    const isAppointment = await isAppointmentRequest(message, chat)
    if (isAppointment) {
      return {
        response: {
          role: 'assistant',
          content: 'Para agendar tu cita, necesito que me proporciones tu correo electrónico. Por favor, compártelo conmigo.'
        }
      }
    }

    // VERIFICAR SI PIDE HABLAR CON HUMANO SIN ESTAR AUTENTICADO
    if (detectHumanTransferRequest(message)) {
      return {
        response: {
          role: 'assistant',
          content: `Para conectarte con un humano, necesito algunos datos primero:

1. ¿Cómo te llamas?
2. ¿Cuál es tu correo electrónico?
3. ¿Tu número de celular?

Una vez que proporciones esta información, te conectaré inmediatamente con nuestro equipo humano.`
        }
      }
    }

    return await handleNoEmailFlow(message, chat)

  } catch (error) {
    return {
      response: {
        role: 'assistant',
        content: 'Lo siento, estoy teniendo dificultades técnicas en este momento. ¿Podrías intentar de nuevo en unos momentos?'
      }
    }
  }
}

