"use server";

import { client } from "@/lib/prisma";
// COMENTADO: Pusher Server (plan agotado)
// import { pusherServer } from "@/lib/utils";
// NUEVO: Socket.io Server
import { socketServer } from "@/lib/utils";
import { ConversationState } from "@prisma/client";
import { clerkClient } from '@clerk/nextjs';
import { onMailer } from '../mailer';

export const onToggleRealtime = async (id: string, state: boolean) => {
  try {
    const chatRoom = await client.conversation.update({
      where: {
        id,
      },
      data: {
        live: state,
      },
      select: {
        id: true,
        live: true,
      },
    });

    if (chatRoom) {
      return {
        status: 200,
        message: chatRoom.live
          ? "Realtime mode enabled"
          : "Realtime mode disabled",
        chatRoom,
      };
    }
  } catch (error) {
    console.log(error);
  }
};

// Nueva función para actualizar el estado de la conversación
export const onUpdateConversationState = async (conversationId: string, state: ConversationState) => {
  try {
    const chatRoom = await client.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        conversationState: state,
      },
      select: {
        id: true,
        conversationState: true,
        Customer: {
          select: {
            name: true,
            email: true,
            companyId: true
          }
        }
      },
    });

    // ENVIAR EMAIL AL DUEÑO CUANDO SE ESCALA A HUMANO MANUALMENTE
    if (state === 'ESCALATED' && chatRoom?.Customer && chatRoom.Customer.companyId) {
      try {
        const companyOwner = await client.company.findFirst({
          where: { id: chatRoom.Customer.companyId },
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
            chatRoom.Customer.name || 'Cliente',
            chatRoom.Customer.email || undefined
          )
        }
      } catch (error) {
        console.error('❌ Error enviando email de escalación manual:', error)
      }
    }

    if (chatRoom) {
      return {
        status: 200,
        message: `Conversation state updated to ${state}`,
        chatRoom,
      };
    }
  } catch (error) {
    console.log("Error updating conversation state:", error);
    return {
      status: 500,
      message: "Error updating conversation state",
    };
  }
};

export const onGetConversationMode = async (id: string) => {
  try {
    const mode = await client.conversation.findUnique({
      where: {
        id,
      },
      select: {
        live: true,
      },
    });

    return mode;
  } catch (error) {
    console.log(error);
  }
};

export const onGetCompanyChatRooms = async (id: string) => {
  try {

    const company = await client.company.findUnique({
      where: {
        id,
      },
      select: {
        // @ts-ignore
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            conversations: {
              select: {
                createdAt: true,
                id: true,
                live: true,
                updatedAt: true,
                // @ts-ignore
                isFavorite: true,
                // @ts-ignore
                conversationState: true,
                // @ts-ignore
                lastUserActivityAt: true,
                messages: {
                  select: {
                    message: true,
                    createdAt: true,
                    seen: true,
                    role: true,
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                  take: 1,
                },
              },
              orderBy: {
                updatedAt: 'desc',
              },
            },
          },
        },
      },
    })

    if (company) {
      return company
    }
  } catch (error) { }
}

export const onGetChatMessages = async (id: string) => {
  try {
    const messages = await client.conversation.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        live: true,
        messages: {
          select: {
            id: true,
            role: true,
            message: true,
            createdAt: true,
            seen: true,
            responseTime: true,
            respondedWithin2Hours: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (messages) {
      return messages
    }
  } catch (error) { }
}

export const onViewUnReadMessages = async (id: string) => {
  try {
    await client.chatMessage.updateMany({
      where: {
        conversationId: id,
      },
      data: {
        seen: true,
      },
    })
  } catch (error) {
    console.log(error)
  }
}

export const onRealTimeChat = async (
  chatroomId: string,
  message: string,
  id: string,
  role: 'user' | 'assistant'
) => {
  await socketServer.trigger(chatroomId, 'realtime-mode', {
    chat: {
      message,
      id,
      role,
    },
  })
}

export const onOwnerSendMessage = async (
  chatroom: string,
  message: string,
  role: 'user' | 'assistant'
) => {
  try {
    const chat = await client.conversation.update({
      where: {
        id: chatroom,
      },
      data: {
        live: true, // Activar modo live
        messages: {
          create: {
            message,
            role: role,
          },
        },
      },
      select: {
        messages: {
          select: {
            id: true,
            role: true,
            message: true,
            createdAt: true,
            seen: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (chat) {

      const newMessage = chat.messages[0]
      if (newMessage) {
        await socketServer.trigger(chatroom, 'realtime-mode', {
          chat: {
            message: newMessage.message,
            id: newMessage.id,
            role: newMessage.role,
            createdAt: newMessage.createdAt,
            seen: newMessage.seen
          }
        })
      }

      return chat
    }
  } catch (error) { }
}

export const onToggleFavorite = async (conversationId: string, isFavorite: boolean) => {
  try {
    const chatRoom = await client.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        // @ts-ignore
        isFavorite,
      },
      select: {
        id: true,
        // @ts-ignore
        isFavorite: true,
      },
    })

    if (chatRoom) {
      return {
        status: 200,
        message: isFavorite ? "Agregado a favoritos" : "Removido de favoritos",
        chatRoom,
      }
    }
  } catch (error) {
    console.log('Error al actualizar favorito:', error)
    return {
      status: 500,
      message: "Error al actualizar favorito",
    }
  }
}

// NUEVA FUNCIÓN: Obtener todas las conversaciones agrupadas por cliente
export const onGetAllCompanyChatRooms = async (id: string) => {
  try {

    // Obtener todas las conversaciones del dominio
    const allChatRooms = await client.conversation.findMany({
      where: {
        Customer: {
          companyId: id
        }
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        live: true,
        // @ts-ignore
        isFavorite: true,
        // @ts-ignore
        conversationState: true,
        // @ts-ignore
        lastUserActivityAt: true,
        Customer: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
        messages: {
          select: {
            message: true,
            createdAt: true,
            seen: true,
            role: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Agrupar por cliente (email) y tomar solo la conversación más reciente de cada cliente
    const groupedByCustomer = new Map()

    allChatRooms.forEach(chatRoom => {
      const customerEmail = (chatRoom as any).Customer?.email || 'unknown'

      if (!groupedByCustomer.has(customerEmail)) {
        groupedByCustomer.set(customerEmail, {
          id: (chatRoom as any).Customer?.id,
          email: (chatRoom as any).Customer?.email,
          name: (chatRoom as any).Customer?.name,
          conversations: [{
            id: chatRoom.id,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            live: chatRoom.live,
            isFavorite: (chatRoom as any).isFavorite,
            conversationState: (chatRoom as any).conversationState,
            lastUserActivityAt: (chatRoom as any).lastUserActivityAt,
            message: (chatRoom as any).message
          }]
        })
      }
    })

    const result = {
      customer: Array.from(groupedByCustomer.values())
    }

    return result
  } catch (error) {
    console.log('❌ Error en onGetAllCompanyChatRooms:', error)
    return null
  }
}
