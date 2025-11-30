'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import ChatCard from './chat-card'
import { cn } from '@/lib/utils'

type Conversation = {
    id: string
    title: string | null
    createdAt: Date
    updatedAt: Date
    isFavorite: boolean
    conversationState: string
    lastUserActivityAt: Date
    hasUnreadMessages: boolean
    unreadCount: number
    message: Array<{
        message: string
        createdAt: Date
        seen: boolean
        role: string
    }>
}

type CustomerGroupProps = {
    customerId: string
    customerName: string | null
    customerEmail: string | null
    conversations: Conversation[]
    onGetActiveChatMessages: (id: string) => void
    toggleFavorite: (conversationId: string, isFavorite: boolean) => void
    defaultExpanded?: boolean
}

const CustomerConversationGroup = ({
    customerId,
    customerName,
    customerEmail,
    conversations,
    onGetActiveChatMessages,
    toggleFavorite,
    defaultExpanded = false,
}: CustomerGroupProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const hasMultipleConversations = conversations.length > 1

    // Obtener la conversación más reciente para mostrar en el header
    const mostRecentConversation = conversations[0]
    const lastMessage = mostRecentConversation?.message?.[0]
    // Usar el campo calculado en el backend en lugar de calcular en el frontend
    const unreadCount = conversations.reduce(
        (total, conv) => total + (conv.unreadCount || 0),
        0
    )

    const displayName = customerName || customerEmail || 'Cliente sin nombre'
    const displayEmail = customerEmail || 'Sin email'

    // Verificar si el cliente tiene conversaciones no leídas (usando campo del backend)
    const hasUnreadConversations = conversations.some(conv => conv.hasUnreadMessages)

    return (
        <div className="border-b border-gray-100">
            {/* Header del Cliente */}
            <Card
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "rounded-none border-r-0 border-b-0 cursor-pointer transition-colors",
                    hasUnreadConversations
                        ? "bg-gray-100 hover:bg-gray-200"
                        : isExpanded
                            ? "bg-gray-50"
                            : "bg-white hover:bg-gray-50"
                )}
            >
                <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar del Cliente */}
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                                <User className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>

                        {/* Información del Cliente */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-gray-900 truncate">
                                    {displayName}
                                </h3>
                                {hasMultipleConversations && (
                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                        {conversations.length} conversaciones
                                    </span>
                                )}
                                {unreadCount > 0 && (
                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                        {unreadCount} no leídas
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {displayEmail}
                            </p>
                            {!isExpanded && lastMessage && (
                                <p className="text-xs text-gray-600 truncate mt-1">
                                    {lastMessage.message.substring(0, 50)}
                                    {lastMessage.message.length > 50 ? '...' : ''}
                                </p>
                            )}
                        </div>

                        {/* Icono de expandir/colapsar */}
                        {hasMultipleConversations && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsExpanded(!isExpanded)
                                }}
                                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
                                aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-600" />
                                )}
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Conversaciones (cuando está expandido o solo hay una) */}
            {(isExpanded || !hasMultipleConversations) && (
                <div className="bg-gray-50/50">
                    {conversations.map((conversation) => {
                        const conversationMessage = conversation.message[0]
                        return (
                            <div
                                key={conversation.id}
                                className={cn(
                                    "pl-4 border-l-2 border-gray-200",
                                    conversation.id === mostRecentConversation?.id && "border-blue-400"
                                )}
                            >
                                <ChatCard
                                    seen={!conversation.hasUnreadMessages}
                                    id={conversation.id}
                                    onChat={() => onGetActiveChatMessages(conversation.id)}
                                    createdAt={conversationMessage?.createdAt || conversation.updatedAt}
                                    title={conversation.title || `Conversación ${conversation.id.slice(0, 8)}`}
                                    description={conversationMessage?.message}
                                    isFavorite={conversation.isFavorite}
                                    onToggleFavorite={(isFavorite) =>
                                        toggleFavorite(conversation.id, isFavorite)
                                    }
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Si no está expandido y hay múltiples conversaciones, mostrar solo la más reciente */}
            {!isExpanded && hasMultipleConversations && (
                <div className="bg-gray-50/50 pl-4 border-l-2 border-blue-400">
                    <ChatCard
                        seen={!mostRecentConversation.hasUnreadMessages}
                        id={mostRecentConversation.id}
                        onChat={() => onGetActiveChatMessages(mostRecentConversation.id)}
                        createdAt={lastMessage?.createdAt || mostRecentConversation.updatedAt}
                        title={mostRecentConversation.title || `Conversación ${mostRecentConversation.id.slice(0, 8)}`}
                        description={lastMessage?.message}
                        isFavorite={mostRecentConversation.isFavorite}
                        onToggleFavorite={(isFavorite) =>
                            toggleFavorite(mostRecentConversation.id, isFavorite)
                        }
                    />
                </div>
            )}
        </div>
    )
}

export default CustomerConversationGroup

